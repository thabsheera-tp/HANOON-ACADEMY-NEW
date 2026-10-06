"use client";

import React, { useState } from "react";
import {
  X,
  Download,
  CheckCircle2,
  HardDrive,
  FileCheck,
  PlayCircle,
} from "lucide-react";
import { SelectedCourse } from "@/types/app";

interface DownloadArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCourse: SelectedCourse;
}

interface RecordedModule {
  id: string;
  title: string;
  duration: string;
  size: string;
  date: string;
  progress?: number;
  downloaded?: boolean;
}

export default function DownloadArchiveModal({
  isOpen,
  onClose,
  selectedCourse,
}: DownloadArchiveModalProps) {
  const [modules, setModules] = useState<RecordedModule[]>([
    {
      id: "mod-1",
      title: "Module 01: Core Foundations & Orientation",
      duration: "45 mins",
      size: "180 MB",
      date: "Oct 2026",
      downloaded: false,
    },
    {
      id: "mod-2",
      title: "Module 02: Advanced Rules & Recitation Check",
      duration: "55 mins",
      size: "240 MB",
      date: "Oct 2026",
      downloaded: false,
    },
    {
      id: "mod-3",
      title: "Module 03: Practical Workshop & Live Evaluation",
      duration: "60 mins",
      size: "290 MB",
      date: "Oct 2026",
      downloaded: false,
    },
  ]);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const startDownload = (id: string) => {
    if (downloadingId) return;
    setDownloadingId(id);

    // Simulate progress ticks
    let current = 0;
    const interval = setInterval(() => {
      current += 25;
      if (current >= 100) {
        clearInterval(interval);
        setModules((prev) =>
          prev.map((m) => (m.id === id ? { ...m, downloaded: true } : m))
        );
        setDownloadingId(null);
      } else {
        setModules((prev) =>
          prev.map((m) => (m.id === id ? { ...m, progress: current } : m))
        );
      }
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in font-['Plus_Jakarta_Sans']">
      <div className="backdrop-blur-2xl bg-[#012E21]/95 text-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-white/15 relative max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center">
              <Download className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] text-base font-black text-white">
                Recorded HD Classes
              </h3>
              <p className="font-['Plus_Jakarta_Sans'] text-[10px] text-emerald-200/70 font-semibold">
                {selectedCourse.title} • Offline Mobile Archive
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white/60 hover:text-white bg-white/10 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Offline Storage Status */}
        <div className="my-3 p-3 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white/90">Storage Available:</span>
          </div>
          <span className="font-black text-emerald-300">24.8 GB Free</span>
        </div>

        {/* Modules List */}
        <div className="space-y-3 overflow-y-auto pr-1 flex-1 py-1">
          {modules.map((item) => {
            const isThisDownloading = downloadingId === item.id;

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl border border-white/10 bg-white/[0.05] hover:border-emerald-400/40 transition-all shadow-xs"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <h5 className="text-xs font-black text-white leading-snug">
                      {item.title}
                    </h5>
                    <p className="text-[11px] text-emerald-200/70 font-medium mt-0.5">
                      {item.duration} • {item.size} • {item.date}
                    </p>
                  </div>

                  {item.downloaded ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-1 rounded-xl">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Saved</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => startDownload(item.id)}
                      disabled={Boolean(downloadingId)}
                      className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30 active:scale-95 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                      title="Download to Phone"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Progress bar if downloading */}
                {isThisDownloading && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-emerald-300">
                      <span>Downloading to mobile storage...</span>
                      <span>{item.progress || 10}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress || 10}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <div className="pt-3 border-t border-white/10 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-2xl font-black text-xs text-white bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
          >
            Close Archive
          </button>
        </div>
      </div>
    </div>
  );
}
