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
  Archive,
  BookOpen,
  Filter,
  X,
  PlusCircle,
  Trash2,
  Edit2,
  UserPlus,
  UserMinus,
  UserX,
  Award,
  CheckSquare,
  Square,
  ArrowRightCircle,
  HelpCircle
} from "lucide-react";
import { rtdb, functions } from "@/lib/firebase";
import { ref, onValue, set, push, remove } from "firebase/database";
import { httpsCallable } from "firebase/functions";
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
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [unrombelSearchQuery, setUnrombelSearchQuery] = useState("");
  const [currentRombelStudents, setCurrentRombelStudents] = useState<any[]>([]);
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [editClassName, setEditClassName] = useState("");
  
  // TAHUN AJARAN LOGIC (Hanya tahun awal)
  const [tahunAjaran, setTahunAjaran] = useState(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    // Aturan: Jan-Jun (0-5) -> Year - 1, Jul-Des (6-11) -> Current Year
    return month >= 6 ? `${year}` : `${year - 1}`;
  });

  const [unrombelList, setUnrombelList] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  
  // Selection States for Bulk
  const [selectedInRombel, setSelectedInRombel] = useState<string[]>([]);
  const [selectedInUnrombel, setSelectedInUnrombel] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatTA = (ta: string) => {
    const year = parseInt(ta);
    return isNaN(year) ? ta : `${year}/${year + 1}`;
  };

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

  // 2. Load Metadata Rombel Lists & Unrombel
  useEffect(() => {
    setLoading(true);
    const rombelListsPath = ref(rtdb, `schools/rombel/lists/${npsn}/${tahunAjaran}`);
    const unsubRombelList = onValue(rombelListsPath, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setRombelList(prev => {
          const newList = Object.entries(data).map(([classId, meta]: [string, any]) => {
            const existing = prev.find(p => p.classId === classId);
            return {
              classId,
              className: meta.name || classId,
              studentCount: meta.studentCount || 0,
              students: existing?.students || [],
              isLoaded: existing?.isLoaded || false
            };
          });
          return newList;
        });
      } else {
        setRombelList([]);
      }
      setLoading(false);
    });

    const unrombelPath = ref(rtdb, `schools/rombel/unrombel/${npsn}`);
    const unsubUnrombel = onValue(unrombelPath, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setUnrombelList(Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val })));
      } else {
        setUnrombelList([]);
      }
    });

    return () => {
      unsubRombelList();
      unsubUnrombel();
    };
  }, [npsn, tahunAjaran]);

  // 3. Load Detail Siswa per Rombel (On Demand)
  useEffect(() => {
    if (!selectedRombel || !tahunAjaran) return;
    
    setLoadingStudents(true);
    const membersRef = ref(rtdb, `schools/rombel/members/${npsn}/${tahunAjaran}/${selectedRombel.classId}`);
    const unsubscribe = onValue(membersRef, (snap) => {
      if (snap.exists()) {
        const students = Object.entries(snap.val()).map(([id, s]: [string, any]) => ({ id, ...s }));
        setCurrentRombelStudents(students);
        
        // Update rombelList juga untuk sinkronisasi count di background
        setRombelList(prev => prev.map(r => 
          r.classId === selectedRombel.classId ? { ...r, students, isLoaded: true } : r
        ));
      } else {
        setCurrentRombelStudents([]);
        setRombelList(prev => prev.map(r => 
          r.classId === selectedRombel.classId ? { ...r, students: [], isLoaded: true } : r
        ));
      }
      setLoadingStudents(false);
    });
    
    return () => unsubscribe();
  }, [npsn, tahunAjaran, selectedRombel?.classId]);

  // Bulk Actions
  const handleBulkEnroll = async (classId: string) => {
    if (selectedInUnrombel.length === 0) return;
    setIsProcessing(true);
    try {
      const manageFn = httpsCallable(functions, "manageRombel");
      const studentsToEnroll = unrombelList
        .filter(s => selectedInUnrombel.includes(s.id))
        .map(s => ({ id: s.id, nama: s.nama, uid: s.uid }));

      await manageFn({
        npsn,
        action: "enroll",
        tahunAjaran,
        classId,
        students: studentsToEnroll
      });
      
      setSelectedInUnrombel([]);
      setIsEnrollModalOpen(false);
      Swal.fire({ title: "Berhasil", text: `${studentsToEnroll.length} Siswa dimasukkan ke rombel.`, icon: "success", timer: 1500 });
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkUnenroll = async () => {
    if (selectedInRombel.length === 0 || !selectedRombel) return;
    setIsProcessing(true);
    try {
      const manageFn = httpsCallable(functions, "manageRombel");
      const studentsToUnenroll = currentRombelStudents
        .filter(s => selectedInRombel.includes(s.id))
        .map(s => ({ id: s.id, nama: s.nama, uid: s.uid }));

      await manageFn({
        npsn,
        action: "unenroll",
        tahunAjaran,
        classId: selectedRombel.classId,
        students: studentsToUnenroll
      });
      
      setSelectedInRombel([]);
      Swal.fire({ title: "Berhasil", text: `${studentsToUnenroll.length} Siswa dikeluarkan ke Unrombel.`, icon: "success", timer: 1500 });
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedInRombel.length === 0 || !selectedRombel) return;
    
    const { value: reason } = await Swal.fire({
      title: "Non-Aktifkan Siswa",
      input: "select",
      inputOptions: {
        "berhenti": "Berhenti Sekolah",
        "pindah": "Pindah Sekolah",
        "cuti": "Cuti",
        "skorsing": "Skorsing"
      },
      inputPlaceholder: "Pilih alasan",
      showCancelButton: true,
      confirmButtonText: "Proses",
      confirmButtonColor: "#ef4444",
      background: "#0f172a",
      color: "#f1f5f9"
    });

    if (!reason) return;

    setIsProcessing(true);
    try {
      const manageFn = httpsCallable(functions, "manageRombel");
      const students = currentRombelStudents
        .filter(s => selectedInRombel.includes(s.id))
        .map(s => ({ id: s.id, nama: s.nama, uid: s.uid }));

      await manageFn({
        npsn,
        action: "deactivate",
        tahunAjaran,
        classId: selectedRombel.classId,
        students,
        reason
      });
      
      setSelectedInRombel([]);
      Swal.fire({ title: "Berhasil", text: `${students.length} Siswa dinonaktifkan.`, icon: "success", timer: 1500 });
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkGraduate = async () => {
    if (selectedInRombel.length === 0 || !selectedRombel) return;

    const result = await Swal.fire({
      title: "Luluskan Siswa?",
      text: `Siswa yang dipilih akan dipindahkan ke daftar lulusan tahun ${formatTA(tahunAjaran)}.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Luluskan",
      confirmButtonColor: "#10b981",
      background: "#0f172a",
      color: "#f1f5f9"
    });

    if (!result.isConfirmed) return;

    setIsProcessing(true);
    try {
      const manageFn = httpsCallable(functions, "manageRombel");
      const students = currentRombelStudents
        .filter(s => selectedInRombel.includes(s.id))
        .map(s => ({ id: s.id, nama: s.nama, uid: s.uid }));

      await manageFn({
        npsn,
        action: "graduate",
        tahunAjaran,
        classId: selectedRombel.classId,
        students
      });
      
      setSelectedInRombel([]);
      Swal.fire({ title: "Berhasil", text: `${students.length} Siswa telah lulus.`, icon: "success", timer: 1500 });
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddClassReference = async () => {
    if (!newClassName.trim()) return;
    const classId = newClassName.trim();
    try {
      const manageRefFn = httpsCallable(functions, "manageClassroomReference");
      await manageRefFn({
        npsn,
        classId,
        className: classId
      });
      
      setNewClassName("");
      Swal.fire({ title: "Berhasil", text: "Referensi kelas ditambahkan", icon: "success", timer: 1000, showConfirmButton: false });
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    }
  };

  const filteredRombel = rombelList.filter(r => 
    r.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.classId.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              className="bg-transparent text-white font-bold text-xs uppercase tracking-widest focus:outline-none cursor-pointer [&>option]:bg-slate-900"
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
            >
              {[2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={y.toString()} className="bg-slate-900">{y}/{y+1}</option>
              ))}
            </select>
          </div>
          
          <Link
            href={`/school/${npsn}/archive`}
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-black rounded-2xl transition-all flex items-center gap-2 border border-slate-800 text-xs uppercase tracking-widest"
          >
            <Archive className="w-4 h-4" /> Arsip
          </Link>
          
          <button 
            onClick={() => setIsClassModalOpen(true)}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl transition-all flex items-center gap-2 border border-slate-700 text-xs uppercase tracking-widest"
          >
            <Database className="w-4 h-4" /> Referensi Kelas
          </button>
        </div>
      </header>

      <main className="p-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* LEFT COLUMN: UNROMBEL BOX */}
        <section className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden flex flex-col h-[calc(100vh-200px)] sticky top-32 shadow-2xl">
            <div className="p-6 border-b border-slate-800 bg-slate-950/40">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-xs uppercase tracking-widest text-white">Siswa Tanpa Rombel</h3>
                <span className="px-3 py-1 bg-indigo-600/10 text-indigo-400 rounded-full text-[10px] font-black">{unrombelList.length}</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Cari siswa..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
                  value={unrombelSearchQuery}
                  onChange={(e) => setUnrombelSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900/30">
              {unrombelList.length === 0 ? (
                <div className="py-20 text-center space-y-4">
                  <HelpCircle className="w-10 h-10 text-slate-800 mx-auto" />
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Semua siswa sudah masuk rombel</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-900 z-10">
                    <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">
                      <th className="pl-6 py-3 w-10">
                        <button 
                          onClick={() => {
                            if (selectedInUnrombel.length === unrombelList.length) setSelectedInUnrombel([]);
                            else setSelectedInUnrombel(unrombelList.map(s => s.id));
                          }}
                          className="hover:text-white transition-colors"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                        </button>
                      </th>
                      <th className="px-3 py-3">Nama Siswa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {unrombelList
                      .filter(s => s.nama.toLowerCase().includes(unrombelSearchQuery.toLowerCase()) || s.id.includes(unrombelSearchQuery))
                      .map(s => (
                        <tr 
                          key={s.id} 
                          onClick={() => {
                            setSelectedInUnrombel(prev => 
                              prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                            )
                          }}
                          className={`group transition-all cursor-pointer ${
                            selectedInUnrombel.includes(s.id) ? "bg-indigo-600/20" : "hover:bg-slate-800/40"
                          }`}
                        >
                          <td className="pl-6 py-2.5">
                            {selectedInUnrombel.includes(s.id) ? <CheckSquare className="w-3.5 h-3.5 text-indigo-400" /> : <Square className="w-3.5 h-3.5 text-slate-800 group-hover:text-slate-600" />}
                          </td>
                          <td className="px-3 py-2.5 overflow-hidden">
                            <p className={`font-bold text-[11px] truncate ${selectedInUnrombel.includes(s.id) ? "text-white" : "text-slate-400 group-hover:text-slate-200"}`}>{s.nama}</p>
                            <p className="text-[8px] font-mono text-slate-600 uppercase tracking-tighter">{s.id}</p>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>

            {selectedInUnrombel.length > 0 && (
              <div className="p-4 bg-slate-950 border-t border-slate-800">
                <button 
                  onClick={() => setIsEnrollModalOpen(true)}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20"
                >
                  <UserPlus className="w-4 h-4" /> Masukkan ke Rombel ({selectedInUnrombel.length})
                </button>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: ROMBEL LIST */}
        <section className="lg:col-span-3 space-y-8">
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

          <div className="bg-slate-900 border border-slate-800 rounded-[32px] overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800 bg-slate-950/50">
                  <th className="px-8 py-5">Nama Rombel</th>
                  <th className="px-8 py-5 text-center">Jumlah Siswa</th>
                  <th className="px-8 py-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredRombel.map((item) => (
                  <tr 
                    key={item.classId}
                    onClick={() => {
                      if (selectedInUnrombel.length > 0) {
                        handleBulkEnroll(item.classId);
                      } else {
                        setSelectedRombel(item);
                      }
                    }}
                    className={`group transition-all cursor-pointer hover:bg-slate-800/30 ${
                      selectedInUnrombel.length > 0 ? "bg-indigo-600/5" : ""
                    }`}
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                          selectedInUnrombel.length > 0 
                            ? "bg-indigo-600 text-white animate-pulse" 
                            : "bg-slate-800 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white"
                        }`}>
                          {selectedInUnrombel.length > 0 ? <UserPlus className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-black text-white">{item.className}</p>
                          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">ID: {item.classId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-950 border border-slate-800 rounded-full text-xs font-bold text-slate-400">
                        <Users className="w-3.5 h-3.5" />
                        {item.studentCount}
                      </div>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <button className={`p-2 rounded-xl transition-all ${
                        selectedInUnrombel.length > 0 
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                          : "bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700"
                      }`}>
                        {selectedInUnrombel.length > 0 ? <Plus className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredRombel.length === 0 && (
            <div className="py-40 text-center">
              <BookOpen className="w-20 h-20 text-slate-800 mx-auto mb-6" />
              <h2 className="text-xl font-black text-slate-700 uppercase tracking-widest">Tidak Ada Rombel Aktif</h2>
              <p className="text-slate-600 mt-2">Belum ada kelas yang memiliki siswa pada tahun ajaran ini.</p>
            </div>
          )}
        </section>
      </main>

      {/* MODAL: DAFTAR SISWA DALAM ROMBEL */}
      <AnimatePresence>
        {selectedRombel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedRombel(null)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600/20 rounded-2xl text-indigo-400"><Users className="w-6 h-6" /></div>
                  <div>
                    <h2 className="text-xl font-black text-white">{selectedRombel.className}</h2>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">TA {formatTA(tahunAjaran)} • {loadingStudents ? "Memuat..." : `${currentRombelStudents.length} Siswa`}</p>
                  </div>
                </div>
                <button onClick={() => { setSelectedRombel(null); setSelectedInRombel([]); setCurrentRombelStudents([]); }} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-6 bg-slate-900 border-b border-slate-800 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Cari siswa di rombel ini..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-indigo-500 transition-all text-white text-sm"
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                  />
                </div>
                {selectedInRombel.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleBulkUnenroll}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all border border-slate-700"
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><UserMinus className="w-3 h-3" /> Keluarkan</>}
                    </button>
                    <button 
                      onClick={handleBulkDeactivate}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all border border-red-500/20 shadow-lg shadow-red-500/10"
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><UserX className="w-3 h-3" /> Non-Aktif</>}
                    </button>
                    <button 
                      onClick={handleBulkGraduate}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center gap-2 transition-all border border-emerald-500/20 shadow-lg shadow-emerald-500/10"
                    >
                      {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Award className="w-3 h-3" /> Luluskan</>}
                    </button>
                    <span className="ml-2 px-3 py-1 bg-indigo-600 text-white rounded-full text-[10px] font-black">{selectedInRombel.length}</span>
                  </div>
                )}
              </div>

              <div className="overflow-y-auto p-4 custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-800">
                      <th className="px-6 py-4 w-12">
                        <button 
                          onClick={() => {
                            if (selectedInRombel.length === currentRombelStudents.length) setSelectedInRombel([]);
                            else setSelectedInRombel(currentRombelStudents.map(s => s.id));
                          }}
                          className="text-slate-500 hover:text-white transition-colors"
                        >
                          <CheckSquare className="w-4 h-4" />
                        </button>
                      </th>
                      <th className="px-6 py-4">Nama Siswa</th>
                      <th className="px-6 py-4">ID/NISN</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {currentRombelStudents
                      .filter((s: any) => s.nama.toLowerCase().includes(studentSearchQuery.toLowerCase()))
                      .map((s: any) => (
                        <tr 
                          key={s.id} 
                          onClick={() => setSelectedInRombel(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}
                          className={`group transition-all cursor-pointer ${selectedInRombel.includes(s.id) ? "bg-indigo-600/10" : "hover:bg-slate-800/30"}`}
                        >
                          <td className="px-6 py-4">
                            {selectedInRombel.includes(s.id) ? <CheckSquare className="w-4 h-4 text-indigo-400" /> : <Square className="w-4 h-4 text-slate-700" />}
                          </td>
                          <td className="px-6 py-4 font-bold text-white text-sm">{s.nama}</td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{s.id}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: PILIH ROMBEL UNTUK ENROLL (BULK) */}
      <AnimatePresence>
        {isEnrollModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEnrollModalOpen(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-slate-900 border border-slate-800 w-full max-w-md rounded-[40px] p-10 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-white mb-2">Pilih Rombel Tujuan</h2>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-8">Memasukkan {selectedInUnrombel.length} siswa terpilih.</p>
              
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {rombelList.map(r => (
                  <button 
                    key={r.classId}
                    disabled={isProcessing}
                    onClick={() => handleBulkEnroll(r.classId)}
                    className="w-full p-6 bg-slate-950 border border-slate-800 rounded-3xl hover:border-indigo-500 transition-all flex items-center justify-between group active:scale-95"
                  >
                    <div className="text-left">
                      <p className="font-black text-white">{r.className}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{r.studentCount} Siswa Saat Ini</p>
                    </div>
                    <ArrowRightCircle className="w-6 h-6 text-slate-700 group-hover:text-indigo-400 transition-colors" />
                  </button>
                ))}
                
                <div className="pt-4 border-t border-slate-800 mt-4">
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4">Atau Pilih dari Referensi Kelas</p>
                   {Object.entries(classRef).filter(([id]) => !rombelList.some(r => r.classId === id)).map(([id, val]: [string, any]) => (
                     <button 
                        key={id}
                        onClick={() => handleBulkEnroll(id)}
                        className="w-full p-4 mb-2 bg-slate-900/50 border border-slate-800 rounded-2xl hover:border-emerald-500 transition-all flex items-center justify-between group"
                     >
                        <span className="font-bold text-slate-300 text-sm">{val.className}</span>
                        <Plus className="w-4 h-4 text-slate-600 group-hover:text-emerald-500" />
                     </button>
                   ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: REFERENSI KELAS */}
      <AnimatePresence>
        {isClassModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsClassModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, x: 50 }} animate={{ scale: 1, opacity: 1, x: 0 }} exit={{ scale: 0.9, opacity: 0, x: 50 }}
              className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-600/20 rounded-2xl text-indigo-400"><Database className="w-6 h-6" /></div>
                  <h2 className="text-xl font-black text-white">Referensi Kelas</h2>
                </div>
                <button onClick={() => setIsClassModalOpen(false)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-all"><X className="w-6 h-6" /></button>
              </div>

              <div className="p-8 space-y-6 flex flex-col h-full overflow-hidden">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Nama Kelas Baru (Max 12)..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-all text-white font-mono uppercase tracking-widest text-sm"
                    value={newClassName}
                    maxLength={12}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/\s/g, '-').replace(/[^A-Z0-9-]/g, '');
                      setNewClassName(val);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddClassReference()}
                  />
                  <button onClick={handleAddClassReference} className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all"><PlusCircle className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                  {Object.entries(classRef)
                    .filter(([_, val]: any) => val.className.toLowerCase().includes(newClassName.toLowerCase()))
                    .map(([id, val]: [string, any]) => (
                      <div key={id} className="flex items-center justify-between p-4 bg-slate-950/50 border border-slate-800 rounded-2xl group transition-all">
                        <div className="flex-1">
                          {editingClassId === id ? (
                            <input 
                              autoFocus
                              className="w-full bg-slate-900 border border-indigo-500 rounded-lg px-3 py-1 text-white text-sm font-mono uppercase focus:outline-none"
                              value={editClassName}
                              maxLength={12}
                              onChange={(e) => setEditClassName(e.target.value.toUpperCase().replace(/\s/g, '-').replace(/[^A-Z0-9-]/g, ''))}
                              onBlur={() => {
                                if (editClassName !== val.className) {
                                  // Save changes
                                  const manageRefFn = httpsCallable(functions, "manageClassroomReference");
                                  manageRefFn({ npsn, classId: id, className: editClassName });
                                }
                                setEditingClassId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') e.currentTarget.blur();
                                if (e.key === 'Escape') setEditingClassId(null);
                              }}
                            />
                          ) : (
                            <>
                              <p className="font-bold text-white text-sm">{val.className}</p>
                              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">{id}</p>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all ml-4">
                          {editingClassId !== id && (
                            <button 
                              onClick={() => {
                                setEditingClassId(id);
                                setEditClassName(val.className);
                              }}
                              className="p-2 text-slate-600 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
}
