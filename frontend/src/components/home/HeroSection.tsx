import heroCover from "../../../public/coverphoto.png";
import Image from "next/image";

/**
 * Landing hero: full-width `coverphoto.png`.
 * Uses intrinsic layout (`width`/`height` + `w-full h-auto`) instead of `fill` + aspect box
 * so the bitmap scales with layout width when the browser zoom level or viewport changes.
 */
export default function HeroSection() {
  const { width, height } = heroCover;

  return (
    <section
      className="relative isolate w-full min-w-0 max-w-none shrink-0 overflow-hidden bg-clSand"
      aria-label="Anti-Scam PH resort booking safety campaign"
    >
      <div className="box-border w-full max-w-none px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
        <Image
          src={heroCover}
          alt="Anti-Scam PH — automate, protect, and grow your resort. Verified bookings and all-in-one platform for Philippine resorts."
          width={width}
          height={height}
          priority
          quality={100}
          sizes="100vw"
          className="hero-cover-media block h-auto w-full max-w-none min-w-0 object-contain object-[center_12%] md:object-cover md:object-center"
        />
      </div>
    </section>
  );
}
