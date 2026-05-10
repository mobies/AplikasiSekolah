# Database Map — Firebase Realtime Database Only (NPSN-Centric)

> **Last Updated:** 2026-05-09  
> **Status:** Sinkron dengan kode produksi terkini.

---

## DEFINISI TERMINOLOGI (PENTING)
- **Kelas (`reference/classroom`)**: Ruang fisik atau referensi tingkatan kosong yang *dapat* diisi oleh siswa.
- **Rombel (`rombel`)**: Rombongan Belajar, yakni Kelas yang *telah terisi* oleh siswa pada tahun ajaran tertentu.

---

## SKEMA LENGKAP PATH DATABASE

```
/
├── registers/
│   └── {uid}/
│       └── {NPSN}          → Pendaftaran sekolah (status: pending_approval | active | rejected)
│
├── schools/
│   ├── lists/
│   │   └── {NPSN}          → Metadata utama sekolah (nama, plan, expire, status)
│   │
│   ├── summary/
│   │   └── {NPSN}          → Statistik agregat (totalUsers, totalStudents, totalTeachers,
│   │                           totalClasses, totalRombel, lastUpdate)
│   │                           ⚡ DIPERBARUI OTOMATIS via data_triggers.ts
│   │
│   ├── students/
│   │   └── {NPSN}/
│   │       └── {uid}        → Data siswa (nama, nisn, classId, lastImported)
│   │
│   ├── teachers/
│   │   └── {NPSN}/
│   │       └── {uid}        → Data guru (nama, email, specialization)
│   │
│   ├── rombel/
│   │   └── {NPSN}/
│   │       └── {tahunAjaran}/    (format: "2025_2026")
│   │           └── {classId}/
│   │               └── {nisn}    → Anggota rombel (nama, joinedAt, uid)
│   │
│   ├── unrombel/
│   │   └── {NPSN}/
│   │       └── {nisn}            → Siswa yang belum masuk rombel (nama, uid, lastUpdated)
│   │
│   ├── reference/
│   │   └── {NPSN}/
│   │       └── classroom/
│   │           └── {classId}    → Definisi kelas (className, status)
│   │
│   └── configs/
│       └── {NPSN}/
│           └── payment_gateway/
│               ├── active_pg    → Provider aktif (string)
│               └── {provider}   → Konfigurasi PG (terenkripsi/sensitif)
│
├── users/
│   └── {NPSN}/
│       └── {uid}            → Profil user sekolah (nama, email, role, status, importedAt)
│
├── admins/
│   └── {NPSN}/
│       └── lists/
│           └── {uid}        → Daftar admin sekolah (value: nama_admin)
│
├── owner/
│   └── lists/
│       └── {uid}            → Hak akses Owner Global (email, nama, role: "Direktur")
│
└── system/
    └── config/
        ├── smtp/            → Konfigurasi SMTP global Owner
        ├── plans/           → Konfigurasi paket langganan (starter, standard, enterprise)
        ├── payment_gateway/ → Konfigurasi PG global Owner (midtrans, xendit, ipaymu, duitku, louvin)
        └── allowedOrigins/  → Whitelist domain yang diizinkan
```

---

## DETAIL STRUKTUR PER NODE

### `/registers/{uid}/{NPSN}`
```json
{
  "npsn": "12345678",
  "schoolName": "SMA Maju Jaya",
  "nama": "Dodi",
  "email": "dodi@email.com",
  "phone": "0812345678",
  "schoolAddress": "Jl. Merdeka No. 1",
  "status": "pending_approval | active | rejected",
  "role": "admin_utama",
  "createdAt": 1234567890
}
```

### `/schools/lists/{NPSN}`
```json
{
  "npsn": "12345678",
  "nama": "SMA Maju Jaya",
  "admin_uid": "UID_PENDAFTAR",
  "admin_name": "Dodi",
  "admin_email": "dodi@email.com",
  "admin_phone": "0812345678",
  "plan": "starter | standard | enterprise",
  "expire": "2026-05-08 17:00:00",
  "status": "active | inactive"
}
```

### `/schools/summary/{NPSN}` ⚡ Real-time Auto-updated
```json
{
  "totalUsers": 350,
  "totalStudents": 300,
  "totalTeachers": 25,
  "totalClasses": 10,
  "totalRombel": 280,
  "lastUpdate": 1715234567890
}
```

### `/schools/students/{NPSN}/{nisn}`
```json
{
  "nama": "Budi Santoso",
  "uid": "user_uid_123",
  "classId": "XI-IPA-1",
  "lastImported": 1715234567890
}
```

### `/schools/teachers/{NPSN}/{uid}`
```json
{
  "nama": "Pak Ahmad",
  "email": "ahmad@school.com",
  "specialization": "Regular Teacher | Observer/Teacher"
}
```

### `/schools/rombel/{NPSN}/{tahunAjaran}/{classId}/{nisn}`
```json
{
  "nama": "Budi Santoso",
  "uid": "user_uid_123",
  "joinedAt": 1715234567890
}
```

### `/users/{NPSN}/{uid}`
```json
{
  "nama": "Budi Santoso",
  "email": "budi@email.com",
  "role": "student | teacher",
  "status": "active",
  "importedAt": 1715234567890
}
```

---

## ALUR PROSES PENTING

### Alur Onboarding Sekolah
1. Admin Sekolah daftar via Google Login → tulis ke `/registers/{uid}/{NPSN}`.
2. Owner buka dashboard → lihat daftar dari `/registers`.
3. Owner klik "Approve" → Cloud Function `approveSchool`:
   - Tulis ke `/schools/lists/{NPSN}`.
   - Tulis ke `/admins/{NPSN}/lists/{uid}`.
   - Update status `/registers` → `active`.

### Alur Impor Data (Migration)
1. Admin upload JSON → parse di frontend → preview data.
2. Admin konfirmasi → panggil `importSchoolData` Cloud Function.
3. Function batch-write ke: `/users`, `/schools/students`, `/schools/teachers`, `/schools/rombel`, `/schools/reference/classroom`.
4. Function langsung update `/schools/summary/{NPSN}` dari hasil hitung (bukan mengandalkan trigger untuk efisiensi biaya).

### Alur Statistik Real-time (Normal Operation)
- Setiap perubahan data individual (bukan bulk import) memicu trigger.
- Trigger menulis ke `/schools/summary/{NPSN}` secara atomic per-field.
- Dashboard membaca hanya dari `/schools/summary/{NPSN}` (hemat biaya baca).

---

## CATATAN PENTING UNTUK DEVELOPER / AI

> ⚠️ **JANGAN pernah** membaca seluruh path `/schools/students/{NPSN}` untuk menampilkan jumlah siswa.  
> ✅ **SELALU** baca dari `/schools/summary/{NPSN}/totalStudents`.

> ⚠️ **JANGAN** membuat trigger baru yang melakukan full-scan data.  
> ✅ **GUNAKAN** `countChildren()` helper di `data_triggers.ts`.

> ⚠️ **JANGAN** menambahkan `cors: true` pada fungsi `onCall`. Firebase SDK v2 menanganinya otomatis.

> ⚠️ **JANGAN** commit file `*-firebase-adminsdk-*.json` ke Git. File ini ada di `.gitignore`.
