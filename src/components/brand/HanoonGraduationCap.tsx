"use client";

import React from "react";

interface HanoonGraduationCapProps {
  className?: string;
  size?: number;
}

export default function HanoonGraduationCap({
  className = "w-28 h-28",
  size = 112,
}: HanoonGraduationCapProps) {
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
        {/* Metallic Gold Primary Gradient */}
        <linearGradient id="gradCapGoldPrimary" x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="25%" stopColor="#FDE68A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="75%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>

        {/* Specular Pure White / Light Gold Highlight */}
        <linearGradient id="capSpecularWhite" x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#FEF08A" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#B45309" stopOpacity="0.5" />
        </linearGradient>

        {/* Cap Band Shading */}
        <linearGradient id="capSkullBand" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="35%" stopColor="#D97706" />
          <stop offset="75%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        {/* Ambient Golden Glow Filter */}
        <filter id="capRoyalGlow" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#capRoyalGlow)">
        {/* Skull Cap / Band beneath the mortarboard */}
        <path
          d="M32 46 L32 66 C32 78 88 78 88 66 L88 46 C78 52 69 55 60 55 C51 55 42 52 32 46 Z"
          fill="url(#capSkullBand)"
          stroke="url(#gradCapGoldPrimary)"
          strokeWidth="1.4"
        />

        {/* Lower Rim White Accent Line */}
        <path
          d="M36 65 C43 72 77 72 84 65"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />

        {/* Diamond Mortarboard Top (Perspective 3D angle) */}
        <polygon
          points="60,18 108,38 60,58 12,38"
          fill="url(#gradCapGoldPrimary)"
          stroke="url(#capSpecularWhite)"
          strokeWidth="1.8"
        />

        {/* Center Ridge Lighting Reflection Line (White metallic sheen) */}
        <line
          x1="60"
          y1="18"
          x2="60"
          y2="58"
          stroke="#FFFFFF"
          strokeWidth="1.4"
          strokeOpacity="0.85"
        />

        {/* Center Tassel Button */}
        <ellipse
          cx="60"
          cy="38"
          rx="4"
          ry="3"
          fill="#FFFFFF"
          stroke="#D97706"
          strokeWidth="1.2"
        />

        {/* Hanging Tassel Cord */}
        <path
          d="M58 38 C42 41 24 50 24 66"
          stroke="url(#gradCapGoldPrimary)"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Tassel Pendant Bell / Drop Tip */}
        <ellipse
          cx="24"
          cy="70"
          rx="4"
          ry="6"
          fill="url(#gradCapGoldPrimary)"
          stroke="#FFFFFF"
          strokeWidth="1"
        />
        <circle cx="24" cy="76" r="1.8" fill="#FFFFFF" />
      </g>
    </svg>
  );
}
