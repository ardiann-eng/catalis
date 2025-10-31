# Database Migration: Profiles Table

> ⚠️ **DEPRECATED - JANGAN GUNAKAN FILE INI**
>
> File `supabase-profiles-schema.sql` yang direferensikan di guide ini **TIDAK KOMPATIBEL** dengan tabel profiles yang sudah exist.
>
> **GUNAKAN INI SEBAGAI GANTINYA:**
> - **Jika sudah error**: Ikuti `RECOVERY-GUIDE.md`
> - **Setup baru**: Gunakan `supabase-profiles-fix.sql`
>
> Script baru (`supabase-profiles-fix.sql`) hanya ADD COLUMN tanpa drop table, sehingga aman untuk existing data.

---

## ⚠️ DEPRECATED CONTENT BELOW ⚠️

Panduan ini menjelaskan cara menambahkan tabel `profiles` ke database Supabase untuk fitur User Management di admin panel.

## Mengapa Migration Ini Diperlukan?

Fitur toggle status user (Aktif/Nonaktif) di halaman `/users` admin panel membutuhkan tabel `profiles` dengan field `is_active`. Tanpa tabel ini, fitur user management tidak akan berfungsi.

## Cara Menjalankan Migration

### Opsi 1: Via Supabase Dashboard (Recommended)

1. **Login ke Supabase Dashboard**
   - Buka https://supabase.com/dashboard
   - Pilih project Anda

2. **Buka SQL Editor**
   - Di sidebar kiri, klik **SQL Editor**
   - Klik **New Query**

3. **Copy & Paste Schema**
   - Buka file `supabase-profiles-schema.sql`
   - Copy seluruh isi file
   - Paste ke SQL Editor

4. **Run Migration**
   - Klik tombol **Run** (atau tekan Ctrl+Enter)
   - Tunggu sampai muncul "Success. No rows returned"

5. **Verify Migration**
   ```sql
   -- Cek tabel profiles sudah dibuat
   SELECT * FROM profiles LIMIT 1;

   -- Cek RLS policies
   SELECT * FROM pg_policies WHERE tablename = 'profiles';
   ```

### Opsi 2: Via Supabase CLI

Jika Anda menggunakan Supabase CLI untuk local development:

```bash
# Install Supabase CLI jika belum
npm install -g supabase

# Login
supabase login

# Link ke project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

## Schema yang Ditambahkan

### Tabel: `profiles`

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key, references auth.users(id) |
| `email` | VARCHAR | Email user |
| `full_name` | VARCHAR | Nama lengkap |
| `display_name` | VARCHAR | Nama display |
| `avatar_url` | VARCHAR | URL foto profil |
| `phone` | VARCHAR | Nomor telepon |
| `bio` | TEXT | Bio/deskripsi user |
| `location` | VARCHAR | Lokasi |
| `role` | VARCHAR(20) | 'admin' atau 'customer' |
| `is_active` | BOOLEAN | Status aktif/nonaktif (default: true) |
| `created_at` | TIMESTAMP | Waktu dibuat |
| `updated_at` | TIMESTAMP | Waktu update terakhir |

### Triggers

1. **Auto-create profile on signup**: Otomatis membuat profile saat user baru register
2. **Auto-update timestamp**: Update `updated_at` otomatis saat profile di-update

### RLS Policies

1. **Users can view own profile**: User bisa lihat profile sendiri
2. **Users can update own profile**: User bisa update profile sendiri (kecuali role & is_active)
3. **Admins can view all profiles**: Admin bisa lihat semua profile
4. **Admins can update all profiles**: Admin bisa update semua profile (termasuk role & is_active)
5. **Admins can insert profiles**: Admin bisa tambah user baru
6. **Service role can manage profiles**: Service role punya akses penuh

### View: `user_statistics`

View untuk mendapatkan statistik user di admin dashboard:
- Total users
- Total admins
- Total customers
- Active users
- Inactive users
- New users (last 30 days)

## Post-Migration Steps

### 1. Migrasi Data User yang Sudah Ada

Jika Anda sudah punya users di `auth.users` tapi belum ada di `profiles`:

```sql
-- Insert existing users ke profiles table
INSERT INTO profiles (id, email, full_name, role, is_active)
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
    COALESCE(raw_user_meta_data->>'role', 'customer') as role,
    true as is_active
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles);
```

### 2. Set Admin User

Jika Anda perlu set user tertentu sebagai admin:

```sql
-- Ganti 'admin@example.com' dengan email admin Anda
UPDATE profiles
SET role = 'admin'
WHERE email = 'admin@example.com';
```

### 3. Verify Data

```sql
-- Cek semua profiles
SELECT id, email, full_name, role, is_active, created_at
FROM profiles
ORDER BY created_at DESC;

-- Cek statistik
SELECT * FROM user_statistics;
```

## Testing

Setelah migration selesai, test fitur di admin panel:

1. **Login ke Admin Panel**
   - Buka `https://catalis-admin.vercel.app/`
   - Login dengan akun admin

2. **Akses Users Page**
   - Klik menu **Users** di sidebar
   - Pastikan daftar user muncul

3. **Test Toggle Status**
   - Klik toggle button di kolom **Aksi**
   - Status user harus berubah dari Aktif → Nonaktif atau sebaliknya
   - Refresh page untuk verify perubahan tersimpan

4. **Test User Statistics**
   - Cek card statistics di atas tabel
   - Total users, admins, customers, active/inactive harus sesuai

## Troubleshooting

### Error: "relation profiles does not exist"

**Cause**: Tabel profiles belum dibuat
**Fix**: Jalankan migration SQL di atas

### Error: "permission denied for table profiles"

**Cause**: RLS policies belum diterapkan atau user bukan admin
**Fix**:
1. Pastikan migration SQL sudah dijalankan lengkap
2. Pastikan user yang login punya `role = 'admin'` di tabel profiles

### Toggle button tidak berubah warna

**Cause**: Bug CSS sudah di-fix di `UsersTable.js`
**Fix**:
1. Pull latest code dari repository
2. Rebuild dan redeploy admin panel
3. Clear browser cache

### User baru register tidak muncul di admin panel

**Cause**: Trigger `on_auth_user_created` tidak berjalan
**Fix**:
1. Verify trigger sudah dibuat dengan query:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
2. Manual insert user ke profiles jika perlu

## Rollback Migration

Jika perlu rollback (hati-hati, akan menghapus semua data profiles):

```sql
-- Drop view
DROP VIEW IF EXISTS user_statistics;

-- Drop policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can manage profiles" ON profiles;

-- Drop trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop table
DROP TABLE IF EXISTS profiles CASCADE;
```

## Support

Jika ada masalah saat migration:
1. Check Supabase logs di Dashboard > Logs
2. Verify connection string dan credentials
3. Contact admin atau buka issue di repository

## Next Steps

Setelah migration berhasil:
- [ ] Test toggle user status di admin panel
- [ ] Set admin users yang diperlukan
- [ ] Configure email notifications (optional)
- [ ] Setup user onboarding flow (optional)
