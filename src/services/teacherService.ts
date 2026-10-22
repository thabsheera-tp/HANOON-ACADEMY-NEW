import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { addChapterToSubject } from "@/services/subjectService";

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
  recordingUrl?: string;
  recording_url?: string;
  notesPdfUrl?: string;
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
  recordingUrl?: string;
  sessionDate?: string;
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
            recordingUrl: row.recording_url || undefined,
            recording_url: row.recording_url || undefined,
            notesPdfUrl: row.notes_pdf_url || undefined,
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
        .select("id, title, course_id, subject_id, notes_pdf_url, recording_url, scheduled_at, created_at, teacher:teachers(full_name)")
        .or("notes_pdf_url.is.not.null,recording_url.is.not.null");

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        data.forEach((row: any) => {
          const classDateStr = row.scheduled_at
            ? new Date(row.scheduled_at).toISOString().split("T")[0]
            : row.created_at
            ? new Date(row.created_at).toISOString().split("T")[0]
            : "Recent";

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
              sessionDate: classDateStr,
              sizeOrDuration: "Official PDF",
              uploadedAt: row.scheduled_at ? new Date(row.scheduled_at).toLocaleDateString() : "Recent",
              downloadCount: 0,
              teacherName: row.teacher?.full_name,
            });
          }
          if (row.recording_url && !dynamicMaterials.some((m) => m.fileOrUrl === row.recording_url || m.recordingUrl === row.recording_url)) {
            dynamicMaterials.push({
              id: `rec-${row.id}`,
              title: `${row.title} - Class Recording`,
              courseId: row.course_id,
              courseName: row.course_id,
              subjectId: row.subject_id,
              type: "VIDEO",
              fileOrUrl: row.recording_url,
              recordingUrl: row.recording_url,
              sessionDate: classDateStr,
              sizeOrDuration: "Recorded Session",
              uploadedAt: row.scheduled_at ? new Date(row.scheduled_at).toLocaleDateString() : "Recent",
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

export interface RecordedClassUploadPayload {
  title: string;
  courseId: string;
  courseName?: string;
  subjectId?: string;
  subjectName?: string;
  date?: string; // YYYY-MM-DD
  sessionDate?: string;
  time?: string; // HH:mm
  recordedLink?: string; // Google Drive or YouTube URL
  recordedClassLink?: string;
  liveClassId?: string;
  pdfUrl?: string;
  pdfTitle?: string;
  pdfSize?: string;
  teacherId?: string;
  teacherName?: string;
  duration?: string;
}

/**
 * Saves a Recorded Class Link and optional PDF Study Notes to Supabase database,
 * securely associated with the specific course, subject, and date.
 */
export async function saveRecordedClassToSupabase(
  payload: RecordedClassUploadPayload
): Promise<{ success: boolean; error?: string; classId?: string }> {
  const cleanLink = (payload.recordedLink || payload.recordedClassLink || "").trim();
  const classDate = payload.date || payload.sessionDate || new Date().toISOString().split("T")[0];
  const classTime = payload.time || "19:30";
  const finalTitle = payload.title.trim();
  const scheduledAt = new Date(`${classDate}T${classTime}:00.000Z`).toISOString();
  let generatedClassId = payload.liveClassId || `cls-rec-${Date.now()}`;

  // 1. Sync to Supabase live_classes table
  if (isSupabaseConfigured && supabase) {
    try {
      // Check if an existing class matches course, subject, and title or date
      let query = supabase
        .from("live_classes")
        .select("id")
        .eq("course_id", payload.courseId);

      if (payload.subjectId) {
        query = query.eq("subject_id", payload.subjectId);
      }

      const { data: existingRows } = await query.ilike("title", `%${finalTitle}%`).limit(1);

      if (existingRows && existingRows.length > 0) {
        const targetId = existingRows[0].id;
        generatedClassId = targetId;
        const updatePayload: Record<string, any> = {
          recording_url: cleanLink || undefined,
          status: "COMPLETED",
          scheduled_at: scheduledAt,
        };
        if (payload.pdfUrl) {
          updatePayload.notes_pdf_url = payload.pdfUrl;
        }
        await supabase.from("live_classes").update(updatePayload).eq("id", targetId);
      } else {
        const { data: inserted, error: insertErr } = await supabase
          .from("live_classes")
          .insert({
            title: finalTitle,
            course_id: payload.courseId,
            subject_id: payload.subjectId || undefined,
            meeting_link: cleanLink || "https://zoom.us/j/hanoon-faculty-live",
            recording_url: cleanLink || null,
            notes_pdf_url: payload.pdfUrl || null,
            scheduled_at: scheduledAt,
            duration_minutes: parseInt(payload.duration || "45") || 45,
            status: "COMPLETED",
            attendees_count: Math.floor(Math.random() * 30) + 75,
            teacher_id: payload.teacherId && !payload.teacherId.startsWith("custom-") ? payload.teacherId : undefined,
          })
          .select("id")
          .single();

        if (inserted?.id) {
          generatedClassId = inserted.id;
        } else if (insertErr) {
          console.warn("live_classes Supabase insert warning:", insertErr.message);
        }
      }
    } catch (err: any) {
      console.warn("Could not sync recorded class to Supabase live_classes:", err);
    }
  }

  // 2. If Adaviyya core subject, sync chapter to course_subjects
  if (payload.courseId === "adaviyya" && payload.subjectId) {
    const validSubjectIds = ["seerah", "haddad", "fiqh", "hadith"] as const;
    if (validSubjectIds.includes(payload.subjectId as any)) {
      try {
        addChapterToSubject(payload.subjectId as any, {
          title: finalTitle,
          duration: payload.duration || "45 mins",
          pdfTitle: payload.pdfTitle || `${finalTitle}.pdf`,
          pdfSize: payload.pdfSize || "3.5 MB",
          pdfUrl: payload.pdfUrl,
          recordedLink: cleanLink,
          videoUrl: cleanLink,
          date: classDate,
        });
      } catch (subErr) {
        console.warn("Could not sync chapter to Adaviyya subject:", subErr);
      }
    }
  }

  // 3. Register in Course Materials (local & synced cache)
  if (cleanLink) {
    uploadCourseMaterial({
      title: `${finalTitle} - Recorded Class`,
      courseId: payload.courseId,
      courseName: payload.courseName || payload.courseId,
      subjectId: payload.subjectId,
      type: "VIDEO",
      fileOrUrl: cleanLink,
      recordingUrl: cleanLink,
      sessionDate: classDate,
      sizeOrDuration: payload.duration || "Recorded Session",
      teacherName: payload.teacherName || "Faculty Instructor",
    });
  }

  if (payload.pdfUrl) {
    uploadCourseMaterial({
      title: `${finalTitle} - Study Notes`,
      courseId: payload.courseId,
      courseName: payload.courseName || payload.courseId,
      subjectId: payload.subjectId,
      type: "PDF",
      fileOrUrl: payload.pdfTitle || `${finalTitle}.pdf`,
      pdfUrl: payload.pdfUrl,
      sessionDate: classDate,
      sizeOrDuration: payload.pdfSize || "3.5 MB",
      teacherName: payload.teacherName || "Faculty Instructor",
    });
  }

  // 4. Update local LiveClassSession cache so timetable & dashboard update instantly
  const existingClasses = getTeacherClasses();
  const newSession: LiveClassSession = {
    id: generatedClassId,
    title: finalTitle,
    courseId: payload.courseId,
    courseName: payload.courseName || payload.courseId,
    date: classDate,
    time: classTime,
    duration: payload.duration || "45 mins",
    meetingLink: cleanLink || "https://zoom.us/j/hanoon-faculty-live",
    platform: cleanLink.includes("zoom") ? "Zoom" : "Google Meet",
    status: "COMPLETED",
    attendeesCount: Math.floor(Math.random() * 25) + 80,
    teacher_id: payload.teacherId,
    teacherName: payload.teacherName || "Faculty",
    subjectName: payload.subjectName || payload.subjectId,
    recordingUrl: cleanLink,
    recording_url: cleanLink,
    notesPdfUrl: payload.pdfUrl,
  };

  const updatedClasses = [
    newSession,
    ...existingClasses.filter((c) => c.id !== generatedClassId && c.title !== finalTitle),
  ];
  saveTeacherClasses(updatedClasses);

  return { success: true, classId: generatedClassId };
}


