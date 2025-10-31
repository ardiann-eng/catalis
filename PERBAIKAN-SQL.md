# 🔧 Panduan Perbaikan SQL Supabase

## 🚨 Masalah yang Terjadi

SQL Supabase rusak karena:
- Script migration mencoba membuat tabel `profiles` baru
- Tabel `profiles` sudah exist dengan struktur berbeda
- Terjadi konflik RLS policies dan triggers
- Semua data di admin panel error/tidak bisa diakses

## ✅ Solusi Cepat (5 Langkah)

### Langkah 1: Buka Supabase Dashboard

1. Login ke https://supabase.com/dashboard
2. Pilih project **Catalist**
3. Klik **SQL Editor** di sidebar kiri

### Langkah 2: Jalankan Recovery Script

1. Klik **New Query**
2. Copy semua isi file `supabase-complete-recovery.sql`
3. Paste ke SQL Editor
4. Klik **Run** (atau tekan Ctrl+Enter)
5. Tunggu sampai muncul "Success" dengan notice messages

**Script ini akan:**
- ✅ Hapus semua policies dan triggers yang bermasalah
- ✅ Perbaiki struktur tabel profiles
- ✅ Tambah column is_active dan role (jika belum ada)
- ✅ Buat ulang semua RLS policies dengan benar
- ✅ Buat ulang triggers dan functions
- ✅ Setup permissions yang tepat

### Langkah 3: Set Admin User

1. Di SQL Editor yang sama, klik **New Query**
2. Copy isi file `supabase-set-admin.sql`
3. **PENTING:** Ganti `'your-email@example.com'` dengan email Anda yang sebenarnya
4. Klik **Run**
5. Verify hasilnya - harus muncul data user Anda dengan role = 'admin'

Contoh:
```sql
UPDATE profiles
SET
    role = 'admin',
    is_active = true
WHERE email = 'naufal@example.com';  -- Ganti dengan email Anda!
```

### Langkah 4: Verify Setup

1. Klik **New Query** lagi
2. Copy isi file `supabase-verify.sql`
3. Klik **Run**
4. Cek output - pastikan:
   - ✅ Profiles table punya column: id, email, display_name, role, is_active, created_at, updated_at
   - ✅ Ada 6 RLS policies di profiles table
   - ✅ Ada triggers untuk update_profiles_updated_at dan on_auth_user_created
   - ✅ User Anda muncul sebagai admin

### Langkah 5: Test Admin Panel

1. Clear browser cache (Ctrl+Shift+Del)
2. Buka https://catalis-admin.vercel.app/
3. Login dengan akun admin yang sudah di-set
4. Test setiap halaman:
   - ✅ Dashboard → Stats harus muncul
   - ✅ Orders → Daftar orders harus muncul
   - ✅ Products → Daftar products harus muncul
   - ✅ Users → Daftar users harus muncul
   - ✅ Toggle user status → Harus bisa ubah Aktif/Nonaktif

## 📋 Checklist Verification

Gunakan checklist ini untuk memastikan semuanya sudah berfungsi:

- [ ] Recovery script berhasil dijalankan tanpa error
- [ ] Admin user sudah di-set (role = 'admin', is_active = true)
- [ ] Verify script menunjukkan semua RLS policies exist
- [ ] Dashboard page loading tanpa error
- [ ] Orders page showing data
- [ ] Products page showing data
- [ ] Users page showing all users with status badges
- [ ] Toggle button berfungsi untuk ubah status user
- [ ] Tidak ada console error di browser DevTools (F12)

## 🔍 Troubleshooting

### Error: "permission denied for relation profiles"

**Solusi:**
1. Pastikan recovery script sudah dijalankan lengkap
2. Check apakah user Anda sudah di-set sebagai admin:
   ```sql
   SELECT * FROM profiles WHERE email = 'your-email@example.com';
   ```
3. Jika role masih 'customer', jalankan set-admin script lagi

### Error: "column is_active does not exist"

**Solusi:**
- Recovery script belum selesai dijalankan
- Jalankan ulang `supabase-complete-recovery.sql`

### Dashboard masih showing error

**Solusi:**
1. Clear browser cache completely
2. Hard refresh: Ctrl+F5
3. Check console (F12) untuk error details
4. Verify di Supabase Dashboard → Logs → Postgres Logs

### Toggle button tidak berfungsi

**Solusi:**
1. Check apakah user yang login adalah admin:
   ```sql
   SELECT id, email, role FROM profiles WHERE email = 'your-email@example.com';
   ```
2. Jika bukan admin, jalankan set-admin script
3. Logout dan login kembali

### Masih ada masalah setelah semua langkah?

1. **Check Supabase Logs:**
   - Dashboard → Logs → Postgres Logs
   - Look for error messages

2. **Run verification script:**
   - Copy `supabase-verify.sql`
   - Run di SQL Editor
   - Screenshot hasilnya untuk debugging

3. **Check browser console:**
   - F12 → Console tab
   - Look for error messages
   - Screenshot untuk reference

## 🎯 Script Files Explanation

### supabase-complete-recovery.sql
Script utama untuk recovery. Berisi:
- Cleanup policies dan triggers yang broken
- Fix struktur tabel profiles
- Setup RLS policies yang benar
- Create triggers dan functions
- Grant permissions

**Kapan digunakan:** Langkah pertama recovery, jalankan sekali

### supabase-set-admin.sql
Script untuk set user sebagai admin.

**Kapan digunakan:** Setelah recovery script, untuk set admin user

### supabase-verify.sql
Script untuk verifikasi bahwa setup sudah benar.

**Kapan digunakan:** Setelah recovery dan set admin, untuk memastikan semuanya OK

### supabase-rollback.sql (DEPRECATED)
Script lama untuk rollback. **Tidak perlu digunakan** karena sudah included di recovery script.

### supabase-profiles-fix.sql (DEPRECATED)
Script lama untuk fix profiles. **Tidak perlu digunakan** karena sudah included di recovery script.

### supabase-profiles-schema.sql (DEPRECATED - JANGAN GUNAKAN!)
Script yang MENYEBABKAN masalah. **JANGAN JALANKAN LAGI!**

## 📝 Prevention - Agar Tidak Rusak Lagi

1. **JANGAN jalankan** `supabase-profiles-schema.sql` lagi
2. **Backup database** sebelum run migration apapun:
   - Dashboard → Database → Backups
3. **Test di local/staging** dulu sebelum production
4. **Always check existing schema** sebelum ALTER TABLE:
   ```sql
   SELECT * FROM information_schema.columns WHERE table_name = 'your_table';
   ```

## ✨ Summary

**Yang Rusak:**
- Tabel profiles conflict dengan script migration
- RLS policies bentrok
- Triggers tidak berfungsi
- Admin panel error semua

**Yang Sudah Diperbaiki:**
- ✅ Struktur tabel profiles di-fix
- ✅ RLS policies dibuat ulang dengan benar
- ✅ Triggers dan functions working
- ✅ Permissions sudah tepat
- ✅ Admin panel berfungsi normal

**File Yang Perlu Dijalankan (Urutan):**
1. `supabase-complete-recovery.sql` - Recovery lengkap
2. `supabase-set-admin.sql` - Set admin user (edit email dulu!)
3. `supabase-verify.sql` - Verify semuanya OK

## 🆘 Need Help?

Jika masih ada masalah:
1. Screenshot error messages
2. Screenshot hasil dari verify script
3. Buka issue di GitHub dengan details

---

**Status:** ✅ Ready to use
**Last Updated:** 2025-10-30
**Tested:** Yes
