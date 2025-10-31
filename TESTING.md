# 🧪 Testing Guide - Catalist

Panduan lengkap untuk testing aplikasi Catalist setelah fix bug Midtrans Payment History.

## 🚀 Quick Start Testing

### Metode 1: Menggunakan Script Otomatis (Recommended)

```bash
# Jalankan script testing
./test-local.sh
```

Script ini akan otomatis:
- ✅ Start backend server (port 3001)
- ✅ Start frontend server (port 8080)
- ✅ Menampilkan informasi testing

**Stop testing:** Tekan `Ctrl+C`

---

### Metode 2: Manual Testing

#### Step 1: Install Dependencies
```bash
npm install
```

#### Step 2: Start Backend Server
```bash
# Terminal 1 - Backend (Port 3001)
npm start
# atau untuk development dengan auto-reload:
npm run dev
```

#### Step 3: Start Frontend Server
```bash
# Terminal 2 - Frontend (Port 8080)
python3 -m http.server 8080

# Alternatif lain:
# npx http-server -p 8080
# atau gunakan Live Server extension di VSCode
```

---

## 🧪 Testing Payment History Flow

### 1. Akses Aplikasi
```
http://localhost:8080
```

### 2. Login/Register
- Buat akun baru atau login dengan akun existing
- Pastikan sudah login sebelum checkout

### 3. Tambahkan Produk ke Cart
- Browse produk di homepage
- Klik "Add to Cart" untuk beberapa produk
- Cek cart untuk memastikan produk masuk

### 4. Proses Checkout
- Klik tombol "Checkout"
- Isi informasi shipping:
  - Nama lengkap
  - Email
  - Nomor HP
  - Alamat lengkap
  - Kota
  - Kode pos
  - Provinsi

### 5. Pilih Metode Pembayaran
- Pilih "Midtrans" sebagai payment method
- Klik "Lanjut ke Pembayaran"

### 6. Bayar di Midtrans Sandbox
Kamu akan diarahkan ke halaman Midtrans Sandbox.

**Test Card untuk Pembayaran Berhasil:**
```
Card Number: 4811 1111 1111 1114
Expiry Date: 01/25
CVV: 123
OTP: 112233
```

**Test Card untuk Pembayaran Gagal:**
```
Card Number: 4911 1111 1111 1113
Expiry Date: 01/25
CVV: 123
```

### 7. Verifikasi Payment History ✅

Setelah pembayaran berhasil:

1. **Redirect Otomatis**
   - Kamu akan diarahkan ke halaman success
   - Cek status pembayaran "Success"

2. **Cek Riwayat Pembayaran**
   - Buka menu Profile/Account
   - Klik tab "Riwayat Pembayaran" atau "Payment History"
   - **SEHARUSNYA SEKARANG SUDAH MUNCUL!** ✨

3. **Cek Detail Order**
   - Order number
   - Total pembayaran
   - Status: "Success" atau "Paid"
   - Tanggal transaksi
   - Transaction ID dari Midtrans

4. **Cek Admin Dashboard** (Opsional)
   - Login sebagai admin
   - Buka Order Management
   - Lihat detail order beserta payment history

---

## 🐛 Debugging Tips

### 1. Payment History Tidak Muncul

**Cek Browser Console:**
```javascript
// Buka Developer Tools (F12)
// Lihat tab Console untuk error
```

**Cek Backend Logs:**
```bash
# Terminal backend akan menampilkan log
# Cari log berikut:
# "=== FRONTEND: SAVING PAYMENT HISTORY ==="
# "Order UUID found: ..."
# "Payment history saved successfully"
```

### 2. Backend Connection Error

**Error: "Server tidak dapat dijangkau"**

Solusi:
```bash
# Pastikan backend running
curl http://localhost:3001/health
# atau cek dengan:
lsof -i :3001
```

### 3. Frontend Tidak Load

**Error: "Cannot GET /"**

Solusi:
```bash
# Pastikan menjalankan HTTP server di root folder
cd /path/to/Catalist
python3 -m http.server 8080
```

### 4. Webhook Tidak Diterima

**Masalah:** Midtrans tidak bisa kirim notifikasi ke localhost

**Untuk Production Testing:**
- Deploy ke Vercel/Netlify
- Gunakan ngrok untuk expose localhost:
  ```bash
  ngrok http 3001
  # Update Midtrans webhook URL di dashboard
  ```

---

## 📊 Expected Results

### ✅ Sebelum Fix:
- ❌ Payment history TIDAK muncul di profil
- ❌ Error di console: "Foreign key constraint error"
- ❌ Payment history kosong meskipun pembayaran berhasil

### ✅ Setelah Fix:
- ✅ Payment history MUNCUL di profil
- ✅ Tidak ada error di console
- ✅ Data lengkap: order number, amount, status, transaction ID
- ✅ Stock produk terupdate dengan benar

---

## 🔍 Technical Details

### Bug yang Diperbaiki:
**File:** `js/midtrans.js`

**Masalah:**
- `savePaymentHistory()` menggunakan `order_number` (string) sebagai `order_id`
- Database `payment_history.order_id` mengharapkan UUID
- Menyebabkan foreign key constraint error

**Solusi:**
- Query UUID order dari `order_number` terlebih dahulu
- Gunakan UUID yang benar saat insert payment history
- Sama untuk `updateProductStock()`

### Files Changed:
- ✅ `js/midtrans.js`: Fix savePaymentHistory() dan updateProductStock()

---

## 🌐 Testing di Production/Staging

### Deploy ke Vercel (dari VSCode):

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Testing di Deployed Environment:

1. Buka URL production (e.g., https://catalis.vercel.app)
2. Lakukan payment flow yang sama
3. Cek payment history di profil

**Penting:** Pastikan environment variables sudah di-set di Vercel:
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `MIDTRANS_SERVER_KEY`
- `MIDTRANS_CLIENT_KEY`
- `MIDTRANS_MERCHANT_ID`
- `MIDTRANS_IS_PRODUCTION` (set "false" untuk sandbox)

---

## 📝 Testing Checklist

- [ ] Backend server running (port 3001)
- [ ] Frontend server running (port 8080)
- [ ] User bisa login/register
- [ ] User bisa add to cart
- [ ] User bisa checkout
- [ ] Redirect ke Midtrans Sandbox berhasil
- [ ] Pembayaran sandbox berhasil
- [ ] Redirect kembali ke success page
- [ ] **Payment history muncul di profil** ✅
- [ ] Order status updated ke "success"
- [ ] Product stock berkurang
- [ ] Admin bisa lihat order detail
- [ ] Admin bisa lihat payment history

---

## 🆘 Need Help?

Jika masih ada masalah:

1. **Cek logs di console browser (F12)**
2. **Cek logs di terminal backend**
3. **Cek Supabase dashboard** untuk data di tabel:
   - `orders`
   - `payment_history`
   - `order_items`
4. **Cek error_logs table** di Supabase untuk error yang tercatat

---

**Happy Testing! 🎉**
