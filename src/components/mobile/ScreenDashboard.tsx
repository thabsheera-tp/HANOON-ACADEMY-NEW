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
  Check,
  Play,
  Video,
  ExternalLink,
} from "lucide-react";
import { UserProfile, SelectedCourse, PaymentDetails } from "@/types/app";
import { SpecialClass, getSpecialClasses, fetchSpecialClassesFromSupabase } from "@/services/specialClassService";
import { fetchCertificates } from "@/services/certificateService";
import { DbCertificate } from "@/types/supabase";
import LiveClassModal from "@/components/mobile/LiveClassModal";
import CourseMaterialsModal from "@/components/mobile/CourseMaterialsModal";
import TimetableModal from "@/components/mobile/TimetableModal";
import StudentIDModal from "@/components/mobile/StudentIDModal";
import SpecialClassModal from "@/components/mobile/SpecialClassModal";
import SubjectClassHubModal from "@/components/mobile/SubjectClassHubModal";
import { getAdaviyyaSubjects, AdaviyyaSubject, fetchAdaviyyaSubjectsFromSupabase } from "@/services/subjectService";
import AttendanceDonutChart from "@/components/charts/AttendanceDonutChart";
import ProgressScoreBarChart from "@/components/charts/ProgressScoreBarChart";
import { getAppSettings, formatWhatsAppLink } from "@/services/settingsService";
import { getNotifications, markAllNotificationsAsRead, AppNotification } from "@/services/notificationService";
import StudentNoticeBoard from "@/components/mobile/StudentNoticeBoard";
import { getLocalAttendanceRecords, fetchStudentAttendanceMetrics } from "@/services/attendanceService";
import {
  fetchStudentModuleScores,
  calculateCourseCompletionMetrics,
  CourseCompletionProgress,
} from "@/services/progressService";
import { LiveClassSession, fetchLiveClassesFromSupabase, fetchCourseMaterialsFromSupabase, getTeacherClasses } from "@/services/teacherService";

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
  const studentName = userProfile?.name?.trim() || "Student";
  const avatarLetter = studentName.charAt(0).toUpperCase() || "S";

  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showTimetableModal, setShowTimetableModal] = useState(false);
  const [showStudentIDModal, setShowStudentIDModal] = useState(false);
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [notificationsList, setNotificationsList] = useState<AppNotification[]>(() => getNotifications());

  // Special Classes State (Burdah Live)
  const [specialClasses, setSpecialClasses] = useState<SpecialClass[]>(() => getSpecialClasses());
  const [selectedSpecialClass, setSelectedSpecialClass] = useState<SpecialClass | null>(null);
  const [showSpecialModal, setShowSpecialModal] = useState(false);

  // Dynamic Live Classes fetched directly from Supabase
  const [liveClasses, setLiveClasses] = useState<LiveClassSession[]>(() => getTeacherClasses());

  // Dynamic Recorded Classes (Google Drive / YouTube)
  const [recordedClassesList, setRecordedClassesList] = useState<{
    id: string;
    title: string;
    url: string;
    date?: string;
    subjectName?: string;
    teacherName?: string;
    duration?: string;
  }[]>([]);

  // Dynamic Subjects based on Enrolled Course
  const subjects: AdaviyyaSubject[] = React.useMemo(() => {
    const courseId = (selectedCourse.id || "").toLowerCase();
    if (courseId === "fashion-designing") {
      return [
        {
          id: "seerah" as any,
          name: "Pattern Drafting",
          subtitle: "Precision Garment Geometry & Blocks",
          instructor: "Lead Design Faculty",
          badgeGradient: "bg-gradient-to-tr from-purple-500 to-indigo-500 text-white shadow-lg",
          iconType: "sparkles",
          liveClassUrl: "",
          scheduleTime: "Tuesdays & Thursdays • 04:00 PM IST",
          description: "Master measurement, pattern drafting, basic block creation, and modest apparel ergonomics.",
          chapters: [],
        },
        {
          id: "haddad" as any,
          name: "Fabric & Textiles",
          subtitle: "Material Sciences, Weaves & Drapes",
          instructor: "Lead Design Faculty",
          badgeGradient: "bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-lg",
          iconType: "book",
          liveClassUrl: "",
          scheduleTime: "Mondays & Wednesdays • 04:00 PM IST",
          description: "Understanding natural & synthetic fibers, breathable weaves, seasonal textiles, and drape behavior.",
          chapters: [],
        },
        {
          id: "fiqh" as any,
          name: "Stitching & Assembly",
          subtitle: "Industrial Sewing, Seams & Finishes",
          instructor: "Lead Design Faculty",
          badgeGradient: "bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-lg",
          iconType: "scale",
          liveClassUrl: "",
          scheduleTime: "Fridays & Saturdays • 03:30 PM IST",
          description: "Sewing machine operation, stitch regulation, french seams, bias binding, and clean garment assembly.",
          chapters: [],
        },
        {
          id: "hadith" as any,
          name: "Embellishment Art",
          subtitle: "Surface Ornamentation, Embroidery & Beads",
          instructor: "Lead Design Faculty",
          badgeGradient: "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg",
          iconType: "scroll",
          liveClassUrl: "",
          scheduleTime: "Sundays • 10:00 AM IST",
          description: "Traditional and contemporary needlework, beadwork, embroidery, and luxury cuff detailing.",
          chapters: [],
        },
      ];
    } else if (courseId === "home-tuition") {
      return [
        {
          id: "seerah" as any,
          name: "Mathematics Core",
          subtitle: "Conceptual Clarity & Problem Solving",
          instructor: "Senior Tuition Faculty",
          badgeGradient: "bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-lg",
          iconType: "book",
          liveClassUrl: "",
          scheduleTime: "Daily • 06:00 PM IST",
          description: "Algebra, Geometry, Trigonometry, and Arithmetic problem-solving with step-by-step guidance.",
          chapters: [],
        },
        {
          id: "haddad" as any,
          name: "Science Core",
          subtitle: "Physics, Chemistry & Biology Basics",
          instructor: "Senior Tuition Faculty",
          badgeGradient: "bg-gradient-to-tr from-emerald-500 to-teal-500 text-white shadow-lg",
          iconType: "sparkles",
          liveClassUrl: "",
          scheduleTime: "Daily • 07:00 PM IST",
          description: "Core physical sciences, laboratory concepts, chemical reactions, and living systems explained simply.",
          chapters: [],
        },
        {
          id: "fiqh" as any,
          name: "Doubt Resolution",
          subtitle: "1-on-1 Personalized Mentoring Hub",
          instructor: "Academic Mentor",
          badgeGradient: "bg-gradient-to-tr from-amber-500 to-rose-500 text-white shadow-lg",
          iconType: "scale",
          liveClassUrl: "",
          scheduleTime: "Flexible • On Demand",
          description: "Live interactive clearing of homework questions, textbook exercises, and tricky exam problems.",
          chapters: [],
        },
        {
          id: "hadith" as any,
          name: "Mock Tests & Prep",
          subtitle: "Chapter Tests, Model Papers & Revision",
          instructor: "Evaluation Lead",
          badgeGradient: "bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg",
          iconType: "scroll",
          liveClassUrl: "",
          scheduleTime: "Saturdays • 05:00 PM IST",
          description: "Timed chapter tests, sample question papers, time-management strategies, and detailed answer reviews.",
          chapters: [],
        },
      ];
    }
    // Default: Adaviyya (Seerah, Haddad, Fiqh, Hadith)
    return getAdaviyyaSubjects();
  }, [selectedCourse.id]);

  const [activeSubject, setActiveSubject] = useState<AdaviyyaSubject | null>(null);

  // Student Certificates
  const [certificates, setCertificates] = useState<DbCertificate[]>([]);
  const [selectedCert, setSelectedCert] = useState<DbCertificate | null>(null);

  const [livePaymentStatus, setLivePaymentStatus] = useState<string>(paymentDetails.status);
  const [lockedNoticeSubject, setLockedNoticeSubject] = useState<string | null>(null);

  // Countdown timer dynamically calculated from upcoming live classes
  const [countdownString, setCountdownString] = useState<string>("Calculating...");

  useEffect(() => {
    // 1. Fetch Certificates from Supabase
    fetchCertificates().then((data) => {
      if (data && data.length > 0) {
        const filtered = data.filter((c) => {
          if (!studentName || studentName === "Student") return true;
          return (
            c.student_name.toLowerCase().includes(studentName.toLowerCase()) ||
            studentName.toLowerCase().includes(c.student_name.toLowerCase()) ||
            (userProfile.id && c.student_id === userProfile.id)
          );
        });
        setCertificates(filtered);
      } else {
        setCertificates([]);
      }
    });

    // 2. Fetch Live Classes from Supabase
    fetchLiveClassesFromSupabase(selectedCourse.id).then((cls) => {
      setLiveClasses(cls || []);
    });

    // 3. Fetch Special Classes from Supabase
    fetchSpecialClassesFromSupabase().then((spc) => {
      setSpecialClasses(spc || []);
    });

    // 4. Fetch Course Subjects from Supabase
    fetchAdaviyyaSubjectsFromSupabase().catch(() => {});

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

    const handleClassesUpdate = (e: CustomEvent<LiveClassSession[]>) => {
      if (e.detail) {
        setLiveClasses(e.detail);
      } else {
        setLiveClasses(getTeacherClasses());
      }
    };

    const updateNotifs = () => {
      const allNotifs = getNotifications();
      setNotificationsList(allNotifs);
      const count = allNotifs.filter((n) => !n.isRead).length;
      setUnreadNotifs(count);
    };
    updateNotifs();

    window.addEventListener("hanoon_special_classes_updated", handleSpecialUpdate as EventListener);
    window.addEventListener("hanoon_certificates_updated", handleCertUpdate as EventListener);
    window.addEventListener("hanoon_classes_updated", handleClassesUpdate as EventListener);
    window.addEventListener("hanoon_notifications_updated", updateNotifs);
    // 4b. Dynamic Recorded Classes Loader
    const loadRecordedClasses = async () => {
      try {
        const [materials, cls] = await Promise.all([
          fetchCourseMaterialsFromSupabase(selectedCourse.id),
          fetchLiveClassesFromSupabase(selectedCourse.id),
        ]);

        const recordedFromMaterials = (materials || [])
          .filter((m) => (m.type === "VIDEO" || Boolean(m.recordingUrl)) && Boolean(m.recordingUrl || m.fileOrUrl))
          .map((m) => ({
            id: m.id,
            title: m.title,
            url: (m.recordingUrl || m.fileOrUrl)!,
            date: m.sessionDate,
            subjectName: m.courseName,
            teacherName: m.teacherName,
            duration: m.sizeOrDuration,
          }));

        const recordedFromClasses = (cls || [])
          .filter((c) => Boolean(c.recordingUrl || (c as any).recording_url))
          .map((c) => ({
            id: c.id,
            title: c.title,
            url: (c.recordingUrl || (c as any).recording_url)!,
            date: c.date,
            subjectName: c.courseName,
            teacherName: c.teacherName,
            duration: c.duration,
          }));

        const combinedMap = new Map<string, (typeof recordedFromMaterials)[0]>();
        [...recordedFromClasses, ...recordedFromMaterials].forEach((item) => {
          if (item.url && !combinedMap.has(item.url)) {
            combinedMap.set(item.url, item);
          }
        });

        setRecordedClassesList(Array.from(combinedMap.values()));
      } catch (err) {
        console.warn("Could not load recorded classes in student dashboard:", err);
      }
    };

    loadRecordedClasses();

    window.addEventListener("hanoon_material_uploaded", loadRecordedClasses);

    // Dynamic timer ticker
    const timer = setInterval(() => {
      const currentClasses = getTeacherClasses();
      const liveNow = currentClasses.find((c) => c.status === "LIVE_NOW");
      if (liveNow) {
        setCountdownString("LIVE NOW");
        return;
      }

      const scheduled = currentClasses
        .filter((c) => c.status === "SCHEDULED" && c.date && c.time)
        .sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

      if (scheduled.length > 0) {
        const nextClass = scheduled[0];
        const targetMs = new Date(`${nextClass.date}T${nextClass.time}`).getTime();
        const diffMs = targetMs - Date.now();

        if (diffMs > 0) {
          const totalSec = Math.floor(diffMs / 1000);
          const h = Math.floor(totalSec / 3600);
          const m = Math.floor((totalSec % 3600) / 60);
          const s = totalSec % 60;
          const pad = (n: number) => n.toString().padStart(2, "0");
          setCountdownString(`${pad(h)}h : ${pad(m)}m : ${pad(s)}s`);
        } else {
          setCountdownString("Class Starting Soon");
        }
      } else {
        setCountdownString("No Scheduled Class");
      }
    }, 1000);

    return () => {
      window.removeEventListener("hanoon_special_classes_updated", handleSpecialUpdate as EventListener);
      window.removeEventListener("hanoon_certificates_updated", handleCertUpdate as EventListener);
      window.removeEventListener("hanoon_classes_updated", handleClassesUpdate as EventListener);
      window.removeEventListener("hanoon_notifications_updated", updateNotifs);
      window.removeEventListener("hanoon_new_notification", updateNotifs);
      window.removeEventListener("hanoon_material_uploaded", loadRecordedClasses);
      clearInterval(timer);
    };
  }, [selectedCourse.id, studentName, userProfile.id]);

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
              const newSt = (updated?.status || "").toUpperCase();
              if (
                updated &&
                (newSt === "APPROVED" || newSt === "VERIFIED" || newSt === "ACTIVE")
              ) {
                if (
                  !paymentDetails.upiTxId ||
                  updated.upi_txid === paymentDetails.upiTxId ||
                  updated.id === paymentDetails.upiTxId
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
        const st = (status || "").toUpperCase();
        if (st === "APPROVED" || st === "VERIFIED" || st === "ACTIVE") {
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

  const isApproved =
    (livePaymentStatus || "").toUpperCase() === "APPROVED" ||
    (livePaymentStatus || "").toUpperCase() === "VERIFIED" ||
    (livePaymentStatus || "").toUpperCase() === "ACTIVE" ||
    livePaymentStatus === "verified" ||
    (paymentDetails.status || "").toUpperCase() === "APPROVED" ||
    (paymentDetails.status || "").toUpperCase() === "VERIFIED" ||
    (paymentDetails.status || "").toUpperCase() === "ACTIVE" ||
    paymentDetails.status === "verified";
  const isPending =
    !isApproved &&
    ((livePaymentStatus || "").toUpperCase() === "PENDING" ||
      livePaymentStatus === "pending_verification" ||
      (paymentDetails.status || "").toUpperCase() === "PENDING" ||
      paymentDetails.status === "pending_verification" ||
      Boolean(paymentDetails.upiTxId && paymentDetails.upiTxId !== "VERIFIED"));

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

  // Dynamic Attendance Stats fetched directly from Supabase
  const [attendanceStats, setAttendanceStats] = useState<{
    present: number;
    leave: number;
    absent: number;
  }>(() => {
    try {
      const records = getLocalAttendanceRecords();
      const phoneDigits = (userProfile.phone || "").replace(/\D/g, "");
      const sName = studentName.toLowerCase();
      const studentRecords = records.filter((r) => {
        if (!r) return false;
        const rPhone = (r.studentPhone || "").replace(/\D/g, "");
        const rName = (r.studentName || "").trim().toLowerCase();
        return (
          (phoneDigits && rPhone && rPhone === phoneDigits) ||
          (rName && rName === sName) ||
          (r.studentId && r.studentId === userProfile.id)
        );
      });
      const present = studentRecords.filter((r) => r.status === "PRESENT").length;
      const leave = studentRecords.filter((r) => r.status === "EXCUSED" || r.status === "LATE").length;
      const absent = studentRecords.filter((r) => r.status === "ABSENT").length;
      return { present, leave, absent };
    } catch {
      return { present: 0, leave: 0, absent: 0 };
    }
  });

  // Dynamic Assessment and Module Completion Scores fetched directly from Supabase
  const [progressData, setProgressData] = useState<{ module: string; score: number }[]>([]);

  // Dynamic Course Completion Progress for long-term tracks (e.g. Adaviyya 6-month course)
  const [courseCompletion, setCourseCompletion] = useState<CourseCompletionProgress | null>(null);

  // Fetch student attendance, progress, and course completion metrics directly from Supabase
  useEffect(() => {
    let isMounted = true;

    const loadDynamicMetrics = async () => {
      try {
        // 1. Fetch live attendance metrics from Supabase
        const attendanceMetrics = await fetchStudentAttendanceMetrics({
          studentId: userProfile.id,
          phone: userProfile.phone,
          studentName,
          courseId: selectedCourse.id,
          isApproved,
        });

        if (isMounted && attendanceMetrics.total > 0) {
          setAttendanceStats({
            present: attendanceMetrics.present,
            leave: attendanceMetrics.leave,
            absent: attendanceMetrics.absent,
          });
        }

        // 2. Fetch module completion scores directly from Supabase course_subjects & evaluations
        const scores = await fetchStudentModuleScores({
          studentId: userProfile.id,
          phone: userProfile.phone,
          studentName,
          courseId: selectedCourse.id,
          isApproved,
        });

        if (isMounted) {
          setProgressData(scores);
        }

        // 3. Calculate dynamic course progress bar for long-term courses (e.g. Adaviyya 6-month course)
        const progressMetrics = await calculateCourseCompletionMetrics({
          courseId: selectedCourse.id,
          isApproved,
          studentId: userProfile.id,
          phone: userProfile.phone,
        });

        if (isMounted) {
          setCourseCompletion(progressMetrics);
        }
      } catch (err) {
        console.warn("Could not load dynamic student metrics from Supabase:", err);
      }
    };

    loadDynamicMetrics();

    const handleAttendanceUpdate = () => {
      loadDynamicMetrics();
    };

    window.addEventListener("hanoon_attendance_updated", handleAttendanceUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener("hanoon_attendance_updated", handleAttendanceUpdate);
    };
  }, [userProfile.id, userProfile.phone, studentName, selectedCourse.id, isApproved]);

  const liveNowClass = liveClasses.find((c) => c.status === "LIVE_NOW");
  const upcomingClass = liveClasses.find((c) => c.status === "SCHEDULED");

  return (
    <div className="w-full max-w-md mx-auto overflow-x-hidden px-4 py-3 flex-1 flex flex-col justify-start space-y-4 select-none font-['Plus_Jakarta_Sans'] bg-purple-50/30 text-slate-900">
      {/* 1. TOP PROFILE BAR & GREETING */}
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
          onClick={() => {
            setShowNotificationToast((prev) => !prev);
          }}
          className="relative w-9 h-9 rounded-2xl bg-white border border-purple-100 shadow-xs flex items-center justify-center hover:bg-purple-50 transition-all text-slate-700 cursor-pointer shrink-0"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-purple-600" />
          {unreadNotifs > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white font-black text-[9px] flex items-center justify-center shadow-xs animate-bounce">
              {unreadNotifs}
            </span>
          ) : (
            <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-purple-400" />
          )}
        </button>
      </div>

      {/* Notification Toast Dropdown with Real Alerts */}
      {showNotificationToast && (
        <div className="p-3.5 rounded-2xl bg-white border border-purple-200 text-xs text-slate-700 shadow-md space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between border-b border-purple-100/60 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-purple-900">
              <Bell className="w-3.5 h-3.5 text-purple-600" />
              <span>Notifications & Class Alerts</span>
            </div>
            <div className="flex items-center gap-2">
              {unreadNotifs > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    markAllNotificationsAsRead();
                    setUnreadNotifs(0);
                  }}
                  className="text-[10px] font-bold text-purple-600 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowNotificationToast(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Show latest notifications */}
          <div className="space-y-1.5">
            {notificationsList.length === 0 ? (
              <div className="py-6 px-4 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-400 flex items-center justify-center mx-auto">
                  <Bell className="w-5 h-5 text-purple-400" />
                </div>
                <p className="text-xs font-bold text-slate-700">No new notifications</p>
                <p className="text-[10px] text-slate-400 max-w-[200px] mx-auto leading-relaxed">
                  Class schedules, announcements, and study notes will appear here.
                </p>
              </div>
            ) : (
              notificationsList.slice(0, 4).map((item) => (
                <div key={item.id} className="p-2.5 rounded-xl bg-purple-50/50 space-y-1 text-slate-700 border border-purple-100/50">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-extrabold text-[11px] text-slate-900 flex items-center gap-1">
                      {item.type === "CLASS_LIVE" && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
                      <span>{item.title}</span>
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-600 leading-snug">{item.message}</p>
                  {item.meetingLink && (
                    <a
                      href={item.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 py-0.5 px-2 rounded-md bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] transition-colors"
                    >
                      Join {item.platform || "Meeting"} ➔
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PENDING VERIFICATION NOTICE BANNER (Strictly Informative) */}
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

      {/* 2. COMPACT QUICK ACCESS GRID (2x2 Soft-Shadow Cards) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Quick Access
            </h3>
          </div>
          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
            Essential Services
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: My Courses */}
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("enrolled-subjects");
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="p-3.5 rounded-2xl bg-white hover:bg-purple-50/40 border border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between min-h-[96px] cursor-pointer group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="mt-2">
              <p className="text-xs font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                My Courses
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5 truncate">
                {selectedCourse.title}
              </span>
            </div>
          </button>

          {/* Card 2: Live Classes */}
          <button
            type="button"
            onClick={() => {
              if (isApproved) {
                setShowLiveModal(true);
              } else {
                setLockedNoticeSubject("Live Classroom");
              }
            }}
            className="p-3.5 rounded-2xl bg-white hover:bg-purple-50/40 border border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between min-h-[96px] cursor-pointer group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all shadow-xs">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div className="mt-2">
              <p className="text-xs font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                Live Classes
              </p>
              <span className="text-[10px] text-rose-600 font-semibold block mt-0.5">
                {isApproved ? "Join Live Stream" : "Locked (Pending)"}
              </span>
            </div>
          </button>

          {/* Card 3: Downloads & Notes */}
          <button
            type="button"
            onClick={() => setShowMaterialsModal(true)}
            className="p-3.5 rounded-2xl bg-white hover:bg-purple-50/40 border border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between min-h-[96px] cursor-pointer group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
              <Download className="w-4 h-4" />
            </div>
            <div className="mt-2">
              <p className="text-xs font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                Downloads & Notes
              </p>
              <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                PDFs & Handbooks
              </span>
            </div>
          </button>

          {/* Card 4: My Certificates */}
          <button
            type="button"
            onClick={() => {
              if (certificates && certificates.length > 0) {
                setSelectedCert(certificates[0]);
              } else {
                const el = document.getElementById("certificates-section");
                if (el) {
                  el.scrollIntoView({ behavior: "smooth" });
                }
              }
            }}
            className="p-3.5 rounded-2xl bg-white hover:bg-purple-50/40 border border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between min-h-[96px] cursor-pointer group active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
              <Award className="w-4 h-4" />
            </div>
            <div className="mt-2">
              <p className="text-xs font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                My Certificates
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">
                {certificates.length > 0 ? `${certificates.length} Issued` : "No certificates yet"}
              </span>
            </div>
          </button>

          {/* Widget A: Neumorphic Square Card containing Modern Donut Chart (Attendance Record) */}
          <div className="col-span-1 bg-white rounded-3xl p-3 border border-purple-100/90 shadow-[5px_5px_15px_rgba(147,51,234,0.06),-5px_-5px_15px_rgba(255,255,255,0.95)] flex flex-col justify-between hover:border-purple-200 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                <span className="text-[11px] font-extrabold text-slate-800">
                  Attendance
                </span>
              </div>
              <span className="text-[9px] font-black uppercase text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded-full border border-purple-100">
                Donut
              </span>
            </div>

            <div className="my-auto py-1">
              <AttendanceDonutChart
                compact={true}
                presentCount={attendanceStats.present}
                leaveCount={attendanceStats.leave}
                absentCount={attendanceStats.absent}
              />
            </div>
          </div>

          {/* Widget B: Companion Neumorphic Square Card - Attendance Health & Compliance */}
          <div className="col-span-1 bg-white rounded-3xl p-3 border border-purple-100/90 shadow-[5px_5px_15px_rgba(147,51,234,0.06),-5px_-5px_15px_rgba(255,255,255,0.95)] flex flex-col justify-between hover:border-purple-200 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-[11px] font-extrabold text-slate-800">
                  Health & Streak
                </span>
              </div>
              <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-100">
                Good Standing
              </span>
            </div>

            <div className="my-auto space-y-1.5 py-1">
              <div className="p-2 rounded-xl bg-purple-50/60 border border-purple-100/60">
                <span className="text-[9px] uppercase font-bold text-slate-400 block leading-none">
                  Compliance Status
                </span>
                <span className="text-sm font-black text-purple-900 block mt-0.5">
                  {attendanceStats.absent === 0 ? "100% Verified" : `${attendanceStats.present} Attended`}
                </span>
              </div>
              <p className="text-[9.5px] text-slate-500 font-medium leading-tight">
                {attendanceStats.absent === 0
                  ? "Zero unexcused absences recorded. Full exam eligibility active."
                  : `${attendanceStats.absent} absences on record. Maintain >80% for certification.`}
              </p>
            </div>

            <div className="pt-1.5 border-t border-purple-50 flex items-center justify-between text-[9.5px] text-purple-700 font-bold">
              <span>Term Presence</span>
              <span className="text-emerald-600 font-black">
                {attendanceStats.present + attendanceStats.leave + attendanceStats.absent > 0
                  ? `${Math.round((attendanceStats.present / (attendanceStats.present + attendanceStats.leave + attendanceStats.absent)) * 100)}%`
                  : "100%"}
              </span>
            </div>
          </div>

          {/* Widget C: Minimalist Bar Chart / Line Graph in a Wider Card (col-span-2) */}
          <div className="col-span-2 bg-white rounded-3xl p-4 border border-purple-100/90 shadow-[5px_5px_15px_rgba(147,51,234,0.06),-5px_-5px_15px_rgba(255,255,255,0.95)] hover:border-purple-200 transition-all">
            <ProgressScoreBarChart data={progressData} />
          </div>
        </div>
      </div>

      {/* 4. ANNOUNCEMENT BOARD / NOTICE BOARD (Prominently Placed for All Enrolled Students) */}
      <StudentNoticeBoard
        currentCourseId={selectedCourse.id}
        onOpenMaterials={() => setShowMaterialsModal(true)}
        onOpenSpecialClass={() => setShowSpecialModal(true)}
        onOpenLiveClass={() => {
          if (isApproved) {
            setShowLiveModal(true);
          } else {
            setLockedNoticeSubject("Live Classroom");
          }
        }}
      />

      {/* 5. COMPACT ENROLLED PROGRAM & LIVE COUNTDOWN HERO CARD */}
      <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm space-y-2.5">
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
            {liveNowClass ? (
              <span className="flex items-center gap-1 text-rose-600 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                LIVE NOW
              </span>
            ) : (
              <>
                <Clock className="w-3 h-3 text-purple-600" />
                <span>{countdownString}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 leading-tight">
              {selectedCourse.title}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              {subjects.length} Core Subjects • {liveNowClass ? `Live with ${liveNowClass.teacherName || "Faculty"}` : upcomingClass?.teacherName ? `Faculty: ${upcomingClass.teacherName}` : "Comprehensive Syllabus Track"}
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
                <Radio className={`w-3.5 h-3.5 ${liveNowClass ? "animate-pulse" : ""}`} />
                <span>{liveNowClass ? "Join Live" : "Classroom"}</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>Locked</span>
              </>
            )}
          </button>
        </div>

        {/* Dynamic Course Progress Bar for Long-Term Tracks (e.g. Adaviyya 6-Month Course) */}
        <div className="space-y-1.5 pt-1.5 border-t border-purple-50">
          <div className="flex items-center justify-between text-[10.5px]">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-700">Course Progress</span>
              <span className="text-[9.5px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                {courseCompletion?.statusLabel || (isApproved ? "Active Track" : "Pending Approval")}
              </span>
            </div>
            <span className="font-black text-purple-700 text-xs">
              {isApproved && courseCompletion
                ? `${courseCompletion.percentage}% Completed`
                : isApproved
                ? "100% Enrolled"
                : "Pending Approval"}
            </span>
          </div>

          <div className="relative w-full h-2 rounded-full bg-purple-100 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 transition-all duration-700 shadow-xs"
              style={{
                width: `${
                  isApproved && courseCompletion
                    ? courseCompletion.percentage
                    : isApproved
                    ? 100
                    : 5
                }%`,
              }}
            />
          </div>

          {/* Timeline Milestones for 6-Month Adaviyya / Long-Term Tracks */}
          {courseCompletion && courseCompletion.isLongTermCourse && isApproved && (
            <div className="pt-1 flex items-center justify-between text-[9px] text-slate-400 font-semibold border-t border-dashed border-purple-100/80">
              <span className="text-purple-700 font-bold flex items-center gap-0.5">
                <Check className="w-2.5 h-2.5 text-purple-600" />
                <span>Month 1: Basics</span>
              </span>
              <span className={courseCompletion.currentMonth >= 3 ? "text-purple-700 font-bold" : "text-slate-400"}>
                Month 3: Mid-Term
              </span>
              <span className={courseCompletion.currentMonth >= 6 ? "text-purple-700 font-bold" : "text-slate-400"}>
                Month 6: Graduation
              </span>
            </div>
          )}

          {courseCompletion && isApproved && (
            <p className="text-[10px] text-slate-500 font-medium line-clamp-1">
              <span className="font-bold text-slate-700">{courseCompletion.stageTitle}</span> • Next: {courseCompletion.nextMilestone}
            </p>
          )}
        </div>
      </div>

      {/* 5b. RECORDED CLASSES & REPLAYS (Google Drive / YouTube) */}
      {recordedClassesList.length > 0 && (
        <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-sm space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Recorded Classes
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">
                  Watch recorded sessions on Google Drive / YouTube
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full">
              {recordedClassesList.length} Available
            </span>
          </div>

          <div className="space-y-2">
            {recordedClassesList.slice(0, 3).map((rec) => (
              <div
                key={rec.id}
                className="p-3 rounded-xl bg-purple-50/40 border border-purple-100 hover:border-purple-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
                    {rec.title}
                  </h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
                    {rec.date && (
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {rec.date}
                      </span>
                    )}
                    {rec.teacherName && (
                      <span className="font-medium">• Faculty: {rec.teacherName}</span>
                    )}
                    {rec.duration && (
                      <span className="font-medium">• {rec.duration}</span>
                    )}
                  </div>
                </div>

                <a
                  href={rec.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer shrink-0"
                  title="Watch Recorded Class Link"
                >
                  <Play className="w-3 h-3 fill-white text-white" />
                  <span>▶️ Watch Recorded Class</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. ENROLLED SUBJECTS: 2x2 GRID (Real-time Unlock) */}
      <div id="enrolled-subjects" className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Enrolled Subjects Hub
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

      {/* 7. SPECIAL CLASS (Burdah Live Only + Upcoming Indicator) */}
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
        </div>
      )}

      {/* 8. COMPACT ACTION UTILITIES: CONTACT ADMIN & MENTOR WHATSAPP & FEE RECEIPT */}
      <div className="space-y-2 pt-0.5">
        <a
          href="https://wa.me/919656294203?text=Assalamu%20Alaikum%20Admin,%20I%20need%20help%20with%20my%20Student%20Portal."
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 px-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 text-emerald-800 text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer group active:scale-[0.98]"
        >
          <MessageCircle className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          <span>Need Help? Contact Admin on WhatsApp</span>
        </a>

        <div className="grid grid-cols-2 gap-2.5">
          <a
            href={formatWhatsAppLink(
              "919656294203",
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
            onClick={() => setShowTimetableModal(true)}
            className="p-2.5 rounded-2xl bg-white border border-purple-100 hover:border-purple-300 shadow-xs flex items-center gap-2 transition-all cursor-pointer group active:scale-[0.98] text-left"
          >
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block leading-tight">
                Timetable
              </span>
              <span className="text-[9.5px] text-slate-500 font-medium">Weekly Schedule</span>
            </div>
          </button>
        )}
      </div>
      </div>

      {/* DIGITAL CERTIFICATES VIEW (Dynamic with Clean Empty State) */}
      <div className="space-y-1.5 pt-0.5" id="certificates-section">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-purple-600" />
            <span>Digital Credentials</span>
          </h3>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              certificates.length > 0
                ? "text-emerald-700 bg-emerald-50"
                : "text-slate-500 bg-slate-100"
            }`}
          >
            {certificates.length > 0 ? `${certificates.length} Issued` : "0 Issued"}
          </span>
        </div>

        {certificates.length > 0 ? (
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
        ) : (
          <div className="bg-white p-4 rounded-2xl border border-purple-100/80 shadow-xs text-center space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-400 flex items-center justify-center mx-auto">
              <Award className="w-5 h-5 text-purple-400" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-slate-800">No certificates unlocked yet</h4>
              <p className="text-[10.5px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                Official certificates of completion will be unlocked and available here once you complete your course syllabus and assessments.
              </p>
            </div>
          </div>
        )}
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-['Plus_Jakarta_Sans']" onClick={() => setSelectedCert(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl border border-purple-100 space-y-4" onClick={(e) => e.stopPropagation()}>
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-['Plus_Jakarta_Sans'] select-none" onClick={() => setLockedNoticeSubject(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-purple-100 text-center space-y-4" onClick={(e) => e.stopPropagation()}>
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
