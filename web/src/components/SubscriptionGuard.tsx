"use client";

import React, { useEffect, useState } from "react";
import { auth, rtdb } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, LogOut, ShieldAlert, Clock } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

export default function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const [status, setStatus] = useState<any>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const regRef = ref(rtdb, `registrations/${user.uid}`);
        const unsubscribeRtdb = onValue(regRef, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            setStatus(data);

            const isExpired = data.expireAt && data.expireAt < Date.now();
            const isDeactivated = data.planStatus === "deactivated";
            const isInactive = data.status === "inactive";

            if (isExpired || isDeactivated || isInactive) {
              setIsBlocked(true);
            } else {
              setIsBlocked(false);
            }
          }
          setIsLoading(false);
        });

        return () => unsubscribeRtdb();
      } else {
        setIsLoading(false);
        setIsBlocked(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (isLoading) return <>{children}</>;

  return (
    <>
      <AnimatePresence>
        {isBlocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[40px] p-10 text-center shadow-2xl shadow-red-500/10"
            >
              <div className="inline-flex p-5 bg-red-500/10 text-red-500 rounded-3xl mb-6">
                {status?.planStatus === "deactivated" || status?.status === "inactive" ? (
                  <ShieldAlert className="w-12 h-12" />
                ) : (
                  <Clock className="w-12 h-12" />
                )}
              </div>
              
              <h2 className="text-2xl font-bold text-white mb-3">
                {status?.planStatus === "deactivated" || status?.status === "inactive" 
                  ? "Akses Layanan Terhenti" 
                  : "Masa Layanan Habis"}
              </h2>
              
              <p className="text-slate-400 mb-8 leading-relaxed">
                {status?.planStatus === "deactivated" || status?.status === "inactive"
                  ? `Layanan untuk sekolah **${status?.schoolName}** telah dinonaktifkan oleh administrator pusat.`
                  : `Masa berlaku layanan **${status?.plan?.toUpperCase()}** untuk sekolah **${status?.schoolName}** telah berakhir pada ${new Date(status?.expireAt).toLocaleDateString('id-ID')}.`}
                <br /><br />
                Silakan hubungi Owner atau Administrator untuk melakukan perpanjangan layanan.
              </p>

              <button
                onClick={handleLogout}
                className="w-full py-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" /> Keluar dari Sistem
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </>
  );
}
