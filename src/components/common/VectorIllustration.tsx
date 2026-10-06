import React from "react";

export type IllustrationType =
  | "student-learning"
  | "classroom"
  | "certificate-award"
  | "books-library"
  | "secure-payment"
  | "live-broadcast";

interface VectorIllustrationProps {
  type: IllustrationType;
  className?: string;
  size?: number;
}

export default function VectorIllustration({
  type,
  className = "w-32 h-32",
  size = 120,
}: VectorIllustrationProps) {
  switch (type) {
    case "student-learning":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Soft background circle */}
          <circle cx="80" cy="80" r="70" fill="#F3E8FF" />
          <circle cx="80" cy="80" r="54" fill="#EDE9FE" />
          
          {/* Desk */}
          <rect x="25" y="112" width="110" height="8" rx="4" fill="#9333EA" />
          
          {/* Laptop */}
          <rect x="52" y="88" width="56" height="24" rx="3" fill="#7E22CE" />
          <rect x="56" y="92" width="48" height="16" rx="2" fill="#FAF5FF" />
          <circle cx="80" cy="100" r="3" fill="#A855F7" />
          <path d="M46 112L114 112L106 112L54 112H46Z" fill="#6B21A8" />
          
          {/* Student Head & Hair */}
          <circle cx="80" cy="48" r="16" fill="#FDE047" />
          <path d="M68 44C68 36 74 32 80 32C86 32 92 36 92 44C92 45 92 48 92 48H68V44Z" fill="#3B0764" />
          
          {/* Student Body / Shoulders */}
          <path d="M62 82C62 70 70 66 80 66C90 66 98 70 98 82V90H62V82Z" fill="#9333EA" />
          
          {/* Floating lightbulb / idea */}
          <circle cx="116" cy="42" r="8" fill="#FBBF24" />
          <path d="M116 30V32M128 42H126M104 42H106" stroke="#D97706" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    case "certificate-award":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          {/* Soft background aura */}
          <circle cx="80" cy="80" r="70" fill="#FAF5FF" />
          
          {/* Certificate Parchment */}
          <rect x="36" y="32" width="88" height="96" rx="8" fill="#FFFFFF" stroke="#C084FC" strokeWidth="3" />
          <rect x="44" y="40" width="72" height="80" rx="4" fill="#FAF5FF" stroke="#E9D5FF" strokeWidth="1" />
          
          {/* Lines representing certificate text */}
          <rect x="52" y="52" width="56" height="4" rx="2" fill="#7E22CE" />
          <rect x="58" y="62" width="44" height="3" rx="1.5" fill="#A855F7" />
          <rect x="50" y="72" width="60" height="2" rx="1" fill="#D8B4FE" />
          <rect x="54" y="78" width="52" height="2" rx="1" fill="#D8B4FE" />
          
          {/* Gold Seal / Badge */}
          <circle cx="80" cy="98" r="12" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
          <path d="M76 98L79 101L85 95" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Ribbon */}
          <path d="M74 110L70 122L76 118L82 122L78 110" fill="#DC2626" />
        </svg>
      );

    case "books-library":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <circle cx="80" cy="80" r="70" fill="#F3E8FF" />
          
          {/* Stack of books */}
          {/* Book 1 (Bottom) */}
          <rect x="35" y="105" width="90" height="15" rx="3" fill="#6B21A8" />
          <rect x="38" y="108" width="84" height="9" rx="2" fill="#FAF5FF" />
          
          {/* Book 2 (Middle) */}
          <rect x="42" y="86" width="76" height="16" rx="3" fill="#9333EA" />
          <rect x="45" y="89" width="70" height="10" rx="2" fill="#FAF5FF" />
          <rect x="65" y="93" width="26" height="3" rx="1.5" fill="#C084FC" />
          
          {/* Book 3 (Top - Open) */}
          <path d="M52 68C64 64 78 68 80 72C82 68 96 64 108 68V52C96 48 82 52 80 56C78 52 64 48 52 52V68Z" fill="#FAF5FF" stroke="#7E22CE" strokeWidth="2" />
          <line x1="80" y1="56" x2="80" y2="72" stroke="#7E22CE" strokeWidth="2" />
          
          {/* Floating Bookmark */}
          <path d="M92 46V60L96 56L100 60V46H92Z" fill="#EC4899" />
        </svg>
      );

    case "secure-payment":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <circle cx="80" cy="80" r="70" fill="#F3E8FF" />
          
          {/* Phone Frame */}
          <rect x="52" y="30" width="56" height="100" rx="10" fill="#3B0764" />
          <rect x="56" y="38" width="48" height="84" rx="6" fill="#FFFFFF" />
          
          {/* QR Code representation */}
          <rect x="66" y="48" width="28" height="28" rx="4" fill="#FAF5FF" stroke="#9333EA" strokeWidth="2" />
          <rect x="70" y="52" width="8" height="8" fill="#7E22CE" />
          <rect x="82" y="52" width="8" height="8" fill="#7E22CE" />
          <rect x="70" y="64" width="8" height="8" fill="#7E22CE" />
          <rect x="82" y="64" width="8" height="8" fill="#A855F7" />
          
          {/* Green Checkmark Circle */}
          <circle cx="80" cy="98" r="14" fill="#22C55E" />
          <path d="M74 98L78 102L86 94" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "live-broadcast":
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <circle cx="80" cy="80" r="70" fill="#FDF4FF" />
          
          {/* Broadcast Camera / Microphone */}
          <rect x="46" y="52" width="52" height="40" rx="8" fill="#7E22CE" />
          <path d="M98 64L120 50V94L98 80V64Z" fill="#9333EA" />
          
          {/* Lens Circle */}
          <circle cx="72" cy="72" r="12" fill="#FAF5FF" />
          <circle cx="72" cy="72" r="6" fill="#A855F7" />
          
          {/* Live Waves */}
          <path d="M126 62C129 67 129 77 126 82" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
          <path d="M132 56C137 64 137 80 132 88" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
          
          {/* Tripod Stand */}
          <path d="M72 92V116M56 116L72 98L88 116" stroke="#4C1D95" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case "classroom":
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
        >
          <circle cx="80" cy="80" r="70" fill="#F3E8FF" />
          
          {/* Blackboard / Smartboard */}
          <rect x="36" y="35" width="88" height="52" rx="6" fill="#581C87" stroke="#3B0764" strokeWidth="3" />
          <rect x="42" y="41" width="76" height="40" rx="3" fill="#6B21A8" />
          <line x1="48" y1="52" x2="80" y2="52" stroke="#FAF5FF" strokeWidth="2" strokeLinecap="round" />
          <line x1="48" y1="60" x2="105" y2="60" stroke="#E9D5FF" strokeWidth="2" strokeLinecap="round" />
          <line x1="48" y1="68" x2="90" y2="68" stroke="#E9D5FF" strokeWidth="2" strokeLinecap="round" />
          
          {/* Teacher Figure */}
          <circle cx="56" cy="100" r="10" fill="#FDE047" />
          <path d="M42 126C42 116 48 112 56 112C64 112 70 116 70 126V130H42V126Z" fill="#9333EA" />
          
          {/* Pointer stick */}
          <line x1="68" y1="108" x2="86" y2="78" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
          
          {/* Student Desk */}
          <rect x="88" y="112" width="40" height="18" rx="3" fill="#A855F7" />
          <circle cx="108" cy="102" r="8" fill="#FDE047" />
        </svg>
      );
  }
}
