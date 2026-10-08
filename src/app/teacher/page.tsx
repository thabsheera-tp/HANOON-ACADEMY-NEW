"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Radio,
  Video,
  Calendar,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  Users,
  BookOpen,
  Search,
  ExternalLink,
  Plus,
  LogOut,
  ArrowLeft,
  Download,
  Trash2,
  X,
  MessageCircle,
  BarChart3,
  Phone,
  Check,
  ShieldCheck,
} from "lucide-react";
import { getCurrentSession, logoutUser, setAuthSession, UserProfileRecord } from "@/services/authService";
import HanoonLogo from "@/components/brand/HanoonLogo";
import TeacherEngagementDonut from "@/components/charts/TeacherEngagementDonut";
import {
  LiveClassSession,
  CourseMaterial,
  TeacherStudentItem,
  getTeacherClasses,
  scheduleNewClass,
  startLiveBroadcast,
  stopLiveBroadcast,
  getCourseMaterials,
  uploadCourseMaterial,
  deleteCourseMaterial,
  DEFAULT_STUDENTS,
} from "@/services/teacherService";
import { fetchStudents } from "@/services/studentService";
import { getTeacherWhatsApp, saveTeacherWhatsApp } from "@/services/subjectService";
import { formatWhatsAppLink } from "@/services/settingsService";
import {
  resolveTeacherId,
  getAssignmentForUser,
  canTeacherAccessCourse,
  filterClassesByTeacher,
  filterMaterialsByTeacher,
  filterStudentsByTeacher,
} from "@/services/teacherAssignmentService";

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfileRecord | null>(null);

  // Tab navigation for mobile & desktop agility
  const [activeTab, setActiveTab] = useState<"overview" | "schedule" | "materials" | "students" | "profile">("overview");

  // State for Teacher WhatsApp Hotline
  const [teacherWhatsApp, setTeacherWhatsApp] = useState("");
  const [whatsappSavedNotice, setWhatsappSavedNotice] = useState<string | null>(null);
  const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);

  // State for Live Classes & Broadcast
  const [classes, setClasses] = useState<LiveClassSession[]>([]);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [activeLiveClass, setActiveLiveClass] = useState<LiveClassSession | null>(null);
  const [broadcastAlertToast, setBroadcastAlertToast] = useState<string | null>(null);

  // Modal / Form States
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = useState<string | null>(null);
  const [newScheduleForm, setNewScheduleForm] = useState({
    title: "",
    courseId: "adaviyya",
    courseName: "Adaviyya",
    date: new Date().toISOString().split("T")[0],
    time: "19:30",
    duration: "60 mins",
    meetingLink: "https://zoom.us/j/hanoon-faculty-live",
    platform: "Zoom" as "Zoom" | "Google Meet",
  });

  // State for Course Content / Uploads
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
  const [uploadContentType, setUploadContentType] = useState<"PDF" | "VIDEO">("PDF");
  const [newUploadForm, setNewUploadForm] = useState({
    title: "",
    courseId: "adaviyya",
    courseName: "Adaviyya",
    fileOrUrl: "",
    pdfSize: "5.4 MB",
    videoDuration: "45 mins",
  });

  // State for Students
  const [students, setStudents] = useState<TeacherStudentItem[]>(DEFAULT_STUDENTS);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("ALL");

  // RBAC Assignment & Role Derivations
  const isSuperAdmin = currentUser?.role === "admin" || currentUser?.role === "super_admin";
  const userAssignment = useMemo(() => getAssignmentForUser(currentUser), [currentUser]);

  // Available academic tracks strictly assigned to this teacher (or all for Super Admin)
  const availableTracks = useMemo(() => {
    const allTracks = [
      { id: "adaviyya", name: "Adaviyya" },
      { id: "shamail", name: "الشمائل المحمدية" },
      { id: "hometuition", name: "Home Tuition" },
      { id: "fashion", name: "Fashion Designing" },
      { id: "tajweed", name: "Tajweed Special Class" },
      { id: "burdah", name: "Burdah Live Gathering" },
    ];
    if (isSuperAdmin) return allTracks;
    return allTracks.filter(
      (t) => canTeacherAccessCourse(t.id, currentUser) || canTeacherAccessCourse(t.name, currentUser)
    );
  }, [isSuperAdmin, currentUser]);

  // RBAC Filtered Classes: Only classes assigned specifically to this teacher
  const accessibleClasses = useMemo(() => {
    return filterClassesByTeacher(classes, currentUser);
  }, [classes, currentUser]);

  // RBAC Filtered Materials: Only materials belonging to this teacher's assigned tracks
  const accessibleMaterials = useMemo(() => {
    return filterMaterialsByTeacher(materials, currentUser);
  }, [materials, currentUser]);

  // RBAC Filtered Students: Only students in courses assigned to this teacher
  const accessibleStudents = useMemo(() => {
    return filterStudentsByTeacher(students, currentUser);
  }, [students, currentUser]);

  useEffect(() => {
    const session = getCurrentSession();
    if (!session || !session.user || (session.user.role !== "teacher" && session.user.role !== "admin")) {
      router.replace("/login?error=teacher_only");
      return;
    }
    setCurrentUser(session.user);
    const initialPhone = getTeacherWhatsApp(session.user.full_name) || session.user.whatsapp_num || "";
    setTeacherWhatsApp(initialPhone);

    // Load initial data
    const loadedClasses = getTeacherClasses();
    setClasses(loadedClasses);
    const currentlyLive = loadedClasses.find((c) => c.status === "LIVE_NOW");
    if (currentlyLive) {
      setIsBroadcasting(true);
      setActiveLiveClass(currentlyLive);
    }

    setMaterials(getCourseMaterials());

    // Load students dynamically
    fetchStudents().then((dynamicStudents) => {
      if (dynamicStudents && dynamicStudents.length > 0) {
        const enriched: TeacherStudentItem[] = dynamicStudents.map((std, idx) => {
          const coursesList = ["Adaviyya", "الشمائل المحمدية", "Home Tuition", "Fashion Designing"];
          const assignedCourse = coursesList[idx % coursesList.length];
          const calculatedProgress = Math.min(100, 70 + (idx * 7) % 30);
          const calculatedAttendance = Math.min(100, 80 + (idx * 5) % 20);

          return {
            id: std.id,
            fullName: std.full_name,
            whatsappNum: std.whatsapp_num,
            district: std.district || "Kerala, IN",
            courseName: assignedCourse,
            progressPercent: calculatedProgress,
            attendanceRate: calculatedAttendance,
            lastActive: idx === 0 ? "Just now" : `${idx + 1} days ago`,
            status: calculatedAttendance >= 92 ? "Excelling" : calculatedAttendance >= 80 ? "Active" : "Needs Attention",
          };
        });

        setStudents(enriched);
      } else {
        setStudents([]);
      }
    });
  }, [router]);

  const handleSignOut = async () => {
    await logoutUser();
    router.push("/login");
  };

  // Live Broadcast Actions
  const handleStartLiveClass = (targetClass?: LiveClassSession) => {
    const classToStart = targetClass || classes.find((c) => c.status === "SCHEDULED") || classes[0];
    if (!classToStart) return;

    const started = startLiveBroadcast(classToStart.id);
    if (started) {
      setClasses(getTeacherClasses());
      setIsBroadcasting(true);
      setActiveLiveClass(started);
      setBroadcastAlertToast(
        `🔴 LIVE Broadcast initiated! SMS & WhatsApp push alerts dispatched to ${started.attendeesCount} enrolled students.`
      );
      setTimeout(() => setBroadcastAlertToast(null), 6000);
      window.open(started.meetingLink, "_blank", "noopener,noreferrer");
    }
  };

  const handleStopLiveClass = () => {
    if (!activeLiveClass) return;
    stopLiveBroadcast(activeLiveClass.id);
    setClasses(getTeacherClasses());
    setIsBroadcasting(false);
    setActiveLiveClass(null);
    setBroadcastAlertToast("Live class concluded and archived for student replay.");
    setTimeout(() => setBroadcastAlertToast(null), 4000);
  };

  // Schedule New Class (RBAC Enforced: Teacher can only schedule into assigned courses)
  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleForm.title.trim()) return;

    if (!canTeacherAccessCourse(newScheduleForm.courseId, currentUser)) {
      setScheduleSuccessMsg("Access Denied: You can only schedule classes for your assigned tracks.");
      setTimeout(() => setScheduleSuccessMsg(null), 4000);
      return;
    }

    const courseMap: Record<string, string> = {
      adaviyya: "Adaviyya",
      shamail: "الشمائل المحمدية",
      hometuition: "Home Tuition",
      fashion: "Fashion Designing",
      tajweed: "Tajweed Special Class",
      burdah: "Burdah Live Gathering",
    };

    const teacherId = resolveTeacherId(currentUser);
    const created = scheduleNewClass({
      title: newScheduleForm.title.trim(),
      courseId: newScheduleForm.courseId,
      courseName: courseMap[newScheduleForm.courseId] || "Adaviyya",
      date: newScheduleForm.date,
      time: newScheduleForm.time,
      duration: newScheduleForm.duration,
      meetingLink: newScheduleForm.meetingLink.trim() || "https://zoom.us/j/hanoon-faculty-live",
      platform: newScheduleForm.platform,
      teacher_id: teacherId,
      teacherName: currentUser?.full_name || "Faculty",
    });

    setClasses(getTeacherClasses());
    setIsScheduleModalOpen(false);
    setScheduleSuccessMsg(`"${created.title}" scheduled for ${created.date} at ${created.time} IST!`);
    setNewScheduleForm({
      title: "",
      courseId: availableTracks[0]?.id || "adaviyya",
      courseName: availableTracks[0]?.name || "Adaviyya",
      date: new Date().toISOString().split("T")[0],
      time: "19:30",
      duration: "60 mins",
      meetingLink: "https://zoom.us/j/hanoon-faculty-live",
      platform: "Zoom",
    });
    setTimeout(() => setScheduleSuccessMsg(null), 4000);
  };

  // Upload Course Materials (RBAC Enforced: Teacher can only publish to assigned courses)
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUploadForm.title.trim()) return;

    if (!canTeacherAccessCourse(newUploadForm.courseId, currentUser)) {
      setUploadSuccessMsg("Access Denied: You can only publish notes for your assigned tracks.");
      setTimeout(() => setUploadSuccessMsg(null), 4000);
      return;
    }

    const courseMap: Record<string, string> = {
      adaviyya: "Adaviyya",
      shamail: "الشمائل المحمدية",
      hometuition: "Home Tuition",
      fashion: "Fashion Designing",
    };

    const teacherId = resolveTeacherId(currentUser);
    const uploaded = uploadCourseMaterial({
      title: newUploadForm.title.trim(),
      courseId: newUploadForm.courseId,
      courseName: courseMap[newUploadForm.courseId] || "Adaviyya",
      type: uploadContentType,
      fileOrUrl:
        newUploadForm.fileOrUrl.trim() ||
        (uploadContentType === "PDF"
          ? `/notes/${newUploadForm.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.pdf`
          : "https://youtube.com/watch?v=hanoon-rec"),
      sizeOrDuration:
        uploadContentType === "PDF" ? newUploadForm.pdfSize : newUploadForm.videoDuration,
      teacher_id: teacherId,
      teacherName: currentUser?.full_name || "Faculty",
    });

    setMaterials(getCourseMaterials());
    setUploadSuccessMsg(
      `"${uploaded.title}" uploaded! Synced to student portal for offline access.`
    );
    setNewUploadForm({
      title: "",
      courseId: availableTracks[0]?.id || "adaviyya",
      courseName: availableTracks[0]?.name || "Adaviyya",
      fileOrUrl: "",
      pdfSize: "5.4 MB",
      videoDuration: "45 mins",
    });
    setTimeout(() => setUploadSuccessMsg(null), 4000);
  };

  // RBAC Protected Deletion
  const handleDeleteMaterial = (id: string) => {
    const target = materials.find((m) => m.id === id);
    if (target && !isSuperAdmin) {
      const teacherId = resolveTeacherId(currentUser);
      const isOwner = target.teacher_id === teacherId;
      const isAssigned = canTeacherAccessCourse(target.courseId, currentUser);
      if (!isOwner && !isAssigned) {
        alert("Access Denied: You cannot delete study materials created by other teachers.");
        return;
      }
    }
    deleteCourseMaterial(id);
    setMaterials(getCourseMaterials());
  };

  // Filtered Students List: Derived strictly from accessibleStudents for RBAC integrity
  const filteredStudents = useMemo(() => {
    return accessibleStudents.filter((s) => {
      const matchesSearch =
        s.fullName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.whatsappNum.includes(studentSearch) ||
        s.district.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesCourse =
        selectedCourseFilter === "ALL" || s.courseName === selectedCourseFilter;
      return matchesSearch && matchesCourse;
    });
  }, [accessibleStudents, studentSearch, selectedCourseFilter]);

  // Handle Save Teacher WhatsApp Hotline
  const handleSaveTeacherWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWhatsApp(true);
    const cleanPhone = teacherWhatsApp.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    if (!formattedPhone || formattedPhone.length < 10) {
      setWhatsappSavedNotice("Please enter a valid 10-digit WhatsApp number.");
      setIsSavingWhatsApp(false);
      setTimeout(() => setWhatsappSavedNotice(null), 3500);
      return;
    }

    if (currentUser) {
      saveTeacherWhatsApp(currentUser.full_name, formattedPhone);
      const updatedUser = { ...currentUser, whatsapp_num: formattedPhone };
      setCurrentUser(updatedUser);
      setAuthSession(updatedUser);
    }

    setIsSavingWhatsApp(false);
    setWhatsappSavedNotice("Faculty WhatsApp Hotline active! Students will now reach you directly.");
    setTimeout(() => setWhatsappSavedNotice(null), 4000);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
          <span className="text-xs font-semibold text-slate-500">Verifying faculty authorization...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-purple-50/40 text-slate-900 font-['Plus_Jakarta_Sans'] pb-20 selection:bg-purple-200">
      {/* Real-time Broadcast Toast */}
      {broadcastAlertToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] bg-purple-900 text-white p-3.5 rounded-2xl shadow-xl border border-purple-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center gap-2.5 text-xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
            <span>{broadcastAlertToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setBroadcastAlertToast(null)}
            className="text-purple-300 hover:text-white shrink-0 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Faculty Header Bar (Minimal Role Isolation: Logo, Instructor Desk badge, Sign Out) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-purple-100 shadow-xs w-full max-w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <HanoonLogo size="sm" compactMobile />
            <div className="h-4 w-px bg-purple-200 shrink-0 hidden sm:block" />
            <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0">
              Instructor Desk
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSignOut}
              title="Sign Out"
              className="py-1.5 sm:py-2 px-2.5 sm:px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border border-rose-200 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline text-xs">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* RBAC Role-Based Access Control Banner */}
        {isSuperAdmin ? (
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Super Admin Oversight Mode: Full visibility across all 4 faculty members, courses, live classes, and notes.</span>
            </div>
            <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 self-start sm:self-auto border border-indigo-200">
              Unrestricted Institutional Access
            </span>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-purple-50/80 border border-purple-200 text-purple-900 text-xs font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                Faculty Scope Active: You have authorized access strictly to your assigned academic tracks ({userAssignment?.assignedCourseNames.join(", ") || "Adaviyya Track"}).
              </span>
            </div>
            <span className="text-[10px] uppercase font-black px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 self-start sm:self-auto border border-purple-200">
              Assigned Faculty Portfolio
            </span>
          </div>
        )}

        {/* Welcome & Live Broadcast Action Hero */}
        <section className="bg-white rounded-2xl border border-purple-100 p-5 sm:p-6 shadow-md relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full">
                  Instructor Desk
                </span>
                {isBroadcasting ? (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                    LIVE ON AIR
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Faculty Ready
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Welcome back, {currentUser.full_name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                {isSuperAdmin
                  ? "Manage all curriculum tracks, schedule faculty lectures, and monitor live engagement across the entire academy."
                  : `Managing your assigned academic tracks: ${userAssignment?.assignedCourseNames.join(", ") || "Adaviyya"}.`}
              </p>
            </div>

            {/* Live Class Management Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              {isBroadcasting ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href={activeLiveClass?.meetingLink || "https://zoom.us/j/hanoon-faculty-live"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-initial py-3 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Live Room</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleStopLiveClass}
                    className="py-3 px-4 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>End Broadcast</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartLiveClass()}
                  className="py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer group"
                >
                  <Radio className="w-4 h-4 text-purple-200 group-hover:scale-110 transition-transform animate-pulse" />
                  <span>Start Live Class</span>
                </button>
              )}

              {/* Prominent Upload PDF Notes Button */}
              <button
                type="button"
                onClick={() => {
                  setUploadContentType("PDF");
                  setActiveTab("materials");
                }}
                className="py-3.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/20"
              >
                <FileText className="w-4 h-4 text-emerald-100" />
                <span>Upload PDF Notes</span>
              </button>

              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(true)}
                className="py-3.5 px-5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Calendar className="w-4 h-4 text-purple-600" />
                <span>Schedule New Class</span>
              </button>
            </div>
          </div>

          {/* Active Live Broadcast Banner */}
          {isBroadcasting && activeLiveClass && (
            <div className="mt-5 pt-4 border-t border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-50/70 p-4 rounded-xl">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Radio className="w-4 h-4 animate-ping" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">
                    Broadcasting: {activeLiveClass.title}
                  </h4>
                  <p className="text-[11px] text-slate-600">
                    {activeLiveClass.courseName} • Platform: {activeLiveClass.platform} • {activeLiveClass.attendeesCount} Students Alerted
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-black text-purple-700 bg-white px-3 py-1 rounded-lg border border-purple-200 shadow-2xs self-start sm:self-auto">
                Audience Live & Notified
              </span>
            </div>
          )}
        </section>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-purple-100">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-purple-50 border border-purple-100"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Overview & Engagement</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("schedule")}
            className={`py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "schedule"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-purple-50 border border-purple-100"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Class Timetable ({accessibleClasses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("materials")}
            className={`py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "materials"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-purple-50 border border-purple-100"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Course Content & Notes ({accessibleMaterials.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "students"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-purple-50 border border-purple-100"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Student Roster ({accessibleStudents.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`py-2.5 px-4 rounded-xl font-extrabold text-xs flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-purple-50 border border-purple-100"
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp & Profile Settings</span>
          </button>
        </div>

        {/* Success Notifications */}
        {whatsappSavedNotice && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 shadow-sm animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{whatsappSavedNotice}</span>
          </div>
        )}

        {scheduleSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{scheduleSuccessMsg}</span>
          </div>
        )}

        {uploadSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{uploadSuccessMsg}</span>
          </div>
        )}

        {/* TAB 1: OVERVIEW & ENGAGEMENT */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Prominent Faculty Fast-Actions Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setUploadContentType("PDF");
                  setActiveTab("materials");
                }}
                className="p-4 rounded-2xl bg-white border border-purple-100 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Upload PDF Notes
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">Publish chapter handbooks & study files</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleStartLiveClass()}
                className="p-4 rounded-2xl bg-white border border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shrink-0">
                  <Radio className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-purple-700 transition-colors">
                    Start Live Stream
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">Launch virtual classroom broadcast</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(true)}
                className="p-4 rounded-2xl bg-white border border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all flex items-center gap-3 text-left group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 group-hover:text-purple-700 transition-colors">
                    Schedule Class
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">Set timetable & push student alerts</p>
                </div>
              </button>
            </div>

            {/* Faculty Student Doubt Clearance WhatsApp Hotline Card */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-purple-100 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-purple-50 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900">
                        Student Doubt Clearance WhatsApp Hotline
                      </h3>
                      <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                        Live Link
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Configure your WhatsApp number. When enrolled students tap &quot;Ask {currentUser.full_name} on WhatsApp&quot;, it opens your chat directly.
                    </p>
                  </div>
                </div>

                {teacherWhatsApp && (
                  <a
                    href={formatWhatsAppLink(
                      teacherWhatsApp,
                      `Assalamu Alaikum ${currentUser.full_name}, this is a test inquiry from Hanoon Academy.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all self-start sm:self-auto cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Test My WhatsApp Link</span>
                  </a>
                )}
              </div>

              <form onSubmit={handleSaveTeacherWhatsApp} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Your Official Faculty WhatsApp Number *
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={teacherWhatsApp}
                        onChange={(e) => setTeacherWhatsApp(e.target.value)}
                        placeholder="e.g. 9846012345 or +91 9846012345"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 font-mono"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingWhatsApp}
                      className="py-2.5 px-5 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-sm shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {isSavingWhatsApp ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Save WhatsApp Number</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100 text-[11px] text-purple-900 leading-relaxed space-y-1">
                  <p className="font-semibold">
                    💡 <strong>Student Experience:</strong> Enrolled students viewing your curriculum subjects (Seerah, Haddad, Fiqh, Hadith) will see the <strong className="text-purple-700">&quot;Ask {currentUser.full_name} on WhatsApp&quot;</strong> button. Clicking it connects directly to this number with their student name and subject doubt pre-filled.
                  </p>
                </div>
              </form>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-4.5 rounded-2xl border border-purple-100 shadow-md space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Enrolled Students
                </span>
                <h3 className="text-2xl font-black text-slate-900">{accessibleStudents.length}</h3>
                <p className="text-[11px] text-purple-600 font-bold">
                  {isSuperAdmin ? "Across all 6 tracks" : `Assigned: ${availableTracks.length} track${availableTracks.length > 1 ? "s" : ""}`}
                </p>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-purple-100 shadow-md space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Classes Delivered
                </span>
                <h3 className="text-2xl font-black text-purple-700">
                  {accessibleClasses.filter((c) => c.status === "COMPLETED").length}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Completed sessions</p>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-purple-100 shadow-md space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Upcoming Classes
                </span>
                <h3 className="text-2xl font-black text-emerald-600">
                  {accessibleClasses.filter((c) => c.status === "SCHEDULED").length}
                </h3>
                <p className="text-[11px] text-emerald-600 font-bold">Scheduled on calendar</p>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-purple-100 shadow-md space-y-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Notes & Recordings
                </span>
                <h3 className="text-2xl font-black text-slate-900">{accessibleMaterials.length}</h3>
                <p className="text-[11px] text-purple-600 font-bold">Published study files</p>
              </div>
            </div>

            {/* Recharts Student Engagement Donut Chart */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-purple-100 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-purple-50 gap-2">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                    <span>Student Attendance & Engagement Breakdown</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Visualized with Recharts: Class participation rate across all assigned tracks.
                  </p>
                </div>
                <span className="text-xs font-black text-purple-700 bg-purple-50 px-3 py-1 rounded-full self-start sm:self-auto">
                  Live Term Analytics
                </span>
              </div>

              {/* Chart Component */}
              <TeacherEngagementDonut presentRate={0} lateRate={0} absentRate={0} />
            </div>

            {/* Next Scheduled Classes Quick View */}
            <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-purple-50">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Upcoming Live Sessions</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("schedule")}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors"
                >
                  View All &rarr;
                </button>
              </div>

              {accessibleClasses.length === 0 ? (
                <div className="p-6 text-center text-slate-500 bg-purple-50/20 rounded-xl border border-dashed border-purple-200 text-xs">
                  No upcoming live classes scheduled for your assigned courses. Click &quot;View All&quot; to schedule a session.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {accessibleClasses.slice(0, 2).map((cls) => (
                    <div
                      key={cls.id}
                      className="p-4 rounded-xl bg-purple-50/40 border border-purple-100 flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                            {cls.courseName}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {cls.date} • {cls.time} IST
                          </span>
                        </div>
                        <h4 className="text-xs font-extrabold text-slate-900">{cls.title}</h4>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-purple-100/60">
                        <span className="text-[11px] text-slate-500 font-medium">
                          Platform: <strong className="text-slate-800">{cls.platform}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartLiveClass(cls)}
                          className="py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Radio className="w-3 h-3" />
                          <span>Go Live</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CLASS SCHEDULE MANAGEMENT */}
        {activeTab === "schedule" && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-50">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Live Class Timetable
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Schedule interactive lectures and notify enrolled students across all tracks.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Schedule New Class</span>
                </button>
              </div>

              {/* Classes Table / Cards */}
              <div className="space-y-3">
                {accessibleClasses.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-purple-50/20 rounded-2xl border border-dashed border-purple-200">
                    <p className="font-bold text-slate-700 text-sm">No live classes scheduled for your assigned tracks.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Click the &quot;Schedule New Class&quot; button above to create a live session for your students.
                    </p>
                  </div>
                ) : (
                  accessibleClasses.map((cls) => {
                    const isLive = cls.status === "LIVE_NOW";
                    const isDone = cls.status === "COMPLETED";

                    return (
                      <div
                        key={cls.id}
                        className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isLive
                            ? "bg-purple-50/90 border-purple-300 shadow-sm"
                            : "bg-white border-purple-100 hover:border-purple-200"
                        }`}
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full">
                              {cls.courseName}
                            </span>
                            {isLive && (
                              <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" />
                                Active Live Now
                              </span>
                            )}
                            {isDone && (
                              <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                Completed
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm font-extrabold text-slate-900">{cls.title}</h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Clock className="w-3.5 h-3.5 text-purple-600" />
                              {cls.date} at {cls.time} IST ({cls.duration})
                            </span>
                            <span>•</span>
                            <span>Platform: <strong className="text-slate-800">{cls.platform}</strong></span>
                            <span>•</span>
                            <span>Expected: <strong className="text-purple-700">{cls.attendeesCount} Students</strong></span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-purple-50">
                          {isLive ? (
                            <div className="flex items-center gap-2">
                              <a
                                href={cls.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-sm"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Join Room</span>
                              </a>
                              <button
                                type="button"
                                onClick={handleStopLiveClass}
                                className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs"
                              >
                                End
                              </button>
                            </div>
                          ) : isDone ? (
                            <button
                              type="button"
                              onClick={() => handleStartLiveClass(cls)}
                              className="py-2 px-3.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Radio className="w-3.5 h-3.5" />
                              <span>Re-run Session</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartLiveClass(cls)}
                              className="py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                            >
                              <Radio className="w-3.5 h-3.5 text-purple-200" />
                              <span>Start Class Now</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: COURSE CONTENT UPLOAD (OFFLINE ACCESS) */}
        {activeTab === "materials" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Upload Form (Left Column / 5 cols) */}
            <div className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-purple-100 shadow-md space-y-4">
              <div className="pb-3 border-b border-purple-50">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-purple-600" />
                  <span>Upload Course Material</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish PDF handbooks or recorded lecture videos for offline student access.
                </p>
              </div>

              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-purple-50/70 rounded-xl">
                <button
                  type="button"
                  onClick={() => setUploadContentType("PDF")}
                  className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    uploadContentType === "PDF"
                      ? "bg-white text-purple-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF Study Notes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadContentType("VIDEO")}
                  className={`py-2 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    uploadContentType === "VIDEO"
                      ? "bg-white text-purple-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Recorded Video</span>
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Select Academic Track *
                  </label>
                  <select
                    value={newUploadForm.courseId}
                    onChange={(e) =>
                      setNewUploadForm({ ...newUploadForm, courseId: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-slate-900 font-semibold outline-none focus:border-purple-400"
                  >
                    {availableTracks.map((trk) => (
                      <option key={trk.id} value={trk.id}>
                        {trk.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Material / Lesson Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      uploadContentType === "PDF"
                        ? "e.g. Fiqh Chapter 4: Taharah & Water Rulings"
                        : "e.g. Live Class Recording: Seerah Chapter 3"
                    }
                    value={newUploadForm.title}
                    onChange={(e) =>
                      setNewUploadForm({ ...newUploadForm, title: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-slate-900 font-medium outline-none focus:border-purple-400"
                  />
                </div>

                {uploadContentType === "PDF" ? (
                  <>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        PDF Document File
                      </label>
                      <div className="p-4 rounded-xl border-2 border-dashed border-purple-200 bg-purple-50/30 text-center cursor-pointer hover:bg-purple-50 transition-colors">
                        <FileText className="w-6 h-6 text-purple-600 mx-auto mb-1" />
                        <span className="text-slate-600 font-semibold block">
                          Click to select PDF handbook
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Auto-formatted for offline viewing (PDF format, max 25MB)
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Simulated File Size
                      </label>
                      <input
                        type="text"
                        value={newUploadForm.pdfSize}
                        onChange={(e) =>
                          setNewUploadForm({ ...newUploadForm, pdfSize: e.target.value })
                        }
                        className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-slate-900 font-medium outline-none"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Video Recording URL / YouTube Unlisted Link *
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://youtube.com/watch?v=..."
                        value={newUploadForm.fileOrUrl}
                        onChange={(e) =>
                          setNewUploadForm({ ...newUploadForm, fileOrUrl: e.target.value })
                        }
                        className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-slate-900 font-medium outline-none focus:border-purple-400"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 block mb-1">
                        Recording Duration
                      </label>
                      <input
                        type="text"
                        value={newUploadForm.videoDuration}
                        onChange={(e) =>
                          setNewUploadForm({ ...newUploadForm, videoDuration: e.target.value })
                        }
                        className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-slate-900 font-medium outline-none"
                      />
                    </div>
                  </>
                )}

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer mt-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Publish for Offline Student Access</span>
                </button>
              </form>
            </div>

            {/* Offline Materials Library (Right Column / 7 cols) */}
            <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-purple-100 shadow-md space-y-4">
              <div className="pb-3 border-b border-purple-50 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span>Offline Access Materials Library</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {accessibleMaterials.length} lessons available for student offline download and revision.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {accessibleMaterials.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-purple-50/20 rounded-2xl border border-dashed border-purple-200">
                    <p className="font-bold text-slate-700 text-sm">No materials published for your assigned tracks yet.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Upload PDFs or video lectures on the left to make them available offline for your students.
                    </p>
                  </div>
                ) : (
                  accessibleMaterials.map((mat) => {
                    const isPdf = mat.type === "PDF";

                    return (
                      <div
                        key={mat.id}
                        className="p-3.5 rounded-xl bg-purple-50/40 border border-purple-100 flex items-start justify-between gap-3 hover:bg-purple-50/70 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isPdf
                                ? "bg-purple-100 text-purple-700"
                                : "bg-rose-100 text-rose-600"
                            }`}
                          >
                            {isPdf ? (
                              <FileText className="w-5 h-5" />
                            ) : (
                              <Video className="w-5 h-5" />
                            )}
                          </div>

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black uppercase text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-md">
                                {mat.courseName}
                              </span>
                              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                                Offline Ready
                              </span>
                            </div>

                            <h4 className="text-xs font-bold text-slate-900">{mat.title}</h4>

                            <p className="text-[11px] text-slate-500">
                              {isPdf ? "PDF Document" : "HD Video Stream"} • {mat.sizeOrDuration} • Uploaded {mat.uploadedAt}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => alert(`Simulating download / preview of "${mat.title}"`)}
                            title="Preview or Download"
                            className="p-2 rounded-lg text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteMaterial(mat.id)}
                            title="Delete Material"
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ENROLLED STUDENT ROSTER */}
        {activeTab === "students" && (
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-purple-100 shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-purple-50">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span>Enrolled Student Directory & Progress</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track individual attendance, course milestones, and send updates via WhatsApp.
                </p>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search name, phone, district..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full sm:w-56 pl-8 pr-3 py-2 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-slate-900 outline-none focus:border-purple-300"
                  />
                </div>

                <select
                  value={selectedCourseFilter}
                  onChange={(e) => setSelectedCourseFilter(e.target.value)}
                  className="py-2 px-3 rounded-xl bg-purple-50/50 border border-purple-100 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="ALL">All Assigned Tracks</option>
                  {availableTracks.map((trk) => (
                    <option key={trk.id} value={trk.name}>
                      {trk.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students Table for Tablet & Desktop, Cards for Mobile */}
            <div className="overflow-x-auto border border-purple-50 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-purple-50/60 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-purple-100">
                  <tr>
                    <th className="py-3 px-4">Student Details</th>
                    <th className="py-3 px-4">Track</th>
                    <th className="py-3 px-4">Attendance Rate</th>
                    <th className="py-3 px-4">Course Progress</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Connect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50 font-medium text-slate-800">
                  {filteredStudents.map((std) => {
                    const statusColor =
                      std.status === "Excelling"
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : std.status === "Active"
                        ? "text-purple-700 bg-purple-50 border-purple-200"
                        : "text-amber-700 bg-amber-50 border-amber-200";

                    return (
                      <tr key={std.id} className="hover:bg-purple-50/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center shrink-0">
                              {std.fullName.charAt(0)}
                            </div>
                            <div>
                              <span className="font-extrabold text-slate-900 block">
                                {std.fullName}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {std.district} • {std.whatsappNum}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-purple-700">
                          {std.courseName}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900">
                              {std.attendanceRate}%
                            </span>
                            <span className="text-[10px] text-slate-400">
                              (Active: {std.lastActive})
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="w-28 space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span>{std.progressPercent}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-purple-100 overflow-hidden">
                              <div
                                className="h-full bg-purple-600 rounded-full"
                                style={{ width: `${std.progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${statusColor}`}
                          >
                            {std.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <a
                            href={`https://wa.me/91${std.whatsappNum.replace(/\D/g, "")}?text=Assalamu%20Alaikum%20${encodeURIComponent(
                              std.fullName
                            )},%20greeting%20from%20your%20Hanoon%20Academy%20instructor.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold text-[11px] transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredStudents.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No students found matching your search criteria.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: FACULTY PROFILE & WHATSAPP HOTLINE */}
        {activeTab === "profile" && (
          <div className="space-y-6 animate-in fade-in">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-purple-200 text-xs font-bold backdrop-blur-xs border border-white/10">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                  <span>Authorized Faculty Profile</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                  Faculty Contact &amp; Student WhatsApp Settings
                </h1>
                <p className="text-xs sm:text-sm text-purple-200/90 leading-relaxed font-medium">
                  Manage your direct communication channels for enrolled students. When learners tap &quot;Ask {currentUser.full_name} on WhatsApp&quot;, they connect with you instantly.
                </p>
              </div>
            </div>

            {/* Profile Overview & WhatsApp Form Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* WhatsApp Configuration Form */}
              <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-purple-100 shadow-md space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-purple-50">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-900">
                      Live Doubt Clearance WhatsApp Number
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Direct hotline used by enrolled learners in the Curriculum Hub
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveTeacherWhatsApp} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
                      <span>WhatsApp Number (VPA/Phone) *</span>
                      <span className="text-[10px] text-emerald-600 font-bold uppercase">Active Hotline</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={teacherWhatsApp}
                        onChange={(e) => setTeacherWhatsApp(e.target.value)}
                        placeholder="e.g. 9846012345 or +91 9846012345"
                        className="w-full pl-10 pr-4 py-3 rounded-2xl bg-purple-50/50 border border-purple-200 focus:border-purple-600 focus:bg-white text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 font-mono"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Enter your 10-digit number. The system automatically formats it for direct WhatsApp messaging.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={isSavingWhatsApp}
                      className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSavingWhatsApp ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Save &amp; Update Student Hotline</span>
                        </>
                      )}
                    </button>

                    {teacherWhatsApp && (
                      <a
                        href={formatWhatsAppLink(
                          teacherWhatsApp,
                          `Assalamu Alaikum ${currentUser.full_name}, this is a test student query from Hanoon Academy.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-3.5 px-5 rounded-2xl font-bold text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Test WhatsApp Link</span>
                      </a>
                    )}
                  </div>
                </form>
              </div>

              {/* Faculty Identity Card */}
              <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-purple-100 shadow-md space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-purple-50">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-lg flex items-center justify-center shadow-sm">
                    {currentUser.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 leading-tight">
                      {currentUser.full_name}
                    </h3>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full inline-block mt-1">
                      Faculty Member
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Email Account:</span>
                    <strong className="text-slate-800 font-mono text-[11px]">{currentUser.email}</strong>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Assigned Tracks:</span>
                    <strong className="text-purple-700 font-bold">
                      {isSuperAdmin
                        ? "Super Admin (All Tracks & Subjects)"
                        : (userAssignment?.assignedCourseNames.join(", ") || "Adaviyya Track")}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Active WhatsApp:</span>
                    <strong className="text-emerald-700 font-bold font-mono">
                      {teacherWhatsApp || "Not Configured Yet"}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center py-1.5">
                    <span className="text-slate-500 font-medium">Class Status:</span>
                    <span className="text-emerald-700 font-bold uppercase text-[10px] bg-emerald-50 px-2 py-0.5 rounded-md">
                      Live Broadcast Ready
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* SCHEDULE NEW CLASS MODAL */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-purple-100 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-purple-50">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                <h3 className="text-sm font-extrabold text-slate-900">
                  Schedule New Live Class
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Class Topic / Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Seerah: The Treaty of Hudaybiyyah"
                  value={newScheduleForm.title}
                  onChange={(e) =>
                    setNewScheduleForm({ ...newScheduleForm, title: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-slate-900 font-medium outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Academic Track *
                </label>
                <select
                  value={newScheduleForm.courseId}
                  onChange={(e) =>
                    setNewScheduleForm({ ...newScheduleForm, courseId: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-slate-900 font-medium outline-none focus:border-purple-400"
                >
                  {availableTracks.map((trk) => (
                    <option key={trk.id} value={trk.id}>
                      {trk.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={newScheduleForm.date}
                    onChange={(e) =>
                      setNewScheduleForm({ ...newScheduleForm, date: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-slate-900 font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Time (IST) *</label>
                  <input
                    type="time"
                    required
                    value={newScheduleForm.time}
                    onChange={(e) =>
                      setNewScheduleForm({ ...newScheduleForm, time: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-slate-900 font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Duration</label>
                  <input
                    type="text"
                    value={newScheduleForm.duration}
                    onChange={(e) =>
                      setNewScheduleForm({ ...newScheduleForm, duration: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-slate-900 font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Platform</label>
                  <select
                    value={newScheduleForm.platform}
                    onChange={(e) =>
                      setNewScheduleForm({
                        ...newScheduleForm,
                        platform: e.target.value as "Zoom" | "Google Meet",
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-slate-900 font-medium outline-none"
                  >
                    <option value="Zoom">Zoom</option>
                    <option value="Google Meet">Google Meet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Meeting URL
                </label>
                <input
                  type="url"
                  value={newScheduleForm.meetingLink}
                  onChange={(e) =>
                    setNewScheduleForm({ ...newScheduleForm, meetingLink: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 text-slate-900 font-medium outline-none focus:border-purple-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-sm cursor-pointer"
                >
                  Save & Notify Students
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
