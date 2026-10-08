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
  type: "PDF" | "VIDEO";
  fileOrUrl: string;
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

export const DEFAULT_CLASSES: LiveClassSession[] = [
  {
    id: "cls-01",
    title: "Adaviyya: Prophetic Seerah & Tarbiyah Methodology",
    courseId: "adaviyya",
    courseName: "Adaviyya",
    date: "2026-10-06",
    time: "19:30",
    duration: "60 mins",
    meetingLink: "https://zoom.us/j/hanoon-faculty-live",
    platform: "Zoom",
    status: "SCHEDULED",
    attendeesCount: 142,
    teacher_id: "tch-01",
    teacherName: "Usthad Dr. Faisal Al-Hanoon",
  },
  {
    id: "cls-02",
    title: "Ash-Shama'il: Physical & Moral Attributes of the Beloved ﷺ",
    courseId: "shamail",
    courseName: "الشمائل المحمدية",
    date: "2026-10-07",
    time: "20:00",
    duration: "45 mins",
    meetingLink: "https://meet.google.com/hanoon-shamail",
    platform: "Google Meet",
    status: "SCHEDULED",
    attendeesCount: 96,
    teacher_id: "tch-04",
    teacherName: "Usthad Bilal Farooqi",
  },
  {
    id: "cls-03",
    title: "Tajweed Live: Makharij & Articulation Precision",
    courseId: "tajweed",
    courseName: "Tajweed Special Class",
    date: "2026-10-04",
    time: "08:00",
    duration: "55 mins",
    meetingLink: "https://zoom.us/j/hanoon-tajweed-live",
    platform: "Zoom",
    status: "COMPLETED",
    attendeesCount: 156,
    teacher_id: "tch-02",
    teacherName: "Usthad Abdul Rahman Al-Hafiz",
  },
];

export const DEFAULT_MATERIALS: CourseMaterial[] = [
  {
    id: "mat-01",
    title: "Seerah Chapter 1: Pre-Islamic Arabia & Prophetic Lineage (Handbook)",
    courseId: "adaviyya",
    courseName: "Adaviyya",
    type: "PDF",
    fileOrUrl: "/notes/seerah-chapter-1-notes.pdf",
    sizeOrDuration: "4.8 MB",
    uploadedAt: "Oct 2, 2026",
    downloadCount: 128,
    teacher_id: "tch-01",
    teacherName: "Usthad Dr. Faisal Al-Hanoon",
  },
  {
    id: "mat-02",
    title: "Live Lecture Recording: Taharah & Practical Fiqh Rulings",
    courseId: "adaviyya",
    courseName: "Adaviyya",
    type: "VIDEO",
    fileOrUrl: "https://youtube.com/watch?v=hanoon-fiqh-rec1",
    sizeOrDuration: "52 mins",
    uploadedAt: "Oct 1, 2026",
    downloadCount: 194,
    teacher_id: "tch-03",
    teacherName: "Usthad Anas Nadwi",
  },
  {
    id: "mat-03",
    title: "Ash-Shama'il: Chapter 2 Classical Arabic Text & Translation",
    courseId: "shamail",
    courseName: "الشمائل المحمدية",
    type: "PDF",
    fileOrUrl: "/notes/shamail-ch2-notes.pdf",
    sizeOrDuration: "6.2 MB",
    uploadedAt: "Sep 28, 2026",
    downloadCount: 84,
    teacher_id: "tch-04",
    teacherName: "Usthad Bilal Farooqi",
  },
  {
    id: "mat-04",
    title: "Fashion Designing: Islamic Modest Couture Pattern Drafting Video",
    courseId: "fashion",
    courseName: "Fashion Designing",
    type: "VIDEO",
    fileOrUrl: "https://youtube.com/watch?v=hanoon-fashion-01",
    sizeOrDuration: "48 mins",
    uploadedAt: "Sep 25, 2026",
    downloadCount: 72,
    teacher_id: "tch-04",
    teacherName: "Usthad Bilal Farooqi",
  },
];

// Purged: No hardcoded dummy students. Students are fetched dynamically from Supabase
export const DEFAULT_STUDENTS: TeacherStudentItem[] = [];

// Helper functions for classes
export function getTeacherClasses(): LiveClassSession[] {
  if (typeof window === "undefined") return DEFAULT_CLASSES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLASSES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Failed reading teacher classes:", e);
  }
  return DEFAULT_CLASSES;
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
  if (typeof window === "undefined") return DEFAULT_MATERIALS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MATERIALS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Failed reading course materials:", e);
  }
  return DEFAULT_MATERIALS;
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
