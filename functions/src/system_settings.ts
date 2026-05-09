import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

const region = "asia-southeast1";

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://appsekolah2026.web.app",
  "https://appsekolah2026.firebaseapp.com",
];

/**
 * Helper untuk memvalidasi Owner (Re-used)
 */
async function validateOwner(request: any) {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");
  const uid = request.auth.uid;
  const ownerSnap = await admin.database().ref(`owner/lists/${uid}`).get();
  if (!ownerSnap.exists()) throw new HttpsError("permission-denied", "Akses khusus Owner diperlukan.");
}

/**
 * Update Owner SMTP Config (System Email)
 */
export const updateOwnerSmtpConfig = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOwner(request);

    const { gmail, appPassword } = request.data || {};
    if (!gmail || !appPassword) throw new HttpsError("invalid-argument", "Data tidak lengkap.");

    // Tes Koneksi SMTP
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
    } catch (err) {
      console.error("Owner SMTP Verify Error:", err);
      throw new HttpsError("failed-precondition", "Gagal verifikasi SMTP Owner: Pastikan Apps Password benar.");
    }

    // Simpan ke Database
    await admin.database().ref(`system/config/smtp`).set({
      email: gmail,
      appPassword: appPassword,
      status: "active",
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });

    return { success: true, message: "Konfigurasi SMTP Owner berhasil disimpan." };
  } catch (error: any) {
    console.error("updateOwnerSmtpConfig Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Gagal menyimpan konfigurasi SMTP.");
  }
});

/**
 * Set Default Payment Gateway for Owner
 */
export const setDefaultOwnerPG = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOwner(request);
    const { provider } = request.data || {};
    if (!provider) throw new HttpsError("invalid-argument", "Provider must be specified.");

    await admin.database().ref(`system/config/payment_gateway/default`).set(provider);
    return { success: true, message: `${provider.toUpperCase()} ditetapkan sebagai PG utama sistem.` };
  } catch (error: any) {
    console.error("setDefaultOwnerPG Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message);
  }
});

/**
 * Get Owner PG Status with Default
 */
export const getOwnerPGStatus = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    const [configsSnap, defaultSnap] = await Promise.all([
      admin.database().ref(`system/config/payment_gateway/configs`).get(),
      admin.database().ref(`system/config/payment_gateway/default`).get()
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

    return status;
  } catch (error: any) {
    console.error("getOwnerPGStatus Error:", error);
    throw new HttpsError("internal", "Gagal mengambil status PG.");
  }
});

/**
 * Get Owner SMTP Status
 */
export const getOwnerSmtpStatus = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOwner(request);

    const snap = await admin.database().ref(`system/config/smtp`).get();
    if (!snap.exists()) {
      return { active: false, status: "Belum Dikonfigurasi" };
    }

    const data = snap.val();
    return {
      active: data.status === "active",
      email: data.email,
      status: data.status === "active" ? "Aktif" : "Bermasalah",
      updatedAt: data.updatedAt
    };
  } catch (error: any) {
    console.error("getOwnerSmtpStatus Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Gagal mengambil status SMTP.");
  }
});

/**
 * Update Plan Config (Starter, Standard, Enterprise)
 */
export const updatePlanConfig = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOwner(request);

    const { planId, config } = request.data || {};
    if (!planId || !config) throw new HttpsError("invalid-argument", "Data tidak lengkap.");

    const allowedPlans = ["starter", "standard", "enterprise"];
    if (!allowedPlans.includes(planId)) throw new HttpsError("invalid-argument", "Plan ID tidak valid.");

    // Simpan ke Database
    await admin.database().ref(`system/config/plans/${planId}`).set({
      ...config,
      updatedAt: admin.database.ServerValue.TIMESTAMP
    });

    return { success: true, message: `Konfigurasi plan ${planId} berhasil diperbarui.` };
  } catch (error: any) {
    console.error("updatePlanConfig Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Gagal menyimpan konfigurasi Plan.");
  }
});

/**
 * Get All Plan Configs
 */
export const getPlanConfigs = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    const snap = await admin.database().ref(`system/config/plans`).get();
    return snap.val() || {};
  } catch (error: any) {
    console.error("getPlanConfigs Error:", error);
    throw new HttpsError("internal", "Gagal mengambil data plan.");
  }
});

/**
 * Update Public Features List
 */
export const updatePublicFeatures = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOwner(request);
    const { features } = request.data || {};
    if (!Array.isArray(features)) throw new HttpsError("invalid-argument", "Features must be an array.");

    await admin.database().ref(`system/config/public/features`).set(features);
    return { success: true, message: "Daftar fitur publik diperbarui." };
  } catch (error: any) {
    console.error("updatePublicFeatures Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Gagal memperbarui fitur publik.");
  }
});

/**
 * Get Public Features
 */
export const getPublicFeatures = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    const snap = await admin.database().ref(`system/config/public/features`).get();
    return snap.val() || [];
  } catch (error: any) {
    console.error("getPublicFeatures Error:", error);
    throw new HttpsError("internal", "Gagal mengambil fitur publik.");
  }
});
