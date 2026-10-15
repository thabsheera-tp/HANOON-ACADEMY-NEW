import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export interface LiveClassSession {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  date: string;
  time: string;
  duration: string;
  meetingLink: string;
  platform: "Zoom" | "Google Meet";
  status: "SCHEDULED" | "LIVE_NOW" | "COMPLETED";
  attendeesCount: number;
  teacher_id?: string;
  teacherName?: string;
  isSpecialClass?: boolean;
  specialClassTitle?: string;
  isCustomCourse?: boolean;
  subjectName?: string;
}

export interface CourseMaterial {
  id: string;
  title: string;
  courseId: string;
  courseName: string;
  subjectId?: string;
  type: "PDF" | "VIDEO";
  fileOrUrl: string;
  pdfUrl?: string;
  sizeOrDuration: string;
  uploadedAt: string;
  downloadCount: number;
  teacher_id?: string;
  teacherName?: string;
}

export interface TeacherStudentItem {
  id: string;
  fullName: string;
  whatsappNum: string;
  district: string;
  courseName: string;
  progressPercent: number;
  attendanceRate: number;
  lastActive: string;
  status: "Excelling" | "Active" | "Needs Attention";
}

const STORAGE_KEY_CLASSES = "hanoon_teacher_classes_v1";
const STORAGE_KEY_MATERIALS = "hanoon_teacher_materials_v1";
const STORAGE_KEY_LIVE_BROADCAST = "hanoon_live_broadcast_state";

export const DEFAULT_CLASSES: LiveClassSession[] = [];
export const DEFAULT_MATERIALS: CourseMaterial[] = [];
export const DEFAULT_STUDENTS: TeacherStudentItem[] = [];

const DUMMY_CLASS_IDS = new Set(["cls-01", "cls-02", "cls-03"]);
const DUMMY_MATERIAL_IDS = new Set(["mat-01", "mat-02", "mat-03", "mat-04"]);

// Helper functions for classes
export function getTeacherClasses(): LiveClassSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLASSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((c: any) => !DUMMY_CLASS_IDS.has(c.id));
      }
    }
  } catch (e) {
    console.warn("Failed reading teacher classes:", e);
  }
  return [];
}

export function saveTeacherClasses(classes: LiveClassSession[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_CLASSES, JSON.stringify(classes));
    window.dispatchEvent(
      new CustomEvent("hanoon_classes_updated", { detail: classes })
    );
  } catch (e) {
    console.error("Failed saving teacher classes:", e);
  }
}

/**
 * Dynamically fetches live classes from Supabase `live_classes` table.
 * Falls back to local storage and updates local cache.
 */
export async function fetchLiveClassesFromSupabase(courseId?: string): Promise<LiveClassSession[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from("live_classes")
        .select("*, teacher:teachers(id, full_name)")
        .order("scheduled_at", { ascending: true });

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const mapped: LiveClassSession[] = data.map((row: any) => {
          let dateStr = "";
          let timeStr = "";
          if (row.scheduled_at) {
            try {
              const d = new Date(row.scheduled_at);
              dateStr = d.toISOString().split("T")[0];
              timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
            } catch {}
          }
          return {
            id: row.id,
            title: row.title,
            courseId: row.course_id,
            courseName: row.course_id,
            date: dateStr,
            time: timeStr,
            duration: `${row.duration_minutes || 60} mins`,
            meetingLink: row.meeting_link || "",
            platform: (row.meeting_link?.toLowerCase().includes("zoom") ? "Zoom" : "Google Meet") as "Zoom" | "Google Meet",
            status: (row.status || "SCHEDULED") as "SCHEDULED" | "LIVE_NOW" | "COMPLETED",
            attendeesCount: row.attendees_count || 0,
            teacher_id: row.teacher_id,
            teacherName: row.teacher?.full_name || row.teacher_name,
            subjectName: row.subject_id,
          };
        });
        saveTeacherClasses(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn("Supabase fetchLiveClasses fallback to local:", err);
    }
  }

  // Fallback to local storage (strictly real scheduled classes, no dummy placeholders)
  const local = getTeacherClasses();
  if (courseId) {
    return local.filter((c) => (c.courseId || "").toLowerCase() === courseId.toLowerCase());
  }
  return local;
}

export function scheduleNewClass(data: Omit<LiveClassSession, "id" | "status" | "attendeesCount">): LiveClassSession {
  const newClass: LiveClassSession = {
    ...data,
    id: `cls-${Date.now()}`,
    status: "SCHEDULED",
    attendeesCount: Math.floor(Math.random() * 50) + 80,
  };
  const current = getTeacherClasses();
  const updated = [newClass, ...current];
  saveTeacherClasses(updated);

  // Sync to Supabase live_classes if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const scheduledAt = data.date && data.time
        ? new Date(`${data.date}T${data.time}`).toISOString()
        : new Date().toISOString();

      Promise.resolve(
        supabase.from("live_classes").insert({
          title: data.title,
          course_id: data.courseId,
          subject_id: data.subjectName || undefined,
          meeting_link: data.meetingLink,
          scheduled_at: scheduledAt,
          duration_minutes: parseInt(data.duration) || 60,
          status: "SCHEDULED",
          attendees_count: newClass.attendeesCount,
          teacher_id: data.teacher_id && !data.teacher_id.startsWith("custom-") ? data.teacher_id : undefined,
        })
      ).catch((e) => console.warn("Live class Supabase insert error:", e));
    } catch (e) {
      console.warn("Could not sync scheduled class to Supabase:", e);
    }
  }

  return newClass;
}

export function startLiveBroadcast(classId: string): LiveClassSession | null {
  const current = getTeacherClasses();
  const target = current.find((c) => c.id === classId);
  if (!target) return null;

  const updated = current.map((c) =>
    c.id === classId ? { ...c, status: "LIVE_NOW" as const } : c
  );
  saveTeacherClasses(updated);

  // Sync to Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      Promise.resolve(
        supabase.from("live_classes").update({ status: "LIVE_NOW" }).eq("id", classId)
      ).catch(() => {});
    } catch {}
  }

  // Store active broadcast flag in localStorage for students
  if (typeof window !== "undefined") {
    const broadcastInfo = {
      isLive: true,
      classId: target.id,
      title: target.title,
      courseName: target.courseName,
      meetingLink: target.meetingLink,
      startedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_LIVE_BROADCAST, JSON.stringify(broadcastInfo));
    window.dispatchEvent(
      new CustomEvent("hanoon_live_broadcast_started", { detail: broadcastInfo })
    );
  }

  return { ...target, status: "LIVE_NOW" };
}

export function stopLiveBroadcast(classId: string): void {
  const current = getTeacherClasses();
  const updated = current.map((c) =>
    c.id === classId ? { ...c, status: "COMPLETED" as const } : c
  );
  saveTeacherClasses(updated);

  // Sync to Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      Promise.resolve(
        supabase.from("live_classes").update({ status: "COMPLETED" }).eq("id", classId)
      ).catch(() => {});
    } catch {}
  }

  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY_LIVE_BROADCAST);
    window.dispatchEvent(
      new CustomEvent("hanoon_live_broadcast_ended", { detail: { classId } })
    );
  }
}

// Materials functions
export function getCourseMaterials(): CourseMaterial[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MATERIALS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((m: any) => !DUMMY_MATERIAL_IDS.has(m.id));
      }
    }
  } catch (e) {
    console.warn("Failed reading course materials:", e);
  }
  return [];
}

export function saveCourseMaterials(materials: CourseMaterial[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_MATERIALS, JSON.stringify(materials));
    window.dispatchEvent(
      new CustomEvent("hanoon_material_uploaded", { detail: materials })
    );
  } catch (e) {
    console.error("Failed saving course materials:", e);
  }
}

/**
 * Dynamically fetches materials from Supabase (including notes_pdf_url and recording_url from live_classes).
 */
export async function fetchCourseMaterialsFromSupabase(courseId?: string): Promise<CourseMaterial[]> {
  const localMaterials = getCourseMaterials();
  const dynamicMaterials: CourseMaterial[] = [...localMaterials];

  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from("live_classes")
        .select("id, title, course_id, subject_id, notes_pdf_url, recording_url, created_at, teacher:teachers(full_name)")
        .or("notes_pdf_url.is.not.null,recording_url.is.not.null");

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        data.forEach((row: any) => {
          if (row.notes_pdf_url && !dynamicMaterials.some((m) => m.fileOrUrl === row.notes_pdf_url)) {
            dynamicMaterials.push({
              id: `pdf-${row.id}`,
              title: `${row.title} - Study Notes`,
              courseId: row.course_id,
              courseName: row.course_id,
              subjectId: row.subject_id,
              type: "PDF",
              fileOrUrl: row.notes_pdf_url,
              pdfUrl: row.notes_pdf_url,
              sizeOrDuration: "Official PDF",
              uploadedAt: row.created_at ? new Date(row.created_at).toLocaleDateString() : "Recent",
              downloadCount: 0,
              teacherName: row.teacher?.full_name,
            });
          }
          if (row.recording_url && !dynamicMaterials.some((m) => m.fileOrUrl === row.recording_url)) {
            dynamicMaterials.push({
              id: `rec-${row.id}`,
              title: `${row.title} - Class Recording`,
              courseId: row.course_id,
              courseName: row.course_id,
              subjectId: row.subject_id,
              type: "VIDEO",
              fileOrUrl: row.recording_url,
              sizeOrDuration: "Recorded Session",
              uploadedAt: row.created_at ? new Date(row.created_at).toLocaleDateString() : "Recent",
              downloadCount: 0,
              teacherName: row.teacher?.full_name,
            });
          }
        });
      }
    } catch (err) {
      console.warn("Supabase fetchCourseMaterials error:", err);
    }
  }

  if (courseId) {
    return dynamicMaterials.filter((m) => (m.courseId || "").toLowerCase() === courseId.toLowerCase());
  }
  return dynamicMaterials;
}

export function uploadCourseMaterial(
  material: Omit<CourseMaterial, "id" | "uploadedAt" | "downloadCount">
): CourseMaterial {
  const newMaterial: CourseMaterial = {
    ...material,
    id: `mat-${Date.now()}`,
    uploadedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    downloadCount: 0,
  };
  const current = getCourseMaterials();
  const updated = [newMaterial, ...current];
  saveCourseMaterials(updated);
  return newMaterial;
}

export function deleteCourseMaterial(id: string): void {
  const current = getCourseMaterials();
  const updated = current.filter((m) => m.id !== id);
  saveCourseMaterials(updated);
}

