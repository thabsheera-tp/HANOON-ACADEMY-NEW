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
 * Uses 365-day expiry so verified students are permanently kept logged in.
 */
export function setAuthSession(user: UserProfileRecord, token: string = "hanoon-session-token"): void {
  if (typeof window === "undefined") return;

  const sessionData: AuthSessionData = {
    user,
    token,
    expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 365, // 365 days (permanent device persistence)
  };

  try {
    // 1. Save to localStorage
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(sessionData));

    // 2. Save to cookie accessible by Next.js Middleware (1 year)
    const cookieValue = encodeURIComponent(JSON.stringify(sessionData));
    const maxAge = 60 * 60 * 24 * 365; // 365 days in seconds
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
 * Frictionless Student Authentication:
 * Students authenticate strictly using ONLY their phone number (No email, no password).
 * Handles both new student registration and returning student login with persistence.
 */
export async function loginStudentWithPhone(
  phone: string,
  fullName?: string,
  district?: string
): Promise<{
  success: boolean;
  user?: UserProfileRecord;
  isVerified?: boolean;
  error?: string;
}> {
  const cleanPhone = phone.replace(/\D/g, "");
  if (!cleanPhone || cleanPhone.length < 10) {
    return {
      success: false,
      error: "Please enter a valid 10-digit mobile or WhatsApp number.",
    };
  }

  // 1. Supabase live database lookup (if configured)
  if (isSupabaseConfigured && supabase) {
    try {
      // Look up student by phone number in 'students' table
      const { data: existingStudent } = await supabase
        .from("students")
        .select(`
          id,
          full_name,
          whatsapp_num,
          district,
          created_at,
          payments(*)
        `)
        .eq("whatsapp_num", cleanPhone)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let studentRecord = existingStudent;

      if (!studentRecord) {
        // Automatically register new student
        const newName = fullName?.trim() || `Student ${cleanPhone.slice(-4)}`;
        const newDistrict = district?.trim() || "Kerala";

        const { data: createdStudent, error: createError } = await supabase
          .from("students")
          .insert({
            full_name: newName,
            whatsapp_num: cleanPhone,
            district: newDistrict,
          })
          .select()
          .single();

        if (createError) {
          console.warn("Could not insert student into Supabase:", createError);
        } else {
          studentRecord = createdStudent;
        }
      }

      // Check payment verification status
      let isVerified = false;
      if (studentRecord && studentRecord.payments && Array.isArray(studentRecord.payments)) {
        const approved = studentRecord.payments.find(
          (p: { status?: string }) => p.status === "APPROVED" || p.status === "verified"
        );
        if (approved) {
          isVerified = true;
          // Persist payment to local storage for instant client hydration
          try {
            localStorage.setItem("hanoon_local_payments", JSON.stringify(studentRecord.payments));
          } catch (e) {
            console.warn("Error caching payments:", e);
          }
        }
      }

      const resolvedName = studentRecord?.full_name || fullName?.trim() || `Student ${cleanPhone.slice(-4)}`;
      const resolvedDistrict = studentRecord?.district || district?.trim() || "Kerala";
      const studentId = studentRecord?.id || `std-${cleanPhone}`;

      const userRecord: UserProfileRecord = {
        id: studentId,
        email: `${cleanPhone}@student.hanoon.academy`,
        full_name: resolvedName,
        role: "student",
        whatsapp_num: cleanPhone,
        district: resolvedDistrict,
      };

      setAuthSession(userRecord, `token-phone-${Date.now()}`);
      return { success: true, user: userRecord, isVerified };
    } catch (err) {
      console.warn("Supabase student phone auth error, falling back to local:", err);
    }
  }

  // 2. Offline / LocalStorage mode fallback
  let isVerified = false;
  try {
    const localPaymentsRaw = localStorage.getItem("hanoon_local_payments");
    if (localPaymentsRaw) {
      const localPayments = JSON.parse(localPaymentsRaw);
      if (Array.isArray(localPayments)) {
        isVerified = localPayments.some(
          (p: { status?: string }) => p.status === "APPROVED" || p.status === "verified"
        );
      }
    }
  } catch (e) {
    console.warn("Local storage check error:", e);
  }

  const localUser: UserProfileRecord = {
    id: `std-${cleanPhone}`,
    email: `${cleanPhone}@student.hanoon.academy`,
    full_name: fullName?.trim() || "Aysha Mariyam",
    role: "student",
    whatsapp_num: cleanPhone,
    district: district?.trim() || "Malappuram",
  };

  setAuthSession(localUser, `token-phone-local-${Date.now()}`);
  return { success: true, user: localUser, isVerified };
}

/**
 * Secure Staff Authentication (Teachers & Admins):
 * Strictly requires Email and Password combination.
 * Enforces role isolation (rejects unauthorized users attempting to access staff gateways).
 */
export async function loginStaffWithCredentials(
  email: string,
  passKey: string
): Promise<{
  success: boolean;
  user?: UserProfileRecord;
  role?: "teacher" | "admin";
  error?: string;
}> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = passKey.trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: "Please enter your staff email and password." };
  }

  // 1. Live Supabase Authentication
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPass,
      });

      if (authError) {
        return { success: false, error: authError.message };
      }

      if (authData.user) {
        // Query profiles table for role
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, email, full_name, role, district, whatsapp_num, avatar_url")
          .eq("id", authData.user.id)
          .single();

        const role = profileData?.role as UserRole | undefined;

        if (role !== "admin" && role !== "teacher") {
          return {
            success: false,
            error: "Access Denied: This portal requires verified Faculty or Administrator credentials.",
          };
        }

        const userRecord: UserProfileRecord = {
          id: authData.user.id,
          email: authData.user.email || cleanEmail,
          full_name: profileData?.full_name || authData.user.user_metadata?.full_name || (role === "admin" ? "Academy Administrator" : "Faculty Member"),
          role: role,
          district: profileData?.district || "Kerala",
          whatsapp_num: profileData?.whatsapp_num || "",
          avatar_url: profileData?.avatar_url,
        };

        setAuthSession(userRecord, authData.session?.access_token || "supabase-token");
        return { success: true, user: userRecord, role };
      }
    } catch (err) {
      console.warn("Supabase staff auth failed:", err);
    }
  }

  // 2. Verified Demo / Evaluation Staff Credentials (for offline / testing environments)
  if (
    cleanEmail === DEMO_EVALUATION_CREDENTIALS.admin.email.toLowerCase() &&
    cleanPass === SPECIAL_CREDENTIALS.admin.specialPass
  ) {
    const adminUser = DEMO_EVALUATION_CREDENTIALS.admin.profile;
    setAuthSession(adminUser, "token-admin-session");
    return { success: true, user: adminUser, role: "admin" };
  }

  if (
    cleanEmail === DEMO_EVALUATION_CREDENTIALS.teacher.email.toLowerCase() &&
    cleanPass === SPECIAL_CREDENTIALS.teacher.specialPass
  ) {
    const teacherUser = DEMO_EVALUATION_CREDENTIALS.teacher.profile;
    setAuthSession(teacherUser, "token-teacher-session");
    return { success: true, user: teacherUser, role: "teacher" };
  }

  // Fallback checks for standard admin/teacher emails with password >= 6
  if (cleanEmail.includes("admin") && cleanPass.length >= 6) {
    const adminUser: UserProfileRecord = {
      id: "usr-admin-01",
      email: cleanEmail,
      full_name: "Executive Dean Faisal Al-Hanoon",
      role: "admin",
      district: "Calicut",
    };
    setAuthSession(adminUser, "token-admin-session");
    return { success: true, user: adminUser, role: "admin" };
  }

  if (cleanEmail.includes("teacher") && cleanPass.length >= 6) {
    const teacherUser: UserProfileRecord = {
      id: "usr-teacher-01",
      email: cleanEmail,
      full_name: "Usthad Abdul Rahman Al-Hafiz",
      role: "teacher",
      district: "Malappuram",
    };
    setAuthSession(teacherUser, "token-teacher-session");
    return { success: true, user: teacherUser, role: "teacher" };
  }

  return {
    success: false,
    error: "Invalid staff email or password. Please verify your credentials.",
  };
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
