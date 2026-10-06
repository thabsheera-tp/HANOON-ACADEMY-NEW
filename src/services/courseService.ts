import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { SelectedCourse } from "@/types/app";
import { DbCourse } from "@/types/supabase";
import { SHOWCASE_COURSES } from "@/components/mobile/ScreenCoursesList";

export async function getActiveCourses(): Promise<SelectedCourse[]> {
  if (!isSupabaseConfigured || !supabase) {
    return SHOWCASE_COURSES;
  }

  try {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("is_active", true)
      .order("fee_amount", { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn("Supabase courses query failed or empty, using showcase courses:", error?.message);
      return SHOWCASE_COURSES;
    }

    return data.map((item: DbCourse) => ({
      id: item.id,
      title: item.title_en,
      secondaryTitle: item.title_ml,
      subtitle: item.subtitle,
      fee: `₹${item.fee_amount.toLocaleString("en-IN")}`,
      feeAmount: item.fee_amount,
      duration: item.duration,
      tagline: item.syllabus_summary,
      highlights: Array.isArray(item.highlights) ? item.highlights : [],
    }));
  } catch (err) {
    console.warn("Error fetching courses from Supabase:", err);
    return SHOWCASE_COURSES;
  }
}
