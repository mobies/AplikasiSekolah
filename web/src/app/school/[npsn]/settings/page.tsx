"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Settings, 
  CreditCard, 
  ShieldCheck, 
  Save, 
  RefreshCcw, 
  CheckCircle2, 
  XCircle,
  ArrowLeft,
  LayoutDashboard,
  LogOut,
  School,
  Loader2,
  Mail,
  Lock,
  Smartphone,
  Globe,
  Bell,
  Database,
  Zap,
  Search,
  File
} from "lucide-react";
import { auth, functions, rtdb } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useRouter, useParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import Swal from "sweetalert2";
import Link from "next/link";

type SettingCategory = "general" | "smtp" | "payment" | "billing" | "migration";
type PGProvider = "midtrans" | "xendit" | "ipaymu" | "duitku" | "louvin";

export default function SchoolSettings() {
  const params = useParams();
  const npsn = params.npsn as string;
  
  const [activeCategory, setActiveCategory] = useState<SettingCategory>("smtp");
  const [activePG, setActivePG] = useState<PGProvider>("midtrans");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [schoolData, setSchoolData] = useState<any>(null);
  
  // Status States
  const [smtpStatus, setSmtpStatus] = useState<any>(null);
  const [pgStatus, setPgStatus] = useState<any>(null);

  // Config States
  const [smtpConfig, setSmtpConfig] = useState({ gmail: "", appPassword: "" });
  const [pgConfigs, setPgConfigs] = useState<any>({
    midtrans: { serverKey: "", clientKey: "" },
    xendit: { secretKey: "", publicKey: "" },
    ipaymu: { apiKey: "", va: "" },
    duitku: { merchantCode: "", apiKey: "" },
    louvin: { apiKey: "", slug: "", endpoint: "https://api.louvin.dev/create-transaction" }
  });

  const [importJson, setImportJson] = useState("");
  const [previewData, setPreviewData] = useState<any>(null);
  const [tahunAjaran, setTahunAjaran] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    // Jika bulan >= 6 (Juli), tahun ajaran adalah year/year+1
    return month >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      
      try {
        // Load School Basic Data
        const schoolRef = ref(rtdb, `schools/lists/${npsn}`);
        onValue(schoolRef, (snap) => {
          if (snap.exists()) setSchoolData(snap.val());
        });

        await Promise.all([fetchSmtpStatus(), fetchPGStatus()]);
      } catch (error) {
        console.error("Auth/Load Error:", error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [npsn]);

  const fetchSmtpStatus = async () => {
    try {
      const getStatusFn = httpsCallable(functions, "getSmtpStatus");
      const result = await getStatusFn({ npsn });
      const data = result.data as any;
      setSmtpStatus(data);
      if (data?.email) setSmtpConfig(prev => ({ ...prev, gmail: data.email }));
    } catch (error) {
      console.error("Fetch SMTP Error:", error);
    }
  };

  const fetchPGStatus = async () => {
    try {
      const getStatusFn = httpsCallable(functions, "getSchoolPGStatus");
      const result = await getStatusFn({ npsn });
      const data = result.data as any;
      setPgStatus(data || {});
    } catch (error) {
      console.error("Fetch PG Status Error:", error);
    }
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updateSmtpFn = httpsCallable(functions, "updateSmtpConfig");
      await updateSmtpFn({ npsn, ...smtpConfig });
      await fetchSmtpStatus();
      Swal.fire({ title: "Berhasil!", text: "Konfigurasi SMTP Gmail sekolah aktif.", icon: "success", background: "#0f172a", color: "#f1f5f9" });
    } catch (error: any) {
      Swal.fire({ title: "Gagal", text: error.message || "Pastikan kredensial benar.", icon: "error", background: "#0f172a", color: "#f1f5f9" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePG = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatePgFn = httpsCallable(functions, "updateSchoolPG");
      await updatePgFn({ npsn, provider: activePG, config: pgConfigs[activePG] });
      await fetchPGStatus();
      Swal.fire({ title: "Berhasil!", text: `Konfigurasi ${activePG.toUpperCase()} sekolah aktif.`, icon: "success", background: "#0f172a", color: "#f1f5f9" });
    } catch (error: any) {
      Swal.fire({ title: "Gagal", text: error.message || "Pastikan API Key benar.", icon: "error", background: "#0f172a", color: "#f1f5f9" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefaultPG = async (provider: PGProvider) => {
    const result = await Swal.fire({
      title: "Konfirmasi Default PG Sekolah",
      text: `Apakah Anda yakin ingin menjadikan ${provider.toUpperCase()} sebagai gateway utama untuk pembayaran di sekolah ini?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Jadikan Default",
      cancelButtonText: "Batal",
      background: "#0f172a",
      color: "#f1f5f9",
      confirmButtonColor: "#4f46e5"
    });

    if (!result.isConfirmed) return;

    setIsSaving(true);
    try {
      const setFn = httpsCallable(functions, "setDefaultSchoolPG");
      await setFn({ npsn, provider });
      await fetchPGStatus();
      Swal.fire({ title: "Berhasil!", text: `${provider.toUpperCase()} sekarang menjadi PG default sekolah Anda.`, icon: "success", background: "#0f172a", color: "#f1f5f9" });
    } catch (error: any) {
      Swal.fire({ title: "Gagal", text: error.message, icon: "error", background: "#0f172a", color: "#f1f5f9" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJson(content);
      Swal.fire({ title: "File Berhasil Dimuat", text: `File ${file.name} telah dibaca. Silakan klik Analisis untuk melihat preview.`, icon: "success", toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
    };
    reader.readAsText(file);
  };

  const handlePreviewData = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(importJson);
      const stats = {
        total: Object.keys(data).length,
        students: 0,
        teachers: 0,
        teacherList: [] as string[],
        classes: {} as Record<string, number>,
        samples: [] as any[]
      };

      Object.values(data).forEach((u: any, idx) => {
        if (u.role === "peserta") {
          stats.students++;
          const className = u.kelas || "UNDEFINED_CLASS";
          stats.classes[className] = (stats.classes[className] || 0) + 1;
        } else if (u.role === "author") {
          stats.teachers++;
          stats.teacherList.push(u.nama || u.NAMA);
        }
        if (idx < 5) stats.samples.push(u);
      });

      setPreviewData({
        ...stats,
        classesCount: Object.keys(stats.classes).length,
        classesSorted: Object.entries(stats.classes).sort((a, b) => b[1] - a[1])
      });
    } catch (error) {
      Swal.fire({ title: "JSON Error", text: "Format JSON tidak valid.", icon: "error", background: "#0f172a", color: "#f1f5f9" });
    }
  };

  const handleImportData = async () => {
    setIsSaving(true);
    try {
      const importFn = httpsCallable(functions, "importSchoolData");
      const result = await importFn({ npsn, jsonData: importJson, tahunAjaran });
      setImportJson("");
      setPreviewData(null);
      Swal.fire({ title: "Berhasil!", text: (result.data as any).message, icon: "success", background: "#0f172a", color: "#f1f5f9" });
    } catch (error: any) {
      Swal.fire({ title: "Gagal", text: error.message, icon: "error", background: "#0f172a", color: "#f1f5f9" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      {/* Sidebar Navigation */}
      <aside className="w-72 border-r border-slate-800 p-8 flex flex-col gap-10 hidden md:flex bg-slate-950/80 backdrop-blur-xl sticky top-0 h-screen">
        <div className="flex items-center gap-4 px-2">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl shadow-xl shadow-indigo-500/20">
            <School className="w-7 h-7 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-sm text-white tracking-tight truncate w-32 uppercase">{schoolData?.nama || "School"}</span>
            <span className="text-[10px] font-black tracking-[0.2em] text-indigo-400 uppercase">Admin Panel</span>
          </div>
        </div>

        <div className="space-y-8 flex-1">
          <nav className="flex flex-col gap-2">
            <span className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Main Menu</span>
            <Link href={`/school/${npsn}/dashboard`} className="px-4 py-3 text-slate-400 hover:bg-slate-900 hover:text-white rounded-2xl flex items-center gap-3 transition-all group">
              <LayoutDashboard className="w-5 h-5 group-hover:scale-110 transition-transform" /> Dashboard
            </Link>
          </nav>

          <nav className="flex flex-col gap-2">
            <span className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Configurations</span>
            <button 
              onClick={() => setActiveCategory("smtp")}
              className={`px-4 py-3 rounded-2xl flex items-center gap-3 transition-all ${activeCategory === "smtp" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-900"}`}
            >
              <Mail className="w-5 h-5" /> SMTP Gmail
            </button>
            <button 
              onClick={() => setActiveCategory("payment")}
              className={`px-4 py-3 rounded-2xl flex items-center gap-3 transition-all ${activeCategory === "payment" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-900"}`}
            >
              <CreditCard className="w-5 h-5" /> Payment Gateway
            </button>
            <button 
              onClick={() => setActiveCategory("migration")}
              className={`px-4 py-3 rounded-2xl flex items-center gap-3 transition-all ${activeCategory === "migration" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-900"}`}
            >
              <Database className="w-5 h-5" /> Migrasi Data
            </button>
          </nav>
        </div>

        <button onClick={handleLogout} className="px-4 py-3 text-slate-500 hover:text-red-400 flex items-center gap-3 transition-colors group border-t border-slate-800 pt-8">
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Keluar Sistem
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <header className="px-10 py-8 flex justify-between items-center bg-slate-950/50 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800/50">
          <div className="flex items-center gap-6">
            <Link href={`/school/${npsn}/dashboard`} className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl text-slate-400 transition-all border border-slate-800">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-white capitalize">{activeCategory} Settings</h1>
              <p className="text-sm text-slate-500 font-medium">Atur parameter operasional dan koneksi sistem sekolah.</p>
            </div>
          </div>
        </header>

        <div className="p-10 max-w-5xl mx-auto pb-32">
          <AnimatePresence mode="wait">
            {/* SMTP CATEGORY */}
            {activeCategory === "smtp" && (
              <motion.div key="smtp" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
                <div className="bg-slate-900 border border-slate-800 rounded-[48px] overflow-hidden shadow-2xl">
                  <div className="p-10 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
                        <Mail className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white">Gmail SMTP Config</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">Gunakan Akun Gmail untuk mengirim email resmi sekolah.</p>
                      </div>
                    </div>
                    {smtpStatus?.active && (
                      <div className="px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">{smtpStatus.status}</span>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSaveSmtp} className="p-10 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Gmail Sekolah</label>
                        <input 
                          type="email"
                          required
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-medium"
                          value={smtpConfig.gmail}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, gmail: e.target.value })}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Apps Password</label>
                        <input 
                          type="password"
                          required
                          placeholder="xxxx xxxx xxxx xxxx"
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono"
                          value={smtpConfig.appPassword}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, appPassword: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="p-8 bg-indigo-600/5 rounded-3xl border border-indigo-500/10 flex items-start gap-5">
                      <div className="p-3 bg-indigo-600/20 rounded-xl text-indigo-400">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Informasi Penting</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          Pastikan Anda menggunakan <strong>Apps Password</strong> (16 digit) dari Google Security, bukan password login biasa. SMTP ini digunakan untuk mengirimkan Notifikasi, Invoice, dan Raport digital kepada orang tua.
                        </p>
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-3xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 group active:scale-95"
                    >
                      {isSaving ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                      Verifikasi & Simpan SMTP
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* PAYMENT GATEWAY CATEGORY */}
            {activeCategory === "payment" && (
              <motion.div key="payment" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {(["midtrans", "xendit", "ipaymu", "duitku", "louvin"] as PGProvider[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setActivePG(p)}
                      className={`p-8 rounded-[32px] border transition-all flex flex-col items-center gap-5 relative overflow-hidden group ${
                        activePG === p 
                          ? "bg-slate-900 border-indigo-500 shadow-2xl shadow-indigo-500/10" 
                          : "bg-slate-900/40 border-slate-800/50 hover:border-slate-700"
                      }`}
                    >
                      <div className={`p-4 rounded-2xl ${activePG === p ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-slate-800 text-slate-500"}`}>
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${activePG === p ? "text-white" : "text-slate-500"}`}>{p}</span>
                      
                      {pgStatus?.[p]?.isActiveForTransaction && (
                        <div className="absolute top-4 left-4 bg-emerald-500 border border-emerald-400 px-3 py-1 rounded-full flex items-center gap-2 shadow-xl shadow-emerald-500/20">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          <span className="text-[10px] font-black uppercase tracking-tighter text-white">DEFAULT</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-[48px] overflow-hidden shadow-2xl">
                  <div className="p-10 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-indigo-400 font-black text-2xl uppercase italic border border-slate-700">
                        {activePG.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black capitalize text-white">{activePG} for School</h3>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className={`w-2 h-2 rounded-full ${pgStatus?.[activePG]?.status === 'active' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                          <span className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">
                            {pgStatus?.[activePG]?.status === 'active' ? 'Operational' : 'Not Configured'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {pgStatus?.[activePG]?.status === 'active' && !pgStatus?.[activePG]?.isActiveForTransaction && (
                      <button 
                        onClick={() => handleSetDefaultPG(activePG)}
                        className="px-6 py-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Set as Default for School Transactions
                      </button>
                    )}
                    
                    {pgStatus?.[activePG]?.isActiveForTransaction && (
                      <div className="px-6 py-3 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" /> Active Transaction Gateway
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSavePG} className="p-12 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {activePG === "midtrans" && (
                        <>
                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Server Key</label>
                            <input 
                              type="password"
                              className="w-full bg-slate-950 border border-slate-800 rounded-[24px] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono text-sm"
                              value={pgConfigs.midtrans.serverKey}
                              onChange={(e) => setPgConfigs({ ...pgConfigs, midtrans: { ...pgConfigs.midtrans, serverKey: e.target.value } })}
                            />
                          </div>
                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Client Key</label>
                            <input 
                              type="text"
                              className="w-full bg-slate-950 border border-slate-800 rounded-[24px] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono text-sm"
                              value={pgConfigs.midtrans.clientKey}
                              onChange={(e) => setPgConfigs({ ...pgConfigs, midtrans: { ...pgConfigs.midtrans, clientKey: e.target.value } })}
                            />
                          </div>
                        </>
                      )}
                      {activePG === "xendit" && (
                        <>
                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Secret Key</label>
                            <input 
                              type="password"
                              className="w-full bg-slate-950 border border-slate-800 rounded-[24px] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono text-sm"
                              value={pgConfigs.xendit.secretKey}
                              onChange={(e) => setPgConfigs({ ...pgConfigs, xendit: { ...pgConfigs.xendit, secretKey: e.target.value } })}
                            />
                          </div>
                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Public Key</label>
                            <input 
                              type="text"
                              className="w-full bg-slate-950 border border-slate-800 rounded-[24px] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono text-sm"
                              value={pgConfigs.xendit.publicKey}
                              onChange={(e) => setPgConfigs({ ...pgConfigs, xendit: { ...pgConfigs.xendit, publicKey: e.target.value } })}
                            />
                          </div>
                        </>
                      )}
                      {activePG === "louvin" && (
                        <>
                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">API Key</label>
                            <input 
                              type="password"
                              className="w-full bg-slate-950 border border-slate-800 rounded-[24px] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono text-sm"
                              value={pgConfigs.louvin.apiKey}
                              onChange={(e) => setPgConfigs({ ...pgConfigs, louvin: { ...pgConfigs.louvin, apiKey: e.target.value } })}
                              placeholder="Masukkan API Key Louvin"
                            />
                          </div>
                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Louvin Slug</label>
                            <input 
                              type="text"
                              className="w-full bg-slate-950 border border-slate-800 rounded-[24px] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono text-sm"
                              value={pgConfigs.louvin.slug}
                              onChange={(e) => setPgConfigs({ ...pgConfigs, louvin: { ...pgConfigs.louvin, slug: e.target.value } })}
                              placeholder="Masukkan Slug Louvin Sekolah"
                            />
                          </div>
                          <div className="space-y-4 md:col-span-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Base Endpoint (Louvin API)</label>
                            <input 
                              type="text"
                              className="w-full bg-slate-950 border border-slate-800 rounded-[24px] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono text-sm"
                              value={pgConfigs.louvin.endpoint}
                              onChange={(e) => setPgConfigs({ ...pgConfigs, louvin: { ...pgConfigs.louvin, endpoint: e.target.value } })}
                              placeholder="https://api.louvin.dev/create-transaction"
                            />
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-8 bg-slate-950/50 rounded-[32px] border border-slate-800/50 backdrop-blur-md">
                      <div className="flex items-center gap-4 text-xs text-slate-500 font-medium italic">
                        <ShieldCheck className="w-5 h-5 text-indigo-500" />
                        Pembayaran sekolah akan langsung masuk ke rekening sekolah Anda.
                      </div>
                      <button 
                        type="submit"
                        disabled={isSaving}
                        className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-indigo-600/30 group active:scale-95"
                      >
                        {isSaving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                        Simpan & Aktifkan {activePG.toUpperCase()}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* MIGRATION CATEGORY */}
            {activeCategory === "migration" && (
              <motion.div key="migration" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
                <div className="bg-slate-900 border border-slate-800 rounded-[48px] overflow-hidden shadow-2xl">
                  <div className="p-10 border-b border-slate-800 bg-slate-950/40 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-violet-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-violet-600/20">
                        <Database className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-white">Import Data Sekolah</h3>
                        <p className="text-xs text-slate-500 font-medium mt-1">Tempelkan format JSON migrasi untuk mengimpor Siswa & Guru.</p>
                      </div>
                    </div>
                  </div>

                  {!previewData ? (
                    <form onSubmit={handlePreviewData} className="p-10 space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Tahun Ajaran Target</label>
                          <select 
                            className="w-full bg-slate-950 border border-slate-800 rounded-3xl px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-bold text-sm"
                            value={tahunAjaran}
                            onChange={(e) => setTahunAjaran(e.target.value)}
                          >
                            {(() => {
                              const currentYear = parseInt(tahunAjaran.split('/')[0]);
                              return [currentYear - 1, currentYear, currentYear + 1].map(y => (
                                <option key={y} value={`${y}/${y+1}`}>{y}/{y+1}</option>
                              ));
                            })()}
                          </select>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Sumber Data</label>
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full h-[60px] bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-3xl text-[10px] font-black uppercase tracking-widest text-indigo-400 transition-all flex items-center justify-center gap-3"
                          >
                            <File className="w-4 h-4" /> Pilih File JSON
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-1">Raw JSON (Pilih File atau Paste)</label>
                        <textarea 
                          required
                          rows={8}
                          placeholder='Tempelkan JSON di sini atau pilih file di atas...'
                          className="w-full bg-slate-950 border border-slate-800 rounded-3xl px-8 py-6 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono text-xs leading-relaxed"
                          value={importJson}
                          onChange={(e) => setImportJson(e.target.value)}
                        />
                      </div>
                      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />

                      <div className="p-8 bg-amber-600/5 rounded-3xl border border-amber-500/10 flex items-start gap-5">
                        <div className="p-3 bg-amber-600/20 rounded-xl text-amber-400">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Peringatan Migrasi</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Pastikan format JSON sesuai dengan struktur migrasi standar. Proses analisis akan mendeteksi jumlah siswa, guru, dan kelas sebelum Anda melakukan konfirmasi penyimpanan.
                          </p>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={isSaving || !importJson.trim()}
                        className="w-full py-5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white font-black rounded-3xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-violet-600/30 group active:scale-95"
                      >
                        <Search className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        Analisis Data Preview
                      </button>
                    </form>
                  ) : (
                    <div className="p-10 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="grid grid-cols-3 gap-6">
                        <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-3xl">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Siswa</p>
                          <p className="text-3xl font-black text-white">{previewData.students}</p>
                        </div>
                        <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-3xl">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Guru</p>
                          <p className="text-3xl font-black text-white">{previewData.teachers}</p>
                        </div>
                        <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-3xl">
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Total Kelas</p>
                          <p className="text-3xl font-black text-white">{previewData.classesCount}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        {/* Kolom Rombel */}
                        <div className="bg-slate-950/50 border border-slate-800 rounded-[32px] overflow-hidden">
                          <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Daftar Rombel / Kelas</h4>
                            <span className="text-[10px] font-bold text-slate-500">{previewData.classesCount} Kelas</span>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto p-4 space-y-2">
                            {previewData?.classesSorted?.map(([name, count]: any) => (
                              <div key={name} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                                <span className="text-sm font-bold text-slate-300">{name === 'UNDEFINED_CLASS' ? 'Tanpa Kelas' : name}</span>
                                <span className="px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[10px] font-black">{count} Siswa</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Kolom Guru */}
                        <div className="bg-slate-950/50 border border-slate-800 rounded-[32px] overflow-hidden">
                          <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Daftar Guru Terdeteksi</h4>
                            <span className="text-[10px] font-bold text-slate-500">{previewData.teachers} Guru</span>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto p-4 space-y-2">
                            {previewData?.teacherList?.map((name: string, i: number) => (
                              <div key={i} className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800/50">
                                <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 text-[10px] font-black">
                                  {name.charAt(0)}
                                </div>
                                <span className="text-sm font-bold text-slate-300">{name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bg-indigo-600/5 border border-indigo-500/10 p-8 rounded-[32px]">
                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Sampel Struktur Data</h4>
                        <div className="space-y-3">
                          {previewData?.samples?.map((s: any, i: number) => (
                            <div key={i} className="flex items-center justify-between py-3 border-b border-indigo-500/10 last:border-0">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-white">{s.nama || s.NAMA}</span>
                                <span className="text-[10px] text-slate-500 font-medium">{s.email || 'no-email'}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {s.kelas && <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-[10px] font-bold uppercase">{s.kelas}</span>}
                                <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase">{s.role}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button 
                          onClick={() => setPreviewData(null)}
                          className="flex-1 py-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-3xl transition-all"
                        >
                          Batal & Edit JSON
                        </button>
                        <button 
                          onClick={handleImportData}
                          disabled={isSaving}
                          className="flex-[2] py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-3xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/30 group active:scale-95"
                        >
                          {isSaving ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />}
                          Konfirmasi & Import {previewData.total} Data
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* GENERAL PROFILE PLACEHOLDER */}
            {activeCategory === "general" && (
              <motion.div key="general" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-40">
                <Globe className="w-20 h-20 text-slate-800 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-slate-700 uppercase tracking-widest transition-all">Coming Soon</h2>
                <p className="text-slate-600 mt-2">Atur Logo, Nama Instansi, dan Profil Sekolah untuk publik.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
