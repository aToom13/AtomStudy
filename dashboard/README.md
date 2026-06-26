# AtomStudy Admin Dashboard

Firebase Firestore verilerini canlı takip etmek için modern web dashboard.

## Özellikler

- **Canlı Veri Takibi**: 30 saniyede bir otomatik güncelleme
- **Kullanıcı Yönetimi**: Tüm kullanıcıları görüntüle, ara, detayları incele
- **Soru Takibi**: Soruları filtrele (ders, durum, model), detayları gör
- **AI Model İstatistikleri**: Hangi model ne kadar kullanılmış, maliyet analizi
- **Analitik**: Günlük/haftalık/aylık raporlar
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu

## Kurulum

### 1. Gerekli Bilgiler

Dashboard'a giriş için ihtiyacınız olan bilgiler:

- **Firebase API Key**: Backend'de `FIREBASE_API_KEY` environment variable olarak tanımlı
- **Admin Token**: Backend'de `ADMIN_SECRET` environment variable olarak tanımlı

### 2. Çalıştırma

#### Seçenek 1: Doğrudan Aç (En Kolay)
```bash
cd dashboard
# index.html dosyasını bir tarayıcıda açın
```

#### Seçenek 2: Python HTTP Server
```bash
cd dashboard
python3 -m http.server 8080
# Tarayıcıda: http://localhost:8080
```

#### Seçenek 3: Node.js Live Server
```bash
npm install -g live-server
cd dashboard
live-server --port=8080
```

#### Seçenek 4: VS Code Live Server Extension
VS Code'da "Live Server" eklentisini kurun ve index.html'e sağ tıklayıp "Open with Live Server" seçin.

## Kullanım

1. Dashboard'u açın
2. Firebase API Key ve Admin Token girin
3. "Giriş Yap" butonuna tıklayın
4. Sol menüden istediğiniz bölüme geçin

### Sayfalar

| Sayfa | Açıklama |
|-------|----------|
| **Genel Bakış** | Özet istatistikler ve son sorular |
| **Kullanıcılar** | Tüm kullanıcılar, arama, detay görüntüleme |
| **Sorular** | Tüm sorular, filtreleme, detay görüntüleme |
| **AI Modelleri** | Model kullanım istatistikleri ve maliyetler |
| **Analitik** | Zaman bazlı grafikler ve raporlar |

## API Endpointleri

Dashboard şu backend API'lerini kullanır:

```
GET /api/admin/stats  → Dashboard istatistikleri
GET /api/admin/users  → Kullanıcı listesi
GET /api/admin/users/:id → Kullanıcı detayı
GET /api/admin/questions → Soru listesi
GET /api/admin/models  → AI model istatistikleri
GET /api/admin/analytics → Analitik verileri
```

## Güvenlik Notları

- API Key ve Admin Token localStorage'da saklanır
- Oturum süresizdir (tarayıcı kapatılınca token'lar silinmez)
- Çıkış yapmak için sidebar'daki butonunu kullanın
- Canlı güncelleme 30 saniyede bir çalışır (isteğe bağlı kapatılabilir)

## Özelleştirme

### Yenileme Aralığı
`app.js` içinde şu satırı değiştirin:
```javascript
this.autoRefreshInterval = setInterval(() => {
 this.refreshData();
}, 30000); // 30 saniye → istediğiniz değer (ms)
```

### Backend URL
Eğer backend farklı bir URL'de çalışıyorsa:
```javascript
this.backendUrl = 'https://backend.atomstudy.workers.dev';
```

## Ekran Görüntüleri

Dashboard şunları içerir:
- Modern dark tema
- Canlı istatistik kartları
- Responsive tasarım
- Toast bildirimleri
- Basit analitik grafikleri

## Geliştirme

### Yeni Özellik Ekleme

1. `index.html` - Yeni sayfa/modal ekle
2. `styles.css` - Stil tanımlamaları
3. `app.js` - JavaScript fonksiyonları

### Chart.js Entegrasyonu
Daha gelişmiş grafikler için:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

## Sorun Giderme

| Sorun | Çözüm |
|-------|-------|
| "Geçersiz API key" | API key'i kontrol edin |
| "Yetkilendirme hatası" | Admin token'ı kontrol edin |
| Veriler güncellenmiyor | "Canlı Güncelleme" açık mı kontrol edin |
| Boş sayfa | Browser console'da hata mesajlarını kontrol edin |

## Teknik Detaylar

- **Frontend**: Vanilla JavaScript (frameworksüz)
- **Styling**: CSS3 with CSS Variables
- **API**: RESTful fetch API
- **Storage**: localStorage
- **Icons**: Emoji + Unicode
- **Font**: Inter (Google Fonts)
