# Panduan Deploy Backend Midtrans ke Vercel

## Masalah yang Dipecahkan
Saat ini, pembayaran Midtrans hanya bekerja jika `npm start` dijalankan secara lokal. Dengan deploy ke Vercel, backend akan online 24/7 dan pembayaran akan bekerja tanpa perlu menjalankan server lokal.

## Langkah-Langkah Deploy

### Opsi 1: Deploy via Vercel Dashboard (DIREKOMENDASIKAN - Paling Mudah)

#### 1. Persiapan
Pastikan kode sudah di-push ke GitHub:
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

#### 2. Deploy ke Vercel
1. Buka [Vercel Dashboard](https://vercel.com/dashboard)
2. Klik **"Add New"** → **"Project"**
3. Pilih **"Import Git Repository"**
4. Pilih repository **Catalist**
5. Vercel akan otomatis mendeteksi konfigurasi
6. Klik **"Deploy"**

#### 3. Set Environment Variables di Vercel
Setelah deploy pertama kali, set environment variables:

1. Buka project di Vercel Dashboard
2. Masuk ke **Settings** → **Environment Variables**
3. Tambahkan semua variable berikut:

| Variable | Value | Production | Preview | Development |
|----------|-------|------------|---------|-------------|
| `NODE_ENV` | `production` | ✓ | ✓ | ✓ |
| `SUPABASE_URL` | `https://anzsbqqippijhemwxkqh.supabase.co` | ✓ | ✓ | ✓ |
| `SUPABASE_KEY` | `eyJhbGci...` (your actual key) | ✓ | ✓ | ✓ |
| `MIDTRANS_SERVER_KEY` | `Mid-server-...` (your actual key) | ✓ | ✓ | ✓ |
| `MIDTRANS_CLIENT_KEY` | `Mid-client-...` (your actual key) | ✓ | ✓ | ✓ |
| `MIDTRANS_MERCHANT_ID` | `G498472407` | ✓ | ✓ | ✓ |
| `MIDTRANS_IS_PRODUCTION` | `false` (sandbox) atau `true` (prod) | ✓ | ✓ | ✓ |

**PENTING:**
- Jangan copy-paste key dari file kode (bisa jadi placeholder)
- Gunakan key asli dari Midtrans Dashboard Anda
- Untuk testing, gunakan `MIDTRANS_IS_PRODUCTION=false` (sandbox mode)

#### 4. Redeploy Setelah Set Environment Variables
1. Kembali ke tab **Deployments**
2. Klik titik tiga (⋮) di deployment terakhir
3. Klik **"Redeploy"**
4. Tunggu sampai deployment selesai

#### 5. Testing Backend
Setelah deploy, backend Anda akan tersedia di:
```
https://catalist-omega.vercel.app/api/generate-snap-token
https://catalist-omega.vercel.app/api/midtrans-callback
```

Test dengan curl (ganti URL jika berbeda):
```bash
curl -X POST https://catalist-omega.vercel.app/api/generate-snap-token \
  -H "Content-Type: application/json" \
  -d '{
    "transaction_details": {
      "order_id": "TEST-001",
      "gross_amount": 10000
    },
    "customer_details": {
      "first_name": "Test",
      "email": "test@example.com",
      "phone": "08123456789"
    },
    "frontendOrigin": "https://catalist-omega.vercel.app"
  }'
```

Jika berhasil, Anda akan mendapat response dengan `token` dan `redirect_url`.

---

### Opsi 2: Deploy via Vercel CLI (Alternative)

#### 1. Install Vercel CLI
```bash
npm install -g vercel
```

#### 2. Login ke Vercel
```bash
vercel login
```

#### 3. Deploy Project
Untuk preview deployment:
```bash
vercel
```

Untuk production deployment:
```bash
vercel --prod
```

#### 4. Set Environment Variables via CLI
```bash
vercel env add MIDTRANS_SERVER_KEY production
vercel env add MIDTRANS_CLIENT_KEY production
vercel env add MIDTRANS_MERCHANT_ID production
vercel env add MIDTRANS_IS_PRODUCTION production
vercel env add SUPABASE_URL production
vercel env add SUPABASE_KEY production
vercel env add NODE_ENV production
```

#### 5. Redeploy
```bash
vercel --prod
```

---

## Verifikasi Deployment

### 1. Cek Logs di Vercel
1. Buka Vercel Dashboard
2. Pilih project Catalist
3. Masuk ke tab **Logs**
4. Filter by **Runtime Logs**

Anda akan melihat log seperti:
```
Supabase URL: https://anzsbqqippijhemwxkqh.supabase.co
Supabase connection initialized
Environment: Production
Midtrans configuration:
- Merchant ID: G498472407
- Environment: Sandbox
```

### 2. Test dari Frontend
1. Buka website production Anda: `https://catalist-omega.vercel.app`
2. Tambahkan produk ke cart
3. Lakukan checkout
4. Jika berhasil, Anda akan diarahkan ke halaman pembayaran Midtrans

### 3. Troubleshooting

#### Error: "Failed to generate token"
- **Penyebab:** Environment variables tidak tersetting atau salah
- **Solusi:**
  1. Cek kembali environment variables di Vercel Dashboard
  2. Pastikan semua key sudah benar (tidak ada typo)
  3. Redeploy setelah mengubah environment variables

#### Error: "CORS error"
- **Penyebab:** CORS headers tidak tersetting
- **Solusi:** File `vercel.json` sudah dikonfigurasi dengan benar, pastikan sudah ter-commit dan ter-push

#### Error: "404 Not Found" saat hit API
- **Penyebab:** Routing tidak benar
- **Solusi:** Pastikan file `vercel.json` ada dan sudah ter-commit

#### Backend masih menggunakan localhost
- **Penyebab:** Frontend masih detect environment sebagai development
- **Solusi:**
  1. Buka `js/midtrans.js` line 138-140
  2. Pastikan URL production sudah benar
  3. Pastikan hostname website Anda ada di array `productionHostnames`

---

## Update Frontend URL (Jika Perlu)

Jika URL Vercel Anda berbeda dari `catalist-omega.vercel.app`, update di `js/midtrans.js`:

```javascript
const backendUrl = isProduction
  ? "https://YOUR-ACTUAL-VERCEL-URL.vercel.app/api/generate-snap-token"
  : "http://localhost:3001/generate-snap-token";
```

Juga tambahkan hostname baru ke array production:
```javascript
const productionHostnames = [
  "catalist-omega.vercel.app",
  "catalis-lac.vercel.app",
  "www.catalis.fun",
  "YOUR-NEW-HOSTNAME.vercel.app",  // tambahkan di sini
];
```

---

## Keuntungan Setelah Deploy

✅ **Tidak perlu `npm start` lagi** - Backend online 24/7
✅ **Auto-scaling** - Vercel handle traffic otomatis
✅ **HTTPS built-in** - SSL certificate otomatis
✅ **Global CDN** - Cepat diakses dari mana saja
✅ **Free tier** - Cukup untuk testing dan small projects
✅ **Auto-deploy** - Push ke Git = otomatis deploy

---

## Maintenance

### Update Backend di Masa Depan
1. Edit file di folder `api/`
2. Commit dan push:
   ```bash
   git add .
   git commit -m "Update backend"
   git push
   ```
3. Vercel akan otomatis rebuild dan redeploy

### Monitoring
- Cek logs di Vercel Dashboard untuk debugging
- Lihat analytics untuk monitor traffic
- Set up notifications untuk error alerts

---

## Checklist Deployment

- [ ] Push kode ke GitHub
- [ ] Import project ke Vercel
- [ ] Set semua environment variables
- [ ] Redeploy setelah set env vars
- [ ] Test endpoint dengan curl
- [ ] Test pembayaran dari frontend
- [ ] Verify logs di Vercel Dashboard
- [ ] Update URL frontend jika perlu

---

## Support

Jika ada masalah:
1. Cek Vercel Logs untuk error messages
2. Verify environment variables sudah benar
3. Test backend endpoint dengan curl
4. Cek dokumentasi Vercel: https://vercel.com/docs
5. Cek dokumentasi Midtrans: https://docs.midtrans.com

---

**Selamat! Backend Midtrans Anda sekarang online 24/7 🎉**
