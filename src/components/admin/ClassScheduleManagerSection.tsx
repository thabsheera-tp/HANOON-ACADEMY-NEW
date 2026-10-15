"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  Video,
  Radio,
  Plus,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Users,
  Trash2,
  GraduationCap,
  Sparkles,
  Link as LinkIcon,
  Search,
  Filter,
  MessageCircle,
  Edit3,
  BookOpen,
  Layers,
  Star,
} from "lucide-react";
import LiveClassWhatsAppReminderModal from "@/components/admin/LiveClassWhatsAppReminderModal";
import {
  getTeacherClasses,
  scheduleNewClass,
  startLiveBroadcast,
  stopLiveBroadcast,
  LiveClassSession,
} from "@/services/teacherService";
import {
  triggerClassScheduledNotification,
  triggerClassLiveNotification,
} from "@/services/notificationService";
import { SHOWCASE_COURSES } from "@/components/mobile/ScreenCoursesList";
import {
  FacultyTeacher,
  fetchFacultyTeachers,
  getLocalFacultyTeachers,
  subscribeToFacultyTeachers,
} from "@/services/teacherFacultyService";
import { addSpecialClass } from "@/services/specialClassService";
import { getAdaviyyaSubjects } from "@/services/subjectService";
import {
  getLiveClassEnrolledRecipients,
  sendWhatsAppAlert,
} from "@/services/whatsappService";

interface ClassScheduleManagerSectionProps {
  currentUserRole?: string;
  currentUserName?: string;
}

export default function ClassScheduleManagerSection({
  currentUserRole = "Staff",
  currentUserName = "Staff Scheduler",
}: ClassScheduleManagerSectionProps) {
  // 1. Dynamic Faculty State (Real DB Teachers + Custom Input)
  const [facultyList, setFacultyList] = useState<FacultyTeacher[]>(() => getLocalFacultyTeachers());
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("");
  const [isCustomTeacher, setIsCustomTeacher] = useState<boolean>(false);
  const [customTeacherName, setCustomTeacherName] = useState<string>("");

  // 2. Target Course & Subject State (Standard + Custom / Extra)
  const [courseId, setCourseId] = useState<string>("adaviyya");
  const [isCustomCourse, setIsCustomCourse] = useState<boolean>(false);
  const [customCourseName, setCustomCourseName] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("seerah");
  const [isCustomSubject, setIsCustomSubject] = useState<boolean>(false);
  const [customSubjectName, setCustomSubjectName] = useState<string>("");

  // 3. Class Title & Schedule
  const [classTitle, setClassTitle] = useState("Seerah: Prophetic Virtues & Moral Tarbiyah");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [time, setTime] = useState("19:30");

  // 4. Flexible Session Duration
  const [duration, setDuration] = useState("60 mins");

  // 5. Platform & Meeting Link
  const [platform, setPlatform] = useState<"Google Meet" | "Zoom">("Google Meet");
  const [meetingLink, setMeetingLink] = useState("https://meet.google.com/han-oon-live");

  // 6. Special Class State (e.g. Burdah Live, Dua Majlis)
  const [isSpecialClass, setIsSpecialClass] = useState<boolean>(false);
  const [specialClassTitle, setSpecialClassTitle] = useState<string>("");
  const [specialClassLiveUrl, setSpecialClassLiveUrl] = useState<string>("");

  // UI feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLinkClassId, setCopiedLinkClassId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "LIVE_NOW" | "SCHEDULED" | "COMPLETED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWhatsAppClass, setSelectedWhatsAppClass] = useState<LiveClassSession | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);

  // Data states
  const [classes, setClasses] = useState<LiveClassSession[]>([]);
  const adaviyyaSubjects = getAdaviyyaSubjects();

  // Load real faculty teachers from DB & localStorage
  useEffect(() => {
    let isMounted = true;

    fetchFacultyTeachers()
      .then((teachers) => {
        if (!isMounted) return;
        if (teachers && teachers.length > 0) {
          setFacultyList(teachers);
          setSelectedTeacherId((prev) => prev || teachers[0].id);
        } else {
          // If no faculty registered yet, default to custom input mode
          setIsCustomTeacher(true);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch real faculty teachers:", err);
      });

    const unsubscribe = subscribeToFacultyTeachers((updated) => {
      if (!isMounted) return;
      setFacultyList(updated);
      if (updated.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(updated[0].id);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    setClasses(getTeacherClasses());

    const handleUpdate = () => {
      setClasses(getTeacherClasses());
    };

    window.addEventListener("hanoon_live_broadcast_started", handleUpdate);
    window.addEventListener("hanoon_live_broadcast_ended", handleUpdate);
    return () => {
      window.removeEventListener("hanoon_live_broadcast_started", handleUpdate);
      window.removeEventListener("hanoon_live_broadcast_ended", handleUpdate);
    };
  }, []);

  const selectedCourse = SHOWCASE_COURSES.find((c) => c.id === courseId) || SHOWCASE_COURSES[0];
  const isAdaviyya = courseId === "adaviyya" && !isCustomCourse;
  const activeSelectedTeacher = facultyList.find((t) => t.id === selectedTeacherId);

  // Quick switch of default meeting link based on selected platform
  const handlePlatformChange = (newPlatform: "Google Meet" | "Zoom") => {
    setPlatform(newPlatform);
    if (newPlatform === "Google Meet") {
      setMeetingLink("https://meet.google.com/han-oon-live");
    } else {
      setMeetingLink("https://zoom.us/j/hanoon-faculty-live");
    }
  };

  const handleCopyLink = (id: string, link: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(link);
      setCopiedLinkClassId(id);
      setTimeout(() => setCopiedLinkClassId(null), 2500);
    }
  };

  // Quick fill preset for Special Class (e.g. Burdah Live)
  const handleApplyBurdahPreset = () => {
    setIsSpecialClass(true);
    setSpecialClassTitle("Burdah Live Gathering");
    setSpecialClassLiveUrl("https://zoom.us/j/hanoon-burdah-live");
    if (!customTeacherName && !activeSelectedTeacher) {
      setCustomTeacherName("Usthad Dr. Faisal");
      setIsCustomTeacher(true);
    }
  };

  // Schedule a new class
  const handleScheduleClass = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Resolve Teacher Name
    let resolvedTeacherName = "";
    let resolvedTeacherId = "";

    if (isCustomTeacher) {
      resolvedTeacherName = customTeacherName.trim();
      resolvedTeacherId = `custom-${Date.now()}`;
    } else if (activeSelectedTeacher) {
      resolvedTeacherName = activeSelectedTeacher.fullName;
      resolvedTeacherId = activeSelectedTeacher.id;
    } else {
      resolvedTeacherName = customTeacherName.trim();
      resolvedTeacherId = `custom-${Date.now()}`;
    }

    if (!resolvedTeacherName) {
      setErrorMessage("Please select or enter the Teacher's name.");
      return;
    }

    // 2. Resolve Course Name & ID
    const resolvedCourseName = isCustomCourse
      ? customCourseName.trim()
      : selectedCourse.title;
    const resolvedCourseId = isCustomCourse
      ? (customCourseName.toLowerCase().replace(/[^a-z0-9]/g, "-") || "custom-course")
      : courseId;

    if (!resolvedCourseName) {
      setErrorMessage("Please provide a valid Target Course name.");
      return;
    }

    // 3. Resolve Meeting Link (Special Class URL takes priority if checked)
    const activeMeetingUrl = (isSpecialClass && specialClassLiveUrl.trim())
      ? specialClassLiveUrl.trim()
      : meetingLink.trim();

    if (!activeMeetingUrl || !activeMeetingUrl.startsWith("http")) {
      setErrorMessage("Please enter a valid Google Meet or Zoom meeting link (starts with https://).");
      return;
    }

    // 4. Resolve Title (Special Class Title, or Custom Subject + Class Title)
    let combinedTitle = classTitle.trim();
    if (isSpecialClass && specialClassTitle.trim()) {
      combinedTitle = specialClassTitle.trim();
    } else if (isCustomSubject && customSubjectName.trim()) {
      combinedTitle = `${customSubjectName.trim()}: ${classTitle.trim()}`;
    } else if (isAdaviyya) {
      const subjectObj = adaviyyaSubjects.find((s) => s.id === subjectId);
      if (subjectObj) {
        combinedTitle = `${subjectObj.name}: ${classTitle.trim()}`;
      }
    }

    if (!combinedTitle) {
      setErrorMessage("Please enter a Class Title.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Save scheduled class session with dynamic inputs
      const newClass = scheduleNewClass({
        title: combinedTitle,
        courseId: resolvedCourseId,
        courseName: resolvedCourseName,
        date,
        time,
        duration: duration.trim() || "60 mins",
        meetingLink: activeMeetingUrl,
        platform,
        teacher_id: resolvedTeacherId,
        teacherName: resolvedTeacherName,
        isSpecialClass,
        specialClassTitle: isSpecialClass ? (specialClassTitle.trim() || combinedTitle) : undefined,
        isCustomCourse,
        subjectName: isCustomSubject ? customSubjectName.trim() : undefined,
      });

      // 2. If Special Class, also synchronize with SpecialClassService
      if (isSpecialClass) {
        try {
          addSpecialClass({
            title: specialClassTitle.trim() || combinedTitle,
            subtitle: `Live Broadcast with ${resolvedTeacherName}`,
            instructor: resolvedTeacherName,
            category: "Gathering",
            badgeGradient: "bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shadow-lg",
            iconType: "sparkles",
            scheduleTime: `${date} • ${time} IST`,
            status: "UPCOMING",
            liveUrl: activeMeetingUrl,
            description: `Live interactive session: ${combinedTitle}. Conducted by ${resolvedTeacherName}.`,
          });
        } catch (specialErr) {
          console.warn("Could not sync to specialClassService:", specialErr);
        }
      }

      // 3. Automated Notification: Trigger immediate in-app and push notifications to students AND assigned teacher
      triggerClassScheduledNotification({
        classTitle: combinedTitle,
        courseName: resolvedCourseName,
        courseId: resolvedCourseId,
        date,
        time,
        meetingLink: activeMeetingUrl,
        platform,
        teacherName: resolvedTeacherName,
        senderName: currentUserName,
      });

      // 4. Automated WhatsApp Reminder: Dispatch automated 15-minute reminders to enrolled students
      getLiveClassEnrolledRecipients(resolvedCourseId, resolvedCourseName, activeMeetingUrl)
        .then((recipients) => {
          recipients.forEach((recipient) => {
            sendWhatsAppAlert({
              type: "LIVE_CLASS_REMINDER",
              studentName: recipient.name,
              phone: recipient.phone,
              courseName: resolvedCourseName,
              liveLink: activeMeetingUrl,
            });
          });
        })
        .catch((e) => console.warn("WhatsApp reminder auto-dispatch error:", e));

      // 5. Update view
      setClasses(getTeacherClasses());
      setSuccessMessage(
        isSpecialClass
          ? `⭐ Special Class "${combinedTitle}" published! Alerts dispatched to all students.`
          : `Class "${combinedTitle}" scheduled! In-app & WhatsApp alerts dispatched.`
      );

      // Reset specific fields
      if (isSpecialClass) {
        setSpecialClassTitle("");
        setSpecialClassLiveUrl("");
        setIsSpecialClass(false);
      }
      setClassTitle("Adaviyya: Comprehensive Review Session");

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Failed to schedule class:", err);
      setErrorMessage("Failed to schedule class. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start Live Broadcast
  const handleStartLive = (classItem: LiveClassSession) => {
    startLiveBroadcast(classItem.id);
    setClasses(getTeacherClasses());

    // Trigger urgent Live Now notification with 1-click Join link
    triggerClassLiveNotification({
      classTitle: classItem.title,
      courseName: classItem.courseName,
      courseId: classItem.courseId,
      meetingLink: classItem.meetingLink,
      platform: classItem.platform,
      teacherName: classItem.teacherName,
      senderName: currentUserName,
    });

    setSuccessMessage(`🔴 LIVE BROADCAST ACTIVATED for "${classItem.title}"! Students have received urgent push alerts to join now.`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Stop Live Broadcast
  const handleStopLive = (classItem: LiveClassSession) => {
    stopLiveBroadcast(classItem.id);
    setClasses(getTeacherClasses());
    setSuccessMessage(`Broadcast concluded for "${classItem.title}".`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Delete Class
  const handleDeleteClass = (id: string) => {
    if (confirm("Are you sure you want to cancel and remove this scheduled class?")) {
      const current = getTeacherClasses();
      const updated = current.filter((c) => c.id !== id);
      try {
        localStorage.setItem("hanoon_teacher_classes_v1", JSON.stringify(updated));
        setClasses(updated);
        setSuccessMessage("Scheduled class removed.");
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (e) {
        console.error("Failed to delete class:", e);
      }
    }
  };

  // Filtered classes
  const filteredClasses = classes.filter((c) => {
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.teacherName || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const liveClassesCount = classes.filter((c) => c.status === "LIVE_NOW").length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 rounded-3xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-purple-100">
              <Radio className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
              <span>Live Class & Broadcast Manager</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Class Notification & Schedule Manager
            </h2>
            <p className="text-xs sm:text-sm text-purple-100/90 max-w-xl leading-relaxed">
              Schedule interactive Google Meet & Zoom live classes, assign faculty instructors, and dispatch automated push alerts to enrolled students and assigned teachers.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200 block">
                Total Classes
              </span>
              <span className="text-2xl font-black text-white">
                {classes.length}
              </span>
            </div>
            {liveClassesCount > 0 && (
              <div className="bg-rose-500/90 backdrop-blur-md rounded-2xl p-3 border border-rose-400 text-center min-w-[90px] animate-pulse">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-100 block">
                  🔴 Live Now
                </span>
                <span className="text-2xl font-black text-white">
                  {liveClassesCount}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success & Error Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-3 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-3 animate-fade-in shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Scheduler Form + Scheduled Classes List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Schedule Class Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-xs space-y-5">
          <div className="border-b border-purple-100 pb-3 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>Schedule New Live Class</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Automated Push Alerts
            </span>
          </div>

          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-bold text-slate-500">
              Role Access:{" "}
              <span className="text-purple-700 font-extrabold uppercase bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                {currentUserRole === "super_admin" || currentUserRole === "admin" ? "Super Admin" : "Staff Verifier"}
              </span>
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <Check className="w-3 h-3" /> Full Scheduling Privileges
            </span>
          </div>

          <form onSubmit={handleScheduleClass} className="space-y-4">
            {/* 1. Target Course (Standard + Custom / Extra Button) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Target Course <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCourse(!isCustomCourse)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition-all flex items-center gap-1 ${
                    isCustomCourse
                      ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                      : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>{isCustomCourse ? "Standard Courses" : "Custom / Extra Course"}</span>
                </button>
              </div>

              {isCustomCourse ? (
                <div className="space-y-1 animate-fade-in">
                  <input
                    type="text"
                    required={isCustomCourse}
                    value={customCourseName}
                    onChange={(e) => setCustomCourseName(e.target.value)}
                    placeholder="Enter Custom Course (e.g. Burdah Live Gathering, Quran Tajweed Diploma)"
                    className="w-full py-2.5 px-3.5 rounded-xl bg-purple-50/50 border border-purple-300 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                  />
                  <span className="text-[10.5px] text-slate-400 block">
                    Custom track will be recognized dynamically across student timetables.
                  </span>
                </div>
              ) : (
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer"
                >
                  {SHOWCASE_COURSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.duration})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 2. Subject Track (Core Subject or Custom / Extra Subject) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Subject Track / Topic
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomSubject(!isCustomSubject)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition-all flex items-center gap-1 ${
                    isCustomSubject
                      ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                      : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  <Edit3 className="w-3 h-3" />
                  <span>{isCustomSubject ? "Standard Track" : "Custom / Extra Subject"}</span>
                </button>
              </div>

              {isCustomSubject || isCustomCourse ? (
                <div className="space-y-1 animate-fade-in">
                  <input
                    type="text"
                    value={customSubjectName}
                    onChange={(e) => setCustomSubjectName(e.target.value)}
                    placeholder="Enter Custom Subject or Module (e.g. Qasida Burdah Recitation, Tajweed Rules)"
                    className="w-full py-2.5 px-3.5 rounded-xl bg-purple-50/50 border border-purple-300 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              ) : isAdaviyya ? (
                <div className="grid grid-cols-2 gap-2 animate-fade-in">
                  {adaviyyaSubjects.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSubjectId(s.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                        subjectId === s.id
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-purple-50/50 text-slate-700 border-purple-100 hover:border-purple-300"
                      }`}
                    >
                      <span className="block">{s.name}</span>
                      <span className="text-[10px] block opacity-80 truncate">
                        {s.subtitle}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {/* 3. Assigned Faculty (Dynamic Real Teachers + Custom Input) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Assigned Faculty / Instructor <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomTeacher(!isCustomTeacher)}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border cursor-pointer transition-all flex items-center gap-1 ${
                    isCustomTeacher
                      ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                      : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  <span>{isCustomTeacher ? "Registered Faculty" : "+ Add Custom Teacher"}</span>
                </button>
              </div>

              {isCustomTeacher || facultyList.length === 0 ? (
                <div className="space-y-1 animate-fade-in">
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required={isCustomTeacher || facultyList.length === 0}
                      value={customTeacherName}
                      onChange={(e) => setCustomTeacherName(e.target.value)}
                      placeholder="Type Teacher's Full Name (e.g. Usthad Dr. Faisal Hudawi, Usthad Rashid)"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-purple-50/50 border border-purple-300 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                    />
                  </div>
                  <span className="text-[10.5px] text-slate-400 block">
                    Admins and Verifiers can manually enter any real scholar or guest lecturer.
                  </span>
                </div>
              ) : (
                <div className="space-y-1">
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => {
                      if (e.target.value === "__add_custom__") {
                        setIsCustomTeacher(true);
                      } else {
                        setSelectedTeacherId(e.target.value);
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer"
                  >
                    {facultyList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.fullName} — {t.specialization || "Faculty Scholar"}
                      </option>
                    ))}
                    <option value="__add_custom__">+ Type Custom Teacher Name...</option>
                  </select>
                </div>
              )}
            </div>

            {/* 4. Special Class Toggle & Link (Prominent for Burdah Live / Special Majlis) */}
            <div className={`p-3.5 rounded-2xl border transition-all ${
              isSpecialClass 
                ? "bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-rose-500/10 border-amber-300 ring-2 ring-amber-400/20 shadow-xs" 
                : "bg-slate-50/80 border-slate-200/80 hover:border-purple-200"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                    isSpecialClass ? "bg-amber-500 text-white shadow-xs" : "bg-purple-100 text-purple-600"
                  }`}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block flex items-center gap-1.5">
                      <span>Is this a Special Class?</span>
                      {isSpecialClass && (
                        <span className="text-[9px] uppercase font-black bg-amber-500 text-white px-1.5 py-0.2 rounded-md">
                          Live Event
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Prominently highlight on student apps (e.g. Burdah Live, Dua Gathering)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isSpecialClass && (
                    <button
                      type="button"
                      onClick={handleApplyBurdahPreset}
                      className="text-[10px] font-bold text-purple-700 bg-purple-100/70 hover:bg-purple-200 px-2 py-1 rounded-lg transition-colors cursor-pointer hidden sm:inline-block"
                      title="Quick Fill Burdah Live Preset"
                    >
                      + Burdah Live Preset
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSpecialClass(!isSpecialClass)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                      isSpecialClass ? "bg-amber-500" : "bg-slate-300"
                    }`}
                    role="switch"
                    aria-checked={isSpecialClass}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isSpecialClass ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {isSpecialClass && (
                <div className="mt-3.5 pt-3.5 border-t border-amber-200/60 space-y-3 animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                        <span>Special Class Event Title</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setSpecialClassTitle("Burdah Live Gathering");
                          setSpecialClassLiveUrl("https://zoom.us/j/hanoon-burdah-live");
                        }}
                        className="text-[10px] font-bold text-amber-800 underline hover:text-amber-950 cursor-pointer"
                      >
                        Insert &quot;Burdah Live&quot;
                      </button>
                    </div>
                    <input
                      type="text"
                      required={isSpecialClass}
                      value={specialClassTitle}
                      onChange={(e) => setSpecialClassTitle(e.target.value)}
                      placeholder="e.g. Burdah Live Gathering & Spiritual Salawat"
                      className="w-full py-2.5 px-3 rounded-xl bg-white border border-amber-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 text-xs sm:text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-amber-600" />
                      <span>Dedicated Special Class Live Link URL</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        required={isSpecialClass}
                        value={specialClassLiveUrl}
                        onChange={(e) => setSpecialClassLiveUrl(e.target.value)}
                        placeholder="https://zoom.us/j/hanoon-burdah-live or Google Meet link"
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-amber-300 focus:border-amber-600 focus:ring-1 focus:ring-amber-500 text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 font-mono shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 5. Class Title (General Session) */}
            {!isSpecialClass && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Class Session Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required={!isSpecialClass}
                  value={classTitle}
                  onChange={(e) => setClassTitle(e.target.value)}
                  placeholder="e.g. Prophetic Virtues & Character Analysis"
                  className="w-full py-2.5 px-3.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            )}

            {/* 6. Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs font-semibold text-slate-900 outline-none cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Time (IST) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs font-semibold text-slate-900 outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* 7. Flexible Session Duration (Text Input replacing strict dropdown) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Session Duration <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-bold text-purple-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Flexible Custom Entry
                </span>
              </div>
              <input
                type="text"
                required
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="Type flexible duration (e.g. 45 mins, 1.5 hours, 90 mins)"
                className="w-full py-2.5 px-3.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
              <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                <span className="text-[10px] text-slate-400 font-bold mr-1">Presets:</span>
                {["45 mins", "60 mins", "1.5 hours", "2 hours", "90 mins"].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDuration(preset)}
                    className={`py-0.5 px-2 rounded-lg text-[10.5px] font-bold border cursor-pointer transition-all ${
                      duration === preset
                        ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                        : "bg-purple-50/60 text-purple-700 border-purple-200 hover:bg-purple-100"
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* 8. Platform Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Broadcasting Platform <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handlePlatformChange("Google Meet")}
                  className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    platform === "Google Meet"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-extrabold shadow-2xs"
                      : "bg-purple-50/30 border-purple-100 text-slate-600 font-medium hover:border-purple-200"
                  }`}
                >
                  <Video className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs">Google Meet</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlatformChange("Zoom")}
                  className={`py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 cursor-pointer transition-all ${
                    platform === "Zoom"
                      ? "bg-blue-50 border-blue-500 text-blue-800 font-extrabold shadow-2xs"
                      : "bg-purple-50/30 border-purple-100 text-slate-600 font-medium hover:border-purple-200"
                  }`}
                >
                  <Video className="w-4 h-4 text-blue-600" />
                  <span className="text-xs">Zoom</span>
                </button>
              </div>
            </div>

            {/* 9. Standard Meeting Link Input (if not special class) */}
            {!isSpecialClass && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">
                  {platform} Meeting Link <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    required={!isSpecialClass}
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    placeholder={platform === "Google Meet" ? "https://meet.google.com/xxx-xxxx-xxx" : "https://zoom.us/j/xxxxxxxxx"}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Publishing & Triggering Alerts...</span>
                  </span>
                ) : (
                  <>
                    {isSpecialClass ? (
                      <Sparkles className="w-4 h-4 text-amber-300" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                    <span>
                      {isSpecialClass
                        ? "Publish Special Class & Notify Students"
                        : "Schedule Class & Notify Students"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Scheduled Classes Directory & Live Broadcaster (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-purple-600" />
                  <span>Class Schedule & Broadcast Queue</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Manage live streaming sessions and instant Google Meet / Zoom links.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="py-1 px-2.5 rounded-lg bg-purple-50 text-[11px] font-bold text-slate-700 border border-purple-200 outline-none cursor-pointer"
                >
                  <option value="ALL">All ({classes.length})</option>
                  <option value="LIVE_NOW">🔴 Live Now</option>
                  <option value="SCHEDULED">📅 Scheduled</option>
                  <option value="COMPLETED">✓ Completed</option>
                </select>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search classes by title, course, or teacher..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-purple-50/40 border border-purple-100 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Classes List */}
            {filteredClasses.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-purple-50/30 border border-purple-100/60 p-6 space-y-2">
                <Calendar className="w-8 h-8 text-purple-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">No classes found</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  {searchQuery || statusFilter !== "ALL"
                    ? "Try clearing your search or status filters."
                    : "Use the scheduling form on the left to schedule your first live class."}
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {filteredClasses.map((item) => {
                  const isLive = item.status === "LIVE_NOW";
                  const isCompleted = item.status === "COMPLETED";

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 shadow-2xs ${
                        isLive
                          ? "bg-rose-50/50 border-rose-300 ring-2 ring-rose-200"
                          : isCompleted
                          ? "bg-slate-50 border-slate-200 opacity-80"
                          : "bg-purple-50/30 border-purple-100 hover:border-purple-200"
                      }`}
                    >
                      {/* Top Row: Course Badge + Status + Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                              {item.courseName}
                            </span>
                            {item.isSpecialClass && (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs">
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                <span>Special Class</span>
                              </span>
                            )}
                            {item.isCustomCourse && (
                              <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                                Custom Track
                              </span>
                            )}
                            <span
                              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                isLive
                                  ? "bg-rose-600 text-white animate-pulse"
                                  : isCompleted
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />}
                              <span>{isLive ? "LIVE NOW" : isCompleted ? "COMPLETED" : "SCHEDULED"}</span>
                            </span>
                            <span className="text-[10px] font-bold text-slate-500">
                              {item.platform}
                            </span>
                          </div>

                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                            {item.title}
                          </h4>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Calendar className="w-3 h-3 text-purple-600" />
                              {item.date} • {item.time} IST
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {item.duration}
                            </span>
                            {item.teacherName && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1 font-bold text-purple-700">
                                  <GraduationCap className="w-3 h-3" />
                                  {item.teacherName}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Broadcast Toggle Buttons */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {isLive ? (
                            <button
                              type="button"
                              onClick={() => handleStopLive(item)}
                              className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs transition-colors cursor-pointer"
                            >
                              Conclude Live
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartLive(item)}
                              className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                            >
                              <Radio className="w-3 h-3" />
                              <span>Start Live Now</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteClass(item.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Class"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Row: Meeting Link & Copy */}
                      <div className="pt-2 border-t border-purple-100/60 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-xs truncate max-w-[280px]">
                          <LinkIcon className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="text-[11px] font-mono text-purple-700 truncate">
                            {item.meetingLink}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopyLink(item.id, item.meetingLink)}
                            className="py-1 px-2.5 rounded-lg bg-white border border-purple-200 text-slate-700 font-bold text-[11px] flex items-center gap-1 hover:bg-purple-50 transition-colors cursor-pointer"
                          >
                            {copiedLinkClassId === item.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" />
                                <span className="text-emerald-700">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-slate-400" />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>

                          {/* Send WhatsApp Alert (15-Min Reminder) */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedWhatsAppClass(item);
                              setIsWhatsAppModalOpen(true);
                            }}
                            className="py-1 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            title="Send 15-Minute WhatsApp Reminder to Enrolled Students"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Send WhatsApp Alert</span>
                          </button>

                          <a
                            href={item.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <span>Open {item.platform}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-purple-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Showing {filteredClasses.length} of {classes.length} classes</span>
            <span className="font-medium text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Automated Push & WhatsApp Alert Dispatch Active
            </span>
          </div>
        </div>
      </div>

      {/* 15-Min Live Class WhatsApp Reminder Modal */}
      <LiveClassWhatsAppReminderModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => {
          setIsWhatsAppModalOpen(false);
          setSelectedWhatsAppClass(null);
        }}
        classSession={selectedWhatsAppClass}
      />
    </div>
  );
}
