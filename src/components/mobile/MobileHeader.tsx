"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  LogOut,
  X,
} from "lucide-react";
import { ScreenTab, UserProfile } from "@/types/app";
import HanoonLogo from "@/components/brand/HanoonLogo";
import { logoutUser } from "@/services/authService";

interface MobileHeaderProps {
  currentScreen: ScreenTab;
  onBack?: () => void;
  canGoBack: boolean;
  userProfile?: UserProfile;
}

export default function MobileHeader({
  currentScreen,
  onBack,
  canGoBack,
  userProfile,
}: MobileHeaderProps) {
  const router = useRouter();
  const [isPortalMenuOpen, setIsPortalMenuOpen] = useState(false);

  if (currentScreen === "splash") {
    return null;
  }

  const getScreenTitle = () => {
    switch (currentScreen) {
      case "courses":
        return "Courses";
      case "course-details":
        return "Course Details";
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

  const displayName = userProfile?.name?.trim() || "Student Account";
  const displayPhone = userProfile?.phone?.trim() || "Active Session";
  const avatarLetter = displayName ? displayName.charAt(0).toUpperCase() : "S";

  const handleSignOut = async () => {
    setIsPortalMenuOpen(false);
    await logoutUser();
    router.replace("/login");
  };

  return (
    <header className="bg-white text-slate-900 shrink-0 sticky top-0 z-40 border-b border-purple-100 shadow-xs select-none">
      {/* Main Header Row */}
      <div className="px-4 py-3 flex items-center justify-between relative">
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

        {/* Profile Avatar Popover (Dynamic Student Profile) */}
        <div className="flex items-center relative">
          <button
            type="button"
            onClick={() => setIsPortalMenuOpen(!isPortalMenuOpen)}
            title="Student Profile"
            className="w-8 h-8 rounded-xl bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs hover:bg-purple-700 active:scale-95 transition-all cursor-pointer"
          >
            {avatarLetter}
          </button>

          {isPortalMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsPortalMenuOpen(false)}
              />
              <div className="absolute right-0 top-10 w-64 bg-white rounded-2xl shadow-xl border border-purple-100 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1.5">
                <div className="flex items-center justify-between px-2 py-1.5 border-b border-purple-50">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">
                    Student Profile
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsPortalMenuOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2.5 p-2 rounded-xl bg-purple-50/60 text-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {avatarLetter}
                  </div>
                  <div className="overflow-hidden">
                    <span className="text-xs font-black text-slate-900 block leading-tight truncate">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-purple-700 font-semibold truncate block">
                      {displayPhone}
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-purple-50 space-y-1">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
