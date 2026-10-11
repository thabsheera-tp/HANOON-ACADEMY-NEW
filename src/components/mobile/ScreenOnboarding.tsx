"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, MapPin, Calendar, Lock, ArrowRight } from "lucide-react";
import { UserProfile, SelectedCourse } from "@/types/app";

interface ScreenOnboardingProps {
  userProfile: UserProfile;
  selectedCourse?: SelectedCourse;
  onSaveProfile: (profile: UserProfile) => void;
  onSelectCourse?: (course: SelectedCourse) => void;
  onProceedToCourses?: () => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your Student Full Name.");
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setError("Please enter a valid 10-digit WhatsApp or mobile number.");
      return;
    }
    if (!place.trim()) {
      setError("Please enter your Place & District.");
      return;
    }

    if (age.trim()) {
      const ageNum = parseInt(age.trim(), 10);
      if (isNaN(ageNum) || ageNum < 3 || ageNum > 100) {
        setError("Please enter a valid age between 3 and 100.");
        return;
      }
    }

    setError(null);
    onSaveProfile({
      name: name.trim(),
      phone: phone.trim(),
      place: place.trim(),
      age: age.trim() || undefined,
    });

    if (onProceedToCourses) {
      onProceedToCourses();
    } else if (onProceedToPayment) {
      onProceedToPayment();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 sm:px-6 py-5 flex-1 flex flex-col justify-between select-none font-['Plus_Jakarta_Sans'] bg-white">
      <div className="space-y-4">
        {/* Mobile Header Banner */}
        <div className="pt-1 pb-1">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            Student Registration
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
          {/* Field 1: Student Full Name */}
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
                placeholder="Enter student full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 sm:py-3.5 min-h-[48px] rounded-2xl bg-purple-50/40 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-base sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold focus:ring-4 focus:ring-purple-500/10"
              />
            </div>
          </div>

          {/* Field 2: WhatsApp / Mobile Number */}
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

          {/* Field 3: Place & District */}
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

          {/* Field 4: Age (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-700 block">
              Age <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative w-40">
              <Calendar className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="number"
                inputMode="numeric"
                min="3"
                max="100"
                placeholder="e.g. 18"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full pl-10 pr-3 py-3 sm:py-3.5 min-h-[48px] rounded-2xl bg-purple-50/40 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-base sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold focus:ring-4 focus:ring-purple-500/10"
              />
            </div>
          </div>

          {/* Full-Width Mobile Action CTA Button */}
          <div className="pt-3">
            <button
              type="submit"
              className="w-full py-4 px-6 rounded-2xl font-black text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-[0.98] shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer min-h-[52px]"
            >
              <span>Continue to Courses</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Mobile Footer Links */}
      <div className="text-center pt-6 pb-2 space-y-3">
        {(onBackToHome || onBackToCourse) && (
          <div>
            <button
              type="button"
              onClick={onBackToHome || onBackToCourse}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 py-1.5 px-3 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
            >
              ← Back to Home
            </button>
          </div>
        )}
        <div>
          <button
            type="button"
            onClick={() => router.push("/login?portal=staff")}
            className="text-[11px] font-semibold text-slate-500 hover:text-purple-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1.5 px-2"
          >
            <Lock className="w-3 h-3 text-purple-600" />
            <span>Institute Staff? Login Here</span>
          </button>
        </div>
      </div>
    </div>
  );
}
