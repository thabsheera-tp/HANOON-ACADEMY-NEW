import { createClient, SupabaseClient } from "@supabase/supabase-js";

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// Automatically strip trailing /rest/v1/ or slashes if user pasted REST endpoint from Supabase dashboard
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes("your-project") &&
  !supabaseAnonKey.includes("your-anon") &&
  supabaseAnonKey.length > 20
);

let client: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    console.warn("Failed to initialize Supabase client, falling back to local mode:", err);
    client = null;
  }
}

export const supabase = client;
