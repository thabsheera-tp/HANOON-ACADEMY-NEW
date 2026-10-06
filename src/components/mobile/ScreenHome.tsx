"use client";

import React from "react";
import {
  BookOpen,
  GraduationCap,
  Scissors,
  CheckCircle2,
  Clock,
  ArrowRight,
  Star,
} from "lucide-react";
import { SelectedCourse } from "@/types/app";

export const CORE_COURSES: SelectedCourse[] = [
  {
    id: "athaviy",
    title: "Athaviy",
    malayalamTitle: "അഥവിയ",
    fee: "₹1,500",
    feeAmount: 1500,
    duration: "1 Year Program",
    tagline: "Comprehensive Islamic Sharia & Moral Tarbiyah Education",
    highlights: [
      "Quranic Tajweed & Hifz Guidance",
      "Practical Fiqh & Daily Life Ethics",
      "Arabic Language & Grammar Basics",
      "Personalized Spiritual Mentorship",
    ],
  },
  {
    id: "home-tuition",
    title: "Home Tuition",
    malayalamTitle: "ഹോം ട്യൂഷൻ",
    fee: "₹2,000",
    feeAmount: 2000,
    duration: "Academic Term",
    tagline: "Personalized 1-on-1 Academic Tutoring & Guidance",
    highlights: [
      "CBSE, Kerala State & ICSE Syllabus",
      "Maths, Science & Language Specialists",
      "Regular Weekly Parent Progress Reports",
      "Exam Preparation & Concept Clarity",
    ],
  },
  {
    id: "fashion-designing",
    title: "Fashion Designing",
    malayalamTitle: "ഫാഷൻ ഡിസൈനിങ്",
    fee: "₹2,500",
    feeAmount: 2500,
    duration: "6 Months Certified",
    tagline: "Professional Modest Apparel Design & Garment Craft",
    highlights: [
      "Accurate Pattern Drafting & Cutting",
      "Garment Construction & Stitching Mastery",
      "Modest Fashion Styling & Illustration",
      "Boutique Setup & Business Mentorship",
    ],
  },
];

interface ScreenHomeProps {
  selectedCourse: SelectedCourse;
  onSelectCourse: (course: SelectedCourse) => void;
  onGetStarted: () => void;
}

export default function ScreenHome({
  selectedCourse,
  onSelectCourse,
  onGetStarted,
}: ScreenHomeProps) {
  const getIcon = (id: string) => {
    switch (id) {
      case "athaviy":
        return BookOpen;
      case "home-tuition":
        return GraduationCap;
      case "fashion-designing":
        return Scissors;
      default:
        return BookOpen;
    }
  };

  return (
    <div className="p-4 sm:p-5 space-y-5 animate-in fade-in duration-300">
      {/* ========================================================
          CLEAN MINIMALIST HEADER BANNER
          ONLY Logo above + Name "Hanoon Academy" in professional font
          (All other badges, subtitles, and column stats removed as requested)
          ======================================================== */}
      <div
        className="rounded-3xl py-10 px-6 text-center shadow-xl shadow-[#047857]/25 relative overflow-hidden text-white"
        style={{
          backgroundColor: "#047857",
          backgroundImage: "linear-gradient(135deg, #064e3b 0%, #047857 55%, #065f46 100%)",
        }}
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#D97706]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl pointer-events-none" />

        {/* 1. Logo Emblem directly above the text */}
        <div className="w-18 h-18 mx-auto mb-4 rounded-2xl bg-white/15 backdrop-blur-md border-2 border-white/30 flex items-center justify-center shadow-lg">
          <GraduationCap className="w-10 h-10 text-white drop-shadow-sm" />
        </div>

        {/* 2. ONLY the name "Hanoon Academy" in professional font */}
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
          Hanoon <span className="text-[#FBBF24]">Academy</span>
        </h1>
      </div>

      {/* ========================================================
          3 CORE COURSES LIST
          ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-black text-[#0F172A] tracking-tight">
              Our Core Programs
            </h2>
            <p className="text-xs text-[#1E293B] font-bold">
              Choose a course to get started:
            </p>
          </div>
          <span className="text-[11px] font-black text-[#92400E] bg-[#FEF3C7] border border-amber-300 px-3 py-0.5 rounded-full">
            3 Courses
          </span>
        </div>

        {CORE_COURSES.map((course) => {
          const Icon = getIcon(course.id);
          const isSelected = selectedCourse.id === course.id;
          const isFeatured = course.id === "athaviy";

          return (
            <div
              key={course.id}
              onClick={() => onSelectCourse(course)}
              className={`relative bg-white rounded-3xl p-5 border-2 transition-all cursor-pointer shadow-sm active:scale-99 ${
                isSelected
                  ? "border-[#047857] ring-4 ring-[#047857]/15 bg-emerald-50/30 shadow-md"
                  : "border-slate-200 hover:border-[#047857]/50"
              }`}
            >
              {/* Flagship Badge */}
              {isFeatured && (
                <div className="absolute -top-2.5 right-5 bg-[#D97706] text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" />
                  <span>Flagship</span>
                </div>
              )}

              {/* Title & Icon Header */}
              <div className="flex items-start gap-3 mb-2.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "bg-[#047857] text-white shadow-md shadow-[#047857]/25"
                      : "bg-[#F0FDF4] text-[#047857] border-2 border-[#047857]/30"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <h3 className="text-lg font-black text-[#0F172A] leading-tight">
                      {course.title}
                    </h3>
                    <span className="text-sm font-black text-[#047857]">
                      ({course.malayalamTitle})
                    </span>
                  </div>
                  <p className="text-xs text-[#1E293B] font-bold mt-0.5">
                    {course.tagline}
                  </p>
                </div>
              </div>

              {/* Fee & Duration */}
              <div className="flex items-center justify-between py-2.5 border-y border-slate-100 my-2 text-xs">
                <span className="flex items-center gap-1.5 text-[#1E293B] font-black">
                  <Clock className="w-3.5 h-3.5 text-[#047857]" />
                  {course.duration}
                </span>
                <div>
                  <span className="text-lg font-black text-[#047857]">
                    {course.fee}
                  </span>
                  <span className="text-xs text-[#1E293B] font-black"> / month</span>
                </div>
              </div>

              {/* Highlights */}
              <div className="space-y-1.5 mb-3.5">
                {course.highlights.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs text-[#1E293B] font-semibold"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0" />
                    <span className="text-[12px]">{item}</span>
                  </div>
                ))}
              </div>

              {/* Selection State */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-black text-[#1E293B]">
                  {isSelected ? "Selected for enrollment" : "Tap card to select"}
                </span>
                <span
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? "border-[#047857] bg-[#047857]"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Primary Action Button */}
      <div className="sticky bottom-16 z-30 pt-2">
        <button
          onClick={onGetStarted}
          className="w-full py-4 px-6 rounded-2xl font-black text-base text-white bg-[#047857] hover:bg-[#035e44] active:scale-98 shadow-xl shadow-[#047857]/35 transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          <span>Get Started / Enroll Now</span>
          <ArrowRight className="w-5 h-5" />
        </button>
        <p className="text-center text-xs text-[#1E293B] font-bold mt-2">
          Selected: <strong className="text-[#047857] font-black">{selectedCourse.title} ({selectedCourse.malayalamTitle})</strong>
        </p>
      </div>
    </div>
  );
}
