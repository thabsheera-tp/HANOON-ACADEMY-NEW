import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { DbPayment, PaymentStatus } from "@/types/supabase";

const LOCAL_PAYMENTS_KEY = "hanoon_local_payments";

let lastPaymentFetchError: string | null = null;

export function getLastPaymentFetchError(): string | null {
  return lastPaymentFetchError;
}

export async function fetchPayments(): Promise<DbPayment[]> {
  lastPaymentFetchError = null;

  if (isSupabaseConfigured && supabase) {
    try {
      let rawPayments: any[] | null = null;
      let payFetchError: any = null;

      // 1. Try relational query joining students table (e.g. students(full_name, whatsapp_number))
      let { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          students (
            id,
            full_name,
            whatsapp_number,
            whatsapp_num,
            district,
            place
          )
        `)
        .order("submitted_at", { ascending: false });

      if (error) {
        // Fallback: Try with alias student:students(*)
        const res2 = await supabase
          .from("payments")
          .select(`
            *,
            student:students(*)
          `)
          .order("submitted_at", { ascending: false });
        if (!res2.error && res2.data) {
          data = res2.data;
          error = null;
        }
      }

      if (!error && data) {
        rawPayments = data;
      } else {
        if (error) payFetchError = error;
        // Fallback: Fetch plain payments if relation is missing in schema cache
        let fallbackRes = await supabase
          .from("payments")
          .select("*")
          .order("submitted_at", { ascending: false });

        if (fallbackRes.error) {
          // Retry without ordering in case submitted_at column is missing
          fallbackRes = await supabase.from("payments").select("*");
        }

        if (!fallbackRes.error && fallbackRes.data) {
          rawPayments = fallbackRes.data;
          payFetchError = null; // Plain query succeeded
        } else if (fallbackRes.error) {
          payFetchError = fallbackRes.error;
        }
      }

      if (payFetchError) {
        lastPaymentFetchError = payFetchError.message || "Failed to query payments table.";
        console.warn("Supabase payments fetch error:", payFetchError);
      }

      if (rawPayments && rawPayments.length > 0) {
        // Fetch students and profiles concurrently to resolve student names reliably
        const [stdRes, profRes] = await Promise.all([
          supabase.from("students").select("*"),
          supabase.from("profiles").select("*"),
        ]);

        const studentMap = new Map<string, any>();
        if (stdRes.data) {
          for (const s of stdRes.data) {
            if (s.id) studentMap.set(s.id, s);
            if (s.user_id) studentMap.set(s.user_id, s);
            const p = (s.whatsapp_number || s.whatsapp_num || s.phone || "").replace(/\D/g, "");
            if (p) studentMap.set(p.slice(-10), s);
          }
        }
        if (profRes.data) {
          for (const pr of profRes.data) {
            if (pr.id && !studentMap.has(pr.id)) {
              studentMap.set(pr.id, {
                id: pr.id,
                full_name: pr.full_name || pr.email?.split("@")[0] || "Registered Student",
                whatsapp_num: pr.whatsapp_num || pr.whatsapp_number || "",
                district: pr.district || pr.place || "Kerala",
              });
            }
          }
        }

        const enriched: DbPayment[] = rawPayments.map((p) => {
          const rawStudent = (p as any).students
            ? (Array.isArray((p as any).students) ? (p as any).students[0] : (p as any).students)
            : p.student;

          const payPhone = ((p as any).whatsapp_number || (p as any).whatsapp_num || (p as any).phone || "").replace(/\D/g, "");
          const txDigits = (p.upi_txid || "").replace(/\D/g, "");

          const lookupStudent =
            (p.student_id ? studentMap.get(p.student_id) : null) ||
            (payPhone ? studentMap.get(payPhone.slice(-10)) : null) ||
            (txDigits.length >= 10 ? studentMap.get(txDigits.slice(-10)) : null) ||
            null;

          const resolvedName =
            rawStudent?.full_name ||
            rawStudent?.name ||
            lookupStudent?.full_name ||
            lookupStudent?.name ||
            (p as any).student_name ||
            (p as any).full_name ||
            (p.upi_txid ? `Student (Tx: ${p.upi_txid.slice(0, 10)})` : "Registered Student");

          const resolvedPhone =
            rawStudent?.whatsapp_number ||
            rawStudent?.whatsapp_num ||
            rawStudent?.phone ||
            lookupStudent?.whatsapp_number ||
            lookupStudent?.whatsapp_num ||
            lookupStudent?.phone ||
            payPhone ||
            "";

          const resolvedDistrict =
            rawStudent?.district ||
            rawStudent?.place ||
            lookupStudent?.district ||
            lookupStudent?.place ||
            (p as any).district ||
            "Kerala";

          return {
            ...p,
            student: {
              id: rawStudent?.id || lookupStudent?.id || p.student_id,
              full_name: resolvedName,
              whatsapp_num: resolvedPhone,
              district: resolvedDistrict,
              created_at: rawStudent?.created_at || lookupStudent?.created_at || p.submitted_at || new Date().toISOString(),
            },
          };
        });

        return enriched;
      } else if (rawPayments && rawPayments.length === 0) {
        return [];
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastPaymentFetchError = msg;
      console.warn("Failed to fetch payments from Supabase, loading local:", err);
    }
  }

  // Fallback to local storage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_PAYMENTS_KEY);
      if (stored) {
        return JSON.parse(stored) as DbPayment[];
      }
    } catch (e) {
      console.error("Local storage read error:", e);
    }
  }

  return [];
}

export async function updatePaymentStatus(
  paymentId: string,
  newStatus: PaymentStatus,
  rejectionReason?: string
): Promise<boolean> {
  const now = new Date().toISOString();

  // 1. Supabase update if live
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from("payments")
        .update({
          status: newStatus,
          rejection_reason: rejectionReason || null,
          updated_at: now,
        })
        .eq("id", paymentId);

      if (error) {
        console.error("Error updating status in Supabase:", error.message);
      }
    } catch (err) {
      console.warn("Failed Supabase status update:", err);
    }
  }

  // 2. Always update local storage
  if (typeof window !== "undefined") {
    try {
      const stored: DbPayment[] = JSON.parse(
        localStorage.getItem(LOCAL_PAYMENTS_KEY) || "[]"
      );
      let matchedUpiTxId = "";
      const updated = stored.map((p) => {
        if (p.id === paymentId) {
          matchedUpiTxId = p.upi_txid;
          return {
            ...p,
            status: newStatus,
            rejection_reason: rejectionReason || null,
            updated_at: now,
          };
        }
        return p;
      });
      localStorage.setItem(LOCAL_PAYMENTS_KEY, JSON.stringify(updated));

      // Broadcast update event with both id and upi_txid for real-time reactivity
      window.dispatchEvent(
        new CustomEvent("hanoon_payment_event", {
          detail: {
            id: paymentId,
            upi_txid: matchedUpiTxId,
            status: newStatus,
            rejection_reason: rejectionReason,
          },
        })
      );
    } catch (e) {
      console.error("Local storage update error:", e);
    }
  }

  return true;
}

export function subscribeToPaymentStatus(
  paymentIdOrTx: string,
  onStatusChange: (status: PaymentStatus, rejectionReason?: string | null) => void
): () => void {
  // 1. Supabase Realtime channel subscription
  let realtimeChannel: RealtimeChannel | null = null;
  const cleanKey = paymentIdOrTx.trim();

  if (isSupabaseConfigured && supabase && cleanKey) {
    try {
      realtimeChannel = supabase
        .channel(`payment_status_channel_${cleanKey}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "payments",
          },
          (payload) => {
            const updated = payload.new as DbPayment;
            if (
              updated &&
              updated.status &&
              (updated.id === cleanKey || updated.upi_txid === cleanKey)
            ) {
              onStatusChange(updated.status, updated.rejection_reason);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Supabase realtime subscription failed:", err);
    }
  }

  // 2. Local window event listener
  const handleLocalEvent = (e: Event) => {
    const customEvt = e as CustomEvent;
    if (customEvt.detail) {
      if (
        !cleanKey ||
        customEvt.detail.id === cleanKey ||
        customEvt.detail.upi_txid === cleanKey
      ) {
        onStatusChange(customEvt.detail.status, customEvt.detail.rejection_reason);
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("hanoon_payment_event", handleLocalEvent);
  }

  // Unsubscribe cleanup function
  return () => {
    if (realtimeChannel && supabase) {
      supabase.removeChannel(realtimeChannel);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("hanoon_payment_event", handleLocalEvent);
    }
  };
}

/**
 * Checks the latest payment verification status directly from Supabase (or local fallback).
 */
export async function checkPaymentStatusByIdOrTx(
  paymentIdOrTx: string
): Promise<{ status: PaymentStatus; rejectionReason?: string | null } | null> {
  const cleanId = paymentIdOrTx.trim();
  if (!cleanId) return null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("id, status, rejection_reason, upi_txid")
        .or(`id.eq.${cleanId},upi_txid.eq.${cleanId}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          status: data.status as PaymentStatus,
          rejectionReason: data.rejection_reason,
        };
      }
    } catch (e) {
      console.warn("Error checking live payment status:", e);
    }
  }

  // Fallback to local storage
  if (typeof window !== "undefined") {
    try {
      const stored: DbPayment[] = JSON.parse(
        localStorage.getItem(LOCAL_PAYMENTS_KEY) || "[]"
      );
      const match = stored.find(
        (p) => p.id === cleanId || p.upi_txid === cleanId
      );
      if (match) {
        return {
          status: match.status,
          rejectionReason: match.rejection_reason,
        };
      }
    } catch {}
  }

  return null;
}

/**
 * Generates a direct WhatsApp link with pre-formatted Malayalam welcome message
 * for verified/approved students.
 */
export function getWhatsAppWelcomeUrl(
  studentName: string,
  courseName: string,
  rawPhone?: string
): string {
  const cleanPhone = (rawPhone || "").replace(/\D/g, "");
  let phoneWithCountry = cleanPhone;
  if (cleanPhone.length === 10) {
    phoneWithCountry = `91${cleanPhone}`;
  } else if (!cleanPhone.startsWith("91") && cleanPhone.length > 0) {
    phoneWithCountry = `91${cleanPhone}`;
  }

  const sName = studentName?.trim() || "വിദ്യാർത്ഥി";
  const message = `ഹലോ ${sName}, ഹനൂൻ അക്കാദമിയിലേക്ക് സ്വാഗതം! നിങ്ങളുടെ പേയ്മെന്റ് സ്വീകരിച്ചിരിക്കുന്നു. നിങ്ങളുടെ കോഴ്സ് ഇപ്പോൾ ആക്ടീവ് ആണ്.`;

  if (phoneWithCountry) {
    return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
