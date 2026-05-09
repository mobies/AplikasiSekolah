"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  School, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  LogOut,
  LayoutDashboard,
  Settings,
  Bell,
  AlertCircle,
  Trash2,
  GraduationCap,
  BookOpen
} from "lucide-react";
import { auth, functions, rtdb } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { ref, onValue, Unsubscribe } from "firebase/database";
import Swal from "sweetalert2";
import Link from "next/link";

export default function OwnerDashboard() {
  const [schools, setSchools] = useState<any[]>([]);
  const [ownerData, setOwnerData] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "active" | "inactive">("pending");
  const [planConfig, setPlanConfig] = useState<any>(null);
  const [summaries, setSummaries] = useState<any>({});
  const router = useRouter();
  
  const unsubsRef = useRef<{ [key: string]: Unsubscribe | null }>({
    auth: null,
    registers: null,
    plans: null
  });

  useEffect(() => {
    console.log("OwnerDashboard: Initializing...");
    
    // 1. Verify Owner Session
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        console.log("OwnerDashboard: No user found, redirecting to login");
        router.push("/login");
        return;
      }

      try {
        console.log("OwnerDashboard: Verifying owner role...");
        const checkRoleFn = httpsCallable(functions, "checkUserRole");
        const result = await checkRoleFn({});
        const { role, data } = result.data as any;

        if (role !== "owner") {
          console.warn("OwnerDashboard: Not an owner, role:", role);
          router.push("/login");
          return;
        }
        
        console.log("OwnerDashboard: Owner verified");
        setOwnerData(data);
        setIsAuthLoading(false);
      } catch (error) {
        console.error("OwnerDashboard: Session Verification Error:", error);
        router.push("/login");
      }
    });

    // 2. Fetch All Registrations (Real-time dari /registers sebagai pusat data pendaftaran)
    const registersRef = ref(rtdb, "registers");
    const unsubscribeRegisters = onValue(registersRef, (snapshot) => {
      console.log("OwnerDashboard: Registers data received");
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Flatten data dari {uid: {npsn: data}} menjadi array
        const allRegs: any[] = [];
        Object.entries(data).forEach(([uid, userSchools]: [string, any]) => {
          Object.entries(userSchools).forEach(([npsn, regData]: [string, any]) => {
            allRegs.push({
              id: npsn,
              registrantUid: uid,
              name: regData.schoolName, // Mapping untuk kompatibilitas UI
              address: regData.schoolAddress, // Mapping untuk kompatibilitas UI
              ...regData
            });
          });
        });
        setSchools(allRegs);
      } else {
        setSchools([]);
      }
      setIsDataLoading(false);
    }, (error) => {
      console.error("OwnerDashboard: Registers Read Error:", error);
      setIsDataLoading(false);
    });

    // 3. Fetch Plan Config
    const plansRef = ref(rtdb, "system/config/plans");
    const unsubscribePlans = onValue(plansRef, (snap) => {
      if (snap.exists()) setPlanConfig(snap.val());
    }, (error) => {
      console.error("OwnerDashboard: Plans Read Error:", error);
    });

    // 4. Fetch All School Summaries (Global Stats)
    const summariesRef = ref(rtdb, "schools/summary");
    const unsubscribeSummaries = onValue(summariesRef, (snap) => {
      if (snap.exists()) setSummaries(snap.val());
    }, (error) => {
      console.error("OwnerDashboard: Summaries Read Error:", error);
    });

    unsubsRef.current.auth = unsubscribeAuth;
    unsubsRef.current.registers = unsubscribeRegisters;
    unsubsRef.current.plans = unsubscribePlans;
    unsubsRef.current.summaries = unsubscribeSummaries;

    return () => {
      Object.values(unsubsRef.current).forEach(unsub => unsub && unsub());
    };
  }, [router]);

  const isLoading = isAuthLoading || isDataLoading;

  // Calculate Stats
  const pendingSchools = schools.filter(s => s.status === "pending_approval");
  const activeSchools = schools.filter(s => s.status === "active");
  const inactiveSchools = schools.filter(s => s.status === "inactive");

  const handleApprove = async (schoolId: string) => {
    const isAlreadyActive = schools.find(s => s.id === schoolId)?.status === "active";
    
    const confirmResult = await Swal.fire({
      title: isAlreadyActive ? "Sync / Re-approve?" : "Approve Sekolah?",
      text: isAlreadyActive 
        ? `Sekolah ini sudah aktif. Re-approve akan mensinkronkan ulang data Firestore & RTDB serta mengirim ulang email login.`
        : `Apakah Anda yakin ingin menyetujui sekolah dengan NPSN ${schoolId}?`,
      icon: isAlreadyActive ? "info" : "question",
      showCancelButton: true,
      confirmButtonColor: "#4f46e5",
      cancelButtonColor: "#64748b",
      confirmButtonText: isAlreadyActive ? "Ya, Sync Sekarang" : "Ya, Approve Sekarang!",
      cancelButtonText: "Batal",
      background: "#0f172a",
      color: "#f1f5f9",
    });

    if (!confirmResult.isConfirmed) return;

    Swal.fire({
      title: "Sedang Memproses...",
      text: "Mohon tunggu sebentar",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
      background: "#0f172a",
      color: "#f1f5f9",
    });

    try {
      const approveFn = httpsCallable(functions, "approveSchool");
      const result = await approveFn({ npsn: schoolId });
      const { success, message } = result.data as any;

      if (success) {
        Swal.fire({
          title: "Berhasil!",
          text: message,
          icon: "success",
          background: "#0f172a",
          color: "#f1f5f9",
          confirmButtonColor: "#4f46e5",
        });
      }
    } catch (error: any) {
      console.error("Approval Error:", error);
      Swal.fire({
        title: "Gagal!",
        text: error.message || "Gagal menyetujui sekolah.",
        icon: "error",
        background: "#0f172a",
        color: "#f1f5f9",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  const handleDeactivate = async (schoolId: string) => {
    const confirmResult = await Swal.fire({
      title: "Nonaktifkan Sekolah?",
      text: `Sekolah ${schoolId} tidak akan bisa login sampai diaktifkan kembali.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Nonaktifkan",
      background: "#0f172a",
      color: "#f1f5f9",
    });

    if (!confirmResult.isConfirmed) return;

    Swal.fire({
      title: "Menonaktifkan...",
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); },
      background: "#0f172a",
      color: "#f1f5f9",
    });

    try {
      const deactivateFn = httpsCallable(functions, "deactivateSchool");
      await deactivateFn({ npsn: schoolId });
      Swal.fire({ title: "Berhasil", text: "Sekolah telah dinonaktifkan.", icon: "success", background: "#0f172a", color: "#f1f5f9" });
    } catch (error: any) {
      Swal.fire({ title: "Gagal", text: error.message, icon: "error", background: "#0f172a", color: "#f1f5f9" });
    }
  };

  const handleDeletePermanently = async (schoolId: string) => {
    const { value: confirmNpsn } = await Swal.fire({
      title: "Hapus Permanen?",
      text: `PERINGATAN: Seluruh data sekolah ${schoolId} akan dihapus selamanya. Ketik NPSN untuk konfirmasi:`,
      input: "text",
      inputPlaceholder: "Ketik NPSN di sini",
      icon: "error",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "HAPUS SELAMANYA",
      background: "#0f172a",
      color: "#f1f5f9",
    });

    if (confirmNpsn === schoolId) {
      Swal.fire({
        title: "Menghapus...",
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); },
        background: "#0f172a",
        color: "#f1f5f9",
      });

      try {
        const deleteFn = httpsCallable(functions, "deleteSchoolPermanently");
        await deleteFn({ npsn: schoolId });
        Swal.fire({ title: "Terhapus", text: "Data telah dihapus permanen.", icon: "success", background: "#0f172a", color: "#f1f5f9" });
      } catch (error: any) {
        Swal.fire({ title: "Gagal", text: error.message, icon: "error", background: "#0f172a", color: "#f1f5f9" });
      }
    } else if (confirmNpsn) {
      Swal.fire({ title: "Verifikasi Gagal", text: "NPSN tidak cocok.", icon: "error", background: "#0f172a", color: "#f1f5f9" });
    }
  };
 
  const handleReject = async (schoolId: string) => {
    const { value: reason } = await Swal.fire({
      title: "Tolak Pendaftaran?",
      text: "Berikan alasan penolakan untuk admin sekolah:",
      input: "textarea",
      inputPlaceholder: "Contoh: Dokumen tidak lengkap atau NPSN tidak valid.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Tolak Sekarang",
      cancelButtonText: "Batal",
      background: "#0f172a",
      color: "#f1f5f9",
    });

    if (!reason) return;

    Swal.fire({
      title: "Menolak...",
      allowOutsideClick: false,
      didOpen: () => { Swal.showLoading(); },
      background: "#0f172a",
      color: "#f1f5f9",
    });

    try {
      const rejectFn = httpsCallable(functions, "rejectSchool");
      await rejectFn({ npsn: schoolId, reason });
      Swal.fire({ title: "Ditolak", text: "Pendaftaran telah ditolak dan email notifikasi dikirim.", icon: "success", background: "#0f172a", color: "#f1f5f9" });
    } catch (error: any) {
      Swal.fire({ title: "Gagal", text: error.message, icon: "error", background: "#0f172a", color: "#f1f5f9" });
    }
  };

  const handleManageSubscription = async (school: any) => {
    const { value: formValues } = await Swal.fire({
      title: `Kelola Layanan: ${school.name}`,
      html: `
        <div class="text-left space-y-4">
          <div>
            <label class="text-xs text-slate-400 block mb-1">Pilih Jenis Layanan</label>
            <select id="swal-plan" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white">
              <option value="starter" ${school.plan === 'starter' ? 'selected' : ''}>Starter (Dasar)</option>
              <option value="standard" ${school.plan === 'standard' ? 'selected' : ''}>Standard (Starter++)</option>
              <option value="premium" ${school.plan === 'premium' ? 'selected' : ''}>Premium (Standard++)</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Tambah Masa Aktif (Bulan)</label>
            <input id="swal-months" type="number" value="0" min="0" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white" />
          </div>
          <div>
            <label class="text-xs text-slate-400 block mb-1">Status Langganan</label>
            <select id="swal-plan-status" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white">
              <option value="active" ${school.planStatus === 'active' ? 'selected' : ''}>Aktif</option>
              <option value="deactivated" ${school.planStatus === 'deactivated' ? 'selected' : ''}>Blokir Akses</option>
            </select>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Simpan Perubahan",
      background: "#0f172a",
      color: "#f1f5f9",
      preConfirm: () => {
        return {
          plan: (document.getElementById('swal-plan') as HTMLSelectElement).value,
          monthsToAdd: parseInt((document.getElementById('swal-months') as HTMLInputElement).value),
          planStatus: (document.getElementById('swal-plan-status') as HTMLSelectElement).value
        };
      }
    });

    if (formValues) {
      Swal.fire({ title: "Memproses...", allowOutsideClick: false, didOpen: () => Swal.showLoading(), background: "#0f172a", color: "#f1f5f9" });
      try {
        const updateFn = httpsCallable(functions, "updateSchoolSubscription");
        await updateFn({ npsn: school.id, ...formValues });
        Swal.fire({ title: "Berhasil!", text: "Data langganan sekolah telah diperbarui.", icon: "success", background: "#0f172a", color: "#f1f5f9" });
      } catch (err: any) {
        Swal.fire({ title: "Gagal", text: err.message, icon: "error", background: "#0f172a", color: "#f1f5f9" });
      }
    }
  };

  const handleActivate = async (schoolId: string) => {
    const confirmResult = await Swal.fire({
      title: "Aktifkan Sekolah?",
      text: `Apakah Anda yakin ingin mengaktifkan kembali sekolah dengan NPSN ${schoolId}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Aktifkan!",
      cancelButtonText: "Batal",
      background: "#0f172a",
      color: "#f1f5f9",
    });

    if (!confirmResult.isConfirmed) return;

    Swal.fire({
      title: "Memproses...",
      text: "Sedang mengaktifkan sekolah",
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      },
      background: "#0f172a",
      color: "#f1f5f9",
    });

    try {
      const activateFn = httpsCallable(functions, "activateSchool");
      await activateFn({ npsn: schoolId });
      Swal.fire({ title: "Berhasil!", text: "Sekolah telah diaktifkan kembali.", icon: "success", background: "#0f172a", color: "#f1f5f9" });
    } catch (err: any) {
      Swal.fire({ title: "Gagal", text: err.message, icon: "error", background: "#0f172a", color: "#f1f5f9" });
    }
  };

  const handleLogout = async () => {
    Object.values(unsubsRef.current).forEach(unsub => unsub && unsub());
    await signOut(auth);
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-indigo-500 animate-pulse font-bold flex flex-col items-center gap-3">
          <School className="w-10 h-10" />
          Memuat Dashboard Owner...
        </div>
      </div>
    );
  }

  const displaySchools = 
    activeTab === "pending" ? pendingSchools : 
    activeTab === "active" ? activeSchools : 
    inactiveSchools;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col gap-8 hidden md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <School className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Owner Panel</span>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <div className="px-3 py-2 bg-indigo-600/10 text-indigo-400 rounded-xl flex items-center gap-3">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </div>
          <Link href="/owner/users" className="px-3 py-2 text-slate-500 hover:bg-slate-900 rounded-xl flex items-center gap-3 transition-colors cursor-pointer">
            <Users className="w-5 h-5" /> Pengguna
          </Link>
          <Link href="/owner/settings" className="px-3 py-2 text-slate-500 hover:bg-slate-900 rounded-xl flex items-center gap-3 transition-colors cursor-pointer">
            <Settings className="w-5 h-5" /> Pengaturan
          </Link>
        </nav>

        <button 
          onClick={handleLogout}
          className="px-3 py-2 text-slate-500 hover:text-red-400 flex items-center gap-3 transition-colors mt-auto group"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Keluar
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-widest text-[10px]">Administrator</h2>
            <h1 className="text-xl font-bold">{ownerData?.nama}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Cari sekolah..." 
                className="bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors w-64 shadow-inner"
              />
            </div>
            <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 relative cursor-pointer hover:bg-slate-800 transition-colors">
              <Bell className="w-5 h-5 text-slate-400" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-900"></span>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <motion.div whileHover={{ y: -5 }} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl shadow-black/20">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
                  <Clock className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-amber-500 px-2 py-1 bg-amber-500/10 rounded-full">Pending</span>
              </div>
              <h3 className="text-3xl font-bold mb-1">{pendingSchools.length}</h3>
              <p className="text-slate-500 text-sm font-medium">Menunggu Approval</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl shadow-black/20">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-2xl">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-emerald-500 px-2 py-1 bg-emerald-500/10 rounded-full">Aktif</span>
              </div>
              <h3 className="text-3xl font-bold mb-1">{activeSchools.length}</h3>
              <p className="text-slate-500 text-sm font-medium">Total Sekolah Aktif</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-xl shadow-black/20">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-red-500 px-2 py-1 bg-red-500/10 rounded-full">Arsip</span>
              </div>
              <h3 className="text-3xl font-bold mb-1">{inactiveSchools.length}</h3>
              <p className="text-slate-500 text-sm font-medium">Sekolah Non-Aktif</p>
            </motion.div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
            <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="font-bold text-lg">Manajemen Registrasi Sekolah</h3>
                <p className="text-xs text-slate-500">Kelola dan pantau status onboarding sekolah</p>
              </div>
              <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1">
                <button onClick={() => setActiveTab("pending")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "pending" ? "bg-amber-500/20 text-amber-500 shadow-lg shadow-amber-500/10" : "text-slate-500"}`}>Pending ({pendingSchools.length})</button>
                <button onClick={() => setActiveTab("active")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "active" ? "bg-emerald-500/20 text-emerald-500 shadow-lg shadow-emerald-500/10" : "text-slate-500"}`}>Aktif ({activeSchools.length})</button>
                <button onClick={() => setActiveTab("inactive")} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === "inactive" ? "bg-red-500/20 text-red-500 shadow-lg shadow-red-500/10" : "text-slate-500"}`}>Non-Aktif ({inactiveSchools.length})</button>
              </div>
            </div>
            
            {displaySchools.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                <XCircle className="w-12 h-12 text-slate-800" />
                <p className="text-slate-500 italic">Tidak ada data sekolah di kategori ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] border-b border-slate-800 bg-slate-950/30">
                      <th className="px-6 py-4">NPSN / Nama Sekolah</th>
                      <th className="px-6 py-4">Admin / Email</th>
                      <th className="px-6 py-4">Populasi (Summary)</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {displaySchools.map((school) => (
                      <motion.tr layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={school.id} className="hover:bg-slate-800/30 transition-all group">
                        <td className="px-6 py-5">
                          <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">{school.id}</div>
                          <div className="text-sm text-slate-400">{school.name}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-medium text-white">{school.nama || school.adminName || school.adminInfo?.name}</div>
                          <div className="text-[11px] text-slate-500">{school.email || school.adminEmail || school.adminInfo?.email}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            {(() => {
                              const s = summaries[school.id] || {};
                              return (
                                <>
                                  <div className="flex flex-col items-center p-2 bg-slate-950/50 rounded-lg min-w-[50px] border border-slate-800/50">
                                    <Users className="w-3 h-3 text-indigo-400 mb-1" />
                                    <span className="text-[10px] font-black text-white">{s.totalStudents || 0}</span>
                                  </div>
                                  <div className="flex flex-col items-center p-2 bg-slate-950/50 rounded-lg min-w-[50px] border border-slate-800/50">
                                    <GraduationCap className="w-3 h-3 text-emerald-400 mb-1" />
                                    <span className="text-[10px] font-black text-white">{s.totalTeachers || 0}</span>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${school.status === "active" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : school.status === "inactive" ? "bg-red-500/10 text-red-500 border-red-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${school.status === "active" ? "bg-emerald-500 animate-pulse" : school.status === "inactive" ? "bg-red-500" : "bg-amber-500"}`} />
                            {school.status === "active" ? "Aktif" : school.status === "inactive" ? "Non-Aktif" : "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            {school.status === "pending_approval" && (
                              <>
                                <button onClick={() => handleApprove(school.id)} className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all" title="Approve"><CheckCircle className="w-5 h-5" /></button>
                                <button onClick={() => handleReject(school.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all" title="Tolak"><XCircle className="w-5 h-5" /></button>
                              </>
                            )}
                            {school.status === "active" && (
                              <div className="flex justify-end gap-2">
                                <div className="text-right mr-4 hidden lg:block">
                                  <p className="text-[10px] text-slate-500 uppercase tracking-tighter">Plan / Expire</p>
                                  <p className="text-xs font-bold text-indigo-400">
                                    {school.plan?.toUpperCase()} 
                                    <span className="text-slate-500 font-normal mx-1">|</span> 
                                    {school.expireAt ? new Date(school.expireAt).toLocaleDateString('id-ID') : '-'}
                                  </p>
                                </div>
                                <button onClick={() => handleApprove(school.id)} className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all" title="Re-approve / Sync"><Clock className="w-5 h-5" /></button>
                                <button onClick={() => handleManageSubscription(school)} className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-xl transition-all" title="Kelola Layanan"><Settings className="w-5 h-5" /></button>
                                <button onClick={() => handleDeactivate(school.id)} className="p-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white rounded-xl transition-all" title="Nonaktifkan"><AlertCircle className="w-5 h-5" /></button>
                              </div>
                            )}
                            {school.status === "inactive" && (
                              <button onClick={() => handleActivate(school.id)} className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-all" title="Aktifkan Kembali"><CheckCircle className="w-5 h-5" /></button>
                            )}
                            {school.status !== "active" && (
                              <button onClick={() => handleDeletePermanently(school.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all" title="Hapus Permanen"><Trash2 className="w-5 h-5" /></button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
