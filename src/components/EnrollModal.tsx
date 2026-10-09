"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Send,
  Sparkles,
  QrCode,
  Copy,
  Check,
  CreditCard,
  FileText,
  User,
  Phone,
  ShieldCheck,
  RefreshCw,
  Clock,
} from "lucide-react";
import { getAppSettings, fetchAppSettings, subscribeToAppSettings } from "@/services/settingsService";
import { registerStudentAndPayment } from "@/services/studentService";

interface EnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCourse?: string;
}

export default function EnrollModal({
  isOpen,
  onClose,
  defaultCourse = "Athaviy (അഥവിയ)",
}: EnrollModalProps) {
  const [modalTab, setModalTab] = useState<"upi" | "inquiry">("upi");
  const [appSettings, setAppSettings] = useState(getAppSettings());
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Form State for Inquiry
  const [inquiryData, setInquiryData] = useState({
    name: "",
    phone: "",
    email: "",
    course: defaultCourse,
    mode: "Online Live Batch",
  });

  // Form State for Direct UPI Checkout
  const [upiData, setUpiData] = useState({
    name: "",
    phone: "",
    course: defaultCourse,
    txId: "",
  });

  const [inquirySubmitted, setInquirySubmitted] = useState(false);
  const [upiSubmitted, setUpiSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upiError, setUpiError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppSettings().then(setAppSettings);
    const unsubscribe = subscribeToAppSettings((settings) => {
      setAppSettings(settings);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (defaultCourse) {
      setInquiryData((prev) => ({ ...prev, course: defaultCourse }));
      setUpiData((prev) => ({ ...prev, course: defaultCourse }));
    }
  }, [defaultCourse]);

  if (!isOpen) return null;

  const upiId = "mubeennk203@okhdfcbank";
  const receiverName = "Hanoon Academy";

  const getCoursePricing = (courseStr: string) => {
    if (courseStr.toLowerCase().includes("adaviyya") || courseStr.toLowerCase().includes("athaviy")) {
      return { id: "adaviyya", name: "Athaviy (അഥവിയ)", fee: "₹500", rawAmount: 500, label: "Admission Fee (Pay Now)" };
    }
    if (courseStr.toLowerCase().includes("tuition")) {
      return { id: "home-tuition", name: "Home Tuition (ഹോം ട്യൂഷൻ)", fee: "₹2,000", rawAmount: 2000, label: "Tuition Fee (Pay Now)" };
    }
    if (courseStr.toLowerCase().includes("fashion")) {
      return { id: "fashion-designing", name: "Fashion Designing", fee: "₹2,500", rawAmount: 2500, label: "Course Fee (Pay Now)" };
    }
    return { id: "adaviyya", name: courseStr, fee: "₹500", rawAmount: 500, label: "Admission Fee (Pay Now)" };
  };

  const currentPricing = getCoursePricing(upiData.course);

  const qrImageSrc =
    "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi%3A%2F%2Fpay%3Fpa%3Dmubeennk203%40okhdfcbank%26pn%3DHanoon%2520Academy%26cu%3DINR";

  const handleCopyUPI = () => {
    navigator.clipboard.writeText("mubeennk203@okhdfcbank");
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setInquirySubmitted(true);
    }, 600);
  };

  const handleUpiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTx = upiData.txId.trim();

    if (!upiData.name.trim()) {
      setUpiError("Please enter your Student Full Name.");
      return;
    }
    if (!upiData.phone.trim() || upiData.phone.trim().length < 10) {
      setUpiError("Please enter a valid 10-digit WhatsApp phone number.");
      return;
    }
    if (!cleanTx) {
      setUpiError("Please enter the 12-digit UPI Transaction ID (TxID) / UTR.");
      return;
    }
    if (cleanTx.length < 8) {
      setUpiError("Transaction ID must be at least 8 to 12 digits.");
      return;
    }

    setUpiError(null);
    setIsSubmitting(true);

    try {
      await registerStudentAndPayment({
        fullName: upiData.name.trim(),
        whatsappNum: upiData.phone.trim(),
        district: "Kerala",
        courseId: currentPricing.id,
        courseTitle: currentPricing.name,
        upiTxId: cleanTx,
        amount: currentPricing.rawAmount,
      });

      setUpiSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed. Please check network.";
      setUpiError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setInquirySubmitted(false);
    setUpiSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0F172A]/70 backdrop-blur-xs animate-in fade-in select-none font-['Plus_Jakarta_Sans']">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-purple-100 max-h-[92vh] overflow-y-auto no-scrollbar text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Success Screen: UPI Payment Submitted */}
        {upiSubmitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-400 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
              <Clock className="w-8 h-8 animate-spin" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block">
                Queued For Verification
              </span>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                Payment Verification Pending
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              Jazakallah Khair, <strong>{upiData.name}</strong>. Your UPI Transaction ID (<code className="font-mono font-bold text-purple-700">{upiData.txId}</code>) is queued for Admin verification in Supabase.
            </p>

            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 text-left text-xs text-slate-700 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Program:</span>
                <strong className="text-slate-900">{currentPricing.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Payable Amount:</span>
                <strong className="text-purple-700">{currentPricing.fee}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Status:</span>
                <span className="text-amber-700 font-bold uppercase text-[10px]">Pending Approval</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-medium">
              🔒 Dashboard and live classes will unlock automatically once approved by the admission office.
            </p>

            <button
              onClick={handleReset}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-md cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        ) : inquirySubmitted ? (
          /* Success Screen: Inquiry Submitted */
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-extrabold text-slate-900">
              Inquiry Received!
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              Jazakallah Khair, <strong>{inquiryData.name}</strong>. Our admissions counselor will connect with you via WhatsApp ({inquiryData.phone}) shortly with syllabus and consultation details.
            </p>

            <button
              onClick={handleReset}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-md cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <div>
            {/* Modal Header */}
            <div className="mb-4 space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Admissions 2026</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Enroll in <span className="text-purple-700">Hanoon Academy</span>
              </h3>
              <p className="text-xs text-slate-500">
                Direct dynamic UPI payment checkout or general enrollment consultation.
              </p>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 bg-purple-50/70 rounded-2xl border border-purple-100 mb-5">
              <button
                type="button"
                onClick={() => setModalTab("upi")}
                className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalTab === "upi"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Instant UPI Payment</span>
              </button>
              <button
                type="button"
                onClick={() => setModalTab("inquiry")}
                className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  modalTab === "inquiry"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Course Inquiry</span>
              </button>
            </div>

            {/* TAB 1: DYNAMIC UPI PAYMENT CHECKOUT */}
            {modalTab === "upi" && (
              <form onSubmit={handleUpiSubmit} className="space-y-4">
                {/* Course Selector & Fee Tag */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Program & Fee <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={upiData.course}
                    onChange={(e) => setUpiData({ ...upiData, course: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 text-xs sm:text-sm text-slate-900 bg-white font-medium focus:outline-none focus:border-purple-600 focus:ring-1 focus:ring-purple-600 transition-all"
                  >
                    <option value="Athaviy (അഥവിയ)">Athaviy (അഥവിയ) — ₹500 Admission Fee</option>
                    <option value="Home Tuition (ഹോം ട്യൂഷൻ)">Home Tuition (ഹോം ട്യൂഷൻ) — ₹2,000 Flat</option>
                    <option value="Fashion Designing (ഫാഷൻ ഡിസൈനിങ്)">Fashion Designing — ₹2,500 Flat</option>
                  </select>
                </div>

                {/* Dynamic QR Code & UPI ID Card */}
                <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 flex flex-col items-center space-y-3">
                  <div className="w-36 h-36 rounded-2xl bg-white border-2 border-purple-200 p-2 flex items-center justify-center shadow-xs overflow-hidden">
                    <img
                      src={qrImageSrc}
                      alt="Institute UPI QR Code"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>

                  {/* 1-Click Copy UPI ID */}
                  <div className="w-full p-2.5 rounded-xl bg-white border border-purple-100 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[9px] font-black uppercase text-purple-700 block">
                        Receiver: Hanoon Academy
                      </span>
                      <span className="font-mono text-xs font-black text-slate-900 truncate block select-all">
                        mubeennk203@okhdfcbank
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyUPI}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-extrabold flex items-center gap-1 transition-all cursor-pointer shrink-0 border border-purple-100"
                    >
                      {copiedUpi ? (
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
                </div>

                {upiError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                    {upiError}
                  </div>
                )}

                {/* Student Full Name */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Student Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-purple-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Enter student full name"
                      value={upiData.name}
                      onChange={(e) => setUpiData({ ...upiData, name: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-purple-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                {/* WhatsApp Phone Number */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    WhatsApp Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-purple-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      placeholder="10-digit WhatsApp number"
                      value={upiData.phone}
                      onChange={(e) => setUpiData({ ...upiData, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-purple-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                {/* 12-Digit Transaction ID (UTR) */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    12-Digit UPI Transaction ID / UTR <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-purple-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Enter 12-digit UPI TxID / UTR"
                      value={upiData.txId}
                      onChange={(e) => setUpiData({ ...upiData, txId: e.target.value.replace(/\s+/g, "") })}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-purple-200 font-mono text-xs sm:text-sm font-bold text-slate-900 tracking-wider focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                {/* Submit Verification Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl font-extrabold text-xs sm:text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] transition-all shadow-md shadow-purple-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting to Supabase...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Submit Payment for Verification</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: INQUIRY FORM */}
            {modalTab === "inquiry" && (
              <form onSubmit={handleInquirySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={inquiryData.name}
                    onChange={(e) => setInquiryData({ ...inquiryData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-purple-600 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      WhatsApp Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 98765 43210"
                      value={inquiryData.phone}
                      onChange={(e) => setInquiryData({ ...inquiryData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-purple-600 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="student@example.com"
                      value={inquiryData.email}
                      onChange={(e) => setInquiryData({ ...inquiryData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-purple-600 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Select Program <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={inquiryData.course}
                    onChange={(e) => setInquiryData({ ...inquiryData, course: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-purple-600 bg-white transition-all font-medium"
                  >
                    <option value="Athaviy (അഥവിയ)">Athaviy (അഥവിയ) — ₹1,500/mo</option>
                    <option value="Home Tuition (ഹോം ട്യൂഷൻ)">Home Tuition (ഹോം ട്യൂഷൻ) — ₹2,000/mo</option>
                    <option value="Fashion Designing (ഫാഷൻ ഡിസൈനിങ്)">Fashion Designing — ₹2,500/mo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Preferred Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {["Online Live Batch", "Offline / Direct"].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setInquiryData({ ...inquiryData, mode: m })}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          inquiryData.mode === m
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-purple-600 hover:bg-purple-700 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <span>Submitting Application...</span>
                  ) : (
                    <>
                      <span>Submit Enrollment Inquiry</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
