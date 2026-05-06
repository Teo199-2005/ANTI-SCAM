/**
 * Marketing imagery paths / URLs.
 *
 * Landing hero: full-bleed PNG `coverphoto.png` — **1942 × 809 px** (~2.401∶1).
 * Hero section uses this exact aspect ratio (no overlay UI; artwork includes all messaging).
 */
export const HERO_BANNER_INTRINSIC = { width: 1942, height: 809, aspect: 1942 / 809 } as const;

export const images = {
  /** Anti-SCAM PH campaign hero — full graphic (text and CTAs baked in) */
  hero: "/coverphoto.png",
  spa: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874",
  dining: "https://images.unsplash.com/photo-1559339352-11d035aa65de",
  pool: "https://images.unsplash.com/photo-1571896349842-33c89424de2d",
  ceo: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg",
  developer: "https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg",
  property1: "https://images.unsplash.com/photo-1505691938895-1758d7feb511",
  property2: "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a",
  property3: "https://images.unsplash.com/photo-1501117716987-c8e1ecb2101d",
};
