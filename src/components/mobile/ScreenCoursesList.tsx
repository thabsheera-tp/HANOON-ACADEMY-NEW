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
    fee: "₹3,000",
    feeAmount: 3000,
    admissionFee: "₹500",
    admissionFeeAmount: 500,
    batchInfo: "Completed 4 Batches",
    installmentNote: "Pay the ₹500 admission fee now to unlock the course. The balance can be paid later in installments.",
    duration: "1 Year Academic Track",
    tagline: "Comprehensive foundation comprising 4 dedicated subjects: Seerah, Haddad, Fiqh, and Hadith.",
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
          // Preserve client-specified Adaviyya pricing overrides
          const merged = data.map((c) => {
            if (c.id === "adaviyya" || c.id === "athaviy") {
              return {
                ...c,
                fee: "₹3,000",
                feeAmount: 3000,
                admissionFee: "₹500",
                admissionFeeAmount: 500,
                batchInfo: "Completed 4 Batches",
                installmentNote: "Pay the ₹500 admission fee now to unlock the course. The balance can be paid later in installments.",
              };
            }
            return c;
          });
          setCourses(merged);
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
      {/* 1. Main Academic Programs: Balanced 2x2 Grid (Clean: Name & Icon Only) */}
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
              className="aspect-square bg-white border border-purple-100/90 hover:border-purple-300 rounded-3xl p-4 flex flex-col items-center justify-center text-center gap-2.5 cursor-pointer group transition-all hover:shadow-md active:scale-[0.98] shadow-xs relative overflow-hidden"
            >
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100/80 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white group-hover:scale-105 transition-all shadow-xs shrink-0">
                {icon}
              </div>

              <span
                className={`text-sm font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors tracking-tight leading-snug ${
                  isShamail ? "font-['Amiri',_'Plus_Jakarta_Sans',_sans-serif] text-base" : ""
                }`}
              >
                {course.title}
              </span>
            </button>
          );
        })}
      </div>

      {/* 2. Special Classes Section: Burdah Live Only + Upcoming Indicator */}
      {(() => {
        const burdahClass =
          specialClasses.find(
            (spc) =>
              spc.id.toLowerCase().includes("burdah") ||
              spc.title.toLowerCase().includes("burdah")
          ) || specialClasses[0];

        return (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Special Classes
                </h2>
              </div>
              <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2.5 py-0.5 rounded-full">
                Interactive Session
              </span>
            </div>

            {burdahClass && (
              <button
                type="button"
                onClick={() => setSelectedSpecialClass(burdahClass)}
                className="w-full bg-white border border-purple-100 hover:border-purple-300 rounded-2xl p-3.5 flex items-center justify-between text-left cursor-pointer group transition-all hover:shadow-md active:scale-[0.98] shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs shrink-0">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                      {burdahClass.title}
                    </h3>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                      {burdahClass.scheduleTime.split("•")[0]?.trim() || burdahClass.scheduleTime}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    Live
                  </span>
                  <span className="text-xs font-bold text-purple-600">
                    &rarr;
                  </span>
                </div>
              </button>
            )}

            <p className="text-center text-xs font-medium text-slate-400 italic pt-0.5">
              Special classes upcoming...
            </p>
          </div>
        );
      })()}

      {/* 3. Interactive Details Modal for Burdah Live */}
      <SpecialClassModal
        isOpen={Boolean(selectedSpecialClass)}
        onClose={() => setSelectedSpecialClass(null)}
        specialClass={selectedSpecialClass}
        userName="Student"
      />
    </div>
  );
}
