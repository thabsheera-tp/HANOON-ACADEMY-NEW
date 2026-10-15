"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import {
  loginAdminWithSupabase,
  getCurrentSession,
  isAdminOrStaffRole,
} from "@/services/authService";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCheckingInitialAuth, setIsCheckingInitialAuth] = useState(true);

  // Check if admin is already logged in with a valid session
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const reasonParam = searchParams.get("reason");

    if (errorParam === "admin_only") {
      setErrorMessage("Access Denied: The administrator dashboard requires verified Admin credentials.");
    } else if (reasonParam === "expired") {
      setErrorMessage("Your previous administrator session has expired. Please log in again.");
    } else if (reasonParam === "unauthenticated") {
      setErrorMessage("Authentication required: Please sign in with your administrator account.");
    }

    const currentSession = getCurrentSession();
    if (currentSession && currentSession.user && isAdminOrStaffRole(currentSession.user.role)) {
      router.replace("/admin");
    } else {
      setIsCheckingInitialAuth(false);
    }
  }, [router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setErrorMessage("Please enter your administrator email address.");
      return;
    }
    if (!cleanPassword) {
      setErrorMessage("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      // 1. Authenticate using Supabase Auth signInWithPassword
      const result = await loginAdminWithSupabase(cleanEmail, cleanPassword);

      if (result.success && result.user) {
        setSuccessMessage(`Authentication verified! Welcome back, ${result.user.full_name || "Admin"}.`);

        const redirectUrl = searchParams.get("redirect") || "/admin";
        setTimeout(() => {
          router.replace(redirectUrl);
        }, 400);
      } else {
        setErrorMessage(result.error || "Invalid credentials. Please verify your administrator email and password.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected authentication error occurred.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingInitialAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-slate-400">Verifying administrator session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-['Plus_Jakarta_Sans'] relative overflow-hidden select-none">
      {/* Background Decorative Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Academy</span>
          </Link>
          <span className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-800/60 text-purple-300">
            Staff Portal
          </span>
        </div>

        {/* Card */}
        <div className="bg-slate-900/90 border border-purple-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-lg shadow-purple-600/30">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                Admin Authentication
              </h1>
              <p className="text-xs text-slate-400 font-medium mt-1">
                Secure Supabase sign-in for Hanoon Academy Administrators
              </p>
            </div>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs font-semibold flex items-start gap-2.5 animate-in fade-in zoom-in-95 duration-150">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-snug">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-200 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-email"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider"
              >
                Administrator Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@hanoon.academy"
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/70 border border-slate-800 focus:border-purple-500 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold text-slate-300 uppercase tracking-wider"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isLoading}
                  className="w-full pl-10 pr-11 py-3 bg-slate-950/70 border border-slate-800 focus:border-purple-500 rounded-2xl text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-medium disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authenticating via Supabase...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Indicator */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500 font-semibold">
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span>Protected by Supabase Authentication & RLS</span>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center space-y-1">
          <p className="text-[11px] text-slate-600">
            Hanoon Academy Academic Information System &copy; {new Date().getFullYear()}
          </p>
          <div className="flex items-center justify-center gap-3 text-xs text-slate-500 font-semibold">
            <Link href="/login" className="hover:text-purple-400 transition-colors">
              Student Login
            </Link>
            <span>&bull;</span>
            <Link href="/login?portal=staff" className="hover:text-purple-400 transition-colors">
              Faculty Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-9 h-9 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-400">Loading admin authentication...</span>
          </div>
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
