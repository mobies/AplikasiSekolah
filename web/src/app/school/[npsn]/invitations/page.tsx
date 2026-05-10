"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { 
  Users, 
  Link as LinkIcon, 
  Copy, 
  CheckCircle2, 
  Calendar, 
  UserCircle,
  ShieldCheck,
  UserPlus,
  Clock,
  ExternalLink,
  ChevronRight,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";
import Swal from "sweetalert2";

export default function InvitationManager() {
  const { npsn } = useParams() as { npsn: string };
  const [role, setRole] = useState("student");
  const [rombelId, setRombelId] = useState("");
  const [rombelName, setRombelName] = useState("");
  const [rombelList, setRombelList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<{link: string, expiresAt: number} | null>(null);
  const [copied, setCopied] = useState(false);

  // Otomasi Tahun Ajaran (YYYY_YYYY)
  const now = new Date();
  const month = now.getMonth(); // 0-11
  const year = now.getFullYear();
  const tahunAjaran = month >= 6 ? `${year}_${year + 1}` : `${year - 1}_${year}`;

  useEffect(() => {
    if (!npsn || role !== "student") return;
    
    // Ambil daftar rombel dari metadata ringan (lists)
    const rombelRef = ref(rtdb, `schools/rombel/lists/${npsn}/${tahunAjaran}`);
    const unsubscribe = onValue(rombelRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.entries(data).map(([id, meta]: [string, any]) => ({
          id,
          name: typeof meta === 'string' ? meta : (meta.name || id)
        }));
        setRombelList(list);
      } else {
        setRombelList([]);
      }
    });
    return () => unsubscribe();
  }, [npsn, role, tahunAjaran]);

  const handleGenerate = async () => {
    if (role === "student" && !rombelId) {
      Swal.fire("Error", "Pilih Rombel terlebih dahulu.", "error");
      return;
    }

    setLoading(true);
    try {
      const functions = getFunctions();
      const generateLink = httpsCallable(functions, "generateInvitationLink");
      const result = await generateLink({
        npsn,
        role,
        rombelId,
        rombelName,
        tahunAjaran
      });
      setGeneratedLink(result.data as any);
    } catch (error: any) {
      Swal.fire("Gagal", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink.link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* HEADER */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-4">
              <span className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20">
                <UserPlus className="w-8 h-8" />
              </span>
              Link Undangan
            </h1>
            <p className="text-slate-500 mt-4 font-medium">Buat link pendaftaran aman untuk Guru, Staf, atau Siswa.</p>
          </div>
          <div className="text-right">
            <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl inline-flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <span className="font-black text-sm uppercase tracking-widest">TA {tahunAjaran.replace('_', '/')}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* CONFIGURATION PANEL */}
          <section className="bg-slate-900 border border-slate-800 rounded-[40px] p-10 space-y-8 shadow-2xl">
            <div className="space-y-6">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Pilih Tipe Pengguna</span>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {["student", "teacher", "staff", "parent", "vendor"].map((r) => (
                    <button
                      key={r}
                      onClick={() => setRole(r)}
                      className={`px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border ${
                        role === r ? "bg-indigo-600 border-indigo-500 text-white" : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                      }`}
                    >
                      {r === "student" ? "Siswa" : r === "teacher" ? "Guru" : r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </label>

              <AnimatePresence>
                {role === "student" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4"
                  >
                    <label className="block">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Pilih Rombel Terdaftar</span>
                      <select
                        value={rombelId}
                        onChange={(e) => {
                          const selected = rombelList.find(r => r.id === e.target.value);
                          setRombelId(e.target.value);
                          setRombelName(selected?.name || "");
                        }}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 mt-3 focus:outline-none focus:border-indigo-500 transition-all font-bold text-white appearance-none"
                      >
                        <option value="">-- Pilih Rombel --</option>
                        {rombelList.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="pt-6">
                <button
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-indigo-400 hover:text-white transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LinkIcon className="w-5 h-5" />
                      Buat Link Sekarang
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl flex gap-4">
              <Info className="w-6 h-6 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-200/70 font-medium leading-relaxed">
                Link pendaftaran hanya berlaku selama 24 jam atau akan berakhir otomatis pada pukul 23:59:59 hari ini. Pengguna wajib login menggunakan Google.
              </p>
            </div>
          </section>

          {/* RESULT PANEL */}
          <section className="flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {generatedLink ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-indigo-600 rounded-[40px] p-10 shadow-2xl shadow-indigo-600/30 space-y-8 relative overflow-hidden"
                >
                  <div className="relative z-10 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white/20 rounded-2xl">
                        <ShieldCheck className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white">Link Berhasil Dibuat</h3>
                        <p className="text-indigo-100 text-xs font-medium">Siap untuk dibagikan ke calon pendaftar.</p>
                      </div>
                    </div>

                    <div className="bg-slate-950/30 rounded-[32px] p-6 space-y-4 border border-white/10">
                      <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200/50">Tautan Pendaftaran</p>
                      <div className="flex items-center gap-3 bg-slate-950/50 p-4 rounded-2xl border border-white/5 group">
                        <code className="text-xs font-mono text-indigo-100 flex-1 overflow-hidden truncate">
                          {generatedLink.link}
                        </code>
                        <button 
                          onClick={copyToClipboard}
                          className="p-2 hover:bg-white/10 rounded-xl transition-all"
                        >
                          {copied ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-white" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-white/70">
                      <Clock className="w-5 h-5" />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        Kadaluwarsa: {new Date(generatedLink.expiresAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* DECORATION */}
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-2 border-dashed border-slate-800 rounded-[40px] p-20 text-center space-y-6"
                >
                  <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto text-slate-800">
                    <LinkIcon className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black text-slate-700">Menunggu Konfigurasi</h3>
                    <p className="text-slate-600 text-sm max-w-[200px] mx-auto">Sesuaikan tipe pendaftaran dan tekan tombol buat link.</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </div>
      </div>
    </div>
  );
}
