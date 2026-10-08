"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  BookOpen,
  Sparkles,
  Scale,
  Mic,
  Scroll,
  Radio,
  Download,
  PlayCircle,
  Clock,
  User,
  CheckCircle2,
  MessageCircle,
  FileText,
  Video,
  Lock,
  ArrowRight,
} from "lucide-react";
import { AdaviyyaSubject, getTeacherWhatsApp } from "@/services/subjectService";
import { getAppSettings, formatWhatsAppLink } from "@/services/settingsService";

interface SubjectClassHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: AdaviyyaSubject | null;
  studentName?: string;
  isPaid?: boolean;
  onEnroll?: () => void;
}

export default function SubjectClassHubModal({
  isOpen,
  onClose,
  subject,
  studentName = "Student",
  isPaid: isPaidProp,
  onEnroll,
}: SubjectClassHubModalProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedChapters, setDownloadedChapters] = useState<Record<string, boolean>>({});
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // Dynamic payment status resolution (respects prop or fallback localStorage cache)
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

  // Real-time payment verification event listener
  useEffect(() => {
    const handlePaymentEvent = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        const { status } = customEvt.detail;
        if (status === "APPROVED" || status === "verified") {
          setInternalIsPaid(true);
        }
      }
    };
    window.addEventListener("hanoon_payment_event", handlePaymentEvent);
    return () => window.removeEventListener("hanoon_payment_event", handlePaymentEvent);
  }, []);

  const isPaid = typeof isPaidProp === "boolean" ? isPaidProp : internalIsPaid;

  if (!isOpen || !subject) return null;

  const getSubjectIcon = (type: AdaviyyaSubject["iconType"]) => {
    switch (type) {
      case "book":
        return <BookOpen className="w-5 h-5 text-purple-600" />;
      case "sparkles":
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      case "scale":
        return <Scale className="w-5 h-5 text-purple-600" />;
      case "scroll":
        return <Scroll className="w-5 h-5 text-purple-600" />;
      case "mic":
        return <Mic className="w-5 h-5 text-purple-600" />;
      default:
        return <BookOpen className="w-5 h-5 text-purple-600" />;
    }
  };

  const handleDownload = (chapterId: string) => {
    if (!isPaid) return;
    setDownloadingId(chapterId);
    setTimeout(() => {
      setDownloadingId(null);
      setDownloadedChapters((prev) => ({ ...prev, [chapterId]: true }));
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans'] select-none">
      <div className="bg-white text-slate-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-purple-100 relative max-h-[92vh] flex flex-col overflow-y-auto no-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0">
              {getSubjectIcon(subject.iconType)}
            </div>
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                Adaviyya Subject Hub
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 leading-tight">
                {subject.name}
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

        {/* Subtitle & Description */}
        <div className="my-3 space-y-1">
          <p className="text-xs font-bold text-purple-700">
            {subject.subtitle}
          </p>
          <p className="text-xs text-slate-500 leading-relaxed font-normal">
            {subject.description}
          </p>
        </div>

        {/* Faculty & Schedule Meta Box */}
        <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <User className="w-3.5 h-3.5 text-purple-600" />
              <span className="font-semibold">Faculty Usthad:</span>
            </div>
            <strong className="text-slate-900 font-bold text-[11px]">{subject.instructor}</strong>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-100/60">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span className="font-semibold">Schedule:</span>
            </div>
            <span className="font-mono text-purple-700 font-bold text-[11px]">{subject.scheduleTime}</span>
          </div>
        </div>

        {/* ========================================================
            ACCESS CONTROLLED LIVE CLASS SECTION:
            UNPAID/PENDING -> Restricted Enrollment Banner + "Enroll Now"
            PAID/APPROVED  -> Active Zoom Tile with "Join Live Class"
            ======================================================== */}
        {!isPaid ? (
          <div className="p-4 rounded-2xl bg-purple-50/90 border border-purple-200 shadow-xs space-y-3 mb-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                <Lock className="w-4 h-4" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-200/60 px-2 py-0.5 rounded-full">
                    Enrollment Required
                  </span>
                </div>
                <h4 className="text-xs font-black text-slate-900 leading-snug">
                  Enroll & Get Verified to Access Live Classes and Materials
                </h4>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  Interactive live Zoom classes, direct faculty doubt clearance, and downloadable curriculum PDF notes are unlocked once admission is verified.
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
              className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <span>Enroll Now / Complete Payment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-purple-600 text-white shadow-xs space-y-2.5 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200">
                  Interactive Lecture Hall
                </span>
              </div>
              <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                Live Zoom
              </span>
            </div>

            <p className="text-xs text-purple-100 font-medium">
              Join the bi-weekly interactive lecture, ask live questions, and participate in discussion.
            </p>

            <a
              href={subject.liveClassUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-white text-purple-700 hover:bg-purple-50 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse text-purple-600" />
              <span>Join Live Class</span>
            </a>
          </div>
        )}

        {/* Chapter Video Lessons & PDF Handbooks */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Curriculum Lessons & Materials ({subject.chapters.length})
            </h4>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isPaid
                  ? "text-purple-700 bg-purple-100"
                  : "text-amber-700 bg-amber-50 border border-amber-200"
              }`}
            >
              {isPaid ? "Full Access" : "Locked (Unverified)"}
            </span>
          </div>

          <div className="space-y-2">
            {subject.chapters.map((chapter) => {
              const isPlaying = activePlayingId === chapter.id;
              const isDownloaded = downloadedChapters[chapter.id];
              const isDownloading = downloadingId === chapter.id;

              return (
                <div
                  key={chapter.id}
                  className="p-3 rounded-2xl bg-purple-50/40 border border-purple-100 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-900 leading-snug">
                        {chapter.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Video className="w-3 h-3 text-purple-500" />
                          {chapter.duration}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-purple-500" />
                          {chapter.pdfSize}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!isPaid) {
                          if (onEnroll) onEnroll();
                          return;
                        }
                        setActivePlayingId(isPlaying ? null : chapter.id);
                      }}
                      className={`p-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
                        isPaid
                          ? "bg-purple-100 hover:bg-purple-200 text-purple-700"
                          : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                      }`}
                      title={isPaid ? "Stream Video Lesson" : "Enroll to Unlock Lesson"}
                    >
                      {isPaid ? (
                        <PlayCircle className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>

                  {isPlaying && isPaid && (
                    <div className="p-2.5 rounded-xl bg-slate-900 text-white text-xs space-y-1.5 animate-fade-in">
                      <div className="flex items-center justify-between text-[11px] text-purple-300">
                        <span>Streaming Lesson Recording</span>
                        <span className="font-mono text-emerald-400">1080p HD</span>
                      </div>
                      <div className="h-16 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 text-xs">
                        ▶ Video Player Streaming (Simulated)
                      </div>
                    </div>
                  )}

                  {/* PDF Download Button - Locked when unpaid */}
                  <div className="pt-1.5 border-t border-purple-100/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-medium truncate max-w-[190px]">
                      {chapter.pdfTitle}
                    </span>

                    {isPaid ? (
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleDownload(chapter.id)}
                        className={`py-1 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                          isDownloaded
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-white border border-purple-200 text-purple-700 hover:bg-purple-50"
                        }`}
                      >
                        {isDownloaded ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Saved</span>
                          </>
                        ) : isDownloading ? (
                          <span>Downloading...</span>
                        ) : (
                          <>
                            <Download className="w-3 h-3" />
                            <span>PDF</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="Enroll and get verified to download PDF material"
                        className="py-1 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed select-none"
                      >
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Locked</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* WhatsApp Doubt clearance */}
        <a
          href={formatWhatsAppLink(
            subject.instructorWhatsApp ||
              getTeacherWhatsApp(subject.instructor) ||
              getAppSettings().contactWhatsApp,
            `Assalamu Alaikum ${subject.instructor}, I am ${studentName}, studying Adaviyya ${subject.name}. I have a doubt regarding today's lesson.`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center gap-2 border border-purple-100 transition-all cursor-pointer shrink-0"
        >
          <MessageCircle className="w-3.5 h-3.5 text-purple-600" />
          <span>Ask {subject.instructor} on WhatsApp</span>
        </a>
      </div>
    </div>
  );
}
