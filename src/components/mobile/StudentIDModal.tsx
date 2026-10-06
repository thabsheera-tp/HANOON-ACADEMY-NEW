"use client";

import React, { useState } from "react";
import {
  X,
  GraduationCap,
  Download,
  Printer,
  ShieldCheck,
  Award,
  CheckCircle2,
  Calendar,
  Share2,
} from "lucide-react";
import { UserProfile, SelectedCourse } from "@/types/app";

interface StudentIDModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  selectedCourse: SelectedCourse;
}

export default function StudentIDModal({
  isOpen,
  onClose,
  userProfile,
  selectedCourse,
}: StudentIDModalProps) {
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [certDownloaded, setCertDownloaded] = useState(false);

  if (!isOpen) return null;

  const studentName = userProfile.name.trim() || "Aysha Mariyam";
  const rollNumber = "HA-2026-8942";
  const issueDate = "01 Oct 2026";
  const avatarLetter = studentName.charAt(0).toUpperCase() || "A";

  const handleDownloadCertificate = () => {
    setDownloadingCert(true);
    setTimeout(() => {
      setDownloadingCert(false);
      setCertDownloaded(true);
      setTimeout(() => setCertDownloaded(false), 3500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans'] select-none">
      <div className="bg-white text-slate-900 rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-purple-100 relative max-h-[92vh] flex flex-col overflow-y-auto no-scrollbar">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-purple-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider block">
                Student Identification
              </span>
              <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                Digital Student ID
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ID CARD UI CONTAINER */}
        <div className="my-4 p-4 rounded-2xl bg-purple-600 text-white shadow-md space-y-3 relative overflow-hidden">
          {/* Header of ID */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-purple-200 block">
                Hanoon Academy
              </span>
              <span className="text-xs font-black text-white">Student Card</span>
            </div>
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Student Info */}
          <div className="flex items-center gap-3 pt-1">
            <div className="w-12 h-12 rounded-xl bg-white text-purple-700 font-black text-lg flex items-center justify-center shadow-xs shrink-0">
              {avatarLetter}
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-white leading-tight">
                {studentName}
              </h4>
              <p className="text-[11px] text-purple-200 mt-0.5">
                {selectedCourse.title}
              </p>
              <span className="text-[10px] font-mono text-purple-300 block">
                ID: {rollNumber}
              </span>
            </div>
          </div>

          {/* Bottom ID meta */}
          <div className="pt-2 border-t border-white/20 flex items-center justify-between text-[10px] text-purple-200">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Issued: {issueDate}</span>
            </div>
            <span className="font-bold bg-white/20 px-2 py-0.5 rounded-full text-white">
              VERIFIED
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {certDownloaded && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Digital ID downloaded to device!</span>
            </div>
          )}

          <button
            type="button"
            disabled={downloadingCert}
            onClick={handleDownloadCertificate}
            className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            {downloadingCert ? (
              <span>Exporting ID Card...</span>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Save ID Card as PDF</span>
              </>
            )}
          </button>

          <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 flex items-center gap-2 text-xs text-purple-800">
            <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Official digital accreditation for Hanoon Academy students.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
