import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export type NotificationType =
  | "CLASS_SCHEDULED"
  | "CLASS_LIVE"
  | "NOTES_UPLOADED"
  | "PAYMENT_APPROVED"
  | "PAYMENT_REJECTED"
  | "BROADCAST";

export type NotificationTargetRole = "all" | "students" | "teachers" | "staff";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  targetRole: NotificationTargetRole;
  targetCourseId?: string;
  targetCourseName?: string;
  meetingLink?: string;
  platform?: "Zoom" | "Google Meet";
  pdfUrl?: string;
  pdfTitle?: string;
  timestamp: string;
  isRead: boolean;
  senderName?: string;
  priority?: "normal" | "high" | "urgent";
}

const STORAGE_KEY_NOTIFICATIONS = "hanoon_app_notifications_v1";

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-init-1",
    title: "Welcome to Hanoon Academy",
    message: "Explore your course curriculum, join scheduled live classes, and access chapter study notes directly.",
    type: "BROADCAST",
    targetRole: "all",
    timestamp: new Date().toISOString(),
    isRead: false,
    senderName: "Administration",
    priority: "normal",
  },
];

/**
 * Helper to check if the current user session is an enrolled student or authorized staff/admin.
 * Un-enrolled visitors and students prior to enrollment are blocked from receiving notifications.
 */
export function isUserEnrolledOrStaff(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const isEnrolled = localStorage.getItem("hanoon_student_enrolled") === "true";
    const isAdmin = localStorage.getItem("hanoon_admin_authenticated") === "true";
    const role = localStorage.getItem("hanoon_portal_role");
    const isStaff = role === "admin" || role === "teacher" || role === "staff";
    return isEnrolled || isAdmin || isStaff;
  } catch {
    return false;
  }
}

/**
 * Retrieves all in-app notifications from local storage.
 * Restricted: Students cannot access notifications prior to complete enrollment.
 */
export function getNotifications(): AppNotification[] {
  if (typeof window === "undefined") return INITIAL_NOTIFICATIONS;

  // Strict restriction: Notifications are NOT available for students before enrolling
  if (!isUserEnrolledOrStaff()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to read notifications from localStorage:", e);
  }
  return INITIAL_NOTIFICATIONS;
}

/**
 * Persists notifications to local storage and dispatches browser custom event.
 */
export function saveNotifications(notifications: AppNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications));
    window.dispatchEvent(
      new CustomEvent("hanoon_notifications_updated", { detail: notifications })
    );
  } catch (e) {
    console.error("Failed to save notifications:", e);
  }
}

/**
 * Requests browser push notification permission if available.
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (e) {
    console.warn("Error requesting notification permission:", e);
    return "denied";
  }
}

/**
 * Sends a native browser push notification if permitted.
 */
export function triggerBrowserPush(title: string, options?: NotificationOptions): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  // Never fire browser push notifications for students before enrolling
  if (!isUserEnrolledOrStaff()) return false;
  try {
    if (Notification.permission === "granted") {
      new Notification(title, {
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        ...options,
      });
      return true;
    }
  } catch (e) {
    console.warn("Native browser push notification error:", e);
  }
  return false;
}

/**
 * Creates and broadcasts a new in-app and browser notification.
 */
export function createNotification(
  data: Omit<AppNotification, "id" | "timestamp" | "isRead">
): AppNotification {
  const newNotif: AppNotification = {
    ...data,
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    isRead: false,
  };

  const current = getNotifications();
  const updated = [newNotif, ...current].slice(0, 100); // Keep last 100
  saveNotifications(updated);

  // Dispatch real-time window event for instant audio/toast popups
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("hanoon_new_notification", { detail: newNotif })
    );

    // Also attempt native browser notification
    triggerBrowserPush(newNotif.title, {
      body: newNotif.message,
      tag: newNotif.id,
    });
  }

  // Attempt sync to Supabase if audit/notifications table exists
  if (isSupabaseConfigured && supabase) {
    try {
      Promise.resolve(
        supabase
          .from("audit_logs")
          .insert({
            actor: data.senderName || "Staff System",
            action: `NOTIFICATION_${data.type}`,
            category: "NOTIFICATION",
            details: `${data.title}: ${data.message}`,
          })
      ).catch(() => {});
    } catch {}
  }

  return newNotif;
}

/**
 * Marks a specific notification as read.
 */
export function markNotificationAsRead(id: string): void {
  const current = getNotifications();
  const updated = current.map((n) => (n.id === id ? { ...n, isRead: true } : n));
  saveNotifications(updated);
}

/**
 * Marks all notifications as read.
 */
export function markAllNotificationsAsRead(): void {
  const current = getNotifications();
  const updated = current.map((n) => ({ ...n, isRead: true }));
  saveNotifications(updated);
}

/**
 * Clears all notification history.
 */
export function clearNotifications(): void {
  saveNotifications([]);
}

/**
 * Trigger: When a class is scheduled by Staff.
 * Sends alerts to enrolled students AND assigned teachers.
 */
export function triggerClassScheduledNotification(params: {
  classTitle: string;
  courseName: string;
  courseId: string;
  date: string;
  time: string;
  meetingLink: string;
  platform: "Zoom" | "Google Meet";
  teacherName?: string;
  senderName?: string;
}): { studentNotif: AppNotification; teacherNotif: AppNotification } {
  const { classTitle, courseName, courseId, date, time, meetingLink, platform, teacherName, senderName } = params;

  // 1. Notification for Enrolled Students
  const studentNotif = createNotification({
    title: `📅 New Class Scheduled: ${courseName}`,
    message: `"${classTitle}" has been scheduled for ${date} at ${time}. Platform: ${platform}.${teacherName ? ` Faculty: ${teacherName}.` : ""}`,
    type: "CLASS_SCHEDULED",
    targetRole: "students",
    targetCourseId: courseId,
    targetCourseName: courseName,
    meetingLink,
    platform,
    senderName: senderName || "Staff Scheduler",
    priority: "normal",
  });

  // 2. Notification for Assigned Teacher
  const teacherNotif = createNotification({
    title: `👨‍🏫 Teaching Assignment: ${classTitle}`,
    message: `You are scheduled to conduct "${classTitle}" (${courseName}) on ${date} at ${time}. Meeting Link: ${meetingLink}`,
    type: "CLASS_SCHEDULED",
    targetRole: "teachers",
    targetCourseId: courseId,
    targetCourseName: courseName,
    meetingLink,
    platform,
    senderName: senderName || "Staff Scheduler",
    priority: "high",
  });

  return { studentNotif, teacherNotif };
}

/**
 * Trigger: When Staff or Teacher starts a live class broadcast.
 * Sends urgent live notification with 1-click meeting join link.
 */
export function triggerClassLiveNotification(params: {
  classTitle: string;
  courseName: string;
  courseId: string;
  meetingLink: string;
  platform: "Zoom" | "Google Meet";
  teacherName?: string;
  senderName?: string;
}): AppNotification {
  const { classTitle, courseName, courseId, meetingLink, platform, teacherName, senderName } = params;

  return createNotification({
    title: `🔴 LIVE NOW: ${courseName} Class In Session!`,
    message: `"${classTitle}" is currently streaming live${teacherName ? ` with ${teacherName}` : ""}. Click to join the ${platform} session immediately!`,
    type: "CLASS_LIVE",
    targetRole: "all",
    targetCourseId: courseId,
    targetCourseName: courseName,
    meetingLink,
    platform,
    senderName: senderName || "Staff Broadcaster",
    priority: "urgent",
  });
}

/**
 * Trigger: When Staff uploads chapter notes or study materials.
 * Sends alert to students with direct PDF attachment reference.
 */
export function triggerNotesUploadedNotification(params: {
  chapterTitle: string;
  courseName: string;
  courseId: string;
  subjectName?: string;
  pdfTitle: string;
  pdfSize?: string;
  pdfUrl?: string;
  senderName?: string;
}): AppNotification {
  const { chapterTitle, courseName, courseId, subjectName, pdfTitle, pdfSize, pdfUrl, senderName } = params;

  return createNotification({
    title: `📚 New PDF Notes Uploaded: ${subjectName || courseName}`,
    message: `"${chapterTitle}" study notes ("${pdfTitle}"${pdfSize ? ` • ${pdfSize}` : ""}) have been attached and are now available for reading and download.`,
    type: "NOTES_UPLOADED",
    targetRole: "students",
    targetCourseId: courseId,
    targetCourseName: courseName,
    pdfTitle,
    pdfUrl,
    senderName: senderName || "Staff Academic Coordinator",
    priority: "normal",
  });
}
