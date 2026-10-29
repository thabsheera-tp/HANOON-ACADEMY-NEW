"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Upload,
  BookOpen,
  CheckCircle2,
  Trash2,
  Download,
  AlertCircle,
  FileUp,
  Clock,
  Search,
  Filter,
  Check,
  Video,
  Play,
  Calendar,
  Bell,
  X,
  Radio,
} from "lucide-react";
import {
  getAdaviyyaSubjects,
  deleteChapterFromSubject,
  AdaviyyaSubject,
} from "@/services/subjectService";
import {
  getCourseMaterials,
  deleteCourseMaterial,
  fetchCourseMaterialsFromSupabase,
  saveRecordedClassToSupabase,
  CourseMaterial,
} from "@/services/teacherService";
import {
  triggerNotesUploadedNotification,
  triggerRecordedClassNotification,
} from "@/services/notificationService";
import { SHOWCASE_COURSES } from "@/components/mobile/ScreenCoursesList";

interface PdfNotesUploadSectionProps {
  currentUserRole?: string;
  currentUserName?: string;
}

export default function PdfNotesUploadSection({
  currentUserRole = "Staff",
  currentUserName = "Staff Verifier",
}: PdfNotesUploadSectionProps) {
  // Navigation: Active Form Section ("PDF" | "RECORDED")
  const [activeActionSection, setActiveActionSection] = useState<"PDF" | "RECORDED">("PDF");

  // ==========================================
  // SECTION 1: PDF NOTES UPLOAD FORM STATE
  // ==========================================
  const [pdfCourseId, setPdfCourseId] = useState<string>("adaviyya");
  const [pdfSubjectId, setPdfSubjectId] = useState<string>("seerah");
  const [pdfChapterTitle, setPdfChapterTitle] = useState("");
  const [pdfSessionDate, setPdfSessionDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [pdfEstimatedDuration, setPdfEstimatedDuration] = useState("25 mins read");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfFileSize, setPdfFileSize] = useState("");
  const [pdfFileDataUrl, setPdfFileDataUrl] = useState("");
  const [customPdfUrl, setCustomPdfUrl] = useState("");
  const [isSubmittingPdf, setIsSubmittingPdf] = useState(false);

  // ==========================================
  // SECTION 2: RECORDED CLASS LINK FORM STATE
  // ==========================================
  const [recCourseId, setRecCourseId] = useState<string>("adaviyya");
  const [recSubjectId, setRecSubjectId] = useState<string>("seerah");
  const [recClassTitle, setRecClassTitle] = useState("");
  const [recSessionDate, setRecSessionDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [recordedClassLink, setRecordedClassLink] = useState("");
  const [recEstimatedDuration, setRecEstimatedDuration] = useState("45 mins");
  const [isSubmittingRecorded, setIsSubmittingRecorded] = useState(false);

  // ==========================================
  // UI FEEDBACK & SHARED DATA STATES
  // ==========================================
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterCourse, setFilterCourse] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [adaviyyaSubjects, setAdaviyyaSubjects] = useState<AdaviyyaSubject[]>([]);

  // Load initial materials and subjects
  useEffect(() => {
    setMaterials(getCourseMaterials());
    setAdaviyyaSubjects(getAdaviyyaSubjects());

    const handleUpdate = () => {
      setMaterials(getCourseMaterials());
      setAdaviyyaSubjects(getAdaviyyaSubjects());
    };

    window.addEventListener("hanoon_material_uploaded", handleUpdate);
    window.addEventListener("hanoon_subjects_updated", handleUpdate);
    return () => {
      window.removeEventListener("hanoon_material_uploaded", handleUpdate);
      window.removeEventListener("hanoon_subjects_updated", handleUpdate);
    };
  }, []);

  const selectedPdfCourse =
    SHOWCASE_COURSES.find((c) => c.id === pdfCourseId) || SHOWCASE_COURSES[0];
  const isPdfAdaviyya = pdfCourseId === "adaviyya";

  const selectedRecCourse =
    SHOWCASE_COURSES.find((c) => c.id === recCourseId) || SHOWCASE_COURSES[0];
  const isRecAdaviyya = recCourseId === "adaviyya";

  // PDF File Selection & Data URL Reader
  const handlePdfFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setErrorMessage("Please select a valid PDF document (.pdf).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File exceeds 10MB limit. Please upload an optimized PDF under 10MB.");
      return;
    }

    setErrorMessage(null);
    setPdfFile(file);
    setPdfFileName(file.name);

    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    setPdfFileSize(`${sizeInMb} MB`);

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setPdfFileDataUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleClearPdfFile = () => {
    setPdfFile(null);
    setPdfFileName("");
    setPdfFileSize("");
    setPdfFileDataUrl("");
  };

  const handleResetPdfForm = () => {
    setPdfChapterTitle("");
    setPdfSessionDate(new Date().toISOString().split("T")[0]);
    setPdfEstimatedDuration("25 mins read");
    setPdfFile(null);
    setPdfFileName("");
    setPdfFileSize("");
    setPdfFileDataUrl("");
    setCustomPdfUrl("");
  };

  const handleResetRecForm = () => {
    setRecClassTitle("");
    setRecSessionDate(new Date().toISOString().split("T")[0]);
    setRecordedClassLink("");
    setRecEstimatedDuration("45 mins");
  };

  // =========================================================================
  // SECTION 1: STANDALONE SUBMIT FOR PDF NOTES (NO VIDEO LINK REQUIRED)
  // =========================================================================
  const handleSubmitPdfNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfChapterTitle.trim()) {
      setErrorMessage("Please enter a Chapter or Notes Title.");
      return;
    }

    const finalPdfUrl = pdfFileDataUrl || customPdfUrl.trim();
    const finalPdfTitle =
      pdfFileName || (finalPdfUrl ? `${pdfChapterTitle.trim()}.pdf` : "");
    const finalSize = pdfFileSize || (finalPdfUrl ? "3.5 MB" : "Official PDF");

    if (!finalPdfUrl) {
      setErrorMessage("Please select a PDF file (.pdf) or provide a direct PDF document URL.");
      return;
    }

    setIsSubmittingPdf(true);
    setErrorMessage(null);

    try {
      const subjectObj = adaviyyaSubjects.find((s) => s.id === pdfSubjectId);
      const subjectName = isPdfAdaviyya && subjectObj ? subjectObj.name : undefined;

      // 1. Save PDF notes to Supabase & Course Materials
      await saveRecordedClassToSupabase({
        title: pdfChapterTitle.trim(),
        courseId: pdfCourseId,
        courseName: selectedPdfCourse.title,
        subjectId: isPdfAdaviyya ? pdfSubjectId : undefined,
        subjectName,
        date: pdfSessionDate,
        time: "19:30",
        pdfUrl: finalPdfUrl,
        pdfTitle: finalPdfTitle,
        pdfSize: finalSize,
        teacherName: currentUserName,
        duration: pdfEstimatedDuration,
      });

      // 2. Trigger instant PDF Notes notification to enrolled students
      triggerNotesUploadedNotification({
        chapterTitle: pdfChapterTitle.trim(),
        courseName: selectedPdfCourse.title,
        courseId: pdfCourseId,
        subjectName,
        pdfTitle: finalPdfTitle,
        pdfSize: finalSize,
        pdfUrl: finalPdfUrl,
        senderName: currentUserName,
      });

      // 3. Refresh materials list
      const freshMaterials = await fetchCourseMaterialsFromSupabase(pdfCourseId);
      setMaterials(freshMaterials);

      setSuccessMessage(
        `📚 PDF Notes "${finalPdfTitle}" uploaded successfully and broadcasted to enrolled students!`
      );
      handleResetPdfForm();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Failed to upload PDF notes:", err);
      setErrorMessage("Failed to upload PDF notes. Please try again.");
    } finally {
      setIsSubmittingPdf(false);
    }
  };

  // =========================================================================
  // SECTION 2: STANDALONE SUBMIT FOR RECORDED CLASS LINK (NO PDF REQUIRED)
  // =========================================================================
  const handleSubmitRecordedClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recClassTitle.trim()) {
      setErrorMessage("Please enter a Class or Lecture Title.");
      return;
    }

    const cleanRecordedLink = recordedClassLink.trim();
    if (!cleanRecordedLink) {
      setErrorMessage("Please enter a valid Recorded Class Link (Google Drive / YouTube).");
      return;
    }

    setIsSubmittingRecorded(true);
    setErrorMessage(null);

    try {
      const subjectObj = adaviyyaSubjects.find((s) => s.id === recSubjectId);
      const subjectName = isRecAdaviyya && subjectObj ? subjectObj.name : undefined;

      // 1. Save Recorded Class Link to Supabase & Course Materials
      await saveRecordedClassToSupabase({
        title: recClassTitle.trim(),
        courseId: recCourseId,
        courseName: selectedRecCourse.title,
        subjectId: isRecAdaviyya ? recSubjectId : undefined,
        subjectName,
        date: recSessionDate,
        time: "19:30",
        recordedLink: cleanRecordedLink,
        teacherName: currentUserName,
        duration: recEstimatedDuration,
      });

      // 2. Trigger instant Recorded Class notification to enrolled students
      triggerRecordedClassNotification({
        title: recClassTitle.trim(),
        courseName: selectedRecCourse.title,
        courseId: recCourseId,
        recordingUrl: cleanRecordedLink,
        teacherName: currentUserName,
        senderName: currentUserName || "Academic Administration",
      });

      // 3. Refresh materials list
      const freshMaterials = await fetchCourseMaterialsFromSupabase(recCourseId);
      setMaterials(freshMaterials);

      setSuccessMessage(
        `▶️ Recorded Class Link for "${recClassTitle.trim()}" saved to Supabase and students successfully alerted!`
      );
      handleResetRecForm();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Failed to save recorded class link:", err);
      setErrorMessage("Failed to save recorded class link. Please try again.");
    } finally {
      setIsSubmittingRecorded(false);
    }
  };

  // Independent instant notification for any recorded class (from form or published list)
  const handleNotifyRecordedClass = (item?: {
    title: string;
    courseId: string;
    courseName?: string;
    recordingUrl?: string;
  }) => {
    const title = item?.title || recClassTitle.trim();
    const courseId = item?.courseId || recCourseId;
    const course = SHOWCASE_COURSES.find((c) => c.id === courseId);
    const courseName = item?.courseName || course?.title || "Adaviyya";
    const recordingUrl = item?.recordingUrl || recordedClassLink.trim();

    if (!recordingUrl) {
      setErrorMessage("Please provide a valid recorded class link first.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }

    triggerRecordedClassNotification({
      title: title || "New Class Recording",
      courseName,
      courseId,
      recordingUrl,
      teacherName: currentUserName || "Academic Faculty",
      senderName: currentUserName || "Administration",
    });

    setSuccessMessage(
      `🔔 Broadcasted: Enrolled students have been alerted for "${title || "Recorded Class"}"!`
    );
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Delete material
  const handleDeleteMaterial = (materialId: string, subjectId?: string) => {
    if (confirm("Are you sure you want to remove this academic content?")) {
      deleteCourseMaterial(materialId);
      if (subjectId) {
        deleteChapterFromSubject(subjectId, materialId);
      }
      setMaterials(getCourseMaterials());
      setAdaviyyaSubjects(getAdaviyyaSubjects());
      setSuccessMessage("Content successfully removed.");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  // Filtered materials
  const filteredMaterials = materials.filter((m) => {
    const matchesCourse = filterCourse === "ALL" || m.courseId === filterCourse;
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.fileOrUrl.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCourse && matchesSearch;
  });

  const pdfCount = materials.filter((m) => m.type === "PDF" || Boolean(m.pdfUrl)).length;
  const recordedCount = materials.filter(
    (m) => m.type === "VIDEO" || Boolean(m.recordingUrl)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-700 to-purple-900 rounded-3xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-purple-100">
              <FileUp className="w-3.5 h-3.5 text-purple-200" />
              <span>Independent Academic Actions Hub</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              PDF Notes & Recorded Class Portal
            </h2>
            <p className="text-xs sm:text-sm text-purple-100/90 max-w-xl leading-relaxed">
              Upload PDF study handbooks or publish Recorded Class replay links as two fully decoupled, independent actions with dedicated student notifications.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200 block">
                PDF Notes
              </span>
              <span className="text-2xl font-black text-white">{pdfCount}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center min-w-[90px]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200 block">
                Recorded Links
              </span>
              <span className="text-2xl font-black text-rose-100">{recordedCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success & Error Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-3 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-bold flex items-center gap-3 animate-fade-in shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Grid: Form Sections (Left) + Published Directory (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Decoupled Action Sections */}
        <div className="lg:col-span-5 space-y-4">
          {/* DECOUPLED ACTION SWITCHER TABS */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-purple-50/80 rounded-2xl border border-purple-100 shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setActiveActionSection("PDF");
                setErrorMessage(null);
              }}
              className={`py-3 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeActionSection === "PDF"
                  ? "bg-white text-purple-700 shadow-sm border border-purple-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-4 h-4 text-purple-600" />
              <span>1. Upload PDF Notes</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveActionSection("RECORDED");
                setErrorMessage(null);
              }}
              className={`py-3 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeActionSection === "RECORDED"
                  ? "bg-white text-rose-700 shadow-sm border border-rose-200/80"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Video className="w-4 h-4 text-rose-600" />
              <span>2. Add Recorded Class</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 1: UPLOAD PDF NOTES (COMPLETELY STANDALONE) */}
          {/* ========================================================================= */}
          {activeActionSection === "PDF" && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-xs space-y-5 animate-fade-in">
              <div className="border-b border-purple-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    <span>Section 1: Upload PDF Notes</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Attach course syllabi and study guides. Operates independently with zero video link required.
                  </p>
                </div>
                <span className="text-[10px] font-black text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                  PDF Only
                </span>
              </div>

              <form onSubmit={handleSubmitPdfNotes} className="space-y-4">
                {/* 1. Target Course */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Target Course <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={pdfCourseId}
                    onChange={(e) => setPdfCourseId(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer"
                  >
                    {SHOWCASE_COURSES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.duration})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Adaviyya Subject Selector */}
                {isPdfAdaviyya && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700 block">
                      Adaviyya Core Subject <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {adaviyyaSubjects.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => setPdfSubjectId(s.id)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                            pdfSubjectId === s.id
                              ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                              : "bg-purple-50/50 text-slate-700 border-purple-100 hover:border-purple-300"
                          }`}
                        >
                          <span className="block truncate">{s.name}</span>
                          <span className="text-[10px] block opacity-80 truncate">
                            {s.subtitle}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Chapter / Notes Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Chapter / Notes Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={pdfChapterTitle}
                    onChange={(e) => setPdfChapterTitle(e.target.value)}
                    placeholder="e.g. Fiqh Chapter 4: Taharah & Water Rulings"
                    className="w-full py-2.5 px-3.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* 4. Session Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      <span>Syllabus Session Date <span className="text-rose-500">*</span></span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">Class Reference</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={pdfSessionDate}
                    onChange={(e) => setPdfSessionDate(e.target.value)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all cursor-pointer"
                  />
                </div>

                {/* 5. PDF File Upload */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-600" />
                      <span>PDF Document File <span className="text-rose-500">*</span></span>
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      PDF Only (Max 10MB)
                    </span>
                  </div>

                  <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl p-4 text-center bg-purple-50/30 hover:bg-purple-50/60 transition-all cursor-pointer relative">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePdfFileChange}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                      <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                        <FileText className="w-5 h-5" />
                      </div>
                      {pdfFileName ? (
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-purple-700 block">
                            {pdfFileName}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            Size: {pdfFileSize} • Ready for Upload
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-bold text-slate-800 block">
                            Click or drag PDF study notes here
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Strictly for official student PDF handbooks under 10MB
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {pdfFileName && (
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-[11px] font-semibold text-purple-700 truncate max-w-[200px]">
                        Attached: {pdfFileName}
                      </span>
                      <button
                        type="button"
                        onClick={handleClearPdfFile}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 6. Alternative: Direct PDF URL */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 block">
                    Or Direct PDF Document URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={customPdfUrl}
                    onChange={(e) => setCustomPdfUrl(e.target.value)}
                    placeholder="https://example.com/notes.pdf"
                    className="w-full py-2 px-3 rounded-xl bg-purple-50/30 border border-purple-200/60 focus:border-purple-600 focus:bg-white text-xs font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* 7. Estimated Reading Duration */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Estimated Study / Reading Duration
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={pdfEstimatedDuration}
                      onChange={(e) => setPdfEstimatedDuration(e.target.value)}
                      placeholder="e.g. 25 mins read"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* STANDALONE SUBMIT BUTTON: UPLOAD PDF NOTES */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingPdf}
                    className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingPdf ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        <span>Publishing PDF Notes...</span>
                      </span>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Upload & Broadcast PDF Notes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: ADD RECORDED CLASS LINK (COMPLETELY STANDALONE) */}
          {/* ========================================================================= */}
          {activeActionSection === "RECORDED" && (
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-rose-100 shadow-xs space-y-5 animate-fade-in">
              <div className="border-b border-rose-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Video className="w-4 h-4 text-rose-600" />
                    <span>Section 2: Add Recorded Class Link</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Save Google Drive / YouTube recording replays. Operates independently with zero PDF required.
                  </p>
                </div>
                <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0">
                  Replay Link
                </span>
              </div>

              <form onSubmit={handleSubmitRecordedClass} className="space-y-4">
                {/* 1. Target Course */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Target Course <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={recCourseId}
                    onChange={(e) => setRecCourseId(e.target.value)}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-50/40 border border-rose-200/80 focus:border-rose-600 focus:bg-white text-xs sm:text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer"
                  >
                    {SHOWCASE_COURSES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} ({c.duration})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Adaviyya Subject Selector */}
                {isRecAdaviyya && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-700 block">
                      Adaviyya Core Subject <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {adaviyyaSubjects.map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => setRecSubjectId(s.id)}
                          className={`py-2 px-3 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                            recSubjectId === s.id
                              ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                              : "bg-rose-50/40 text-slate-700 border-rose-100 hover:border-rose-300"
                          }`}
                        >
                          <span className="block truncate">{s.name}</span>
                          <span className="text-[10px] block opacity-80 truncate">
                            {s.subtitle}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Class / Lecture Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Class / Lecture Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={recClassTitle}
                    onChange={(e) => setRecClassTitle(e.target.value)}
                    placeholder="e.g. Seerah Lecture 5: Battle of Badr Deep-Dive"
                    className="w-full py-2.5 px-3.5 rounded-xl bg-rose-50/40 border border-rose-200/80 focus:border-rose-600 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* 4. Session Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-rose-600" />
                      <span>Class Session Date <span className="text-rose-500">*</span></span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">Date of Lecture</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={recSessionDate}
                    onChange={(e) => setRecSessionDate(e.target.value)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-rose-50/40 border border-rose-200/80 focus:border-rose-600 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all cursor-pointer"
                  />
                </div>

                {/* 5. Recorded Class Link (Google Drive / YouTube) */}
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-rose-50/50 border border-rose-200/80">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-rose-600" />
                      <span>Recorded Class Link (Google Drive / YouTube) <span className="text-rose-500">*</span></span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleNotifyRecordedClass()}
                      className="py-1 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-[10.5px] font-extrabold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                      title="Test notify all enrolled students immediately about this recording"
                    >
                      <Bell className="w-3 h-3 text-white" />
                      <span>Notify Students</span>
                    </button>
                  </div>
                  <input
                    type="url"
                    required
                    value={recordedClassLink}
                    onChange={(e) => setRecordedClassLink(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... or https://youtube.com/watch?v=..."
                    className="w-full py-2.5 px-3.5 rounded-xl bg-white border border-rose-200 focus:border-rose-600 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
                  />
                  <span className="text-[10px] text-rose-600/90 font-medium block mt-1">
                    Supports Google Drive sharing links or unlisted/public YouTube videos.
                  </span>
                </div>

                {/* 6. Lecture Duration */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-700 block">
                    Recording Duration
                  </label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-rose-600 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={recEstimatedDuration}
                      onChange={(e) => setRecEstimatedDuration(e.target.value)}
                      placeholder="e.g. 45 mins"
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-rose-50/40 border border-rose-200/80 focus:border-rose-600 focus:bg-white text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* STANDALONE SUBMIT BUTTON: SAVE & NOTIFY STUDENTS */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingRecorded}
                    className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-rose-600/25 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isSubmittingRecorded ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        <span>Saving & Alerting Students...</span>
                      </span>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        <span>Save & Notify Students</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Published Notes & Recorded Class Library */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <span>Published Academic Content Directory</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Official PDF notes and lecture recording archives currently live for students.
                </p>
              </div>

              {/* Course Filter */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="py-1 px-2.5 rounded-lg bg-purple-50 text-[11px] font-bold text-slate-700 border border-purple-200 outline-none cursor-pointer"
                >
                  <option value="ALL">All Courses ({materials.length})</option>
                  {SHOWCASE_COURSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by chapter, course, or filename..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-purple-50/40 border border-purple-100 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            {/* List */}
            {filteredMaterials.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-purple-50/30 border border-purple-100/60 p-6 space-y-2">
                <FileText className="w-8 h-8 text-purple-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">No content found</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  {searchQuery || filterCourse !== "ALL"
                    ? "Try clearing your search or course filters."
                    : "Use Section 1 to upload PDF notes or Section 2 to add recorded classes."}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredMaterials.map((item) => {
                  const isVideo = item.type === "VIDEO" || Boolean(item.recordingUrl);
                  const isPdf = item.type === "PDF" || Boolean(item.pdfUrl);
                  const videoLink = item.recordingUrl || (isVideo ? item.fileOrUrl : null);

                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-purple-50/30 border border-purple-100/80 hover:border-purple-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                            isVideo
                              ? "bg-rose-100 text-rose-600"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {isVideo ? (
                            <Video className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                              {item.courseName}
                            </span>
                            {isVideo && (
                              <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 flex items-center gap-1">
                                <Play className="w-2.5 h-2.5 fill-current" />
                                <span>Recorded Class</span>
                              </span>
                            )}
                            {isPdf && !isVideo && (
                              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                                <FileText className="w-2.5 h-2.5" />
                                <span>PDF Notes</span>
                              </span>
                            )}
                            {item.sizeOrDuration && (
                              <span className="text-[10px] font-semibold text-slate-500">
                                {item.sizeOrDuration}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              • {item.sessionDate ? `Class: ${item.sessionDate}` : item.uploadedAt}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1">
                            <span>Link / File:</span>
                            <span className="font-mono text-purple-700 truncate max-w-xs">
                              {item.fileOrUrl}
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Decoupled Independent Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                        {videoLink && (
                          <>
                            {/* INDEPENDENT NOTIFY STUDENTS BUTTON FOR RECORDED CLASS */}
                            <button
                              type="button"
                              onClick={() =>
                                handleNotifyRecordedClass({
                                  title: item.title,
                                  courseId: item.courseId,
                                  courseName: item.courseName,
                                  recordingUrl: videoLink,
                                })
                              }
                              className="py-1.5 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Broadcast alert to all students without requiring any PDF"
                            >
                              <Bell className="w-3.5 h-3.5 text-purple-600" />
                              <span>Notify Students</span>
                            </button>

                            <a
                              href={videoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                              title="Watch Recorded Class (Opens Drive / YouTube)"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>▶️ Watch Replay</span>
                            </a>
                          </>
                        )}

                        {(item.pdfUrl || (isPdf && item.fileOrUrl)) && (
                          <a
                            href={item.pdfUrl || item.fileOrUrl}
                            download={item.fileOrUrl || "notes.pdf"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Download / View PDF Notes"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>PDF Notes</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteMaterial(item.id, item.subjectId)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Content"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-purple-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Showing {filteredMaterials.length} of {materials.length} published items
            </span>
            <span className="font-medium text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Decoupled Student Portal Sync Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
