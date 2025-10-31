# Fix Login Error: "Failed to execute 'fetch' on 'Window': Invalid value"

Error ini terjadi karena environment variables `REACT_APP_SUPABASE_URL` dan `REACT_APP_SUPABASE_ANON_KEY` **belum di-set di Vercel**.

## Root Cause

Saat Anda deploy admin panel ke Vercel tanpa set environment variables:
- `process.env.REACT_APP_SUPABASE_URL` = `undefined`
- `process.env.REACT_APP_SUPABASE_ANON_KEY` = `undefined`
- Supabase client mencoba connect ke URL `undefined` → fetch error

## Fix: Set Environment Variables di Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. **Login ke Vercel Dashboard**
   - Buka https://vercel.com/dashboard
   - Pilih project **catalis-admin**

2. **Buka Settings → Environment Variables**
   - Klik tab **Settings** (menu atas)
   - Klik **Environment Variables** (sidebar kiri)

3. **Add Variables**

   **Variable 1:**
   - **Key**: `REACT_APP_SUPABASE_URL`
   - **Value**: `https://anzsbqqippijhemwxkqh.supabase.co`
   - **Environment**: ✓ Production ✓ Preview ✓ Development
   - Klik **Save**

   **Variable 2:**
   - **Key**: `REACT_APP_SUPABASE_ANON_KEY`
   - **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuenNicXFpcHBpamhlbXd4a3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMDM1MTQsImV4cCI6MjA3Njc3OTUxNH0.6l1Bt9_5_5ohFeH8IN6mP9jU0pFUToHMmV1NwQEeP-Q`
   - **Environment**: ✓ Production ✓ Preview ✓ Development
   - Klik **Save**

4. **Redeploy**
   - Setelah add env vars, klik **Deployments** (tab atas)
   - Klik **⋮** (three dots) di deployment terakhir
   - Klik **Redeploy**
   - Wait for deployment to complete

### Option 2: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link to project
vercel link

# Add environment variables
vercel env add REACT_APP_SUPABASE_URL production
# Paste: https://anzsbqqippijhemwxkqh.supabase.co

vercel env add REACT_APP_SUPABASE_ANON_KEY production
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuenNicXFpcHBpamhlbXd4a3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMDM1MTQsImV4cCI6MjA3Njc3OTUxNH0.6l1Bt9_5_5ohFeH8IN6mP9jU0pFUToHMmV1NwQEeP-Q

# Redeploy
vercel --prod
```

## Verification

### Check Environment Variables

Di Vercel Dashboard:
- Settings → Environment Variables
- Pastikan ada 2 variables dengan prefix `REACT_APP_`

### Test Login

1. Buka `https://catalis-admin.vercel.app/login`
2. Buka Browser DevTools (F12) → Console tab
3. Input email & password
4. Klik **Login**

**Expected behavior:**
- Jika env vars sudah benar: Login berhasil atau error "Invalid credentials"
- Jika env vars belum di-set: Error "Failed to execute 'fetch'"

### Debug Console Output

Setelah fix supabase.js, Anda akan lihat console logs:

**Jika env vars benar:**
```
Supabase URL: https://anzsbqqippijhemwxkqh.supabase.co
Supabase Key exists: true
```

**Jika env vars salah/belum di-set:**
```
❌ Invalid SUPABASE_URL: undefined
Environment variables: { REACT_APP_SUPABASE_URL: undefined, hasKey: false }
Error: Supabase URL tidak valid...
```

## Common Issues

### Issue 1: Environment variables tidak terdeteksi setelah redeploy

**Cause**: Build cache masih menggunakan kode lama

**Fix**:
1. Di Vercel Dashboard → Deployments
2. Klik **⋮** → **Redeploy**
3. ✓ Check **"Clear build cache and redeploy"**
4. Klik **Redeploy**

### Issue 2: Error masih muncul setelah set env vars

**Possible causes:**
- Typo di variable name (harus `REACT_APP_` prefix)
- Env vars di-set untuk environment yang salah
- Build sudah selesai sebelum env vars di-add

**Fix:**
1. Double-check variable names (case-sensitive!)
2. Pastikan env vars untuk **Production** environment
3. Redeploy dengan clear cache

### Issue 3: Local development juga error

**Cause**: File `.env.local` belum dibuat

**Fix:**
```bash
# Di folder admin/
cp .env.example .env.local

# Edit .env.local, isi dengan values yang benar
```

## Why This Happened?

Saat Anda pertama kali deploy admin panel ke Vercel, konfigurasi environment variables **tidak otomatis di-set**.

File `.env.local` hanya berlaku untuk local development dan **tidak di-commit** ke Git (karena di .gitignore).

Untuk production deployment di Vercel, Anda harus **manually set** environment variables via Vercel Dashboard atau CLI.

## Prevention

Untuk deployment ke Vercel selanjutnya:

1. **Always set env vars** sebelum first deployment
2. Use `.env.example` sebagai reference
3. Document required env vars di README
4. Test di local environment dulu

## Next Steps

Setelah login berhasil:

1. ✅ Login ke admin panel
2. ✅ Run database migration (supabase-profiles-fix.sql) jika belum
3. ✅ Set admin role untuk user Anda
4. ✅ Test semua fitur (Dashboard, Orders, Products, Users)

## Support

Jika masih error setelah ikuti guide ini:

1. Screenshot error message di browser console
2. Check Vercel deployment logs
3. Verify environment variables di Vercel Settings
4. Create GitHub issue dengan details lengkap
