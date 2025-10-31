# Catalis Creative

Website marketplace untuk produk kreatif

## Deployment

### Frontend

Frontend sudah di-deploy ke:

- Vercel: https://newcatalist.vercel.app/
- Domain: https://www.catalis.fun/

### Backend Midtrans

Untuk menggunakan integrasi Midtrans secara online, server backend Midtrans sudah dikonfigurasi:

1. URL backend di `js/midtrans.js` sudah diperbarui:

   ```javascript
   const backendUrl = isProduction
     ? "https://newcatalist.vercel.app/generate-snap-token" // URL produksi (Vercel)
     : "http://localhost:3001/generate-snap-token"; // URL development
   ```

2. Callback URL di `midtrans-callback.js` sudah diperbarui:
   ```javascript
   callbacks: {
     finish: isProduction
       ? "https://www.catalis.fun/payment-success.html" // URL domain produksi
       : "http://localhost:8080/payment-success.html"; // URL development
   }
   ```

## Pengembangan Lokal

1. Jalankan server frontend:

   ```
   npx http-server -p 8080
   ```

2. Jalankan server backend Midtrans:
   ```
   node midtrans-callback.js
   ```
