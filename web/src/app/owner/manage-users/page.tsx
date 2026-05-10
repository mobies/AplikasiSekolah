"use client";

import React, { useEffect, useState, useMemo } from "react";
import { 
  Users, 
  Search, 
  ArrowLeft,
  Loader2,
  Shield,
  Clock,
  UserCheck,
  Filter,
  Trash2,
  AlertTriangle,
  School,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  ChevronRight,
  Settings
} from "lucide-react";
import { auth, functions, rtdb } from "@/lib/firebase";
import { ref, onValue, update } from "firebase/database";
import { useRouter, useSearchParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { signOut } from "firebase/auth";
import Link from "next/link";
import Swal from "sweetalert2";
import { motion, AnimatePresence } from "framer-motion";

export default function OwnerManageUsers() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const npsnFromUrl = searchParams.get("npsn");
  
  const [selectedNpsn, setSelectedNpsn] = useState<string | null>(npsnFromUrl);
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolData, setSelectedSchoolData] = useState<any>(null);
  
  const [users, setUsers] = useState<any[]>([]);
  const [masterStudentUids, setMasterStudentUids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [ownerData, setOwnerData] = useState<any>(null);

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

    // 2. Fetch All Schools for selection
    const schoolsRef = ref(rtdb, "schools/lists");
    const unsubscribeSchools = onValue(schoolsRef, (snap) => {
      if (snap.exists()) {
        const list = Object.entries(snap.val()).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })).filter(s => s.status === "active");
        setSchools(list);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeSchools();
    };
  }, [router]);

  useEffect(() => {
    if (!selectedNpsn) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setUsers([]);
    
    // Fetch Selected School Info
    const schoolInfoRef = ref(rtdb, `schools/lists/${selectedNpsn}`);
    const unsubscribeInfo = onValue(schoolInfoRef, (snap) => {
      setSelectedSchoolData(snap.val());
    });

    // 1. Fetch Master Students to identify ghost users
    const masterRef = ref(rtdb, `schools/students/${selectedNpsn}`);
    const unsubscribeMaster = onValue(masterRef, (snap) => {
      const uids = new Set<string>();
      if (snap.exists()) {
        Object.values(snap.val()).forEach((s: any) => {
          if (s.uid) uids.add(s.uid);
        });
      }
      setMasterStudentUids(uids);
    });

    // 2. Fetch All Users for this school
    const usersRef = ref(rtdb, `users/${selectedNpsn}`);
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data)
          .map(([uid, val]: [string, any]) => ({
            uid,
            ...val
          }))
          .filter(u => {
            const role = (u.role || "").toLowerCase();
            return !role.includes("admin");
          });
        setUsers(list);
      } else {
        setUsers([]);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeInfo();
      unsubscribeMaster();
      unsubscribeUsers();
    };
  }, [selectedNpsn]);

  const handleToggleStatus = async (user: any) => {
    const isStudent = user.role === "student" || user.role === "peserta";
    const currentStatus = user.status || (isStudent ? "approved" : "active");
    
    let newStatus = currentStatus === "non-active" 
      ? (isStudent ? "approved" : "active") 
      : "non-active";

    try {
      await update(ref(rtdb, `users/${selectedNpsn}/${user.uid}`), { status: newStatus });
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Status ${user.nama} diubah`,
        showConfirmButton: false,
        timer: 2000,
        background: "#0f172a",
        color: "#f1f5f9"
      });
    } catch (error: any) {
      Swal.fire({ title: "Gagal", text: error.message, icon: "error", background: "#0f172a", color: "#f1f5f9" });
    }
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    const result = await Swal.fire({
      title: "Hapus User?",
      text: `Hapus ${name} dari sekolah ini?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      background: "#0f172a",
      color: "#f1f5f9"
    });

    if (result.isConfirmed) {
      setIsDeleting(true);
      try {
        const cleanupFn = httpsCallable(functions, "cleanupSchoolUsers");
        await cleanupFn({ npsn: selectedNpsn, uids: [uid] });
        Swal.fire({ title: "Berhasil", icon: "success", background: "#0f172a", color: "#f1f5f9" });
      } catch (error: any) {
        Swal.fire({ title: "Gagal", text: error.message, icon: "error", background: "#0f172a", color: "#f1f5f9" });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const name = (u.nama || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const role = (u.role || "").toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch = name.includes(q) || email.includes(q) || role.includes(q);
      
      if (!matchesSearch) return false;
      if (activeTab === "siswa") return role === "student" || role === "peserta";
      if (activeTab === "guru") return role === "teacher" || role === "author";
      if (activeTab === "other") return !["student", "peserta", "teacher", "author"].includes(role);
      return true;
    }).sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  }, [users, searchQuery, activeTab]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

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
          <Link href="/owner/dashboard" className="px-3 py-2 text-slate-500 hover:bg-slate-900 rounded-xl flex items-center gap-3 transition-colors cursor-pointer">
            <LayoutDashboard className="w-5 h-5" /> Dashboard
          </Link>
          <div className="px-3 py-2 bg-indigo-600/10 text-indigo-400 rounded-xl flex items-center gap-3">
            <Users className="w-5 h-5" /> Populasi User
          </div>
          <Link href="/owner/users" className="px-3 py-2 text-slate-500 hover:bg-slate-900 rounded-xl flex items-center gap-3 transition-colors cursor-pointer">
            <ShieldCheck className="w-5 h-5" /> Admin Sekolah
          </Link>
          <Link href="/owner/settings" className="px-3 py-2 text-slate-500 hover:bg-slate-900 rounded-xl flex items-center gap-3 transition-colors cursor-pointer">
            <Settings className="w-5 h-5" /> Pengaturan
          </Link>
        </nav>

        <button onClick={handleLogout} className="px-3 py-2 text-slate-500 hover:text-red-400 flex items-center gap-3 transition-colors mt-auto group">
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Keluar
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 backdrop-blur-md sticky top-0 z-10">
          <div>
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Management</h2>
            <h1 className="text-xl font-bold">Populasi User Sekolah</h1>
          </div>
          {selectedNpsn && (
            <button 
              onClick={() => setSelectedNpsn(null)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Ganti Sekolah
            </button>
          )}
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {!selectedNpsn ? (
              <motion.div 
                key="selection"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-2xl font-bold mb-2">Pilih Sekolah</h3>
                  <p className="text-slate-500 text-sm">Silakan pilih sekolah untuk mengelola data siswa, guru, dan staff.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {schools.map((school) => (
                    <button
                      key={school.id}
                      onClick={() => setSelectedNpsn(school.id)}
                      className="group bg-slate-900 border border-slate-800 p-6 rounded-[32px] text-left hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all relative overflow-hidden"
                    >
                      <div className="flex flex-col gap-4 relative z-10">
                        <div className="w-12 h-12 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
                          <School className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg leading-tight group-hover:text-indigo-400 transition-colors">{school.nama}</h4>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">NPSN: {school.id}</p>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-tighter pt-2 border-t border-slate-800">
                          <span>{school.admin_name}</span>
                          <ChevronRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-600/10 transition-all" />
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="management"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
              >
                {/* Header Stats */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="px-3 py-1 bg-indigo-600/10 text-indigo-400 text-[10px] font-black rounded-lg border border-indigo-500/20 uppercase tracking-widest">Selected School</div>
                    </div>
                    <h3 className="text-3xl font-black text-white leading-tight">{selectedSchoolData?.nama}</h3>
                    <p className="text-slate-500 font-medium">Mengelola populasi user untuk NPSN: {selectedNpsn}</p>
                  </div>
                  
                  <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-xl">
                    {[
                      { id: "all", label: "Semua", count: users.length },
                      { id: "siswa", label: "Siswa", count: users.filter(u => u.role === "student" || u.role === "peserta").length },
                      { id: "guru", label: "Guru", count: users.filter(u => u.role === "teacher" || u.role === "author").length },
                      { id: "other", label: "Staff", count: users.filter(u => !["student", "peserta", "teacher", "author"].includes(u.role?.toLowerCase())).length }
                    ].map(tab => (
                      <button 
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {tab.label}
                        <span className={`px-2 py-0.5 rounded-md text-[8px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>{tab.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Section */}
                <div className="space-y-4">
                  <div className="relative group max-w-md w-full">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Cari nama, email, atau role..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-14 pr-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-medium shadow-xl"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
                    {loading ? (
                      <div className="p-20 flex flex-col items-center gap-4">
                        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Memuat Populasi...</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900/50 border-b border-slate-800">
                              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">User</th>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Role & Integritas</th>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                              <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {filteredUsers.map((user) => {
                              const isStudentRole = user.role === "student" || user.role === "peserta";
                              const isGhost = isStudentRole && !masterStudentUids.has(user.uid);

                              return (
                                <tr key={user.uid} className={`hover:bg-slate-800/30 transition-colors group ${isGhost ? 'bg-red-500/5' : ''}`}>
                                  <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border group-hover:scale-110 transition-transform ${isGhost ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                        {user.nama?.charAt(0) || "U"}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-bold text-white leading-tight">{user.nama}</span>
                                        <span className="text-xs text-slate-500 font-medium">{user.email || "No Email"}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-8 py-6">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <Shield className="w-3.5 h-3.5 text-indigo-400" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded-md">
                                          {user.role === 'student' || user.role === 'peserta' ? 'Siswa' : user.role === 'teacher' || user.role === 'author' ? 'Guru' : user.role}
                                        </span>
                                      </div>
                                      {isGhost && (
                                        <div className="flex items-center gap-1.5 text-red-400 animate-pulse">
                                          <AlertTriangle className="w-3 h-3" />
                                          <span className="text-[9px] font-black uppercase tracking-tighter">Ghost/Unlinked</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-8 py-6">
                                    <div className="flex items-center gap-2">
                                      <UserCheck className={`w-3.5 h-3.5 ${user.status === 'approved' || user.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`} />
                                      <span className={`text-[10px] font-black uppercase tracking-widest ${user.status === 'approved' || user.status === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {user.status || 'pending'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-8 py-6 text-right">
                                    {isGhost ? (
                                      <button 
                                        onClick={() => handleDeleteUser(user.uid, user.nama)}
                                        disabled={isDeleting}
                                        className="p-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all active:scale-90"
                                      >
                                        <Trash2 className="w-5 h-5" />
                                      </button>
                                    ) : (
                                      <div className="flex justify-end">
                                        <button 
                                          onClick={() => handleToggleStatus(user)}
                                          className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                                            user.status === 'non-active' ? 'bg-slate-800' : 'bg-emerald-500'
                                          }`}
                                        >
                                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                                            user.status === 'non-active' ? 'left-1' : 'left-7'
                                          }`} />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {!loading && filteredUsers.length === 0 && (
                      <div className="py-20 text-center">
                        <Users className="w-16 h-16 text-slate-800 mx-auto mb-4" />
                        <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Tidak ada data user ditemukan</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
