import { HERO_BANNER_INTRINSIC, images } from "@/lib/content/images";
import Image from "next/image";

/**
 * Landing hero: single full-width image only. Intrinsics 1536×1024 (`coverphoto.png`) — section uses the same aspect ratio
 * so the bitmap is not stretched or letterboxed.
 */
export default function HeroSection() {
  const { width, height } = HERO_BANNER_INTRINSIC;

  return (
    <section
      className="relative w-full bg-clSand"
      style={{ aspectRatio: `${width} / ${height}` }}
      aria-label="Anti-Scam PH resort booking safety campaign"
    >
      <Image
        src={images.hero}
        alt="Anti-Scam PH — automate, protect, and grow your resort. Verified bookings and all-in-one platform for Philippine resorts."
        fill
        priority
        quality={100}
        sizes="100vw"
        className="object-cover object-center"
      />
    </section>
  );
}
