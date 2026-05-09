/**
 * Marketing imagery paths / URLs.
 *
 * Landing hero: full-bleed PNG `coverphoto.png` — **1536 × 1024 px** (3∶2).
 * Hero section uses this exact aspect ratio (no overlay UI; artwork includes all messaging).
 */
export const HERO_BANNER_INTRINSIC = { width: 1536, height: 1024, aspect: 1536 / 1024 } as const;

/** Visionaries — Charles Andrew Santiago (`CEO.png`), intrinsic **1254 × 1254** px (1∶1). */
export const VISIONARY_CEO_INTRINSIC = { width: 1254, height: 1254 } as const;

/** Visionaries — Teofilo Harry Paet (`CTO.png`), intrinsic **527 × 586** px (~0.90∶1). */
export const VISIONARY_CTO_INTRINSIC = { width: 527, height: 586 } as const;

/** Visionaries — CMO (`CMO.png`), intrinsic **1188 × 1324** px (~0.90∶1). */
export const VISIONARY_CMO_INTRINSIC = { width: 1188, height: 1324 } as const;

/** Visionaries — COO (`COO.png`), intrinsic **819 × 819** px (1∶1). */
export const VISIONARY_COO_INTRINSIC = { width: 819, height: 819 } as const;

export const images = {
  /** Anti-SCAM PH homepage hero — full graphic (text and CTAs baked in) */
  hero: "/coverphoto.png",
  spa: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874",
  dining: "https://images.unsplash.com/photo-1559339352-11d035aa65de",
  pool: "https://images.unsplash.com/photo-1571896349842-33c89424de2d",
  /** Local asset — see `VISIONARY_CEO_INTRINSIC` */
  ceo: "/CEO.png",
  /** Local asset — see `VISIONARY_CTO_INTRINSIC` */
  developer: "/CTO.png",
  /** Local asset — see `VISIONARY_CMO_INTRINSIC` */
  cmo: "/CMO.png",
  /** Local asset — see `VISIONARY_COO_INTRINSIC` */
  coo: "/COO.png",
  property1: "https://images.unsplash.com/photo-1505691938895-1758d7feb511",
  property2: "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a",
  property3: "https://images.unsplash.com/photo-1501117716987-c8e1ecb2101d",
};
