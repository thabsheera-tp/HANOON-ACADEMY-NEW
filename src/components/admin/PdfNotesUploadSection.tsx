"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  Upload,
  BookOpen,
  CheckCircle2,
  Trash2,
  Download,
  ExternalLink,
  AlertCircle,
  FileUp,
  Clock,
  Sparkles,
  Search,
  Filter,
  Check,
  Video,
  Play,
  PlayCircle,
  Calendar,
  Bell,
} from "lucide-react";
import {
  getAdaviyyaSubjects,
  addChapterToSubject,
  deleteChapterFromSubject,
  AdaviyyaSubject,
} from "@/services/subjectService";
import {
  getCourseMaterials,
  uploadCourseMaterial,
  deleteCourseMaterial,
  fetchCourseMaterialsFromSupabase,
  saveRecordedClassToSupabase,
  CourseMaterial,
} from "@/services/teacherService";
import { triggerNotesUploadedNotification, triggerRecordedClassNotification } from "@/services/notificationService";
import { SHOWCASE_COURSES } from "@/components/mobile/ScreenCoursesList";

interface PdfNotesUploadSectionProps {
  currentUserRole?: string;
  currentUserName?: string;
}

export default function PdfNotesUploadSection({
  currentUserRole = "Staff",
  currentUserName = "Staff Verifier",
}: PdfNotesUploadSectionProps) {
  // Form states
  const [selectedCourseId, setSelectedCourseId] = useState<string>("adaviyya");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("seerah");
  const [chapterTitle, setChapterTitle] = useState("");
  const [sessionDate, setSessionDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [recordedClassLink, setRecordedClassLink] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("45 mins");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfFileSize, setPdfFileSize] = useState("");
  const [pdfFileDataUrl, setPdfFileDataUrl] = useState("");
  const [customPdfUrl, setCustomPdfUrl] = useState("");

  // UI feedback states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filterCourse, setFilterCourse] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Data states
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [adaviyyaSubjects, setAdaviyyaSubjects] = useState<AdaviyyaSubject[]>([]);

  // Load existing data
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

  const selectedCourse = SHOWCASE_COURSES.find((c) => c.id === selectedCourseId) || SHOWCASE_COURSES[0];
  const isAdaviyya = selectedCourseId === "adaviyya";

  // Handle PDF file selection & conversion to Data URL for persistent storage
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      setErrorMessage("Please select a valid PDF document file (.pdf).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("File exceeds 10MB limit. Please upload an optimized PDF under 10MB.");
      return;
    }

    setErrorMessage(null);
    setPdfFile(file);
    setPdfFileName(file.name);

    // Calculate readable size
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

  const handleResetForm = () => {
    setChapterTitle("");
    setSessionDate(new Date().toISOString().split("T")[0]);
    setRecordedClassLink("");
    setEstimatedDuration("45 mins");
    setPdfFile(null);
    setPdfFileName("");
    setPdfFileSize("");
    setPdfFileDataUrl("");
    setCustomPdfUrl("");
  };

  // Submit and attach notes and/or recorded class link
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterTitle.trim()) {
      setErrorMessage("Please enter a Chapter or Class Title.");
      return;
    }

    const finalPdfUrl = pdfFileDataUrl || customPdfUrl.trim();
    const finalPdfTitle = pdfFileName || (finalPdfUrl ? `${chapterTitle.trim()}.pdf` : "");
    const finalSize = pdfFileSize || (finalPdfUrl ? "3.5 MB" : "");
    const cleanRecordedLink = recordedClassLink.trim();

    if (!finalPdfUrl && !cleanRecordedLink) {
      setErrorMessage("Please enter a Recorded Class Link (Google Drive / YouTube) or attach a PDF Study Notes file.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const subjectObj = adaviyyaSubjects.find((s) => s.id === selectedSubjectId);
      const subjectName = isAdaviyya && subjectObj ? subjectObj.name : undefined;

      // 1. Securely save recorded class link and/or PDF notes to Supabase associated with course, subject, and date
      await saveRecordedClassToSupabase({
        title: chapterTitle.trim(),
        courseId: selectedCourseId,
        courseName: selectedCourse.title,
        subjectId: isAdaviyya ? selectedSubjectId : undefined,
        subjectName,
        date: sessionDate,
        time: "19:30",
        recordedLink: cleanRecordedLink,
        pdfUrl: finalPdfUrl || undefined,
        pdfTitle: finalPdfTitle || undefined,
        pdfSize: finalSize || undefined,
        teacherName: currentUserName,
        duration: estimatedDuration,
      });

      // 2. Trigger immediate in-app and push notification to students
      triggerNotesUploadedNotification({
        chapterTitle: chapterTitle.trim(),
        courseName: selectedCourse.title,
        courseId: selectedCourseId,
        subjectName,
        pdfTitle: cleanRecordedLink ? `Recorded Class & Notes: ${chapterTitle.trim()}` : finalPdfTitle,
        pdfSize: finalSize || "Online Stream",
        pdfUrl: cleanRecordedLink || finalPdfUrl,
        senderName: currentUserName,
      });

      // 3. Update local UI data from Supabase
      const freshMaterials = await fetchCourseMaterialsFromSupabase(selectedCourseId);
      setMaterials(freshMaterials);
      setAdaviyyaSubjects(getAdaviyyaSubjects());

      if (cleanRecordedLink && finalPdfUrl) {
        setSuccessMessage(`Recorded Class Link and PDF notes for "${chapterTitle.trim()}" published to Supabase and student portals!`);
      } else if (cleanRecordedLink) {
        setSuccessMessage(`Recorded Class Link for "${chapterTitle.trim()}" successfully saved to Supabase! Students can now watch replay.`);
      } else {
        setSuccessMessage(`"${finalPdfTitle}" attached successfully and notifications broadcasted to students!`);
      }

      handleResetForm();
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      console.error("Failed to upload notes and recording:", err);
      setErrorMessage("Failed to upload content. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNotifyRecordedClass = (item?: { title: string; courseId: string; courseName?: string; recordingUrl?: string }) => {
    const title = item?.title || chapterTitle.trim();
    const courseId = item?.courseId || selectedCourseId;
    const course = SHOWCASE_COURSES.find((c) => c.id === courseId);
    const courseName = item?.courseName || course?.title || "Adaviyya";
    const recordingUrl = item?.recordingUrl || recordedClassLink.trim();

    if (!recordingUrl) {
      alert("Please provide a valid recorded class link first.");
      return;
    }

    triggerRecordedClassNotification({
      title: title || "New Class Recording",
      courseName,
      courseId,
      recordingUrl,
      teacherName: "Academic Faculty",
      senderName: "Administration",
    });

    setSuccessMessage(`Notification broadcasted: Enrolled students have been alerted for "${title || "Recorded Class"}"!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Delete note
  const handleDeleteMaterial = (materialId: string, subjectId?: string) => {
    if (confirm("Are you sure you want to remove this PDF note?")) {
      deleteCourseMaterial(materialId);
      if (subjectId) {
        // Also remove if chapter matches
        deleteChapterFromSubject(subjectId, materialId);
      }
      setMaterials(getCourseMaterials());
      setAdaviyyaSubjects(getAdaviyyaSubjects());
      setSuccessMessage("PDF note successfully removed.");
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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 rounded-3xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-purple-100">
              <FileUp className="w-3.5 h-3.5 text-purple-200" />
              <span>Academic Content Management</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              PDF Notes & Materials Upload Tool
            </h2>
            <p className="text-xs sm:text-sm text-purple-100/90 max-w-xl leading-relaxed">
              Attach official chapter PDFs, study guides, and recitation sheets directly to course syllabi. Enrolled students are immediately notified when new notes are published.
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200 block">
              Published Notes
            </span>
            <span className="text-2xl font-black text-white">
              {materials.length}
            </span>
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

      {/* Main Grid: Upload Form + Published Notes Library */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Upload Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-xs space-y-5">
          <div className="border-b border-purple-100 pb-3 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Upload className="w-4 h-4 text-purple-600" />
              <span>Attach New PDF Notes</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Step-by-Step
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Course Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Target Course <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-bold text-slate-900 outline-none transition-all cursor-pointer"
              >
                {SHOWCASE_COURSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.duration})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Subject Selector (if Adaviyya) */}
            {isAdaviyya && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 block">
                  Adaviyya Core Subject <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {adaviyyaSubjects.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSelectedSubjectId(s.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold text-left transition-all border cursor-pointer ${
                        selectedSubjectId === s.id
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-purple-50/50 text-slate-700 border-purple-100 hover:border-purple-300"
                      }`}
                    >
                      <span className="block">{s.name}</span>
                      <span className={`text-[10px] block opacity-80 truncate`}>
                        {s.subtitle}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Chapter Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Chapter / Topic / Class Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder="e.g. Seerah Class 4: Treaty of Hudaybiyyah"
                className="w-full py-2.5 px-3.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* 4. Class Session Date (Associated in Supabase with course, subject, and date) */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-purple-600" />
                  <span>Class Session Date <span className="text-rose-500">*</span></span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">Date of Lecture</span>
              </label>
              <input
                type="date"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full py-2.5 px-3.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all cursor-pointer"
              />
            </div>

            {/* 5. DEDICATED FIELD: Recorded Class Link (Google Drive / YouTube) */}
            <div className="space-y-1.5 p-3.5 rounded-2xl bg-purple-50/50 border border-purple-200/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-purple-600" />
                  <span>Recorded Class Link (Google Drive / YouTube)</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleNotifyRecordedClass()}
                  className="py-1 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-[10.5px] font-extrabold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                  title="Notify all enrolled students immediately about this recording"
                >
                  <Bell className="w-3 h-3 text-white" />
                  <span>Notify All Students</span>
                </button>
              </div>
              <input
                type="url"
                value={recordedClassLink}
                onChange={(e) => setRecordedClassLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/... or https://youtube.com/watch?v=..."
                className="w-full py-2.5 px-3.5 rounded-xl bg-white border border-purple-200 focus:border-purple-600 text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 shadow-2xs"
              />
            </div>

            {/* 6. Estimated Reading / Class Duration */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Session Duration
              </label>
              <div className="relative">
                <Clock className="w-4 h-4 text-purple-600 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="e.g. 45 mins"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* 7. PDF Study Notes: DIRECT FILE UPLOAD KEPT ACTIVE ONLY FOR SMALL PDF NOTES */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                  <span>PDF Study Notes (Optional Handbook)</span>
                </label>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  PDF Only (Max 10MB)
                </span>
              </div>
              <div className="border-2 border-dashed border-purple-200 hover:border-purple-400 rounded-2xl p-4 text-center bg-purple-50/30 hover:bg-purple-50/60 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-1.5 pointer-events-none">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  {pdfFileName ? (
                    <div>
                      <span className="text-xs font-black text-purple-700 block">
                        {pdfFileName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-semibold">
                        Size: {pdfFileSize} • Attached for Students
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Click or drag PDF study notes here
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Direct upload reserved strictly for PDF notes under 10MB
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 8. Alternative: Direct PDF URL */}
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

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    <span>Publishing & Syncing to Supabase...</span>
                  </span>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Publish Content & Notify Students</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Published Notes Library & Management (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  <span>Published Course Notes Directory</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  All active PDF materials currently accessible to enrolled students.
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
                placeholder="Search notes by chapter, course, or filename..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-purple-50/40 border border-purple-100 text-xs font-medium text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>

            {/* Notes List */}
            {filteredMaterials.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-purple-50/30 border border-purple-100/60 p-6 space-y-2">
                <FileText className="w-8 h-8 text-purple-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">No PDF notes found</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  {searchQuery || filterCourse !== "ALL"
                    ? "Try clearing your search or course filters."
                    : "Use the upload form on the left to publish your first chapter notes."}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredMaterials.map((item) => {
                  const isVideo = item.type === "VIDEO" || Boolean(item.recordingUrl);
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
                            {item.sizeOrDuration && (
                              <span className="text-[10px] font-semibold text-slate-500">
                                {item.sizeOrDuration}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              • {item.sessionDate ? `Class Date: ${item.sessionDate}` : item.uploadedAt}
                            </span>
                          </div>
                          <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1">
                            <span>Source / Link:</span>
                            <span className="font-mono text-purple-700 truncate max-w-xs">{item.fileOrUrl}</span>
                          </p>
                        </div>
                      </div>

                      {/* Actions: Watch Recorded Class / Download PDF & Delete */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center flex-wrap">
                        {videoLink && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleNotifyRecordedClass({
                                title: item.title,
                                courseId: item.courseId,
                                courseName: item.courseName,
                                recordingUrl: videoLink,
                              })}
                              className="py-1 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Broadcast alert to all students"
                            >
                              <Bell className="w-3 h-3 text-purple-600" />
                              <span>Notify Students</span>
                            </button>
                            <a
                              href={videoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                              title="Watch Recorded Class (Opens Drive / YouTube)"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>▶️ Watch Recorded Class</span>
                            </a>
                          </>
                        )}

                        {item.pdfUrl && (
                          <a
                            href={item.pdfUrl}
                            download={item.fileOrUrl || "notes.pdf"}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Download / View PDF"
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
            <span>Showing {filteredMaterials.length} of {materials.length} uploaded notes</span>
            <span className="font-medium text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Direct Student Hub Integration Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
