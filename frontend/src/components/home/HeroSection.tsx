import heroCover from "../../../public/coverphoto.png";
import Image from "next/image";

/**
 * Landing hero: full-width `coverphoto.png`. Static import keeps width/height in sync with the file (correct aspect ratio).
 * Mobile: taller minimum viewport + `object-contain` so the whole banner graphic stays visible (no harsh crop).
 * md+: `object-cover` fills the 3∶2 frame like a hero strip.
 */
export default function HeroSection() {
  const { width, height } = heroCover;

  return (
    <section
      className="relative isolate w-full overflow-hidden bg-clSand max-md:min-h-[min(72svh,36rem)] md:min-h-0"
      style={{ aspectRatio: `${width} / ${height}` }}
      aria-label="Anti-Scam PH resort booking safety campaign"
    >
      <Image
        src={heroCover}
        alt="Anti-Scam PH — automate, protect, and grow your resort. Verified bookings and all-in-one platform for Philippine resorts."
        fill
        priority
        quality={100}
        sizes="100vw"
        className="object-contain object-[center_12%] md:object-cover md:object-center"
      />
    </section>
  );
}
