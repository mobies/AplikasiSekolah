"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  Users,
  Search,
  ArrowLeft,
  Loader2,
  GraduationCap,
  Filter,
  Eye,
  X,
  Save,
  MapPin,
  Calendar,
  Phone,
  Mail,
  User,
  Camera,
  Droplets,
  Transgender,
  Upload
} from "lucide-react";
import { rtdb, functions, storage } from "@/lib/firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { httpsCallable } from "firebase/functions";
import { ref as stRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import Swal from "sweetalert2";
import dynamic from "next/dynamic";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { 
  ssr: false,
  loading: () => <div className="w-full h-[300px] bg-slate-900 animate-pulse rounded-[32px] flex items-center justify-center text-slate-700 font-black uppercase tracking-widest text-[10px]">Memuat Peta...</div>
});

export default function StudentsPage() {
  const params = useParams();
  const npsn = params.npsn as string;

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [searchAll, setSearchAll] = useState(false);

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Detail Modal States
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState<any>(null);
  const [studentEmail, setStudentEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Address Selection States
  const [provinces, setProvinces] = useState<any[]>([]);
  const [regencies, setRegencies] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [villages, setVillages] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const studentsRef = dbRef(rtdb, `schools/students/${npsn}`);
    const unsubscribe = onValue(studentsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.entries(data).map(([nisnKey, val]: [string, any]) => ({
          nisn: nisnKey.startsWith("NONISN_") ? "" : nisnKey,
          id: nisnKey, // Original key for DB reference
          ...val
        }));
        setStudents(list);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [npsn]);

  // Fetch detail data when student is selected
  useEffect(() => {
    if (!selectedStudent || !isDetailModalOpen) return;

    const detailRef = dbRef(rtdb, `schools/detail/students/${npsn}/${selectedStudent.id}`);
    const unsubscribe = onValue(detailRef, (snap) => {
      const data = snap.exists() ? snap.val() : {
        pob: "", dob: "", blood_type: "", gender: "",
        address: { street: "", province: "", city: "", district: "", village: "", rt: "", rw: "", map: "" }
      };
      // Handle legacy rtrw if exists
      if (data.address && data.address.rtrw && !data.address.rt) {
        const [rt, rw] = data.address.rtrw.split("/");
        data.address.rt = rt || "";
        data.address.rw = rw || "";
      }
      setDetailData(data);
    });

    return () => unsubscribe();
  }, [npsn, selectedStudent, isDetailModalOpen]);

  const [isAddrLoading, setIsAddrLoading] = useState(false);

  // Fetch Provinces
  useEffect(() => {
    if (!isDetailModalOpen) return;
    setIsAddrLoading(true);
    // Try raw github with gh-pages branch as it contains the api/ folder
    fetch("https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/gh-pages/api/provinces.json")
      .then(res => res.ok ? res.json() : Promise.reject("404 on GH Raw"))
      .then(data => {
        setProvinces(data);
      })
      .catch(err => {
        console.warn("Retrying with gh.io...", err);
        return fetch("https://emsifa.github.io/api-wilayah-indonesia/api/provinces.json")
          .then(res => res.json())
          .then(setProvinces);
      })
      .catch(err => console.error("Provinces fetch failed finally:", err))
      .finally(() => setIsAddrLoading(false));
  }, [isDetailModalOpen]);

  // Auto-fetch child regions if initial data exists
  useEffect(() => {
    if (!isDetailModalOpen || !detailData?.address || !provinces.length) return;
    
    const prov = provinces.find(p => p.name === detailData.address.province);
    if (prov) {
      fetch(`https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/gh-pages/api/regencies/${prov.id}.json`)
        .then(res => res.json())
        .then(regs => {
          setRegencies(regs);
          const reg = regs.find((r: any) => r.name === detailData.address.city);
          if (reg) {
            fetch(`https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/gh-pages/api/districts/${reg.id}.json`)
              .then(res => res.json())
              .then(dists => {
                setDistricts(dists);
                const dist = dists.find((d: any) => d.name === detailData.address.district);
                if (dist) {
                  fetch(`https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/gh-pages/api/villages/${dist.id}.json`)
                    .then(res => res.json())
                    .then(setVillages);
                }
              });
          }
        });
    }
  }, [isDetailModalOpen, provinces, !!detailData?.address?.province]);

  // Cascading Address Fetchers (for manual changes)
  const fetchRegencies = async (provId: string) => {
    if (!provId) return;
    setIsAddrLoading(true);
    try {
      const res = await fetch(`https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/gh-pages/api/regencies/${provId}.json`);
      if (res.ok) setRegencies(await res.json());
      else throw new Error("404");
    } catch (err) { 
      console.warn("Regencies fallback to gh.io");
      fetch(`https://emsifa.github.io/api-wilayah-indonesia/api/regencies/${provId}.json`)
        .then(res => res.json()).then(setRegencies).catch(console.error);
    }
    finally { setIsAddrLoading(false); }
  };

  const fetchDistricts = async (regId: string) => {
    if (!regId) return;
    setIsAddrLoading(true);
    try {
      const res = await fetch(`https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/gh-pages/api/districts/${regId}.json`);
      if (res.ok) setDistricts(await res.json());
      else throw new Error("404");
    } catch (err) { 
      fetch(`https://emsifa.github.io/api-wilayah-indonesia/api/districts/${regId}.json`)
        .then(res => res.json()).then(setDistricts).catch(console.error);
    }
    finally { setIsAddrLoading(false); }
  };

  const fetchVillages = async (distId: string) => {
    if (!distId) return;
    setIsAddrLoading(true);
    try {
      const res = await fetch(`https://raw.githubusercontent.com/emsifa/api-wilayah-indonesia/gh-pages/api/villages/${distId}.json`);
      if (res.ok) setVillages(await res.json());
      else throw new Error("404");
    } catch (err) { 
      fetch(`https://emsifa.github.io/api-wilayah-indonesia/api/villages/${distId}.json`)
        .then(res => res.json()).then(setVillages).catch(console.error);
    }
    finally { setIsAddrLoading(false); }
  };

  // Fetch email from /users path when student is selected
  useEffect(() => {
    if (!selectedStudent?.uid || !isDetailModalOpen) {
      setStudentEmail("No Email");
      return;
    }

    const emailRef = dbRef(rtdb, `users/${npsn}/${selectedStudent.uid}/email`);
    const unsubscribe = onValue(emailRef, (snap) => {
      setStudentEmail(snap.val() || "No Email");
    });

    return () => unsubscribe();
  }, [npsn, selectedStudent, isDetailModalOpen]);

  const uniqueClasses = Array.from(new Set(students.map(s => s.classId))).filter(c => typeof c === 'string' && c !== "").sort();

  const filteredStudents = useMemo(() => {
    if (!searchAll && !selectedClass) return [];
    return students.filter(s => {
      const sNama = (s.nama || "").toLowerCase();
      const sNisn = (s.nisn || "").toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchSearch = sNama.includes(q) || sNisn.includes(q);
      const matchClass = searchAll || s.classId === selectedClass;
      return matchSearch && matchClass;
    });
  }, [students, searchQuery, selectedClass, searchAll]);

  const processImage = (file: File, targetWidth: number, targetHeight: number, quality = 0.8): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const targetRatio = targetWidth / targetHeight;
        const imgRatio = img.width / img.height;
        
        let sourceX = 0, sourceY = 0, sourceWidth = img.width, sourceHeight = img.height;

        if (imgRatio > targetRatio) {
          // Image is wider than target ratio -> crop sides (center)
          sourceWidth = img.height * targetRatio;
          sourceX = (img.width - sourceWidth) / 2;
        } else {
          // Image is taller than target ratio -> crop top/bottom (center)
          sourceHeight = img.width / targetRatio;
          sourceY = (img.height - sourceHeight) / 2;
        }

        ctx?.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
        canvas.toBlob((blob) => resolve(blob!), "image/webp", quality);
      };
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;

    setIsUploading(true);
    try {
      // Process Main (3:4) & Thumb (1:1)
      const [photoBlob, thumbBlob] = await Promise.all([
        processImage(file, 300, 400, 0.8), // 3:4 Ratio
        processImage(file, 60, 60, 0.7)    // 1:1 Ratio
      ]);

      const photoRef = stRef(storage, `uploads/foto/siswa/${npsn}/${selectedStudent.id}`);
      const thumbRef = stRef(storage, `uploads/thumb/siswa/${npsn}/${selectedStudent.id}`);
      const metadata = { cacheControl: 'public,max-age=604800' };

      const [photoUrl, thumbUrl] = await Promise.all([
        uploadBytes(photoRef, photoBlob, metadata).then(() => getDownloadURL(photoRef)),
        uploadBytes(thumbRef, thumbBlob, metadata).then(() => getDownloadURL(thumbRef))
      ]);
      
      // Update UI state
      const updatedStudent = { ...selectedStudent, foto_path: photoUrl, thumb_path: thumbUrl };
      setSelectedStudent(updatedStudent);

      // Update DB immediately for photo paths (Real-time sync)
      const updateFn = httpsCallable(functions, "updateStudentDetail");
      await updateFn({
        npsn,
        nisn: selectedStudent.id,
        masterData: {
          foto_path: photoUrl,
          thumb_path: thumbUrl
        }
      });
      
      Swal.fire({ title: "Foto Diperbarui", text: "Foto profil & thumbnail telah disinkronkan.", icon: "success", timer: 1500, showConfirmButton: false });
    } catch (error: any) {
      Swal.fire("Gagal Upload", error.message, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveDetail = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      const updateFn = httpsCallable(functions, "updateStudentDetail");
      await updateFn({
        npsn,
        nisn: selectedStudent.id,
        masterData: {
          nama: selectedStudent.nama,
          phone: selectedStudent.phone,
          foto_path: selectedStudent.foto_path,
          thumb_path: selectedStudent.thumb_path
        },
        detailData
      });
      Swal.fire({ title: "Berhasil", text: "Data siswa telah diperbarui.", icon: "success", timer: 1500 });
      setIsDetailModalOpen(false);
    } catch (error: any) {
      Swal.fire("Error", error.message, "error");
    } finally {
      setIsSaving(false);
    }
  };

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
            <p className="text-sm text-slate-500 font-medium">Daftar siswa terdaftar per kelas.</p>
          </div>
        </div>
      </header>

      <main className="p-10 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row flex-1 max-w-2xl w-full gap-4 items-center">
            <div className="relative group flex-1 w-full">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <input
                type="text"
                placeholder="Cari nama atau NISN siswa..."
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-14 pr-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-medium shadow-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <button 
              onClick={() => setSearchAll(!searchAll)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl border transition-all whitespace-nowrap font-bold text-[10px] uppercase tracking-widest ${
                searchAll 
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20" 
                  : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
              }`}
            >
              <div className={`w-8 h-4 rounded-full relative transition-colors ${searchAll ? "bg-white/20" : "bg-slate-800"}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all ${searchAll ? "right-0.5 bg-white" : "left-0.5 bg-slate-600"}`} />
              </div>
              Cari Semua Kelas
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {!searchAll && (
              <>
                <Filter className="w-5 h-5 text-slate-500" />
                <select
                  className="bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all text-white font-bold text-xs uppercase tracking-widest appearance-none cursor-pointer [&>option]:bg-slate-900"
                  value={selectedClass || ""}
                  onChange={(e) => setSelectedClass(e.target.value || null)}
                >
                  <option value="">- Pilih Kelas -</option>
                  {uniqueClasses.map(c => (
                    <option key={c} value={c} className="bg-slate-900">{c === "UNROBEL" ? "Belum Terbagi Kelas" : c}</option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-[40px] overflow-hidden shadow-2xl">
          {!selectedClass && !searchAll ? (
            <div className="py-40 text-center">
              <Filter className="w-20 h-20 text-slate-800 mx-auto mb-6" />
              <h2 className="text-xl font-black text-slate-700 uppercase tracking-widest">Pilih Kelas</h2>
              <p className="text-slate-600 mt-2">Pilih kelas atau aktifkan "Cari Semua Kelas" untuk menampilkan data.</p>
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/40">
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Siswa</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">NISN</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Kelas</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-right">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-all overflow-hidden border border-indigo-500/20 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (student.foto_path) setPreviewPhoto(student.foto_path);
                            }}
                          >
                            {student.thumb_path || student.foto_path ? (
                              <img src={student.thumb_path || student.foto_path} alt={student.nama} className="w-full h-full object-cover" />
                            ) : (student.nama || "?").charAt(0)}
                          </div>
                          <span className="font-bold text-white">{student.nama}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-mono text-xs text-slate-400">{student.nisn || "-"}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${student.classId === 'UNROBEL' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                          {student.classId === 'UNROBEL' ? "Belum Ada Kelas" : student.classId}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => { setSelectedStudent(student); setIsDetailModalOpen(true); }}
                          className="p-3 hover:bg-indigo-600 hover:text-white rounded-xl text-indigo-400 transition-all border border-transparent hover:border-indigo-400/50 active:scale-95"
                        >
                          <Eye className="w-5 h-5" />
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
                  <p className="text-slate-600 mt-2">Belum ada siswa di kelas ini.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* STUDENT DETAIL MODAL */}
      <AnimatePresence>
        {isDetailModalOpen && selectedStudent && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 md:p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDetailModalOpen(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-slate-900 border border-slate-800 w-full max-w-5xl max-h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/50 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Detail Siswa</h2>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Update Data Master & Pendukung</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={handleSaveDetail}
                    disabled={isSaving || isUploading}
                    className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl transition-all shadow-xl shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  </button>
                  <button onClick={() => setIsDetailModalOpen(false)} className="p-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-slate-400 transition-all border border-slate-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {/* Photo & Basic Info */}
                  <div className="space-y-6">
                    <div className="relative group">
                      <div className="aspect-[3/4] rounded-[32px] overflow-hidden bg-slate-950 border-2 border-slate-800 group-hover:border-indigo-500 transition-all flex items-center justify-center">
                        {isUploading ? (
                          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
                        ) : selectedStudent.foto_path ? (
                          <img src={selectedStudent.foto_path} alt={selectedStudent.nama} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-20 h-20 text-slate-800" />
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all bg-slate-950/60 backdrop-blur-sm rounded-[32px] p-6 text-center flex-col gap-2 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Camera className="w-8 h-8 text-white mb-2" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Ubah Foto</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nama Lengkap</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500 transition-all outline-none text-sm"
                          value={selectedStudent.nama}
                          onChange={(e) => setSelectedStudent({...selectedStudent, nama: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">NISN (Fixed)</label>
                        <input type="text" readOnly className="w-full bg-slate-800/50 border border-slate-800 rounded-2xl px-5 py-3 text-slate-500 font-mono text-xs outline-none cursor-not-allowed" value={selectedStudent.nisn || "-"} />
                      </div>
                    </div>
                  </div>

                  {/* Contact & Detail */}
                  <div className="lg:col-span-2 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Mail className="w-3 h-3"/> Email (Fixed)</label>
                        <input type="text" readOnly className="w-full bg-slate-800/50 border border-slate-800 rounded-2xl px-5 py-3 text-slate-500 font-bold text-xs outline-none cursor-not-allowed" value={studentEmail} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Phone className="w-3 h-3"/> Phone / WA</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500 transition-all outline-none text-sm"
                          value={selectedStudent.phone || ""}
                          onChange={(e) => setSelectedStudent({...selectedStudent, phone: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="h-px bg-slate-800 w-full" />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tempat Lahir</label>
                        <input 
                          type="text" 
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500 transition-all outline-none text-sm placeholder:text-slate-700"
                          placeholder="CONTOH: JAKARTA"
                          value={detailData?.pob || ""}
                          onChange={(e) => setDetailData({...detailData, pob: e.target.value.toUpperCase()})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Tgl Lahir (DD/MM/YYYY)</label>
                        <input 
                          type="text" 
                          placeholder="DD/MM/YYYY"
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500 transition-all outline-none text-sm placeholder:text-slate-700"
                          value={detailData?.dob || ""}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, "");
                            if (val.length > 8) val = val.slice(0, 8);
                            let formatted = val;
                            if (val.length > 2) formatted = val.slice(0, 2) + "/" + val.slice(2);
                            if (val.length > 4) formatted = val.slice(0, 2) + "/" + val.slice(2, 4) + "/" + val.slice(4);
                            setDetailData({...detailData, dob: formatted});
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Droplets className="w-3 h-3"/> Gol Darah</label>
                        <select 
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500 transition-all outline-none appearance-none text-sm"
                          value={detailData?.blood_type || ""}
                          onChange={(e) => setDetailData({...detailData, blood_type: e.target.value})}
                        >
                          <option value="">- Pilih -</option>
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="AB">AB</option>
                          <option value="O">O</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Transgender className="w-3 h-3"/> Gender</label>
                        <select 
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500 transition-all outline-none appearance-none text-sm"
                          value={detailData?.gender || ""}
                          onChange={(e) => setDetailData({...detailData, gender: e.target.value})}
                        >
                          <option value="">- Pilih -</option>
                          <option value="L">Laki-laki</option>
                          <option value="P">Perempuan</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <MapPin className="w-3 h-3 text-indigo-500" /> Data Alamat Lengkap
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2 col-span-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Nama Jalan / Alamat</label>
                          <textarea 
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500 transition-all outline-none min-h-[80px] text-sm"
                            value={detailData?.address?.street || ""}
                            onChange={(e) => setDetailData({...detailData, address: {...detailData.address, street: e.target.value}})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Provinsi</label>
                          <select 
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500 outline-none text-sm appearance-none"
                            value={provinces.find(p => p.name === detailData?.address?.province)?.id || ""}
                            onChange={(e) => {
                              const p = provinces.find(x => x.id === e.target.value);
                              setDetailData({...detailData, address: {...detailData.address, province: p?.name || "", city: "", district: "", village: ""}});
                              setRegencies([]); setDistricts([]); setVillages([]);
                              if (p) fetchRegencies(p.id);
                            }}
                          >
                            <option value="">- Pilih Provinsi -</option>
                            {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Kabupaten/Kota</label>
                          <select 
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500 outline-none text-sm appearance-none"
                            disabled={!regencies.length}
                            value={regencies.find(r => r.name === detailData?.address?.city)?.id || ""}
                            onChange={(e) => {
                              const r = regencies.find(x => x.id === e.target.value);
                              setDetailData({...detailData, address: {...detailData.address, city: r?.name || "", district: "", village: ""}});
                              setDistricts([]); setVillages([]);
                              if (r) fetchDistricts(r.id);
                            }}
                          >
                            <option value="">- Pilih Kabupaten/Kota -</option>
                            {regencies.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Kecamatan</label>
                          <select 
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500 outline-none text-sm appearance-none"
                            disabled={!districts.length}
                            value={districts.find(d => d.name === detailData?.address?.district)?.id || ""}
                            onChange={(e) => {
                              const d = districts.find(x => x.id === e.target.value);
                              setDetailData({...detailData, address: {...detailData.address, district: d?.name || "", village: ""}});
                              setVillages([]);
                              if (d) fetchVillages(d.id);
                            }}
                          >
                            <option value="">- Pilih Kecamatan -</option>
                            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Kelurahan/Desa</label>
                          <select 
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500 outline-none text-sm appearance-none"
                            disabled={!villages.length}
                            value={villages.find(v => v.name === detailData?.address?.village)?.id || ""}
                            onChange={(e) => {
                              const v = villages.find(x => x.id === e.target.value);
                              setDetailData({...detailData, address: {...detailData.address, village: v?.name || ""}});
                            }}
                          >
                            <option value="">- Pilih Kelurahan/Desa -</option>
                            {villages.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">RT</label>
                          <input 
                            type="number" 
                            placeholder="000"
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500 outline-none text-sm" 
                            value={detailData?.address?.rt || ""} 
                            onChange={(e) => setDetailData({...detailData, address: {...detailData.address, rt: e.target.value}})} 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">RW</label>
                          <input 
                            type="number" 
                            placeholder="000"
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-white font-bold focus:border-indigo-500 outline-none text-sm" 
                            value={detailData?.address?.rw || ""} 
                            onChange={(e) => setDetailData({...detailData, address: {...detailData.address, rw: e.target.value}})} 
                          />
                        </div>
                        <div className="space-y-4 col-span-2 mt-4">
                          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-indigo-500" /> Lokasi pada Map (Klik Peta untuk Memilih)
                          </label>
                          <MapPicker 
                            initialLat={(() => {
                              const match = detailData?.address?.map?.match(/q=([-+]?\d*\.?\d+),([-+]?\d*\.?\d+)/);
                              return match ? parseFloat(match[1]) : undefined;
                            })()}
                            initialLng={(() => {
                              const match = detailData?.address?.map?.match(/q=([-+]?\d*\.?\d+),([-+]?\d*\.?\d+)/);
                              return match ? parseFloat(match[2]) : undefined;
                            })()}
                            onSelect={(lat, lng) => {
                              setDetailData({
                                ...detailData,
                                address: {
                                  ...detailData.address,
                                  map: `https://www.google.com/maps?q=${lat},${lng}`
                                }
                              });
                            }}
                          />
                          <div className="flex items-center gap-3 px-5 py-3 bg-slate-950 border border-slate-800 rounded-2xl">
                             <span className="text-[10px] font-mono text-slate-500 truncate flex-1">
                               {detailData?.address?.map || "Belum ada lokasi dipilih"}
                             </span>
                             {detailData?.address?.map && (
                               <a href={detailData.address.map} target="_blank" rel="noreferrer" className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300">
                                 Buka Map
                               </a>
                             )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PHOTO PREVIEW OVERLAY */}
      <AnimatePresence>
        {previewPhoto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPreviewPhoto(null)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-md w-full aspect-[3/4] rounded-[40px] overflow-hidden border-2 border-slate-800 shadow-2xl bg-slate-900"
            >
              <img src={previewPhoto} alt="Preview" className="w-full h-full object-cover" />
              <button onClick={() => setPreviewPhoto(null)} className="absolute top-6 right-6 p-3 bg-slate-950/50 hover:bg-slate-950 text-white rounded-2xl backdrop-blur-md transition-all">
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
}
