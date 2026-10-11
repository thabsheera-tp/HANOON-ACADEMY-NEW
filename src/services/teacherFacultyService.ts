import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { addAuditLog } from "@/services/settingsService";

export interface FacultyTeacher {
  id: string;
  fullName: string;
  email: string;
  specialization: string; // Subject / Course Assigned (e.g. Adaviyya, Fashion Designing, Quran, etc.)
  phone: string; // Phone / WhatsApp Number
  ratePerClass: number;
  isActive: boolean;
  createdAt?: string;
}

export const INITIAL_FACULTY: FacultyTeacher[] = [];

const STORAGE_KEY_TEACHERS = "hanoon_admin_faculty_teachers_v1";
const DUMMY_TEACHER_IDS = new Set(["tch-01", "tch-02", "tch-03", "tch-04"]);
const DUMMY_TEACHER_EMAILS = new Set([
  "faisal@hanoon.academy",
  "teacher@hanoon.academy",
  "anas@hanoon.academy",
  "bilal@hanoon.academy",
]);

/**
 * Normalizes phone numbers for WhatsApp linking
 */
export function formatTeacherPhone(phone: string): string {
  const clean = (phone || "").replace(/\D/g, "");
  if (!clean) return "";
  if (clean.length === 10) return `91${clean}`;
  return clean;
}

/**
 * Retrieves cached faculty list from local storage, purging any legacy mock items
 */
export function getLocalFacultyTeachers(): FacultyTeacher[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TEACHERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (t: any) => !DUMMY_TEACHER_IDS.has(t.id) && !DUMMY_TEACHER_EMAILS.has(t.email)
        );
      }
    }
  } catch (e) {
    console.warn("Could not read local faculty teachers:", e);
  }
  return [];
}

/**
 * Saves faculty list to local storage and broadcasts update event
 */
export function saveLocalFacultyTeachers(teachers: FacultyTeacher[]): void {
  if (typeof window === "undefined") return;
  try {
    const sanitized = teachers.filter(
      (t) => !DUMMY_TEACHER_IDS.has(t.id) && !DUMMY_TEACHER_EMAILS.has(t.email)
    );
    localStorage.setItem(STORAGE_KEY_TEACHERS, JSON.stringify(sanitized));
    window.dispatchEvent(
      new CustomEvent("hanoon_faculty_teachers_updated", { detail: sanitized })
    );
  } catch (e) {
    console.error("Could not save faculty teachers to localStorage:", e);
  }
}

/**
 * Fetches all teachers directly from Supabase database.
 * Strictly excludes any dummy test accounts and never auto-seeds mock data.
 */
export async function fetchFacultyTeachers(): Promise<FacultyTeacher[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalFacultyTeachers();
  }

  try {
    const { data, error } = await supabase
      .from("teachers")
      .select("id, full_name, email, specialization, phone, rate_per_class, is_active, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Supabase fetch teachers query error, using local fallback:", error);
      return getLocalFacultyTeachers();
    }

    if (data !== null) {
      // Purge any legacy dummy teachers from Supabase if found
      const dummyMatches = data.filter(
        (row: any) => DUMMY_TEACHER_IDS.has(row.id) || DUMMY_TEACHER_EMAILS.has(row.email)
      );
      if (dummyMatches.length > 0) {
        Promise.resolve(
          supabase
            .from("teachers")
            .delete()
            .in("id", dummyMatches.map((d: any) => d.id))
        ).catch((e: unknown) => console.warn("Failed to purge dummy teachers from Supabase:", e));
      }

      const realRows = data.filter(
        (row: any) => !DUMMY_TEACHER_IDS.has(row.id) && !DUMMY_TEACHER_EMAILS.has(row.email)
      );

      const mapped: FacultyTeacher[] = realRows.map((row: any) => ({
        id: row.id,
        fullName: row.full_name || "Faculty Instructor",
        email: row.email || "",
        specialization: row.specialization || "General Islamic Studies",
        phone: row.phone || "",
        ratePerClass: Number(row.rate_per_class) || 750,
        isActive: row.is_active ?? true,
        createdAt: row.created_at || new Date().toISOString(),
      }));

      saveLocalFacultyTeachers(mapped);
      return mapped;
    }

    return [];
  } catch (err) {
    console.error("fetchFacultyTeachers exception:", err);
    return getLocalFacultyTeachers();
  }
}

/**
 * Adds a new teacher to Supabase and local storage
 */
export async function addFacultyTeacher(params: {
  fullName: string;
  specialization: string;
  phone: string;
  email?: string;
  ratePerClass?: number;
  isActive?: boolean;
}): Promise<FacultyTeacher> {
  const generatedId = `tch-${Date.now()}`;
  const cleanName = params.fullName.trim();
  const cleanSpec = params.specialization.trim();
  const cleanPhone = params.phone.trim();
  const cleanEmail =
    params.email?.trim() ||
    `teacher-${cleanName.toLowerCase().replace(/[^a-z0-9]/g, "") || Date.now()}@hanoon.academy`;
  const rate = params.ratePerClass || 750;
  const active = params.isActive ?? true;

  const newTeacher: FacultyTeacher = {
    id: generatedId,
    fullName: cleanName,
    email: cleanEmail,
    specialization: cleanSpec,
    phone: cleanPhone,
    ratePerClass: rate,
    isActive: active,
    createdAt: new Date().toISOString(),
  };

  // 1. Update Supabase if connected
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from("teachers").insert({
        id: generatedId,
        full_name: cleanName,
        email: cleanEmail,
        specialization: cleanSpec,
        phone: cleanPhone,
        rate_per_class: rate,
        is_active: active,
      });

      if (error) {
        console.warn("Supabase teacher insert error, saving locally:", error);
      }
    } catch (err) {
      console.warn("Supabase teacher insert exception:", err);
    }
  }

  // 2. Update Local Storage
  const current = getLocalFacultyTeachers();
  const updated = [newTeacher, ...current.filter((t) => t.id !== generatedId)];
  saveLocalFacultyTeachers(updated);

  // 3. Log audit event
  addAuditLog({
    actor: "Super Admin",
    action: "Added New Faculty Instructor",
    category: "CURRICULUM",
    details: `Appointed ${cleanName} for course/subject "${cleanSpec}" (Phone: ${cleanPhone || "N/A"}).`,
  });

  return newTeacher;
}

/**
 * Updates an existing teacher in Supabase and local storage
 */
export async function updateFacultyTeacher(
  id: string,
  updates: Partial<Omit<FacultyTeacher, "id">>
): Promise<FacultyTeacher | null> {
  const current = getLocalFacultyTeachers();
  const existing = current.find((t) => t.id === id);
  if (!existing) return null;

  const updatedTeacher: FacultyTeacher = {
    ...existing,
    ...updates,
    fullName: updates.fullName !== undefined ? updates.fullName.trim() : existing.fullName,
    specialization: updates.specialization !== undefined ? updates.specialization.trim() : existing.specialization,
    phone: updates.phone !== undefined ? updates.phone.trim() : existing.phone,
    email: updates.email !== undefined ? updates.email.trim() : existing.email,
  };

  // 1. Update Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const dbPayload: any = {};
      if (updates.fullName !== undefined) dbPayload.full_name = updatedTeacher.fullName;
      if (updates.specialization !== undefined) dbPayload.specialization = updatedTeacher.specialization;
      if (updates.phone !== undefined) dbPayload.phone = updatedTeacher.phone;
      if (updates.email !== undefined) dbPayload.email = updatedTeacher.email;
      if (updates.ratePerClass !== undefined) dbPayload.rate_per_class = updatedTeacher.ratePerClass;
      if (updates.isActive !== undefined) dbPayload.is_active = updatedTeacher.isActive;

      const { error } = await supabase.from("teachers").update(dbPayload).eq("id", id);
      if (error) {
        console.warn("Supabase teacher update warning:", error);
      }
    } catch (err) {
      console.warn("Supabase teacher update exception:", err);
    }
  }

  // 2. Update Local Storage
  const nextList = current.map((t) => (t.id === id ? updatedTeacher : t));
  saveLocalFacultyTeachers(nextList);

  // 3. Log audit event
  addAuditLog({
    actor: "Super Admin",
    action: "Updated Faculty Record",
    category: "CURRICULUM",
    details: `Updated details for instructor ${updatedTeacher.fullName} (${updatedTeacher.specialization}).`,
  });

  return updatedTeacher;
}

/**
 * Deletes a teacher from Supabase and local storage
 */
export async function deleteFacultyTeacher(id: string): Promise<boolean> {
  const current = getLocalFacultyTeachers();
  const target = current.find((t) => t.id === id);
  const teacherName = target?.fullName || id;

  // 1. Delete from Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from("teachers").delete().eq("id", id);
      if (error) {
        console.warn("Supabase teacher delete warning:", error);
      }
    } catch (err) {
      console.warn("Supabase teacher delete exception:", err);
    }
  }

  // 2. Remove from Local Storage
  const nextList = current.filter((t) => t.id !== id);
  saveLocalFacultyTeachers(nextList);

  // 3. Log audit event
  addAuditLog({
    actor: "Super Admin",
    action: "Removed Faculty Instructor",
    category: "CURRICULUM",
    details: `Deleted faculty profile for ${teacherName} (ID: ${id}).`,
  });

  return true;
}

/**
 * Subscribes to real-time changes in the teachers table
 */
export function subscribeToFacultyTeachers(
  callback: (teachers: FacultyTeacher[]) => void
): () => void {
  // Listen to window custom events
  const handleCustomEvent = (e: Event) => {
    const customEvt = e as CustomEvent<FacultyTeacher[]>;
    if (customEvt.detail) {
      callback(customEvt.detail);
    } else {
      callback(getLocalFacultyTeachers());
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("hanoon_faculty_teachers_updated", handleCustomEvent);
  }

  // Listen to Supabase Realtime channel
  let channel: any = null;
  if (isSupabaseConfigured && supabase) {
    channel = supabase
      .channel("faculty_teachers_realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teachers",
        },
        async () => {
          const fresh = await fetchFacultyTeachers();
          callback(fresh);
        }
      )
      .subscribe();
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("hanoon_faculty_teachers_updated", handleCustomEvent);
    }
    if (channel && supabase) {
      supabase.removeChannel(channel);
    }
  };
}
