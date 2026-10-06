export interface UserProfile {
  name: string;
  phone: string;
  place: string;
}

export interface SelectedCourse {
  id: string;
  title: string;
  secondaryTitle?: string;
  malayalamTitle?: string;
  subtitle?: string;
  fee: string;
  feeAmount: number;
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
