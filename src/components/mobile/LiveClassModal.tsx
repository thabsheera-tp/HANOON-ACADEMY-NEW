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
} from "lucide-react";
import { SelectedCourse } from "@/types/app";
import {
  LiveClassSession,
  fetchLiveClassesFromSupabase,
  getTeacherClasses,
} from "@/services/teacherService";

interface LiveClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCourse: SelectedCourse;
  userName?: string;
  onOpenTimetable?: () => void;
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
  onOpenTimetable,
}: LiveClassModalProps) {
  const [micOn, setMicOn] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [inputMsg, setInputMsg] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeClass, setActiveClass] = useState<LiveClassSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
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
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              isLiveNow ? "bg-rose-50 text-rose-600" : "bg-purple-50 text-purple-600"
            }`}>
              <Radio className={`w-5 h-5 ${isLiveNow ? "animate-pulse" : ""}`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                {isLiveNow ? (
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

        {/* Video Canvas Simulation */}
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
                    micOn ? "bg-purple-600 text-white" : "bg-white/20 text-white/80 hover:bg-white/30"
                  }`}
                  title={micOn ? "Mute Microphone" : "Unmute Microphone"}
                >
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => setCameraOn(!cameraOn)}
                  className={`p-2 rounded-xl transition-all ${
                    cameraOn ? "bg-purple-600 text-white" : "bg-white/20 text-white/80 hover:bg-white/30"
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

        {/* Live Q&A and Chat Section */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
            <span>Interactive Student Q&A Stream</span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100 max-h-36 overflow-y-auto space-y-2 text-xs">
            {chatMessages.length === 0 ? (
              <div className="py-4 text-center space-y-1">
                <MessageSquare className="w-5 h-5 text-purple-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-600">No live chat messages yet</p>
                <p className="text-[10px] text-slate-400">Ask a question or send a greeting to your instructor.</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <strong className={msg.isInstructor ? "text-purple-700 font-extrabold" : "text-slate-800 font-bold"}>
                      {msg.sender}
                    </strong>
                    <span className="text-slate-400 font-mono">{msg.time}</span>
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

        {/* External High-Def Link */}
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
            {(activeClass?.recordingUrl || (activeClass as any)?.recording_url) && (
              <a
                href={activeClass?.recordingUrl || (activeClass as any)?.recording_url}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-3 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200 text-xs font-extrabold flex items-center gap-1 transition-all shadow-2xs"
                title="Watch Recorded Class Link (Google Drive / YouTube)"
              >
                <span>▶️ Watch Recorded Class</span>
              </a>
            )}

            {activeClass?.meetingLink ? (
              <a
                href={activeClass.meetingLink}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
              >
                <span>Open in {activeClass.platform || "Meeting"}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
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
