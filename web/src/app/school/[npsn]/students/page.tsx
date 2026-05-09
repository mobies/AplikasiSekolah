"use client";

import React, { useEffect, useState } from "react";
import { 
  Users, 
  Search, 
  ArrowLeft,
  Loader2,
  GraduationCap,
  Filter
} from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentsPage() {
  const params = useParams();
  const npsn = params.npsn as string;
  
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");

  useEffect(() => {
    const studentsRef = ref(rtdb, `schools/students/${npsn}`);
    const unsubscribe = onValue(studentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([uid, val]: [string, any]) => ({
          uid,
          ...val
        }));
        setStudents(list);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [npsn]);

  const uniqueClasses = Array.from(new Set(students.map(s => s.classId))).sort();

  const filteredStudents = students.filter(s => {
    const matchSearch = s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      s.nisn?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchClass = selectedClass === "all" || s.classId === selectedClass;
    return matchSearch && matchClass;
  });

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
            <h1 className="text-2xl font-black text-white">Data Siswa</h1>
            <p className="text-sm text-slate-500 font-medium">Daftar seluruh siswa terdaftar di sekolah.</p>
          </div>
        </div>
      </header>

      <main className="p-10 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative group flex-1 max-w-md w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Cari nama atau NISN siswa..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-14 pr-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-medium shadow-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Filter className="w-5 h-5 text-slate-500" />
            <select 
              className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-bold text-xs uppercase tracking-widest appearance-none cursor-pointer"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="all">Semua Kelas</option>
              {uniqueClasses.map(c => (
                <option key={c} value={c}>{c === "UNDEFINED_CLASS" ? "Belum Terbagi Kelas" : c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Siswa</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">NISN</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Kelas</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredStudents.map((student) => (
                <tr key={student.uid} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        {student.nama.charAt(0)}
                      </div>
                      <span className="font-bold text-white">{student.nama}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-mono text-xs text-slate-400">{student.nisn || "-"}</td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${student.classId === 'UNDEFINED_CLASS' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                      {student.classId === 'UNDEFINED_CLASS' ? "Belum Ada Kelas" : student.classId}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
                      <GraduationCap className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <div className="py-40 text-center">
              <Users className="w-20 h-20 text-slate-800 mx-auto mb-6" />
              <h2 className="text-xl font-black text-slate-700 uppercase tracking-widest">Tidak Ada Data Siswa</h2>
              <p className="text-slate-600 mt-2">Cek kembali filter atau cari nama lain.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
