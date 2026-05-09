import { initializeApp, getApps, getApp } from "firebase/app";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getDatabase, connectDatabaseEmulator } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDsIChzJ1vebh7hYg6GjBVAIM-Z8jAzUEs",
  authDomain: "appsekolah2026.firebaseapp.com",
  databaseURL: "https://appsekolah2026-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "appsekolah2026",
  storageBucket: "appsekolah2026.firebasestorage.app",
  messagingSenderId: "362960908316",
  appId: "1:362960908316:web:5d09cc1c7d0c88928befd9",
  measurementId: "G-FPK00FB2SR"
};

// Initialize Firebase (singleton pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const rtdb = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app, "asia-southeast1");

/**
 * AUTO EMULATOR DETECTION
 * Saat NODE_ENV === "development", semua service diarahkan ke emulator lokal.
 * Ini menyelesaikan masalah CORS saat testing dari localhost.
 *
 * Cara pakai:
 *   1. Jalankan emulator: firebase emulators:start
 *   2. Jalankan Next.js: npm run dev
 *   3. Semua panggilan fungsi otomatis ke localhost:5001 (bukan server produksi)
 *
 * PENTING: connectXxxEmulator() hanya boleh dipanggil SEKALI.
 * Kita gunakan flag global untuk mencegah double-connect.
 */
const isEmulatorConnected = (globalThis as any).__firebaseEmulatorsConnected;

// Hanya gunakan emulator jika secara eksplisit diaktifkan lewat .env.local
// (NEXT_PUBLIC_USE_EMULATOR=true). Secara default sekarang akan terhubung
// ke server produksi (karena CORS untuk localhost sudah diizinkan di backend).
if (process.env.NEXT_PUBLIC_USE_EMULATOR === "true" && !isEmulatorConnected) {
  try {
    connectFunctionsEmulator(functions, "localhost", 5001);
    connectDatabaseEmulator(rtdb, "localhost", 9000);
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    (globalThis as any).__firebaseEmulatorsConnected = true;
    console.log("🔧 Firebase Emulators connected (dev mode)");
  } catch (err) {
    console.warn("⚠️ Emulator connect skipped:", err);
  }
}

export { app, rtdb, auth, storage, functions };
