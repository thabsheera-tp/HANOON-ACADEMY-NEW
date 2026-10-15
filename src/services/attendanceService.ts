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

const INITIAL_DEMO_RECORDS: AttendanceRecord[] = [
  {
    id: "att-001",
    studentId: "std-demo-1",
    studentName: "Muhammed Rashid",
    studentPhone: "919846011223",
    courseId: "adaviyya",
    subjectId: "seerah",
    date: new Date().toISOString().split("T")[0],
    status: "PRESENT",
    markedAt: new Date().toISOString(),
  },
  {
    id: "att-002",
    studentId: "std-demo-2",
    studentName: "Fathima Nihala",
    studentPhone: "919745123456",
    courseId: "adaviyya",
    subjectId: "seerah",
    date: new Date().toISOString().split("T")[0],
    status: "PRESENT",
    markedAt: new Date().toISOString(),
  },
  {
    id: "att-003",
    studentId: "std-demo-3",
    studentName: "Aysha Shamna",
    studentPhone: "919447334455",
    courseId: "adaviyya",
    subjectId: "seerah",
    date: new Date().toISOString().split("T")[0],
    status: "LATE",
    notes: "Joined 15 mins late due to prayer",
    markedAt: new Date().toISOString(),
  },
  {
    id: "att-004",
    studentId: "std-demo-4",
    studentName: "Zainul Abideen",
    studentPhone: "919847998877",
    courseId: "adaviyya",
    subjectId: "seerah",
    date: new Date().toISOString().split("T")[0],
    status: "PRESENT",
    markedAt: new Date().toISOString(),
  },
];

export function getLocalAttendanceRecords(): AttendanceRecord[] {
  if (typeof window === "undefined") return INITIAL_DEMO_RECORDS;
  try {
    const raw = localStorage.getItem(LOCAL_ATTENDANCE_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_ATTENDANCE_KEY, JSON.stringify(INITIAL_DEMO_RECORDS));
      return INITIAL_DEMO_RECORDS;
    }
    return JSON.parse(raw) as AttendanceRecord[];
  } catch {
    return INITIAL_DEMO_RECORDS;
  }
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
      await supabase.from("attendance").upsert({
        id: updatedRecord.id,
        student_id: updatedRecord.studentId,
        course_id: updatedRecord.courseId,
        subject_id: updatedRecord.subjectId,
        attendance_date: updatedRecord.date,
        status: updatedRecord.status,
        notes: updatedRecord.notes || null,
        marked_at: updatedRecord.markedAt,
      });
    } catch {
      // Gracefully continue with local storage
    }
  }

  return updatedRecord;
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
📞 Support: +91 98460 12345`;

  return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
}
