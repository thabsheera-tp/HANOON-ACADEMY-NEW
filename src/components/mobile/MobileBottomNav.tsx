"use client";

import React from "react";
import { BookOpen, User } from "lucide-react";
import { ScreenTab } from "@/types/app";

interface MobileBottomNavProps {
  currentScreen: ScreenTab;
  onChangeScreen: (screen: ScreenTab) => void;
  isEnrolled: boolean;
  hasPaymentSubmitted: boolean;
}

export default function MobileBottomNav({
  currentScreen,
  onChangeScreen,
  isEnrolled,
}: MobileBottomNavProps) {
  if (currentScreen === "splash") return null;

  const isCoursesTab = currentScreen === "courses" || currentScreen === "course-details";
  const isProfileTab =
    currentScreen === "dashboard" ||
    currentScreen === "onboarding" ||
    currentScreen === "payment";

  return (
    <div className="sticky bottom-0 z-40 select-none pointer-events-none pb-3 pt-1">
      <nav className="pointer-events-auto bg-white border border-purple-100 rounded-full mx-6 px-3 py-1.5 shadow-md">
        <div className={`grid ${isEnrolled ? "grid-cols-2" : "grid-cols-1"} gap-2 max-w-xs mx-auto`}>
          {/* Tab 1: Courses */}
          <button
            type="button"
            onClick={() => onChangeScreen("courses")}
            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-full transition-all cursor-pointer ${
              isCoursesTab
                ? "bg-purple-600 text-white shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-900 hover:bg-purple-50 font-semibold"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-xs tracking-wide">Courses</span>
          </button>

          {/* Tab 2: Dashboard / Profile (Strictly for APPROVED / Enrolled Students) */}
          {isEnrolled && (
            <button
              type="button"
              onClick={() => onChangeScreen("dashboard")}
              className={`flex items-center justify-center gap-2 py-2 px-4 rounded-full transition-all cursor-pointer ${
                isProfileTab
                  ? "bg-purple-600 text-white shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900 hover:bg-purple-50 font-semibold"
              }`}
            >
              <User className="w-4 h-4" />
              <span className="text-xs tracking-wide">Dashboard</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
