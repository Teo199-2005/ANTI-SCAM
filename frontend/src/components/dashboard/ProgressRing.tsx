"use client";

import { color, rgb } from "@/lib/design-tokens";

type ProgressRingProps = {
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Stroke color — default: brand secondary (data viz, not CTA) */
  color?: string;
  trackColor?: string;
  label?: string;
  labelColor?: string;
};

export default function ProgressRing({
  value,
  size = 80,
  strokeWidth = 8,
  color: strokeColor = color.brand.secondary,
  trackColor,
  label,
  labelColor,
}: ProgressRingProps) {
  const safeValue = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (safeValue / 100) * circumference;
  const renderedLabel = label ?? `${Math.round(safeValue)}%`;
  const track = trackColor ?? `rgba(${rgb.secondary}, 0.2)`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} role="img" aria-label={`Progress ${renderedLabel}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={track}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-500 motion-reduce:transition-none"
        />
      </svg>
      <span
        className="pointer-events-none absolute font-dash text-dash-xs font-bold"
        style={{ color: labelColor ?? color.brand.navy }}
      >
        {renderedLabel}
      </span>
    </div>
  );
}
