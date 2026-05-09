# Roadmap Pengembangan Aplikasi Sekolah (Enterprise Multi-School SaaS)

Dokumen ini merinci fase-fase pengembangan sistem manajemen sekolah modern yang terintegrasi, transparan, dan manageable menggunakan arsitektur serverless multi-tenant.

## Technical Stack & Environment
- **Architecture:** Multi-Tenant SaaS (Isolasi data per sekolah).
- **Backend (Serverless):** Firebase Cloud Functions (Node.js / TypeScript).
- **Frontend Web:** Next.js (ReactJS) & Tailwind CSS.
- **Mobile Apps:** Flutter (Android & iOS).
- **Desktop Apps:** Electron (untuk POS & Offline-first transaction).
- **Database Layer:**
  - **Firestore:** Data utama & profil (Multi-tenant isolation).
  - **Firebase RTDB:** Real-time data (IoT, Live Queue, Chat).
  - **SQLite:** Local database untuk aplikasi desktop & IoT (Offline-first).
- **Infrastructure:** Firebase Hosting, Firebase Auth, Cloud Storage.
- **Integration:** Payment Gateway (Xendit/Midtrans), WhatsApp API (Notifications).

## Fase 1: Foundation & Multi-School Onboarding (Bulan 1-2)
**Tujuan:** Membangun ekosistem SaaS dan identitas digital.
- [x] **SaaS Onboarding:** Pendaftaran sekolah via Google Login, Approval/Reject oleh Owner.
- [x] **Owner Management Panel:** Dashboard pusat untuk memantau pendaftaran, manajemen paket layanan (Starter, Standard, Premium), dan lisensi real-time.
- [x] **Secure Architecture:** Dynamic CORS Allow-list di RTDB, Server-side validation (v2), dan RTDB Status Tracking.
- [x] **Security Rules & RBAC:** Implementasi Firebase Rules untuk isolasi data antar sekolah (Multi-tenant).
- [x] **Single Sign-On (SSO):** Sistem login terintegrasi menggunakan Google Auth dengan auto-redirection.
- [ ] **Website Informasi Sekolah (CMS):** Profil, Berita, Galeri (Dynamic per sekolah).
- [ ] **Sistem Pendaftaran (PPDB Online):** Alur registrasi siswa baru yang terintegrasi ke database sekolah masing-masing.
- [ ] **Basis Data Induk (Core Database):** Manajemen Data Siswa, Guru, dan Staf dengan isolasi antar sekolah.

> [!TIP]
> **Dokumentasi Arsitektur:** Lihat [DB_MAP.md](file:///e:/Projects/AntiGravity/Aplikasi%20Sekolah/DB_MAP.md) untuk detail skema dan alur data database.

## Fase 2: Academic & Attendance Automation (Bulan 3-4)
**Tujuan:** Digitalisasi aktivitas harian dan kehadiran.
- [ ] **Presensi IoT:** Integrasi RFID/Biometric dengan dashboard real-time.
- [ ] **LMS Sederhana:** Jadwal pelajaran, jurnal harian, dan manajemen tugas/nilai.
- [ ] **Mobile Apps (Android/iOS):** Aplikasi khusus orang tua untuk monitoring presensi dan info sekolah.
- [ ] **Manajemen Ko/Ekstrakurikuler:** Pengelolaan pendaftaran dan penilaian kegiatan pendukung.

## Fase 3: Financial Engine & Smart Transaction (Bulan 5-6)
**Tujuan:** Transparansi keuangan dan efisiensi operasional.
- [ ] **Sistem Keuangan Siswa:** Tagihan otomatis (SPP), Virtual Account, dan Histori Transaksi.
- [ ] **Sistem Tabungan & E-Wallet Internal:** Siswa bisa menabung dan belanja menggunakan kartu siswa.
- [ ] **Point of Sale (POS) Kantin & Koperasi:** Aplikasi desktop untuk transaksi cepat yang terintegrasi saldo siswa.
- [ ] **Layanan Antar Jemput (Transport):** Verifikasi penjemputan dan pelacakan armada.

## Fase 4: Ecosystem & Marketplace (Bulan 7-8)
**Tujuan:** Perluasan ekosistem ekonomi sekolah.
- [ ] **Marketplace Internal:** Jual beli keperluan sekolah (seragam, buku, atribut).
- [ ] **Marketplace Eksternal:** Etalase karya siswa dan produk sekolah untuk umum.
- [ ] **Dashboard Analytics:** Laporan performa akademik dan keuangan untuk pimpinan sekolah.

## Fase 5: Advanced Technology Integration (Bulan 9+)
**Tujuan:** Otomasi tingkat lanjut dan AI.
- [ ] **Smart School IoT:** Kontrol energi (lampu/AC) dan keamanan lab.
- [ ] **AI-Based Analytics:** Prediksi minat bakat siswa dan rekomendasi pengembangan.

---

## Standar Teknis Pro Level
- **Architecture:** Serverless Microservices.
- **Database:** Polyglot Persistence (Firestore + RTDB + SQLite).
- **Security:** OAuth2 (Firebase Auth), RBAC, End-to-end Encryption for Financial Data.
- **DevOps:** CI/CD via GitHub Actions.
