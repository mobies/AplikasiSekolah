# Current Progress - Status Pengembangan
> Last Updated: 2026-05-14

## 📊 Progress Summary

| Fase | Nama | Progress |
|:---|:---|:---:|
| Fase 0 | Platform Foundation | **47%** |
| Fase 1 | Onboarding & Data Sekolah | **64%** |
| Fase 1.5 | Integrasi Pemerintah | **0%** |
| Fase 2 | Akademik & Presensi | **0%** |
| Fase 3 | Financial Engine | **12%** |
| Fase 4 & 5 | Ecosystem, Marketplace, AI | **0%** |
| **TOTAL** | | **~21%** |

---

## 1. Fitur Selesai (Completed)

### Infrastruktur & Security
- [x] Setup Next.js 16 (App Router) + Firebase v10+ + Cloud Functions V2
- [x] Google SSO terintegrasi dengan verifikasi role sisi server (`checkUserRole`)
- [x] Dynamic CORS Allow-list via RTDB (`init_origins.js` + `system/config/allowedOrigins`)
- [x] RBAC dasar: `owner` dan `admin_sekolah`
- [x] File Admin SDK dikecualikan dari Git
- [x] RTDB Security Rules untuk isolasi data multi-tenant per NPSN
- [x] Git repository aktif (GitHub: `mobies/AplikasiSekolah`)
- [x] Manual deploy via Firebase CLI

### Owner Dashboard
- [x] Pendaftaran sekolah baru via Google Login (`/register`)
- [x] Approval & Reject permohonan sekolah (`approveSchool`, `rejectSchool`)
- [x] Owner Management Panel: list semua sekolah + statistik
- [x] Konfigurasi paket langganan (Starter, Standard, Enterprise)
- [x] Konfigurasi Payment Gateway (Midtrans, Xendit, iPaymu, Duitku, Louvin)
- [x] Konfigurasi SMTP Owner untuk notifikasi email
- [x] Subscription Guard (blokir akses jika langganan expired)
- [x] Auto-redirection per role setelah login

### Dashboard Admin Sekolah
- [x] Dashboard `/school/{npsn}/dashboard` dengan statistik real-time
- [x] Widget Quick Stats: Total User, Siswa, Guru, Kelas, Rombel
- [x] Summary Triggers otomatis: `onUserChange`, `onStudentChange`, `onTeacherChange`, `onClassChange`, `onRombelChange`
- [x] Recalculate summary manual via `recalcSummary`
- [x] Menu navigasi sidebar lengkap

### Data Induk Sekolah
- [x] Impor data JSON massal: siswa, guru, kelas, rombel (`importSchoolData`)
- [x] Preview data sebelum eksekusi impor
- [x] Pemilihan Tahun Ajaran saat impor
- [x] Halaman daftar Siswa (`/school/{npsn}/students`)
- [x] Halaman daftar Guru (`/school/{npsn}/teachers`)
- [x] Halaman daftar Kelas (`/school/{npsn}/classes`)
- [x] Manajemen Referensi Kelas (`manageClassroomReference`)
- [x] Update Detail Siswa: nama, foto, data lengkap (`updateStudentDetail`)

### Manajemen Rombel
- [x] Halaman Rombel (`/school/{npsn}/rombel`)
- [x] Enroll siswa ke rombel (bulk)
- [x] Unenroll siswa dari rombel (bulk)
- [x] Pindah kelas antar rombel (bulk)
- [x] Non-aktifkan siswa (deactivate + archive)
- [x] Luluskan siswa (graduate)
- [x] Restore siswa dari arsip / alumni
- [x] Halaman Arsip Siswa (`/school/{npsn}/archive`)
- [x] Trigger otomatis sinkronisasi jumlah siswa per rombel

### Sistem Link Undangan (BARU — Di Luar Rencana Awal)
- [x] Generate Link Undangan per role (siswa/guru) dengan token aman (`generateInvitationLink`)
- [x] Path undangan terpusat: `/invitations/{NPSN}/{USER_TYPE}`
- [x] Link undangan siswa menyertakan data rombel & tahun ajaran
- [x] Halaman Manajemen Undangan Admin (`/school/{npsn}/invitations`)
- [x] Validasi token: kadaluwarsa, NPSN, role (`validateInvitationToken`)
- [x] Pencabutan link undangan (`revokeInvitationLink`)
- [x] Halaman Pendaftaran Publik via token (`/join/[token]`) — desain glassmorphism premium
- [x] Alur pendaftaran via undangan (`registerViaInvitation`)

### Sistem Validasi Undangan / Approval (BARU — Di Luar Rencana Awal)
- [x] Antrean Approval: pendaftar masuk ke `/invitation_responses/{NPSN}/{role}/{uid}` berstatus `pending`
- [x] Admin Approve: data dipindahkan ke `users/`, `students/`, `teachers/` dengan status `approved`
- [x] Admin Reject: data dihapus dari antrean
- [x] Deteksi pendaftaran ganda (`hasPending`): tampilkan UI "Sedang Diverifikasi"
- [x] Deteksi user terdaftar (`isRegistered`): tampilkan UI "Sudah Terdaftar" + redirect login
- [x] Menu "Validasi Undangan" di sidebar dashboard admin sekolah
- [x] Halaman Validasi Undangan (`/invitations/responses`) dengan aksi Approve/Reject
- [x] Badge notifikasi real-time (counter pendaftar baru) di sidebar & halaman undangan
- [x] Fungsi `manageInvitationResponse` (backend approve/reject)

---

## 2. Sedang Dikerjakan (In Progress)
- *Tidak ada item aktif saat ini.*

---

## 3. Bug Aktif (Active Bugs)
- *Tidak ada bug kritis yang diketahui saat ini.*

---

## 4. Task Prioritas Selanjutnya

### 🔴 Sangat Mendesak (Melengkapi Fase 1)
1. **CRUD Manual Siswa** — Tambah/edit/hapus satu siswa tanpa impor JSON
2. **CRUD Manual Guru** — Tambah/edit/hapus satu guru tanpa impor JSON
3. **Profil Sekolah** — Admin edit nama, logo, visi misi, koordinat
4. **Upload Logo Sekolah** — ke Firebase Storage
5. **Audit Trail** — Log perubahan data (UU PDP 2022)

### 🟡 Penting (Game Changer)
6. **Integrasi Dapodik** — Import/export data dari sistem Kemdikbud
7. **PPDB Online** — Form pendaftaran siswa baru per sekolah
8. **Log Activity UI** — Tampilkan log perubahan di dashboard

### 🟢 DevOps
9. **CI/CD GitHub Actions** — Auto deploy saat push ke `main`
10. **Firebase App Check** — Keamanan dari bot/client tidak resmi

---

## 5. Catatan Session Terakhir (2026-05-14)
- Berhasil memulihkan semua Cloud Functions yang sempat terhapus (`payment_gateway.ts`, `system_settings.ts`, data triggers).
- Memperbaiki error `Clock is not defined` di halaman `/join/[token]`.
- Menambahkan deteksi `isRegistered` — user yang sudah terdaftar aktif akan ditolak dan diarahkan ke halaman login.
- Seluruh perubahan sudah di-deploy ke Firebase dan di-push ke GitHub.
