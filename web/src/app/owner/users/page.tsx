"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Users, 
  School, 
  Search,
  LogOut,
  LayoutDashboard,
  Settings,
  Bell,
  Mail,
  UserCheck,
  ShieldCheck
} from "lucide-react";
import { auth, functions, rtdb } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { ref, onValue } from "firebase/database";
import Link from "next/link";

export default function OwnerUsers() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [ownerData, setOwnerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    // 1. Verify Owner Session
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      try {
        const checkRoleFn = httpsCallable(functions, "checkUserRole");
        const result = await checkRoleFn({});
        const { role, data } = result.data as any;

        if (role !== "owner") {
          router.push("/login");
          return;
        }
        
        setOwnerData(data);
      } catch (error) {
        console.error("Session Verification Error:", error);
        router.push("/login");
      }
    });

    // 2. Fetch Schools and Admins from RTDB (NPSN-Centric)
    const schoolsListRef = ref(rtdb, "schools/lists");
    const adminsRef = ref(rtdb, "admins");

    const unsubscribeSchools = onValue(schoolsListRef, (schoolSnap) => {
      const schoolsListData = schoolSnap.val() || {};
      
      const unsubscribeAdmins = onValue(adminsRef, (adminSnap) => {
        const adminsData = adminSnap.val() || {};
        const adminList: any[] = [];

        // Gabungkan data admin dengan metadata sekolah
        Object.entries(adminsData).forEach(([npsn, data]: [string, any]) => {
          const schoolInLists = schoolsListData[npsn] || {};
          
          // Data admin bisa di /admins/{npsn}/lists/{uid} (Struktur Baru)
          // atau /admins/{npsn}/{uid} (Legacy)
          const schoolAdminsMap = data.lists || data;

          Object.entries(schoolAdminsMap).forEach(([uid, adminVal]: [string, any]) => {
            // Jika adminVal adalah string (nama), kita ambil info tambahannya dari schools/lists jika tersedia
            const isAdminString = typeof adminVal === "string";
            
            adminList.push({
              uid: uid,
              schoolNpsn: npsn,
              name: isAdminString ? adminVal : (adminVal.name || adminVal.admin_name || schoolInLists.admin_name || "ADMINISTRATOR"),
              email: !isAdminString ? adminVal.email : (schoolInLists.admin_email || "-"),
              phone: !isAdminString ? adminVal.phone : (schoolInLists.admin_phone || "-"),
              schoolName: schoolInLists.nama || "N/A",
              status: schoolInLists.status || "pending_approval",
              role: !isAdminString ? adminVal.role : "admin_utama"
            });
          });
        });

        setAdmins(adminList);
        setIsLoading(false);
      });

      return () => unsubscribeAdmins();
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSchools();
    };
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-indigo-500 animate-pulse font-bold flex flex-col items-center gap-3">
          <Users className="w-10 h-10" />
          Memuat Data Pengguna...
        </div>
      </div>
    );
  }

  const filteredAdmins = admins.filter(admin => 
    admin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.schoolName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      {/* Sidebar (Sama dengan Dashboard untuk Konsistensi) */}
      <aside className="w-64 border-r border-slate-800 p-6 flex flex-col gap-8 hidden md:flex">
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/20">
            <School className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Owner Panel</span>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <Link href="/owner/dashboard" className="px-3 py-2 text-slate-500 hover:bg-slate-900 rounded-xl flex items-center gap-3 transition-colors cursor-pointer">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </Link>
          <div className="px-3 py-2 bg-indigo-600/10 text-indigo-400 rounded-xl flex items-center gap-3">
            <Users className="w-5 h-5" /> Pengguna
          </div>
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
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-widest text-[10px]">Owner</h2>
            <h1 className="text-xl font-bold">Manajemen Pengguna</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Cari admin atau sekolah..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors w-64 shadow-inner"
              />
            </div>
            <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 relative cursor-pointer hover:bg-slate-800 transition-colors">
              <Bell className="w-5 h-5 text-slate-400" />
            </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          {/* Header Section */}
          <div className="flex justify-between items-end mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-1">Daftar Admin Sekolah</h3>
              <p className="text-slate-500 text-sm">Menampilkan seluruh penanggung jawab sekolah yang terdaftar di platform.</p>
            </div>
            <div className="flex gap-3">
              <div className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-300">Total {admins.length} Admin</span>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-black/40">
            {filteredAdmins.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center gap-4">
                <Users className="w-12 h-12 text-slate-800" />
                <p className="text-slate-500 italic">Tidak ada data pengguna yang ditemukan.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] border-b border-slate-800 bg-slate-950/30">
                      <th className="px-6 py-4 font-bold">Nama Lengkap</th>
                      <th className="px-6 py-4 font-bold">Kontak & Email</th>
                      <th className="px-6 py-4 font-bold">Instansi Sekolah</th>
                      <th className="px-6 py-4 font-bold">Status Akun</th>
                      <th className="px-6 py-4 font-bold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredAdmins.map((admin, idx) => (
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        key={admin.schoolNpsn} 
                        className="hover:bg-slate-800/30 transition-all group"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold shadow-inner">
                              {admin.name?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">{admin.name}</div>
                              <div className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Administrator Utama</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              <Mail className="w-3.5 h-3.5 text-slate-500" />
                              {admin.email}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono tracking-tighter">Phone: {admin.phone || "-"}</div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-medium text-white">{admin.schoolName}</div>
                          <div className="text-[11px] text-indigo-500 font-bold tracking-widest uppercase">NPSN: {admin.schoolNpsn}</div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            admin.status === "active" 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : admin.status === "inactive"
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }`}>
                            <UserCheck className="w-3 h-3" />
                            {admin.status === "active" ? "Aktif" : admin.status === "inactive" ? "Terblokir" : "Menunggu"}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 bg-slate-800 text-slate-400 hover:bg-indigo-500 hover:text-white rounded-xl transition-all" title="Kirim Pesan">
                              <Mail className="w-5 h-5" />
                            </button>
                            <button className="p-2 bg-slate-800 text-slate-400 hover:bg-slate-700 rounded-xl transition-all">
                              <Settings className="w-5 h-5" />
                            </button>
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
