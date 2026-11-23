"use client";

import React, { useState, useEffect } from "react";
import { X, Check, DollarSign, BookOpen, AlertCircle, Sparkles } from "lucide-react";
import {
  COURSE_DEFAULT_FEES,
  COURSE_DISPLAY_NAMES,
  getDefaultCourseFee,
  updateStudentFeeInSupabase,
} from "@/services/feeService";
import { UnifiedStudentRegistration } from "@/services/studentService";

interface EditFeeModalProps {
  student: UnifiedStudentRegistration | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditFeeModal({
  student,
  isOpen,
  onClose,
  onSuccess,
}: EditFeeModalProps) {
  const [selectedCourse, setSelectedCourse] = useState("adaviyya");
  const [totalFee, setTotalFee] = useState<number>(3000);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      const cId = student.courseId || "adaviyya";
      setSelectedCourse(cId);
      const defaultTotal = getDefaultCourseFee(cId);
      const initialTotal = student.totalFee ?? defaultTotal;
      const initialPaid = student.paidAmount ?? (student.paymentStatus === "APPROVED" ? student.amount : 0);
      setTotalFee(initialTotal);
      setPaidAmount(initialPaid);
      setErrorMsg(null);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const balanceFee = Math.max(0, totalFee - paidAmount);
  const isFullyPaid = balanceFee === 0 && totalFee > 0;

  const handleCourseChange = (newCourseId: string) => {
    setSelectedCourse(newCourseId);
    const newDefault = getDefaultCourseFee(newCourseId);
    // Auto-update total fee to course default if current matches old course default or 0
    setTotalFee(newDefault);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalFee < 0 || paidAmount < 0) {
      setErrorMsg("Fee amounts cannot be negative.");
      return;
    }
    if (paidAmount > totalFee) {
      setErrorMsg("Paid amount cannot exceed total course fee.");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      const res = await updateStudentFeeInSupabase({
        studentId: student.studentId || student.id,
        courseId: selectedCourse,
        totalFee: Number(totalFee),
        paidAmount: Number(paidAmount),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error || "Failed to update student fee. Please try again.");
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-purple-50/50 via-white to-purple-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800">Edit Student Fee</h3>
              <p className="text-xs text-slate-500">Correct course, fee structure & payments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Student Info Card */}
          <div className="p-3.5 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-800">{student.fullName}</div>
              <div className="text-[11px] text-slate-500">{student.whatsappNum || "No phone"} • {student.district}</div>
            </div>
            <span className="text-[10px] font-mono px-2 py-1 bg-white border border-slate-200 rounded-lg text-slate-600">
              {student.paymentStatus}
            </span>
          </div>

          {/* Course Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-600" />
              Enrolled Course
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => handleCourseChange(e.target.value)}
              className="w-full text-xs font-medium text-slate-800 bg-white border border-slate-200 rounded-2xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
            >
              {Object.entries(COURSE_DISPLAY_NAMES).map(([id, title]) => (
                <option key={id} value={id}>
                  {title} (Standard: ₹{COURSE_DEFAULT_FEES[id] ?? 3000})
                </option>
              ))}
            </select>
          </div>

          {/* Fee Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Course Fee */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Total Course Fee (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={totalFee}
                  onChange={(e) => setTotalFee(Number(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                  required
                />
              </div>
            </div>

            {/* Paid Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700">Paid Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                  required
                />
              </div>
            </div>
          </div>

          {/* Real-time Balance Calculation Display */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isFullyPaid
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
              : balanceFee > 0
              ? "bg-amber-50/70 border-amber-200 text-amber-800"
              : "bg-slate-50 border-slate-200 text-slate-700"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-medium opacity-80">Calculated Balance Due</div>
                <div className="text-xl font-bold tracking-tight">₹{balanceFee.toLocaleString()}</div>
              </div>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${
                isFullyPaid
                  ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                  : balanceFee > 0
                  ? "bg-amber-100 border-amber-300 text-amber-700"
                  : "bg-slate-100 border-slate-300 text-slate-700"
              }`}>
                {isFullyPaid ? "Fully Paid ✅" : balanceFee > 0 ? "Pending Balance ⏳" : "Zero Balance"}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-2xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 rounded-2xl shadow-md shadow-purple-200 transition-all flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Save & Update Fee
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
