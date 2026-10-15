"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Users,
  Search,
  Filter,
  Check,
  Send,
  MessageCircle,
  Save,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  AttendanceRecord,
  AttendanceStatus,
  getLocalAttendanceRecords,
  recordStudentAttendance,
  batchRecordAttendance,
  getWhatsAppAttendanceAlertUrl,
  calculateStudentAttendanceSummary,
} from "@/services/attendanceService";
import { UnifiedStudentRegistration } from "@/services/studentService";

interface AttendanceTrackerSectionProps {
  registrations: UnifiedStudentRegistration[];
}

const COURSES_CONFIG = [
  {
    id: "adaviyya",
    title: "Athaviy (അഥവിയ)",
    subjects: [
      { id: "seerah", name: "Seerah (Prophetic Biography)" },
      { id: "haddad", name: "Ratib al-Haddad & Tajweed" },
      { id: "fiqh", name: "Fiqh (Daily Islamic Jurisprudence)" },
      { id: "hadith", name: "Hadith (Prophetic Traditions & Morals)" },
    ],
  },
  {
    id: "home-tuition",
    title: "Home Tuition (ഹോം ട്യൂഷൻ)",
    subjects: [
      { id: "all-academic", name: "All Academic Subjects" },
      { id: "maths", name: "Mathematics & Science" },
      { id: "english", name: "English Language Mastery" },
    ],
  },
  {
    id: "fashion-designing",
    title: "Fashion Designing (ഫാഷൻ ഡിസൈനിങ്)",
    subjects: [
      { id: "pattern-drafting", name: "Pattern Drafting & Measurement" },
      { id: "garment-construction", name: "Garment Construction & Tailoring" },
      { id: "modest-apparel", name: "Modest Apparel & Islamic Fashion" },
    ],
  },
  {
    id: "special-classes",
    title: "Special Classes & Assemblies",
    subjects: [
      { id: "tajweed-live", name: "Tajweed Precision & Recitation" },
      { id: "burdah-live", name: "Qasida Burdah Live Gathering" },
    ],
  },
];

export default function AttendanceTrackerSection({
  registrations,
}: AttendanceTrackerSectionProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("adaviyya");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("seerah");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [sessionRecords, setSessionRecords] = useState<Record<string, AttendanceStatus>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Load existing records
  useEffect(() => {
    const records = getLocalAttendanceRecords();
    setAllAttendanceRecords(records);
  }, []);

  const currentCourse = useMemo(() => {
    return COURSES_CONFIG.find((c) => c.id === selectedCourseId) || COURSES_CONFIG[0];
  }, [selectedCourseId]);

  // Filter students enrolled in the selected course or all students if general
  const eligibleStudents = useMemo(() => {
    const list = registrations.filter((r) => {
      // Exclude rejected registrations
      if (r.paymentStatus === "REJECTED") return false;

      const cId = (r.courseId || "").toLowerCase();
      const choice = (r.courseChoice || "").toLowerCase();

      if (selectedCourseId === "adaviyya") {
        return cId.includes("adaviyya") || cId.includes("athaviy") || choice.includes("adaviyya") || choice.includes("athaviy") || (!cId.includes("tuition") && !cId.includes("fashion"));
      }
      if (selectedCourseId === "home-tuition") {
        return cId.includes("tuition") || choice.includes("tuition");
      }
      if (selectedCourseId === "fashion-designing") {
        return cId.includes("fashion") || choice.includes("fashion");
      }
      return true;
    });

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase();
    return list.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.whatsappNum.includes(q) ||
        s.district.toLowerCase().includes(q)
    );
  }, [registrations, selectedCourseId, searchQuery]);

  // Sync state for the selected session
  useEffect(() => {
    const existing = allAttendanceRecords.filter(
      (r) =>
        r.courseId === selectedCourseId &&
        r.subjectId === selectedSubjectId &&
        r.date === selectedDate
    );

    const map: Record<string, AttendanceStatus> = {};
    existing.forEach((r) => {
      map[r.studentId] = r.status;
    });
    setSessionRecords(map);
  }, [selectedCourseId, selectedSubjectId, selectedDate, allAttendanceRecords]);

  // 1-Tap Toggle Status for a Student
  const handleSetStatus = async (student: UnifiedStudentRegistration, status: AttendanceStatus) => {
    const newSession = { ...sessionRecords, [student.studentId]: status };
    setSessionRecords(newSession);

    const updated = await recordStudentAttendance({
      studentId: student.studentId,
      studentName: student.fullName,
      studentPhone: student.whatsappNum,
      courseId: selectedCourseId,
      subjectId: selectedSubjectId,
      date: selectedDate,
      status,
    });

    setAllAttendanceRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === updated.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updated;
        return copy;
      }
      return [updated, ...prev];
    });
  };

  // Mark All Present Shortcut
  const handleMarkAllPresent = async () => {
    setIsSaving(true);
    const newSession = { ...sessionRecords };
    const batchPayload = eligibleStudents.map((s) => {
      newSession[s.studentId] = "PRESENT";
      return {
        studentId: s.studentId,
        studentName: s.fullName,
        studentPhone: s.whatsappNum,
        courseId: selectedCourseId,
        subjectId: selectedSubjectId,
        date: selectedDate,
        status: "PRESENT" as AttendanceStatus,
      };
    });

    setSessionRecords(newSession);
    const results = await batchRecordAttendance(batchPayload);
    setAllAttendanceRecords(getLocalAttendanceRecords());
    setIsSaving(false);
    setFeedbackMsg(`Marked all ${results.length} students as PRESENT for this session!`);
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  // Quick stats for current session
  const stats = useMemo(() => {
    const total = eligibleStudents.length;
    let present = 0;
    let absent = 0;
    let late = 0;
    let excused = 0;

    eligibleStudents.forEach((s) => {
      const status = sessionRecords[s.studentId];
      if (status === "PRESENT") present++;
      else if (status === "ABSENT") absent++;
      else if (status === "LATE") late++;
      else if (status === "EXCUSED") excused++;
    });

    const attended = present + late;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 100;

    return { total, present, absent, late, excused, rate };
  }, [eligibleStudents, sessionRecords]);

  const currentSubjectObj = currentCourse.subjects.find((s) => s.id === selectedSubjectId) || currentCourse.subjects[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-emerald-800 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <Calendar className="w-5 h-5 text-emerald-300" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-200">
              Live Attendance Register & Parent WhatsApp Alerts
            </span>
          </div>
          <h2 className="text-2xl font-black mt-2 text-white">Daily Class Attendance Tracker</h2>
          <p className="text-xs text-emerald-200 mt-1 max-w-xl">
            Track daily student participation, calculate percentage rates, and notify parents directly on WhatsApp with 1 tap.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            type="button"
            onClick={handleMarkAllPresent}
            disabled={isSaving || eligibleStudents.length === 0}
            className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-black text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>Mark All Present</span>
          </button>
        </div>
      </div>

      {/* Session Controls: Course, Subject & Date Picker */}
      <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Course Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Course Track
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => {
                const newC = e.target.value;
                setSelectedCourseId(newC);
                const conf = COURSES_CONFIG.find((c) => c.id === newC);
                if (conf && conf.subjects[0]) setSelectedSubjectId(conf.subjects[0].id);
              }}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-purple-50/50 border border-purple-200 text-xs font-black text-slate-800 outline-none focus:border-purple-600 focus:bg-white"
            >
              {COURSES_CONFIG.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Subject / Hub Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Class Session / Subject
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-purple-50/50 border border-purple-200 text-xs font-black text-slate-800 outline-none focus:border-purple-600 focus:bg-white"
            >
              {currentCourse.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Attendance Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-purple-50/50 border border-purple-200 text-xs font-black text-slate-800 outline-none focus:border-purple-600 focus:bg-white"
            />
          </div>
        </div>
      </div>

      {/* Session Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-2xs text-center space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Enrolled</span>
          <p className="text-xl font-black text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-800">Present</span>
          <p className="text-xl font-black text-emerald-700">{stats.present}</p>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] font-black uppercase text-rose-800">Absent</span>
          <p className="text-xl font-black text-rose-700">{stats.absent}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center space-y-1">
          <span className="text-[10px] font-black uppercase text-amber-800">Late</span>
          <p className="text-xl font-black text-amber-700">{stats.late}</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl text-center space-y-1 col-span-2 sm:col-span-1">
          <span className="text-[10px] font-black uppercase text-purple-800">Attendance %</span>
          <p className="text-xl font-black text-purple-700">{stats.rate}%</p>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-black flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Student Attendance Roster */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Class Roster & Attendance Marking
            </h3>
            <p className="text-xs text-slate-500">
              {currentCourse.title} • {currentSubjectObj.name} • {selectedDate}
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-purple-50/50 border border-purple-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Student List */}
        <div className="divide-y divide-purple-50 border border-purple-100 rounded-2xl overflow-hidden">
          {eligibleStudents.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-400 font-bold space-y-1">
              <Users className="w-8 h-8 mx-auto text-slate-300" />
              <p>No students found for this course filter.</p>
            </div>
          ) : (
            eligibleStudents.map((std) => {
              const currentStatus = sessionRecords[std.studentId] || "PRESENT";
              const summary = calculateStudentAttendanceSummary(
                std.studentId,
                std.fullName,
                allAttendanceRecords
              );

              const waUrl = getWhatsAppAttendanceAlertUrl(
                std.fullName,
                std.whatsappNum,
                currentCourse.title,
                currentSubjectObj.name,
                selectedDate,
                currentStatus,
                summary.attendanceRate
              );

              return (
                <div
                  key={std.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-purple-50/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 font-black text-sm flex items-center justify-center shrink-0">
                      {std.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-sm text-slate-900">
                          {std.fullName}
                        </h4>
                        <span className="text-[10px] font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                          {summary.attendanceRate}% Rate
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {std.whatsappNum} • {std.district}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {/* Status Toggles: P, A, L, E */}
                    <div className="p-1 rounded-2xl bg-slate-100 flex items-center gap-1 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => handleSetStatus(std, "PRESENT")}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                          currentStatus === "PRESENT"
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-emerald-700"
                        }`}
                        title="Mark Present"
                      >
                        P
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetStatus(std, "ABSENT")}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                          currentStatus === "ABSENT"
                            ? "bg-rose-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-rose-700"
                        }`}
                        title="Mark Absent"
                      >
                        A
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetStatus(std, "LATE")}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                          currentStatus === "LATE"
                            ? "bg-amber-500 text-white shadow-xs"
                            : "text-slate-600 hover:text-amber-700"
                        }`}
                        title="Mark Late"
                      >
                        L
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSetStatus(std, "EXCUSED")}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                          currentStatus === "EXCUSED"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 hover:text-indigo-700"
                        }`}
                        title="Mark Excused"
                      >
                        E
                      </button>
                    </div>

                    {/* WhatsApp Parent Notification */}
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Send WhatsApp attendance alert to parent"
                      className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden md:inline">Alert Parent</span>
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
