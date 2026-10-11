"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { UserProfile } from "@/types/app";

export const REGISTRATION_COURSE_OPTIONS = [
  {
    id: "adaviyya",
    title: "Adaviyya",
    subtitle: "Islamic Sharia & Moral Tarbiyah (₹500 Admission / ₹3,000 Total)",
    feeAmount: 500,
  },
  {
    id: "home-tuition",
    title: "Home Tuition",
    subtitle: "1-on-1 Personalized Academic Coaching (₹2,000)",
    feeAmount: 2000,
  },
  {
    id: "fashion-designing",
    title: "Fashion Designing",
    subtitle: "Modest Apparel & Craftsmanship (₹2,500)",
    feeAmount: 2500,
  },
  {
    id: "shamail-muhammadiyya",
    title: "Ash-Shama'il al-Muhammadiyya",
    subtitle: "Prophetic Sublime Virtues (₹1,200)",
    feeAmount: 1200,
  },
];

interface StudentRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (profile: UserProfile, courseId: string) => void;
  initialProfile?: UserProfile;
  selectedCourseId?: string;
}

export default function StudentRegisterModal({
  isOpen,
  onClose,
  onSubmit,
  initialProfile = { name: "", phone: "", place: "" },
  selectedCourseId = "adaviyya",
}: StudentRegisterModalProps) {
  const [name, setName] = useState(initialProfile.name || "");
  const [phone, setPhone] = useState(initialProfile.phone || "");
  const [place, setPlace] = useState(initialProfile.place || "");
  const [age, setAge] = useState(initialProfile.age ? String(initialProfile.age) : "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialProfile.name) setName(initialProfile.name);
    if (initialProfile.phone) setPhone(initialProfile.phone);
    if (initialProfile.place) setPlace(initialProfile.place);
  }, [initialProfile]);

  if (!isOpen) return null;

  const selectedCourseObj =
    REGISTRATION_COURSE_OPTIONS.find((c) => c.id === selectedCourseId) ||
    REGISTRATION_COURSE_OPTIONS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Strict Form Validation
    if (!name.trim()) {
      setError("Please enter your Student Full Name.");
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

    if (age.trim()) {
      const ageNum = parseInt(age.trim(), 10);
      if (isNaN(ageNum) || ageNum < 3 || ageNum > 100) {
        setError("Please enter a valid age between 3 and 100.");
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);

    const userProfileData: UserProfile = {
      name: name.trim(),
      phone: cleanDigits,
      place: place.trim(),
      age: age.trim() || undefined,
    };

    // Transition directly to Screen 4 (UPI Payment)
    onSubmit(userProfileData, selectedCourseObj.id);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none font-['Plus_Jakarta_Sans']">
      <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-purple-100 relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="mb-4 pr-6">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Student Registration
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Please fill in your details to continue.
          </p>
        </div>

        {error && (
          <div className="mb-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
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

          {/* Field 2: WhatsApp / Mobile Number * */}
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

          {/* Field 3: Place & District * */}
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

          {/* Field 4: Age (Optional) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Age <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative w-36">
              <Calendar className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                min="3"
                max="100"
                placeholder="e.g. 18"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold"
              />
            </div>
          </div>

          {/* Submit Button -> Next ➔ */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
