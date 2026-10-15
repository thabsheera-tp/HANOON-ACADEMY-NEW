"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, Lock } from "lucide-react";

interface ScreenSplashProps {
  onGetStarted?: () => void;
  onExploreCourses?: () => void;
  onEnterPortal?: () => void;
  onStaffLogin?: () => void;
}

export default function ScreenSplash({
  onGetStarted,
  onExploreCourses,
  onStaffLogin,
}: ScreenSplashProps) {
  const router = useRouter();

  const handleStart = () => {
    if (onGetStarted) {
      onGetStarted();
    } else if (onExploreCourses) {
      onExploreCourses();
    }
  };

  const handleStaff = () => {
    if (onStaffLogin) {
      onStaffLogin();
    } else {
      router.push("/login?portal=staff");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto h-full flex-1 flex flex-col justify-between px-6 py-8 bg-white text-slate-900 select-none font-['Plus_Jakarta_Sans']">
      {/* Top Spacer */}
      <div className="h-4 sm:h-8 shrink-0" />

      {/* Clean & Centered Hero Section */}
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 my-auto py-4">
        {/* Top: Academy Logo Icon */}
        <div className="w-24 h-24 rounded-3xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-700 to-indigo-500 opacity-90" />
          <GraduationCap className="w-12 h-12 text-white relative z-10 stroke-[2.2]" />
        </div>

        {/* Heading: Hanoon Academy */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Hanoon <span className="text-purple-600">Academy</span>
          </h1>
        </div>
      </div>

      {/* Bottom Actions Section: Get Started & Staff Login */}
      <div className="shrink-0 w-full pb-4 sm:pb-6 space-y-3">
        <button
          type="button"
          onClick={handleStart}
          className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleStaff}
          className="w-full py-3.5 px-6 rounded-2xl font-bold text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 active:scale-[0.98] border border-purple-200/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Lock className="w-3.5 h-3.5 text-purple-600" />
          <span>Staff Login</span>
        </button>
      </div>
    </div>
  );
}
