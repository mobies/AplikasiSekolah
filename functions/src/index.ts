import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

// Contoh Function untuk mendaftarkan sekolah baru
export const registerSchool = functions.https.onCall(async (data, context) => {
  // Hanya user yang sudah login bisa mendaftarkan sekolah
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in.");
  }

  const { schoolName, adminEmail } = data;

  try {
    const schoolRef = admin.firestore().collection("schools").doc();
    await schoolRef.set({
      name: schoolName,
      status: "pending_approval",
      requestedBy: context.auth.uid,
      adminEmail: adminEmail,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, schoolId: schoolRef.id };
  } catch (error) {
    throw new functions.https.HttpsError("internal", "Failed to register school.");
  }
});
