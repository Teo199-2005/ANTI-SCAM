"use client";

type UploadProgressBarProps = {
  percent: number;
  label: string;
  sublabel?: string;
};

export default function UploadProgressBar({ percent, label, sublabel }: UploadProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));

  return (
    <div className="w-full space-y-2" role="status" aria-live="polite">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-zinc-700">{label}</span>
        <span className="tabular-nums text-zinc-500">{clamped}%</span>
      </div>
      <div
        className="h-2.5 overflow-hidden rounded-full bg-zinc-200"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-skyBlue transition-[width] duration-150 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      {sublabel ? <p className="text-xs text-zinc-500">{sublabel}</p> : null}
    </div>
  );
}
