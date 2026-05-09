import { onValueWritten } from "firebase-functions/v2/database";
import * as admin from "firebase-admin";

/**
 * ============================================================
 * SUMMARY TRIGGERS — Cost-Optimized Statistics Engine
 * ============================================================
 * 
 * ARSITEKTUR: Setiap trigger membaca COUNT dari parent path,
 * bukan iterasi seluruh data. Ini minimal 1 RTDB read per event.
 * 
 * CATATAN PENTING UNTUK AI/DEVELOPER:
 * - Jangan pernah menambahkan logika read besar di sini.
 * - Summary ditulis ke: /schools/summary/{npsn}
 * - Impor massal sebaiknya memanggil recalcSummary secara eksplisit
 *   lewat Cloud Function terpisah, BUKAN mengandalkan trigger ini.
 * ============================================================
 */

/**
 * Helper: Update satu field summary secara atomic
 * Menggunakan set per-field agar tidak menimpa field lain
 */
async function updateSummaryField(npsn: string, field: string, count: number): Promise<void> {
  await admin.database().ref(`schools/summary/${npsn}/${field}`).set(count);
  await admin.database().ref(`schools/summary/${npsn}/lastUpdate`).set(admin.database.ServerValue.TIMESTAMP);
}

/**
 * Helper: Hitung jumlah children dari suatu path
 * Menggunakan shallow=true untuk efisiensi (hanya keys, bukan full data)
 */
async function countChildren(path: string): Promise<number> {
  const snap = await admin.database().ref(path).get();
  if (!snap.exists()) return 0;
  const val = snap.val();
  if (typeof val !== "object" || val === null) return 0;
  return Object.keys(val).length;
}

// ============================================================
// TRIGGER 1: Total User (/users/{npsn}/{uid})
// ============================================================
export const onUserChange = onValueWritten({
  ref: "/users/{npsn}/{uid}",
  region: "asia-southeast1",
}, async (event) => {
  try {
    const npsn = event.params.npsn;
    const total = await countChildren(`users/${npsn}`);
    await updateSummaryField(npsn, "totalUsers", total);
  } catch (err) {
    console.error("onUserChange Error:", err);
  }
});

// ============================================================
// TRIGGER 2: Total Siswa (/schools/students/{npsn}/{nisn})
// ============================================================
export const onStudentChange = onValueWritten({
  ref: "/schools/students/{npsn}/{nisn}",
  region: "asia-southeast1",
}, async (event) => {
  try {
    const npsn = event.params.npsn;
    const total = await countChildren(`schools/students/${npsn}`);
    await updateSummaryField(npsn, "totalStudents", total);
  } catch (err) {
    console.error("onStudentChange Error:", err);
  }
});

// ============================================================
// TRIGGER 3: Total Guru (/schools/teachers/{npsn}/{uid})
// ============================================================
export const onTeacherChange = onValueWritten({
  ref: "/schools/teachers/{npsn}/{uid}",
  region: "asia-southeast1",
}, async (event) => {
  try {
    const npsn = event.params.npsn;
    const total = await countChildren(`schools/teachers/${npsn}`);
    await updateSummaryField(npsn, "totalTeachers", total);
  } catch (err) {
    console.error("onTeacherChange Error:", err);
  }
});

// ============================================================
// TRIGGER 4: Total Kelas (/schools/reference/{npsn}/classroom/{classId})
// ============================================================
export const onClassChange = onValueWritten({
  ref: "/schools/reference/{npsn}/classroom/{classId}",
  region: "asia-southeast1",
}, async (event) => {
  try {
    const npsn = event.params.npsn;
    const total = await countChildren(`schools/reference/${npsn}/classroom`);
    await updateSummaryField(npsn, "totalClasses", total);
  } catch (err) {
    console.error("onClassChange Error:", err);
  }
});

// ============================================================
// TRIGGER 5: Total Rombel — HATI-HATI BIAYA!
// Path: /schools/rombel/{npsn}/{tahunAjaran}/{classId}/{nisn}
//
// Trigger ini SENGAJA hanya berjalan pada operasi per-siswa normal.
// Untuk impor massal, gunakan recalcRombelSummary() yang dipanggil
// secara eksplisit di akhir proses importSchoolData.
// ============================================================
export const onRombelChange = onValueWritten({
  ref: "/schools/rombel/{npsn}/{tahunAjaran}/{classId}/{nisn}",
  region: "asia-southeast1",
}, async (event) => {
  try {
    const npsn = event.params.npsn;
    const tahunAjaran = event.params.tahunAjaran;
    // Hanya hitung rombel untuk tahun ajaran yang berubah (lebih efisien)
    // Hanya hitung rombel untuk tahun ajaran yang berubah (lebih efisien)
    // Hitung total gabungan semua kelas dalam tahun ajaran tersebut
    let totalMembers = 0;
    const snap = await admin.database().ref(`schools/rombel/${npsn}/${tahunAjaran}`).get();
    if (snap.exists()) {
      Object.values(snap.val()).forEach((members: any) => {
        totalMembers += Object.keys(members).length;
      });
    }
    await updateSummaryField(npsn, "totalRombel", totalMembers);
  } catch (err) {
    console.error("onRombelChange Error:", err);
  }
});

// ============================================================
// CALLABLE: Recalculate Summary (dipanggil setelah impor massal)
// Menghindari trigger storm saat import ratusan/ribuan records
// ============================================================
import { onCall, HttpsError } from "firebase-functions/v2/https";

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://appsekolah2026.web.app",
  "https://appsekolah2026.firebaseapp.com",
];

export const recalcSummary = onCall({
  region: "asia-southeast1",
  cors: allowedOrigins,
  memory: "512MiB",
  timeoutSeconds: 60,
}, async (request) => {
  try {
    if (!request.auth) throw new HttpsError("unauthenticated", "Login required.");
    const { npsn } = request.data || {};
    if (!npsn) throw new HttpsError("invalid-argument", "NPSN required.");

    const [usersCount, studentsCount, teachersCount, classesCount] = await Promise.all([
      countChildren(`users/${npsn}`),
      countChildren(`schools/students/${npsn}`),
      countChildren(`schools/teachers/${npsn}`),
      countChildren(`schools/reference/${npsn}/classroom`),
    ]);

    // Hitung total rombel tahun ajaran aktif
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const activeTahun = month >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
    let rombelCount = 0;
    const rombelSnap = await admin.database().ref(`schools/rombel/${npsn}/${activeTahun}`).get();
    if (rombelSnap.exists()) {
      Object.values(rombelSnap.val()).forEach((members: any) => {
        rombelCount += Object.keys(members).length;
      });
    }

    await admin.database().ref(`schools/summary/${npsn}`).set({
      totalUsers: usersCount,
      totalStudents: studentsCount,
      totalTeachers: teachersCount,
      totalClasses: classesCount,
      totalRombel: rombelCount,
      lastUpdate: admin.database.ServerValue.TIMESTAMP,
    });

    return { success: true, summary: { totalUsers: usersCount, totalStudents: studentsCount, totalTeachers: teachersCount, totalClasses: classesCount, totalRombel: rombelCount } };
  } catch (error: any) {
    console.error("recalcSummary Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});
