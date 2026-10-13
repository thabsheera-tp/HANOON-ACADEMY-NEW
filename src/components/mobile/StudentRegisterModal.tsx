"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  ArrowRight,
  RefreshCw,
  MessageCircle,
} from "lucide-react";
import { UserProfile } from "@/types/app";
import { getAppSettings, formatWhatsAppLink } from "@/services/settingsService";

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

const isStaffOrOfficer = (val?: string) => {
  const lower = (val || "").toLowerCase();
  return (
    lower.includes("officer") ||
    lower.includes("staff") ||
    lower.includes("admin") ||
    lower.includes("verifier")
  );
};

export default function StudentRegisterModal({
  isOpen,
  onClose,
  onSubmit,
  initialProfile = { name: "", phone: "", place: "" },
  selectedCourseId = "adaviyya",
}: StudentRegisterModalProps) {
  const router = useRouter();
  const initialName = isStaffOrOfficer(initialProfile.name) ? "" : initialProfile.name || "";
  const initialPlace = isStaffOrOfficer(initialProfile.name) ? "" : initialProfile.place || "";

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialProfile.phone || "");
  const [place, setPlace] = useState(initialPlace);
  const [age, setAge] = useState(initialProfile.age ? String(initialProfile.age) : "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (initialProfile.name && !isStaffOrOfficer(initialProfile.name)) setName(initialProfile.name);
    if (initialProfile.phone) setPhone(initialProfile.phone);
    if (initialProfile.place && !isStaffOrOfficer(initialProfile.name)) setPlace(initialProfile.place);
  }, [initialProfile]);

  if (!isOpen) return null;

  const selectedCourseObj =
    REGISTRATION_COURSE_OPTIONS.find((c) => c.id === selectedCourseId) ||
    REGISTRATION_COURSE_OPTIONS[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current || isSubmitting) return;

    // Strict Form Validation
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
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const userProfileData: UserProfile = {
      name: name.trim(),
      phone: cleanDigits,
      place: place.trim(),
      age: age.trim() || undefined,
    };

    // Transition directly to Screen 4 (UPI Payment).
    // Do NOT reset isSubmitting here — the modal closes via onClose() which unmounts
    // the component, preventing any double-submit naturally. This guards duplicate entries.
    onSubmit(userProfileData, selectedCourseObj.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none font-['Plus_Jakarta_Sans']">
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
            Student Details
          </h2>
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

          {/* Field 2: Age * (Placeholder: e.g. 14) */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Age <span className="text-rose-500">*</span>
            </label>
            <div className="relative w-32 sm:w-36">
              <Calendar className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                inputMode="numeric"
                required
                min="3"
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
                inputMode="tel"
                required
                placeholder="e.g. 9846012345"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-purple-50/50 border border-purple-200/80 focus:border-purple-600 focus:bg-white text-xs sm:text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 font-semibold font-mono"
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

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Proceed to Enrollment →</span>
              )}
            </button>
          </div>
        </form>

        {/* Bottom Links Directly Below Button */}
        <div className="text-center pt-3 space-y-2">
          {/* Link 1: Institute Staff? Login Here */}
          <div>
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push("/login?portal=staff");
              }}
              className="text-xs font-semibold text-slate-500 hover:text-purple-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer py-1"
            >
              <span>Institute Staff? Login Here</span>
            </button>
          </div>

          {/* Link 2: ← Return to Home / Course Catalog */}
          <div>
            <button
              type="button"
              onClick={onClose}
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
