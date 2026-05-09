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
  Users,
  LogOut,
  School,
  Loader2,
  Zap,
  Lock,
  ExternalLink,
  Mail,
  Smartphone,
  Globe,
  Bell,
  Database
} from "lucide-react";
import { auth, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import Swal from "sweetalert2";
import Link from "next/link";

type SettingCategory = "payment" | "smtp" | "plans" | "general";
type PGProvider = "midtrans" | "xendit" | "ipaymu" | "duitku" | "louvin";

export default function OwnerSettings() {
  const [activeCategory, setActiveCategory] = useState<SettingCategory>("payment");
  const [activePG, setActivePG] = useState<PGProvider>("midtrans");
  const [pgStatus, setPgStatus] = useState<any>(null);
  const [smtpStatus, setSmtpStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [globalFeatures, setGlobalFeatures] = useState<string[]>([]);
  const [newGlobalFeature, setNewGlobalFeature] = useState("");
  
  // States for configs
  const [pgConfigs, setPgConfigs] = useState<any>({
    midtrans: { serverKey: "", clientKey: "", isProduction: false },
    xendit: { secretKey: "", publicKey: "" },
    ipaymu: { apiKey: "", va: "" },
    duitku: { merchantCode: "", apiKey: "" },
    louvin: { apiKey: "", slug: "", endpoint: "https://api.louvin.dev/create-transaction" }
  });
  const [smtpConfig, setSmtpConfig] = useState({ gmail: "", appPassword: "" });
  const [planConfigs, setPlanConfigs] = useState<any>({
    starter: { priceMonthly: 0, annualDiscount: 0, features: [] },
    standard: { priceMonthly: 0, annualDiscount: 0, features: [] },
    enterprise: { priceMonthly: 0, annualDiscount: 0, features: [] }
  });

  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const checkRoleFn = httpsCallable(functions, "checkUserRole");
        const result = await checkRoleFn({});
        const { role } = result.data as any;

        if (role !== "owner") {
          router.push("/login");
          return;
        }
        
        await Promise.all([fetchPGStatus(), fetchSmtpStatus(), fetchPlanConfigs(), fetchGlobalFeatures()]);
      } catch (error) {
        console.error("Owner Auth Error:", error);
        router.push("/login");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const fetchGlobalFeatures = async () => {
    try {
      const getFn = httpsCallable(functions, "getPublicFeatures");
      const result = await getFn({});
      setGlobalFeatures(result.data as string[]);
    } catch (error) {
      console.error("Fetch Global Features Error:", error);
    }
  };

  const handleUpdateGlobalFeatures = async (newFeatures: string[]) => {
    setIsSaving(true);
    try {
      const updateFn = httpsCallable(functions, "updatePublicFeatures");
      await updateFn({ features: newFeatures });
      setGlobalFeatures(newFeatures);
      Swal.fire({ title: "Berhasil!", text: "Daftar fitur publik diperbarui.", icon: "success", background: "#0f172a", color: "#f1f5f9" });
    } catch (error: any) {
      Swal.fire({ title: "Gagal", text: error.message, icon: "error", background: "#0f172a", color: "#f1f5f9" });
    } finally {
      setIsSaving(false);
    }
  };

  const fetchPGStatus = async () => {
    try {
      const getStatusFn = httpsCallable(functions, "getPaymentGatewayStatus");
      const result = await getStatusFn({});
      const data = result.data as any;
      setPgStatus(data || {});
    } catch (error) {
      console.error("Fetch PG Status Error:", error);
    }
  };

  const fetchSmtpStatus = async () => {
    try {
      const getStatusFn = httpsCallable(functions, "getOwnerSmtpStatus");
      const result = await getStatusFn({});
      setSmtpStatus(result.data);
    } catch (error) {
      console.error("Fetch SMTP Status Error:", error);
    }
  };

  const fetchPlanConfigs = async () => {
    try {
      const getPlansFn = httpsCallable(functions, "getPlanConfigs");
      const result = await getPlansFn({});
      const data = result.data as any;
      if (data && Object.keys(data).length > 0) {
        // Ensure features is array
        const sanitized: any = {};
        ["starter", "standard", "enterprise"].forEach(p => {
          sanitized[p] = {
            priceMonthly: data[p]?.priceMonthly || 0,
            annualDiscount: data[p]?.annualDiscount || 0,
            features: Array.isArray(data[p]?.features) ? data[p].features : []
          };
        });
        setPlanConfigs(sanitized);
      }
    } catch (error) {
      console.error("Fetch Plans Error:", error);
    }
  };

  const handleSavePlan = async (planId: string) => {
    setIsSaving(true);
    try {
      const updatePlanFn = httpsCallable(functions, "updatePlanConfig");
      await updatePlanFn({ planId, config: planConfigs[planId] });
      Swal.fire({ title: "Berhasil!", text: `Plan ${planId} diperbarui.`, icon: "success", background: "#0f172a", color: "#f1f5f9" });
    } catch (error: any) {
      Swal.fire({ title: "Gagal", text: error.message, icon: "error", background: "#0f172a", color: "#f1f5f9" });
    } finally {
      setIsSaving(false);
    }
  };

  // Get features already used by OTHER plans
  const getUsedFeatures = (currentPlanId: string) => {
    let used: string[] = [];
    Object.keys(planConfigs).forEach(pId => {
      if (pId !== currentPlanId) {
        used = [...used, ...planConfigs[pId].features];
      }
    });
    return used;
  };

  const handleSavePGConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatePgFn = httpsCallable(functions, "updatePaymentGatewayConfig");
      await updatePgFn({ provider: activePG, config: pgConfigs[activePG] });
      await fetchPGStatus();
      Swal.fire({ title: "Berhasil!", text: `Konfigurasi ${activePG.toUpperCase()} aktif sebagai PG utama.`, icon: "success", background: "#0f172a", color: "#f1f5f9" });
    } catch (error: any) {
      Swal.fire({ title: "Gagal", text: error.message || "Pastikan API Key benar.", icon: "error", background: "#0f172a", color: "#f1f5f9" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSmtpConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updateSmtpFn = httpsCallable(functions, "updateOwnerSmtpConfig");
      await updateSmtpFn(smtpConfig);
      await fetchSmtpStatus();
      Swal.fire({ title: "Berhasil!", text: "Konfigurasi SMTP System telah diperbarui.", icon: "success", background: "#0f172a", color: "#f1f5f9" });
    } catch (error: any) {
      Swal.fire({ title: "Gagal", text: error.message || "Pastikan kredensial benar.", icon: "error", background: "#0f172a", color: "#f1f5f9" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefaultPG = async (provider: PGProvider) => {
    const result = await Swal.fire({
      title: "Konfirmasi Default PG",
      text: `Apakah Anda yakin ingin menjadikan ${provider.toUpperCase()} sebagai gateway utama untuk transaksi?`,
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
      const setFn = httpsCallable(functions, "setDefaultOwnerPG");
      await setFn({ provider });
      await fetchPGStatus();
      Swal.fire({ title: "Berhasil!", text: `${provider.toUpperCase()} sekarang menjadi PG default sistem.`, icon: "success", background: "#0f172a", color: "#f1f5f9" });
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
            <span className="font-black text-xl text-white tracking-tight">OWNER</span>
            <span className="text-[10px] font-black tracking-[0.2em] text-indigo-400 uppercase">Control Center</span>
          </div>
        </div>

        <div className="space-y-8 flex-1">
          {/* Main Navigation */}
          <nav className="flex flex-col gap-2">
            <span className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Main Menu</span>
            <Link href="/owner/dashboard" className="px-4 py-3 text-slate-400 hover:bg-slate-900 hover:text-white rounded-2xl flex items-center gap-3 transition-all group">
              <LayoutDashboard className="w-5 h-5 group-hover:scale-110 transition-transform" /> Dashboard
            </Link>
            <Link href="/owner/users" className="px-4 py-3 text-slate-400 hover:bg-slate-900 hover:text-white rounded-2xl flex items-center gap-3 transition-all group">
              <Users className="w-5 h-5 group-hover:scale-110 transition-transform" /> Management
            </Link>
          </nav>

          {/* Settings Category Navigation */}
          <nav className="flex flex-col gap-2">
            <span className="px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">System Config</span>
            <button 
              onClick={() => setActiveCategory("payment")}
              className={`px-4 py-3 rounded-2xl flex items-center gap-3 transition-all ${activeCategory === "payment" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-900"}`}
            >
              <CreditCard className="w-5 h-5" /> Payment Gateway
            </button>
            <button 
              onClick={() => setActiveCategory("smtp")}
              className={`px-4 py-3 rounded-2xl flex items-center gap-3 transition-all ${activeCategory === "smtp" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-900"}`}
            >
              <Mail className="w-5 h-5" /> SMTP System
            </button>
            <button 
              onClick={() => setActiveCategory("plans")}
              className={`px-4 py-3 rounded-2xl flex items-center gap-3 transition-all ${activeCategory === "plans" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-900"}`}
            >
              <Zap className="w-5 h-5" /> Plans & Pricing
            </button>
            <button 
              onClick={() => setActiveCategory("general")}
              className={`px-4 py-3 rounded-2xl flex items-center gap-3 transition-all ${activeCategory === "general" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-900"}`}
            >
              <Globe className="w-5 h-5" /> Platform Info
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
            <Link href="/owner/dashboard" className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl text-slate-400 transition-all border border-slate-800">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-white capitalize">{activeCategory.replace("-", " ")} Settings</h1>
              <p className="text-sm text-slate-500 font-medium">Manage platform parameters and system connectivity.</p>
            </div>
          </div>
        </header>

        <div className="p-10 max-w-6xl mx-auto pb-32">
          <AnimatePresence mode="wait">
            {/* PAYMENT GATEWAY CATEGORY */}
            {activeCategory === "payment" && (
              <motion.div key="payment" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-10">
                {/* PG Provider Selector */}
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
                      <span className={`text-sm font-black uppercase tracking-widest ${activePG === p ? "text-white" : "text-slate-500"}`}>{p}</span>
                      
                      {pgStatus?.providers?.[p]?.isActiveForTransaction && (
                        <div className="absolute top-4 left-4 bg-emerald-500 border border-emerald-400 px-3 py-1 rounded-full flex items-center gap-2 shadow-xl shadow-emerald-500/20">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          <span className="text-[10px] font-black uppercase tracking-tighter text-white">DEFAULT</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* PG Config Form */}
                <div className="bg-slate-900 border border-slate-800 rounded-[48px] overflow-hidden shadow-2xl shadow-black/40">
                  <div className="p-10 border-b border-slate-800 flex justify-between items-center bg-slate-950/40 backdrop-blur-sm">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center text-indigo-400 font-black text-2xl uppercase italic border border-slate-700">
                        {activePG.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-2xl font-black capitalize text-white">{activePG} Integration</h3>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className={`w-2 h-2 rounded-full ${pgStatus?.providers?.[activePG]?.status === 'active' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`} />
                          <span className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400">
                            {pgStatus?.providers?.[activePG]?.status === 'active' ? 'Connectivity Active' : 'Disconnected'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {pgStatus?.providers?.[activePG]?.status === 'active' && !pgStatus?.providers?.[activePG]?.isActiveForTransaction && (
                      <button 
                        onClick={() => handleSetDefaultPG(activePG)}
                        className="px-6 py-3 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Set as Default for Transactions
                      </button>
                    )}
                    
                    {pgStatus?.providers?.[activePG]?.isActiveForTransaction && (
                      <div className="px-6 py-3 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/20">
                        <CheckCircle2 className="w-4 h-4" /> Active Transaction Gateway
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSavePGConfig} className="p-12 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {activePG === "midtrans" && (
                        <>
                          <div className="space-y-4">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">Server Key</label>
                            <input 
                              type="password"
                              className="w-full bg-slate-950 border border-slate-800 rounded-[24px] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono text-sm"
                              value={pgConfigs.midtrans.serverKey}
                              onChange={(e) => setPgConfigs({ ...pgConfigs, midtrans: { ...pgConfigs.midtrans, serverKey: e.target.value } })}
                            />
                          </div>
                          <div className="space-y-4">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">Client Key</label>
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
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">Secret Key</label>
                            <input 
                              type="password"
                              className="w-full bg-slate-950 border border-slate-800 rounded-[24px] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono text-sm"
                              value={pgConfigs.xendit.secretKey}
                              onChange={(e) => setPgConfigs({ ...pgConfigs, xendit: { ...pgConfigs.xendit, secretKey: e.target.value } })}
                            />
                          </div>
                          <div className="space-y-4">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">Public Key</label>
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
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">API Key</label>
                            <input 
                              type="password"
                              className="w-full bg-slate-950 border border-slate-800 rounded-[24px] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono text-sm"
                              value={pgConfigs.louvin.apiKey}
                              onChange={(e) => setPgConfigs({ ...pgConfigs, louvin: { ...pgConfigs.louvin, apiKey: e.target.value } })}
                              placeholder="Masukkan API Key Louvin"
                            />
                          </div>
                          <div className="space-y-4">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">Louvin Slug</label>
                            <input 
                              type="text"
                              className="w-full bg-slate-950 border border-slate-800 rounded-[24px] px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono text-sm"
                              value={pgConfigs.louvin.slug}
                              onChange={(e) => setPgConfigs({ ...pgConfigs, louvin: { ...pgConfigs.louvin, slug: e.target.value } })}
                              placeholder="Masukkan Slug Louvin (Contoh: sekolah-ku)"
                            />
                          </div>
                          <div className="space-y-4 md:col-span-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-1">Base Endpoint (Louvin API)</label>
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
                        Kredensial disimpan secara terenkripsi di server pusat.
                      </div>
                      <button 
                        type="submit"
                        disabled={isSaving}
                        className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center gap-3 shadow-xl shadow-indigo-600/30 group active:scale-95"
                      >
                        {isSaving ? (
                          <RefreshCcw className="w-5 h-5 animate-spin" />
                        ) : (
                          <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        )}
                        Test & Activate {activePG.toUpperCase()}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* SMTP CATEGORY */}
            {activeCategory === "smtp" && (
              <motion.div key="smtp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-3xl mx-auto">
                <div className="bg-slate-900 border border-slate-800 rounded-[48px] overflow-hidden shadow-2xl">
                  <div className="p-12 border-b border-slate-800 bg-slate-950/40 text-center">
                    <div className="w-20 h-20 bg-indigo-600 rounded-[32px] mx-auto mb-6 flex items-center justify-center text-white shadow-2xl shadow-indigo-600/30">
                      <Mail className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-black text-white">System Email Config</h2>
                    <p className="text-slate-500 mt-2 font-medium">Gunakan akun Gmail untuk mengirim email platform (OTP, Invoice, dsb).</p>
                    
                    {smtpStatus?.active && (
                      <div className="mt-6 inline-flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 px-6 py-2 rounded-full">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">System SMTP Active: {smtpStatus.email}</span>
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleSaveSmtpConfig} className="p-12 space-y-8">
                    <div className="space-y-6">
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-2">Gmail Address</label>
                        <input 
                          type="email"
                          placeholder="platform@gmail.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-3xl px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-medium"
                          value={smtpConfig.gmail}
                          onChange={(e) => setSmtpConfig({ ...smtpConfig, gmail: e.target.value })}
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-500 px-2">Gmail App Password</label>
                        <div className="relative">
                          <input 
                            type="password"
                            placeholder="xxxx xxxx xxxx xxxx"
                            className="w-full bg-slate-950 border border-slate-800 rounded-3xl px-8 py-5 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono"
                            value={smtpConfig.appPassword}
                            onChange={(e) => setSmtpConfig({ ...smtpConfig, appPassword: e.target.value })}
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600">
                            <Lock className="w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-8 bg-indigo-600/5 rounded-3xl border border-indigo-500/10 space-y-4 mb-8">
                      <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Quick Tutorial
                      </h4>
                      <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside font-medium leading-relaxed">
                        <li>Aktifkan 2FA di Akun Google platform.</li>
                        <li>Buka menu Security &gt; Apps Password.</li>
                        <li>Pilih 'Other' dan namai 'AppSekolah'.</li>
                        <li>Salin kode 16 digit ke form di atas.</li>
                      </ol>
                    </div>

                    <button 
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-3xl transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 group"
                    >
                      {isSaving ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                      Verify & Save SMTP Configuration
                    </button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* PLANS CATEGORY */}
            {activeCategory === "plans" && (
              <motion.div key="plans" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                
                {/* Global Features Repository */}
                <div className="bg-slate-900 border border-slate-800 rounded-[48px] overflow-hidden shadow-2xl">
                  <div className="p-8 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-600/20 rounded-2xl text-indigo-400">
                        <Database className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Global Service Repository</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Daftar pusat semua layanan yang tersedia di platform.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <input 
                        type="text"
                        placeholder="Tambah layanan baru..."
                        className="bg-slate-950 border border-slate-800 rounded-2xl px-6 py-3 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all w-64"
                        value={newGlobalFeature}
                        onChange={(e) => setNewGlobalFeature(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newGlobalFeature.trim()) {
                            handleUpdateGlobalFeatures([...globalFeatures, newGlobalFeature.trim()]);
                            setNewGlobalFeature("");
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          if (newGlobalFeature.trim()) {
                            handleUpdateGlobalFeatures([...globalFeatures, newGlobalFeature.trim()]);
                            setNewGlobalFeature("");
                          }
                        }}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all text-[10px] uppercase tracking-widest"
                      >
                        Add Item
                      </button>
                    </div>
                  </div>
                  <div className="p-10 flex flex-wrap gap-3">
                    {globalFeatures.length === 0 && (
                      <div className="w-full py-10 text-center text-slate-600 text-xs font-medium italic">
                        Belum ada layanan yang didaftarkan. Tambahkan satu di atas.
                      </div>
                    )}
                    {globalFeatures.map((f, idx) => (
                      <div key={idx} className="bg-slate-950 border border-slate-800 px-5 py-3 rounded-2xl flex items-center gap-4 group hover:border-slate-700 transition-all">
                        <span className="text-xs text-slate-300 font-medium">{f}</span>
                        <button 
                          onClick={() => {
                            const newF = globalFeatures.filter((_, i) => i !== idx);
                            handleUpdateGlobalFeatures(newF);
                          }}
                          className="text-slate-600 hover:text-red-400 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {(["starter", "standard", "enterprise"] as const).map((planId) => (
                    <div key={planId} className="bg-slate-900 border border-slate-800 rounded-[48px] overflow-hidden flex flex-col shadow-2xl relative">
                      <div className="p-10 border-b border-slate-800 bg-slate-950/40">
                        <div className="flex justify-between items-start mb-6">
                          <div className={`p-4 rounded-3xl ${planId === 'enterprise' ? 'bg-indigo-600 shadow-xl shadow-indigo-600/30' : 'bg-slate-800'} text-white uppercase italic font-black text-xs tracking-widest`}>
                            {planId}
                          </div>
                        </div>
                        <div className="space-y-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Biaya per Siswa / Bulan (IDR)</label>
                            <input 
                              type="number"
                              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-bold"
                              value={planConfigs[planId].priceMonthly}
                              onChange={(e) => setPlanConfigs({ 
                                ...planConfigs, 
                                [planId]: { ...planConfigs[planId], priceMonthly: parseInt(e.target.value) || 0 } 
                              })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Diskon Tahunan (%)</label>
                            <input 
                              type="number"
                              className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-bold"
                              value={planConfigs[planId].annualDiscount}
                              onChange={(e) => setPlanConfigs({ 
                                ...planConfigs, 
                                [planId]: { ...planConfigs[planId], annualDiscount: parseInt(e.target.value) || 0 } 
                              })}
                            />
                          </div>
                          
                          {/* Simulation Preview */}
                          <div className="p-5 bg-indigo-600/5 rounded-3xl border border-indigo-500/10 space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                              <span className="text-slate-500">Simulasi (100 Siswa)</span>
                              <span className="text-indigo-400">Preview</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-400">Per Bulan:</span>
                              <span className="text-white">Rp {(Number(planConfigs[planId].priceMonthly) * 100).toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-xs font-bold">
                              <span className="text-slate-400">Per Tahun (-{planConfigs[planId].annualDiscount}%):</span>
                              <span className="text-emerald-400">Rp {(Number(planConfigs[planId].priceMonthly) * 12 * 100 * (1 - Number(planConfigs[planId].annualDiscount)/100)).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-10 flex-1 flex flex-col gap-6">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Assigned Services</label>
                          <div className="space-y-3">
                            {planConfigs[planId].features.map((feature: string, idx: number) => (
                              <div key={idx} className="bg-slate-950 border border-slate-800 px-5 py-4 rounded-2xl flex items-center justify-between group">
                                <span className="text-xs text-white font-medium">{feature}</span>
                                <button 
                                  onClick={() => {
                                    const newFeatures = planConfigs[planId].features.filter((_: any, i: number) => i !== idx);
                                    setPlanConfigs({ ...planConfigs, [planId]: { ...planConfigs[planId], features: newFeatures } });
                                  }}
                                  className="text-slate-600 hover:text-red-400 transition-colors"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </div>
                            ))}
                            
                            {/* Feature Selector Dropdown */}
                            <div className="pt-4">
                              <select 
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-xs text-slate-400 focus:outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer hover:bg-slate-900 [&>option]:bg-slate-950"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val && !planConfigs[planId].features.includes(val)) {
                                    setPlanConfigs({ 
                                      ...planConfigs, 
                                      [planId]: { ...planConfigs[planId], features: [...planConfigs[planId].features, val] } 
                                    });
                                  }
                                  e.target.value = ""; // Reset
                                }}
                              >
                                <option value="" className="bg-slate-950">+ Assign Service Item</option>
                                {globalFeatures
                                  .filter(f => !planConfigs[planId].features.includes(f))
                                  .map((f, idx) => (
                                    <option key={idx} value={f} className="bg-slate-950">
                                      {f}
                                    </option>
                                  ))
                                }
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto pt-10 border-t border-slate-800/50">
                          <button 
                            onClick={() => handleSavePlan(planId)}
                            disabled={isSaving}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-600/30 group"
                          >
                            {isSaving ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                            Update Plan
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-[32px] p-8 flex gap-6 items-start">
                  <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-600/20">
                    <Database className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white mb-1">Landing Page Integration</h4>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-2xl">
                      Perubahan pada harga dan fitur di atas akan langsung tercermin pada halaman Pricing di landing page utama. Pastikan item fitur ditulis secara ringkas dan informatif bagi calon pelanggan.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PLACEHOLDER FOR OTHER CATEGORIES */}
            {activeCategory === "general" && (
              <motion.div key="general" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-40">
                <Globe className="w-20 h-20 text-slate-800 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-slate-700 uppercase tracking-widest transition-all">Coming Soon</h2>
                <p className="text-slate-600 mt-2">Platform branding, logo, and metadata settings.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
