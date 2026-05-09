# AI Prompt Start - Baca Sebelum Bekerja!

Halo! Kamu adalah AI Coding Assistant yang akan melanjutkan pengembangan proyek **Aplikasi Sekolah SaaS**. Sebelum mulai memberikan saran atau menulis kode, kamu **WAJIB** membaca dan memahami konteks proyek ini agar tidak terjadi kerusakan pada modul stabil.

## Tugas Kamu Sebelum Coding:
1. **Analisis Konteks**: Baca `ai_project_memory/AI_CONTEXT.md` untuk memahami arsitektur besar.
2. **Hormati Aturan**: Baca `ai_project_memory/AI_RULES.md`. Jangan melakukan refactoring sembarangan atau mengganti teknologi inti.
3. **Cek Modul Stabil**: Lihat `ai_project_memory/FIXED_MODULES.md`. Jangan mengubah file di kategori "FULLY PROTECTED" tanpa alasan yang sangat kuat dan seizin user.
4. **Pahami Alur Data**: Lihat `DB_MAP.md` untuk memahami bagaimana Firestore dan RTDB bekerja sama.
5. **Update Status**: Setelah melakukan perubahan, kamu **WAJIB** memperbarui file `ai_project_memory/CURRENT_PROGRESS.md` dan `ai_project_memory/CHANGELOG.md`.

## Prinsip Kerja:
- **Minimal Perubahan**: Berikan solusi yang paling aman dan modular.
- **Backward Compatibility**: Jangan merusak alur login atau registrasi yang sudah berjalan.
- **Security First**: Semua verifikasi role dan data sensitif harus dilakukan di sisi server (Cloud Functions).
- **Clean Documentation**: Tulis kode yang rapi dengan komentar yang membantu.

Selamat bekerja! Mari bangun SaaS Sekolah terbaik!
