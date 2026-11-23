"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Trophy,
  Medal,
  Award,
  Calendar,
  Users,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Filter,
  MessageCircle,
  FileSpreadsheet,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";
import {
  fetchMonthlyAttendanceAnalytics,
  MonthlyAttendanceSummary,
  MonthlyStudentAttendance,
  getWhatsAppAttendanceAlertUrl,
} from "@/services/attendanceService";
import { UnifiedStudentRegistration } from "@/services/studentService";

interface MonthlyAttendanceAnalyticsProps {
  registrations: UnifiedStudentRegistration[];
}

const COURSES_CONFIG = [
  { id: "all", title: "All Courses & Tracks" },
  { id: "adaviyya", title: "Athaviy (അഥവിയ)" },
  { id: "home-tuition", title: "Home Tuition (ഹോം ട്യൂഷൻ)" },
  { id: "fashion-designing", title: "Fashion Designing (ഫാഷൻ ഡിസൈനിങ്)" },
  { id: "special-classes", title: "Special Classes & Assemblies" },
];

export default function MonthlyAttendanceAnalytics({
  registrations,
}: MonthlyAttendanceAnalyticsProps) {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tierFilter, setTierFilter] = useState<"all" | "high" | "low">("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<MonthlyAttendanceSummary | null>(null);

  // Load monthly summary whenever month or course changes
  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await fetchMonthlyAttendanceAnalytics({
        month: selectedMonth,
        courseId: selectedCourseId,
        enrolledStudents: registrations,
      });
      setSummary(data);
    } catch (err) {
      console.warn("Failed to load monthly attendance analytics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [selectedMonth, selectedCourseId, registrations]);

  // Listen to live attendance updates
  useEffect(() => {
    const handleUpdate = () => {
      loadAnalytics();
    };
    window.addEventListener("hanoon_attendance_updated", handleUpdate);
    return () => {
      window.removeEventListener("hanoon_attendance_updated", handleUpdate);
    };
  }, [selectedMonth, selectedCourseId]);

  // Filter students in the table by search query and tier
  const filteredStudents = useMemo(() => {
    if (!summary) return [];
    let list = summary.allStudents;

    if (tierFilter === "high") {
      list = list.filter((s) => s.attendancePercentage >= 90);
    } else if (tierFilter === "low") {
      list = list.filter((s) => s.attendancePercentage < 75);
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.studentPhone.includes(q) ||
        (s.district && s.district.toLowerCase().includes(q))
    );
  }, [summary, searchQuery, tierFilter]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!summary || summary.allStudents.length === 0) return;

    const headers = [
      "Rank",
      "Student Name",
      "WhatsApp Number",
      "District",
      "Course Track",
      "Month",
      "Total Classes Held",
      "Days Present (P)",
      "Days Absent/Leave (A/L)",
      "Attendance Percentage",
      "Status Tier",
    ];

    const rows = summary.allStudents.map((s) => {
      const tier =
        s.attendancePercentage >= 90
          ? "High (>=90%)"
          : s.attendancePercentage < 75
          ? "Low Attendance (<75%)"
          : "Active (75-89%)";

      return [
        s.rank || "",
        `"${s.studentName.replace(/"/g, '""')}"`,
        `"${s.studentPhone || ""}"`,
        `"${s.district || "N/A"}"`,
        `"${s.courseId}"`,
        `"${summary.monthLabel}"`,
        s.totalClasses,
        s.daysPresent,
        s.daysAbsent,
        `${s.attendancePercentage}%`,
        `"${tier}"`,
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const cleanCourse = selectedCourseId === "all" ? "All_Courses" : selectedCourseId;
    link.setAttribute(
      "download",
      `Hanoon_Academy_Attendance_${cleanCourse}_${selectedMonth}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const currentCourseTitle =
    COURSES_CONFIG.find((c) => c.id === selectedCourseId)?.title || "All Courses";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-purple-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <Trophy className="w-5 h-5 text-amber-300" />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-purple-200">
              Academic Intelligence & Leaderboard
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Monthly Attendance Analytics
          </h2>
          <p className="text-xs text-purple-200 max-w-xl">
            Accurate monthly attendance aggregation, Top 3 attendees recognition, and automated
            low-attendance alerts across all courses.
          </p>
        </div>

        {/* Action: Export CSV */}
        <div className="flex items-center gap-2.5 self-start md:self-auto relative z-10">
          <button
            type="button"
            onClick={loadAnalytics}
            className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={!summary || summary.allStudents.length === 0}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Monthly Report (CSV)</span>
          </button>
        </div>
      </div>

      {/* 2. Controls Bar: Month/Year Picker & Course Filter */}
      <div className="bg-white p-5 rounded-3xl border border-purple-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Month / Year Picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              <span>Select Month & Year</span>
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-purple-50/50 border border-purple-200 text-xs font-black text-slate-800 outline-none focus:border-purple-600 focus:bg-white transition-all"
            />
          </div>

          {/* Course Selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-600" />
              <span>Course Track Filter</span>
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl bg-purple-50/50 border border-purple-200 text-xs font-black text-slate-800 outline-none focus:border-purple-600 focus:bg-white transition-all"
            >
              {COURSES_CONFIG.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-2xs space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Total Classes Held</span>
          <p className="text-2xl font-black text-slate-900">
            {summary ? summary.totalClassesHeld : 0}{" "}
            <span className="text-xs font-semibold text-slate-400">sessions</span>
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-black uppercase text-purple-700">Batch Average %</span>
          <p className="text-2xl font-black text-purple-900">
            {summary ? summary.averageAttendanceRate : 0}%
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-black uppercase text-emerald-800">
            High Attendance (≥90%)
          </span>
          <p className="text-2xl font-black text-emerald-700">
            {summary ? summary.highAttendanceCount : 0}{" "}
            <span className="text-xs font-semibold text-emerald-600">students</span>
          </p>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-black uppercase text-rose-800">
            Low Attendance (&lt;75%)
          </span>
          <p className="text-2xl font-black text-rose-700">
            {summary ? summary.lowAttendanceCount : 0}{" "}
            <span className="text-xs font-semibold text-rose-600">alerts</span>
          </p>
        </div>
      </div>

      {/* 4. Top 3 Attendees Leaderboard Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-black text-slate-900">
              Top 3 Attendees Podium ({summary?.monthLabel || selectedMonth})
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">{currentCourseTitle}</span>
        </div>

        {!summary || summary.topAttendees.length === 0 ? (
          <div className="p-8 rounded-3xl bg-white border border-purple-100 text-center space-y-2">
            <Trophy className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-bold text-slate-500">
              No attendance records logged for {summary?.monthLabel || selectedMonth}.
            </p>
            <p className="text-[11px] text-slate-400">
              Mark attendance in the Daily Register tab or join live classes to populate the leaderboard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* 🥇 1st Place */}
            {summary.topAttendees[0] && (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-amber-500/10 via-amber-50/50 to-white border-2 border-amber-300 shadow-md relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-200/80 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      🥇 1st Place Winner
                    </span>
                    <h4 className="text-lg font-black text-slate-900 mt-1">
                      {summary.topAttendees[0].studentName}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {summary.topAttendees[0].district || "Hanoon Scholar"} • {summary.topAttendees[0].studentPhone}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white font-black text-xl flex items-center justify-center shadow-md shrink-0">
                    🥇
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Classes Attended</span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {summary.topAttendees[0].daysPresent} / {summary.topAttendees[0].totalClasses} days
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Attendance Rate</span>
                    <span className="text-lg font-black text-amber-700">
                      {summary.topAttendees[0].attendancePercentage}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 🥈 2nd Place */}
            {summary.topAttendees[1] && (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-200/40 via-slate-50 to-white border border-slate-300 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      🥈 2nd Place
                    </span>
                    <h4 className="text-base font-black text-slate-900 mt-1">
                      {summary.topAttendees[1].studentName}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {summary.topAttendees[1].district || "Hanoon Scholar"} • {summary.topAttendees[1].studentPhone}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-slate-300 text-slate-800 font-black text-lg flex items-center justify-center shadow-xs shrink-0">
                    🥈
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Classes Attended</span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {summary.topAttendees[1].daysPresent} / {summary.topAttendees[1].totalClasses} days
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Attendance Rate</span>
                    <span className="text-lg font-black text-slate-800">
                      {summary.topAttendees[1].attendancePercentage}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 🥉 3rd Place */}
            {summary.topAttendees[2] && (
              <div className="p-5 rounded-3xl bg-gradient-to-br from-orange-500/10 via-orange-50/30 to-white border border-orange-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-orange-800 bg-orange-100 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      🥉 3rd Place
                    </span>
                    <h4 className="text-base font-black text-slate-900 mt-1">
                      {summary.topAttendees[2].studentName}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {summary.topAttendees[2].district || "Hanoon Scholar"} • {summary.topAttendees[2].studentPhone}
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-orange-200 text-orange-900 font-black text-lg flex items-center justify-center shadow-xs shrink-0">
                    🥉
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-orange-200 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Classes Attended</span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {summary.topAttendees[2].daysPresent} / {summary.topAttendees[2].totalClasses} days
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">Attendance Rate</span>
                    <span className="text-lg font-black text-orange-800">
                      {summary.topAttendees[2].attendancePercentage}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Complete Ranked Attendance Table */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Ranked Monthly Attendance Register
            </h3>
            <p className="text-xs text-slate-500">
              {currentCourseTitle} • {summary?.monthLabel || selectedMonth} (
              {filteredStudents.length} students listed)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Filter Pills */}
            <div className="p-1 rounded-2xl bg-slate-100 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTierFilter("all")}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                  tierFilter === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTierFilter("high")}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                  tierFilter === "high"
                    ? "bg-emerald-600 text-white shadow-2xs font-extrabold"
                    : "text-emerald-700 hover:bg-emerald-50"
                }`}
              >
                ≥90% High
              </button>
              <button
                type="button"
                onClick={() => setTierFilter("low")}
                className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                  tierFilter === "low"
                    ? "bg-rose-600 text-white shadow-2xs font-extrabold"
                    : "text-rose-700 hover:bg-rose-50"
                }`}
              >
                &lt;75% Low
              </button>
            </div>

            {/* Search Box */}
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search student or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-purple-50/50 border border-purple-200 text-xs font-bold text-slate-800 outline-none focus:border-purple-600 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto border border-purple-100 rounded-2xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-purple-50/70 border-b border-purple-100 text-[11px] font-black uppercase text-slate-600">
              <tr>
                <th className="py-3 px-3.5 text-center w-12">Rank</th>
                <th className="py-3 px-3.5">Student Details</th>
                <th className="py-3 px-3.5 text-center">Classes Held</th>
                <th className="py-3 px-3.5 text-center">Present (P)</th>
                <th className="py-3 px-3.5 text-center">Absent/Leave (A/L)</th>
                <th className="py-3 px-3.5 text-center">Attendance %</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Parent Alert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold space-y-2">
                    <Users className="w-8 h-8 mx-auto text-slate-300" />
                    <p>No students match the current filter.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std) => {
                  const isHigh = std.attendancePercentage >= 90;
                  const isLow = std.attendancePercentage < 75;

                  const waUrl = getWhatsAppAttendanceAlertUrl(
                    std.studentName,
                    std.studentPhone,
                    currentCourseTitle,
                    `${summary?.monthLabel || selectedMonth} Review`,
                    `${summary?.monthLabel || selectedMonth}`,
                    isHigh ? "PRESENT" : isLow ? "ABSENT" : "PRESENT",
                    std.attendancePercentage
                  );

                  return (
                    <tr
                      key={std.studentId}
                      className="hover:bg-purple-50/20 transition-colors"
                    >
                      {/* Rank */}
                      <td className="py-3 px-3.5 text-center font-black">
                        {std.rank === 1 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 font-black text-xs shadow-2xs">
                            🥇
                          </span>
                        ) : std.rank === 2 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-200 text-slate-800 border border-slate-300 font-black text-xs shadow-2xs">
                            🥈
                          </span>
                        ) : std.rank === 3 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-orange-100 text-orange-900 border border-orange-300 font-black text-xs shadow-2xs">
                            🥉
                          </span>
                        ) : (
                          <span className="text-slate-500 font-extrabold">#{std.rank}</span>
                        )}
                      </td>

                      {/* Student Details */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center shrink-0">
                            {std.studentName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 leading-tight">
                              {std.studentName}
                            </p>
                            <p className="text-[10.5px] text-slate-500 font-medium">
                              {std.studentPhone || "No Phone"} {std.district ? `• ${std.district}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Total Classes Held */}
                      <td className="py-3 px-3.5 text-center font-bold text-slate-700">
                        {std.totalClasses}
                      </td>

                      {/* Present (P) */}
                      <td className="py-3 px-3.5 text-center font-black text-emerald-700">
                        {std.daysPresent}
                      </td>

                      {/* Absent / Leave */}
                      <td className="py-3 px-3.5 text-center font-black text-rose-700">
                        {std.daysAbsent}
                      </td>

                      {/* Exact Attendance Percentage */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`font-black text-xs ${
                              isHigh
                                ? "text-emerald-700"
                                : isLow
                                ? "text-rose-700"
                                : "text-slate-800"
                            }`}
                          >
                            {std.attendancePercentage}%
                          </span>
                          <div className="w-14 bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full ${
                                isHigh
                                  ? "bg-emerald-500"
                                  : isLow
                                  ? "bg-rose-500"
                                  : "bg-purple-600"
                              }`}
                              style={{ width: `${Math.min(100, std.attendancePercentage)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-3.5 text-center">
                        {isHigh ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>≥90% High</span>
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-800 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>Low (&lt;75%)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </td>

                      {/* Parent Alert WhatsApp Link */}
                      <td className="py-3 px-3.5 text-right">
                        {std.studentPhone ? (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[11px] shadow-2xs transition-all cursor-pointer"
                            title={`Send ${summary?.monthLabel} attendance alert to parent`}
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">N/A</span>
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
  );
}
