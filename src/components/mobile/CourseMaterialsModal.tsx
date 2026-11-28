"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  PlayCircle,
  FileText,
  Download,
  CheckCircle2,
  BookOpen,
  Play,
  Pause,
  Clock,
  Eye,
  Lock,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { SelectedCourse } from "@/types/app";
import {
  CourseMaterial,
  fetchCourseMaterialsFromSupabase,
  getCourseMaterials,
} from "@/services/teacherService";
import {
  fetchAllStudyMaterials,
  StudyMaterial,
  isStudyMaterialPdf,
  isStudyMaterialVideo,
} from "@/services/studyMaterialService";

interface CourseMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCourse: SelectedCourse;
  isPaid?: boolean;
  onEnroll?: () => void;
}

export default function CourseMaterialsModal({
  isOpen,
  onClose,
  selectedCourse,
  isPaid: isPaidProp,
  onEnroll,
}: CourseMaterialsModalProps) {
  const [activeTab, setActiveTab] = useState<"videos" | "pdfs">("videos");
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVideoId, setActiveVideoId] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [downloadedPdfs, setDownloadedPdfs] = useState<Record<string, boolean>>({});

  // Strict payment verification binding
  const isPaid = Boolean(isPaidProp);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);

    const loadData = async () => {
      try {
        const [legacyData, smData] = await Promise.all([
          fetchCourseMaterialsFromSupabase(selectedCourse.id),
          fetchAllStudyMaterials(selectedCourse.id),
        ]);

        const mappedStudyMaterials: CourseMaterial[] = (smData || []).map((sm) => {
          const isLink = sm.type === "link";
          let uploadDateFormatted = "Recent";
          if (sm.created_at) {
            try {
              uploadDateFormatted = new Date(sm.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
            } catch { }
          }
          return {
            id: `sm-${sm.id}`,
            dbId: sm.id,
            title: sm.title,
            courseId: sm.course,
            courseName: selectedCourse.title,
            subjectName: sm.subject || undefined,
            type: isLink ? ("LINK" as any) : "PDF",
            fileOrUrl: sm.file_url,
            pdfUrl: !isLink ? sm.file_url : undefined,
            recordingUrl: isLink ? sm.file_url : undefined,
            sizeOrDuration: isLink ? "Drive Link" : "Official PDF",
            uploadedAt: uploadDateFormatted,
            downloadCount: 0,
            teacherName: sm.uploaded_by || "Faculty Instructor",
            sourceTable: "study_materials",
            studyMaterialType: sm.type,
          } as CourseMaterial & { studyMaterialType?: "pdf" | "link" };
        });

        const seenUrls = new Set(mappedStudyMaterials.map((s) => s.fileOrUrl));
        const combined = [...mappedStudyMaterials];
        (legacyData || []).forEach((item) => {
          if (!seenUrls.has(item.fileOrUrl) && !(item.recordingUrl && seenUrls.has(item.recordingUrl))) {
            combined.push(item);
          }
        });

        setMaterials(combined);
        const videos = combined.filter(
          (m) =>
            m.type === "VIDEO" ||
            m.fileOrUrl?.includes("youtube") ||
            m.fileOrUrl?.includes("mp4")
        );
        if (videos.length > 0) {
          setActiveVideoId(videos[0].id);
        }
      } catch (err) {
        console.warn("Error loading course materials:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener("hanoon_material_uploaded", handleUpdate);
    window.addEventListener("hanoon_study_materials_updated", handleUpdate);
    return () => {
      window.removeEventListener("hanoon_material_uploaded", handleUpdate);
      window.removeEventListener("hanoon_study_materials_updated", handleUpdate);
    };
  }, [isOpen, selectedCourse.id]);

  if (!isOpen) return null;

  const pdfMaterials = materials.filter((m) =>
    isStudyMaterialPdf({
      type: (m as any).studyMaterialType || m.type,
      file_url: m.fileOrUrl,
      pdfUrl: m.pdfUrl,
      recordingUrl: m.recordingUrl,
    })
  );

  const videoMaterials = materials.filter((m) =>
    isStudyMaterialVideo({
      type: (m as any).studyMaterialType || m.type,
      file_url: m.fileOrUrl,
      pdfUrl: m.pdfUrl,
      recordingUrl: m.recordingUrl,
    })
  );

  const activeLesson = videoMaterials.find((c) => c.id === activeVideoId) || videoMaterials[0];

  const handleDownload = (id: string, url?: string, title?: string) => {
    if (!isPaid) return;
    setDownloadingPdfId(id);

    if (url && typeof document !== "undefined") {
      try {
        const a = document.createElement("a");
        a.href = url;
        a.download = title || "materials.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        console.warn("Direct PDF download fallback:", err);
      }
    }

    setTimeout(() => {
      setDownloadingPdfId(null);
      setDownloadedPdfs((prev) => ({ ...prev, [id]: true }));
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans'] select-none">
      <div className="bg-white text-slate-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-purple-100 relative max-h-[92vh] flex flex-col overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                Offline Library
              </span>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Course Materials & Notes
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Course Info */}
        <div className="my-3 p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600">Enrolled Course:</span>
          <strong className="text-purple-700 font-bold">{selectedCourse.title}</strong>
        </div>

        {/* Access Restriction Banner for Unpaid Students */}
        {!isPaid && (
          <div className="p-3.5 rounded-2xl bg-purple-50/90 border border-purple-200 shadow-xs space-y-2.5 mb-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 flex-1">
                <h4 className="text-xs font-black text-slate-900 leading-snug">
                  Enroll & Get Verified to Access Live Classes and Materials
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Chapter lesson handbooks, Arabic litany commentary, and notes require active verified enrollment.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onEnroll) {
                  onEnroll();
                } else {
                  onClose();
                }
              }}
              className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <span>Enroll Now / Complete Payment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-purple-50/50 rounded-2xl border border-purple-100 mb-4 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("videos")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === "videos"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Video Recordings ({videoMaterials.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pdfs")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === "pdfs"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 hover:text-slate-900"
              }`}
          >
            Offline PDF Notes ({pdfMaterials.length})
          </button>
        </div>

        {/* TAB 1: VIDEOS */}
        {activeTab === "videos" && (
          <div className="space-y-3">
            {videoMaterials.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-400 flex items-center justify-center mx-auto">
                  <PlayCircle className="w-6 h-6 text-purple-400" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No recorded sessions available</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Recorded class archives and video lecture replays will be published here following completed live sessions.
                </p>
              </div>
            ) : (
              <>
                {/* Embedded Player Canvas */}
                {activeLesson && (
                  <div className="space-y-2">
                    <div className="rounded-2xl bg-slate-900 text-white p-4 aspect-video flex flex-col justify-between shadow-inner">
                      <div className="flex items-center justify-between text-[11px] text-purple-300">
                        <span>{activeLesson.courseName}</span>
                        <span className="font-mono text-emerald-400">1080p HD</span>
                      </div>

                      <div className="text-center my-auto space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            const link =
                              (activeLesson as any).recorded_video_link ||
                              activeLesson.recordingUrl ||
                              (activeLesson as any).recording_url ||
                              (activeLesson.fileOrUrl && !activeLesson.fileOrUrl.includes("meet.google.com") && !activeLesson.fileOrUrl.includes("zoom.us") ? activeLesson.fileOrUrl : null);
                            if (link && link.startsWith("http")) {
                              window.open(link, "_blank", "noopener,noreferrer");
                            } else {
                              setIsPlaying(!isPlaying);
                            }
                          }}
                          className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center mx-auto shadow-md cursor-pointer transition-transform active:scale-95"
                        >
                          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-white" />}
                        </button>
                        <p className="text-xs font-bold text-white pt-1">{activeLesson.title}</p>
                        <p className="text-[10px] text-purple-200">{activeLesson.teacherName || "Faculty Instructor"}</p>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Duration: {activeLesson.sizeOrDuration}</span>
                        {activeLesson.sessionDate && <span>Date: {activeLesson.sessionDate}</span>}
                      </div>
                    </div>

                    {/* Prominent Watch Recorded Class Button */}
                    {(() => {
                      const videoHref =
                        (activeLesson as any).recorded_video_link ||
                        activeLesson.recordingUrl ||
                        (activeLesson as any).recording_url ||
                        (activeLesson.fileOrUrl && !activeLesson.fileOrUrl.includes("meet.google.com") && !activeLesson.fileOrUrl.includes("zoom.us") ? activeLesson.fileOrUrl : null);

                      if (!videoHref || !videoHref.startsWith("http")) return null;

                      return (
                        <a
                          href={videoHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                          title="Open Google Drive or YouTube recorded class link"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>▶️ Watch Recorded Class</span>
                        </a>
                      );
                    })()}
                  </div>
                )}

                {/* Playlist */}
                <div className="space-y-2">
                  {videoMaterials.map((ch, idx) => {
                    const videoLink =
                      (ch as any).recorded_video_link ||
                      ch.recordingUrl ||
                      (ch as any).recording_url ||
                      (ch.fileOrUrl && !ch.fileOrUrl.includes("meet.google.com") && !ch.fileOrUrl.includes("zoom.us") && ch.fileOrUrl.startsWith("http") ? ch.fileOrUrl : undefined);
                    return (
                      <div
                        key={ch.id}
                        onClick={() => {
                          setActiveVideoId(ch.id);
                          setIsPlaying(true);
                        }}
                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${activeVideoId === ch.id
                          ? "bg-purple-50 border-purple-300"
                          : "bg-white border-purple-100 hover:bg-purple-50/40"
                          }`}
                      >
                        <div className="space-y-0.5 flex-1 min-w-0">
                          <span className="text-[10px] font-bold text-purple-700 uppercase">
                            Lesson {idx + 1}
                          </span>
                          <h5 className="text-xs font-bold text-slate-900 leading-snug truncate">
                            {ch.title}
                          </h5>
                          <p className="text-[10px] text-slate-500">
                            {ch.teacherName || "Faculty"} • {ch.sizeOrDuration} {ch.sessionDate ? `• ${ch.sessionDate}` : ""}
                          </p>
                        </div>

                        {videoLink ? (
                          <a
                            href={videoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="py-1 px-2.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 font-extrabold text-[10.5px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                          >
                            <Play className="w-2.5 h-2.5 fill-purple-800" />
                            <span>Watch</span>
                          </a>
                        ) : (
                          <PlayCircle className="w-5 h-5 text-purple-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: PDFS */}
        {activeTab === "pdfs" && (
          <div className="space-y-2.5">
            {pdfMaterials.length === 0 ? (
              <div className="py-12 px-4 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-400 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6 text-purple-400" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No study materials available</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  Course syllabus notes, chapter handbooks, and reference PDFs will appear here once uploaded by your instructors.
                </p>
              </div>
            ) : (
              pdfMaterials.map((ch, idx) => {
                const isDownloaded = downloadedPdfs[ch.id];
                const isDownloading = downloadingPdfId === ch.id;

                return (
                  <div
                    key={ch.id}
                    className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {(ch as any).studyMaterialType === "link" || ch.fileOrUrl?.includes("drive.google.com") ? (
                          <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        ) : (
                          <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        )}
                        <span className="text-[10px] font-bold text-purple-700 uppercase">
                          {(ch as any).studyMaterialType === "link" ? "Drive Document" : `Document #${idx + 1}`}
                        </span>
                        {(ch as any).studyMaterialType === "link" ? (
                          <span className="text-[9px] font-black bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                            Drive Link
                          </span>
                        ) : (
                          <span className="text-[9px] font-black bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 shrink-0">
                            PDF
                          </span>
                        )}
                      </div>
                      <h5 className="text-xs font-bold text-slate-900 leading-tight truncate">
                        {ch.title}
                      </h5>
                      <p className="text-[10px] text-slate-400">
                        {ch.teacherName ? `${ch.teacherName} • ` : ""}{ch.sizeOrDuration} • {ch.uploadedAt}
                      </p>
                    </div>

                    {isPaid ? (
                      <a
                        href={ch.pdfUrl || ch.fileOrUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition-all cursor-pointer shrink-0"
                        title="View / Download Notes in new tab"
                      >
                        {(ch as any).studyMaterialType === "link" || ch.fileOrUrl?.includes("drive.google.com") ? (
                          <>
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>View Notes</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>View / Download Notes</span>
                          </>
                        )}
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="Enroll to unlock study material access"
                        className="py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none shrink-0"
                      >
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Locked</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}

