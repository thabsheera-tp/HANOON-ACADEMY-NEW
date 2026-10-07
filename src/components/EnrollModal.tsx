"use client";

import React, { useState, useEffect } from "react";
import { X, CheckCircle2, Send, PhoneCall, Sparkles } from "lucide-react";

interface EnrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCourse?: string;
}

export default function EnrollModal({
  isOpen,
  onClose,
  defaultCourse = "Athaviy (അഥവിയ)",
}: EnrollModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    course: defaultCourse,
    mode: "Online Live Batch",
    notes: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (defaultCourse) {
      setFormData((prev) => ({ ...prev, course: defaultCourse }));
    }
  }, [defaultCourse]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const handleReset = () => {
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-[#047857]/20 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#F0FDF4] border-2 border-[#047857] text-[#047857] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-extrabold text-[#0F172A]">
              Application Received!
            </h3>

            <p className="text-sm text-[#0F172A]/75 max-w-sm mx-auto leading-relaxed">
              Jazakallah Khair, <strong>{formData.name}</strong>. Our admissions counselor will connect with you via WhatsApp ({formData.phone}) within 24 hours with the course syllabus and orientation details.
            </p>

            <div className="p-4 rounded-2xl bg-[#F0FDF4] border border-[#047857]/20 text-left text-xs text-[#047857] space-y-1">
              <p className="font-bold text-[#0F172A]">Selected Course:</p>
              <p>{formData.course}</p>
              <p className="font-bold text-[#0F172A] pt-1">Learning Mode:</p>
              <p>{formData.mode}</p>
            </div>

            <button
              onClick={handleReset}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-[#047857] hover:bg-[#035e44] transition-all shadow-md"
            >
              Done & Return
            </button>
          </div>
        ) : (
          <div>
            {/* Modal Header */}
            <div className="mb-6 space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Admissions 2026</span>
              </div>
              <h3 className="text-2xl font-extrabold text-[#0F172A] tracking-tight">
                Enroll in <span className="text-[#047857]">Hanoon Academy</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#0F172A]/70">
                Fill in your details below to register or request a free consultation session.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5">
                    WhatsApp Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5">
                  Select Program <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-[#0F172A] focus:outline-none focus:border-[#047857] focus:ring-2 focus:ring-[#047857]/20 bg-white transition-all font-medium"
                >
                  <option value="Athaviy (അഥവിയ) - ₹1,500/mo">Athaviy (അഥവിയ) - ₹1,500/mo</option>
                  <option value="Home Tuition (ഹോം ട്യൂഷൻ) - ₹2,000/mo">Home Tuition (ഹോം ട്യൂഷൻ) - ₹2,000/mo</option>
                  <option value="Fashion Designing (ഫാഷൻ ഡിസൈനിങ്) - ₹2,500/mo">Fashion Designing (ഫാഷൻ ഡിസൈനിങ്) - ₹2,500/mo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] uppercase tracking-wider mb-1.5">
                  Preferred Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {["Online Live Batch", "Offline / Direct"].map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setFormData({ ...formData, mode: m })}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                        formData.mode === m
                          ? "bg-[#047857] text-white border-[#047857]"
                          : "bg-gray-50 text-[#0F172A]/70 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl font-bold text-sm text-white bg-[#047857] hover:bg-[#035e44] transition-all shadow-md shadow-[#047857]/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <span>Submitting Application...</span>
                  ) : (
                    <>
                      <span>Submit Enrollment Inquiry</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <p className="text-[11px] text-center text-[#0F172A]/50">
                🔒 Your privacy is respected. No spam, ever.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
