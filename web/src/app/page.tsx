"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  School,
  ShieldCheck,
  Users,
  CreditCard,
  LayoutDashboard,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Cpu,
  ShoppingBag,
  Smartphone,
  Wallet,
  Zap,
  TrendingUp,
  UserPlus
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/lib/firebase";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const [user, setUser] = useState<any>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [planConfigs, setPlanConfigs] = useState<any>(null);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [studentCount, setStudentCount] = useState(100);

  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((u) => {
      setUser(u);
      setIsCheckingSession(false);
    });
    fetchPlans();
    return () => unsubscribe();
  }, []);

  const fetchPlans = async () => {
    try {
      const getPlansFn = httpsCallable(functions, "getPlanConfigs");
      const result = await getPlansFn({});
      setPlanConfigs(result.data);
    } catch (error) {
      console.error("Fetch Plans Error:", error);
    }
  };

  const handleLoginClick = async () => {
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const checkRoleFn = httpsCallable(functions, "checkUserRole");
      const result = await checkRoleFn();
      const { role, npsn, status } = result.data as any;

      if (role === "owner") router.push("/owner/dashboard");
      else if (role === "school_admin" && npsn) router.push(`/school/${npsn}/dashboard`);
      else router.push("/login");
    } catch (error) {
      router.push("/login");
    }
  };

  const calculatePrice = (planId: string) => {
    if (!planConfigs || !planConfigs[planId]) return 0;

    // Pastikan semua input adalah angka untuk menghindari kesalahan hitung
    const pricePerStudent = Number(planConfigs[planId].priceMonthly) || 0;
    const discountPercent = Number(planConfigs[planId].annualDiscount) || 0;
    const currentStudents = Number(studentCount) || 0;

    if (billingCycle === "monthly") {
      // Hitungan Bulanan: Harga per siswa * Jumlah Siswa
      return pricePerStudent * currentStudents;
    } else {
      // Hitungan Tahunan: (Harga per siswa * 12 bulan * Jumlah Siswa) - Diskon
      const annualTotalBase = pricePerStudent * 12 * currentStudents;
      const discountAmount = (annualTotalBase * discountPercent) / 100;
      return annualTotalBase - discountAmount;
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-indigo-100 font-sans">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
                <School className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Aplikasi Sekolah
              </span>
            </div>
            <div className="hidden md:flex items-center gap-10 text-sm font-semibold text-slate-500">
              <a href="#features" className="hover:text-indigo-600 transition-colors">Fasilitas</a>
              <a href="#pricing" className="hover:text-indigo-600 transition-colors">Harga</a>
              <button onClick={handleLoginClick} disabled={isCheckingSession} className="hover:text-indigo-600 transition-colors">Login</button>
              <Link href="/register" className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full transition-all flex items-center gap-2">
                Mulai Sekarang <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden bg-slate-50/50">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 text-indigo-700 text-sm font-bold mb-8">
              <Zap className="w-4 h-4 fill-indigo-600" />
              <span>Sistem Manajemen Sekolah Level Pro</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-8 leading-[1.1]">
              Kelola Sekolah Anda <br />
              <span className="text-indigo-600">Lebih Cerdas & Modern</span>
            </motion.h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 mb-12">Platform SaaS terintegrasi untuk efisiensi operasional dan transparansi keuangan sekolah.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-5">
              <Link href="/register" className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-100">
                Daftarkan Sekolah Anda <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section with Simulation */}
      <section id="pricing" className="py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6">Investasi Berdasarkan Skala Sekolah</h2>
            <p className="text-slate-500 text-lg">Biaya yang adil dan transparan, dihitung berdasarkan jumlah siswa Anda.</p>
          </div>

          {/* SIMULATION CONTROLS */}
          <div className="max-w-3xl mx-auto mb-20 bg-white p-8 rounded-[40px] shadow-2xl shadow-indigo-100 border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-slate-900">
                  <UserPlus className="w-6 h-6 text-indigo-600" />
                  <span className="font-bold">Estimasi Jumlah Siswa</span>
                </div>
                <div className="flex items-center gap-6">
                  <input
                    type="range"
                    min="10"
                    max="2000"
                    step="10"
                    className="flex-1 accent-indigo-600"
                    value={studentCount}
                    onChange={(e) => setStudentCount(parseInt(e.target.value))}
                  />
                  <div className="bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100 font-black text-indigo-600 min-w-[120px] text-center">
                    {studentCount} Siswa
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 text-slate-900">
                  <TrendingUp className="w-6 h-6 text-indigo-600" />
                  <span className="font-bold">Siklus Pembayaran</span>
                </div>
                <div className="flex p-1 bg-slate-100 rounded-2xl">
                  <button
                    onClick={() => setBillingCycle("monthly")}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${billingCycle === "monthly" ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100" : "text-slate-500"}`}
                  >
                    Bulanan
                  </button>
                  <button
                    onClick={() => setBillingCycle("annual")}
                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all relative ${billingCycle === "annual" ? "bg-white text-indigo-600 shadow-lg shadow-indigo-100" : "text-slate-500"}`}
                  >
                    Tahunan
                    <span className="absolute -top-3 -right-2 px-2 py-1 bg-emerald-500 text-white text-[8px] font-black uppercase rounded-lg shadow-lg">Save More</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* PRICE CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {planConfigs ? (
              (["starter", "standard", "enterprise"] as const)
                .filter(planId => planConfigs[planId]) // Hanya tampilkan jika data ada
                .map((planId, i) => (
                  <div key={planId} className={`relative p-10 rounded-[48px] flex flex-col transition-all hover:scale-[1.02] ${planId === 'standard' ? 'bg-slate-900 text-white shadow-[0_40px_80px_-20px_rgba(30,41,59,0.3)] z-10' : 'bg-white text-slate-900 border border-slate-100 shadow-xl'}`}>
                    {planId === 'standard' && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 px-6 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-xl">Best Value</div>
                    )}
                    <h3 className="text-xl font-black uppercase tracking-widest mb-2 italic opacity-60">{planId}</h3>
                    <div className="mb-8">
                      <div className="text-4xl font-black mb-1">
                        Rp {calculatePrice(planId).toLocaleString('id-ID')}
                      </div>
                      <div className={`text-xs font-bold ${planId === 'standard' ? 'text-slate-400' : 'text-slate-500'}`}>
                        {billingCycle === 'monthly' ? 'Total per Bulan' : 'Total per Tahun (Sudah Termasuk Diskon)'}
                      </div>
                    </div>

                    <div className={`p-5 rounded-3xl mb-10 ${planId === 'standard' ? 'bg-indigo-600/10 border border-indigo-500/20' : 'bg-slate-50 border border-slate-100'}`}>
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">
                        <span>Rate Dasar</span>
                        <span>/ Siswa</span>
                      </div>
                      <div className="font-bold">Rp {(planConfigs[planId].priceMonthly || 0).toLocaleString('id-ID')}</div>
                    </div>

                    <div className="space-y-5 mb-12 flex-1">
                      {planConfigs[planId].features?.map((f: any, j: number) => (
                        <div key={j} className="flex gap-4 items-start">
                          <CheckCircle2 className={`w-5 h-5 shrink-0 ${planId === 'standard' ? 'text-indigo-400' : 'text-indigo-600'}`} />
                          <span className="text-sm font-medium leading-snug">{f}</span>
                        </div>
                      ))}
                    </div>

                    <Link href="/register" className={`w-full py-5 rounded-2xl font-black transition-all text-center uppercase tracking-widest text-xs ${planId === 'standard' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}>
                      Daftar Sekarang
                    </Link>
                  </div>
                ))
            ) : (
              <div className="col-span-3 py-20 flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">Menyiapkan Paket Terbaik...</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200"><School className="w-5 h-5 text-white" /></div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Aplikasi Sekolah</span>
          </div>
          <div className="text-slate-400 text-sm font-medium">© 2026 Aplikasi Sekolah SaaS. Digunakan oleh ratusan sekolah di Indonesia.</div>
          <div className="flex gap-8 text-slate-500 text-sm font-bold">
            <a href="#" className="hover:text-indigo-600">Terms</a>
            <a href="#" className="hover:text-indigo-600">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
