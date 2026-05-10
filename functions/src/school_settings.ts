import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

const region = "asia-southeast1";

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://appsekolah2026.web.app",
  "https://appsekolah2026.firebaseapp.com",
];

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
 * Import School Data from Migration JSON
 */
export const importSchoolData = onCall({
  region: region,
  cors: allowedOrigins,
  memory: "1GiB",
  timeoutSeconds: 120,
}, async (request) => {
  try {
    const { npsn, jsonData, tahunAjaran } = request.data || {};
    if (!npsn || !jsonData || !tahunAjaran) throw new HttpsError("invalid-argument", "Data tidak lengkap.");
    
    await validateSchoolAdmin(request, npsn);

    // Standarisasi Tahun Ajaran (Ambil tahun awal saja)
    const taMatch = tahunAjaran.match(/^(\d{4})/);
    const ta = taMatch ? taMatch[1] : tahunAjaran;

    const users = typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;
    const timestamp = admin.database.ServerValue.TIMESTAMP;
    
    const updates: any = {};
    const classes = new Set<string>();

    Object.entries(users).forEach(([uid, data]: [string, any]) => {
      const rawName = (data.nama || data.NAMA || "Unnamed User").toLowerCase();
      const nama = rawName.split(' ').map((s: string) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
      const role = data.role === "peserta" ? "student" : (data.role === "author" ? "teacher" : data.role);

      updates[`users/${npsn}/${uid}`] = {
        nama,
        email: data.email || "",
        role: role,
        status: data.status || "active",
        importedAt: timestamp
      };

      if (role === "student") {
        const classId = data.kelas || "";
        const nisn = data.nisn || `NONISN_${uid}`;

        updates[`schools/students/${npsn}/${nisn}`] = {
          nama,
          uid: uid,
          classId: classId || "UNROBEL",
          lastImported: timestamp
        };

        if (classId) {
          classes.add(classId);
          // Data Siswa Rombel (Members)
          updates[`schools/rombel/members/${npsn}/${ta}/${classId}/${nisn}`] = {
            nama,
            uid: uid,
            joinedAt: timestamp
          };
          
          // Metadata List (Nama Rombel)
          updates[`schools/rombel/lists/${npsn}/${ta}/${classId}/name`] = classId;
        } else {
          // Masuk ke Unrombel jika tidak ada kelas
          updates[`schools/rombel/unrombel/${npsn}/${nisn}`] = {
            nama,
            uid: uid,
            importedAt: timestamp
          };
        }

      } else if (role === "teacher") {
        updates[`schools/teachers/${npsn}/${uid}`] = {
          nama,
          email: data.email || "",
          specialization: data.is_observer === "active" ? "Observer/Teacher" : "Regular Teacher"
        };
      }
    });

    classes.forEach(c => {
      updates[`schools/reference/${npsn}/classroom/${c}/className`] = c;
      updates[`schools/reference/${npsn}/classroom/${c}/status`] = "active";
    });

    await admin.database().ref().update(updates);

    return { success: true, message: `Berhasil mengimpor data.` };
  } catch (error: any) {
    console.error("importSchoolData Error:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Manage Student Rombel (Add/Remove)
 */
export const manageRombel = onCall({
  region: region,
  cors: allowedOrigins,
}, async (request) => {
  try {
    const { npsn, action, tahunAjaran, currentTA, classId, students, targetClassId } = request.data || {};
    await validateSchoolAdmin(request, npsn);

    const updates: any = {};
    const timestamp = admin.database.ServerValue.TIMESTAMP;

    // Robust Year Extraction
    const rawTA = tahunAjaran || currentTA;
    if (!rawTA && action !== "restore") throw new HttpsError("invalid-argument", "Tahun Ajaran required.");
    
    const taMatch = rawTA?.toString()?.match(/^(\d{4})/);
    const ta = taMatch ? taMatch[1] : (rawTA || "UNKNOWN");

    if (action === "enroll") {
      // Masukkan ke Rombel (Bulk)
      students.forEach((s: any) => {
        updates[`schools/rombel/unrombel/${npsn}/${s.id}`] = null;
        updates[`schools/rombel/members/${npsn}/${ta}/${classId}/${s.id}`] = {
          nama: s.nama,
          uid: s.uid || "",
          joinedAt: timestamp
        };
        updates[`schools/students/${npsn}/${s.id}/classId`] = classId;
      });
      // Pastikan ada di list
      updates[`schools/rombel/lists/${npsn}/${ta}/${classId}/name`] = classId;
    } else if (action === "unenroll") {
      // Keluarkan dari Rombel (Bulk)
      students.forEach((s: any) => {
        updates[`schools/rombel/members/${npsn}/${ta}/${classId}/${s.id}`] = null;
        updates[`schools/rombel/unrombel/${npsn}/${s.id}`] = {
          nama: s.nama,
          uid: s.uid || "",
          removedAt: timestamp
        };
        updates[`schools/students/${npsn}/${s.id}/classId`] = "UNROBEL";
      });
    } else if (action === "move") {
      // Pindah Kelas (Bulk)
      students.forEach((s: any) => {
        updates[`schools/rombel/members/${npsn}/${ta}/${classId}/${s.id}`] = null;
        updates[`schools/rombel/members/${npsn}/${ta}/${targetClassId}/${s.id}`] = {
          nama: s.nama,
          uid: s.uid || "",
          joinedAt: timestamp
        };
        updates[`schools/students/${npsn}/${s.id}/classId`] = targetClassId;
      });
      updates[`schools/rombel/lists/${npsn}/${ta}/${targetClassId}/name`] = targetClassId;
    } else if (action === "deactivate") {
      // Non Aktifkan (Bulk)
      const { reason } = request.data || {};
      for (const s of students) {
        // 1. Hapus dari Rombel Aktif
        updates[`schools/rombel/members/${npsn}/${ta}/${classId}/${s.id}`] = null;
        // 2. Masukkan ke Archive Rombel
        updates[`schools/rombel/archieved/${npsn}/${reason}/${s.id}`] = {
          nama: s.nama,
          uid: s.uid || "",
          classId: classId,
          archievedAt: timestamp
        };
        // 3. Pindahkan Master Data Siswa
        const studentSnap = await admin.database().ref(`schools/students/${npsn}/${s.id}`).get();
        if (studentSnap.exists()) {
          updates[`schools/students/archieved/${npsn}/${s.id}`] = {
            ...studentSnap.val(),
            archiveReason: reason,
            archievedAt: timestamp
          };
          updates[`schools/students/${npsn}/${s.id}`] = null;
        }
        // 4. Ubah Status User
        if (s.uid) {
          updates[`users/${npsn}/${s.uid}/status`] = "non-active";
        }
      }
    } else if (action === "graduate") {
      // Luluskan (Bulk)
      for (const s of students) {
        // 1. Hapus dari Rombel Aktif
        updates[`schools/rombel/members/${npsn}/${ta}/${classId}/${s.id}`] = null;
        // 2. Masukkan ke Graduated Rombel
        updates[`schools/rombel/graduated/${npsn}/${ta}/${s.id}`] = {
          nama: s.nama,
          uid: s.uid || "",
          classId: classId,
          graduatedAt: timestamp
        };
        // 3. Pindahkan Master Data Siswa
        const studentSnap = await admin.database().ref(`schools/students/${npsn}/${s.id}`).get();
        if (studentSnap.exists()) {
          updates[`schools/graduated/${npsn}/${ta}/${s.id}`] = {
            ...studentSnap.val(),
            graduatedAt: timestamp
          };
          updates[`schools/students/${npsn}/${s.id}`] = null;
        }
        // 4. Ubah Status User
        if (s.uid) {
          updates[`users/${npsn}/${s.uid}/status`] = "graduated";
        }
      }
    } else if (action === "restore") {
      // Restore dari Arsip (Bulk) - Simpler Version
      const { source } = request.data || {};
      for (const s of students) {
        const cleanSid = s.id.toString().trim();
        const cleanNpsn = npsn.trim();

        // 1. Hapus dari Arsip
        if (source === "archieved") {
          const { reason } = request.data || {};
          updates[`schools/rombel/archieved/${cleanNpsn}/${reason}/${cleanSid}`] = null;
          // Pindahkan Master Data balik
          const archSnap = await admin.database().ref(`schools/students/archieved/${cleanNpsn}/${cleanSid}`).get();
          if (archSnap.exists()) {
            const data = archSnap.val();
            delete data.archiveReason;
            delete data.archievedAt;
            updates[`schools/students/${cleanNpsn}/${cleanSid}`] = data;
            updates[`schools/students/archieved/${cleanNpsn}/${cleanSid}`] = null;
          }
        } else if (source === "graduated") {
          const { gradYear } = request.data || {};
          updates[`schools/rombel/graduated/${cleanNpsn}/${gradYear}/${cleanSid}`] = null;
          // Pindahkan Master Data balik
          const gradSnap = await admin.database().ref(`schools/graduated/${cleanNpsn}/${gradYear}/${cleanSid}`).get();
          if (gradSnap.exists()) {
            const data = gradSnap.val();
            delete data.graduatedAt;
            updates[`schools/students/${cleanNpsn}/${cleanSid}`] = data;
            updates[`schools/graduated/${cleanNpsn}/${gradYear}/${cleanSid}`] = null;
          }
        }

        // 2. Masukkan ke Unrombel
        updates[`schools/rombel/unrombel/${cleanNpsn}/${cleanSid}`] = {
          nama: s.nama,
          uid: s.uid || "",
          restoredAt: timestamp
        };
        
        // Update classId di Master Data
        const studentPath = `schools/students/${cleanNpsn}/${cleanSid}`;
        if (updates[studentPath]) {
          updates[studentPath].classId = "UNROBEL";
        } else {
          updates[`${studentPath}/classId`] = "UNROBEL";
        }

        // 3. Kembalikan Status User
        if (s.uid) {
          updates[`users/${cleanNpsn}/${s.uid}/status`] = "approved";
        }
      }
    }

    await admin.database().ref().update(updates);
    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Invitation Link System
 */
export const generateInvitationLink = onCall({
  region: region,
  cors: allowedOrigins,
}, async (request) => {
  try {
    const { npsn, role, rombelId, rombelName, tahunAjaran } = request.data || {};
    await validateSchoolAdmin(request, npsn);

    const token = crypto.randomBytes(16).toString("hex");
    const now = new Date();
    const expiry = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59).getTime();

    const invitationData = {
      npsn,
      role,
      token,
      expiresAt: expiry,
      createdAt: admin.database.ServerValue.TIMESTAMP
    } as any;

    if (role === "student") {
      invitationData.rombelId = rombelId;
      invitationData.rombelName = rombelName;
      invitationData.tahunAjaran = tahunAjaran;
    }

    await admin.database().ref(`invitations/${token}`).set(invitationData);

    const baseUrl = "http://localhost:3000"; 
    return {
      token,
      link: `${baseUrl}/join/${token}`,
      expiresAt: expiry
    };
  } catch (error: any) {
    console.error("generateInvitationLink Error:", error);
    throw new HttpsError("internal", error.message);
  }
});

export const validateInvitationToken = onCall({
  region: region,
  cors: allowedOrigins,
}, async (request) => {
  try {
    const { token } = request.data || {};
    const snap = await admin.database().ref(`invitations/${token}`).get();
    
    if (!snap.exists()) throw new HttpsError("not-found", "Link tidak valid.");
    
    const data = snap.val();
    if (Date.now() > data.expiresAt) throw new HttpsError("deadline-exceeded", "Link sudah kadaluwarsa.");

    const schoolSnap = await admin.database().ref(`schools/lists/${data.npsn}/nama`).get();
    return {
      ...data,
      schoolName: schoolSnap.val() || "Sekolah"
    };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

export const registerViaInvitation = onCall({
  region: region,
  cors: allowedOrigins,
}, async (request) => {
  try {
    const { token, formData } = request.data || {};
    if (!request.auth) throw new HttpsError("unauthenticated", "Wajib Login Google.");

    const inviteSnap = await admin.database().ref(`invitations/${token}`).get();
    if (!inviteSnap.exists()) throw new HttpsError("not-found", "Link tidak valid.");
    
    const invite = inviteSnap.val();
    if (Date.now() > invite.expiresAt) throw new HttpsError("deadline-exceeded", "Link kadaluwarsa.");

    const { uid } = request.auth;
    const { name, email } = request.auth.token as any;
    const npsn = invite.npsn;
    const role = invite.role;

    const userExistSnap = await admin.database().ref(`users/${npsn}/${uid}`).get();
    if (userExistSnap.exists()) throw new HttpsError("already-exists", "Sudah terdaftar.");

    const timestamp = admin.database.ServerValue.TIMESTAMP;
    const updates: any = {};

    updates[`users/${npsn}/${uid}`] = {
      nama: name,
      email: email,
      role: role,
      status: "approved",
      createdAt: timestamp
    };

    if (role === "student") {
      const nisn = formData.nisn || `INV_${uid}`;
      const { tahunAjaran, rombelId, rombelName } = invite;

      const taMatch = tahunAjaran.match(/^(\d{4})/);
      const ta = taMatch ? taMatch[1] : tahunAjaran;

      updates[`schools/students/${npsn}/${nisn}`] = {
        nama: name,
        uid: uid,
        classId: rombelId,
        createdAt: timestamp
      };

      updates[`schools/rombel/members/${npsn}/${ta}/${rombelId}/${nisn}`] = {
        nama: name,
        uid: uid,
        joinedAt: timestamp
      };
      
      updates[`schools/rombel/lists/${npsn}/${ta}/${rombelId}/name`] = rombelName || rombelId;
    } else if (role === "teacher") {
      updates[`schools/teachers/${npsn}/${uid}`] = {
        nama: name,
        email: email,
        specialization: formData.specialization || "Guru"
      };
    }

    await admin.database().ref().update(updates);
    return { success: true };
  } catch (error: any) {
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Manage Classroom References
 */
export const manageClassroomReference = onCall({
  region: region,
  cors: allowedOrigins,
}, async (request) => {
  try {
    const { npsn, classId, className } = request.data || {};
    await validateSchoolAdmin(request, npsn);

    if (!classId) throw new HttpsError("invalid-argument", "ID Kelas wajib diisi.");

    const updates: any = {};
    updates[`schools/reference/${npsn}/classroom/${classId}`] = {
      className: className || classId,
      status: "active",
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };

    await admin.database().ref().update(updates);
    return { success: true };
  } catch (error: any) {
    console.error("manageClassroomReference Error:", error);
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Update Student Detail Data
 */
export const updateStudentDetail = onCall({
  region: region,
  cors: allowedOrigins,
}, async (request) => {
  try {
    const { npsn, nisn, masterData, detailData } = request.data || {};
    await validateSchoolAdmin(request, npsn);

    if (!nisn) throw new HttpsError("invalid-argument", "NISN required.");

    const updates: any = {};
    const timestamp = admin.database.ServerValue.TIMESTAMP;

    // 1. Update Master Data (/schools/students/${npsn}/${nisn})
    // Hanya yang editable: nama, phone, foto_path, thumb_path
    if (masterData) {
      const { nama, phone, foto_path, thumb_path } = masterData;
      if (nama) updates[`schools/students/${npsn}/${nisn}/nama`] = nama;
      if (phone !== undefined) updates[`schools/students/${npsn}/${nisn}/phone`] = phone;
      if (foto_path !== undefined) updates[`schools/students/${npsn}/${nisn}/foto_path`] = foto_path;
      if (thumb_path !== undefined) updates[`schools/students/${npsn}/${nisn}/thumb_path`] = thumb_path;
      updates[`schools/students/${npsn}/${nisn}/updatedAt`] = timestamp;

      // Sync ke User Profile jika ada UID
      const studentRef = await admin.database().ref(`schools/students/${npsn}/${nisn}`).get();
      const uid = studentRef.val()?.uid;
      if (uid) {
        if (foto_path !== undefined) updates[`users/${npsn}/${uid}/foto_path`] = foto_path;
        if (thumb_path !== undefined) updates[`users/${npsn}/${uid}/thumb_path`] = thumb_path;
      }
    }

    // 2. Update Detail Data (/schools/detail/students/{npsn}/{nisn})
    if (detailData) {
      updates[`schools/detail/students/${npsn}/${nisn}`] = {
        ...detailData,
        updatedAt: timestamp
      };
    }

    await admin.database().ref().update(updates);
    return { success: true };
  } catch (error: any) {
    console.error("updateStudentDetail Error:", error);
    throw new HttpsError("internal", error.message);
  }
});
