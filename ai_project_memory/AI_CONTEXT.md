# AI Context - Aplikasi Sekolah SaaS

## 1. Tujuan Project
Membangun platform SaaS (Software as a Service) manajemen sekolah yang aman, scalable, dan multi-tenant. Memungkinkan ribuan sekolah memiliki sistem manajemen sendiri (akademik, finansial, absensi) dalam satu infrastruktur terpusat.

## 2. Deskripsi Sistem
Sistem ini menggunakan arsitektur **Serverless Multi-Tenant**. Data antar sekolah dipisahkan secara logis di database. Autentikasi dipusatkan menggunakan Google SSO untuk memastikan verifikasi identitas yang kuat tanpa password manual.

## 3. Teknologi yang Digunakan
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Framer Motion, Lucide React.
- **Backend**: Firebase Cloud Functions v2 (Node.js/TypeScript).
- **Database**: 
  - **Cloud Firestore**: Data utama (Schools, Users, Academic).
  - **Realtime Database (RTDB)**: Konfigurasi sistem, Dynamic CORS, Cache Status.
- **Auth**: Firebase Authentication (Google Sign-In).
- **Deployment**: Firebase Hosting & Functions.

## 4. Arsitektur Sistem & Alur Komunikasi
- **Frontend** berkomunikasi dengan **Backend** hanya melalui **Callable Cloud Functions**.
- **Backend** (Admin SDK) memiliki akses penuh ke Firestore dan RTDB.
- **Frontend** memiliki akses terbatas ke Firestore/RTDB sesuai Security Rules yang ketat.

## 5. Flow Autentikasi & Database
- Login menggunakan Google SSO.
- Role User dicek via Cloud Function `checkUserRole` yang memvalidasi data di RTDB (Owner) dan Firestore (School Admin).
- Status pendaftaran dicatat di RTDB `registrations/{uid}` untuk respon instan di UI.

## 6. Daftar Modul Penting
- **Auth Module**: Penanganan SSO dan verifikasi role.
- **Registration Module**: Alur pendaftaran sekolah baru dengan Google Verification.
- **Owner Dashboard**: Panel kendali pusat untuk approval sekolah dan manajemen sistem.

## 8. Referensi Eksternal
- **[DB_MAP.md](file:///e:/Projects/AntiGravity/Aplikasi%20Sekolah/ai_project_memory/DB_MAP.md)**: Skema database detail dan alur penyimpanan.
- **[ROADMAP.md](file:///e:/Projects/AntiGravity/Aplikasi%20Sekolah/ai_project_memory/ROADMAP.md)**: Visi pengembangan jangka panjang proyek.

## 9. Hal yang TIDAK BOLEH Diubah Tanpa Izin
- **Struktur RTDB `system/config/allowedOrigins`**: Merusak ini akan mematikan akses CORS seluruh aplikasi.
- **Logic `validateOrigin` di Backend**: Jantung keamanan API.
- **Struktur Document ID Firestore (NPSN)**: Digunakan sebagai kunci unik antar sekolah.
