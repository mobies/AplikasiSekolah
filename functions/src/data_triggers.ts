import { onValueWritten } from "firebase-functions/v2/database";
import * as admin from "firebase-admin";

/**
 * ============================================================
 * SUMMARY TRIGGERS — Cost-Optimized Statistics Engine
 * ============================================================
 */

async function updateSummaryField(npsn: string, field: string, count: number): Promise<void> {
  await admin.database().ref(`schools/summary/${npsn}/${field}`).set(count);
  await admin.database().ref(`schools/summary/${npsn}/lastUpdate`).set(admin.database.ServerValue.TIMESTAMP);
}

async function countChildren(path: string): Promise<number> {
  const snap = await admin.database().ref(path).get();
  if (!snap.exists()) return 0;
  const val = snap.val();
  if (typeof val !== "object" || val === null) return 0;
  return Object.keys(val).length;
}

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

/**
 * TRIGGER: Sync Rombel Count to Metadata List & Summary
 */
export const onRombelChange = onValueWritten({
  ref: "/schools/rombel/members/{npsn}/{ta}/{classId}/{nisn}",
  region: "asia-southeast1",
}, async (event) => {
  try {
    const { npsn, ta, classId } = event.params;
    
    // 1. Hitung jumlah siswa dalam kelas ini
    const classSnap = await admin.database().ref(`schools/rombel/members/${npsn}/${ta}/${classId}`).get();
    const count = classSnap.exists() ? Object.keys(classSnap.val()).length : 0;
    
    const listRef = admin.database().ref(`schools/rombel/lists/${npsn}/${ta}/${classId}`);
    
    if (count === 0) {
      // Jika kosong, hapus dari list
      await listRef.remove();
    } else {
      // Jika ada isi, pastikan ada di list dan update count
      await listRef.update({
        name: classId,
        studentCount: count,
        lastUpdate: admin.database.ServerValue.TIMESTAMP
      });
    }

    // 2. Update Global Summary Stats (untuk tahun ajaran spesifik ini)
    let totalMembers = 0;
    let totalGroups = 0;
    const snap = await admin.database().ref(`schools/rombel/members/${npsn}/${ta}`).get();
    if (snap.exists()) {
      const data = snap.val();
      totalGroups = Object.keys(data).length;
      Object.values(data).forEach((members: any) => {
        totalMembers += Object.keys(members).length;
      });
    }
    await admin.database().ref(`schools/summary/${npsn}`).update({
      totalRombelMembers: totalMembers,
      totalRombelGroups: totalGroups,
      lastUpdate: admin.database.ServerValue.TIMESTAMP
    });
  } catch (err) {
    console.error("onRombelChange Error:", err);
  }
});

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

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const activeTahun = month >= 6 ? `${year}` : `${year - 1}`;
    
    let totalRombelMembers = 0;
    let totalRombelGroups = 0;
    const rombelSnap = await admin.database().ref(`schools/rombel/members/${npsn}/${activeTahun}`).get();
    if (rombelSnap.exists()) {
      const data = rombelSnap.val();
      totalRombelGroups = Object.keys(data).length;
      Object.values(data).forEach((members: any) => {
        totalRombelMembers += Object.keys(members).length;
      });
    }

    const summaryData = {
      totalUsers: usersCount,
      totalStudents: studentsCount,
      totalTeachers: teachersCount,
      totalClasses: classesCount,
      totalRombelMembers: totalRombelMembers,
      totalRombelGroups: totalRombelGroups,
      lastUpdate: admin.database.ServerValue.TIMESTAMP,
    };

    await admin.database().ref(`schools/summary/${npsn}`).set(summaryData);

    return { success: true, summary: summaryData };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});
