import { publicAssets } from "@/lib/content/publicAssets";
import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Defaults to a short product name for accessibility. */
  alt?: string;
};

const sizeMap = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-20 w-20"
};

export default function Logo({ size = "md", className, alt = "Anti-Scam PH" }: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-white/60 bg-white/75 p-1.5 shadow-soft backdrop-blur-md backdrop-saturate-150",
        className
      )}
    >
      <Image
        src={publicAssets.branding.mainlogo}
        alt={alt}
        width={80}
        height={80}
        unoptimized
        className={cn("object-contain", sizeMap[size])}
        priority={size !== "sm"}
      />
    </span>
  );
}
