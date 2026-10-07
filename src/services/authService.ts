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

// Fallback credentials used strictly for local evaluation when Supabase is not configured
export const DEMO_EVALUATION_CREDENTIALS = {
  admin: {
    email: "admin@hanoon.academy",
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
    profile: {
      id: "usr-teacher-01",
      email: "teacher@hanoon.academy",
      full_name: "Usthad Abdul Rahman Al-Hafiz",
      role: "teacher" as UserRole,
      district: "Malappuram",
    },
  },
};

// Kept for backward compatibility with testing helpers
export const SPECIAL_CREDENTIALS = {
  admin: {
    ...DEMO_EVALUATION_CREDENTIALS.admin,
    specialPass: "HANOON-ADMIN-2026!",
  },
  teacher: {
    ...DEMO_EVALUATION_CREDENTIALS.teacher,
    specialPass: "HANOON-TEACHER-2026!",
  },
};

/**
 * Persists session data into document.cookie (for Next.js Middleware)
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
 * Registers a new student or faculty member via Supabase Auth + profiles table.
 */
export async function signUpUser(params: {
  email: string;
  password: string;
  fullName: string;
  role?: UserRole;
  district?: string;
  whatsappNum?: string;
}): Promise<{ success: boolean; user?: UserProfileRecord; error?: string; requiresEmailConfirmation?: boolean }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPass = params.password.trim();
  const assignedRole: UserRole = params.role || "student";

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: "Email and password are required." };
  }
  if (cleanPass.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  // 1. Live Supabase Authentication
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPass,
        options: {
          data: {
            full_name: params.fullName.trim(),
            role: assignedRole,
            district: params.district?.trim() || "Kerala",
            whatsapp_num: params.whatsappNum?.trim() || "",
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        // If email confirmation is required by Supabase project settings
        if (!data.session) {
          return {
            success: true,
            requiresEmailConfirmation: true,
            error: "Registration successful! Please check your email to confirm your account before signing in.",
          };
        }

        const userRecord: UserProfileRecord = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          full_name: params.fullName.trim(),
          role: assignedRole,
          district: params.district?.trim() || "Kerala",
          whatsapp_num: params.whatsappNum?.trim() || "",
        };

        setAuthSession(userRecord, data.session.access_token);
        return { success: true, user: userRecord };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to register user.";
      return { success: false, error: msg };
    }
  }

  // 2. Local Fallback (Simulation mode)
  const simulatedUser: UserProfileRecord = {
    id: `usr-${Date.now()}`,
    email: cleanEmail,
    full_name: params.fullName.trim() || cleanEmail.split("@")[0],
    role: assignedRole,
    district: params.district || "Kerala",
    whatsapp_num: params.whatsappNum || "",
  };

  setAuthSession(simulatedUser, "token-local-simulated");
  return { success: true, user: simulatedUser };
}

/**
 * Universal Login: Authenticates via Supabase Auth + profiles query.
 */
export async function loginUser(
  identifier: string,
  passKey: string
): Promise<{ success: boolean; user?: UserProfileRecord; role?: UserRole; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = passKey.trim();

  if (!cleanId || !cleanPass) {
    return { success: false, error: "Please enter your email and password." };
  }

  // 1. Authenticate with live Supabase Auth when configured
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanId,
        password: cleanPass,
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (authData.user) {
        // Fetch verified role and profile from PostgreSQL 'profiles' table
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, email, full_name, role, district, whatsapp_num, avatar_url")
          .eq("id", authData.user.id)
          .single();

        let assignedRole: UserRole = "student";
        let fullName = authData.user.user_metadata?.full_name || cleanId.split("@")[0];
        let district = "Kerala";
        let whatsappNum = "";

        if (profileData) {
          assignedRole = (profileData.role as UserRole) || "student";
          fullName = profileData.full_name || fullName;
          district = profileData.district || district;
          whatsappNum = profileData.whatsapp_num || whatsappNum;
        }

        const userRecord: UserProfileRecord = {
          id: authData.user.id,
          email: authData.user.email || cleanId,
          full_name: fullName,
          role: assignedRole,
          district,
          whatsapp_num: whatsappNum,
          avatar_url: profileData?.avatar_url,
        };

        setAuthSession(userRecord, authData.session?.access_token || "supabase-token");
        return { success: true, user: userRecord, role: assignedRole };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication error occurred.";
      return { success: false, error: msg };
    }
  }

  // 2. Local Fallback / Development Evaluation Credentials (only active if Supabase is unconfigured)
  if (
    cleanId === DEMO_EVALUATION_CREDENTIALS.admin.email.toLowerCase() &&
    cleanPass === SPECIAL_CREDENTIALS.admin.specialPass
  ) {
    const adminUser = DEMO_EVALUATION_CREDENTIALS.admin.profile;
    setAuthSession(adminUser, "token-admin-demo");
    return { success: true, user: adminUser, role: "admin" };
  }

  if (
    cleanId === DEMO_EVALUATION_CREDENTIALS.teacher.email.toLowerCase() &&
    cleanPass === SPECIAL_CREDENTIALS.teacher.specialPass
  ) {
    const teacherUser = DEMO_EVALUATION_CREDENTIALS.teacher.profile;
    setAuthSession(teacherUser, "token-teacher-demo");
    return { success: true, user: teacherUser, role: "teacher" };
  }

  // 3. Fallback Student Demo (Offline mode only)
  if (cleanId && cleanPass.length >= 4) {
    const studentUser: UserProfileRecord = {
      id: `usr-std-${Date.now()}`,
      email: cleanId.includes("@") ? cleanId : `${cleanId}@student.hanoon.academy`,
      full_name: cleanId.includes("@") ? cleanId.split("@")[0] : cleanId,
      role: "student",
      district: "Kerala",
    };

    setAuthSession(studentUser, "token-student-demo");
    return { success: true, user: studentUser, role: "student" };
  }

  return {
    success: false,
    error: "Invalid email or password. Please verify your credentials.",
  };
}

/**
 * Clears session cookie, Supabase session, and localStorage.
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
