"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, 
  Search, 
  Plus, 
  MoreVertical, 
  ArrowLeft,
  Mail,
  Shield,
  Loader2,
  School
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function TeachersPage() {
  const params = useParams();
  const npsn = params.npsn as string;
  const router = useRouter();
  
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const teachersRef = ref(rtdb, `schools/teachers/${npsn}`);
    const unsubscribe = onValue(teachersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([uid, val]: [string, any]) => ({
          uid,
          ...val
        }));
        setTeachers(list);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [npsn]);

  const filteredTeachers = teachers.filter(t => 
    t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="text-2xl font-black text-white">Data Guru & Staff</h1>
            <p className="text-sm text-slate-500 font-medium">Manajemen tenaga pendidik sekolah.</p>
          </div>
        </div>
        <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all flex items-center gap-2 shadow-xl shadow-indigo-600/20 active:scale-95 text-xs uppercase tracking-widest">
          <Plus className="w-4 h-4" /> Tambah Guru
        </button>
      </header>

      <main className="p-10 max-w-7xl mx-auto space-y-8">
        {/* Search Bar */}
        <div className="relative group max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Cari nama atau email guru..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-14 pr-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-medium shadow-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Teachers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <div key={teacher.uid} className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 hover:border-indigo-500/50 transition-all group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-5 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20">
                  {teacher.nama.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-white text-lg leading-tight">{teacher.nama}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Shield className="w-3 h-3 text-indigo-400" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">{teacher.specialization || "Guru"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-800/50">
                <div className="flex items-center gap-3 text-sm text-slate-400 font-medium">
                  <Mail className="w-4 h-4 text-slate-600" />
                  <span className="truncate">{teacher.email || "-"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-400 font-medium">
                  <School className="w-4 h-4 text-slate-600" />
                  <span>NPSN: {npsn}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredTeachers.length === 0 && (
            <div className="col-span-full py-40 text-center">
              <Users className="w-20 h-20 text-slate-800 mx-auto mb-6" />
              <h2 className="text-xl font-black text-slate-700 uppercase tracking-widest">Tidak Ada Data Guru</h2>
              <p className="text-slate-600 mt-2">Gunakan fitur migrasi data untuk mengimpor guru secara massal.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
