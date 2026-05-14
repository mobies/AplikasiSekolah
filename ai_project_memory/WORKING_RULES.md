# Working Rules: RTDB Efficiency & Cost Optimization

To ensure optimal performance, low bandwidth usage, and cost efficiency in our Realtime Database (RTDB) architecture, the following rules MUST be followed:

## 1. Granular Data Access
- **Never read large trees**: Avoid calling `onValue` or `get` on root nodes like `/schools` if only specific data is needed.
- **Specific Child Paths**: Always aim for the deepest specific path (e.g., `/schools/{npsn}/status` instead of `/schools/{npsn}`).

## 2. Denormalization for Bandwidth
- **Metadata Tables**: Create shallow paths for lists used in dashboards (e.g., `/school_list/{npsn}` containing only `name` and `status`) to avoid fetching full school details during listing.
- **Access Maps**: Keep user access maps shallow (e.g., `/users/{uid}/schools/{npsn}: true`) to minimize login payload.

## 3. Shallow Structures
- **Avoid Deep Nesting**: Limit nesting to 3-4 levels maximum. Deeply nested data forces unnecessary bandwidth usage when reading parent nodes.
- **Flatten Data**: Separate "static" details from "dynamic" or "frequently updated" data.

## 4. Server-Side Filtering (Indexing)
- **Use .indexOn**: Always define `.indexOn` in `database.rules.json` for any field used in `orderByChild` to ensure filtering happens on the server, not the client.

## 5. Efficient Updates
- **Use .update() instead of .set()**: Use `update()` to modify specific fields without overwriting (and thus sending) the entire object back to the server.
- **Atomic Operations**: Use `update()` with multi-path keys for cross-node synchronization to ensure data integrity with minimal round-trips.

## 7. SPA Mode & Static Deployment
- **Static Export Only**: All frontend pages must support `output: 'export'`. No server-side runtime logic (SSR) allowed in Next.js.
- **Client-Side Auth**: Handle all authentication and role verification redirects on the client-side using hooks (`useEffect`, `useRouter`).
- **Cloud Function backend**: All complex logic, database writes (beyond simple user profile updates), and sensitive operations must be offloaded to Cloud Functions (`asia-southeast1`).
- **Standard Link URL**: All generated links must use dynamic origin (`request.rawRequest.headers.origin`) to support local and production environments automatically.
- **Suspense Boundaries**: Wrap all components using `useSearchParams` in `<Suspense>` to ensure successful static builds.
3. **RTDB Security Rules**: Agen AI dilarang keras mengubah atau mendeploy file Security Rules RTDB secara otomatis. Agen hanya boleh memberikan rekomendasi konfigurasi rules di dalam percakapan atau dokumentasi. Kontrol penuh atas perubahan rules ada pada USER.

### Protokol Arsitektur Efisiensi Biaya (Firebase)
Seluruh agen AI wajib memilih jalur komunikasi data berdasarkan kriteria berikut:

1.  **Jalur Direct SDK (RTDB)** - *Prioritas untuk Efisiensi*:
    *   Digunakan untuk: CRUD sederhana (Tambah/Edit/Hapus) pada entitas data seperti Siswa, Guru, Kelas, dan Profil.
    *   Syarat: Logika validasi bisa ditangani sepenuhnya oleh Security Rules.
    *   Tujuan: Menghilangkan biaya eksekusi Cloud Function dan mengurangi latensi.

2.  **Jalur Cloud Functions (v2)** - *Prioritas untuk Keamanan & Integritas*:
    *   Digunakan untuk: Transaksi (Pembayaran), Kriptografi (Token), Integrasi Pihak Ketiga (Email/WA), Migrasi Data Besar, dan operasi yang membutuhkan "Server-side Secret".
    *   Syarat: Operasi atomik lintas path yang sangat kompleks atau membutuhkan validasi yang tidak bisa dilakukan oleh Rules.
    *   Tujuan: Menjaga integritas data tingkat tinggi dan keamanan kunci API.
