"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { School, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { auth, functions } from "@/lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [formData, setFormData] = useState({
    npsn: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setError("");
    // Jangan set loading di sini untuk menghindari re-render yang bisa memutus 'trusted event'
    
    try {
      const provider = new GoogleAuthProvider();
      // Tambahkan prompt select_account agar user bisa memilih akun dengan jelas
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      if (!result.user) return;

      setIsLoading(true); // Baru set loading setelah popup sukses terbuka/selesai
      
      // Panggil Cloud Function untuk cek Role
      const checkRoleFn = httpsCallable(functions, "checkUserRole");
      const checkResult = await checkRoleFn({ npsn: formData.npsn });
      const { role, npsn } = checkResult.data as any;

      if (role === "owner") {
        router.push("/owner/dashboard");
      } else if (role === "school_admin") {
        router.push(`/school/${npsn}/dashboard`);
      } else if (role === "guest" && (checkResult.data as any)?.status === "pending_approval") {
        setError("Pendaftaran sekolah Anda sedang dalam proses peninjauan.");
        setIsLoading(false);
      } else {
        const schoolName = (checkResult.data as any)?.schoolName;
        if (!formData.npsn || !schoolName) {
          setError("Akses Ditolak");
        } else {
          setError(`Akses Ditolak untuk ${schoolName}`);
        }
        await auth.signOut();
        setIsLoading(false);
      }

    } catch (err: any) {
      console.error("Login Error:", err);
      setIsLoading(false);
      
      if (err.code === "auth/popup-blocked") {
        setError("Popup diblokir oleh browser. Silakan izinkan popup untuk situs ini atau coba lagi.");
      } else if (err.code === "auth/cancelled-popup-request") {
        // Abaikan jika user menutup popup sendiri
      } else {
        setError(err.message || "Gagal login dengan Google.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-md"
      >
        <div className="text-center mb-10">
          <div className="inline-flex p-3 bg-indigo-600 rounded-2xl mb-4">
            <School className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Selamat Datang</h1>
          <p className="text-slate-400 text-sm mt-2">Masuk ke Portal Aplikasi Sekolah</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">NPSN (Kosongkan jika Owner)</label>
            <input
              type="text"
              maxLength={8}
              disabled={isLoading}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors text-white disabled:opacity-50"
              placeholder="8 Digit NPSN"
              value={formData.npsn}
              onChange={(e) => setFormData({ ...formData, npsn: e.target.value.replace(/\D/g, "") })}
            />
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg disabled:opacity-70"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Masuk dengan Google
              </>
            )}
          </button>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 text-center">
          <p className="text-slate-500 text-sm">
            Belum mendaftarkan sekolah? <br />
            <Link href="/register" className="text-indigo-400 font-bold hover:text-indigo-300">Daftar Sekarang</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
