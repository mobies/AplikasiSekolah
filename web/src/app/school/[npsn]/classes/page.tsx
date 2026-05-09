"use client";

import React, { useEffect, useState } from "react";
import { 
  LayoutGrid, 
  Search, 
  Plus, 
  ArrowLeft,
  Users,
  ChevronRight,
  Loader2,
  Database
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function ClassesPage() {
  const params = useParams();
  const npsn = params.npsn as string;
  
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const classesRef = ref(rtdb, `schools/reference/${npsn}/classroom`);
    const unsubscribe = onValue(classesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          className: val.className || id,
          studentCount: 0, // Akan diupdate via rombel jika perlu
          status: val.status || "active"
        }));
        setClasses(list);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [npsn]);

  const filteredClasses = classes.filter(c => 
    c.className.toLowerCase().includes(searchQuery.toLowerCase())
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
            <h1 className="text-2xl font-black text-white">Data Kelas</h1>
            <p className="text-sm text-slate-500 font-medium">Struktur organisasi siswa per tingkatan.</p>
          </div>
        </div>
        <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all flex items-center gap-2 shadow-xl shadow-indigo-600/20 active:scale-95 text-xs uppercase tracking-widest">
          <Plus className="w-4 h-4" /> Buat Kelas
        </button>
      </header>

      <main className="p-10 max-w-7xl mx-auto space-y-8">
        <div className="relative group max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Cari nama kelas..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-14 pr-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-medium shadow-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredClasses.map((item) => (
            <motion.div 
              key={item.id}
              whileHover={{ scale: 1.02 }}
              className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 hover:border-indigo-500/50 transition-all group cursor-pointer relative"
            >
              <div className="w-14 h-14 bg-indigo-600/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <LayoutGrid className="w-6 h-6" />
              </div>

              <h3 className="font-black text-xl text-white mb-2">{item.className}</h3>
              <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
                <Users className="w-4 h-4" />
                {item.studentCount} Siswa
              </div>

              <div className="mt-8 flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${item.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}`}>
                  {item.status}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-indigo-400 transition-all" />
              </div>
              
              <Link href={`/school/${npsn}/classes/${item.id}`} className="absolute inset-0 z-10" />
            </motion.div>
          ))}

          {filteredClasses.length === 0 && (
            <div className="col-span-full py-40 text-center">
              <Database className="w-20 h-20 text-slate-800 mx-auto mb-6" />
              <h2 className="text-xl font-black text-slate-700 uppercase tracking-widest">Tidak Ada Kelas</h2>
              <p className="text-slate-600 mt-2">Daftar kelas akan muncul otomatis setelah data siswa diimpor.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
