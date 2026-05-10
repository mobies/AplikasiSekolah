"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  GraduationCap, 
  Wallet, 
  Settings, 
  LogOut, 
  School, 
  Bell, 
  Search,
  Archive,
  CheckCircle2,
  Clock,
  AlertCircle,
  Link as LinkIcon
} from "lucide-react";
import { auth, functions, rtdb } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useRouter, useParams } from "next/navigation";
import { signOut } from "firebase/auth";
import { ref, onValue, Unsubscribe } from "firebase/database";
import SubscriptionGuard from "@/components/SubscriptionGuard";
import Swal from "sweetalert2";

export default function SchoolAdminDashboard() {
  const params = useParams();
  const npsn = params.npsn as string;
  const [schoolData, setSchoolData] = useState<any>(null);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, totalClasses: 0, totalUsers: 0, totalRombel: 0 });
  const router = useRouter();

  // Refs untuk menyimpan unsubs agar bisa dihentikan sebelum logout
  const unsubsRef = useRef<{ [key: string]: Unsubscribe | null }>({
    auth: null,
    school: null,
    stats: null
  });

  // Move handleLogout up
  const handleLogout = async () => {
    Object.values(unsubsRef.current).forEach(unsub => unsub && unsub());
    await signOut(auth);
    router.push("/login");
  };

  useEffect(() => {
    console.log("AdminDashboard: Initializing for NPSN:", npsn);

    // 1. Verifikasi Akses & Ambil Metadata Ringan
    const verifyAccess = async (user: any) => {
      try {
        const checkRoleFn = httpsCallable(functions, "checkUserRole");
        const result = await checkRoleFn({ npsn });
        const { role, schoolData, adminProfile } = result.data as any;

        if (role !== "school_admin") {
          router.push("/login");
          return;
        }

        setAdminProfile(adminProfile);
        setSchoolData(schoolData);
        setIsLoading(false);
      } catch (error: any) {
        console.error("Access Verification Error:", error);
        setError(error.message || "Gagal memverifikasi akses.");
        setIsLoading(false);
      }
    };

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
      } else {
        verifyAccess(user);
      }
    });

    // 2. Listener Real-time untuk Metadata Sekolah (Mendukung Struktur Baru /lists)
    const schoolListRef = ref(rtdb, `schools/lists/${npsn}`);
    const unsubscribeSchool = onValue(schoolListRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setSchoolData((prev: any) => ({ ...prev, ...data, name: data.nama })); // Mapping nama -> name untuk UI
        
        // Cek jika sekolah dinonaktifkan oleh Owner
        if (data.status === "inactive") {
          Swal.fire({
            title: "Akses Dinonaktifkan",
            text: "Sekolah ini telah dinonaktifkan oleh Owner. Silakan hubungi admin pusat untuk informasi lebih lanjut.",
            icon: "error",
            confirmButtonText: "Keluar Sistem",
            confirmButtonColor: "#ef4444",
            background: "#0f172a",
            color: "#f1f5f9",
            allowOutsideClick: false
          }).then(() => {
            handleLogout();
          });
        }
      } else {
        // Fallback ke struktur lama
        const schoolLegacyRef = ref(rtdb, `schools/${npsn}`);
        onValue(schoolLegacyRef, (snap) => {
          if (snap.exists()) {
            const data = snap.val();
            const metadata = data.info || data;
            setSchoolData((prev: any) => ({ ...prev, ...metadata }));
          }
        }, { onlyOnce: true });
      }
    }, (err) => {
      console.error("RTDB Listen Error:", err);
    });

    // 3. Listener Real-time untuk Statistik (Cost Optimization)
    const statsRef = ref(rtdb, `schools/summary/${npsn}`);
    const unsubscribeStats = onValue(statsRef, (snap) => {
      if (snap.exists()) setStats(prev => ({ ...prev, ...snap.val() }));
    });

    unsubsRef.current.auth = unsubscribeAuth;
    unsubsRef.current.school = unsubscribeSchool;
    unsubsRef.current.stats = unsubscribeStats;

    return () => {
      Object.values(unsubsRef.current).forEach(unsub => unsub && unsub());
    };
  }, [npsn, router]);


  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-indigo-500 animate-pulse font-bold flex flex-col items-center gap-3">
          <School className="w-10 h-10" />
          Memuat Dashboard Sekolah...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/20 rounded-2xl p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <SubscriptionGuard>
      <div className="min-h-screen bg-slate-950 text-slate-200 flex">
        {/* Sidebar */}
        <aside className="w-72 bg-slate-900/50 border-r border-slate-800 flex flex-col">
          <div className="p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                <School className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-white leading-tight">AntiGravity</h1>
                <p className="text-xs text-indigo-400 font-medium">Smart School Engine</p>
              </div>
            </div>

            <nav className="space-y-2">
              <LinkItem icon={<LayoutDashboard size={20} />} label="Dashboard" active />
              <LinkItem icon={<Users size={20} />} label="Data Siswa" href={`/school/${npsn}/students`} />
              <LinkItem icon={<GraduationCap size={20} />} label="Data Guru" href={`/school/${npsn}/teachers`} />
              <LinkItem icon={<BookOpen size={20} />} label="Data Rombel" href={`/school/${npsn}/rombel`} />
              <LinkItem icon={<Archive size={20} />} label="Arsip Siswa" href={`/school/${npsn}/archive`} />
              <LinkItem icon={<LinkIcon size={20} />} label="Link Undangan" href={`/school/${npsn}/invitations`} />
              <LinkItem icon={<Wallet size={20} />} label="Keuangan" />
              <LinkItem icon={<Settings size={20} />} label="Pengaturan" href={`/school/${npsn}/settings`} />
            </nav>
          </div>

          <div className="mt-auto p-8 border-t border-slate-800">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Keluar</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <header className="h-20 border-b border-slate-800 flex items-center justify-between px-10 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-4 text-slate-400">
              <School size={20} />
              <span className="text-sm font-medium">/</span>
              <span className="text-sm font-medium text-white">{schoolData?.name || "Memuat..."}</span>
            </div>

            <div className="flex items-center gap-6">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Cari fitur atau data..." 
                  className="bg-slate-900 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all w-64"
                />
              </div>
              <button className="relative text-slate-400 hover:text-white transition-colors">
                <Bell size={20} />
                <span className="absolute top-0 right-0 w-2 h-2 bg-indigo-500 rounded-full border-2 border-slate-950"></span>
              </button>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
                {adminProfile?.name?.charAt(0) || "A"}
              </div>
            </div>
          </header>

          <div className="p-10">
            {/* Welcome Section */}
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-white mb-2">Halo, {adminProfile?.name || "Admin"}! 👋</h2>
              <p className="text-slate-400">Selamat datang di pusat kendali sekolah Anda hari ini.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-6 mb-10">
              <StatCard 
                label="Total User" 
                value={(stats.totalUsers || 0).toLocaleString('id-ID')} 
                subValue="Akun Terdaftar"
                icon={<Users className="text-blue-400" />} 
              />
              <StatCard 
                label="Data Siswa" 
                value={(stats.totalStudents || 0).toLocaleString('id-ID')} 
                subValue="Record Master"
                icon={<Users className="text-indigo-400" />} 
              />
              <StatCard 
                label="Guru Aktif" 
                value={(stats.totalTeachers || 0).toLocaleString('id-ID')} 
                subValue="Tenaga Pendidik"
                icon={<GraduationCap className="text-emerald-400" />} 
              />
              <StatCard 
                label="Total Rombel" 
                value={(stats.totalRombel || 0).toLocaleString('id-ID')} 
                subValue="Siswa dlm Kelas"
                icon={<BookOpen className="text-amber-400" />} 
              />
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-3 gap-8">
              <div className="col-span-2 space-y-8">
                {/* Recent Activities Placeholder */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">Aktivitas Terakhir</h3>
                    <button className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">Lihat Semua</button>
                  </div>
                  <div className="space-y-4">
                    <ActivityItem 
                      title="Sistem Siap" 
                      desc="Konfigurasi awal sekolah berhasil diselesaikan."
                      time="Baru saja"
                      icon={<CheckCircle2 className="text-emerald-400" />}
                    />
                    <ActivityItem 
                      title="Pendaftaran Diterima" 
                      desc="Sekolah Anda telah diverifikasi oleh Owner."
                      time="Beberapa saat lalu"
                      icon={<Clock className="text-indigo-400" />}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* School Info Card */}
                <div className="bg-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden group">
                  <div className="relative z-10">
                    <h3 className="text-lg font-bold mb-2">Informasi Sekolah</h3>
                    <div className="space-y-4 mt-6">
                      <div>
                        <p className="text-indigo-200 text-xs uppercase font-bold tracking-wider">NPSN</p>
                        <p className="font-medium">{npsn}</p>
                      </div>
                      <div>
                        <p className="text-indigo-200 text-xs uppercase font-bold tracking-wider">Alamat</p>
                        <p className="font-medium text-sm leading-relaxed">{schoolData?.address || "-"}</p>
                      </div>
                      <div>
                        <p className="text-indigo-200 text-xs uppercase font-bold tracking-wider">Kontak</p>
                        <p className="font-medium">{schoolData?.phone || "-"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <School size={200} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SubscriptionGuard>
  );
}

function LinkItem({ icon, label, active = false, href }: { icon: React.ReactNode, label: string, active?: boolean, href?: string }) {
  const router = useRouter();
  return (
    <button 
      onClick={() => href && router.push(href)}
      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"}`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
}

function StatCard({ label, value, subValue, icon }: { label: string, value: string, subValue: string, icon: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 hover:border-slate-700 transition-all group">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2.5 bg-slate-950 rounded-xl group-hover:scale-110 transition-transform">{icon}</div>
        <p className="text-slate-500 text-[11px] uppercase font-black tracking-widest">{label}</p>
      </div>
      <div>
        <h4 className="text-3xl font-black text-white mb-0.5 tracking-tight">{value}</h4>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">{subValue}</p>
      </div>
    </div>
  );
}

function ActivityItem({ title, desc, time, icon }: { title: string, desc: string, time: string, icon: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 p-4 hover:bg-slate-800/50 rounded-2xl transition-colors group">
      <div className="mt-1">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-bold text-white">{title}</h4>
          <span className="text-[10px] text-slate-500 font-medium">{time}</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
