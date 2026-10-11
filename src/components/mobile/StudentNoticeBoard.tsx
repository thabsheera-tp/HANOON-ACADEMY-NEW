"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Pin,
  Calendar,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  BookOpen,
  X,
  ShieldCheck,
} from "lucide-react";
import {
  Announcement,
  AnnouncementCategory,
  getAnnouncements,
} from "@/services/announcementService";

interface StudentNoticeBoardProps {
  currentCourseId?: string;
  onOpenMaterials?: () => void;
  onOpenSpecialClass?: () => void;
  onOpenLiveClass?: () => void;
}

export default function StudentNoticeBoard({
  currentCourseId = "adaviyya",
  onOpenMaterials,
  onOpenSpecialClass,
  onOpenLiveClass,
}: StudentNoticeBoardProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedNotice, setSelectedNotice] = useState<Announcement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");

  useEffect(() => {
    const load = () => {
      const all = getAnnouncements();
      // Filter notices for either ALL courses or this student's specific course
      const filtered = all.filter(
        (a) =>
          !a.targetCourseId ||
          a.targetCourseId === "ALL" ||
          a.targetCourseId.toLowerCase() === currentCourseId.toLowerCase()
      );
      setAnnouncements(filtered);
    };

    load();

    const handleUpdate = () => {
      load();
    };

    window.addEventListener("hanoon_announcements_updated", handleUpdate);
    window.addEventListener("hanoon_new_announcement", handleUpdate);

    return () => {
      window.removeEventListener("hanoon_announcements_updated", handleUpdate);
      window.removeEventListener("hanoon_new_announcement", handleUpdate);
    };
  }, [currentCourseId]);

  const getCategoryBadge = (category: AnnouncementCategory) => {
    switch (category) {
      case "HOLIDAY":
        return {
          label: "🌴 Holiday",
          badgeClass: "bg-amber-100/80 text-amber-900 border-amber-200",
          dotClass: "bg-amber-500",
        };
      case "EXAM":
        return {
          label: "📝 Exam Alert",
          badgeClass: "bg-purple-100 text-purple-900 border-purple-200",
          dotClass: "bg-purple-600",
        };
      case "URGENT":
        return {
          label: "⚡ Urgent Alert",
          badgeClass: "bg-rose-100 text-rose-900 border-rose-200 animate-pulse",
          dotClass: "bg-rose-600",
        };
      case "EVENT":
        return {
          label: "✨ Special Event",
          badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-200",
          dotClass: "bg-emerald-600",
        };
      case "CIRCULAR":
      default:
        return {
          label: "📢 Circular",
          badgeClass: "bg-indigo-100 text-indigo-900 border-indigo-200",
          dotClass: "bg-indigo-600",
        };
    }
  };

  const formatNoticeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

      if (diffHours < 1) return "Just now";
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffHours < 48) return "Yesterday";
      return date.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Recent";
    }
  };

  const handleActionClick = (notice: Announcement) => {
    if (notice.actionLink === "#materials" && onOpenMaterials) {
      onOpenMaterials();
    } else if (notice.actionLink === "#special-class" && onOpenSpecialClass) {
      onOpenSpecialClass();
    } else if (notice.actionLink === "#live" && onOpenLiveClass) {
      onOpenLiveClass();
    } else if (notice.actionLink && notice.actionLink.startsWith("http")) {
      window.open(notice.actionLink, "_blank", "noopener,noreferrer");
    }
  };

  // Filtered notices based on category pill
  const displayedNotices = announcements.filter((a) => {
    if (activeFilter === "ALL") return true;
    return a.category === activeFilter;
  });

  return (
    <div className="space-y-2.5">
      {/* Notice Board Header Card */}
      <div className="bg-white rounded-2xl border border-purple-100/90 p-3.5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Notice Board
                </h3>
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" />
              </div>
              <p className="text-[10px] text-slate-500 font-medium">
                Official circulars & announcements
              </p>
            </div>
          </div>

          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100">
            {announcements.length} Notice{announcements.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-[10.5px]">
          {[
            { id: "ALL", label: "All" },
            { id: "HOLIDAY", label: "🌴 Holidays" },
            { id: "EXAM", label: "📝 Exams" },
            { id: "CIRCULAR", label: "📢 Circulars" },
          ].map((pill) => (
            <button
              type="button"
              key={pill.id}
              onClick={() => setActiveFilter(pill.id)}
              className={`py-1 px-2.5 rounded-xl font-bold whitespace-nowrap transition-all border cursor-pointer ${
                activeFilter === pill.id
                  ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                  : "bg-purple-50/50 text-slate-600 border-purple-100 hover:bg-purple-100/60"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Notices Stack */}
        {displayedNotices.length === 0 ? (
          <div className="py-6 text-center text-slate-400 space-y-1">
            <Megaphone className="w-6 h-6 mx-auto text-purple-200" />
            <p className="text-xs font-semibold">No announcements in this category</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayedNotices.map((notice) => {
              const badge = getCategoryBadge(notice.category);
              const isExpanded = expandedId === notice.id;

              return (
                <div
                  key={notice.id}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    notice.isPinned
                      ? "bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 border-purple-200/90 shadow-2xs"
                      : "bg-slate-50/40 border-purple-100/70 hover:bg-white"
                  }`}
                >
                  {/* Notice Item Header */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : notice.id)}
                    className="p-3 cursor-pointer select-none space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border flex items-center gap-1 ${badge.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
                          {badge.label}
                        </span>

                        {notice.isPinned && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200/80 flex items-center gap-0.5">
                            <Pin className="w-2.5 h-2.5 text-amber-600" />
                            Pinned
                          </span>
                        )}
                      </div>

                      <span className="text-[9.5px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                        <Clock className="w-2.5 h-2.5" />
                        {formatNoticeTime(notice.createdAt)}
                      </span>
                    </div>

                    {/* Notice Title */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-extrabold text-slate-900 leading-snug">
                        {notice.title}
                      </h4>
                      <button
                        type="button"
                        aria-label="Toggle details"
                        className="text-slate-400 hover:text-purple-600 transition-colors p-0.5"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Brief snippet if collapsed */}
                    {!isExpanded && (
                      <p className="text-[11px] text-slate-600 line-clamp-1 leading-relaxed">
                        {notice.content}
                      </p>
                    )}
                  </div>

                  {/* Expanded Content View */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t border-purple-100/60 space-y-2.5 text-slate-700 animate-in fade-in duration-150">
                      <p className="text-[11.5px] text-slate-700 leading-relaxed pt-2 whitespace-pre-line font-medium">
                        {notice.content}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-purple-50 flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-[9.5px] text-purple-700 font-bold">
                          <ShieldCheck className="w-3 h-3 text-purple-600" />
                          <span>
                            {notice.authorName} ({notice.authorRole})
                          </span>
                        </div>

                        {/* Interactive Link / Action button if provided */}
                        {notice.actionLabel && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleActionClick(notice);
                            }}
                            className="py-1 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] flex items-center gap-1 shadow-2xs cursor-pointer transition-all active:scale-95"
                          >
                            <span>{notice.actionLabel}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Modal View if opened */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 border border-purple-100 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-2 border-b border-purple-100 pb-3">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">
                  Official Announcement
                </span>
                <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                  {selectedNotice.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-medium">
              {selectedNotice.content}
            </p>

            <div className="pt-2 border-t border-purple-100 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
              <span>{selectedNotice.authorName}</span>
              <span>{formatNoticeTime(selectedNotice.createdAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
