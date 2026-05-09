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
  Database,
  BookOpen,
  Filter,
  X,
  PlusCircle,
  Trash2,
  Edit2
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, set, push, remove } from "firebase/database";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

export default function RombelPage() {
  const params = useParams();
  const npsn = params.npsn as string;
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [rombelList, setRombelList] = useState<any[]>([]);
  const [classRef, setClassRef] = useState<any>({});
  const [selectedRombel, setSelectedRombel] = useState<any>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");

  const [tahunAjaran, setTahunAjaran] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return month >= 6 ? `${year}_${year + 1}` : `${year - 1}_${year}`;
  });

  // 1. Load Data Referensi Kelas (Ruang)
  useEffect(() => {
    const classRefPath = ref(rtdb, `schools/reference/${npsn}/classroom`);
    const unsubscribe = onValue(classRefPath, (snapshot) => {
      if (snapshot.exists()) {
        setClassRef(snapshot.val());
      } else {
        setClassRef({});
      }
    });
    return () => unsubscribe();
  }, [npsn]);

  // 2. Load Data Rombel berdasarkan Tahun Ajaran
  useEffect(() => {
    setLoading(true);
    const rombelPath = ref(rtdb, `schools/rombel/${npsn}/${tahunAjaran}`);
    const unsubscribe = onValue(rombelPath, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([classId, students]: [string, any]) => {
          const studentArray = Object.entries(students).map(([nisn, details]: [string, any]) => ({
            nisn: nisn.startsWith("NONISN_") ? "" : nisn,
            ...details
          }));
          return {
            classId,
            className: classRef[classId]?.className || classId,
            students: studentArray,
            studentCount: studentArray.length
          };
        });
        setRombelList(list);
      } else {
        setRombelList([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [npsn, tahunAjaran, classRef]);

  const filteredRombel = rombelList.filter(r => 
    r.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.classId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddClass = async () => {
    if (!newClassName.trim()) return;
    try {
      const classId = newClassName.trim().toUpperCase().replace(/\s+/g, '-');
      await set(ref(rtdb, `schools/reference/${npsn}/classroom/${classId}`), {
        className: newClassName.trim(),
        status: "active",
        createdAt: Date.now()
      });
      setNewClassName("");
      Swal.fire({ title: "Berhasil", text: "Kelas referensi ditambahkan", icon: "success", timer: 1500, showConfirmButton: false });
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    }
  };

  const handleDeleteClass = async (id: string) => {
    const result = await Swal.fire({
      title: "Hapus Referensi?",
      text: "Hanya hapus jika kelas ini belum digunakan di Rombel manapun.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      await remove(ref(rtdb, `schools/reference/${npsn}/classroom/${id}`));
    }
  };

  if (loading && rombelList.length === 0) {
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
            <h1 className="text-2xl font-black text-white">Data Rombel</h1>
            <p className="text-sm text-slate-500 font-medium">Pengelolaan siswa per kelas pada tahun ajaran.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select 
              className="bg-transparent text-white font-bold text-xs uppercase tracking-widest focus:outline-none cursor-pointer"
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
            >
              <option value="2024_2025">2024/2025</option>
              <option value="2025_2026">2025/2026</option>
              <option value="2026_2027">2026/2027</option>
            </select>
          </div>
          
          <button 
            onClick={() => setIsClassModalOpen(true)}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all flex items-center gap-2 border border-slate-700 text-xs uppercase tracking-widest"
          >
            <Database className="w-4 h-4" /> Kelola Referensi Kelas
          </button>
        </div>
      </header>

      <main className="p-10 max-w-7xl mx-auto space-y-8">
        <div className="relative group max-w-md">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Cari nama rombel..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-14 pr-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-medium shadow-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredRombel.map((item) => (
            <motion.div 
              key={item.classId}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedRombel(item)}
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
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {tahunAjaran.replace('_', '/')}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-700 group-hover:text-indigo-400 transition-all" />
              </div>
            </motion.div>
          ))}

          {filteredRombel.length === 0 && (
            <div className="col-span-full py-40 text-center">
              <BookOpen className="w-20 h-20 text-slate-800 mx-auto mb-6" />
              <h2 className="text-xl font-black text-slate-700 uppercase tracking-widest">Tidak Ada Data Rombel</h2>
              <p className="text-slate-600 mt-2">Belum ada siswa yang dimasukkan ke kelas pada tahun ajaran ini.</p>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: Daftar Siswa dalam Rombel */}
      <AnimatePresence>
        {selectedRombel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedRombel(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600/20 rounded-2xl text-indigo-400">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Siswa {selectedRombel.className}</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Tahun Ajaran {tahunAjaran.replace('_', '/')}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedRombel(null)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="overflow-y-auto p-4 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">
                      <th className="px-6 py-4">Nama Siswa</th>
                      <th className="px-6 py-4">NISN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {selectedRombel.students.map((s: any) => (
                      <tr key={s.uid || s.nisn} className="group hover:bg-slate-800/30 transition-all">
                        <td className="px-6 py-4 font-bold text-white text-sm">{s.nama}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.nisn || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-8 bg-slate-950/50 border-t border-slate-800 text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total: {selectedRombel.studentCount} Siswa</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Kelola Referensi Kelas */}
      <AnimatePresence>
        {isClassModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsClassModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, x: 50 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              exit={{ scale: 0.9, opacity: 0, x: 50 }}
              className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600/20 rounded-2xl text-indigo-400">
                    <Database className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black text-white">Referensi Kelas</h2>
                </div>
                <button onClick={() => setIsClassModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-6 flex flex-col h-full overflow-hidden">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nama Kelas (Contoh: X-IPA-1)"
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-all text-white font-medium"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddClass()}
                  />
                  <button 
                    onClick={handleAddClass}
                    className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all"
                  >
                    <PlusCircle className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                  {Object.entries(classRef).length === 0 ? (
                    <div className="text-center py-10 text-slate-600 italic text-sm">Belum ada referensi kelas.</div>
                  ) : (
                    Object.entries(classRef).map(([id, val]: [string, any]) => (
                      <div key={id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800 rounded-2xl group hover:border-slate-700 transition-all">
                        <div>
                          <p className="font-bold text-white text-sm">{val.className}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{id}</p>
                        </div>
                        <button 
                          onClick={() => handleDeleteClass(id)}
                          className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );
}
