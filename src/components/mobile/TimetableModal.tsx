"use client";

import React, { useState } from "react";
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

interface TimetableModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCourse: SelectedCourse;
  onJoinLiveClass?: () => void;
}

interface TimetableSlot {
  day: string;
  dayShort: string;
  subject: string;
  time: string;
  instructor: string;
  isToday?: boolean;
  isLive?: boolean;
  completed?: boolean;
}

export default function TimetableModal({
  isOpen,
  onClose,
  selectedCourse,
  onJoinLiveClass,
}: TimetableModalProps) {
  const [selectedDay, setSelectedDay] = useState<string>("Monday");

  if (!isOpen) return null;

  const timetable: TimetableSlot[] = [
    {
      day: "Monday",
      dayShort: "Mon",
      subject: "Seerah & Prophetic History",
      time: "07:30 PM - 08:30 PM IST",
      instructor: "Usthad Dr. Faisal Al-Hanoon",
      isToday: true,
      isLive: true,
    },
    {
      day: "Tuesday",
      dayShort: "Tue",
      subject: "Fiqh Jurisprudence & Taharah",
      time: "07:30 PM - 08:30 PM IST",
      instructor: "Usthad Anas Nadwi",
      completed: true,
    },
    {
      day: "Wednesday",
      dayShort: "Wed",
      subject: "Haddad Litany Practice & Tazkiyah",
      time: "06:30 PM - 07:30 PM IST",
      instructor: "Usthad Bilal Farooqi",
    },
    {
      day: "Thursday",
      dayShort: "Thu",
      subject: "Hadith Sciences & Moral Virtues",
      time: "08:00 PM - 09:00 PM IST",
      instructor: "Usthad Abdul Rahman Al-Hafiz",
    },
    {
      day: "Friday",
      dayShort: "Fri",
      subject: "Weekly Reflection & Q&A Open House",
      time: "07:00 PM - 08:00 PM IST",
      instructor: "Faculty Mentor Collective",
    },
  ];

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  const activeSlot = timetable.find((t) => t.day === selectedDay) || timetable[0];

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
          {days.map((day) => {
            const isSelected = selectedDay === day;
            const slot = timetable.find((t) => t.day === day);

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
                {slot?.isLive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Day Class Details */}
        <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">
              {activeSlot.day} Session
            </span>
            {activeSlot.isLive && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                LIVE TODAY
              </span>
            )}
          </div>

          <div>
            <h4 className="text-sm font-extrabold text-slate-900">
              {activeSlot.subject}
            </h4>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-purple-500" />
              <span>{activeSlot.time}</span>
            </p>
          </div>

          <div className="pt-2 border-t border-purple-100/70 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-purple-600" />
              <span>Faculty:</span>
            </div>
            <strong className="text-slate-800">{activeSlot.instructor}</strong>
          </div>
        </div>

        {/* Action Button */}
        {activeSlot.isLive && onJoinLiveClass ? (
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
