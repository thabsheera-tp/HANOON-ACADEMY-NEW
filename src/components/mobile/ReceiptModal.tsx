"use client";

import React from "react";
import { X, CheckCircle2, Download, Printer, GraduationCap, ShieldCheck } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none font-['Plus_Jakarta_Sans']">
      <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-purple-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Receipt Sheet */}
        <div className="border border-purple-100 rounded-2xl p-5 bg-purple-50/40 space-y-4">
          {/* Header */}
          <div className="text-center pb-3 border-b border-dashed border-purple-200">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center mx-auto mb-2 shadow-xs">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900">Hanoon Academy</h3>
            <p className="text-[10px] text-purple-700 font-bold uppercase tracking-wider">
              Official Fee Receipt & Admission Pass
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5">Receipt No: {receiptNo}</p>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-2 gap-2 text-xs py-1">
            <div>
              <span className="font-medium text-slate-500 block">Student Name</span>
              <span className="font-bold text-slate-900">{userProfile.name || "Aysha Mariyam"}</span>
            </div>
            <div>
              <span className="font-medium text-slate-500 block">District / Place</span>
              <span className="font-bold text-slate-900">{userProfile.place || "Kerala"}</span>
            </div>
            <div>
              <span className="font-medium text-slate-500 block">Date of Issue</span>
              <span className="font-bold text-slate-900">{dateStr}</span>
            </div>
            <div>
              <span className="font-medium text-slate-500 block">Status</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block border border-emerald-100">
                {paymentDetails.status === "verified" ? "PAID" : "PENDING"}
              </span>
            </div>
          </div>

          {/* Course Details */}
          <div className="bg-white p-3.5 rounded-xl border border-purple-100 space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Selected Program</span>
              <span className="font-bold text-slate-900">{selectedCourse.title}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Duration</span>
              <span className="font-medium text-slate-800">{selectedCourse.duration}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">UTR / TxID</span>
              <span className="font-mono text-purple-700 font-bold">
                {paymentDetails.upiTxId || "423589104712"}
              </span>
            </div>
            <div className="pt-2 mt-2 border-t border-purple-50 flex justify-between items-center text-sm">
              <span className="font-bold text-slate-900">Total Tuition Paid</span>
              <span className="font-black text-purple-700">{paymentDetails.amount}</span>
            </div>
          </div>

          {/* Security stamp */}
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-purple-700 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Digitally Verified by Hanoon Academic Registry</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => window.print()}
            className="flex-1 py-3 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
          <button
            onClick={() => alert(`Official Receipt ${receiptNo} exported as PDF`)}
            className="flex-1 py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Save PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
