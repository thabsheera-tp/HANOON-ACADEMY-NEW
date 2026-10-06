"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  GraduationCap,
  Home,
  Scissors,
  BookMarked,
  Mic,
  Radio,
} from "lucide-react";
import { SelectedCourse } from "@/types/app";
import { getActiveCourses } from "@/services/courseService";
import { SpecialClass, getSpecialClasses } from "@/services/specialClassService";
import SpecialClassModal from "@/components/mobile/SpecialClassModal";

export const SHOWCASE_COURSES: SelectedCourse[] = [
  {
    id: "adaviyya",
    title: "Adaviyya",
    subtitle: "Islamic Sharia & Moral Tarbiyah (4 Core Hubs)",
    fee: "₹1,500",
    feeAmount: 1500,
    duration: "1 Year Academic Track",
    tagline: "Comprehensive foundation comprising 4 dedicated subjects: Seerah, Haddad, Fiqh, and Hadith. Designed to nurture authentic Islamic scholarship, spiritual grounding, and practical ethics.",
    highlights: [
      "Seerah & Prophetic Biography",
      "Ratib al-Haddad Litany & Spiritual Adhkar",
      "Applied Fiqh & Jurisprudence for Daily Life",
      "Hadith Sciences & Moral Etiquette",
    ],
  },
  {
    id: "home-tuition",
    title: "Home Tuition",
    subtitle: "1-on-1 Personalized Coaching",
    fee: "₹2,000",
    feeAmount: 2000,
    duration: "Flexible Academic Term",
    tagline: "Tailored 1-on-1 mentoring for CBSE, State, and ICSE curricula with dedicated subject faculty, regular progress tracking, and custom schedules.",
    highlights: [
      "Mathematics & Science Conceptual Mastery",
      "Regular Doubt-Clearing Sessions",
      "Parent Progress & Performance Reports",
      "Weekly Chapter Mock Examinations",
    ],
  },
  {
    id: "fashion-designing",
    title: "Fashion Designing",
    subtitle: "Modest Apparel & Craftsmanship",
    fee: "₹2,500",
    feeAmount: 2500,
    duration: "6 Months Certificate",
    tagline: "Professional pattern drafting, tailoring craftsmanship, modest wear aesthetics, and practical boutique entrepreneurship mentorship.",
    highlights: [
      "Pattern Drafting & Precision Cutting",
      "Garment Construction & Stitching Mastery",
      "Modest Fashion Styling & Fabric Science",
      "Boutique Business Setup & Client Portfolio",
    ],
  },
  {
    id: "shamail-muhammadiyya",
    title: "الشمائل المحمدية",
    secondaryTitle: "Ash-Shama'il al-Muhammadiyya",
    subtitle: "Ash-Shama'il al-Muhammadiyya (Prophetic Sublime Virtues)",
    fee: "₹1,200",
    feeAmount: 1200,
    duration: "3 Months Sacred Track",
    tagline: "An in-depth study of Imam al-Tirmidhi's classic work exploring the physical description, noble character, inner virtues, and daily mannerisms of the Prophet Muhammad ﷺ.",
    highlights: [
      "Hadith Analysis of Imam al-Tirmidhi",
      "Noble Comportment & Blessed Features",
      "Prophetic Hospitality, Ethics & Living Sunnah",
      "Practical Character Emulation & Tarbiyah",
    ],
  },
];

interface ScreenCoursesListProps {
  onSelectCourse: (course: SelectedCourse) => void;
}

export default function ScreenCoursesList({
  onSelectCourse,
}: ScreenCoursesListProps) {
  const [courses, setCourses] = useState<SelectedCourse[]>(SHOWCASE_COURSES);

  // Special Classes state for Tajweed & Burdah Live
  const [specialClasses, setSpecialClasses] = useState<SpecialClass[]>([]);
  const [selectedSpecialClass, setSelectedSpecialClass] = useState<SpecialClass | null>(null);

  useEffect(() => {
    getActiveCourses().then((data) => {
      if (data && data.length > 0) {
        if (data.length >= 4) {
          setCourses(data);
        } else {
          setCourses(SHOWCASE_COURSES);
        }
      }
    });

    setSpecialClasses(getSpecialClasses());

    const handleSpecialUpdate = (e: CustomEvent<SpecialClass[]>) => {
      if (e.detail) {
        setSpecialClasses(e.detail);
      } else {
        setSpecialClasses(getSpecialClasses());
      }
    };
    window.addEventListener("hanoon_special_classes_updated", handleSpecialUpdate as EventListener);
    return () => {
      window.removeEventListener("hanoon_special_classes_updated", handleSpecialUpdate as EventListener);
    };
  }, []);

  const getCourseIcon = (id: string) => {
    switch (id) {
      case "adaviyya":
      case "athaviy":
        return <GraduationCap className="w-6 h-6 stroke-[2.2]" />;
      case "home-tuition":
        return <Home className="w-6 h-6 stroke-[2.2]" />;
      case "fashion-designing":
        return <Scissors className="w-6 h-6 stroke-[2.2]" />;
      case "shamail-muhammadiyya":
        return <BookMarked className="w-6 h-6 stroke-[2.2]" />;
      default:
        return <BookOpen className="w-6 h-6 stroke-[2.2]" />;
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-5 py-4 flex-1 flex flex-col justify-start space-y-5 select-none font-['Plus_Jakarta_Sans'] bg-purple-50/40">
      {/* 1. Main Academic Programs: Balanced 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3.5 pt-1">
        {courses.slice(0, 4).map((course) => {
          const icon = getCourseIcon(course.id);
          const isShamail =
            course.id === "shamail-muhammadiyya" || course.title.includes("الشمائل");

          return (
            <button
              key={course.id}
              type="button"
              onClick={() => onSelectCourse(course)}
              className="aspect-square neumorphic-button rounded-3xl p-3.5 flex flex-col items-center justify-center text-center gap-2 cursor-pointer group transition-all active:scale-[0.98]"
            >
              <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-100/80 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white group-hover:scale-105 transition-all shadow-xs shrink-0">
                {icon}
              </div>
              <div className="flex flex-col items-center px-1">
                <span
                  className={`text-sm font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors tracking-tight leading-snug ${
                    isShamail ? "font-['Amiri',_'Plus_Jakarta_Sans',_sans-serif]" : ""
                  }`}
                >
                  {course.title}
                </span>
                {isShamail && (
                  <span className="text-[9.5px] font-semibold text-slate-400 group-hover:text-purple-500 transition-colors line-clamp-1 mt-0.5">
                    Ash-Shama&apos;il
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 2. Special Classes Module: Clickable Tajweed & Burdah Live Buttons */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Special Classes Module
            </h2>
          </div>
          <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2.5 py-0.5 rounded-full">
            Click for Details
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3.5">
          {specialClasses.slice(0, 2).map((spc) => {
            const isLive = spc.status === "LIVE_NOW";
            const isTajweed = spc.id.includes("tajweed");

            return (
              <button
                key={spc.id}
                type="button"
                onClick={() => setSelectedSpecialClass(spc)}
                className="neumorphic-button rounded-2xl p-3.5 flex flex-col justify-between text-left cursor-pointer group transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[110px]"
              >
                <div className="space-y-1.5 w-full">
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
                      {isTajweed ? <Mic className="w-4 h-4" /> : <Radio className="w-4 h-4 animate-pulse" />}
                    </div>
                    {isLive && (
                      <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                        Live
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                    {spc.title}
                  </h3>
                </div>

                <div className="pt-2 border-t border-purple-50/80 w-full flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-slate-500 leading-tight line-clamp-1">
                    {spc.scheduleTime.split("•")[0]?.trim() || spc.scheduleTime}
                  </p>
                  <span className="text-[10px] font-bold text-purple-600 shrink-0">
                    Details &rarr;
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Interactive Details Modal for Tajweed & Burdah Live */}
      <SpecialClassModal
        isOpen={Boolean(selectedSpecialClass)}
        onClose={() => setSelectedSpecialClass(null)}
        specialClass={selectedSpecialClass}
        userName="Student"
      />
    </div>
  );
}
