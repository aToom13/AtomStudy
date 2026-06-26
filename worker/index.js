
export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // CORS Headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { headers: corsHeaders });
        }

        // --- Helper Function for Fallback Logic ---
        async function generateWithFallback(apiKey, payload) {
            // Models in order of preference as requested by user
            const models = [
                "gemini-3-pro-preview",
                "gemini-2.5-pro",
                "gemini-2.5-flash"
            ];

            const errors = [];

            for (const model of models) {
                try {
                    console.log(`Attempting with model: ${model}`);
                    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const data = await response.json();

                    // Check for API errors (e.g. 404, 429, 500 returned in JSON)
                    if (data.error) {
                        throw new Error(`${model} API Error: ${data.error.message}`);
                    }

                    // Validate output structure
                    const candidate = data.candidates?.[0];
                    if (!candidate) {
                        throw new Error(`${model} returned no candidates.`);
                    }

                    // Success!
                    return candidate.content?.parts?.[0]?.text || "Cevap üretilemedi.";

                } catch (err) {
                    console.error(`Failed ${model}:`, err.message);
                    errors.push(`${model}: ${err.message}`);
                    // Continue to next model loop...
                }
            }

            // If we are here, all models failed
            throw new Error(`All models failed. Details: ${errors.join(" | ")}`);
        }
        // ------------------------------------------

        // 1. Search Videos (YouTube Proxy)
        if (url.pathname === "/search-videos") {
            const query = url.searchParams.get("q");
            if (!query) return new Response("Missing query", { status: 400, headers: corsHeaders });

            const apiKey = env.YOUTUBE_API_KEY;
            if (!apiKey) return new Response("Missing YOUTUBE_API_KEY", { status: 500, headers: corsHeaders });

            try {
                const youtubeUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=10&key=${apiKey}`;
                const response = await fetch(youtubeUrl);
                const data = await response.json();
                return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: response.status });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
            }
        }

        // 2. Solve Question (Image Analysis)
        if (url.pathname === "/solve" && request.method === "POST") {
            try {
                const body = await request.json();
                if (!body.image) return new Response("Image missing", { status: 400, headers: corsHeaders });

                const geminiKey = env.GEMINI_API_KEY;
                if (!geminiKey) return new Response("Missing GEMINI_API_KEY", { status: 500, headers: corsHeaders });

                const payload = {
                    "contents": [{
                        "parts": [
                            {
                                "text": `Sen bir matematik ve fen bilimleri asistanısın. Öğrencinin gönderdiği soruyu çöz.
                                
ÖNEMLİ KURALLAR:
1. SADECE aşağıdaki formatı kullan.
2. ASLA kendi düşünme sürecini, planlamanı veya "Şimdi şuraya geçiyorum", "Formüle döküyorum" gibi ara notlarını yazma. Direkt çözümü yaz.
3. Çıktın sadece aşağıdaki başlıklar ve içeriklerden oluşmalı.
4. ÇOK ÖNEMLİ: Matematiksel denklemleri ASLA yan yana uzatma. (Örn: "2x=10 => x=5" YANLIŞ). Her adımı ALT ALTA yeni satıra yaz.
5. LaTeX ifadeleri kısa tut, telefonda taşma yapmasın.

*** FORMAT BAŞLANGICI ***

**Konu:** [Konu Adı]
**Verilenler:**
[Soruda verilen değerleri maddeler halinde yaz]

**Formüller:**
[Kullanılacak formülleri LaTeX formatında yaz, örn: $F = m \cdot a$]

**Adım 1: [Adım Başlığı]**
[Bu adımda ne yaptığını açıkla]
[İşlemleri göster]

**Adım 2: [Adım Başlığı]**
[Sonraki adım açıklaması]

... (Gerektiği kadar adım ekle) ...

**Sonuç:**
[Net cevabı buraya yaz. Seçenekli soruysa doğru şıkkı belirt.]

**İpucu:**
[Benzer sorular için kısa bir taktik veya hatırlatma]

*** FORMAT BİTİŞİ ***

Matematiksel ifadeleri $...$ içinde LaTeX formatında yaz.
`
                            },
                            { "inline_data": { "mime_type": "image/jpeg", "data": body.image } }
                        ]
                    }]
                };

                const solution = await generateWithFallback(geminiKey, payload);
                return new Response(JSON.stringify({ solution }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
        }

        // 3. Chat (Follow-up)
        if (url.pathname === "/chat" && request.method === "POST") {
            try {
                const body = await request.json();
                if (!body.query) return new Response("Query missing", { status: 400, headers: corsHeaders });

                const geminiKey = env.GEMINI_API_KEY;
                if (!geminiKey) return new Response("Missing GEMINI_API_KEY", { status: 500, headers: corsHeaders });

                const prompt = `Bağlam (Önceki Çözüm): ${body.context || "yok"}\n\nKullanıcı Sorusu: ${body.query}\n\nLütfen bu soruya bağlama uygun, kısa ve net bir cevap ver.`;
                const payload = {
                    "contents": [{ "parts": [{ "text": prompt }] }]
                };

                const answer = await generateWithFallback(geminiKey, payload);
                return new Response(JSON.stringify({ answer }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            } catch (e) {
                return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
        }

        return new Response("Not Found", { status: 404, headers: corsHeaders });
    }
};
