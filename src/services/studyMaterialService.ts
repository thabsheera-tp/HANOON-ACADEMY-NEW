import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export interface StudyMaterial {
  id: string;
  title: string;
  course: string;
  subject?: string | null;
  file_url: string;
  type: "pdf" | "link";
  uploaded_by?: string | null;
  created_at?: string;
}

const LOCAL_STORAGE_KEY = "hanoon_study_materials";

/**
 * Reads locally cached study materials
 */
export function getLocalStudyMaterials(): StudyMaterial[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn("Error reading local study materials:", err);
  }
  return [];
}

/**
 * Saves study materials to local cache
 */
export function saveLocalStudyMaterials(items: StudyMaterial[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(
      new CustomEvent("hanoon_study_materials_updated", { detail: items })
    );
  } catch (err) {
    console.warn("Error saving local study materials:", err);
  }
}

/**
 * Normalizes course identifier for comparison
 */
export function normalizeCourseName(course: string): string {
  const c = (course || "").trim().toLowerCase();
  if (c.includes("adaviyya") || c.includes("athaviy") || c.includes("adavia")) return "adaviyya";
  if (c.includes("tuition") || c.includes("home")) return "home-tuition";
  if (c.includes("fashion")) return "fashion-designing";
  if (c.includes("hifz")) return "hifz-revision";
  if (c.includes("tajweed")) return "tajweed-foundation";
  if (c.includes("special")) return "special";
  return c;
}

/**
 * Fetch ALL study materials ordered by created_at DESC (no limits, no user filters).
 * Uses API endpoint with no-store caching, falling back to direct Supabase query.
 */
export async function fetchAllStudyMaterials(courseFilter?: string): Promise<StudyMaterial[]> {
  let list: StudyMaterial[] = [];

  // 1. Try server-side API route (bypasses RLS with service role and enforces cache: no-store)
  try {
    const url = courseFilter
      ? `/api/study-materials?course=${encodeURIComponent(courseFilter)}`
      : `/api/study-materials`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    });

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) {
        list = json.data;
      }
    }
  } catch (err) {
    console.warn("API fetch study materials warning:", err);
  }

  // 2. Direct Supabase client fallback if API failed or returned empty
  if (list.length === 0 && isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from("study_materials")
        .select("*")
        .order("created_at", { ascending: false });

      if (courseFilter && courseFilter !== "all" && courseFilter !== "ALL") {
        query = query.or(`course.ilike.%${courseFilter}%,course.eq.all,course.eq.ALL`);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        list = data.map((row: any) => ({
          id: String(row.id),
          title: row.title || "Untitled Document",
          course: row.course || "All Courses",
          subject: row.subject || null,
          file_url: row.file_url || "",
          type: (row.type || "pdf").toLowerCase() === "link" ? "link" : "pdf",
          uploaded_by: row.uploaded_by || null,
          created_at: row.created_at || new Date().toISOString(),
        }));
      } else if (error) {
        console.warn("Direct Supabase query error for study_materials:", error.message);
      }
    } catch (err) {
      console.warn("Direct Supabase query exception:", err);
    }
  }

  // 3. Fallback to local storage if remote completely failed
  if (list.length === 0) {
    const local = getLocalStudyMaterials();
    if (courseFilter && courseFilter !== "all" && courseFilter !== "ALL") {
      const targetNorm = normalizeCourseName(courseFilter);
      list = local.filter((m) => {
        const itemNorm = normalizeCourseName(m.course);
        return itemNorm === targetNorm || m.course === "all" || m.course === "ALL";
      });
    } else {
      list = local;
    }
  } else {
    // Sync local storage with fetched data
    saveLocalStudyMaterials(list);
  }

  return list;
}

/**
 * Creates a study material record strictly in public.study_materials.
 * Wraps in strict try/catch and stops infinite loading immediately.
 */
export async function createStudyMaterial(payload: {
  title: string;
  course: string;
  subject?: string | null;
  file_url: string;
  type: "pdf" | "link";
  uploaded_by?: string | null;
}): Promise<{ success: boolean; data?: StudyMaterial; error?: string }> {
  const cleanPayload = {
    title: payload.title.trim(),
    course: payload.course.trim(),
    subject: payload.subject ? payload.subject.trim() : null,
    file_url: payload.file_url.trim(),
    type: payload.type,
    uploaded_by: payload.uploaded_by ? payload.uploaded_by.trim() : null,
  };

  if (!cleanPayload.title) {
    return { success: false, error: "Title is required for study materials." };
  }
  if (!cleanPayload.file_url) {
    return { success: false, error: "A valid file URL or Google Drive link is required." };
  }

  // 1. Try server-side API route first (handles service role insert)
  try {
    const res = await fetch("/api/study-materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleanPayload),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const newRecord: StudyMaterial = json.data;
        const currentLocal = getLocalStudyMaterials();
        saveLocalStudyMaterials([newRecord, ...currentLocal.filter((m) => m.id !== newRecord.id)]);
        return { success: true, data: newRecord };
      }
    } else {
      const errJson = await res.json().catch(() => ({}));
      if (errJson.error) {
        // Fall through to try direct Supabase
        console.warn("API route insert error:", errJson.error);
      }
    }
  } catch (err: any) {
    console.warn("API route insert exception:", err);
  }

  // 2. Direct Supabase Client Insert with strict try/catch
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("study_materials")
        .insert([cleanPayload])
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Supabase Database Error: ${error.message} (Code: ${error.code || "UNKNOWN"})`,
        };
      }

      if (data) {
        const newRecord: StudyMaterial = {
          id: String(data.id),
          title: data.title,
          course: data.course,
          subject: data.subject,
          file_url: data.file_url,
          type: data.type === "link" ? "link" : "pdf",
          uploaded_by: data.uploaded_by,
          created_at: data.created_at,
        };
        const currentLocal = getLocalStudyMaterials();
        saveLocalStudyMaterials([newRecord, ...currentLocal.filter((m) => m.id !== newRecord.id)]);
        return { success: true, data: newRecord };
      }
    } catch (err: any) {
      return {
        success: false,
        error: `Database Insert Exception: ${err?.message || "Failed to save study material"}`,
      };
    }
  }

  // 3. Fallback: Save locally if offline or client unconfigured
  const fallbackRecord: StudyMaterial = {
    id: `local-mat-${Date.now()}`,
    ...cleanPayload,
    created_at: new Date().toISOString(),
  };
  const currentLocal = getLocalStudyMaterials();
  saveLocalStudyMaterials([fallbackRecord, ...currentLocal]);

  return { success: true, data: fallbackRecord };
}

/**
 * Deletes a study material from public.study_materials.
 */
export async function deleteStudyMaterial(id: string): Promise<{ success: boolean; error?: string }> {
  if (!id) return { success: false, error: "Invalid material ID" };

  // Remove locally
  const currentLocal = getLocalStudyMaterials();
  saveLocalStudyMaterials(currentLocal.filter((m) => m.id !== id));

  // 1. Try API delete
  try {
    const res = await fetch(`/api/study-materials?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (res.ok) {
      return { success: true };
    }
  } catch (err) {
    console.warn("API delete warning:", err);
  }

  // 2. Try Supabase direct delete
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from("study_materials")
        .delete()
        .eq("id", id);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || "Delete failed" };
    }
  }

  return { success: true };
}
