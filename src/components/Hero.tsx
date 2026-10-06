"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Sparkles,
  ShieldCheck,
  Star,
  Users,
  CheckCircle2,
  Play,
  HeartHandshake,
  Award,
} from "lucide-react";

interface HeroProps {
  onOpenEnrollModal?: (courseTitle?: string) => void;
}

export default function Hero({ onOpenEnrollModal }: HeroProps) {
  return (
    <section className="relative overflow-hidden pt-8 pb-20 md:pt-16 md:pb-28 islamic-pattern">
      {/* Soft Glow Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-[#047857]/8 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-10 right-10 w-72 h-72 bg-[#D97706]/10 rounded-full blur-2xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: High-conversion copy & CTAs */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            {/* Top Subtle Gold Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FEF3C7] border border-[#D97706]/20 text-[#D97706] text-xs sm:text-sm font-semibold tracking-wide shadow-xs">
              <Sparkles className="w-4 h-4 text-[#D97706]" />
              <span>വിജ്ഞാനത്തിന്റെയും സംസ്കാരത്തിന്റെയും ശ്രേഷ്ഠ പാത</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0F172A] tracking-tight leading-[1.15]">
              Empowering Minds With{" "}
              <span className="text-[#047857] relative inline-block">
                Authentic Values
                <svg
                  className="absolute left-0 -bottom-2 w-full h-3 text-[#D97706]/40 fill-current"
                  viewBox="0 0 100 20"
                  preserveAspectRatio="none"
                >
                  <path d="M0,10 Q50,0 100,10 Q50,20 0,10 Z" />
                </svg>
              </span>{" "}
              & Modern Skills.
            </h1>

            {/* Sub-headline */}
            <p className="text-lg sm:text-xl text-[#0F172A]/75 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Welcome to <strong className="text-[#047857] font-semibold">Hanoon Academy</strong> — a premier Islamic EdTech ecosystem offering the flagship <em>Athaviy</em> Islamic curriculum, personalized <em>Home Tuition</em>, and professional <em>Fashion Designing</em> courses.
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={() => onOpenEnrollModal && onOpenEnrollModal()}
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-white font-bold bg-[#047857] hover:bg-[#035e44] shadow-lg shadow-[#047857]/30 hover:shadow-xl hover:shadow-[#047857]/40 transition-all flex items-center justify-center gap-3 text-base group transform active:scale-98"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <a
                href="#courses"
                className="w-full sm:w-auto px-7 py-4 rounded-xl text-[#047857] font-semibold bg-white border-2 border-[#047857]/20 hover:border-[#047857] hover:bg-[#047857]/5 shadow-sm transition-all flex items-center justify-center gap-2 text-base"
              >
                <BookOpen className="w-5 h-5 text-[#047857]" />
                <span>Explore Courses</span>
              </a>
            </div>

            {/* Social Trust Proof & Badges */}
            <div className="pt-6 border-t border-[#047857]/10 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs sm:text-sm text-[#0F172A]/80 font-medium">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-tr from-[#047857] to-[#10b981] flex items-center justify-center text-white text-[11px] font-bold shadow-xs"
                    >
                      {["HA", "AY", "FS", "KT"][i - 1]}
                    </div>
                  ))}
                </div>
                <div className="text-left pl-1">
                  <div className="flex items-center text-[#D97706]">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                    ))}
                    <span className="ml-1 text-xs font-bold text-[#0F172A]">4.9/5</span>
                  </div>
                  <span className="text-[12px] text-[#0F172A]/60">from 1,500+ students</span>
                </div>
              </div>

              <div className="h-4 w-px bg-[#047857]/20 hidden sm:block" />

              <div className="flex items-center gap-2 text-[#047857]">
                <ShieldCheck className="w-5 h-5 text-[#047857]" />
                <span className="text-xs sm:text-sm text-[#0F172A]/80 font-semibold">
                  Certified Mentors & Verified Tutors
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Premium Visual Showcase Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer Card with Soft Shadow */}
              <div className="relative bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-[#047857]/10 border border-[#047857]/10 backdrop-blur-sm transition-all hover:shadow-2xl">
                {/* Header inside card */}
                <div className="flex items-center justify-between pb-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#047857]/10 text-[#047857] flex items-center justify-center font-bold">
                      <Award className="w-5 h-5 text-[#047857]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#0F172A]">Live Learning Hub</h4>
                      <p className="text-xs text-[#047857] font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                        Active Admissions Open
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/30">
                    2026 Batch
                  </span>
                </div>

                {/* Course Quick Preview List */}
                <div className="py-4 space-y-3.5">
                  {/* Athaviy preview */}
                  <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#047857]/15 flex items-center justify-between group hover:bg-[#047857]/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#047857] text-white flex items-center justify-center font-bold text-xs">
                        അഥ
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0F172A]">Athaviy (അഥവിയ)</p>
                        <p className="text-xs text-[#047857]/80">Islamic Moral & Sharia Program</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#047857] bg-white px-2.5 py-1 rounded-lg border border-[#047857]/20">
                      ₹1,500/mo
                    </span>
                  </div>

                  {/* Home Tuition preview */}
                  <div className="p-3.5 rounded-2xl bg-white border border-gray-150 flex items-center justify-between hover:bg-gray-50 transition-colors shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#0F172A] text-white flex items-center justify-center font-bold text-xs">
                        HT
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0F172A]">Home Tuition (ഹോം ട്യൂഷൻ)</p>
                        <p className="text-xs text-[#0F172A]/60">1-on-1 Personalized Coaching</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#0F172A] bg-gray-100 px-2.5 py-1 rounded-lg">
                      ₹2,000/mo
                    </span>
                  </div>

                  {/* Fashion Designing preview */}
                  <div className="p-3.5 rounded-2xl bg-white border border-gray-150 flex items-center justify-between hover:bg-gray-50 transition-colors shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#D97706] text-white flex items-center justify-center font-bold text-xs">
                        FD
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0F172A]">Fashion Designing</p>
                        <p className="text-xs text-[#0F172A]/60">Modest Apparel & Craftsmanship</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#D97706] bg-[#FEF3C7] px-2.5 py-1 rounded-lg border border-[#D97706]/30">
                      ₹2,500/mo
                    </span>
                  </div>
                </div>

                {/* Card Bottom Insight */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-[#0F172A]/70">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-[#047857]" />
                    Flexible Online & Offline Batches
                  </span>
                  <button
                    onClick={() => onOpenEnrollModal && onOpenEnrollModal()}
                    className="font-bold text-[#047857] hover:underline"
                  >
                    Quick Apply →
                  </button>
                </div>
              </div>

              {/* Decorative Floating Mini Badge */}
              <div className="absolute -bottom-5 -left-4 sm:-left-6 bg-white rounded-2xl p-3.5 shadow-lg border border-[#047857]/15 flex items-center gap-3 animate-subtle-float">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#D97706] to-[#f59e0b] text-white flex items-center justify-center font-black">
                  ★
                </div>
                <div>
                  <div className="text-xs font-extrabold text-[#0F172A]">5,000+ Students</div>
                  <div className="text-[11px] font-medium text-[#047857]">Joined Across Kerala & GCC</div>
                </div>
              </div>

              {/* Top-right Floating Badge */}
              <div className="absolute -top-4 -right-2 sm:-right-4 bg-white/95 backdrop-blur-md rounded-xl px-3.5 py-2 shadow-md border border-[#047857]/15 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-[#047857]" />
                <span className="text-xs font-bold text-[#0F172A]">Value-Based Tarbiyah</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
