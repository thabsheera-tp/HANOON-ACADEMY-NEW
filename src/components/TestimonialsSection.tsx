"use client";

import React from "react";
import { Star, Quote, CheckCircle2 } from "lucide-react";

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: "Fathima Nihala",
      role: "Athaviy Program Student",
      location: "Kozhikode, Kerala",
      quote:
        "The Athaviy course transformed my relationship with Islamic knowledge. Balancing university studies with this weekend curriculum has given me moral clarity and deep spiritual peace.",
      course: "Athaviy (അഥവിയ)",
    },
    {
      name: "Abdul Rahman & Shamna",
      role: "Parents of Grade 10 Student",
      location: "Ernakulam / Dubai",
      quote:
        "Finding trustworthy home tuition with authentic moral values was our biggest priority. Hanoon Academy's tutors are punctual, incredibly patient, and boosted our child's board exam scores noticeably.",
      course: "Home Tuition (ഹോം ട്യൂഷൻ)",
    },
    {
      name: "Raziya M.",
      role: "Boutique Owner & Designer",
      location: "Malappuram, Kerala",
      quote:
        "The Fashion Designing course provided exact practical cutting and stitching techniques for modest garments. Within 4 months after graduating, I launched my own online modest wear label!",
      course: "Fashion Designing (ഫാഷൻ ഡിസൈനിങ്)",
    },
  ];

  return (
    <section id="testimonials" className="py-20 md:py-28 bg-[#F0FDF4]/30 relative islamic-pattern">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FEF3C7] border border-[#D97706]/30 text-[#D97706] text-xs sm:text-sm font-bold tracking-wide">
            <Star className="w-4 h-4 fill-[#D97706]" />
            <span>Success Stories</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] tracking-tight">
            Loved by Students & <span className="text-[#047857]">Trusted by Parents</span>
          </h2>

          <p className="text-base sm:text-lg text-[#0F172A]/70 leading-relaxed font-normal">
            Real experiences from learners who discovered confidence, values, and professional mastery at Hanoon Academy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl p-7 sm:p-8 border border-gray-150 shadow-md hover:shadow-xl hover:border-[#047857]/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex text-[#D97706]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <Quote className="w-7 h-7 text-[#047857]/20" />
                </div>

                <p className="text-sm sm:text-base text-[#0F172A]/80 leading-relaxed mb-6 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-[#0F172A]">{t.name}</h4>
                  <p className="text-xs text-[#047857] font-semibold">{t.role}</p>
                  <p className="text-[11px] text-[#0F172A]/50">{t.location}</p>
                </div>
                <span className="text-[11px] font-medium bg-[#F0FDF4] text-[#047857] border border-[#047857]/20 px-2.5 py-1 rounded-md">
                  {t.course}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
