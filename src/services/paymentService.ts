import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { DbPayment, PaymentStatus } from "@/types/supabase";

const LOCAL_PAYMENTS_KEY = "hanoon_local_payments";

export async function fetchPayments(): Promise<DbPayment[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          student:students(*),
          course:courses(*)
        `)
        .order("submitted_at", { ascending: false });

      if (!error && data) {
        return data as DbPayment[];
      }
    } catch (err) {
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
        console.error("Error updating status in Supabase:", error);
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
      const updated = stored.map((p) => {
        if (p.id === paymentId) {
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

      // Broadcast update event to all listening components
      window.dispatchEvent(
        new CustomEvent("hanoon_payment_event", {
          detail: { id: paymentId, status: newStatus, rejection_reason: rejectionReason },
        })
      );
    } catch (e) {
      console.error("Local storage update error:", e);
    }
  }

  return true;
}

export function subscribeToPaymentStatus(
  paymentId: string,
  onStatusChange: (status: PaymentStatus, rejectionReason?: string | null) => void
): () => void {
  // 1. Supabase Realtime channel subscription
  let realtimeChannel: RealtimeChannel | null = null;

  if (isSupabaseConfigured && supabase) {
    try {
      realtimeChannel = supabase
        .channel(`payment_status_${paymentId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "payments",
            filter: `id=eq.${paymentId}`,
          },
          (payload) => {
            const updated = payload.new as DbPayment;
            if (updated && updated.status) {
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
    if (customEvt.detail && (customEvt.detail.id === paymentId || customEvt.detail.upi_txid)) {
      onStatusChange(customEvt.detail.status, customEvt.detail.rejection_reason);
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
