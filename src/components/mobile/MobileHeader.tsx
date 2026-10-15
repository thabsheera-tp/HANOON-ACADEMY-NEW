"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  LogOut,
  X,
  Bell,
  Calendar,
  Radio,
  FileText,
  ExternalLink,
  Download,
  CheckCircle2,
  Check,
} from "lucide-react";
import { ScreenTab, UserProfile } from "@/types/app";
import HanoonLogo from "@/components/brand/HanoonLogo";
import { logoutUser } from "@/services/authService";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  AppNotification,
} from "@/services/notificationService";

interface MobileHeaderProps {
  currentScreen: ScreenTab;
  onBack?: () => void;
  onGoHome?: () => void;
  canGoBack: boolean;
  userProfile?: UserProfile;
  isApproved?: boolean;
  isPending?: boolean;
}

export default function MobileHeader({
  currentScreen,
  onBack,
  onGoHome,
  canGoBack,
  userProfile,
  isApproved = false,
  isPending = false,
}: MobileHeaderProps) {
  const router = useRouter();
  const [isPortalMenuOpen, setIsPortalMenuOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [hasNewAlertAnimation, setHasNewAlertAnimation] = useState(false);

  useEffect(() => {
    // Notifications should NOT be available or listened to before student enrolls and is approved
    if (!isApproved) {
      setNotifications([]);
      setIsNotifDrawerOpen(false);
      return;
    }

    setNotifications(getNotifications());

    const updateNotifs = () => {
      if (!isApproved) return;
      setNotifications(getNotifications());
      setHasNewAlertAnimation(true);
      setTimeout(() => setHasNewAlertAnimation(false), 3000);
    };

    const handleOpenDrawer = () => {
      if (isApproved) {
        setIsNotifDrawerOpen(true);
      }
    };

    window.addEventListener("hanoon_notifications_updated", updateNotifs);
    window.addEventListener("hanoon_new_notification", updateNotifs);
    window.addEventListener("hanoon_open_notifications_drawer", handleOpenDrawer);
    return () => {
      window.removeEventListener("hanoon_notifications_updated", updateNotifs);
      window.removeEventListener("hanoon_new_notification", updateNotifs);
      window.removeEventListener("hanoon_open_notifications_drawer", handleOpenDrawer);
    };
  }, [isApproved]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (currentScreen === "splash" || currentScreen === "onboarding") {
    return null;
  }

  const getScreenTitle = () => {
    switch (currentScreen) {
      case "courses":
        return "Courses";
      case "course-details":
        return "Course Details";
      case "payment":
        return "UPI Fee Payment";
      case "pending-verification":
        return "Payment Under Review";
      case "dashboard":
        return "Student Dashboard";
      default:
        return "Hanoon Academy";
    }
  };

  const displayName = userProfile?.name?.trim() || "Student Account";
  const displayPhone = userProfile?.phone?.trim() || "Active Session";
  const avatarLetter = displayName ? displayName.charAt(0).toUpperCase() : "S";

  const handleSignOut = async () => {
    setIsPortalMenuOpen(false);
    await logoutUser();
    router.replace("/login");
  };

  return (
    <header className="w-full max-w-full overflow-x-hidden bg-white text-slate-900 shrink-0 sticky top-0 z-40 border-b border-purple-100 shadow-xs select-none">
      {/* Main Header Row */}
      <div className="px-4 py-3 flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          {canGoBack && (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 rounded-xl hover:bg-purple-50 active:scale-95 transition-all text-slate-700 font-bold cursor-pointer"
              aria-label="Go Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={onGoHome || onBack}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 active:scale-[0.98] transition-all text-left bg-transparent border-0 p-0"
            title="Go to Home / First Page"
          >
            <HanoonLogo size="sm" showText={false} />
            <h1 className="font-['Plus_Jakarta_Sans'] text-base font-extrabold tracking-tight text-slate-900 leading-tight">
              {getScreenTitle()}
            </h1>
          </button>
        </div>

        {/* Right Header Element: Notifications Bell (Enrolled Students Only) + Profile Avatar / Help */}
        <div className="flex items-center gap-1.5">
          {/* Notifications Bell: Strictly available ONLY for enrolled & approved students */}
          {isApproved && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotifDrawerOpen(!isNotifDrawerOpen)}
                title="Notifications"
                className={`p-2 rounded-xl text-slate-700 hover:bg-purple-50 active:scale-95 transition-all relative cursor-pointer ${
                  hasNewAlertAnimation ? "animate-bounce" : ""
                }`}
              >
                <Bell className="w-4 h-4 text-purple-700" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white font-black text-[9.5px] flex items-center justify-center shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {isApproved ? (
            <div className="flex items-center relative">
              <button
                type="button"
                onClick={() => setIsPortalMenuOpen(!isPortalMenuOpen)}
                title="Student Profile"
                className="w-8 h-8 rounded-xl bg-purple-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs hover:bg-purple-700 active:scale-95 transition-all cursor-pointer"
              >
                {avatarLetter}
              </button>

              {isPortalMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsPortalMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-10 w-64 bg-white rounded-2xl shadow-xl border border-purple-100 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-1.5">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-purple-50">
                      <span className="text-[10px] font-black uppercase tracking-wider text-purple-600">
                        Student Profile
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsPortalMenuOpen(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-purple-50/60 text-slate-800">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {avatarLetter}
                      </div>
                      <div className="overflow-hidden">
                        <span className="text-xs font-black text-slate-900 block leading-tight truncate">
                          {displayName}
                        </span>
                        <span className="text-[10px] text-purple-700 font-semibold truncate block">
                          {displayPhone}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-purple-50 space-y-1">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 p-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Clean Support Link for Unpaid / Unverified Users (No Avatar or Badge in Header) */
            <div className="flex items-center">
              <a
                href="https://wa.me/919846012345?text=Assalamu%20Alaikum%20Admin,%20I%20need%20help%20with%20Hanoon%20Academy."
                target="_blank"
                rel="noopener noreferrer"
                className="py-1 px-2.5 rounded-full text-[10.5px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-all cursor-pointer shadow-2xs inline-flex items-center gap-1"
                title="Need Help? Contact Admin on WhatsApp"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Help</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Notifications Drawer Modal - STRICTLY RESTRICTED TO ENROLLED STUDENTS */}
      {isApproved && isNotifDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-purple-100 max-w-sm w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Drawer Header */}
            <div className="p-4 border-b border-purple-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center">
                  <Bell className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Notifications
                  </h3>
                  <span className="text-[10px] text-slate-500 font-semibold block">
                    {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}` : "All caught up"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      markAllNotificationsAsRead();
                      setNotifications(getNotifications());
                    }}
                    className="text-[10px] font-bold text-purple-700 hover:text-purple-900 px-2 py-1 rounded-lg hover:bg-purple-100 transition-colors cursor-pointer"
                  >
                    Mark read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsNotifDrawerOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 cursor-pointer"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[60vh]">
              {notifications.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Bell className="w-8 h-8 text-purple-200 mx-auto" />
                  <p className="text-xs font-bold text-slate-500">No new notifications</p>
                </div>
              ) : (
                notifications.map((item) => {
                  const isLive = item.type === "CLASS_LIVE";

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        markNotificationAsRead(item.id);
                        setNotifications(getNotifications());
                      }}
                      className={`p-3 rounded-2xl border transition-all space-y-1.5 cursor-pointer ${
                        !item.isRead
                          ? isLive
                            ? "bg-rose-50/70 border-rose-300 ring-1 ring-rose-200"
                            : "bg-purple-50/50 border-purple-200"
                          : "bg-white border-purple-100/60 opacity-80"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5">
                          {isLive ? (
                            <Radio className="w-3.5 h-3.5 text-rose-600 animate-pulse shrink-0" />
                          ) : item.type === "CLASS_SCHEDULED" ? (
                            <Calendar className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          ) : item.type === "NOTES_UPLOADED" ? (
                            <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          ) : (
                            <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                          <h4 className="text-xs font-black text-slate-900 leading-snug">
                            {item.title}
                          </h4>
                        </div>
                        <span className="text-[9px] text-slate-400 shrink-0">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 leading-relaxed">
                        {item.message}
                      </p>

                      {/* Direct action buttons */}
                      {(item.meetingLink || item.pdfUrl) && (
                        <div className="pt-1.5 border-t border-purple-100/60 flex items-center gap-2 flex-wrap">
                          {item.meetingLink && (
                            <a
                              href={item.meetingLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-2xs"
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
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                            >
                              <span>Download PDF</span>
                              <Download className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
