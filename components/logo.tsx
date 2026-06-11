"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-label="Tessera logo"
    >
      <rect
        x="4"
        y="4"
        width="11"
        height="11"
        rx="2"
        fill="currentColor"
        opacity="0.9"
      />
      <rect
        x="17"
        y="4"
        width="11"
        height="11"
        rx="2"
        fill="currentColor"
        opacity="0.5"
      />
      <rect
        x="4"
        y="17"
        width="11"
        height="11"
        rx="2"
        fill="currentColor"
        opacity="0.5"
      />
      <rect
        x="17"
        y="17"
        width="11"
        height="11"
        rx="2"
        fill="#bfa06e"
        opacity="0.85"
      />
    </svg>
  );
}
