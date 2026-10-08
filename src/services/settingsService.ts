import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export interface AppSettings {
  upiId: string;
  upiQrUrl?: string;
  qrCodeUrl?: string;
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

export const DEFAULT_SETTINGS: AppSettings = {
  upiId: "hanoonacademy@upi",
  upiQrUrl: "",
  qrCodeUrl: "",
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
    timestamp: "System Init",
    actor: "Admin (Faisal Al-Hanoon)",
    action: "System Audit Initialized",
    category: "AUTH",
    details: "Universal authentication & Supabase database security rules active.",
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

const LOCAL_SETTINGS_KEY = "hanoon_app_settings";
const LOCAL_AUDIT_KEY = "hanoon_audit_logs";

/**
 * Normalizes an Indian/international phone number for WhatsApp wa.me links.
 * Strips all non-digit characters. If 10 digits, prepends '91'.
 */
export function formatWhatsAppLink(phone?: string, text?: string): string {
  const raw = phone ? String(phone).replace(/\D/g, "") : "";
  let formattedPhone = raw;
  if (!formattedPhone) {
    formattedPhone = "919846012345";
  } else if (formattedPhone.length === 10) {
    formattedPhone = `91${formattedPhone}`;
  } else if (!formattedPhone.startsWith("91") && formattedPhone.length === 11 && formattedPhone.startsWith("0")) {
    formattedPhone = `91${formattedPhone.slice(1)}`;
  }
  
  const query = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${formattedPhone}${query}`;
}

/**
 * Synchronous reader for fast component mount & hydration.
 */
export function getAppSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Failed to read settings from localStorage:", e);
  }
  return DEFAULT_SETTINGS;
}

/**
 * Asynchronously fetches settings from Supabase 'app_settings' and 'settings' tables,
 * with fallback to localStorage.
 */
export async function fetchAppSettings(): Promise<AppSettings> {
  if (isSupabaseConfigured && supabase) {
    try {
      // 1. Check app_settings table
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .eq("id", "global")
        .single();

      if (!error && data) {
        const qrImg = (data.upi_qr_url as string) || (data.qr_code_url as string) || "";
        const mappedSettings: AppSettings = {
          upiId: data.upi_id || DEFAULT_SETTINGS.upiId,
          upiQrUrl: qrImg,
          qrCodeUrl: qrImg,
          merchantName: data.merchant_name || DEFAULT_SETTINGS.merchantName,
          autoApprovalEnabled: Boolean(data.auto_approval_enabled),
          contactWhatsApp: data.contact_whatsapp || DEFAULT_SETTINGS.contactWhatsApp,
          notificationAlerts: data.notification_alerts ?? DEFAULT_SETTINGS.notificationAlerts,
          compactMobileMode: Boolean(data.compact_mobile_mode),
          coursePricing: {
            ...DEFAULT_SETTINGS.coursePricing,
            ...(data.course_pricing || {}),
          },
        };

        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(mappedSettings));
        }
        return mappedSettings;
      }

      // 2. Fallback check 'settings' table if app_settings is not populated
      const { data: altData, error: altErr } = await supabase
        .from("settings")
        .select("*")
        .eq("id", "global")
        .single();

      if (!altErr && altData) {
        const altQr = (altData.upi_qr_url as string) || (altData.qr_code_url as string) || "";
        const mappedAlt: AppSettings = {
          ...DEFAULT_SETTINGS,
          upiId: altData.upi_id || DEFAULT_SETTINGS.upiId,
          upiQrUrl: altQr,
          qrCodeUrl: altQr,
          merchantName: altData.merchant_name || DEFAULT_SETTINGS.merchantName,
          contactWhatsApp: altData.contact_whatsapp || DEFAULT_SETTINGS.contactWhatsApp,
        };
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(mappedAlt));
        }
        return mappedAlt;
      }
    } catch (err) {
      console.warn("Failed to fetch settings from Supabase, fallback to local:", err);
    }
  }

  return getAppSettings();
}

/**
 * Persists settings to Supabase and broadcasts changes to all devices via Realtime.
 */
export async function saveAppSettings(newSettings: AppSettings): Promise<void> {
  const now = new Date().toISOString();
  const qrImageVal = newSettings.upiQrUrl || newSettings.qrCodeUrl || "";

  // 1. Save to Supabase 'app_settings' table
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from("app_settings").upsert({
        id: "global",
        upi_id: newSettings.upiId,
        upi_qr_url: qrImageVal,
        qr_code_url: qrImageVal,
        merchant_name: newSettings.merchantName,
        auto_approval_enabled: newSettings.autoApprovalEnabled,
        contact_whatsapp: newSettings.contactWhatsApp,
        notification_alerts: newSettings.notificationAlerts,
        compact_mobile_mode: newSettings.compactMobileMode,
        course_pricing: newSettings.coursePricing,
        updated_at: now,
      });

      if (error) {
        console.error("Supabase app_settings upsert error:", error);
      }
    } catch (err) {
      console.warn("Failed to save settings to Supabase app_settings:", err);
    }

    // 2. Mirror into 'settings' table for universal compatibility
    try {
      await supabase.from("settings").upsert({
        id: "global",
        upi_id: newSettings.upiId,
        upi_qr_url: qrImageVal,
        qr_code_url: qrImageVal,
        merchant_name: newSettings.merchantName,
        auto_approval_enabled: newSettings.autoApprovalEnabled,
        contact_whatsapp: newSettings.contactWhatsApp,
        course_pricing: newSettings.coursePricing,
        updated_at: now,
      });
    } catch (err) {
      // Non-fatal if settings table isn't created yet in target instance
    }
  }

  // 3. Cache in localStorage & trigger local window event
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(newSettings));
      window.dispatchEvent(new CustomEvent("hanoon_settings_updated", { detail: newSettings }));
      addAuditLog({
        actor: "Admin",
        action: "Updated Global Settings",
        category: "SETTINGS",
        details: `Updated UPI (${newSettings.upiId}), QR Code image, and Course Pricing rates.`,
      });
    } catch (e) {
      console.error("Failed to save settings to localStorage:", e);
    }
  }
}

/**
 * Subscribes to real-time changes in Institute Settings (UPI ID, fees, WhatsApp, QR code).
 * Ensures instant sync to student screens when Admin changes settings.
 */
export function subscribeToAppSettings(callback: (settings: AppSettings) => void): () => void {
  let realtimeChannel: RealtimeChannel | null = null;
  let settingsRealtimeChannel: RealtimeChannel | null = null;

  // 1. Supabase Postgres Realtime Subscription for 'app_settings'
  if (isSupabaseConfigured && supabase) {
    try {
      realtimeChannel = supabase
        .channel("public:app_settings_global")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "app_settings",
            filter: "id=eq.global",
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (row) {
              const qr = (row.upi_qr_url as string) || (row.qr_code_url as string) || "";
              const updated: AppSettings = {
                upiId: (row.upi_id as string) || DEFAULT_SETTINGS.upiId,
                upiQrUrl: qr,
                qrCodeUrl: qr,
                merchantName: (row.merchant_name as string) || DEFAULT_SETTINGS.merchantName,
                autoApprovalEnabled: Boolean(row.auto_approval_enabled),
                contactWhatsApp: (row.contact_whatsapp as string) || DEFAULT_SETTINGS.contactWhatsApp,
                notificationAlerts: (row.notification_alerts as boolean) ?? DEFAULT_SETTINGS.notificationAlerts,
                compactMobileMode: Boolean(row.compact_mobile_mode),
                coursePricing: {
                  ...DEFAULT_SETTINGS.coursePricing,
                  ...((row.course_pricing as typeof DEFAULT_SETTINGS.coursePricing) || {}),
                },
              };

              if (typeof window !== "undefined") {
                localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updated));
              }
              callback(updated);
            }
          }
        )
        .subscribe();

      // Also listen on 'settings' table
      settingsRealtimeChannel = supabase
        .channel("public:settings_global")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "settings",
            filter: "id=eq.global",
          },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            if (row) {
              const qr = (row.upi_qr_url as string) || (row.qr_code_url as string) || "";
              const updated: AppSettings = {
                ...getAppSettings(),
                upiId: (row.upi_id as string) || DEFAULT_SETTINGS.upiId,
                upiQrUrl: qr,
                qrCodeUrl: qr,
                merchantName: (row.merchant_name as string) || DEFAULT_SETTINGS.merchantName,
              };
              if (typeof window !== "undefined") {
                localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(updated));
              }
              callback(updated);
            }
          }
        )
        .subscribe();
    } catch (err) {
      console.warn("Realtime settings subscription error:", err);
    }
  }

  // 2. Local Window Event Listener (instant update across same device tabs)
  const handleLocalEvent = (e: Event) => {
    const customEvt = e as CustomEvent<AppSettings>;
    if (customEvt.detail) {
      callback(customEvt.detail);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("hanoon_settings_updated", handleLocalEvent);
  }

  // Cleanup function
  return () => {
    if (realtimeChannel && supabase) {
      supabase.removeChannel(realtimeChannel);
    }
    if (settingsRealtimeChannel && supabase) {
      supabase.removeChannel(settingsRealtimeChannel);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("hanoon_settings_updated", handleLocalEvent);
    }
  };
}

/**
 * Retrieves audit logs with Supabase support.
 */
export function getAuditLogs(): AuditLogItem[] {
  if (typeof window === "undefined") return DEFAULT_AUDIT_LOGS;
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Failed to read audit logs:", e);
  }
  return DEFAULT_AUDIT_LOGS;
}

/**
 * Asynchronously fetches audit logs from Supabase 'audit_logs' table.
 */
export async function fetchAuditLogs(): Promise<AuditLogItem[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        const mapped: AuditLogItem[] = data.map((d) => ({
          id: d.id,
          timestamp: new Date(d.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          actor: d.actor,
          action: d.action,
          category: d.category,
          details: d.details,
        }));
        if (typeof window !== "undefined") {
          localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(mapped));
        }
        return mapped;
      }
    } catch (err) {
      console.warn("Failed to fetch audit logs from Supabase:", err);
    }
  }

  return getAuditLogs();
}

/**
 * Appends a new audit log to both Supabase and localStorage.
 */
export async function addAuditLog(entry: Omit<AuditLogItem, "id" | "timestamp">): Promise<void> {
  const newLog: AuditLogItem = {
    ...entry,
    id: `aud-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("audit_logs").insert([
        {
          actor: entry.actor,
          action: entry.action,
          category: entry.category,
          details: entry.details,
        },
      ]);
    } catch (err) {
      console.warn("Supabase audit log insert error:", err);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const current = getAuditLogs();
      const updated = [newLog, ...current].slice(0, 50);
      localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("hanoon_audit_logs_updated", { detail: updated }));
    } catch (e) {
      console.error("Failed to add audit log to localStorage:", e);
    }
  }
}
