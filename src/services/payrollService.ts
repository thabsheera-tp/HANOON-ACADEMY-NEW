import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { DbPayroll, PayrollStatus } from "@/types/supabase";

const LOCAL_PAYROLL_KEY = "hanoon_local_payroll_v1";

export const INITIAL_PAYROLL: DbPayroll[] = [];

export async function fetchPayroll(): Promise<DbPayroll[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("teacher_payroll")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        // Sync real Supabase payroll records to local storage and purge legacy dummy mock data
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(LOCAL_PAYROLL_KEY, JSON.stringify(data));
          } catch {}
        }
        return data as DbPayroll[];
      }
      if (error) {
        console.warn("Supabase fetchPayroll error:", error.message || error);
      }
    } catch (err) {
      console.warn("Supabase fetchPayroll fallback to local:", err);
    }
  }

  // Local storage fallback for offline / cache mode
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_PAYROLL_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Strictly filter out any hardcoded legacy dummy records (e.g. pay-001, pay-002, or 52 classes / ₹31,700 / ₹7,500)
          const clean = parsed.filter(
            (p: any) =>
              p &&
              p.id !== "pay-001" &&
              p.id !== "pay-002" &&
              p.id !== "pay-003" &&
              p.id !== "pay-004" &&
              !(p.total_amount === 7500 && p.classes_taken === 10 && p.month_year === "March 2026")
          );
          if (clean.length !== parsed.length) {
            localStorage.setItem(LOCAL_PAYROLL_KEY, JSON.stringify(clean));
          }
          return clean;
        }
      }
    } catch (e) {
      console.warn("Local storage payroll read error:", e);
    }
  }

  return [];
}

export async function markPayrollAsPaid(
  payrollId: string,
  referenceId: string
): Promise<boolean> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase
        .from("teacher_payroll")
        .update({
          status: "PAID",
          payment_reference: referenceId,
          paid_at: now,
        })
        .eq("id", payrollId);
    } catch (err) {
      console.warn("Supabase payroll update error:", err);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const current = await fetchPayroll();
      const updated = current.map((p) =>
        p.id === payrollId
          ? {
              ...p,
              status: "PAID" as PayrollStatus,
              payment_reference: referenceId,
              paid_at: now,
            }
          : p
      );
      localStorage.setItem(LOCAL_PAYROLL_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("hanoon_payroll_updated", { detail: updated }));
    } catch (e) {
      console.error("Local storage payroll update error:", e);
    }
  }

  return true;
}

export async function createPayrollRecord(entry: {
  teacher_id: string;
  teacher_name: string;
  month_year: string;
  classes_taken: number;
  rate_per_class: number;
}): Promise<DbPayroll> {
  const total = entry.classes_taken * entry.rate_per_class;
  let recordToReturn: DbPayroll = {
    id: `pay-${Date.now()}`,
    teacher_id: entry.teacher_id,
    teacher_name: entry.teacher_name,
    month_year: entry.month_year,
    classes_taken: entry.classes_taken,
    rate_per_class: entry.rate_per_class,
    total_amount: total,
    status: "PENDING",
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("teacher_payroll")
        .insert([
          {
            teacher_id: entry.teacher_id,
            teacher_name: entry.teacher_name,
            month_year: entry.month_year,
            classes_taken: entry.classes_taken,
            rate_per_class: entry.rate_per_class,
            total_amount: total,
            status: "PENDING",
          },
        ])
        .select()
        .single();

      if (!error && data) {
        recordToReturn = data as DbPayroll;
      } else if (error) {
        console.warn("Supabase create payroll record error:", error);
      }
    } catch (err) {
      console.warn("Supabase create payroll record exception:", err);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const current = await fetchPayroll();
      const updated = [recordToReturn, ...current.filter((p) => p.id !== recordToReturn.id)];
      localStorage.setItem(LOCAL_PAYROLL_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("hanoon_payroll_updated", { detail: updated }));
    } catch (e) {
      console.error("Local storage error:", e);
    }
  }

  return recordToReturn;
}
