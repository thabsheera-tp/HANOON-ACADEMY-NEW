"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Radio,
  Clock,
  Sparkles,
  Download,
  Calendar,
  ExternalLink,
  PlayCircle,
  FileText,
  UserCheck,
  CheckCircle2,
  Mic,
  MessageCircle,
  Lock,
  ArrowRight,
} from "lucide-react";
import { SpecialClass } from "@/services/specialClassService";
import { getAppSettings, formatWhatsAppLink } from "@/services/settingsService";

interface SpecialClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  specialClass: SpecialClass | null;
  userName: string;
  isPaid?: boolean;
  onEnroll?: () => void;
}

export default function SpecialClassModal({
  isOpen,
  onClose,
  specialClass,
  userName,
  isPaid: isPaidProp,
  onEnroll,
}: SpecialClassModalProps) {
  const [activeTab, setActiveTab] = useState<"live" | "materials" | "about">("live");
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Dynamic payment status resolution
  const [internalIsPaid, setInternalIsPaid] = useState<boolean>(() => {
    if (typeof isPaidProp === "boolean") return isPaidProp;
    if (typeof window === "undefined") return false;
    try {
      const saved = localStorage.getItem("hanoon_local_payments");
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) {
          return list.some(
            (p: any) => p.status === "APPROVED" || p.status === "verified"
          );
        }
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    if (typeof isPaidProp === "boolean") {
      setInternalIsPaid(isPaidProp);
    }
  }, [isPaidProp]);

  // Real-time payment verification event listener
  useEffect(() => {
    const handlePaymentEvent = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        const { status } = customEvt.detail;
        if (status === "APPROVED" || status === "verified") {
          setInternalIsPaid(true);
        }
      }
    };
    window.addEventListener("hanoon_payment_event", handlePaymentEvent);
    return () => window.removeEventListener("hanoon_payment_event", handlePaymentEvent);
  }, []);

  const isPaid = typeof isPaidProp === "boolean" ? isPaidProp : internalIsPaid;

  if (!isOpen || !specialClass) return null;

  const handleDownloadPdf = () => {
    if (!isPaid) return;
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  const isLive = specialClass.status === "LIVE_NOW";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in duration-200 select-none font-['Plus_Jakarta_Sans']">
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl bg-white border border-purple-100 shadow-2xl flex flex-col text-slate-900">
        
        {/* Modal Top Bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between p-4 pb-3 bg-white border-b border-purple-100">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
              Special Class & Live Session
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Hero Banner */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                {specialClass.category}
              </span>
              {isLive ? (
                <span className="flex items-center gap-1.5 text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  LIVE BROADCAST
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  SCHEDULED
                </span>
              )}
            </div>

            <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
              {specialClass.title}
            </h3>
            <p className="text-xs text-purple-700 font-semibold">
              {specialClass.subtitle}
            </p>
            <p className="text-xs text-slate-500">
              Presiding Faculty: <strong className="text-slate-800">{specialClass.instructor}</strong>
            </p>
          </div>

          {/* Schedule Ticker */}
          <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-100 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span>Session Time:</span>
            </div>
            <span className="font-mono text-purple-700 font-bold">{specialClass.scheduleTime}</span>
          </div>

          {/* Interactive Navigation Tabs */}
          <div className="flex items-center p-1 bg-purple-50/50 rounded-2xl border border-purple-100">
            <button
              type="button"
              onClick={() => setActiveTab("live")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === "live"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Live Class
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("materials")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === "materials"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Notes & Replay
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("about")}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === "about"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Overview
            </button>
          </div>

          {/* TAB 1: LIVE BROADCAST GATE */}
          {activeTab === "live" && (
            <div className="space-y-3">
              {!isPaid ? (
                <div className="p-4 rounded-2xl bg-purple-50/90 border border-purple-200 shadow-xs space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-200/60 px-2 py-0.5 rounded-full">
                          Enrollment Required
                        </span>
                      </div>
                      <h4 className="text-xs font-black text-slate-900 leading-snug">
                        Enroll & Get Verified to Access Live Classes and Materials
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        Access to Usthad&apos;s live video stream, interactive recitation microphone, and special session replay is reserved for enrolled students.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onEnroll) {
                        onEnroll();
                      } else {
                        onClose();
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <span>Enroll Now / Complete Payment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 space-y-3">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-slate-900">
                      Live Video & Audio Transmission
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Join Usthad for this specialized live gathering with crystal clear high-fidelity audio and two-way interaction.
                  </p>

                  <a
                    href={specialClass.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span>Join Live Class</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NOTES & REPLAY */}
          {activeTab === "materials" && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-5 h-5 text-purple-600 shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-900 leading-tight">
                      {specialClass.pdfTitle || "Special Class Study Notes.pdf"}
                    </h5>
                    <span className="text-[10px] text-slate-500">
                      {specialClass.pdfSize || "6.2 MB"} • Authorized Study Guide
                    </span>
                  </div>
                </div>

                {isPaid ? (
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                    title="Download PDF Notes"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    title="Enroll to unlock PDF download"
                    className="p-2 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold cursor-not-allowed select-none"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                )}
              </div>

              {downloadSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Handbook downloaded successfully to your device!</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ABOUT */}
          {activeTab === "about" && (
            <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-100 text-xs text-slate-600 space-y-2 leading-relaxed">
              <p>{specialClass.description}</p>
              <div className="pt-2 border-t border-purple-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Attendee Capacity: Unlimited</span>
                <span className="font-bold text-purple-700">Digital Certificate Included</span>
              </div>
            </div>
          )}

          {/* Mentor Support CTA */}
          <a
            href={formatWhatsAppLink(
              getAppSettings().contactWhatsApp,
              `Assalamu Alaikum Usthad, I am ${userName}, inquiring about ${specialClass.title}.`
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold flex items-center justify-center gap-2 border border-purple-100 transition-all cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-purple-600" />
            <span>Connect with Faculty on WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
