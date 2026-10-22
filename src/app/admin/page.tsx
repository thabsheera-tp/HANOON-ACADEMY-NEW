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
  Bell,
  FileUp,
  Megaphone,
  Eye,
  Sparkles,
  Edit3,
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
import TeacherManagementSection from "@/components/admin/TeacherManagementSection";
import StudentRegistrationsSection from "@/components/admin/StudentRegistrationsSection";
import StudentAnalyticsSection from "@/components/admin/StudentAnalyticsSection";
import AttendanceTrackerSection from "@/components/admin/AttendanceTrackerSection";
import FeeReceiptsManagerSection from "@/components/admin/FeeReceiptsManagerSection";
import PdfNotesUploadSection from "@/components/admin/PdfNotesUploadSection";
import ClassScheduleManagerSection from "@/components/admin/ClassScheduleManagerSection";
import NotificationsManagerSection from "@/components/admin/NotificationsManagerSection";
import AdminNoticeBoardManagerSection from "@/components/admin/AdminNoticeBoardManagerSection";
import { getNotifications } from "@/services/notificationService";
import { fetchPayments, updatePaymentStatus, getWhatsAppWelcomeUrl, getLastPaymentFetchError } from "@/services/paymentService";
import { fetchStudents, fetchUnifiedRegistrationsDetailed, UnifiedStudentRegistration } from "@/services/studentService";
import { fetchPayroll, markPayrollAsPaid, createPayrollRecord } from "@/services/payrollService";
import {
  getAppSettings,
  fetchAppSettings,
  saveAppSettings,
  getAuditLogs,
  fetchAuditLogs,
  addAuditLog,
  clearAuditLogs,
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
import { addSpecialClass } from "@/services/specialClassService";
import { fetchFacultyTeachers, getLocalFacultyTeachers, FacultyTeacher } from "@/services/teacherFacultyService";
import { DbPayment, DbStudent, DbPayroll, PaymentStatus } from "@/types/supabase";

export const FACULTY_MEMBERS = [
  {
    id: "tch-01",
    name: "Usthad Dr. Faisal Al-Hanoon",
    shortName: "Faisal",
    department: "Executive Dean & Lead Instructor",
    course: "Adaviyya (Seerah & Ethics)",
    phone: "919656294203",
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

export function getWhatsAppPayrollAdviceUrl(pay: DbPayroll): string {
  const teacher = FACULTY_MEMBERS.find(
    (f) => f.name.toLowerCase() === (pay.teacher_name || "").toLowerCase() || f.id === pay.teacher_id
  );
  const rawPhone = teacher?.phone || "919656294203";
  const message = `*HANOON ACADEMY | വിജ്ഞാന വെളിച്ചം* 🎓
*FACULTY REMUNERATION ADVICE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assalamu Alaikum *${pay.teacher_name}*,

Your faculty remuneration for live classes in *${pay.month_year}* has been processed.

📚 *Live Classes:* ${pay.classes_taken} Sessions
💵 *Assigned Rate:* ₹${pay.rate_per_class} / class
💰 *Total Amount:* *₹${pay.total_amount.toLocaleString("en-IN")}*
🔖 *Reference:* \`${pay.payment_reference || "UPI-DISBURSED"}\`
✅ *Status:* PAID & SETTLED

Jazakallahu Khairan for your dedication to Hanoon Academy students.

_Office of Finance & Human Resources_
🌐 https://hanoonacademy.com
📞 Admin Desk: +91 96562 94203`;

  return `https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfileRecord | null>(null);

  // Active Main Tab: overview, analytics, attendance, receipts, notices, upi, classes, notes, notifications, teachers, payroll, settings
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "analytics"
    | "attendance"
    | "receipts"
    | "notices"
    | "upi"
    | "classes"
    | "notes"
    | "notifications"
    | "teachers"
    | "payroll"
    | "settings"
  >("overview");
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);

  // Data States
  const [payments, setPayments] = useState<DbPayment[]>([]);
  const [students, setStudents] = useState<DbStudent[]>([]);
  const [unifiedRegistrations, setUnifiedRegistrations] = useState<UnifiedStudentRegistration[]>([]);
  const [payroll, setPayroll] = useState<DbPayroll[]>([]);
  const [settings, setSettings] = useState<AppSettings>(getAppSettings());
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(getAuditLogs());

  useEffect(() => {
    const updateUnread = () => {
      const count = getNotifications().filter((n) => !n.isRead).length;
      setUnreadNotifsCount(count);
    };
    const updateAuditLogs = (e: any) => {
      if (Array.isArray(e?.detail)) {
        setAuditLogs(e.detail);
      } else {
        setAuditLogs(getAuditLogs());
      }
    };
    updateUnread();
    window.addEventListener("hanoon_notifications_updated", updateUnread);
    window.addEventListener("hanoon_new_notification", updateUnread);
    window.addEventListener("hanoon_audit_logs_updated", updateAuditLogs);
    return () => {
      window.removeEventListener("hanoon_notifications_updated", updateUnread);
      window.removeEventListener("hanoon_new_notification", updateUnread);
      window.removeEventListener("hanoon_audit_logs_updated", updateAuditLogs);
    };
  }, []);

  // Teacher Oversight States
  const [teacherClasses, setTeacherClasses] = useState<LiveClassSession[]>([]);
  const [isSchedulingClass, setIsSchedulingClass] = useState(false);
  const [facultyTeachersList, setFacultyTeachersList] = useState<FacultyTeacher[]>(() => getLocalFacultyTeachers());
  const [newClassScheduleForm, setNewClassScheduleForm] = useState({
    title: "Adaviyya: Prophetic Seerah & Tarbiyah Methodology",
    courseId: "adaviyya",
    courseName: "Adaviyya",
    date: new Date().toISOString().split("T")[0],
    time: "19:30",
    duration: "60 mins",
    meetingLink: "https://zoom.us/j/hanoon-faculty-live",
    platform: "Zoom" as "Zoom" | "Google Meet",
    teacherName: "Usthad Dr. Faisal",
    isCustomTeacher: false,
    customTeacherName: "",
    isCustomCourse: false,
    customCourseName: "",
    isCustomSubject: false,
    customSubjectName: "",
    isSpecialClass: false,
    specialClassTitle: "",
    specialClassLiveUrl: "",
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
    teacher_name: "",
    classes_taken: 0,
    rate_per_class: 800,
    month_year: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
  });

  // Settings State Form & QR Management
  const [settingsForm, setSettingsForm] = useState<AppSettings>(getAppSettings());
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [qrUploadNotice, setQrUploadNotice] = useState<string | null>(null);
  const [testCopiedUpi, setTestCopiedUpi] = useState(false);
  const [showClearLogConfirm, setShowClearLogConfirm] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [dashboardFetchError, setDashboardFetchError] = useState<string | null>(null);
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
          fetchPayments().catch((e) => {
            console.warn("fetchPayments error:", e);
            return [];
          }),
          fetchStudents().catch((e) => {
            console.warn("fetchStudents error:", e);
            return [];
          }),
        ]);
        setPayments(payData || []);
        setStudents(stdData || []);
      } else {
        // Full Super Admin mode: Load full administrative financials and settings
        const [payData, stdData, rollData, settingsData, auditData] = await Promise.all([
          fetchPayments().catch((e) => {
            console.warn("fetchPayments error:", e);
            return [];
          }),
          fetchStudents().catch((e) => {
            console.warn("fetchStudents error:", e);
            return [];
          }),
          fetchPayroll().catch((e) => {
            console.warn("fetchPayroll error:", e);
            return [];
          }),
          fetchAppSettings().catch((e) => {
            console.warn("fetchAppSettings error:", e);
            return getAppSettings();
          }),
          fetchAuditLogs().catch((e) => {
            console.warn("fetchAuditLogs error:", e);
            return [];
          }),
        ]);
        setPayments(payData || []);
        setStudents(stdData || []);
        setPayroll(rollData || []);
        setSettings(settingsData);
        setSettingsForm(settingsData);
        setAuditLogs(auditData || []);
        setTeacherClasses(getTeacherClasses());
      }

      // Concurrently load detailed unified registrations for Analytics, Attendance and Receipts
      try {
        const { data: unifiedData } = await fetchUnifiedRegistrationsDetailed();
        if (unifiedData) {
          setUnifiedRegistrations(unifiedData);
        }
      } catch (uErr) {
        console.warn("Unified registrations loading notice:", uErr);
      }

      const lastPayErr = getLastPaymentFetchError();
      if (lastPayErr) {
        setDashboardFetchError(lastPayErr);
      } else {
        setDashboardFetchError(null);
      }
    } catch (err: any) {
      console.error("Failed to load admin dashboard data:", err);
      setDashboardFetchError(err?.message || "Failed to load database records from Supabase.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleRolePreview = () => {
    if (!currentUser) return;
    const newRole = isSuperAdmin ? "verification_admin" : "admin";
    const newName =
      newRole === "verification_admin"
        ? "Staff Verification Officer"
        : "System Administrator";
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
    let isMounted = true;

    const verifyAdminSession = async () => {
      let activeUser: UserProfileRecord | null = null;

      // 1. Check live Supabase Auth session first
      const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session: supaSession }, error } = await supabase.auth.getSession();
          if (!error && supaSession?.user) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, email, full_name, role, district, whatsapp_num, avatar_url")
              .eq("id", supaSession.user.id)
              .maybeSingle();

            const role = (profile?.role as any) || (supaSession.user.user_metadata?.role as any) || "admin";
            const isAuthorized =
              role === "admin" ||
              role === "super_admin" ||
              role === "verification_admin";

            if (!isAuthorized) {
              if (isMounted) router.replace("/admin/login?error=admin_only");
              return;
            }

            activeUser = {
              id: supaSession.user.id,
              email: supaSession.user.email || "",
              full_name: profile?.full_name || supaSession.user.user_metadata?.full_name || "Administrator",
              role: role,
              district: profile?.district || "Calicut",
              whatsapp_num: profile?.whatsapp_num || "",
            };
            setAuthSession(activeUser, supaSession.access_token);
          }
        } catch (e) {
          console.warn("Live Supabase admin session check error:", e);
        }
      }

      // 2. Fallback to cached cookie / localStorage session
      if (!activeUser) {
        const localSession = getCurrentSession();
        const isAuthorized =
          localSession?.user?.role === "admin" ||
          localSession?.user?.role === "super_admin" ||
          localSession?.user?.role === "verification_admin";

        if (localSession?.user && isAuthorized) {
          activeUser = localSession.user;
        }
      }

      // 3. If unauthenticated, redirect immediately to /admin/login
      if (!activeUser) {
        if (isMounted) router.replace("/admin/login");
        return;
      }

      if (isMounted) {
        setCurrentUser(activeUser);
        const isVerif = activeUser.role === "verification_admin";
        if (isVerif) {
          setActiveTab("overview");
        }
        loadAllData(isVerif);
      }
    };

    verifyAdminSession();

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
      isMounted = false;
      if (realtimeChannel) {
        import("@/lib/supabaseClient").then(({ supabase }) => {
          if (supabase) supabase.removeChannel(realtimeChannel);
        });
      }
      window.removeEventListener("hanoon_payment_event", handleLocalPayment);
    };
  }, [loadAllData, router]);

  const handleSignOut = async () => {
    try {
      const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn("Supabase auth signOut warning:", e);
    }
    await logoutUser();
    router.replace("/admin/login");
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

    const finalTeacherName = newClassScheduleForm.isCustomTeacher
      ? newClassScheduleForm.customTeacherName.trim()
      : (newClassScheduleForm.teacherName.trim() || newClassScheduleForm.customTeacherName.trim() || "Faculty Instructor");
    const finalCourseName = newClassScheduleForm.isCustomCourse
      ? newClassScheduleForm.customCourseName.trim()
      : newClassScheduleForm.courseName;
    const finalCourseId = newClassScheduleForm.isCustomCourse
      ? (newClassScheduleForm.customCourseName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "custom-course")
      : newClassScheduleForm.courseId;
    const finalLiveUrl = (newClassScheduleForm.isSpecialClass && newClassScheduleForm.specialClassLiveUrl.trim())
      ? newClassScheduleForm.specialClassLiveUrl.trim()
      : newClassScheduleForm.meetingLink.trim();

    let finalTitle = newClassScheduleForm.title.trim();
    if (newClassScheduleForm.isSpecialClass && newClassScheduleForm.specialClassTitle.trim()) {
      finalTitle = newClassScheduleForm.specialClassTitle.trim();
    } else if (newClassScheduleForm.isCustomSubject && newClassScheduleForm.customSubjectName.trim()) {
      finalTitle = `${newClassScheduleForm.customSubjectName.trim()}: ${finalTitle}`;
    }

    const created = scheduleNewClass({
      title: finalTitle,
      courseId: finalCourseId,
      courseName: finalCourseName,
      date: newClassScheduleForm.date,
      time: newClassScheduleForm.time,
      duration: newClassScheduleForm.duration.trim() || "60 mins",
      meetingLink: finalLiveUrl,
      platform: newClassScheduleForm.platform,
      teacher_id: `tch-${Date.now()}`,
      teacherName: finalTeacherName,
      isSpecialClass: newClassScheduleForm.isSpecialClass,
      specialClassTitle: newClassScheduleForm.isSpecialClass ? finalTitle : undefined,
      isCustomCourse: newClassScheduleForm.isCustomCourse,
      subjectName: newClassScheduleForm.isCustomSubject ? newClassScheduleForm.customSubjectName.trim() : undefined,
    });

    if (newClassScheduleForm.isSpecialClass) {
      try {
        addSpecialClass({
          title: finalTitle,
          subtitle: `Live Broadcast with ${finalTeacherName}`,
          instructor: finalTeacherName,
          category: "Gathering",
          badgeGradient: "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-lg",
          iconType: "sparkles",
          scheduleTime: `${newClassScheduleForm.date} • ${newClassScheduleForm.time} IST`,
          status: "UPCOMING",
          liveUrl: finalLiveUrl,
          description: `Live special class: ${finalTitle}. Conducted by ${finalTeacherName}.`,
        });
      } catch (err) {
        console.warn("Could not sync special class:", err);
      }
    }

    setTeacherClasses(getTeacherClasses());
    addAuditLog({
      actor: currentUser?.full_name || "Admin Desk",
      action: "Scheduled Faculty Class",
      category: "CURRICULUM",
      details: `Scheduled "${created.title}" (${finalCourseName}) on ${created.date} at ${created.time}.`,
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
        : cleanWhatsApp || "919656294203";

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

  const handleClearLogs = async () => {
    setIsClearingLogs(true);
    try {
      await clearAuditLogs();
      setAuditLogs([]);
      setShowClearLogConfirm(false);
      setSaveSuccessMsg("Activity log successfully cleared.");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Failed to clear audit logs:", err);
    } finally {
      setIsClearingLogs(false);
    }
  };

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-['Plus_Jakarta_Sans']">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400">Verifying administrator authorization...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50 text-slate-900 font-['Plus_Jakarta_Sans'] select-none w-full overflow-x-hidden">
      {/* Top Admin Navigation Header */}
      <header className="bg-white border-b border-purple-100 shadow-xs sticky top-0 z-40 w-full max-w-full overflow-x-hidden">
        <div className="w-full max-w-md sm:max-w-6xl mx-auto px-2.5 sm:px-6 py-2 sm:py-3.5 flex items-center justify-between gap-1.5 sm:gap-2 min-w-0 max-w-full">
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0 shrink">
            <HanoonLogo size="sm" compactMobile />
            <div className="h-3.5 sm:h-4 w-px bg-purple-200 shrink-0" />
            <span
              className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                isSuperAdmin
                  ? "bg-purple-100 text-purple-800 border border-purple-200/60"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-200/60"
              }`}
            >
              <span>{isSuperAdmin ? "Admin" : "Verifier"}</span>
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-600 hidden lg:inline max-w-[130px] truncate">
              {currentUser.full_name}
            </span>

            {/* Student View Button */}
            <Link
              href="/"
              title="Preview Student Portal"
              className="p-1.5 sm:py-1.5 sm:px-2.5 rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[10px] sm:text-xs font-bold text-purple-800 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
            >
              <Eye className="w-3.5 h-3.5 shrink-0 text-purple-600" />
              <span className="hidden sm:inline font-bold">Student View</span>
            </Link>

            {/* Role Switcher: Live evaluation toggle between Super Admin & Verification Staff */}
            <button
              type="button"
              onClick={handleToggleRolePreview}
              title={`Switch live role preview to ${isSuperAdmin ? "Verification Staff" : "Super Admin"}`}
              className="p-1.5 sm:py-1.5 sm:px-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[10px] sm:text-xs font-bold text-slate-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
              aria-label={`Switch mode to ${isSuperAdmin ? "Verifier" : "Admin"}`}
            >
              <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${isSuperAdmin ? "text-purple-600" : "text-emerald-600"}`} />
              <span className="hidden sm:inline font-extrabold text-purple-700">
                {isSuperAdmin ? "Admin" : "Verifier"}
              </span>
            </button>

            {/* Sign Out / Logout Button */}
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out of Admin Dashboard"
              className="py-1.5 px-2.5 sm:px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-95"
              aria-label="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0 text-rose-600" />
              <span className="text-xs font-extrabold">Logout</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="w-full max-w-md sm:max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar pt-1 border-t border-purple-50 sm:border-0">
          {/* Tab 1: 🎓 Student Registrations & Payments */}
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "overview"
                ? "border-purple-600 text-purple-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {isSuperAdmin ? (
              <Users className="w-4 h-4 shrink-0 text-purple-600" />
            ) : (
              <CreditCard className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            <span>{isSuperAdmin ? "🎓 Registrations & Payments" : "💳 Payment Verification"}</span>
            {pendingPaymentsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                {pendingPaymentsCount}
              </span>
            )}
          </button>

          {/* Tab 1.1: 📊 Student Analytics & Realization */}
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "analytics"
                ? "border-purple-600 text-purple-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingUp className="w-4 h-4 shrink-0 text-purple-600" />
            <span>📊 Analytics</span>
          </button>

          {/* Tab 1.2: 📅 Attendance Register */}
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "attendance"
                ? "border-purple-600 text-purple-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>📅 Attendance</span>
          </button>

          {/* Tab 1.3: 🧾 Official Fee Receipts */}
          <button
            type="button"
            onClick={() => setActiveTab("receipts")}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "receipts"
                ? "border-purple-600 text-purple-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileText className="w-4 h-4 shrink-0 text-blue-600" />
            <span>🧾 Fee Receipts</span>
          </button>

          {/* Tab 1.5: 📢 Notice Board & Announcements */}
          <button
            type="button"
            onClick={() => setActiveTab("notices")}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "notices"
                ? "border-purple-600 text-purple-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Megaphone className="w-4 h-4 shrink-0 text-purple-600" />
            <span>📢 Notice Board</span>
          </button>

          {/* Tab 2: 📅 Class Scheduling & Live Manager */}
          <button
            type="button"
            onClick={() => setActiveTab("classes")}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "classes"
                ? "border-purple-600 text-purple-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0 text-purple-600" />
            <span>📅 Class Scheduling & Live</span>
            {teacherClasses.some((c) => c.status === "LIVE_NOW") && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[9px] font-black animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                <span>LIVE</span>
              </span>
            )}
          </button>

          {/* Tab 3: 📚 PDF Notes & Materials Upload */}
          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "notes"
                ? "border-purple-600 text-purple-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <FileUp className="w-4 h-4 shrink-0 text-indigo-600" />
            <span>📚 PDF Notes Upload</span>
          </button>

          {/* Tab 4: 🔔 Notifications Center */}
          <button
            type="button"
            onClick={() => setActiveTab("notifications")}
            className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
              activeTab === "notifications"
                ? "border-purple-600 text-purple-700 font-extrabold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bell className="w-4 h-4 shrink-0 text-amber-500" />
            <span>🔔 Notifications Hub</span>
            {unreadNotifsCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Additional Tabs for Super Admin Only */}
          {isSuperAdmin && (
            <>
              {/* Tab 5: 👩‍🏫 Teachers & Subjects Management */}
              <button
                type="button"
                onClick={() => setActiveTab("teachers")}
                className={`py-2.5 sm:py-3 px-3 sm:px-4 font-bold text-xs border-b-2 flex items-center gap-1.5 sm:gap-2 cursor-pointer transition-all shrink-0 ${
                  activeTab === "teachers"
                    ? "border-purple-600 text-purple-700 font-extrabold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0 text-indigo-600" />
                <span>👩‍🏫 Teachers & Subjects</span>
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
                <span>UPI Settings</span>
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
                <span>Payroll</span>
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
          )}
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="w-full max-w-md sm:max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 pb-20 sm:pb-12 space-y-5 sm:space-y-6 overflow-x-hidden">
        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
            <button
              onClick={() => setSaveSuccessMsg(null)}
              className="text-emerald-700 font-extrabold text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Database Query Warning Alert Banner */}
        {dashboardFetchError && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex flex-col sm:flex-row items-start justify-between gap-3 shadow-md animate-fade-in">
            <div className="flex items-start gap-3">
              <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-black text-rose-900 text-sm">
                    Supabase Query Error Encountered
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full">
                    RLS / Column Issue
                  </span>
                </div>
                <p className="text-xs text-rose-800 font-medium">
                  The database returned an error while loading records:
                </p>
                <div className="mt-1.5 p-2.5 rounded-lg bg-rose-100/90 border border-rose-300 font-mono text-[11px] text-rose-900 break-all select-all">
                  {dashboardFetchError}
                </div>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => loadAllData()}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
              <button
                type="button"
                onClick={() => setDashboardFetchError(null)}
                className="p-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
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
                <span className="font-extrabold text-emerald-950 block">Staff & Verification Portal Active</span>
                <span className="text-[11px] text-emerald-800">
                  Full tools available: Payment Verification Queue, Class Scheduling & Live Google Meet/Zoom links, PDF Notes Upload, and Push Notifications.
                </span>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white text-emerald-800 border border-emerald-200 shrink-0 self-start sm:self-auto">
              Staff Suite Online
            </span>
          </div>
        )}

        {/* ========================================================
            TAB 1: 🎓 STUDENT REGISTRATIONS & PAYMENTS VIEW
            ======================================================== */}
        {activeTab === "overview" && (
          <StudentRegistrationsSection isSuperAdmin={isSuperAdmin} />
        )}

        {/* ========================================================
            TAB 1.1: 📊 STUDENT ANALYTICS & EXECUTIVE INTELLIGENCE
            ======================================================== */}
        {activeTab === "analytics" && (
          <div className="animate-fade-in">
            <StudentAnalyticsSection registrations={unifiedRegistrations} />
          </div>
        )}

        {/* ========================================================
            TAB 1.2: 📅 ATTENDANCE REGISTER & PARENT WHATSAPP ALERTS
            ======================================================== */}
        {activeTab === "attendance" && (
          <div className="animate-fade-in">
            <AttendanceTrackerSection registrations={unifiedRegistrations} />
          </div>
        )}

        {/* ========================================================
            TAB 1.3: 🧾 OFFICIAL FEE RECEIPTS & ADMISSION PASSES
            ======================================================== */}
        {activeTab === "receipts" && (
          <div className="animate-fade-in">
            <FeeReceiptsManagerSection registrations={unifiedRegistrations} />
          </div>
        )}

        {/* ========================================================
            TAB: 📢 NOTICE BOARD & ANNOUNCEMENTS PUBLISHER
            ======================================================== */}
        {activeTab === "notices" && (
          <div className="animate-fade-in">
            <AdminNoticeBoardManagerSection
              currentUserName={currentUser?.full_name}
              currentUserRole={currentUser?.role}
            />
          </div>
        )}

        {/* ========================================================
            TAB: 📅 CLASS NOTIFICATION & SCHEDULE MANAGER
            ======================================================== */}
        {activeTab === "classes" && (
          <div className="animate-fade-in">
            <ClassScheduleManagerSection
              currentUserRole={currentUser?.role}
              currentUserName={currentUser?.full_name}
            />
          </div>
        )}

        {/* ========================================================
            TAB: 📚 PDF NOTES & MATERIALS UPLOAD TOOL
            ======================================================== */}
        {activeTab === "notes" && (
          <div className="animate-fade-in">
            <PdfNotesUploadSection
              currentUserRole={currentUser?.role}
              currentUserName={currentUser?.full_name}
            />
          </div>
        )}

        {/* ========================================================
            TAB: 🔔 NOTIFICATIONS HUB & BROADCAST CENTER
            ======================================================== */}
        {activeTab === "notifications" && (
          <div className="animate-fade-in">
            <NotificationsManagerSection
              currentUserRole={currentUser?.role}
              currentUserName={currentUser?.full_name}
            />
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
                        placeholder="e.g. 9656294203 or 919656294203"
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
            {/* 1. Dynamic Faculty & Subjects Management (Add, Edit, Delete, Status Toggle, Real-time DB Sync) */}
            <TeacherManagementSection
              onScheduleClass={(teacherName, subject) => {
                setNewClassScheduleForm((prev) => ({
                  ...prev,
                  title: `${subject}: Weekly Core Session (${teacherName})`,
                  courseName: subject,
                }));
                setIsSchedulingClass(true);
              }}
            />

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
                  {payroll && payroll.length > 0
                    ? `${payroll.reduce((acc, p) => acc + (p.classes_taken || 0), 0)} Classes`
                    : "0 Classes"}
                </h3>
                <p className="text-[11px] text-purple-600 font-semibold">Tracked across faculty</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-md space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Disbursed Salary Compensation
                </span>
                <h3 className="text-2xl font-black text-emerald-700">
                  ₹{payroll && payroll.length > 0
                    ? payroll
                        .filter((p) => p.status === "PAID")
                        .reduce((acc, p) => acc + (p.total_amount || 0), 0)
                        .toLocaleString("en-IN")
                    : "0"}
                </h3>
                <p className="text-[11px] text-slate-500 font-semibold">Verified bank & UPI payouts</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-md space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Pending Payout Due
                </span>
                <h3 className="text-2xl font-black text-amber-700">
                  ₹{payroll && payroll.length > 0
                    ? payroll
                        .filter((p) => p.status === "PENDING")
                        .reduce((acc, p) => acc + (p.total_amount || 0), 0)
                        .toLocaleString("en-IN")
                    : "0"}
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
                    {payroll.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs font-semibold text-slate-400">
                          No payroll records found.
                        </td>
                      </tr>
                    ) : (
                      payroll.map((pay) => {
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
                                <div className="inline-flex items-center gap-2">
                                  <span className="text-[11px] font-bold text-emerald-600">
                                    Settled
                                  </span>
                                  <a
                                    href={getWhatsAppPayrollAdviceUrl(pay)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs inline-flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                                    title="Send Remuneration Slip on WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Share Slip</span>
                                  </a>
                                </div>
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-purple-50">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-600" />
                  <h2 className="text-sm font-extrabold text-slate-900">
                    System Audit Trail (Administrator Activity Log)
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowClearLogConfirm(true)}
                    disabled={auditLogs.length === 0}
                    className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Clear Activity Log</span>
                  </button>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                    {auditLogs.length} Records
                  </span>
                </div>
              </div>

              {/* Confirmation Popup */}
              {showClearLogConfirm && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-rose-800">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                    <div>
                      <p className="text-xs font-bold">Are you sure you want to clear all activity logs?</p>
                      <p className="text-[11px] text-rose-600">This will permanently delete the log history from the system and Supabase.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      disabled={isClearingLogs}
                      onClick={handleClearLogs}
                      className="py-1.5 px-3.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isClearingLogs ? "Clearing..." : "Yes, Clear Logs"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowClearLogConfirm(false)}
                      className="py-1.5 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

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
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-xs font-semibold text-slate-400">
                          No activity logs found.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((log) => (
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
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Fallback for Verification Admin trying to access restricted tabs */}
        {!isSuperAdmin &&
          activeTab !== "overview" &&
          activeTab !== "notices" &&
          activeTab !== "classes" &&
          activeTab !== "notes" &&
          activeTab !== "notifications" && (
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

      {/* MODAL: Super Admin & Verifier Schedule Live Class */}
      {isSchedulingClass && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAdminScheduleNewClass}
            className="bg-white w-full max-w-lg rounded-2xl p-5 border border-purple-100 shadow-2xl space-y-4 animate-fade-in max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-purple-50">
              <div className="flex items-center gap-2 text-purple-700">
                <Radio className="w-5 h-5 shrink-0 animate-pulse" />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Schedule Live Class (Admin & Verifier Desk)
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    Dynamic scheduling for Super Admin & Verification Staff
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSchedulingClass(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              {/* 1. Custom Teacher Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    Teacher / Faculty *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewClassScheduleForm({
                        ...newClassScheduleForm,
                        isCustomTeacher: !newClassScheduleForm.isCustomTeacher,
                      })
                    }
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition-all flex items-center gap-1 ${
                      newClassScheduleForm.isCustomTeacher
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{newClassScheduleForm.isCustomTeacher ? "Registered Faculty" : "+ Custom Teacher"}</span>
                  </button>
                </div>

                {newClassScheduleForm.isCustomTeacher || facultyTeachersList.length === 0 ? (
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={newClassScheduleForm.customTeacherName}
                      onChange={(e) =>
                        setNewClassScheduleForm({
                          ...newClassScheduleForm,
                          customTeacherName: e.target.value,
                          teacherName: e.target.value,
                        })
                      }
                      placeholder="Type real teacher's full name (e.g. Usthad Dr. Faisal Hudawi)"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-purple-50/50 border border-purple-300 text-xs text-slate-900 outline-none font-medium placeholder:text-slate-400"
                    />
                  </div>
                ) : (
                  <select
                    value={newClassScheduleForm.teacherName}
                    onChange={(e) => {
                      if (e.target.value === "__custom__") {
                        setNewClassScheduleForm({ ...newClassScheduleForm, isCustomTeacher: true });
                      } else {
                        setNewClassScheduleForm({
                          ...newClassScheduleForm,
                          teacherName: e.target.value,
                        });
                      }
                    }}
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none font-medium cursor-pointer"
                  >
                    {facultyTeachersList.map((t) => (
                      <option key={t.id} value={t.fullName}>
                        {t.fullName} ({t.specialization})
                      </option>
                    ))}
                    <option value="__custom__">+ Type Custom Teacher Name...</option>
                  </select>
                )}
              </div>

              {/* 2. Target Course & Subject Track */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    Program Course *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewClassScheduleForm({
                        ...newClassScheduleForm,
                        isCustomCourse: !newClassScheduleForm.isCustomCourse,
                      })
                    }
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition-all flex items-center gap-1 ${
                      newClassScheduleForm.isCustomCourse
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{newClassScheduleForm.isCustomCourse ? "Standard Courses" : "+ Custom / Extra Course"}</span>
                  </button>
                </div>

                {newClassScheduleForm.isCustomCourse ? (
                  <input
                    type="text"
                    required
                    value={newClassScheduleForm.customCourseName}
                    onChange={(e) =>
                      setNewClassScheduleForm({
                        ...newClassScheduleForm,
                        customCourseName: e.target.value,
                        courseName: e.target.value,
                      })
                    }
                    placeholder="Enter Custom Course (e.g. Burdah Live Gathering, Quran Tajweed Diploma)"
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-300 text-xs text-slate-900 outline-none font-medium placeholder:text-slate-400"
                  />
                ) : (
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
                )}
              </div>

              {/* 3. Special Class Toggle & Link */}
              <div className={`p-3 rounded-xl border transition-all ${
                newClassScheduleForm.isSpecialClass
                  ? "bg-amber-50/70 border-amber-300 ring-1 ring-amber-300/40"
                  : "bg-slate-50 border-slate-200"
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-4 h-4 ${newClassScheduleForm.isSpecialClass ? "text-amber-600" : "text-slate-400"}`} />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Is this a Special Class?
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        e.g. Burdah Live, Salawat Majlis, or Masterclass
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!newClassScheduleForm.isSpecialClass && (
                      <button
                        type="button"
                        onClick={() =>
                          setNewClassScheduleForm({
                            ...newClassScheduleForm,
                            isSpecialClass: true,
                            specialClassTitle: "Burdah Live Gathering",
                            specialClassLiveUrl: "https://zoom.us/j/hanoon-burdah-live",
                          })
                        }
                        className="text-[10px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded cursor-pointer"
                      >
                        + Burdah Preset
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setNewClassScheduleForm({
                          ...newClassScheduleForm,
                          isSpecialClass: !newClassScheduleForm.isSpecialClass,
                        })
                      }
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                        newClassScheduleForm.isSpecialClass ? "bg-amber-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          newClassScheduleForm.isSpecialClass ? "translate-x-4" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {newClassScheduleForm.isSpecialClass && (
                  <div className="mt-2.5 pt-2.5 border-t border-amber-200/60 space-y-2 animate-fade-in">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-900 block">
                        Special Class Title *
                      </label>
                      <input
                        type="text"
                        required={newClassScheduleForm.isSpecialClass}
                        value={newClassScheduleForm.specialClassTitle}
                        onChange={(e) =>
                          setNewClassScheduleForm({
                            ...newClassScheduleForm,
                            specialClassTitle: e.target.value,
                          })
                        }
                        placeholder="e.g. Burdah Live Gathering"
                        className="w-full p-2 rounded-lg bg-white border border-amber-300 text-xs text-slate-900 outline-none font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-amber-900 block">
                        Dedicated Live Link URL *
                      </label>
                      <input
                        type="url"
                        required={newClassScheduleForm.isSpecialClass}
                        value={newClassScheduleForm.specialClassLiveUrl}
                        onChange={(e) =>
                          setNewClassScheduleForm({
                            ...newClassScheduleForm,
                            specialClassLiveUrl: e.target.value,
                          })
                        }
                        placeholder="https://zoom.us/j/hanoon-burdah-live"
                        className="w-full p-2 rounded-lg bg-white border border-amber-300 text-xs text-slate-900 outline-none font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Session Title (General Session) */}
              {!newClassScheduleForm.isSpecialClass && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Session Title *
                  </label>
                  <input
                    type="text"
                    required={!newClassScheduleForm.isSpecialClass}
                    value={newClassScheduleForm.title}
                    onChange={(e) => setNewClassScheduleForm({ ...newClassScheduleForm, title: e.target.value })}
                    placeholder="e.g. Adaviyya: Prophetic Seerah & Tarbiyah Methodology"
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none font-medium"
                  />
                </div>
              )}

              {/* 5. Date, Time, Flexible Duration */}
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
                    placeholder="e.g. 45 mins, 1.5 hours"
                    className="w-full p-2 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none font-medium"
                  />
                </div>
              </div>

              {/* Quick duration presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold">Presets:</span>
                {["45 mins", "60 mins", "1.5 hours", "2 hours"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewClassScheduleForm({ ...newClassScheduleForm, duration: preset })}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer ${
                      newClassScheduleForm.duration === preset
                        ? "bg-purple-600 text-white border-purple-600"
                        : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* 6. Platform & Meeting Link (if not special class) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Platform *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewClassScheduleForm({ ...newClassScheduleForm, platform: "Google Meet" })}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer text-xs font-bold ${
                      newClassScheduleForm.platform === "Google Meet"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Google Meet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewClassScheduleForm({ ...newClassScheduleForm, platform: "Zoom" })}
                    className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer text-xs font-bold ${
                      newClassScheduleForm.platform === "Zoom"
                        ? "bg-blue-50 border-blue-500 text-blue-800"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-blue-600" />
                    <span>Zoom</span>
                  </button>
                </div>
              </div>

              {!newClassScheduleForm.isSpecialClass && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">
                    Broadcast / Meeting Link *
                  </label>
                  <input
                    type="url"
                    required={!newClassScheduleForm.isSpecialClass}
                    value={newClassScheduleForm.meetingLink}
                    onChange={(e) => setNewClassScheduleForm({ ...newClassScheduleForm, meetingLink: e.target.value })}
                    placeholder="https://zoom.us/j/hanoon-faculty-live"
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-200 text-xs text-slate-900 outline-none font-mono"
                  />
                </div>
              )}
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
                className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold cursor-pointer shadow-sm flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4" />
                <span>Confirm & Publish Schedule</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
