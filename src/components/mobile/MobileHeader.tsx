"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Wifi,
  Battery,
  Signal,
  GraduationCap,
  ShieldCheck,
  User,
  LogIn,
  X,
} from "lucide-react";
import { ScreenTab } from "@/types/app";
import HanoonLogo from "@/components/brand/HanoonLogo";

interface MobileHeaderProps {
  currentScreen: ScreenTab;
  onBack?: () => void;
  canGoBack: boolean;
}

export default function MobileHeader({
  currentScreen,
  onBack,
  canGoBack,
}: MobileHeaderProps) {
  const [isPortalMenuOpen, setIsPortalMenuOpen] = useState(false);

  if (currentScreen === "splash") {
    return null;
  }

  const getScreenTitle = () => {
    switch (currentScreen) {
      case "courses":
        return "Courses";
      case "course-details":
        return "Curriculum Details";
      case "onboarding":
        return "Student Registration";
      case "payment":
        return "UPI Fee Payment";
      case "dashboard":
        return "Student Dashboard";
      default:
        return "Hanoon Academy";
    }
  };

  return (
    <header className="bg-white text-slate-900 shrink-0 sticky top-0 z-40 border-b border-purple-100 shadow-xs select-none">
      {/* Mobile Top Bar (Time, Wifi, Battery) */}
      <div className="px-5 pt-2.5 pb-1 flex items-center justify-between text-[11px] font-bold text-slate-400">
        <span>09:41</span>
        <div className="w-16 h-2 bg-purple-100 rounded-full mx-auto hidden sm:block" />
        <div className="flex items-center gap-1.5 text-slate-400">
          <Signal className="w-3 h-3" />
          <Wifi className="w-3 h-3" />
          <Battery className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Main Header Row */}
      <div className="px-4 py-2.5 flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 rounded-xl hover:bg-purple-50 active:scale-95 transition-all text-slate-700 font-bold cursor-pointer"
              aria-label="Go Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex items-center gap-2">
            <HanoonLogo size="sm" showText={false} />
            <h1 className="font-['Plus_Jakarta_Sans'] text-base font-extrabold tracking-tight text-slate-900 leading-tight">
              {getScreenTitle()}
            </h1>
          </div>
        </div>

        {/* Profile Avatar / Portal Switcher Button */}
        <div className="flex items-center relative">
          <button
            type="button"
            onClick={() => setIsPortalMenuOpen(!isPortalMenuOpen)}
            title="Switch Academy Portal"
            className="w-8 h-8 rounded-xl bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs hover:bg-purple-700 active:scale-95 transition-all cursor-pointer"
          >
            A
          </button>

          {/* Interactive Portal Switcher Popover */}
          {isPortalMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsPortalMenuOpen(false)}
              />
              <div className="absolute right-0 top-10 w-64 bg-white rounded-2xl shadow-xl border border-purple-100 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-purple-50">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Switch Academy Portal
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPortalMenuOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <Link
                  href="/teacher"
                  onClick={() => setIsPortalMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-purple-50 text-slate-800 transition-colors group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block leading-tight">
                      Teacher Dashboard
                    </span>
                    <span className="text-[10px] text-slate-500">Live studio & class notes</span>
                  </div>
                </Link>

                <Link
                  href="/admin"
                  onClick={() => setIsPortalMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-purple-50 text-slate-800 transition-colors group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block leading-tight">
                      Admin Dashboard
                    </span>
                    <span className="text-[10px] text-slate-500">UPI verification & payroll</span>
                  </div>
                </Link>

                <Link
                  href="/student"
                  onClick={() => setIsPortalMenuOpen(false)}
                  className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-purple-50 text-slate-800 transition-colors group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-slate-900 block leading-tight">
                      Student Dashboard
                    </span>
                    <span className="text-[10px] text-slate-500">Curriculum & live classes</span>
                  </div>
                </Link>

                <div className="pt-1 border-t border-purple-50">
                  <Link
                    href="/login"
                    onClick={() => setIsPortalMenuOpen(false)}
                    className="flex items-center gap-2 p-1.5 rounded-lg text-[11px] font-bold text-purple-700 hover:bg-purple-50 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In with another Account</span>
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
