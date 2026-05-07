"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { School, ArrowLeft, Send } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    schoolName: "",
    adminEmail: "",
    adminName: "",
    schoolAddress: "",
    phone: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting:", formData);
    alert("Pendaftaran berhasil dikirim! Menunggu persetujuan Owner.");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[30%] h-[30%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <nav className="p-6">
        <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
        </Link>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 backdrop-blur-sm"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-indigo-600 rounded-2xl">
              <School className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Pendaftaran Sekolah Baru</h1>
              <p className="text-slate-400 text-sm">Lengkapi data untuk inisialisasi sistem sekolah Anda.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Nama Sekolah</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Contoh: SMA Negeri 1 Jakarta"
                  value={formData.schoolName}
                  onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Nama Admin Utama</label>
                <input
                  type="text"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Nama Lengkap"
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Email Admin (Untuk Login)</label>
              <input
                type="email"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="admin@sekolah.com"
                value={formData.adminEmail}
                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Nomor WhatsApp / Telepon</label>
              <input
                type="tel"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="0812xxxxxxxx"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Alamat Sekolah</label>
              <textarea
                required
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Alamat lengkap sekolah..."
                value={formData.schoolAddress}
                onChange={(e) => setFormData({ ...formData, schoolAddress: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              Kirim Pendaftaran <Send className="w-4 h-4" />
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-500 leading-relaxed">
            Dengan mendaftar, Anda menyetujui Syarat dan Ketentuan penggunaan layanan Aplikasi Sekolah. 
            Data Anda akan diverifikasi oleh Owner sebelum sistem diaktifkan.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
