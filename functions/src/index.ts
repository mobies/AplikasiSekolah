import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onValueCreated } from "firebase-functions/v2/database";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp({
  databaseURL: "https://appsekolah2026-default-rtdb.asia-southeast1.firebasedatabase.app"
});

const region = "asia-southeast1";

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://appsekolah2026.web.app",
  "https://appsekolah2026.firebaseapp.com",
];

/**
 * Format Tanggal ke yyyy-MM-dd HH:mm:ss
 */
function formatFullDate(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Helper untuk memvalidasi origin
 */
async function validateOrigin(request: any) {
  const origin = request.rawRequest.headers.origin;
  if (!origin) return;
  
  try {
    const snapshot = await admin.database().ref("system/config/allowedOrigins").get();
    const allowedOrigins = snapshot.exists() ? Object.values(snapshot.val() as Record<string, string>) : [];
    
    if (allowedOrigins.length === 0 && (origin.includes("localhost") || origin.includes("127.0.0.1"))) return;

    if (!allowedOrigins.includes(origin)) {
      console.warn(`Blocked origin: ${origin}`);
      throw new HttpsError("permission-denied", "Domain tidak diizinkan.");
    }
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error("Origin Validation Error:", error);
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) return;
    throw new HttpsError("internal", "Gagal memvalidasi domain.");
  }
}



/**
 * Mendaftarkan Sekolah Baru
 */
export const registerSchool = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const uid = request.auth.uid;
    const data = request.data || {};
    const { npsn, schoolName, adminName, schoolAddress, phone } = data;
    const email = request.auth.token.email;

    if (!npsn || !schoolName || !adminName) {
      throw new HttpsError("invalid-argument", "Data tidak lengkap.");
    }

    // 1. Cek apakah NPSN sudah ada di /schools/lists/{NPSN}
    const schoolInListsSnap = await admin.database().ref(`schools/lists/${npsn}`).get();
    if (schoolInListsSnap.exists()) {
      const existingName = schoolInListsSnap.val().nama || "Sekolah Lain";
      throw new HttpsError("already-exists", `Sekolah sudah terdaftar dengan nama ${existingName}.`);
    }

    const timestamp = admin.database.ServerValue.TIMESTAMP;
    const updates: any = {};
    
    // Simpan di /registers dengan data lengkap sesuai permintaan
    updates[`/registers/${uid}/${npsn}`] = {
      npsn: npsn,
      schoolName: schoolName,
      nama: adminName,
      email: email,
      phone: phone,
      schoolAddress: schoolAddress,
      status: "pending_approval",
      role: "admin_utama",
      createdAt: timestamp
    };

    await admin.database().ref().update(updates);
    return { success: true, message: "Pendaftaran berhasil terkirim." };
  } catch (error: any) {
    console.error("registerSchool Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});


/**
 * Cek Role & Akses User
 */
export const checkUserRole = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    if (!request.auth) return { role: "guest" };

    const uid = request.auth.uid;
    const data = request.data || {};
    const { npsn } = data;

    const ownerSnap = await admin.database().ref(`owner/lists/${uid}`).get();
    if (ownerSnap.exists()) return { role: "owner", data: ownerSnap.val() };

    const userRegsSnap = await admin.database().ref(`registers/${uid}`).get();
    
    if (userRegsSnap.exists()) {
      const regsMap = userRegsSnap.val();
      const schoolsList = [];

      for (const [sNpsn, regData] of Object.entries(regsMap)) {
        // Cek data di /schools/lists/{NPSN} (Struktur Baru)
        const schoolInListsSnap = await admin.database().ref(`schools/lists/${sNpsn}`).get();
        let schoolData = null;
        
        if (schoolInListsSnap.exists()) {
          schoolData = schoolInListsSnap.val();
        } else {
          // Fallback legacy
          const infoSnap = await admin.database().ref(`schools/${sNpsn}/info`).get();
          if (infoSnap.exists()) schoolData = infoSnap.val();
          else schoolData = (await admin.database().ref(`schools/${sNpsn}`).get()).val();
        }

        if (schoolData) {
          schoolsList.push({
            npsn: sNpsn,
            schoolName: schoolData.nama || schoolData.name,
            userRole: (regData as any).role,
            status: schoolData.status || (schoolData.expire ? "active" : "pending_approval"),
            expireAt: schoolData.expire || schoolData.expireAt,
            plan: schoolData.plan
          });
        } else {
          // Jika belum ada di /schools (belum di-approve), ambil status dari /registers
          schoolsList.push({
            npsn: sNpsn,
            schoolName: (regData as any).schoolName,
            userRole: (regData as any).role,
            status: (regData as any).status || "pending_approval"
          });
        }
      }

      if (npsn) {
        // Cari nama sekolah untuk error message jika akses ditolak
        const schoolInListsSnap = await admin.database().ref(`schools/lists/${npsn}`).get();
        let sName = schoolInListsSnap.val()?.nama;
        if (!sName) sName = (await admin.database().ref(`schools/${npsn}/info/name`).get()).val();
        
        if (regsMap[npsn]) {
          const selected = schoolsList.find(s => s.npsn === npsn);
          if (selected) {
            return { 
              role: "school_admin", 
              ...selected,
              schoolData: (await admin.database().ref(`schools/lists/${npsn}`).get()).val() || (await admin.database().ref(`schools/${npsn}/info`).get()).val(),
              adminProfile: (await admin.database().ref(`admins/${npsn}/lists/${uid}`).get()).val() || (await admin.database().ref(`admins/${npsn}/${uid}`).get()).val()
            };
          }
        }
        if (sName) return { role: "guest", schoolName: sName, message: "Akses ditolak." };
      }

      const activeSchool = schoolsList.find(s => s.status === "active") || schoolsList[0];
      if (!activeSchool) return { role: "guest", message: "Tidak ada sekolah aktif." };

      return { 
        ...activeSchool,
        role: activeSchool.status === "active" ? "school_admin" : "guest", 
        status: activeSchool.status,
        allSchools: schoolsList,
        schoolData: (await admin.database().ref(`schools/lists/${activeSchool.npsn}`).get()).val() || (await admin.database().ref(`schools/${activeSchool.npsn}/info`).get()).val(),
        adminProfile: (await admin.database().ref(`admins/${activeSchool.npsn}/lists/${uid}`).get()).val() || (await admin.database().ref(`admins/${activeSchool.npsn}/${uid}`).get()).val()
      };
    }
    return { role: "guest", message: "Akses tidak dikenal." };
  } catch (error: any) {
    console.error("checkUserRole Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Gagal memverifikasi hak akses.");
  }
});

/**
 * Menyetujui Pendaftaran (Alur Baru)
 */
export const approveSchool = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const uid = request.auth.uid;
    const { npsn } = request.data || {};
    if (!npsn) throw new HttpsError("invalid-argument", "NPSN wajib disertakan.");

    const ownerSnap = await admin.database().ref(`owner/lists/${uid}`).get();
    if (!ownerSnap.exists()) throw new HttpsError("permission-denied", "Unauthorized.");

    // Ambil data dari /registers (Pusat Pendaftaran)
    // Kita harus mencari di seluruh /registers karena kita tidak tahu UID pendaftarnya secara langsung
    // Alternatif: simpan pendaftarUid di jalur lain. Untuk sekarang kita cari di /registers
    const registersSnap = await admin.database().ref("registers").get();
    let regData: any = null;
    let registrantUid: string = "";

    if (registersSnap.exists()) {
      const allRegs = registersSnap.val();
      for (const [rUid, schools] of Object.entries(allRegs)) {
        if ((schools as any)[npsn]) {
          regData = (schools as any)[npsn];
          registrantUid = rUid;
          break;
        }
      }
    }

    if (!regData) throw new HttpsError("not-found", "Data pendaftaran tidak ditemukan.");

    const timestamp = admin.database.ServerValue.TIMESTAMP;
    const expireDate = new Date();
    expireDate.setMonth(expireDate.getMonth() + 1);
    const expireStr = formatFullDate(expireDate);

    const updates: any = {};
    
    // 1. Tambahkan ke /schools/lists/{NPSN}
    updates[`/schools/lists/${npsn}`] = {
      npsn: npsn,
      nama: regData.schoolName,
      admin_uid: registrantUid,
      admin_name: regData.nama,
      admin_email: regData.email,
      admin_phone: regData.phone,
      plan: "starter",
      expire: expireStr,
      status: "active"
    };

    // 2. Tambahkan ke /admins/{NPSN}/lists/{uid}
    updates[`/admins/${npsn}/lists/${registrantUid}`] = regData.nama;

    // 3. Update status di /registers
    updates[`/registers/${registrantUid}/${npsn}/status`] = "active";
    updates[`/registers/${registrantUid}/${npsn}/plan`] = "starter";
    updates[`/registers/${registrantUid}/${npsn}/expireAtStr`] = expireStr;

    await admin.database().ref().update(updates);

    // Kirim Email
    await admin.database().ref("system/mail_queue").push().set({
      to: regData.email,
      subject: `Selamat! Sekolah ${regData.schoolName} Telah Aktif`,
      body: `<h1>Pendaftaran Disetujui!</h1><p>Halo ${regData.nama}, sekolah <b>${regData.schoolName}</b> telah aktif dengan paket Starter.</p>`,
      status: "pending",
      createdAt: timestamp
    });

    return { success: true, message: "Sekolah berhasil disetujui." };
  } catch (error: any) {
    console.error("approveSchool Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Menolak Pendaftaran
 */
export const rejectSchool = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const uid = request.auth.uid;
    const { npsn, reason } = request.data || {};

    const ownerSnap = await admin.database().ref(`owner/lists/${uid}`).get();
    if (!ownerSnap.exists()) throw new HttpsError("permission-denied", "Unauthorized.");

    // Cari pendaftar
    const registersSnap = await admin.database().ref("registers").get();
    let regData: any = null;
    let registrantUid: string = "";

    if (registersSnap.exists()) {
      const allRegs = registersSnap.val();
      for (const [rUid, schools] of Object.entries(allRegs)) {
        if ((schools as any)[npsn]) {
          regData = (schools as any)[npsn];
          registrantUid = rUid;
          break;
        }
      }
    }

    if (!regData) throw new HttpsError("not-found", "Data pendaftaran tidak ditemukan.");

    const updates: any = {};
    updates[`/registers/${registrantUid}/${npsn}/status`] = "rejected";
    updates[`/registers/${registrantUid}/${npsn}/rejectionReason`] = reason;

    await admin.database().ref().update(updates);

    await admin.database().ref("system/mail_queue").push().set({
      to: regData.adminEmail,
      subject: `Pendaftaran Sekolah ${regData.schoolName} Ditolak`,
      body: `<h1>Pendaftaran Ditolak</h1><p>Alasan: ${reason}</p>`,
      status: "pending",
      createdAt: admin.database.ServerValue.TIMESTAMP
    });

    return { success: true, message: "Pendaftaran ditolak." };
  } catch (error: any) {
    console.error("rejectSchool Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Tambah Admin Sekolah
 */
export const addSchoolAdmin = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const uid = request.auth.uid;
    const { npsn, adminUid, adminName, adminEmail } = request.data || {};

    // Cek di /admins/{npsn}/lists/{uid}
    const callerAdminSnap = await admin.database().ref(`admins/${npsn}/lists/${uid}`).get();
    if (!callerAdminSnap.exists()) {
      throw new HttpsError("permission-denied", "Akses ditolak.");
    }

    const timestamp = admin.database.ServerValue.TIMESTAMP;
    const updates: any = {};
    
    updates[`/admins/${npsn}/lists/${adminUid}`] = adminName;
    
    const schoolNameSnap = await admin.database().ref(`schools/lists/${npsn}/nama`).get();
    
    updates[`/registers/${adminUid}/${npsn}`] = {
      npsn: npsn,
      schoolName: schoolNameSnap.val(),
      status: "active",
      role: "admin_tambahan",
      createdAt: timestamp
    };

    updates[`/users/${npsn}/${adminUid}`] = {
      name: adminName,
      email: adminEmail,
      role: "admin_tambahan"
    };

    await admin.database().ref().update(updates);
    return { success: true, message: "Admin ditambahkan." };
  } catch (error: any) {
    console.error("addSchoolAdmin Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Update Plan
 */
export const updateSchoolSubscription = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const uid = request.auth.uid;
    const { npsn, plan, monthsToAdd } = request.data || {};

    const ownerSnap = await admin.database().ref(`owner/lists/${uid}`).get();
    if (!ownerSnap.exists()) throw new HttpsError("permission-denied", "Unauthorized.");

    const schoolRef = admin.database().ref(`schools/lists/${npsn}`);
    const schoolSnap = await schoolRef.get();
    if (!schoolSnap.exists()) throw new HttpsError("not-found", "Sekolah tidak ditemukan.");

    const schoolData = schoolSnap.val();
    const adminUid = schoolData.admin_uid;

    const currentExpire = schoolData.expire ? new Date(schoolData.expire).getTime() : Date.now();
    let newExpire = currentExpire;
    if (monthsToAdd) newExpire = Math.max(currentExpire, Date.now()) + (monthsToAdd * 30 * 24 * 60 * 60 * 1000);
    const expireStr = formatFullDate(new Date(newExpire));

    const updates: any = {};
    if (plan) {
      updates[`/schools/lists/${npsn}/plan`] = plan;
      updates[`/registers/${adminUid}/${npsn}/plan`] = plan;
    }
    if (monthsToAdd) {
      updates[`/schools/lists/${npsn}/expire`] = expireStr;
      updates[`/registers/${adminUid}/${npsn}/expireAtStr`] = expireStr;
    }
    updates[`/schools/lists/${npsn}/updatedAt`] = admin.database.ServerValue.TIMESTAMP;

    await admin.database().ref().update(updates);
    return { success: true, message: "Subscription updated." };
  } catch (error: any) {
    console.error("updateSchoolSubscription Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Menonaktifkan Sekolah
 */
export const deactivateSchool = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const uid = request.auth.uid;
    const { npsn } = request.data || {};

    const ownerSnap = await admin.database().ref(`owner/lists/${uid}`).get();
    if (!ownerSnap.exists()) throw new HttpsError("permission-denied", "Unauthorized.");

    const schoolSnap = await admin.database().ref(`schools/lists/${npsn}`).get();
    const adminUid = schoolSnap.val()?.admin_uid;

    const updates: any = {};
    updates[`/schools/lists/${npsn}/status`] = "inactive";
    updates[`/registers/${adminUid}/${npsn}/status`] = "inactive";
    
    await admin.database().ref().update(updates);
    return { success: true, message: "Sekolah dinonaktifkan." };
  } catch (error: any) {
    console.error("deactivateSchool Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Mengaktifkan Kembali Sekolah
 */
export const activateSchool = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const uid = request.auth.uid;
    const { npsn } = request.data || {};

    const ownerSnap = await admin.database().ref(`owner/lists/${uid}`).get();
    if (!ownerSnap.exists()) throw new HttpsError("permission-denied", "Unauthorized.");

    const schoolSnap = await admin.database().ref(`schools/lists/${npsn}`).get();
    const adminUid = schoolSnap.val()?.admin_uid;

    const updates: any = {};
    updates[`/schools/lists/${npsn}/status`] = "active";
    if (adminUid) {
      updates[`/registers/${adminUid}/${npsn}/status`] = "active";
    }
    
    await admin.database().ref().update(updates);
    return { success: true, message: "Sekolah diaktifkan kembali." };
  } catch (error: any) {
    console.error("activateSchool Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Hapus Sekolah Permanen
 */
export const deleteSchoolPermanently = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const uid = request.auth.uid;
    const { npsn } = request.data || {};

    const ownerSnap = await admin.database().ref(`owner/lists/${uid}`).get();
    if (!ownerSnap.exists()) throw new HttpsError("permission-denied", "Unauthorized.");

    const schoolSnap = await admin.database().ref(`schools/lists/${npsn}`).get();
    if (!schoolSnap.exists()) throw new HttpsError("not-found", "Sekolah tidak ditemukan.");
    
    const schoolData = schoolSnap.val();
    if (schoolData.status === "active") throw new HttpsError("permission-denied", "Nonaktifkan dahulu.");

    const adminUid = schoolData.admin_uid;
    const updates: any = {};
    updates[`/schools/lists/${npsn}`] = null;
    updates[`/admins/${npsn}`] = null;
    updates[`/users/${npsn}`] = null;
    updates[`/registers/${adminUid}/${npsn}`] = null;

    await admin.database().ref().update(updates);
    return { success: true, message: "Sekolah dihapus permanen." };
  } catch (error: any) {
    console.error("deleteSchoolPermanently Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Batalkan Pendaftaran
 */
export const cancelRegistration = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const uid = request.auth.uid;
    const { npsn } = request.data || {};

    const regSnap = await admin.database().ref(`registers/${uid}/${npsn}`).get();
    if (!regSnap.exists()) throw new HttpsError("not-found", "Data tidak ditemukan.");

    const updates: any = {};
    updates[`/registers/${uid}/${npsn}`] = null;

    await admin.database().ref().update(updates);
    return { success: true, message: "Dibatalkan." };
  } catch (error: any) {
    console.error("cancelRegistration Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});


/**
 * Worker untuk memproses antrean email secara otomatis
 */
export const processMailQueue = onValueCreated({
  ref: "system/mail_queue/{pushId}",
  region: region,
}, async (event) => {
  const mailData = event.data.val();
  if (!mailData || mailData.status !== "pending") return;

  const smtpSnap = await admin.database().ref("system/config/smtp").get();
  let smtpAuth = {
    user: "mobiesindo@gmail.com",
    pass: "nqjtvnihyblriitb",
  };

  if (smtpSnap.exists()) {
    const config = smtpSnap.val();
    if (config.status === "active") {
      smtpAuth = {
        user: config.email,
        pass: config.appPassword
      };
    }
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: smtpAuth,
  });

  try {
    await transporter.sendMail({
      from: '"Aplikasi Sekolah" <no-reply@appsekolah2026.com>',
      to: mailData.to,
      subject: mailData.subject,
      html: mailData.body,
    });
    await event.data.ref.update({ 
      status: "sent", 
      sentAt: admin.database.ServerValue.TIMESTAMP 
    });
  } catch (error: any) {
    console.error("Failed to send email:", error);
    await event.data.ref.update({
      status: "failed",
      error: error.message,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });
  }
});
/**
 * Update SMTP Config for School
 */
export const updateSmtpConfig = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const { npsn, gmail, appPassword } = request.data || {};
    if (!npsn || !gmail || !appPassword) throw new HttpsError("invalid-argument", "Data tidak lengkap.");

    // Verifikasi Akses Admin
    const adminSnap = await admin.database().ref(`admins/${npsn}/lists/${request.auth.uid}`).get();
    if (!adminSnap.exists()) throw new HttpsError("permission-denied", "Bukan admin sekolah ini.");

    // Tes Koneksi SMTP menggunakan Nodemailer
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: gmail,
        pass: appPassword
      }
    });

    try {
      await transporter.verify();
    } catch (err: any) {
      console.error("SMTP Verify Error:", err);
      throw new HttpsError("failed-precondition", "Gagal verifikasi SMTP: Pastikan Apps Password benar.");
    }

    // Simpan ke Database (Path khusus config yang tidak bisa dibaca publik)
    await admin.database().ref(`schools/configs/${npsn}/smtp`).set({
      email: gmail,
      appPassword: appPassword,
      status: "active",
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });

    return { success: true, message: "Konfigurasi SMTP berhasil disimpan dan aktif." };
  } catch (error: any) {
    console.error("updateSmtpConfig Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get SMTP Status for School
 */
export const getSmtpStatus = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");

    const { npsn } = request.data || {};
    if (!npsn) throw new HttpsError("invalid-argument", "NPSN harus diisi.");

    const smtpSnap = await admin.database().ref(`schools/configs/${npsn}/smtp`).get();
    
    if (!smtpSnap.exists()) {
      return { active: false, status: "Belum Dikonfigurasi" };
    }

    const smtpData = smtpSnap.val();
    return { 
      active: smtpData.status === "active", 
      email: smtpData.email,
      status: smtpData.status === "active" ? "Aktif" : "Bermasalah",
      updatedAt: smtpData.updatedAt
    };
  } catch (error: any) {
    console.error("getSmtpStatus Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

export * from "./payment_gateway";
export * from "./system_settings";
export * from "./school_settings";
export * from "./data_triggers";
