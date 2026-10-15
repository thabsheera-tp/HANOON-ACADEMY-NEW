import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export interface SpecialClass {
  id: string;
  title: string;
  subtitle: string;
  instructor: string;
  category: "Recitation" | "Gathering" | "Workshop" | "Masterclass";
  badgeGradient: string;
  iconType: "mic" | "sparkles" | "book" | "music" | "video";
  scheduleTime: string;
  status: "UPCOMING" | "LIVE_NOW" | "COMPLETED";
  liveUrl: string;
  description: string;
  recordingDuration?: string;
  recordingUrl?: string;
  pdfTitle?: string;
  pdfSize?: string;
  registeredCount?: number;
}

// Purged: No hardcoded demo video links or scheduled class placeholders
export const DEFAULT_SPECIAL_CLASSES: SpecialClass[] = [];

const LOCAL_STORAGE_KEY = "hanoon_special_classes_v2";

export function getSpecialClasses(): SpecialClass[] {
  if (typeof window === "undefined") return DEFAULT_SPECIAL_CLASSES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load special classes from localStorage:", e);
  }
  return DEFAULT_SPECIAL_CLASSES;
}

export function saveSpecialClasses(classes: SpecialClass[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(classes));
    window.dispatchEvent(new CustomEvent("hanoon_special_classes_updated", { detail: classes }));
  } catch (e) {
    console.error("Failed to save special classes:", e);
  }
}

/**
 * Dynamically fetches special classes from Supabase `special_classes` table.
 */
export async function fetchSpecialClassesFromSupabase(): Promise<SpecialClass[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("special_classes")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        const mapped: SpecialClass[] = data.map((row: any) => ({
          id: row.id,
          title: row.title,
          subtitle: row.subtitle || "",
          instructor: row.instructor,
          category: (row.category as any) || "Gathering",
          badgeGradient: "bg-gradient-to-tr from-rose-500 via-pink-600 to-amber-500 text-white shadow-lg",
          iconType: "sparkles",
          scheduleTime: row.schedule_time,
          status: (row.status || "UPCOMING") as "UPCOMING" | "LIVE_NOW" | "COMPLETED",
          liveUrl: row.live_url || "",
          description: row.description || "",
          recordingDuration: row.recording_url ? "Recorded" : undefined,
          recordingUrl: row.recording_url || undefined,
          pdfTitle: row.pdf_title || undefined,
          pdfSize: row.pdf_size || undefined,
          registeredCount: row.registered_count || 0,
        }));
        saveSpecialClasses(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn("Supabase fetchSpecialClasses error:", err);
    }
  }
  return getSpecialClasses();
}

export function addSpecialClass(item: Omit<SpecialClass, "id">): SpecialClass {
  const current = getSpecialClasses();
  const newClass: SpecialClass = {
    ...item,
    id: `spc-${Date.now()}`,
  };
  const updated = [newClass, ...current];
  saveSpecialClasses(updated);

  if (isSupabaseConfigured && supabase) {
    try {
      Promise.resolve(
        supabase.from("special_classes").insert({
          id: newClass.id,
          title: newClass.title,
          subtitle: newClass.subtitle,
          instructor: newClass.instructor,
          category: newClass.category,
          schedule_time: newClass.scheduleTime,
          status: newClass.status,
          live_url: newClass.liveUrl,
          description: newClass.description,
          recording_url: newClass.recordingUrl,
          pdf_title: newClass.pdfTitle,
          pdf_size: newClass.pdfSize,
          registered_count: newClass.registeredCount || 0,
        })
      ).catch(() => {});
    } catch {}
  }

  return newClass;
}


export function updateSpecialClass(id: string, updates: Partial<SpecialClass>): void {
  const current = getSpecialClasses();
  const updated = current.map((c) => (c.id === id ? { ...c, ...updates } : c));
  saveSpecialClasses(updated);
}

export function deleteSpecialClass(id: string): void {
  const current = getSpecialClasses();
  const updated = current.filter((c) => c.id !== id);
  saveSpecialClasses(updated);
}
