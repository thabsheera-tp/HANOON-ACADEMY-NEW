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

// Purged: No hardcoded dummy students. Students are fetched dynamically from Supabase
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
  } catch (e) {
    console.error("Failed saving teacher classes:", e);
  }
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
