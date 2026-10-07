import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { DbCertificate, CertificateStatus } from "@/types/supabase";

const LOCAL_CERTIFICATES_KEY = "hanoon_local_certificates_v1";

export const INITIAL_CERTIFICATES: DbCertificate[] = [];

export async function fetchCertificates(): Promise<DbCertificate[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data as DbCertificate[];
      }
    } catch (err) {
      console.warn("Supabase fetchCertificates fallback to local:", err);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(LOCAL_CERTIFICATES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Local storage error reading certificates:", e);
    }
  }

  // Purged: No hardcoded dummy student certificates
  return [];
}

export async function issueCertificate(certData: {
  student_name: string;
  course_id: string;
  course_title: string;
  grade: string;
  student_id?: string;
}): Promise<DbCertificate> {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const certCode = certData.course_id.slice(0, 4).toUpperCase();
  const certNumber = `HA-${certCode}-${new Date().getFullYear()}-${randomSuffix}`;

  const newCert: DbCertificate = {
    id: `cert-${Date.now()}`,
    student_id: certData.student_id || `std-${Date.now()}`,
    student_name: certData.student_name,
    course_id: certData.course_id,
    course_title: certData.course_title,
    certificate_number: certNumber,
    issue_date: new Date().toISOString().split("T")[0],
    grade: certData.grade || "Distinction",
    status: "ISSUED",
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("certificates").insert([newCert]);
    } catch (err) {
      console.warn("Supabase insert certificate error:", err);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const current = await fetchCertificates();
      const updated = [newCert, ...current.filter((c) => c.id !== newCert.id)];
      localStorage.setItem(LOCAL_CERTIFICATES_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("hanoon_certificates_updated", { detail: updated }));
    } catch (e) {
      console.error("Local storage error saving certificate:", e);
    }
  }

  return newCert;
}

export async function verifyCertificate(certificateNumber: string): Promise<DbCertificate | null> {
  const all = await fetchCertificates();
  return (
    all.find(
      (c) => c.certificate_number.trim().toUpperCase() === certificateNumber.trim().toUpperCase()
    ) || null
  );
}
