"use client";

import React from "react";
import Link from "next/link";
import { GraduationCap, Mail, Phone, MapPin, MessageCircle, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer id="contact" className="bg-[#0F172A] text-white pt-16 pb-10 border-t border-[#047857]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-white/10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#047857] to-[#10b981] text-white flex items-center justify-center shadow-md">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-2xl font-extrabold tracking-tight text-white">
                  Hanoon <span className="text-[#10b981]">Academy</span>
                </span>
                <p className="text-[11px] font-medium text-emerald-400/90 tracking-wide uppercase">
                  Modern Islamic EdTech
                </p>
              </div>
            </Link>

            <p className="text-sm text-gray-300 max-w-sm leading-relaxed">
              Empowering learners through holistic Islamic education, focused academic home tuition, and professional craft mentorship. Nurturing future leaders with intellect and character.
            </p>

            <div className="pt-2 flex items-center gap-3">
              <a
                href="https://wa.me/919846012345"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#047857] hover:bg-[#035e44] text-white text-xs font-bold transition-all shadow-sm"
              >
                <MessageCircle className="w-4 h-4 text-emerald-300" />
                <span>WhatsApp Helpline</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4">
              Core Programs
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <a href="#courses" className="hover:text-emerald-400 transition-colors">
                  Athaviy (അഥവിയ)
                </a>
              </li>
              <li>
                <a href="#courses" className="hover:text-emerald-400 transition-colors">
                  Home Tuition (ഹോം ട്യൂഷൻ)
                </a>
              </li>
              <li>
                <a href="#courses" className="hover:text-emerald-400 transition-colors">
                  Fashion Designing (ഫാഷൻ ഡിസൈനിങ്)
                </a>
              </li>
              <li>
                <a href="#courses" className="hover:text-emerald-400 transition-colors">
                  Quranic Studies & Tajweed
                </a>
              </li>
            </ul>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2.5 text-sm text-gray-300">
              <li>
                <a href="#why-us" className="hover:text-emerald-400 transition-colors">
                  Why Choose Us
                </a>
              </li>
              <li>
                <a href="#testimonials" className="hover:text-emerald-400 transition-colors">
                  Student Stories
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-emerald-400 transition-colors">
                  Student Portal Login
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-emerald-400 transition-colors">
                  Teacher / Faculty Access
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4">
              Contact & Support
            </h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-xs">
                  Kerala & GCC Virtual Campus, India
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs">+91 98765 43210 / +91 483 200000</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs">info@hanoonacademy.com</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
          <p>
            © {new Date().getFullYear()} <strong className="text-white">Hanoon Academy</strong>. All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            <span>Built with dedication for value-based education</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
