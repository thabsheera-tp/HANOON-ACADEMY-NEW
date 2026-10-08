export interface UserProfile {
  name: string;
  phone: string;
  place: string;
  age?: string | number;
}

export interface SelectedCourse {
  id: string;
  title: string;
  secondaryTitle?: string;
  malayalamTitle?: string;
  subtitle?: string;
  fee: string;
  feeAmount: number;
  admissionFee?: string;
  admissionFeeAmount?: number;
  batchInfo?: string;
  installmentNote?: string;
  duration: string;
  tagline: string;
  highlights: string[];
}

export interface PaymentDetails {
  upiTxId: string;
  amount: string;
  submittedAt: string;
  status: "unpaid" | "pending_verification" | "verified";
}

export type ScreenTab =
  | "splash"
  | "courses"
  | "course-details"
  | "onboarding"
  | "payment"
  | "dashboard";
