"use client";

import React from "react";
import { X, Download, Printer, GraduationCap, ShieldCheck } from "lucide-react";
import { UserProfile, SelectedCourse, PaymentDetails } from "@/types/app";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  selectedCourse: SelectedCourse;
  paymentDetails: PaymentDetails;
}

export default function ReceiptModal({
  isOpen,
  onClose,
  userProfile,
  selectedCourse,
  paymentDetails,
}: ReceiptModalProps) {
  if (!isOpen) return null;

  const receiptNo = `HA-REC-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none font-['Plus_Jakarta_Sans'] print:bg-transparent print:p-0 print:static">
      <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 relative max-h-[92vh] overflow-y-auto print:shadow-none print:border-none print:p-0 print:max-w-none">
        {/* Close Button (Hidden in Print) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 cursor-pointer print:hidden transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Printable Receipt Paper Container */}
        <div className="border border-slate-200 rounded-2xl p-6 bg-white space-y-5 shadow-xs print:border-none print:p-0 print:shadow-none" id="printable-mobile-receipt">
          {/* Clean Static Receipt Header */}
          <div className="pb-4 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <GraduationCap className="w-5 h-5 text-white stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight">
                  HANOON ACADEMY
                </h3>
                <p className="text-[10px] text-purple-700 font-bold uppercase tracking-wider mt-0.5">
                  Official Fee Receipt & Admission Pass
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono font-bold text-slate-400 block">
                {receiptNo}
              </span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 inline-block mt-0.5">
                {paymentDetails.status === "verified" ? "PAID" : "VERIFIED"}
              </span>
            </div>
          </div>

          {/* Student Details Grid */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Student Information
            </span>
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Student Name</span>
                <span className="font-extrabold text-slate-900 truncate block mt-0.5">
                  {userProfile.name || "Student"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">District / Place</span>
                <span className="font-bold text-slate-800 truncate block mt-0.5">
                  {userProfile.place || "Kerala"}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Issue</span>
                <span className="font-bold text-slate-800 block mt-0.5">{dateStr}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">WhatsApp Mobile</span>
                <span className="font-mono font-bold text-slate-800 truncate block mt-0.5">
                  {userProfile.phone || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Fee Details Ledger */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Fee & Program Ledger
            </span>
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between items-start gap-2">
                <span className="text-slate-500 font-medium">Enrolled Program</span>
                <span className="font-black text-slate-900 text-right">{selectedCourse.title}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Program Duration</span>
                <span className="font-bold text-slate-700">{selectedCourse.duration}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">UTR / Transaction ID</span>
                <span className="font-mono text-purple-700 font-bold text-[11px] truncate max-w-[180px]">
                  {paymentDetails.upiTxId || "Verified by Accounts"}
                </span>
              </div>
              <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex justify-between items-center">
                <div>
                  <span className="font-extrabold text-slate-900 block text-xs">Total Fee Realized</span>
                  <span className="text-[9px] text-slate-400 font-medium">Official academic registration fee</span>
                </div>
                <span className="text-base font-black text-purple-700">
                  {paymentDetails.amount}
                </span>
              </div>
            </div>
          </div>

          {/* Security & Verification Stamp */}
          <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5 text-purple-700 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Digitally Verified • Hanoon Academic Registry</span>
            </div>
            <span className="font-mono text-slate-400 text-[9px]">
              Reg ID: {receiptNo.slice(-6)}
            </span>
          </div>
        </div>

        {/* Action Controls (Hidden in Print) */}
        <div className="mt-5 flex gap-2.5 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 py-3 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.print();
              }
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            <span>Save PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
