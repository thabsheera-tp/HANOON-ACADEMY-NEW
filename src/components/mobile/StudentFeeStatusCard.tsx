"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  Copy,
  Check,
  X,
  AlertCircle,
  QrCode,
  Sparkles,
} from "lucide-react";
import {
  getStudentFeeDetails,
  submitInstallmentPayment,
  StudentFeeDetails,
} from "@/services/feeService";

interface StudentFeeStatusCardProps {
  studentId?: string;
  studentPhone?: string;
  studentName?: string;
  courseId: string;
  courseName: string;
}

export default function StudentFeeStatusCard({
  studentId = "",
  studentPhone = "",
  studentName = "Student",
  courseId,
  courseName,
}: StudentFeeStatusCardProps) {
  const [feeDetails, setFeeDetails] = useState<StudentFeeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPayModal, setShowPayModal] = useState(false);

  // Modal payment form state
  const [payAmount, setPayAmount] = useState<number>(0);
  const [upiTxId, setUpiTxId] = useState("");
  const [installmentNote, setInstallmentNote] = useState("Balance Fee Installment");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const UPI_ID = "hanoonacademy@upi";

  const loadFee = async () => {
    try {
      setLoading(true);
      const data = await getStudentFeeDetails(studentId, studentPhone, courseId);
      setFeeDetails(data);
      if (data.balanceFee > 0) {
        setPayAmount(data.balanceFee);
      }
    } catch (err) {
      console.warn("Failed to load fee details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFee();

    const handleUpdate = () => {
      loadFee();
    };

    window.addEventListener("hanoon_fee_updated", handleUpdate);
    window.addEventListener("hanoon_payment_event", handleUpdate);
    return () => {
      window.removeEventListener("hanoon_fee_updated", handleUpdate);
      window.removeEventListener("hanoon_payment_event", handleUpdate);
    };
  }, [studentId, studentPhone, courseId]);

  const handleCopyUpi = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(UPI_ID);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2500);
    }
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTx = upiTxId.trim();
    if (!cleanTx || cleanTx.length < 6) {
      setErrorMessage("Please enter a valid UPI Transaction ID / UTR number.");
      return;
    }
    if (payAmount <= 0) {
      setErrorMessage("Please enter a payment amount greater than ₹0.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitInstallmentPayment({
        studentId: studentId || "std_demo",
        courseId: feeDetails?.courseId || courseId || "adaviyya",
        amount: Number(payAmount),
        upiTxId: cleanTx,
        installmentNote,
      });

      if (res.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setShowPayModal(false);
          setSubmitSuccess(false);
          setUpiTxId("");
          loadFee();
        }, 2200);
      } else {
        setErrorMessage(res.error || "Failed to submit payment. Please try again.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !feeDetails) {
    return (
      <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-xs animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded-md mb-3" />
        <div className="h-8 w-48 bg-slate-200 rounded-md" />
      </div>
    );
  }

  const total = feeDetails?.totalFee ?? 3000;
  const paid = feeDetails?.paidAmount ?? 0;
  const balance = feeDetails?.balanceFee ?? Math.max(0, total - paid);
  const isFullyPaid = balance <= 0;
  const percentage = Math.min(100, Math.round((paid / (total || 1)) * 100));

  return (
    <>
      <div className="bg-white rounded-3xl p-5 border border-purple-100/90 shadow-xs hover:border-purple-200 transition-all space-y-4">
        {/* Header: Title + Status Pill */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                Course Fee Status
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {feeDetails?.courseName || courseName}
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isFullyPaid
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            {isFullyPaid ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>Fully Paid ✅</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Balance Due ⏳</span>
              </>
            )}
          </span>
        </div>

        {/* 3 Metrics: Total, Paid, Balance */}
        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 text-center">
            <div className="text-[10px] font-medium text-slate-500">Total Fee</div>
            <div className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
              ₹{total.toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100/80 text-center">
            <div className="text-[10px] font-medium text-purple-700">Paid</div>
            <div className="text-xs sm:text-sm font-bold text-purple-800 mt-0.5">
              ₹{paid.toLocaleString()}
            </div>
          </div>

          <div
            className={`p-3 rounded-2xl border text-center ${
              isFullyPaid
                ? "bg-emerald-50/50 border-emerald-100/80"
                : "bg-amber-50/50 border-amber-100/80"
            }`}
          >
            <div
              className={`text-[10px] font-medium ${
                isFullyPaid ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              Balance
            </div>
            <div
              className={`text-xs sm:text-sm font-bold mt-0.5 ${
                isFullyPaid ? "text-emerald-800" : "text-amber-800"
              }`}
            >
              ₹{balance.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-medium text-slate-500">
            <span>Payment Progress</span>
            <span className="font-bold text-purple-700">{percentage}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Pay Balance Fee Button if balance > 0 */}
        {!isFullyPaid && (
          <button
            type="button"
            onClick={() => {
              setPayAmount(balance);
              setShowPayModal(true);
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-98 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm shadow-purple-200 transition-all cursor-pointer"
          >
            <DollarSign className="w-4 h-4" />
            <span>Pay Balance Fee (₹{balance.toLocaleString()})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Pay Balance / Installment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-purple-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Pay Balance Fee</h3>
                  <p className="text-[11px] text-slate-500">Hanoon Academy UPI Portal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitSuccess ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Check className="w-7 h-7" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Payment Submitted!</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Your installment payment of ₹{payAmount} has been recorded. It will be credited to your balance upon verification.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitPayment} className="p-5 space-y-4">
                {errorMessage && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* UPI ID Box */}
                <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100/90 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-purple-700">
                      Official UPI ID
                    </div>
                    <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                      {UPI_ID}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 font-semibold text-[11px] transition-colors cursor-pointer"
                  >
                    {copiedUpi ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Amount to Pay */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Amount to Pay (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="100"
                      max={balance}
                      step="50"
                      value={payAmount}
                      onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setPayAmount(Math.min(500, balance))}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 rounded-lg transition-colors"
                    >
                      ₹500
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayAmount(Math.min(1000, balance))}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-slate-100 hover:bg-purple-100 hover:text-purple-700 rounded-lg transition-colors"
                    >
                      ₹1,000
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayAmount(balance)}
                      className="text-[10px] font-semibold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-lg transition-colors"
                    >
                      Full Balance (₹{balance})
                    </button>
                  </div>
                </div>

                {/* 12-digit UPI TxID */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">
                    12-digit UPI Ref ID / UTR Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 432109876543"
                    value={upiTxId}
                    onChange={(e) => setUpiTxId(e.target.value.trim())}
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-mono font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    required
                  />
                  <p className="text-[10px] text-slate-400">
                    Find this 12-digit number on your GPay, PhonePe, or Paytm receipt.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowPayModal(false)}
                    disabled={submitting}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 rounded-2xl shadow-md shadow-purple-200 transition-all flex items-center gap-1.5"
                  >
                    {submitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Submit Payment Proof</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
