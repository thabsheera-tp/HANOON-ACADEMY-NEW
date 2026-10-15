import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const keyToUse = serviceRoleKey || anonKey;
  const isKeyValid = Boolean(
    keyToUse &&
    !keyToUse.includes("your-anon") &&
    !keyToUse.includes("your-service") &&
    keyToUse.length > 20
  );

  if (!supabaseUrl || !isKeyValid) {
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

    // Helper to safely execute queries without throwing
    async function safeFetch<T>(queryPromise: PromiseLike<{ data: T | null; error: any }>) {
      try {
        const res = await queryPromise;
        return res.data || [];
      } catch {
        return [];
      }
    }

    // Try relational join with students and courses first
    let payData: any[] = [];
    try {
      const joinRes = await adminSupabase
        .from("payments")
        .select("*, students(*), courses(*)")
        .order("submitted_at", { ascending: false });

      if (!joinRes.error && Array.isArray(joinRes.data)) {
        payData = joinRes.data;
      } else {
        const plainPay = await adminSupabase
          .from("payments")
          .select("*")
          .order("submitted_at", { ascending: false });
        payData = (!plainPay.error && Array.isArray(plainPay.data)) ? plainPay.data : [];
      }
    } catch {
      try {
        const fallback = await adminSupabase.from("payments").select("*");
        payData = fallback.data || [];
      } catch {
        payData = [];
      }
    }

    // Concurrently fetch students, profiles, and courses
    const [studentsData, profilesData, coursesData] = await Promise.all([
      safeFetch(adminSupabase.from("students").select("*").order("created_at", { ascending: false })),
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
