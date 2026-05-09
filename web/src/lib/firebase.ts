import { initializeApp, getApps, getApp } from "firebase/app";
import { getFunctions } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
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

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const rtdb = getDatabase(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app, "asia-southeast1"); 

export { app, rtdb, auth, storage, functions };
