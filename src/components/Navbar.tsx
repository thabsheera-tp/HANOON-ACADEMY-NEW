"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GraduationCap, BookOpen, Menu, X, ArrowRight, Sparkles } from "lucide-react";

interface NavbarProps {
  onOpenEnrollModal?: (courseTitle?: string) => void;
}

export default function Navbar({ onOpenEnrollModal }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#F0FDF4]/90 backdrop-blur-md border-b border-[#047857]/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#047857] to-[#065f46] text-white flex items-center justify-center shadow-md shadow-[#047857]/20 group-hover:scale-105 transition-transform duration-300">
              <GraduationCap className="w-7 h-7 text-[#F0FDF4]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0F172A] group-hover:text-[#047857] transition-colors">
                  Hanoon
                </span>
                <span className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#047857]">
                  Academy
                </span>
              </div>
              <p className="text-[11px] font-medium text-[#047857]/80 tracking-wide uppercase">
                Islamic EdTech & Skills
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/#courses"
              className="text-sm font-semibold text-[#0F172A]/80 hover:text-[#047857] transition-colors"
            >
              Courses
            </Link>
            <Link
              href="/#why-us"
              className="text-sm font-semibold text-[#0F172A]/80 hover:text-[#047857] transition-colors"
            >
              Why Hanoon
            </Link>
            <Link
              href="/#curriculum"
              className="text-sm font-semibold text-[#0F172A]/80 hover:text-[#047857] transition-colors"
            >
              About
            </Link>
            <Link
              href="/#testimonials"
              className="text-sm font-semibold text-[#0F172A]/80 hover:text-[#047857] transition-colors"
            >
              Testimonials
            </Link>
            <Link
              href="/#contact"
              className="text-sm font-semibold text-[#0F172A]/80 hover:text-[#047857] transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="px-5 py-2.5 text-sm font-semibold text-[#047857] bg-white border border-[#047857]/20 rounded-xl hover:bg-[#047857]/5 hover:border-[#047857] transition-all shadow-xs"
            >
              Login
            </Link>
            <button
              onClick={() => onOpenEnrollModal && onOpenEnrollModal()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#047857] rounded-xl hover:bg-[#035a41] shadow-md shadow-[#047857]/25 hover:shadow-lg hover:shadow-[#047857]/35 transition-all transform active:scale-95"
            >
              <span>Enroll Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-xs font-semibold text-[#047857] bg-white border border-[#047857]/25 rounded-lg hover:bg-[#047857]/5"
            >
              Login
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-[#0F172A] hover:text-[#047857] focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#047857]/10 space-y-3 bg-[#F0FDF4]/95 rounded-b-2xl animate-in slide-in-from-top-2">
            <Link
              href="/#courses"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#047857]/10 rounded-lg"
            >
              Courses (അഥവിയ, ട്യൂഷൻ, ഫാഷൻ)
            </Link>
            <Link
              href="/#why-us"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#047857]/10 rounded-lg"
            >
              Why Hanoon
            </Link>
            <Link
              href="/#testimonials"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#047857]/10 rounded-lg"
            >
              Student Testimonials
            </Link>
            <Link
              href="/#contact"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-4 py-2 text-sm font-medium text-[#0F172A] hover:bg-[#047857]/10 rounded-lg"
            >
              Contact & WhatsApp
            </Link>
            <div className="pt-2 px-4 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-sm font-semibold text-[#047857] bg-white border border-[#047857]/30 rounded-xl"
              >
                Student / Staff Login
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (onOpenEnrollModal) onOpenEnrollModal();
                }}
                className="w-full py-2.5 text-sm font-semibold text-white bg-[#047857] rounded-xl flex items-center justify-center gap-2 shadow-md"
              >
                <span>Enroll Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
