"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, MessageCircle, Phone, Headphones } from "lucide-react";

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

  const handleGetStarted = () => {
    if (onGetStarted) {
      onGetStarted();
    } else if (onExploreCourses) {
      onExploreCourses();
    } else if (onEnterPortal) {
      onEnterPortal();
    } else {
      router.push("/#courses");
    }
  };

  const supportPhone = "+91 98460 12345";
  const rawWhatsApp = "919846012345";
  const whatsappUrl = `https://wa.me/${rawWhatsApp}?text=${encodeURIComponent(
    "Assalamu Alaikum Admin, I need help with Hanoon Academy admission and courses."
  )}`;

  return (
    <div className="w-full max-w-md mx-auto h-full flex-1 flex flex-col justify-between px-6 py-6 sm:py-8 bg-white text-slate-900 select-none font-['Plus_Jakarta_Sans']">
      {/* Top Spacer */}
      <div className="h-2 sm:h-4 shrink-0" />

      {/* Clean & Centered Hero Section */}
      <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4 my-auto py-3">
        {/* Top: Academy Logo Icon */}
        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/25 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-700 to-indigo-500 opacity-90" />
          <GraduationCap className="w-10 h-10 sm:w-12 sm:h-12 text-white relative z-10 stroke-[2.2]" />
        </div>

        {/* Heading: Hanoon Academy */}
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Hanoon <span className="text-purple-600">Academy</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Islamic Sharia, Home Tuition & Creative Mentorship
          </p>
        </div>
      </div>

      {/* Bottom Actions Section */}
      <div className="shrink-0 w-full pb-3 sm:pb-5 space-y-4">
        {/* Primary Action Button */}
        <button
          type="button"
          onClick={handleGetStarted}
          className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Get Started</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Prominent "Need Help? Contact Admin" Support Section */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50/80 via-emerald-50/60 to-purple-50/80 border border-purple-100/90 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                <Headphones className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-black text-slate-900 leading-tight">
                  Need Help? Contact Admin
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  Official Admission & Student Support
                </p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300 shrink-0">
              Active Now
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            {/* WhatsApp Admin */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span>WhatsApp Admin</span>
            </a>

            {/* Direct Call */}
            <a
              href={`tel:${supportPhone.replace(/\s+/g, "")}`}
              className="py-2 px-2.5 rounded-xl bg-white hover:bg-purple-50 active:scale-95 text-purple-900 border border-purple-200 font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>{supportPhone}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
