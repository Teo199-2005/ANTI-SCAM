"use client";

import Image from "next/image";
import Link from "next/link";

type PoweredByMarkProps = {
  compact?: boolean;
  className?: string;
  version?: string;
  tone?: "light" | "dark";
  /** When false, omits the operator logo image (wording can still appear). */
  showOperatorLogo?: boolean;
};

export default function PoweredByMark({
  compact = false,
  className = "",
  version,
  tone = "light",
  showOperatorLogo = true,
}: PoweredByMarkProps) {
  const baseText = tone === "light" ? "text-white/55" : "text-zinc-500";
  const linkText = tone === "light" ? "text-white/75 hover:text-white" : "text-zinc-700 hover:text-zinc-900";
  const badgeTone =
    tone === "light"
      ? "border-white/20 text-white/45"
      : "border-zinc-300 text-zinc-500";

  return (
    <div
      className={`inline-flex max-w-xl flex-wrap items-center gap-2 text-xs leading-snug ${baseText} ${className}`}
    >
      {showOperatorLogo ? (
        <Image
          src="/rising2brothers.png"
          alt="The Rising 2 Brothers OPC"
          width={compact ? 22 : 28}
          height={compact ? 22 : 28}
          unoptimized
          className="shrink-0 rounded-sm border border-black/5 bg-white object-contain p-0.5"
        />
      ) : null}
      <span className="max-w-prose">
        Anti-Scam PH is a product and service operated by{" "}
        <Link href="/" className={`font-semibold ${linkText}`}>
          The Rising 2 Brothers OPC
        </Link>
        .
      </span>
      {version ? (
        <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${badgeTone}`}>
          {version}
        </span>
      ) : null}
    </div>
  );
}
