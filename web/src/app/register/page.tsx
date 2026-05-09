"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { School, ArrowLeft, Send, Loader2, CheckCircle, AlertCircle, CheckCircle2, ArrowRight, Clock, Trash2 } from "lucide-react";
import Link from "next/link";
import { auth, functions, rtdb } from "@/lib/firebase";
import { signInWithPopup, GoogleAuthProvider, User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { ref, onValue } from "firebase/database";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [user, setUser] = useState<User | null>(null);
  const [registrationStatus, setRegistrationStatus] = useState<any>(null);
  const [formData, setFormData] = useState({
    npsn: "",
    schoolName: "",
    adminName: "",
    schoolAddress: "",
    phone: "",
  });

  const [isUserLoading, setIsUserLoading] = useState(true);
  const [isStatusLoading, setIsStatusLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    console.log("RegisterPage: Initializing auth listener...");
    let unsubscribeRtdb: (() => void) | null = null;

    const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
      // Bersihkan listener RTDB lama jika ada
      if (unsubscribeRtdb) {
        unsubscribeRtdb();
        unsubscribeRtdb = null;
      }

      if (currentUser) {
        console.log("RegisterPage: User logged in:", currentUser.email);
        setUser(currentUser);
        setIsStatusLoading(true);
        
        // Cek Status Pendaftaran di RTDB - Jalur /registers/{uid}
        const regRef = ref(rtdb, `registers/${currentUser.uid}`);
        unsubscribeRtdb = onValue(regRef, (snapshot) => {
          console.log("RegisterPage: Registration status received");
          if (snapshot.exists()) {
            const data = snapshot.val();
            const firstReg = Object.values(data)[0];
            setRegistrationStatus(firstReg);
          } else {
            console.log("RegisterPage: No registration found");
            setRegistrationStatus(null);
          }
          setIsStatusLoading(false);
          setIsUserLoading(false);
        }, (err) => {
          console.error("RegisterPage: RTDB Error:", err);
          setError("Gagal memuat status pendaftaran.");
          setIsStatusLoading(false);
          setIsUserLoading(false);
        });
      } else {
        console.log("RegisterPage: No user logged in");
        setUser(null);
        setRegistrationStatus(null);
        setIsUserLoading(false);
        setIsStatusLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRtdb) unsubscribeRtdb();
    };
  }, []);

  const isLoading = isUserLoading || isStatusLoading;
  const handleGoogleSignIn = async () => {
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Sign-in error:", err);
      if (err.code === "auth/popup-blocked") {
        setError("Popup diblokir oleh browser. Silakan izinkan popup untuk situs ini.");
      } else {
        setError("Gagal masuk dengan Google.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("Silakan login dengan Google terlebih dahulu.");
      return;
    }

    // Validasi NPSN 8 Digit
    if (!/^\d{8}$/.test(formData.npsn)) {
      setError("NPSN harus berupa 8 digit angka.");
      return;
    }

    setIsStatusLoading(true);
    setError("");

    try {
      const registerSchoolFn = httpsCallable(functions, "registerSchool");
      const result = await registerSchoolFn({
        ...formData,
        adminEmail: user.email,
      });
      
      if (result.data) {
        setIsSuccess(true);
      }
    } catch (err: any) {
      console.error("Registration Error:", err);
      setError(err.message || "Gagal mengirim pendaftaran. Silakan coba lagi.");
    } finally {
      setIsStatusLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center"
        >
          <div className="inline-flex p-4 bg-emerald-500/20 rounded-full mb-6 text-emerald-500">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4">Pendaftaran Terkirim!</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Terima kasih telah mendaftarkan **{formData.schoolName}**. Data Anda telah kami terima dan sedang dalam proses peninjauan oleh tim Owner.
          </p>
          <Link 
            href="/"
            className="block w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all"
          >
            Kembali ke Beranda
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <nav className="p-6">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-indigo-600 rounded-2xl">
              <School className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Pendaftaran Sekolah Baru</h1>
              <p className="text-slate-400 text-sm">Lengkapi data untuk inisialisasi sistem sekolah Anda.</p>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-500 text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
              <p className="text-slate-400">Memeriksa status pendaftaran...</p>
            </div>
          ) : registrationStatus?.status === "active" ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 space-y-6"
            >
              <div className="inline-flex p-4 bg-emerald-500/10 rounded-full text-emerald-500 mb-2">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Pendaftaran Disetujui!</h2>
                <p className="text-slate-400">Selamat! Sekolah <strong>{registrationStatus.schoolName}</strong> ({registrationStatus.npsn}) telah aktif dan siap digunakan.</p>
              </div>
              
              <div className="pt-4">
                <Link 
                  href={`/school/${registrationStatus.npsn}/dashboard`}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  Masuk ke Dashboard <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </motion.div>
          ) : registrationStatus?.status === "pending_approval" ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 space-y-6"
            >
              <div className="inline-flex p-4 bg-amber-500/10 rounded-full text-amber-500 mb-2">
                <Clock className="w-12 h-12" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Pendaftaran Sedang Diproses</h2>
                <p className="text-slate-400">Sekolah <strong>{registrationStatus.schoolName}</strong> ({registrationStatus.npsn}) sedang dalam tahap peninjauan oleh Owner.</p>
              </div>
              <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-2xl max-w-sm mx-auto">
                <p className="text-sm text-slate-500 italic">"Terima kasih atas kesabaran Anda. Kami akan segera mengaktifkan sistem sekolah Anda."</p>
              </div>
              <div className="flex flex-col items-center gap-4 pt-4">
                <Link 
                  href="/"
                  className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
                </Link>
                
                <button
                  onClick={async () => {
                    if (confirm("Apakah Anda yakin ingin membatalkan pendaftaran ini? Semua data yang telah dikirim akan dihapus.")) {
                      try {
                        setIsProcessing(true);
                        const cancelFn = httpsCallable(functions, "cancelRegistration");
                        await cancelFn();
                        setRegistrationStatus(null);
                        setError("");
                      } catch (err: any) {
                        console.error("Cancel error:", err);
                        setError("Gagal membatalkan pendaftaran.");
                      } finally {
                        setIsProcessing(false);
                      }
                    }
                  }}
                  disabled={isLoading}
                  className="text-xs text-red-500/70 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Batalkan Pendaftaran
                </button>
              </div>
            </motion.div>
          ) : registrationStatus?.status === "rejected" ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12 space-y-6"
            >
              <div className="inline-flex p-4 bg-red-500/10 rounded-full text-red-500 mb-2">
                <AlertCircle className="w-12 h-12" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Pendaftaran Ditolak</h2>
                <p className="text-slate-400">Maaf, pendaftaran sekolah <strong>{registrationStatus.schoolName}</strong> ditolak.</p>
                {registrationStatus.reason && (
                  <div className="mt-4 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-sm text-red-400">
                    Alasan: {registrationStatus.reason}
                  </div>
                )}
              </div>
              <button
                onClick={() => setRegistrationStatus(null)}
                className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
              >
                Daftar Ulang
              </button>
            </motion.div>
          ) : !user ? (
            <div className="text-center py-12 space-y-6">
              <p className="text-slate-400">Silakan login dengan Google untuk memverifikasi email admin Anda.</p>
              <button
                onClick={handleGoogleSignIn}
                className="mx-auto px-8 py-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl transition-all flex items-center gap-3 shadow-lg"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Masuk dengan Google
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-4 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Email Terverifikasi</p>
                  <p className="font-bold text-white">{user.email}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setUser(null)}
                  className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                >
                  Ganti Akun
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">NPSN (8 Digit)</label>
                <input
                  type="text"
                  required
                  maxLength={8}
                  disabled={isLoading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                  placeholder="Contoh: 12345678"
                  value={formData.npsn}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length <= 8) setFormData({ ...formData, npsn: val });
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Nama Sekolah</label>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                    placeholder="Contoh: SMA Negeri 1 Jakarta"
                    value={formData.schoolName}
                    onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-400">Nama Admin Utama</label>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                    placeholder="Nama Lengkap"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Nomor WhatsApp / Telepon</label>
                <input
                  type="tel"
                  required
                  disabled={isLoading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                  placeholder="0812xxxxxxxx"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Alamat Sekolah</label>
                <textarea
                  required
                  rows={3}
                  disabled={isLoading}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
                  placeholder="Alamat lengkap sekolah..."
                  value={formData.schoolAddress}
                  onChange={(e) => setFormData({ ...formData, schoolAddress: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Mengirim...
                  </>
                ) : (
                  <>
                    Kirim Pendaftaran <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-slate-500 leading-relaxed">
            Dengan mendaftar, Anda menyetujui Syarat dan Ketentuan penggunaan layanan Aplikasi Sekolah. 
            Data Anda akan diverifikasi oleh Owner sebelum sistem diaktifkan.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
