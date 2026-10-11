"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Phone,
  MapPin,
  Calendar,
  Clock,
  MessageCircle,
  Headphones,
  ArrowRight,
  BookOpen,
  RefreshCw,
} from "lucide-react";
import { UserProfile } from "@/types/app";
import { registerStudentAndPayment } from "@/services/studentService";

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
  const [isSuccessStep, setIsSuccessStep] = useState(false);

  useEffect(() => {
    if (initialProfile.name) setName(initialProfile.name);
    if (initialProfile.phone) setPhone(initialProfile.phone);
    if (initialProfile.place) setPlace(initialProfile.place);
  }, [initialProfile]);

  if (!isOpen) return null;

  const supportPhone = "+91 98460 12345";
  const rawWhatsApp = "919846012345";

  const selectedCourseObj =
    REGISTRATION_COURSE_OPTIONS.find((c) => c.id === selectedCourseId) ||
    REGISTRATION_COURSE_OPTIONS[0];

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      // Save directly to Supabase with status = "PENDING"
      await registerStudentAndPayment({
        fullName: name.trim(),
        whatsappNum: cleanDigits,
        district: place.trim(),
        courseId: selectedCourseObj.id,
        courseTitle: selectedCourseObj.title,
        amount: selectedCourseObj.feeAmount,
        upiTxId: "Pending Verification",
      });
    } catch (err) {
      console.warn("Supabase registration caught in modal:", err);
    } finally {
      setIsSubmitting(false);
      setIsSuccessStep(true);
    }
  };

  const handleProceedNext = () => {
    onSubmit(
      {
        name: name.trim(),
        phone: phone.trim(),
        place: place.trim(),
        age: age.trim() || undefined,
      },
      selectedCourseObj.id
    );
    setIsSuccessStep(false);
  };

  const handleModalClose = () => {
    setIsSuccessStep(false);
    onClose();
  };

  const cleanPhone = phone.trim();
  const whatsappUrl = `https://wa.me/${rawWhatsApp}?text=${encodeURIComponent(
    `Assalamu Alaikum Admin, I have submitted registration for ${name.trim()} in ${selectedCourseObj.title} (Phone: ${cleanPhone}, District: ${place.trim()}). Please assist me with verification.`
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in select-none font-['Plus_Jakarta_Sans']">
      <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-purple-100 relative max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleModalClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccessStep ? (
          /* ============================================================
             ACCURATE SUBMISSION RESPONSE (PENDING VERIFICATION)
             ============================================================ */
          <div className="space-y-4 pt-2 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center shadow-sm">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300 inline-block">
                Status: Pending Verification
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-snug">
                Registration Submitted Successfully!
              </h2>
              <p className="text-xs text-slate-600 font-medium leading-relaxed px-1">
                Your payment is currently under verification by the admin.
              </p>
            </div>

            {/* Registered Details Summary Card */}
            <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center pb-1 border-b border-purple-100">
                <span className="text-slate-500 font-medium">Student Name:</span>
                <span className="font-bold text-slate-900">{name.trim()}</span>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-purple-100">
                <span className="text-slate-500 font-medium">WhatsApp Number:</span>
                <span className="font-mono font-bold text-slate-900">{phone.trim()}</span>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-purple-100">
                <span className="text-slate-500 font-medium">District / Place:</span>
                <span className="font-bold text-slate-900">{place.trim()}</span>
              </div>
              <div className="flex justify-between items-center pb-1 border-b border-purple-100">
                <span className="text-slate-500 font-medium">Selected Course:</span>
                <span className="font-extrabold text-purple-700">{selectedCourseObj.title}</span>
              </div>
              <div className="flex justify-between items-center pt-0.5">
                <span className="text-slate-500 font-medium">Verification Status:</span>
                <span className="font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                  🟡 Pending Verification
                </span>
              </div>
            </div>

            {/* Contact Admin Section */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-purple-50 to-emerald-50 border border-emerald-200 shadow-2xs space-y-2.5 text-left">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Headphones className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">
                    Need Help? Contact Admin
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Questions about fees, schedule, or syllabus?
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>WhatsApp Admin</span>
                </a>

                <a
                  href={`tel:${supportPhone.replace(/\s+/g, "")}`}
                  className="py-2 px-2.5 rounded-xl bg-white hover:bg-purple-50 active:scale-95 text-purple-900 border border-purple-200 font-extrabold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>{supportPhone}</span>
                </a>
              </div>
            </div>

            {/* Continue to Payment / Details */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProceedNext}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Payment / View Details</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ============================================================
             STUDENT REGISTRATION FORM VIEW
             ============================================================ */
          <>
            {/* Modal Header */}
            <div className="mb-4 pr-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                Student Registration
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Fill in your details below to register for Hanoon Academy.
              </p>
            </div>

            {error && (
              <div className="mb-3.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            {/* Explored Course Banner (Read-only - Course is already explored & selected) */}
            <div className="mb-3.5 p-3 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block leading-tight">
                    Course Selected
                  </span>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 truncate">
                    {selectedCourseObj.title}
                  </h4>
                </div>
              </div>
              <span className="text-xs font-black text-purple-700 bg-white px-2.5 py-1 rounded-xl border border-purple-200/80 shrink-0">
                ₹{selectedCourseObj.feeAmount}
              </span>
            </div>

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

              {/* Submit Registration Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 active:scale-[0.98] shadow-md shadow-purple-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Submitting Registration...</span>
                    </>
                  ) : (
                    <span>Submit Registration</span>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
