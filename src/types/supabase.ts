export type PaymentStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ClassStatus = "SCHEDULED" | "LIVE_NOW" | "COMPLETED";
export type CertificateStatus = "ISSUED" | "VERIFIED" | "REVOKED";
export type PayrollStatus = "PENDING" | "PAID";

export interface DbCourse {
  id: string;
  title_en: string;
  title_ml?: string;
  subtitle: string;
  fee_amount: number;
  duration: string;
  syllabus_summary: string;
  highlights: string[];
  is_active: boolean;
  created_at: string;
}

export interface DbCourseSubject {
  id: string;
  course_id: string;
  name: string;
  subtitle: string;
  instructor: string;
  schedule_time: string;
  live_url: string;
  description: string;
  order_num: number;
  chapters?: Record<string, unknown>[];
  created_at?: string;
}

export interface DbSpecialClass {
  id: string;
  title: string;
  subtitle: string;
  instructor: string;
  category: string;
  schedule_time: string;
  status: "UPCOMING" | "LIVE_NOW" | "COMPLETED";
  live_url: string;
  recording_url?: string;
  pdf_title?: string;
  pdf_size?: string;
  description?: string;
  registered_count?: number;
  created_at?: string;
}

export interface DbStudent {
  id: string;
  user_id?: string;
  full_name: string;
  whatsapp_num: string;
  district: string;
  created_at: string;
}

export interface DbPayment {
  id: string;
  student_id: string;
  course_id: string;
  upi_txid: string;
  status: PaymentStatus;
  amount: number;
  rejection_reason?: string | null;
  submitted_at: string;
  updated_at: string;
  // Joined fields for admin viewing
  student?: DbStudent;
  course?: DbCourse;
}

export interface DbTeacher {
  id: string;
  full_name: string;
  email: string;
  specialization: string;
  phone?: string;
  rate_per_class: number;
  is_active: boolean;
  created_at?: string;
}

export interface DbLiveClass {
  id: string;
  teacher_id: string;
  course_id: string;
  subject_id?: string;
  title: string;
  meeting_link: string;
  scheduled_at: string;
  duration_minutes: number;
  status: ClassStatus;
  attendees_count: number;
  notes_pdf_url?: string;
  recording_url?: string;
  created_at?: string;
  teacher?: DbTeacher;
}

export interface DbCertificate {
  id: string;
  student_id: string;
  student_name: string;
  course_id: string;
  course_title: string;
  certificate_number: string;
  issue_date: string;
  grade: string;
  status: CertificateStatus;
  pdf_url?: string;
  created_at?: string;
}

export interface DbPayroll {
  id: string;
  teacher_id: string;
  teacher_name: string;
  month_year: string;
  classes_taken: number;
  rate_per_class: number;
  total_amount: number;
  status: PayrollStatus;
  payment_reference?: string;
  paid_at?: string;
  created_at?: string;
}
