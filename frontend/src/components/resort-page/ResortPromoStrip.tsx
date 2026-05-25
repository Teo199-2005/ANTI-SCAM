"use client";

import { BrandWordmark } from "@/components/branding/BrandWordmark";
import type { ReactNode } from "react";

const promoItems: { key: string; content: ReactNode }[] = [
  {
    key: "brand-stays",
    content: (
      <span className="inline-flex items-center gap-1.5">
        <BrandWordmark tone="onDark" size="2xs" className="inline" />
        <span className="opacity-95">Verified Stays</span>
      </span>
    ),
  },
  { key: "opc", content: "Powered by: The Rising 2 Brothers OPC" },
  { key: "domain", content: "anti-scamph.com" },
  { key: "fee", content: "Secure Platform Fee Protection" },
  { key: "trusted", content: "Trusted Resort Booking Platform" },
];

function PromoRow() {
  return (
    <div className="promo-strip-track">
      {promoItems.map((item, idx) => (
        <div key={`${item.key}-${idx}`} className="promo-strip-chip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/branding/mainlogo.png"
            alt=""
            className="h-[18px] w-[18px] rounded-full border border-black/10 bg-white object-cover p-[1px]"
            loading="lazy"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/branding/rising2brothers.png"
            alt=""
            className="h-[18px] w-[18px] rounded-sm border border-black/10 bg-white object-contain p-[1px]"
            loading="lazy"
          />
          <span>{item.content}</span>
        </div>
      ))}
    </div>
  );
}

export default function ResortPromoStrip() {
  return (
    <section className="promo-strip-shell" aria-label="Promotional branding strip">
      <div className="promo-strip-mask">
        <PromoRow />
        <PromoRow />
      </div>
    </section>
  );
}
