"use client";

import React from "react";
import { ArrowRight, GraduationCap } from "lucide-react";

interface ScreenSplashProps {
  onExploreCourses?: () => void;
  onEnterPortal?: () => void;
}

export default function ScreenSplash({
  onExploreCourses,
  onEnterPortal,
}: ScreenSplashProps) {
  const handleAction = onExploreCourses || onEnterPortal || (() => {});

  return (
    <div className="w-full max-w-md mx-auto h-full flex-1 flex flex-col justify-between px-6 bg-white text-slate-900 select-none font-['Plus_Jakarta_Sans']">
      {/* Top Spacer for Optical Centering Balance */}
      <div className="h-4 sm:h-6 shrink-0" />

      {/* Perfectly Centered Brand: Logo & "Hanoon Academy" in the middle */}
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 my-auto">
        {/* Graduation Cap Logo Icon */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-700 to-indigo-500 opacity-90" />
          <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 text-white relative z-10 stroke-[2.2]" />
        </div>

        {/* Main Text: Hanoon Academy */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
          Hanoon <span className="text-purple-600">Academy</span>
        </h1>
      </div>

      {/* Anchored Bottom Actions with Proper Padding */}
      <div className="shrink-0 w-full pb-8 sm:pb-10 pt-4 flex flex-col items-center space-y-3">
        <button
          type="button"
          onClick={handleAction}
          className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 text-xs pt-1">
          <a
            href="/login"
            className="text-xs font-bold text-slate-600 hover:text-purple-600 transition-colors py-1 cursor-pointer"
          >
            Student Sign In
          </a>
          <span className="text-slate-300">•</span>
          <a
            href="/login?portal=staff"
            className="text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors py-1 cursor-pointer"
          >
            Faculty & Admin &rarr;
          </a>
        </div>
      </div>
    </div>
  );
}
