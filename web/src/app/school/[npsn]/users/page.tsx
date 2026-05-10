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
  AlertTriangle
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, update } from "firebase/database";
import { useParams } from "next/navigation";
import Link from "next/link";
import Swal from "sweetalert2";

export default function UsersPage() {
  const params = useParams();
  const npsn = params.npsn as string;
  
  const [users, setUsers] = useState<any[]>([]);
  const [masterStudentUids, setMasterStudentUids] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    // 1. Fetch Master Students to identify ghost users
    const masterRef = ref(rtdb, `schools/students/${npsn}`);
    const unsubscribeMaster = onValue(masterRef, (snap) => {
      if (snap.exists()) {
        const uids = new Set<string>();
        Object.values(snap.val()).forEach((s: any) => {
          if (s.uid) uids.add(s.uid);
        });
        setMasterStudentUids(uids);
      }
    });

    // 2. Fetch All Users
    const usersRef = ref(rtdb, `users/${npsn}`);
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
      unsubscribeMaster();
      unsubscribeUsers();
    };
  }, [npsn]);

  const handleToggleStatus = async (user: any) => {
    const isStudent = user.role === "student" || user.role === "peserta";
    const currentStatus = user.status || (isStudent ? "approved" : "active");
    
    // Tentukan status baru
    let newStatus = "";
    if (currentStatus === "non-active") {
      newStatus = isStudent ? "approved" : "active";
    } else {
      newStatus = "non-active";
    }

    try {
      await update(ref(rtdb, `users/${npsn}/${user.uid}`), { status: newStatus });
      // Toast sederhana
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: "#0f172a",
        color: "#f1f5f9"
      });
      Toast.fire({ icon: 'success', title: `Status ${user.nama} diubah ke ${newStatus}` });
    } catch (error: any) {
      Swal.fire({ title: "Gagal", text: error.message, icon: "error", background: "#0f172a", color: "#f1f5f9" });
    }
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    const result = await Swal.fire({
      title: "Hapus User?",
      text: `Apakah Anda yakin ingin menghapus ${name}? Tindakan ini tidak dapat dibatalkan.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#1e293b",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
      background: "#0f172a",
      color: "#f1f5f9"
    });

    if (result.isConfirmed) {
      setIsDeleting(true);
      try {
        const updates: any = {};
        updates[`users/${npsn}/${uid}`] = null;
        // Juga hapus dari guru/staff jika ada
        updates[`schools/teachers/${npsn}/${uid}`] = null;
        updates[`schools/unrombel/${npsn}/${uid}`] = null;

        await update(ref(rtdb), updates);
        Swal.fire({ title: "Berhasil", text: "User telah dihapus.", icon: "success", background: "#0f172a", color: "#f1f5f9" });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="px-10 py-8 bg-slate-950/50 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800/50 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link href={`/school/${npsn}/dashboard`} className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl text-slate-400 transition-all border border-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white">Data User Sistem</h1>
            <p className="text-sm text-slate-500 font-medium">Daftar seluruh pengguna aktif di sekolah ini (Siswa, Guru, Staff).</p>
          </div>
        </div>
      </header>

      <main className="p-10 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="relative group flex-1 max-w-md w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Cari nama, email, atau role..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-14 pr-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-medium shadow-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex bg-slate-900 p-1.5 rounded-2xl border border-slate-800 shadow-xl">
            {[
              { id: "all", label: "Semua", count: users.length },
              { id: "siswa", label: "Siswa", count: users.filter(u => u.role === "student" || u.role === "peserta").length },
              { id: "guru", label: "Guru", count: users.filter(u => u.role === "teacher" || u.role === "author").length },
              { id: "other", label: "Staff/Lainnya", count: users.filter(u => !["student", "peserta", "teacher", "author"].includes(u.role?.toLowerCase())).length }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-md text-[8px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>{tab.count}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
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
                              <span className="text-[9px] font-black uppercase tracking-tighter">Ghost/Unlinked (Bukan Siswa Aktif)</span>
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
                            title="Hapus User (Unlinked)"
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

          {filteredUsers.length === 0 && (
            <div className="py-20 text-center">
              <Users className="w-16 h-16 text-slate-800 mx-auto mb-4" />
              <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Tidak ada data user ditemukan</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
