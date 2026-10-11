"use client";

import React, { useState, useEffect } from "react";
import {
  MessageCircle,
  ExternalLink,
  Users,
  CheckCircle2,
  Clock,
  Send,
  X,
  Copy,
  Check,
  Radio,
  Phone,
  ShieldCheck,
} from "lucide-react";
import { LiveClassSession } from "@/services/teacherService";
import {
  WhatsAppStudentRecipient,
  getLiveClassEnrolledRecipients,
  sendWhatsAppAlert,
  buildLiveClassReminderMessage,
} from "@/services/whatsappService";

interface LiveClassWhatsAppReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  classSession: LiveClassSession | null;
}

export default function LiveClassWhatsAppReminderModal({
  isOpen,
  onClose,
  classSession,
}: LiveClassWhatsAppReminderModalProps) {
  const [recipients, setRecipients] = useState<WhatsAppStudentRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastDone, setBroadcastDone] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (isOpen && classSession) {
      setLoading(true);
      setBroadcastDone(false);
      getLiveClassEnrolledRecipients(
        classSession.courseId,
        classSession.courseName,
        classSession.meetingLink
      )
        .then((data) => {
          setRecipients(data);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, classSession]);

  if (!isOpen || !classSession) return null;

  const sampleMessage = buildLiveClassReminderMessage(
    "Fathima",
    classSession.courseName,
    classSession.meetingLink
  );

  const handleCopyMessage = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(sampleMessage);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Automated trigger to all students via backend webhook hooks
  const handleBroadcastAll = async () => {
    setIsBroadcasting(true);
    try {
      for (const student of recipients) {
        await sendWhatsAppAlert({
          type: "LIVE_CLASS_REMINDER",
          studentName: student.name,
          phone: student.phone,
          courseName: classSession.courseName,
          liveLink: classSession.meetingLink,
        });
      }
      setBroadcastDone(true);
    } catch (err) {
      console.warn("Broadcast warning:", err);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-['Plus_Jakarta_Sans']">
      <div className="bg-white rounded-3xl shadow-2xl border border-purple-100 max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-white to-purple-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                  Automated Reminder
                </span>
                <span className="text-[10px] font-bold text-slate-500">
                  15 Mins Before
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                Live Class WhatsApp Reminders
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Class Overview Pill */}
          <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-100">
                {classSession.courseName}
              </span>
              <span className="font-mono font-bold text-[11px] text-slate-700 flex items-center gap-1">
                <Clock className="w-3 h-3 text-purple-600" />
                {classSession.date} at {classSession.time} IST
              </span>
            </div>
            <h4 className="font-extrabold text-slate-900 text-sm">
              {classSession.title}
            </h4>
            <div className="flex items-center justify-between pt-1 border-t border-purple-100/60 text-[11px] text-slate-600">
              <span className="truncate max-w-[240px] font-mono text-purple-800">
                {classSession.meetingLink}
              </span>
              <span className="font-bold text-slate-700">{classSession.platform}</span>
            </div>
          </div>

          {/* Malayalam Message Format Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-600">
                Template Message (Malayalam)
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[10px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 text-slate-800 font-medium leading-relaxed text-xs">
              &quot;{sampleMessage}&quot;
            </div>
          </div>

          {/* Broadcast Trigger Button */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleBroadcastAll}
              disabled={isBroadcasting || recipients.length === 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              <span>
                {isBroadcasting
                  ? "Broadcasting via WhatsApp Webhook..."
                  : broadcastDone
                  ? "✓ Reminders Triggered Successfully!"
                  : `Trigger 15-Min Reminder to All ${recipients.length} Enrolled Students`}
              </span>
            </button>

            {broadcastDone && (
              <p className="text-[11px] font-bold text-emerald-700 text-center flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Automated alerts dispatched to webhook hooks and enrolled student queues.</span>
              </p>
            )}
          </div>

          {/* Enrolled Students Table / Individual Send Links */}
          <div className="space-y-2 pt-2 border-t border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-extrabold text-slate-800">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>Enrolled Cohort ({recipients.length} Students)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">
                Tap &quot;Send WhatsApp Alert&quot; to test individual wa.me links
              </span>
            </div>

            {loading ? (
              <div className="py-6 text-center text-slate-400">Loading enrolled students...</div>
            ) : recipients.length === 0 ? (
              <div className="py-6 text-center text-slate-400">No students enrolled yet.</div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {recipients.map((st, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-purple-50/40 border border-purple-100/80 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 block truncate text-xs">
                        {st.name}
                      </span>
                      <span className="text-[10.5px] font-mono text-slate-500 flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5 text-emerald-600" />
                        {st.phone}
                      </span>
                    </div>

                    <a
                      href={st.waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Send WhatsApp Alert</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Backend Gateway Integration Note */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[10.5px] text-slate-500 space-y-1">
            <div className="flex items-center gap-1 font-bold text-slate-700">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>Backend Hook Ready (Twilio / Interakt / Meta Cloud API)</span>
            </div>
            <p className="leading-relaxed">
              When Twilio or Interakt credentials are provided in <code>.env.local</code>, automated cron tasks dispatch these reminders directly to student numbers 15 minutes before showtime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
