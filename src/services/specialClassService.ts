export interface SpecialClass {
  id: string;
  title: string;
  subtitle: string;
  instructor: string;
  category: "Recitation" | "Gathering" | "Workshop" | "Masterclass";
  badgeGradient: string;
  iconType: "mic" | "sparkles" | "book" | "music" | "video";
  scheduleTime: string;
  status: "UPCOMING" | "LIVE_NOW" | "COMPLETED";
  liveUrl: string;
  description: string;
  recordingDuration?: string;
  recordingUrl?: string;
  pdfTitle?: string;
  pdfSize?: string;
  registeredCount?: number;
}

export const DEFAULT_SPECIAL_CLASSES: SpecialClass[] = [
  {
    id: "spc-tajweed",
    title: "Tajweed",
    subtitle: "Quran Recitation Rules & Phonetics",
    instructor: "Qari Usthad Abdul Rahman Al-Hafiz",
    category: "Recitation",
    badgeGradient: "bg-gradient-to-tr from-violet-600 via-indigo-600 to-purple-500 text-white shadow-lg shadow-purple-500/25",
    iconType: "mic",
    scheduleTime: "Every Sunday • 08:00 AM IST",
    status: "LIVE_NOW",
    liveUrl: "https://zoom.us/j/hanoon-tajweed-live",
    description: "Master the authentic science of Quranic phonetics, Makharij al-Huroof, Sifat, and precision articulation under certified Qira'at masters.",
    recordingDuration: "54 mins",
    recordingUrl: "https://youtube.com/live/hanoon-tajweed-rec",
    pdfTitle: "Tajweed Rules & Phonetic Articulation Guide.pdf",
    pdfSize: "6.4 MB",
    registeredCount: 142,
  },
  {
    id: "spc-burdah",
    title: "Burdah Live",
    subtitle: "Live Qasida Burdah Recitation & Spiritual Gathering",
    instructor: "Hanoon Academy Munshid Collective",
    category: "Gathering",
    badgeGradient: "bg-gradient-to-tr from-rose-500 via-pink-600 to-amber-500 text-white shadow-lg shadow-pink-500/25",
    iconType: "sparkles",
    scheduleTime: "Thursday Evenings • 09:00 PM IST",
    status: "UPCOMING",
    liveUrl: "https://zoom.us/j/hanoon-burdah-live",
    description: "Weekly blessed gathering of Qasida al-Burdah by Imam al-Busiri, devotional hymns, and Salawat on the Prophet Muhammad ﷺ.",
    recordingDuration: "68 mins",
    recordingUrl: "https://youtube.com/live/hanoon-burdah-rec",
    pdfTitle: "Qasida al-Burdah Arabic Text with Translation.pdf",
    pdfSize: "8.2 MB",
    registeredCount: 218,
  },
];

const LOCAL_STORAGE_KEY = "hanoon_special_classes_v1";

export function getSpecialClasses(): SpecialClass[] {
  if (typeof window === "undefined") return DEFAULT_SPECIAL_CLASSES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load special classes from localStorage:", e);
  }
  return DEFAULT_SPECIAL_CLASSES;
}

export function saveSpecialClasses(classes: SpecialClass[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(classes));
    window.dispatchEvent(new CustomEvent("hanoon_special_classes_updated", { detail: classes }));
  } catch (e) {
    console.error("Failed to save special classes:", e);
  }
}

export function addSpecialClass(item: Omit<SpecialClass, "id">): SpecialClass {
  const current = getSpecialClasses();
  const newClass: SpecialClass = {
    ...item,
    id: `spc-${Date.now()}`,
  };
  const updated = [newClass, ...current];
  saveSpecialClasses(updated);
  return newClass;
}

export function updateSpecialClass(id: string, updates: Partial<SpecialClass>): void {
  const current = getSpecialClasses();
  const updated = current.map((c) => (c.id === id ? { ...c, ...updates } : c));
  saveSpecialClasses(updated);
}

export function deleteSpecialClass(id: string): void {
  const current = getSpecialClasses();
  const updated = current.filter((c) => c.id !== id);
  saveSpecialClasses(updated);
}
