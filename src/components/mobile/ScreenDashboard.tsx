"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Radio,
  BookOpen,
  FileText,
  CheckCircle2,
  Download,
  Clock,
  Sparkles,
  Award,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Calendar,
  Scale,
  ScrollText,
  Lock,
} from "lucide-react";
import { UserProfile, SelectedCourse, PaymentDetails } from "@/types/app";
import { SpecialClass, getSpecialClasses } from "@/services/specialClassService";
import { fetchCertificates } from "@/services/certificateService";
import { DbCertificate } from "@/types/supabase";
import LiveClassModal from "@/components/mobile/LiveClassModal";
import CourseMaterialsModal from "@/components/mobile/CourseMaterialsModal";
import TimetableModal from "@/components/mobile/TimetableModal";
import StudentIDModal from "@/components/mobile/StudentIDModal";
import SpecialClassModal from "@/components/mobile/SpecialClassModal";
import SubjectClassHubModal from "@/components/mobile/SubjectClassHubModal";
import { getAdaviyyaSubjects, AdaviyyaSubject } from "@/services/subjectService";
import AttendanceDonutChart from "@/components/charts/AttendanceDonutChart";
import ProgressScoreBarChart from "@/components/charts/ProgressScoreBarChart";
import { getAppSettings, formatWhatsAppLink } from "@/services/settingsService";

interface ScreenDashboardProps {
  userProfile: UserProfile;
  selectedCourse: SelectedCourse;
  paymentDetails: PaymentDetails;
  onChangeCourse: () => void;
  onOpenReceipt?: () => void;
}

export default function ScreenDashboard({
  userProfile,
  selectedCourse,
  paymentDetails,
  onChangeCourse,
  onOpenReceipt,
}: ScreenDashboardProps) {
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [showStudentIDModal, setShowStudentIDModal] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Special Classes State (Burdah Live)
  const [specialClasses, setSpecialClasses] = useState<SpecialClass[]>(() => getSpecialClasses());
  const [selectedSpecialClass, setSelectedSpecialClass] = useState<SpecialClass | null>(null);
  const [showSpecialModal, setShowSpecialModal] = useState(false);

  // Adaviyya Subjects (Seerah, Haddad, Fiqh, Hadith)
  const [subjects] = useState<AdaviyyaSubject[]>(() => getAdaviyyaSubjects());
  const [activeSubject, setActiveSubject] = useState<AdaviyyaSubject | null>(null);

  // Student Certificates
  const [certificates, setCertificates] = useState<DbCertificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<DbCertificate | null>(null);

  // Countdown timer to next interactive live class
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 14, seconds: 35 });

  useEffect(() => {
    fetchCertificates().then((data) => {
      if (data && data.length > 0) {
        setCertificates(data);
      }
    });

    const handleSpecialUpdate = (e: CustomEvent<SpecialClass[]>) => {
      if (e.detail) {
        setSpecialClasses(e.detail);
      } else {
        setSpecialClasses(getSpecialClasses());
      }
    };

    const handleCertUpdate = (e: CustomEvent<DbCertificate[]>) => {
      if (e.detail) {
        setCertificates(e.detail);
      }
    };

    window.addEventListener("hanoon_special_classes_updated", handleSpecialUpdate as EventListener);
    window.addEventListener("hanoon_certificates_updated", handleCertUpdate as EventListener);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 2, minutes: 30, seconds: 0 };
      });
    }, 1000);

    return () => {
      window.removeEventListener("hanoon_special_classes_updated", handleSpecialUpdate as EventListener);
      window.removeEventListener("hanoon_certificates_updated", handleCertUpdate as EventListener);
      clearInterval(timer);
    };
  }, []);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const formattedCountdown = `${pad(timeLeft.hours)}h : ${pad(timeLeft.minutes)}m : ${pad(timeLeft.seconds)}s`;

  const [livePaymentStatus, setLivePaymentStatus] = useState<string>(paymentDetails.status);
  const [lockedNoticeSubject, setLockedNoticeSubject] = useState<string | null>(null);

  useEffect(() => {
    setLivePaymentStatus(paymentDetails.status);
  }, [paymentDetails.status]);

  // Real-time Supabase payment status subscription
  useEffect(() => {
    let realtimeChannel: any = null;
    const setupRealtime = async () => {
      const { supabase, isSupabaseConfigured } = await import("@/lib/supabaseClient");
      if (isSupabaseConfigured && supabase) {
        realtimeChannel = supabase
          .channel(`student_dash_payment_${paymentDetails.upiTxId || "all"}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "payments",
            },
            (payload) => {
              const updated = payload.new as any;
              if (
                updated &&
                (updated.status === "APPROVED" || updated.status === "verified")
              ) {
                if (
                  !paymentDetails.upiTxId ||
                  updated.upi_txid === paymentDetails.upiTxId
                ) {
                  setLivePaymentStatus("verified");
                }
              }
            }
          )
          .subscribe();
      }
    };
    setupRealtime();

    const handleLocalPayment = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        const { id, upi_txid, status } = customEvt.detail;
        if (status === "APPROVED" || status === "verified") {
          if (
            !paymentDetails.upiTxId ||
            id === paymentDetails.upiTxId ||
            upi_txid === paymentDetails.upiTxId
          ) {
            setLivePaymentStatus("verified");
          }
        }
      }
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
  }, [paymentDetails.upiTxId]);

  const studentName = userProfile.name.trim() || "Student";
  const avatarLetter = studentName.charAt(0).toUpperCase() || "S";

  const isApproved =
    livePaymentStatus === "verified" ||
    livePaymentStatus === "APPROVED" ||
    paymentDetails.status === "verified" ||
    (paymentDetails.status as string) === "APPROVED";
  const isPending =
    !isApproved &&
    (livePaymentStatus === "pending_verification" ||
      livePaymentStatus === "PENDING" ||
      paymentDetails.status === "pending_verification" ||
      (paymentDetails.status as string) === "PENDING" ||
      Boolean(paymentDetails.upiTxId));

  const burdahClass =
    specialClasses.find(
      (spc) =>
        spc.id.toLowerCase().includes("burdah") ||
        spc.title.toLowerCase().includes("burdah")
    ) || specialClasses[0];

  const getSubjectIcon = (iconType: string) => {
    switch (iconType) {
      case "book":
        return <BookOpen className="w-5 h-5" />;
      case "sparkles":
        return <Sparkles className="w-5 h-5" />;
      case "scale":
        return <Scale className="w-5 h-5" />;
      case "scroll":
        return <ScrollText className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-3 flex-1 flex flex-col justify-start space-y-3.5 select-none font-['Plus_Jakarta_Sans'] bg-purple-50/30 text-slate-900">
      {/* 1. TOP PROFILE BAR (Compact, Modern) */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white font-extrabold flex items-center justify-center shadow-xs text-sm shrink-0">
            {avatarLetter}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block leading-tight">
              Student Dashboard
            </span>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight leading-tight line-clamp-1">
              Welcome, {studentName}
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowNotificationToast((prev) => !prev)}
          className="relative w-9 h-9 rounded-2xl bg-white border border-purple-100 shadow-xs flex items-center justify-center hover:bg-purple-50 transition-all text-slate-700 cursor-pointer shrink-0"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-purple-600" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-rose-500" />
        </button>
      </div>

      {/* Notification Toast Dropdown */}
      {showNotificationToast && (
        <div className="p-3 rounded-2xl bg-white border border-purple-200 text-xs text-slate-700 shadow-md flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-purple-600" />
            <span className="font-semibold text-slate-800">
              {isApproved
                ? "Enrollment approved! All subjects & interactive live classes active."
                : "Payment submitted. Admin verification in progress."}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowNotificationToast(false)}
            className="text-xs font-bold text-slate-400 hover:text-slate-700 ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* PENDING VERIFICATION NOTICE BANNER (Strictly Informative, No Dev Buttons) */}
      {isPending && !isApproved && (
        <div className="bg-amber-50/90 border border-amber-200 p-3 rounded-2xl shadow-xs space-y-1.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin" />
              <span className="text-xs font-black text-amber-900 uppercase tracking-wide">
                Payment submitted! Awaiting Admin Verification.
              </span>
            </div>
            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-extrabold px-2 py-0.5 rounded-full">
              PENDING
            </span>
          </div>
          <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
            {paymentDetails.upiTxId ? (
              <>Transaction ID <code className="font-mono font-bold text-amber-900">{paymentDetails.upiTxId}</code> is queued for verification.</>
            ) : (
              <>Your admission payment is submitted and queued for Admin verification.</>
            )}
          </p>
        </div>
      )}

      {/* 2. COMPACT ENROLLED PROGRAM & LIVE COUNTDOWN HERO CARD */}
      <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[9.5px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
              Active Enrolled Track
            </span>
            {isApproved && (
              <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Verified
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-purple-700 bg-purple-50/80 px-2 py-0.5 rounded-md">
            <Clock className="w-3 h-3 text-purple-600" />
            <span>{formattedCountdown}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-tight">
              {selectedCourse.title}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              4 Core Subjects • Live Classes with Usthad Dr. Faisal
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isApproved) {
                setShowLiveModal(true);
              } else {
                setLockedNoticeSubject("Live Classroom");
              }
            }}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95 shrink-0 ${
              isApproved
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            {isApproved ? (
              <>
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>Join Live</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Locked</span>
              </>
            )}
          </button>
        </div>

        {/* Minimal Progress Line */}
        <div className="space-y-1 pt-0.5">
          <div className="flex items-center justify-between text-[10.5px]">
            <span className="font-semibold text-slate-500">Progress</span>
            <span className="font-bold text-purple-700">{isApproved ? "68% Complete" : "Pending Approval"}</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-purple-100 overflow-hidden">
            <div className="h-full rounded-full bg-purple-600 transition-all duration-500" style={{ width: isApproved ? "68%" : "5%" }} />
          </div>
        </div>
      </div>

      {/* 3. ENROLLED SUBJECTS: COMPACT 2x2 QUICK ACCESS GRID (Real-time Unlock) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Enrolled Subjects
            </h3>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isApproved
              ? "text-purple-700 bg-purple-100/70"
              : "text-amber-700 bg-amber-100/70 border border-amber-200/50"
          }`}>
            {isApproved ? "4 Active Hubs" : "Locked (Pending Approval)"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {subjects.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => {
                if (isApproved) {
                  setActiveSubject(sub);
                } else {
                  setLockedNoticeSubject(sub.name);
                }
              }}
              className={`border rounded-2xl p-3 flex flex-col justify-between text-left cursor-pointer group transition-all hover:shadow-sm active:scale-[0.98] shadow-xs aspect-square ${
                isApproved
                  ? "bg-white border-purple-100/90 hover:border-purple-300"
                  : "bg-slate-50/70 border-slate-200 hover:border-amber-300"
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-xs ${
                  isApproved
                    ? "bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {getSubjectIcon(sub.iconType)}
                </div>
                {isApproved ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Module" />
                ) : (
                  <span className="flex items-center gap-1 text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-full">
                    <Lock className="w-2.5 h-2.5 text-amber-600" />
                    Locked
                  </span>
                )}
              </div>

              <div className="my-1">
                <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                  {sub.name}
                </h4>
                <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-medium">
                  {sub.subtitle}
                </p>
              </div>

              <div className="pt-1.5 border-t border-purple-50 flex items-center justify-between text-[10px] font-bold w-full">
                <span className={isApproved ? "text-purple-600" : "text-slate-400"}>
                  {isApproved ? "Modules" : "Locked"}
                </span>
                <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. ACADEMIC QUICK ACCESS SERVICES: 2x2 GRID */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Quick Services
            </h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400">
            Essential Tools
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Tile 1: Live Classroom */}
          <button
            type="button"
            onClick={() => setShowLiveModal(true)}
            className="p-3 rounded-2xl bg-white hover:bg-purple-50/40 border border-purple-100 hover:border-purple-300 shadow-xs hover:shadow-sm transition-all text-left flex flex-col justify-between min-h-[92px] cursor-pointer group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all shadow-xs">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div className="mt-2">
              <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                Live Class Room
              </p>
              <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                Join Stream
              </span>
            </div>
          </button>

          {/* Tile 2: Course Notes & PDFs */}
          <button
            type="button"
            onClick={() => setShowMaterialsModal(true)}
            className="p-3 rounded-2xl bg-white hover:bg-purple-50/40 border border-purple-100 hover:border-purple-300 shadow-xs hover:shadow-sm transition-all text-left flex flex-col justify-between min-h-[92px] cursor-pointer group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="mt-2">
              <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                Course Materials
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                PDFs & Handbooks
              </span>
            </div>
          </button>

          {/* Tile 3: Timetable */}
          <button
            type="button"
            onClick={() => setShowTimetableModal(true)}
            className="p-3 rounded-2xl bg-white hover:bg-purple-50/40 border border-purple-100 hover:border-purple-300 shadow-xs hover:shadow-sm transition-all text-left flex flex-col justify-between min-h-[92px] cursor-pointer group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="mt-2">
              <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                Timetable
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                Weekly Schedule
              </span>
            </div>
          </button>

          {/* Tile 4: Student ID Pass */}
          <button
            type="button"
            onClick={() => setShowStudentIDModal(true)}
            className="p-3 rounded-2xl bg-white hover:bg-purple-50/40 border border-purple-100 hover:border-purple-300 shadow-xs hover:shadow-sm transition-all text-left flex flex-col justify-between min-h-[92px] cursor-pointer group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
              <Award className="w-4 h-4" />
            </div>
            <div className="mt-2">
              <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                Student ID Pass
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                Digital Pass & QR
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* 5. SPECIAL CLASS (Burdah Live Only + Upcoming Indicator) */}
      {burdahClass && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Special Class
              </h3>
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
              Live Session
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSelectedSpecialClass(burdahClass);
              setShowSpecialModal(true);
            }}
            className="w-full bg-white border border-purple-100 hover:border-purple-300 rounded-2xl p-3 flex items-center justify-between text-left cursor-pointer group transition-all hover:shadow-sm active:scale-[0.98] shadow-xs"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs shrink-0">
                <Radio className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                  {burdahClass.title}
                </h4>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                  {burdahClass.scheduleTime.split("•")[0]?.trim() || burdahClass.scheduleTime}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                Live
              </span>
              <ChevronRight className="w-4 h-4 text-purple-600" />
            </div>
          </button>

          <p className="text-center text-[11px] font-medium text-slate-400 italic pt-0.5">
            Special classes upcoming...
          </p>
        </div>
      )}

      {/* 6. COMPACT ACTION UTILITIES: MENTOR WHATSAPP & FEE RECEIPT */}
      <div className="grid grid-cols-2 gap-2.5 pt-0.5">
        <a
          href={formatWhatsAppLink(
            getAppSettings().contactWhatsApp,
            `Assalamu Alaikum Usthad, I am ${studentName}, enrolled in ${selectedCourse.title}. I need academic assistance.`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2.5 rounded-2xl bg-white border border-purple-100 hover:border-purple-300 shadow-xs flex items-center gap-2 transition-all cursor-pointer group active:scale-[0.98]"
        >
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <MessageCircle className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">
              Mentor Chat
            </span>
            <span className="text-[9.5px] text-slate-500 font-medium">WhatsApp</span>
          </div>
        </a>

        {onOpenReceipt ? (
          <button
            type="button"
            onClick={onOpenReceipt}
            className="p-2.5 rounded-2xl bg-white border border-purple-100 hover:border-purple-300 shadow-xs flex items-center gap-2 transition-all cursor-pointer group active:scale-[0.98] text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                Fee Receipt
              </span>
              <span className="text-[9.5px] text-slate-500 font-medium">Official Voucher</span>
            </div>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="p-2.5 rounded-2xl bg-white border border-purple-100 hover:border-purple-300 shadow-xs flex items-center gap-2 transition-all cursor-pointer group active:scale-[0.98] text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                Analytics
              </span>
              <span className="text-[9.5px] text-slate-500 font-medium">Attendance & Score</span>
            </div>
          </button>
        )}
      </div>

      {/* OPTIONAL EXPANDABLE ANALYTICS ACCORDION */}
      <div className="pt-0.5">
        <button
          type="button"
          onClick={() => setShowAnalytics((prev) => !prev)}
          className="w-full py-2 px-3 rounded-xl bg-white border border-purple-100 hover:bg-purple-50/50 shadow-xs flex items-center justify-between text-xs font-bold text-slate-700 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
            <span>Attendance & Progress Analytics</span>
          </div>
          {showAnalytics ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showAnalytics && (
          <div className="mt-2 space-y-2.5 animate-fade-in">
            <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-800">
                  Attendance Record
                </span>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  88% Present
                </span>
              </div>
              <AttendanceDonutChart presentCount={22} leaveCount={2} absentCount={1} />
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-xs space-y-2">
              <ProgressScoreBarChart />
            </div>
          </div>
        )}
      </div>

      {/* DIGITAL CERTIFICATES VIEW (If any issued) */}
      {certificates.length > 0 && (
        <div className="space-y-1.5 pt-0.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-purple-600" />
              <span>Digital Credentials</span>
            </h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {certificates.length} Issued
            </span>
          </div>

          <div className="space-y-2">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="bg-white p-3 rounded-2xl border border-purple-100 shadow-xs flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                    {cert.course_title}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Grade {cert.grade} • {cert.certificate_number}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCert(cert)}
                  className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-xs transition-all"
                >
                  <Download className="w-3 h-3" />
                  <span>View</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          MODALS
          ======================================================== */}
      {/* 1. Live Class Modal */}
      <LiveClassModal
        isOpen={showLiveModal}
        onClose={() => setShowLiveModal(false)}
        selectedCourse={selectedCourse}
        userName={studentName}
        onOpenTimetable={() => setShowTimetableModal(true)}
      />

      {/* 2. Course Materials Modal */}
      <CourseMaterialsModal
        isOpen={showMaterialsModal}
        onClose={() => setShowMaterialsModal(false)}
        selectedCourse={selectedCourse}
        isPaid={isApproved}
        onEnroll={() => {
          setShowMaterialsModal(false);
          onChangeCourse();
        }}
      />

      {/* 3. Timetable Modal */}
      <TimetableModal
        isOpen={showTimetableModal}
        onClose={() => setShowTimetableModal(false)}
        selectedCourse={selectedCourse}
        onJoinLiveClass={() => setShowLiveModal(true)}
      />

      {/* 4. Student ID Modal */}
      <StudentIDModal
        isOpen={showStudentIDModal}
        onClose={() => setShowStudentIDModal(false)}
        userProfile={userProfile}
        selectedCourse={selectedCourse}
      />

      {/* 5. Special Class Modal (Burdah Live) */}
      <SpecialClassModal
        isOpen={showSpecialModal}
        onClose={() => setShowSpecialModal(false)}
        specialClass={selectedSpecialClass}
        userName={studentName}
        isPaid={isApproved}
        onEnroll={() => {
          setShowSpecialModal(false);
          onChangeCourse();
        }}
      />

      {/* 6. Adaviyya Subject Hub Modal */}
      <SubjectClassHubModal
        isOpen={Boolean(activeSubject)}
        onClose={() => setActiveSubject(null)}
        subject={activeSubject}
        studentName={studentName}
        isPaid={isApproved}
        onEnroll={() => {
          setActiveSubject(null);
          onChangeCourse();
        }}
      />

      {/* 7. Certificate View Modal */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans']">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl border border-purple-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-purple-50">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Digital Certificate
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/70 border-2 border-purple-200 text-center space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-700 block">
                Hanoon Academy Certificate of Completion
              </span>
              <h4 className="text-base font-extrabold text-slate-900">
                {selectedCert.student_name}
              </h4>
              <p className="text-xs text-slate-600">
                has successfully completed all requirements for
              </p>
              <p className="text-xs font-bold text-purple-800">
                {selectedCert.course_title}
              </p>
              <div className="pt-2 flex items-center justify-center gap-3 text-[10px] text-slate-500 font-mono">
                <span>Grade: {selectedCert.grade}</span>
                <span>•</span>
                <span>ID: {selectedCert.certificate_number}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => alert(`Certificate ${selectedCert.certificate_number} downloaded as PDF!`)}
              className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download Official PDF Certificate</span>
            </button>
          </div>
        </div>
      )}

      {/* 8. Subject Module Locked (Admission Pending Modal) */}
      {lockedNoticeSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans'] select-none">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-purple-100 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-7 h-7 text-amber-600" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100/70 px-2.5 py-0.5 rounded-full inline-block">
                Verification in Progress
              </span>
              <h3 className="text-base font-extrabold text-slate-900">
                {lockedNoticeSubject} Locked
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Your admission payment is currently queued for Admin approval. As soon as the Admin desk verifies your transaction, all {lockedNoticeSubject} lessons and live sessions will unlock automatically in real time without requiring a refresh.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLockedNoticeSubject(null)}
              className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-purple-600/20"
            >
              Got It, I Will Wait
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
