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
} from "lucide-react";
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
import { FACULTY_MEMBERS } from "@/app/admin/page";
import { getAdaviyyaSubjects } from "@/services/subjectService";

interface ClassScheduleManagerSectionProps {
  currentUserRole?: string;
  currentUserName?: string;
}

export default function ClassScheduleManagerSection({
  currentUserRole = "Staff",
  currentUserName = "Staff Scheduler",
}: ClassScheduleManagerSectionProps) {
  // Form states
  const [courseId, setCourseId] = useState<string>("adaviyya");
  const [subjectId, setSubjectId] = useState<string>("seerah");
  const [teacherId, setTeacherId] = useState<string>(FACULTY_MEMBERS[0]?.id || "tch-01");
  const [classTitle, setClassTitle] = useState("Seerah: Prophetic Virtues & Moral Tarbiyah");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [time, setTime] = useState("19:30");
  const [duration, setDuration] = useState("60 mins");
  const [platform, setPlatform] = useState<"Google Meet" | "Zoom">("Google Meet");
  const [meetingLink, setMeetingLink] = useState("https://meet.google.com/han-oon-live");

  // UI feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLinkClassId, setCopiedLinkClassId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "LIVE_NOW" | "SCHEDULED" | "COMPLETED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [classes, setClasses] = useState<LiveClassSession[]>([]);
  const adaviyyaSubjects = getAdaviyyaSubjects();

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
  const isAdaviyya = courseId === "adaviyya";
  const selectedTeacher = FACULTY_MEMBERS.find((t) => t.id === teacherId) || FACULTY_MEMBERS[0];

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

  // Schedule a new class
  const handleScheduleClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classTitle.trim()) {
      setErrorMessage("Please enter a Class Title.");
      return;
    }
    if (!meetingLink.trim() || !meetingLink.startsWith("http")) {
      setErrorMessage("Please enter a valid Google Meet or Zoom meeting link (starts with https://).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const subjectObj = adaviyyaSubjects.find((s) => s.id === subjectId);
      const combinedTitle = isAdaviyya && subjectObj ? `${subjectObj.name}: ${classTitle.trim()}` : classTitle.trim();

      // 1. Save scheduled class session
      const newClass = scheduleNewClass({
        title: combinedTitle,
        courseId,
        courseName: selectedCourse.title,
        date,
        time,
        duration,
        meetingLink: meetingLink.trim(),
        platform,
        teacher_id: selectedTeacher.id,
        teacherName: selectedTeacher.name,
      });

      // 2. Automated Notification: Trigger immediate in-app and push notifications to students AND assigned teacher
      triggerClassScheduledNotification({
        classTitle: combinedTitle,
        courseName: selectedCourse.title,
        courseId,
        date,
        time,
        meetingLink: meetingLink.trim(),
        platform,
        teacherName: selectedTeacher.name,
        senderName: currentUserName,
      });

      // 3. Update view
      setClasses(getTeacherClasses());
      setSuccessMessage(`Class "${combinedTitle}" scheduled successfully! Push and in-app alerts sent to students and ${selectedTeacher.name}.`);
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

          <form onSubmit={handleScheduleClass} className="space-y-4">
            {/* 1. Target Course */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Target Course <span className="text-rose-500">*</span>
              </label>
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
            </div>

            {/* 2. Core Subject (if Adaviyya) */}
            {isAdaviyya && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Subject Track
                </label>
                <div className="grid grid-cols-2 gap-2">
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
              </div>
            )}

            {/* 3. Assigned Faculty */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Assigned Faculty / Instructor <span className="text-rose-500">*</span>
              </label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer"
              >
                {FACULTY_MEMBERS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.department}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. Class Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Class Session Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={classTitle}
                onChange={(e) => setClassTitle(e.target.value)}
                placeholder="e.g. Prophetic Virtues & Character Analysis"
                className="w-full py-2.5 px-3.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* 5. Date & Time */}
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

            {/* 6. Platform Selector */}
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

            {/* 7. Meeting Link Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                {platform} Meeting Link <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <LinkIcon className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="url"
                  required
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder={platform === "Google Meet" ? "https://meet.google.com/xxx-xxxx-xxx" : "https://zoom.us/j/xxxxxxxxx"}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* 8. Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Session Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="45 mins">45 mins</option>
                <option value="60 mins">60 mins (Standard)</option>
                <option value="75 mins">75 mins</option>
                <option value="90 mins">90 mins (Extended)</option>
              </select>
            </div>

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
                    <span>Scheduling & Triggering Alerts...</span>
                  </span>
                ) : (
                  <>
                    <Calendar className="w-4 h-4" />
                    <span>Schedule Class & Notify Students</span>
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
              Automated Push & In-App Alert Dispatch Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
