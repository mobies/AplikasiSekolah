import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const region = "asia-southeast1";

/**
 * Helper untuk memvalidasi Admin Sekolah
 */
async function validateSchoolAdmin(request: any, npsn: string) {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");
  if (!npsn) throw new HttpsError("invalid-argument", "NPSN required.");
  
  const uid = request.auth.uid;
  const adminSnap = await admin.database().ref(`admins/${npsn}/lists/${uid}`).get();
  if (!adminSnap.exists()) {
    throw new HttpsError("permission-denied", "Bukan admin sekolah ini.");
  }
}

/**
 * Update School Payment Gateway Config
 */
export const updateSchoolPG = onCall({
  region: region,
}, async (request) => {
  try {
    const { npsn, provider, config } = request.data || {};
    await validateSchoolAdmin(request, npsn);

    if (!provider || !config) throw new HttpsError("invalid-argument", "Data tidak lengkap.");

    let isValid = false;
    if (provider === "midtrans" && config.serverKey) isValid = true;
    else if (provider === "xendit" && config.secretKey) isValid = true;
    else if (provider === "ipaymu" && config.apiKey && config.va) isValid = true;
    else if (provider === "duitku" && config.merchantCode && config.apiKey) isValid = true;
    else if (provider === "louvin" && config.apiKey && config.slug && config.endpoint) isValid = true;

    if (!isValid) throw new HttpsError("failed-precondition", `Parameter ${provider} tidak valid.`);

    // Simpan ke Database Sekolah
    const updates: any = {};
    updates[`schools/configs/${npsn}/payment_gateway/${provider}`] = {
      ...config,
      status: "active",
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };
    
    // Set sebagai PG Aktif untuk sekolah ini
    updates[`schools/configs/${npsn}/payment_gateway/active_pg`] = provider;

    await admin.database().ref().update(updates);

    return { success: true, message: `Konfigurasi ${provider} sekolah berhasil disimpan.` };
  } catch (error: any) {
    console.error("updateSchoolPG Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Gagal menyimpan konfigurasi PG Sekolah.");
  }
});

/**
 * Set Default Payment Gateway for School
 */
export const setDefaultSchoolPG = onCall({
  region: region,

}, async (request) => {
  try {
    const { npsn, provider } = request.data || {};
    if (!npsn || !provider) throw new HttpsError("invalid-argument", "Data tidak lengkap.");

    await admin.database().ref(`schools/configs/${npsn}/payment_gateway/default`).set(provider);
    return { success: true, message: `${provider.toUpperCase()} aktif sebagai PG utama sekolah.` };
  } catch (error: any) {
    console.error("setDefaultSchoolPG Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get School PG Status
 */
export const getSchoolPGStatus = onCall({
  region: region,
}, async (request) => {
  try {
    const { npsn } = request.data || {};
    if (!npsn) throw new HttpsError("invalid-argument", "NPSN required.");

    const [configsSnap, defaultSnap] = await Promise.all([
      admin.database().ref(`schools/configs/${npsn}/payment_gateway/configs`).get(),
      admin.database().ref(`schools/configs/${npsn}/payment_gateway/default`).get()
    ]);

    const configs = configsSnap.val() || {};
    const defaultProvider = defaultSnap.val() || null;
    
    const status: any = { providers: {}, defaultProvider };
    
    Object.keys(configs).forEach(p => {
      status.providers[p] = {
        status: "active",
        isActiveForTransaction: p === defaultProvider
      };
    });

    return { 
      providers: status.providers,
      defaultProvider: status.defaultProvider
    };
  } catch (error: any) {
    console.error("getSchoolPGStatus Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Gagal mengambil status PG Sekolah.");
  }
});

/**
 * Import School Data from Migration JSON
 */
export const importSchoolData = onCall({
  region: region,
  memory: "1GiB",
  timeoutSeconds: 120,
}, async (request) => {
  try {
    const { npsn, jsonData, tahunAjaran } = request.data || {};
    if (!npsn || !jsonData || !tahunAjaran) throw new HttpsError("invalid-argument", "Data tidak lengkap.");
    
    await validateSchoolAdmin(request, npsn);

    const users = typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;
    const timestamp = admin.database.ServerValue.TIMESTAMP;
    
    const updates: any = {};
    const classes = new Set<string>();

    Object.entries(users).forEach(([uid, data]: [string, any]) => {
      // Normalisasi Nama (Camel Case)
      const rawName = (data.nama || data.NAMA || "Unnamed User").toLowerCase();
      const nama = rawName.split(' ').map((s: string) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
      const role = data.role === "peserta" ? "student" : (data.role === "author" ? "teacher" : data.role);

      // 1. Data User: /users/{NPSN}/{uid}
      updates[`users/${npsn}/${uid}`] = {
        nama,
        email: data.email || "",
        role: role,
        status: data.status || "active",
        importedAt: timestamp
      };

      if (role === "student") {
        const classId = data.kelas || "UNDEFINED_CLASS";
        classes.add(classId);

        // 3. Data Siswa: /schools/students/{NPSN}/{uid}
        updates[`schools/students/${npsn}/${uid}`] = {
          nama,
          nisn: data.nisn || "0",
          classId: classId,
          lastImported: timestamp
        };

        // 4. Data Rombel: /schools/rombel/{NPSN}/{tahun_ajaran}/{classId}/{uid}
        updates[`schools/rombel/${npsn}/${tahunAjaran}/${classId}/${uid}`] = {
          nama,
          joinedAt: timestamp
        };
      } else if (role === "teacher") {
        // 5. Data Guru: /schools/teachers/{NPSN}/{uid}
        updates[`schools/teachers/${npsn}/${uid}`] = {
          nama,
          email: data.email || "",
          specialization: data.is_observer === "active" ? "Observer/Teacher" : "Regular Teacher"
        };
      }
    });

    // 2. Data Kelas: /schools/reference/{NPSN}/classroom/{classId}
    classes.forEach(c => {
      updates[`schools/reference/${npsn}/classroom/${c}`] = {
        className: c === "UNDEFINED_CLASS" ? "Belum Terbagi Kelas" : c,
        status: "active"
      };
    });

    await admin.database().ref().update(updates);

    // Recalculate summary directly after bulk import
    // (Menghindari trigger storm saat impor massal)
    const students = Object.values(users).filter((u: any) => {
      const r = u.role === "peserta" ? "student" : (u.role === "author" ? "teacher" : u.role);
      return r === "student";
    });
    const teachers = Object.values(users).filter((u: any) => {
      const r = u.role === "peserta" ? "student" : (u.role === "author" ? "teacher" : u.role);
      return r === "teacher";
    });

    await admin.database().ref(`schools/summary/${npsn}`).update({
      totalUsers: Object.keys(users).length,
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalClasses: classes.size,
      lastUpdate: admin.database.ServerValue.TIMESTAMP,
    });

    return { success: true, message: `Berhasil mengimpor ${Object.keys(users).length} data pengguna.` };
  } catch (error: any) {
    console.error("importSchoolData Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});
