export interface AppSettings {
  upiId: string;
  merchantName: string;
  autoApprovalEnabled: boolean;
  contactWhatsApp: string;
  notificationAlerts: boolean;
  compactMobileMode: boolean;
  coursePricing: {
    adaviyya: number;
    homeTuition: number;
    fashionDesigning: number;
    shamail: number;
  };
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  category: "PAYMENT" | "CURRICULUM" | "PAYROLL" | "SETTINGS" | "AUTH";
  details: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  upiId: "hanoonacademy@upi",
  merchantName: "Hanoon Academy of Islamic Studies",
  autoApprovalEnabled: false,
  contactWhatsApp: "919846012345",
  notificationAlerts: true,
  compactMobileMode: false,
  coursePricing: {
    adaviyya: 1500,
    homeTuition: 2000,
    fashionDesigning: 2500,
    shamail: 1200,
  },
};

const DEFAULT_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: "aud-001",
    timestamp: "Today, 08:35 AM",
    actor: "Admin (Faisal Al-Hanoon)",
    action: "Approved UPI Payment",
    category: "PAYMENT",
    details: "Approved ₹1,500 via UTR 423589104712 for student Aysha Mariyam (Adaviyya).",
  },
  {
    id: "aud-002",
    timestamp: "Today, 08:15 AM",
    actor: "Admin (Faisal Al-Hanoon)",
    action: "Curriculum Added",
    category: "CURRICULUM",
    details: "Integrated Ash-Shama'il al-Muhammadiyya (الشمائل المحمدية) 2x2 grid catalog.",
  },
  {
    id: "aud-003",
    timestamp: "Yesterday, 06:40 PM",
    actor: "Admin (Faisal Al-Hanoon)",
    action: "Payroll Disbursed",
    category: "PAYROLL",
    details: "Disbursed ₹12,800 to Usthad Dr. Faisal for 16 completed live classes.",
  },
  {
    id: "aud-004",
    timestamp: "April 04, 2026, 11:20 AM",
    actor: "Admin (Faisal Al-Hanoon)",
    action: "Settings Configured",
    category: "SETTINGS",
    details: "Verified primary Institute UPI ID 'hanoonacademy@upi'.",
  },
];

export function getAppSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("hanoon_app_settings");
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Failed to read settings from localStorage:", e);
  }
  return DEFAULT_SETTINGS;
}

export function saveAppSettings(newSettings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("hanoon_app_settings", JSON.stringify(newSettings));
    window.dispatchEvent(new CustomEvent("hanoon_settings_updated", { detail: newSettings }));
    addAuditLog({
      actor: "Admin Root",
      action: "Updated Global Settings",
      category: "SETTINGS",
      details: `Updated UPI (${newSettings.upiId}) and Course Pricing rates.`,
    });
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}

export function getAuditLogs(): AuditLogItem[] {
  if (typeof window === "undefined") return DEFAULT_AUDIT_LOGS;
  try {
    const raw = localStorage.getItem("hanoon_audit_logs");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Failed to read audit logs:", e);
  }
  return DEFAULT_AUDIT_LOGS;
}

export function addAuditLog(entry: Omit<AuditLogItem, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  try {
    const current = getAuditLogs();
    const newLog: AuditLogItem = {
      ...entry,
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    const updated = [newLog, ...current].slice(0, 50); // keep recent 50
    localStorage.setItem("hanoon_audit_logs", JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("hanoon_audit_logs_updated", { detail: updated }));
  } catch (e) {
    console.error("Failed to add audit log:", e);
  }
}
