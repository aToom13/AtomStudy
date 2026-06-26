# AtomStudy

AI destekli egitim asistani. Mobil uygulama ile soru fotografi cekin, aninda adim adim cozum alin.

Proje 3 ana bilesenden olusur:

| Bilesen | Teknoloji | Amac |
|---------|-----------|------|
| Mobile App | Flutter / Dart | ogrenci uygulamasi - soru cekme ve cozum |
| Backend | Cloudflare Workers + D1 | API, veritabani, AI entegrasyonu |
| Dashboard | HTML / CSS / JS (Vanilla) | yonetici paneli |

---

## Gereksinimler

| Arac | Version | Amaci |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | 20+ | Backend calistirmak icin |
| [npm](https://www.npmjs.com/) | 9+ | Paket yonetimi (Node.js ile gelir) |
| [Flutter](https://flutter.dev/) | 3.10+ | Mobile uygulama (istege bagli) |
| [Python](https://www.python.org/) | 3.x | Dashboard icin HTTP server |
| [Cloudflare hesabi](https://dash.cloudflare.com/) | ucretsiz | Worker + D1 database |
| [Google Gemini API Key](https://aistudio.google.com/app/apikey) | ucretsiz baslangic | AI cozum motoru |
| [Firebase hesabi](https://console.firebase.google.com/) | ucretsiz baslangic | Kullanici yonetimi (Auth) |

---

## Hizli Baslangic (5 dakika)

```bash
# 1. Projeyi klonla
git clone https://github.com/<username>/atomstudy.git
cd atomstudy

# 2. Environment variables'i hazirla
cp backend/.env.example backend/.dev.vars
# .dev.vars dosyasini ac -> API key'lerini gir

# 3. Backend'i calistir
cd backend
npm install
npx wrangler d1 create atomstudy-db --local
npx wrangler d1 execute atomstudy-db --local --file=./schema.sql
npx wrangler dev
# -> http://localhost:8787

# 4. Dashboard'i ac (ayri terminal)
cd dashboard
python3 -m http.server 8080
# -> http://localhost:8080 (ADMIN_SECRET ile giris yap)
```

---

## Detayli Kurulum

### 1. Environment Variables

```bash
cp backend/.env.example backend/.dev.vars
```

`backend/.dev.vars` dosyasini bir text editor ile acip su degerleri doldurun:

| Degisken | Nereden Alinir? | Zorunlu |
|----------|-----------------|---------|
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) -> "Create API Key" | Evet |
| `ADMIN_SECRET` | Kendiniz belirleyin (ornek: `openssl rand -hex 32`) | Evet |
| `FIREBASE_API_KEY` | Firebase Console > Project Settings > Web API Key | Evet |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console > Project Settings > Service Accounts > Generate new key > `base64 -w0 key.json` | Evet |
| `YOUTUBE_API_KEY` | [Google Cloud Console](https://console.cloud.google.com/) > YouTube Data API v3 (opsiyonel) | Hayir |

**.dev.vars dosyasi `.gitignore` ile korunur, GitHub'a gonderilmez.**

---

### 2. Backend (Cloudflare Workers)

Backend, ogrenci mobil uygulamasi ile Gemini AI arasinda kopru gorevi gorur. Ayrica admin API'leri ve Firestore baglantisi icerir.

```bash
cd backend

# Bagimliliklari yukle
npm install

# Yerel D1 database olustur
npx wrangler d1 create atomstudy-db --local

# Schema'yi database'e yukle
npx wrangler d1 execute atomstudy-db --local --file=./schema.sql

# Gelistirme sunucusunu baslat
npx wrangler dev
```

Backend varsayilan olarak `http://localhost:8787` adresinde calisir.

#### API Endpoints

| Method | Path | Aciklama |
|--------|------|----------|
| POST | `/solve` | Soru fotografini gonder, cozum al |
| GET | `/api/admin/stats` | Dashboard istatistikleri |
| GET | `/api/admin/users` | Kullanici listesi |
| GET | `/api/admin/users/:id` | Kullanici detayi |
| POST | `/api/admin/users` | Yeni kullanici olustur |
| PUT | `/api/admin/users/:id` | Kullanici guncelle |
| DELETE | `/api/admin/users/:id` | Kullanici sil |
| GET | `/api/admin/questions` | Soru listesi |
| GET | `/api/admin/models` | AI model istatistikleri |
| GET | `/api/admin/analytics` | Analitik verileri |
| GET/PUT | `/api/admin/config` | Model ve sistem ayarlari |

#### Test

```bash
curl -X POST http://localhost:8787/solve \
  -H "Content-Type: application/json" \
  -d '{"image":"(base64 ile kodlanmis resim)","subject":"Matematik"}'
```

#### Production Deployment

```bash
cd backend

# Secret'lari ayarla
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put ADMIN_SECRET
npx wrangler secret put FIREBASE_API_KEY
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT

# Production D1 database olustur (sadece ilk sefer)
npx wrangler d1 create atomstudy-db
npx wrangler d1 execute atomstudy-db --remote --file=./schema.sql

# Deploy et
npx wrangler deploy
```

---

### 3. Dashboard (Admin Paneli)

Dashboard, Firebase Firestore uzerinden kullanicilari, sorulari ve AI modellerini yoneten web tabanli bir yonetici panelidir. Herhangi bir build adimi gerektirmez.

```bash
cd dashboard
python3 -m http.server 8080
```

Tarayicida acin: `http://localhost:8080`

Giris yapmak icin `backend/.dev.vars` dosyasindaki `ADMIN_SECRET` degerini kullanin.

Dashboard ozellikleri:
- Genel istatistikler (kullanici, soru, maliyet)
- Kullanici yonetimi (ekle, duzenle, sil)
- Soru loglari (filtreleme, detay)
- AI model performans ve maliyet takibi
- Analitik grafikler
- Sistem ayarlari (model secimi, prompt yonetimi)

---

### 4. Mobile App (Flutter)

Ogrenci mobil uygulamasi. Kullanici kamerasiyla soru fotografi ceker, backend uzerinden Gemini AI'ya gonderir ve adim adim cozumu goruntuler.

#### Derleme ve Calistirma

```bash
cd mobile

# Bagimliliklari yukle
flutter pub get

# Calistir (bagli cihazda)
flutter run

# Veya belirli bir platformda
flutter run -d android
flutter run -d ios
```

#### APK / IPA Build

```bash
# Android APK
flutter build apk --release
# Cikti: build/app/outputs/flutter-apk/app-release.apk

# Android App Bundle (Play Store)
flutter build appbundle --release

# iOS (Xcode gerekli)
flutter build ios --release

# Web
flutter build web
```

#### Backend URL Ayari

Mobil uygulamanin backend'e hangi adresten ulasacagi `mobile/lib/core/config/app_config.dart` dosyasinda tanimlanir:

```dart
static const String apiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://atomstudy-backend.atomstudy25431307.workers.dev',
);
```

Build sirasinda override etmek icin:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8787
```

| Platform | Localhost URL |
|----------|--------------|
| Android Emulator | `http://10.0.2.2:8787` |
| iOS Simulator | `http://127.0.0.1:8787` |
| Gercek cihaz | Bilgisayarinizin yerel IP'si (orn. `http://192.168.1.100:8787`) |

> Not: Android cihazlarda `AndroidManifest.xml` icinde `android:usesCleartextTraffic="true"` ayari local gelistirme icin aktiftir.

---

### 5. Worker (Yardimci)

`worker/` klasoru, ayri bir Cloudflare Worker icin basit bir yapilandirma icerir. Ana backend ile ayni sekilde calisir:

```bash
cd worker
npm install
npx wrangler dev
```

---

## Proje Yapisi

```
atomstudy/
├── backend/                      # Cloudflare Workers API
│   ├── src/
│   │   ├── index.js              # Ana API (soru cozme)
│   │   ├── admin-api.js          # Admin endpoint'leri
│   │   └── firebase-admin.js     # Firebase Firestore baglantisi
│   ├── schema.sql                # D1 database schema
│   ├── wrangler.toml             # Cloudflare yapilandirmasi
│   ├── .dev.vars                 # Local environment variables (git-ignored)
│   ├── .env.example              # Ornek env dosyasi
│   ├── SETUP.md                  # Detayli backend kurulumu
│   └── package.json
│
├── dashboard/                    # Admin Dashboard
│   ├── index.html
│   ├── app.js
│   └── styles.css
│
├── worker/                       # Yardimci Cloudflare Worker
│   ├── index.js
│   └── wrangler.toml
│
├── mobile/                       # Flutter Mobil Uygulama
│   ├── lib/
│   │   ├── core/                 # Core: config, tema, servisler
│   │   │   ├── config/
│   │   │   │   └── app_config.dart
│   │   │   ├── services/
│   │   │   ├── theme/
│   │   │   └── ui/
│   │   └── features/             # Feature'lar
│   │       ├── home/
│   │       ├── scanner/
│   │       ├── solution/
│   │       ├── history/
│   │       ├── settings/
│   │       └── ...
│   └── pubspec.yaml
│
├── .gitignore
├── LICENSE                       # MIT License
├── CONTRIBUTING.md               # Katkida bulunma rehberi
├── README.md                     # Bu dosya
└── Project.md                    # Proje taslak dokumani
```

---

## Sorun Giderme

| Sorun | Cozum |
|-------|-------|
| `wrangler: command not found` | `npx wrangler` kullanin veya `npm install -g wrangler` |
| `D1 database not found` | `npx wrangler d1 create atomstudy-db --local` ile olusturun |
| `Error: CANNOT READ .dev.vars` | `.dev.vars` dosyasi `backend/` icinde mi kontrol edin |
| Firebase Auth hatasi | `.dev.vars` icinde `FIREBASE_API_KEY` dogru mu? Firebase console'da Authentication > Sign-in method'da Email/Password etkin mi? |
| Firebase Firestore hatasi | `FIREBASE_SERVICE_ACCOUNT` base64 dogru mu? Firebase Console > Firestore Database'de database olusturuldu mu? |
| CORS hatasi | Backend calisiyor mu? `curl http://localhost:8787` ile test edin |
| `401 Unauthorized` | Dashboard'da dogru `ADMIN_SECRET` girildi mi? |
| Flutter build hatasi | `flutter clean && flutter pub get` deneyin |
| `usesCleartextTraffic` uyarisi | Android gelistirme icin normaldir, release build'de kaldirilabilir |

---

## Mimari

```
┌─────────────────┐
│   Mobile App    │ (Flutter)
│   (Student)     │
└───────┬─────────┘
        │ HTTPS (soru gonder / cozum al)
        ▼
┌─────────────────────────┐
│  Cloudflare Workers     │
│  - /solve               │ ◄─── Gemini AI (Google)
│  - /api/admin/*         │ ◄─── Firebase Firestore
└───────┬─────────────────┘
        │
        ▼
┌─────────────────┐
│   D1 Database   │ (SQLite)
│   - users       │
│   - questions   │
│   - models      │
└─────────────────┘
        ▲
        │
┌───────┴─────────┐
│  Dashboard      │ (Vanilla JS)
│  (Admin)        │
└─────────────────┘
```

---

## Guvenlik

- API key'ler backend'de environment variable olarak saklanir, asla frontend'e gonderilmez
- Admin dashboard authentication zorunludur
- CORS yapilandirmasi ile yetkisiz erisim engellenir
- Input validation mevcuttur
- Hassas dosyalar `.gitignore` ile korunur:
  - Firebase service account private key'i
  - `google-services.json`
  - `.env` ve `.dev.vars` dosyalari
  - Kisisel dokumanlar

---

## Maliyet (Free Tier)

| Servis | Limit | Ucret |
|--------|-------|-------|
| Cloudflare Workers | 100,000 istek / gun | ucretsiz |
| D1 Database | 5 GB storage | ucretsiz |
| Gemini API | 1,500 sorgu / gun (ilk 1M token) | ucretsiz |
| Firebase Auth | 50,000 kayit | ucretsiz |
| Dashboard hosting | statik oldugu icin her yerde ucretsiz | ucretsiz |

Tahmini aylik maliyet (1000 kullanicili): **$50-100** (sadece Gemini API)

---

## Katkida Bulunma

Detayli rehber icin [CONTRIBUTING.md](CONTRIBUTING.md) dosyasina bakin.

1. Fork edin
2. Branch olusturun: `git checkout -b feature/yeni-ozellik`
3. Degisikliklerinizi yapin
4. Commit edin: `git commit -m "feat: yeni ozellik eklendi"`
5. Push edin: `git push origin feature/yeni-ozellik`
6. Pull Request acin

---

## Lisans

Bu proje **MIT License** ile lisanslanmistir. Detaylar icin [LICENSE](LICENSE) dosyasina bakin.

---

## Gelistirici

**Akif (aToom13)**

---

## Tesekkurler

- Google Gemini AI
- Cloudflare Workers & D1
- Flutter Team
- Firebase
