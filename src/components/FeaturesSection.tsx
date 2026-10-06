"use client";

import React from "react";
import {
  ShieldCheck,
  Compass,
  Users2,
  Video,
  Award,
  Sparkles,
  HeartHandshake,
  CheckCircle,
} from "lucide-react";

export default function FeaturesSection() {
  const features = [
    {
      icon: Compass,
      title: "Value-Grounded Pedagogy",
      titleMalayalam: "സദാചാര നിഷ്ഠയുള്ള വിദ്യാഭ്യാസം",
      desc: "Every course is framed to inspire moral integrity, spiritual mindfulness (Taqwa), and responsible citizenship alongside intellectual growth.",
    },
    {
      icon: Users2,
      title: "Verified & Expert Mentors",
      titleMalayalam: "വിദഗ്ദ്ധരായ അധ്യാപക നിര",
      desc: "Our educators are thoroughly evaluated scholars, university graduates, and certified design professionals dedicated to individual student attention.",
    },
    {
      icon: Video,
      title: "Flexible Hybrid Learning",
      titleMalayalam: "സൗകര്യപ്രദമായ ക്ലാസ് സമയങ്ങൾ",
      desc: "Access live interactive sessions, on-demand high-definition recorded archives, and personalized doubt resolution sessions anytime, anywhere.",
    },
    {
      icon: Award,
      title: "Recognized Certification",
      titleMalayalam: "അംഗീകൃത സർട്ടിഫിക്കറ്റ്",
      desc: "Receive authentic graduation certificates upon curriculum completion, with portfolio backing for skill tracks and academic credentials.",
    },
  ];

  return (
    <section id="why-us" className="py-20 md:py-28 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEF3C7] border border-[#D97706]/30 text-[#D97706] text-xs sm:text-sm font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-[#D97706]" />
            <span>Why Hanoon Academy</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] tracking-tight">
            Designed for Modern Learners, <br />
            <span className="text-[#047857]">Rooted in Timeless Values</span>
          </h2>

          <p className="text-base sm:text-lg text-[#0F172A]/70 leading-relaxed font-normal">
            We bridge the gap between spiritual enrichment and practical excellence, providing an inclusive learning home for children, youth, and adults.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {features.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="group p-7 rounded-3xl bg-[#F0FDF4]/40 border border-[#047857]/15 hover:bg-white hover:border-[#047857]/40 hover:shadow-xl hover:shadow-[#047857]/10 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="w-13 h-13 rounded-2xl bg-white text-[#047857] border border-[#047857]/20 flex items-center justify-center mb-5 group-hover:bg-[#047857] group-hover:text-white transition-all shadow-xs">
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-lg font-bold text-[#0F172A] mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs font-semibold text-[#047857] mb-3">
                    {item.titleMalayalam}
                  </p>

                  <p className="text-sm text-[#0F172A]/70 leading-relaxed font-normal">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-5 mt-4 border-t border-[#047857]/10 flex items-center gap-2 text-xs font-semibold text-[#047857]">
                  <CheckCircle className="w-4 h-4" />
                  <span>Student Centric</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
