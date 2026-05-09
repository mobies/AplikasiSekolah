# Fixed Modules - Modul Stabil & Terproteksi

Daftar file dan modul yang sudah dianggap stabil. Perubahan pada modul ini harus dilakukan dengan sangat hati-hati.

---

## 1. FULLY PROTECTED (Jangan Diubah Tanpa Izin Khusus)

### `functions/src/index.ts` -> `validateOrigin()`
- **Alasan**: Ini adalah gerbang keamanan CORS. Kesalahan kecil di sini akan memblokir akses seluruh domain (localhost maupun production).

### `web/src/lib/firebase.ts`
- **Alasan**: Konfigurasi inisialisasi Firebase. Berisi endpoint database dan fungsi yang digunakan di seluruh aplikasi.

---

## 2. MODIFY WITH CAUTION (Ubah Dengan Hati-hati)

### `functions/src/index.ts` -> `checkUserRole()`
- **Alasan**: Logika autentikasi inti. Perubahan di sini dapat menyebabkan user tidak bisa masuk ke dashboard atau terjadi kebocoran role.

### `database.rules.json`
- **Alasan**: Mengatur izin akses RTDB. Perubahan indeks (indexOn) atau read/write permission sangat sensitif terhadap performa dan keamanan.

### `web/src/app/login/page.tsx`
- **Alasan**: Alur login SSO. Pastikan tidak kembali menggunakan email/password manual.

---

## 3. SAFE TO MODIFY (Aman Untuk Dikembangkan)

### `web/src/app/owner/dashboard/page.tsx`
- **Alasan**: Masih dalam tahap pengembangan UI/UX. Penambahan fitur visual atau tabel diperbolehkan.

### `web/src/app/register/page.tsx`
- **Alasan**: Penambahan field formulir atau perbaikan visual pendaftaran.

---

## Kategori Ringkasan
- **FULLY PROTECTED**: Modul infrastruktur dan keamanan.
- **MODIFY WITH CAUTION**: Modul autentikasi dan database rules.
- **SAFE TO MODIFY**: Modul UI halaman dan fitur fitur akademik baru.
