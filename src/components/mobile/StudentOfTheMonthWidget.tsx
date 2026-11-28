"use client";

import React, { useState, useEffect } from "react";
import { Trophy, Award, Sparkles, TrendingUp, CheckCircle2, Star } from "lucide-react";
import { fetchStudentOfTheMonthLeaderboard } from "@/services/attendanceService";

interface StudentOfTheMonthWidgetProps {
  courseId: string;
  courseName?: string;
  studentId?: string;
  studentPhone?: string;
  studentName?: string;
}

export default function StudentOfTheMonthWidget({
  courseId,
  courseName = "Current Course",
  studentId,
  studentPhone,
  studentName = "You",
}: StudentOfTheMonthWidgetProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<{
    monthLabel: string;
    totalClassesHeld: number;
    top3: {
      rank: number;
      studentName: string;
      attendancePercentage: number;
      daysPresent: number;
      totalClasses: number;
    }[];
    mySummary: {
      daysPresent: number;
      daysAbsent: number;
      totalClasses: number;
      attendancePercentage: number;
      rank?: number;
    } | null;
  } | null>(null);

  const loadLeaderboard = async () => {
    try {
      const res = await fetchStudentOfTheMonthLeaderboard({
        courseId,
        studentId,
        studentPhone,
      });
      setData(res);
    } catch (err) {
      console.warn("Failed to load student of the month leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [courseId, studentId, studentPhone]);

  // Listen to live attendance updates
  useEffect(() => {
    const handleUpdate = () => {
      loadLeaderboard();
    };
    window.addEventListener("hanoon_attendance_updated", handleUpdate);
    return () => {
      window.removeEventListener("hanoon_attendance_updated", handleUpdate);
    };
  }, [courseId, studentId, studentPhone]);

  const monthLabel = data?.monthLabel || "This Month";
  const top3 = data?.top3 || [];
  const mySummary = data?.mySummary;

  return (
    <div className="bg-white rounded-3xl border border-purple-100 shadow-sm p-4 space-y-3.5 animate-fade-in relative overflow-hidden">
      {/* Clean Minimal Header (No overlapping badges) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400/20 text-amber-700 border border-amber-400/30 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight">
              Student of the Month
            </h3>
            <p className="text-[10.5px] text-slate-500 font-medium">
              {monthLabel} • Top Attendees
            </p>
          </div>
        </div>
      </div>

      {/* Top 3 Attendees List (Strict Privacy: Only Rank, Name, Percentage) */}
      {loading ? (
        <div className="py-6 flex justify-center items-center gap-2 text-xs font-semibold text-purple-600">
          <span className="w-3.5 h-3.5 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
          <span>Loading leaderboard...</span>
        </div>
      ) : top3.length === 0 ? (
        <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 text-center space-y-1">
          <Sparkles className="w-6 h-6 mx-auto text-amber-400" />
          <p className="text-xs font-bold text-slate-700">
            No class attendance records logged for {monthLabel} yet.
          </p>
          <p className="text-[11px] text-slate-500">
            Join your daily live lectures to be featured on the podium!
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {top3.map((student) => {
            const isFirst = student.rank === 1;
            const isSecond = student.rank === 2;
            const isThird = student.rank === 3;

            return (
              <div
                key={student.rank}
                className={`p-2.5 sm:p-3 rounded-2xl flex items-center justify-between gap-3 transition-all ${
                  isFirst
                    ? "bg-gradient-to-r from-amber-50/80 via-white to-amber-50/30 border border-amber-200/90 shadow-2xs"
                    : isSecond
                    ? "bg-slate-50/80 border border-slate-200/80"
                    : "bg-orange-50/50 border border-orange-200/60"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Rank Badge */}
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                      isFirst
                        ? "bg-amber-400 text-amber-950 shadow-xs"
                        : isSecond
                        ? "bg-slate-200 text-slate-800"
                        : "bg-orange-200 text-orange-900"
                    }`}
                  >
                    {isFirst ? "🥇" : isSecond ? "🥈" : "🥉"}
                  </div>

                  {/* Student Name */}
                  <div className="min-w-0">
                    <p className="font-extrabold text-xs sm:text-[13px] text-slate-900 truncate">
                      {student.studentName}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {isFirst ? "Top Ranker" : `Rank #${student.rank}`}
                    </p>
                  </div>
                </div>

                {/* Percentage */}
                <div className="text-right shrink-0">
                  <span
                    className={`text-xs sm:text-sm font-black ${
                      isFirst
                        ? "text-amber-800"
                        : isSecond
                        ? "text-slate-800"
                        : "text-orange-800"
                    }`}
                  >
                    {student.attendancePercentage}%
                  </span>
                  <span className="block text-[9.5px] font-semibold text-slate-400">
                    Attendance
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Logged-in Student's Own Monthly Summary (Strictly Private) */}
      {mySummary && (
        <div className="pt-2 border-t border-purple-50">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold text-slate-700 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                <span>Your Monthly Attendance</span>
              </span>
              <span className="font-black text-purple-900">
                {mySummary.daysPresent} / {mySummary.totalClasses} classes ({mySummary.attendancePercentage}%)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-purple-200/60 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  mySummary.attendancePercentage >= 90
                    ? "bg-emerald-500"
                    : mySummary.attendancePercentage >= 75
                    ? "bg-purple-600"
                    : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(100, mySummary.attendancePercentage)}%` }}
              />
            </div>

            {/* Motivational Badge */}
            <p className="text-[10.5px] text-slate-600 font-medium leading-snug">
              {mySummary.attendancePercentage >= 90 ? (
                <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                  <Star className="w-3 h-3 text-emerald-600 fill-current" />
                  <span>Outstanding consistency! You are excelling this month.</span>
                </span>
              ) : mySummary.attendancePercentage >= 75 ? (
                <span className="text-purple-700 font-bold">
                  ✨ Solid attendance! Attend a few more live classes to break into the Top 3 podium.
                </span>
              ) : (
                <span className="text-amber-800 font-bold">
                  💪 Keep attending live classes regularly to climb the leaderboard!
                </span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
