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

const DUMMY_ANNOUNCEMENT_IDS = new Set(["ann-init-1", "ann-init-2", "ann-init-3"]);

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

/**
 * Retrieves all announcements from local storage or defaults.
 */
export function getAnnouncements(): Announcement[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ANNOUNCEMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((a: any) => a && !DUMMY_ANNOUNCEMENT_IDS.has(a.id));
      }
    }
  } catch (e) {
    console.warn("Failed to load announcements from storage:", e);
  }
  return [];
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
