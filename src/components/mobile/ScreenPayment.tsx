"use client";

import React, { useState, useEffect } from "react";
import {
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Clock,
  QrCode,
  CheckCircle2,
  Smartphone,
  FileText,
  User,
  Phone,
  RefreshCw,
} from "lucide-react";
import { SelectedCourse, PaymentDetails, UserProfile } from "@/types/app";
import { registerStudentAndPayment } from "@/services/studentService";
import { subscribeToPaymentStatus } from "@/services/paymentService";
import { getAppSettings, fetchAppSettings, subscribeToAppSettings } from "@/services/settingsService";

interface ScreenPaymentProps {
  userProfile?: UserProfile;
  selectedCourse: SelectedCourse;
  paymentDetails: PaymentDetails;
  onSubmitPayment: (txId: string, paymentId?: string) => void;
  onGoToDashboard: () => void;
  onSimulateAdminApproval?: () => void;
  onOpenReceipt?: () => void;
  onSaveProfile?: (profile: UserProfile) => void;
}

export default function ScreenPayment({
  userProfile = { name: "", phone: "", place: "" },
  selectedCourse,
  paymentDetails,
  onSubmitPayment,
  onGoToDashboard,
  onSimulateAdminApproval,
  onSaveProfile,
}: ScreenPaymentProps) {
  const [studentName, setStudentName] = useState(userProfile.name || "");
  const [studentPhone, setStudentPhone] = useState(userProfile.phone || "");
  const [txId, setTxId] = useState(paymentDetails.upiTxId || "");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState<"unpaid" | "pending" | "verified">(
    paymentDetails.status === "verified"
      ? "verified"
      : paymentDetails.status === "pending_verification"
      ? "pending"
      : "unpaid"
  );

  const [appSettings, setAppSettings] = useState(getAppSettings());

  useEffect(() => {
    fetchAppSettings().then(setAppSettings);
    const unsubscribeSettings = subscribeToAppSettings((updated) => {
      setAppSettings(updated);
    });
    return () => unsubscribeSettings();
  }, []);

  const upiId = appSettings.upiId || "hanoonacademy@upi";

  // Subscribe to real-time status updates when a TxID is submitted
  useEffect(() => {
    if (!paymentDetails.upiTxId) return;

    const unsubscribe = subscribeToPaymentStatus(
      paymentDetails.upiTxId,
      (newStatus) => {
        if (newStatus === "APPROVED") {
          setVerifiedStatus("verified");
          if (onSimulateAdminApproval) {
            onSimulateAdminApproval();
          }
        } else if (newStatus === "REJECTED") {
          setVerifiedStatus("unpaid");
          setError("Payment was flagged or rejected by admin. Please check UTR.");
        }
      }
    );

    return () => unsubscribe();
  }, [paymentDetails.upiTxId, onSimulateAdminApproval]);

  const handleCopyUPI = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isAdaviyya = selectedCourse.id === "adaviyya" || selectedCourse.id === "athaviy";
  const payableAmount = isAdaviyya ? (selectedCourse.admissionFeeAmount || 500) : selectedCourse.feeAmount;
  const payableFeeFormatted = isAdaviyya ? (selectedCourse.admissionFee || "₹500") : selectedCourse.fee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTxId = txId.trim();

    if (!studentName.trim()) {
      setError("Please enter your Student Full Name.");
      return;
    }
    if (!studentPhone.trim() || studentPhone.trim().length < 10) {
      setError("Please enter a valid 10-digit WhatsApp number.");
      return;
    }
    if (!cleanTxId) {
      setError("Please enter the 12-digit UPI Transaction ID (TxID) / UTR.");
      return;
    }
    if (cleanTxId.length < 8) {
      setError("Transaction ID must be at least 8 to 12 digits.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    if (onSaveProfile) {
      onSaveProfile({
        name: studentName.trim(),
        phone: studentPhone.trim(),
        place: userProfile.place || "Kerala",
      });
    }

    try {
      // Register in Supabase (with resilient local storage fallback)
      const res = await registerStudentAndPayment({
        fullName: studentName.trim(),
        whatsappNum: studentPhone.trim(),
        district: userProfile.place || "Kerala",
        courseId: selectedCourse.id,
        courseTitle: selectedCourse.title,
        upiTxId: cleanTxId,
        amount: payableAmount,
      });

      setVerifiedStatus("pending");
      onSubmitPayment(cleanTxId, res.payment.id);
      if (onGoToDashboard) {
        onGoToDashboard();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed. Please check network.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isVerified = verifiedStatus === "verified" || paymentDetails.status === "verified";
  const isPending =
    !isVerified &&
    (verifiedStatus === "pending" ||
      (paymentDetails.status === "pending_verification" && Boolean(paymentDetails.upiTxId)));

  return (
    <div className="w-full max-w-md mx-auto px-5 py-6 flex-1 flex flex-col justify-start space-y-6 select-none font-['Plus_Jakarta_Sans'] bg-purple-50/40">
      {/* Top Admission Fee Summary Card */}
      <div className="neumorphic-card p-5 rounded-3xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 bg-purple-100/70 px-2.5 py-0.5 rounded-full inline-block">
              {isAdaviyya ? "Admission Fee Checkout" : "Tuition Fee Checkout"}
            </span>
            <h1 className="text-lg font-black text-slate-900 leading-tight">
              {selectedCourse.title}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {selectedCourse.duration}
            </p>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-purple-700 block tracking-tight">
              {payableFeeFormatted}
            </span>
            <span className="text-[10px] text-slate-500 font-bold">
              {isAdaviyya ? "Admission Fee (Now)" : "Full Tuition"}
            </span>
          </div>
        </div>

        {isAdaviyya && (
          <div className="p-3 rounded-2xl bg-purple-50 border border-purple-100 text-xs text-purple-900 font-medium leading-relaxed">
            💡 <strong>Pay the ₹500 admission fee now to unlock the course.</strong> Total Course Fee is ₹3,000; the balance can be paid later in installments.
          </div>
        )}
      </div>

      {/* VERIFIED SUCCESS BANNER */}
      {isVerified && (
        <div className="neumorphic-card bg-emerald-50/50 border border-emerald-200 p-5 rounded-3xl space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-emerald-900">
                Payment Approved & Enrolled!
              </h3>
              <p className="text-xs text-emerald-700 font-medium">
                Your course and interactive hubs are fully unlocked.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToDashboard}
            className="w-full py-3.5 px-4 rounded-2xl font-extrabold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
          >
            <span>Open Student Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* PENDING VERIFICATION NOTICE BANNER */}
      {isPending && !isVerified && (
        <div className="neumorphic-card bg-amber-50/40 border border-amber-200/90 p-5 rounded-3xl space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
              <span className="text-xs font-black text-amber-900 uppercase tracking-wide">
                Verification Pending
              </span>
            </div>
            <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-200 px-2.5 py-0.5 rounded-full">
              STATUS: PENDING
            </span>
          </div>

          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            Your UPI Transaction ID (<code className="font-mono font-bold text-amber-900">{paymentDetails.upiTxId || txId}</code>) is queued for Admin review in Supabase. Verification takes 5–15 mins.
          </p>

          <div className="pt-1">
            <button
              type="button"
              onClick={onGoToDashboard}
              className="w-full py-3 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <span>View Student Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* PAYMENT EXPLANATION & PROCESS CARD (When not verified) */}
      {!isVerified && (
        <div className="neumorphic-card p-5 rounded-3xl space-y-5">
          {/* Header Explanation */}
          <div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-600" />
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                Manual UPI Payment Guide
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Transfer the tuition fee directly using any UPI app (Google Pay, PhonePe, Paytm, or BHIM).
            </p>
          </div>

          {/* 4 Step Process Explanation */}
          <div className="neumorphic-inset p-3.5 rounded-2xl space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 block">
              How it Works (4 Easy Steps)
            </span>
            <div className="space-y-2 text-xs text-slate-700">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-200 text-purple-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>Open your preferred UPI App (GPay / PhonePe / Paytm / BHIM).</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-200 text-purple-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  Pay exact amount <strong className="text-purple-700">{payableFeeFormatted}</strong> to our Institute UPI ID or QR.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-200 text-purple-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>Copy the 12-digit <strong>UPI Ref No. / Transaction ID (UTR)</strong> from your payment receipt.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-200 text-purple-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <span>Paste the 12-digit TxID below and submit for instant Admin approval.</span>
              </div>
            </div>
          </div>

          {/* Official UPI ID Copy Box */}
          <div className="neumorphic-button p-4 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 block">
                Official UPI ID
              </span>
              <span className="font-mono text-sm font-black text-slate-900 select-all">
                {upiId}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyUPI}
              className="py-2 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-xs font-bold text-purple-700 flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-100 shadow-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>

          {/* Toggleable QR Code Display */}
          <div className="border border-purple-100 rounded-2xl p-3.5 bg-purple-50/30 flex flex-col items-center space-y-2">
            <button
              type="button"
              onClick={() => setShowQR((prev) => !prev)}
              className="w-full flex items-center justify-between text-xs font-bold text-purple-700 cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-purple-600" />
                <span>{showQR ? "Hide Payment QR Code" : "Show Instant Scan QR Code"}</span>
              </div>
              <span className="text-[11px] underline">
                {showQR ? "Collapse" : "View QR"}
              </span>
            </button>

            {showQR && (
              <div className="pt-2 flex flex-col items-center space-y-1.5">
                <div className="w-32 h-32 rounded-2xl bg-white border border-purple-200 p-3 flex flex-col items-center justify-center shadow-xs">
                  <QrCode className="w-20 h-20 text-purple-700" />
                  <span className="text-[8px] font-black text-purple-800 tracking-wider uppercase mt-1">
                    Scan in GPay / PhonePe
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  Scan using any UPI app camera
                </p>
              </div>
            )}
          </div>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Student Info & TxID Submission Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            {/* Student Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Student Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter student full name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* WhatsApp Number */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                WhatsApp Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="Enter 10-digit WhatsApp number"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* 12-Digit Transaction ID (UTR) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                12-Digit UPI Transaction ID (TxID / UTR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter 12-digit UPI / UTR number"
                  value={txId}
                  onChange={(e) => setTxId(e.target.value.replace(/\s+/g, ""))}
                  maxLength={24}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white font-mono text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-bold tracking-wider"
                />
              </div>
              <p className="text-[10px] text-slate-400 pt-0.5">
                Found on your payment success receipt under &quot;UPI Ref No.&quot; or &quot;UTR&quot;.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-purple-50/80 border border-purple-100 flex items-center gap-2 text-xs text-purple-800">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Instant verification linked directly to Supabase admission desk.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl font-extrabold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Submitting to Supabase...
                </span>
              ) : (
                <>
                  <span>
                    {isAdaviyya
                      ? `Submit ${payableFeeFormatted} Admission Fee for Approval`
                      : "Submit Payment for Approval"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

