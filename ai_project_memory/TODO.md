# TODO — Daftar Tugas Aktif

> **Sinkron dengan:** [ROADMAP.md](./ROADMAP.md) & [AI_GUIDELINES.md](./AI_GUIDELINES.md)  
> **Update terakhir:** 2026-05-09

---

## 🔴 HIGH PRIORITY — Sisa Fase 1 (KERJAKAN INI DULU)

- [ ] **Website CMS Sekolah (Landing Page Dinamis)**
  - [ ] Halaman publik per NPSN: `/{npsn}` atau `/school/{npsn}/info`
  - [ ] Data dari `/schools/lists/{NPSN}` (nama, visi misi, alamat)
  - [ ] Modul Berita & Pengumuman
  - [ ] Galeri Foto Kegiatan

- [ ] **Sistem PPDB Online (Pendaftaran Siswa Baru)**
  - [ ] Form pendaftaran siswa baru per sekolah
  - [ ] Dashboard pemantauan pendaftar (admin sekolah)
  - [ ] Notifikasi email ke orang tua

- [ ] **Profil Sekolah (Admin Edit Profil)**
  - [ ] Admin bisa upload logo sekolah
  - [ ] Edit profil: nama, alamat, visi misi, koordinat peta
  - [ ] Simpan ke `/schools/lists/{NPSN}` dan Firebase Storage

- [ ] **Log Activity**
  - [ ] Catat aktivitas penting ke `/schools/logs/{NPSN}/{logId}`
  - [ ] Tampilkan di dashboard admin sekolah (10 aktivitas terbaru)

---

## 🟡 MEDIUM PRIORITY

- [ ] **Manajemen Data Siswa (CRUD Manual)**
  - [ ] Tambah siswa baru secara manual (bukan hanya impor JSON)
  - [ ] Edit data siswa
  - [ ] Hapus siswa dengan validasi (soft delete)

- [ ] **Manajemen Data Guru (CRUD Manual)**
  - [ ] Tambah guru baru secara manual
  - [ ] Edit dan hapus data guru

- [ ] **Manajemen Allow-List UI**
  - [ ] Menu di Owner Dashboard untuk kelola `/system/config/allowedOrigins`
  - [ ] Tambah/hapus domain tanpa menyentuh database manual

- [ ] **Export Data**
  - [ ] Export data siswa ke CSV
  - [ ] Export data guru ke CSV

---

## 🟢 LOW PRIORITY

- [ ] **Email Customization**
  - [ ] Template email yang bisa disesuaikan per sekolah

- [ ] **Multi-language Support**
  - [ ] Dukungan Bahasa Indonesia & Inggris pada dashboard

- [ ] **CI/CD via GitHub Actions**
  - [ ] Auto deploy ke Firebase Hosting saat push ke `main`

- [ ] **Kenaikan Kelas (Role Management)**
  - [ ] Fitur promosi massal siswa ke tingkat kelas berikutnya

---

## ✅ SELESAI (Fase 1 — Foundation)

- [x] **Owner Management Panel** — Approval, reject, plan config, lisensi real-time
- [x] **School Admin Dashboard** — Statistik real-time (User, Siswa, Guru, Rombel)
- [x] **Security Rules & RBAC** — Multi-tenant isolation, Cloud Functions validation
- [x] **Role Redirection** — Login auto-redirect berdasarkan role
- [x] **Data Migration Engine** — Impor JSON dengan preview + tahun ajaran
- [x] **Summary Triggers** — Auto-update statistik via RTDB triggers
- [x] **Payment Gateway Config** — Owner & per sekolah (Midtrans, Xendit, iPaymu, Duitku, Louvin)
- [x] **Owner Dashboard Summary** — Tampilkan statistik per sekolah di list Owner
- [x] **Admin SDK Security** — Ditambahkan ke .gitignore, tidak akan ter-commit
- [x] **CORS Fix** — Semua fungsi onCall sudah bersih dari `cors: true`
- [x] **Node.js Upgrade** — Upgrade dari Node 20 ke Node 22
- [x] **Trigger Cost Optimization** — Refactor trigger untuk hindari billing spike saat impor massal
- [x] **DB_MAP Update** — Dokumentasi lengkap semua path database terbaru
- [x] **AI_GUIDELINES** — Panduan lengkap untuk kontinuitas AI development
