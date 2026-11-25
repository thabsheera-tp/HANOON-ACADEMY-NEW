import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  courseId: string;
  subjectId: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  notes?: string;
  markedAt: string;
}

export interface AttendanceSummary {
  studentId: string;
  studentName: string;
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  excusedCount: number;
  attendanceRate: number; // Percentage 0 - 100
}

const LOCAL_ATTENDANCE_KEY = "hanoon_attendance_records_v1";

const DUMMY_ATTENDANCE_STUDENT_IDS = new Set(["std-demo-1", "std-demo-2", "std-demo-3", "std-demo-4"]);
const DUMMY_ATTENDANCE_RECORD_IDS = new Set(["att-001", "att-002", "att-003", "att-004"]);
const DUMMY_STUDENT_NAMES = new Set(["muhammed rashid", "fathima nihala", "aysha shamna", "zainul abideen"]);

export interface StudentAttendanceMetrics {
  present: number;
  leave: number;
  absent: number;
  total: number;
  attendanceRate: number;
  records: AttendanceRecord[];
}

export function getLocalAttendanceRecords(): AttendanceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((r: any) => {
        if (!r) return false;
        if (DUMMY_ATTENDANCE_STUDENT_IDS.has(r.studentId)) return false;
        if (DUMMY_ATTENDANCE_RECORD_IDS.has(r.id)) return false;
        const name = (r.studentName || "").trim().toLowerCase();
        if (DUMMY_STUDENT_NAMES.has(name)) return false;
        return true;
      });
    }
  } catch {
    return [];
  }
  return [];
}

/**
 * Flexible case-insensitive status normalization.
 * Handles 'P', 'p', 'Present', 'present', 'attended', 'attended', '1', 'yes' as PRESENT.
 * Handles 'A', 'a', 'Absent', 'absent', '0', 'no' as ABSENT.
 * Handles 'L', 'l', 'Leave', 'leave', 'EXCUSED', 'excused' as EXCUSED.
 * Handles 'LATE', 'late' as LATE.
 */
export function normalizeAttendanceStatus(rawStatus?: string): AttendanceStatus {
  if (!rawStatus) return "PRESENT";
  const s = String(rawStatus).trim().toUpperCase();
  if (s === "A" || s === "ABSENT" || s === "NO" || s === "0" || s === "FALSE") {
    return "ABSENT";
  }
  if (s === "L" || s === "LEAVE" || s === "EXCUSED" || s === "PERMITTED") {
    return "EXCUSED";
  }
  if (s === "LATE") {
    return "LATE";
  }
  return "PRESENT";
}

export function isPresentStatus(status?: string): boolean {
  if (!status) return false;
  const s = String(status).trim().toUpperCase();
  return (
    s === "P" ||
    s === "PRESENT" ||
    s === "ATTENDED" ||
    s === "ATTEND" ||
    s === "JOINED" ||
    s === "LATE" ||
    s === "YES" ||
    s === "1" ||
    s === "TRUE"
  );
}

export function isLateStatus(status?: string): boolean {
  if (!status) return false;
  return String(status).trim().toUpperCase() === "LATE";
}

export function isLeaveStatus(status?: string): boolean {
  if (!status) return false;
  const s = String(status).trim().toUpperCase();
  return s === "L" || s === "LEAVE" || s === "EXCUSED" || s === "PERMITTED";
}

export function isAbsentStatus(status?: string): boolean {
  if (!status) return false;
  const s = String(status).trim().toUpperCase();
  return s === "A" || s === "ABSENT" || s === "NO" || s === "0" || s === "FALSE";
}

/**
 * Flexible date extractor: falls back to attendance_date, date, created_at, marked_at, submitted_at.
 * Always formats as standard 'YYYY-MM-DD'.
 */
export function extractRecordDate(row: any): string {
  if (!row) return new Date().toISOString().split("T")[0];
  const candidate =
    row.attendance_date ||
    row.date ||
    row.marked_at ||
    row.created_at ||
    row.submitted_at;

  if (!candidate) return new Date().toISOString().split("T")[0];

  if (typeof candidate === "string") {
    if (candidate.includes("T")) {
      return candidate.split("T")[0];
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(candidate)) {
      return candidate.slice(0, 10);
    }
  }

  try {
    const d = new Date(candidate);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split("T")[0];
    }
  } catch {}

  return String(candidate).slice(0, 10);
}

/**
 * Safe mapper for Supabase raw rows into clean AttendanceRecord without relational inner join failure.
 */
export function mapDbAttendanceRow(row: any): AttendanceRecord {
  const normStatus = normalizeAttendanceStatus(row.status);
  const recDate = extractRecordDate(row);
  const sPhone = row.student_phone || row.phone || row.whatsapp_num || "";
  const sId = row.student_id || (sPhone ? `std-${sPhone.replace(/\D/g, "")}` : row.id);
  const sName =
    row.student_name ||
    row.name ||
    row.full_name ||
    (sPhone ? `Student (${sPhone.slice(-4)})` : "Enrolled Student");

  return {
    id: row.id || `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    studentId: sId,
    studentName: sName,
    studentPhone: sPhone,
    courseId: row.course_id || "adaviyya",
    subjectId: row.subject_id || "core",
    date: recDate,
    status: normStatus,
    notes: row.notes || undefined,
    markedAt: row.marked_at || row.created_at || new Date().toISOString(),
  };
}

export function saveLocalAttendanceRecords(records: AttendanceRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn("Failed to save local attendance records:", e);
  }
}

/**
 * Fetch attendance for a specific course, subject, and date
 */
export async function fetchSessionAttendance(
  courseId: string,
  subjectId: string,
  date: string
): Promise<AttendanceRecord[]> {
  const local = getLocalAttendanceRecords();
  return local.filter(
    (r) => r.courseId === courseId && (r.subjectId === subjectId || subjectId === "all") && r.date === date
  );
}

/**
 * Save or update an attendance entry for a student in a session
 */
export async function recordStudentAttendance(
  record: Omit<AttendanceRecord, "id" | "markedAt">
): Promise<AttendanceRecord> {
  const local = getLocalAttendanceRecords();
  const existingIdx = local.findIndex(
    (r) =>
      r.studentId === record.studentId &&
      r.courseId === record.courseId &&
      r.subjectId === record.subjectId &&
      r.date === record.date
  );

  const updatedRecord: AttendanceRecord = {
    ...record,
    id: existingIdx >= 0 ? local[existingIdx].id : `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    markedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    local[existingIdx] = updatedRecord;
  } else {
    local.push(updatedRecord);
  }

  saveLocalAttendanceRecords(local);

  // Background sync to Supabase if table exists
  if (isSupabaseConfigured && supabase) {
    try {
      const isUuid = (val?: string) =>
        Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

      const upsertPayload: Record<string, any> = {
        id: updatedRecord.id,
        student_id: isUuid(updatedRecord.studentId) ? updatedRecord.studentId : null,
        student_phone: updatedRecord.studentPhone || null,
        student_name: updatedRecord.studentName || null,
        course_id: updatedRecord.courseId,
        subject_id: updatedRecord.subjectId,
        attendance_date: updatedRecord.date,
        status: updatedRecord.status,
        notes: updatedRecord.notes || null,
        marked_at: updatedRecord.markedAt,
      };

      await supabase.from("attendance").upsert(upsertPayload);
    } catch (err) {
      console.warn("Could not sync attendance record to Supabase:", err);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hanoon_attendance_updated"));
  }

  return updatedRecord;
}

/**
 * Click-based attendance tracking for Google Meet / Live Classes.
 * Immediately fires an API call to Supabase to mark the student's attendance as 'PRESENT' ('P')
 * with the exact timestamp when the "Join Live Class" button is clicked.
 */
export async function recordLiveClassJoinAttendance(params: {
  studentId?: string;
  studentName?: string;
  studentPhone?: string;
  courseId: string;
  classTitle: string;
  subjectId?: string;
  meetingLink?: string;
}): Promise<AttendanceRecord> {
  const today = new Date().toISOString().split("T")[0];
  const subjectId = params.subjectId || "live-session";
  const rawId = params.studentId || "";
  const studentPhone = (params.studentPhone || "").replace(/\D/g, "");
  const studentId = rawId || (studentPhone ? `std-${studentPhone}` : "std-active-student");

  const record = await recordStudentAttendance({
    studentId,
    studentName: params.studentName || "Student",
    studentPhone: params.studentPhone || "",
    courseId: params.courseId || "adaviyya",
    subjectId,
    date: today,
    status: "PRESENT",
    notes: `Google Meet Joined: ${params.classTitle}`,
  });

  return record;
}


/**
 * Mark multiple students at once (e.g. Mark All Present)
 */
export async function batchRecordAttendance(
  records: Omit<AttendanceRecord, "id" | "markedAt">[]
): Promise<AttendanceRecord[]> {
  const local = getLocalAttendanceRecords();
  const results: AttendanceRecord[] = [];

  for (const rec of records) {
    const existingIdx = local.findIndex(
      (r) =>
        r.studentId === rec.studentId &&
        r.courseId === rec.courseId &&
        r.subjectId === rec.subjectId &&
        r.date === rec.date
    );

    const fullRec: AttendanceRecord = {
      ...rec,
      id: existingIdx >= 0 ? local[existingIdx].id : `att-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      markedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      local[existingIdx] = fullRec;
    } else {
      local.push(fullRec);
    }
    results.push(fullRec);
  }

  saveLocalAttendanceRecords(local);

  // Background sync batch records to Supabase 'attendance' table
  if (isSupabaseConfigured && supabase) {
    try {
      const isUuid = (val?: string) =>
        Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

      const payloads = results.map((r) => ({
        id: r.id,
        student_id: isUuid(r.studentId) ? r.studentId : null,
        student_phone: r.studentPhone || null,
        student_name: r.studentName || null,
        course_id: r.courseId,
        subject_id: r.subjectId,
        attendance_date: r.date,
        status: r.status,
        notes: r.notes || null,
        marked_at: r.markedAt,
      }));

      await supabase.from("attendance").upsert(payloads);
    } catch (err) {
      console.warn("Could not batch sync attendance records to Supabase:", err);
    }
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hanoon_attendance_updated"));
  }

  return results;
}

/**
 * Loads all attendance records from Supabase and merges with local storage.
 * Ensures previously saved attendance (including 17+ classes from last month)
 * is fully populated in memory across devices and tabs.
 */
export async function fetchAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  let dbRecords: AttendanceRecord[] = [];

  // 1. Try server-side admin data route first (bypasses RLS with service role)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/admin/data");
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.attendance) && json.attendance.length > 0) {
          dbRecords = json.attendance.map((row: any) => mapDbAttendanceRow(row));
        }
      }
    } catch {}
  }

  // 2. Direct Supabase Client fallback
  if (dbRecords.length === 0 && isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .order("attendance_date", { ascending: false });

      if (!error && Array.isArray(data)) {
        dbRecords = data.map((row: any) => mapDbAttendanceRow(row));
      }
    } catch (err) {
      console.warn("Direct Supabase attendance query notice:", err);
    }
  }

  // Merge with local records
  const local = getLocalAttendanceRecords();
  const map = new Map<string, AttendanceRecord>();
  for (const r of dbRecords) {
    map.set(r.id, r);
  }
  for (const r of local) {
    if (!map.has(r.id)) {
      map.set(r.id, r);
    }
  }

  const merged = Array.from(map.values());
  if (merged.length > local.length) {
    saveLocalAttendanceRecords(merged);
  }
  return merged;
}

/**
 * Calculate attendance metrics across student roster
 */
export function calculateStudentAttendanceSummary(
  studentId: string,
  studentName: string,
  records: AttendanceRecord[]
): AttendanceSummary {
  const studentRecords = records.filter((r) => r.studentId === studentId);
  const totalSessions = studentRecords.length;
  const presentCount = studentRecords.filter((r) => r.status === "PRESENT").length;
  const lateCount = studentRecords.filter((r) => r.status === "LATE").length;
  const excusedCount = studentRecords.filter((r) => r.status === "EXCUSED").length;
  const absentCount = studentRecords.filter((r) => r.status === "ABSENT").length;

  // Present and Late count as attendance credit (Late = 0.8 weight)
  const attendanceRate =
    totalSessions > 0
      ? Math.round(((presentCount + lateCount * 0.8 + excusedCount) / totalSessions) * 100)
      : 100;

  return {
    studentId,
    studentName,
    totalSessions,
    presentCount,
    absentCount,
    lateCount,
    excusedCount,
    attendanceRate: Math.min(100, Math.max(0, attendanceRate)),
  };
}

/**
 * Generate a pre-filled direct WhatsApp message link for parent attendance updates
 */
export function getWhatsAppAttendanceAlertUrl(
  studentName: string,
  rawPhone: string,
  courseTitle: string,
  subjectTitle: string,
  dateStr: string,
  status: AttendanceStatus,
  attendanceRate?: number
): string {
  const digits = rawPhone.replace(/\D/g, "");
  const formattedPhone = digits.length === 10 ? `91${digits}` : digits;

  const statusIcons: Record<AttendanceStatus, string> = {
    PRESENT: "✅ *PRESENT (ഹാജർ)*",
    ABSENT: "❌ *ABSENT (അസാന്നിധ്യം)*",
    LATE: "⚠️ *LATE (വൈകി വന്നു)*",
    EXCUSED: "ℹ️ *EXCUSED (അനുവാദത്തോടെ)*",
  };

  const statusMalayalam: Record<AttendanceStatus, string> = {
    PRESENT: "ഇന്നത്തെ ക്ലാസിൽ കൃത്യമായി പങ്കെടുത്തിട്ടുണ്ട്.",
    ABSENT: "ഇന്നത്തെ ക്ലാസിൽ പങ്കെടുത്തിട്ടില്ല. എന്തെങ്കിലും അസൗകര്യമുണ്ടെങ്കിൽ ദയവായി അറിയിക്കുക.",
    LATE: "ഇന്നത്തെ ക്ലാസിൽ അല്പം വൈകിയാണ് ഹാജരായത്.",
    EXCUSED: "മുൻകൂട്ടി അനുവാദം വാങ്ങി ക്ലാസിൽ നിന്ന് വിട്ടുനിന്നിട്ടുണ്ട്.",
  };

  const message = `*HANOON ACADEMY | വിജ്ഞാന വെളിച്ചം* 🎓
*Official Attendance Notification*

പ്രിയപ്പെട്ട രക്ഷിതാവേ / വിദ്യാർത്ഥി,
*${studentName}* ന്റെ ഇന്നത്തെ ക്ലാസ്സ് ഹാജർ നില വിവരം:

📅 *Date:* ${dateStr}
📚 *Course:* ${courseTitle}
📖 *Class:* ${subjectTitle}
📍 *Status:* ${statusIcons[status]}

📝 ${statusMalayalam[status]}
${attendanceRate !== undefined ? `📊 *Overall Attendance Rate:* ${attendanceRate}%\n` : ""}
തുടർന്നും ക്ലാസുകളിൽ കൃത്യമായി പങ്കെടുക്കണമെന്ന് ഓർമ്മിപ്പിക്കുന്നു.

_Hanoon Academy Academic Administration_
🌐 https://hanoonacademy.com
📞 Support: +91 96562 94203`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Dynamically queries attendance for an authenticated student directly from Supabase
 * with support for live class attendance derivation and local fallback.
 */
export async function fetchStudentAttendanceMetrics(params: {
  studentId?: string;
  phone?: string;
  studentName?: string;
  courseId?: string;
  isApproved?: boolean;
}): Promise<StudentAttendanceMetrics> {
  const { studentId, phone, studentName, courseId } = params;
  const cleanPhone = (phone || "").replace(/\D/g, "");

  let dbRecords: AttendanceRecord[] = [];

  // 1. Query Supabase 'attendance' table strictly filtered by student_id or student_phone
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from("attendance")
        .select("*");

      if (studentId) {
        query = query.eq("student_id", studentId);
      } else if (cleanPhone) {
        query = query.eq("student_phone", cleanPhone);
      } else {
        // Without student identity, strictly return 0 records
        return { present: 0, leave: 0, absent: 0, total: 0, attendanceRate: 0, records: [] };
      }

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query.order("attendance_date", { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        dbRecords = data.map((row: any) => ({
          id: row.id,
          studentId: row.student_id || studentId || "",
          studentName: row.student_name || studentName || "Student",
          studentPhone: row.student_phone || phone || "",
          courseId: row.course_id || courseId || "adaviyya",
          subjectId: row.subject_id || "core",
          date: row.attendance_date,
          status: row.status as AttendanceStatus,
          notes: row.notes || undefined,
          markedAt: row.marked_at || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.warn("Could not query Supabase attendance:", e);
    }
  }

  // 2. Merge with local attendance records strictly matching this student
  const localRecords = getLocalAttendanceRecords().filter((r) => {
    if (!r) return false;
    const rPhone = (r.studentPhone || "").replace(/\D/g, "");
    const rId = r.studentId;

    const studentMatch =
      (studentId && rId && rId === studentId) ||
      (cleanPhone && rPhone && rPhone === cleanPhone);

    if (!studentMatch) return false;

    if (courseId) {
      const rCourse = (r.courseId || "").toLowerCase();
      const targetCourse = courseId.toLowerCase();
      return !rCourse || rCourse.includes(targetCourse) || targetCourse.includes(rCourse);
    }
    return true;
  });

  // Combine and deduplicate
  const recordMap = new Map<string, AttendanceRecord>();
  for (const r of dbRecords) {
    recordMap.set(`${r.date}_${r.subjectId}`, r);
  }
  for (const r of localRecords) {
    const key = `${r.date}_${r.subjectId}`;
    if (!recordMap.has(key)) {
      recordMap.set(key, r);
    }
  }

  const allRecords = Array.from(recordMap.values());

  if (allRecords.length > 0) {
    const present = allRecords.filter((r) => r.status === "PRESENT").length;
    const leave = allRecords.filter(
      (r) => r.status === "EXCUSED" || r.status === "LATE"
    ).length;
    const absent = allRecords.filter((r) => r.status === "ABSENT").length;
    const total = present + leave + absent;
    const attendanceRate =
      total > 0 ? Math.round(((present + leave * 0.8) / total) * 100) : 0;
    return { present, leave, absent, total, attendanceRate, records: allRecords };
  }

  // Strictly return empty state when database returns no records (No fake dummy data)
  return { present: 0, leave: 0, absent: 0, total: 0, attendanceRate: 0, records: [] };
}

// =============================================================================
// MONTHLY ATTENDANCE ANALYTICS & LEADERBOARD (STRICT SUPABASE AGGREGATION)
// =============================================================================

export interface MonthlyStudentAttendance {
  studentId: string;
  studentName: string;
  studentPhone: string;
  district?: string;
  courseId: string;
  courseName?: string;
  totalClasses: number;
  daysPresent: number;
  daysAbsent: number;
  daysLate: number;
  daysExcused: number;
  attendancePercentage: number; // e.g. 91.7
  rank?: number;
}

export interface MonthlyAttendanceSummary {
  month: string; // e.g. "2026-11" or "all"
  monthLabel: string; // e.g. "November 2026" or "All Time (All Recorded Sessions)"
  courseId: string;
  totalClassesHeld: number;
  averageAttendanceRate: number;
  highAttendanceCount: number; // >= 90%
  lowAttendanceCount: number; // < 75%
  topAttendees: MonthlyStudentAttendance[]; // Top 3
  allStudents: MonthlyStudentAttendance[];
  errorMessage?: string | null;
}

/**
 * Format a YYYY-MM string into a human readable Month Year (e.g. "2026-11" -> "November 2026")
 * Supports 'all' -> "All Time (All Recorded Sessions)"
 */
export function formatMonthYearLabel(monthStr: string): string {
  if (!monthStr || monthStr.toLowerCase() === "all") {
    return "All Time (All Recorded Sessions)";
  }
  try {
    const [y, m] = monthStr.split("-").map(Number);
    if (!y || !m) return monthStr;
    const date = new Date(y, m - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch {
    return monthStr;
  }
}

/**
 * Accurately aggregates attendance from Supabase and local cache.
 * Grouped strictly by student_id with deduplication on same date/session.
 * Flexible status matching ('P', 'Present', 'attended', 'A', 'Absent', 'L', 'Leave').
 * Date fallback to attendance_date, date, created_at, or marked_at.
 * Never drops students due to missing profile/inner joins.
 * Surfaces Supabase query or RLS errors cleanly.
 */
export async function fetchMonthlyAttendanceAnalytics(params: {
  month?: string; // YYYY-MM, 'all', or defaults to 'all'
  courseId?: string; // 'all' or specific course id (defaults to 'all')
  subjectId?: string; // 'all' or specific subject id
  enrolledStudents?: {
    studentId: string;
    fullName: string;
    whatsappNum: string;
    district?: string;
    courseId?: string;
    courseChoice?: string;
    paymentStatus?: string;
  }[];
}): Promise<MonthlyAttendanceSummary> {
  const targetMonth = (params.month || "all").trim();
  const isAllTime = targetMonth.toLowerCase() === "all" || !targetMonth;
  const courseFilter = (params.courseId || "all").trim();
  const subjectFilter = (params.subjectId || "all").trim();

  let queryErrorMessage: string | null = null;
  let rawAttendanceRows: any[] = [];

  // 1. Attempt 1: Fetch from server-side admin data route (bypasses RLS with service role)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/admin/data");
      if (res.ok) {
        const json = await res.json();
        if (json && Array.isArray(json.attendance)) {
          rawAttendanceRows = json.attendance;
        }
      }
    } catch {}
  }

  // 2. Attempt 2: Direct Supabase Client query (without inner join to prevent dropping un-joined rows)
  if (rawAttendanceRows.length === 0 && isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .order("attendance_date", { ascending: false });

      if (error) {
        queryErrorMessage = error.message;
        console.warn("Supabase attendance fetch notice:", error.message);
      } else if (Array.isArray(data)) {
        rawAttendanceRows = data;
      }
    } catch (err: any) {
      queryErrorMessage = err?.message || "Failed to query Supabase attendance table";
      console.warn("Attendance query exception:", err);
    }
  }

  // Map raw DB rows safely into clean AttendanceRecord objects
  const dbRecords: AttendanceRecord[] = rawAttendanceRows
    .filter((row: any) => {
      if (!row) return false;
      if (DUMMY_ATTENDANCE_STUDENT_IDS.has(row.student_id)) return false;
      if (DUMMY_ATTENDANCE_RECORD_IDS.has(row.id)) return false;
      const name = (row.student_name || "").trim().toLowerCase();
      if (DUMMY_STUDENT_NAMES.has(name)) return false;
      return true;
    })
    .map((row: any) => mapDbAttendanceRow(row));

  // Merge with local records
  const localRecords = getLocalAttendanceRecords();
  const mergedMap = new Map<string, AttendanceRecord>();

  for (const r of dbRecords) {
    const sId = r.studentId || r.studentPhone || r.studentName.toLowerCase().trim();
    mergedMap.set(`${sId}_${r.date}_${r.subjectId}`, r);
  }
  for (const r of localRecords) {
    const sId = r.studentId || r.studentPhone || r.studentName.toLowerCase().trim();
    const key = `${sId}_${r.date}_${r.subjectId}`;
    if (!mergedMap.has(key)) {
      mergedMap.set(key, r);
    }
  }

  // Filter records by Month (if not 'all') and Course (if not 'all')
  const mergedRecords = Array.from(mergedMap.values()).filter((r) => {
    if (!r || !r.date) return false;

    // Month filter: if 'all', include everything. Otherwise match YYYY-MM
    if (!isAllTime) {
      if (!r.date.startsWith(targetMonth)) {
        return false;
      }
    }

    // Course filter: if 'all', include everything. Otherwise match course loosely or allow unassigned
    if (courseFilter && courseFilter !== "all") {
      const rC = (r.courseId || "").toLowerCase();
      const targetC = courseFilter.toLowerCase();
      const matches =
        !rC ||
        rC.includes(targetC) ||
        targetC.includes(rC) ||
        (targetC === "adaviyya" && !rC.includes("tuition") && !rC.includes("fashion"));
      if (!matches) return false;
    }

    // Subject filter
    if (subjectFilter && subjectFilter !== "all") {
      if (r.subjectId !== subjectFilter) return false;
    }

    return true;
  });

  // 4. Determine total distinct class sessions held across the course
  const courseSessionsSet = new Set<string>();
  for (const r of mergedRecords) {
    courseSessionsSet.add(`${r.date}_${r.subjectId || "core"}`);
  }
  let totalClassesHeld = courseSessionsSet.size;

  // 5. Group records strictly by student
  const studentMap = new Map<
    string,
    {
      studentId: string;
      studentName: string;
      studentPhone: string;
      courseId: string;
      sessions: Map<string, AttendanceRecord>;
    }
  >();

  for (const r of mergedRecords) {
    const cleanPhone = (r.studentPhone || "").replace(/\D/g, "");
    const studentKey =
      r.studentId || (cleanPhone ? `std-${cleanPhone}` : r.studentName.trim().toLowerCase());
    if (!studentKey) continue;

    if (!studentMap.has(studentKey)) {
      studentMap.set(studentKey, {
        studentId: r.studentId || (cleanPhone ? `std-${cleanPhone}` : studentKey),
        studentName: r.studentName || "Registered Student",
        studentPhone: r.studentPhone,
        courseId: r.courseId,
        sessions: new Map(),
      });
    }

    const studentEntry = studentMap.get(studentKey)!;
    const sessionKey = `${r.date}_${r.subjectId || "core"}`;
    // Deduplicate multiple logs on the same date for the same student/session: keep latest
    studentEntry.sessions.set(sessionKey, r);
  }

  // 6. Enrich with enrolled students list if provided (ensures complete course roster without dropping anyone)
  if (params.enrolledStudents && params.enrolledStudents.length > 0) {
    for (const enr of params.enrolledStudents) {
      if (enr.paymentStatus === "REJECTED") continue;

      if (courseFilter && courseFilter !== "all") {
        const cId = (enr.courseId || "").toLowerCase();
        const choice = (enr.courseChoice || "").toLowerCase();
        const target = courseFilter.toLowerCase();
        const matches =
          cId.includes(target) ||
          choice.includes(target) ||
          (target === "adaviyya" && !cId.includes("tuition") && !cId.includes("fashion"));
        if (!matches) continue;
      }

      const cleanPhone = (enr.whatsappNum || "").replace(/\D/g, "");
      const studentKey =
        enr.studentId || (cleanPhone ? `std-${cleanPhone}` : enr.fullName.trim().toLowerCase());

      if (!studentMap.has(studentKey)) {
        studentMap.set(studentKey, {
          studentId: enr.studentId || (cleanPhone ? `std-${cleanPhone}` : studentKey),
          studentName: enr.fullName || "Enrolled Student",
          studentPhone: enr.whatsappNum,
          courseId: enr.courseId || courseFilter,
          sessions: new Map(),
        });
      }
    }
  }

  // If totalClassesHeld is 0 but some students have sessions, use the max session count
  if (totalClassesHeld === 0) {
    for (const entry of studentMap.values()) {
      if (entry.sessions.size > totalClassesHeld) {
        totalClassesHeld = entry.sessions.size;
      }
    }
  }

  // 7. Calculate exact metrics per student with flexible status matching
  const studentsList: MonthlyStudentAttendance[] = [];

  for (const entry of studentMap.values()) {
    const studentSessions = Array.from(entry.sessions.values());
    const daysPresent = studentSessions.filter((s) => isPresentStatus(s.status)).length;
    const daysLate = studentSessions.filter((s) => isLateStatus(s.status)).length;
    const daysExcused = studentSessions.filter((s) => isLeaveStatus(s.status)).length;

    // Total classes for student: at least the total classes held in this course for the selected period
    const totalClasses = Math.max(totalClassesHeld, studentSessions.length);
    const daysAbsent = Math.max(0, totalClasses - daysPresent);

    // Exact percentage calculation: (Days Present / Total Classes) * 100 rounded to 1 decimal place
    const percentage = totalClasses > 0 ? (daysPresent / totalClasses) * 100 : 0;
    const roundedPercentage = Math.round(percentage * 10) / 10;

    // Cross-reference district and full name from enrolled list if available
    const enrolledMatch = params.enrolledStudents?.find(
      (e) =>
        e.studentId === entry.studentId ||
        (entry.studentPhone &&
          e.whatsappNum.replace(/\D/g, "") === entry.studentPhone.replace(/\D/g, ""))
    );

    studentsList.push({
      studentId: entry.studentId,
      studentName: enrolledMatch?.fullName || entry.studentName || "Registered Student",
      studentPhone: enrolledMatch?.whatsappNum || entry.studentPhone || "",
      district: enrolledMatch?.district || undefined,
      courseId: entry.courseId || courseFilter,
      totalClasses,
      daysPresent,
      daysAbsent,
      daysLate,
      daysExcused,
      attendancePercentage: roundedPercentage,
    });
  }

  // 8. Sort from Highest to Lowest percentage (use total Days Present as tie-breaker)
  studentsList.sort((a, b) => {
    if (b.attendancePercentage !== a.attendancePercentage) {
      return b.attendancePercentage - a.attendancePercentage;
    }
    if (b.daysPresent !== a.daysPresent) {
      return b.daysPresent - a.daysPresent;
    }
    return a.studentName.localeCompare(b.studentName);
  });

  // Assign ranks
  studentsList.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  // Top 3 Attendees (Only students with daysPresent > 0)
  const topAttendees = studentsList.filter((s) => s.daysPresent > 0).slice(0, 3);

  // High Attendance (>= 90%) and Low Attendance (< 75%)
  const highAttendanceCount = studentsList.filter((s) => s.attendancePercentage >= 90).length;
  const lowAttendanceCount = studentsList.filter((s) => s.attendancePercentage < 75).length;

  const totalPercentages = studentsList.reduce((acc, s) => acc + s.attendancePercentage, 0);
  const averageAttendanceRate =
    studentsList.length > 0 ? Math.round((totalPercentages / studentsList.length) * 10) / 10 : 0;

  return {
    month: targetMonth,
    monthLabel: formatMonthYearLabel(targetMonth),
    courseId: courseFilter,
    totalClassesHeld,
    averageAttendanceRate,
    highAttendanceCount,
    lowAttendanceCount,
    topAttendees,
    allStudents: studentsList,
    errorMessage: queryErrorMessage,
  };
}

/**
 * Privacy-preserving Leaderboard for the Student Dashboard.
 * Returns ONLY the Top 3 attendees (Rank, Name, Percentage) for the student's course,
 * plus the logged-in student's own monthly attendance summary.
 * ZERO other student rosters or low attendance details exposed.
 */
export async function fetchStudentOfTheMonthLeaderboard(params: {
  courseId: string;
  studentId?: string;
  studentPhone?: string;
  month?: string;
}): Promise<{
  month: string;
  monthLabel: string;
  courseId: string;
  totalClassesHeld: number;
  top3: {
    rank: number;
    studentName: string;
    attendancePercentage: number;
    daysPresent: number;
    totalClasses: number;
  }[];
  mySummary: {
    daysPresent: number;
    daysAbsent: number;
    totalClasses: number;
    attendancePercentage: number;
    rank?: number;
  } | null;
}> {
  let analytics = await fetchMonthlyAttendanceAnalytics({
    month: params.month,
    courseId: params.courseId,
  });

  // If specific month was not requested and current month has 0 sessions, fallback to 'all' so historical sessions appear
  if (analytics.totalClassesHeld === 0 && !params.month) {
    const allAnalytics = await fetchMonthlyAttendanceAnalytics({
      month: "all",
      courseId: params.courseId,
    });
    if (allAnalytics.totalClassesHeld > 0) {
      analytics = allAnalytics;
    }
  }

  // Top 3 formatted strictly with minimal public info
  const top3 = analytics.topAttendees.map((s, idx) => ({
    rank: idx + 1,
    studentName: s.studentName,
    attendancePercentage: s.attendancePercentage,
    daysPresent: s.daysPresent,
    totalClasses: s.totalClasses,
  }));

  // Find the logged-in student's own summary
  const cleanPhone = (params.studentPhone || "").replace(/\D/g, "");
  const myEntry = analytics.allStudents.find((s) => {
    if (params.studentId && s.studentId === params.studentId) return true;
    if (cleanPhone && s.studentPhone && s.studentPhone.replace(/\D/g, "") === cleanPhone) return true;
    return false;
  });

  let mySummary = null;
  if (myEntry) {
    mySummary = {
      daysPresent: myEntry.daysPresent,
      daysAbsent: myEntry.daysAbsent,
      totalClasses: myEntry.totalClasses,
      attendancePercentage: myEntry.attendancePercentage,
      rank: myEntry.rank,
    };
  } else if (analytics.totalClassesHeld > 0) {
    mySummary = {
      daysPresent: 0,
      daysAbsent: analytics.totalClassesHeld,
      totalClasses: analytics.totalClassesHeld,
      attendancePercentage: 0,
    };
  }

  return {
    month: analytics.month,
    monthLabel: analytics.monthLabel,
    courseId: params.courseId,
    totalClassesHeld: analytics.totalClassesHeld,
    top3,
    mySummary,
  };
}



