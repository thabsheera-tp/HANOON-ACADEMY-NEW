"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  CheckCircle2,
  RefreshCw,
  MessageCircle,
  Eye,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  X,
  FileText,
} from "lucide-react";
import HanoonLogo from "@/components/brand/HanoonLogo";
import { SelectedCourse, PaymentDetails, UserProfile } from "@/types/app";
import { checkPaymentStatusByIdOrTx } from "@/services/paymentService";
import { getAppSettings, fetchAppSettings, subscribeToAppSettings, formatWhatsAppLink } from "@/services/settingsService";

interface ScreenPendingVerificationProps {
  userProfile?: UserProfile;
  selectedCourse: SelectedCourse;
  paymentDetails: PaymentDetails;
  onGoToCourses: () => void;
  onGoToDashboard: () => void;
  onReuploadPayment?: () => void;
}

export default function ScreenPendingVerification({
  userProfile,
  selectedCourse,
  paymentDetails,
  onGoToCourses,
  onGoToDashboard,
  onReuploadPayment,
}: ScreenPendingVerificationProps) {
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);
  const [appSettings, setAppSettings] = useState(getAppSettings());

  useEffect(() => {
    fetchAppSettings().then(setAppSettings);
    const unsubscribe = subscribeToAppSettings((updated) => {
      setAppSettings(updated);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Supabase & event subscription: Instantly transition to Dashboard when Admin approves
  useEffect(() => {
    let realtimeChannel: any = null;
    const listenToApproval = async () => {
      const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
      if (isSupabaseConfigured && supabase) {
        realtimeChannel = supabase
          .channel(`pending_screen_approval_${paymentDetails.upiTxId || "all"}`)
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "payments" },
            (payload) => {
              const updated = payload.new as any;
              const newSt = (updated?.status || "").toUpperCase();
              if (
                updated &&
                (newSt === "APPROVED" || newSt === "VERIFIED" || newSt === "ACTIVE")
              ) {
                if (
                  !paymentDetails.upiTxId ||
                  updated.upi_txid === paymentDetails.upiTxId ||
                  updated.id === paymentDetails.upiTxId
                ) {
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("hanoon_pending_payment");
                    localStorage.setItem("hanoon_student_enrolled", "true");
                  }
                  window.dispatchEvent(
                    new CustomEvent("hanoon_payment_event", {
                      detail: {
                        status: "APPROVED",
                        upi_txid: updated.upi_txid,
                        course_id: updated.course_id,
                      },
                    })
                  );
                  setStatusFeedback({
                    message: "🎉 Payment Approved! Your course and dashboard are now unlocked.",
                    type: "success",
                  });
                  setTimeout(() => {
                    onGoToDashboard();
                  }, 600);
                }
              }
            }
          )
          .subscribe();
      }
    };
    listenToApproval();

    const handleLocalApproval = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        const st = (customEvt.detail.status || "").toUpperCase();
        if (st === "APPROVED" || st === "VERIFIED" || st === "ACTIVE") {
          setStatusFeedback({
            message: "🎉 Payment Approved! Your course and dashboard are now unlocked.",
            type: "success",
          });
          setTimeout(() => {
            onGoToDashboard();
          }, 600);
        }
      }
    };

    window.addEventListener("hanoon_payment_event", handleLocalApproval);

    return () => {
      if (realtimeChannel) {
        import("@/lib/supabaseClient").then(({ supabase }) => {
          if (supabase) supabase.removeChannel(realtimeChannel);
        });
      }
      window.removeEventListener("hanoon_payment_event", handleLocalApproval);
    };
  }, [paymentDetails.upiTxId, onGoToDashboard]);

  const studentName = userProfile?.name || "Student";
  const courseTitle = selectedCourse.title || "Course Enrollment";
  const amount = paymentDetails.amount || selectedCourse.admissionFee || selectedCourse.fee;
  const txId = paymentDetails.upiTxId;
  const submittedAt = paymentDetails.submittedAt || "Recently submitted";
  const screenshotUrl = paymentDetails.screenshotUrl;

  const handleCheckStatus = async () => {
    if (!txId) {
      setStatusFeedback({
        message: "No transaction ID recorded. Checking general verification...",
        type: "info",
      });
      return;
    }

    setIsCheckingStatus(true);
    setStatusFeedback(null);

    try {
      const res = await checkPaymentStatusByIdOrTx(txId);
      if (res) {
        const resSt = (res.status || "").toUpperCase();
        if (resSt === "APPROVED" || resSt === "VERIFIED" || resSt === "ACTIVE") {
          if (typeof window !== "undefined") {
            localStorage.removeItem("hanoon_pending_payment");
            localStorage.setItem("hanoon_student_enrolled", "true");
          }
          window.dispatchEvent(
            new CustomEvent("hanoon_payment_event", {
              detail: {
                status: "APPROVED",
                upi_txid: txId,
                course_id: res.course_id,
              },
            })
          );
          setStatusFeedback({
            message: "🎉 Payment Approved! Your course and dashboard are now unlocked.",
            type: "success",
          });
          setTimeout(() => {
            onGoToDashboard();
          }, 800);
        } else if (resSt === "REJECTED") {
          setStatusFeedback({
            message: res.rejectionReason || "Payment was rejected. Please re-upload your payment proof.",
            type: "error",
          });
        } else {
          setStatusFeedback({
            message: "⏳ Payment is currently under review by Admin. Usually verified within 10–30 minutes.",
            type: "info",
          });
        }
      } else {
        setStatusFeedback({
          message: "⏳ Verification in progress. Please check back shortly.",
          type: "info",
        });
      }
    } catch {
      setStatusFeedback({
        message: "Status check completed. The team is reviewing your receipt.",
        type: "info",
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const whatsAppMessage = `Assalamu Alaikum Admin, I have submitted my payment for verification.\n\nStudent: ${studentName}\nCourse: ${courseTitle}\nAmount: ${amount}${txId ? `\nTxID: ${txId}` : ""}\n\nPlease verify my enrollment.`;

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-6 flex-1 flex flex-col justify-start space-y-5 select-none font-['Plus_Jakarta_Sans'] bg-purple-50/40">
      {/* Main Status Container */}
      <div className="neumorphic-card bg-white border border-amber-200/90 p-6 rounded-3xl space-y-5 text-center shadow-md animate-fade-in">
        {/* Animated Pending Clock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
          <Clock className="w-8 h-8 animate-pulse text-amber-600" />
        </div>

        {/* Status Badge */}
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-200 px-3.5 py-1 rounded-full inline-block shadow-2xs">
            ⏳ Status: Verification Pending
          </span>
        </div>

        {/* Header */}
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
            Payment Under Review
          </h1>
          <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
            Thank you, <strong className="text-slate-900">{studentName}</strong>! Your manual UPI transaction receipt has been submitted and is currently being audited by our verification team.
          </p>
        </div>

        {/* Transaction Summary Card */}
        <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200/70 text-left space-y-2 text-xs text-slate-700">
          <div className="flex justify-between items-center pb-1.5 border-b border-amber-100">
            <span className="text-slate-500 font-semibold">Course:</span>
            <strong className="text-slate-900 font-bold">{courseTitle}</strong>
          </div>
          <div className="flex justify-between items-center pb-1.5 border-b border-amber-100">
            <span className="text-slate-500 font-semibold">Submitted Amount:</span>
            <strong className="text-purple-700 font-extrabold">{amount}</strong>
          </div>
          {txId && !txId.startsWith("PROOF_") && (
            <div className="flex justify-between items-center pb-1.5 border-b border-amber-100">
              <span className="text-slate-500 font-semibold">Transaction ID / UTR:</span>
              <span className="font-mono font-bold text-slate-900 select-all">{txId}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-semibold">Submitted:</span>
            <span className="font-medium text-slate-600">{submittedAt}</span>
          </div>

          {/* Screenshot Preview */}
          {screenshotUrl && (
            <div className="pt-2 border-t border-amber-100 space-y-1.5">
              <span className="text-slate-500 font-semibold block text-[11px]">
                Uploaded Payment Receipt:
              </span>
              <div
                onClick={() => setPreviewModalUrl(screenshotUrl)}
                className="relative group w-full h-32 rounded-xl overflow-hidden border border-amber-200 bg-slate-50 cursor-pointer flex items-center justify-center"
              >
                <img
                  src={screenshotUrl}
                  alt="Uploaded payment screenshot"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 font-bold text-xs">
                  <Eye className="w-4 h-4" />
                  <span>Click to view receipt</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* What Happens Next Guide */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 text-left space-y-1.5">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>What happens next?</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-500 pl-0.5">
            <li>Our staff matches the UPI payment receipt with our bank account.</li>
            <li>Once confirmed, your course dashboard and live hubs will unlock automatically.</li>
            <li>You can check your status anytime using the button below.</li>
          </ul>
        </div>

        {/* Live Status Feedback Alert */}
        {statusFeedback && (
          <div
            className={`p-3 rounded-2xl text-xs font-bold border transition-all animate-fade-in ${
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

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Check Verification Status */}
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={isCheckingStatus}
            className="w-full py-3.5 px-4 rounded-2xl font-black text-xs text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isCheckingStatus ? "animate-spin" : ""}`} />
            <span>{isCheckingStatus ? "Checking with Verification Team..." : "Check Verification Status"}</span>
          </button>

          {/* Contact Admin on WhatsApp */}
          <a
            href={formatWhatsAppLink(appSettings.contactWhatsApp, whatsAppMessage)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-4 rounded-2xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Need Fast Approval? WhatsApp Admin</span>
          </a>

          {/* Return to Courses */}
          <button
            type="button"
            onClick={onGoToCourses}
            className="w-full py-3 px-4 rounded-2xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>Explore Other Courses</span>
          </button>
        </div>

        {/* Re-upload Option */}
        {onReuploadPayment && (
          <div className="pt-1">
            <button
              type="button"
              onClick={onReuploadPayment}
              className="text-[11px] font-bold text-slate-400 hover:text-purple-700 underline cursor-pointer"
            >
              Need to re-upload receipt or fix details?
            </button>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-md w-full bg-white rounded-3xl overflow-hidden p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 px-1">
              <span className="text-xs font-bold text-slate-800">Submitted Receipt</span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={previewModalUrl}
              alt="Payment receipt preview"
              className="w-full max-h-[70vh] object-contain rounded-2xl border border-slate-200"
            />
          </div>
        </div>
      )}
    </div>
  );
}
