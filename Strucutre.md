# AtomStudy - Project Design Document (v1.1)
**Kod Adı:** AtomStudy
**Yazar:** Akif (aToom13)
**Tarih:** 06.12.2025
**Durum:** Geliştirme Aşamasında (In Development)
**Son Güncelleme:** Akıllı Kırpma (ML Kit) Eklendi.

---

## 1. Genel Bakış (Executive Summary)
AtomStudy, öğrencilerin çözemedikleri matematik, fizik ve kimya sorularını fotoğraf çekerek anında çözmelerini sağlayan, **Yapay Zeka (Vision AI)** tabanlı bir mobil eğitim asistanıdır.

Standart botların aksine AtomStudy, görseli anlar ve **Akıllı Soru Algılama** teknolojisi ile öğrenciye en az eforla en doğru pedagojik çözümü sunar.

---

## 2. Hedef Kitle ve Kullanım Senaryosu
* **Hedef Kitle:** Lise (9-12. Sınıf) ve Üniversite Hazırlık öğrencileri.
* **Kullanım Senaryosu:**
 1. Öğrenci test kitabının (içinde 5-6 soru olan) fotoğrafını çeker.
 2. **Yapay Zeka (ML Kit)** sayfadaki tüm soru bloklarını saniyenin onda birinde tarar ve yeşil kutucuklarla işaretler.
 3. Öğrenci sadece çözülmesini istediği kutuya **tek tıkla** dokunur.
 4. Sistem sadece o soruyu alıp çözer ve adım adım anlatır.

---

## 3. Teknik Mimari (The Stack)
Sistem, **"Maliyetsiz, Sunucusuz ve Cihaz İçi Zeka"** prensibi üzerine kurulmuştur.

### A. Frontend (Mobil Uygulama)
* **Framework:** **Flutter** (Dart).
* **Platform:** Android (Öncelikli), iOS, Linux (Test ortamı).
* **Yerel Yapay Zeka (On-Device AI):** **Google ML Kit** (Text Recognition / Object Detection).
 * *Görevi:* Sunucuya gitmeden soruyu telefonda algılayıp kırpmak.
* **Yerel Veritabanı:** **Hive** (Geçmiş soruları telefona kaydetmek için).

### B. Backend & Güvenlik (Köprü)
* **Teknoloji:** **Cloudflare Workers**.
* **Görevi:**
 * Mobil uygulamadan gelen isteği karşılamak.
 * `OPENAI_API_KEY`'i gizlemek.
 * Özel "System Prompt" enjekte etmek.

### C. Yapay Zeka (Bulut Beyin)
* **Model:** **OpenAI GPT-4o-mini**.
* **Görevi:** Kırpılmış ve temizlenmiş soru görselini alıp çözümü üretmek.

### D. Kullanıcı Yönetimi
* **Servis:** **Firebase Auth**.
* **Görevi:** Kimlik doğrulama ve analiz.

---

## 4. Veri Akışı (Data Flow Pipeline)

```mermaid
[Öğrenci] -> (Fotoğraf Çeker) -> [Flutter Uygulaması]
          |
       (Cihaz İçi İşlem - ML Kit)
     [Google ML Kit: Soru Bloklarını Algılar]
          |
       (Kullanıcı İlgili Soruyu Seçer)
          |
       (Otomatik Kırpılmış Base64 Resim)
          |
          v
        [Cloudflare Worker API]
      (API Key + System Prompt Ekler)
          |
          v
        [OpenAI GPT-4o-mini]
       (Sadece Seçilen Soruyu Çözer)
          |
          v
        [Cloudflare Worker API]
          |
          v
        [Flutter Uygulaması]
     (Cevabı Render Eder & Hive'a Kaydeder)