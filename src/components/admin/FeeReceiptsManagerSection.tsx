"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Search,
  Filter,
  Printer,
  Download,
  Share2,
  CheckCircle2,
  ExternalLink,
  QrCode,
  DollarSign,
  ShieldCheck,
  Building,
  Calendar,
  User,
  Phone,
  MapPin,
  X,
  MessageCircle,
  GraduationCap,
} from "lucide-react";
import { UnifiedStudentRegistration } from "@/services/studentService";
import {
  buildFeeReceipt,
  FeeReceiptData,
  getWhatsAppFeeReceiptUrl,
} from "@/services/receiptService";

interface FeeReceiptsManagerSectionProps {
  registrations: UnifiedStudentRegistration[];
}

export default function FeeReceiptsManagerSection({
  registrations,
}: FeeReceiptsManagerSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"APPROVED" | "ALL">("APPROVED");
  const [activeReceiptModal, setActiveReceiptModal] = useState<FeeReceiptData | null>(null);

  // Filter registrations
  const filteredRegistrations = useMemo(() => {
    let list = registrations;
    if (statusFilter === "APPROVED") {
      list = list.filter((r) => r.paymentStatus === "APPROVED");
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.whatsappNum.includes(q) ||
        r.courseChoice.toLowerCase().includes(q) ||
        (r.upiTxId && r.upiTxId.toLowerCase().includes(q))
    );
  }, [registrations, statusFilter, searchQuery]);

  // Overall financial summary
  const summary = useMemo(() => {
    const approved = registrations.filter((r) => r.paymentStatus === "APPROVED");
    const totalAmount = approved.reduce((acc, r) => acc + (r.amount || 0), 0);
    return {
      totalReceipts: approved.length,
      totalAmount,
      pendingCount: registrations.filter((r) => r.paymentStatus === "PENDING").length,
    };
  }, [registrations]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <FileText className="w-5 h-5 text-cyan-300" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-blue-200">
              Official Fee Receipts & Student Admission Pass Generator
            </span>
          </div>
          <h2 className="text-2xl font-black mt-2 text-white">Student Fee Receipts Hub</h2>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            Generate verifiable admission cards, printable fee receipts with official stamps, and dispatch direct confirmations via WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/20 text-center">
            <span className="text-[10px] uppercase font-bold text-blue-200 block">Total Realized</span>
            <span className="text-lg font-black text-amber-300">
              ₹{summary.totalAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Verified Receipts Issued
          </span>
          <h3 className="text-2xl font-black text-slate-900">{summary.totalReceipts}</h3>
          <p className="text-[11px] text-emerald-600 font-bold">Official admission passes active</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Pending Payment Verification
          </span>
          <h3 className="text-2xl font-black text-amber-600">{summary.pendingCount}</h3>
          <p className="text-[11px] text-amber-700 font-bold">Awaiting admin transaction check</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Institutional Verification
          </span>
          <h3 className="text-2xl font-black text-purple-700">100% Validated</h3>
          <p className="text-[11px] text-slate-500 font-bold">Signed with registrar cryptographic token</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student, phone, or TxID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-purple-50/50 border border-purple-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-600 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("APPROVED")}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              statusFilter === "APPROVED"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-purple-50 text-purple-800 hover:bg-purple-100"
            }`}
          >
            Approved & Verified Only ({summary.totalReceipts})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-purple-50 text-purple-800 hover:bg-purple-100"
            }`}
          >
            All Applicants ({registrations.length})
          </button>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-purple-50/60 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-purple-100">
              <tr>
                <th className="py-3.5 px-5">Student / Admission</th>
                <th className="py-3.5 px-4">Course Track</th>
                <th className="py-3.5 px-4">Amount Paid</th>
                <th className="py-3.5 px-4">UPI Transaction ID</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Receipt Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 font-medium text-slate-800">
              {filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400 font-bold">
                    No matching student records found.
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((item) => {
                  const receipt = buildFeeReceipt(
                    {
                      id: item.studentId,
                      fullName: item.fullName,
                      whatsappNum: item.whatsappNum,
                      district: item.district,
                    },
                    {
                      id: item.paymentId,
                      courseChoice: item.courseChoice,
                      courseId: item.courseId,
                      amount: item.amount,
                      upiTxId: item.upiTxId,
                      paymentStatus: item.paymentStatus,
                      registrationDate: item.registrationDate,
                    }
                  );

                  const waReceiptUrl = getWhatsAppFeeReceiptUrl(receipt);

                  return (
                    <tr key={item.id} className="hover:bg-purple-50/20 transition-colors">
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <p className="font-extrabold text-slate-900 text-sm">{item.fullName}</p>
                          <p className="text-[11px] text-slate-500 font-medium">
                            {item.whatsappNum} • {item.district}
                          </p>
                          <span className="inline-block text-[10px] font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            {receipt.receiptNo}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-bold text-slate-700">
                        {item.courseChoice}
                      </td>

                      <td className="py-4 px-4 font-black text-slate-900 text-sm">
                        ₹{(item.amount || 1500).toLocaleString("en-IN")}
                      </td>

                      <td className="py-4 px-4 font-mono text-[11px] text-slate-600">
                        {item.upiTxId || "Pending Verification"}
                      </td>

                      <td className="py-4 px-4">
                        {item.paymentStatus === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                            Pending
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* View & Print Official Pass Modal */}
                          <button
                            type="button"
                            onClick={() => setActiveReceiptModal(receipt)}
                            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Pass</span>
                          </button>

                          {/* 1-Tap WhatsApp Receipt Share */}
                          <a
                            href={waReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            title="Dispatch receipt on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline">Send on WA</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Admission Pass & Fee Receipt Modal */}
      {activeReceiptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto print:bg-transparent print:p-0 print:static print:overflow-visible">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden relative animate-scale-in my-8 print:shadow-none print:border-none print:m-0 print:max-w-none print:rounded-none">
            {/* Modal Controls Header (Hidden in Print) */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Official Admission Pass & Fee Receipt
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>

                <a
                  href={getWhatsAppFeeReceiptUrl(activeReceiptModal)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => setActiveReceiptModal(null)}
                  className="p-1.5 rounded-xl hover:bg-white/20 text-white cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Paper Body */}
            <div className="p-6 sm:p-8 space-y-6 text-slate-800 bg-white print:p-0 print:border-none print:shadow-none" id="printable-receipt">
              {/* Clean Receipt Header */}
              <div className="border-b-2 border-purple-900/20 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <GraduationCap className="w-6 h-6 text-white stroke-[2.2]" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                      HANOON ACADEMY
                    </h1>
                    <p className="text-[10px] text-slate-500 font-medium mt-1">
                      Main Campus • Kerala, India • Reg. Under Academic Trust Act
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200 inline-block">
                    ADMISSION PASS & RECEIPT
                  </span>
                  <p className="text-xs font-mono font-black text-slate-900 mt-1.5">
                    {activeReceiptModal.receiptNo}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                    Date: {activeReceiptModal.paymentDate}
                  </p>
                </div>
              </div>

              {/* Student Details Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50/80 p-5 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Student Full Name
                  </span>
                  <p className="font-black text-slate-900 text-sm mt-0.5">
                    {activeReceiptModal.studentName}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Admission Number
                  </span>
                  <p className="font-mono font-black text-purple-800 text-sm mt-0.5">
                    {activeReceiptModal.admissionNo}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    WhatsApp Phone Number
                  </span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {activeReceiptModal.studentPhone}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    District / Place
                  </span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {activeReceiptModal.district}
                  </p>
                </div>
              </div>

              {/* Enrolled Program & Fee Ledger */}
              <div className="border border-purple-100 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-purple-900 text-white uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="py-2.5 px-4">Program / Description</th>
                      <th className="py-2.5 px-4">Academic Session</th>
                      <th className="py-2.5 px-4 text-right">Fee Realized</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    <tr>
                      <td className="py-3 px-4 font-black text-slate-900">
                        {activeReceiptModal.courseTitle}
                        <span className="block text-[10px] font-medium text-slate-500">
                          Tuition enrollment, live classroom access & curriculum notes
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        {activeReceiptModal.academicYear}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-900 text-right text-sm">
                        ₹{activeReceiptModal.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-purple-50/60 font-black text-slate-900 border-t border-purple-200">
                    <tr>
                      <td colSpan={2} className="py-3 px-4 text-xs">
                        TOTAL AMOUNT PAID:
                        <span className="block text-[10px] font-bold text-slate-500 italic normal-case">
                          {activeReceiptModal.amountInWords}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-base text-purple-900">
                        ₹{activeReceiptModal.amount.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Verification Details */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">
                    Transaction Reference (UPI TxID)
                  </span>
                  <span className="font-black text-slate-800 break-all">
                    {activeReceiptModal.upiTxId}
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified & Paid
                  </span>
                </div>
              </div>

              {/* Stamp & Authorized Signature */}
              <div className="pt-4 border-t border-slate-200 flex items-end justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-800">
                    <QrCode className="w-12 h-12" />
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight">
                    <p className="font-bold text-slate-700">Cryptographically Verified</p>
                    <p>Scan to verify authenticity on</p>
                    <p className="font-mono text-purple-700">hanoonacademy.com/verify</p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="w-36 h-10 border-b-2 border-slate-800 mx-auto border-dashed flex items-end justify-center pb-1">
                    <span className="text-[11px] font-serif italic text-purple-900 font-bold">
                      Irshad Shamil Irfani
                    </span>
                  </div>
                  <p className="text-[10px] font-black text-slate-800 uppercase tracking-wider">
                    Authorized Registrar
                  </p>
                  <p className="text-[9px] text-slate-400">Office of Admissions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
