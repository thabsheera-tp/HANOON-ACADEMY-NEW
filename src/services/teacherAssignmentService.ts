import { UserProfileRecord, isSuperAdminRole } from "@/services/authService";

export interface TeacherCourseAssignment {
  teacherId: string;
  teacherName: string;
  email: string;
  assignedCourseIds: string[];
  assignedCourseNames: string[];
  assignedSubjectIds: string[];
  assignedSubjectNames: string[];
}

export const DEFAULT_TEACHER_ASSIGNMENTS: TeacherCourseAssignment[] = [
  {
    teacherId: "tch-01",
    teacherName: "Usthad Dr. Faisal Al-Hanoon",
    email: "admin@hanoon.academy",
    assignedCourseIds: ["adaviyya", "athaviy", "burdah"],
    assignedCourseNames: ["Adaviyya", "Burdah Live Gathering", "Burdah Live"],
    assignedSubjectIds: ["seerah", "hadith"],
    assignedSubjectNames: ["Seerah", "Hadith"],
  },
  {
    teacherId: "tch-02",
    teacherName: "Usthad Abdul Rahman Al-Hafiz",
    email: "teacher@hanoon.academy",
    assignedCourseIds: ["tajweed", "home-tuition", "hometuition"],
    assignedCourseNames: ["Tajweed Special Class", "Home Tuition", "Ratib al-Haddad"],
    assignedSubjectIds: ["haddad"],
    assignedSubjectNames: ["Haddad"],
  },
  {
    teacherId: "tch-03",
    teacherName: "Usthad Anas Nadwi",
    email: "anas@hanoon.academy",
    assignedCourseIds: ["home-tuition", "hometuition"],
    assignedCourseNames: ["Home Tuition"],
    assignedSubjectIds: ["fiqh"],
    assignedSubjectNames: ["Fiqh"],
  },
  {
    teacherId: "tch-04",
    teacherName: "Usthad Bilal Farooqi",
    email: "bilal@hanoon.academy",
    assignedCourseIds: ["shamail-muhammadiyya", "shamail", "fashion-designing", "fashion"],
    assignedCourseNames: ["الشمائل المحمدية", "Fashion Designing"],
    assignedSubjectIds: ["hadith", "shamail"],
    assignedSubjectNames: ["Hadith", "Ash-Shama'il"],
  },
];

const STORAGE_KEY_ASSIGNMENTS = "hanoon_teacher_assignments_v2";

/**
 * Normalizes course ID strings for reliable comparisons
 */
export function normalizeCourseKey(idOrName: string): string {
  if (!idOrName) return "";
  const lower = idOrName.toLowerCase().trim();
  if (lower.includes("adaviyya") || lower.includes("athaviy") || lower.includes("seerah")) return "adaviyya";
  if (lower.includes("tuition")) return "home-tuition";
  if (lower.includes("fashion")) return "fashion-designing";
  if (lower.includes("shamail") || lower.includes("الشمائل")) return "shamail-muhammadiyya";
  if (lower.includes("tajweed")) return "tajweed";
  if (lower.includes("burdah")) return "burdah";
  if (lower.includes("haddad")) return "haddad";
  if (lower.includes("fiqh")) return "fiqh";
  return lower.replace(/[^a-z0-9]/g, "-");
}

/**
 * Loads all faculty course & subject assignments
 */
export function getTeacherAssignments(): TeacherCourseAssignment[] {
  if (typeof window === "undefined") return DEFAULT_TEACHER_ASSIGNMENTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ASSIGNMENTS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Could not read teacher assignments:", e);
  }
  return DEFAULT_TEACHER_ASSIGNMENTS;
}

/**
 * Saves updated teacher assignments (e.g. from Admin portal)
 */
export function saveTeacherAssignments(assignments: TeacherCourseAssignment[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_ASSIGNMENTS, JSON.stringify(assignments));
    window.dispatchEvent(new CustomEvent("hanoon_teacher_assignments_updated", { detail: assignments }));
  } catch (e) {
    console.error("Could not save teacher assignments:", e);
  }
}

/**
 * Resolves the faculty identifier from the user profile record
 */
export function resolveTeacherId(user: UserProfileRecord | null): string {
  if (!user) return "anonymous";
  if (user.role === "admin" || user.role === "super_admin") return "super_admin";

  const assignments = getTeacherAssignments();

  // 1. Direct ID match
  const byId = assignments.find((a) => a.teacherId === user.id);
  if (byId) return byId.teacherId;

  // 2. Email match
  if (user.email) {
    const byEmail = assignments.find((a) => a.email.toLowerCase() === user.email.toLowerCase());
    if (byEmail) return byEmail.teacherId;
  }

  // 3. Name match
  if (user.full_name) {
    const userCleanName = user.full_name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const byName = assignments.find((a) => {
      const aCleanName = a.teacherName.toLowerCase().replace(/[^a-z0-9]/g, "");
      return aCleanName.includes(userCleanName) || userCleanName.includes(aCleanName);
    });
    if (byName) return byName.teacherId;
  }

  // 4. Default faculty fallback
  return "tch-02";
}

/**
 * Returns the resolved assignment object for the current logged-in teacher
 */
export function getAssignmentForUser(user: UserProfileRecord | null): TeacherCourseAssignment | null {
  if (!user) return null;
  const teacherId = resolveTeacherId(user);
  if (teacherId === "super_admin") return null;

  const assignments = getTeacherAssignments();
  return assignments.find((a) => a.teacherId === teacherId) || assignments[1]; // default to Abdul Rahman
}

/**
 * RBAC Check: Check if user has access to a specific course/subject
 */
export function canTeacherAccessCourse(courseIdOrName: string, user: UserProfileRecord | null): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "super_admin") return true;

  const assignment = getAssignmentForUser(user);
  if (!assignment) return false;

  const normKey = normalizeCourseKey(courseIdOrName);

  const matchesCourseId = assignment.assignedCourseIds.some((id) => normalizeCourseKey(id) === normKey);
  const matchesCourseName = assignment.assignedCourseNames.some((name) => normalizeCourseKey(name) === normKey);
  const matchesSubjectId = assignment.assignedSubjectIds.some((id) => normalizeCourseKey(id) === normKey);
  const matchesSubjectName = assignment.assignedSubjectNames.some((name) => normalizeCourseKey(name) === normKey);

  return matchesCourseId || matchesCourseName || matchesSubjectId || matchesSubjectName;
}

/**
 * Filters live classes strictly for the current teacher (super_admin sees all)
 */
export function filterClassesByTeacher<T extends { teacher_id?: string; courseId: string; courseName: string }>(
  classes: T[],
  user: UserProfileRecord | null
): T[] {
  if (!user) return [];
  if (user.role === "admin" || user.role === "super_admin") return classes;

  const teacherId = resolveTeacherId(user);
  return classes.filter((cls) => {
    if (cls.teacher_id && cls.teacher_id === teacherId) return true;
    return canTeacherAccessCourse(cls.courseId, user) || canTeacherAccessCourse(cls.courseName, user);
  });
}

/**
 * Filters course materials strictly for the current teacher (super_admin sees all)
 */
export function filterMaterialsByTeacher<T extends { teacher_id?: string; courseId: string; courseName: string }>(
  materials: T[],
  user: UserProfileRecord | null
): T[] {
  if (!user) return [];
  if (user.role === "admin" || user.role === "super_admin") return materials;

  const teacherId = resolveTeacherId(user);
  return materials.filter((mat) => {
    if (mat.teacher_id && mat.teacher_id === teacherId) return true;
    return canTeacherAccessCourse(mat.courseId, user) || canTeacherAccessCourse(mat.courseName, user);
  });
}

/**
 * Filters students by the teacher's assigned course tracks
 */
export function filterStudentsByTeacher<T extends { courseName: string }>(
  students: T[],
  user: UserProfileRecord | null
): T[] {
  if (!user) return [];
  if (user.role === "admin" || user.role === "super_admin") return students;

  return students.filter((std) => canTeacherAccessCourse(std.courseName, user));
}
