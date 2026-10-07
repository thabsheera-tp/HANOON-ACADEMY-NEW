"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  Sparkles,
  ArrowRight,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { UserProfile } from "@/types/app";

interface ScreenWelcomeProps {
  userProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  onContinue: () => void;
}

export default function ScreenWelcome({
  userProfile,
  onSaveProfile,
  onContinue,
}: ScreenWelcomeProps) {
  const [name, setName] = useState(userProfile.name || "");
  const [phone, setPhone] = useState(userProfile.phone || "");
  const [place, setPlace] = useState(userProfile.place || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !place.trim()) {
      setError("Please fill in Name, Phone, and Place to continue.");
      return;
    }
    setError(null);
    onSaveProfile({ name, phone, place });
    onContinue();
  };

  const handleDemoFill = () => {
    setName("Student");
    setPhone("+91 98460 00000");
    setPlace("Malappuram, Kerala");
    setError(null);
  };

  return (
    <div className="p-4 sm:p-5 space-y-5 animate-in fade-in duration-300">
      {/* 1. Minimalist Splash Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#064e3b] via-[#047857] to-[#065f46] p-6 text-white text-center shadow-lg shadow-[#047857]/20 islamic-pattern-dark">
        {/* Subtle Gold Flare */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#D97706]/20 rounded-full blur-2xl pointer-events-none" />

        {/* Emblem */}
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/25 flex items-center justify-center shadow-md">
          <GraduationCap className="w-9 h-9 text-[#FEF3C7]" />
        </div>

        {/* Stylish Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[#FEF3C7] text-[11px] font-bold mb-2">
          <Sparkles className="w-3 h-3 text-[#D97706]" />
          <span>വിജ്ഞാന വെളിച്ചം • Modern Islamic EdTech</span>
        </div>

        <h2 className="text-2xl font-black tracking-tight text-white">
          Hanoon <span className="text-[#FEF3C7]">Academy</span>
        </h2>
        <p className="text-xs text-emerald-100 max-w-xs mx-auto mt-1 leading-relaxed">
          Nurturing minds through authentic Islamic curriculum, personalized home tuitions, and creative skill tracks.
        </p>

        {/* Mini Pill badges */}
        <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-center gap-4 text-[11px] text-emerald-200">
          <span className="flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-[#FEF3C7]" />
            5,000+ Students
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FEF3C7]" />
            Verified Tutors
          </span>
        </div>
      </div>

      {/* 2. Clean Onboarding Form */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border border-[#047857]/15">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#D97706] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full">
              Screen 1 / 4
            </span>
            <button
              type="button"
              onClick={handleDemoFill}
              className="text-[11px] font-semibold text-[#047857] hover:underline"
            >
              Quick Demo Fill
            </button>
          </div>
          <h3 className="text-lg font-extrabold text-[#0F172A] mt-2">
            Student Onboarding
          </h3>
          <p className="text-xs text-[#0F172A]/70">
            Enter your details to initiate registration and unlock course admissions.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4 text-[#047857]" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 transition-all bg-[#F0FDF4]/30"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1">
              Phone / WhatsApp Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone className="w-4 h-4 text-[#047857]" />
              </div>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98460 12345"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 transition-all bg-[#F0FDF4]/30"
              />
            </div>
          </div>

          {/* Place / District */}
          <div>
            <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1">
              Place / District <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <MapPin className="w-4 h-4 text-[#047857]" />
              </div>
              <input
                type="text"
                required
                value={place}
                onChange={(e) => setPlace(e.target.value)}
                placeholder="e.g. Malappuram / Kozhikode / Dubai"
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-sm text-[#0F172A] placeholder:text-slate-400 focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 transition-all bg-[#F0FDF4]/30"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-4 rounded-2xl font-bold text-sm text-white bg-[#047857] hover:bg-[#035e44] shadow-md shadow-[#047857]/30 hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
            >
              <span>Continue to Courses</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Trust Quote Card */}
      <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#047857]/15 text-center text-xs text-[#047857]">
        <p className="font-semibold italic">
          &ldquo;اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ&rdquo;
        </p>
        <p className="text-[11px] text-[#0F172A]/70 mt-0.5">
          Read! In the Name of your Lord Who created.
        </p>
      </div>
    </div>
  );
}
