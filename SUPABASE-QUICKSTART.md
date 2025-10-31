# ⚡ Quick Start - Perbaikan SQL Supabase

## 🎯 Langkah Singkat (Copy-Paste)

### 1️⃣ Recovery (Perbaiki SQL yang rusak)

**Buka:** https://supabase.com/dashboard → SQL Editor → New Query

**Copy-paste file:** `supabase-complete-recovery.sql` → **Run**

✅ Tunggu sampai selesai (muncul "Success")

---

### 2️⃣ Set Admin User

**Di SQL Editor yang sama:** New Query

**Copy code ini** (ganti email!):

```sql
UPDATE profiles
SET role = 'admin', is_active = true
WHERE email = 'EMAIL-ANDA@example.com';  -- 🔥 GANTI EMAIL INI!

-- Verify
SELECT id, email, role, is_active FROM profiles WHERE email = 'EMAIL-ANDA@example.com';
```

**Run** → Pastikan role = 'admin' ✅

---

### 3️⃣ Test

**Buka:** https://catalis-admin.vercel.app/

**Login** dengan akun admin

**Cek:**
- ✅ Dashboard → Stats muncul
- ✅ Users → List users muncul
- ✅ Toggle status → Berfungsi

---

## 🆘 Kalau Masih Error?

Baca **PERBAIKAN-SQL.md** untuk troubleshooting lengkap.

---

**Selesai!** 🎉
