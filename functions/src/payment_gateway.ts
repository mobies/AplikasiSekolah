import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const region = "asia-southeast1";

/**
 * Helper untuk memvalidasi origin (Copied for isolation)
 */
async function validateOrigin(request: any) {
  const origin = request.rawRequest.headers.origin;
  if (!origin) return;
  
  try {
    const snapshot = await admin.database().ref("system/config/allowedOrigins").get();
    const allowedOrigins = snapshot.exists() ? Object.values(snapshot.val() as Record<string, string>) : [];
    
    if (allowedOrigins.length === 0 && (origin.includes("localhost") || origin.includes("127.0.0.1"))) return;
    if (!allowedOrigins.includes(origin)) throw new HttpsError("permission-denied", "Domain tidak diizinkan.");
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) return;
    throw new HttpsError("internal", "Gagal memvalidasi domain.");
  }
}

/**
 * Helper untuk memvalidasi Owner
 */
async function validateOwner(request: any) {
  if (!request.auth) throw new HttpsError("unauthenticated", "User must be logged in.");
  const uid = request.auth.uid;
  const ownerSnap = await admin.database().ref(`owner/lists/${uid}`).get();
  if (!ownerSnap.exists()) throw new HttpsError("permission-denied", "Akses khusus Owner diperlukan.");
}

/**
 * Update Payment Gateway Config (Owner)
 */
export const updatePaymentGatewayConfig = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    await validateOwner(request);

    const { provider, config } = request.data || {};
    if (!provider || !config) throw new HttpsError("invalid-argument", "Data tidak lengkap.");

    let isValid = false;
    if (provider === "midtrans" && config.serverKey) isValid = true;
    else if (provider === "xendit" && config.secretKey) isValid = true;
    else if (provider === "ipaymu" && config.apiKey && config.va) isValid = true;
    else if (provider === "duitku" && config.merchantCode && config.apiKey) isValid = true;
    else if (provider === "louvin" && config.apiKey && config.slug && config.endpoint) isValid = true;

    if (!isValid) throw new HttpsError("failed-precondition", `Parameter ${provider} tidak valid.`);

    // Simpan ke Database
    const updates: any = {};
    updates[`system/config/payment_gateway/${provider}`] = {
      ...config,
      status: "active",
      updatedAt: admin.database.ServerValue.TIMESTAMP
    };
    
    // Set sebagai PG Aktif untuk transaksi
    updates[`system/config/payment_gateway/active_pg`] = provider;

    await admin.database().ref().update(updates);

    return { success: true, message: `Konfigurasi ${provider} berhasil disimpan dan diset sebagai PG utama.` };
  } catch (error: any) {
    console.error("updatePaymentGatewayConfig Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Gagal menyimpan konfigurasi PG.");
  }
});

/**
 * Get Payment Gateway Status (Owner)
 */
export const getPaymentGatewayStatus = onCall({
  region: region,
  cors: allowedOrigins,

}, async (request) => {
  try {
    await validateOrigin(request);
    await validateOwner(request);

    const snap = await admin.database().ref(`system/config/payment_gateway`).get();
    const data = snap.val() || {};
    const activePg = data.active_pg || null;
    
    const masked: any = {};
    Object.entries(data).forEach(([p, config]: [string, any]) => {
      if (p !== "active_pg" && config && typeof config === 'object') {
        masked[p] = {
          status: config.status || "inactive",
          updatedAt: config.updatedAt || null,
          identifier: config.serverKey || config.secretKey || config.apiKey || config.merchantCode || "configured",
          isActiveForTransaction: p === activePg
        };
      }
    });

    return { 
      providers: masked,
      activePG: activePg
    };
  } catch (error: any) {
    console.error("getPaymentGatewayStatus Error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Gagal mengambil status PG.");
  }
});
