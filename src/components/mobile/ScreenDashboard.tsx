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
  Megaphone,
  MessageCircle,
  HelpCircle,
  ChevronRight,
  BarChart3,
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
import { getAppSettings } from "@/services/settingsService";

interface ScreenDashboardProps {
  userProfile: UserProfile;
  selectedCourse: SelectedCourse;
  paymentDetails: PaymentDetails;
  onChangeCourse: () => void;
  onOpenReceipt?: () => void;
  onSimulateAdminApproval?: () => void;
}

export default function ScreenDashboard({
  userProfile,
  selectedCourse,
  paymentDetails,
  onOpenReceipt,
  onSimulateAdminApproval,
}: ScreenDashboardProps) {
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [showStudentIDModal, setShowStudentIDModal] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);

  // Special Classes State
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

  const studentName = userProfile.name.trim() || "Aysha Mariyam";
  const avatarLetter = studentName.charAt(0).toUpperCase() || "A";

  const isApproved =
    paymentDetails.status === "verified" || (paymentDetails.status as string) === "APPROVED";
  const isPending =
    !isApproved &&
    (paymentDetails.status === "pending_verification" || (paymentDetails.status as string) === "PENDING" || Boolean(paymentDetails.upiTxId));

  const isAdaviyya = selectedCourse.id === "adaviyya" || selectedCourse.id === "athaviy";

  return (
    <div className="w-full max-w-md mx-auto px-4 py-4 flex-1 flex flex-col justify-start space-y-4 select-none font-['Plus_Jakarta_Sans'] bg-purple-50/30 text-slate-900">
      {/* Top Header: Student Profile + Notification Bell */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-600 text-white font-black flex items-center justify-center shadow-sm text-base">
            {avatarLetter}
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight leading-tight">
              Welcome, {studentName}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNotificationToast((prev) => !prev)}
            className="relative w-10 h-10 rounded-2xl bg-white border border-purple-100 shadow-sm flex items-center justify-center hover:bg-purple-50 transition-all text-slate-700 cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4 text-purple-600" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />
          </button>
        </div>
      </div>

      {/* ANNOUNCEMENT NOTICE BOARD TICKER */}
      <div className="p-3 rounded-2xl bg-white border border-purple-100 shadow-xs flex items-center gap-2.5 overflow-hidden">
        <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
          <Megaphone className="w-3.5 h-3.5 animate-pulse" />
        </div>
        <div className="overflow-hidden whitespace-nowrap flex-1">
          <p className="text-xs font-semibold text-slate-600 inline-block">
            📢 <strong className="text-slate-900">Notice Board:</strong> Interactive Live Session tonight at 07:30 PM IST • All PDF Handbooks downloadable • Connect with Faculty for doubts.
          </p>
        </div>
      </div>

      {/* Notification Toast Dropdown */}
      {showNotificationToast && (
        <div className="p-3.5 rounded-2xl bg-white border border-purple-200 text-xs text-slate-700 shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-purple-600" />
            <span className="font-semibold text-slate-800">
              {isApproved
                ? "Your enrollment is approved and verified! All courses unlocked."
                : "Payment submitted. Verification usually takes 5-15 mins."}
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

      {/* PENDING VERIFICATION NOTICE BANNER (If not yet approved) */}
      {isPending && !isApproved && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-xs space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                Awaiting Admin Verification
              </span>
            </div>
            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
              PENDING
            </span>
          </div>

          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            Your UPI transaction ID (<code className="text-amber-900 font-mono font-bold">{paymentDetails.upiTxId || "423589104712"}</code>) is queued in Supabase. Once approved, the full interactive curriculum will unlock automatically.
          </p>

          <div className="flex items-center gap-2 pt-1">
            {onSimulateAdminApproval && (
              <button
                type="button"
                onClick={onSimulateAdminApproval}
                className="py-2 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
              >
                <span>Instant Unlock (Evaluation)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          1. ACTIVE COURSE & PROGRESS CARD
          ======================================================== */}
      <div className="bg-white p-4.5 rounded-2xl border border-purple-100 shadow-sm space-y-3.5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                Active Enrolled Course
              </span>
              {isApproved && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  Verified
                </span>
              )}
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 mt-1">
              {selectedCourse.title}
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              {selectedCourse.subtitle}
            </p>
          </div>

          <div className="text-right">
            <span className="text-sm font-black text-purple-700">
              {selectedCourse.fee}
            </span>
            <span className="text-[10px] text-slate-400 block">
              {selectedCourse.duration}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">Course Completion</span>
            <span className="font-bold text-purple-700">68% Finished</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-purple-100 overflow-hidden">
            <div className="h-full rounded-full bg-purple-600 transition-all duration-500" style={{ width: "68%" }} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
            <span>Term 1 Completed</span>
            <span>Term 2 In Progress</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. ADAVIYYA 4 SUB-HUBS (When Adaviyya is enrolled)
          ======================================================== */}
      {isAdaviyya && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Adaviyya Sub-Hubs (4 Subjects)
              </h3>
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
              Included
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                onClick={() => setActiveSubject(sub)}
                className="bg-white p-3.5 rounded-2xl border border-purple-100 hover:border-purple-300 shadow-xs hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between space-y-2 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                      Hub {sub.name}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors">
                    {sub.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {sub.subtitle}
                  </p>
                </div>

                <div className="pt-2 border-t border-purple-50 text-[10px] text-purple-600 font-semibold flex items-center justify-between">
                  <span>PDF Notes & Classes</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          3. INTERACTIVE LIVE CLASS CARD WITH COUNTDOWN
          ======================================================== */}
      <div className="bg-white p-4.5 rounded-2xl border border-purple-100 shadow-sm space-y-3 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
              Interactive Live Session
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowTimetableModal(true)}
            className="text-[11px] font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
          >
            Weekly Schedule ➔
          </button>
        </div>

        <div>
          <h4 className="text-base font-extrabold text-slate-900">
            Adaviyya Live Room: Seerah & Fiqh Jurisprudence
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Instructor: <strong className="text-slate-800">Usthad Dr. Faisal Al-Hanoon</strong>
          </p>
        </div>

        {/* Live Countdown Display */}
        <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-600 text-xs">
            <Clock className="w-4 h-4 text-purple-600" />
            <span>Class Starts In:</span>
          </div>
          <span className="font-mono text-xs font-black text-purple-700">
            {formattedCountdown}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowLiveModal(true)}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Radio className="w-4 h-4 animate-pulse" />
          <span>Join Live Stream & Virtual Classroom</span>
        </button>
      </div>

      {/* ========================================================
          DATA VISUALIZATION WIDGETS (Attendance Donut & Assessment Scores)
          ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Student Attendance & Progress Analytics
            </h3>
          </div>
          <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2.5 py-0.5 rounded-full">
            Active Term
          </span>
        </div>

        {/* 1. Neumorphic Card: Attendance Donut Chart */}
        <div className="neumorphic-card p-4 rounded-3xl space-y-2">
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

        {/* 2. Wider Card: Minimalist Bar Chart for Course Progress & Assessment Scores */}
        <div className="neumorphic-card p-4 rounded-3xl space-y-2">
          <ProgressScoreBarChart />
        </div>
      </div>

      {/* ========================================================
          4. ACADEMIC SERVICES GRID (Join Live, Notes & PDFs, Fee Receipt, Student ID)
          ======================================================== */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block px-1">
          Academic Services
        </span>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Tile 1: Join Live */}
          <button
            type="button"
            onClick={() => setShowLiveModal(true)}
            className="p-3.5 rounded-2xl bg-white hover:bg-purple-50/50 border border-purple-100 shadow-xs hover:shadow-sm transition-all text-left flex flex-col justify-between min-h-[100px] cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                Join Live Class
              </p>
              <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                Live Broadcast
              </span>
            </div>
          </button>

          {/* Tile 2: Notes & PDFs */}
          <button
            type="button"
            onClick={() => setShowMaterialsModal(true)}
            className="p-3.5 rounded-2xl bg-white hover:bg-purple-50/50 border border-purple-100 shadow-xs hover:shadow-sm transition-all text-left flex flex-col justify-between min-h-[100px] cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                Subjects & Notes
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                Videos & Offline PDFs
              </span>
            </div>
          </button>

          {/* Tile 3: Fee Receipt */}
          <button
            type="button"
            onClick={() => onOpenReceipt && onOpenReceipt()}
            className="p-3.5 rounded-2xl bg-white hover:bg-purple-50/50 border border-purple-100 shadow-xs hover:shadow-sm transition-all text-left flex flex-col justify-between min-h-[100px] cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                Fee Receipt
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                Official PDF Voucher
              </span>
            </div>
          </button>

          {/* Tile 4: Digital ID Card */}
          <button
            type="button"
            onClick={() => setShowStudentIDModal(true)}
            className="p-3.5 rounded-2xl bg-white hover:bg-purple-50/50 border border-purple-100 shadow-xs hover:shadow-sm transition-all text-left flex flex-col justify-between min-h-[100px] cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                Student ID Card
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                Digital Pass & QR
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* ========================================================
          5. UPCOMING SPECIAL CLASSES (Tajweed Special Class, Burdah Live)
          ======================================================== */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Upcoming Special Classes
            </span>
          </div>
          <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
            {specialClasses.length} Available
          </span>
        </div>

        <div className="space-y-2.5">
          {specialClasses.map((spc) => {
            const isLive = spc.status === "LIVE_NOW";

            return (
              <div
                key={spc.id}
                className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    {spc.category}
                  </span>
                  {isLive ? (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      LIVE NOW
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full">
                      UPCOMING
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {spc.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {spc.subtitle} • Faculty: <strong className="text-slate-800">{spc.instructor}</strong>
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-50">
                  <span className="text-[11px] text-purple-700 font-semibold">
                    {spc.scheduleTime}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSpecialClass(spc);
                      setShowSpecialModal(true);
                    }}
                    className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs transition-all"
                  >
                    <span>{isLive ? "Join Live" : "View Details"}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================
          6. MY CERTIFICATES SECTION (Student Digital Credentials)
          ======================================================== */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              My Certificates
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
            Verified Digital Credentials
          </span>
        </div>

        {certificates.length === 0 ? (
          <div className="bg-white p-4 rounded-2xl border border-purple-100 text-center space-y-2">
            <Award className="w-8 h-8 text-purple-300 mx-auto" />
            <p className="text-xs text-slate-600 font-medium">
              No certificates issued yet. Complete your course curriculum and assessments to receive official accreditation.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {certificates.map((cert) => (
              <div
                key={cert.id}
                className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      {cert.certificate_number}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {cert.grade}
                    </span>
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                    {cert.course_title}
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Issued to {cert.student_name} on {cert.issue_date}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCert(cert)}
                  className="py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-xs transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================
          7. MENTOR WHATSAPP HELPLINE
          ======================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2 pb-1 border-b border-purple-50">
          <HelpCircle className="w-4 h-4 text-purple-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Doubt Clearance & Academic Mentor Desk
          </h3>
        </div>

        <p className="text-xs text-slate-600 font-medium leading-relaxed">
          Need clarification on Hadith interpretations, Fiqh questions, or recitation feedback? Chat directly with your faculty mentor.
        </p>

        <a
          href={`https://wa.me/${getAppSettings().contactWhatsApp || "919846012345"}?text=Assalamu%20Alaikum%20Usthad,%20I%20am%20${encodeURIComponent(studentName)},%20enrolled%20in%20${encodeURIComponent(selectedCourse.title)}.%20I%20need%20academic%20assistance.`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Chat with Academic Mentor on WhatsApp</span>
        </a>
      </div>



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

      {/* 5. Special Class Modal */}
      <SpecialClassModal
        isOpen={showSpecialModal}
        onClose={() => setShowSpecialModal(false)}
        specialClass={selectedSpecialClass}
        userName={studentName}
      />

      {/* 6. Adaviyya Subject Hub Modal */}
      <SubjectClassHubModal
        isOpen={Boolean(activeSubject)}
        onClose={() => setActiveSubject(null)}
        subject={activeSubject}
        studentName={studentName}
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

            {/* Certificate Parchment UI */}
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
    </div>
  );
}
