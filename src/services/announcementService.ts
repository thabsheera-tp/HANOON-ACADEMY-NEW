import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { createNotification } from "@/services/notificationService";

export type AnnouncementCategory =
  | "HOLIDAY"
  | "EXAM"
  | "CIRCULAR"
  | "URGENT"
  | "GENERAL"
  | "EVENT";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  isPinned: boolean;
  targetCourseId: string; // "ALL" or specific course ID
  targetCourseName?: string;
  authorName: string;
  authorRole: string;
  createdAt: string;
  expiresAt?: string;
  actionLink?: string;
  actionLabel?: string;
}

const STORAGE_KEY_ANNOUNCEMENTS = "hanoon_academy_announcements_v1";

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-init-1",
    title: "🌴 Holiday Tomorrow - Special Milad Observance",
    content:
      "All regular curriculum live lectures will remain suspended tomorrow in observance of Milad-un-Nabi. Evening Special Burdah Majlis will convene at 8:00 PM IST via Google Meet.",
    category: "HOLIDAY",
    isPinned: true,
    targetCourseId: "ALL",
    authorName: "Office of the Principal",
    authorRole: "Administration",
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(), // 3 hours ago
    actionLabel: "View Burdah Hub",
    actionLink: "#special-class",
  },
  {
    id: "ann-init-2",
    title: "📝 Mid-Term Exam Next Week - Syllabus & Timetable",
    content:
      "Semester evaluations for Adaviyya Stream (Hadith & Fiqh modules) will commence next Wednesday. Please review uploaded PDF chapters and attend revision sessions.",
    category: "EXAM",
    isPinned: true,
    targetCourseId: "adaviyya",
    targetCourseName: "Adaviyya (Women Sharia)",
    authorName: "Academic Council",
    authorRole: "Examination Cell",
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(), // 18 hours ago
    actionLabel: "Study Materials",
    actionLink: "#materials",
  },
  {
    id: "ann-init-3",
    title: "📢 Chapter 3 PDF Notes Available for Download",
    content:
      "Usthad Dr. Faisal has uploaded the comprehensive explanation notes for Umdat al-Ahkam (Kitab at-Taharah). Download the PDF directly from your subject classroom hub.",
    category: "CIRCULAR",
    isPinned: false,
    targetCourseId: "adaviyya",
    targetCourseName: "Adaviyya",
    authorName: "Usthad Dr. Faisal Al-Hanoon",
    authorRole: "Lead Faculty",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
  },
];

/**
 * Retrieves all announcements from local storage or defaults.
 */
export function getAnnouncements(): Announcement[] {
  if (typeof window === "undefined") return INITIAL_ANNOUNCEMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ANNOUNCEMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load announcements from storage:", e);
  }
  return INITIAL_ANNOUNCEMENTS;
}

/**
 * Persists announcements to storage and emits custom events for real-time reactivity.
 */
export function saveAnnouncements(announcements: Announcement[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(announcements));
    window.dispatchEvent(
      new CustomEvent("hanoon_announcements_updated", { detail: announcements })
    );
  } catch (e) {
    console.error("Failed to save announcements:", e);
  }
}

/**
 * Creates and publishes a new announcement.
 * Automatically triggers in-app and push notification alerts to students!
 */
export function createAnnouncement(
  data: Omit<Announcement, "id" | "createdAt">
): Announcement {
  const newAnnouncement: Announcement = {
    ...data,
    id: `ann-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    createdAt: new Date().toISOString(),
  };

  const current = getAnnouncements();
  // If pinned, put right after existing pinned items or top
  const updated = [newAnnouncement, ...current];
  saveAnnouncements(updated);

  // Trigger automated notification so Notification Bell rings on student screens!
  const prefix =
    data.category === "HOLIDAY"
      ? "🌴 Holiday Alert: "
      : data.category === "EXAM"
      ? "📝 Exam Notice: "
      : data.category === "URGENT"
      ? "⚡ Urgent Announcement: "
      : "📢 Announcement: ";

  createNotification({
    title: `${prefix}${data.title}`,
    message: data.content,
    type: "BROADCAST",
    targetRole: "students",
    targetCourseId: data.targetCourseId !== "ALL" ? data.targetCourseId : undefined,
    targetCourseName: data.targetCourseName,
    senderName: `${data.authorName} (${data.authorRole})`,
    priority: data.category === "URGENT" ? "urgent" : data.isPinned ? "high" : "normal",
  });

  // Supabase audit logging
  if (isSupabaseConfigured && supabase) {
    try {
      Promise.resolve(
        supabase.from("audit_logs").insert({
          actor: data.authorName || "Admin Notice Board",
          action: "ANNOUNCEMENT_PUBLISHED",
          category: "SETTINGS",
          details: `[${data.category}] ${data.title}`,
        })
      ).catch(() => {});
    } catch {}
  }

  return newAnnouncement;
}

/**
 * Toggles the pinned status of an announcement.
 */
export function togglePinAnnouncement(id: string): void {
  const current = getAnnouncements();
  const updated = current.map((item) =>
    item.id === id ? { ...item, isPinned: !item.isPinned } : item
  );
  saveAnnouncements(updated);
}

/**
 * Deletes an announcement.
 */
export function deleteAnnouncement(id: string): void {
  const current = getAnnouncements();
  const updated = current.filter((item) => item.id !== id);
  saveAnnouncements(updated);
}

/**
 * Updates an announcement's content or fields.
 */
export function updateAnnouncement(
  id: string,
  partial: Partial<Omit<Announcement, "id" | "createdAt">>
): void {
  const current = getAnnouncements();
  const updated = current.map((item) =>
    item.id === id ? { ...item, ...partial } : item
  );
  saveAnnouncements(updated);
}
