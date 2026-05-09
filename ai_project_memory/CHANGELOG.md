# Changelog - Riwayat Perubahan

## [2026-05-08]
### Added
- [x] **Dashboard Admin Sekolah**: Pembuatan rute `/school/[npsn]/dashboard` dengan desain premium.
- [x] **Reject Registration System**: Penambahan fungsi `rejectSchool` dan UI di Owner Dashboard.
- [x] **Enhanced Role Redirection**: Otomasi deteksi NPSN di halaman login untuk mempermudah akses admin.
- [x] **Advanced Firestore Rules**: Implementasi Multi-tenancy RBAC di Security Rules.
- Implementasi **Smart Email Queue** menggunakan Firestore dan Gmail SMTP.
- Fitur monitoring kuota harian email di RTDB untuk mencegah overload.
- Implementasi folder `ai_project_memory/` untuk kontinuitas proyek AI.
- Pembuatan file `DB_MAP.md` untuk dokumentasi skema database.
- Fitur **Self-Healing RTDB** pada pendaftaran sekolah untuk sinkronisasi otomatis.
- Fungsi backend `approveSchool` (Cloud Function v2) untuk aktivasi sekolah secara aman.
- UI "Menunggu Approval" pada halaman register jika user terdeteksi sudah mendaftar.

### Fixed
- Perbaikan isu "Index not defined" pada RTDB dengan menambahkan `.indexOn: ["email"]`.
- Perbaikan isu redirect pada Owner Dashboard dengan menggunakan Cloud Function untuk verifikasi sesi.
- Perbaikan UID extraction pada fungsi `registerSchool`.

### Improved
- Migrasi seluruh fungsi utama ke **Cloud Functions v2** (asia-southeast1).
- Penyederhanaan alur pendaftaran: Login Google -> Form (Email otomatis terisi).

## [2026-05-07]
### Added
- Inisialisasi Project: Next.js + Firebase.
- Setup Google Sign-In.
- Implementasi awal `checkUserRole` dan `registerSchool`.
- Konfigurasi Dynamic CORS awal di RTDB.
