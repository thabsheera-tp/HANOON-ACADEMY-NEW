"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, MapPin, Calendar, ShieldCheck, Lock } from "lucide-react";
import { UserProfile, SelectedCourse } from "@/types/app";

interface ScreenOnboardingProps {
  userProfile: UserProfile;
  selectedCourse: SelectedCourse;
  onSaveProfile: (profile: UserProfile) => void;
  onProceedToPayment: () => void;
  onBackToCourse?: () => void;
}

export default function ScreenOnboarding({
  userProfile,
  selectedCourse,
  onSaveProfile,
  onProceedToPayment,
  onBackToCourse,
}: ScreenOnboardingProps) {
  const router = useRouter();
  const [name, setName] = useState(userProfile.name || "");
  const [age, setAge] = useState(userProfile.age ? String(userProfile.age) : "");
  const [phone, setPhone] = useState(userProfile.phone || "");
  const [place, setPlace] = useState(userProfile.place || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
      setError("Please enter a valid age.");
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

    setError(null);
    onSaveProfile({
      name: name.trim(),
      age: age.trim(),
      phone: phone.trim(),
      place: place.trim(),
    });
    onProceedToPayment();
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-5 flex-1 flex flex-col justify-between space-y-4 select-none font-['Plus_Jakarta_Sans'] bg-purple-50/30">
      <div className="space-y-4">
        {/* Selected Course Summary Banner */}
        <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 block">
              Admission Registration
            </span>
            <h3 className="text-base font-extrabold text-slate-900 leading-tight">
              {selectedCourse.title}
            </h3>
            <p className="text-xs text-slate-500">
              {selectedCourse.duration}
            </p>
          </div>

          <div className="text-right">
            <span className="text-base font-black text-purple-700 block">
              {selectedCourse.fee}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              One-time Fee
            </span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white p-5 rounded-2xl border border-purple-100 shadow-sm space-y-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Student Details
            </h2>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Field 1: Student Full Name * */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Student Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Fathima Zahra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold"
                />
              </div>
            </div>

            {/* Field 2: Age * (Short number input) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Age <span className="text-rose-500">*</span>
              </label>
              <div className="relative w-32 sm:w-36">
                <Calendar className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  required
                  min="4"
                  max="100"
                  placeholder="e.g. 14"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold"
                />
              </div>
            </div>

            {/* Field 3: WhatsApp / Mobile Number * */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                WhatsApp / Mobile Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9846012345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold"
                />
              </div>
            </div>

            {/* Field 4: Place & District * */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Place & District <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Manjeri, Malappuram"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold"
                />
              </div>
            </div>

            {/* Security Note */}
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center gap-2 text-xs text-purple-800">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Your data is securely stored and encrypted in Supabase.</span>
            </div>

            {/* Submit */}
            <div className="pt-1">
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Enrollment →</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="text-center pt-2 pb-4 space-y-2">
        {onBackToCourse && (
          <div>
            <button
              type="button"
              onClick={onBackToCourse}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
            >
              ← Change Course
            </button>
          </div>
        )}
        <div>
          <button
            type="button"
            onClick={() => router.push("/login?portal=staff")}
            className="text-[11px] font-semibold text-slate-500 hover:text-purple-700 transition-colors inline-flex items-center gap-1 cursor-pointer py-1"
          >
            <Lock className="w-3 h-3 text-purple-600" />
            <span>Institute Staff? Login Here</span>
          </button>
        </div>
      </div>
    </div>
  );
}
