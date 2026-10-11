"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  GraduationCap,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  Copy,
  Check,
  Filter,
  DollarSign,
  Users,
  CreditCard,
  X,
  XCircle,
  ArrowUpDown,
  Download,
} from "lucide-react";
import {
  UnifiedStudentRegistration,
  fetchUnifiedRegistrations,
  updateStudentPaymentStatusDirect,
  subscribeToStudentRegistrations,
} from "@/services/studentService";
import { getWhatsAppWelcomeUrl } from "@/services/paymentService";
import { addAuditLog } from "@/services/settingsService";

interface StudentRegistrationsSectionProps {
  isSuperAdmin?: boolean;
}

export default function StudentRegistrationsSection({
  isSuperAdmin = true,
}: StudentRegistrationsSectionProps) {
  const [registrations, setRegistrations] = useState<UnifiedStudentRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // WhatsApp Post-Approval Prompt Banner
  const [approvedNotification, setApprovedNotification] = useState<{
    name: string;
    phone: string;
    course: string;
    whatsappUrl: string;
  } | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUnifiedRegistrations();
      setRegistrations(data);
    } catch (err) {
      console.warn("Failed to load student registrations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStudentRegistrations(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

  // Copy UTR handler
  const handleCopy = (text: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedUtr(text);
      setTimeout(() => setCopiedUtr(null), 2000);
    }
  };

  // Quick Action: Green Button "Verify / Mark as Paid" (Updates status to "Verified" in Supabase)
  const handleVerifyStatus = async (item: UnifiedStudentRegistration) => {
    setProcessingId(item.id);
    try {
      const success = await updateStudentPaymentStatusDirect({
        studentId: item.studentId,
        paymentId: item.paymentId,
        newStatus: "APPROVED",
        studentName: item.fullName,
        whatsappNum: item.whatsappNum,
        courseId: item.courseId,
        amount: item.amount || 1500,
      });

      if (success) {
        addAuditLog({
          actor: "Admin",
          action: "Marked as Verified",
          category: "PAYMENT",
          details: `Verified payment and unlocked course for ${item.fullName} (${item.courseChoice}).`,
        });

        const cleanPhone = item.whatsappNum.replace(/\D/g, "");
        const formattedPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
        const welcomeUrl = getWhatsAppWelcomeUrl(item.fullName, item.courseChoice, formattedPhone);

        setApprovedNotification({
          name: item.fullName,
          phone: item.whatsappNum,
          course: item.courseChoice,
          whatsappUrl: welcomeUrl,
        });

        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === item.id ? { ...r, paymentStatus: "APPROVED" } : r
          )
        );
      }
    } catch (err) {
      console.error("Failed to verify status:", err);
      alert("Could not update status. Please check your network connection.");
    } finally {
      setProcessingId(null);
    }
  };

  // Quick Action: Red Button "Reject" (Updates status to "Rejected" in Supabase)
  const handleRejectStatus = async (item: UnifiedStudentRegistration) => {
    setProcessingId(item.id);
    try {
      const success = await updateStudentPaymentStatusDirect({
        studentId: item.studentId,
        paymentId: item.paymentId,
        newStatus: "REJECTED",
        studentName: item.fullName,
        whatsappNum: item.whatsappNum,
        courseId: item.courseId,
        amount: item.amount || 1500,
        rejectionReason: "Payment rejected by admin",
      });

      if (success) {
        addAuditLog({
          actor: "Admin",
          action: "Rejected Payment",
          category: "PAYMENT",
          details: `Rejected registration/payment for ${item.fullName} (${item.courseChoice}).`,
        });

        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === item.id ? { ...r, paymentStatus: "REJECTED" } : r
          )
        );
      }
    } catch (err) {
      console.error("Failed to reject status:", err);
      alert("Could not update status. Please check your network connection.");
    } finally {
      setProcessingId(null);
    }
  };

  // Filtered registrations
  const filtered = useMemo(() => {
    return registrations.filter((item) => {
      // 1. Status Filter
      if (statusFilter === "PENDING" && item.paymentStatus !== "PENDING") return false;
      if (statusFilter === "APPROVED" && item.paymentStatus !== "APPROVED") return false;
      if (statusFilter === "REJECTED" && item.paymentStatus !== "REJECTED") return false;

      // 2. Search Query (name or phone)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = item.fullName.toLowerCase().includes(q);
        const phoneMatch = item.whatsappNum.toLowerCase().includes(q);
        const districtMatch = item.district.toLowerCase().includes(q);
        const courseMatch = item.courseChoice.toLowerCase().includes(q);
        const utrMatch = item.upiTxId.toLowerCase().includes(q);
        return nameMatch || phoneMatch || districtMatch || courseMatch || utrMatch;
      }

      return true;
    });
  }, [registrations, statusFilter, searchQuery]);

  // Derived counts
  const totalCount = registrations.length;
  const approvedCount = registrations.filter((r) => r.paymentStatus === "APPROVED").length;
  const pendingCount = registrations.filter((r) => r.paymentStatus === "PENDING").length;
  const rejectedCount = registrations.filter((r) => r.paymentStatus === "REJECTED").length;
  const verifiedRevenue = registrations
    .filter((r) => r.paymentStatus === "APPROVED")
    .reduce((acc, r) => acc + (r.amount || 0), 0);

  // CSV Export for paid / verified or filtered students
  const handleExportCSV = (onlyPaid: boolean = false) => {
    const listToExport = onlyPaid
      ? registrations.filter((r) => r.paymentStatus === "APPROVED")
      : filtered;

    if (listToExport.length === 0) {
      alert(onlyPaid ? "No verified / paid students found to export." : "No records match the current filter to export.");
      return;
    }

    const headers = [
      "Student Name",
      "Mobile / WhatsApp",
      "Place / District",
      "Course Choice",
      "Payment Status",
      "Amount (INR)",
      "UTR / Transaction ID",
      "Registration Date",
    ];

    const escapeCsv = (val: string | number | undefined | null) => {
      const str = String(val ?? "");
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = listToExport.map((item: UnifiedStudentRegistration) => [
      escapeCsv(item.fullName),
      escapeCsv(item.whatsappNum),
      escapeCsv(item.district),
      escapeCsv(item.courseChoice),
      escapeCsv(
        item.paymentStatus === "APPROVED"
          ? "Verified"
          : item.paymentStatus === "REJECTED"
          ? "Rejected"
          : "Pending Verification"
      ),
      escapeCsv(item.amount || 0),
      escapeCsv(item.upiTxId || "N/A"),
      escapeCsv(item.registrationDate || "N/A"),
    ]);

    // Prepend UTF-8 BOM so Excel opens Malayalam & special chars cleanly
    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    link.download = onlyPaid
      ? `hanoon_verified_paid_students_${dateStr}.csv`
      : `hanoon_students_${statusFilter.toLowerCase()}_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 sm:space-y-6 w-full animate-fade-in font-['Plus_Jakarta_Sans']">
      {/* 1. Metrics Overview Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Registrations */}
        <div
          onClick={() => setStatusFilter("ALL")}
          className={`p-4 sm:p-5 rounded-2xl border shadow-md space-y-1.5 cursor-pointer transition-all hover:-translate-y-0.5 ${
            statusFilter === "ALL"
              ? "bg-purple-50/60 border-purple-300 ring-2 ring-purple-400/30"
              : "bg-white border-purple-100 hover:border-purple-200"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
              Total Registrations
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {totalCount}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {totalCount === 0 ? "No students registered yet" : `${totalCount} registered students`}
            </p>
          </div>
        </div>

        {/* Pending Verification */}
        <div
          onClick={() => setStatusFilter("PENDING")}
          className={`p-4 sm:p-5 rounded-2xl border shadow-md space-y-1.5 cursor-pointer transition-all hover:-translate-y-0.5 ${
            statusFilter === "PENDING"
              ? "bg-amber-50 border-amber-400 ring-2 ring-amber-400/30"
              : "bg-white border-amber-200/90 bg-amber-50/15 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-800">
              Pending Verification
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {pendingCount}
              </h3>
              {pendingCount > 0 && (
                <span className="text-[10px] font-black uppercase text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 animate-pulse">
                  Action Required
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              {pendingCount === 0 ? "All verified" : `${pendingCount} awaiting verification`}
            </p>
          </div>
        </div>

        {/* Verified / Paid */}
        <div
          onClick={() => setStatusFilter("APPROVED")}
          className={`p-4 sm:p-5 rounded-2xl border shadow-md space-y-1.5 cursor-pointer transition-all hover:-translate-y-0.5 ${
            statusFilter === "APPROVED"
              ? "bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/30"
              : "bg-white border-emerald-100 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-800">
              Verified / Paid
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight text-emerald-700">
              {approvedCount}
            </h3>
            <p className="text-[11px] text-emerald-600 font-medium">
              Course portal access unlocked
            </p>
          </div>
        </div>

        {/* Rejected */}
        <div
          onClick={() => setStatusFilter("REJECTED")}
          className={`p-4 sm:p-5 rounded-2xl border shadow-md space-y-1.5 cursor-pointer transition-all hover:-translate-y-0.5 ${
            statusFilter === "REJECTED"
              ? "bg-rose-50 border-rose-400 ring-2 ring-rose-400/30"
              : "bg-white border-rose-100 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-rose-800">
              Rejected
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xl sm:text-2xl font-black text-rose-700 tracking-tight">
              {rejectedCount}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium truncate">
              {rejectedCount === 0 ? "No rejected records" : `${rejectedCount} flagged / rejected`}
            </p>
          </div>
        </div>
      </div>

      {/* 2. WhatsApp Post-Approval Prompt Banner */}
      {approvedNotification && (
        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full border border-emerald-300">
                  Verified Successfully
                </span>
                <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950">
                  {approvedNotification.name} is Enrolled!
                </h4>
              </div>
              <p className="text-[11px] text-emerald-800 mt-0.5 font-medium">
                Send official welcome confirmation & course access link via WhatsApp:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={approvedNotification.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send WhatsApp Welcome</span>
            </a>
            <button
              type="button"
              onClick={() => setApprovedNotification(null)}
              className="p-2 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 3. Main Data Card & Controls */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-md p-4 sm:p-6 space-y-4">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                🎓
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Student Registrations & Payments
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live registration list from Supabase with instant Payment Status verification and WhatsApp links.
            </p>
          </div>

          {/* Search Box & Status Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[200px] sm:w-64 flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white font-medium transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Filter Tabs / Select */}
            <div className="flex items-center bg-purple-50/60 p-1 rounded-xl border border-purple-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-white text-purple-700 font-extrabold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("PENDING")}
                className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  statusFilter === "PENDING"
                    ? "bg-amber-100 text-amber-900 font-extrabold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("APPROVED")}
                className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  statusFilter === "APPROVED"
                    ? "bg-emerald-100 text-emerald-900 font-extrabold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Verified ({approvedCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("REJECTED")}
                className={`py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  statusFilter === "REJECTED"
                    ? "bg-rose-100 text-rose-900 font-extrabold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Rejected ({rejectedCount})
              </button>
            </div>

            {/* Export CSV Buttons */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleExportCSV(true)}
                disabled={loading || approvedCount === 0}
                className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Download spreadsheet of all verified / paid students"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Paid (CSV)</span>
                <span className="sm:hidden">Paid CSV</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportCSV(false)}
                disabled={loading || filtered.length === 0}
                className="py-2 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Download spreadsheet of currently filtered list"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Filtered</span>
              </button>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100 transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Data from Supabase"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 4. Table (Desktop / Tablet) */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-purple-100">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-purple-50/70 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-purple-100">
              <tr>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Mobile / WhatsApp</th>
                <th className="py-3.5 px-4">Course Choice</th>
                <th className="py-3.5 px-4">District / Place</th>
                <th className="py-3.5 px-4">Registration Date</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 font-medium text-slate-800">
              {loading && registrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                      <span>Loading registration records from Supabase...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center font-bold text-xl">
                        🎓
                      </div>
                      <h4 className="text-sm font-black text-slate-800">
                        {searchQuery ? "No Matching Registrations" : "No student registrations found"}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {searchQuery
                          ? "Try searching for a different student name or mobile number."
                          : "When students register on the website, their details will appear here with 'Pending Verification' status."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const isVerified = item.paymentStatus === "APPROVED";
                  const isProcessing = processingId === item.id;

                  const cleanPhone = item.whatsappNum.replace(/\D/g, "");
                  const formattedPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
                  const waUrl = getWhatsAppWelcomeUrl(item.fullName, item.courseChoice, formattedPhone);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-purple-50/40 transition-colors ${
                        !isVerified ? "bg-amber-50/20" : ""
                      }`}
                    >
                      {/* Column 1: Student Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shadow-2xs shrink-0">
                            {item.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900 block leading-tight">
                              {item.fullName}
                            </span>
                            {item.upiTxId && item.upiTxId !== "-" && (
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <span>UTR: {item.upiTxId}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(item.upiTxId)}
                                  className="text-slate-400 hover:text-purple-700"
                                  title="Copy UTR"
                                >
                                  {copiedUtr === item.upiTxId ? (
                                    <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-2.5 h-2.5" />
                                  )}
                                </button>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Mobile / WhatsApp Number */}
                      <td className="py-3.5 px-4 font-mono">
                        <a
                          href={`https://wa.me/${formattedPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-purple-700 hover:text-purple-900 font-bold hover:underline"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>{item.whatsappNum || "N/A"}</span>
                        </a>
                      </td>

                      {/* Column 3: Course Choice */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-800 font-extrabold text-[11px] border border-purple-100 inline-block">
                          {item.courseChoice}
                        </span>
                      </td>

                      {/* Column 4: District / Place */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {item.district || "Kerala"}
                      </td>

                      {/* Column 5: Registration Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(item.registrationDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Column 6: Payment Status Badges (Yellow Pending, Green Verified, Red Rejected) */}
                      <td className="py-3.5 px-4">
                        {item.paymentStatus === "APPROVED" ? (
                          /* 🟢 "Verified" (Green Badge) */
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-black text-[11px] border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Verified</span>
                          </span>
                        ) : item.paymentStatus === "REJECTED" ? (
                          /* 🔴 "Rejected" (Red Badge) */
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-800 font-black text-[11px] border border-rose-300">
                            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>Rejected</span>
                          </span>
                        ) : (
                          /* 🟡 "Pending Verification" (Yellow/Orange Badge) */
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 font-black text-[11px] border border-amber-300 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Pending Verification</span>
                          </span>
                        )}
                      </td>

                      {/* Column 7: Quick Action Buttons (Verify / Mark as Paid & Reject) */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Green Button: "Verify / Mark as Paid" */}
                          {item.paymentStatus !== "APPROVED" && (
                            <button
                              type="button"
                              onClick={() => handleVerifyStatus(item)}
                              disabled={isProcessing}
                              className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              title="Verify / Mark as Paid in Supabase"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify / Mark as Paid</span>
                            </button>
                          )}

                          {/* Red Button: "Reject" */}
                          {item.paymentStatus !== "REJECTED" && (
                            <button
                              type="button"
                              onClick={() => handleRejectStatus(item)}
                              disabled={isProcessing}
                              className="py-1.5 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                              title="Reject Registration in Supabase"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          )}

                          {/* WhatsApp Direct Contact Button */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer"
                            title="Send Welcome Message via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
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

        {/* 5. Mobile Cards (md:hidden) */}
        <div className="block md:hidden space-y-3">
          {loading && registrations.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin text-purple-600 mx-auto mb-2" />
              <span>Loading student registrations...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center bg-purple-50/30 rounded-2xl p-6">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 mx-auto flex items-center justify-center font-bold text-lg mb-2">
                🎓
              </div>
              <h4 className="text-xs font-black text-slate-800">
                {searchQuery ? "No Students Found" : "No Registrations Yet"}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {searchQuery
                  ? "Check spelling or search by WhatsApp number."
                  : "New student registrations will show here with 'Pending Verification' status automatically."}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const isVerified = item.paymentStatus === "APPROVED";
              const isProcessing = processingId === item.id;

              const cleanPhone = item.whatsappNum.replace(/\D/g, "");
              const formattedPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
              const waUrl = getWhatsAppWelcomeUrl(item.fullName, item.courseChoice, formattedPhone);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border space-y-3 transition-all ${
                    !isVerified
                      ? "bg-amber-50/30 border-amber-200 shadow-2xs"
                      : "bg-white border-purple-100 shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                        {item.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 leading-tight">
                          {item.fullName}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {item.district || "Kerala"} •{" "}
                          {new Date(item.registrationDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {item.paymentStatus === "APPROVED" ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-black text-[10px] border border-emerald-300">
                          🟢 Verified
                        </span>
                      ) : item.paymentStatus === "REJECTED" ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 font-black text-[10px] border border-rose-300">
                          🔴 Rejected
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-black text-[10px] border border-amber-300 animate-pulse">
                          🟡 Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-purple-50/50 border border-purple-100/60 text-xs">
                    <span className="font-extrabold text-purple-900 truncate">
                      {item.courseChoice}
                    </span>
                    <a
                      href={`https://wa.me/${formattedPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold text-slate-800 text-[11px] inline-flex items-center gap-1 hover:underline"
                    >
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>{item.whatsappNum}</span>
                    </a>
                  </div>

                  {item.upiTxId && item.upiTxId !== "-" && (
                    <div className="flex items-center justify-between text-[11px] px-1 text-slate-500 font-mono">
                      <span>UTR: {item.upiTxId}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.upiTxId)}
                        className="text-purple-700 font-bold hover:underline"
                      >
                        {copiedUtr === item.upiTxId ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  )}

                  {/* Actions on Mobile */}
                  <div className="flex items-center justify-between pt-1 border-t border-purple-50/80 gap-2 flex-wrap">
                    <span className="text-xs font-black text-slate-900">
                      ₹{item.amount?.toLocaleString("en-IN") || "1,500"}
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.paymentStatus !== "APPROVED" && (
                        <button
                          type="button"
                          onClick={() => handleVerifyStatus(item)}
                          disabled={isProcessing}
                          className="py-1 px-2 rounded-xl bg-emerald-600 text-white font-extrabold text-[11px] inline-flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verify</span>
                        </button>
                      )}

                      {item.paymentStatus !== "REJECTED" && (
                        <button
                          type="button"
                          onClick={() => handleRejectStatus(item)}
                          disabled={isProcessing}
                          className="py-1 px-2 rounded-xl bg-rose-600 text-white font-extrabold text-[11px] inline-flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Reject</span>
                        </button>
                      )}

                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-1 px-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-[11px] inline-flex items-center gap-1"
                      >
                        <MessageCircle className="w-3 h-3 text-emerald-600" />
                        <span>WA</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
