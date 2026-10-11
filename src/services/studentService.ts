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
      const cleanPhone = whatsappNum.replace(/\D/g, "");
      const normalizedCourseId =
        courseId === "shamail-muhammadiyya" ? "shamail" : courseId;

      // Step A: Check for existing student record by phone
      let studentData: DbStudent | null = null;
      const { data: existingStudent } = await supabase
        .from("students")
        .select("*")
        .eq("whatsapp_num", cleanPhone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingStudent) {
        // Update details
        const { data: updatedStudent } = await supabase
          .from("students")
          .update({
            full_name: fullName.trim(),
            district: district.trim(),
          })
          .eq("id", existingStudent.id)
          .select()
          .single();

        studentData = updatedStudent || existingStudent;
      } else {
        const { data: newStudent, error: studentError } = await supabase
          .from("students")
          .insert({
            full_name: fullName.trim(),
            whatsapp_num: cleanPhone,
            district: district.trim(),
          })
          .select()
          .single();

        if (studentError || !newStudent) {
          throw new Error(`Failed to create student in Supabase: ${studentError?.message}`);
        }
        studentData = newStudent;
      }

      if (!studentData) {
        throw new Error("Failed to resolve or create student record in Supabase.");
      }

      // Step B: Insert payment record with PENDING status
      const { data: paymentData, error: paymentError } = await supabase
        .from("payments")
        .insert({
          student_id: studentData.id,
          course_id: normalizedCourseId,
          upi_txid: upiTxId.trim(),
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

      // Mirror to local storage for instant hydration
      saveLocalBackup(studentData, paymentData);

      // Dispatch local event for real-time listener across browser tabs
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("hanoon_payment_event", {
            detail: {
              id: paymentData.id,
              upi_txid: upiTxId.trim(),
              status: "PENDING",
              payment: paymentData,
            },
          })
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

  // 2. Fallback / Offline LocalStorage Mode
  const generatedStudentId = `std_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const generatedPaymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const now = new Date().toISOString();

  const fallbackStudent: DbStudent = {
    id: generatedStudentId,
    full_name: fullName.trim(),
    whatsapp_num: whatsappNum.replace(/\D/g, ""),
    district: district.trim(),
    created_at: now,
  };

  const fallbackPayment: DbPayment = {
    id: generatedPaymentId,
    student_id: generatedStudentId,
    course_id: courseId,
    upi_txid: upiTxId.trim(),
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
      new CustomEvent("hanoon_payment_event", {
        detail: {
          id: fallbackPayment.id,
          upi_txid: upiTxId.trim(),
          status: "PENDING",
          payment: fallbackPayment,
        },
      })
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

  return [];
}

export interface UnifiedStudentRegistration {
  id: string;
  studentId: string;
  fullName: string;
  whatsappNum: string;
  district: string;
  courseChoice: string;
  courseId: string;
  registrationDate: string;
  paymentStatus: "PENDING" | "APPROVED" | "REJECTED" | "UNPAID";
  amount: number;
  upiTxId: string;
  paymentId?: string;
  rejectionReason?: string;
}

const COURSE_NAMES_MAP: Record<string, string> = {
  adaviyya: "Adaviyya (Seerah & Ethics)",
  "home-tuition": "Online Home Tuition (1-on-1)",
  "fashion-designing": "Fashion Designing Track",
  shamail: "Shama'il al-Muhammadiyya",
  "shamail-muhammadiyya": "Shama'il al-Muhammadiyya",
  tajweed: "Quran & Tajweed Recitation",
  burdah: "Burdah Live Gathering",
  haddad: "Ratib al-Haddad Core Hub",
};

/**
 * Saves a student lead when registering via the student registration modal
 */
export async function saveStudentLead(profile: {
  fullName: string;
  whatsappNum: string;
  district: string;
}): Promise<DbStudent | null> {
  const cleanPhone = profile.whatsappNum.replace(/\D/g, "");
  const cleanName = profile.fullName.trim();
  const cleanDistrict = profile.district.trim() || "Kerala";

  let savedStudent: DbStudent | null = null;

  if (isSupabaseConfigured && supabase) {
    try {
      // Upsert by phone
      const { data: existing } = await supabase
        .from("students")
        .select("*")
        .eq("whatsapp_num", cleanPhone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { data: updated } = await supabase
          .from("students")
          .update({
            full_name: cleanName,
            district: cleanDistrict,
          })
          .eq("id", existing.id)
          .select()
          .single();
        savedStudent = updated || existing;
      } else {
        const { data: inserted, error } = await supabase
          .from("students")
          .insert({
            full_name: cleanName,
            whatsapp_num: cleanPhone,
            district: cleanDistrict,
          })
          .select()
          .single();

        if (!error && inserted) {
          savedStudent = inserted;
        }
      }

      if (savedStudent) {
        // Ensure pending payment record exists in Supabase so status is Pending Verification by default
        const { data: existingPay } = await supabase
          .from("payments")
          .select("id")
          .eq("student_id", savedStudent.id)
          .limit(1)
          .maybeSingle();

        if (!existingPay) {
          await supabase.from("payments").insert({
            student_id: savedStudent.id,
            course_id: "adaviyya",
            upi_txid: `PENDING_${Date.now().toString().slice(-6)}`,
            status: "PENDING",
            amount: 500,
          });
        }
      }
    } catch (e) {
      console.warn("Supabase saveStudentLead error:", e);
    }
  }

  if (!savedStudent) {
    savedStudent = {
      id: `stu-${Date.now()}`,
      full_name: cleanName,
      whatsapp_num: cleanPhone,
      district: cleanDistrict,
      created_at: new Date().toISOString(),
    };
  }

  // Update local storage
  if (typeof window !== "undefined") {
    try {
      const localStudents: DbStudent[] = JSON.parse(
        localStorage.getItem(LOCAL_STUDENTS_KEY) || "[]"
      );
      const nextStudents = [
        savedStudent,
        ...localStudents.filter((s) => s.whatsapp_num !== cleanPhone && s.id !== savedStudent?.id),
      ];
      localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(nextStudents));

      // Also ensure local pending payment exists
      const localPayments: DbPayment[] = JSON.parse(
        localStorage.getItem(LOCAL_PAYMENTS_KEY) || "[]"
      );
      const hasPay = localPayments.some((p) => p.student_id === savedStudent?.id);
      if (!hasPay) {
        const fallbackPendingPay: DbPayment = {
          id: `pay-${Date.now()}`,
          student_id: savedStudent.id,
          course_id: "adaviyya",
          upi_txid: `PENDING_${Date.now().toString().slice(-6)}`,
          status: "PENDING",
          amount: 500,
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          student: savedStudent,
        };
        localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify([fallbackPendingPay, ...localPayments]));
      }

      window.dispatchEvent(new CustomEvent("hanoon_students_updated"));
      window.dispatchEvent(new CustomEvent("hanoon_payment_event", { detail: { status: "PENDING" } }));
    } catch (e) {
      console.warn("Local storage save error in saveStudentLead:", e);
    }
  }

  return savedStudent;
}

/**
 * Fetches all real student registrations combined with their payment records from Supabase
 */
export async function fetchUnifiedRegistrations(): Promise<UnifiedStudentRegistration[]> {
  const result: UnifiedStudentRegistration[] = [];
  const processedKeys = new Set<string>();

  // 1. Fetch payments with student relation from Supabase
  let payments: DbPayment[] = [];
  let fetchedPaymentsFromSupabase = false;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          student:students(*)
        `)
        .order("submitted_at", { ascending: false });

      if (!error && data !== null) {
        payments = data as DbPayment[];
        fetchedPaymentsFromSupabase = true;
      } else if (error) {
        console.warn("Supabase payments query error:", error.message);
      }
    } catch (err) {
      console.warn("Supabase fetchUnifiedRegistrations payments query error:", err);
    }
  }

  // Fallback to local storage ONLY if Supabase is unconfigured or completely unavailable
  if (!fetchedPaymentsFromSupabase && typeof window !== "undefined") {
    try {
      const local = localStorage.getItem(LOCAL_PAYMENTS_KEY);
      if (local) {
        payments = JSON.parse(local) as DbPayment[];
      }
    } catch (e) {
      console.warn("Local payments read error:", e);
    }
  }

  // Add all payments with strict PENDING default
  for (const p of payments) {
    const student = p.student;
    const phone = student?.whatsapp_num || "";
    const key = `${p.id}-${phone}`;
    processedKeys.add(key);

    const courseTitle =
      p.course?.title_en ||
      COURSE_NAMES_MAP[p.course_id] ||
      (p.course_id ? p.course_id.charAt(0).toUpperCase() + p.course_id.slice(1) : "Adaviyya Track");

    // Strictly APPROVED only if explicitly approved in admin; otherwise strictly PENDING
    const isApproved = p.status === "APPROVED" || (p.status as string) === "verified";
    const isRejected = p.status === "REJECTED";
    const paymentStatus: "PENDING" | "APPROVED" | "REJECTED" = isApproved
      ? "APPROVED"
      : isRejected
      ? "REJECTED"
      : "PENDING";

    result.push({
      id: p.id,
      studentId: student?.id || p.student_id,
      fullName: student?.full_name || "Enrolled Student",
      whatsappNum: phone,
      district: student?.district || "Kerala",
      courseChoice: courseTitle,
      courseId: p.course_id,
      registrationDate: p.submitted_at || p.updated_at || new Date().toISOString(),
      paymentStatus,
      amount: p.amount || 500,
      upiTxId: p.upi_txid || "-",
      paymentId: p.id,
      rejectionReason: p.rejection_reason || undefined,
    });
  }

  // 2. Fetch all registered students from Supabase to catch leads who registered
  let allStudents: DbStudent[] = [];
  let fetchedStudentsFromSupabase = false;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data !== null) {
        allStudents = data;
        fetchedStudentsFromSupabase = true;
      } else if (error) {
        console.warn("Supabase students query error:", error.message);
      }
    } catch (err) {
      console.warn("Supabase students query error:", err);
    }
  }

  // Fallback to local storage ONLY if Supabase is unconfigured or failed
  if (!fetchedStudentsFromSupabase && typeof window !== "undefined") {
    try {
      const local = localStorage.getItem(LOCAL_STUDENTS_KEY);
      if (local) {
        allStudents = JSON.parse(local) as DbStudent[];
      }
    } catch (e) {
      console.warn("Local students read error:", e);
    }
  }

  // Identify registered students not yet listed in payments
  const existingPhones = new Set(result.map((r) => r.whatsappNum.replace(/\D/g, "")));
  const existingStudentIds = new Set(result.map((r) => r.studentId));

  for (const s of allStudents) {
    const cleanP = (s.whatsapp_num || "").replace(/\D/g, "");
    if (!existingStudentIds.has(s.id) && !existingPhones.has(cleanP)) {
      result.push({
        id: `reg-${s.id}`,
        studentId: s.id,
        fullName: s.full_name,
        whatsappNum: s.whatsapp_num,
        district: s.district || "Kerala",
        courseChoice: "Adaviyya (General Admission)",
        courseId: "adaviyya",
        registrationDate: s.created_at || new Date().toISOString(),
        paymentStatus: "PENDING",
        amount: 500,
        upiTxId: "Pending Verification",
        paymentId: undefined,
      });
      existingPhones.add(cleanP);
    }
  }

  // Sort latest first
  return result.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
}

/**
 * Updates a student's payment status, creating an approved payment if student was unpaid
 */
export async function updateStudentPaymentStatusDirect(params: {
  studentId: string;
  paymentId?: string;
  newStatus: "PENDING" | "APPROVED" | "REJECTED";
  studentName: string;
  whatsappNum: string;
  courseId?: string;
  amount?: number;
  rejectionReason?: string;
}): Promise<boolean> {
  const {
    studentId,
    paymentId,
    newStatus,
    studentName,
    whatsappNum,
    courseId = "adaviyya",
    amount = 1500,
    rejectionReason,
  } = params;

  const now = new Date().toISOString();

  // 1. If paymentId exists, update the existing payment
  if (paymentId) {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from("payments")
          .update({
            status: newStatus,
            rejection_reason: rejectionReason || null,
            updated_at: now,
          })
          .eq("id", paymentId);
      } catch (e) {
        console.warn("Supabase payment update error:", e);
      }
    }

    if (typeof window !== "undefined") {
      try {
        const localPayments: DbPayment[] = JSON.parse(
          localStorage.getItem(LOCAL_PAYMENTS_KEY) || "[]"
        );
        const updated = localPayments.map((p) => {
          if (p.id === paymentId) {
            return {
              ...p,
              status: newStatus as PaymentStatus,
              rejection_reason: rejectionReason || null,
              updated_at: now,
            };
          }
          return p;
        });
        localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(updated));
        window.dispatchEvent(
          new CustomEvent("hanoon_payment_event", {
            detail: { id: paymentId, status: newStatus, rejection_reason: rejectionReason },
          })
        );
      } catch (e) {
        console.warn("Local storage update error:", e);
      }
    }
    return true;
  }

  // 2. If student had NO payment record and is marked APPROVED, insert new payment record
  const generatedPayId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `pay-${Date.now()}`;
  const upiTx = `ADMIN_${Date.now().toString().slice(-8)}`;

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("payments").insert({
        id: generatedPayId,
        student_id: studentId,
        course_id: courseId,
        upi_txid: upiTx,
        status: newStatus as PaymentStatus,
        amount: amount,
        rejection_reason: rejectionReason || null,
        submitted_at: now,
        updated_at: now,
      });
    } catch (e) {
      console.warn("Supabase new payment insert error:", e);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const localPayments: DbPayment[] = JSON.parse(
        localStorage.getItem(LOCAL_PAYMENTS_KEY) || "[]"
      );
      const newPay: DbPayment = {
        id: generatedPayId,
        student_id: studentId,
        course_id: courseId,
        upi_txid: upiTx,
        status: newStatus as PaymentStatus,
        amount: amount,
        submitted_at: now,
        updated_at: now,
        student: {
          id: studentId,
          full_name: studentName,
          whatsapp_num: whatsappNum,
          district: "Kerala",
          created_at: now,
        },
      };
      localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify([newPay, ...localPayments]));
      window.dispatchEvent(
        new CustomEvent("hanoon_payment_event", {
          detail: { id: generatedPayId, status: newStatus, payment: newPay },
        })
      );
    } catch (e) {
      console.warn("Local storage error:", e);
    }
  }

  return true;
}

/**
 * Subscribes to real-time student and payment changes across tabs and Supabase
 */
export function subscribeToStudentRegistrations(onChange: () => void): () => void {
  let channel: any = null;

  if (isSupabaseConfigured && supabase) {
    try {
      channel = supabase
        .channel("admin_student_registrations_realtime")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "students" },
          () => onChange()
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "payments" },
          () => onChange()
        )
        .subscribe();
    } catch (e) {
      console.warn("Supabase realtime subscription error:", e);
    }
  }

  const handleWindowUpdate = () => onChange();

  if (typeof window !== "undefined") {
    window.addEventListener("hanoon_payment_event", handleWindowUpdate);
    window.addEventListener("hanoon_students_updated", handleWindowUpdate);
  }

  return () => {
    if (channel && supabase) {
      supabase.removeChannel(channel);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("hanoon_payment_event", handleWindowUpdate);
      window.removeEventListener("hanoon_students_updated", handleWindowUpdate);
    }
  };
}

