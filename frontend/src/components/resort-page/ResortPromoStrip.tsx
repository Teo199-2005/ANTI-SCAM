"use client";

const promoItems = [
  "Anti-Scam PH Verified Stays",
  "Powered by: The Rising 2 Brothers OPC",
  "anti-scamph.com",
  "Secure Platform Fee Protection",
  "Trusted Resort Booking Platform",
];

function PromoRow() {
  return (
    <div className="promo-strip-track">
      {promoItems.map((item, idx) => (
        <div key={`${item}-${idx}`} className="promo-strip-chip">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mainlogo.png"
            alt="Anti-Scam PH"
            className="h-[18px] w-[18px] rounded-full border border-black/10 bg-white object-cover p-[1px]"
            loading="lazy"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/rising2brothers.png"
            alt="The Rising 2 Brothers OPC"
            className="h-[18px] w-[18px] rounded-sm border border-black/10 bg-white object-contain p-[1px]"
            loading="lazy"
          />
          <span>{item}</span>
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
