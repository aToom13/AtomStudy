import { handleAdminRequest } from './admin-api.js';

export default {
  async fetch(request, env, ctx) {
    // CORS Headers
    // TODO: Restrict to specific origins in production
    // e.g. 'Access-Control-Allow-Origin': 'https://your-dashboard.com'
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Firebase-Api-Key',
    };

    // Handle OPTIONS request (Preflight)
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    
    // Admin API routes
    if (url.pathname.startsWith('/api/admin/')) {
      return handleAdminRequest(request, env, url.pathname);
    }

    // Mobile app solve endpoint
    if (request.method !== 'POST' || url.pathname !== '/solve') {
      return new Response('Not Found', { status: 404, headers: corsHeaders });
    }

    try {
      const { image, userId, subject, topic } = await request.json();

      if (!image) {
        return new Response(JSON.stringify({ error: 'Image is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!env.GEMINI_API_KEY) {
        return new Response(JSON.stringify({ error: 'Gemini API Key not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const systemPrompt = `Sen deneyimli, sabırlı ve motive edici bir lise öğretmenisin. Görevin öğrencilere soru çözümünde rehberlik etmek.

ÖNEMLİ KURALLAR:
1. Kesinlikle sadece cevabı söyleme. Her zaman ADIM ADIM çöz.
2. Her adımı ayrı bir bölüm olarak yaz.
3. Formülleri LaTeX formatında yaz: $formül$
4. Türkçe yaz.
5. Cevabı makul uzunlukta tut, sonsuz döngüye girme.

ÇIKTI FORMATI (Bu formatı kesinlikle takip et):

**Konu:**
[Sorunun konusunu belirt]

**Verilenler:**
* [Veri 1]
* [Veri 2]

**İstenen:**
[Ne bulunması gerekiyor?]

**Formüller:**
* $formül_1$

**Adım 1: [Adım Başlığı]**
[Açıklama ve hesaplama]
$formül$

**Adım 2: [Adım Başlığı]**
[Açıklama ve hesaplama]
$formül$

(Gerektiği kadar adım ekle)

**Sonuç:**
[Final cevap]

**💡 İpucu:**
[Kısa bir öneri]`;

      const models = [
        'gemini-3-pro-preview',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
        'gemini-1.5-flash' // Added as a stable fallback
      ];

      const safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ];

      let solution = null;
      let allErrors = [];

      for (const model of models) {
        try {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

          const geminiResponse = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { text: systemPrompt },
                  { inline_data: { mime_type: "image/jpeg", data: image } }
                ]
              }],
              generationConfig: {
                temperature: 0.3,
                // Removed maxOutputTokens to use model defaults/safe limits
              },
              safetySettings: safetySettings
            }),
          });

          const data = await geminiResponse.json();

          if (data.error) {
            allErrors.push(`${model} Error: ${data.error.message}`);
            continue;
          }

          // More permissive check
          const candidate = data.candidates?.[0];
          if (candidate) {
            const content = candidate.content;
            const text = content?.parts?.[0]?.text;

            // If we have text, accept it even if finishReason is MAX_TOKENS
            if (text) {
              solution = text;
              // Add a truncated note if blocked by length
              if (candidate.finishReason === 'MAX_TOKENS') {
                solution += '\n\n... (Cevap uzunluk sınırına takıldı, ancak çözümün bir kısmı yukarıdadır).';
              }
              break;
            } else {
              // No text found
              let reason = candidate.finishReason || 'Unknown';
              if (candidate.finishReason === 'SAFETY') {
                reason = `SAFETY (Ratings: ${JSON.stringify(candidate.safetyRatings)})`;
              }
              allErrors.push(`${model} Invalid: No text. Reason: ${reason}`);
            }
          } else {
            const feedback = data.promptFeedback ? JSON.stringify(data.promptFeedback) : 'No candidates';
            allErrors.push(`${model} Invalid: ${feedback}`);
          }
        } catch (err) {
          allErrors.push(`${model} Exception: ${err.message}`);
          continue;
        }
      }

      if (solution) {
        // Save question to database
        if (userId && env.DB) {
          try {
            const responseTime = Date.now() - startTime;
            const estimatedCost = calculateCost(solution, model);
            
            await env.DB.prepare(
              `INSERT INTO questions (user_id, subject, topic, question_text, solution, model_used, status, response_time_ms, cost_usd)
               VALUES (?, ?, ?, ?, ?, ?, 'success', ?, ?)`
            ).bind(userId, subject || 'Matematik', topic || '', '', solution, model, responseTime, estimatedCost).run();

            // Update model stats
            await env.DB.prepare(
              `UPDATE ai_models SET 
               total_usage_count = total_usage_count + 1,
               total_cost_usd = total_cost_usd + ?,
               success_count = success_count + 1,
               avg_response_time_ms = (avg_response_time_ms * total_usage_count + ?) / (total_usage_count + 1)
               WHERE name = ?`
            ).bind(estimatedCost, responseTime, model).run();

            // Update user stats
            await env.DB.prepare(
              `UPDATE users SET 
               total_questions_asked = total_questions_asked + 1,
               last_question_date = CURRENT_TIMESTAMP
               WHERE id = ?`
            ).bind(userId).run();
          } catch (dbError) {
            console.error('Database error:', dbError);
          }
        }

        return new Response(JSON.stringify({ solution }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ error: `Hata: ${allErrors.join(' | ')}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};


// Helper function to calculate cost
function calculateCost(solution, model) {
  const inputTokens = 1000; // Approximate for image
  const outputTokens = solution.length / 4; // Rough estimate
  
  const costs = {
    'gemini-3-pro-preview': { input: 0.0025, output: 0.010 },
    'gemini-2.5-pro': { input: 0.0015, output: 0.006 },
    'gemini-2.5-flash': { input: 0.0005, output: 0.002 },
    'gemini-1.5-flash': { input: 0.0003, output: 0.001 },
  };

  const modelCost = costs[model] || costs['gemini-1.5-flash'];
  return ((inputTokens / 1000) * modelCost.input) + ((outputTokens / 1000) * modelCost.output);
}
