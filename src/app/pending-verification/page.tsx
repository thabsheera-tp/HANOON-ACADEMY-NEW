"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ArrowRight, Home, ShieldCheck, MessageCircle } from "lucide-react";
import HanoonLogo from "@/components/brand/HanoonLogo";
import { checkActiveSupabaseSession } from "@/services/authService";

export default function PendingVerificationPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [studentName, setStudentName] = useState<string>("Student");
  const [txId, setTxId] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const evaluateAccess = async () => {
      const session = await checkActiveSupabaseSession();
      if (!isMounted) return;

      // Unauthenticated users or staff should NOT be trapped here
      if (!session || !session.user) {
        // Check if there is local pending payment record from student checkout
        const pendingRaw = localStorage.getItem("hanoon_pending_payment");
        if (!pendingRaw) {
          router.replace("/login?portal=staff");
          return;
        }
      } else {
        if (
          session.user.role === "admin" ||
          session.user.role === "super_admin" ||
          session.user.role === "verification_admin"
        ) {
          router.replace("/admin");
          return;
        }

        if (session.user.role === "teacher") {
          router.replace("/teacher");
          return;
        }
      }

      // Read pending transaction details
      try {
        const pendingRaw = localStorage.getItem("hanoon_pending_payment");
        if (pendingRaw) {
          const parsed = JSON.parse(pendingRaw);
          if (parsed.studentName) setStudentName(parsed.studentName);
          if (parsed.txId) setTxId(parsed.txId);
        }
      } catch {}

      setChecking(false);
    };

    evaluateAccess();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-purple-50/50 flex justify-center items-center font-['Plus_Jakarta_Sans'] select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-purple-700">Checking verification status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50/50 flex justify-center items-center sm:py-6 px-4 font-['Plus_Jakarta_Sans'] select-none">
      <div className="w-full max-w-md mx-auto overflow-x-hidden bg-white text-slate-900 rounded-3xl shadow-xl border border-purple-100 p-6 flex flex-col items-center text-center space-y-5">
        {/* Logo */}
        <HanoonLogo size="md" />

        {/* Pending Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        {/* Status Badge */}
        <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/70 px-3 py-1 rounded-full border border-amber-200">
          ⏳ Status: Verification Pending
        </span>

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900">
            Payment Submitted for Verification!
          </h1>
          <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
            Thank you, <strong>{studentName}</strong>! Your manual UPI transaction receipt is being audited by our verification team.
          </p>
        </div>

        {txId && (
          <div className="w-full p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-xs">
            <span className="text-slate-500 font-medium block text-[10px] uppercase tracking-wider">
              Submitted TxID / UTR
            </span>
            <span className="font-mono font-bold text-purple-900">{txId}</span>
          </div>
        )}

        <div className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 text-left space-y-1">
          <p className="font-semibold text-slate-800">What happens next?</p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-500">
            <li>Our team will match the 12-digit UPI reference with our bank statement.</li>
            <li>Once confirmed, your full curriculum access will be activated.</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="w-full space-y-2.5 pt-2">
          <a
            href={`https://wa.me/919846012345?text=${encodeURIComponent(
              `Assalamu Alaikum Admin, I have submitted my payment for verification. Student: ${studentName}${txId ? ` (TxID: ${txId})` : ""}. Please check and approve my enrollment.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Need Help? Contact Admin on WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </button>
        </div>
      </div>
    </div>
  );
}
