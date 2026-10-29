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
  ExternalLink,
} from "lucide-react";
import { AdaviyyaSubject, getTeacherWhatsApp } from "@/services/subjectService";
import { getAppSettings, formatWhatsAppLink } from "@/services/settingsService";
import { recordLiveClassJoinAttendance } from "@/services/attendanceService";

interface SubjectClassHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: AdaviyyaSubject | null;
  studentName?: string;
  studentId?: string;
  studentPhone?: string;
  courseId?: string;
  isPaid?: boolean;
  onEnroll?: () => void;
  onJoinSession?: (session: any) => void;
  onSessionCompleted?: () => void;
}

export default function SubjectClassHubModal({
  isOpen,
  onClose,
  subject,
  studentName = "Student",
  studentId,
  studentPhone,
  courseId,
  isPaid: isPaidProp,
  onEnroll,
  onJoinSession,
  onSessionCompleted,
}: SubjectClassHubModalProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedChapters, setDownloadedChapters] = useState<Record<string, boolean>>({});
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  const [isClassInProgress, setIsClassInProgress] = useState(false);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [attendanceMarkedAt, setAttendanceMarkedAt] = useState<string | null>(null);
  const isPaid = Boolean(isPaidProp);

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

  const handleDownload = (chapterId: string, pdfUrl?: string, pdfTitle?: string) => {
    if (!isPaid) return;
    setDownloadingId(chapterId);

    if (pdfUrl && typeof document !== "undefined") {
      try {
        const a = document.createElement("a");
        a.href = pdfUrl;
        a.download = pdfTitle || "notes.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (err) {
        console.warn("Direct PDF download fallback:", err);
      }
    }

    setTimeout(() => {
      setDownloadingId(null);
      setDownloadedChapters((prev) => ({ ...prev, [chapterId]: true }));
    }, 1000);
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
              <span>Enroll</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : isClassInProgress ? (
          /* ========================================================
             CLASS IN PROGRESS RETURN FLOW STATE (POST-CLICK)
             ======================================================== */
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white shadow-xl border border-rose-500/40 space-y-3 mb-3 animate-fade-in relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">
                  Class in Progress...
                </span>
              </div>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Present (P) Marked</span>
              </span>
            </div>

            <div className="space-y-0.5">
              <h4 className="text-xs font-extrabold text-white leading-tight">
                {subject.name} — Live Lecture
              </h4>
              <p className="text-[11px] text-purple-200">
                Google Meet is active with {subject.instructor}
                {attendanceMarkedAt ? ` • Attendance logged at ${attendanceMarkedAt}` : ""}
              </p>
            </div>

            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-md text-[11px] text-purple-100 flex items-center justify-between border border-white/10">
              <span className="leading-snug">Google Meet opened in a new tab.</span>
              {subject.liveClassUrl && (
                <a
                  href={subject.liveClassUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-rose-300 hover:text-white font-bold underline shrink-0"
                >
                  <span>Reopen Meet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* PROMINENT RETURN BUTTON */}
            <button
              type="button"
              onClick={() => {
                setIsClassInProgress(false);
                setAttendanceMarkedAt(null);
                onSessionCompleted?.();
                onClose();
              }}
              className="w-full py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark as Completed & Return to Dashboard</span>
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
                Live Class
              </span>
            </div>

            <p className="text-xs text-purple-100 font-medium">
              Join the interactive lecture, ask live questions, and participate in discussion.
            </p>

            {subject.liveClassUrl ? (
              <button
                type="button"
                disabled={isMarkingAttendance}
                onClick={async () => {
                  if (!subject.liveClassUrl) return;

                  setIsMarkingAttendance(true);
                  const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                  setAttendanceMarkedAt(nowTime);

                  try {
                    await recordLiveClassJoinAttendance({
                      studentId,
                      studentName,
                      studentPhone,
                      courseId: courseId || "adaviyya",
                      classTitle: `${subject.name} - Live Lecture`,
                      subjectId: subject.id,
                      meetingLink: subject.liveClassUrl,
                    });
                  } catch (err) {
                    console.warn("Could not log live attendance:", err);
                  } finally {
                    setIsMarkingAttendance(false);
                  }

                  // Open Google Meet link in NEW tab
                  window.open(subject.liveClassUrl, "_blank", "noopener,noreferrer");

                  // Transition to Class in Progress UI
                  setIsClassInProgress(true);
                  onJoinSession?.({
                    title: `${subject.name} - Live Lecture`,
                    teacherName: subject.instructor,
                    meetingLink: subject.liveClassUrl,
                    subjectId: subject.id,
                  });
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-white text-purple-700 hover:bg-purple-50 active:scale-[0.98] font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse text-purple-600" />
                <span>Join Live Class</span>
              </button>
            ) : (
              <div className="w-full py-2 px-3 rounded-xl bg-purple-700/60 text-purple-100 text-xs font-semibold text-center">
                Class will be broadcast at scheduled time
              </div>
            )}
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

          {subject.chapters.length === 0 ? (
            <div className="py-8 px-4 rounded-2xl bg-purple-50/40 border border-purple-100 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-purple-100/80 text-purple-600 flex items-center justify-center mx-auto">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
              <h4 className="text-xs font-bold text-slate-800">No study materials available</h4>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Curriculum notes, worksheets, and lecture recordings for {subject.name} will appear here once uploaded by your faculty instructor.
              </p>
            </div>
          ) : (
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

                  {/* Prominent Recorded Class Link (Google Drive / YouTube) */}
                  {(chapter.recordedLink || chapter.videoUrl) && (
                    <a
                      href={chapter.recordedLink || chapter.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="Watch Recorded Class Link (Google Drive / YouTube)"
                    >
                      <PlayCircle className="w-3.5 h-3.5" />
                      <span>▶️ Watch Recorded Class</span>
                    </a>
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
                        onClick={() => handleDownload(chapter.id, chapter.pdfUrl, chapter.pdfTitle)}
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
        )}
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
