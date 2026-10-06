"use client";

import React, { useState } from "react";
import { User, Phone, MapPin, ArrowRight, ShieldCheck } from "lucide-react";
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
  const [name, setName] = useState(userProfile.name || "");
  const [phone, setPhone] = useState(userProfile.phone || "");
  const [place, setPlace] = useState(userProfile.place || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      setError("Please enter a valid 10-digit WhatsApp number.");
      return;
    }
    if (!place.trim()) {
      setError("Please enter your place or district.");
      return;
    }

    setError(null);
    onSaveProfile({ name: name.trim(), phone: phone.trim(), place: place.trim() });
    onProceedToPayment();
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-5 flex-1 flex flex-col justify-between space-y-5 select-none font-['Plus_Jakarta_Sans'] bg-purple-50/30">
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
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              Student Details
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Please enter your details to generate your student profile & admission record.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Aysha Mariyam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* WhatsApp Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                WhatsApp Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="e.g. 9846012345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Course updates and live class alerts will be sent here.
              </p>
            </div>

            {/* District / Place */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">
                District / Place <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-purple-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Malappuram / Calicut / Dubai"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Security Note */}
            <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-100 flex items-center gap-2 text-xs text-purple-800">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Your data is securely stored and encrypted in Supabase.</span>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to UPI Payment</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {onBackToCourse && (
        <div className="text-center pt-2 pb-4">
          <button
            type="button"
            onClick={onBackToCourse}
            className="text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
          >
            ← Change Course
          </button>
        </div>
      )}
    </div>
  );
}
