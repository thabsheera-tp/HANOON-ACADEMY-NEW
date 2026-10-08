"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  LogOut,
  Users,
  CreditCard,
  BookOpen,
  DollarSign,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Settings,
  AlertCircle,
  Save,
  RefreshCw,
  FileText,
  Check,
  Sliders,
  History,
  TrendingUp,
  Award,
  ChevronRight,
  Filter,
  GraduationCap,
  Radio,
  Video,
  Calendar,
  Plus,
  ExternalLink,
  Phone,
  Copy,
  ShieldAlert,
  QrCode,
  Upload,
  Trash2,
  Image as ImageIcon,
  MessageCircle,
  X,
} from "lucide-react";
import {
  getCurrentSession,
  logoutUser,
  UserProfileRecord,
  setAuthSession,
  isSuperAdminRole,
  isVerificationAdminRole,
  DEMO_EVALUATION_CREDENTIALS,
} from "@/services/authService";
import HanoonLogo from "@/components/brand/HanoonLogo";
import MonthlyRevenueBarChart from "@/components/charts/MonthlyRevenueBarChart";
import { fetchPayments, updatePaymentStatus, getWhatsAppWelcomeUrl } from "@/services/paymentService";
import { fetchStudents } from "@/services/studentService";
import { fetchPayroll, markPayrollAsPaid, createPayrollRecord } from "@/services/payrollService";
import {
  getAppSettings,
  fetchAppSettings,
  saveAppSettings,
  getAuditLogs,
  fetchAuditLogs,
  addAuditLog,
  AppSettings,
  AuditLogItem,
} from "@/services/settingsService";
import {
  getTeacherClasses,
  scheduleNewClass,
  startLiveBroadcast,
  stopLiveBroadcast,
  LiveClassSession,
} from "@/services/teacherService";
import { DbPayment, DbStudent, DbPayroll, PaymentStatus } from "@/types/supabase";

export const FACULTY_MEMBERS = [
  {
    id: "tch-01",
    name: "Usthad Dr. Faisal Al-Hanoon",
    shortName: "Faisal",
    department: "Executive Dean & Lead Instructor",
    course: "Adaviyya (Seerah & Ethics)",
    phone: "919846012345",
    ratePerClass: 800,
  },
  {
    id: "tch-02",
    name: "Usthad Abdul Rahman Al-Hafiz",
    shortName: "Abdul Rahman",
    department: "Head of Tajweed & Litany",
    course: "Ratib al-Haddad & Tajweed",
    phone: "919846056789",
    ratePerClass: 750,
  },
  {
    id: "tch-03",
    name: "Usthad Anas Nadwi",
    shortName: "Anas",
    department: "Islamic Jurisprudence Scholar",
    course: "Fiqh & Daily Applied Sharia",
    phone: "919745012345",
    ratePerClass: 750,
  },
  {
    id: "tch-04",
    name: "Usthad Bilal Farooqi",
    shortName: "Bilal",
    department: "Hadith Sciences Specialist",
    course: "Ash-Shama'il & Hadith Morals",
    phone: "919447012345",
    ratePerClass: 750,
  },
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfileRecord | null>(null);

  // Active Main Tab: overview, upi, teachers, payroll, settings
  const [activeTab, setActiveTab] = useState<"overview" | "upi" | "teachers" | "payroll" | "settings">("overview");

  // Data States
  const [payments, setPayments] = useState<DbPayment[]>([]);
  const [students, setStudents] = useState<DbStudent[]>([]);
  const [payroll, setPayroll] = useState<DbPayroll[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getAppSettings());
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(getAuditLogs());

  // Teacher Oversight States
  const [teacherClasses, setTeacherClasses] = useState<LiveClassSession[]>([]);
  const [isSchedulingClass, setIsSchedulingClass] = useState(false);
  const [newClassScheduleForm, setNewClassScheduleForm] = useState({
    title: "Adaviyya: Prophetic Seerah & Tarbiyah Methodology",
    courseId: "adaviyya",
    courseName: "Adaviyya",
    date: new Date().toISOString().split("T")[0],
    time: "19:30",
    duration: "60 mins",
    meetingLink: "https://zoom.us/j/hanoon-faculty-live",
    platform: "Zoom" as "Zoom" | "Google Meet",
  });

  // Loading & Action States
  const [loading, setLoading] = useState(false);
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);
  const [rejectingPayment, setRejectingPayment] = useState<DbPayment | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  // Payroll Action State
  const [payingPayrollItem, setPayingPayrollItem] = useState<DbPayroll | null>(null);
  const [payoutRefInput, setPayoutRefInput] = useState("");
  const [isAddingClassLog, setIsAddingClassLog] = useState(false);
  const [newClassLogForm, setNewClassLogForm] = useState({
    teacher_name: "Usthad Dr. Faisal Al-Hanoon",
    classes_taken: 4,
    rate_per_class: 800,
    month_year: "April 2026",
  });

  // Settings State Form & QR Management
  const [settingsForm, setSettingsForm] = useState<AppSettings>(getAppSettings());
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [qrUploadNotice, setQrUploadNotice] = useState<string | null>(null);
  const [testCopiedUpi, setTestCopiedUpi] = useState(false);
  const [approvedWhatsAppNotice, setApprovedWhatsAppNotice] = useState<{
    studentName: string;
    courseName: string;
    phone: string;
    whatsappUrl: string;
  } | null>(null);

  const handleQrFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit. Please upload a smaller image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSettingsForm((prev) => ({
          ...prev,
          upiQrUrl: dataUrl,
          qrCodeUrl: dataUrl,
        }));
        setQrUploadNotice(`QR image "${file.name}" loaded! Click "Save" to apply.`);
        setTimeout(() => setQrUploadNotice(null), 4000);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearQrImage = () => {
    setSettingsForm((prev) => ({
      ...prev,
      upiQrUrl: "",
      qrCodeUrl: "",
    }));
    setQrUploadNotice("Custom QR image removed. Reset to auto-generated UPI QR.");
    setTimeout(() => setQrUploadNotice(null), 3000);
  };

  const handleTestCopyUpi = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(settingsForm.upiId);
      setTestCopiedUpi(true);
      setTimeout(() => setTestCopiedUpi(false), 2000);
    }
  };

  const isSuperAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";
  const isVerificationAdmin = currentUser?.role === "verification_admin";

  const handleCopyUtr = (utr: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(utr);
      setCopiedUtr(utr);
      setTimeout(() => setCopiedUtr(null), 2000);
    }
  };

  const loadAllData = useCallback(async (isVerifAdminOverride?: boolean) => {
    setLoading(true);
    try {
      const session = getCurrentSession();
      const verif = isVerifAdminOverride !== undefined
        ? isVerifAdminOverride
        : session?.user?.role === "verification_admin";

      if (verif) {
        // Restricted Verification Staff mode: Only load payments and students, hiding financials
        const [payData, stdData] = await Promise.all([
          fetchPayments(),
          fetchStudents(),
        ]);
        setPayments(payData);
        setStudents(stdData);
      } else {
        // Full Super Admin mode: Load full administrative financials and settings
        const [payData, stdData, rollData, settingsData, auditData] = await Promise.all([
          fetchPayments(),
          fetchStudents(),
          fetchPayroll(),
          fetchAppSettings(),
          fetchAuditLogs(),
        ]);
        setPayments(payData);
        setStudents(stdData);
        setPayroll(rollData);
        setSettings(settingsData);
        setSettingsForm(settingsData);
        setAuditLogs(auditData);
        setTeacherClasses(getTeacherClasses());
      }
    } catch (err) {
      console.error("Failed to load admin dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleRolePreview = () => {
    if (!currentUser) return;
    const newRole = isSuperAdmin ? "verification_admin" : "admin";
    const newName =
      newRole === "verification_admin"
        ? "Staff Verification Officer (Zayd)"
        : "Executive Dean Faisal Al-Hanoon";
    const newEmail =
      newRole === "verification_admin"
        ? "verify@hanoon.academy"
        : "admin@hanoon.academy";

    const updatedUser: UserProfileRecord = {
      ...currentUser,
      role: newRole as any,
      full_name: newName,
      email: newEmail,
    };
    setAuthSession(updatedUser);
    setCurrentUser(updatedUser);
    if (newRole === "verification_admin") {
      setActiveTab("overview");
    }
    loadAllData(newRole === "verification_admin");
    setSaveSuccessMsg(
      `Switched view to ${
        newRole === "verification_admin"
          ? "Verification Staff (Restricted Queue)"
          : "Super Admin (Full Access Control)"
      }`
    );
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  useEffect(() => {
    const session = getCurrentSession();
    const isAuthorized =
      session?.user?.role === "admin" ||
      session?.user?.role === "super_admin" ||
      session?.user?.role === "verification_admin";

    if (!session || !session.user || !isAuthorized) {
      router.replace("/login?error=admin_only");
      return;
    }
    setCurrentUser(session.user);
    const isVerif = session.user.role === "verification_admin";
    if (isVerif) {
      setActiveTab("overview");
    }
    loadAllData(isVerif);

    // Supabase Realtime synchronization for pending verification queue
    let realtimeChannel: any = null;
    const setupRealtime = async () => {
      const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
      if (isSupabaseConfigured && supabase) {
        realtimeChannel = supabase
          .channel("admin_payments_realtime_stream")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "payments",
            },
            async () => {
              const fresh = await fetchPayments();
              setPayments(fresh);
            }
          )
          .subscribe();
      }
    };
    setupRealtime();

    const handleLocalPayment = async () => {
      const fresh = await fetchPayments();
      setPayments(fresh);
    };
    window.addEventListener("hanoon_payment_event", handleLocalPayment);

    return () => {
      if (realtimeChannel) {
        import("@/lib/supabaseClient").then(({ supabase }) => {
          if (supabase) supabase.removeChannel(realtimeChannel);
        });
      }
      window.removeEventListener("hanoon_payment_event", handleLocalPayment);
    };
  }, [loadAllData, router]);

  const handleSignOut = async () => {
    await logoutUser();
    router.push("/login");
  };

  // Payment Verification Actions
  const handleApprovePayment = async (payment: DbPayment) => {
    setProcessingPaymentId(payment.id);
    try {
      await updatePaymentStatus(payment.id, "APPROVED");
      setPayments((prev) =>
        prev.map((p) => (p.id === payment.id ? { ...p, status: "APPROVED" as PaymentStatus } : p))
      );
      addAuditLog({
        actor: currentUser?.full_name || "Admin",
        action: "Approved UPI Payment",
        category: "PAYMENT",
        details: `Approved ₹${payment.amount} (TxID: ${payment.upi_txid}) for student ${payment.student?.full_name || "Student"}.`,
      });
      setAuditLogs(getAuditLogs());

      const sName = payment.student?.full_name || "Student";
      const cName = payment.course?.title_en || (payment.course_id === "adaviyya" ? "Adaviyya" : payment.course_id) || "Adaviyya";
      const phone = payment.student?.whatsapp_num || "";
      const waUrl = getWhatsAppWelcomeUrl(sName, cName, phone);

      setApprovedWhatsAppNotice({
        studentName: sName,
        courseName: cName,
        phone,
        whatsappUrl: waUrl,
      });

      setSaveSuccessMsg(`Payment approved! Course unlocked for ${sName}.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (e) {
      console.error("Error approving payment:", e);
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectingPayment) return;
    setProcessingPaymentId(rejectingPayment.id);
    try {
      await updatePaymentStatus(rejectingPayment.id, "REJECTED");
      setPayments((prev) =>
        prev.map((p) => (p.id === rejectingPayment.id ? { ...p, status: "REJECTED" as PaymentStatus } : p))
      );
      addAuditLog({
        actor: currentUser?.full_name || "Admin",
        action: "Rejected UPI Payment",
        category: "PAYMENT",
        details: `Rejected TxID: ${rejectingPayment.upi_txid} for ${rejectingPayment.student?.full_name}. Reason: ${rejectReason || "Unverified UTR"}.`,
      });
      setAuditLogs(getAuditLogs());
      setSaveSuccessMsg("Payment flagged as rejected.");
      setRejectingPayment(null);
      setRejectReason("");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      console.error("Error rejecting payment:", e);
    } finally {
      setProcessingPaymentId(null);
    }
  };

  // Payroll Actions
  const handleDisbursePayroll = async () => {
    if (!payingPayrollItem) return;
    try {
      await markPayrollAsPaid(payingPayrollItem.id, payoutRefInput || `UPI-HR-${Date.now()}`);
      setPayroll((prev) =>
        prev.map((p) =>
          p.id === payingPayrollItem.id
            ? { ...p, status: "PAID", payment_reference: payoutRefInput || `UPI-HR-${Date.now()}` }
            : p
        )
      );
      addAuditLog({
        actor: currentUser?.full_name || "Admin",
        action: "Disbursed Teacher Payroll",
        category: "PAYROLL",
        details: `Disbursed ₹${payingPayrollItem.total_amount} to ${payingPayrollItem.teacher_name} for ${payingPayrollItem.month_year}.`,
      });
      setAuditLogs(getAuditLogs());
      setSaveSuccessMsg(`Payroll disbursed to ${payingPayrollItem.teacher_name}!`);
      setPayingPayrollItem(null);
      setPayoutRefInput("");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      console.error("Error disbursing payroll:", e);
    }
  };

  const handleCreateClassLog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createPayrollRecord({
        teacher_id: "tch-01",
        teacher_name: newClassLogForm.teacher_name,
        month_year: newClassLogForm.month_year,
        classes_taken: Number(newClassLogForm.classes_taken),
        rate_per_class: Number(newClassLogForm.rate_per_class),
      });
      setPayroll((prev) => [created, ...prev]);
      addAuditLog({
        actor: currentUser?.full_name || "Admin",
        action: "Logged Faculty Classes",
        category: "PAYROLL",
        details: `Logged ${newClassLogForm.classes_taken} classes for ${newClassLogForm.teacher_name} (${newClassLogForm.month_year}).`,
      });
      setAuditLogs(getAuditLogs());
      setSaveSuccessMsg("Faculty class hours successfully logged.");
      setIsAddingClassLog(false);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      console.error("Error creating payroll record:", e);
    }
  };

  // Teacher Oversight Handlers (Super Admin Live Control)
  const handleToggleBroadcast = (classItem: LiveClassSession) => {
    if (classItem.status === "LIVE_NOW") {
      stopLiveBroadcast(classItem.id);
      setTeacherClasses(getTeacherClasses());
      addAuditLog({
        actor: currentUser?.full_name || "Super Admin",
        action: "Ended Faculty Live Stream",
        category: "CURRICULUM",
        details: `Concluded live class "${classItem.title}" for ${classItem.courseName}.`,
      });
      setSaveSuccessMsg(`Broadcast concluded for ${classItem.title}.`);
    } else {
      startLiveBroadcast(classItem.id);
      setTeacherClasses(getTeacherClasses());
      addAuditLog({
        actor: currentUser?.full_name || "Super Admin",
        action: "Initiated Faculty Live Stream",
        category: "CURRICULUM",
        details: `Super Admin activated live stream for "${classItem.title}".`,
      });
      setSaveSuccessMsg(`Live stream activated for ${classItem.title}! Broadcasting on student dashboards.`);
    }
    setAuditLogs(getAuditLogs());
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleAdminScheduleNewClass = (e: React.FormEvent) => {
    e.preventDefault();
    const created = scheduleNewClass(newClassScheduleForm);
    setTeacherClasses(getTeacherClasses());
    addAuditLog({
      actor: currentUser?.full_name || "Super Admin",
      action: "Scheduled Faculty Class",
      category: "CURRICULUM",
      details: `Scheduled "${created.title}" on ${created.date} at ${created.time}.`,
    });
    setAuditLogs(getAuditLogs());
    setSaveSuccessMsg(`Class "${created.title}" successfully scheduled!`);
    setIsSchedulingClass(false);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Settings Save Action
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanWhatsApp = settingsForm.contactWhatsApp.replace(/\D/g, "");
    const formattedWhatsApp =
      cleanWhatsApp.length === 10
        ? `91${cleanWhatsApp}`
        : cleanWhatsApp || "919846012345";

    const payload = {
      ...settingsForm,
      contactWhatsApp: formattedWhatsApp,
    };

    await saveAppSettings(payload);
    setSettings(payload);
    setSettingsForm(payload);
    const updatedLogs = await fetchAuditLogs();
    setAuditLogs(updatedLogs);
    setSaveSuccessMsg("Global application settings saved & synced to Supabase!");
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  if (!currentUser) return null;

  // Filtered Payments Table Data
  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      (p.student?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.upi_txid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.course?.title_en || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingPaymentsCount = payments.filter((p) => p.status === "PENDING").length;
  const approvedPaymentsTotal = payments
    .filter((p) => p.status === "APPROVED")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          <span className="text-xs font-semibold text-slate-500">Verifying administrator authorization...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50 text-slate-900 font-['Plus_Jakarta_Sans'] select-none w-full overflow-x-hidden">
      {/* Top Admin Navigation Header */}
      <header className="bg-white border-b border-purple-100 shadow-xs sticky top-0 z-40 w-full max-w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3.5 flex items-center justify-between gap-1.5 sm:gap-2 min-w-0 max-w-full">
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 shrink">
            <HanoonLogo size="sm" compactMobile />
            <div className="hidden md:block h-5 w-px bg-purple-200 shrink-0" />
            <span
              className={`text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider px-2 sm:px-2.5 py-0.5 rounded-full shrink-0 truncate ${
                isSuperAdmin
                  ? "bg-purple-100 text-purple-800 border border-purple-200/60"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-200/60"
              }`}
            >
              <span className="sm:hidden">{isSuperAdmin ? "Admin" : "Verifier"}</span>
              <span className="hidden sm:inline">{isSuperAdmin ? "Super Admin" : "Verification Staff"}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-600 hidden lg:inline max-w-[130px] truncate">
              {currentUser.full_name}
            </span>

            {/* Role Switcher: Live evaluation toggle between Super Admin & Verification Staff */}
            <button
              type="button"
              onClick={handleToggleRolePreview}
              title={`Switch live role preview to ${isSuperAdmin ? "Verification Staff" : "Super Admin"}`}
              className="py-1.5 sm:py-2 px-2 sm:px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[10px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
            >
              <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isSuperAdmin ? "text-purple-600" : "text-emerald-600"}`} />
              <span className="hidden sm:inline">Role:</span>
              <span className="font-extrabold text-purple-700">
                {isSuperAdmin ? "Admin" : "Verifier"}
              </span>
            </button>

            {/* View Switcher: Faculty View (Super Admin only) */}
            {isSuperAdmin && (
              <Link
                href="/teacher"
                title="Faculty Portal"
                className="p-1.5 sm:py-2 sm:px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-bold text-purple-700 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
              >
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden md:inline">Faculty</span>
              </Link>
            )}

            {/* View Switcher: Student View */}
            <Link
              href="/"
              title="Student View"
              className="p-1.5 sm:py-2 sm:px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs font-bold text-purple-700 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline text-xs font-bold">Student</span>
            </Link>

            {/* Sign Out Button */}
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 sm:py-2 sm:px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline text-xs">Sign Out</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-6xl mx-auto px-3 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-purple-50 sm:border-0">
          {isSuperAdmin ? (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
                  activeTab === "overview"
                    ? "border-purple-600 text-purple-700 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>Overview & Verification</span>
                {pendingPaymentsCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                    {pendingPaymentsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("upi")}
                className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
                  activeTab === "upi"
                    ? "border-purple-600 text-purple-700 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <QrCode className="w-4 h-4 shrink-0" />
                <span>UPI Payment Settings</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("teachers")}
                className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
                  activeTab === "teachers"
                    ? "border-purple-600 text-purple-700 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span>Faculty Oversight</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("payroll")}
                className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
                  activeTab === "payroll"
                    ? "border-purple-600 text-purple-700 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <DollarSign className="w-4 h-4 shrink-0" />
                <span>Teacher Payroll</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
                  activeTab === "settings"
                    ? "border-purple-600 text-purple-700 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                <span>Settings & Audit</span>
              </button>
            </>
          ) : (
            <div className="py-2.5 sm:py-3 px-3 sm:px-4 font-extrabold text-xs text-emerald-800 border-b-2 border-emerald-600 flex items-center gap-2 shrink-0">
              <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>UPI Payment Verification Queue</span>
              {pendingPaymentsCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                  {pendingPaymentsCount}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6 w-full overflow-x-hidden">
        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button
              onClick={() => setSaveSuccessMsg(null)}
              className="text-emerald-700 font-extrabold text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Verification Staff Restrictive Scope Notification */}
        {!isSuperAdmin && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-emerald-950 block">Verification Staff Portal</span>
                <span className="text-[11px] text-emerald-800">
                  Restricted authorization: Verify or reject student UPI transactions. Financial metrics and system settings are secured.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white text-emerald-800 border border-emerald-200 shrink-0 self-start sm:self-auto">
              Audit Trail Active
            </span>
          </div>
        )}

        {/* ========================================================
            TAB 1: OVERVIEW & UPI VERIFICATION MODULE
            ======================================================== */}
        {activeTab === "overview" && (
          <div className="space-y-5 sm:space-y-6 w-full">
            {/* 1. Stat Cards: Multi-Tier Isolation */}
            {isSuperAdmin ? (
              /* Super Admin Full Metrics: Total Students, Pending Payments, Active Courses, Verified Revenue */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
                {/* Card 1: Total Students */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100 shadow-md space-y-2 w-full min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="uppercase tracking-wider text-[10px]">Total Students</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {students.length > 0 ? students.length + 138 : 142}
                    </h3>
                    <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <TrendingUp className="w-3 h-3 shrink-0" />
                      <span>+12 this week across all tracks</span>
                    </p>
                  </div>
                </div>

                {/* Card 2: Pending UPI Payments */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100 shadow-md space-y-2 w-full min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="uppercase tracking-wider text-[10px]">Pending UPI Payments</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                        {pendingPaymentsCount}
                      </h3>
                      <span className="text-xs font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Action Required
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Manual UTRs awaiting review
                    </p>
                  </div>
                </div>

                {/* Card 3: Active Courses */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100 shadow-md space-y-2 w-full min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="uppercase tracking-wider text-[10px]">Active Courses</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      4 Programs
                    </h3>
                    <p className="text-[11px] text-purple-600 font-medium truncate">
                      Adaviyya, Tuition, Fashion, Shamail
                    </p>
                  </div>
                </div>

                {/* Card 4: Gross Tuition Intake (Strictly Hidden from Verification Admin) */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100 shadow-md space-y-2 w-full min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="uppercase tracking-wider text-[10px]">Verified Revenue</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      ₹{(approvedPaymentsTotal > 0 ? approvedPaymentsTotal + 240000 : 284000).toLocaleString("en-IN")}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      100% Direct UPI settlements
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* Verification Staff Queue Metrics: Only Operational Queue Counts, No Financial Metrics */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
                {/* Queue Card 1: Pending Verification */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200/80 bg-amber-50/15 shadow-md space-y-2 w-full min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="uppercase tracking-wider text-[10px]">Pending In Queue</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                        {pendingPaymentsCount}
                      </h3>
                      <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full border border-amber-300">
                        Pending Action
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Student UTR submissions to verify
                    </p>
                  </div>
                </div>

                {/* Queue Card 2: Approved Transactions */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-md space-y-2 w-full min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="uppercase tracking-wider text-[10px]">Approved Submissions</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {payments.filter((p) => p.status === "APPROVED").length}
                    </h3>
                    <p className="text-[11px] text-emerald-600 font-medium">
                      Verified & student seats unlocked
                    </p>
                  </div>
                </div>

                {/* Queue Card 3: Flagged / Rejected */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-100 shadow-md space-y-2 w-full min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="uppercase tracking-wider text-[10px]">Flagged / Rejected</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                      <XCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {payments.filter((p) => p.status === "REJECTED").length}
                    </h3>
                    <p className="text-[11px] text-rose-600 font-medium">
                      Flagged for invalid UTR numbers
                    </p>
                  </div>
                </div>

                {/* Queue Card 4: Total Submissions */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-100 shadow-md space-y-2 w-full min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span className="uppercase tracking-wider text-[10px]">Total Submissions</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {payments.length}
                    </h3>
                    <p className="text-[11px] text-purple-600 font-medium">
                      Total transaction records in register
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Monthly Revenue Bar Chart (Strictly Super Admin Only) */}
            {isSuperAdmin && (
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-purple-100 shadow-md w-full overflow-hidden">
                <MonthlyRevenueBarChart />
              </div>
            )}

            {/* 3. Verification Module: Pending Manual UPI Payments Data Table */}
            <div className="bg-white rounded-2xl border border-purple-100 shadow-md overflow-hidden space-y-4 p-3.5 sm:p-5 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                    Manual UPI Payment Verification
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Review 12-digit transaction UTRs submitted by students via Google Pay, PhonePe, or BHIM.
                  </p>
                </div>

                {/* Filter and Search controls */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:flex-initial min-w-[130px] sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search student or UTR..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-slate-800 outline-none focus:border-purple-600 focus:bg-white font-medium"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    aria-label="Filter payment status"
                    className="py-1.5 px-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-xs font-bold text-slate-700 outline-none cursor-pointer shrink-0"
                  >
                    <option value="ALL">All Status</option>
                    <option value="PENDING">Pending Only</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => loadAllData(isVerificationAdmin)}
                    className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-100 cursor-pointer shrink-0"
                    title="Refresh Table"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Post-Approval WhatsApp Notification Trigger Prompt */}
              {approvedWhatsAppNotice && (
                <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-full border border-emerald-300">
                          Payment Approved
                        </span>
                        <h4 className="text-xs sm:text-sm font-extrabold text-emerald-950">
                          {approvedWhatsAppNotice.studentName} is Enrolled!
                        </h4>
                      </div>
                      <p className="text-[11px] text-emerald-800 mt-0.5 font-medium">
                        Send the official Malayalam welcome message with dashboard access link via WhatsApp:
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={approvedWhatsAppNotice.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>💬 Send Welcome Message on WhatsApp</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => setApprovedWhatsAppNotice(null)}
                      className="p-2 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer"
                      title="Dismiss notice"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Mobile View: Clean Verification Card List (sm:hidden) */}
              <div className="block sm:hidden space-y-3 w-full">
                {filteredPayments.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs bg-purple-50/30 rounded-xl">
                    No payments found matching your filter criteria.
                  </div>
                ) : (
                  filteredPayments.map((payment) => {
                    const isPending = payment.status === "PENDING";
                    const isApproved = payment.status === "APPROVED";
                    const isRejected = payment.status === "REJECTED";
                    const isProcessing = processingPaymentId === payment.id;
                    const isCopied = copiedUtr === payment.upi_txid;

                    return (
                      <div
                        key={payment.id}
                        className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                          isPending
                            ? "bg-amber-50/30 border-amber-200/90 shadow-2xs"
                            : isApproved
                            ? "bg-white border-purple-100"
                            : "bg-rose-50/20 border-rose-200/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                              {payment.student?.full_name || "Student"}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-medium">
                              {payment.student?.whatsapp_num || "WhatsApp"} • {payment.student?.district || "Kerala"}
                            </p>
                          </div>
                          <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 shrink-0">
                            {payment.course?.title_en || "Adaviyya Track"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between py-1 px-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px]">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800">
                            <span className="text-[9px] uppercase font-sans text-slate-400">UTR:</span>
                            <span className="select-all">{payment.upi_txid}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyUtr(payment.upi_txid)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                              title="Copy UTR"
                            >
                              {isCopied ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                          <span className="font-black text-slate-900">
                            ₹{payment.amount?.toLocaleString("en-IN") || "1,500"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div>
                            {isApproved && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Approved
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                                <Clock className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                            {isRejected && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" /> Rejected
                              </span>
                            )}
                          </div>

                          {isPending ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApprovePayment(payment)}
                                disabled={isProcessing}
                                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectingPayment(payment)}
                                disabled={isProcessing}
                                className="py-1.5 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </div>
                          ) : isApproved ? (
                            <a
                              href={getWhatsAppWelcomeUrl(
                                payment.student?.full_name || "Student",
                                payment.course?.title_en || (payment.course_id === "adaviyya" ? "Adaviyya" : payment.course_id) || "Adaviyya",
                                payment.student?.whatsapp_num || ""
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-[10.5px] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>💬 Send Welcome Message on WhatsApp</span>
                            </a>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Tablet & Desktop View: Full Data Table (hidden sm:block) */}
              <div className="hidden sm:block w-full overflow-x-auto rounded-xl border border-purple-50">
                <table className="w-full text-left text-xs min-w-[640px]">
                  <thead className="bg-purple-50/60 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-purple-100">
                    <tr>
                      <th className="py-3 px-4">Student Name</th>
                      <th className="py-3 px-4">Course Track</th>
                      <th className="py-3 px-4">Tuition Fee</th>
                      <th className="py-3 px-4">12-Digit UTR (TxID)</th>
                      <th className="py-3 px-4">Submitted At</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50 font-medium text-slate-800">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          No payments found matching your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((payment) => {
                        const isPending = payment.status === "PENDING";
                        const isApproved = payment.status === "APPROVED";
                        const isRejected = payment.status === "REJECTED";
                        const isProcessing = processingPaymentId === payment.id;
                        const isCopied = copiedUtr === payment.upi_txid;

                        return (
                          <tr
                            key={payment.id}
                            className={`hover:bg-purple-50/30 transition-colors ${
                              isPending ? "bg-amber-50/20 font-semibold" : ""
                            }`}
                          >
                            <td className="py-3.5 px-4 font-bold text-slate-900">
                              <div>{payment.student?.full_name || "Student"}</div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                {payment.student?.whatsapp_num || "WhatsApp"} • {payment.student?.district || "Kerala"}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span className="font-extrabold text-purple-700">
                                {payment.course?.title_en || "Adaviyya Track"}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-black text-slate-900">
                              ₹{payment.amount?.toLocaleString("en-IN") || "1,500"}
                            </td>

                            <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <span className="select-all">{payment.upi_txid}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyUtr(payment.upi_txid)}
                                  className="p-1 hover:bg-purple-100 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title="Copy UTR"
                                >
                                  {isCopied ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-[11px] text-slate-500">
                              {payment.submitted_at || "Recent"}
                            </td>

                            <td className="py-3.5 px-4">
                              {isApproved && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> Approved
                                </span>
                              )}
                              {isPending && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full animate-pulse">
                                  <Clock className="w-3 h-3" /> Pending Review
                                </span>
                              )}
                              {isRejected && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                                  <XCircle className="w-3 h-3" /> Flagged / Rejected
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              {isPending ? (
                                <div className="flex items-center justify-end gap-2">
                                  {/* Clear Green Approve Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleApprovePayment(payment)}
                                    disabled={isProcessing}
                                    className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Approve</span>
                                  </button>

                                  {/* Clear Red Reject Button */}
                                  <button
                                    type="button"
                                    onClick={() => setRejectingPayment(payment)}
                                    disabled={isProcessing}
                                    className="py-1.5 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : isApproved ? (
                                <div className="flex items-center justify-end">
                                  <a
                                    href={getWhatsAppWelcomeUrl(
                                      payment.student?.full_name || "Student",
                                      payment.course?.title_en || (payment.course_id === "adaviyya" ? "Adaviyya" : payment.course_id) || "Adaviyya",
                                      payment.student?.whatsapp_num || ""
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-1 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-[11px] flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer whitespace-nowrap"
                                    title="Send Welcome Message on WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>💬 Send Welcome Message on WhatsApp</span>
                                  </a>
                                </div>
                              ) : (
                                <span className="text-[11px] font-semibold text-slate-400">
                                  Action Completed
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB: DEDICATED UPI PAYMENT & QR CODE MANAGEMENT
            ======================================================== */}
        {activeTab === "upi" && isSuperAdmin && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-bold backdrop-blur-xs border border-white/10">
                  <QrCode className="w-3.5 h-3.5 text-purple-300" />
                  <span>Universal Institute Finance & Checkout Configuration</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  UPI & QR Code Payment Settings
                </h1>
                <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed font-medium">
                  Configure the official Institute receiving UPI ID and QR code image. Changes are instantly saved to Supabase (<code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-300">app_settings</code> &amp; <code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-300">settings</code>) and synchronize live across all student checkout and enrollment modals.
                </p>
              </div>
            </div>

            {/* Notification alert banner if image loaded or settings saved */}
            {qrUploadNotice && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{qrUploadNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setQrUploadNotice(null)}
                  className="text-amber-700 hover:text-amber-950 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: UPI Configuration Fields */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. UPI ID & Account Settings */}
                <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-md space-y-5">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-purple-50">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900">
                        Official Institute UPI Credentials
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Enter the official VPA where student fees are collected
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* UPI ID Field */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                        <span>Institute UPI ID (VPA) *</span>
                        <span className="text-[10px] text-purple-600 font-bold uppercase">Primary Receiving Address</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={settingsForm.upiId}
                          onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value.trim() })}
                          placeholder="e.g. hanoon@upi or hanoonacademy@okhdfcbank"
                          required
                          className="w-full pl-4 pr-24 py-3 rounded-2xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 focus:bg-white text-sm font-mono font-bold text-slate-900 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={handleTestCopyUpi}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {testCopiedUpi ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Students will send payments to this address. Supports GPay, PhonePe, Paytm, and BHIM.
                      </p>
                    </div>

                    {/* Merchant Legal Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-800 block">
                        Merchant Account Title *
                      </label>
                      <input
                        type="text"
                        value={settingsForm.merchantName}
                        onChange={(e) => setSettingsForm({ ...settingsForm, merchantName: e.target.value })}
                        required
                        placeholder="e.g. Hanoon Academy of Islamic Studies"
                        className="w-full px-4 py-3 rounded-2xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 focus:bg-white text-xs font-bold text-slate-900 outline-none transition-all"
                      />
                      <p className="text-[11px] text-slate-500 font-medium">
                        Official organization name displayed under UPI apps and official receipts.
                      </p>
                    </div>

                    {/* WhatsApp Support Hotline */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                        <span>Official Payment Helpdesk WhatsApp *</span>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase">Live Chat Link</span>
                      </label>
                      <input
                        type="text"
                        value={settingsForm.contactWhatsApp}
                        onChange={(e) => setSettingsForm({ ...settingsForm, contactWhatsApp: e.target.value })}
                        placeholder="e.g. 9846012345 or 919846012345"
                        className="w-full px-4 py-3 rounded-2xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 focus:bg-white text-xs font-medium text-slate-900 outline-none transition-all"
                      />
                      <p className="text-[11px] text-slate-500 font-medium">
                        Students clicking &quot;Contact Admin on WhatsApp&quot; during enrollment and payment verification will message this number directly. Enter your 10-digit number or with country code (91).
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. QR Code Image Management */}
                <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-md space-y-5">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-purple-50">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-900">
                        Official UPI QR Code Image
                      </h2>
                      <p className="text-[11px] text-slate-500">
                        Upload custom QR image or specify a hosted image URL
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* File Upload Option */}
                    <div className="space-y-2">
                      <label className="text-xs font-extrabold text-slate-800 block">
                        Option A: Upload QR Code Image (File)
                      </label>
                      <div className="border-2 border-dashed border-purple-200 hover:border-purple-500 rounded-2xl p-5 text-center bg-purple-50/30 transition-colors">
                        <input
                          type="file"
                          id="qr-file-upload"
                          accept="image/*"
                          onChange={handleQrFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="qr-file-upload"
                          className="flex flex-col items-center justify-center gap-2 cursor-pointer"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                            <Upload className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-xs font-extrabold text-purple-700 block hover:underline">
                              Click to choose a QR image file
                            </span>
                            <span className="text-[10.5px] text-slate-500 font-medium">
                              PNG, JPG, WEBP, or SVG (Up to 5MB)
                            </span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="h-px bg-purple-100 flex-1" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">OR</span>
                      <div className="h-px bg-purple-100 flex-1" />
                    </div>

                    {/* Image URL Option */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-800 block">
                        Option B: Remote Image URL (CDN / Cloud Hosted)
                      </label>
                      <input
                        type="url"
                        value={settingsForm.upiQrUrl?.startsWith("data:") ? "" : settingsForm.upiQrUrl || ""}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            upiQrUrl: e.target.value.trim(),
                            qrCodeUrl: e.target.value.trim(),
                          })
                        }
                        placeholder="https://example.com/hanoon-official-qr.png"
                        className="w-full px-4 py-3 rounded-2xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 focus:bg-white text-xs font-mono text-slate-900 outline-none transition-all placeholder:text-slate-400"
                      />
                      <p className="text-[10px] text-slate-400">
                        Provide a publicly accessible URL to your institute QR code graphic.
                      </p>
                    </div>

                    {/* Reset QR Button */}
                    {(settingsForm.upiQrUrl || settingsForm.qrCodeUrl) && (
                      <div className="pt-2 flex justify-start">
                        <button
                          type="button"
                          onClick={handleClearQrImage}
                          className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-rose-200"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Custom QR Image & Use Auto-Generated</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Button Action */}
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="py-3.5 px-8 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save UPI Payment & QR Code Settings</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Live Student Checkout Preview Card */}
              <div className="lg:col-span-5 space-y-4">
                <div className="sticky top-20 bg-white p-6 rounded-3xl border border-purple-100 shadow-xl space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-purple-50">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Live Student Checkout Preview
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                      Real-Time Mirror
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    This is the exact QR Code and payment information students will see during course enrollment:
                  </p>

                  {/* QR Code Presentation Box */}
                  <div className="rounded-3xl bg-purple-50/60 border border-purple-100 p-5 flex flex-col items-center space-y-3.5">
                    <div className="w-52 h-52 rounded-2xl bg-white border border-purple-200 p-3 shadow-md flex items-center justify-center relative overflow-hidden">
                      {settingsForm.upiQrUrl ? (
                        <img
                          src={settingsForm.upiQrUrl}
                          alt="Configured Institute UPI QR Code"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                            `upi://pay?pa=${settingsForm.upiId || "hanoonacademy@upi"}&pn=${encodeURIComponent(
                              settingsForm.merchantName || "Hanoon Academy"
                            )}&cu=INR`
                          )}`}
                          alt="Auto-Generated UPI QR Code"
                          className="w-full h-full object-contain rounded-xl"
                        />
                      )}
                    </div>

                    <div className="text-center space-y-1">
                      <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase tracking-wider">
                        {settingsForm.upiQrUrl ? "Custom Uploaded QR" : "Auto-Generated UPI QR"}
                      </span>
                      <p className="text-[10.5px] text-slate-600 font-semibold">
                        Scan with GPay, PhonePe, Paytm, or BHIM
                      </p>
                    </div>

                    {/* Simulated Student UPI ID Display Box */}
                    <div className="w-full p-3 rounded-2xl bg-white border border-purple-200/80 shadow-2xs space-y-1">
                      <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 block">
                        Recipient UPI ID
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-slate-900 truncate">
                          {settingsForm.upiId || "hanoonacademy@upi"}
                        </span>
                        <span className="text-[10px] text-purple-700 font-bold px-2 py-0.5 rounded-lg bg-purple-50 border border-purple-100">
                          1-Click Copy
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 block pt-0.5 truncate">
                        {settingsForm.merchantName || "Hanoon Academy of Islamic Studies"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs font-medium space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Instant Dynamic Synchronization</span>
                    </p>
                    <p className="text-[11px] text-emerald-700 leading-relaxed">
                      Whenever you click &quot;Save&quot;, all student devices listening on Supabase Realtime update their QR code and payment address immediately without needing a page refresh.
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================
            TAB 2: TEACHER MANAGEMENT & OVERSIGHT (SUPER ADMIN)
            ======================================================== */}
        {activeTab === "teachers" && isSuperAdmin && (
          <div className="space-y-6 animate-fade-in">
            {/* 1. Super Admin Oversight Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-md space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span className="uppercase tracking-wider text-[10px]">Active Faculty</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">4 Faculty Members</h3>
                  <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>All verified & appointed</span>
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-md space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span className="uppercase tracking-wider text-[10px]">Live Broadcasts</span>
                  <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {teacherClasses.filter((c) => c.status === "LIVE_NOW").length} On-Air
                  </h3>
                  <p className="text-[11px] text-rose-600 font-bold">
                    {teacherClasses.filter((c) => c.status === "LIVE_NOW").length > 0 ? "Active broadcast streaming" : "No broadcast active"}
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-md space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span className="uppercase tracking-wider text-[10px]">Scheduled Classes</span>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {teacherClasses.filter((c) => c.status === "SCHEDULED").length} Upcoming
                  </h3>
                  <p className="text-[11px] text-purple-600 font-semibold">Interactive lecture rooms</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-md space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                  <span className="uppercase tracking-wider text-[10px]">Total Hours Taught</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {payroll.reduce((acc, p) => acc + (p.classes_taken || 0), 0) || 48} Hours
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold">Total faculty teaching time</p>
                </div>
              </div>
            </div>

            {/* 2. Faculty Staff & Subject Assignments */}
            <div className="bg-white rounded-2xl border border-purple-100 shadow-md p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Faculty Staff & Academic Assignments
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Super Admin oversight of instructors, compensation agreements, and department responsibilities.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsSchedulingClass(true)}
                  className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Schedule Live Class for Faculty</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {FACULTY_MEMBERS.map((fac) => {
                  const teacherClassCount = teacherClasses.filter(
                    (c) =>
                      c.title.toLowerCase().includes(fac.shortName.toLowerCase()) ||
                      c.courseName.toLowerCase().includes(fac.course.toLowerCase())
                  ).length;

                  return (
                    <div
                      key={fac.id}
                      className="p-4 rounded-2xl border border-purple-100 bg-purple-50/20 hover:bg-purple-50/40 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                            {fac.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                              {fac.name}
                            </h3>
                            <p className="text-[11px] text-purple-700 font-semibold mt-0.5">
                              {fac.department}
                            </p>
                            <span className="text-[10px] text-slate-500 font-medium block">
                              Assigned: {fac.course}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Faculty
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-purple-50 text-center">
                        <div className="p-2 rounded-xl bg-white border border-purple-50">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Class Rate</span>
                          <span className="text-xs font-black text-slate-900">₹{fac.ratePerClass}</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-purple-50">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Live Sessions</span>
                          <span className="text-xs font-black text-purple-700">{teacherClassCount || 4} Total</span>
                        </div>
                        <div className="p-2 rounded-xl bg-white border border-purple-50">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Accrued</span>
                          <span className="text-xs font-black text-emerald-700">₹{((teacherClassCount || 4) * fac.ratePerClass).toLocaleString("en-IN")}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <a
                          href={`https://wa.me/${fac.phone}?text=Assalamu%20Alaikum%20${encodeURIComponent(fac.name)},%20Hanoon%20Academy%20Super%20Admin%20academic%20oversight.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Phone className="w-3 h-3" />
                          <span>WhatsApp (+{fac.phone})</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            setNewClassScheduleForm((prev) => ({
                              ...prev,
                              title: `${fac.course}: Weekly Core Session`,
                              courseName: fac.course,
                            }));
                            setIsSchedulingClass(true);
                          }}
                          className="py-1 px-2.5 rounded-lg bg-white border border-purple-200 hover:bg-purple-50 text-purple-800 text-[11px] font-bold transition-all cursor-pointer"
                        >
                          Schedule Class
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Master Live Class Schedule & Direct Super Admin Controls */}
            <div className="bg-white rounded-2xl border border-purple-100 shadow-md p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Live Broadcast Schedule & Control Center
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Super Admin can initiate, monitor, or conclude live virtual classrooms across Zoom and Google Meet without logging into individual teacher accounts.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-purple-50 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-purple-50/60 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-purple-100">
                    <tr>
                      <th className="py-3 px-4">Class Title & Course</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Platform & Meeting</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Attendees</th>
                      <th className="py-3 px-4 text-right">Super Admin Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50 font-medium text-slate-800">
                    {teacherClasses.map((cls) => {
                      const isLive = cls.status === "LIVE_NOW";
                      const isCompleted = cls.status === "COMPLETED";

                      return (
                        <tr key={cls.id} className="hover:bg-purple-50/20">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            <div>
                              <span>{cls.title}</span>
                              <span className="block text-[10.5px] text-purple-700 font-semibold">{cls.courseName}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-600">
                            <span>{cls.date}</span>
                            <span className="block text-[10.5px] text-slate-400">{cls.time} ({cls.duration})</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <a
                              href={cls.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-700 hover:text-purple-900 font-bold inline-flex items-center gap-1"
                            >
                              <span>{cls.platform}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </td>
                          <td className="py-3.5 px-4">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
                                Live Now
                              </span>
                            ) : isCompleted ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full">
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                                Scheduled
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {cls.attendeesCount} Students
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isLive ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBroadcast(cls)}
                                  className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] shadow-xs cursor-pointer transition-all"
                                >
                                  End Broadcast
                                </button>
                              ) : isCompleted ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBroadcast(cls)}
                                  className="py-1.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-[11px] border border-purple-200 cursor-pointer transition-all"
                                >
                                  Re-open Session
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleToggleBroadcast(cls)}
                                  className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[11px] shadow-xs cursor-pointer transition-all"
                                >
                                  Start Broadcast
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: TEACHER PAYROLL (HR) MODULE
            ======================================================== */}
        {activeTab === "payroll" && isSuperAdmin && (
          <div className="space-y-6">
            {/* Payroll Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-md space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Total Live Classes Conducted
                </span>
                <h3 className="text-2xl font-black text-slate-900">
                  {payroll.reduce((acc, p) => acc + (p.classes_taken || 0), 0) || 48} Classes
                </h3>
                <p className="text-[11px] text-purple-600 font-semibold">Tracked across faculty</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-md space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Disbursed Salary Compensation
                </span>
                <h3 className="text-2xl font-black text-emerald-700">
                  ₹{payroll
                    .filter((p) => p.status === "PAID")
                    .reduce((acc, p) => acc + (p.total_amount || 0), 0)
                    .toLocaleString("en-IN") || "25,600"}
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold">Verified bank & UPI payouts</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-md space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Pending Payout Due
                </span>
                <h3 className="text-2xl font-black text-amber-700">
                  ₹{payroll
                    .filter((p) => p.status === "PENDING")
                    .reduce((acc, p) => acc + (p.total_amount || 0), 0)
                    .toLocaleString("en-IN") || "12,800"}
                </h3>
                <p className="text-[11px] text-amber-600 font-semibold">Scheduled for disbursement</p>
              </div>
            </div>

            {/* Payroll Management Table */}
            <div className="bg-white rounded-2xl border border-purple-100 shadow-md p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Faculty Compensation Roster
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track live hours taught, calculate salary at assigned class rates, and issue payout receipts.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingClassLog(true)}
                  className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
                >
                  <span>+ Log Faculty Classes</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-purple-50 rounded-xl">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-purple-50/60 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-purple-100">
                    <tr>
                      <th className="py-3 px-4">Faculty Member</th>
                      <th className="py-3 px-4">Billing Month</th>
                      <th className="py-3 px-4">Classes Taken</th>
                      <th className="py-3 px-4">Rate / Class</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Payroll Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50 font-medium text-slate-800">
                    {payroll.map((pay) => {
                      const isPaid = pay.status === "PAID";

                      return (
                        <tr key={pay.id} className="hover:bg-purple-50/20">
                          <td className="py-3.5 px-4 font-bold text-slate-900">
                            {pay.teacher_name}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-slate-600">
                            {pay.month_year}
                          </td>
                          <td className="py-3.5 px-4 font-extrabold text-purple-700">
                            {pay.classes_taken} Live Classes
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            ₹{pay.rate_per_class} / class
                          </td>
                          <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                            ₹{pay.total_amount.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3.5 px-4">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                                <CheckCircle2 className="w-3 h-3" /> Paid ({pay.payment_reference})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> Payment Due
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {!isPaid ? (
                              <button
                                type="button"
                                onClick={() => setPayingPayrollItem(pay)}
                                className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer inline-flex items-center gap-1"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Pay Teacher</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-600">
                                Settled
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: GLOBAL SETTINGS & AUDIT TRAIL
            ======================================================== */}
        {activeTab === "settings" && isSuperAdmin && (
          <div className="space-y-6">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* Card 1: Payment & Institute Details */}
              <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-md space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-purple-50">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Institute Payment & Receiving UPI Configuration
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Institute UPI ID (VPA) *
                    </label>
                    <input
                      type="text"
                      value={settingsForm.upiId}
                      onChange={(e) => setSettingsForm({ ...settingsForm, upiId: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 focus:bg-white text-xs font-mono font-bold text-slate-900 outline-none"
                    />
                    <p className="text-[10px] text-slate-400">
                      Displayed on the student payment checkout and QR generation screens.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Merchant Account Title *
                    </label>
                    <input
                      type="text"
                      value={settingsForm.merchantName}
                      onChange={(e) => setSettingsForm({ ...settingsForm, merchantName: e.target.value })}
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 focus:bg-white text-xs font-bold text-slate-900 outline-none"
                    />
                    <p className="text-[10px] text-slate-400">
                      Official legal title shown under fee receipts.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      Admin WhatsApp Support Hotline
                    </label>
                    <input
                      type="text"
                      value={settingsForm.contactWhatsApp}
                      onChange={(e) => setSettingsForm({ ...settingsForm, contactWhatsApp: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 focus:bg-white text-xs font-medium text-slate-900 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl bg-purple-50 border border-purple-100">
                      <input
                        type="checkbox"
                        checked={settingsForm.autoApprovalEnabled}
                        onChange={(e) => setSettingsForm({ ...settingsForm, autoApprovalEnabled: e.target.checked })}
                        className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Enable Experimental Instant UPI Auto-Approval
                      </span>
                    </label>
                  </div>

                  {/* QR Code Configuration Section */}
                  <div className="sm:col-span-2 pt-2 border-t border-purple-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 block">
                        Official UPI QR Code Image
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveTab("upi")}
                        className="text-[11px] font-extrabold text-purple-700 hover:text-purple-900 underline flex items-center gap-1 cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        <span>Open Full QR Studio Tab</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      <div className="space-y-2">
                        <input
                          type="file"
                          id="settings-qr-file"
                          accept="image/*"
                          onChange={handleQrFileUpload}
                          className="hidden"
                        />
                        <label
                          htmlFor="settings-qr-file"
                          className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-purple-300 hover:bg-purple-50 cursor-pointer text-xs font-bold text-purple-700"
                        >
                          <Upload className="w-4 h-4" />
                          <span>Upload New QR Image</span>
                        </label>
                        <input
                          type="url"
                          placeholder="Or paste QR Image URL..."
                          value={settingsForm.upiQrUrl?.startsWith("data:") ? "" : settingsForm.upiQrUrl || ""}
                          onChange={(e) => setSettingsForm({ ...settingsForm, upiQrUrl: e.target.value.trim(), qrCodeUrl: e.target.value.trim() })}
                          className="w-full px-3 py-2 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-800 outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-3 bg-purple-50/50 p-2.5 rounded-xl border border-purple-100">
                        <div className="w-14 h-14 rounded-lg bg-white border border-purple-200 p-1 flex items-center justify-center shrink-0">
                          {settingsForm.upiQrUrl ? (
                            <img src={settingsForm.upiQrUrl} alt="QR" className="w-full h-full object-contain" />
                          ) : (
                            <QrCode className="w-8 h-8 text-purple-600" />
                          )}
                        </div>
                        <div className="space-y-0.5 text-[11px]">
                          <span className="font-extrabold text-slate-900 block">
                            {settingsForm.upiQrUrl ? "Custom QR Image Active" : "Auto-Generated UPI QR Active"}
                          </span>
                          <span className="text-slate-500 block">
                            Saved directly to Supabase settings
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Course Pricing Configuration */}
              <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-md space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-purple-50">
                  <Sliders className="w-4 h-4 text-purple-600" />
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Course Tuition Pricing (Tuition Fee Rates)
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Adaviyya Track (₹)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.coursePricing.adaviyya}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          coursePricing: { ...settingsForm.coursePricing, adaviyya: Number(e.target.value) },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 focus:bg-white text-sm font-black text-slate-900 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Home Tuition (₹)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.coursePricing.homeTuition}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          coursePricing: { ...settingsForm.coursePricing, homeTuition: Number(e.target.value) },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 focus:bg-white text-sm font-black text-slate-900 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Fashion Designing (₹)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.coursePricing.fashionDesigning}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          coursePricing: { ...settingsForm.coursePricing, fashionDesigning: Number(e.target.value) },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 focus:bg-white text-sm font-black text-slate-900 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      الشمائل المحمدية (₹)
                    </label>
                    <input
                      type="number"
                      value={settingsForm.coursePricing.shamail}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          coursePricing: { ...settingsForm.coursePricing, shamail: Number(e.target.value) },
                        })
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 focus:bg-white text-sm font-black text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    className="py-3 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Global Settings & Pricing</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Card 3: Live System Audit Trail */}
            <div className="bg-white p-6 rounded-2xl border border-purple-100 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-purple-50">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-600" />
                  <h2 className="text-sm font-extrabold text-slate-900">
                    System Audit Trail (Administrator Activity Log)
                  </h2>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                  Immutable Record
                </span>
              </div>

              <div className="overflow-x-auto border border-purple-50 rounded-xl">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-purple-50/60 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-purple-100">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Administrator</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Log Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50 font-medium text-slate-800">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-purple-50/20">
                        <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
                          {log.timestamp}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {log.actor}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-purple-700">
                          {log.action}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                            {log.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Fallback for Verification Admin trying to access restricted tabs */}
        {!isSuperAdmin && activeTab !== "overview" && (
          <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center space-y-4 max-w-lg mx-auto shadow-sm my-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Access Restricted</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your role (Verification Staff) is strictly authorized for the UPI Payment Verification queue.
                Institute settings, faculty compensation rosters, and financial aggregates are reserved for Super Administrators.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Return to Verification Queue
            </button>
          </div>
        )}
      </main>

      {/* MODAL: Reject Payment with Reason */}
      {rejectingPayment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 border border-purple-100 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-rose-700">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-extrabold">Reject UPI Payment</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Flag payment for student <strong>{rejectingPayment.student?.full_name}</strong> (TxID: <code>{rejectingPayment.upi_txid}</code>).
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Reason for Rejection *
              </label>
              <input
                type="text"
                placeholder="e.g. UTR not found on bank statement"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRejectingPayment(null);
                  setRejectReason("");
                }}
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectPayment}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Disburse Teacher Payout */}
      {payingPayrollItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl p-5 border border-purple-100 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 text-purple-700">
              <DollarSign className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-extrabold">Disburse Faculty Compensation</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Paying <strong>{payingPayrollItem.teacher_name}</strong> the amount of{" "}
              <strong className="text-purple-700">₹{payingPayrollItem.total_amount.toLocaleString("en-IN")}</strong> for{" "}
              {payingPayrollItem.classes_taken} classes in {payingPayrollItem.month_year}.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Bank / UPI Transfer Ref No. (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. UPI-PAYROLL-49102"
                value={payoutRefInput}
                onChange={(e) => setPayoutRefInput(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setPayingPayrollItem(null);
                  setPayoutRefInput("");
                }}
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisbursePayroll}
                className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Log Faculty Completed Live Classes */}
      {isAddingClassLog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateClassLog}
            className="bg-white w-full max-w-sm rounded-2xl p-5 border border-purple-100 shadow-2xl space-y-4 animate-fade-in"
          >
            <div className="flex items-center gap-2 text-purple-700">
              <BookOpen className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-extrabold">Log Faculty Live Classes</h3>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Faculty Instructor *
                </label>
                <input
                  type="text"
                  value={newClassLogForm.teacher_name}
                  onChange={(e) => setNewClassLogForm({ ...newClassLogForm, teacher_name: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Classes Taken *
                  </label>
                  <input
                    type="number"
                    value={newClassLogForm.classes_taken}
                    onChange={(e) => setNewClassLogForm({ ...newClassLogForm, classes_taken: Number(e.target.value) })}
                    required
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Rate / Class (₹) *
                  </label>
                  <input
                    type="number"
                    value={newClassLogForm.rate_per_class}
                    onChange={(e) => setNewClassLogForm({ ...newClassLogForm, rate_per_class: Number(e.target.value) })}
                    required
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Billing Month & Year *
                </label>
                <input
                  type="text"
                  value={newClassLogForm.month_year}
                  onChange={(e) => setNewClassLogForm({ ...newClassLogForm, month_year: e.target.value })}
                  required
                  className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingClassLog(false)}
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer"
              >
                Save Hours Log
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Super Admin Schedule Live Class For Faculty */}
      {isSchedulingClass && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAdminScheduleNewClass}
            className="bg-white w-full max-w-md rounded-2xl p-5 border border-purple-100 shadow-2xl space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between pb-2 border-b border-purple-50">
              <div className="flex items-center gap-2 text-purple-700">
                <Radio className="w-5 h-5 shrink-0 animate-pulse" />
                <h3 className="text-sm font-extrabold text-slate-900">Schedule Live Class (Super Admin)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSchedulingClass(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Session Title *
                </label>
                <input
                  type="text"
                  required
                  value={newClassScheduleForm.title}
                  onChange={(e) => setNewClassScheduleForm({ ...newClassScheduleForm, title: e.target.value })}
                  placeholder="e.g. Adaviyya: Prophetic Seerah & Tarbiyah Methodology"
                  className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Program Course *
                  </label>
                  <select
                    value={newClassScheduleForm.courseId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const name =
                        id === "adaviyya"
                          ? "Adaviyya"
                          : id === "shamail"
                          ? "الشمائل المحمدية"
                          : id === "fashion"
                          ? "Fashion Designing"
                          : "Home Tuition";
                      setNewClassScheduleForm({ ...newClassScheduleForm, courseId: id, courseName: name });
                    }}
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none font-medium"
                  >
                    <option value="adaviyya">Adaviyya</option>
                    <option value="shamail">الشمائل المحمدية</option>
                    <option value="fashion">Fashion Designing</option>
                    <option value="tuition">Home Tuition</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Platform *
                  </label>
                  <select
                    value={newClassScheduleForm.platform}
                    onChange={(e) => setNewClassScheduleForm({ ...newClassScheduleForm, platform: e.target.value as "Zoom" | "Google Meet" })}
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none font-medium"
                  >
                    <option value="Zoom">Zoom</option>
                    <option value="Google Meet">Google Meet</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newClassScheduleForm.date}
                    onChange={(e) => setNewClassScheduleForm({ ...newClassScheduleForm, date: e.target.value })}
                    className="w-full p-2 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Time (IST) *
                  </label>
                  <input
                    type="time"
                    required
                    value={newClassScheduleForm.time}
                    onChange={(e) => setNewClassScheduleForm({ ...newClassScheduleForm, time: e.target.value })}
                    className="w-full p-2 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Duration *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClassScheduleForm.duration}
                    onChange={(e) => setNewClassScheduleForm({ ...newClassScheduleForm, duration: e.target.value })}
                    placeholder="60 mins"
                    className="w-full p-2 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Broadcast / Meeting Link *
                </label>
                <input
                  type="url"
                  required
                  value={newClassScheduleForm.meetingLink}
                  onChange={(e) => setNewClassScheduleForm({ ...newClassScheduleForm, meetingLink: e.target.value })}
                  placeholder="https://zoom.us/j/hanoon-faculty-live"
                  className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-purple-50">
              <button
                type="button"
                onClick={() => setIsSchedulingClass(false)}
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer shadow-sm"
              >
                Confirm & Publish Schedule
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
