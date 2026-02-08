"use client";

import Link from "next/link";
import { PiBinocularsBold } from "react-icons/pi";

interface BrandIconProps {
  className?: string;
}

export function BrandIcon({ className = "h-5 w-5" }: BrandIconProps) {
  return (
    <>
      {/* Hidden SVG for gradient definition */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="brand-icon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <span className="brand-gradient-icon">
        <PiBinocularsBold className={className} />
      </span>
    </>
  );
}

interface BrandTextProps {
  className?: string;
}

export function BrandText({ className = "" }: BrandTextProps) {
  return (
    <span
      className={`font-semibold brand-gradient ${className}`}
      style={{ fontFamily: "var(--font-heading)" }}
    >
      Spild Spotter
    </span>
  );
}

interface BrandLinkProps {
  className?: string;
  iconClassName?: string;
}

export function BrandLink({ className = "", iconClassName = "h-5 w-5" }: BrandLinkProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <BrandIcon className={iconClassName} />
      <BrandText />
    </Link>
  );
}
