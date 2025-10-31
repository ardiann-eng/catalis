# Recovery Guide: Fix Admin Panel Errors

Panduan ini untuk memperbaiki error yang terjadi setelah menjalankan `supabase-profiles-schema.sql`.

## Error yang Terjadi

```
Dashboard.js:96 Error fetching stats
Dashboard.js:163 Error fetching recent orders
Dashboard.js:210 Error fetching sales data
Orders.js:163 Error fetching orders
Products.js:62 Error fetching products
Users.js:87 Error fetching users
```

## Root Cause

Migration script mencoba membuat tabel `profiles` baru, padahal tabel sudah exist dengan struktur berbeda:
- **Existing**: Menggunakan `display_name`
- **New script**: Menggunakan `full_name` dan `display_name`
- Konflik antara schema lama dan baru menyebabkan RLS policies error

## Step-by-Step Recovery

### Step 1: Rollback Migration

Buka **Supabase Dashboard** → **SQL Editor** → **New Query**

Copy & paste isi file `supabase-rollback.sql`:

```sql
-- Drop view
DROP VIEW IF EXISTS user_statistics;

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
```

Klik **Run**.

### Step 2: Apply Fix Script

Masih di **SQL Editor**, copy & paste isi file `supabase-profiles-fix.sql`.

Script ini akan:
1. ✅ ADD column `is_active` (jika belum ada)
2. ✅ ADD column `role` (jika belum ada)
3. ✅ Buat RLS policies yang benar
4. ✅ Buat indexes
5. ✅ Buat triggers
6. ✅ Buat view statistics

Klik **Run**.

### Step 3: Verify Schema

Cek apakah column baru sudah ditambahkan:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

Harusnya ada column:
- `is_active` (BOOLEAN, default: true)
- `role` (VARCHAR, default: 'customer')

### Step 4: Set Admin User

Agar bisa login ke admin panel, set role admin untuk user Anda:

```sql
-- Ganti dengan email Anda
UPDATE profiles
SET role = 'admin', is_active = true
WHERE email = 'your-email@example.com';
```

Verify:

```sql
SELECT id, email, display_name, role, is_active
FROM profiles
WHERE role = 'admin';
```

### Step 5: Deploy Frontend Fix

Code frontend sudah di-fix untuk:
- ✅ UsersTable.js menggunakan `display_name` (bukan `full_name`)
- ✅ Toggle button dengan warna yang benar

Commit & push ke GitHub:

```bash
git add .
git commit -m "Fix: profiles schema compatibility and UsersTable display_name"
git push origin main
```

Vercel akan auto-deploy.

### Step 6: Test Admin Panel

1. **Clear Browser Cache**:
   - Chrome/Edge: Ctrl+Shift+Del → Clear cache
   - Atau hard refresh: Ctrl+F5

2. **Login ke Admin Panel**:
   - Buka `https://catalis-admin.vercel.app/`
   - Login dengan akun admin yang sudah di-set

3. **Test Each Page**:
   - ✅ Dashboard → Stats harus muncul
   - ✅ Orders → Daftar orders harus muncul
   - ✅ Products → Daftar products harus muncul
   - ✅ Users → Daftar users harus muncul
   - ✅ Toggle user status → Harus bisa ubah Aktif/Nonaktif

## Troubleshooting

### Masih Error "Error fetching users"

**Check Console Error Details**:
1. Buka browser DevTools (F12)
2. Klik tab **Console**
3. Lihat error message lengkap
4. Screenshot dan share untuk analisa

**Possible Causes**:
- RLS policies belum applied
- User yang login bukan admin
- Email di profiles tidak match dengan auth.users

**Fix**:
```sql
-- Cek apakah user ada di profiles
SELECT * FROM profiles WHERE email = 'your-email@example.com';

-- Cek apakah policies aktif
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Error "permission denied for relation profiles"

**Cause**: RLS policies terlalu restrictive

**Fix**:
```sql
-- Temporary: Disable RLS untuk testing
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Test di admin panel, harusnya work sekarang
-- Jika work, berarti masalah di RLS policies

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop & recreate policies dengan script fix
```

### Users bisa lihat data tapi tidak bisa toggle status

**Cause**: Admin user belum punya role = 'admin'

**Fix**:
```sql
UPDATE profiles
SET role = 'admin', is_active = true
WHERE email = 'your-email@example.com';
```

### Toggle button tidak ada warna

**Cause**: Frontend belum deploy atau browser cache

**Fix**:
1. Wait for Vercel deployment to complete
2. Hard refresh browser: Ctrl+F5
3. Clear cache completely

## Verification Checklist

Setelah recovery, verify semua working:

- [ ] Dashboard stats loading (total orders, revenue, etc.)
- [ ] Dashboard recent orders table showing data
- [ ] Dashboard charts displaying correctly
- [ ] Orders page showing all orders
- [ ] Products page showing all products
- [ ] Users page showing all users with status badges
- [ ] Toggle button has colors (red for active, green for inactive)
- [ ] Clicking toggle changes user status
- [ ] Refreshing page preserves status change
- [ ] No console errors in browser DevTools

## Prevention

Untuk avoid masalah serupa di masa depan:

1. **Always Check Existing Schema** sebelum run migration:
   ```sql
   \d profiles  -- PostgreSQL
   SELECT * FROM information_schema.columns WHERE table_name = 'profiles';
   ```

2. **Use ALTER TABLE** instead of CREATE TABLE jika tabel sudah exist

3. **Test di Local/Staging** dulu sebelum run di Production

4. **Backup Database** sebelum run major migrations

## Need Help?

Jika masih ada masalah setelah ikuti guide ini:

1. Check Supabase logs: Dashboard → Logs → Postgres Logs
2. Check browser console untuk error details
3. Verify user authentication status
4. Create GitHub issue dengan:
   - Error messages (full text)
   - Screenshots
   - Steps yang sudah dilakukan

## Summary

**What Happened**:
- Old script tried to CREATE TABLE profiles (conflict)
- RLS policies failed because schema mismatch

**What We Did**:
- Rollback failed migration
- ADD COLUMN is_active & role to existing table
- Fix RLS policies
- Fix frontend code (display_name)

**Result**:
- Admin panel working
- User toggle status working
- All data preserved

---

## Troubleshooting: Toggle User Status Tidak Berfungsi

Jika setelah recovery, fitur toggle aktif/nonaktif user masih tidak berfungsi, ikuti panduan lengkap di:

**📄 File: `admin/TROUBLESHOOT-USERS-TOGGLE.md`**

### Quick Fix:

1. **Pastikan migration sudah dijalankan**:
   ```sql
   -- Cek field is_active ada
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'profiles' AND column_name = 'is_active';
   ```
   Jika tidak ada output, run `supabase-profiles-fix.sql`

2. **Set admin role untuk user Anda**:
   ```sql
   UPDATE profiles
   SET role = 'admin', is_active = true
   WHERE email = 'your-email@example.com';
   ```

3. **Logout & login kembali** di admin panel

4. **Test toggle** di halaman Users

Jika masih tidak work, baca panduan lengkap di `TROUBLESHOOT-USERS-TOGGLE.md` untuk diagnostic step-by-step.
