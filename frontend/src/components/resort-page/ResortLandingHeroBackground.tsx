"use client";

import { laravelPublicUrl } from "@/lib/publicAsset";
import { useState } from "react";

type Props = {
  storagePath: string | null;
};

/**
 * Full-bleed hero photo: fills the section edge-to-edge; scrims live in `ResortLandingHero`.
 */
export function ResortLandingHeroBackground({ storagePath }: Props) {
  const [failed, setFailed] = useState(false);

  if (!storagePath || failed) {
    return null;
  }

  return (
    <div className="absolute inset-0 bg-zinc-900">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={laravelPublicUrl(storagePath)}
        alt=""
        className="h-full w-full object-cover object-center"
        decoding="async"
        fetchPriority="high"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
