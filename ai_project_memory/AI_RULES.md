# AI Rules - Aturan Kerja Keras

> [!IMPORTANT]
> **PANDUAN UTAMA / MANDATORY GUIDELINE:**
> "Tidak boleh mengubah Struktur alur data atau aplikasi yang sudah berjalan tanpa ijin USER."
> Semua AI yang mengerjakan project ini wajib mematuhi aturan ini secara mutlak.

## 1. Prinsip Utama
- **Jangan Refactor Besar Tanpa Izin**: Dilarang mengubah struktur folder atau mengganti framework inti.
- **Jangan Mengubah Struktur Database**: Penambahan field diperbolehkan, namun penghapusan atau penggantian nama path/collection wajib dikonfirmasi.
- **Jangan Rename API/Functions**: Nama Cloud Functions harus tetap konsisten untuk menjaga integrasi frontend/backend.
- **Backward Compatibility**: Pastikan perubahan baru tidak merusak user yang sudah ada atau data lama.
- **Git Protocol**: DILARANG melakukan `git commit` atau `git push` ke GitHub tanpa perintah eksplisit dari user.
- **Efficient Deployment**: Saat melakukan deploy functions ke Firebase, gunakan flag `--only functions:namaFungsi` untuk men-deploy hanya bagian yang diubah/ditambah saja agar proses lebih cepat.

## 2. Standar Coding & Security
- **Error Logging**: Selalu gunakan `console.error` atau logging formal pada blok `catch`.
- **Clean Code**: Gunakan penamaan variabel yang deskriptif dan fungsi yang modular.
- **Minimal Changes**: Prioritaskan solusi dengan perubahan kode paling sedikit dan paling aman.
- **Security First**: Jangan pernah membuka akses database (Security Rules) jika bisa dilakukan via Cloud Functions (Admin SDK).

## 3. DO
- [x] Selalu validasi `origin` pada setiap Cloud Function Callable.
- [x] Selalu gunakan `"use client"` pada komponen React yang membutuhkan state/hooks.
- [x] Selalu perbarui `ai_project_memory/DB_MAP.md` setiap kali ada penambahan path RTDB, koleksi Firestore, atau perubahan alur data.
- [x] Update `CURRENT_PROGRESS.md` dan `CHANGELOG.md` setelah menyelesaikan fitur besar.

## 4. DON'T
- [ ] Jangan menggunakan `email/password` login manual (Project ini full SSO).
- [ ] Jangan menulis langsung ke Firestore dari Client untuk data sensitif (gunakan Cloud Functions).
- [ ] Jangan menghapus komentar dokumentasi atau file di folder `/ai_project_memory`.

## 5. BEFORE MODIFYING CODE
1. Baca `ai_project_memory/DB_MAP.md` untuk memahami relasi data terbaru.
2. Cek `ai_project_memory/FIXED_MODULES.md` untuk memastikan file yang akan diubah tidak dalam status PROTECTED.
3. Analisis dampak perubahan terhadap modul lain (side effects).

## 6. SAFE DEVELOPMENT RULES
- Gunakan fitur "Self-Healing" pada logic jika memungkinkan (misal: sinkronisasi otomatis jika data cache hilang).
- Pastikan UI tetap responsif dengan loading state (Lucide Loader2).
