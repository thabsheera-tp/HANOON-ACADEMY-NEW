"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Send,
  MessageSquare,
  Radio,
  ExternalLink,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { SelectedCourse } from "@/types/app";
import {
  LiveClassSession,
  fetchLiveClassesFromSupabase,
} from "@/services/teacherService";
import { recordLiveClassJoinAttendance } from "@/services/attendanceService";

interface LiveClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCourse: SelectedCourse;
  userName?: string;
  studentId?: string;
  studentPhone?: string;
  onOpenTimetable?: () => void;
  onJoinSession?: (session: LiveClassSession) => void;
  onSessionCompleted?: () => void;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isInstructor?: boolean;
}

export default function LiveClassModal({
  isOpen,
  onClose,
  selectedCourse,
  userName = "Student",
  studentId,
  studentPhone,
  onOpenTimetable,
  onJoinSession,
  onSessionCompleted,
}: LiveClassModalProps) {
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [inputMsg, setInputMsg] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeClass, setActiveClass] = useState<LiveClassSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Return Flow & Click-based Attendance State
  const [isClassInProgress, setIsClassInProgress] = useState(false);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [attendanceMarkedAt, setAttendanceMarkedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsClassInProgress(false);
      return;
    }
    setIsLoading(true);

    const loadLiveClasses = async () => {
      try {
        const classes = await fetchLiveClassesFromSupabase(selectedCourse.id);
        const liveNow = classes.find((c) => c.status === "LIVE_NOW");
        const nextUpcoming = classes.find((c) => c.status === "SCHEDULED");
        setActiveClass(liveNow || nextUpcoming || null);
      } catch (e) {
        console.warn("Failed fetching live classes in modal:", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadLiveClasses();

    const handleBroadcastStarted = () => {
      loadLiveClasses();
    };
    const handleBroadcastEnded = () => {
      loadLiveClasses();
    };
    const handleClassesUpdated = () => {
      loadLiveClasses();
    };

    window.addEventListener("hanoon_live_broadcast_started", handleBroadcastStarted);
    window.addEventListener("hanoon_live_broadcast_ended", handleBroadcastEnded);
    window.addEventListener("hanoon_classes_updated", handleClassesUpdated);

    return () => {
      window.removeEventListener("hanoon_live_broadcast_started", handleBroadcastStarted);
      window.removeEventListener("hanoon_live_broadcast_ended", handleBroadcastEnded);
      window.removeEventListener("hanoon_classes_updated", handleClassesUpdated);
    };
  }, [isOpen, selectedCourse.id]);

  if (!isOpen) return null;

  const isLiveNow = activeClass?.status === "LIVE_NOW";

  // REQUIREMENT 1: Click-based Attendance & Opening in a New Tab
  const handleJoinLiveClass = async () => {
    if (!activeClass?.meetingLink) return;

    setIsMarkingAttendance(true);
    const nowTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setAttendanceMarkedAt(nowTime);

    try {
      await recordLiveClassJoinAttendance({
        studentId,
        studentName: userName,
        studentPhone,
        courseId: selectedCourse.id,
        classTitle: activeClass.title,
        subjectId: activeClass.subjectId,
        meetingLink: activeClass.meetingLink,
      });
    } catch (e) {
      console.warn("Could not log live attendance:", e);
    } finally {
      setIsMarkingAttendance(false);
    }

    // REQUIREMENT 2: Open Google Meet link in NEW window/tab
    window.open(activeClass.meetingLink, "_blank", "noopener,noreferrer");

    // REQUIREMENT 2: In original app tab, transition to "Class in Progress..."
    setIsClassInProgress(true);
    onJoinSession?.(activeClass);
  };

  // REQUIREMENT 2: Return flow when student finishes Google Meet
  const handleCompleteAndReturn = () => {
    setIsClassInProgress(false);
    setAttendanceMarkedAt(null);
    onSessionCompleted?.();
    onClose();
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    setChatMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: userName || "Student",
        text: inputMsg.trim(),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInputMsg("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans'] select-none">
      <div className="bg-white text-slate-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-purple-100 relative max-h-[92vh] flex flex-col overflow-y-auto no-scrollbar">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isClassInProgress
                  ? "bg-rose-50 text-rose-600 animate-pulse"
                  : isLiveNow
                  ? "bg-rose-50 text-rose-600"
                  : "bg-purple-50 text-purple-600"
              }`}
            >
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                {isClassInProgress ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">
                      Class in Progress...
                    </span>
                  </>
                ) : isLiveNow ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                      Live Classroom
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                    Interactive Classroom
                  </span>
                )}
              </div>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                {selectedCourse.title}
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

        {/* ========================================================
            CASE A: CLASS IN PROGRESS RETURN FLOW STATE (POST-CLICK)
            ======================================================== */}
        {isClassInProgress ? (
          <div className="my-3 rounded-2xl bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white p-4 space-y-3.5 shadow-xl border border-rose-500/40 animate-fade-in relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-rose-300">
                  Class in Progress...
                </span>
              </div>
              <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Present (P) Marked</span>
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-white leading-tight">
                {activeClass?.title || "Virtual Lecture Session"}
              </h4>
              <p className="text-[11px] text-purple-200">
                Google Meet is active with {activeClass?.teacherName || "Faculty Instructor"}
                {attendanceMarkedAt ? ` • Attendance logged at ${attendanceMarkedAt}` : ""}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-md text-[11px] text-purple-100 space-y-2 border border-white/10">
              <p className="leading-relaxed">
                Your live class opened in a new tab. When your Google Meet session concludes, click below to confirm completion and return to your dashboard.
              </p>
              {activeClass?.meetingLink && (
                <a
                  href={activeClass.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-rose-300 hover:text-white font-bold underline"
                >
                  <span>Reopen Google Meet tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* PROMINENT RETURN BUTTON */}
            <button
              type="button"
              onClick={handleCompleteAndReturn}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark as Completed & Return to Dashboard</span>
            </button>
          </div>
        ) : (
          /* ========================================================
             CASE B: INITIAL PRE-JOIN VIDEO CANVAS
             ======================================================== */
          <div className="my-3 rounded-2xl bg-slate-900 text-white p-4 relative overflow-hidden aspect-video flex flex-col justify-between shadow-inner">
            {activeClass ? (
              <>
                <div className="flex items-center justify-between text-[11px] text-white/80 z-10">
                  {isLiveNow ? (
                    <span className="bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      LIVE NOW
                    </span>
                  ) : (
                    <span className="bg-purple-600 text-white font-bold px-2 py-0.5 rounded-full text-[10px]">
                      SCHEDULED
                    </span>
                  )}
                  <span className="flex items-center gap-1 font-mono text-purple-300">
                    <Users className="w-3.5 h-3.5" />
                    {activeClass.attendeesCount || 0} Registered
                  </span>
                </div>

                <div className="my-auto text-center space-y-1 z-10 px-2">
                  <div className="w-12 h-12 rounded-full bg-purple-600/60 border border-purple-400 mx-auto flex items-center justify-center font-bold text-lg text-white">
                    {(activeClass.teacherName || "F").charAt(0)}
                  </div>
                  <p className="text-xs font-bold text-white line-clamp-1">
                    {activeClass.teacherName || "Faculty Instructor"}
                  </p>
                  <p className="text-[10px] text-purple-200 line-clamp-1">
                    {activeClass.title}
                  </p>
                  {activeClass.date && activeClass.time && (
                    <p className="text-[9px] text-purple-300 font-mono">
                      {activeClass.date} • {activeClass.time} IST
                    </p>
                  )}
                </div>

                {/* Stream Audio / Video controls */}
                <div className="flex items-center justify-center gap-3 z-10">
                  <button
                    type="button"
                    onClick={() => setMicOn(!micOn)}
                    className={`p-2 rounded-xl transition-all ${
                      micOn
                        ? "bg-purple-600 text-white"
                        : "bg-white/20 text-white/80 hover:bg-white/30"
                    }`}
                    title={micOn ? "Mute Microphone" : "Unmute Microphone"}
                  >
                    {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCameraOn(!cameraOn)}
                    className={`p-2 rounded-xl transition-all ${
                      cameraOn
                        ? "bg-purple-600 text-white"
                        : "bg-white/20 text-white/80 hover:bg-white/30"
                    }`}
                    title={cameraOn ? "Stop Camera" : "Start Camera"}
                  >
                    {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                  </button>
                </div>
              </>
            ) : (
              <div className="my-auto text-center space-y-2 z-10 px-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                  <Radio className="w-6 h-6 text-slate-500" />
                </div>
                <p className="text-xs font-bold text-white">No Live Class in Session</p>
                <p className="text-[10.5px] text-slate-400 leading-snug max-w-xs mx-auto">
                  There are currently no active live lectures for {selectedCourse.title}. Upcoming sessions will appear here as soon as scheduled by faculty.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Live Q&A and Chat Section */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
            <span>Interactive Student Q&A Stream</span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100 max-h-32 overflow-y-auto space-y-2 text-xs">
            {chatMessages.length === 0 ? (
              <div className="py-3 text-center space-y-1">
                <MessageSquare className="w-4 h-4 text-purple-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No live chat messages yet</p>
                <p className="text-[10px] text-slate-400">Ask a question or send a greeting to your instructor.</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="p-2 rounded-xl bg-white border border-purple-100/80 shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                    <span className="font-extrabold text-purple-700">{msg.sender}</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-snug">{msg.text}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Ask Usthad a question..."
              value={inputMsg}
              onChange={(e) => setInputMsg(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-purple-50/50 border border-purple-100 text-xs text-slate-900 outline-none"
            />
            <button
              type="submit"
              className="p-2 rounded-xl bg-purple-600 text-white cursor-pointer hover:bg-purple-700"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Bottom Actions */}
        <div className="pt-2 border-t border-purple-100 flex items-center justify-between">
          {onOpenTimetable && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTimetable();
              }}
              className="text-[11px] font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
            >
              View Schedule
            </button>
          )}

          <div className="flex items-center gap-2">
            {isClassInProgress ? (
              <button
                type="button"
                onClick={handleCompleteAndReturn}
                className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Return to Dashboard</span>
              </button>
            ) : activeClass?.meetingLink ? (
              <button
                type="button"
                onClick={handleJoinLiveClass}
                disabled={isMarkingAttendance}
                className="py-2 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-purple-600/25 cursor-pointer disabled:opacity-60"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>{isMarkingAttendance ? "Marking Present..." : "Join Live Class"}</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="py-1.5 px-3 rounded-xl bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed"
              >
                <span>No Active Meeting Link</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
