"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap } from "lucide-react";

interface ScreenSplashProps {
  onGetStarted?: () => void;
  onExploreCourses?: () => void;
  onEnterPortal?: () => void;
}

export default function ScreenSplash({
  onGetStarted,
  onExploreCourses,
  onEnterPortal,
}: ScreenSplashProps) {
  const router = useRouter();

  const handleAction = () => {
    if (onGetStarted) {
      onGetStarted();
    } else if (onExploreCourses) {
      onExploreCourses();
    } else if (onEnterPortal) {
      onEnterPortal();
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto h-full flex-1 flex flex-col justify-between px-6 py-8 bg-white text-slate-900 select-none font-['Plus_Jakarta_Sans']">
      {/* Top Spacer for Optical Centering Balance */}
      <div className="h-4 sm:h-8 shrink-0" />

      {/* Perfectly Centered Branding: Logo & "Hanoon Academy" Title */}
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 my-auto">
        {/* Graduation Cap Logo Icon */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-700 to-indigo-500 opacity-90" />
          <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 text-white relative z-10 stroke-[2.2]" />
        </div>

        {/* Main Brand Title */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Hanoon <span className="text-purple-600">Academy</span>
        </h1>
      </div>

      {/* Single Primary Action Button (Ultra-Minimalist, No Bottom Text Links) */}
      <div className="shrink-0 w-full pb-4 sm:pb-6 pt-4 flex flex-col items-center">
        <button
          type="button"
          onClick={handleAction}
          className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
