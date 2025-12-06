⚛️ Proje: AtomStudy (Sürüm 1.0)

Slogan: "Çek, Gönder, Öğren. Cebindeki Özel Öğretmen." Hedef Kitle: Lise ve Üniversite öğrencileri (Matematik, Fizik, Kimya ağırlıklı). Platform: Android (İlk hedef), iOS (İleride).
1. Uygulamanın Temel Özellikleri (MVP - En Yalın Hali)

Şubat 2026'ya yetişecek sürümde sadece şu 3 özellik olacak. Fazlası yok, kafa karıştırmak yok.

    Hızlı Tarayıcı (Instant Scanner):

        Uygulama açılır açılmaz kamera devreye girer.

        Kullanıcı fotoğrafı çeker.

        Kırpma (Crop) Ekranı: Kullanıcı sayfadaki 10 sorudan sadece çözülmesini istediği soruyu parmağıyla seçer (Bu çok kritik, yoksa AI kafayı yer).

    Akıllı Çözüm Ekranı:

        Cevap sadece "X=5" demez.

        Adım 1: Verilenler.

        Adım 2: Kullanılan Formül.

        Adım 3: İşlem Adımları.

        Sonuç: Net cevap.

        LaTeX Desteği: Matematik formüllerini (x2, y​) düzgün, kitap gibi gösterir.

    Geçmiş (History):

        İnternet olmasa bile eski çözülen sorulara dönüp bakılabilir (Telefona kaydedilir).

2. Teknik Mimari (Serverless & Bedava)

    Frontend (Arayüz): Flutter (Dart Dili).

        Kullanıcı deneyimi akıcı, native performans.

    Backend (Köprü): Cloudflare Workers.

        Görevi: API Key'i gizlemek ve "System Prompt"u (Senin özel talimatını) eklemek.

    Yapay Zeka (Beyin): OpenAI GPT-4o-mini.

        Neden bu? Hem görsel okuyabiliyor (Vision), hem de GPT-4o kadar zeki ama fiyatı çok çok daha ucuz.

    Veritabanı (Hafıza): Hive (Flutter Paketi).

        Veriler kullanıcının telefonunda şifreli saklanır. Sunucu masrafı 0 TL.

3. "Gizli Sos" (System Prompt) 🌶️

Uygulamayı ChatGPT'den ayıran şey, senin Cloudflare Worker içine gömeceğin şu talimattır:

    "Sen yardımsever ve sabırlı bir lise öğretmenisin. Sana gönderilen fotoğraf bir ödev sorusudur.

        Asla sadece cevabı verme.

        Önce sorunun hangi konudan olduğunu söyle.

        Adım adım, sanki karşında konuyu bilmeyen biri varmış gibi açıkla.

        Formülleri matematiksel formatta yaz.

        Cevabı kalın yazıyla bitir."

4. Gelir Modeli (Para Kazanma) 💰

18 yaşına girdiğin gün aktif edeceğimiz plan:

    Freemium Model:

        Günde 3 Soru Hakkı: Herkese Bedava.

        +1 Hak Kazan: "Reklam İzle" butonu (Google AdMob). Öğrenciler bedava hak için reklam izlemeye bayılır.

        (İleride eklenecek): Sınırsız Üyelik: Aylık 2$.
