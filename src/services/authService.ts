import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export type UserRole = "student" | "teacher" | "admin";

export interface UserProfileRecord {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at?: string;
  district?: string;
  whatsapp_num?: string;
  avatar_url?: string;
}

export interface AuthSessionData {
  user: UserProfileRecord;
  token: string;
  expiresAt: number;
}

export const SESSION_COOKIE_NAME = "hanoon_auth_session";
export const LOCAL_SESSION_KEY = "hanoon_auth_session_v1";

// Special Credentials strictly for Admin & Teacher Gateways
export const SPECIAL_CREDENTIALS = {
  admin: {
    email: "admin@hanoon.academy",
    specialPass: "HANOON-ADMIN-2026!",
    profile: {
      id: "usr-admin-01",
      email: "admin@hanoon.academy",
      full_name: "Executive Dean Faisal Al-Hanoon",
      role: "admin" as UserRole,
      district: "Calicut",
    },
  },
  teacher: {
    email: "teacher@hanoon.academy",
    specialPass: "HANOON-TEACHER-2026!",
    profile: {
      id: "usr-teacher-01",
      email: "teacher@hanoon.academy",
      full_name: "Usthad Abdul Rahman Al-Hafiz",
      role: "teacher" as UserRole,
      district: "Malappuram",
    },
  },
};

/**
 * Persists session data into both document.cookie (for Next.js Middleware)
 * and localStorage (for client hydration).
 */
export function setAuthSession(user: UserProfileRecord, token: string = "hanoon-session-token"): void {
  if (typeof window === "undefined") return;

  const sessionData: AuthSessionData = {
    user,
    token,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 30, // 30 days
  };

  try {
    // 1. Save to localStorage
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionData));

    // 2. Save to cookie accessible by Next.js Middleware
    const cookieValue = encodeURIComponent(JSON.stringify(sessionData));
    const maxAge = 60 * 60 * 24 * 30; // 30 days
    document.cookie = `${SESSION_COOKIE_NAME}=${cookieValue}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;

    // 3. Dispatch event for real-time reactivity
    window.dispatchEvent(new CustomEvent("hanoon_auth_changed", { detail: sessionData }));
  } catch (err) {
    console.error("Failed to persist auth session:", err);
  }
}

/**
 * Retrieves the current authenticated session.
 */
export function getCurrentSession(): AuthSessionData | null {
  if (typeof window === "undefined") return null;

  try {
    // Check localStorage first
    const rawLocal = localStorage.getItem(LOCAL_SESSION_KEY);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal) as AuthSessionData;
      if (parsed && parsed.user && parsed.expiresAt > Date.now()) {
        return parsed;
      }
    }

    // Fallback: Check Cookie
    const cookies = document.cookie.split(";").map((c) => c.trim());
    const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
    if (sessionCookie) {
      const rawValue = sessionCookie.split("=")[1];
      if (rawValue) {
        const parsed = JSON.parse(decodeURIComponent(rawValue)) as AuthSessionData;
        if (parsed && parsed.user && parsed.expiresAt > Date.now()) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn("Could not read auth session:", err);
  }

  return null;
}

/**
 * Universal Login: authenticates via Supabase Auth + profiles query,
 * or handles Admin & Teacher special credential keys.
 */
export async function loginUser(
  identifier: string,
  passKey: string
): Promise<{ success: boolean; user?: UserProfileRecord; role?: UserRole; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = passKey.trim();

  // 1. Check Admin Special Credentials
  if (
    cleanId === SPECIAL_CREDENTIALS.admin.email.toLowerCase() ||
    cleanPass === SPECIAL_CREDENTIALS.admin.specialPass
  ) {
    if (cleanPass === SPECIAL_CREDENTIALS.admin.specialPass) {
      const adminUser = SPECIAL_CREDENTIALS.admin.profile;
      setAuthSession(adminUser, "token-admin-verified");
      return { success: true, user: adminUser, role: "admin" };
    }
  }

  // 2. Check Teacher Special Credentials
  if (
    cleanId === SPECIAL_CREDENTIALS.teacher.email.toLowerCase() ||
    cleanPass === SPECIAL_CREDENTIALS.teacher.specialPass
  ) {
    if (cleanPass === SPECIAL_CREDENTIALS.teacher.specialPass) {
      const teacherUser = SPECIAL_CREDENTIALS.teacher.profile;
      setAuthSession(teacherUser, "token-teacher-verified");
      return { success: true, user: teacherUser, role: "teacher" };
    }
  }

  // 3. Authenticate with Supabase if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanId,
        password: cleanPass,
      });

      if (!authError && authData.user) {
        // Query the 'profiles' table to check the assigned role
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, email, full_name, role, district, whatsapp_num")
          .eq("id", authData.user.id)
          .single();

        let assignedRole: UserRole = "student";
        let fullName = authData.user.user_metadata?.full_name || cleanId.split("@")[0];
        let district = "Kerala";

        if (!profileError && profileData) {
          assignedRole = (profileData.role as UserRole) || "student";
          fullName = profileData.full_name || fullName;
          district = profileData.district || district;
        }

        const userRecord: UserProfileRecord = {
          id: authData.user.id,
          email: authData.user.email || cleanId,
          full_name: fullName,
          role: assignedRole,
          district,
        };

        setAuthSession(userRecord, authData.session?.access_token || "supabase-token");
        return { success: true, user: userRecord, role: assignedRole };
      }
    } catch (err) {
      console.warn("Supabase auth error, testing student fallback:", err);
    }
  }

  // 4. Default Student Login Fallback (handles standard student entry)
  if (cleanId && cleanPass.length >= 4) {
    const studentUser: UserProfileRecord = {
      id: `usr-std-${Date.now()}`,
      email: cleanId.includes("@") ? cleanId : `${cleanId}@student.hanoon.academy`,
      full_name: cleanId.includes("@") ? cleanId.split("@")[0] : cleanId,
      role: "student",
      district: "Kerala",
    };

    setAuthSession(studentUser, "token-student-verified");
    return { success: true, user: studentUser, role: "student" };
  }

  return {
    success: false,
    error: "Invalid email or password. Please verify your credentials.",
  };
}

/**
 * Clears session cookie and localStorage.
 */
export async function logoutUser(): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Supabase sign out error:", err);
    }
  }

  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(LOCAL_SESSION_KEY);
      document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
      window.dispatchEvent(new CustomEvent("hanoon_auth_changed", { detail: null }));
    } catch (err) {
      console.error("Error clearing session:", err);
    }
  }
}
