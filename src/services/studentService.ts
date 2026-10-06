import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { DbStudent, DbPayment, PaymentStatus } from "@/types/supabase";

const LOCAL_STUDENTS_KEY = "hanoon_local_students";
const LOCAL_PAYMENTS_KEY = "hanoon_local_payments";

export interface RegisterStudentAndPaymentParams {
  fullName: string;
  whatsappNum: string;
  district: string;
  courseId: string;
  courseTitle: string;
  courseMalayalam?: string;
  amount: number;
  upiTxId: string;
}

export interface RegistrationResult {
  student: DbStudent;
  payment: DbPayment;
  isLiveSupabase: boolean;
}

export async function registerStudentAndPayment(
  params: RegisterStudentAndPaymentParams
): Promise<RegistrationResult> {
  const {
    fullName,
    whatsappNum,
    district,
    courseId,
    courseTitle,
    courseMalayalam = "",
    amount,
    upiTxId,
  } = params;

  // 1. If Supabase is configured, insert into live PostgreSQL tables
  if (isSupabaseConfigured && supabase) {
    try {
      // Step A: Insert student record
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .insert({
          full_name: fullName,
          whatsapp_num: whatsappNum,
          district: district,
        })
        .select()
        .single();

      if (studentError || !studentData) {
        throw new Error(`Failed to create student in Supabase: ${studentError?.message}`);
      }

      // Step B: Insert payment record with PENDING status
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .insert({
          student_id: studentData.id,
          course_id: courseId,
          upi_txid: upiTxId,
          amount: amount,
          status: "PENDING" as PaymentStatus,
        })
        .select(`
          *,
          student:students(*)
        `)
        .single();

      if (paymentError || !paymentData) {
        throw new Error(`Failed to submit payment to Supabase: ${paymentError?.message}`);
      }

      // Also mirror to local storage for quick offline retrieval
      saveLocalBackup(studentData, paymentData);

      // Dispatch local event for real-time listener
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("hanoon_payment_event", { detail: paymentData })
        );
      }

      return {
        student: studentData,
        payment: paymentData,
        isLiveSupabase: true,
      };
    } catch (err) {
      console.warn("Supabase insertion error, saving to local simulated storage:", err);
    }
  }

  // 2. Fallback / Local In-Memory & LocalStorage Mode
  const generatedStudentId = `std_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const generatedPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  const fallbackStudent: DbStudent = {
    id: generatedStudentId,
    full_name: fullName,
    whatsapp_num: whatsappNum,
    district: district,
    created_at: now,
  };

  const fallbackPayment: DbPayment = {
    id: generatedPaymentId,
    student_id: generatedStudentId,
    course_id: courseId,
    upi_txid: upiTxId,
    status: "PENDING",
    amount: amount,
    submitted_at: now,
    updated_at: now,
    student: fallbackStudent,
    course: {
      id: courseId,
      title_en: courseTitle,
      title_ml: courseMalayalam,
      subtitle: "",
      fee_amount: amount,
      duration: "",
      syllabus_summary: "",
      highlights: [],
      is_active: true,
      created_at: now,
    },
  };

  saveLocalBackup(fallbackStudent, fallbackPayment);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("hanoon_payment_event", { detail: fallbackPayment })
    );
  }

  return {
    student: fallbackStudent,
    payment: fallbackPayment,
    isLiveSupabase: false,
  };
}

function saveLocalBackup(student: DbStudent, payment: DbPayment) {
  if (typeof window === "undefined") return;
  try {
    const existingPayments: DbPayment[] = JSON.parse(
      localStorage.getItem(LOCAL_PAYMENTS_KEY) || "[]"
    );
    const updated = [payment, ...existingPayments.filter((p) => p.id !== payment.id)];
    localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(updated));

    const existingStudents: DbStudent[] = JSON.parse(
      localStorage.getItem(LOCAL_STUDENTS_KEY) || "[]"
    );
    const updatedStudents = [
      student,
      ...existingStudents.filter((s) => s.id !== student.id),
    ];
    localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(updatedStudents));
  } catch (e) {
    console.error("Local storage error:", e);
  }
}

export async function fetchStudents(): Promise<DbStudent[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data && data.length > 0) return data;
    } catch (e) {
      console.warn("Supabase students fetch failed, checking local storage:", e);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const local = localStorage.getItem(LOCAL_STUDENTS_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("Local students read failed:", e);
    }
  }

  return [
    { id: "std-01", full_name: "Aysha Mariyam", whatsapp_num: "9846012345", district: "Malappuram", created_at: "2026-03-28" },
    { id: "std-02", full_name: "Fathima Nihala", whatsapp_num: "9846056789", district: "Kozhikode", created_at: "2026-03-29" },
    { id: "std-03", full_name: "Muhammed Rashid", whatsapp_num: "9745012345", district: "Kannur", created_at: "2026-03-30" },
    { id: "std-04", full_name: "Zainaba K.", whatsapp_num: "9447012345", district: "Dubai, UAE", created_at: "2026-04-01" },
  ];
}

