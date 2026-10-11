import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { LiveClassSession } from "@/services/teacherService";
import { fetchUnifiedRegistrations, UnifiedStudentRegistration } from "@/services/studentService";

export interface WhatsAppStudentRecipient {
  name: string;
  phone: string;
  course: string;
  waUrl: string;
  status?: "pending" | "sent" | "failed";
}

export interface WhatsAppAlertPayload {
  type: "LIVE_CLASS_REMINDER" | "PAYMENT_VERIFIED";
  studentName: string;
  phone: string;
  courseName?: string;
  liveLink?: string;
}

export interface WhatsAppDispatchResult {
  success: boolean;
  message: string;
  waUrl: string;
  simulated: boolean;
}

/**
 * Normalizes phone numbers to standard international format (defaults to India +91)
 */
export function formatWhatsAppPhone(rawPhone: string): string {
  const clean = (rawPhone || "").replace(/\D/g, "");
  if (!clean) return "";
  if (clean.length === 10) {
    return `91${clean}`;
  }
  if (clean.startsWith("91") && clean.length === 12) {
    return clean;
  }
  if (!clean.startsWith("91")) {
    return `91${clean}`;
  }
  return clean;
}

/**
 * Requirement 1 Message Format:
 * "ഹലോ [Student_Name], നിങ്ങളുടെ [Course_Name] ക്ലാസ് 15 മിനിറ്റിനുള്ളിൽ ആരംഭിക്കുന്നു! ജോയിൻ ചെയ്യാൻ താഴെ ക്ലിക്ക് ചെയ്യുക: [Live_Link]"
 */
export function buildLiveClassReminderMessage(
  studentName: string,
  courseName: string,
  liveLink: string
): string {
  const sName = studentName?.trim() || "വിദ്യാർത്ഥി";
  const cName = courseName?.trim() || "ഹനൂൻ അക്കാദമി";
  const link = liveLink?.trim() || "https://hanoonacademynew.vercel.app";
  return `ഹലോ ${sName}, നിങ്ങളുടെ ${cName} ക്ലാസ് 15 മിനിറ്റിനുള്ളിൽ ആരംഭിക്കുന്നു! ജോയിൻ ചെയ്യാൻ താഴെ ക്ലിക്ക് ചെയ്യുക: ${link}`;
}

/**
 * Generates direct wa.me link for Live Class 15-minute reminder
 */
export function getLiveClassReminderWhatsAppUrl(
  phone: string,
  studentName: string,
  courseName: string,
  liveLink: string
): string {
  const formattedPhone = formatWhatsAppPhone(phone);
  const text = buildLiveClassReminderMessage(studentName, courseName, liveLink);
  if (formattedPhone) {
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Requirement 2 Message Format:
 * "ഹലോ [Student_Name], ഹനൂൻ അക്കാദമിയിലേക്ക് സ്വാഗതം! നിങ്ങളുടെ പേയ്മെന്റ് സ്വീകരിച്ചിരിക്കുന്നു. നിങ്ങളുടെ കോഴ്സ് ഇപ്പോൾ ആക്ടീവ് ആണ്."
 */
export function buildPaymentVerificationMessage(studentName: string): string {
  const sName = studentName?.trim() || "വിദ്യാർത്ഥി";
  return `ഹലോ ${sName}, ഹനൂൻ അക്കാദമിയിലേക്ക് സ്വാഗതം! നിങ്ങളുടെ പേയ്മെന്റ് സ്വീകരിച്ചിരിക്കുന്നു. നിങ്ങളുടെ കോഴ്സ് ഇപ്പോൾ ആക്ടീവ് ആണ്.`;
}

/**
 * Generates direct wa.me link for Payment Verification approval
 */
export function getPaymentVerificationWhatsAppUrl(
  phone: string,
  studentName: string
): string {
  const formattedPhone = formatWhatsAppPhone(phone);
  const text = buildPaymentVerificationMessage(studentName);
  if (formattedPhone) {
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Dispatches an automated WhatsApp alert:
 * - Calls server-side webhook hook (/api/whatsapp/send) for Twilio / Interakt integration
 * - Returns generated wa.me URL for 1-click browser invocation
 */
export async function sendWhatsAppAlert(
  payload: WhatsAppAlertPayload
): Promise<WhatsAppDispatchResult> {
  const formattedPhone = formatWhatsAppPhone(payload.phone);
  let messageText = "";
  let waUrl = "";

  if (payload.type === "PAYMENT_VERIFIED") {
    messageText = buildPaymentVerificationMessage(payload.studentName);
    waUrl = getPaymentVerificationWhatsAppUrl(payload.phone, payload.studentName);
  } else {
    messageText = buildLiveClassReminderMessage(
      payload.studentName,
      payload.courseName || "ഹനൂൻ അക്കാദമി",
      payload.liveLink || "https://hanoonacademynew.vercel.app"
    );
    waUrl = getLiveClassReminderWhatsAppUrl(
      payload.phone,
      payload.studentName,
      payload.courseName || "ഹനൂൻ അക്കാദമി",
      payload.liveLink || "https://hanoonacademynew.vercel.app"
    );
  }

  // 1. Trigger backend webhook hook (/api/whatsapp/send)
  try {
    await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: payload.type,
        phone: formattedPhone,
        studentName: payload.studentName,
        courseName: payload.courseName,
        liveLink: payload.liveLink,
        message: messageText,
      }),
    }).catch((e) => {
      console.warn("Backend WhatsApp webhook dispatch warning:", e);
    });
  } catch {}

  // 2. Audit logging in Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      Promise.resolve(
        supabase.from("audit_logs").insert({
          actor: "WhatsApp Automation System",
          action: `WHATSAPP_${payload.type}`,
          category: "SETTINGS",
          details: `To: ${payload.studentName} (${formattedPhone}): "${messageText}"`,
        })
      ).catch(() => {});
    } catch {}
  }

  // 3. Dispatch browser event for real-time UI notification
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("hanoon_whatsapp_alert_triggered", {
        detail: {
          type: payload.type,
          studentName: payload.studentName,
          phone: formattedPhone,
          message: messageText,
          waUrl,
        },
      })
    );
  }

  return {
    success: true,
    message: messageText,
    waUrl,
    simulated: true,
  };
}

/**
 * Prepares enrolled student recipient list for a live class session
 */
export async function getLiveClassEnrolledRecipients(
  courseId: string,
  courseTitle: string,
  liveLink: string
): Promise<WhatsAppStudentRecipient[]> {
  try {
    const allRegistrations = await fetchUnifiedRegistrations();
    // Filter students enrolled in this course or approved
    const matched = allRegistrations.filter((r) => {
      const matchCourse =
        !r.courseId ||
        r.courseId.toLowerCase() === courseId.toLowerCase() ||
        courseId === "ALL" ||
        (r.courseChoice && r.courseChoice.toLowerCase().includes(courseId.toLowerCase()));
      return matchCourse && r.whatsappNum;
    });

    if (matched.length > 0) {
      return matched.map((m) => ({
        name: m.fullName,
        phone: m.whatsappNum,
        course: courseTitle,
        waUrl: getLiveClassReminderWhatsAppUrl(m.whatsappNum, m.fullName, courseTitle, liveLink),
      }));
    }
  } catch (e) {
    console.warn("Could not query registrations for WhatsApp reminder:", e);
  }

  // Fallback demo students if database is empty
  const fallbackStudents = [
    { name: "Fathima Zahra", phone: "9846012345" },
    { name: "Amina Beevi", phone: "9847123456" },
    { name: "Khadija Mariyam", phone: "9848234567" },
  ];

  return fallbackStudents.map((s) => ({
    name: s.name,
    phone: s.phone,
    course: courseTitle,
    waUrl: getLiveClassReminderWhatsAppUrl(s.phone, s.name, courseTitle, liveLink),
  }));
}
