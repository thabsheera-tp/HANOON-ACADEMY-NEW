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
  upiTxId?: string;
  screenshotUrl?: string;
}

/**
 * Uploads payment screenshot to Supabase Storage bucket 'payment-screenshots'
 * Falls back to base64 Data URL if storage bucket is not configured.
 */
export async function uploadPaymentScreenshot(file: File): Promise<string> {
  if (isSupabaseConfigured && supabase) {
    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `screenshot_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${fileExt}`;
      const { data, error } = await supabase.storage
        .from("payment-screenshots")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: urlData } = supabase.storage
          .from("payment-screenshots")
          .getPublicUrl(fileName);
        if (urlData?.publicUrl) {
          return urlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn("Supabase storage upload error, falling back to base64 data URL:", e);
    }
  }

  // Resilient fallback to base64 Data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export interface RegistrationResult {
  student: DbStudent;
  payment: DbPayment;
  isLiveSupabase: boolean;
}

// Session-level in-flight deduplication / debouncing maps
const inFlightPaymentPromises = new Map<string, Promise<RegistrationResult>>();
const inFlightLeadPromises = new Map<string, Promise<DbStudent | null>>();

// Session-level persistent caches to prevent duplicate database calls for the same user session
const sessionRegisteredLeads = new Map<string, DbStudent>();
const sessionRegisteredPayments = new Map<string, RegistrationResult>();

export async function registerStudentAndPayment(
  params: RegisterStudentAndPaymentParams
): Promise<RegistrationResult> {
  const cleanPhone = (params.whatsappNum || "").replace(/\D/g, "");
  const normalizedCourseId =
    params.courseId === "shamail-muhammadiyya" ? "shamail" : params.courseId;
  const inFlightKey = `${cleanPhone}_${normalizedCourseId}`;

  // 1. If this exact payment is already in flight, reuse the promise
  if (inFlightPaymentPromises.has(inFlightKey)) {
    return inFlightPaymentPromises.get(inFlightKey)!;
  }

  // 2. If already registered in this user session with same proof/tx and status, reuse session record
  if (sessionRegisteredPayments.has(inFlightKey)) {
    const existing = sessionRegisteredPayments.get(inFlightKey)!;
    // If incoming params do not have a new screenshot and have the same or empty txId, return cached
    if (!params.screenshotUrl && (!params.upiTxId || params.upiTxId === existing.payment?.upi_txid)) {
      return existing;
    }
  }

  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem(`hanoon_session_pay_${inFlightKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        sessionRegisteredPayments.set(inFlightKey, parsed);
        if (!params.screenshotUrl && (!params.upiTxId || params.upiTxId === parsed.payment?.upi_txid)) {
          return parsed;
        }
      }
    } catch {}
  }

  const promise = executeRegisterStudentAndPayment(params);
  inFlightPaymentPromises.set(inFlightKey, promise);

  try {
    const result = await promise;
    sessionRegisteredPayments.set(inFlightKey, result);
    if (result.student) {
      sessionRegisteredLeads.set(cleanPhone, result.student);
    }
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(`hanoon_session_pay_${inFlightKey}`, JSON.stringify(result));
      } catch {}
    }
    return result;
  } finally {
    inFlightPaymentPromises.delete(inFlightKey);
  }
}

async function executeRegisterStudentAndPayment(
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
    upiTxId = "",
    screenshotUrl = "",
  } = params;

  const resolvedTxId = upiTxId.trim() || `PROOF_${Date.now().toString().slice(-6)}`;

  // 1. If Supabase is configured, insert into live PostgreSQL tables
  if (isSupabaseConfigured && supabase) {
    try {
      const cleanPhone = whatsappNum.replace(/\D/g, "");
      const normalizedCourseId =
        courseId === "shamail-muhammadiyya" ? "shamail" : courseId;

      // Step A: Check for existing student record by phone (or session cache)
      let studentData: DbStudent | null = sessionRegisteredLeads.get(cleanPhone) || null;
      if (!studentData) {
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
      }

      if (studentData) {
        sessionRegisteredLeads.set(cleanPhone, studentData);
      }

      if (!studentData) {
        throw new Error("Failed to resolve or create student record in Supabase.");
      }

      // Step B: Deduplicate pending payment for same student & course
      let paymentData: any = null;
      let paymentError: any = null;

      const { data: existingPendingPayment } = await supabase
        .from("payments")
        .select(`
          *,
          student:students(*)
        `)
        .eq("student_id", studentData.id)
        .eq("course_id", normalizedCourseId)
        .eq("status", "PENDING")
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingPendingPayment) {
        // Re-use or update pending record with latest screenshot/ref
        if (screenshotUrl && existingPendingPayment.screenshot_url !== screenshotUrl) {
          const { data: updatedPay } = await supabase
            .from("payments")
            .update({ screenshot_url: screenshotUrl, upi_txid: resolvedTxId, amount })
            .eq("id", existingPendingPayment.id)
            .select(`*, student:students(*)`)
            .maybeSingle();
          paymentData = updatedPay || existingPendingPayment;
        } else {
          paymentData = existingPendingPayment;
        }
      } else {
        // Try inserting new payment with screenshot_url
        const insertPayload: any = {
          student_id: studentData.id,
          course_id: normalizedCourseId,
          upi_txid: resolvedTxId,
          amount: amount,
          status: "PENDING" as PaymentStatus,
        };
        if (screenshotUrl) {
          insertPayload.screenshot_url = screenshotUrl;
        }

        const res = await supabase
          .from("payments")
          .insert(insertPayload)
          .select(`
            *,
            student:students(*)
          `)
          .single();

      if (res.error && res.error.message?.includes("screenshot_url")) {
        // Retry without screenshot_url column if not present in schema
        delete insertPayload.screenshot_url;
        const retryRes = await supabase
          .from("payments")
          .insert(insertPayload)
          .select(`
            *,
            student:students(*)
          `)
          .single();
        paymentData = retryRes.data;
        paymentError = retryRes.error;
      } else {
        paymentData = res.data;
        paymentError = res.error;
      }
    }

      if (paymentData && screenshotUrl) {
        paymentData.screenshot_url = screenshotUrl;
      }

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
    upi_txid: resolvedTxId,
    status: "PENDING",
    amount: amount,
    submitted_at: now,
    updated_at: now,
    screenshot_url: screenshotUrl || undefined,
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
  screenshotUrl?: string;
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
  const cleanPhone = (profile.whatsappNum || "").replace(/\D/g, "");
  if (!cleanPhone) return null;

  // 1. If currently in-flight, return active promise
  if (inFlightLeadPromises.has(cleanPhone)) {
    return inFlightLeadPromises.get(cleanPhone)!;
  }

  // 2. If student lead already registered in this user session, reuse session record
  if (sessionRegisteredLeads.has(cleanPhone)) {
    return sessionRegisteredLeads.get(cleanPhone)!;
  }

  // 3. Check sessionStorage fallback
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem(`hanoon_session_lead_${cleanPhone}`);
      if (cached) {
        const student: DbStudent = JSON.parse(cached);
        sessionRegisteredLeads.set(cleanPhone, student);
        return student;
      }
    } catch {}
  }

  const promise = executeSaveStudentLead(profile);
  inFlightLeadPromises.set(cleanPhone, promise);

  try {
    const result = await promise;
    if (result) {
      sessionRegisteredLeads.set(cleanPhone, result);
      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(`hanoon_session_lead_${cleanPhone}`, JSON.stringify(result));
        } catch {}
      }
    }
    return result;
  } finally {
    inFlightLeadPromises.delete(cleanPhone);
  }
}

async function executeSaveStudentLead(profile: {
  fullName: string;
  whatsappNum: string;
  district: string;
}): Promise<DbStudent | null> {
  const cleanPhone = profile.whatsappNum.replace(/\D/g, "");
  const cleanName = profile.fullName.trim();
  const cleanDistrict = profile.district.trim() || "Kerala";

  let savedStudent: DbStudent | null = sessionRegisteredLeads.get(cleanPhone) || null;

  if (!savedStudent && isSupabaseConfigured && supabase) {
    try {
      // Upsert by phone - check for existing student first
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
        // NOTE: Do NOT auto-create a dummy PENDING payment here.
        // Ghost pending entries confuse the admin dashboard.
        // Only real payments submitted by the student should appear.
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

      // NOTE: Do NOT auto-create a dummy local pending payment here.
      // Only real payments submitted by the student should appear in the admin dashboard.

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

  // 1. Fetch payments and students concurrently from Supabase
  let payments: DbPayment[] = [];
  let allStudents: DbStudent[] = [];
  let fetchedPaymentsFromSupabase = false;
  let fetchedStudentsFromSupabase = false;

  if (isSupabaseConfigured && supabase) {
    try {
      const [payRes, stuRes] = await Promise.all([
        supabase
          .from("payments")
          .select(`
            *,
            student:students(*)
          `)
          .order("submitted_at", { ascending: false }),
        supabase
          .from("students")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (!payRes.error && payRes.data !== null) {
        payments = payRes.data as DbPayment[];
        fetchedPaymentsFromSupabase = true;
      } else {
        // Fallback: Query payments without join in case relationship is missing
        const plainPay = await supabase
          .from("payments")
          .select("*")
          .order("submitted_at", { ascending: false });
        if (!plainPay.error && plainPay.data !== null) {
          payments = plainPay.data as DbPayment[];
          fetchedPaymentsFromSupabase = true;
        }
      }

      if (!stuRes.error && stuRes.data !== null) {
        allStudents = stuRes.data as DbStudent[];
        fetchedStudentsFromSupabase = true;
      }
    } catch (err) {
      console.warn("Supabase fetchUnifiedRegistrations query error:", err);
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

  // Build lookup maps for fast, robust student resolution
  const studentById = new Map<string, DbStudent>();
  const studentByPhone = new Map<string, DbStudent>();
  for (const s of allStudents) {
    if (s.id) studentById.set(s.id, s);
    const pClean = (s.whatsapp_num || "").replace(/\D/g, "");
    if (pClean) studentByPhone.set(pClean, s);
  }

  // Add all payments with strict PENDING default
  // Deduplicate by payment ID first, then by student+course for PENDING entries
  const seenPaymentIds = new Set<string>();
  const pendingStudentCourseKeys = new Set<string>();

  // Sort payments so APPROVED/REJECTED take priority over PENDING for deduplication
  const sortedPayments = [...payments].sort((a, b) => {
    const priorityA = a.status === "APPROVED" ? 0 : a.status === "REJECTED" ? 1 : 2;
    const priorityB = b.status === "APPROVED" ? 0 : b.status === "REJECTED" ? 1 : 2;
    if (priorityA !== priorityB) return priorityA - priorityB;
    // Within same status, newest first
    const dateA = new Date(a.submitted_at || a.updated_at || 0).getTime();
    const dateB = new Date(b.submitted_at || b.updated_at || 0).getTime();
    return dateB - dateA;
  });

  for (const p of sortedPayments) {
    // Skip duplicate payment IDs
    if (seenPaymentIds.has(p.id)) continue;
    seenPaymentIds.add(p.id);

    // Resolve student reliably even if Supabase relation was null
    const student =
      p.student ||
      studentById.get(p.student_id) ||
      studentByPhone.get((p.upi_txid || "").replace(/\D/g, ""));
    const phone = student?.whatsapp_num || (p as any).whatsapp_num || "";
    const resolvedName = student?.full_name || (p as any).student_name || (p as any).full_name || "Enrolled Student";

    // Strictly APPROVED only if explicitly approved in admin; otherwise strictly PENDING
    const isApproved = p.status === "APPROVED" || (p.status as string) === "verified";
    const isRejected = p.status === "REJECTED";
    const paymentStatus: "PENDING" | "APPROVED" | "REJECTED" = isApproved
      ? "APPROVED"
      : isRejected
      ? "REJECTED"
      : "PENDING";

    // For PENDING payments, deduplicate by student+course to show only the most recent
    if (paymentStatus === "PENDING") {
      const studentCourseKey = `${p.student_id}_${p.course_id || "adaviyya"}`;
      if (pendingStudentCourseKeys.has(studentCourseKey)) continue;
      pendingStudentCourseKeys.add(studentCourseKey);
    }

    const courseTitle =
      p.course?.title_en ||
      COURSE_NAMES_MAP[p.course_id] ||
      (p.course_id ? p.course_id.charAt(0).toUpperCase() + p.course_id.slice(1) : "Adaviyya Track");

    result.push({
      id: p.id,
      studentId: student?.id || p.student_id,
      fullName: resolvedName,
      whatsappNum: phone,
      district: student?.district || "Kerala",
      courseChoice: courseTitle,
      courseId: p.course_id,
      registrationDate: p.submitted_at || p.updated_at || new Date().toISOString(),
      paymentStatus,
      amount: p.amount || 500,
      upiTxId: p.upi_txid || "-",
      screenshotUrl: p.screenshot_url || (p as any).screenshotUrl || (student as any)?.screenshot_url || "",
      paymentId: p.id,
      rejectionReason: p.rejection_reason || undefined,
    });
  }

  // 2. Add registered students who have NO payment records at all (leads without payments)
  const existingStudentIds = new Set(result.map((r) => r.studentId));

  for (const s of allStudents) {
    // Skip if this student already appears via a payment record
    if (existingStudentIds.has(s.id)) continue;

    // Skip students with obviously dummy/test phone numbers
    const cleanP = (s.whatsapp_num || "").replace(/\D/g, "");
    if (!cleanP || cleanP.length < 7) continue;

    result.push({
      id: `reg-${s.id}`,
      studentId: s.id,
      fullName: s.full_name || "Enrolled Student",
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
    existingStudentIds.add(s.id);
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

export interface PurgeResult {
  purgedStudents: number;
  purgedPayments: number;
  remainingCount: number;
}

export interface PurgeOptions {
  includeRejected?: boolean;
}

/**
 * Purges duplicate registrations by phone number and removes dummy test records
 * (and optionally rejected test entries) from both Supabase and localStorage.
 */
export async function purgeDuplicateAndDummyRegistrations(
  options: PurgeOptions = { includeRejected: true }
): Promise<PurgeResult> {
  const includeRejected = options.includeRejected !== false;
  let purgedStudentsCount = 0;
  let purgedPaymentsCount = 0;

  // Helper to identify dummy / test students
  const isDummy = (name?: string, phone?: string) => {
    const n = (name || "").trim().toLowerCase();
    const p = (phone || "").replace(/\D/g, "");
    const isDummyName =
      !n ||
      n === "test" ||
      n === "test student" ||
      n === "demo" ||
      n === "dummy" ||
      n === "sample" ||
      n === "undefined" ||
      n === "null" ||
      n === "student" ||
      n === "abc" ||
      n === "xyz" ||
      n.startsWith("test ") ||
      n.startsWith("demo ");
    const isDummyPhone =
      !p ||
      p.length < 6 ||
      p === "1234567890" ||
      p === "0000000000" ||
      p === "9999999999" ||
      p === "1111111111" ||
      p === "123456789" ||
      p === "9876543210";
    return isDummyName || isDummyPhone;
  };

  // 1. Live Supabase Purge
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: allDbStudents } = await supabase.from("students").select("*");
      const { data: allDbPayments } = await supabase.from("payments").select("*");

      const students = allDbStudents || [];
      const payments = allDbPayments || [];

      // A. Dummy Students & Orphaned/Dummy Payments
      const dummyStudentIds: string[] = [];
      const validStudents: DbStudent[] = [];

      for (const s of students) {
        if (isDummy(s.full_name, s.whatsapp_num)) {
          dummyStudentIds.push(s.id);
        } else {
          validStudents.push(s);
        }
      }

      if (dummyStudentIds.length > 0) {
        const { error: delDummyPayErr } = await supabase
          .from("payments")
          .delete()
          .in("student_id", dummyStudentIds);
        if (!delDummyPayErr) {
          purgedPaymentsCount += dummyStudentIds.length;
        }

        const { error: delDummyStuErr } = await supabase
          .from("students")
          .delete()
          .in("id", dummyStudentIds);
        if (!delDummyStuErr) {
          purgedStudentsCount += dummyStudentIds.length;
        }
      }

      // B. Deduplicate Valid Students by Normalized Phone Number
      const studentsByPhone = new Map<string, DbStudent[]>();
      for (const s of validStudents) {
        const phoneKey = (s.whatsapp_num || "").replace(/\D/g, "") || s.full_name.trim().toLowerCase();
        const list = studentsByPhone.get(phoneKey) || [];
        list.push(s);
        studentsByPhone.set(phoneKey, list);
      }

      const duplicateStudentIdsToDelete: string[] = [];
      for (const [, group] of studentsByPhone.entries()) {
        if (group.length > 1) {
          // Sort priorities: 1) Has APPROVED payment, 2) Has screenshot, 3) Newest created_at
          group.sort((a, b) => {
            const aPayments = payments.filter((p) => p.student_id === a.id);
            const bPayments = payments.filter((p) => p.student_id === b.id);

            const aHasApproved = aPayments.some((p) => p.status === "APPROVED");
            const bHasApproved = bPayments.some((p) => p.status === "APPROVED");
            if (aHasApproved && !bHasApproved) return -1;
            if (!aHasApproved && bHasApproved) return 1;

            const aHasProof = aPayments.some((p) => Boolean(p.screenshot_url));
            const bHasProof = bPayments.some((p) => Boolean(p.screenshot_url));
            if (aHasProof && !bHasProof) return -1;
            if (!aHasProof && bHasProof) return 1;

            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });

          const keeper = group[0];
          const duplicates = group.slice(1);

          for (const dup of duplicates) {
            duplicateStudentIdsToDelete.push(dup.id);
            // Reassign payments to keeper before deleting duplicate student row
            await supabase
              .from("payments")
              .update({ student_id: keeper.id })
              .eq("student_id", dup.id);
          }
        }
      }

      if (duplicateStudentIdsToDelete.length > 0) {
        const { error: delDupStuErr } = await supabase
          .from("students")
          .delete()
          .in("id", duplicateStudentIdsToDelete);
        if (!delDupStuErr) {
          purgedStudentsCount += duplicateStudentIdsToDelete.length;
        }
      }

      // C. Deduplicate Payments for each Student + Course
      const { data: updatedPayments } = await supabase.from("payments").select("*");
      const currentPayments = updatedPayments || payments;

      const paymentsByStudentCourse = new Map<string, DbPayment[]>();
      for (const p of currentPayments) {
        if (dummyStudentIds.includes(p.student_id)) continue;
        const key = `${p.student_id}_${p.course_id || "adaviyya"}`;
        const list = paymentsByStudentCourse.get(key) || [];
        list.push(p);
        paymentsByStudentCourse.set(key, list);
      }

      const duplicatePaymentIdsToDelete: string[] = [];
      for (const [, group] of paymentsByStudentCourse.entries()) {
        if (group.length > 1) {
          // Priority: 1. APPROVED, 2. Has screenshot proof, 3. Newest date
          group.sort((a, b) => {
            if (a.status === "APPROVED" && b.status !== "APPROVED") return -1;
            if (a.status !== "APPROVED" && b.status === "APPROVED") return 1;

            if (a.screenshot_url && !b.screenshot_url) return -1;
            if (!a.screenshot_url && b.screenshot_url) return 1;

            const aDate = new Date(a.submitted_at || a.updated_at || 0).getTime();
            const bDate = new Date(b.submitted_at || b.updated_at || 0).getTime();
            return bDate - aDate;
          });

          const dupsPay = group.slice(1);
          for (const dp of dupsPay) {
            duplicatePaymentIdsToDelete.push(dp.id);
          }
        }
      }

      if (duplicatePaymentIdsToDelete.length > 0) {
        const { error: delDupPayErr } = await supabase
          .from("payments")
          .delete()
          .in("id", duplicatePaymentIdsToDelete);
        if (!delDupPayErr) {
          purgedPaymentsCount += duplicatePaymentIdsToDelete.length;
        }
      }

      // D. Purge REJECTED test payments & orphaned test students
      if (includeRejected) {
        const rejectedPayments = currentPayments.filter((p) => p.status === "REJECTED");
        if (rejectedPayments.length > 0) {
          const rejectedPayIds = rejectedPayments.map((p) => p.id);
          const { error: delRejPayErr } = await supabase
            .from("payments")
            .delete()
            .in("id", rejectedPayIds);
          if (!delRejPayErr) {
            purgedPaymentsCount += rejectedPayIds.length;
          }

          // Also remove student records that only had rejected test payments
          const rejectedStudentIds = Array.from(new Set(rejectedPayments.map((p) => p.student_id)));
          for (const sId of rejectedStudentIds) {
            const hasOtherPayments = currentPayments.some(
              (p) => p.student_id === sId && p.status !== "REJECTED"
            );
            if (!hasOtherPayments) {
              const { error: delRejStuErr } = await supabase
                .from("students")
                .delete()
                .eq("id", sId);
              if (!delRejStuErr) {
                purgedStudentsCount++;
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn("Supabase purge duplicate registrations error:", err);
    }
  }

  // 2. LocalStorage Purge & Clean
  if (typeof window !== "undefined") {
    try {
      const localStudentsRaw: DbStudent[] = JSON.parse(
        localStorage.getItem(LOCAL_STUDENTS_KEY) || "[]"
      );
      const localPaymentsRaw: DbPayment[] = JSON.parse(
        localStorage.getItem(LOCAL_PAYMENTS_KEY) || "[]"
      );

      // Clean dummy students
      const cleanStudents = localStudentsRaw.filter(
        (s) => !isDummy(s.full_name, s.whatsapp_num)
      );

      // Deduplicate students by phone
      const seenPhones = new Set<string>();
      const dedupedStudents: DbStudent[] = [];
      for (const s of cleanStudents) {
        const p = (s.whatsapp_num || "").replace(/\D/g, "");
        if (!seenPhones.has(p)) {
          seenPhones.add(p);
          dedupedStudents.push(s);
        } else {
          purgedStudentsCount++;
        }
      }

      const validStudentIds = new Set(dedupedStudents.map((s) => s.id));

      // Filter and deduplicate payments
      let cleanPayments = localPaymentsRaw.filter((p) => {
        if (p.student && isDummy(p.student.full_name, p.student.whatsapp_num)) return false;
        if (includeRejected && p.status === "REJECTED") {
          purgedPaymentsCount++;
          return false;
        }
        return true;
      });

      const seenPayKeys = new Set<string>();
      const dedupedPayments: DbPayment[] = [];
      for (const p of cleanPayments) {
        const payKey = `${p.student_id}_${p.course_id || "adaviyya"}`;
        if (!seenPayKeys.has(payKey)) {
          seenPayKeys.add(payKey);
          dedupedPayments.push(p);
        } else {
          purgedPaymentsCount++;
        }
      }

      localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(dedupedStudents));
      localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(dedupedPayments));

      window.dispatchEvent(new CustomEvent("hanoon_students_updated"));
      window.dispatchEvent(new CustomEvent("hanoon_payment_event", { detail: { status: "PURGED" } }));
    } catch (e) {
      console.warn("Local storage purge error:", e);
    }
  }

  const remaining = await fetchUnifiedRegistrations();

  return {
    purgedStudents: purgedStudentsCount,
    purgedPayments: purgedPaymentsCount,
    remainingCount: remaining.length,
  };
}

/**
 * Safely deletes a student registration and/or payment record from Supabase and local cache
 */
export async function deleteStudentRegistrationDirect(params: {
  studentId: string;
  paymentId?: string;
}): Promise<boolean> {
  const { studentId, paymentId } = params;

  // 1. Delete from Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      if (paymentId) {
        const { error: payErr } = await supabase
          .from("payments")
          .delete()
          .eq("id", paymentId);
        if (payErr) console.warn("Supabase delete payment error:", payErr.message);
      }

      // Check if student has any remaining payments before deleting student row
      const { data: remainingPays } = await supabase
        .from("payments")
        .select("id")
        .eq("student_id", studentId)
        .limit(1);

      if (!remainingPays || remainingPays.length === 0) {
        const { error: stuErr } = await supabase
          .from("students")
          .delete()
          .eq("id", studentId);
        if (stuErr) console.warn("Supabase delete student error:", stuErr.message);
      }
    } catch (err) {
      console.warn("Supabase delete registration error:", err);
    }
  }

  // 2. Delete from LocalStorage
  if (typeof window !== "undefined") {
    try {
      if (paymentId) {
        const localPays: DbPayment[] = JSON.parse(
          localStorage.getItem(LOCAL_PAYMENTS_KEY) || "[]"
        );
        const filteredPays = localPays.filter((p) => p.id !== paymentId);
        localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(filteredPays));
      }

      const localStudents: DbStudent[] = JSON.parse(
        localStorage.getItem(LOCAL_STUDENTS_KEY) || "[]"
      );
      const remainingLocalPays: DbPayment[] = JSON.parse(
        localStorage.getItem(LOCAL_PAYMENTS_KEY) || "[]"
      );
      const hasOtherPay = remainingLocalPays.some((p) => p.student_id === studentId);
      if (!hasOtherPay) {
        const filteredStudents = localStudents.filter((s) => s.id !== studentId);
        localStorage.setItem(LOCAL_STUDENTS_KEY, JSON.stringify(filteredStudents));
      }

      window.dispatchEvent(new CustomEvent("hanoon_students_updated"));
      window.dispatchEvent(new CustomEvent("hanoon_payment_event", { detail: { action: "delete", id: paymentId } }));
    } catch (e) {
      console.error("Local storage delete error:", e);
    }
  }

  return true;
}


