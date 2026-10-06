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
  Sparkles,
} from "lucide-react";
import { SelectedCourse } from "@/types/app";

export const MOBILE_COURSES: SelectedCourse[] = [
  {
    id: "athaviy",
    title: "Athaviy",
    malayalamTitle: "അഥവിയ",
    fee: "₹1,500",
    feeAmount: 1500,
    duration: "1 Year Program",
    tagline: "Comprehensive Islamic Sharia & Moral Education",
    highlights: [
      "Quranic Tajweed & Exegesis",
      "Practical Fiqh & Aqeedah",
      "Arabic Literacy & Grammar",
      "Tarbiyah & Character Building",
    ],
  },
  {
    id: "home-tuition",
    title: "Home Tuition",
    malayalamTitle: "ഹോം ട്യൂഷൻ",
    fee: "₹2,000",
    feeAmount: 2000,
    duration: "Academic Term",
    tagline: "1-on-1 Personalized School & College Coaching",
    highlights: [
      "CBSE, State & ICSE Syllabus",
      "Maths, Science & Language Experts",
      "Weekly Parent Progress Updates",
      "Doubt Clearance & Exam Prep",
    ],
  },
  {
    id: "fashion-designing",
    title: "Fashion Designing",
    malayalamTitle: "ഫാഷൻ ഡിസൈനിങ്",
    fee: "₹2,500",
    feeAmount: 2500,
    duration: "6 Months Certified",
    tagline: "Professional Modest Apparel Design & Tailoring",
    highlights: [
      "Pattern Drafting & Cutting",
      "Garment Construction & Stitching",
      "Fabric Theory & Illustration",
      "Boutique Entrepreneurship",
    ],
  },
];

interface ScreenCoursesProps {
  selectedCourse: SelectedCourse | null;
  onSelectCourse: (course: SelectedCourse) => void;
  onContinueToPayment: () => void;
  userName?: string;
}

export default function ScreenCourses({
  selectedCourse,
  onSelectCourse,
  onContinueToPayment,
  userName,
}: ScreenCoursesProps) {
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
    <div className="p-4 sm:p-5 space-y-4 animate-in fade-in duration-300">
      {/* Screen Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#D97706] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full">
            Screen 2 / 4
          </span>
          <h2 className="text-xl font-extrabold text-[#0F172A] mt-1.5">
            Select Your Program
          </h2>
          <p className="text-xs text-[#0F172A]/70">
            {userName ? `Welcome, ${userName}! ` : ""}Choose a course to enroll:
          </p>
        </div>

        <div className="w-10 h-10 rounded-2xl bg-[#047857]/10 text-[#047857] flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-[#D97706]" />
        </div>
      </div>

      {/* 3 Mobile Cards */}
      <div className="space-y-4">
        {MOBILE_COURSES.map((course) => {
          const Icon = getIcon(course.id);
          const isSelected = selectedCourse?.id === course.id;
          const isFeatured = course.id === "athaviy";

          return (
            <div
              key={course.id}
              onClick={() => onSelectCourse(course)}
              className={`relative bg-white rounded-3xl p-5 border-2 transition-all cursor-pointer shadow-sm active:scale-99 ${
                isSelected
                  ? "border-[#047857] ring-4 ring-[#047857]/15 shadow-md bg-emerald-50/20"
                  : "border-slate-200 hover:border-[#047857]/40"
              }`}
            >
              {/* Featured Tag */}
              {isFeatured && (
                <div className="absolute -top-3 right-5 bg-[#D97706] text-white text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                  <Star className="w-3 h-3 fill-white" />
                  <span>Flagship</span>
                </div>
              )}

              {/* Card Top Row */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-[#047857] text-white shadow-md shadow-[#047857]/20"
                        : "bg-[#F0FDF4] text-[#047857] border border-[#047857]/20"
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <h3 className="text-base font-extrabold text-[#0F172A]">
                        {course.title}
                      </h3>
                      <span className="text-xs font-bold text-[#047857]">
                        ({course.malayalamTitle})
                      </span>
                    </div>
                    <p className="text-xs text-[#0F172A]/70 line-clamp-1">
                      {course.tagline}
                    </p>
                  </div>
                </div>
              </div>

              {/* Duration & Fee info */}
              <div className="flex items-center justify-between py-2 border-y border-slate-100 my-2.5 text-xs">
                <span className="flex items-center gap-1 text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-[#047857]" />
                  {course.duration}
                </span>
                <div className="text-right">
                  <span className="text-base font-extrabold text-[#047857]">
                    {course.fee}
                  </span>
                  <span className="text-[10px] text-slate-500"> / month</span>
                </div>
              </div>

              {/* Highlights */}
              <div className="space-y-1.5 mb-4">
                {course.highlights.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-xs text-[#0F172A]/80"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#047857] shrink-0" />
                    <span className="text-[11px] leading-tight">{item}</span>
                  </div>
                ))}
              </div>

              {/* Select & Enroll Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCourse(course);
                  onContinueToPayment();
                }}
                className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#047857] text-white shadow-md shadow-[#047857]/25"
                    : "bg-white text-[#047857] border border-[#047857] hover:bg-[#047857] hover:text-white"
                }`}
              >
                <span>{isSelected ? "Selected — Proceed to Payment" : "Select & Enroll"}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Continue Button if course is selected */}
      {selectedCourse && (
        <div className="pt-2 sticky bottom-16 z-30">
          <button
            onClick={onContinueToPayment}
            className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-[#047857] hover:bg-[#035e44] shadow-lg shadow-[#047857]/30 transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
          >
            <span>Proceed to UPI Payment ({selectedCourse.fee})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
