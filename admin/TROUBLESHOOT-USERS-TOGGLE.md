# Troubleshooting: Toggle User Status Tidak Berfungsi

Panduan ini untuk mengatasi masalah fitur aktif/nonaktif user di halaman Users admin panel yang tidak berfungsi.

## 🔍 Diagnosa Masalah

### Step 1: Cek Browser Console

1. Buka admin panel → halaman **Users**
2. Buka **DevTools** (F12) → Tab **Console**
3. Klik tombol toggle user status (icon toggle di kolom Aksi)
4. Lihat error message di console

**Expected logs (jika berhasil):**
```
🔄 Toggling status for user: <uuid> from true to false
✅ Status updated successfully: [data]
✅ Users fetched: [...]
```

**Common errors:**

#### Error A: "permission denied for table profiles"
```
❌ Error updating status: {
  code: "42501",
  message: "permission denied for table profiles"
}
```

**Cause**: RLS policies belum diterapkan atau user bukan admin

**Fix**: Ikuti **Step 2** dan **Step 3** di bawah

---

#### Error B: "column is_active does not exist"
```
❌ Error updating status: {
  code: "42703",
  message: "column \"is_active\" does not exist"
}
```

**Cause**: Database migration belum dijalankan

**Fix**: Ikuti **Step 2** di bawah

---

#### Error C: "row-level security policy violation"
```
❌ Error updating status: {
  code: "P0001",
  message: "new row violates row-level security policy"
}
```

**Cause**: User yang login bukan admin atau RLS policy salah

**Fix**: Ikuti **Step 3** di bawah

---

#### Error D: Tidak ada error, tapi status tidak berubah

**Cause**: Refresh tidak berjalan atau data cached

**Fix**: Hard refresh (Ctrl+F5) atau check **Step 4**

---

### Step 2: Verify Database Schema

**Di Supabase Dashboard → SQL Editor**, jalankan query ini:

#### A. Cek apakah tabel profiles ada dan punya field is_active:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

**Expected output:**
```
column_name    | data_type         | column_default
---------------|-------------------|----------------
id             | uuid              |
email          | character varying |
display_name   | character varying |
...
role           | character varying | 'customer'
is_active      | boolean           | true
created_at     | timestamp         | now()
updated_at     | timestamp         | now()
```

**Jika `is_active` TIDAK ADA**, jalankan migration:

```sql
-- Copy & paste isi file: supabase-profiles-fix.sql
-- atau jalankan manual:

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'customer';

-- Update existing users
UPDATE profiles
SET is_active = COALESCE(is_active, true),
    role = COALESCE(role, 'customer')
WHERE is_active IS NULL OR role IS NULL;
```

#### B. Cek RLS policies untuk profiles:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles';
```

**Expected output (minimal):**
```
policyname                    | cmd    | qual                     | with_check
------------------------------|--------|--------------------------|------------
Admins can update all profiles| UPDATE | (EXISTS...)              | true
Users can view own profile    | SELECT | (auth.uid() = id)        | ...
...
```

**Jika policies TIDAK ADA**, jalankan migration:

```sql
-- Copy & paste isi file: supabase-profiles-fix.sql
-- File ini sudah include semua RLS policies yang diperlukan
```

---

### Step 3: Set Admin Role untuk User Anda

**Problem**: User yang login belum punya `role = 'admin'`

**Fix**:

```sql
-- Ganti dengan email Anda yang digunakan untuk login
UPDATE profiles
SET role = 'admin', is_active = true
WHERE email = 'your-email@example.com';
```

**Verify**:
```sql
SELECT id, email, display_name, role, is_active
FROM profiles
WHERE email = 'your-email@example.com';
```

**Expected output:**
```
email                  | role  | is_active
-----------------------|-------|----------
your-email@example.com | admin | true
```

**PENTING**: Setelah update role, **logout dan login kembali** di admin panel agar session ter-refresh.

---

### Step 4: Test Toggle Functionality

Setelah ikuti Step 2 & 3:

1. **Logout** dari admin panel
2. **Clear browser cache** (Ctrl+Shift+Del)
3. **Login** kembali dengan akun admin
4. Buka halaman **Users**
5. Klik toggle status di kolom **Aksi**

**Expected behavior:**
- ✅ Toggle icon berubah dari **FiToggleRight** (merah) → **FiToggleLeft** (hijau)
- ✅ Status badge berubah dari **Aktif** (hijau) → **Nonaktif** (merah)
- ✅ Success message muncul: "Pengguna berhasil dinonaktifkan"
- ✅ Page refresh, status tetap berubah

---

### Step 5: Manual Test di Supabase

Jika masih tidak berfungsi, test manual update:

```sql
-- Ambil user ID yang mau di-test
SELECT id, email, is_active FROM profiles LIMIT 3;

-- Copy salah satu ID, lalu update manual
UPDATE profiles
SET is_active = false
WHERE id = '<uuid-yang-dicopy>';

-- Verify
SELECT id, email, is_active FROM profiles WHERE id = '<uuid>';
```

**Jika manual update BERHASIL** → Masalah di frontend atau RLS policies

**Jika manual update GAGAL** → Masalah di database permissions

---

## 🛠️ Complete Fix Checklist

Jalankan semua ini di **Supabase SQL Editor**:

### 1. Rollback migration yang error (jika ada)
```sql
-- Paste isi file: supabase-rollback.sql
```

### 2. Apply fix migration
```sql
-- Paste isi file: supabase-profiles-fix.sql
-- Ini akan:
-- ✅ Add column is_active & role
-- ✅ Create RLS policies untuk admin
-- ✅ Create indexes
-- ✅ Create triggers
```

### 3. Set admin user
```sql
UPDATE profiles
SET role = 'admin', is_active = true
WHERE email = 'your-email@example.com';
```

### 4. Verify setup
```sql
-- Cek column ada
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name IN ('is_active', 'role');

-- Cek RLS policies ada
SELECT count(*) FROM pg_policies WHERE tablename = 'profiles';

-- Cek admin user
SELECT email, role, is_active FROM profiles WHERE role = 'admin';
```

**Expected results:**
- Column check: 2 rows (is_active, role)
- Policies check: 6-8 policies
- Admin user: Your email with role='admin', is_active=true

---

## 🔧 Advanced Debugging

### Enable Verbose Logging

Edit `admin/src/pages/Users.js`, tambahkan logging di handleToggleStatus:

```javascript
const handleToggleStatus = async (userId, currentStatus) => {
  try {
    console.log("=== TOGGLE STATUS DEBUG START ===");
    console.log("User ID:", userId);
    console.log("Current status:", currentStatus);
    console.log("New status:", !currentStatus);

    const { data, error } = await supabase
      .from("profiles")
      .update({
        is_active: !currentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select();

    console.log("Update result:", { data, error });

    if (error) {
      console.error("=== UPDATE FAILED ===");
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error);
      throw error;
    }

    console.log("=== TOGGLE STATUS DEBUG END ===");
    // ... rest of code
  } catch (error) {
    console.error("=== CATCH ERROR ===", error);
    // ... error handling
  }
};
```

### Check Supabase Auth Status

Di browser console:

```javascript
// Get current session
const { data: { session } } = await window.supabase.auth.getSession();
console.log("Current user:", session?.user);

// Get user profile
const { data: profile } = await window.supabase
  .from('profiles')
  .select('*')
  .eq('id', session?.user?.id)
  .single();
console.log("User profile:", profile);
```

**Expected output:**
```javascript
{
  id: "<uuid>",
  email: "your-email@example.com",
  role: "admin",  // MUST BE 'admin'
  is_active: true
}
```

---

## 🚨 Common Mistakes

### Mistake 1: Pakai Anon Key bukan Service Role Key

Di `admin/src/lib/supabase.js`, pastikan pakai **anon key**, BUKAN service role key.

**Correct:**
```javascript
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
```

RLS policies akan handle permissions. Service role key tidak diperlukan di frontend.

### Mistake 2: Lupa Logout & Login Setelah Set Admin Role

Session cache bisa menyimpan role lama. **Always logout & login** setelah update role.

### Mistake 3: RLS Policies Block Admin

Cek policy "Admins can update all profiles":

```sql
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles' AND policyname LIKE '%Admin%';
```

**Expected qual:**
```sql
(EXISTS ( SELECT 1
   FROM profiles profiles_1
  WHERE ((profiles_1.id = auth.uid())
    AND (profiles_1.role = 'admin'::text)
    AND (profiles_1.is_active = true))))
```

Jika tidak ada, run `supabase-profiles-fix.sql` lagi.

---

## ✅ Final Verification

Setelah semua fix:

1. [ ] Migration `supabase-profiles-fix.sql` berhasil dijalankan
2. [ ] Column `is_active` dan `role` ada di table profiles
3. [ ] RLS policies untuk admin sudah aktif
4. [ ] User Anda punya `role = 'admin'` dan `is_active = true`
5. [ ] Logout & login kembali
6. [ ] Toggle button punya warna (merah/hijau)
7. [ ] Klik toggle → status berubah
8. [ ] Refresh page → status tetap berubah
9. [ ] Success message muncul
10. [ ] Tidak ada error di browser console

---

## 📞 Still Not Working?

Jika masih tidak berfungsi setelah ikuti semua steps:

1. **Screenshot error message** di browser console (lengkap)
2. **Run diagnostic query** dan screenshot hasilnya:
   ```sql
   -- Full diagnostic
   SELECT
     (SELECT count(*) FROM information_schema.columns
      WHERE table_name='profiles' AND column_name='is_active') as has_is_active,
     (SELECT count(*) FROM pg_policies
      WHERE tablename='profiles') as policy_count,
     (SELECT count(*) FROM profiles WHERE role='admin') as admin_count,
     (SELECT email FROM profiles WHERE role='admin' LIMIT 1) as admin_email;
   ```
3. **Export profile data** (hide sensitive info):
   ```sql
   SELECT id, email, role, is_active, created_at
   FROM profiles
   WHERE email = 'your-email@example.com';
   ```

Share screenshots untuk debugging lebih lanjut.
