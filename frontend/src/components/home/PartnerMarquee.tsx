"use client";

import { motion, useReducedMotion } from "framer-motion";

const partners = ["Aurelia Travel", "SeaGlass Airways", "Azure Pay", "Terra Dining", "Vista Escapes"];

export default function PartnerMarquee({ dark = false }: { dark?: boolean }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      className={`overflow-hidden border-y py-4 backdrop-blur-xl backdrop-saturate-150 ${
        dark ? "border-white/20 bg-navy/80" : "border-white/35 bg-white/40"
      }`}
    >
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={prefersReducedMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={prefersReducedMotion ? undefined : { repeat: Infinity, duration: 12, ease: "linear" }}
      >
        {[...partners, ...partners].map((partner, index) => (
          <span key={`${partner}-${index}`} className={`text-sm font-semibold transition ${dark ? "text-zinc-200 hover:text-white" : "text-zinc-500 hover:text-zinc-900"}`}>
            {partner}
          </span>
        ))}
      </motion.div>
    </section>
  );
}
