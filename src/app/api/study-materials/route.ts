import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

/**
 * GET: Fetch ALL study materials ordered by created_at DESC
 * Optionally filters by course with case-insensitive matching
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database client unconfigured", data: [] },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(request.url);
    const course = searchParams.get("course");

    let query = supabase
      .from("study_materials")
      .select("*")
      .order("created_at", { ascending: false });

    if (course && course !== "all" && course !== "ALL") {
      // Use case-insensitive matching (.ilike) or include 'all'
      query = query.or(`course.ilike.%${course}%,course.eq.all,course.eq.ALL`);
    }

    const { data, error } = await query;

    if (error) {
      console.warn("Error fetching study_materials from Supabase:", error.message);
      return NextResponse.json(
        { success: false, error: error.message, data: [] },
        { status: 200, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, data: data || [] },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("GET /api/study-materials exception:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal Server Error", data: [] },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * POST: Create a study material record strictly in public.study_materials
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database client unconfigured" },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    const body = await request.json();
    const { title, course, subject, file_url, type, uploaded_by } = body;

    if (!title || !file_url || !type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: title, file_url, or type" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const insertPayload = {
      title: String(title).trim(),
      course: course ? String(course).trim() : "All Courses",
      subject: subject ? String(subject).trim() : null,
      file_url: String(file_url).trim(),
      type: type === "link" ? "link" : "pdf",
      uploaded_by: uploaded_by ? String(uploaded_by).trim() : null,
    };

    const { data, error } = await supabase
      .from("study_materials")
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error("Insert error in study_materials:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, data },
      { status: 201, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("POST /api/study-materials exception:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to create study material" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}

/**
 * DELETE: Delete a study material by id
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: "Database client unconfigured" },
        { status: 503, headers: NO_CACHE_HEADERS }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing id parameter" },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    const { error } = await supabase
      .from("study_materials")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json(
      { success: true, message: "Deleted successfully" },
      { status: 200, headers: NO_CACHE_HEADERS }
    );
  } catch (err: any) {
    console.error("DELETE /api/study-materials exception:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Delete failed" },
      { status: 500, headers: NO_CACHE_HEADERS }
    );
  }
}
