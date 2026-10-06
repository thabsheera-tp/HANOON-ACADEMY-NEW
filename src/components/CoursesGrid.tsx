"use client";

import React from "react";
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  Scissors,
  CheckCircle2,
  Clock,
  Calendar,
  ArrowRight,
  Star,
  Users,
} from "lucide-react";

export interface Course {
  id: string;
  title: string;
  malayalamTitle: string;
  badge: string;
  badgeType: "featured" | "popular" | "skill";
  description: string;
  fee: string;
  feePeriod: string;
  duration: string;
  mode: string;
  highlights: string[];
  idealFor: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const COURSES: Course[] = [
  {
    id: "athaviy",
    title: "Athaviy",
    malayalamTitle: "അഥവിയ",
    badge: "Flagship Islamic Program",
    badgeType: "featured",
    description:
      "A transformative Islamic curriculum synthesizing Quranic exegesis, Hadith studies, classical jurisprudence (Fiqh), Arabic literacy, and moral character development (Tarbiyah).",
    fee: "₹1,500",
    feePeriod: "/ month",
    duration: "1 Year (Comprehensive)",
    mode: "Interactive Online & Weekend Batches",
    highlights: [
      "Quranic Tajweed & Hifz Guidance",
      "Practical Fiqh & Daily Life Ethics",
      "Arabic Grammar & Spoken Basics",
      "Personalized Spiritual Mentorship",
    ],
    idealFor: "Students, Youth & Professionals seeking structured Islamic knowledge",
    icon: BookOpen,
  },
  {
    id: "home-tuition",
    title: "Home Tuition",
    malayalamTitle: "ഹോം ട്യൂഷൻ",
    badge: "Personalized Tutoring",
    badgeType: "popular",
    description:
      "Tailored 1-on-1 and focused small-batch tutoring for CBSE, Kerala State, and ICSE curricula with vetted, caring educators dedicated to academic excellence and concept clarity.",
    fee: "₹2,000",
    feePeriod: "/ month",
    duration: "Flexible / Term-wise",
    mode: "Home Visits / Live 1-on-1 Online",
    highlights: [
      "Customized Pace & Individual Attention",
      "Mathematics, Science & Language Mastery",
      "Regular Assessments & Parent Progress Reviews",
      "Exam Preparation & Doubt Clearance",
    ],
    idealFor: "Grades 1 to 12 & College Foundation Students",
    icon: GraduationCap,
  },
  {
    id: "fashion-designing",
    title: "Fashion Designing",
    malayalamTitle: "ഫാഷൻ ഡിസൈനിങ്",
    badge: "Creative Career Track",
    badgeType: "skill",
    description:
      "A hands-on professional certificate course in modest apparel designing, pattern drafting, garment construction, tailoring craftsmanship, and boutique entrepreneurship.",
    fee: "₹2,500",
    feePeriod: "/ month",
    duration: "6 Months Intensive",
    mode: "Hands-on Hybrid & Studio Workshops",
    highlights: [
      "Modest Fashion Styling & Illustration",
      "Accurate Pattern Making & Garment Stitching",
      "Fabric Selection & Color Theory",
      "Boutique Launch & E-Commerce Guidance",
    ],
    idealFor: "Aspiring Designers, Homemakers & Creative Entrepreneurs",
    icon: Scissors,
  },
];

interface CoursesGridProps {
  onOpenEnrollModal?: (courseTitle?: string) => void;
}

export default function CoursesGrid({ onOpenEnrollModal }: CoursesGridProps) {
  return (
    <section id="courses" className="py-20 md:py-28 relative bg-[#F0FDF4]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#047857]/20 text-[#047857] text-xs sm:text-sm font-bold tracking-wide shadow-xs">
            <Sparkles className="w-4 h-4 text-[#D97706]" />
            <span>Structured Educational Tracks</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] tracking-tight">
            Our Core <span className="text-[#047857]">Academic & Skill</span> Programs
          </h2>

          <p className="text-base sm:text-lg text-[#0F172A]/70 leading-relaxed font-normal">
            Choose from our three signature pathways designed to nurture spiritual clarity, academic success, and practical creative mastery.
          </p>
        </div>

        {/* 3 Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
          {COURSES.map((course) => {
            const Icon = course.icon;
            const isFeatured = course.badgeType === "featured";

            return (
              <div
                key={course.id}
                className={`relative bg-white rounded-3xl p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl ${
                  isFeatured
                    ? "border-2 border-[#047857] shadow-xl shadow-[#047857]/10"
                    : "border border-gray-150 shadow-md hover:border-[#047857]/30"
                }`}
              >
                {/* Top Badge for Featured */}
                {isFeatured && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#047857] text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-[#D97706] text-[#D97706]" />
                    <span>Most Popular</span>
                  </div>
                )}

                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                        isFeatured
                          ? "bg-[#047857] text-white shadow-md shadow-[#047857]/25"
                          : "bg-[#F0FDF4] text-[#047857] border border-[#047857]/20"
                      }`}
                    >
                      <Icon className="w-7 h-7" />
                    </div>

                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        course.badgeType === "featured"
                          ? "bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/30"
                          : course.badgeType === "skill"
                          ? "bg-amber-50 text-[#D97706] border border-[#D97706]/20"
                          : "bg-[#F0FDF4] text-[#047857] border border-[#047857]/20"
                      }`}
                    >
                      {course.badge}
                    </span>
                  </div>

                  {/* Course Title with Malayalam subtitle */}
                  <div className="mb-3">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h3 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                        {course.title}
                      </h3>
                      <span className="text-base font-semibold text-[#047857]">
                        ({course.malayalamTitle})
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-[#0F172A]/75 leading-relaxed mb-6 font-normal min-h-[72px]">
                    {course.description}
                  </p>

                  {/* Duration & Mode Badges */}
                  <div className="space-y-2 py-3 border-y border-gray-100 mb-6 text-xs text-[#0F172A]/70">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#047857] shrink-0" />
                      <span className="font-semibold text-[#0F172A]">Duration:</span>
                      <span>{course.duration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#D97706] shrink-0" />
                      <span className="font-semibold text-[#0F172A]">Mode:</span>
                      <span>{course.mode}</span>
                    </div>
                  </div>

                  {/* Key Highlights */}
                  <div className="mb-6">
                    <p className="text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-3">
                      Course Highlights:
                    </p>
                    <ul className="space-y-2.5">
                      {course.highlights.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs text-[#0F172A]/80">
                          <CheckCircle2 className="w-4 h-4 text-[#047857] shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Footer: Fee & Enroll Button */}
                <div className="pt-6 border-t border-gray-100 mt-auto">
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <span className="text-xs text-[#0F172A]/60 block font-medium">Monthly Tuition Fee</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-extrabold text-[#047857]">{course.fee}</span>
                        <span className="text-xs font-semibold text-[#0F172A]/60">{course.feePeriod}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-[#D97706] bg-[#FEF3C7] px-2.5 py-1 rounded-md">
                      Flexible Installments
                    </span>
                  </div>

                  <button
                    onClick={() => onOpenEnrollModal && onOpenEnrollModal(`${course.title} (${course.malayalamTitle})`)}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all transform active:scale-98 ${
                      isFeatured
                        ? "bg-[#047857] hover:bg-[#035e44] text-white shadow-md shadow-[#047857]/30 hover:shadow-lg"
                        : "bg-white text-[#047857] border-2 border-[#047857] hover:bg-[#047857] hover:text-white"
                    }`}
                  >
                    <span>Enroll Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
