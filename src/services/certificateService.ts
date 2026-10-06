import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { DbCertificate, CertificateStatus } from "@/types/supabase";

const LOCAL_CERTIFICATES_KEY = "hanoon_local_certificates_v1";

export const INITIAL_CERTIFICATES: DbCertificate[] = [
  {
    id: "cert-001",
    student_id: "std-001",
    student_name: "Aysha Mariyam",
    course_id: "adaviyya",
    course_title: "Adaviyya Islamic Sharia & Moral Tarbiyah",
    certificate_number: "HA-ADAV-2026-0842",
    issue_date: "2026-03-15",
    grade: "Distinction (96%)",
    status: "ISSUED",
    created_at: new Date().toISOString(),
  },
  {
    id: "cert-002",
    student_id: "std-002",
    student_name: "Muhammed Nihal",
    course_id: "shamail",
    course_title: "Shama'il al-Muhammadiyya Prophetic Study",
    certificate_number: "HA-SHAM-2026-0419",
    issue_date: "2026-02-28",
    grade: "First Class (89%)",
    status: "ISSUED",
    created_at: new Date().toISOString(),
  },
  {
    id: "cert-003",
    student_id: "std-003",
    student_name: "Fathima Hiba",
    course_id: "fashion-designing",
    course_title: "Fashion Designing & Modest Apparel",
    certificate_number: "HA-FD-2026-0125",
    issue_date: "2026-01-20",
    grade: "Distinction (94%)",
    status: "ISSUED",
    created_at: new Date().toISOString(),
  },
];

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
      localStorage.setItem(LOCAL_CERTIFICATES_KEY, JSON.stringify(INITIAL_CERTIFICATES));
    } catch (e) {
      console.warn("Local storage error reading certificates:", e);
    }
  }

  return INITIAL_CERTIFICATES;
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
