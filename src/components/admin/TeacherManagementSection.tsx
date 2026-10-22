"use client";

import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  Plus,
  Search,
  Phone,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  RefreshCw,
  BookOpen,
  Users,
  Check,
  MessageCircle,
  SlidersHorizontal,
} from "lucide-react";
import {
  FacultyTeacher,
  fetchFacultyTeachers,
  addFacultyTeacher,
  updateFacultyTeacher,
  deleteFacultyTeacher,
  subscribeToFacultyTeachers,
  formatTeacherPhone,
} from "@/services/teacherFacultyService";

const SUGGESTED_SUBJECTS = [
  "Adaviyya (Seerah & Ethics)",
  "Fashion Designing",
  "Quran / Tajweed",
  "Home Tuition",
  "Fiqh Jurisprudence",
  "Ratib al-Haddad",
  "Hadith Studies",
  "Shama'il al-Muhammadiyya",
  "Burdah Live Gathering",
];

interface TeacherManagementSectionProps {
  onScheduleClass?: (teacherName: string, subjectName: string) => void;
}

export default function TeacherManagementSection({
  onScheduleClass,
}: TeacherManagementSectionProps) {
  const [teachers, setTeachers] = useState<FacultyTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<FacultyTeacher | null>(null);
  const [deletingTeacher, setDeletingTeacher] = useState<FacultyTeacher | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Field State
  const [fullName, setFullName] = useState("");
  const [specialization, setSpecialization] = useState(SUGGESTED_SUBJECTS[0]);
  const [customSubject, setCustomSubject] = useState("");
  const [isCustomSubject, setIsCustomSubject] = useState(false);
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [ratePerClass, setRatePerClass] = useState(750);

  // Feedback Notification
  const [feedback, setFeedback] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Deduplicate teachers helper based on unique ID
  const deduplicateFaculty = (list: FacultyTeacher[]): FacultyTeacher[] => {
    const seen = new Set<string>();
    return list.filter((t) => {
      if (!t || !t.id) return false;
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  };

  // Load teachers on mount
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchFacultyTeachers();
        if (isMounted) setTeachers(deduplicateFaculty(data));
      } catch (err) {
        console.error("Failed to load teachers:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();

    const unsubscribe = subscribeToFacultyTeachers((updated) => {
      if (isMounted) setTeachers(deduplicateFaculty(updated));
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const openAddModal = () => {
    setEditingTeacher(null);
    setFullName("");
    setSpecialization(SUGGESTED_SUBJECTS[0]);
    setCustomSubject("");
    setIsCustomSubject(false);
    setPhone("");
    setIsActive(true);
    setRatePerClass(750);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const openEditModal = (teacher: FacultyTeacher) => {
    setEditingTeacher(teacher);
    setFullName(teacher.fullName);
    if (SUGGESTED_SUBJECTS.includes(teacher.specialization)) {
      setSpecialization(teacher.specialization);
      setIsCustomSubject(false);
      setCustomSubject("");
    } else {
      setIsCustomSubject(true);
      setCustomSubject(teacher.specialization);
      setSpecialization("Other (Custom)");
    }
    setPhone(teacher.phone || "");
    setIsActive(teacher.isActive);
    setRatePerClass(teacher.ratePerClass || 750);
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!fullName.trim()) {
      setFormError("Please enter the teacher's full name.");
      return;
    }

    const assignedSubject = isCustomSubject
      ? customSubject.trim()
      : specialization.trim();

    if (!assignedSubject) {
      setFormError("Please select or enter the assigned subject/course.");
      return;
    }

    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) {
      setFormError("Please enter a valid 10-digit WhatsApp/mobile phone number.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingTeacher) {
        // Update existing teacher
        const updated = await updateFacultyTeacher(editingTeacher.id, {
          fullName: fullName.trim(),
          specialization: assignedSubject,
          phone: phone.trim(),
          isActive,
          ratePerClass: Number(ratePerClass) || 750,
        });

        if (updated) {
          setTeachers((prev) =>
            deduplicateFaculty(prev.map((t) => (t.id === editingTeacher.id ? updated : t)))
          );
        }

        setFeedback({
          message: `Successfully updated instructor "${fullName.trim()}".`,
          type: "success",
        });
      } else {
        // Add new teacher
        const added = await addFacultyTeacher({
          fullName: fullName.trim(),
          specialization: assignedSubject,
          phone: phone.trim(),
          isActive,
          ratePerClass: Number(ratePerClass) || 750,
        });

        setTeachers((prev) => deduplicateFaculty([added, ...prev]));
        setFeedback({
          message: `Successfully appointed instructor "${fullName.trim()}".`,
          type: "success",
        });
      }

      setIsFormModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save teacher record.";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!deletingTeacher) return;
    setIsSubmitting(true);
    try {
      await deleteFacultyTeacher(deletingTeacher.id);
      setTeachers((prev) => prev.filter((t) => t.id !== deletingTeacher.id));
      setFeedback({
        message: `Removed faculty record for "${deletingTeacher.fullName}".`,
        type: "success",
      });
      setDeletingTeacher(null);
    } catch (err) {
      console.error("Error deleting teacher:", err);
      setFeedback({
        message: "Failed to delete teacher record. Please try again.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleToggleStatus = async (teacher: FacultyTeacher) => {
    const nextStatus = !teacher.isActive;
    try {
      const updated = await updateFacultyTeacher(teacher.id, {
        isActive: nextStatus,
      });
      if (updated) {
        setTeachers((prev) => prev.map((t) => (t.id === teacher.id ? updated : t)));
        setFeedback({
          message: `Instructor ${teacher.fullName} is now ${
            nextStatus ? "Active" : "Inactive"
          }.`,
          type: "success",
        });
        setTimeout(() => setFeedback(null), 3000);
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  // Filtered teachers
  const filteredTeachers = deduplicateFaculty(teachers).filter((teacher) => {
    const matchesSearch =
      teacher.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (teacher.phone && teacher.phone.includes(searchQuery));

    if (!matchesSearch) return false;

    if (statusFilter === "ACTIVE") return teacher.isActive;
    if (statusFilter === "INACTIVE") return !teacher.isActive;
    return true;
  });

  const totalTeachersCount = teachers.length;
  const activeTeachersCount = teachers.filter((t) => t.isActive).length;
  const inactiveTeachersCount = teachers.filter((t) => !t.isActive).length;
  const uniqueSubjectsCount = new Set(teachers.map((t) => t.specialization.toLowerCase()))
    .size;

  return (
    <div className="space-y-6 select-none font-['Plus_Jakarta_Sans']">
      {/* 1. Top Section Header & Action */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-md p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Manage Teachers & Subjects
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Admin control center to add instructors, assign courses & subjects, manage active status, and maintain faculty records.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="py-3 px-5 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/25 transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Teacher</span>
          </button>
        </div>

        {/* 2. Key Metrics Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-purple-50">
          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100/80 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-[10px] font-extrabold uppercase tracking-wider">
              <span>Total Faculty</span>
              <Users className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900">{totalTeachersCount}</div>
            <p className="text-[10px] text-slate-400 font-semibold">Registered instructors</p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/80 space-y-1">
            <div className="flex items-center justify-between text-emerald-800 text-[10px] font-extrabold uppercase tracking-wider">
              <span>Active Instructors</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-950">{activeTeachersCount}</div>
            <p className="text-[10px] text-emerald-600 font-semibold">Currently taking classes</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100/80 space-y-1">
            <div className="flex items-center justify-between text-amber-800 text-[10px] font-extrabold uppercase tracking-wider">
              <span>Inactive</span>
              <XCircle className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-amber-950">{inactiveTeachersCount}</div>
            <p className="text-[10px] text-amber-600 font-semibold">On academic leave</p>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100/80 space-y-1">
            <div className="flex items-center justify-between text-purple-800 text-[10px] font-extrabold uppercase tracking-wider">
              <span>Assigned Subjects</span>
              <BookOpen className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-purple-950">{uniqueSubjectsCount}</div>
            <p className="text-[10px] text-purple-600 font-semibold">Unique curricula tracks</p>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between gap-2 animate-fade-in ${
              feedback.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="p-1 rounded-lg hover:bg-black/5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 3. Search and Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by teacher name, subject, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-purple-100 bg-purple-50/20 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white font-medium transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-purple-50/60 border border-purple-100 shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter("ALL")}
              className={`py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-white text-purple-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              All ({totalTeachersCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("ACTIVE")}
              className={`py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === "ACTIVE"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Active ({activeTeachersCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("INACTIVE")}
              className={`py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === "INACTIVE"
                  ? "bg-white text-amber-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Inactive ({inactiveTeachersCount})
            </button>
          </div>
        </div>
      </div>

      {/* 4. Teachers Table & List View */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-md overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3 text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin text-purple-600" />
            <span className="text-xs font-semibold">Loading faculty database...</span>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800">
              No teachers found
            </h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">
              {searchQuery || statusFilter !== "ALL"
                ? "No instructors match your current search and filter criteria."
                : "No faculty instructors have been appointed yet. Click below to add the first teacher."}
            </p>
            {!searchQuery && statusFilter === "ALL" && (
              <button
                type="button"
                onClick={openAddModal}
                className="py-2 px-4 rounded-xl bg-purple-600 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs hover:bg-purple-700"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Teacher</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-purple-50/50 border-b border-purple-100 text-[11px] font-black uppercase tracking-wider text-purple-900">
                  <th className="py-3.5 px-4 sm:px-6">Teacher Profile</th>
                  <th className="py-3.5 px-4">Subject / Course Assigned</th>
                  <th className="py-3.5 px-4">Phone / WhatsApp</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50 text-xs text-slate-700">
                {filteredTeachers.map((teacher) => {
                  const cleanPhone = formatTeacherPhone(teacher.phone);
                  return (
                    <tr
                      key={teacher.id}
                      className="hover:bg-purple-50/20 transition-colors group"
                    >
                      {/* Teacher Profile */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {teacher.fullName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-extrabold text-slate-900 block text-xs sm:text-sm truncate">
                              {teacher.fullName}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono block">
                              ID: {teacher.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Subject */}
                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 border border-purple-100 text-purple-800 font-extrabold text-[11px]">
                          <BookOpen className="w-3 h-3 text-purple-600 shrink-0" />
                          <span>{teacher.specialization}</span>
                        </div>
                      </td>

                      {/* Phone / WhatsApp */}
                      <td className="py-3.5 px-4">
                        {teacher.phone ? (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800">
                              {teacher.phone}
                            </span>
                            {cleanPhone && (
                              <a
                                href={`https://wa.me/${cleanPhone}?text=Assalamu%20Alaikum%20${encodeURIComponent(
                                  teacher.fullName
                                )},%20Hanoon%20Academy%20Academic%20Desk.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Chat on WhatsApp"
                                className="p-1 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium italic">
                            No phone provided
                          </span>
                        )}
                      </td>

                      {/* Status with 1-Click Toggle */}
                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(teacher)}
                          title="Click to toggle status"
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border transition-all cursor-pointer ${
                            teacher.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              teacher.isActive ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <span>{teacher.isActive ? "Active" : "Inactive"}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onScheduleClass && (
                            <button
                              type="button"
                              onClick={() =>
                                onScheduleClass(
                                  teacher.fullName,
                                  teacher.specialization
                                )
                              }
                              title="Schedule Live Class"
                              className="py-1 px-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 text-[11px] font-bold border border-purple-100 cursor-pointer hidden md:inline-flex"
                            >
                              Schedule
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(teacher)}
                            title="Edit Teacher"
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-purple-50 text-slate-600 hover:text-purple-700 transition-colors border border-slate-100 cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTeacher(teacher)}
                            title="Delete Teacher"
                            className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-700 transition-colors border border-slate-100 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================
          MODAL: ADD / EDIT TEACHER FORM
          ======================================================== */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-['Plus_Jakarta_Sans']" onClick={() => setIsFormModalOpen(false)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-purple-100 relative max-h-[92vh] overflow-y-auto space-y-4" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-purple-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingTeacher ? "Edit Teacher Details" : "Add New Teacher"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingTeacher
                      ? "Update instructor profile and subject assignment."
                      : "Enter faculty details to assign them to subjects & courses."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Field 1: Teacher Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Teacher Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Usthad Dr. Faisal Al-Hanoon"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50/30 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white font-semibold transition-all"
                />
              </div>

              {/* Field 2: Subject / Course Assigned */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Subject / Course Assigned <span className="text-rose-500">*</span>
                </label>

                {!isCustomSubject ? (
                  <div className="space-y-2">
                    <select
                      value={specialization}
                      onChange={(e) => {
                        if (e.target.value === "OTHER") {
                          setIsCustomSubject(true);
                          setCustomSubject("");
                        } else {
                          setSpecialization(e.target.value);
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50/30 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-purple-600 focus:bg-white font-semibold transition-all cursor-pointer"
                    >
                      {SUGGESTED_SUBJECTS.map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                      <option value="OTHER">✏️ Type Custom Subject...</option>
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        placeholder="e.g. Tajweed, Arabic Grammar, Quran Studies"
                        value={customSubject}
                        onChange={(e) => setCustomSubject(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-purple-200 bg-purple-50/30 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white font-semibold transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomSubject(false);
                          setSpecialization(SUGGESTED_SUBJECTS[0]);
                        }}
                        className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-600 cursor-pointer shrink-0"
                      >
                        Select List
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Field 3: Phone / WhatsApp Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Phone / WhatsApp Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9656294203"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-purple-200 bg-purple-50/30 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white font-semibold transition-all"
                  />
                </div>
              </div>

              {/* Field 4: Status (Active / Inactive) */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Faculty Status <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      isActive
                        ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Active Faculty</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={`py-2 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      !isActive
                        ? "bg-amber-50 border-amber-300 text-amber-800 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Inactive</span>
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-purple-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2.5 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white text-xs font-extrabold flex items-center gap-2 shadow-md shadow-purple-600/25 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingTeacher ? "Update Teacher" : "Save Teacher"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: DELETE TEACHER CONFIRMATION
          ======================================================== */}
      {deletingTeacher && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-['Plus_Jakarta_Sans']" onClick={() => setDeletingTeacher(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-rose-100 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Remove Faculty Teacher?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to remove{" "}
                <strong className="text-slate-800">
                  {deletingTeacher.fullName}
                </strong>{" "}
                ({deletingTeacher.specialization}) from the faculty roster?
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeletingTeacher(null)}
                className="py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTeacher}
                disabled={isSubmitting}
                className="py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm shadow-rose-600/20 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Yes, Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
