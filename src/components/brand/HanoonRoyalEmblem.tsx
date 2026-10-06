"use client";

import React from "react";

interface HanoonRoyalEmblemProps {
  className?: string;
  size?: number;
}

export default function HanoonRoyalEmblem({
  className = "w-24 h-24",
  size = 96,
}: HanoonRoyalEmblemProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 140 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Brushed Metallic Royal Gold Gradient */}
        <linearGradient id="royalGold" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#FFF7D6" />
          <stop offset="30%" stopColor="#F5D372" />
          <stop offset="60%" stopColor="#D4AF37" />
          <stop offset="85%" stopColor="#AA7C11" />
          <stop offset="100%" stopColor="#785305" />
        </linearGradient>

        {/* Specular Highlight Gold */}
        <linearGradient id="royalHighlight" x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#FDE68A" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#B45309" stopOpacity="0.4" />
        </linearGradient>

        {/* Soft Ambient Golden Glow */}
        <filter id="royalAuraGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Radial Ambient Center Light */}
        <radialGradient id="emblemBacklight" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#012E21" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Backlight Ambient Aura */}
      <circle cx="70" cy="70" r="62" fill="url(#emblemBacklight)" />

      {/* ========================================================
          1. MODERN GEOMETRIC CRESCENT CREST (HILAL)
          Embracing the sacred knowledge emblem
          ======================================================== */}
      <g filter="url(#royalAuraGlow)">
        {/* Outer Modern Crescent Arch */}
        <path
          d="M72 16 C98 16 120 38 120 68 C120 98 96 122 66 122 C50 122 36 115 26 104 C44 112 66 108 80 94 C96 78 98 52 82 34 C79 30 75 27 72 24 C72 21 72 18 72 16 Z"
          fill="url(#royalGold)"
          stroke="url(#royalHighlight)"
          strokeWidth="0.8"
        />

        {/* Delicate Inner Crescent Accent Ring */}
        <path
          d="M62 26 C82 30 96 48 96 68 C96 88 80 106 60 110"
          stroke="url(#royalHighlight)"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeDasharray="2 3"
          strokeOpacity="0.75"
        />

        {/* ========================================================
            2. REHAL (SACRED BOOK STAND) & OPEN QURAN / BOOK
            Intersecting the crescent with geometric elegance
            ======================================================== */}
        {/* Rehal X-Stand Base */}
        <path
          d="M40 98 L70 74 L100 98"
          stroke="url(#royalGold)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M48 102 L70 84 L92 102"
          stroke="url(#royalGold)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.85"
        />

        {/* Open Book Wings (Geometric Knowledge Pages) */}
        {/* Left Page */}
        <path
          d="M34 64 C46 58 60 60 70 70 C70 54 58 48 38 52 Z"
          fill="#FFFFFF"
          stroke="url(#royalGold)"
          strokeWidth="1.2"
        />
        {/* Right Page */}
        <path
          d="M106 64 C94 58 80 60 70 70 C70 54 82 48 102 52 Z"
          fill="#FFFFFF"
          stroke="url(#royalGold)"
          strokeWidth="1.2"
        />

        {/* Center Spine Line */}
        <line
          x1="70"
          y1="52"
          x2="70"
          y2="74"
          stroke="url(#royalGold)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Radiating Celestial Star at the Apex */}
        <polygon
          points="70,30 73,38 81,40 75,46 76,54 70,50 64,54 65,46 59,40 67,38"
          fill="url(#royalGold)"
          stroke="#FFFFFF"
          strokeWidth="0.8"
        />
      </g>
    </svg>
  );
}
