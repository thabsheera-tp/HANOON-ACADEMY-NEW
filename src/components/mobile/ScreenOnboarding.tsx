"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, MapPin, Calendar, Lock, ArrowRight, RefreshCw, MessageCircle } from "lucide-react";
import { UserProfile, SelectedCourse } from "@/types/app";
import { getAppSettings, formatWhatsAppLink } from "@/services/settingsService";

interface ScreenOnboardingProps {
  userProfile: UserProfile;
  selectedCourse?: SelectedCourse;
  onSaveProfile: (profile: UserProfile) => Promise<void> | void;
  onSelectCourse?: (course: SelectedCourse) => void;
  onProceedToCourses?: (profile?: UserProfile) => void;
  onProceedToPayment?: () => void;
  onBackToHome?: () => void;
  onBackToCourse?: () => void;
}

// Helper to filter out any staff/verifier demo names
const isStaffOrOfficer = (val?: string) => {
  const lower = (val || "").toLowerCase();
  return (
    lower.includes("officer") ||
    lower.includes("staff") ||
    lower.includes("admin") ||
    lower.includes("verifier")
  );
};

export default function ScreenOnboarding({
  userProfile,
  selectedCourse,
  onSaveProfile,
  onProceedToCourses,
  onProceedToPayment,
  onBackToHome,
  onBackToCourse,
}: ScreenOnboardingProps) {
  const router = useRouter();

  // Clean initial states: never auto-fill staff or verifier account names
  const initialName = isStaffOrOfficer(userProfile.name) ? "" : userProfile.name || "";
  const initialPlace = isStaffOrOfficer(userProfile.name) ? "" : userProfile.place || "";

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(userProfile.phone || "");
  const [place, setPlace] = useState(initialPlace);
  const [age, setAge] = useState(userProfile.age ? String(userProfile.age) : "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  // Clean any contaminated localStorage keys from past verifier tests
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("hanoon_student_profile");
        if (raw && (raw.includes("Staff") || raw.includes("Officer") || raw.includes("verifier"))) {
          localStorage.removeItem("hanoon_student_profile");
        }
      } catch {}
    }
  }, []);

  // Update when userProfile prop updates with legitimate student data
  useEffect(() => {
    if (userProfile.name && !isStaffOrOfficer(userProfile.name)) {
      setName(userProfile.name);
    }
    if (userProfile.phone) {
      setPhone(userProfile.phone);
    }
    if (userProfile.place && !isStaffOrOfficer(userProfile.name)) {
      setPlace(userProfile.place);
    }
  }, [userProfile.name, userProfile.phone, userProfile.place]);

  const handleSubmit = async (e: React.FormEvent) => {
    // 1. Explicitly prevent default form reload to prevent kickout to "/"
    e.preventDefault();

    // 2. Synchronous debouncing guard to prevent multiple submissions
    if (isSubmittingRef.current || isSubmitting) return;

    if (!name.trim()) {
      setError("Please enter your Student Full Name.");
      return;
    }
    if (!age.trim()) {
      setError("Please enter your Age.");
      return;
    }
    const ageNum = parseInt(age.trim(), 10);
    if (isNaN(ageNum) || ageNum < 3 || ageNum > 100) {
      setError("Please enter a valid age between 3 and 100.");
      return;
    }
    const cleanDigits = phone.replace(/\D/g, "");
    if (!cleanDigits || cleanDigits.length < 10) {
      setError("Please enter a valid 10-digit WhatsApp or mobile number.");
      return;
    }
    if (!place.trim()) {
      setError("Please enter your Place & District.");
      return;
    }

    setError(null);
    // Instantly lock and show loading state
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const newProfile: UserProfile = {
      name: name.trim(),
      phone: cleanDigits,
      place: place.trim(),
      age: age.trim() || undefined,
    };

    try {
      // 3. Save profile securely
      await onSaveProfile(newProfile);
    } catch (saveErr) {
      console.warn("Could not save student profile:", saveErr);
    }

    // 4. Smoothly route user to next step without hard reload or redirecting to "/"
    if (onProceedToCourses) {
      onProceedToCourses(newProfile);
    } else if (onProceedToPayment) {
      onProceedToPayment();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-5 flex-1 flex flex-col justify-between select-none font-['Plus_Jakarta_Sans'] bg-white">
      <div className="space-y-4">
        {/* Header Title: Student Details */}
        <div className="pt-1 pb-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            Student Details
          </h1>
        </div>

        {/* Validation Error Notice */}
        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 animate-fade-in">
            {error}
          </div>
        )}

        {/* Mobile-First Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {/* Field 1: Student Full Name * */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">
              Student Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="e.g. Fathima Zahra"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-3.5 min-h-[48px] rounded-2xl bg-purple-50/40 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-base sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold focus:ring-4 focus:ring-purple-500/10"
              />
            </div>
          </div>

          {/* Field 2: Age * (Placeholder: e.g. 14) */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">
              Age <span className="text-rose-500">*</span>
            </label>
            <div className="relative w-32 sm:w-36">
              <Calendar className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="number"
                inputMode="numeric"
                required
                min="3"
                max="100"
                placeholder="e.g. 14"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full pl-10 pr-3 py-3 sm:py-3.5 min-h-[48px] rounded-2xl bg-purple-50/40 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-base sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold focus:ring-4 focus:ring-purple-500/10"
              />
            </div>
          </div>

          {/* Field 3: WhatsApp / Mobile Number * */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">
              WhatsApp / Mobile Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                inputMode="tel"
                required
                autoComplete="tel"
                placeholder="e.g. 9846012345"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full pl-10 pr-4 py-3 sm:py-3.5 min-h-[48px] rounded-2xl bg-purple-50/40 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-base sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold focus:ring-4 focus:ring-purple-500/10 font-mono"
              />
            </div>
          </div>

          {/* Field 4: Place & District * */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">
              Place & District <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                autoComplete="address-level2"
                placeholder="e.g. Manjeri, Malappuram"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-3.5 min-h-[48px] rounded-2xl bg-purple-50/40 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-base sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold focus:ring-4 focus:ring-purple-500/10"
              />
            </div>
          </div>

          {/* Full-Width Action CTA Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[50px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                  <span>Saving details...</span>
                </>
              ) : (
                <span>Proceed to Enrollment →</span>
              )}
            </button>
          </div>
        </form>

        {/* Bottom Links Directly Below Button */}
        <div className="text-center pt-3 pb-2 space-y-2.5">
          {/* Link 1: Institute Staff? Login Here */}
          <div>
            <button
              type="button"
              onClick={() => router.push("/login?portal=staff")}
              className="text-xs font-semibold text-slate-500 hover:text-purple-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <span>Institute Staff? Login Here</span>
            </button>
          </div>

          {/* Link 2: ← Return to Home / Course Catalog */}
          <div>
            <button
              type="button"
              onClick={onBackToHome || (() => router.push("/"))}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors inline-flex items-center gap-1 cursor-pointer py-1"
            >
              <span>← Return to Home / Course Catalog</span>
            </button>
          </div>

          {/* Link 3: Need Help? Chat with Admin on WhatsApp */}
          <div>
            <a
              href={formatWhatsAppLink(
                getAppSettings().contactWhatsApp,
                "Assalamu Alaikum Admin, I need assistance with registration/enrollment at Hanoon Academy."
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11.5px] font-semibold text-slate-500 hover:text-emerald-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Need Help? Chat with Admin on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
