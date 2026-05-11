"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  UserPlus, 
  School, 
  User, 
  ArrowRight, 
  CheckCircle2,
  AlertCircle,
  Loader2,
  Mail,
  Users
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { auth, functions } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import Swal from "sweetalert2";

export default function JoinInvitation() {
  const { token } = useParams() as { token: string };
  const router = useRouter();
  const [invitation, setInvitation] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [formData, setFormData] = useState({
    nisn: "",
    specialization: ""
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!token) return;
    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      const validate = httpsCallable(functions, "validateInvitationToken");
      const result = await validate({ token });
      setInvitation(result.data);
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      Swal.fire("Gagal Login", error.message, "error");
    }
  };

  const handleRegister = async () => {
    if (invitation.role === "student" && !formData.nisn) {
      Swal.fire("Wajib", "NISN harus diisi.", "warning");
      return;
    }

    setRegistering(true);
    try {
      const register = httpsCallable(functions, "registerViaInvitation");
      await register({ token, formData });
      
      await Swal.fire({
        title: "Pendaftaran Berhasil!",
        text: `Selamat, Anda telah terdaftar di ${invitation.schoolName}.`,
        icon: "success",
        timer: 3000
      });
      
      router.push("/");
    } catch (error: any) {
      Swal.fire("Gagal", error.message, "error");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-6">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Memverifikasi Undangan...</p>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-center space-y-8">
        <div className="p-6 bg-red-500/10 rounded-full text-red-500">
          <AlertCircle className="w-16 h-16" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-white">Undangan Tidak Valid</h1>
          <p className="text-slate-500 mt-4 max-w-md">Tautan mungkin sudah kadaluwarsa atau tidak terdaftar di sistem kami.</p>
        </div>
        <button onClick={() => router.push("/")} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold border border-slate-800">
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 lg:p-12">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* INFO COLUMN */}
        <div className="space-y-8">
          <div className="space-y-4">
            <span className="px-4 py-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Verifikasi Aman Berhasil
            </span>
            <h1 className="text-5xl lg:text-6xl font-black tracking-tight leading-none">
              Selamat Datang di <br />
              <span className="text-indigo-500 uppercase tracking-tighter">{invitation.schoolName}</span>
            </h1>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-6 p-6 bg-slate-900 border border-slate-800 rounded-[32px]">
              <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center text-indigo-400">
                {invitation.role === "student" ? <Users className="w-8 h-8" /> : <User className="w-8 h-8" />}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipe Pendaftaran</p>
                <h3 className="text-xl font-black text-white capitalize">{invitation.role === "student" ? `Siswa - ${invitation.rombelName}` : invitation.role}</h3>
              </div>
            </div>

            <div className="flex items-center gap-6 p-6 bg-slate-900 border border-slate-800 rounded-[32px]">
              <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center text-emerald-400">
                <School className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sekolah Tujuan</p>
                <h3 className="text-xl font-black text-white">{invitation.schoolName}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* REGISTRATION CARD */}
        <section className="bg-slate-900 border border-slate-800 rounded-[48px] p-10 lg:p-12 shadow-2xl relative overflow-hidden">
          {!user ? (
            <div className="space-y-10 text-center py-10">
              <div className="w-20 h-20 bg-slate-950 rounded-[28px] flex items-center justify-center mx-auto border border-slate-800">
                <Mail className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-white">Login Diperlukan</h3>
                <p className="text-slate-500 text-sm font-medium">Anda harus menggunakan akun Google untuk memverifikasi identitas pendaftaran.</p>
              </div>
              <button 
                onClick={handleGoogleLogin}
                className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-400 hover:text-white transition-all flex items-center justify-center gap-4 group"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="google" />
                Masuk dengan Google
                <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="flex items-center gap-4 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                <img src={user.photoURL} alt="avatar" className="w-12 h-12 rounded-xl shadow-lg border-2 border-indigo-500" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Terdeteksi Sebagai</p>
                  <h4 className="font-bold text-white truncate">{user.displayName}</h4>
                </div>
                <CheckCircle2 className="w-6 h-6 text-emerald-500 ml-auto" />
              </div>

              <div className="space-y-6">
                {invitation.role === "student" && (
                  <label className="block space-y-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Nomor Induk Siswa Nasional (NISN)</span>
                    <input 
                      type="text" 
                      placeholder="Masukkan NISN Anda..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-bold"
                      value={formData.nisn}
                      onChange={(e) => setFormData({...formData, nisn: e.target.value})}
                    />
                  </label>
                )}

                {invitation.role === "teacher" && (
                  <label className="block space-y-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Spesialisasi / Mata Pelajaran</span>
                    <input 
                      type="text" 
                      placeholder="Contoh: Guru Matematika"
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-bold"
                      value={formData.specialization}
                      onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                    />
                  </label>
                )}

                <button 
                  onClick={handleRegister}
                  disabled={registering}
                  className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 mt-6"
                >
                  {registering ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5" /> Selesaikan Pendaftaran</>}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
