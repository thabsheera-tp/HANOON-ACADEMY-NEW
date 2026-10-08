"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  ShieldCheck,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Phone,
  MapPin,
  Sparkles,
} from "lucide-react";
import HanoonLogo from "@/components/brand/HanoonLogo";
import {
  loginStudentWithPhone,
  loginStaffWithCredentials,
  checkActiveSupabaseSession,
  getCurrentSession,
} from "@/services/authService";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Portal Mode: Default is "student". "staff" is discrete toggle.
  const [portalCategory, setPortalCategory] = useState<"student" | "staff">("student");

  // Student Input States
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentDistrict, setStudentDistrict] = useState("Malappuram");

  // Staff Input States
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check active Supabase session on load and auto-route
  useEffect(() => {
    let isMounted = true;

    const checkSessionAndAutoRoute = async () => {
      const activeSession = await checkActiveSupabaseSession();
      if (!isMounted) return;

      if (activeSession && activeSession.user) {
        if (
          activeSession.user.role === "admin" ||
          activeSession.user.role === "super_admin" ||
          activeSession.user.role === "verification_admin"
        ) {
          router.replace("/admin");
          return;
        } else if (activeSession.user.role === "teacher") {
          router.replace("/teacher");
          return;
        } else {
          router.replace("/student");
          return;
        }
      }

      setCheckingAuth(false);
    };

    const errorParam = searchParams.get("error");
    const reasonParam = searchParams.get("reason");
    const portalParam = searchParams.get("portal");

    if (portalParam === "staff" || errorParam === "admin_only" || errorParam === "teacher_only") {
      setPortalCategory("staff");
    }

    if (errorParam === "admin_only") {
      setErrorMessage("Access Denied: The /admin portal requires verified Administrator credentials.");
      setCheckingAuth(false);
    } else if (errorParam === "teacher_only") {
      setErrorMessage("Access Denied: The /teacher portal requires authorized Faculty credentials.");
      setCheckingAuth(false);
    } else if (reasonParam === "unauthenticated") {
      setErrorMessage("Please sign in with your authorized credentials to access this protected area.");
      setCheckingAuth(false);
    } else if (reasonParam === "expired") {
      setErrorMessage("Your session has expired. Please log in again.");
      setCheckingAuth(false);
    } else {
      checkSessionAndAutoRoute();
    }

    return () => {
      isMounted = false;
    };
  }, [searchParams, router]);

  // Handle Student Login / Onboarding (Full Name & Phone Number)
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = studentName.trim();
    const cleanPhone = studentPhone.replace(/\D/g, "");

    if (!cleanName) {
      setErrorMessage("Please enter your full name.");
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile or WhatsApp number.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await loginStudentWithPhone(
        studentPhone,
        cleanName,
        studentDistrict.trim() || "Malappuram"
      );

      if (result.success && result.user) {
        setSuccessMessage(`Welcome, ${result.user.full_name}! Redirecting to your dashboard...`);

        setTimeout(() => {
          router.push("/student");
        }, 350);
      } else {
        setErrorMessage(result.error || "Please enter a valid 10-digit mobile number.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Secure Staff Login (Email & Password)
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const result = await loginStaffWithCredentials(staffEmail, staffPassword);

      if (result.success && result.role) {
        const isVerif = result.role === "verification_admin";
        const roleLabel = isVerif
          ? "Verification Staff"
          : result.role === "teacher"
          ? "Faculty Member"
          : "Administrator";

        setSuccessMessage(`Authenticated as ${roleLabel}! Redirecting...`);

        setTimeout(() => {
          if (
            result.role === "admin" ||
            result.role === "super_admin" ||
            result.role === "verification_admin"
          ) {
            router.push("/admin");
          } else {
            router.push("/teacher");
          }
        }, 350);
      } else {
        setErrorMessage(result.error || "Invalid staff email or password. Please verify your credentials.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="w-full max-w-md mx-auto py-16 flex flex-col items-center justify-center space-y-3 font-['Plus_Jakarta_Sans']">
        <div className="w-8 h-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
        <span className="text-xs font-semibold text-purple-700">Verifying session...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-5">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-1">
          <HanoonLogo size="lg" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {portalCategory === "staff" ? "Faculty & Administration Gateway" : "Student Portal Sign In"}
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          {portalCategory === "staff"
            ? "Secure credential access for verified Teachers and Academy Administrators."
            : "Enter your Name & Mobile Number to access your courses, live classes & student dashboard."}
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-md space-y-5">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ========================================================
            1. STUDENT ONBOARDING / LOGIN FORM (Name & Phone Number)
            ======================================================== */}
        {portalCategory === "student" ? (
          <form onSubmit={handleStudentSubmit} className="space-y-4">
            {/* Student Full Name Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Student Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Fathima Zahra"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold"
                />
              </div>
            </div>

            {/* Phone Number Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                WhatsApp / Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 98460 12345"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold"
                />
              </div>
              <p className="text-[10.5px] text-slate-400 font-medium">
                No passwords required. Your session stays permanently saved on this device.
              </p>
            </div>

            {/* District Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                District / Region
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Malappuram"
                  value={studentDistrict}
                  onChange={(e) => setStudentDistrict(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span>Accessing Student Account...</span>
              ) : (
                <>
                  <span>Continue to Student Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* ========================================================
             2. STAFF AUTH FORM (Email & Password)
             ======================================================== */
          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center justify-between gap-2 text-xs font-semibold text-purple-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                <span>Restricted entrance for Faculty & Administrators</span>
              </div>
            </div>

            {/* Quick Demo Staff Credentials Selector */}
            <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                Quick Demo Accounts (Evaluation):
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setStaffEmail("admin@hanoon.academy");
                    setStaffPassword("HANOON-ADMIN-2026!");
                  }}
                  className="px-2 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-800 text-[11px] font-bold transition-all cursor-pointer"
                >
                  Super Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStaffEmail("verify@hanoon.academy");
                    setStaffPassword("HANOON-VERIFY-2026!");
                  }}
                  className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold transition-all cursor-pointer"
                >
                  Verification Staff
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStaffEmail("teacher@hanoon.academy");
                    setStaffPassword("HANOON-TEACHER-2026!");
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-[11px] font-bold transition-all cursor-pointer"
                >
                  Faculty Member
                </button>
              </div>
            </div>

            {/* Staff Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Staff Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="faculty@hanoon.academy"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* Staff Password Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••••••"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <span>Authenticating Staff Credentials...</span>
              ) : (
                <>
                  <span>Authenticate Staff & Faculty</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================
            SUBTLE TOGGLE LINK (No Role Selection Questions Asked)
            ======================================================== */}
        <div className="pt-3 border-t border-purple-50 text-center">
          {portalCategory === "student" ? (
            <button
              type="button"
              onClick={() => {
                setPortalCategory("staff");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-purple-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <span>Institute Staff? Login Here</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPortalCategory("student");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <span>Student? Login Here</span>
            </button>
          )}
        </div>
      </div>

      {/* Return to Home / Catalog */}
      <div className="text-center">
        <Link
          href="/"
          className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors inline-flex items-center gap-1"
        >
          <span>← Return to Home / Course Catalog</span>
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-purple-50/40 p-4 sm:p-6 flex items-center justify-center font-['Plus_Jakarta_Sans'] select-none">
      <Suspense fallback={<div className="text-xs text-purple-600">Loading portal...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
