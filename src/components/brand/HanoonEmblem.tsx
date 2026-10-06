"use client";

import React from "react";

interface HanoonEmblemProps {
  className?: string;
  size?: number;
}

export default function HanoonEmblem({
  className = "w-16 h-16",
  size = 64,
}: HanoonEmblemProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="emblemGold" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#FFF9D2" />
          <stop offset="25%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="75%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#8A5303" />
        </linearGradient>

        <linearGradient id="emblemSpecular" x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#FDE68A" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#B45309" stopOpacity="0.4" />
        </linearGradient>

        <linearGradient id="emblemBand" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="35%" stopColor="#D97706" />
          <stop offset="75%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#543302" />
        </linearGradient>
      </defs>

      {/* Skull Cap / Band below the diamond */}
      <path
        d="M32 46 L32 66 C32 78 88 78 88 66 L88 46 C78 52 69 55 60 55 C51 55 42 52 32 46 Z"
        fill="url(#emblemBand)"
        stroke="url(#emblemGold)"
        strokeWidth="1.2"
      />

      {/* Diamond Mortarboard Top */}
      <polygon
        points="60,18 108,38 60,58 12,38"
        fill="url(#emblemGold)"
        stroke="url(#emblemSpecular)"
        strokeWidth="1.5"
      />

      {/* Center Ridge Lighting Reflection Line */}
      <line
        x1="60"
        y1="18"
        x2="60"
        y2="58"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />

      {/* Center Tassel Button */}
      <ellipse
        cx="60"
        cy="38"
        rx="3.5"
        ry="2.5"
        fill="#FFFBEB"
        stroke="#B45309"
        strokeWidth="1"
      />

      {/* Hanging Tassel Cord */}
      <path
        d="M58 38 C42 41 24 50 24 66"
        stroke="url(#emblemGold)"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />

      {/* Tassel Pendant Bell / Drop Tip */}
      <ellipse
        cx="24"
        cy="70"
        rx="3.5"
        ry="5.5"
        fill="url(#emblemGold)"
        stroke="#FFFBEB"
        strokeWidth="0.8"
      />
      <circle cx="24" cy="76" r="1.6" fill="#FDE68A" />
    </svg>
  );
}
