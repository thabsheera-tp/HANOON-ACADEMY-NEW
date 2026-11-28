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
import {
  fetchAllStudyMaterials,
  StudyMaterial,
} from "@/services/studyMaterialService";
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

  // Strict payment verification check (strictly bound to verified status, no loose fallback)
  const isPaid = Boolean(
    isPaidProp ||
    paymentDetails?.status === "verified" ||
    (paymentDetails?.status as string) === "APPROVED" ||
    (paymentDetails?.status as string) === "ACTIVE"
  );

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

  // Dynamic Study Materials fetched from Supabase (Purged all dummy/hardcoded modules)
  const [courseMaterials, setCourseMaterials] = useState<StudyMaterial[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadMaterials = async () => {
      setMaterialsLoading(true);
      try {
        const data = await fetchAllStudyMaterials(selectedCourse.id);
        if (isMounted) {
          setCourseMaterials(data);
        }
      } catch (err) {
        console.warn("Failed to load course materials:", err);
      } finally {
        if (isMounted) setMaterialsLoading(false);
      }
    };

    loadMaterials();
    const handleUpdate = () => loadMaterials();
    window.addEventListener("hanoon_study_materials_updated", handleUpdate);
    window.addEventListener("hanoon_material_uploaded", handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener("hanoon_study_materials_updated", handleUpdate);
      window.removeEventListener("hanoon_material_uploaded", handleUpdate);
    };
  }, [selectedCourse.id]);

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
      ) : (
        /* Non-Athaviy Dynamic Curriculum Lessons & Materials (Purged all dummy modules) */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Curriculum Lessons & Materials
              </h2>
            </div>
            <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
              {materialsLoading
                ? "Checking..."
                : `${courseMaterials.length} Item${courseMaterials.length === 1 ? "" : "s"}`}
            </span>
          </div>

          {materialsLoading ? (
            <div className="py-8 text-center text-xs text-purple-600 space-y-2">
              <span className="inline-block w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="font-semibold text-slate-500">Loading lessons & materials...</p>
            </div>
          ) : courseMaterials.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl bg-white border border-purple-100 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                <BookOpen className="w-5 h-5 text-purple-600" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">No lessons uploaded yet</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Curriculum notes, lecture recordings, and syllabus materials will appear here once uploaded by your instructors.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {courseMaterials.map((mat) => (
                <div
                  key={mat.id}
                  className="neumorphic-card p-3.5 rounded-2xl flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
                      {mat.type === "link" ? (
                        <Radio className="w-4 h-4 text-purple-600" />
                      ) : (
                        <BookOpen className="w-4 h-4 text-purple-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-extrabold text-slate-900 truncate">
                        {mat.title}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {mat.subject ? `${mat.subject} • ` : ""}
                        {mat.type === "link" ? "Recorded Class Link" : "Official PDF Notes"}
                      </p>
                    </div>
                  </div>

                  {isPaid ? (
                    <a
                      href={mat.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-bold text-[11px] shrink-0 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <span>{mat.type === "link" ? "Watch" : "View"}</span>
                      <ChevronRight className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="py-1 px-2.5 rounded-xl bg-slate-100 text-slate-400 font-bold text-[10px] shrink-0 border border-slate-200 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
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
                <span>Enroll Now</span>
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
                <span>Enroll Now</span>
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
                <span>Enroll Now</span>
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

