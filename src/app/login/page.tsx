"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  ShieldCheck,
  User,
  GraduationCap,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
} from "lucide-react";
import HanoonLogo from "@/components/brand/HanoonLogo";
import { loginUser, getCurrentSession, setAuthSession, SPECIAL_CREDENTIALS, UserRole } from "@/services/authService";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if redirected with error reason
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const reasonParam = searchParams.get("reason");

    if (errorParam === "admin_only") {
      setErrorMessage("Access Denied: The /admin portal requires verified Administrator credentials.");
    } else if (errorParam === "teacher_only") {
      setErrorMessage("Access Denied: The /teacher portal requires authorized Faculty credentials.");
    } else if (reasonParam === "unauthenticated") {
      setErrorMessage("Please sign in with your authorized credentials to access this protected area.");
    } else if (reasonParam === "expired") {
      setErrorMessage("Your session has expired. Please log in again.");
    }

    // Only auto-redirect if NO error/reason was passed
    if (!errorParam && !reasonParam) {
      const session = getCurrentSession();
      if (session && session.user) {
        if (session.user.role === "admin") router.push("/admin");
        else if (session.user.role === "teacher") router.push("/teacher");
        else router.push("/student");
      }
    }
  }, [searchParams, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const result = await loginUser(identifier, password);

      if (result.success && result.role) {
        setSuccessMessage(`Authenticated as ${result.role.toUpperCase()}! Redirecting...`);

        setTimeout(() => {
          if (result.role === "admin") {
            router.push("/admin");
          } else if (result.role === "teacher") {
            router.push("/teacher");
          } else {
            router.push("/student");
          }
        }, 500);
      } else {
        setErrorMessage(result.error || "Invalid credentials. Please verify your email and password.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick Credential Autofill Helper for Testing
  const handleQuickFill = (role: UserRole) => {
    setErrorMessage(null);
    if (role === "admin") {
      setIdentifier(SPECIAL_CREDENTIALS.admin.email);
      setPassword(SPECIAL_CREDENTIALS.admin.specialPass);
    } else if (role === "teacher") {
      setIdentifier(SPECIAL_CREDENTIALS.teacher.email);
      setPassword(SPECIAL_CREDENTIALS.teacher.specialPass);
    } else {
      setIdentifier("student@hanoon.academy");
      setPassword("student123");
    }
  };

  const handleDirectJump = (role: UserRole) => {
    if (role === "admin") {
      setAuthSession(SPECIAL_CREDENTIALS.admin.profile);
      router.push("/admin");
    } else if (role === "teacher") {
      setAuthSession(SPECIAL_CREDENTIALS.teacher.profile);
      router.push("/teacher");
    } else {
      router.push("/student");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-1">
          <HanoonLogo size="lg" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Academy Sign In
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Access your personalized student curriculum, faculty desk, or admin portal.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-md space-y-5">
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Email Address or Student ID
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="name@hanoon.academy"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Secret Password / Passkey
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In Securely</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Testing Login Autofill */}
        <div className="pt-3 border-t border-purple-50 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold">
            <KeyRound className="w-3.5 h-3.5 text-purple-600" />
            <span>1-Click Direct Portal Access (Evaluation Mode):</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDirectJump("student")}
              className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold flex flex-col items-center justify-center cursor-pointer transition-all border border-purple-100"
            >
              <User className="w-4 h-4 mb-0.5 text-purple-600" />
              <span>Student</span>
            </button>

            <button
              type="button"
              onClick={() => handleDirectJump("teacher")}
              className="p-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 text-[11px] font-bold flex flex-col items-center justify-center cursor-pointer transition-all border border-purple-200 shadow-2xs"
            >
              <GraduationCap className="w-4 h-4 mb-0.5 text-purple-700" />
              <span>Teacher</span>
            </button>

            <button
              type="button"
              onClick={() => handleDirectJump("admin")}
              className="p-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-[11px] font-bold flex flex-col items-center justify-center cursor-pointer transition-all border border-purple-100"
            >
              <ShieldCheck className="w-4 h-4 mb-0.5 text-purple-600" />
              <span>Admin</span>
            </button>
          </div>
        </div>
      </div>

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
