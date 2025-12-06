# Panduan Deployment Backend ke Vercel

## Perubahan yang Sudah Dilakukan

### 1. Konversi Backend ke Serverless Functions
File `api/midtrans-callback.js` sudah diubah untuk mendukung Vercel Serverless Functions:
- Menghapus `app.listen()` karena Vercel akan handle routing otomatis
- Menggunakan `express.json()` built-in daripada `body-parser` terpisah
- Export Express app untuk digunakan oleh Vercel

### 2. Konfigurasi Vercel.json
File `vercel.json` sudah dikonfigurasi dengan:
- **builds**: Mendefinisikan cara build backend dengan `@vercel/node`
- **routes**: Routing untuk endpoint API
- **env**: Environment variables untuk production
- **headers**: CORS headers untuk mengizinkan request dari frontend

## Cara Deploy ke Vercel

### Opsi 1: Deploy via Vercel CLI

1. Install Vercel CLI (jika belum):
```bash
npm install -g vercel
```

2. Login ke Vercel:
```bash
vercel login
```

3. Deploy project:
```bash
vercel
```

4. Untuk production deployment:
```bash
vercel --prod
```

### Opsi 2: Deploy via Vercel Dashboard

1. Push code ke GitHub
2. Buka [Vercel Dashboard](https://vercel.com/dashboard)
3. Klik "Add New" → "Project"
4. Import repository GitHub Anda
5. Vercel akan otomatis detect konfigurasi dari `vercel.json`
6. Klik "Deploy"

## Environment Variables di Vercel Dashboard

Setelah deploy, pastikan untuk set environment variables di Vercel Dashboard:

1. Buka project di Vercel Dashboard
2. Go to "Settings" → "Environment Variables"
3. Tambahkan variables berikut:
   - `NODE_ENV` = `production`
   - `SUPABASE_URL` = Your Supabase URL
   - `SUPABASE_KEY` = Your Supabase anon key
   - `MIDTRANS_SERVER_KEY` = Your Midtrans server key
   - `MIDTRANS_CLIENT_KEY` = Your Midtrans client key
   - `MIDTRANS_MERCHANT_ID` = Your Midtrans merchant ID
   - `MIDTRANS_IS_PRODUCTION` = `false` (atau `true` untuk production Midtrans)

**PENTING**: Jangan commit sensitive keys ke Git! Gunakan Environment Variables di Vercel.

## Testing

Setelah deploy, backend Anda akan tersedia di:
- `https://your-project.vercel.app/api/generate-snap-token`
- `https://your-project.vercel.app/api/midtrans-callback`

Test dengan curl:
```bash
curl -X POST https://your-project.vercel.app/api/generate-snap-token \
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
    }
  }'
```

## Update Frontend URL

Setelah deploy, update URL di file `js/midtrans.js` (line 134):
```javascript
const backendUrl = isProduction
  ? "https://your-actual-vercel-url.vercel.app/api/generate-snap-token"
  : "http://localhost:3001/generate-snap-token";
```

Ganti `your-actual-vercel-url` dengan URL Vercel project Anda yang sebenarnya.

## Troubleshooting

### CORS Errors
Jika mengalami CORS errors, pastikan:
- Headers sudah dikonfigurasi dengan benar di `vercel.json`
- Origin frontend Anda sudah diizinkan

### 404 Not Found
Jika API endpoint tidak ditemukan:
- Pastikan routing di `vercel.json` sudah benar
- Cek logs di Vercel Dashboard untuk melihat error

### Environment Variables
Jika mendapat error terkait config:
- Pastikan semua environment variables sudah di-set di Vercel Dashboard
- Redeploy setelah menambah/mengubah environment variables

## Keuntungan Deploy ke Vercel

1. **Tidak perlu menjalankan `npm start` lagi** - Backend akan online 24/7
2. **Auto-scaling** - Vercel akan otomatis scale sesuai traffic
3. **HTTPS by default** - SSL certificate otomatis
4. **Global CDN** - Backend akan cepat diakses dari mana saja
5. **Zero configuration** - Tinggal push code, Vercel handle sisanya
6. **Free tier** - Cukup untuk development dan small projects

## Maintenance

Untuk update backend di masa depan:
1. Edit file di folder `api/`
2. Commit dan push ke Git
3. Vercel akan otomatis rebuild dan redeploy
4. Atau jalankan `vercel --prod` untuk manual deployment
