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
  Eye,
  Image as ImageIcon,
  ExternalLink,
  Camera,
  Trash2,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import {
  UnifiedStudentRegistration,
  fetchUnifiedRegistrations,
  fetchUnifiedRegistrationsDetailed,
  updateStudentPaymentStatusDirect,
  subscribeToStudentRegistrations,
  purgeDuplicateAndDummyRegistrations,
  deleteStudentRegistrationDirect,
} from "@/services/studentService";
import { getWhatsAppWelcomeUrl } from "@/services/paymentService";
import { addAuditLog, clearAuditLogs } from "@/services/settingsService";
import { sendWhatsAppAlert, getPaymentVerificationWhatsAppUrl } from "@/services/whatsappService";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

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
  const [screenshotModalItem, setScreenshotModalItem] = useState<UnifiedStudentRegistration | null>(null);

  // Duplicate / Dummy Data Purge & Clear Log States
  const [isPurging, setIsPurging] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeIncludeRejected, setPurgeIncludeRejected] = useState(true);
  const [purgeSuccessMsg, setPurgeSuccessMsg] = useState<string | null>(null);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [showClearLogConfirm, setShowClearLogConfirm] = useState(false);

  // Single Item Delete State
  const [deleteTarget, setDeleteTarget] = useState<UnifiedStudentRegistration | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // WhatsApp Post-Approval Prompt Banner
  const [approvedNotification, setApprovedNotification] = useState<{
    name: string;
    phone: string;
    course: string;
    whatsappUrl: string;
  } | null>(null);

  // Strict debounced loading to avoid race conditions & duplicate entries
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const inFlightRef = React.useRef(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Load Data
  const loadData = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      const { data, error } = await fetchUnifiedRegistrationsDetailed();
      setRegistrations(data);
      setFetchError(error);
    } catch (err: any) {
      console.warn("Failed to load student registrations:", err);
      setFetchError(err?.message || "Failed to load student registrations from Supabase.");
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  const debouncedLoadData = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      loadData();
    }, 250);
  }, [loadData]);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStudentRegistrations(() => {
      debouncedLoadData();
    });
    return () => {
      unsubscribe();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [loadData, debouncedLoadData]);

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

        sendWhatsAppAlert({
          type: "PAYMENT_VERIFIED",
          studentName: item.fullName,
          phone: item.whatsappNum,
          courseName: item.courseChoice,
        });

        const welcomeUrl = getPaymentVerificationWhatsAppUrl(item.whatsappNum, item.fullName);

        setApprovedNotification({
          name: item.fullName,
          phone: item.whatsappNum,
          course: item.courseChoice,
          whatsappUrl: welcomeUrl,
        });

        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === item.id || (item.paymentId && r.paymentId === item.paymentId)
              ? { ...r, paymentStatus: "APPROVED" }
              : r
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
            r.id === item.id || (item.paymentId && r.paymentId === item.paymentId)
              ? { ...r, paymentStatus: "REJECTED" }
              : r
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

  // Purge Duplicate, Dummy & Test Registrations
  const handlePurgeDuplicates = async () => {
    setIsPurging(true);
    try {
      const res = await purgeDuplicateAndDummyRegistrations({
        includeRejected: purgeIncludeRejected,
      });
      setShowPurgeConfirm(false);
      setPurgeSuccessMsg(
        `Cleanup complete: Purged ${res.purgedStudents} duplicate/dummy student record(s) and ${res.purgedPayments} duplicate/test payment(s). Accurate remaining records: ${res.remainingCount}`
      );
      setTimeout(() => setPurgeSuccessMsg(null), 6000);
      await loadData();
    } catch (err) {
      console.error("Failed to purge duplicates:", err);
      alert("Could not complete purge operation. Please check your network and try again.");
    } finally {
      setIsPurging(false);
    }
  };

  // Clear Activity / System History Logs
  const handleClearActivityLogs = async () => {
    setIsClearingLogs(true);
    try {
      await clearAuditLogs();
      setShowClearLogConfirm(false);
      setPurgeSuccessMsg("System activity log & history successfully cleared.");
      setTimeout(() => setPurgeSuccessMsg(null), 5000);
    } catch (err) {
      console.error("Failed to clear activity logs:", err);
      alert("Could not clear activity logs. Please check your network connection.");
    } finally {
      setIsClearingLogs(false);
    }
  };

  // Delete Individual Student / Dummy Registration Record
  const handleDeleteRegistration = async () => {
    if (!deleteTarget) return;
    setIsDeletingItem(true);
    try {
      await deleteStudentRegistrationDirect({
        studentId: deleteTarget.studentId,
        paymentId: deleteTarget.paymentId,
      });

      addAuditLog({
        actor: "Admin",
        action: "Deleted Registration Record",
        category: "PAYMENT",
        details: `Deleted student registration record for ${deleteTarget.fullName} (${deleteTarget.whatsappNum}).`,
      });

      setRegistrations((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      const deletedName = deleteTarget.fullName;
      setDeleteTarget(null);
      setPurgeSuccessMsg(`Successfully deleted record for ${deletedName}.`);
      setTimeout(() => setPurgeSuccessMsg(null), 5000);
    } catch (err) {
      console.error("Failed to delete registration record:", err);
      alert("Could not delete record. Please check your network connection.");
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Preserves ALL records (payments and registered students) without dropping multiple attempts or transactions
  const deduplicatedRegistrations = useMemo(() => {
    const seenKeys = new Set<string>();
    const result: UnifiedStudentRegistration[] = [];

    for (const item of registrations) {
      // Key uniquely by paymentId if it exists, otherwise by item ID
      const uniqueKey = item.paymentId ? `pay_${item.paymentId}` : (item.id || `std_${item.studentId}`);
      if (seenKeys.has(uniqueKey)) continue;
      seenKeys.add(uniqueKey);
      result.push(item);
    }

    // Keep newest first
    return result.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
  }, [registrations]);

  // Filtered registrations
  const filtered = useMemo(() => {
    return deduplicatedRegistrations.filter((item) => {
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
  }, [deduplicatedRegistrations, statusFilter, searchQuery]);

  // Derived counts
  const totalCount = deduplicatedRegistrations.length;
  const approvedCount = deduplicatedRegistrations.filter((r) => r.paymentStatus === "APPROVED").length;
  const pendingCount = deduplicatedRegistrations.filter((r) => r.paymentStatus === "PENDING").length;
  const rejectedCount = deduplicatedRegistrations.filter((r) => r.paymentStatus === "REJECTED").length;
  const verifiedRevenue = deduplicatedRegistrations
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
      {/* Supabase Connection Status Banner */}
      {!isSupabaseConfigured ? (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-black text-amber-900 text-sm">
              Offline Device-Only Mode Active (Supabase Not Connected)
            </p>
            <p className="text-amber-800 leading-relaxed font-medium">
              Student records are currently saving <strong>only inside this phone&apos;s browser memory</strong>. They will <strong>NOT</strong> sync to other phones or the Super Admin dashboard until your <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> is set in your Vercel Environment Variables.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs font-bold shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Supabase Cloud Database Connected (Multi-Device Live Sync Active)</span>
          </div>
          <span className="text-[10px] uppercase font-black tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300">
            Live Cloud
          </span>
        </div>
      )}

      {/* Prominent Red Alert Box for Supabase Fetch / RLS / Column Errors */}
      {fetchError && (
        <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex flex-col sm:flex-row items-start justify-between gap-3 shadow-md animate-fade-in">
          <div className="flex items-start gap-3">
            <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-black text-rose-900 text-sm sm:text-base">
                  Database Query Error Encountered
                </h4>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">
                  Supabase / RLS Issue
                </span>
              </div>
              <p className="text-xs text-rose-800 font-medium leading-relaxed">
                The database returned an error while fetching student or payment records:
              </p>
              <div className="mt-2 p-2.5 rounded-lg bg-rose-100/90 border border-rose-300 font-mono text-[11px] text-rose-900 break-all select-all">
                {fetchError}
              </div>
              <p className="text-[11px] text-rose-700 pt-1">
                Tip: Check that Row-Level Security (RLS) policies on <code>public.payments</code>, <code>public.students</code>, and <code>public.profiles</code> permit SELECT access, and verify required columns exist.
              </p>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => loadData()}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Query
            </button>
            <button
              type="button"
              onClick={() => setFetchError(null)}
              className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs transition-colors cursor-pointer"
              title="Dismiss error notice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
              <span>Send WhatsApp Alert</span>
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

      {/* Purge Success Alert Banner */}
      {purgeSuccessMsg && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-center justify-between gap-3 animate-fade-in shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-amber-950">
                Registrations Database Cleaned
              </h4>
              <p className="text-[11px] text-amber-800 mt-0.5 font-medium">
                {purgeSuccessMsg}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPurgeSuccessMsg(null)}
            className="p-2 text-amber-700 hover:text-amber-950 hover:bg-amber-100 rounded-xl transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
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
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative w-full sm:w-60 lg:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-purple-600 focus:bg-white font-medium transition-all"
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
            <div className="flex items-center bg-purple-50/60 p-1 rounded-xl border border-purple-100 text-xs font-bold overflow-x-auto no-scrollbar max-w-full">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`py-1.5 px-2.5 sm:px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
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
                className={`py-1.5 px-2.5 sm:px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
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
                className={`py-1.5 px-2.5 sm:px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
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
                className={`py-1.5 px-2.5 sm:px-3 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === "REJECTED"
                    ? "bg-rose-100 text-rose-900 font-extrabold shadow-2xs"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Rejected ({rejectedCount})
              </button>
            </div>

            {/* Export CSV & Refresh */}
            <div className="flex items-center justify-between sm:justify-start gap-1.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleExportCSV(true)}
                disabled={loading || approvedCount === 0}
                className="flex-1 sm:flex-initial py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Download spreadsheet of all verified / paid students"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Paid</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportCSV(false)}
                disabled={loading || filtered.length === 0}
                className="py-2 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Download spreadsheet of currently filtered list"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Export Filtered</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPurgeConfirm(true)}
                disabled={loading || isPurging || totalCount === 0}
                className="py-2 px-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Purge duplicate registrations and dummy test records"
              >
                <Sparkles className={`w-3.5 h-3.5 text-amber-600 ${isPurging ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Purge Test Data</span>
                <span className="sm:hidden">Purge</span>
              </button>

              <button
                type="button"
                onClick={() => setShowClearLogConfirm(true)}
                disabled={loading || isClearingLogs}
                className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Clear activity log & reset history"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span className="hidden sm:inline">Clear Logs</span>
                <span className="sm:hidden">Logs</span>
              </button>

              <button
                type="button"
                onClick={loadData}
                disabled={loading || isPurging}
                className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100 transition-all cursor-pointer disabled:opacity-50"
                title="Refresh Data from Supabase"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* 4. Table (Desktop / Tablet) */}
        <div className="hidden sm:block overflow-x-auto rounded-2xl border border-purple-100">
          <table className="w-full text-left text-xs min-w-[820px]">
            <thead className="bg-purple-50/70 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-purple-100">
              <tr>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Mobile / WhatsApp</th>
                <th className="py-3.5 px-4">Course Choice</th>
                <th className="py-3.5 px-4">Payment Proof</th>
                <th className="py-3.5 px-4">District / Place</th>
                <th className="py-3.5 px-4">Registration Date</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 font-medium text-slate-800">
              {loading && registrations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                      <span>Loading registration records from Supabase...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-2">
                      <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center font-bold text-xl ${
                        fetchError ? "bg-rose-100 text-rose-700" : "bg-purple-50 text-purple-600"
                      }`}>
                        {fetchError ? "⚠️" : "🎓"}
                      </div>
                      <h4 className="text-sm font-black text-slate-800">
                        {fetchError
                          ? "Database Records Unavailable"
                          : searchQuery
                          ? "No Matching Registrations"
                          : "No student registrations found"}
                      </h4>
                      <div className="text-xs text-slate-500 leading-relaxed">
                        {fetchError ? (
                          <div className="space-y-2 mt-2">
                            <p className="text-rose-700 font-medium">
                              Supabase encountered an error when fetching registration records:
                            </p>
                            <p className="font-mono text-[11px] text-rose-800 bg-rose-50 border border-rose-200 p-2 rounded-lg break-all">
                              {fetchError}
                            </p>
                            <button
                              type="button"
                              onClick={() => loadData()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Retry Fetching
                            </button>
                          </div>
                        ) : searchQuery ? (
                          "Try searching for a different student name or mobile number."
                        ) : (
                          "When students register on the website, their details and payment screenshots will appear here with 'Pending Verification' status."
                        )}
                      </div>
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
                            <span className="text-[10px] text-slate-400 font-medium">
                              ₹{item.amount?.toLocaleString("en-IN") || "1,500"}
                            </span>
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

                      {/* Column 4: Payment Screenshot Thumbnail (Replaced text TxID) */}
                      <td className="py-3.5 px-4">
                        {item.screenshotUrl ? (
                          <button
                            type="button"
                            onClick={() => setScreenshotModalItem(item)}
                            className="group flex items-center gap-2 p-1.5 rounded-xl bg-purple-50/70 hover:bg-purple-100 border border-purple-200 transition-all cursor-pointer text-left w-fit shadow-2xs hover:scale-[1.02] active:scale-95"
                            title="Click to view full payment screenshot"
                          >
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-purple-200 shrink-0 bg-white shadow-2xs">
                              <img
                                src={item.screenshotUrl}
                                alt={`Receipt of ${item.fullName}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                            </div>
                            <div className="pr-1">
                              <span className="text-[11px] font-extrabold text-purple-700 block group-hover:underline leading-tight flex items-center gap-1">
                                <span>View Proof</span>
                                <span className="text-[10px]">↗</span>
                              </span>
                              <span className="text-[9px] text-slate-400 font-medium block">
                                Enlarge
                              </span>
                            </div>
                          </button>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic flex items-center gap-1.5 py-1">
                            <ImageIcon className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            <span>No screenshot</span>
                          </div>
                        )}
                      </td>

                      {/* Column 5: District / Place */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {item.district || "Kerala"}
                      </td>

                      {/* Column 6: Registration Date */}
                      <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(item.registrationDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>

                      {/* Column 7: Payment Status Badges (Yellow Pending, Green Verified, Red Rejected) */}
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

                      {/* Column 8: Quick Action Buttons (Verify / Mark as Paid & Reject) */}
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
                            className="py-1.5 px-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-[11px] inline-flex items-center gap-1 transition-all cursor-pointer"
                            title="Send WhatsApp Alert to Student"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp Alert</span>
                          </a>

                          {/* Delete Dummy / Test Record Button */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            disabled={isProcessing || isDeletingItem}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer disabled:opacity-40"
                            title="Delete / Remove Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Mobile Cards (< 640px screen breakpoint: block sm:hidden) */}
        <div className="block sm:hidden space-y-3.5">
          {loading && registrations.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-5 h-5 animate-spin text-purple-600 mx-auto mb-2" />
              <span>Loading student registrations...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className={`py-10 text-center rounded-2xl p-5 border ${
              fetchError ? "bg-rose-50/70 border-rose-200" : "bg-purple-50/40 border-purple-100"
            }`}>
              <div className={`w-11 h-11 rounded-2xl mx-auto flex items-center justify-center font-bold text-xl mb-2.5 ${
                fetchError ? "bg-rose-100 text-rose-700" : "bg-purple-100 text-purple-700"
              }`}>
                {fetchError ? "⚠️" : "🎓"}
              </div>
              <h4 className="text-sm font-black text-slate-800">
                {fetchError
                  ? "Database Records Unavailable"
                  : searchQuery
                  ? "No Students Found"
                  : "No Registrations Yet"}
              </h4>
              <div className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                {fetchError ? (
                  <div className="space-y-2 mt-2">
                    <p className="text-rose-700 font-medium text-[11px]">
                      Failed to fetch registrations from Supabase:
                    </p>
                    <p className="font-mono text-[10px] text-rose-800 bg-white border border-rose-200 p-2 rounded-lg break-all text-left">
                      {fetchError}
                    </p>
                    <button
                      type="button"
                      onClick={() => loadData()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retry Fetching
                    </button>
                  </div>
                ) : searchQuery ? (
                  "Check spelling or search by WhatsApp number."
                ) : (
                  "New student registrations and screenshots will show here with 'Pending Verification' status automatically."
                )}
              </div>
            </div>
          ) : (
            filtered.map((item) => {
              const isVerified = item.paymentStatus === "APPROVED";
              const isRejected = item.paymentStatus === "REJECTED";
              const isPending = !isVerified && !isRejected;
              const isProcessing = processingId === item.id;

              const cleanPhone = item.whatsappNum.replace(/\D/g, "");
              const formattedPhone = cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`;
              const waUrl = getWhatsAppWelcomeUrl(item.fullName, item.courseChoice, formattedPhone);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border space-y-3 transition-all ${
                    isPending
                      ? "bg-amber-50/40 border-amber-200/90 shadow-sm ring-1 ring-amber-100"
                      : isVerified
                      ? "bg-white border-purple-100 shadow-xs"
                      : "bg-rose-50/30 border-rose-200/70 shadow-xs"
                  }`}
                >
                  {/* Card Header: Student Name + Date + Status Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {item.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-black text-slate-900 leading-tight truncate">
                          {item.fullName}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {new Date(item.registrationDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-black text-[10px] border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Verified</span>
                        </span>
                      ) : isRejected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 font-black text-[10px] border border-rose-300">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>Rejected</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-black text-[10px] border border-amber-300 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Pending</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Course & Amount Row */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/60 border border-purple-100/70 text-xs">
                    <div className="min-w-0 pr-2">
                      <span className="text-[10px] uppercase font-bold text-purple-600 block leading-tight">
                        Course
                      </span>
                      <span className="font-extrabold text-slate-900 truncate block">
                        {item.courseChoice}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block leading-tight">
                        Fee Amount
                      </span>
                      <span className="font-black text-purple-700 text-sm">
                        ₹{item.amount?.toLocaleString("en-IN") || "1,500"}
                      </span>
                    </div>
                  </div>

                  {/* District & WhatsApp Contact */}
                  <div className="flex items-center justify-between text-xs text-slate-600 px-0.5">
                    <span className="text-[11px] font-medium text-slate-500">
                      📍 {item.district || "Kerala"}
                    </span>
                    <a
                      href={`https://wa.me/${formattedPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold text-purple-700 text-[11px] inline-flex items-center gap-1 hover:underline"
                    >
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span>{item.whatsappNum}</span>
                    </a>
                  </div>

                  {/* Uploaded Screenshot Thumbnail Section */}
                  {item.screenshotUrl ? (
                    <div
                      onClick={() => setScreenshotModalItem(item)}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/80 hover:bg-purple-100/80 border border-purple-200 transition-all cursor-pointer active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-purple-200 bg-white shrink-0 shadow-2xs">
                          <img
                            src={item.screenshotUrl}
                            alt={`Receipt of ${item.fullName}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-slate-900 block leading-tight">
                            Payment Screenshot
                          </span>
                          <span className="text-[10px] text-purple-700 font-bold block mt-0.5">
                            Tap to view full receipt
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScreenshotModalItem(item);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-white border border-purple-200 text-purple-700 font-extrabold text-[11px] shadow-2xs flex items-center gap-1 shrink-0"
                      >
                        <Eye className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 italic p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span>No screenshot proof attached</span>
                    </div>
                  )}

                  {/* Action Buttons: Neatly aligned side-by-side & full-width */}
                  <div className="space-y-2 pt-1 border-t border-purple-100/80">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleVerifyStatus(item)}
                        disabled={isProcessing || isVerified}
                        className={`w-full py-2.5 px-3 rounded-xl font-black text-xs inline-flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer min-h-[44px] ${
                          isVerified
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default"
                            : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white disabled:opacity-50"
                        }`}
                        title="Verify / Mark as Paid in Supabase"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">{isProcessing ? "Processing..." : isVerified ? "Verified (Paid) ✓" : "Verify / Mark as Paid"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectStatus(item)}
                        disabled={isProcessing || isRejected}
                        className={`w-full py-2.5 px-3 rounded-xl font-black text-xs inline-flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer min-h-[44px] ${
                          isRejected
                            ? "bg-rose-100 text-rose-800 border border-rose-200 cursor-default"
                            : "bg-rose-600 hover:bg-rose-700 active:scale-95 text-white disabled:opacity-50"
                        }`}
                        title="Reject Registration in Supabase"
                      >
                        <XCircle className="w-4 h-4 shrink-0" />
                        <span className="truncate">{isProcessing ? "Processing..." : isRejected ? "Rejected 🔴" : "Reject"}</span>
                      </button>
                    </div>

                    {/* WhatsApp Action Alert Button + Delete Record Button */}
                    <div className="flex items-center gap-2">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all min-h-[44px]"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>WhatsApp Alert</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(item)}
                        disabled={isProcessing || isDeletingItem}
                        className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer min-h-[44px] shrink-0"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 6. Admin / Verifier Full-Size Payment Screenshot Lightbox Modal */}
      {screenshotModalItem && (
        <div
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in"
          onClick={() => setScreenshotModalItem(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-purple-100 flex items-center justify-between gap-3 bg-purple-50/40">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm shrink-0">
                  {screenshotModalItem.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                    {screenshotModalItem.fullName} — Payment Proof
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium truncate">
                    Course: <strong className="text-slate-800">{screenshotModalItem.courseChoice}</strong> • Amount: <strong className="text-purple-700">₹{screenshotModalItem.amount?.toLocaleString("en-IN") || "1,500"}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setScreenshotModalItem(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Image Body */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-900/5 flex items-center justify-center min-h-[300px]">
              {screenshotModalItem.screenshotUrl ? (
                <img
                  src={screenshotModalItem.screenshotUrl}
                  alt={`Payment screenshot for ${screenshotModalItem.fullName}`}
                  className="max-w-full max-h-[60vh] object-contain rounded-2xl shadow-lg border border-purple-100 bg-white"
                />
              ) : (
                <div className="text-center p-8 text-slate-400 space-y-2">
                  <ImageIcon className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-xs font-bold">No screenshot image available</p>
                </div>
              )}
            </div>

            {/* Modal Footer with Verification Actions & Status */}
            <div className="p-3.5 sm:p-5 border-t border-purple-100 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-500 font-semibold">Status:</span>
                {screenshotModalItem.paymentStatus === "APPROVED" ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-300">
                    🟢 Verified
                  </span>
                ) : screenshotModalItem.paymentStatus === "REJECTED" ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-800 font-black text-xs border border-rose-300">
                    🔴 Rejected
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-black text-xs border border-amber-300 animate-pulse">
                    🟡 Pending Verification
                  </span>
                )}
              </div>

              {/* Verification Action Buttons inside Modal */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
                {screenshotModalItem.paymentStatus !== "APPROVED" && (
                  <button
                    type="button"
                    onClick={() => {
                      handleVerifyStatus(screenshotModalItem);
                      setScreenshotModalItem(null);
                    }}
                    disabled={processingId === screenshotModalItem.id}
                    className="flex-1 sm:flex-initial py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 min-h-[42px]"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Approve ✅</span>
                  </button>
                )}

                {screenshotModalItem.paymentStatus !== "REJECTED" && (
                  <button
                    type="button"
                    onClick={() => {
                      handleRejectStatus(screenshotModalItem);
                      setScreenshotModalItem(null);
                    }}
                    disabled={processingId === screenshotModalItem.id}
                    className="flex-1 sm:flex-initial py-2.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 min-h-[42px]"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>Reject ❌</span>
                  </button>
                )}

                {screenshotModalItem.screenshotUrl && (
                  <a
                    href={screenshotModalItem.screenshotUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs inline-flex items-center justify-center gap-1.5 border border-purple-200 transition-colors min-h-[42px]"
                    title="Open full image in new tab"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">New Tab</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setScreenshotModalItem(null)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer text-center min-h-[42px]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Purge Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowPurgeConfirm(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-5 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Purge Duplicate & Test Records?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  This tool scans both Supabase and local cache to merge repeat student entries (by phone number), preserving their verified payment records, while removing dummy or test submissions (e.g. &apos;test&apos;, &apos;dummy&apos;, invalid phone numbers).
                </p>
              </div>
            </div>

            <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200 text-amber-900 text-xs space-y-2 font-medium">
              <div className="flex items-center gap-1.5 font-bold text-amber-950">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Safe Deduplication Algorithm</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-800">
                • Real student records and approved payments will NOT be lost.<br />
                • Multiple payments under duplicate phone numbers are linked to the primary student.<br />
                • Duplicate identical pending payments are cleaned up.
              </p>
              <label className="flex items-center gap-2 pt-1 border-t border-amber-200/60 font-bold text-amber-950 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={purgeIncludeRejected}
                  onChange={(e) => setPurgeIncludeRejected(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-amber-300 cursor-pointer"
                />
                <span>Also remove rejected test registrations</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1 w-full">
              <button
                type="button"
                onClick={() => setShowPurgeConfirm(false)}
                disabled={isPurging}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePurgeDuplicates}
                disabled={isPurging}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-black text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {isPurging ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Purging...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Purge Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Activity Log Confirmation Modal */}
      {showClearLogConfirm && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowClearLogConfirm(false)}>
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-5 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Clear Activity Log & Reset History?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  This will safely wipe all system activity logs and audit trail history from the database and local cache. Real student and payment records will not be touched.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1 w-full">
              <button
                type="button"
                onClick={() => setShowClearLogConfirm(false)}
                disabled={isClearingLogs}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearActivityLogs}
                disabled={isClearingLogs}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {isClearingLogs ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Clear Logs</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Individual Item Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isDeletingItem && setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-200 space-y-5 overflow-y-auto max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Delete Registration Record?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  This will safely delete this registration and payment record from Supabase and the system. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-100 text-xs text-slate-700 space-y-1.5">
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Student:</span>
                <span className="font-extrabold text-slate-900">{deleteTarget.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">WhatsApp:</span>
                <span className="font-bold text-purple-700">{deleteTarget.whatsappNum || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Course:</span>
                <span className="font-bold text-slate-800">{deleteTarget.courseChoice}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-slate-500">Status:</span>
                <span className="font-black text-amber-700">{deleteTarget.paymentStatus}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1 w-full">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeletingItem}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteRegistration}
                disabled={isDeletingItem}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs inline-flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {isDeletingItem ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Delete Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
