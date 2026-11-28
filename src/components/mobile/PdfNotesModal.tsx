"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  FileText,
  Download,
  ExternalLink,
  Lock,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { SelectedCourse } from "@/types/app";
import {
  fetchAllStudyMaterials,
  StudyMaterial,
} from "@/services/studyMaterialService";
import {
  fetchCourseMaterialsFromSupabase,
} from "@/services/teacherService";

interface PdfNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCourse: SelectedCourse;
  isPaid?: boolean;
  onEnroll?: () => void;
}

interface PdfNoteItem {
  id: string;
  title: string;
  subject?: string;
  courseName?: string;
  pdfUrl: string;
  instructor?: string;
  formattedDate: string;
}

export default function PdfNotesModal({
  isOpen,
  onClose,
  selectedCourse,
  isPaid = true,
  onEnroll,
}: PdfNotesModalProps) {
  const [items, setItems] = useState<PdfNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");
  const [downloadedIds, setDownloadedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const loadPdfs = async () => {
      try {
        const [studyMaterials, legacyMaterials] = await Promise.all([
          fetchAllStudyMaterials(selectedCourse.id),
          fetchCourseMaterialsFromSupabase(selectedCourse.id),
        ]);

        const isPdfUrl = (url?: string | null, type?: string): boolean => {
          if (!url) return false;
          const lower = url.trim().toLowerCase();
          // Strictly exclude video links
          if (
            lower.includes("youtube.com") ||
            lower.includes("youtu.be") ||
            lower.includes("meet.google.com") ||
            lower.includes("zoom.us") ||
            lower.includes("vimeo.com") ||
            lower.endsWith(".mp4") ||
            lower.endsWith(".webm") ||
            lower.endsWith(".mov")
          ) {
            return false;
          }
          return (
            type === "pdf" ||
            lower.endsWith(".pdf") ||
            lower.includes(".pdf?") ||
            lower.includes("/notes/") ||
            lower.includes("/course-materials/")
          );
        };

        const list: PdfNoteItem[] = [];
        const seenUrls = new Set<string>();

        // 1. Ingest from study_materials (ONLY PDFs, STRICTLY NO VIDEO LINKS)
        (studyMaterials || []).forEach((sm) => {
          if (sm.type === "link") return; // Skip external links (reserved for videos)
          const url = (sm.file_url || "").trim();
          if (!url || seenUrls.has(url)) return;

          if (isPdfUrl(url, sm.type)) {
            seenUrls.add(url);
            let formattedDate = "Recent";
            if (sm.created_at) {
              try {
                formattedDate = new Date(sm.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
              } catch {}
            }

            list.push({
              id: `sm-${sm.id}`,
              title: sm.title || "Curriculum PDF Notes",
              subject: sm.subject || undefined,
              courseName: selectedCourse.title,
              pdfUrl: url,
              instructor: sm.uploaded_by || "Faculty Instructor",
              formattedDate,
            });
          }
        });

        // 2. Ingest from legacy course_materials (PDF items)
        (legacyMaterials || []).forEach((m) => {
          const url = (m.pdfUrl || m.fileOrUrl || "").trim();
          if (!url || seenUrls.has(url)) return;
          if (m.type === "PDF" || isPdfUrl(url, "pdf")) {
            seenUrls.add(url);
            list.push({
              id: `leg-${m.id}`,
              title: m.title || "Study Material PDF",
              subject: m.subjectName || undefined,
              courseName: selectedCourse.title,
              pdfUrl: url,
              instructor: m.teacherName || "Faculty Instructor",
              formattedDate: m.uploadedAt || "Recent",
            });
          }
        });

        setItems(list);
      } catch (err) {
        console.warn("Failed to load PDF notes:", err);
      } finally {
        setLoading(false);
      }
    };

    loadPdfs();

    const handleUpdate = () => loadPdfs();
    window.addEventListener("hanoon_study_materials_updated", handleUpdate);
    window.addEventListener("hanoon_material_uploaded", handleUpdate);
    return () => {
      window.removeEventListener("hanoon_study_materials_updated", handleUpdate);
      window.removeEventListener("hanoon_material_uploaded", handleUpdate);
    };
  }, [isOpen, selectedCourse.id, selectedCourse.title]);

  const uniqueSubjects = useMemo(() => {
    const s = new Set<string>();
    items.forEach((it) => {
      if (it.subject) s.add(it.subject);
    });
    return Array.from(s);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchesSearch =
        searchQuery === "" ||
        it.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (it.subject && it.subject.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (it.instructor && it.instructor.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSubject =
        selectedSubject === "ALL" ||
        (it.subject && it.subject.toLowerCase() === selectedSubject.toLowerCase());

      return matchesSearch && matchesSubject;
    });
  }, [items, searchQuery, selectedSubject]);

  const handleDownload = (id: string, url: string, title: string) => {
    setDownloadedIds((prev) => ({ ...prev, [id]: true }));
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in font-['Plus_Jakarta_Sans'] select-none">
      <div
        className="w-full max-w-md bg-zinc-950 text-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-zinc-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  PDF Notes & Materials
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {items.length} PDF{items.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-medium">
                {selectedCourse.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lock Banner for Unpaid Students */}
        {!isPaid && (
          <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="font-medium text-[11px]">
                Enroll & verify admission to download official PDF notes
              </span>
            </div>
            {onEnroll && (
              <button
                type="button"
                onClick={onEnroll}
                className="py-1 px-2.5 rounded-lg bg-amber-400 text-amber-950 font-bold text-[10px] hover:bg-amber-300 transition-colors shrink-0"
              >
                Enroll
              </button>
            )}
          </div>
        )}

        {/* Search & Subject Filter (Only when items exist) */}
        {items.length > 2 && (
          <div className="p-3 border-b border-white/5 space-y-2 bg-zinc-900/30">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search notes, handbook titles, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/60 transition-colors"
              />
            </div>

            {uniqueSubjects.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSelectedSubject("ALL")}
                  className={`py-1 px-2.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                    selectedSubject === "ALL"
                      ? "bg-emerald-600 text-white"
                      : "bg-white/5 text-zinc-400 hover:text-white"
                  }`}
                >
                  All Subjects
                </button>
                {uniqueSubjects.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubject(sub)}
                    className={`py-1 px-2.5 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedSubject === sub
                        ? "bg-emerald-600 text-white"
                        : "bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 no-scrollbar">
          {loading ? (
            <div className="py-14 text-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-zinc-400">Loading PDF materials...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 px-4 rounded-3xl bg-zinc-900/40 border border-white/5 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-white">
                  No PDF notes uploaded yet
                </h4>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  Course syllabus notes, chapter handbooks, and reference PDFs will appear here once uploaded by your instructors.
                </p>
              </div>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isDownloaded = downloadedIds[item.id];

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-zinc-900/80 border border-white/10 hover:border-emerald-500/40 transition-all space-y-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="text-xs sm:text-sm font-bold text-white leading-snug break-words">
                          {item.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-zinc-400">
                          {item.subject && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                              {item.subject}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-400 font-medium">
                            Official PDF
                          </span>
                          <span>•</span>
                          <span>{item.formattedDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-400 font-medium truncate">
                      Uploaded by: {item.instructor || "Faculty"}
                    </span>

                    {isPaid ? (
                      <button
                        type="button"
                        onClick={() => handleDownload(item.id, item.pdfUrl, item.title)}
                        className={`inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer active:scale-95 shrink-0 ${
                          isDownloaded
                            ? "bg-emerald-700 hover:bg-emerald-600 shadow-emerald-700/30"
                            : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30"
                        }`}
                      >
                        {isDownloaded ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Saved</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>View / Download PDF</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-zinc-800 text-zinc-500 font-bold text-xs border border-white/5 cursor-not-allowed select-none shrink-0"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Locked</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 text-center bg-zinc-900/40">
          <p className="text-[10.5px] text-zinc-500">
            Verified study material distribution • Powered by Hanoon Academy
          </p>
        </div>
      </div>
    </div>
  );
}
