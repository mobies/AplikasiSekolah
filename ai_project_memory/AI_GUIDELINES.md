# AI Developer Guidelines — Aplikasi Sekolah SaaS
## Panduan Lengkap untuk Model AI yang Meneruskan Project

> **Baca file ini PERTAMA KALI sebelum menyentuh kode apapun.**  
> Dibuat: 2026-05-09 | Berlaku untuk semua sesi mendatang.

---

## 1. GAMBARAN UMUM PROJECT

**Nama:** Aplikasi Sekolah SaaS (Multi-Tenant)  
**GitHub:** https://github.com/mobies/AplikasiSekolah  
**Firebase Project:** `appsekolah2026`  
**Region Firebase:** `asia-southeast1`

**Stack Utama:**
- **Frontend:** Next.js 16 (App Router) + Tailwind CSS
- **Backend:** Firebase Cloud Functions V2 (TypeScript)
- **Database:** Firebase RTDB (primary) + Firestore (belum aktif)
- **Auth:** Firebase Auth (Google SSO)
- **Hosting:** Firebase Hosting (SSR via Cloud Run)

**Lokasi File Kritis:**
```
Aplikasi Sekolah/
├── ai_project_memory/          ← BACA SEMUA FILE DI SINI DULU
│   ├── ROADMAP.md              ← Fase pengembangan & status
│   ├── TODO.md                 ← Task aktif yang harus dikerjakan
│   ├── DB_MAP.md               ← Struktur database lengkap
│   └── AI_GUIDELINES.md        ← File ini
├── functions/src/              ← Backend Cloud Functions
│   ├── index.ts                ← Fungsi utama (auth, approval, dll)
│   ├── school_settings.ts      ← Fungsi admin sekolah (PG, SMTP, impor)
│   ├── system_settings.ts      ← Fungsi owner (plan, global PG, SMTP)
│   ├── payment_gateway.ts      ← Fungsi PG global
│   └── data_triggers.ts        ← Database triggers (statistik)
└── web/src/app/               ← Frontend Next.js pages
    ├── page.tsx                ← Landing page
    ├── login/                  ← Halaman login
    ├── register/               ← Halaman daftar sekolah
    ├── owner/dashboard/        ← Dashboard owner
    ├── owner/settings/         ← Pengaturan owner (PG, SMTP, plan)
    └── school/[npsn]/          ← Panel admin sekolah per NPSN
        ├── dashboard/          ← Dashboard statistik sekolah
        ├── settings/           ← Pengaturan sekolah (PG, SMTP, impor data)
        ├── students/           ← Halaman daftar siswa
        ├── teachers/           ← Halaman daftar guru
        └── classes/            ← Halaman daftar kelas
```

---

## 2. ATURAN WAJIB (HARUS DIPATUHI)

### 🔴 KEAMANAN — KRITIS

| Aturan | Detail |
|:---|:---|
| **JANGAN commit Admin SDK JSON** | File `*-firebase-adminsdk-*.json` ada di `.gitignore`. Jangan pernah di-commit. |
| **JANGAN hardcode secrets** | API key, password, token → simpan di Firebase Functions config atau environment variable. |
| **JANGAN expose NPSN sekolah lain** | Setiap fungsi harus validasi `validateSchoolAdmin()` sebelum akses data sekolah. |

### 🔴 TERMINOLOGI (PENTING)
- **Kelas (`reference/classroom`)**: Ruang fisik atau referensi tingkatan kosong yang *dapat* diisi oleh siswa.
- **Rombel (`rombel`)**: Rombongan Belajar, yakni Kelas yang *telah terisi* oleh siswa pada tahun ajaran tertentu. UI Manajemen Kelas disajikan dalam bentuk dialog di dalam halaman Data Rombel.

### 🔴 GIT & WORKFLOW
- **JANGAN** melakukan `git commit` atau `git push` secara otomatis setelah setiap tugas. Tunggu instruksi eksplisit dari USER sebelum melakukan commit dan push.

### 🔴 DATABASE — KRITIS

| Aturan | Detail |
|:---|:---|
| **JANGAN baca full path untuk statistik** | SELALU baca dari `/schools/summary/{NPSN}` untuk tampilan count. |
| **JANGAN buat trigger yang full-scan** | Trigger harus menggunakan `countChildren()` bukan iterasi data. |
| **Selalu update DB_MAP.md** | Setiap ada path baru yang ditambahkan, update `ai_project_memory/DB_MAP.md`. |

### 🟠 FIREBASE FUNCTIONS — PENTING

| Aturan | Detail |
|:---|:---|
| **JANGAN tambahkan `cors: true`** | Fungsi `onCall` V2 menangani CORS otomatis via Firebase SDK. `cors: true` menyebabkan konflik. |
| **Gunakan region `asia-southeast1`** | Semua fungsi harus menggunakan region ini untuk konsistensi. |
| **Runtime: Node.js 22** | Jangan downgrade ke Node 20 (sudah deprecated). |
| **Jangan tambahkan `cors: true` pada onCall** | Sudah disebutkan, ini penting karena sering dilupakan. |

### 🟠 DEPLOY — PENTING

| Aturan | Detail |
|:---|:---|
| **Deploy functions dulu jika ada perubahan backend** | `firebase deploy --only functions` sebelum test fitur baru. |
| **Compile TypeScript sebelum deploy** | `cd functions && npm run build` untuk cek error lebih awal. |
| **Hindari perubahan besar tanpa test lokal** | Gunakan emulator untuk test perubahan signifikan. |

### 🟡 FRONTEND — STANDAR

| Aturan | Detail |
|:---|:---|
| **Selalu cleanup listeners RTDB** | Gunakan `useRef` untuk menyimpan unsubscribe functions dan cleanup di return effect. |
| **State naming convention** | `isLoading` untuk global loading, `isSaving` untuk save operations, `isProcessing` untuk aksi lainnya. |
| **Gunakan SweetAlert2 untuk dialog penting** | Bukan `window.confirm()` atau `window.alert()`. |
| **Framer Motion untuk transisi** | Sudah tersedia, gunakan untuk animasi halaman. |

---

## 3. POLA KODE YANG SUDAH TERBUKTI

### Pattern: Firebase onCall Function (Benar)
```typescript
export const myFunction = onCall({
  region: "asia-southeast1",
  memory: "256MiB",  // sesuaikan kebutuhan
  // JANGAN tambahkan cors: true di sini
}, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
  try {
    // ... logic
    return { success: true };
  } catch (error: any) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});
```

### Pattern: RTDB Listener di React (Benar)
```typescript
const unsubsRef = useRef<{ [key: string]: any }>({ auth: null, data: null });

useEffect(() => {
  const unsubAuth = auth.onAuthStateChanged((user) => {
    if (!user) { router.push("/login"); return; }
    
    const dataRef = ref(rtdb, `schools/summary/${npsn}`);
    const unsubData = onValue(dataRef, (snap) => {
      if (snap.exists()) setStats(snap.val());
    });
    
    unsubsRef.current.auth = unsubAuth;
    unsubsRef.current.data = unsubData;
  });

  return () => {
    Object.values(unsubsRef.current).forEach(unsub => unsub && unsub());
  };
}, [npsn]);
```

### Pattern: Menampilkan Statistik (Benar vs Salah)
```typescript
// ✅ BENAR — baca dari summary (1 RTDB read)
const statsRef = ref(rtdb, `schools/summary/${npsn}`);
onValue(statsRef, (snap) => setStats(snap.val()));

// ❌ SALAH — baca seluruh data siswa (N RTDB reads, mahal!)
const studentsRef = ref(rtdb, `schools/students/${npsn}`);
onValue(studentsRef, (snap) => setTotalStudents(Object.keys(snap.val()).length));
```

### Pattern: Impor Data Massal (Benar)
```typescript
// ✅ BENAR — batch write + langsung update summary
const updates: any = {};
// ... tambahkan semua data ke updates object
await admin.database().ref().update(updates); // 1 write operation
// Langsung hitung dan update summary dari data yang baru diimpor
await admin.database().ref(`schools/summary/${npsn}`).update({
  totalStudents: studentCount,
  // ...
});

// ❌ SALAH — tulis satu per satu (N write operations + trigger storm)
for (const student of students) {
  await admin.database().ref(`schools/students/${npsn}/${nisn}`).set(student);
}
```

---

## 4. ALUR KERJA YANG DISARANKAN

### Saat Mulai Sesi Baru
1. Baca `ai_project_memory/TODO.md` — cek task aktif.
2. Baca `ai_project_memory/DB_MAP.md` — pahami struktur data terkini.
3. Baca `ai_project_memory/ROADMAP.md` — cek fase & prioritas.
4. Jalankan `git log --oneline -10` untuk memahami perubahan terbaru.

### Saat Menambah Fitur Baru
1. Cek apakah fitur ada di TODO.md — kerjakan yang HIGH PRIORITY dulu.
2. Tulis/ubah kode.
3. Jika ada path database baru → update `DB_MAP.md`.
4. Jika ada fitur selesai → update status di `TODO.md` dan `ROADMAP.md`.
5. Commit dengan pesan yang deskriptif.
6. Push ke GitHub.

### Saat Deploy
```bash
# Deploy functions saja (lebih cepat, untuk perubahan backend)
firebase deploy --only functions

# Deploy hosting saja (untuk perubahan frontend)
firebase deploy --only hosting

# Deploy semua (jika ada perubahan di keduanya)
firebase deploy
```

---

## 5. KONTEKS TEKNIS PENTING

### Kenapa Deploy Bisa Lambat
- Bundle SSR Next.js ~530MB diupload setiap `firebase deploy`.
- Solusi: Gunakan `firebase deploy --only functions` jika hanya backend yang berubah.
- Ada 2 `package-lock.json` (root & web/) yang sudah diatasi dengan menghapus yang di root.

### Tentang Payment Gateway
Saat ini dikonfigurasi tapi **belum ada logika transaksi aktif**. Konfigurasi disimpan ke:
- **Owner (Global):** `/system/config/payment_gateway/{provider}`
- **Per Sekolah:** `/schools/configs/{NPSN}/payment_gateway/{provider}`

Provider yang didukung: `midtrans`, `xendit`, `ipaymu`, `duitku`, `louvin`

Untuk Louvin: Base URL `https://api.louvin.dev`, endpoint transaksi `https://api.louvin.dev/create-transaction`. Kredensial: `slug` + `apiKey` + `endpoint`.

### Tentang Subscription Guard
Komponen `SubscriptionGuard` memblokir akses jika status sekolah bukan `active` atau subscription sudah expired. Wrapped di setiap halaman admin sekolah.

### Tentang Impor Data JSON
Format data JSON yang diharapkan:
```json
{
  "uid123": {
    "nama": "Budi Santoso",
    "email": "budi@email.com",
    "role": "peserta",    // "peserta"=student, "author"=teacher
    "kelas": "XI-IPA-1",
    "nisn": "0012345678",
    "status": "active"
  }
}
```

---

## 6. STATUS FASE SAAT INI

| Fase | Status | Prioritas Sisa |
|:---|:---|:---|
| **Fase 1: Foundation** | ~60% | CMS Sekolah, PPDB, Log Activity |
| **Fase 2: Academic** | 0% | Menunggu Fase 1 selesai |
| **Fase 3: Financial Engine** | ~10% | Konfigurasi PG sudah ada, transaksi belum |
| **Fase 4: Marketplace** | 0% | Belum dimulai |
| **Fase 5: IoT + AI** | 0% | Belum dimulai |

### Task HIGH PRIORITY yang Harus Dikerjakan (Fase 1):
1. **Website CMS Sekolah** — Landing page dinamis per NPSN, berita, galeri.
2. **PPDB Online** — Form pendaftaran siswa baru, dashboard pemantauan.
3. **Log Activity** — Catat aktivitas penting ke database.
4. **Profil Sekolah** — Admin bisa edit profil, logo, visi misi.

---

## 7. CHEAT SHEET PERINTAH

```bash
# Dev server frontend
cd web && npm run dev

# Build functions TypeScript (cek error)
cd functions && npm run build

# Deploy hanya functions
firebase deploy --only functions

# Deploy hanya hosting
firebase deploy --only hosting

# Deploy semua
firebase deploy

# Lihat log functions
firebase functions:log

# Git — commit semua perubahan
git add .
git commit -m "feat: deskripsi singkat perubahan"
git push origin main

# Cek status git
git status
git log --oneline -10
```

---

## 8. KONTAK & REFERENSI

- **GitHub Repo:** https://github.com/mobies/AplikasiSekolah
- **Firebase Console:** https://console.firebase.google.com/project/appsekolah2026
- **Hosting URL:** https://appsekolah2026.web.app
- **Louvin API Docs:** https://louvin.dev (slug + API key required)
