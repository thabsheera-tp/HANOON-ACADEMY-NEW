"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Calendar,
  Clock,
  Radio,
  User,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { SelectedCourse } from "@/types/app";
import {
  LiveClassSession,
  fetchLiveClassesFromSupabase,
  getTeacherClasses,
} from "@/services/teacherService";

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCourse: SelectedCourse;
  onJoinLiveClass?: () => void;
}

interface TimetableSlot {
  id: string;
  day: string;
  subject: string;
  time: string;
  instructor: string;
  isToday?: boolean;
  isLive?: boolean;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function TimetableModal({
  isOpen,
  onClose,
  selectedCourse,
  onJoinLiveClass,
}: TimetableModalProps) {
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    const todayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    const adjusted = todayIndex === 0 ? 6 : todayIndex - 1;
    return DAYS_OF_WEEK[adjusted] || "Monday";
  });
  const [classes, setClasses] = useState<LiveClassSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    fetchLiveClassesFromSupabase(selectedCourse.id)
      .then((data) => setClasses(data || []))
      .finally(() => setIsLoading(false));
  }, [isOpen, selectedCourse.id]);

  if (!isOpen) return null;

  // Map real scheduled classes to their days of the week
  const slotsForDay: TimetableSlot[] = classes
    .filter((c) => {
      if (!c.date) return false;
      try {
        const d = new Date(c.date);
        const dayName = d.toLocaleDateString("en-US", { weekday: "long" });
        return dayName.toLowerCase() === selectedDay.toLowerCase();
      } catch {
        return false;
      }
    })
    .map((c) => ({
      id: c.id,
      day: selectedDay,
      subject: c.title,
      time: `${c.time || "Scheduled"} (${c.duration || "60 mins"})`,
      instructor: c.teacherName || "Faculty Instructor",
      isToday: true,
      isLive: c.status === "LIVE_NOW",
    }));

  const activeSlot = slotsForDay[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans'] select-none">
      <div className="bg-white text-slate-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-purple-100 relative max-h-[92vh] flex flex-col overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                Weekly Schedule
              </span>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Academic Timetable
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Course Name */}
        <div className="my-3 p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">Enrolled Course:</span>
          <strong className="text-purple-700 font-bold">{selectedCourse.title}</strong>
        </div>

        {/* Day Pills Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-purple-50/50 rounded-2xl border border-purple-100 overflow-x-auto no-scrollbar mb-4 shrink-0">
          {DAYS_OF_WEEK.slice(0, 6).map((day) => {
            const isSelected = selectedDay === day;
            const hasClassOnDay = classes.some((c) => {
              if (!c.date) return false;
              try {
                return new Date(c.date).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase() === day.toLowerCase();
              } catch {
                return false;
              }
            });

            return (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  isSelected
                    ? "bg-purple-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>{day.slice(0, 3)}</span>
                {hasClassOnDay && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Day Class Details or Empty State */}
        {slotsForDay.length > 0 ? (
          <div className="space-y-3 mb-4">
            {slotsForDay.map((slot) => (
              <div key={slot.id} className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">
                    {slot.day} Session
                  </span>
                  {slot.isLive && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      LIVE TODAY
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">
                    {slot.subject}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-500" />
                    <span>{slot.time}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-purple-100/70 flex items-center justify-between text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-purple-600" />
                    <span>Faculty:</span>
                  </div>
                  <strong className="text-slate-800">{slot.instructor}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-purple-50/40 border border-purple-100 text-center space-y-2 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mx-auto">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">No classes scheduled for {selectedDay}</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
              Relax or review your study materials. New interactive lecture slots will appear here as soon as scheduled by faculty.
            </p>
          </div>
        )}

        {/* Action Button */}
        {activeSlot?.isLive && onJoinLiveClass ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onJoinLiveClass();
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            <Radio className="w-4 h-4 animate-pulse" />
            <span>Join This Live Session Now</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
          >
            <span>Close Timetable</span>
          </button>
        )}
      </div>
    </div>
  );
}

