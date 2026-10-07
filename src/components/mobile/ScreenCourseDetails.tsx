"use client";

import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Sparkles,
  Scale,
  Mic,
  ChevronRight,
  Award,
  Layers,
  FileCheck,
  Radio,
  Scroll,
} from "lucide-react";
import { SelectedCourse } from "@/types/app";
import {
  AdaviyyaSubject,
  getAdaviyyaSubjects,
} from "@/services/subjectService";
import { SpecialClass, getSpecialClasses } from "@/services/specialClassService";
import SubjectClassHubModal from "@/components/mobile/SubjectClassHubModal";
import SpecialClassModal from "@/components/mobile/SpecialClassModal";

interface ScreenCourseDetailsProps {
  selectedCourse: SelectedCourse;
  onProceedToRegister: () => void;
  onBackToCourses?: () => void;
}

interface SyllabusModule {
  number: string;
  title: string;
  topics: string[];
}

export default function ScreenCourseDetails({
  selectedCourse,
  onProceedToRegister,
  onBackToCourses,
}: ScreenCourseDetailsProps) {
  const [subjects, setSubjects] = useState<AdaviyyaSubject[]>([]);
  const [activeSubject, setActiveSubject] = useState<AdaviyyaSubject | null>(null);
  const [specialClasses, setSpecialClasses] = useState<SpecialClass[]>([]);
  const [selectedSpecialClass, setSelectedSpecialClass] = useState<SpecialClass | null>(null);

  useEffect(() => {
    const loaded = getAdaviyyaSubjects();
    setSubjects(loaded);
    setSpecialClasses(getSpecialClasses());

    const handleUpdate = (e: CustomEvent<AdaviyyaSubject[]>) => {
      if (e.detail) {
        setSubjects(e.detail);
      } else {
        setSubjects(getAdaviyyaSubjects());
      }
    };

    window.addEventListener("hanoon_subjects_updated", handleUpdate as EventListener);
    return () => window.removeEventListener("hanoon_subjects_updated", handleUpdate as EventListener);
  }, []);

  const isAthaviy =
    selectedCourse.id === "adaviyya" ||
    selectedCourse.id === "athaviy" ||
    selectedCourse.title.toLowerCase().includes("athaviy") ||
    selectedCourse.title.toLowerCase().includes("adaviyya");

  const getSubjectIcon = (iconType: string) => {
    switch (iconType) {
      case "book":
        return <BookOpen className="w-4 h-4 text-purple-600" />;
      case "sparkles":
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case "scale":
        return <Scale className="w-4 h-4 text-purple-600" />;
      case "scroll":
        return <Scroll className="w-4 h-4 text-purple-600" />;
      case "mic":
        return <Mic className="w-4 h-4 text-purple-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-purple-600" />;
    }
  };

  // Syllabus modules for non-Athaviy courses
  const getSyllabusModules = (): SyllabusModule[] => {
    if (selectedCourse.id === "home-tuition") {
      return [
        {
          number: "01",
          title: "Diagnostic Assessment & Custom Study Roadmap",
          topics: [
            "Baseline curriculum evaluation (CBSE / State / ICSE)",
            "Targeted score milestones & personalized study schedule",
            "Individual subject mentor assignment",
          ],
        },
        {
          number: "02",
          title: "Core Mathematics & Analytical Problem Solving",
          topics: [
            "Foundational algebra, geometry & trigonometry",
            "Step-by-step problem breakdown & speed calculation",
            "Formula retention & shortcut problem-solving methods",
          ],
        },
        {
          number: "03",
          title: "Natural Sciences & Conceptual Clarity",
          topics: [
            "Physics mechanics, optics & electricity concepts",
            "Chemistry equations, organic basics & periodic trends",
            "Biology diagram labeling, anatomy & processes",
          ],
        },
        {
          number: "04",
          title: "Weekly Mock Tests & Exam Mastery",
          topics: [
            "Chapter-end timed tests & past paper drills",
            "Mistake analysis & individual doubt clarification",
            "Weekly performance dashboard for parents",
          ],
        },
      ];
    }

    if (selectedCourse.id === "fashion-designing") {
      return [
        {
          number: "01",
          title: "Pattern Drafting & Body Measurement Science",
          topics: [
            "Anatomical measurement techniques & standard charts",
            "Basic sloper drafting (bodice, sleeve, skirt)",
            "Drafting tools, darts, pleats & grading basics",
          ],
        },
        {
          number: "02",
          title: "Fabric Science & Precision Cutting",
          topics: [
            "Textile properties (cotton, linen, crepe, silk)",
            "Grainline alignment & precision fabric cutting",
            "Interfacing, lining & seam allowance allowances",
          ],
        },
        {
          number: "03",
          title: "Modest Apparel Construction & Stitching",
          topics: [
            "Abaya, jilbab, kaftan & modest tunic tailored drafting",
            "Industrial machine operation & French seams",
            "Neckline facings, concealed zippers & piping finishes",
          ],
        },
        {
          number: "04",
          title: "Boutique Entrepreneurship & Studio Launch",
          topics: [
            "Garment costing, fabric sourcing & pricing models",
            "Digital catalogue & client lookbook creation",
            "Setting up your home atelier or boutique studio",
          ],
        },
      ];
    }

    if (
      selectedCourse.id === "shamail-muhammadiyya" ||
      selectedCourse.title.includes("الشمائل") ||
      selectedCourse.title.toLowerCase().includes("shamail")
    ) {
      return [
        {
          number: "01",
          title: "Introduction to Hadith Methodology & al-Tirmidhi",
          topics: [
            "Biographical sketch of Imam al-Tirmidhi and his compilation",
            "Significance of knowing the Prophetic Shamail",
            "Chains of narration and classical commentaries",
          ],
        },
        {
          number: "02",
          title: "Noble Physical Description & Comportment (الخلقة الشريفة)",
          topics: [
            "Features, blessed hair, seal of prophethood, and complexion",
            "Manner of walking, sitting, speech, and laughter",
            "Attire, turban, rings, footwear, and personal effects",
          ],
        },
        {
          number: "03",
          title: "Daily Life, Etiquette & Nourishment (المعيشة والأخلاق)",
          topics: [
            "Food, drink, table manners, and hospitality",
            "Fragrance, sleep habits, and nightly devotions",
            "Interactions with family, companions, and the youth",
          ],
        },
        {
          number: "04",
          title: "Sublime Character & Spiritual Emulation (الأخلاق والعبادة)",
          topics: [
            "Humility, compassion, modesty, and courage",
            "Worship, supplications, fasting, and weeping in prayer",
            "Final days, legacy, and practical daily emulation",
          ],
        },
      ];
    }

    return [
      {
        number: "01",
        title: "Foundations & Theory",
        topics: ["Core principles", "Terminology and definitions", "Historical context"],
      },
      {
        number: "02",
        title: "Advanced Practical Application",
        topics: ["Applied techniques", "Case studies", "Guided project work"],
      },
    ];
  };

  const syllabusModules = getSyllabusModules();

  return (
    <div className="w-full max-w-md mx-auto px-5 py-5 flex-1 flex flex-col justify-start space-y-5 select-none font-['Plus_Jakarta_Sans'] bg-purple-50/40">
      {/* Top Navigation & Back Action */}
      <div className="flex items-center justify-between">
        {onBackToCourses && (
          <button
            type="button"
            onClick={onBackToCourses}
            className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-purple-100 shadow-xs transition-colors"
          >
            <span>← Back to Catalog</span>
          </button>
        )}

        <span className="text-[11px] font-bold text-purple-700 bg-white px-3 py-1 rounded-full border border-purple-100 shadow-xs ml-auto">
          {selectedCourse.duration}
        </span>
      </div>

      {/* 1. Course Header Card */}
      {isAthaviy ? (
        /* ADAVIYYA: Clean UI with subtle "Completed 4 Batches" badge - NO long descriptions */
        <div className="neumorphic-card p-5 rounded-3xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200">
              Completed 4 Batches
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-purple-50 px-2 py-0.5 rounded-full">
              4 Core Subjects
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {selectedCourse.title}
          </h1>

          <p className="text-xs text-slate-600 font-semibold">
            {selectedCourse.subtitle || "Islamic Sharia & Moral Tarbiyah (4 Core Hubs)"}
          </p>
        </div>
      ) : (
        /* Other Courses: Standard Header */
        <div className="neumorphic-card p-5 rounded-3xl space-y-3">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {selectedCourse.title}
          </h1>

          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            {selectedCourse.tagline || selectedCourse.subtitle}
          </p>

          <div className="pt-2 border-t border-purple-50 flex flex-wrap gap-1.5">
            {selectedCourse.highlights.map((item, idx) => (
              <span
                key={idx}
                className="text-[10px] font-semibold text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100"
              >
                ✓ {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 2. Subjects / Syllabus Section */}
      {isAthaviy ? (
        /* ADAVIYYA: Display ONLY Clean Interactive Course/Subject Buttons */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-purple-600" />
              <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                Interactive Course Subjects (4 Hubs)
              </h2>
            </div>
            <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
              Tap to View Hub
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {subjects.map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => setActiveSubject(sub)}
                className="neumorphic-button p-4 rounded-2xl flex flex-col justify-between space-y-2.5 text-left group cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div>
                  <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center mb-2 shadow-xs group-hover:bg-purple-600 group-hover:text-white transition-all">
                    {getSubjectIcon(sub.iconType)}
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors">
                    {sub.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {sub.subtitle}
                  </p>
                </div>

                <div className="pt-2 border-t border-purple-50 text-[10px] text-purple-600 font-bold flex items-center justify-between w-full">
                  <span>{sub.chapters.length} Chapters</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* Non-Adaviyya: Structured Syllabus Modules */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Detailed Course Syllabus
              </h2>
            </div>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
              Full Term
            </span>
          </div>

          <div className="space-y-2.5">
            {syllabusModules.map((mod) => (
              <div
                key={mod.number}
                className="neumorphic-card p-4 rounded-2xl space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                    Module {mod.number}
                  </span>
                  <h3 className="text-xs font-extrabold text-slate-900">
                    {mod.title}
                  </h3>
                </div>
                <ul className="space-y-1 pl-1">
                  {mod.topics.map((topic, i) => (
                    <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                      <span className="text-purple-500 font-bold">•</span>
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Distinct "Upcoming Special Classes" Section (For Adaviyya & All Courses) */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Upcoming Special Classes
            </h2>
          </div>
          <span className="text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
            Special Sessions
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {specialClasses.slice(0, 2).map((spc) => {
            const isTajweed = spc.id.includes("tajweed");

            return (
              <button
                key={spc.id}
                type="button"
                onClick={() => setSelectedSpecialClass(spc)}
                className="neumorphic-button rounded-2xl p-3 flex flex-col justify-between text-left cursor-pointer group transition-all hover:scale-[1.02] active:scale-[0.98] min-h-[95px]"
              >
                <div className="space-y-1 w-full">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                    {isTajweed ? <Mic className="w-3.5 h-3.5" /> : <Radio className="w-3.5 h-3.5 animate-pulse" />}
                  </div>
                  <h3 className="text-xs font-extrabold text-slate-900 group-hover:text-purple-700 transition-colors leading-tight">
                    {spc.title}
                  </h3>
                </div>

                <div className="pt-1.5 border-t border-purple-50 w-full flex items-center justify-between">
                  <span className="text-[9.5px] font-semibold text-slate-500 truncate">
                    {spc.scheduleTime.split("•")[0]?.trim() || "Live Class"}
                  </span>
                  <span className="text-[9.5px] font-bold text-purple-600 shrink-0">
                    &rarr;
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Pricing & Updated Fee Structure */}
      <div className="neumorphic-card p-5 rounded-3xl space-y-3.5">
        {isAthaviy ? (
          /* ADAVIYYA UPDATED FEE STRUCTURE */
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  Course Fee Structure
                </span>
                <div className="space-y-0.5 mt-0.5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900 tracking-tight">
                      Total Fee: ₹3,000
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-purple-700">
                    <span className="bg-purple-100 px-2 py-0.5 rounded-md">
                      Admission Fee: ₹500
                    </span>
                  </div>
                </div>
              </div>

              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100">
                Installments Available
              </span>
            </div>

            {/* Helper Text */}
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 text-xs text-purple-900 font-medium leading-relaxed">
              💡 <strong>Pay the ₹500 admission fee now to unlock the course.</strong> The balance can be paid later in installments.
            </div>
          </div>
        ) : (
          /* Other Courses Fee Display */
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Enrollment Tuition Fee
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-purple-700 tracking-tight">
                  {selectedCourse.fee}
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  / One-time
                </span>
              </div>
            </div>

            <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-100">
              All Inclusive
            </span>
          </div>
        )}

        {/* Inclusions List */}
        <div className="space-y-2 pt-2 border-t border-purple-50">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Complete Academic Term Access & Live Classes</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <FileCheck className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Downloadable PDF Notes & Digital Study Material</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <Award className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Official Digital Certificate Issued Upon Completion</span>
          </div>
        </div>
      </div>

      {/* 5. Progressive Enrollment CTA Button */}
      <div className="pt-2 pb-6">
        <button
          type="button"
          onClick={onProceedToRegister}
          className="w-full py-4 px-6 rounded-2xl font-extrabold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>
            {isAthaviy ? "Pay ₹500 Admission Fee to Unlock Course" : "Enroll in this Course"}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Modal for viewing Adaviyya Subject Chapter syllabus */}
      <SubjectClassHubModal
        isOpen={Boolean(activeSubject)}
        onClose={() => setActiveSubject(null)}
        subject={activeSubject}
      />

      {/* Modal for viewing Upcoming Special Classes */}
      <SpecialClassModal
        isOpen={Boolean(selectedSpecialClass)}
        onClose={() => setSelectedSpecialClass(null)}
        specialClass={selectedSpecialClass}
        userName="Student"
      />
    </div>
  );
}

