"use client";

import React, { useState } from "react";
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "Usthad Faisal (Instructor)",
      text: "Assalamu Alaikum wa Rahmatullah. Welcome to today's interactive session.",
      time: "07:30 PM",
      isInstructor: true,
    },
    {
      id: "2",
      sender: "Farhan K.",
      text: "Wa Alaikumussalam Usthad. Ready for lesson review.",
      time: "07:31 PM",
    },
  ]);

  if (!isOpen) return null;

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
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                  Live Classroom
                </span>
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
          <div className="flex items-center justify-between text-[11px] text-white/80 z-10">
            <span className="bg-rose-600 text-white font-bold px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              LIVE
            </span>
            <span className="flex items-center gap-1 font-mono text-purple-300">
              <Users className="w-3.5 h-3.5" />
              48 Students
            </span>
          </div>

          <div className="my-auto text-center space-y-1 z-10">
            <div className="w-12 h-12 rounded-full bg-purple-600/60 border border-purple-400 mx-auto flex items-center justify-center font-bold text-lg text-white">
              UF
            </div>
            <p className="text-xs font-bold text-white">Usthad Dr. Faisal Al-Hanoon</p>
            <p className="text-[10px] text-purple-200">Speaking: Fiqh Jurisprudence Chapter 4</p>
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
        </div>

        {/* Live Q&A and Chat Section */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
            <span>Interactive Student Q&A Stream</span>
          </div>

          <div className="p-3 rounded-2xl bg-purple-50/50 border border-purple-100 max-h-36 overflow-y-auto space-y-2 text-xs">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="space-y-0.5">
                <div className="flex items-center justify-between text-[10px]">
                  <strong className={msg.isInstructor ? "text-purple-700 font-extrabold" : "text-slate-800 font-bold"}>
                    {msg.sender}
                  </strong>
                  <span className="text-slate-400 font-mono">{msg.time}</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-snug">{msg.text}</p>
              </div>
            ))}
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

          <a
            href="https://zoom.us/j/hanoon-live-room"
            target="_blank"
            rel="noopener noreferrer"
            className="py-1.5 px-3 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold flex items-center gap-1 transition-all"
          >
            <span>Open in Zoom App</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
