"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  School, 
  ShieldCheck, 
  Users, 
  CreditCard, 
  LayoutDashboard, 
  ArrowRight,
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-purple-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 rounded-lg">
                <School className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Aplikasi Sekolah
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
              <a href="#features" className="hover:text-white transition-colors">Fitur</a>
              <a href="#about" className="hover:text-white transition-colors">Tentang</a>
              <Link 
                href="/register" 
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                Daftar Sekolah <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
              Masa Depan Manajemen <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 animate-gradient-x">
                Sekolah Modern
              </span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 mb-10 leading-relaxed">
              Ekosistem pendidikan terintegrasi yang menghadirkan transparansi, 
              efisiensi, dan modernitas dalam satu platform SaaS serverless.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/register"
                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-950 font-bold rounded-xl hover:bg-indigo-50 hover:scale-105 transition-all flex items-center justify-center gap-2 group"
              >
                Mulai Pendaftaran Sekolah
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-slate-900 border border-slate-800 text-white font-bold rounded-xl hover:bg-slate-800 transition-all">
                Lihat Demo
              </button>
            </div>

            {/* Dashboard Preview Mockup */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="mt-20 relative mx-auto max-w-5xl"
            >
              <div className="relative rounded-2xl border border-slate-800 bg-slate-900/50 p-2 backdrop-blur-sm shadow-2xl">
                <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden aspect-[16/9] flex items-center justify-center">
                  <LayoutDashboard className="w-20 h-20 text-slate-800 animate-pulse" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-900/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Fitur Unggulan Level Pro</h2>
            <p className="text-slate-400">Teknologi mutakhir untuk ekosistem pendidikan yang lebih baik.</p>
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: <ShieldCheck className="w-8 h-8 text-indigo-400" />,
                title: "Multi-School SaaS",
                desc: "Isolasi data yang aman untuk setiap sekolah dalam satu infrastruktur global."
              },
              {
                icon: <CreditCard className="w-8 h-8 text-purple-400" />,
                title: "Sistem Keuangan Modern",
                desc: "Manajemen SPP, tabungan, dan marketplace terintegrasi payment gateway."
              },
              {
                icon: <Users className="w-8 h-8 text-blue-400" />,
                title: "Portal Semua Stakeholder",
                desc: "Akses khusus untuk Owner, Admin, Guru, Siswa, hingga Orang Tua."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                variants={itemVariants}
                className="p-8 rounded-2xl border border-slate-800 bg-slate-950 hover:border-indigo-500/50 transition-all group"
              >
                <div className="mb-4 p-3 bg-slate-900 rounded-xl w-fit group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Onboarding Flow Section */}
      <section className="py-24 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-bold mb-8">Pendaftaran Mudah & Cepat</h2>
              <div className="space-y-6">
                {[
                  "Isi detail profil sekolah Anda",
                  "Ajukan verifikasi ke Owner aplikasi",
                  "Approval kilat & Inisialisasi otomatis",
                  "Mulai kelola sekolah secara modern"
                ].map((step, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="mt-1">
                      <CheckCircle2 className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-slate-200">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-10">
                <Link 
                  href="/register"
                  className="inline-flex items-center gap-2 text-indigo-400 font-bold hover:text-indigo-300 transition-colors"
                >
                  Daftar sekarang <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="absolute inset-0 bg-indigo-600/20 blur-3xl rounded-full" />
              <div className="relative p-1 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-3xl overflow-hidden">
                <div className="bg-slate-950 rounded-[22px] p-8">
                  <h3 className="text-xl font-bold mb-6 text-center">Form Pendaftaran Sekolah</h3>
                  <div className="space-y-4">
                    <div className="h-10 bg-slate-900 rounded-lg animate-pulse" />
                    <div className="h-10 bg-slate-900 rounded-lg animate-pulse w-3/4" />
                    <div className="h-24 bg-slate-900 rounded-lg animate-pulse" />
                    <div className="h-10 bg-indigo-600/50 rounded-lg" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800/50 text-center">
        <p className="text-slate-500 text-sm">
          © 2026 Aplikasi Sekolah. Built with Modern Serverless Technology.
        </p>
      </footer>
    </div>
  );
}
