"use client";

import React, { useEffect, useState } from "react";
import { 
  Archive, 
  Search, 
  ArrowLeft,
  Users,
  Loader2,
  Trash2,
  RefreshCcw,
  GraduationCap,
  UserX,
  Calendar,
  LayoutGrid,
  Filter,
  CheckSquare,
  Square,
  X
} from "lucide-react";
import { rtdb, functions } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { httpsCallable } from "firebase/functions";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";

export default function ArchivePage() {
  const params = useParams();
  const npsn = params.npsn as string;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"archieved" | "graduated">("archieved");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [archivedList, setArchivedList] = useState<any[]>([]);
  const [graduatedList, setGraduatedList] = useState<any[]>([]);
  const [classRef, setClassRef] = useState<any>({});
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  // TAHUN AJARAN LOGIC
  const currentTA = (() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return month >= 6 ? `${year}` : `${year - 1}`;
  })();

  // Load References
  useEffect(() => {
    const classRefPath = ref(rtdb, `schools/reference/${npsn}/classroom`);
    onValue(classRefPath, (snap) => setClassRef(snap.exists() ? snap.val() : {}));
  }, [npsn]);

  // Load Archived Data
  useEffect(() => {
    setLoading(true);
    const archPath = ref(rtdb, `schools/students/archieved/${npsn}`);
    const unsubArch = onValue(archPath, (snap) => {
      if (snap.exists()) {
        setArchivedList(Object.entries(snap.val()).map(([id, val]: [string, any]) => ({ id, ...val })));
      } else {
        setArchivedList([]);
      }
      setLoading(false);
    });

    const gradPath = ref(rtdb, `schools/graduated/${npsn}`);
    const unsubGrad = onValue(gradPath, (snap) => {
      if (snap.exists()) {
        const allGrads: any[] = [];
        Object.entries(snap.val()).forEach(([year, students]: [string, any]) => {
          Object.entries(students).forEach(([id, s]: [string, any]) => {
            allGrads.push({ id, ...s, gradYear: year });
          });
        });
        setGraduatedList(allGrads);
      } else {
        setGraduatedList([]);
      }
    });

    return () => {
      unsubArch();
      unsubGrad();
    };
  }, [npsn]);

  const handleRestore = async () => {
    if (selectedStudents.length === 0) return;
    
    setIsProcessing(true);
    try {
      const manageFn = httpsCallable(functions, "manageRombel");
      const studentsToRestore = (activeTab === "archieved" ? archivedList : graduatedList)
        .filter(s => selectedStudents.includes(s.id))
        .map(s => ({ id: s.id, nama: s.nama, uid: s.uid, gradYear: s.gradYear, reason: s.archiveReason }));

      await manageFn({
        npsn,
        action: "restore",
        source: activeTab,
        tahunAjaran: currentTA,
        students: studentsToRestore
      });

      setSelectedStudents([]);
      Swal.fire({ title: "Berhasil", text: "Siswa telah dikembalikan ke daftar 'Tanpa Rombel'.", icon: "success", timer: 1500 });
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredList = (activeTab === "archieved" ? archivedList : graduatedList).filter(s => 
    (s.nama || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (s.id || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <header className="px-10 py-8 bg-slate-950/50 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800/50 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.back()} 
            className="p-3 bg-slate-900 hover:bg-slate-800 rounded-2xl text-slate-400 transition-all border border-slate-800 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-white">Arsip Siswa</h1>
            <p className="text-sm text-slate-500 font-medium">Data siswa non-aktif dan lulusan sekolah.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-2xl border border-slate-800">
          <button 
            onClick={() => { setActiveTab("archieved"); setSelectedStudents([]); }}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "archieved" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
          >
            Non-Aktif
          </button>
          <button 
            onClick={() => { setActiveTab("graduated"); setSelectedStudents([]); }}
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === "graduated" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
          >
            Lulusan
          </button>
        </div>
      </header>

      <main className="p-10 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="relative group w-full max-w-md">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder={`Cari nama atau ID di daftar ${activeTab === "archieved" ? "arsip" : "lulusan"}...`}
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-14 pr-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-medium shadow-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {selectedStudents.length > 0 && (
            <button 
              onClick={handleRestore}
              disabled={isProcessing}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCcw className="w-5 h-5" />}
              Kembalikan ke Siswa Aktif ({selectedStudents.length})
            </button>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 bg-slate-950/50">
                <th className="px-8 py-5 w-12">
                   <button 
                    onClick={() => {
                      if (selectedStudents.length === filteredList.length) setSelectedStudents([]);
                      else setSelectedStudents(filteredList.map(s => s.id));
                    }}
                    className="hover:text-white transition-colors"
                  >
                    <CheckSquare className="w-5 h-5" />
                  </button>
                </th>
                <th className="px-8 py-5">Nama Siswa</th>
                <th className="px-8 py-5">NISN / ID</th>
                <th className="px-8 py-5">{activeTab === "archieved" ? "Alasan" : "Tahun Lulus"}</th>
                <th className="px-8 py-5">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-slate-800 mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Memuat data arsip...</p>
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-40 text-center">
                    <Archive className="w-20 h-20 text-slate-800 mx-auto mb-6" />
                    <h2 className="text-xl font-black text-slate-700 uppercase tracking-widest">Arsip Kosong</h2>
                    <p className="text-slate-600 mt-2">Tidak ada data siswa yang ditemukan di kategori ini.</p>
                  </td>
                </tr>
              ) : (
                filteredList.map((s) => (
                  <tr 
                    key={s.id} 
                    onClick={() => setSelectedStudents(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                    className={`group transition-all cursor-pointer hover:bg-slate-800/30 ${selectedStudents.includes(s.id) ? "bg-indigo-600/10" : ""}`}
                  >
                    <td className="px-8 py-5">
                      {selectedStudents.includes(s.id) ? <CheckSquare className="w-5 h-5 text-indigo-400" /> : <Square className="w-5 h-5 text-slate-800 group-hover:text-slate-700" />}
                    </td>
                    <td className="px-8 py-5">
                      <p className="font-black text-white text-base">{s.nama}</p>
                    </td>
                    <td className="px-8 py-5 font-mono text-xs text-slate-500 uppercase">{s.id}</td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${activeTab === "archieved" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                        {activeTab === "archieved" ? (s.archiveReason || "Lainnya") : `Lulus ${s.gradYear}/${parseInt(s.gradYear)+1}`}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-xs text-slate-600 font-medium">
                      {new Date(activeTab === "archieved" ? s.archievedAt : s.graduatedAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* RESTORE MODAL REMOVED - AUTO MOVE TO UNROMBEL */}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
}
