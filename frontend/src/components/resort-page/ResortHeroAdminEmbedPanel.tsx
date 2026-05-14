"use client";

import { useMemo } from "react";
import type { PublicAdminLandingEmbed } from "@/lib/api/landingPage";

const WORDMARK_NAVY = "#0B1F3A";

type Props = {
  embed: PublicAdminLandingEmbed;
};

/**
 * Inline hero panel — platform intro video with Anti-Scam PH framing (replaces full-screen blocking modal).
 */
export function ResortHeroAdminEmbedPanel({ embed }: Props) {
  const videoId = embed.youtubeVideoId;
  const iframeSrc = useMemo(() => {
    if (!videoId) return null;
    const q = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      playsinline: "1",
      rel: "0",
      modestbranding: "1",
      controls: "1",
    });
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${q.toString()}`;
  }, [videoId]);

  if (!iframeSrc) return null;

  return (
    <div className="flex h-full min-h-[15rem] flex-1 flex-col bg-zinc-950 lg:min-h-0">
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[10px] font-black text-white shadow-inner sm:h-8 sm:w-8 sm:text-xs"
            style={{ background: `linear-gradient(135deg, ${WORDMARK_NAVY} 0%, #132b52 100%)` }}
            aria-hidden
          >
            AS
          </span>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold text-white sm:text-xs">Anti-Scam PH</p>
            <p className="truncate text-[9px] text-zinc-400 sm:text-[10px]">Official platform notice</p>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-[12rem] w-full flex-1 flex-col bg-black lg:min-h-0">
        <div className="relative aspect-video w-full shrink-0 bg-black lg:aspect-auto lg:min-h-[13rem] lg:flex-1">
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-[0.06]"
          aria-hidden
          style={{
            backgroundImage: `repeating-linear-gradient(-24deg, transparent 0 56px, rgba(255,255,255,0.55) 56px 57px),
              repeating-linear-gradient(12deg, transparent 0 100px, rgba(255,255,255,0.35) 100px 101px)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] flex flex-wrap items-center justify-center gap-6 overflow-hidden opacity-[0.06] select-none"
          aria-hidden
        >
          {Array.from({ length: 12 }).map((_, i) => (
            <span
              key={i}
              className="-rotate-[16deg] whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.38em] text-white sm:text-[10px]"
            >
              Anti-Scam PH
            </span>
          ))}
        </div>
        <iframe
          title="Anti-Scam PH — platform introduction"
          src={iframeSrc}
          className="absolute inset-0 z-[2] h-full w-full rounded-none"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
        </div>
      </div>
    </div>
  );
}
