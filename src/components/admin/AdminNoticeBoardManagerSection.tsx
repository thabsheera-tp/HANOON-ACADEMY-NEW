"use client";

import React, { useState, useEffect } from "react";
import {
  Megaphone,
  Pin,
  Send,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Clock,
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Calendar,
  BookOpen,
} from "lucide-react";
import {
  Announcement,
  AnnouncementCategory,
  getAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  togglePinAnnouncement,
} from "@/services/announcementService";
import { SHOWCASE_COURSES } from "@/components/mobile/ScreenCoursesList";

interface AdminNoticeBoardManagerSectionProps {
  currentUserName?: string;
  currentUserRole?: string;
}

export default function AdminNoticeBoardManagerSection({
  currentUserName = "Office Admin",
  currentUserRole = "Administration",
}: AdminNoticeBoardManagerSectionProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<AnnouncementCategory>("HOLIDAY");
  const [targetCourseId, setTargetCourseId] = useState<string>("ALL");
  const [isPinned, setIsPinned] = useState(false);
  const [actionLabel, setActionLabel] = useState("");
  const [actionLink, setActionLink] = useState("");
  const [authorName, setAuthorName] = useState(currentUserName);
  const [authorRole, setAuthorRole] = useState(currentUserRole);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    setAnnouncements(getAnnouncements());

    const handleUpdate = () => {
      setAnnouncements(getAnnouncements());
    };

    window.addEventListener("hanoon_announcements_updated", handleUpdate);
    window.addEventListener("hanoon_new_announcement", handleUpdate);
    return () => {
      window.removeEventListener("hanoon_announcements_updated", handleUpdate);
      window.removeEventListener("hanoon_new_announcement", handleUpdate);
    };
  }, []);

  const handlePublishNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setIsSubmitting(true);

    const targetCourseObj = SHOWCASE_COURSES.find((c) => c.id === targetCourseId);

    createAnnouncement({
      title: title.trim(),
      content: content.trim(),
      category,
      targetCourseId,
      targetCourseName: targetCourseObj ? targetCourseObj.title : undefined,
      isPinned,
      authorName: authorName.trim() || currentUserName,
      authorRole: authorRole.trim() || currentUserRole,
      actionLabel: actionLabel.trim() || undefined,
      actionLink: actionLink.trim() || undefined,
    });

    setAnnouncements(getAnnouncements());
    setIsSubmitting(false);

    // Reset Form
    setTitle("");
    setContent("");
    setIsPinned(false);
    setActionLabel("");
    setActionLink("");
    setSuccessMessage("Notice published successfully! Enrolled students will receive instant alerts.");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this announcement from the student notice board?")) {
      deleteAnnouncement(id);
      setAnnouncements(getAnnouncements());
      setSuccessMessage("Announcement deleted from board.");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleTogglePin = (id: string) => {
    togglePinAnnouncement(id);
    setAnnouncements(getAnnouncements());
  };

  const getCategoryColor = (cat: AnnouncementCategory) => {
    switch (cat) {
      case "HOLIDAY":
        return "bg-amber-100 text-amber-900 border-amber-200";
      case "EXAM":
        return "bg-purple-100 text-purple-900 border-purple-200";
      case "URGENT":
        return "bg-rose-100 text-rose-900 border-rose-200";
      case "EVENT":
        return "bg-emerald-100 text-emerald-900 border-emerald-200";
      case "CIRCULAR":
      default:
        return "bg-indigo-100 text-indigo-900 border-indigo-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-800 rounded-3xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-extrabold uppercase tracking-wider text-purple-100">
              <Megaphone className="w-3.5 h-3.5 text-purple-200" />
              <span>Official Student Communication</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Notice Board & Announcements Publisher
            </h2>
            <p className="text-xs sm:text-sm text-purple-100/90 max-w-xl leading-relaxed">
              Post official academy notices (e.g., &quot;Holiday Tomorrow&quot;, &quot;Exam Next Week&quot;, exam timetables, fee circulars). Announcements appear immediately on the Student Dashboard Notice Board with automated push alerts.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center shrink-0 min-w-[130px] space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200 block">
              Active Notices
            </span>
            <div className="text-2xl font-black text-white">
              {announcements.length}
            </div>
            <span className="text-[9.5px] text-purple-200">Enrolled Feed</span>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-3 animate-fade-in shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Layout Grid: Post Form + Live Board Previews */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Notice Composer (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-xs space-y-5">
          <div className="border-b border-purple-100 pb-3 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-600" />
              <span>Publish New Notice</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Student Board
            </span>
          </div>

          <form onSubmit={handlePublishNotice} className="space-y-4">
            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Notice Category <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "HOLIDAY", label: "🌴 Holiday" },
                  { id: "EXAM", label: "📝 Exam Alert" },
                  { id: "CIRCULAR", label: "📢 Circular" },
                  { id: "URGENT", label: "⚡ Urgent" },
                  { id: "EVENT", label: "✨ Event" },
                  { id: "GENERAL", label: "📌 General" },
                ].map((cat) => (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategory(cat.id as AnnouncementCategory)}
                    className={`py-2 px-1 text-[11px] font-bold text-center rounded-xl transition-all border cursor-pointer ${
                      category === cat.id
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-purple-50/50 text-slate-700 border-purple-100 hover:border-purple-300"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Course Scope */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Target Student Cohort
              </label>
              <select
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">All Enrolled Students (Academy-wide)</option>
                {SHOWCASE_COURSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Title / Headline */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Notice Headline <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Holiday Tomorrow or Exam Next Week"
                className="w-full py-2.5 px-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Notice Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Detailed Notice Content <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter complete circular text, instructions, and dates for students..."
                className="w-full p-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Quick Template Fill Buttons */}
            <div className="space-y-1">
              <span className="text-[10.5px] font-bold text-slate-500 block">
                Quick Template Fill:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setCategory("HOLIDAY");
                    setTitle("🌴 Holiday Tomorrow - Regular Classes Suspended");
                    setContent("Dear students, please note that all regular lectures are suspended tomorrow. Evening special prayer session continues as scheduled.");
                    setIsPinned(true);
                  }}
                  className="py-1 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 transition-colors cursor-pointer"
                >
                  🌴 Holiday Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategory("EXAM");
                    setTitle("📝 Semester Exam Next Week - Assessment Schedule");
                    setContent("Oral & written semester assessments will commence from next week. Please download chapter PDF notes and complete revisions.");
                    setActionLabel("Study Materials");
                    setActionLink("#materials");
                    setIsPinned(true);
                  }}
                  className="py-1 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10px] font-bold border border-purple-200 transition-colors cursor-pointer"
                >
                  📝 Exam Next Week
                </button>
              </div>
            </div>

            {/* Pinned Checkbox & Author Details */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/50 border border-purple-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-purple-300"
                />
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5 text-amber-600" />
                  Pin to Top
                </span>
              </label>

              <div className="space-y-1">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Author (e.g. Office Admin)"
                  className="w-full py-2 px-3 rounded-xl bg-purple-50/50 border border-purple-100 text-xs font-semibold text-slate-800 outline-none"
                />
              </div>
            </div>

            {/* Action Button Link (Optional) */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <input
                type="text"
                value={actionLabel}
                onChange={(e) => setActionLabel(e.target.value)}
                placeholder="Button Label (e.g. Join Class)"
                className="w-full py-2 px-3 rounded-xl bg-purple-50/50 border border-purple-100 text-xs font-medium text-slate-800 outline-none"
              />
              <input
                type="text"
                value={actionLink}
                onChange={(e) => setActionLink(e.target.value)}
                placeholder="Link (#materials, #live)"
                className="w-full py-2 px-3 rounded-xl bg-purple-50/50 border border-purple-100 text-xs font-medium text-slate-800 outline-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-60"
              >
                <Megaphone className="w-4 h-4" />
                <span>Post Notice to Student Board</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Notice Board Feed (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-purple-600" />
                  <span>Student Dashboard Live Notices</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Currently active announcements displayed on student devices.
                </p>
              </div>

              <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                {announcements.length} Live Items
              </span>
            </div>

            {/* Notices List */}
            {announcements.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-purple-50/30 border border-purple-100/60 p-6 space-y-2">
                <Megaphone className="w-8 h-8 text-purple-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">Notice board is currently empty</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Use the form on the left to publish announcements like holidays, exam timetables, or academy circulars.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                {announcements.map((item) => {
                  const catColor = getCategoryColor(item.category);

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all space-y-2.5 ${
                        item.isPinned
                          ? "bg-purple-50/50 border-purple-200 shadow-2xs"
                          : "bg-white border-purple-100 hover:border-purple-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${catColor}`}
                          >
                            {item.category}
                          </span>

                          {item.isPinned && (
                            <span className="text-[9.5px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                              <Pin className="w-3 h-3 text-amber-600" />
                              Pinned
                            </span>
                          )}

                          {item.targetCourseName && (
                            <span className="text-[9.5px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              {item.targetCourseName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleTogglePin(item.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs font-bold ${
                              item.isPinned
                                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                                : "text-slate-400 hover:bg-purple-50 hover:text-purple-700"
                            }`}
                            title={item.isPinned ? "Unpin notice" : "Pin notice to top"}
                          >
                            <Pin className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete announcement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed mt-1 whitespace-pre-line font-medium">
                          {item.content}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-purple-100/60 flex items-center justify-between text-[10px] text-slate-400 font-semibold flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-purple-700 font-bold">
                          <ShieldCheck className="w-3 h-3 text-purple-600" />
                          <span>
                            {item.authorName} ({item.authorRole})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.actionLabel && (
                            <span className="text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded">
                              Action: {item.actionLabel}
                            </span>
                          )}
                          <span>
                            {new Date(item.createdAt).toLocaleDateString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
