"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Send,
  Radio,
  Calendar,
  FileText,
  Users,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Check,
  Megaphone,
} from "lucide-react";
import AdminNoticeBoardManagerSection from "@/components/admin/AdminNoticeBoardManagerSection";
import {
  getNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearNotifications,
  requestBrowserNotificationPermission,
  AppNotification,
  NotificationTargetRole,
  NotificationType,
} from "@/services/notificationService";
import { SHOWCASE_COURSES } from "@/components/mobile/ScreenCoursesList";

interface NotificationsManagerSectionProps {
  currentUserRole?: string;
  currentUserName?: string;
}

export default function NotificationsManagerSection({
  currentUserRole = "Staff",
  currentUserName = "Staff Verifier",
}: NotificationsManagerSectionProps) {
  // Form states
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [targetRole, setTargetRole] = useState<NotificationTargetRole>("students");
  const [targetCourseId, setTargetCourseId] = useState<string>("ALL");
  const [priority, setPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [viewMode, setViewMode] = useState<"broadcast" | "notice_board">("broadcast");

  // Push Permission State
  const [pushPermission, setPushPermission] = useState<NotificationPermission>("default");

  // Notifications Data State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    setNotifications(getNotifications());

    if (typeof window !== "undefined" && "Notification" in window) {
      setPushPermission(Notification.permission);
    }

    const handleUpdate = () => {
      setNotifications(getNotifications());
    };

    window.addEventListener("hanoon_notifications_updated", handleUpdate);
    window.addEventListener("hanoon_new_notification", handleUpdate);
    return () => {
      window.removeEventListener("hanoon_notifications_updated", handleUpdate);
      window.removeEventListener("hanoon_new_notification", handleUpdate);
    };
  }, []);

  const handleRequestPushPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setPushPermission(res);
    if (res === "granted") {
      setSuccessMessage("Browser push notifications successfully enabled!");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    setIsSending(true);

    const targetCourseObj = SHOWCASE_COURSES.find((c) => c.id === targetCourseId);

    createNotification({
      title: broadcastTitle.trim(),
      message: broadcastMessage.trim(),
      type: "BROADCAST",
      targetRole,
      targetCourseId: targetCourseId !== "ALL" ? targetCourseId : undefined,
      targetCourseName: targetCourseObj ? targetCourseObj.title : undefined,
      senderName: currentUserName,
      priority,
    });

    setNotifications(getNotifications());
    setIsSending(false);
    setBroadcastTitle("");
    setBroadcastMessage("");
    setSuccessMessage("Notification broadcasted successfully to in-app feeds and push channels!");
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead();
    setNotifications(getNotifications());
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all notification history?")) {
      clearNotifications();
      setNotifications([]);
      setSuccessMessage("Notification history cleared.");
      setTimeout(() => setSuccessMessage(null), 3000);
    }
  };

  const getNotifIcon = (type: NotificationType) => {
    switch (type) {
      case "CLASS_SCHEDULED":
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case "CLASS_LIVE":
        return <Radio className="w-4 h-4 text-rose-600 animate-pulse" />;
      case "NOTES_UPLOADED":
        return <FileText className="w-4 h-4 text-indigo-600" />;
      case "PAYMENT_APPROVED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-amber-600" />;
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
              <Bell className="w-3.5 h-3.5 text-purple-200" />
              <span>Real-Time Broadcast Center</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Automated Push & In-App Notification Hub
            </h2>
            <p className="text-xs sm:text-sm text-purple-100/90 max-w-xl leading-relaxed">
              Monitors automated alerts for scheduled classes, live stream launches, and PDF notes uploads. Send targeted announcements directly to students and teachers.
            </p>
          </div>

          {/* Push Status / Enable Action */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/15 text-center shrink-0 min-w-[140px] space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200 block">
              Push Notification API
            </span>
            <div className="flex items-center justify-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  pushPermission === "granted"
                    ? "bg-emerald-400 animate-pulse"
                    : pushPermission === "denied"
                    ? "bg-rose-400"
                    : "bg-amber-400"
                }`}
              />
              <span className="text-xs font-black uppercase text-white">
                {pushPermission}
              </span>
            </div>
            {pushPermission !== "granted" && (
              <button
                type="button"
                onClick={handleRequestPushPermission}
                className="py-1 px-2.5 rounded-lg bg-white hover:bg-purple-50 text-[10px] font-bold text-purple-800 transition-colors cursor-pointer"
              >
                Enable Push
              </button>
            )}
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

      {/* Sub-view switcher: Broadcast Alerts vs Student Notice Board */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-purple-50/80 border border-purple-100 max-w-md">
        <button
          type="button"
          onClick={() => setViewMode("broadcast")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            viewMode === "broadcast"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 hover:text-purple-700 hover:bg-white"
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Broadcast Alerts</span>
        </button>
        <button
          type="button"
          onClick={() => setViewMode("notice_board")}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            viewMode === "notice_board"
              ? "bg-purple-600 text-white shadow-xs"
              : "text-slate-600 hover:text-purple-700 hover:bg-white"
          }`}
        >
          <Megaphone className="w-3.5 h-3.5" />
          <span>Student Notice Board</span>
        </button>
      </div>

      {viewMode === "notice_board" ? (
        <AdminNoticeBoardManagerSection
          currentUserName={currentUserName}
          currentUserRole={currentUserRole}
        />
      ) : (
        /* Grid: Broadcast Creator + Notification Feed */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Broadcast Composer (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-xs space-y-5">
          <div className="border-b border-purple-100 pb-3 flex items-center justify-between">
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-purple-600" />
              <span>Compose Broadcast Alert</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Instant Dispatch
            </span>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            {/* Target Audience */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Target Audience <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "students", label: "Enrolled Students" },
                  { id: "teachers", label: "Faculty Teachers" },
                  { id: "all", label: "Entire Academy (All)" },
                  { id: "staff", label: "Staff Only" },
                ].map((aud) => (
                  <button
                    type="button"
                    key={aud.id}
                    onClick={() => setTargetRole(aud.id as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold text-center transition-all border cursor-pointer ${
                      targetRole === aud.id
                        ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                        : "bg-purple-50/50 text-slate-700 border-purple-100 hover:border-purple-300"
                    }`}
                  >
                    {aud.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Course Scope */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Course Filter Scope
              </label>
              <select
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs font-bold text-slate-800 outline-none cursor-pointer"
              >
                <option value="ALL">All Courses (Academy-wide)</option>
                {SHOWCASE_COURSES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Alert Priority */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Urgency Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "normal", label: "Normal" },
                  { id: "high", label: "Important" },
                  { id: "urgent", label: "Urgent Live" },
                ].map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPriority(p.id as any)}
                    className={`py-1.5 rounded-lg text-xs font-bold text-center transition-all border cursor-pointer ${
                      priority === p.id
                        ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                        : "bg-purple-50/40 text-slate-600 border-purple-100"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Notification Headline <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Special Tarbiyah Assembly this Friday"
                className="w-full py-2.5 px-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-slate-700 block">
                Message Body <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Type the message to be delivered instantly to enrolled student devices..."
                className="w-full p-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 resize-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSending}
                className="w-full py-3.5 px-4 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-60"
              >
                <Send className="w-4 h-4" />
                <span>Broadcast Alert Now</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Notification Feed (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-purple-100 shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-purple-600" />
                  <span>Real-Time Notifications Feed</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Automated alerts for live classes, PDF notes uploads, and student updates.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="py-1 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold border border-purple-200 transition-colors cursor-pointer"
                >
                  Mark All Read
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Clear All Notifications"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notification Items */}
            {notifications.length === 0 ? (
              <div className="py-12 text-center rounded-2xl bg-purple-50/30 border border-purple-100/60 p-6 space-y-2">
                <Bell className="w-8 h-8 text-purple-300 mx-auto" />
                <h4 className="text-xs font-bold text-slate-700">No notifications in history</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Notifications triggered by class scheduling, live broadcasts, and notes uploads will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {notifications.map((item) => {
                  const isUrgent = item.priority === "urgent";

                  return (
                    <div
                      key={item.id}
                      onClick={() => markNotificationAsRead(item.id)}
                      className={`p-3.5 rounded-2xl border transition-all space-y-1.5 cursor-pointer shadow-2xs ${
                        !item.isRead
                          ? isUrgent
                            ? "bg-rose-50/60 border-rose-300 ring-1 ring-rose-200"
                            : "bg-purple-50/50 border-purple-200"
                          : "bg-white border-purple-100/70 opacity-80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                            {getNotifIcon(item.type)}
                          </div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-900 leading-tight">
                                {item.title}
                              </span>
                              {!item.isRead && (
                                <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                              )}
                              <span className="text-[10px] font-bold text-slate-400">
                                {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              {item.message}
                            </p>
                          </div>
                        </div>

                        <span className="text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-100/70 text-purple-800 shrink-0">
                          {item.targetRole}
                        </span>
                      </div>

                      {/* Direct Links if available */}
                      {(item.meetingLink || item.pdfUrl) && (
                        <div className="pt-1.5 border-t border-purple-100/60 flex items-center gap-2 flex-wrap">
                          {item.meetingLink && (
                            <a
                              href={item.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-100/70 hover:bg-purple-200 px-2 py-0.5 rounded-lg transition-colors"
                            >
                              <span>Join {item.platform || "Meeting"}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}

                          {item.pdfUrl && (
                            <a
                              href={item.pdfUrl}
                              download={item.pdfTitle || "notes.pdf"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg transition-colors"
                            >
                              <span>Open PDF Notes</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-purple-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>{notifications.filter((n) => !n.isRead).length} unread alerts</span>
            <span className="font-medium text-emerald-600 flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              Automated triggers operational
            </span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
