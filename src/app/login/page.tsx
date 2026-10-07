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
  Phone,
  MapPin,
} from "lucide-react";
import HanoonLogo from "@/components/brand/HanoonLogo";
import {
  loginUser,
  signUpUser,
  getCurrentSession,
} from "@/services/authService";


function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [portalCategory, setPortalCategory] = useState<"student" | "staff">("student");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [whatsappNum, setWhatsappNum] = useState("");
  const [district, setDistrict] = useState("Malappuram");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check if redirected with error reason or specific portal param
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      if (portalCategory === "student" && authMode === "signup") {
        if (!fullName.trim()) {
          setErrorMessage("Please enter your full name.");
          setIsLoading(false);
          return;
        }

        const result = await signUpUser({
          email: identifier,
          password: password,
          fullName: fullName,
          role: "student",
          district: district,
          whatsappNum: whatsappNum,
        });

        if (result.success) {
          if (result.requiresEmailConfirmation) {
            setSuccessMessage(result.error || "Account created! Please check your email to confirm.");
            setAuthMode("signin");
          } else {
            setSuccessMessage("Account created successfully! Redirecting...");
            setTimeout(() => {
              router.push("/student");
            }, 600);
          }
        } else {
          setErrorMessage(result.error || "Sign up failed. Please check your details.");
        }
      } else {
        const result = await loginUser(identifier, password);

        if (result.success && result.role) {
          // If staff gateway, ensure role is teacher or admin
          if (portalCategory === "staff" && result.role === "student") {
            setErrorMessage("This account is registered as a Student. Please switch to the Student Portal above.");
            setIsLoading(false);
            return;
          }

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
          {portalCategory === "staff"
            ? "Faculty & Staff Gateway"
            : authMode === "signup"
            ? "Student Registration"
            : "Student Portal Sign In"}
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          {portalCategory === "staff"
            ? "Restricted entrance for verified Teachers and Academy Administrators."
            : authMode === "signup"
            ? "Create your student account to access courses, live classes & certificates."
            : "Sign in to access your registered courses and interactive student dashboard."}
        </p>
      </div>

      {/* Main Portal Card */}
      <div className="bg-white p-6 rounded-3xl border border-purple-100 shadow-md space-y-5">
        {/* Top Segmented Portal Selector (Strict Separation) */}
        <div className="flex p-1 bg-purple-100/70 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => {
              setPortalCategory("student");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              portalCategory === "student"
                ? "bg-white text-purple-700 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Student Portal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPortalCategory("staff");
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              portalCategory === "staff"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Faculty & Admin</span>
          </button>
        </div>

        {/* Student Auth Mode Toggle (Sign In / Register) */}
        {portalCategory === "student" && (
          <div className="grid grid-cols-2 p-1 bg-purple-50 rounded-2xl gap-1">
            <button
              type="button"
              onClick={() => {
                setAuthMode("signin");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === "signin"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                authMode === "signup"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Create Account
            </button>
          </div>
        )}

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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Sign Up Exclusive Fields */}
          {authMode === "signup" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aysha Mariyam"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    WhatsApp Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="9846012345"
                      value={whatsappNum}
                      onChange={(e) => setWhatsappNum(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    District
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Malappuram"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full pl-10 pr-3 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              {authMode === "signup" ? "Create Password (min 6 chars)" : "Password"}
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
              <span>
                {portalCategory === "staff"
                  ? "Verifying Staff Credentials..."
                  : authMode === "signup"
                  ? "Creating Account..."
                  : "Authenticating Student..."}
              </span>
            ) : (
              <>
                <span>
                  {portalCategory === "staff"
                    ? "Sign In to Staff Gateway"
                    : authMode === "signup"
                    ? "Complete Registration"
                    : "Sign In as Student"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Portal Switch Prompt */}
        <div className="pt-2 border-t border-purple-50 text-center">
          {portalCategory === "student" ? (
            <button
              type="button"
              onClick={() => {
                setPortalCategory("staff");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="text-xs font-bold text-purple-700 hover:text-purple-900 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Are you Faculty or Administrator? Enter Staff Gateway &rarr;</span>
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
              <span>Are you a Student? Enter Student Portal &rarr;</span>
            </button>
          )}
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
