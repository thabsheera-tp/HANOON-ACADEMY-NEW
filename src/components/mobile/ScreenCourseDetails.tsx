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
  ChevronLeft,
  Award,
  Layers,
  Radio,
  Scroll,
  Lock,
} from "lucide-react";
import { SelectedCourse, PaymentDetails } from "@/types/app";
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
  paymentDetails?: PaymentDetails;
  isPaid?: boolean;
  onGoToDashboard?: () => void;
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
  paymentDetails,
  isPaid: isPaidProp,
  onGoToDashboard,
}: ScreenCourseDetailsProps) {
  const [subjects, setSubjects] = useState<AdaviyyaSubject[]>([]);
  const [activeSubject, setActiveSubject] = useState<AdaviyyaSubject | null>(null);
  const [specialClasses, setSpecialClasses] = useState<SpecialClass[]>([]);
  const [selectedSpecialClass, setSelectedSpecialClass] = useState<SpecialClass | null>(null);

  // Dynamic payment verification check
  const [internalIsPaid, setInternalIsPaid] = useState<boolean>(() => {
    if (typeof isPaidProp === "boolean") return isPaidProp;
    if (
      paymentDetails?.status === "verified" ||
      (paymentDetails?.status as string) === "APPROVED"
    ) {
      return true;
    }
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("hanoon_local_payments");
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          return list.some(
            (p: any) =>
              (p.status === "APPROVED" || p.status === "verified") &&
              (!selectedCourse.id ||
                p.course_id === selectedCourse.id ||
                p.course?.id === selectedCourse.id ||
                selectedCourse.id === "adaviyya" ||
                selectedCourse.id === "athaviy")
          );
        }
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    if (typeof isPaidProp === "boolean") {
      setInternalIsPaid(isPaidProp);
    }
  }, [isPaidProp]);

  useEffect(() => {
    if (
      paymentDetails?.status === "verified" ||
      (paymentDetails?.status as string) === "APPROVED"
    ) {
      setInternalIsPaid(true);
    }
  }, [paymentDetails?.status]);

  useEffect(() => {
    const handlePaymentEvent = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        const { status, course_id } = customEvt.detail;
        if (status === "APPROVED" || status === "verified") {
          if (
            !course_id ||
            course_id === selectedCourse.id ||
            selectedCourse.id === "adaviyya" ||
            selectedCourse.id === "athaviy"
          ) {
            setInternalIsPaid(true);
          }
        }
      }
    };
    window.addEventListener("hanoon_payment_event", handlePaymentEvent);
    return () => window.removeEventListener("hanoon_payment_event", handlePaymentEvent);
  }, [selectedCourse.id]);

  const isPaid = typeof isPaidProp === "boolean" ? isPaidProp : internalIsPaid;

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

  const isHomeTuition =
    selectedCourse.id === "home-tuition" ||
    selectedCourse.id === "tuition" ||
    selectedCourse.title.toLowerCase().includes("home tuition") ||
    selectedCourse.title.toLowerCase().includes("tuition");

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
    if (
      selectedCourse.id === "home-tuition" ||
      selectedCourse.id === "tuition" ||
      selectedCourse.title.toLowerCase().includes("home tuition") ||
      selectedCourse.title.toLowerCase().includes("tuition")
    ) {
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
            aria-label="Back"
            className="w-9 h-9 rounded-xl bg-white border border-purple-100 text-purple-700 hover:text-purple-900 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        <span className="text-[11px] font-bold text-purple-700 bg-white px-3 py-1 rounded-full border border-purple-100 shadow-xs ml-auto">
          {selectedCourse.duration}
        </span>
      </div>

      {/* Access Restriction Banner for Unpaid / Pending Students */}
      {!isPaid && (
        <div className="p-3.5 rounded-2xl bg-purple-100/70 border border-purple-200/80 shadow-xs flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 leading-tight">
                Enroll & Get Verified to Access Live Classes and Materials
              </p>
              <p className="text-[10px] text-slate-600 font-medium mt-0.5">
                Live interactive lecture halls & downloadable PDF notes unlock once verified
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onProceedToRegister}
            className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[11px] shadow-xs shrink-0 cursor-pointer transition-all whitespace-nowrap"
          >
            Enroll Now
          </button>
        </div>
      )}

      {/* 1. Course Header Card */}
      {isAthaviy ? (
        /* ADAVIYYA: Minimal title & badge only */
        <div className="neumorphic-card p-5 rounded-3xl space-y-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200 inline-block">
              Completed 4 Batches
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {selectedCourse.title}
          </h1>
        </div>
      ) : isHomeTuition ? (
        /* HOME TUITION: Minimal title & badge only, no secondary description */
        <div className="neumorphic-card p-5 rounded-3xl space-y-2">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-full border border-purple-200 inline-block">
              1-on-1 Personalized Mentorship
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {selectedCourse.title}
          </h1>
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

          {selectedCourse.highlights && selectedCourse.highlights.length > 0 && (
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
          )}
        </div>
      )}

      {/* 2. Subjects / Syllabus Section */}
      {isAthaviy ? (
        /* ADAVIYYA: 4 Subject buttons placed directly under the hero card without redundant headers */
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

              <div className="pt-2 border-t border-purple-50 text-[10px] font-bold flex items-center justify-between w-full">
                {isPaid ? (
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>{sub.chapters.length} Ch. (Unlocked)</span>
                  </span>
                ) : (
                  <span className="text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>{sub.chapters.length} Chapters</span>
                  </span>
                )}
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600" />
              </div>
            </button>
          ))}
        </div>
      ) : isHomeTuition ? (
        /* HOME TUITION: Clean module overview cards without bullet points or secondary fluff */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Curriculum Modules
              </h2>
            </div>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
              Full Term
            </span>
          </div>

          <div className="space-y-2">
            {syllabusModules.map((mod) => (
              <div
                key={mod.number}
                className="neumorphic-card p-3.5 rounded-2xl flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                    Module {mod.number}
                  </span>
                  <h3 className="text-xs font-extrabold text-slate-900">
                    {mod.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Non-Adaviyya / Non-HomeTuition: Structured Syllabus Modules */
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

      {/* 3. Distinct "Upcoming Special Classes" Section (For Adaviyya & Other Courses, Hidden for Home Tuition) */}
      {!isHomeTuition && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center gap-1.5 px-1">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
              Upcoming Special Classes
            </h2>
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
      )}

      {/* 4. Compact Pricing & Enrollment Card */}
      {isAthaviy ? (
        /* ADAVIYYA: Single clean card with immediate payable amount */
        <div className="neumorphic-card p-5 rounded-3xl space-y-4 mb-6">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs font-bold text-purple-700 block">
                Admission Fee (Immediate Payable)
              </span>
              <span className="text-[10px] text-slate-400">
                Unlock instant access to materials & live hubs (Total ₹3,000)
              </span>
            </div>
            <span className="text-2xl font-black text-purple-700">
              ₹500
            </span>
          </div>

          <div className="pt-1">
            {isPaid ? (
              <button
                type="button"
                onClick={onGoToDashboard || onProceedToRegister}
                className="w-full py-3.5 px-5 rounded-2xl font-extrabold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Course Enrolled & Active ✓ — Go to Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onProceedToRegister}
                className="w-full py-3.5 px-5 rounded-2xl font-extrabold text-xs text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Pay ₹500 Admission Fee & Enroll</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : isHomeTuition ? (
        /* HOME TUITION: Single clean card with immediate payable amount */
        <div className="neumorphic-card p-5 rounded-3xl space-y-4 mb-6">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs font-bold text-purple-700 block">
                Tuition Fee (Immediate Payable)
              </span>
              <span className="text-[10px] text-slate-400">
                1-on-1 personalized academic coaching
              </span>
            </div>
            <span className="text-2xl font-black text-purple-700">
              {selectedCourse.fee || "₹2,000"}
            </span>
          </div>

          <div className="pt-1">
            {isPaid ? (
              <button
                type="button"
                onClick={onGoToDashboard || onProceedToRegister}
                className="w-full py-3.5 px-5 rounded-2xl font-extrabold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Course Enrolled & Active ✓ — Go to Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onProceedToRegister}
                className="w-full py-3.5 px-5 rounded-2xl font-extrabold text-xs text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Pay ₹2,000 & Enroll Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Other Courses: Clean Compact Pricing Card */
        <div className="neumorphic-card p-5 rounded-3xl space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-purple-700 block">
                Total Course Fee
              </span>
              <span className="text-[10px] text-slate-400">
                One-time enrollment
              </span>
            </div>
            <span className="text-2xl font-black text-purple-700">
              {selectedCourse.fee}
            </span>
          </div>

          <div className="pt-1">
            {isPaid ? (
              <button
                type="button"
                onClick={onGoToDashboard || onProceedToRegister}
                className="w-full py-3.5 px-5 rounded-2xl font-extrabold text-xs text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Course Enrolled & Active ✓ — Go to Dashboard</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onProceedToRegister}
                className="w-full py-3.5 px-5 rounded-2xl font-extrabold text-xs text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Enroll in this Course</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal for viewing Adaviyya Subject Chapter syllabus */}
      <SubjectClassHubModal
        isOpen={Boolean(activeSubject)}
        onClose={() => setActiveSubject(null)}
        subject={activeSubject}
        studentName="Student"
        isPaid={isPaid}
        onEnroll={() => {
          setActiveSubject(null);
          onProceedToRegister();
        }}
      />

      {/* Modal for viewing Upcoming Special Classes */}
      <SpecialClassModal
        isOpen={Boolean(selectedSpecialClass)}
        onClose={() => setSelectedSpecialClass(null)}
        specialClass={selectedSpecialClass}
        userName="Student"
        isPaid={isPaid}
        onEnroll={() => {
          setSelectedSpecialClass(null);
          onProceedToRegister();
        }}
      />
    </div>
  );
}

