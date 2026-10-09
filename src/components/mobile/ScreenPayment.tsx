"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  MessageCircle,
  Lock,
} from "lucide-react";
import { SelectedCourse, PaymentDetails, UserProfile } from "@/types/app";
import { registerStudentAndPayment } from "@/services/studentService";
import { subscribeToPaymentStatus, checkPaymentStatusByIdOrTx } from "@/services/paymentService";
import { getAppSettings, fetchAppSettings, subscribeToAppSettings, formatWhatsAppLink } from "@/services/settingsService";

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
  const router = useRouter();
  const [studentName, setStudentName] = useState(userProfile.name || "");
  const [studentPhone, setStudentPhone] = useState(userProfile.phone || "");
  const [txId, setTxId] = useState(paymentDetails.upiTxId || "");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifiedStatus, setVerifiedStatus] = useState<"unpaid" | "pending" | "verified">(
    paymentDetails.status === "verified"
      ? "verified"
      : paymentDetails.status === "pending_verification"
      ? "pending"
      : "unpaid"
  );

  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const [appSettings, setAppSettings] = useState(getAppSettings());

  useEffect(() => {
    fetchAppSettings().then(setAppSettings);
    const unsubscribeSettings = subscribeToAppSettings((updated) => {
      setAppSettings(updated);
    });
    return () => unsubscribeSettings();
  }, []);

  // Permanent hardcoded UPI Details (No environment variables or conditional fallback)
  const upiId = "mubeennk203@okhdfcbank";
  const receiverName = "Hanoon Academy";

  // Sync state if parent props update
  useEffect(() => {
    if (paymentDetails.status === "verified") {
      setVerifiedStatus("verified");
    } else if (paymentDetails.status === "pending_verification") {
      setVerifiedStatus("pending");
    }
  }, [paymentDetails.status]);

  useEffect(() => {
    if (paymentDetails.upiTxId && !txId) {
      setTxId(paymentDetails.upiTxId);
    }
  }, [paymentDetails.upiTxId]);

  // Subscribe to real-time status updates when a TxID is submitted
  useEffect(() => {
    const activeKey = paymentDetails.upiTxId || txId;
    if (!activeKey) return;

    const unsubscribe = subscribeToPaymentStatus(
      activeKey,
      (newStatus) => {
        if (newStatus === "APPROVED") {
          setVerifiedStatus("verified");
          setStatusFeedback({
            message: "🎉 Payment Approved! Your course and dashboard are now unlocked.",
            type: "success",
          });
          if (onSimulateAdminApproval) {
            onSimulateAdminApproval();
          }
        } else if (newStatus === "REJECTED") {
          setVerifiedStatus("unpaid");
          setError("Payment was flagged or rejected by admin. Please check UTR.");
          setStatusFeedback({
            message: "Payment was flagged or rejected by admin. Please check your UTR number.",
            type: "error",
          });
        }
      }
    );

    return () => unsubscribe();
  }, [paymentDetails.upiTxId, txId, onSimulateAdminApproval]);

  const handleCheckVerificationStatus = async () => {
    const targetTx = paymentDetails.upiTxId || txId;
    if (!targetTx) {
      setStatusFeedback({ message: "No transaction ID found to check.", type: "info" });
      return;
    }

    setIsCheckingStatus(true);
    setStatusFeedback(null);

    try {
      const res = await checkPaymentStatusByIdOrTx(targetTx);
      if (res) {
        if (res.status === "APPROVED" || (res.status as string) === "verified") {
          setVerifiedStatus("verified");
          setStatusFeedback({
            message: "🎉 Payment Approved! Your course and dashboard are now unlocked.",
            type: "success",
          });
          if (onSimulateAdminApproval) {
            onSimulateAdminApproval();
          }
        } else if (res.status === "REJECTED") {
          setVerifiedStatus("unpaid");
          setError(res.rejectionReason || "Payment was rejected. Please verify your TxID/UTR and try again.");
          setStatusFeedback({
            message: "Payment was flagged or rejected by admin. Please check your UTR number.",
            type: "error",
          });
        } else {
          setStatusFeedback({
            message: "⏳ Payment is currently under review by Hanoon Academy Admin. Usually takes 5–15 minutes.",
            type: "info",
          });
        }
      } else {
        setStatusFeedback({
          message: "⏳ Transaction queued in Supabase. Verification in progress.",
          type: "info",
        });
      }
    } catch {
      setStatusFeedback({
        message: "Status check completed. Real-time notifications will auto-unlock once approved.",
        type: "info",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleCopyUPI = () => {
    navigator.clipboard.writeText("mubeennk203@okhdfcbank");
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
      // Student remains on pending verification screen until payment is approved by admin
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

      {/* Permanent Official UPI Payment Details & QR Code (Unconditionally visible to all visitors) */}
      <div className="neumorphic-card p-5 rounded-3xl space-y-4 bg-white border border-purple-100 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-purple-100/70">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-purple-600" />
            <h2 className="text-sm font-black text-slate-900 tracking-tight">
              UPI Payment Details
            </h2>
          </div>
          <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Hanoon Academy
          </span>
        </div>

        {/* Permanent QR Code Display */}
        <div className="flex flex-col items-center justify-center p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-2">
          <div className="w-44 h-44 bg-white border-2 border-purple-200 p-2.5 rounded-2xl shadow-xs flex items-center justify-center overflow-hidden">
            <img
              src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3Dmubeennk203%40okhdfcbank%26pn%3DHanoon%2520Academy%26cu%3DINR"
              alt="Hanoon Academy UPI QR Code"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>
          <div className="text-center">
            <span className="text-[11px] font-extrabold text-purple-800 tracking-wide block uppercase">
              Scan with GPay • PhonePe • Paytm • BHIM
            </span>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              Account / Receiver: <strong className="text-slate-800">Hanoon Academy</strong>
            </p>
          </div>
        </div>

        {/* Official UPI ID 1-Click Copy Box */}
        <div className="p-3.5 rounded-2xl bg-white border border-purple-100 flex items-center justify-between gap-3 shadow-2xs">
          <div className="space-y-0.5 min-w-0">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-purple-600 block">
              UPI ID / Payment Address
            </span>
            <span className="font-mono text-xs sm:text-sm font-black text-slate-900 select-all block truncate">
              mubeennk203@okhdfcbank
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyUPI}
            className="py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 active:scale-95"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-white" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy ID</span>
              </>
            )}
          </button>
        </div>
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

      {/* PENDING VERIFICATION DEDICATED STATUS CARD */}
      {isPending && !isVerified && (
        <div className="neumorphic-card bg-amber-50/50 border border-amber-200/90 p-6 rounded-3xl space-y-5 animate-fade-in text-center">
          {/* Icon: ⏳ Pending Review Icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border-2 border-amber-300 text-amber-700 flex items-center justify-center mx-auto shadow-xs text-3xl select-none">
            ⏳
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 border border-amber-300 px-3 py-1 rounded-full inline-block">
              Status: Verification Pending
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              Payment Submitted for Verification!
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto font-medium">
            Thank you! Your UPI Transaction ID has been sent to Hanoon Academy Admin for review. Your course dashboard and study materials will automatically unlock once verified.
          </p>

          {/* Transaction Metadata Card */}
          <div className="p-4 rounded-2xl bg-white border border-amber-200/80 text-left space-y-2 text-xs text-slate-700 shadow-2xs">
            <div className="flex justify-between items-center pb-1.5 border-b border-amber-100">
              <span className="text-slate-500 font-semibold">Course Program:</span>
              <strong className="text-slate-900 font-bold">{selectedCourse.title}</strong>
            </div>
            <div className="flex justify-between items-center pb-1.5 border-b border-amber-100">
              <span className="text-slate-500 font-semibold">Submitted Amount:</span>
              <strong className="text-purple-700 font-extrabold">{payableFeeFormatted}</strong>
            </div>
            <div className="flex justify-between items-center pb-1.5 border-b border-amber-100">
              <span className="text-slate-500 font-semibold">UPI TxID / UTR:</span>
              <code className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {paymentDetails.upiTxId || txId}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Student Name:</span>
              <span className="font-bold text-slate-800">{studentName || userProfile.name}</span>
            </div>
          </div>

          {/* Real-time check feedback alert */}
          {statusFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-bold border transition-all animate-fade-in ${
                statusFeedback.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                  : statusFeedback.type === "error"
                  ? "bg-rose-50 text-rose-800 border-rose-200"
                  : "bg-purple-50 text-purple-800 border-purple-200"
              }`}
            >
              {statusFeedback.message}
            </div>
          )}

          {/* Action Buttons: Check Verification Status & Contact Admin on WhatsApp */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleCheckVerificationStatus}
              disabled={isCheckingStatus}
              className="w-full py-3.5 px-4 rounded-2xl font-extrabold text-xs text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isCheckingStatus ? "animate-spin" : ""}`} />
              <span>{isCheckingStatus ? "Checking Status in Supabase..." : "Check Verification Status"}</span>
            </button>

            <a
              href={formatWhatsAppLink(
                appSettings.contactWhatsApp,
                `Assalamu Alaikum Admin, I have submitted UPI payment of ${payableFeeFormatted} for ${selectedCourse.title} with UTR: ${
                  paymentDetails.upiTxId || txId
                }. Please verify my enrollment.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 rounded-2xl font-extrabold text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>Contact Admin on WhatsApp</span>
            </a>
          </div>

          <div className="pt-2 text-center space-y-2">
            <button
              type="button"
              onClick={() => setShowEditForm((prev) => !prev)}
              className="text-[11px] font-bold text-slate-400 hover:text-purple-700 underline cursor-pointer block mx-auto"
            >
              {showEditForm ? "Hide Re-entry Form" : "Need to correct your 12-digit UTR?"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/login?portal=staff")}
              className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 transition-colors py-1 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span>Institute Staff? Login Here</span>
            </button>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("hanoon_pending_payment");
                  } catch {}
                  window.location.href = "/";
                }}
                className="text-[11px] font-bold text-slate-500 hover:text-purple-700 underline cursor-pointer"
              >
                ← Return to Home / New Admission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT EXPLANATION & PROCESS CARD (Shown only if not verified AND (not pending OR student toggled edit)) */}
      {!isVerified && (!isPending || showEditForm) && (
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
                  Pay exact amount <strong className="text-purple-700">{payableFeeFormatted}</strong> to UPI ID <code className="font-mono font-bold text-purple-700">mubeennk203@okhdfcbank</code> (Hanoon Academy) or scan the QR code above.
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

          {/* Quick UPI Details Reminder */}
          <div className="neumorphic-inset p-3.5 rounded-2xl flex items-center justify-between text-xs">
            <div className="min-w-0">
              <span className="text-[10px] text-purple-700 font-extrabold uppercase tracking-wide block">
                Receiver: Hanoon Academy
              </span>
              <span className="font-mono text-xs font-bold text-slate-900 block truncate select-all">
                mubeennk203@okhdfcbank
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyUPI}
              className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shrink-0 border border-purple-100"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
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
                  <span>Submit for Verification</span>
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

