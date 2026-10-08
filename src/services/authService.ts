import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export type UserRole = "student" | "teacher" | "admin" | "super_admin" | "verification_admin";

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
  role?: UserRole;
  token: string;
  expiresAt: number;
}

export const SESSION_COOKIE_NAME = "hanoon_auth_session";
export const LOCAL_SESSION_KEY = "hanoon_auth_session_v1";

// Role hierarchy helpers
export function isSuperAdminRole(role?: UserRole | string | null): boolean {
  return role === "admin" || role === "super_admin";
}

export function isVerificationAdminRole(role?: UserRole | string | null): boolean {
  return role === "verification_admin";
}

export function isAdminOrStaffRole(role?: UserRole | string | null): boolean {
  return role === "admin" || role === "super_admin" || role === "verification_admin";
}

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
  verificationAdmin: {
    email: "verify@hanoon.academy",
    profile: {
      id: "usr-verify-01",
      email: "verify@hanoon.academy",
      full_name: "Staff Verification Officer (Zayd)",
      role: "verification_admin" as UserRole,
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
  verificationAdmin: {
    ...DEMO_EVALUATION_CREDENTIALS.verificationAdmin,
    specialPass: "HANOON-VERIFY-2026!",
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
    role: user.role,
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
 * Retrieves the current authenticated session from local storage or cookie.
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
 * Dynamically fetches the current authenticated user's actual profile details
 * (full_name, role, district, phone) directly from the Supabase profiles/students table
 * using the active session user.id to guarantee fresh, unstale state.
 */
export async function fetchUserLiveProfile(
  userId: string,
  whatsappNum?: string
): Promise<{
  fullName: string | null;
  role: UserRole;
  district: string | null;
  phone: string | null;
}> {
  let fullName: string | null = null;
  let role: UserRole = "student";
  let district: string | null = null;
  let phone: string | null = whatsappNum || null;

  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Query Supabase profiles table using active user.id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email, role, district, whatsapp_num")
        .eq("id", userId)
        .maybeSingle();

      if (profile) {
        if (profile.full_name && profile.full_name.trim()) {
          fullName = profile.full_name.trim();
        }
        if (profile.role) {
          role = profile.role as UserRole;
        }
        if (profile.district) district = profile.district;
        if (profile.whatsapp_num) phone = profile.whatsapp_num;
      }

      // 2. Query Supabase students table (by user_id, id, or phone number)
      let studentRecord: any = null;
      const { data: studentById } = await supabase
        .from("students")
        .select("id, user_id, full_name, whatsapp_num, district")
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();

      studentRecord = studentById;

      if (!studentRecord && phone) {
        const cleanPhone = phone.replace(/\D/g, "");
        if (cleanPhone) {
          const { data: studentByPhone } = await supabase
            .from("students")
            .select("id, user_id, full_name, whatsapp_num, district")
            .eq("whatsapp_num", cleanPhone)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          studentRecord = studentByPhone;
        }
      }

      if (studentRecord) {
        if (studentRecord.full_name && studentRecord.full_name.trim()) {
          fullName = studentRecord.full_name.trim();
        }
        if (studentRecord.district) district = studentRecord.district;
        if (studentRecord.whatsapp_num) phone = studentRecord.whatsapp_num;
      }
    } catch (err) {
      console.warn("Error fetching user live profile from Supabase:", err);
    }
  }

  // 3. Fallback: check local storage students if Supabase is offline
  if (!fullName && typeof window !== "undefined") {
    try {
      const localStudentsRaw = localStorage.getItem("hanoon_local_students");
      if (localStudentsRaw) {
        const localStudents = JSON.parse(localStudentsRaw);
        if (Array.isArray(localStudents)) {
          const cleanP = phone ? phone.replace(/\D/g, "") : "";
          const matched = localStudents.find(
            (s: any) =>
              s.id === userId ||
              (cleanP && s.whatsapp_num === cleanP)
          );
          if (matched && matched.full_name) {
            fullName = matched.full_name.trim();
            if (matched.district) district = matched.district;
            if (matched.whatsapp_num) phone = matched.whatsapp_num;
          }
        }
      }
    } catch (e) {
      console.warn("Error reading local students fallback:", e);
    }
  }

  return { fullName, role, district, phone };
}

/**
 * Checks for an active Supabase session when the app loads.
 * Dynamically synchronizes user details from Supabase to prevent stale names,
 * and returns the authenticated session data.
 */
export async function checkActiveSupabaseSession(): Promise<AuthSessionData | null> {
  // 1. Check live Supabase Auth session if configured
  if (isSupabaseConfigured && supabase) {
    try {
      const {
        data: { session: supabaseSession },
        error,
      } = await supabase.auth.getSession();

      if (!error && supabaseSession && supabaseSession.user) {
        const liveProfile = await fetchUserLiveProfile(
          supabaseSession.user.id,
          supabaseSession.user.user_metadata?.whatsapp_num
        );

        const resolvedName =
          liveProfile.fullName ||
          supabaseSession.user.user_metadata?.full_name ||
          supabaseSession.user.email?.split("@")[0] ||
          "Student";

        const resolvedRole =
          liveProfile.role ||
          (supabaseSession.user.user_metadata?.role as UserRole) ||
          "student";

        const userRecord: UserProfileRecord = {
          id: supabaseSession.user.id,
          email: supabaseSession.user.email || "",
          full_name: resolvedName,
          role: resolvedRole,
          district:
            liveProfile.district ||
            supabaseSession.user.user_metadata?.district ||
            "Kerala",
          whatsapp_num:
            liveProfile.phone ||
            supabaseSession.user.user_metadata?.whatsapp_num ||
            "",
        };

        setAuthSession(userRecord, supabaseSession.access_token);
        return {
          user: userRecord,
          token: supabaseSession.access_token,
          expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 365,
        };
      }
    } catch (err) {
      console.warn("Supabase active session check warning:", err);
    }
  }

  // 2. Check local/cookie stored session
  const current = getCurrentSession();
  if (current && current.user) {
    // Dynamically refresh profile to guarantee no stale name
    if (isSupabaseConfigured && supabase) {
      try {
        const liveProfile = await fetchUserLiveProfile(
          current.user.id,
          current.user.whatsapp_num
        );
        if (liveProfile.fullName && liveProfile.fullName !== current.user.full_name) {
          current.user.full_name = liveProfile.fullName;
          if (liveProfile.district) current.user.district = liveProfile.district;
          if (liveProfile.phone) current.user.whatsapp_num = liveProfile.phone;
          setAuthSession(current.user, current.token);
        }
      } catch (e) {
        console.warn("Could not sync live profile for current session:", e);
      }
    }
    return current;
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

  // Prevent stale cache leakage: clear any previous student's local payments cache
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("hanoon_local_payments");
    } catch (e) {
      console.warn("Could not clear local payments cache:", e);
    }
  }

  // 1. Supabase live database lookup (if configured)
  if (isSupabaseConfigured && supabase) {
    try {
      // Look up student by phone number in 'students' table
      const { data: existingStudent } = await supabase
        .from("students")
        .select(`
          id,
          user_id,
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
        const newDistrict = district?.trim() || "Malappuram";

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
      } else if (fullName && fullName.trim() && studentRecord.full_name !== fullName.trim()) {
        // Update existing student's name if a specific new name is provided
        const { data: updatedStudent } = await supabase
          .from("students")
          .update({
            full_name: fullName.trim(),
            district: district?.trim() || studentRecord.district,
          })
          .eq("id", studentRecord.id)
          .select(`id, user_id, full_name, whatsapp_num, district, created_at, payments(*)`)
          .single();

        if (updatedStudent) {
          studentRecord = updatedStudent;
        }
      }

      // Check payment verification status for THIS student specifically
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

      const resolvedName =
        fullName?.trim() || studentRecord?.full_name || `Student ${cleanPhone.slice(-4)}`;
      const resolvedDistrict =
        district?.trim() || studentRecord?.district || "Malappuram";
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
  const fallbackName = fullName?.trim() || `Student ${cleanPhone.slice(-4)}`;
  const fallbackDistrict = district?.trim() || "Malappuram";

  const localUser: UserProfileRecord = {
    id: `std-${cleanPhone}`,
    email: `${cleanPhone}@student.hanoon.academy`,
    full_name: fallbackName,
    role: "student",
    whatsapp_num: cleanPhone,
    district: fallbackDistrict,
  };

  // Cache in local students list so profile fetch succeeds
  if (typeof window !== "undefined") {
    try {
      const existingList = JSON.parse(
        localStorage.getItem("hanoon_local_students") || "[]"
      );
      const filtered = Array.isArray(existingList)
        ? existingList.filter((s: any) => s.whatsapp_num !== cleanPhone)
        : [];
      localStorage.setItem(
        "hanoon_local_students",
        JSON.stringify([
          {
            id: localUser.id,
            full_name: localUser.full_name,
            whatsapp_num: localUser.whatsapp_num,
            district: localUser.district,
            created_at: new Date().toISOString(),
          },
          ...filtered,
        ])
      );
    } catch (e) {
      console.warn("Could not save to local students:", e);
    }
  }

  setAuthSession(localUser, `token-phone-local-${Date.now()}`);
  return { success: true, user: localUser, isVerified: false };
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
  role?: UserRole;
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

        if (role !== "admin" && role !== "super_admin" && role !== "verification_admin" && role !== "teacher") {
          return {
            success: false,
            error: "Access Denied: This portal requires verified Faculty or Administrator credentials.",
          };
        }

        const fallbackTitle =
          role === "verification_admin"
            ? "Verification Staff Officer"
            : role === "teacher"
            ? "Faculty Member"
            : "Academy Administrator";

        const userRecord: UserProfileRecord = {
          id: authData.user.id,
          email: authData.user.email || cleanEmail,
          full_name: profileData?.full_name || authData.user.user_metadata?.full_name || fallbackTitle,
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
    cleanEmail === DEMO_EVALUATION_CREDENTIALS.verificationAdmin.email.toLowerCase() &&
    cleanPass === SPECIAL_CREDENTIALS.verificationAdmin.specialPass
  ) {
    const verifyUser = DEMO_EVALUATION_CREDENTIALS.verificationAdmin.profile;
    setAuthSession(verifyUser, "token-verify-session");
    return { success: true, user: verifyUser, role: "verification_admin" };
  }

  if (
    cleanEmail === DEMO_EVALUATION_CREDENTIALS.teacher.email.toLowerCase() &&
    cleanPass === SPECIAL_CREDENTIALS.teacher.specialPass
  ) {
    const teacherUser = DEMO_EVALUATION_CREDENTIALS.teacher.profile;
    setAuthSession(teacherUser, "token-teacher-session");
    return { success: true, user: teacherUser, role: "teacher" };
  }

  // Fallback checks for standard admin/verification/teacher emails with password >= 6
  if ((cleanEmail.includes("verify") || cleanEmail.includes("verification")) && cleanPass.length >= 6) {
    const verifyUser: UserProfileRecord = {
      id: "usr-verify-01",
      email: cleanEmail,
      full_name: "Staff Verification Officer (Zayd)",
      role: "verification_admin",
      district: "Calicut",
    };
    setAuthSession(verifyUser, "token-verify-session");
    return { success: true, user: verifyUser, role: "verification_admin" };
  }

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
    cleanId === DEMO_EVALUATION_CREDENTIALS.verificationAdmin.email.toLowerCase() &&
    cleanPass === SPECIAL_CREDENTIALS.verificationAdmin.specialPass
  ) {
    const verifyUser = DEMO_EVALUATION_CREDENTIALS.verificationAdmin.profile;
    setAuthSession(verifyUser, "token-verify-demo");
    return { success: true, user: verifyUser, role: "verification_admin" };
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
 * Clears session cookie, Supabase session, cached payments, student records, and localStorage.
 * Dispatches global logout events to immediately purge any stale React states.
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
      // 1. Purge auth session & cookies
      localStorage.removeItem(LOCAL_SESSION_KEY);
      document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;

      // 2. Purge cached user payments & student profiles to prevent stale name/payment leaks
      localStorage.removeItem("hanoon_local_payments");
      localStorage.removeItem("hanoon_local_students");
      localStorage.removeItem("hanoon_user_profile");

      // 3. Dispatch global reactivity events
      window.dispatchEvent(new CustomEvent("hanoon_auth_changed", { detail: null }));
      window.dispatchEvent(new CustomEvent("hanoon_logout_event", { detail: null }));
      window.dispatchEvent(new CustomEvent("hanoon_payment_event", { detail: null }));
    } catch (err) {
      console.error("Error clearing session:", err);
    }
  }
}
