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
} from "lucide-react";
import { SelectedCourse } from "@/types/app";

interface CourseMaterialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCourse: SelectedCourse;
  isPaid?: boolean;
  onEnroll?: () => void;
}

interface ChapterLesson {
  id: string;
  chapterNumber: number;
  title: string;
  instructor: string;
  duration: string;
  pdfTitle: string;
  pdfSize: string;
  pages: number;
}

export default function CourseMaterialsModal({
  isOpen,
  onClose,
  selectedCourse,
  isPaid: isPaidProp,
  onEnroll,
}: CourseMaterialsModalProps) {
  const [activeTab, setActiveTab] = useState<"videos" | "pdfs">("videos");
  const [activeVideoId, setActiveVideoId] = useState<string>("ch-1");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [downloadedPdfs, setDownloadedPdfs] = useState<Record<string, boolean>>({});

  // Dynamic payment resolution
  const [internalIsPaid, setInternalIsPaid] = useState<boolean>(() => {
    if (typeof isPaidProp === "boolean") return isPaidProp;
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("hanoon_local_payments");
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          return list.some(
            (p: any) => p.status === "APPROVED" || p.status === "verified"
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

  const isPaid = typeof isPaidProp === "boolean" ? isPaidProp : internalIsPaid;

  if (!isOpen) return null;

  const chapters: ChapterLesson[] = [
    {
      id: "ch-1",
      chapterNumber: 1,
      title: "Foundations & Historical Milestones of Islamic Tarbiyah",
      instructor: "Usthad Dr. Faisal Al-Hanoon",
      duration: "45 mins",
      pdfTitle: "Chapter 1 Foundation & Historical Timeline.pdf",
      pdfSize: "4.8 MB",
      pages: 18,
    },
    {
      id: "ch-2",
      chapterNumber: 2,
      title: "Essential Rules of Taharah & Practical Fiqh of Salah",
      instructor: "Usthad Bilal Farooqi",
      duration: "52 mins",
      pdfTitle: "Chapter 2 Applied Fiqh & Taharah Rulings.pdf",
      pdfSize: "5.4 MB",
      pages: 24,
    },
    {
      id: "ch-3",
      chapterNumber: 3,
      title: "Ratib al-Haddad: Litany Translation & Daily Adhkar",
      instructor: "Usthad Anas Nadwi",
      duration: "38 mins",
      pdfTitle: "Chapter 3 Ratib al-Haddad Arabic with Commentary.pdf",
      pdfSize: "3.9 MB",
      pages: 14,
    },
    {
      id: "ch-4",
      chapterNumber: 4,
      title: "Prophetic Ethics: Adab with Parents & Community",
      instructor: "Usthad Abdul Rahman Al-Hafiz",
      duration: "42 mins",
      pdfTitle: "Chapter 4 Prophetic Ethics Handbook.pdf",
      pdfSize: "4.1 MB",
      pages: 20,
    },
  ];

  const handleDownload = (id: string) => {
    setDownloadingPdfId(id);
    setTimeout(() => {
      setDownloadingPdfId(null);
      setDownloadedPdfs((prev) => ({ ...prev, [id]: true }));
    }, 1200);
  };

  const activeLesson = chapters.find((c) => c.id === activeVideoId) || chapters[0];

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
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "videos"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Video Recordings ({chapters.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pdfs")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === "pdfs"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Offline PDF Notes ({chapters.length})
          </button>
        </div>

        {/* TAB 1: VIDEOS */}
        {activeTab === "videos" && (
          <div className="space-y-3">
            {/* Embedded Player Canvas */}
            <div className="rounded-2xl bg-slate-900 text-white p-4 aspect-video flex flex-col justify-between shadow-inner">
              <div className="flex items-center justify-between text-[11px] text-purple-300">
                <span>Lesson {activeLesson.chapterNumber}</span>
                <span className="font-mono text-emerald-400">1080p HD</span>
              </div>

              <div className="text-center my-auto space-y-1">
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center mx-auto shadow-md cursor-pointer transition-transform active:scale-95"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                </button>
                <p className="text-xs font-bold text-white pt-1">{activeLesson.title}</p>
                <p className="text-[10px] text-purple-200">{activeLesson.instructor}</p>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>00:00 / {activeLesson.duration}</span>
                <span>Speed: 1.0x</span>
              </div>
            </div>

            {/* Playlist */}
            <div className="space-y-2">
              {chapters.map((ch) => (
                <div
                  key={ch.id}
                  onClick={() => {
                    setActiveVideoId(ch.id);
                    setIsPlaying(true);
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    activeVideoId === ch.id
                      ? "bg-purple-50 border-purple-300"
                      : "bg-white border-purple-100 hover:bg-purple-50/40"
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-purple-700 uppercase">
                      Chapter {ch.chapterNumber}
                    </span>
                    <h5 className="text-xs font-bold text-slate-900 leading-snug">
                      {ch.title}
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      {ch.instructor} • {ch.duration}
                    </p>
                  </div>

                  <PlayCircle className="w-5 h-5 text-purple-600 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PDFS */}
        {activeTab === "pdfs" && (
          <div className="space-y-2.5">
            {chapters.map((ch) => {
              const isDownloaded = downloadedPdfs[ch.id];
              const isDownloading = downloadingPdfId === ch.id;

              return (
                <div
                  key={ch.id}
                  className="p-3.5 rounded-2xl bg-white border border-purple-100 shadow-xs flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <span className="text-[10px] font-bold text-purple-700 uppercase">
                        Chapter {ch.chapterNumber} Handbook
                      </span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 leading-tight">
                      {ch.pdfTitle}
                    </h5>
                    <p className="text-[10px] text-slate-400">
                      {ch.pages} Pages • {ch.pdfSize} • High Resolution
                    </p>
                  </div>

                  {isPaid ? (
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => handleDownload(ch.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs shrink-0 ${
                        isDownloaded
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                      }`}
                    >
                      {isDownloaded ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Saved</span>
                        </>
                      ) : isDownloading ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title="Enroll to unlock PDF material download"
                      className="py-2 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none shrink-0"
                    >
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Locked</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
