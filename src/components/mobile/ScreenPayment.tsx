"use client";

import React, { useState, useEffect, useRef } from "react";
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
  User,
  Phone,
  RefreshCw,
  MessageCircle,
  Lock,
  Upload,
  Camera,
  Image as ImageIcon,
  Eye,
  Trash2,
  X,
  FileText,
} from "lucide-react";
import { SelectedCourse, PaymentDetails, UserProfile } from "@/types/app";
import { registerStudentAndPayment, uploadPaymentScreenshot } from "@/services/studentService";
import { subscribeToPaymentStatus, checkPaymentStatusByIdOrTx } from "@/services/paymentService";
import { getAppSettings, fetchAppSettings, subscribeToAppSettings, formatWhatsAppLink } from "@/services/settingsService";

interface ScreenPaymentProps {
  userProfile?: UserProfile;
  selectedCourse: SelectedCourse;
  paymentDetails: PaymentDetails;
  onSubmitPayment: (txId: string, paymentId?: string, screenshotUrl?: string) => void;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [studentName, setStudentName] = useState(() => {
    if (userProfile?.name) return userProfile.name;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("hanoon_student_profile");
        if (raw) return JSON.parse(raw).name || "";
      } catch {}
    }
    return "";
  });
  const [studentPhone, setStudentPhone] = useState(() => {
    if (userProfile?.phone) return userProfile.phone;
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("hanoon_student_profile");
        if (raw) return JSON.parse(raw).phone || "";
      } catch {}
    }
    return "";
  });
  const [txIdInput, setTxIdInput] = useState<string>(
    paymentDetails.upiTxId &&
      !paymentDetails.upiTxId.startsWith("PROOF_") &&
      !paymentDetails.upiTxId.startsWith("PENDING_")
      ? paymentDetails.upiTxId
      : ""
  );
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(
    paymentDetails.screenshotUrl || null
  );
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
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
    if (userProfile?.name) setStudentName(userProfile.name);
    if (userProfile?.phone) setStudentPhone(userProfile.phone);
  }, [userProfile?.name, userProfile?.phone]);

  useEffect(() => {
    if (paymentDetails.status === "verified") {
      setVerifiedStatus("verified");
    } else if (paymentDetails.status === "pending_verification") {
      setVerifiedStatus("pending");
    } else if (paymentDetails.status === "unpaid") {
      setVerifiedStatus("unpaid");
    }
  }, [paymentDetails.status]);

  useEffect(() => {
    if (paymentDetails.screenshotUrl && !screenshotPreview) {
      setScreenshotPreview(paymentDetails.screenshotUrl);
    }
  }, [paymentDetails.screenshotUrl]);

  // Subscribe to real-time status updates when a payment is submitted
  useEffect(() => {
    const activeKey = paymentDetails.upiTxId;
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
          setError("Payment was flagged or rejected by admin. Please check receipt.");
          setStatusFeedback({
            message: "Payment was flagged or rejected by admin. Please re-upload your receipt.",
            type: "error",
          });
        }
      }
    );

    return () => unsubscribe();
  }, [paymentDetails.upiTxId, onSimulateAdminApproval]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (.jpg, .jpeg, .png, .webp).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10MB limit. Please upload a smaller image.");
      return;
    }

    setError(null);
    setScreenshotFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotFile(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCheckVerificationStatus = async () => {
    const targetTx = paymentDetails.upiTxId;
    if (!targetTx) {
      setStatusFeedback({ message: "No payment record found to check.", type: "info" });
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
          setError(res.rejectionReason || "Payment was rejected. Please re-upload your screenshot.");
          setStatusFeedback({
            message: "Payment was flagged or rejected by admin. Please re-upload your payment screenshot.",
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
          message: "⏳ Screenshot queued in Supabase. Verification in progress.",
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
    if (isSubmittingRef.current || isSubmitting) return;

    if (!studentName.trim()) {
      setError("Please enter your Student Full Name.");
      return;
    }
    const cleanPhone = studentPhone.trim().replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit WhatsApp number.");
      return;
    }

    const cleanTx = txIdInput.trim().replace(/\s+/g, "");
    if (!cleanTx && !screenshotFile && !screenshotPreview) {
      setError("Please enter your 12-digit UPI Transaction ID / UTR or upload a payment screenshot.");
      return;
    }
    if (cleanTx && cleanTx.length < 8) {
      setError("Transaction ID must be at least 8 to 12 digits.");
      return;
    }

    setError(null);
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    if (onSaveProfile) {
      onSaveProfile({
        name: studentName.trim(),
        phone: studentPhone.trim(),
        place: userProfile.place || "Kerala",
      });
    }

    try {
      // 1. Upload screenshot to Supabase Storage (if file provided)
      let finalScreenshotUrl = paymentDetails.screenshotUrl || screenshotPreview || "";
      if (screenshotFile) {
        finalScreenshotUrl = await uploadPaymentScreenshot(screenshotFile);
      }

      // 2. Generate secure proof reference from Transaction ID or proof tag
      const refId = cleanTx || paymentDetails.upiTxId || `PROOF_${Date.now().toString().slice(-6)}`;

      // 3. Register in Supabase (with resilient local storage fallback)
      const res = await registerStudentAndPayment({
        fullName: studentName.trim(),
        whatsappNum: studentPhone.trim(),
        district: userProfile.place || "Kerala",
        courseId: selectedCourse.id,
        courseTitle: selectedCourse.title,
        upiTxId: refId,
        screenshotUrl: finalScreenshotUrl,
        amount: payableAmount,
      });

      // 4. Update UI state smoothly without hard page reload or redirecting to "/"
      setVerifiedStatus("pending");
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      onSubmitPayment(refId, res.payment?.id, finalScreenshotUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed. Please check network.";
      setError(msg);
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const isVerified = verifiedStatus === "verified" || paymentDetails.status === "verified";
  const isPending =
    !isVerified &&
    (verifiedStatus === "pending" ||
      (paymentDetails.status === "pending_verification" &&
        (Boolean(paymentDetails.upiTxId) || Boolean(paymentDetails.screenshotUrl))));

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
          <div className="w-52 h-52 max-w-[220px] bg-white border-2 border-purple-200 p-2 rounded-2xl shadow-xs flex items-center justify-center overflow-hidden">
            <img
              src="/qr-code.png"
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
              Payment Screenshot Submitted!
            </h2>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-sm mx-auto font-medium">
            Thank you! Your payment screenshot has been securely uploaded and queued for review. Your course dashboard and study materials will automatically unlock once verified by admin.
          </p>

          {/* Transaction Metadata Card */}
          <div className="p-4 rounded-2xl bg-white border border-amber-200/80 text-left space-y-2.5 text-xs text-slate-700 shadow-2xs">
            <div className="flex justify-between items-center pb-1.5 border-b border-amber-100">
              <span className="text-slate-500 font-semibold">Course Program:</span>
              <strong className="text-slate-900 font-bold">{selectedCourse.title}</strong>
            </div>
            <div className="flex justify-between items-center pb-1.5 border-b border-amber-100">
              <span className="text-slate-500 font-semibold">Submitted Amount:</span>
              <strong className="text-purple-700 font-extrabold">{payableFeeFormatted}</strong>
            </div>
            <div className="flex justify-between items-center pb-1.5 border-b border-amber-100">
              <span className="text-slate-500 font-semibold">Student Name:</span>
              <span className="font-bold text-slate-800">{studentName || userProfile.name}</span>
            </div>
            {paymentDetails.upiTxId && !paymentDetails.upiTxId.startsWith("PROOF_") && (
              <div className="flex justify-between items-center pb-1.5 border-b border-amber-100">
                <span className="text-slate-500 font-semibold">Transaction ID / UTR:</span>
                <span className="font-mono font-bold text-slate-800 text-[11px] select-all">
                  {paymentDetails.upiTxId}
                </span>
              </div>
            )}

            {/* Uploaded Screenshot Thumbnail Display */}
            {(paymentDetails.screenshotUrl || screenshotPreview) && (
              <div className="pt-1 space-y-1.5">
                <span className="text-slate-500 font-semibold block text-[11px]">
                  Uploaded Payment Proof:
                </span>
                <div
                  onClick={() => setPreviewModalUrl(paymentDetails.screenshotUrl || screenshotPreview)}
                  className="relative group w-full h-32 rounded-xl overflow-hidden border border-amber-200 bg-slate-50 cursor-pointer flex items-center justify-center"
                >
                  <img
                    src={paymentDetails.screenshotUrl || screenshotPreview || ""}
                    alt="Uploaded payment screenshot"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 font-bold text-xs">
                    <Eye className="w-4 h-4" />
                    <span>Click to view full screenshot</span>
                  </div>
                </div>
              </div>
            )}
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
                `Assalamu Alaikum Admin, I have submitted the payment screenshot of ${payableFeeFormatted} for ${selectedCourse.title}. Student: ${studentName || userProfile.name}. Please verify my enrollment.`
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
              {showEditForm ? "Hide Re-upload Form" : "Need to re-upload payment screenshot?"}
            </button>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("hanoon_pending_payment");
                  } catch {}
                  router.push("/");
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
                <span>Take a screenshot of the payment successful receipt on your phone.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-200 text-purple-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <span>Upload the screenshot image below and submit for instant Admin approval.</span>
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

          {/* Student Info & Screenshot Submission Form (TxID completely removed) */}
          <form onSubmit={handleSubmit} className="space-y-4 pt-1">
            {/* Confirmed Student Details Card (Only show inputs if editing or missing) */}
            {studentName && studentPhone && !showEditForm ? (
              <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full inline-block">
                      Enrolled Student
                    </span>
                    <p className="text-xs font-black text-slate-900 truncate mt-0.5">
                      {studentName} • <span className="font-mono text-slate-600 font-bold">{studentPhone}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditForm(true)}
                  className="text-[11px] font-extrabold text-purple-700 hover:text-purple-900 underline px-2 py-1 cursor-pointer shrink-0"
                >
                  Edit
                </button>
              </div>
            ) : (
              <div className="space-y-3 p-3.5 rounded-2xl bg-purple-50/40 border border-purple-100">
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-purple-200/80 focus:border-purple-600 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
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
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-purple-200/80 focus:border-purple-600 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* UPI Transaction ID / UTR (Optional if screenshot is attached) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 block">
                  UPI Transaction ID / UTR <span className="text-slate-400 font-normal">(Optional if receipt uploaded)</span>
                </label>
                <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                  12-digit UTR
                </span>
              </div>
              <div className="relative">
                <FileText className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. 408512345678 or 12-digit UTR"
                  value={txIdInput}
                  onChange={(e) => setTxIdInput(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-mono font-medium"
                />
              </div>
            </div>

            {/* SCREENSHOT UPLOAD COMPONENT (Completely replaced 12-digit TxID input) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-purple-600" />
                  <span>Upload Payment Screenshot</span>
                  <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                  JPG, PNG, WEBP
                </span>
              </div>

              {/* Hidden Native File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="payment-screenshot-file-input"
              />

              {!screenshotPreview ? (
                /* Empty Upload Dropzone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="group relative border-2 border-dashed border-purple-200 hover:border-purple-500 rounded-2xl p-6 text-center bg-purple-50/30 hover:bg-purple-50/80 transition-all cursor-pointer flex flex-col items-center justify-center space-y-2.5 active:scale-[0.99]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xs">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">
                      Tap to Upload Payment Screenshot
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                      Select receipt screenshot from Google Pay, PhonePe, Paytm, or BHIM
                    </p>
                  </div>
                  <button
                    type="button"
                    className="mt-1 py-2 px-4 rounded-xl bg-purple-600 text-white font-extrabold text-xs shadow-xs group-hover:bg-purple-700 transition-colors pointer-events-none"
                  >
                    Select Screenshot
                  </button>
                </div>
              ) : (
                /* Screenshot Preview Card */
                <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
                  <div className="flex items-center gap-3">
                    <div
                      onClick={() => setPreviewModalUrl(screenshotPreview)}
                      className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-purple-300 shadow-2xs shrink-0 cursor-pointer group bg-black/5"
                      title="Click to view full screenshot"
                    >
                      <img
                        src={screenshotPreview}
                        alt="Payment receipt preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye className="w-4 h-4" />
                      </div>
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-700 font-extrabold text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Screenshot Attached</span>
                      </div>
                      <p className="text-[11px] text-slate-700 font-semibold truncate">
                        {screenshotFile?.name || "Payment screenshot"}
                      </p>
                      {screenshotFile && (
                        <p className="text-[10px] text-slate-400 font-mono">
                          {(screenshotFile.size / 1024).toFixed(1)} KB
                        </p>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={() => setPreviewModalUrl(screenshotPreview)}
                          className="text-[11px] font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                        >
                          View Full
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveScreenshot}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer flex items-center gap-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>



            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl font-extrabold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Submitting for Verification...
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

      {/* Screenshot Full-Size Lightbox Modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-sm w-full bg-white rounded-3xl overflow-hidden shadow-2xl space-y-3 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-purple-100">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-black text-slate-900">
                  Payment Receipt Screenshot
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[68vh] overflow-auto rounded-2xl border border-purple-100 bg-slate-50 flex items-center justify-center p-1">
              <img
                src={previewModalUrl}
                alt="Payment Receipt Full"
                className="w-full h-auto object-contain rounded-xl"
              />
            </div>

            <button
              type="button"
              onClick={() => setPreviewModalUrl(null)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

