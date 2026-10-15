import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const keyToUse = serviceRoleKey || anonKey;

  if (!supabaseUrl || !keyToUse) {
    return NextResponse.json({ error: "Supabase credentials not configured" }, { status: 503 });
  }

  try {
    // Service role client bypasses RLS completely on server-side
    const adminSupabase = createClient(supabaseUrl, keyToUse, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Execute separate queries without nested relation embeddings to prevent PGRST125
    async function safeFetch<T>(queryPromise: PromiseLike<{ data: T | null; error: any }>) {
      try {
        const res = await queryPromise;
        return res.data || [];
      } catch {
        return [];
      }
    }

    let payData: any[] = [];
    try {
      const payRes = await adminSupabase.from("payments").select("*").order("submitted_at", { ascending: false });
      if (!payRes.error && Array.isArray(payRes.data)) {
        payData = payRes.data;
      } else {
        const fallback = await adminSupabase.from("payments").select("*");
        payData = fallback.data || [];
      }
    } catch {
      payData = [];
    }

    const [studentsData, profilesData, coursesData] = await Promise.all([
      safeFetch(adminSupabase.from("students").select("*")),
      safeFetch(adminSupabase.from("profiles").select("*")),
      safeFetch(adminSupabase.from("courses").select("*")),
    ]);

    return NextResponse.json({
      payments: payData,
      students: studentsData,
      profiles: profilesData,
      courses: coursesData,
      bypassedRls: Boolean(serviceRoleKey),
    });
  } catch (err: any) {
    console.error("Admin data route error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error fetching admin data" },
      { status: 500 }
    );
  }
}
