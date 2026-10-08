"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  X,
  User,
  Phone,
  AlertTriangle,
  BookOpen,
  Edit3,
  Save,
  Plus,
  Trash2,
  Radio,
  Calendar,
  Sparkles,
  Award,
  DollarSign,
  Search,
  CheckCircle2,
  Download,
  CreditCard,
  Users,
  MessageCircle,
} from "lucide-react";
import { DbPayment, PaymentStatus, DbCertificate, DbPayroll } from "@/types/supabase";
import { fetchPayments, updatePaymentStatus, getWhatsAppWelcomeUrl } from "@/services/paymentService";
import { isSupabaseConfigured } from "@/lib/supabaseClient";
import {
  AdaviyyaSubject,
  getAdaviyyaSubjects,
  updateAdaviyyaSubject,
} from "@/services/subjectService";
import {
  SpecialClass,
  getSpecialClasses,
  addSpecialClass,
  updateSpecialClass,
  deleteSpecialClass,
} from "@/services/specialClassService";
import {
  fetchCertificates,
  issueCertificate,
} from "@/services/certificateService";
import {
  fetchPayroll,
  markPayrollAsPaid,
  createPayrollRecord,
} from "@/services/payrollService";
import { getCurrentSession, isSuperAdminRole } from "@/services/authService";

interface AdminManagementPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentApproved?: (studentName?: string, courseId?: string) => void;
}

export default function AdminManagementPanel({
  isOpen,
  onClose,
  onPaymentApproved,
}: AdminManagementPanelProps) {
  const [activeTab, setActiveTab] = useState<
    "payments" | "students" | "curriculum" | "certificates" | "payroll"
  >("payments");

  const [payments, setPayments] = useState<DbPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingPayment, setRejectingPayment] = useState<DbPayment | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const currentRole = getCurrentSession()?.user?.role;
  const isSuperAdmin = isSuperAdminRole(currentRole);

  // Subjects & Special Classes
  const [subjects, setSubjects] = useState<AdaviyyaSubject[]>([]);
  const [editingSubject, setEditingSubject] = useState<AdaviyyaSubject | null>(null);
  const [specialClasses, setSpecialClasses] = useState<SpecialClass[]>([]);
  const [isCreatingSpecial, setIsCreatingSpecial] = useState(false);
  const [newSpecialForm, setNewSpecialForm] = useState({
    title: "",
    subtitle: "",
    instructor: "",
    category: "Masterclass" as "Recitation" | "Gathering" | "Workshop" | "Masterclass",
    scheduleTime: "",
    liveUrl: "",
    description: "",
  });

  // Certificate Module State
  const [certificates, setCertificates] = useState<DbCertificate[]>([]);
  const [isIssuingCert, setIsIssuingCert] = useState(false);
  const [certForm, setCertForm] = useState({
    student_name: "",
    course_id: "adaviyya",
    course_title: "Adaviyya Islamic Sharia & Moral Tarbiyah",
    grade: "Distinction (95%)",
  });

  // Payroll Module State
  const [payroll, setPayroll] = useState<DbPayroll[]>([]);
  const [payingPayrollId, setPayingPayrollId] = useState<string | null>(null);
  const [paymentRefInput, setPaymentRefInput] = useState("");
  const [isAddingPayroll, setIsAddingPayroll] = useState(false);
  const [newPayrollForm, setNewPayrollForm] = useState({
    teacher_id: "tch-01",
    teacher_name: "Usthad Dr. Faisal Al-Hanoon",
    month_year: new Date().toLocaleString("default", { month: "long", year: "numeric" }),
    classes_taken: 0,
    rate_per_class: 800,
  });

  const [searchFilter, setSearchFilter] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [approvedWhatsAppNotice, setApprovedWhatsAppNotice] = useState<{
    studentName: string;
    courseName: string;
    phone: string;
    whatsappUrl: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const paymentData = await fetchPayments();
      setPayments(paymentData);

      if (isSuperAdmin) {
        setSubjects(getAdaviyyaSubjects());
        setSpecialClasses(getSpecialClasses());
        const certs = await fetchCertificates();
        setCertificates(certs);
        const pays = await fetchPayroll();
        setPayroll(pays);
      }
    } catch (e) {
      console.error("Failed to load admin data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const handleApprovePayment = async (payment: DbPayment) => {
    setProcessingId(payment.id);
    try {
      await updatePaymentStatus(payment.id, "APPROVED");
      setPayments((prev) =>
        prev.map((p) => (p.id === payment.id ? { ...p, status: "APPROVED" as PaymentStatus } : p))
      );
      if (onPaymentApproved) {
        onPaymentApproved(payment.student?.full_name, payment.course_id);
      }

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

      setSaveSuccessMsg(`Payment Approved! Course unlocked for ${sName}.`);
      setTimeout(() => setSaveSuccessMsg(null), 4000);
    } catch (e) {
      console.error("Error approving payment:", e);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPayment = async () => {
    if (!rejectingPayment) return;
    setProcessingId(rejectingPayment.id);
    try {
      await updatePaymentStatus(rejectingPayment.id, "REJECTED", rejectReason || "Invalid UTR ID");
      setPayments((prev) =>
        prev.map((p) =>
          p.id === rejectingPayment.id
            ? { ...p, status: "REJECTED" as PaymentStatus, rejection_reason: rejectReason }
            : p
        )
      );
      setRejectingPayment(null);
      setRejectReason("");
      setSaveSuccessMsg("Payment marked as rejected.");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      console.error("Error rejecting payment:", e);
    } finally {
      setProcessingId(null);
    }
  };

  // Certificate Issuance
  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certForm.student_name.trim()) return;

    try {
      const issued = await issueCertificate(certForm);
      setCertificates((prev) => [issued, ...prev]);
      setIsIssuingCert(false);
      setCertForm({
        student_name: "",
        course_id: "adaviyya",
        course_title: "Adaviyya Islamic Sharia & Moral Tarbiyah",
        grade: "Distinction (95%)",
      });
      setSaveSuccessMsg(`Certificate #${issued.certificate_number} successfully issued!`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      console.error("Error issuing certificate:", e);
    }
  };

  // Payroll Payout
  const handleConfirmPayrollPayment = async (payrollId: string) => {
    const ref = paymentRefInput.trim() || `UPI/2026/${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await markPayrollAsPaid(payrollId, ref);
      setPayroll((prev) =>
        prev.map((p) => (p.id === payrollId ? { ...p, status: "PAID", payment_reference: ref } : p))
      );
      setPayingPayrollId(null);
      setPaymentRefInput("");
      setSaveSuccessMsg("Payroll salary disbursed and recorded!");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      console.error("Error recording payroll payout:", e);
    }
  };

  const handleCreatePayrollRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createPayrollRecord(newPayrollForm);
      setPayroll((prev) => [created, ...prev]);
      setIsAddingPayroll(false);
      setSaveSuccessMsg("New teacher payroll entry added!");
      setTimeout(() => setSaveSuccessMsg(null), 3000);
    } catch (e) {
      console.error("Error adding payroll entry:", e);
    }
  };

  if (!isOpen) return null;

  const pendingPayments = payments.filter((p) => p.status === "PENDING");
  const approvedPayments = payments.filter((p) => p.status === "APPROVED");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans']">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-purple-100 overflow-hidden text-slate-900">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-purple-100 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-900 leading-tight">
                  Admin Console
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                  Verified Root
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Manage payments, curriculum, certificates & teacher payroll
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              className="p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 cursor-pointer transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Success Notification */}
        {saveSuccessMsg && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-2 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 bg-purple-50/50 border-b border-purple-100 overflow-x-auto no-scrollbar shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "payments"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>UPI Payments</span>
            {pendingPayments.length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black">
                {pendingPayments.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === "students"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Students ({approvedPayments.length})</span>
          </button>

          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab("curriculum")}
                className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "curriculum"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Curriculum & Hubs</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("certificates")}
                className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "certificates"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Certificates ({certificates.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("payroll")}
                className={`py-2 px-3 rounded-xl transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "payroll"
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-white"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Teacher Payroll</span>
              </button>
            </>
          )}
        </div>

        {/* TAB 1: UPI PAYMENTS MANAGEMENT */}
        {activeTab === "payments" && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-800">
                Pending Manual UPI Verifications ({pendingPayments.length})
              </h4>
              <span className="text-[11px] text-slate-500">
                Total Submitted: {payments.length}
              </span>
            </div>

            {/* Post-Approval WhatsApp Notification Prompt */}
            {approvedWhatsAppNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex flex-col gap-2.5 animate-fade-in shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-emerald-950">
                        {approvedWhatsAppNotice.studentName} Approved!
                      </h5>
                      <span className="text-[10px] text-emerald-700 font-semibold block">
                        Enrollment unlocked. Send welcome message via WhatsApp:
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setApprovedWhatsAppNotice(null)}
                    className="p-1 text-emerald-700 hover:text-emerald-950 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <a
                  href={approvedWhatsAppNotice.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>💬 Send Welcome Message on WhatsApp</span>
                </a>
              </div>
            )}

            {pendingPayments.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  All UPI payments have been verified!
                </p>
                <p className="text-[11px] text-slate-500">
                  New student transactions submitted via mobile checkout will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                            PENDING APPROVAL
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {payment.course?.title_en || payment.course_id.toUpperCase()}
                          </span>
                        </div>
                        <h5 className="text-sm font-extrabold text-slate-900 mt-1">
                          {payment.student?.full_name || "New Student"}
                        </h5>
                        <p className="text-xs text-slate-500">
                          WhatsApp: <strong className="text-slate-700">{payment.student?.whatsapp_num || "N/A"}</strong> • {payment.student?.district || "Kerala"}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-purple-700">
                          ₹{payment.amount.toLocaleString("en-IN")}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {payment.submitted_at ? new Date(payment.submitted_at).toLocaleTimeString() : "Recent"}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600">UTR / TxID:</span>
                      <code className="font-mono font-black text-purple-900 bg-white px-2 py-0.5 rounded-md border border-purple-100">
                        {payment.upi_txid}
                      </code>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        disabled={processingId === payment.id}
                        onClick={() => handleApprovePayment(payment)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve & Unlock Course</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRejectingPayment(payment)}
                        className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reject Modal */}
            {rejectingPayment && (
              <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-xl border border-rose-200">
                  <h4 className="font-extrabold text-sm text-rose-900">
                    Reject Payment ({rejectingPayment.upi_txid})
                  </h4>
                  <p className="text-xs text-slate-600">
                    Provide a reason for rejection (e.g. Invalid UTR, Amount mismatch):
                  </p>
                  <input
                    type="text"
                    placeholder="e.g. UTR not found in bank statement"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none"
                  />
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setRejectingPayment(null)}
                      className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectPayment}
                      className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
                    >
                      Confirm Reject
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STUDENTS DIRECTORY */}
        {activeTab === "students" && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            <div className="flex items-center justify-between gap-3">
              <h4 className="text-sm font-extrabold text-slate-800">
                Verified Enrolled Students
              </h4>
              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-purple-50/50 border border-purple-100 text-xs outline-none"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              {payments
                .filter((p) =>
                  searchFilter
                    ? p.student?.full_name?.toLowerCase().includes(searchFilter.toLowerCase())
                    : true
                )
                .map((pay) => (
                  <div
                    key={pay.id}
                    className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-bold text-slate-900">
                          {pay.student?.full_name || "Student"}
                        </h5>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            pay.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}
                        >
                          {pay.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {pay.course?.title_en || pay.course_id} • WhatsApp: {pay.student?.whatsapp_num || "9846012345"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-bold text-purple-700">
                          ₹{pay.amount}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {pay.upi_txid.slice(0, 8)}...
                        </span>
                      </div>
                      <a
                        href={getWhatsAppWelcomeUrl(
                          pay.student?.full_name || "Student",
                          pay.course?.title_en || (pay.course_id === "adaviyya" ? "Adaviyya" : pay.course_id) || "Adaviyya",
                          pay.student?.whatsapp_num || ""
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shadow-2xs cursor-pointer"
                        title="Send Welcome Message on WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                      </a>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: CURRICULUM & ADAVIYYA HUBS */}
        {activeTab === "curriculum" && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-extrabold text-slate-800">
                Adaviyya 4 Sub-Hubs & Live Classes
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {subjects.map((sub) => (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-purple-700">
                      {sub.name}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {sub.chapters.length} Chapters
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1">{sub.subtitle}</p>
                  <p className="text-[11px] text-slate-400">
                    Faculty: <strong className="text-slate-700">{sub.instructor}</strong>
                  </p>
                  <div className="text-[10px] text-purple-600 font-mono">
                    {sub.scheduleTime}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: CERTIFICATE MODULE */}
        {activeTab === "certificates" && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">
                  Digital Certificates Module
                </h4>
                <p className="text-xs text-slate-500">
                  Issue verified graduation certificates to students
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsIssuingCert((prev) => !prev)}
                className="py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue New Certificate</span>
              </button>
            </div>

            {/* Form to issue certificate */}
            {isIssuingCert && (
              <form
                onSubmit={handleIssueCertificate}
                className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3"
              >
                <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                  Issue Digital Certificate
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Student Full Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter student full name"
                      value={certForm.student_name}
                      onChange={(e) => setCertForm({ ...certForm, student_name: e.target.value })}
                      required
                      className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-xs text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Grade / Distinction
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Distinction (96%)"
                      value={certForm.grade}
                      onChange={(e) => setCertForm({ ...certForm, grade: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-xs text-slate-800 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Course Curriculum
                    </label>
                    <select
                      value={certForm.course_id}
                      onChange={(e) => {
                        const id = e.target.value;
                        const title =
                          id === "adaviyya"
                            ? "Adaviyya Islamic Sharia & Moral Tarbiyah"
                            : id === "home-tuition"
                            ? "Home Tuition Personalized Mentorship"
                            : id === "fashion-designing"
                            ? "Fashion Designing & Modest Apparel"
                            : "Shama'il al-Muhammadiyya Prophetic Study";
                        setCertForm({ ...certForm, course_id: id, course_title: title });
                      }}
                      className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-xs text-slate-800 outline-none"
                    >
                      <option value="adaviyya">Adaviyya Islamic Sharia & Moral Tarbiyah</option>
                      <option value="home-tuition">Home Tuition 1-on-1 Personalized Coaching</option>
                      <option value="fashion-designing">Fashion Designing & Modest Apparel</option>
                      <option value="shamail">Shama&apos;il al-Muhammadiyya Prophetic Study</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsIssuingCert(false)}
                    className="py-2 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-xs"
                  >
                    Generate & Issue Certificate
                  </button>
                </div>
              </form>
            )}

            {/* Issued Certificates List */}
            <div className="space-y-2.5">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                        {cert.certificate_number}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {cert.grade}
                      </span>
                    </div>
                    <h5 className="text-sm font-extrabold text-slate-900">
                      {cert.student_name}
                    </h5>
                    <p className="text-xs text-slate-500">
                      {cert.course_title} • Issued {cert.issue_date}
                    </p>
                  </div>

                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-lg">
                    ISSUED
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: TEACHER PAYROLL MODULE */}
        {activeTab === "payroll" && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">
                  Teacher Payroll & Salary Module
                </h4>
                <p className="text-xs text-slate-500">
                  Track completed live classes & calculate compensation
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingPayroll((prev) => !prev)}
                className="py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Payroll Entry</span>
              </button>
            </div>

            {/* Add Payroll Record Form */}
            {isAddingPayroll && (
              <form
                onSubmit={handleCreatePayrollRecord}
                className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3"
              >
                <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wide">
                  Calculate New Teacher Salary
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Faculty Teacher *
                    </label>
                    <select
                      value={newPayrollForm.teacher_id}
                      onChange={(e) => {
                        const tchId = e.target.value;
                        const tchName =
                          tchId === "tch-01"
                            ? "Usthad Dr. Faisal Al-Hanoon"
                            : tchId === "tch-02"
                            ? "Usthad Abdul Rahman Al-Hafiz"
                            : tchId === "tch-03"
                            ? "Usthad Anas Nadwi"
                            : "Usthad Bilal Farooqi";
                        const rate = tchId === "tch-01" ? 800 : tchId === "tch-03" ? 700 : 750;
                        setNewPayrollForm({
                          ...newPayrollForm,
                          teacher_id: tchId,
                          teacher_name: tchName,
                          rate_per_class: rate,
                        });
                      }}
                      className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-xs text-slate-800 outline-none"
                    >
                      <option value="tch-01">Usthad Dr. Faisal Al-Hanoon (₹800/class)</option>
                      <option value="tch-02">Usthad Abdul Rahman Al-Hafiz (₹750/class)</option>
                      <option value="tch-03">Usthad Anas Nadwi (₹700/class)</option>
                      <option value="tch-04">Usthad Bilal Farooqi (₹750/class)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Billing Month
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. April 2026"
                      value={newPayrollForm.month_year}
                      onChange={(e) =>
                        setNewPayrollForm({ ...newPayrollForm, month_year: e.target.value })
                      }
                      className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-xs text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Live Classes Taken
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={newPayrollForm.classes_taken}
                      onChange={(e) =>
                        setNewPayrollForm({
                          ...newPayrollForm,
                          classes_taken: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-xs text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Rate per Class (₹)
                    </label>
                    <input
                      type="number"
                      value={newPayrollForm.rate_per_class}
                      onChange={(e) =>
                        setNewPayrollForm({
                          ...newPayrollForm,
                          rate_per_class: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-white border border-purple-200 text-xs text-slate-800 outline-none"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-purple-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Calculated Payout:</span>
                  <span className="font-black text-purple-700 text-sm">
                    ₹{(newPayrollForm.classes_taken * newPayrollForm.rate_per_class).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingPayroll(false)}
                    className="py-2 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-xs"
                  >
                    Save Payroll Record
                  </button>
                </div>
              </form>
            )}

            {/* Payroll Records List */}
            <div className="space-y-3">
              {payroll.map((item) => {
                const isPaid = item.status === "PAID";

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-white border border-purple-100 shadow-xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-extrabold text-slate-900">
                            {item.teacher_name}
                          </h5>
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              isPaid
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Term: {item.month_year} • {item.classes_taken} Classes @ ₹{item.rate_per_class}/class
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-black text-purple-700">
                          ₹{item.total_amount.toLocaleString("en-IN")}
                        </span>
                        {item.payment_reference && (
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Ref: {item.payment_reference}
                          </span>
                        )}
                      </div>
                    </div>

                    {!isPaid && (
                      <div className="pt-2 border-t border-purple-50 flex items-center gap-2">
                        {payingPayrollId === item.id ? (
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="text"
                              placeholder="e.g. UPI/2026/NEFT-4910"
                              value={paymentRefInput}
                              onChange={(e) => setPaymentRefInput(e.target.value)}
                              className="flex-1 p-2 rounded-xl border border-purple-200 text-xs outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleConfirmPayrollPayment(item.id)}
                              className="py-2 px-3 rounded-xl bg-emerald-600 text-white font-bold text-xs"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setPayingPayrollId(null)}
                              className="py-2 px-2.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPayingPayrollId(item.id)}
                            className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Mark as Paid & Disburse Salary</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
