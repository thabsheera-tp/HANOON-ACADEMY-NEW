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
  return results;
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
  month: string; // e.g. "2026-11"
  monthLabel: string; // e.g. "November 2026"
  courseId: string;
  totalClassesHeld: number;
  averageAttendanceRate: number;
  highAttendanceCount: number; // >= 90%
  lowAttendanceCount: number; // < 75%
  topAttendees: MonthlyStudentAttendance[]; // Top 3
  allStudents: MonthlyStudentAttendance[];
}

/**
 * Format a YYYY-MM string into a human readable Month Year (e.g. "2026-11" -> "November 2026")
 */
export function formatMonthYearLabel(monthStr: string): string {
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
 * Accurately aggregates monthly attendance from Supabase and local cache.
 * Grouped strictly by student_id with deduplication on same date/session.
 * Calculates total classes held, present days, absent/leave days, exact %, and ranks.
 */
export async function fetchMonthlyAttendanceAnalytics(params: {
  month?: string; // YYYY-MM, defaults to current month
  courseId?: string; // 'all' or specific course id
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
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const targetMonth = params.month || currentMonthStr;
  const courseFilter = params.courseId || "all";
  const subjectFilter = params.subjectId || "all";

  const [yearStr, monthNumStr] = targetMonth.split("-");
  const year = parseInt(yearStr, 10) || now.getFullYear();
  const monthNum = parseInt(monthNumStr, 10) || now.getMonth() + 1;
  const lastDay = new Date(year, monthNum, 0).getDate();
  const startDate = `${yearStr}-${String(monthNum).padStart(2, "0")}-01`;
  const endDate = `${yearStr}-${String(monthNum).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  let dbRecords: AttendanceRecord[] = [];

  // 1. Query Supabase 'attendance' table strictly for the given month
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from("attendance")
        .select("*")
        .gte("attendance_date", startDate)
        .lte("attendance_date", endDate);

      if (courseFilter && courseFilter !== "all") {
        query = query.ilike("course_id", `%${courseFilter}%`);
      }
      if (subjectFilter && subjectFilter !== "all") {
        query = query.eq("subject_id", subjectFilter);
      }

      const { data, error } = await query.order("attendance_date", { ascending: true });

      if (!error && Array.isArray(data)) {
        dbRecords = data
          .filter((row: any) => {
            if (!row) return false;
            if (DUMMY_ATTENDANCE_STUDENT_IDS.has(row.student_id)) return false;
            if (DUMMY_ATTENDANCE_RECORD_IDS.has(row.id)) return false;
            const name = (row.student_name || "").trim().toLowerCase();
            if (DUMMY_STUDENT_NAMES.has(name)) return false;
            return true;
          })
          .map((row: any) => ({
            id: row.id,
            studentId: row.student_id || (row.student_phone ? `std-${row.student_phone.replace(/\D/g, "")}` : row.id),
            studentName: row.student_name || "Student",
            studentPhone: row.student_phone || "",
            courseId: row.course_id || "adaviyya",
            subjectId: row.subject_id || "core",
            date: row.attendance_date,
            status: row.status as AttendanceStatus,
            notes: row.notes || undefined,
            markedAt: row.marked_at || new Date().toISOString(),
          }));
      }
    } catch (err) {
      console.warn("Could not query Supabase monthly attendance:", err);
    }
  }

  // 2. Merge with local records filtered by month & course
  const localRecords = getLocalAttendanceRecords().filter((r) => {
    if (!r || !r.date) return false;
    if (r.date < startDate || r.date > endDate) return false;
    if (courseFilter && courseFilter !== "all") {
      const rC = (r.courseId || "").toLowerCase();
      const targetC = courseFilter.toLowerCase();
      if (!rC.includes(targetC) && !targetC.includes(rC)) return false;
    }
    if (subjectFilter && subjectFilter !== "all") {
      if (r.subjectId !== subjectFilter) return false;
    }
    return true;
  });

  // 3. Deduplicate across DB and local records by unique id or (studentId + date + subjectId)
  const dedupedRecordMap = new Map<string, AttendanceRecord>();
  for (const r of dbRecords) {
    const sId = r.studentId || r.studentPhone || r.studentName.toLowerCase().trim();
    dedupedRecordMap.set(`${sId}_${r.date}_${r.subjectId}`, r);
  }
  for (const r of localRecords) {
    const sId = r.studentId || r.studentPhone || r.studentName.toLowerCase().trim();
    const key = `${sId}_${r.date}_${r.subjectId}`;
    if (!dedupedRecordMap.has(key)) {
      dedupedRecordMap.set(key, r);
    }
  }

  const mergedRecords = Array.from(dedupedRecordMap.values());

  // 4. Determine total distinct class sessions held across the course in that month
  const courseSessionsSet = new Set<string>();
  for (const r of mergedRecords) {
    courseSessionsSet.add(`${r.date}_${r.subjectId || "core"}`);
  }
  const totalClassesHeld = courseSessionsSet.size;

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
    const studentKey = r.studentId || cleanPhone || r.studentName.trim().toLowerCase();
    if (!studentKey) continue;

    if (!studentMap.has(studentKey)) {
      studentMap.set(studentKey, {
        studentId: r.studentId || (cleanPhone ? `std-${cleanPhone}` : studentKey),
        studentName: r.studentName,
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

  // 6. Enrich with enrolled students list if provided (ensures complete course roster)
  if (params.enrolledStudents && params.enrolledStudents.length > 0) {
    for (const enr of params.enrolledStudents) {
      if (enr.paymentStatus === "REJECTED") continue;

      if (courseFilter && courseFilter !== "all") {
        const cId = (enr.courseId || "").toLowerCase();
        const choice = (enr.courseChoice || "").toLowerCase();
        const target = courseFilter.toLowerCase();
        const matches = cId.includes(target) || choice.includes(target) ||
          (target === "adaviyya" && !cId.includes("tuition") && !cId.includes("fashion"));
        if (!matches) continue;
      }

      const cleanPhone = (enr.whatsappNum || "").replace(/\D/g, "");
      const studentKey = enr.studentId || cleanPhone || enr.fullName.trim().toLowerCase();

      if (!studentMap.has(studentKey)) {
        studentMap.set(studentKey, {
          studentId: enr.studentId || (cleanPhone ? `std-${cleanPhone}` : studentKey),
          studentName: enr.fullName,
          studentPhone: enr.whatsappNum,
          courseId: enr.courseId || courseFilter,
          sessions: new Map(),
        });
      }
    }
  }

  // 7. Calculate exact metrics per student
  const studentsList: MonthlyStudentAttendance[] = [];

  for (const entry of studentMap.values()) {
    const studentSessions = Array.from(entry.sessions.values());
    const daysPresent = studentSessions.filter((s) => s.status === "PRESENT" || s.status === "LATE").length;
    const daysLate = studentSessions.filter((s) => s.status === "LATE").length;
    const daysExcused = studentSessions.filter((s) => s.status === "EXCUSED").length;

    // Total classes for student: at least the total classes held in this course for the month
    const totalClasses = Math.max(totalClassesHeld, studentSessions.length);
    const daysAbsent = Math.max(0, totalClasses - daysPresent);

    // Exact percentage calculation: (Days Present / Total Classes) * 100 rounded to 1 decimal place
    const percentage = totalClasses > 0 ? (daysPresent / totalClasses) * 100 : 0;
    const roundedPercentage = Math.round(percentage * 10) / 10;

    // Cross-reference district from enrolled list if available
    const enrolledMatch = params.enrolledStudents?.find(
      (e) =>
        e.studentId === entry.studentId ||
        (entry.studentPhone && e.whatsappNum.replace(/\D/g, "") === entry.studentPhone.replace(/\D/g, ""))
    );

    studentsList.push({
      studentId: entry.studentId,
      studentName: enrolledMatch?.fullName || entry.studentName,
      studentPhone: enrolledMatch?.whatsappNum || entry.studentPhone,
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
  const analytics = await fetchMonthlyAttendanceAnalytics({
    month: params.month,
    courseId: params.courseId,
  });

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



