# Roadmap Extended — Aplikasi Sekolah SaaS (Industry Scale)

> **Gabungan ROADMAP eksisting + ide ekspansi skala industri**  
> Last Updated: 2026-05-09  
> 
> **Legenda Status:**
> - `[x]` — Selesai dikerjakan
> - `[ ]` — Belum dikerjakan (akan dikerjakan)
> - `[~]` — **SKIP** — Ditunda/tidak diprioritaskan saat ini
> - `[/]` — Sedang dalam pengerjaan

---

## ⚙️ Technical Stack & Environment

| Layer | Teknologi | Status |
|:---|:---|:---|
| Architecture | Multi-Tenant SaaS (isolasi data per NPSN) | ✅ Aktif |
| Backend | Firebase Cloud Functions V2 (TypeScript, Node.js 22) | ✅ Aktif |
| Frontend Web | Next.js 16 (App Router) + Tailwind CSS | ✅ Aktif |
| Database Primary | Firebase RTDB (real-time, counter, IoT) | ✅ Aktif |
| Database Secondary | Firestore (DINONAKTIFKAN SEMENTARA) | ❌ Removed |
| Database Lokal | SQLite (offline-first, POS & IoT) | 🔲 Belum aktif |
| Mobile Apps | Flutter (Android & iOS) | 🔲 Belum aktif |
| Desktop Apps | Electron (POS, CBT Client) | 🔲 Belum aktif |
| Hosting | Firebase Hosting (SSR via Cloud Run) | ✅ Aktif |
| Auth | Firebase Auth (Google SSO) | ✅ Aktif |
| Storage | Firebase Cloud Storage | 🔲 Belum digunakan |
| DevOps | CI/CD via GitHub Actions | 🔲 Belum dikonfigurasi |
| Monitoring | Sentry + Firebase Performance | 🔲 Belum dikonfigurasi |

---

## FASE 0 — Platform Foundation (Paralel)
> **Tujuan:** Landasan arsitektur yang scalable dan aman sebelum sekolah pertama masuk.

### 0.1 Security & Compliance
- [x] CORS Dynamic Allow-list di RTDB
- [x] Server-side validation via Firebase Functions V2
- [x] RBAC dasar (Owner vs Admin Sekolah)
- [x] File Admin SDK dikecualikan dari Git (.gitignore)
- [x] `cors: true` dibersihkan dari semua fungsi onCall
- [ ] **Audit Trail** — Setiap perubahan data dicatat `who/what/when/old/new` di `/audit_logs/{NPSN}/{logId}` *(UU PDP 2022 — Kewajiban hukum)*
- [ ] **Firebase App Check** — Mencegah akses dari client tidak resmi / bot
- [~] **Cloud Armor (DDoS)** — *SKIP: Belum diperlukan di fase awal*

### 0.2 Multi-Role Hierarchy (RBAC Granular)
- [x] Role: `owner` (global), `admin_sekolah`
- [ ] Role: `kepala_sekolah` — Akses penuh + approval kebijakan sekolah
- [ ] Role: `wakasek_kurikulum` — Jadwal, nilai, kelas, LMS
- [ ] Role: `wakasek_kesiswaan` — Presensi, ekskul, PPDB, data siswa
- [ ] Role: `bendahara` — Keuangan, SPP, laporan BOS
- [ ] Role: `wali_kelas` — Nilai & jurnal kelas yang diampu
- [ ] Role: `guru` — Input nilai & kehadiran kelas sendiri
- [ ] Role: `operator_dapodik` — Akses sinkronisasi data nasional
- [ ] Role: `bk` — Data bimbingan konseling (akses sensitif per siswa)
- [ ] Role: `orang_tua` — Portal read-only (nilai, presensi, tagihan)
- [~] Role: `siswa` — *SKIP: Cukup lewat portal orang tua di awal*

### 0.3 Yayasan / Multi-School Group
- [x] Struktur flat: 1 Owner → banyak NPSN
- [ ] **Layer Yayasan** — 1 entitas Yayasan dapat membawahi banyak NPSN
  - [ ] Dashboard Yayasan: konsolidasi statistik lintas sekolah
  - [ ] Penetapan kebijakan (paket, harga) di level Yayasan
  - [ ] Laporan keuangan agregat seluruh unit sekolah
- [~] **Franchise Network** — *SKIP: Terlalu kompleks, fase pasca-product market fit*

### 0.4 DevOps & Observability
- [x] Git repository (GitHub: `mobies/AplikasiSekolah`)
- [x] Manual deploy via Firebase CLI
- [ ] **CI/CD GitHub Actions** — Auto deploy ke Firebase saat push ke `main`
- [ ] **Error Tracking** — Integrasi Sentry.io (free tier)
- [ ] **Uptime Monitor** — UptimeRobot / BetterUptime
- [~] **Multi-region Failover** — *SKIP: Overkill untuk skala saat ini*

### 0.5 Backup & Disaster Recovery
- [ ] Export RTDB otomatis harian → Cloud Storage (via Cloud Scheduler)
- [ ] Retention 30 hari rolling backup
- [~] **Monthly Restore Drill** — *SKIP: Catat sebagai SOP manual dulu*

---

## FASE 1 — Foundation & Multi-School Onboarding ✅ ~60%
> **Tujuan:** Membangun ekosistem SaaS dan identitas digital sekolah.

### 1.1 SaaS Core
- [x] Pendaftaran sekolah via Google Login
- [x] Approval / Reject oleh Owner
- [x] Owner Management Panel (dashboard pendaftaran, lisensi)
- [x] Paket langganan (Starter, Standard, Enterprise) + konfigurasi harga
- [x] Subscription Guard (blokir akses jika expired)
- [x] Single Sign-On (SSO) dengan Google Auth + auto-redirection per role
- [x] School Admin Dashboard (statistik real-time: User, Siswa, Guru, Rombel)
- [x] Owner Dashboard: tampilkan ringkasan statistik per sekolah di list

### 1.2 Data Induk Sekolah
- [x] Impor data JSON (migrasi massal: siswa, guru, kelas, rombel)
- [x] Preview data sebelum eksekusi impor
- [x] Pemilihan Tahun Ajaran saat impor
- [x] Auto-update summary setelah impor (tanpa trigger storm)
- [x] Halaman daftar Siswa (`/school/{npsn}/students`)
- [x] Halaman daftar Guru (`/school/{npsn}/teachers`)
- [x] Halaman daftar Kelas (`/school/{npsn}/classes`)
- [ ] **CRUD Manual Siswa** — Tambah/edit/hapus siswa tanpa impor JSON
- [ ] **CRUD Manual Guru** — Tambah/edit/hapus guru tanpa impor JSON
- [ ] **Profil Sekolah** — Admin edit profil, logo, visi misi, koordinat peta
- [ ] **Upload Logo Sekolah** — ke Firebase Storage, tampil di dashboard

### 1.3 CMS & Portal Publik
- [ ] **Landing Page Publik per Sekolah** — `/{npsn}` atau `/s/{npsn}`
  - [ ] Profil sekolah, visi misi, fasilitas (data dari RTDB/Firestore)
  - [ ] Modul Berita & Pengumuman
  - [ ] Galeri Foto Kegiatan
- [~] **Blog/Artikel Sekolah** — *SKIP: CMS dasar cukup dulu*

### 1.4 PPDB Online
- [ ] Form pendaftaran siswa baru per sekolah
- [ ] Dashboard pemantauan pendaftar (admin sekolah)
- [ ] Notifikasi status pendaftaran via email (SMTP yang sudah ada)
- [~] **Seleksi Otomatis berdasarkan Nilai/Zonasi** — *SKIP: Fase berikutnya*

### 1.5 Logging & Activity
- [ ] **Log Activity** — `/schools/logs/{NPSN}/{logId}` (who, action, timestamp)
- [ ] Tampilkan 10 log terbaru di dashboard admin sekolah
- [ ] **Allow-List UI di Owner Dashboard** — Kelola `allowedOrigins` tanpa database manual

---

## FASE 1.5 — Government Integration (Game Changer 🇮🇩)
> **Tujuan:** Integrasi dengan sistem data nasional Kemdikbud & Kemenag.  
> *Ini adalah pembeda utama dari semua kompetitor.*

### 1.5.1 Dapodik (Kemdikbud — KILLER FEATURE)
- [ ] **Import dari Dapodik** — Baca data siswa & guru dari file ekspor Dapodik
  - [ ] Mapping field Dapodik → struktur database lokal
  - [ ] Preview & konfirmasi sebelum commit
- [ ] **Export ke Format Dapodik** — Generate file yang siap diupload ke server Dapodik
- [ ] **NISN Validation** — Validasi NISN via API Kemdikbud secara real-time
- [ ] **NUPTK Validation** — Validasi NUPTK guru via API Kemdikbud
- [~] **Sinkronisasi Otomatis 2 Arah** — *SKIP: Terlalu kompleks, manual dulu*

### 1.5.2 EMIS (Kemenag — Pasar Madrasah)
- [ ] **Import dari EMIS** — Baca data dari format ekspor EMIS
- [ ] **Export ke Format EMIS** — Generate file laporan EMIS
- [~] **API Langsung ke Server EMIS** — *SKIP: Dokumentasi API Kemenag terbatas*

---

## FASE 2 — Academic & Attendance Automation
> **Tujuan:** Digitalisasi aktivitas harian dan akademik.

### 2.1 Presensi
- [ ] **Presensi Manual** — Guru input kehadiran via web/mobile
- [ ] **Presensi IoT (RFID/Biometric)** — Integrasi hardware via RTDB real-time
- [ ] **Rekap Presensi Otomatis** — Harian, mingguan, bulanan per siswa
- [ ] **Alert Presensi ke Orang Tua** — Notifikasi WhatsApp/email jika tidak hadir
- [~] **Facial Recognition** — *SKIP: Sensitif privasi, terlalu kompleks*

### 2.2 Jadwal Pelajaran
- [ ] **Manajemen Jadwal** — Buat jadwal pelajaran per kelas per hari
- [ ] **Deteksi Konflik** — Alert jika ada jadwal guru yang bentrok
- [ ] **Tampil di Portal Orang Tua** — Jadwal hari ini untuk anak mereka
- [~] **Auto-Scheduling AI** — *SKIP: Terlalu kompleks untuk sekarang*

### 2.3 LMS (Learning Management System)
- [ ] **Jurnal Harian Guru** — Catat materi yang diajarkan setiap sesi
- [ ] **Manajemen Tugas** — Upload soal, kumpulkan jawaban siswa
- [ ] **Input Nilai** — Nilai harian, UTS, UAS per mata pelajaran
- [ ] **Kalender Akademik** — Jadwal ujian, libur nasional, kegiatan sekolah
- [~] **Video Conferencing** — *SKIP: Gunakan Google Meet/Zoom saja*

### 2.4 Rapor Digital (Kurikulum Merdeka)
- [ ] **Generate Rapor PDF** — Format sesuai Kurikulum Merdeka (P5, KKTP)
- [ ] **White-label Branding** — Logo & nama sekolah pada rapor
- [ ] **Tanda Tangan Digital** — Kepala Sekolah sign digital
- [ ] **Distribusi ke Orang Tua** — Download via portal atau kirim WhatsApp
- [~] **Rapor K13 Legacy** — *SKIP: Fokus Kurikulum Merdeka*

### 2.5 CBT (Computer Based Test)
- [ ] **Bank Soal** — Buat soal per mata pelajaran & kelas
- [ ] **Ujian Online** — Randomize soal, timer, auto-submit
- [ ] **Lockdown Mode** — Fullscreen, blokir aplikasi lain (gunakan Electron CBT Client yang ada)
- [ ] **Auto-grading** — Koreksi otomatis pilihan ganda
- [~] **Analisis Butir Soal** — *SKIP: Fitur lanjutan*

### 2.6 Ekskul & Kesiswaan
- [ ] **Manajemen Ekstrakurikuler** — Daftar ekskul, jadwal, pembina
- [ ] **Pendaftaran Ekskul** — Siswa/orang tua daftar via portal
- [ ] **Penilaian Ekskul** — Masuk ke rapor bagian non-akademik
- [ ] **Alumni Network** — Database alumni per angkatan + fitur networking
- [~] **Tracer Study** — *SKIP: Fase pasca-launch*

### 2.7 Mobile Apps (Flutter)
- [ ] **App Orang Tua** — Nilai, presensi, tagihan, pengumuman, chat guru
- [ ] **App Guru** — Input nilai, kehadiran, tugas, komunikasi orang tua
- [~] **App Siswa** — *SKIP: Cukup lewat app orang tua dulu*

---

## FASE 3 — Financial Engine & Smart Transaction
> **Tujuan:** Transparansi keuangan dan efisiensi operasional.

### 3.1 Payment Gateway
- [x] Konfigurasi PG Owner (Midtrans, Xendit, iPaymu, Duitku, Louvin)
- [x] Konfigurasi PG per Sekolah (tenant mandiri)
- [ ] **Tagihan SPP Otomatis** — Generate tagihan bulanan per siswa
- [ ] **Virtual Account** — Pembayaran via VA bank (BCA, BRI, BNI, Mandiri)
- [ ] **Histori Transaksi** — Rekap pembayaran per siswa
- [ ] **Status Tunggakan** — Siswa/orang tua lihat status bayar

### 3.2 Penggajian (Payroll)
- [ ] **Slip Gaji Digital** — Guru honorer & yayasan
- [ ] **Hitung Tunjangan** — Berdasarkan jam mengajar + kehadiran
- [ ] **Rekap Pembayaran** — Laporan penggajian per bulan
- [~] **Integrasi BPJS** — *SKIP: Kompleks, fase lanjutan*

### 3.3 Dana BOS (Bantuan Operasional Sekolah)
- [ ] **Manajemen Anggaran BOS** — Input rencana & realisasi per komponen
- [ ] **Laporan Pertanggungjawaban BOS** — Format sesuai Juknis terbaru
- [ ] **Export ke Excel/PDF** — Siap dikirim ke Dinas Pendidikan
- [~] **Integrasi ARKAS (sistem BOS digital Kemdikbud)** — *SKIP: API terbatas*

### 3.4 E-Wallet & Tabungan Siswa
- [ ] **Saldo Internal Siswa** — Top-up via payment gateway
- [ ] **Kartu Siswa Digital** — QR Code untuk identitas & transaksi
- [ ] **Tabungan Siswa** — Siswa bisa menabung, cair akhir tahun

### 3.5 POS (Point of Sale)
- [ ] **Kantin & Koperasi** — Kasir digital dengan scan QR siswa
- [ ] **Perpustakaan** — Inventaris buku, pinjam-kembali, denda
- [ ] **Inventaris Aset** — QR Code per aset, laporan kondisi
- [ ] **Aplikasi Desktop Electron** — Offline-first, sync saat online
- [~] **Layanan Antar Jemput** — *SKIP: Butuh integrasi hardware GPS*

---

## FASE 4 — Ecosystem & Marketplace
> **Tujuan:** Perluasan ekosistem dan monetisasi platform.

### 4.1 Marketplace
- [ ] **Marketplace Internal** — Jual beli kebutuhan sekolah (seragam, buku, ATK)
- [ ] **Marketplace Eksternal** — Etalase karya siswa untuk umum
- [ ] **Vendor Sekolah** — Vendor pihak ketiga bisa buka toko di platform

### 4.2 Open API & Ecosystem
- [ ] **Public REST API** — Buka API untuk integrasi pihak ketiga
- [ ] **Webhook System** — Trigger event ke sistem eksternal saat ada perubahan data
- [ ] **Developer Portal** — Dokumentasi API (Swagger/Redoc)
- [ ] **API Key Management** — Per-tenant API key dengan rate limiting
- [~] **App Store (Plugin System)** — *SKIP: Terlalu kompleks untuk sekarang*

### 4.3 Reseller & Agent Network
- [ ] **Program Mitra Reseller** — IT lokal bisa jual platform ke sekolah
- [ ] **Dashboard Reseller** — Kelola portofolio sekolah binaan
- [ ] **Komisi Otomatis** — Revenue sharing berbasis subscription

### 4.4 Platform Dinas Pendidikan (B2G)
- [ ] **Dashboard Dinas Kab/Kota** — Monitoring semua sekolah di wilayah
- [ ] **Laporan Agregat** — Kehadiran, nilai rata-rata, tunggakan SPP
- [ ] **Integrasi Anggaran Daerah** — Dana BOS dari APBD ke sekolah
- [~] **Integrasi Kemendikbud Pusat** — *SKIP: Butuh MoU level nasional*

### 4.5 Analytics & Business Intelligence
- [ ] **Dashboard Kepala Sekolah** — KPI akademik & keuangan dalam satu layar
- [ ] **Laporan Akreditasi** — Data siap pakai untuk pengajuan/perpanjangan BAN-SM
- [ ] **Laporan Tahunan** — Generate laporan tahunan sekolah otomatis
- [~] **Custom Report Builder** — *SKIP: Gunakan template fixed dulu*

---

## FASE 5 — Advanced Technology & AI Intelligence
> **Tujuan:** Otomasi tingkat lanjut dan prediksi berbasis AI.

### 5.1 Early Warning System
- [ ] **Deteksi Siswa Berisiko** — Berdasarkan pola presensi + nilai
- [ ] **Alert ke Wali Kelas & BK** — Notifikasi dini sebelum masalah membesar
- [ ] **Dashboard Intervensi BK** — Tracking progres penanganan

### 5.2 AI Analytics
- [ ] **Prediksi Minat & Bakat** — Rekomendasi jurusan/ekskul berdasarkan nilai & aktivitas
- [ ] **Teacher Performance Analytics** — Korelasi metode mengajar vs nilai siswa
- [ ] **Predictive Budget Planning** — Prediksi kebutuhan anggaran tahun berikutnya
- [~] **Chatbot AI untuk Orang Tua** — *SKIP: Belum mature untuk konteks pendidikan Indonesia*

### 5.3 Smart School IoT
- [ ] **Kontrol Energi** — Lampu/AC otomatis berdasarkan jadwal kelas
- [ ] **Keamanan Lab** — Kamera + akses kontrol terintegrasi RTDB
- [~] **Smart Toilet Monitoring** — *SKIP: Terlalu niche*

---

## STANDAR TEKNIS PRO LEVEL

### Arsitektur
- [x] Serverless Microservices (Firebase Functions V2)
- [x] Multi-tenant dengan NPSN sebagai namespace
- [ ] Layer Yayasan sebagai super-tenant
- [ ] Event-driven architecture via RTDB triggers
- [~] Kubernetes / Container orchestration — *SKIP: Firebase sudah handle ini*

### Database
- [x] Firebase RTDB (real-time counters, IoT, triggers)
- [ ] Firestore (data utama: nilai, jadwal, transaksi)
- [ ] SQLite (offline-first untuk POS & IoT)
- [~] Redis (caching layer) — *SKIP: Tidak diperlukan dengan arsitektur current*

### Security
- [x] OAuth2 via Firebase Auth
- [x] RBAC (Owner, Admin Sekolah)
- [ ] RBAC Granular (multi-role per sekolah)
- [ ] End-to-end encryption untuk data keuangan
- [ ] Audit Trail (UU PDP 2022)
- [ ] Firebase App Check

### DevOps
- [x] Git + GitHub
- [x] Manual deploy via Firebase CLI
- [x] Node.js 22 runtime
- [ ] CI/CD via GitHub Actions
- [ ] Error tracking (Sentry)
- [ ] Uptime monitoring

---

## CATATAN UNTUK AI YANG MENERUSKAN

> Saat ingin mengerjakan item **[~] SKIP**, selalu konfirmasi ke pengguna dulu.
> Ubah `[~]` menjadi `[ ]` jika pengguna memutuskan untuk mengerjakan.
> Saat item selesai, ubah `[ ]` menjadi `[x]`.
> 
> **Prioritas pengerjaan selanjutnya (urutan disarankan):**
> 1. FASE 0: Audit Trail, CI/CD, Multi-Role
> 2. FASE 1: CRUD Manual Siswa/Guru, Profil Sekolah, Log Activity
> 3. FASE 1.5: Dapodik Integration
> 4. FASE 2: Rapor Digital, Presensi Manual
