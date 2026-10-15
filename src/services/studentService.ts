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

/**
 * Resolves or inserts a student into Supabase `students` (and `profiles` if authenticated).
 * Resiliently maps input fields to database columns:
 * - full_name / name
 * - whatsapp_num / whatsapp_number / phone
 * - district / place
 */
export async function saveOrUpdateStudentInSupabase(params: {
  fullName: string;
  whatsappNum: string;
  district?: string;
  userId?: string;
}): Promise<DbStudent | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const cleanPhone = (params.whatsappNum || "").replace(/\D/g, "");
  const cleanName = (params.fullName || "").trim();
  const cleanDistrict = (params.district || "Kerala").trim();
  let userId = params.userId || null;

  if (!cleanName && !cleanPhone) return null;

  try {
    if (!userId) {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) userId = authData.user.id;
      } catch {}
    }

    // 1. Look up existing student by phone or userId
    let existingStudent: any = null;

    if (userId) {
      const { data: byUser } = await supabase
        .from("students")
        .select("*")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (byUser) existingStudent = byUser;
    }

    if (!existingStudent && cleanPhone) {
      const { data: byNum, error: errNum } = await supabase
        .from("students")
        .select("*")
        .eq("whatsapp_num", cleanPhone)
        .limit(1)
        .maybeSingle();

      if (!errNum && byNum) {
        existingStudent = byNum;
      } else {
        const { data: byNumber } = await supabase
          .from("students")
          .select("*")
          .eq("whatsapp_number", cleanPhone)
          .limit(1)
          .maybeSingle();
        if (byNumber) existingStudent = byNumber;
      }
    }

    // 2. If student exists, update with latest details
    if (existingStudent && existingStudent.id) {
      const updateAttempts = [
        {
          full_name: cleanName,
          whatsapp_num: cleanPhone,
          whatsapp_number: cleanPhone,
          district: cleanDistrict,
          place: cleanDistrict,
          ...(userId ? { user_id: userId } : {}),
        },
        {
          full_name: cleanName,
          whatsapp_num: cleanPhone,
          district: cleanDistrict,
          ...(userId ? { user_id: userId } : {}),
        },
        {
          full_name: cleanName,
          whatsapp_number: cleanPhone,
          district: cleanDistrict,
          place: cleanDistrict,
          ...(userId ? { user_id: userId } : {}),
        },
        {
          full_name: cleanName,
          district: cleanDistrict,
        },
      ];

      for (const payload of updateAttempts) {
        const { data: updated, error: upErr } = await supabase
          .from("students")
          .update(payload)
          .eq("id", existingStudent.id)
          .select()
          .maybeSingle();

        if (!upErr && updated) {
          existingStudent = updated;
          break;
        }
      }

      if (userId) {
        try {
          await supabase.from("profiles").upsert({
            id: userId,
            full_name: cleanName,
            whatsapp_num: cleanPhone,
            district: cleanDistrict,
          });
        } catch {}
      }

      return {
        id: existingStudent.id,
        user_id: existingStudent.user_id || userId || undefined,
        full_name: existingStudent.full_name || cleanName,
        whatsapp_num: existingStudent.whatsapp_num || existingStudent.whatsapp_number || cleanPhone,
        district: existingStudent.district || existingStudent.place || cleanDistrict,
        created_at: existingStudent.created_at || new Date().toISOString(),
      };
    }

    // 3. Insert brand new student into Supabase
    const insertAttempts = [
      {
        full_name: cleanName,
        whatsapp_num: cleanPhone,
        whatsapp_number: cleanPhone,
        district: cleanDistrict,
        place: cleanDistrict,
        ...(userId ? { user_id: userId } : {}),
      },
      {
        full_name: cleanName,
        whatsapp_num: cleanPhone,
        district: cleanDistrict,
        ...(userId ? { user_id: userId } : {}),
      },
      {
        full_name: cleanName,
        whatsapp_number: cleanPhone,
        district: cleanDistrict,
        place: cleanDistrict,
        ...(userId ? { user_id: userId } : {}),
      },
      {
        full_name: cleanName,
        whatsapp_number: cleanPhone,
        district: cleanDistrict,
        ...(userId ? { user_id: userId } : {}),
      },
      {
        full_name: cleanName,
        whatsapp_num: cleanPhone,
        place: cleanDistrict,
        ...(userId ? { user_id: userId } : {}),
      },
      {
        full_name: cleanName,
        whatsapp_num: cleanPhone,
      },
    ];

    for (const payload of insertAttempts) {
      const { data: inserted, error: inErr } = await supabase
        .from("students")
        .insert(payload as any)
        .select()
        .single();

      if (!inErr && inserted) {
        if (userId) {
          try {
            await supabase.from("profiles").upsert({
              id: userId,
              full_name: cleanName,
              whatsapp_num: cleanPhone,
              district: cleanDistrict,
            });
          } catch {}
        }

        return {
          id: inserted.id,
          user_id: inserted.user_id || userId || undefined,
          full_name: inserted.full_name || cleanName,
          whatsapp_num: inserted.whatsapp_num || inserted.whatsapp_number || cleanPhone,
          district: inserted.district || inserted.place || cleanDistrict,
          created_at: inserted.created_at || new Date().toISOString(),
        };
      }
    }

    console.warn("Could not insert student in any candidate schema variation.");
  } catch (err) {
    console.error("saveOrUpdateStudentInSupabase exception:", err);
  }

  return null;
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

  const cleanPhone = (whatsappNum || "").replace(/\D/g, "");
  const cleanName = (fullName || "").trim();
  const cleanDistrict = (district || "Kerala").trim();
  const resolvedTxId = upiTxId.trim() || `PROOF_${Date.now().toString().slice(-6)}`;
  const normalizedCourseId = courseId === "shamail-muhammadiyya" ? "shamail" : courseId;

  // 1. If Supabase is configured, resolve/insert student and payment into live PostgreSQL tables
  if (isSupabaseConfigured && supabase) {
    try {
      // Step A: Always resolve or insert real student record in Supabase to get real database UUID
      let studentData: DbStudent | null = await saveOrUpdateStudentInSupabase({
        fullName: cleanName,
        whatsappNum: cleanPhone,
        district: cleanDistrict,
      });

      if (!studentData) {
        throw new Error("Failed to resolve or create student record in Supabase.");
      }

      sessionRegisteredLeads.set(cleanPhone, studentData);

      // Step B: Deduplicate pending payment for same student & course
      let paymentData: any = null;
      let paymentError: any = null;

      const { data: existingPendingPayment } = await supabase
        .from("payments")
        .select("*")
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
            .select("*")
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

        let res = await supabase
          .from("payments")
          .insert(insertPayload)
          .select("*")
          .single();

        if (res.error && res.error.message?.includes("screenshot_url")) {
          // Retry without screenshot_url column if not present in schema
          delete insertPayload.screenshot_url;
          res = await supabase
            .from("payments")
            .insert(insertPayload)
            .select("*")
            .single();
        }

        paymentData = res.data;
        paymentError = res.error;
      }

      if (paymentData) {
        if (screenshotUrl) paymentData.screenshot_url = screenshotUrl;
        paymentData.student = studentData;
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

        // Instant cross-tab broadcast
        try {
          const bc = new BroadcastChannel("hanoon_registration_channel");
          bc.postMessage({ type: "NEW_REGISTRATION", student: studentData, payment: paymentData });
          bc.close();
        } catch {}

        try {
          localStorage.setItem("hanoon_last_registration_ping", Date.now().toString());
        } catch {}
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
  const mergedStudents: DbStudent[] = [];
  const seenIds = new Set<string>();

  if (isSupabaseConfigured && supabase) {
    try {
      const [stuRes, profRes] = await Promise.all([
        supabase.from("students").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      ]);

      if (stuRes.data) {
        for (const s of stuRes.data) {
          if (s.id && !seenIds.has(s.id)) {
            seenIds.add(s.id);
            mergedStudents.push(s);
          }
        }
      }

      if (profRes.data) {
        for (const p of profRes.data) {
          if (p.role === "student" && p.id && !seenIds.has(p.id)) {
            seenIds.add(p.id);
            mergedStudents.push({
              id: p.id,
              user_id: p.id,
              full_name: p.full_name || p.email?.split("@")[0] || "Student",
              whatsapp_num: p.whatsapp_num || "",
              district: p.district || "Kerala",
              created_at: p.created_at || new Date().toISOString(),
            });
          }
        }
      }

      const cleanMerged = mergedStudents.filter((s) => {
        const clean = (s.full_name || "").trim().toLowerCase();
        return clean !== "dummy" && clean !== "test" && clean !== "test student" && clean !== "demo" && clean !== "sample";
      });
      return cleanMerged;
    } catch (e) {
      console.warn("Supabase students fetch failed, checking local storage:", e);
    }
  }

  // Fallback to local storage ONLY if Supabase is unconfigured
  if (!isSupabaseConfigured && typeof window !== "undefined") {
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

  // 2. If student lead already registered with real database UUID, reuse session record
  const sessionLead = sessionRegisteredLeads.get(cleanPhone);
  if (sessionLead && !sessionLead.id.startsWith("stu-") && !sessionLead.id.startsWith("std_")) {
    return sessionLead;
  }

  // 3. Check sessionStorage fallback
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem(`hanoon_session_lead_${cleanPhone}`);
      if (cached) {
        const student: DbStudent = JSON.parse(cached);
        if (!student.id.startsWith("stu-") && !student.id.startsWith("std_")) {
          sessionRegisteredLeads.set(cleanPhone, student);
          return student;
        }
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

  let savedStudent: DbStudent | null = null;

  // Insert or update in live Supabase database
  if (isSupabaseConfigured && supabase) {
    try {
      savedStudent = await saveOrUpdateStudentInSupabase({
        fullName: cleanName,
        whatsappNum: cleanPhone,
        district: cleanDistrict,
      });
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
    } catch (e) {
      console.warn("Local storage save error in saveStudentLead:", e);
    }
  }

  return savedStudent;
}

let lastUnifiedFetchError: string | null = null;

export function getLastUnifiedFetchError(): string | null {
  return lastUnifiedFetchError;
}

export interface FetchUnifiedRegistrationsResult {
  data: UnifiedStudentRegistration[];
  error: string | null;
}

/**
 * Fetches all real student registrations combined with their payment records from Supabase.
 * - Bypasses strict filtering to return ALL records (PENDING, APPROVED, REJECTED, UNPAID, or NULL).
 * - Queries payments, students, and profiles with resilient fallback if relationships fail.
 * - Captures exact Supabase / RLS error messages to prevent blank UI.
 */
export async function fetchUnifiedRegistrationsDetailed(): Promise<FetchUnifiedRegistrationsResult> {
  const result: UnifiedStudentRegistration[] = [];
  lastUnifiedFetchError = null;
  const errorMessages: string[] = [];

  // 1. Fetch payments, students, profiles, and courses concurrently from Supabase
  let payments: DbPayment[] = [];
  let allStudents: any[] = [];
  let allProfiles: any[] = [];
  const courseMap = new Map<string, string>();
  let fetchedPaymentsFromSupabase = false;
  let fetchedStudentsFromSupabase = false;

  // 1. Try server-side admin data route (bypasses RLS with service role key if available, zero PGRST125)
  if (typeof window !== "undefined") {
    try {
      const apiRes = await fetch("/api/admin/data");
      if (apiRes.ok) {
        const json = await apiRes.json();
        if (json && Array.isArray(json.payments)) {
          payments = json.payments;
          if (payments.length > 0) fetchedPaymentsFromSupabase = true;
          if (Array.isArray(json.students)) {
            allStudents = json.students;
            if (allStudents.length > 0) fetchedStudentsFromSupabase = true;
          }
          if (Array.isArray(json.profiles)) {
            allProfiles = json.profiles;
          }
          if (Array.isArray(json.courses)) {
            for (const c of json.courses) {
              if (c.id && c.title_en) courseMap.set(c.id, c.title_en);
            }
          }
        }
      }
    } catch {
      // Fall through to direct Supabase client
    }
  }

  // 2. Direct Supabase Client: Query with relational join or fallback to clean separate queries
  if (isSupabaseConfigured && supabase && (!fetchedPaymentsFromSupabase || (payments.length === 0 && allStudents.length === 0))) {
    // A. Query Payments with relational join or plain select
    try {
      let rawPayments: any[] | null = null;
      let payFetchError: any = null;

      const relPay = await supabase
        .from("payments")
        .select("*, students(*), courses(*)")
        .order("submitted_at", { ascending: false });

      if (!relPay.error && Array.isArray(relPay.data) && relPay.data.length > 0) {
        rawPayments = relPay.data;
        fetchedPaymentsFromSupabase = true;
      } else {
        let plainPay = await supabase
          .from("payments")
          .select("*")
          .order("submitted_at", { ascending: false });

        if (plainPay.error) {
          plainPay = await supabase.from("payments").select("*");
        }

        if (!plainPay.error && Array.isArray(plainPay.data)) {
          rawPayments = plainPay.data;
          fetchedPaymentsFromSupabase = true;
        } else if (plainPay.error) {
          payFetchError = plainPay.error;
        }
      }

      if (payFetchError) {
        const msg = payFetchError.message || "Failed to query payments table.";
        errorMessages.push(`Payments: ${msg} (code: ${payFetchError.code || "RLS/Schema"})`);
        console.warn("Supabase payments fetch error:", payFetchError);
      } else if (rawPayments) {
        payments = rawPayments as DbPayment[];
      }
    } catch (payErr) {
      const msg = payErr instanceof Error ? payErr.message : String(payErr);
      errorMessages.push(`Payments Query Exception: ${msg}`);
      console.warn("Payments query exception:", payErr);
    }

    // B. Query Students
    try {
      let stuRes = await supabase
        .from("students")
        .select("*")
        .order("created_at", { ascending: false });

      if (stuRes.error) {
        stuRes = await supabase.from("students").select("*");
      }

      if (!stuRes.error && Array.isArray(stuRes.data)) {
        allStudents = stuRes.data;
        fetchedStudentsFromSupabase = true;
      } else if (stuRes.error) {
        errorMessages.push(`Students: ${stuRes.error.message} (code: ${stuRes.error.code || "RLS/Schema"})`);
        console.warn("Supabase students fetch error:", stuRes.error);
      }
    } catch (stuErr) {
      const msg = stuErr instanceof Error ? stuErr.message : String(stuErr);
      errorMessages.push(`Students Query Exception: ${msg}`);
      console.warn("Students query exception:", stuErr);
    }

    // C. Query Profiles (To augment student resolution or catch students stored in profiles)
    try {
      const profRes = await supabase.from("profiles").select("*");
      if (profRes.data) {
        allProfiles = profRes.data;
      } else if (profRes.error) {
        console.warn("Profiles query notice:", profRes.error.message);
      }
    } catch (profErr) {
      console.warn("Profiles query exception:", profErr);
    }

    // D. Query Courses for human-readable course titles
    try {
      const { data: cData } = await supabase.from("courses").select("id, title_en, title_ml, fee_amount");
      if (cData) {
        for (const c of cData) {
          if (c.id && c.title_en) courseMap.set(c.id, c.title_en);
        }
      }
    } catch {}
  }

  // Fallback to local storage ONLY if Supabase is completely unconfigured (offline demo mode)
  if (!isSupabaseConfigured && typeof window !== "undefined") {
    try {
      const local = localStorage.getItem(LOCAL_PAYMENTS_KEY);
      if (local) {
        const parsed = JSON.parse(local) as DbPayment[];
        if (parsed.length > 0) payments = parsed;
      }
    } catch (e) {
      console.warn("Local payments read error:", e);
    }

    try {
      const local = localStorage.getItem(LOCAL_STUDENTS_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) allStudents = parsed;
      }
    } catch (e) {
      console.warn("Local students read error:", e);
    }
  }

  // Build lookup maps for robust in-memory student resolution
  const studentById = new Map<string, any>();
  const studentByUserId = new Map<string, any>();
  const studentByPhone = new Map<string, any>();

  // 1. Populate from students table
  for (const s of allStudents) {
    if (s.id) {
      studentById.set(s.id, s);
      studentById.set(String(s.id).toLowerCase(), s);
    }
    if (s.user_id) {
      studentByUserId.set(s.user_id, s);
      studentByUserId.set(String(s.user_id).toLowerCase(), s);
    }
    const pClean = (s.whatsapp_number || s.whatsapp_num || s.phone || "").replace(/\D/g, "");
    if (pClean && pClean.length >= 7) {
      studentByPhone.set(pClean.slice(-10), s);
      studentByPhone.set(pClean, s);
    }
  }

  // 2. Augment from profiles table
  for (const pr of allProfiles) {
    const profObj = {
      id: pr.id,
      user_id: pr.id,
      full_name: pr.full_name || pr.name || pr.email?.split("@")[0] || "Registered Student",
      whatsapp_num: pr.whatsapp_num || pr.whatsapp_number || pr.phone || "",
      district: pr.district || pr.place || "Kerala",
      created_at: pr.created_at || new Date().toISOString(),
    };
    if (pr.id) {
      if (!studentById.has(pr.id)) {
        studentById.set(pr.id, profObj);
        studentById.set(String(pr.id).toLowerCase(), profObj);
      }
      if (!studentByUserId.has(pr.id)) {
        studentByUserId.set(pr.id, profObj);
        studentByUserId.set(String(pr.id).toLowerCase(), profObj);
      }
    }
    const prPhone = (pr.whatsapp_num || pr.whatsapp_number || pr.phone || "").replace(/\D/g, "");
    if (prPhone && prPhone.length >= 7 && !studentByPhone.has(prPhone.slice(-10))) {
      studentByPhone.set(prPhone.slice(-10), profObj);
      studentByPhone.set(prPhone, profObj);
    }
  }

  // Add all payments WITHOUT dropping any record by status or duplicate phone
  const seenPaymentIds = new Set<string>();

  for (const p of payments) {
    if (p.id && seenPaymentIds.has(p.id)) continue;
    if (p.id) seenPaymentIds.add(p.id);

    // Resolve student reliably from join or in-memory map
    const txDigits = (p.upi_txid || "").replace(/\D/g, "");
    const paymentPhone = ((p as any).whatsapp_number || (p as any).whatsapp_num || (p as any).phone || "").replace(/\D/g, "");

    const joined = (p as any).students
      ? (Array.isArray((p as any).students) ? (p as any).students[0] : (p as any).students)
      : p.student;

    const studentKey = p.student_id ? String(p.student_id).trim() : "";
    const lookupStudent =
      (studentKey ? studentById.get(studentKey) || studentById.get(studentKey.toLowerCase()) : null) ||
      (studentKey ? studentByUserId.get(studentKey) || studentByUserId.get(studentKey.toLowerCase()) : null) ||
      (paymentPhone ? studentByPhone.get(paymentPhone.slice(-10)) || studentByPhone.get(paymentPhone) : null) ||
      (txDigits.length >= 10 ? studentByPhone.get(txDigits.slice(-10)) : null);

    const phone =
      joined?.whatsapp_number ||
      joined?.whatsapp_num ||
      joined?.phone ||
      lookupStudent?.whatsapp_number ||
      lookupStudent?.whatsapp_num ||
      lookupStudent?.phone ||
      paymentPhone ||
      "";

    const resolvedName =
      joined?.full_name ||
      joined?.name ||
      lookupStudent?.full_name ||
      lookupStudent?.name ||
      (p as any).student_name ||
      (p as any).full_name ||
      (p as any).name ||
      (p.upi_txid ? `Student (${p.upi_txid.slice(0, 10)})` : "Registered Student");

    const district =
      joined?.district ||
      joined?.place ||
      lookupStudent?.district ||
      lookupStudent?.place ||
      (p as any).district ||
      (p as any).place ||
      "Kerala";

    // Normalize payment status: PENDING, APPROVED, REJECTED, or UNPAID
    const rawStatus = (p.status || "").toUpperCase();
    let paymentStatus: "PENDING" | "APPROVED" | "REJECTED" | "UNPAID" = "PENDING";
    if (rawStatus === "APPROVED" || rawStatus === "VERIFIED" || rawStatus === "ACTIVE" || rawStatus === "PAID") {
      paymentStatus = "APPROVED";
    } else if (rawStatus === "REJECTED" || rawStatus === "FAILED" || rawStatus === "CANCELLED") {
      paymentStatus = "REJECTED";
    } else if (rawStatus === "UNPAID") {
      paymentStatus = "UNPAID";
    } else {
      paymentStatus = "PENDING";
    }

    const courseTitle =
      p.course?.title_en ||
      courseMap.get(p.course_id) ||
      COURSE_NAMES_MAP[p.course_id] ||
      (p.course_id ? p.course_id.charAt(0).toUpperCase() + p.course_id.slice(1) : "Adaviyya Track");

    result.push({
      id: p.id || `pay-${Math.random().toString(36).substring(2, 9)}`,
      studentId: joined?.id || lookupStudent?.id || p.student_id,
      fullName: resolvedName,
      whatsappNum: phone,
      district,
      courseChoice: courseTitle,
      courseId: p.course_id || "adaviyya",
      registrationDate: p.submitted_at || (p as any).created_at || p.updated_at || new Date().toISOString(),
      paymentStatus,
      amount: p.amount ?? 500,
      upiTxId: p.upi_txid || (p as any).transaction_id || "Pending Verification",
      screenshotUrl: p.screenshot_url || (p as any).screenshotUrl || (joined as any)?.screenshot_url || (lookupStudent as any)?.screenshot_url || "",
      paymentId: p.id,
      rejectionReason: p.rejection_reason || undefined,
    });
  }

  // 2. Add registered students from students and profiles who have NO payment records at all
  const existingStudentIds = new Set(result.map((r) => r.studentId).filter(Boolean));
  const existingPhones = new Set(
    result
      .map((r) => (r.whatsappNum || "").replace(/\D/g, "").slice(-10))
      .filter((p) => p && p.length >= 7)
  );

  // Add students from students table
  for (const s of allStudents) {
    const cleanP = (s.whatsapp_num || s.whatsapp_number || "").replace(/\D/g, "").slice(-10);
    if (existingStudentIds.has(s.id) || (cleanP && existingPhones.has(cleanP))) continue;

    result.push({
      id: `reg-${s.id}`,
      studentId: s.id,
      fullName: s.full_name || "Enrolled Student",
      whatsappNum: s.whatsapp_num || s.whatsapp_number || "",
      district: s.district || s.place || "Kerala",
      courseChoice: "Adaviyya (General Admission)",
      courseId: "adaviyya",
      registrationDate: s.created_at || new Date().toISOString(),
      paymentStatus: "PENDING",
      amount: 500,
      upiTxId: "Pending Payment",
      paymentId: undefined,
    });
    existingStudentIds.add(s.id);
    if (cleanP) existingPhones.add(cleanP);
  }

  // Add registered student accounts from profiles table
  for (const prof of allProfiles) {
    if (prof.role && prof.role !== "student") continue; // Exclude admins/teachers
    const cleanP = (prof.whatsapp_num || prof.whatsapp_number || "").replace(/\D/g, "").slice(-10);
    if (existingStudentIds.has(prof.id) || (cleanP && existingPhones.has(cleanP))) continue;

    result.push({
      id: `prof-${prof.id}`,
      studentId: prof.id,
      fullName: prof.full_name || prof.email?.split("@")[0] || "Registered Student",
      whatsappNum: prof.whatsapp_num || prof.whatsapp_number || "",
      district: prof.district || prof.place || "Kerala",
      courseChoice: "Adaviyya (General Admission)",
      courseId: "adaviyya",
      registrationDate: prof.created_at || new Date().toISOString(),
      paymentStatus: "PENDING",
      amount: 500,
      upiTxId: "Pending Payment",
      paymentId: undefined,
    });
    existingStudentIds.add(prof.id);
    if (cleanP) existingPhones.add(cleanP);
  }

  // Strictly filter out any dummy / test student entries so no dummy data appears in /admin
  const isDummyStudent = (name?: string, phone?: string) => {
    const n = (name || "").trim().toLowerCase();
    const p = (phone || "").replace(/\D/g, "");
    return (
      !n ||
      n === "test" ||
      n === "test student" ||
      n === "demo" ||
      n === "demo student" ||
      n === "dummy" ||
      n === "dummy student" ||
      n === "sample" ||
      n === "sample student" ||
      n === "undefined" ||
      n === "null" ||
      n.startsWith("dummy ") ||
      p === "1234567890" ||
      p === "0000000000" ||
      p === "9999999999" ||
      p === "1111111111"
    );
  };

  const cleanResult = result.filter(
    (item) => !isDummyStudent(item.fullName, item.whatsappNum)
  );

  // Sort newest first
  cleanResult.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());

  const finalError = errorMessages.length > 0 ? errorMessages.join(" | ") : null;
  lastUnifiedFetchError = finalError;

  return {
    data: cleanResult,
    error: finalError,
  };
}

export async function fetchUnifiedRegistrations(): Promise<UnifiedStudentRegistration[]> {
  const res = await fetchUnifiedRegistrationsDetailed();
  return res.data;
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

  // 1. If paymentId exists, update the existing payment in Supabase instantly
  if (paymentId) {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error: upErr } = await supabase
          .from("payments")
          .update({
            status: newStatus,
            rejection_reason: rejectionReason || null,
            updated_at: now,
          })
          .eq("id", paymentId);

        if (upErr) {
          console.error("Supabase payment update error:", upErr.message);
        }
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
  const generatedPayId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : undefined;
  const upiTx = `ADMIN_${Date.now().toString().slice(-8)}`;

  if (isSupabaseConfigured && supabase) {
    try {
      const insertPayload: any = {
        student_id: studentId,
        course_id: courseId,
        upi_txid: upiTx,
        status: newStatus as PaymentStatus,
        amount: amount,
        rejection_reason: rejectionReason || null,
        submitted_at: now,
        updated_at: now,
      };
      if (generatedPayId) {
        insertPayload.id = generatedPayId;
      }
      const { error: insErr } = await supabase.from("payments").insert(insertPayload);
      if (insErr) {
        console.warn("Supabase new payment insert error:", insErr.message);
      }
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
        id: generatedPayId || `pay-${Date.now()}`,
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
  let broadcastChannel: any = null;

  if (isSupabaseConfigured && supabase) {
    try {
      const channelId = `admin_registrations_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      channel = supabase
        .channel(channelId)
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
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "profiles" },
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
    window.addEventListener("storage", (e) => {
      if (e.key?.includes("payment") || e.key?.includes("student") || e.key?.includes("hanoon")) {
        onChange();
      }
    });

    try {
      broadcastChannel = new BroadcastChannel("hanoon_registration_channel");
      broadcastChannel.onmessage = () => {
        onChange();
      };
    } catch {}
  }

  return () => {
    if (channel && supabase) {
      supabase.removeChannel(channel);
    }
    if (broadcastChannel) {
      try {
        broadcastChannel.close();
      } catch {}
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


