import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export interface StudentFeeDetails {
  studentId: string;
  studentName: string;
  phone: string;
  courseId: string;
  courseName: string;
  totalFee: number;
  paidAmount: number;
  balanceFee: number;
  feeStatus: "PAID" | "PARTIAL" | "UNPAID";
}

export const COURSE_DEFAULT_FEES: Record<string, number> = {
  adaviyya: 3000,
  "home-tuition": 2000,
  "fashion-designing": 2500,
  shamail: 1500,
  "shamail-muhammadiyya": 1500,
  tajweed: 1500,
  burdah: 1200,
  haddad: 1200,
};

export const COURSE_DISPLAY_NAMES: Record<string, string> = {
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
 * Returns default course fee amount.
 */
export function getDefaultCourseFee(courseId: string): number {
  const normalized = (courseId || "").toLowerCase().trim();
  return COURSE_DEFAULT_FEES[normalized] ?? 3000;
}

/**
 * Calculates fee status based on totalFee and paidAmount.
 */
export function calculateFeeStatus(totalFee: number, paidAmount: number): "PAID" | "PARTIAL" | "UNPAID" {
  const balance = Math.max(0, totalFee - paidAmount);
  if (balance <= 0) return "PAID";
  if (paidAmount > 0) return "PARTIAL";
  return "UNPAID";
}

/**
 * Persists an edited student fee (course, total_fee, paid_amount) to Supabase.
 * Automatically recalculates balance_fee = total_fee - paid_amount.
 */
export async function updateStudentFeeInSupabase(params: {
  studentId: string;
  courseId?: string;
  totalFee: number;
  paidAmount: number;
}): Promise<{ success: boolean; balanceFee: number; error?: string }> {
  const { studentId, courseId, totalFee, paidAmount } = params;
  const balanceFee = Math.max(0, totalFee - paidAmount);

  try {
    if (isSupabaseConfigured && supabase) {
      const updatePayload: Record<string, any> = {
        total_fee: totalFee,
        paid_amount: paidAmount,
        balance_fee: balanceFee,
        updated_at: new Date().toISOString(),
      };
      if (courseId) {
        updatePayload.enrolled_course_id = courseId;
      }

      const { error } = await supabase
        .from("students")
        .update(updatePayload)
        .eq("id", studentId);

      if (error) {
        console.warn("Supabase students fee update warning:", error.message);
        // Fallback: try matching by user_id
        await supabase
          .from("students")
          .update(updatePayload)
          .eq("user_id", studentId);
      }
    }

    // Persist to local cache for instant UI refresh
    if (typeof window !== "undefined") {
      try {
        const cacheKey = `hanoon_fee_${studentId}`;
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ totalFee, paidAmount, balanceFee, courseId, updatedAt: new Date().toISOString() })
        );
        window.dispatchEvent(
          new CustomEvent("hanoon_fee_updated", {
            detail: { studentId, courseId, totalFee, paidAmount, balanceFee },
          })
        );
      } catch (e) {
        console.warn("Local storage cache fee update error:", e);
      }
    }

    return { success: true, balanceFee };
  } catch (err: any) {
    console.error("Failed to update student fee:", err);
    return { success: false, balanceFee, error: err?.message || "Failed to update fee" };
  }
}

/**
 * Fetches fee details for a student by ID or phone number.
 */
export async function getStudentFeeDetails(
  studentId: string,
  phone?: string,
  fallbackCourseId: string = "adaviyya"
): Promise<StudentFeeDetails> {
  const defaultTotal = getDefaultCourseFee(fallbackCourseId);
  let resolvedTotal = defaultTotal;
  let resolvedPaid = 0;
  let resolvedCourse = fallbackCourseId;
  let studentName = "Enrolled Student";

  // Check local cache first
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(`hanoon_fee_${studentId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.totalFee !== undefined) resolvedTotal = Number(parsed.totalFee);
        if (parsed.paidAmount !== undefined) resolvedPaid = Number(parsed.paidAmount);
        if (parsed.courseId) resolvedCourse = parsed.courseId;
      }
    } catch {}
  }

  // Fetch from Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase.from("students").select("id, full_name, total_fee, paid_amount, balance_fee, enrolled_course_id, whatsapp_number");
      if (studentId) {
        query = query.or(`id.eq.${studentId},user_id.eq.${studentId}`);
      } else if (phone) {
        const cleanPhone = phone.replace(/\D/g, "");
        query = query.ilike("whatsapp_number", `%${cleanPhone.slice(-10)}%`);
      }

      const { data, error } = await query.limit(1).maybeSingle();
      if (!error && data) {
        if (data.full_name) studentName = data.full_name;
        if (data.total_fee !== null && data.total_fee !== undefined) resolvedTotal = Number(data.total_fee);
        if (data.paid_amount !== null && data.paid_amount !== undefined) resolvedPaid = Number(data.paid_amount);
        if (data.enrolled_course_id) resolvedCourse = data.enrolled_course_id;
      }

      // Check sum of approved payments from payments table
      if (studentId) {
        const { data: payRows } = await supabase
          .from("payments")
          .select("amount, status")
          .eq("student_id", studentId);

        if (payRows && payRows.length > 0) {
          const approvedSum = payRows
            .filter((p: any) => ["APPROVED", "VERIFIED", "PAID"].includes((p.status || "").toUpperCase()))
            .reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
          
          if (approvedSum > 0 && resolvedPaid === 0) {
            resolvedPaid = approvedSum;
          }
        }
      }
    } catch (err) {
      console.warn("Fee details fetch from Supabase warning:", err);
    }
  }

  const balanceFee = Math.max(0, resolvedTotal - resolvedPaid);
  const feeStatus = calculateFeeStatus(resolvedTotal, resolvedPaid);
  const courseName = COURSE_DISPLAY_NAMES[resolvedCourse] || resolvedCourse;

  return {
    studentId,
    studentName,
    phone: phone || "",
    courseId: resolvedCourse,
    courseName,
    totalFee: resolvedTotal,
    paidAmount: resolvedPaid,
    balanceFee,
    feeStatus,
  };
}

/**
 * Submits an installment or balance fee payment for a student.
 */
export async function submitInstallmentPayment(params: {
  studentId: string;
  courseId: string;
  amount: number;
  upiTxId: string;
  screenshotUrl?: string;
  installmentNote?: string;
}): Promise<{ success: boolean; paymentId?: string; error?: string }> {
  const { studentId, courseId, amount, upiTxId, screenshotUrl, installmentNote } = params;

  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("payments")
        .insert({
          student_id: studentId,
          course_id: courseId,
          amount,
          upi_txid: upiTxId,
          screenshot_url: screenshotUrl || null,
          status: "PENDING",
          fee_type: "INSTALLMENT",
          installment_note: installmentNote || "Balance Fee Installment",
          submitted_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        // If column fee_type does not exist yet, fallback to standard insert
        const fallbackRes = await supabase
          .from("payments")
          .insert({
            student_id: studentId,
            course_id: courseId,
            amount,
            upi_txid: upiTxId,
            screenshot_url: screenshotUrl || null,
            status: "PENDING",
            submitted_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (fallbackRes.error) {
          throw fallbackRes.error;
        }
        return { success: true, paymentId: fallbackRes.data?.id };
      }

      return { success: true, paymentId: data?.id };
    }

    return { success: true, paymentId: `local-inst-${Date.now()}` };
  } catch (err: any) {
    console.error("Failed to submit installment payment:", err);
    return { success: false, error: err?.message || "Failed to submit installment payment" };
  }
}
