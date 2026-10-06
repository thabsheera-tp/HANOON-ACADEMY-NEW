"use client";

import React from "react";

interface HanoonNeonGlyphProps {
  className?: string;
  size?: number;
}

export default function HanoonNeonGlyph({
  className = "w-28 h-28",
  size = 112,
}: HanoonNeonGlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* High-Tech Teal Neon Gradient */}
        <linearGradient id="neonTeal" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5EEAD4" />
          <stop offset="50%" stopColor="#20B2AA" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>

        {/* Metallic Gold Radiant Gradient */}
        <linearGradient id="neonGold" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>

        {/* Pure Specular Core Gradient */}
        <linearGradient id="neonCore" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#5EEAD4" stopOpacity="0.4" />
        </linearGradient>

        {/* Cyber Neon Glow Filter */}
        <filter id="neonGlowEffect" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Radial Ambient Backlight Aura */}
        <radialGradient id="glyphAura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#20B2AA" stopOpacity="0.35" />
          <stop offset="50%" stopColor="#D97706" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#022C22" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Ambient Radial Backlight Glow */}
      <circle cx="60" cy="60" r="54" fill="url(#glyphAura)" />

      {/* Outer Hexagonal / Circular Guide Ring */}
      <circle
        cx="60"
        cy="60"
        r="50"
        stroke="url(#neonTeal)"
        strokeWidth="1.2"
        strokeOpacity="0.25"
        strokeDasharray="4 6"
      />

      <g filter="url(#neonGlowEffect)">
        {/* ========================================================
            GEOMETRIC 'H' + OPEN BOOK GLYPH (Teal & Gold Outlines)
            ======================================================== */}

        {/* Left Book Wing / 'H' Left Pillar */}
        <path
          d="M32 30 L46 38 L46 86 L32 78 Z"
          fill="url(#neonTeal)"
          fillOpacity="0.12"
          stroke="url(#neonTeal)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Right Book Wing / 'H' Right Pillar */}
        <path
          d="M88 30 L74 38 L74 86 L88 78 Z"
          fill="url(#neonTeal)"
          fillOpacity="0.12"
          stroke="url(#neonTeal)"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Open Book Inner Pages (Floating Tech V-Fold) */}
        <path
          d="M46 44 L60 54 L74 44"
          stroke="url(#neonGold)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M46 56 L60 66 L74 56"
          stroke="url(#neonGold)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeOpacity="0.8"
        />

        {/* Center 'H' Crossbar & Book Spine Core */}
        <line
          x1="60"
          y1="54"
          x2="60"
          y2="90"
          stroke="url(#neonGold)"
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* Horizontal Connector Chords (forming the distinct 'H') */}
        <line
          x1="46"
          y1="64"
          x2="74"
          y2="64"
          stroke="url(#neonTeal)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="3 3"
        />

        {/* Upper Geometric Star/Apex Diamond Accent */}
        <polygon
          points="60,20 64,28 60,36 56,28"
          fill="url(#neonGold)"
          stroke="#FFFFFF"
          strokeWidth="1"
        />

        {/* Lower Rehal Anchor Chevron */}
        <path
          d="M40 88 L60 98 L80 88"
          stroke="url(#neonGold)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
