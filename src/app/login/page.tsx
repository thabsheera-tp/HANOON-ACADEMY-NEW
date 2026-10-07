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
  getCurrentSession,
} from "@/services/authService";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Portal Mode: Default is "student" (frictionless phone number). "staff" is discrete toggle.
  const [portalCategory, setPortalCategory] = useState<"student" | "staff">("student");

  // Student Input States
  const [studentPhone, setStudentPhone] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentDistrict, setStudentDistrict] = useState("Malappuram");

  // Staff Input States
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Status & Feedback States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check query parameters and auto-session restoration
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const reasonParam = searchParams.get("reason");
    const portalParam = searchParams.get("portal");

    if (portalParam === "staff" || errorParam === "admin_only" || errorParam === "teacher_only") {
      setPortalCategory("staff");
    }

    if (errorParam === "admin_only") {
      setErrorMessage("Access Denied: The /admin portal requires verified Administrator credentials.");
    } else if (errorParam === "teacher_only") {
      setErrorMessage("Access Denied: The /teacher portal requires authorized Faculty credentials.");
    } else if (reasonParam === "unauthenticated") {
      setErrorMessage("Please sign in with your authorized credentials to access this protected area.");
    } else if (reasonParam === "expired") {
      setErrorMessage("Your session has expired. Please log in again.");
    }

    // Auto-restore already active sessions (Students never need to re-login)
    if (!errorParam && !reasonParam) {
      const session = getCurrentSession();
      if (session && session.user) {
        if (session.user.role === "admin") {
          router.replace("/admin");
        } else if (session.user.role === "teacher") {
          router.replace("/teacher");
        } else if (session.user.role === "student") {
          router.replace("/student");
        }
      }
    }
  }, [searchParams, router]);

  // Handle Frictionless Student Login (Strictly Phone Number)
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const result = await loginStudentWithPhone(studentPhone, studentName, studentDistrict);

      if (result.success && result.user) {
        if (result.isVerified) {
          setSuccessMessage(`Welcome back, ${result.user.full_name}! Verified session restored. Redirecting...`);
        } else {
          setSuccessMessage(`Welcome to Hanoon Academy, ${result.user.full_name}! Redirecting...`);
        }

        setTimeout(() => {
          router.push("/student");
        }, 500);
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

  // Handle Secure Staff Login (Strictly Email & Password)
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const result = await loginStaffWithCredentials(staffEmail, staffPassword);

      if (result.success && result.role) {
        setSuccessMessage(`Authenticated as ${result.role === "admin" ? "Administrator" : "Faculty Member"}! Redirecting...`);

        setTimeout(() => {
          if (result.role === "admin") {
            router.push("/admin");
          } else {
            router.push("/teacher");
          }
        }, 500);
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
            : "Enter your Phone Number to access your courses, live classes & student dashboard."}
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
            1. STUDENT AUTH FORM (Frictionless: Phone Number ONLY)
            ======================================================== */}
        {portalCategory === "student" ? (
          <form onSubmit={handleStudentSubmit} className="space-y-4">
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

            {/* Optional Full Name (For new registrations) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Student Name <span className="text-slate-400 font-normal">(Optional for first-time login)</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
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
             2. STAFF AUTH FORM (Secure Credentials: Email & Password)
             ======================================================== */
          <form onSubmit={handleStaffSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center gap-2 text-xs font-semibold text-purple-900">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Restricted entrance for verified Teachers & Administrators</span>
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
            DISCRETE TOGGLE (Switch between Student and Staff Portals)
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
              className="text-xs font-bold text-slate-500 hover:text-purple-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              <span>Are you Faculty or Administrator? Staff Login &rarr;</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPortalCategory("student");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>&larr; Return to Student Phone Login</span>
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
