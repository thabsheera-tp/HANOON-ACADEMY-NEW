import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { DbPayroll, PayrollStatus } from "@/types/supabase";

const LOCAL_PAYROLL_KEY = "hanoon_local_payroll_v1";

export const INITIAL_PAYROLL: DbPayroll[] = [
  {
    id: "pay-001",
    teacher_id: "tch-01",
    teacher_name: "Usthad Dr. Faisal Al-Hanoon",
    month_year: "March 2026",
    classes_taken: 16,
    rate_per_class: 800,
    total_amount: 12800,
    status: "PAID",
    payment_reference: "UPI/202603/FAISAL-8821",
    paid_at: "2026-03-31T10:00:00Z",
    created_at: new Date().toISOString(),
  },
  {
    id: "pay-002",
    teacher_id: "tch-02",
    teacher_name: "Usthad Abdul Rahman Al-Hafiz",
    month_year: "March 2026",
    classes_taken: 14,
    rate_per_class: 750,
    total_amount: 10500,
    status: "PENDING",
    created_at: new Date().toISOString(),
  },
  {
    id: "pay-003",
    teacher_id: "tch-03",
    teacher_name: "Usthad Anas Nadwi",
    month_year: "March 2026",
    classes_taken: 12,
    rate_per_class: 700,
    total_amount: 8400,
    status: "PAID",
    payment_reference: "IMPS/202603/ANAS-3319",
    paid_at: "2026-03-30T14:20:00Z",
    created_at: new Date().toISOString(),
  },
  {
    id: "pay-004",
    teacher_id: "tch-04",
    teacher_name: "Usthad Bilal Farooqi",
    month_year: "March 2026",
    classes_taken: 10,
    rate_per_class: 750,
    total_amount: 7500,
    status: "PENDING",
    created_at: new Date().toISOString(),
  },
];

export async function fetchPayroll(): Promise<DbPayroll[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("teacher_payroll")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data as DbPayroll[];
      }
    } catch (err) {
      console.warn("Supabase fetchPayroll fallback to local:", err);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_PAYROLL_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      localStorage.setItem(LOCAL_PAYROLL_KEY, JSON.stringify(INITIAL_PAYROLL));
    } catch (e) {
      console.warn("Local storage payroll read error:", e);
    }
  }

  return INITIAL_PAYROLL;
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
  const newRecord: DbPayroll = {
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
      await supabase.from("teacher_payroll").insert([newRecord]);
    } catch (err) {
      console.warn("Supabase create payroll record error:", err);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const current = await fetchPayroll();
      const updated = [newRecord, ...current];
      localStorage.setItem(LOCAL_PAYROLL_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("hanoon_payroll_updated", { detail: updated }));
    } catch (e) {
      console.error("Local storage error:", e);
    }
  }

  return newRecord;
}
