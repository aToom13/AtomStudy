# AtomStudy Backend Setup

## 1. Cloudflare D1 Database Oluştur

```bash
# D1 database oluştur
npx wrangler d1 create atomstudy-db
```

Bu komut size bir `database_id` verecek. Örnek:
```
 Successfully created DB 'atomstudy-db'
database_id = "abc123-def456-ghi789"
```

## 2. Wrangler.toml Güncelle

`wrangler.toml` dosyasındaki `database_id` kısmını yukarıdaki ID ile değiştirin:

```toml
[[d1_databases]]
binding = "DB"
database_name = "atomstudy-db"
database_id = "abc123-def456-ghi789" # ← Buraya kendi ID'nizi yazın
```

## 3. Database Schema Oluştur

```bash
# Local development için
npx wrangler d1 execute atomstudy-db --local --file=./schema.sql

# Production için
npx wrangler d1 execute atomstudy-db --file=./schema.sql
```

## 4. Secrets Ayarla

```bash
# Gemini API Key
npx wrangler secret put GEMINI_API_KEY
# Prompt: AIzaSy... (API key'inizi girin)

# Admin Secret (admin panel için)
npx wrangler secret put ADMIN_SECRET
# Prompt: YOUR_ADMIN_SECRET (güçlü bir şifre girin)
```

## 5. Local Test

```bash
# Development modunda çalıştır
npx wrangler dev

# Test et
curl -X POST http://localhost:8787/solve \
 -H "Content-Type: application/json" \
 -d '{"image":"base64-image-data","userId":1,"subject":"Matematik"}'
```

## 6. Admin API Test

```bash
# Stats endpoint test
curl http://localhost:8787/api/admin/stats \
 -H "Authorization: Bearer YOUR_ADMIN_SECRET"
```

## 7. Deploy

```bash
# Production'a deploy et
npx wrangler deploy
```

Deploy sonrası URL'iniz:
```
https://atomstudy-backend.your-subdomain.workers.dev
```

## 8. Admin Panel Environment Variables

Admin panel `.env.local` dosyasını oluşturun:

```bash
cd ../admin-panel
cp .env.local.example .env.local
```

`.env.local` içeriği:
```env
NEXT_PUBLIC_API_URL=https://atomstudy-backend.your-subdomain.workers.dev
NEXT_PUBLIC_ADMIN_TOKEN=your-strong-admin-secret
```

## 9. Test Kullanıcısı Ekle

```bash
# D1 console'da çalıştır
npx wrangler d1 execute atomstudy-db --command \
 "INSERT INTO users (firebase_uid, name, email, grade, school, subscription)
 VALUES ('test-uid-123', 'Test Kullanıcı', 'test@example.com', '11. Sınıf', 'Test Lisesi', 'Free')"
```

## 10. Doğrulama

### Backend Çalışıyor mu?
```bash
curl https://atomstudy-backend.your-subdomain.workers.dev/api/admin/stats \
 -H "Authorization: Bearer your-admin-secret"
```

Başarılı yanıt:
```json
{
 "totalUsers": 1,
 "activeUsers": 0,
 "totalQuestions": 0,
 ...
}
```

### Admin Panel Çalışıyor mu?
```bash
cd admin-panel
npm run dev
```

Tarayıcıda: http://localhost:3000

---

## Sorun Giderme

### "Database not found" hatası
```bash
# Database'i tekrar oluştur
npx wrangler d1 create atomstudy-db
# Schema'yı tekrar çalıştır
npx wrangler d1 execute atomstudy-db --file=./schema.sql
```

### "Unauthorized" hatası
```bash
# Secret'ı kontrol et
npx wrangler secret list
# Yoksa tekrar ekle
npx wrangler secret put ADMIN_SECRET
```

### CORS hatası
Backend'de CORS headers doğru ayarlanmış. Eğer hala hata alıyorsanız:
- Browser cache'i temizleyin
- Incognito modda deneyin

---

## Database Yönetimi

### Tüm kullanıcıları listele
```bash
npx wrangler d1 execute atomstudy-db --command "SELECT * FROM users"
```

### Tüm soruları listele
```bash
npx wrangler d1 execute atomstudy-db --command "SELECT * FROM questions LIMIT 10"
```

### İstatistikleri gör
```bash
npx wrangler d1 execute atomstudy-db --command \
 "SELECT COUNT(*) as total_users FROM users"
```

### Database'i sıfırla (DİKKAT!)
```bash
npx wrangler d1 execute atomstudy-db --command "DROP TABLE IF EXISTS users"
npx wrangler d1 execute atomstudy-db --command "DROP TABLE IF EXISTS questions"
npx wrangler d1 execute atomstudy-db --file=./schema.sql
```

---

## Production Checklist

- [ ] D1 database oluşturuldu
- [ ] Schema yüklendi
- [ ] GEMINI_API_KEY secret eklendi
- [ ] ADMIN_SECRET secret eklendi
- [ ] Backend deploy edildi
- [ ] Admin panel environment variables ayarlandı
- [ ] Test kullanıcısı eklendi
- [ ] API endpoints test edildi
- [ ] Admin panel çalışıyor

---

## Yardım

Sorun yaşıyorsanız:
1. `npx wrangler tail` ile logları izleyin
2. Browser console'u kontrol edin
3. Network tab'de API çağrılarını inceleyin
