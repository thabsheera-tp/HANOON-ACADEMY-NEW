import React from "react";
import { GraduationCap } from "lucide-react";

interface HanoonLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showSubtitle?: boolean;
  textColor?: string;
}

export default function HanoonLogo({
  className = "",
  size = "md",
  showText = true,
  showSubtitle = false,
  textColor = "text-slate-900",
}: HanoonLogoProps) {
  const sizeClasses = {
    sm: { iconBox: "w-8 h-8 rounded-xl", icon: "w-4 h-4", title: "text-sm", sub: "text-[9px]" },
    md: { iconBox: "w-11 h-11 rounded-2xl", icon: "w-6 h-6", title: "text-lg", sub: "text-[10px]" },
    lg: { iconBox: "w-14 h-14 rounded-2xl", icon: "w-8 h-8", title: "text-2xl", sub: "text-xs" },
    xl: { iconBox: "w-20 h-20 rounded-3xl", icon: "w-11 h-11", title: "text-3xl sm:text-4xl", sub: "text-xs sm:text-sm" },
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon Emblem */}
      <div
        className={`${sizeClasses.iconBox} bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20 shrink-0 relative overflow-hidden`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-purple-700 to-indigo-500 opacity-90" />
        <GraduationCap className={`${sizeClasses.icon} text-white relative z-10 stroke-[2.2]`} />
      </div>

      {/* Brand Title */}
      {showText && (
        <div className="flex flex-col select-none leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`${sizeClasses.title} font-extrabold tracking-tight ${textColor} font-['Plus_Jakarta_Sans']`}
            >
              Hanoon
            </span>
            <span className={`${sizeClasses.title} font-extrabold tracking-tight text-purple-600 font-['Plus_Jakarta_Sans']`}>
              Academy
            </span>
          </div>
          {showSubtitle && (
            <span
              className={`${sizeClasses.sub} font-semibold uppercase tracking-wider text-slate-500 mt-1 font-['Plus_Jakarta_Sans']`}
            >
              Empowering Minds & Ethics
            </span>
          )}
        </div>
      )}
    </div>
  );
}
