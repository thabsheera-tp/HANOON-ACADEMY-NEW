export interface SubjectChapter {
  id: string;
  title: string;
  duration: string;
  pdfTitle: string;
  pdfSize: string;
  videoUrl?: string;
}

export interface AdaviyyaSubject {
  id: "seerah" | "haddad" | "fiqh" | "hadith";
  name: string;
  subtitle: string;
  instructor: string;
  badgeGradient: string;
  iconType: "book" | "sparkles" | "scale" | "scroll" | "mic";
  liveClassUrl: string;
  scheduleTime: string;
  description: string;
  chapters: SubjectChapter[];
}

export const DEFAULT_ADAVIYYA_SUBJECTS: AdaviyyaSubject[] = [
  {
    id: "seerah",
    name: "Seerah",
    subtitle: "Prophetic Biography & History",
    instructor: "Usthad Dr. Faisal Al-Hanoon",
    badgeGradient: "bg-gradient-to-tr from-rose-500 to-amber-400 text-white shadow-lg shadow-rose-500/25",
    iconType: "book",
    liveClassUrl: "https://zoom.us/j/hanoon-seerah",
    scheduleTime: "Mondays & Wednesdays • 07:30 PM IST",
    description: "Chronological exploration of the blessed life, sublime moral qualities, and pivotal historic events of Prophet Muhammad ﷺ.",
    chapters: [
      {
        id: "see-1",
        title: "Chapter 1: Pre-Islamic Arabia & Lineage of the Prophet ﷺ",
        duration: "45 mins",
        pdfTitle: "Seerah Chapter 1 Notes & Timeline Map.pdf",
        pdfSize: "4.2 MB",
      },
      {
        id: "see-2",
        title: "Chapter 2: The First Revelation in Cave Hira & Early Dawah",
        duration: "52 mins",
        pdfTitle: "Seerah Chapter 2 Revelation & Da'wah Analysis.pdf",
        pdfSize: "5.1 MB",
      },
      {
        id: "see-3",
        title: "Chapter 3: The Great Hijrah to Madinah & Commonwealth",
        duration: "48 mins",
        pdfTitle: "Seerah Chapter 3 Hijrah & Strategic Milestones.pdf",
        pdfSize: "4.8 MB",
      },
    ],
  },
  {
    id: "haddad",
    name: "Haddad",
    subtitle: "Daily Litany, Dhikr & Spiritual Guidance",
    instructor: "Usthad Anas Nadwi",
    badgeGradient: "bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/25",
    iconType: "sparkles",
    liveClassUrl: "https://zoom.us/j/hanoon-haddad",
    scheduleTime: "Tuesdays & Fridays • 06:30 PM IST",
    description: "Comprehensive commentary, word-by-word tajweed, and spiritual contemplation of the renowned Ratib al-Haddad.",
    chapters: [
      {
        id: "had-1",
        title: "Chapter 1: Origins, Sanad & Significance of Ratib al-Haddad",
        duration: "40 mins",
        pdfTitle: "Ratib al-Haddad Arabic Text with English Meaning.pdf",
        pdfSize: "3.6 MB",
      },
      {
        id: "had-2",
        title: "Chapter 2: Morning & Evening Litany Breakdown",
        duration: "46 mins",
        pdfTitle: "Spiritual Benefits & Transliteration Guide.pdf",
        pdfSize: "4.0 MB",
      },
      {
        id: "had-3",
        title: "Chapter 3: Heart Purifications & Tazkiyah Practices",
        duration: "50 mins",
        pdfTitle: "Tazkiyah Daily Routine & Self-Audit Sheet.pdf",
        pdfSize: "3.2 MB",
      },
    ],
  },
  {
    id: "fiqh",
    name: "Fiqh",
    subtitle: "Islamic Jurisprudence & Practical Rulings",
    instructor: "Usthad Bilal Farooqi",
    badgeGradient: "bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25",
    iconType: "scale",
    liveClassUrl: "https://zoom.us/j/hanoon-fiqh",
    scheduleTime: "Thursdays & Saturdays • 08:00 PM IST",
    description: "Applied rulings of Taharah (Purity), Salah (Prayer), Sawm (Fasting), and contemporary Islamic lifestyle ethics.",
    chapters: [
      {
        id: "fiq-1",
        title: "Chapter 1: Conditions & Nullifiers of Purification (Taharah)",
        duration: "55 mins",
        pdfTitle: "Fiqh of Taharah Illustrated Workbook.pdf",
        pdfSize: "5.8 MB",
      },
      {
        id: "fiq-2",
        title: "Chapter 2: Arkan & Sunan of Salah with Practical Demos",
        duration: "60 mins",
        pdfTitle: "Complete Prayer Manual with Mistake Rectifications.pdf",
        pdfSize: "6.4 MB",
      },
      {
        id: "fiq-3",
        title: "Chapter 3: Zakat Calculations & Fasting Invalidation Rules",
        duration: "48 mins",
        pdfTitle: "Zakat Worksheet & Modern Asset Rulings.pdf",
        pdfSize: "4.5 MB",
      },
    ],
  },
  {
    id: "hadith",
    name: "Hadith",
    subtitle: "Prophetic Traditions & Teachings",
    instructor: "Usthad Dr. Faisal Al-Hanoon",
    badgeGradient: "bg-gradient-to-tr from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25",
    iconType: "scroll",
    liveClassUrl: "https://zoom.us/j/hanoon-hadith",
    scheduleTime: "Thursdays & Sundays • 07:30 PM IST",
    description: "In-depth study of the blessed narrations, chains of transmission (Isnad), and practical ethical teachings of Prophet Muhammad ﷺ.",
    chapters: [
      {
        id: "had-ch1",
        title: "Chapter 1: Science of Hadith Terminology & Mustalah",
        duration: "48 mins",
        pdfTitle: "Hadith Terminology & Classification Chart.pdf",
        pdfSize: "4.6 MB",
      },
      {
        id: "had-ch2",
        title: "Chapter 2: Selected 40 Hadiths on Sincerity & Character",
        duration: "55 mins",
        pdfTitle: "Nawawi 40 Hadiths Arabic & English Commentary.pdf",
        pdfSize: "6.1 MB",
      },
      {
        id: "had-ch3",
        title: "Chapter 3: Sunan & Adab of Daily Conduct",
        duration: "50 mins",
        pdfTitle: "Prophetic Ethics for Modern Society.pdf",
        pdfSize: "5.2 MB",
      },
    ],
  },
];

const LOCAL_STORAGE_KEY = "hanoon_adaviyya_subjects_v2";

export function getAdaviyyaSubjects(): AdaviyyaSubject[] {
  if (typeof window === "undefined") return DEFAULT_ADAVIYYA_SUBJECTS;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === 4) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to load custom Adaviyya subjects from localStorage:", e);
  }
  return DEFAULT_ADAVIYYA_SUBJECTS;
}

export function saveAdaviyyaSubjects(subjects: AdaviyyaSubject[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subjects));
    window.dispatchEvent(new CustomEvent("hanoon_subjects_updated", { detail: subjects }));
  } catch (e) {
    console.error("Failed to save Adaviyya subjects:", e);
  }
}

export function updateAdaviyyaSubject(id: string, updates: Partial<AdaviyyaSubject>): void {
  const current = getAdaviyyaSubjects();
  const updated = current.map((s) => (s.id === id ? { ...s, ...updates } : s));
  saveAdaviyyaSubjects(updated);
}
