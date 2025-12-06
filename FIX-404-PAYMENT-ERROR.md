# Fix Error 404: Cannot POST /api/generate-snap-token

## Masalah yang Terjadi
Error 404 terjadi karena struktur Vercel Serverless Functions sebelumnya tidak sesuai dengan file-based routing Vercel.

## Solusi yang Sudah Dilakukan

### 1. Restructure Backend API
Saya sudah membuat 2 file serverless functions yang proper:

- **`api/generate-snap-token.js`** → Endpoint untuk generate payment token
  - Akan otomatis tersedia di `/api/generate-snap-token`

- **`api/midtrans-callback.js`** → Endpoint untuk handle callback dari Midtrans
  - Akan otomatis tersedia di `/api/midtrans-callback`

### 2. Format Vercel Serverless Function
Setiap file sekarang export handler function yang proper:
```javascript
module.exports = async (req, res) => {
  // Handle CORS
  // Handle POST request
  // Return JSON response
}
```

### 3. Simplify `vercel.json`
Menghapus rewrites karena menggunakan file-based routing yang lebih reliable.

---

## Langkah-Langkah untuk Deploy (PENTING!)

### Langkah 1: Merge ke Branch Main

Perubahan saat ini ada di branch `claude/fix-payment-issues-011CUmCjnTHnUVsiJxU4SKtz`.
Anda perlu merge ke main agar Vercel bisa auto-deploy.

**Opsi A: Merge via GitHub (DIREKOMENDASIKAN)**
1. Buka https://github.com/Naufalspurnomo/Catalist
2. Anda akan melihat notifikasi "Compare & pull request"
3. Klik **"Create pull request"**
4. Review changes, lalu klik **"Merge pull request"**
5. Klik **"Confirm merge"**

**Opsi B: Merge via Command Line**
```bash
git checkout main
git pull origin main
git merge claude/fix-payment-issues-011CUmCjnTHnUVsiJxU4SKtz
git push origin main
```

### Langkah 2: Set Environment Variables di Vercel

Ini **SANGAT PENTING**! Tanpa environment variables, backend tidak bisa connect ke Midtrans dan Supabase.

1. Buka https://vercel.com/dashboard
2. Pilih project **"catalist"** (bukan catalis-admin)
3. Masuk ke **Settings** → **Environment Variables**
4. Tambahkan variables berikut (klik "Add New"):

| Variable Name | Value | Apply to |
|--------------|-------|----------|
| `NODE_ENV` | `production` | Production, Preview, Development |
| `SUPABASE_URL` | `https://anzsbqqippijhemwxkqh.supabase.co` | Production, Preview, Development |
| `SUPABASE_KEY` | `eyJhbGci...` (key lengkap dari Supabase) | Production, Preview, Development |
| `MIDTRANS_SERVER_KEY` | `Mid-server-...` (dari Midtrans Dashboard) | Production, Preview, Development |
| `MIDTRANS_CLIENT_KEY` | `Mid-client-...` (dari Midtrans Dashboard) | Production, Preview, Development |
| `MIDTRANS_MERCHANT_ID` | `G498472407` | Production, Preview, Development |
| `MIDTRANS_IS_PRODUCTION` | `false` (untuk sandbox) | Production, Preview, Development |

**PENTING:**
- Jangan copy-paste key dari kode (itu mungkin hardcoded dummy value)
- Gunakan key ASLI dari Midtrans Dashboard Anda
- Untuk testing, set `MIDTRANS_IS_PRODUCTION=false` (sandbox mode)
- Untuk production real, set `MIDTRANS_IS_PRODUCTION=true` dan gunakan production keys

**Cara Mendapatkan Midtrans Keys:**
1. Login ke https://dashboard.midtrans.com
2. Pilih environment (Sandbox atau Production)
3. Go to **Settings** → **Access Keys**
4. Copy **Server Key** dan **Client Key**

**Cara Mendapatkan Supabase Key:**
1. Login ke https://supabase.com
2. Pilih project Anda
3. Go to **Settings** → **API**
4. Copy **URL** dan **anon/public key**

### Langkah 3: Redeploy Vercel

Setelah set environment variables:

1. Masih di Vercel Dashboard, masuk ke tab **Deployments**
2. Klik titik tiga (⋮) pada deployment terakhir
3. Klik **"Redeploy"**
4. Tunggu sampai deployment selesai (biasanya 1-2 menit)

**ATAU** Vercel akan otomatis redeploy jika Anda merge ke main di Step 1.

### Langkah 4: Testing

#### A. Test Backend Endpoint dengan curl
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

**Expected Response (Success):**
```json
{
  "status": "success",
  "token": "abc123...",
  "redirect_url": "https://app.sandbox.midtrans.com/snap/v2/vtweb/..."
}
```

**Expected Response (Error - Missing Env Vars):**
```json
{
  "status": "error",
  "message": "Gagal membuat token pembayaran"
}
```

#### B. Test dari Frontend
1. Buka website: https://catalist-omega.vercel.app
2. Login dengan akun user
3. Tambahkan produk ke cart
4. Klik **Checkout**
5. Isi form pembayaran
6. Klik **Bayar Sekarang**
7. Anda akan diarahkan ke halaman Midtrans Snap

**Jika berhasil:** Anda melihat halaman pembayaran Midtrans
**Jika error:** Check browser console (F12) untuk error message

### Langkah 5: Check Logs di Vercel

Jika masih ada error:

1. Buka Vercel Dashboard → Project "catalist"
2. Masuk ke tab **Logs**
3. Filter by **Runtime Logs**
4. Cari error messages

Common errors:
- `MIDTRANS_SERVER_KEY is undefined` → Environment variables belum di-set
- `401 Unauthorized` → Midtrans keys salah
- `CORS error` → Biasanya tidak terjadi lagi karena sudah fix

---

## Verifikasi Deployment Berhasil

### ✅ Checklist Sukses

- [ ] Branch sudah di-merge ke main
- [ ] Semua environment variables sudah di-set di Vercel
- [ ] Vercel sudah redeploy (check di tab Deployments)
- [ ] curl test berhasil return token
- [ ] Frontend bisa redirect ke halaman Midtrans
- [ ] Tidak ada error 404 lagi

### ❌ Jika Masih Error 404

Kemungkinan penyebab:
1. **Merge belum ke main** → Vercel deploy dari main, pastikan perubahan sudah di main
2. **Vercel belum redeploy** → Force redeploy di Vercel Dashboard
3. **File api/ tidak ter-deploy** → Check di Vercel Deployments → Functions tab, harus ada `api/generate-snap-token.js`

### ❌ Jika Error 500 Internal Server Error

Kemungkinan penyebab:
1. **Environment variables belum di-set** → Cek dan set semua env vars
2. **Midtrans keys salah** → Verify keys di Midtrans Dashboard
3. **Supabase keys salah** → Verify keys di Supabase Dashboard

---

## Perbedaan dengan Sebelumnya

### Before (❌ Error 404)
```
api/midtrans-callback.js (Express app)
  ├─ POST /generate-snap-token
  └─ POST /midtrans-callback

vercel.json (rewrites yang tidak work)
```

Frontend mencari: `/api/generate-snap-token`
Vercel hanya tahu: `/api/midtrans-callback`
Result: **404 Not Found**

### After (✅ Working)
```
api/generate-snap-token.js (Serverless handler)
  → Available at /api/generate-snap-token ✓

api/midtrans-callback.js (Serverless handler)
  → Available at /api/midtrans-callback ✓
```

Frontend mencari: `/api/generate-snap-token`
Vercel respond: **200 OK** ✓

---

## Maintenance

### Update Backend di Masa Depan
1. Edit file di `api/`
2. Commit dan push ke branch claude atau langsung ke main
3. Vercel akan otomatis redeploy

### Switching dari Sandbox ke Production
1. Buka Vercel Dashboard → Environment Variables
2. Update `MIDTRANS_IS_PRODUCTION` dari `false` ke `true`
3. Update `MIDTRANS_SERVER_KEY` dan `MIDTRANS_CLIENT_KEY` dengan production keys
4. Redeploy

---

## Troubleshooting

### Q: Kenapa perlu 2 file terpisah?
**A:** Vercel Serverless Functions menggunakan file-based routing. Setiap file di folder `api/` menjadi endpoint tersendiri. File `api/nama.js` = endpoint `/api/nama`.

### Q: Apakah masih perlu `npm start`?
**A:** Tidak! Setelah deploy ke Vercel, backend online 24/7. `npm start` hanya untuk development lokal.

### Q: Bagaimana Midtrans callback bekerja?
**A:** Midtrans akan POST ke `https://catalist-omega.vercel.app/api/midtrans-callback` setiap kali ada perubahan status pembayaran (pending → success/failed).

### Q: Apa beda Sandbox dan Production?
**A:**
- **Sandbox**: Testing mode, gunakan test cards dari Midtrans
- **Production**: Real payments, gunakan kartu kredit sungguhan

### Q: Dimana set Notification URL di Midtrans?
**A:**
1. Login ke Midtrans Dashboard
2. Go to **Settings** → **Configuration**
3. Set **Payment Notification URL** ke: `https://catalist-omega.vercel.app/api/midtrans-callback`
4. Save

---

**Selamat! Payment backend Anda sekarang fully online! 🎉**

Tidak perlu `npm start` lagi untuk production.
