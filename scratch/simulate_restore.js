/**
 * SIMULASI RESTORASI SISWA
 * Target: Eli Kholisoh (NISN: 1977050920)
 */

const simulation = () => {
    const npsn = "12345678";
    const nisn = "1977050920";
    const uid = "MWFX462GphT3EsPDr9sLJ9CVRI22";
    const targetClassId = "XI-IPA-3";
    const ta = "2025";
    const timestamp = Date.now();

    // Data dari Snapshot Database (Simulasi)
    const archData = {
        nama: "Eli Kholisoh",
        uid: uid,
        phone: "082126497788",
        archiveReason: "berhenti",
        archievedAt: 1778398228202,
        classId: "GMTSN1-GRT"
    };

    const updates = {};

    console.log("--- MEMULAI SIMULASI RESTORASI ---");

    // 1. Pembersihan & Pemindahan Master Data
    const dataToRestore = { ...archData };
    delete dataToRestore.archiveReason;
    delete dataToRestore.archievedAt;
    dataToRestore.classId = targetClassId; // Update ke rombel baru
    dataToRestore.updatedAt = timestamp;

    updates[`schools/students/${npsn}/${nisn}`] = dataToRestore;
    updates[`schools/students/archieved/${npsn}/${nisn}`] = null;
    updates[`schools/rombel/archieved/${npsn}/berhenti/${nisn}`] = null;

    console.log("✅ Master Data Siswa dipindahkan kembali ke folder aktif.");
    console.log("✅ Data di folder Arsip (Master & Rombel) dihapus.");

    // 2. Masukkan ke Rombel Aktif (Tahun Ajaran Berjalan)
    updates[`schools/rombel/members/${npsn}/${ta}/${targetClassId}/${nisn}`] = {
        nama: archData.nama,
        uid: uid,
        joinedAt: timestamp,
        restoredAt: timestamp
    };
    
    // Pastikan metadata rombel tujuan terupdate
    updates[`schools/rombel/lists/${npsn}/${ta}/${targetClassId}/name`] = targetClassId;

    console.log(`✅ Siswa didaftarkan ke Rombel ${targetClassId} pada TA ${ta}/${parseInt(ta)+1}.`);

    // 3. Reaktivasi Akun User
    updates[`users/${npsn}/${uid}/status`] = "approved";

    console.log("✅ Status User diubah kembali menjadi 'approved'.");

    console.log("\n--- RINGKASAN PATH YANG DIPERBARUI ---");
    Object.keys(updates).forEach(path => {
        const action = updates[path] === null ? "DELETE" : "SET";
        console.log(`[${action}] ${path}`);
    });
};

simulation();
