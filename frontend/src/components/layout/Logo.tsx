import Image from "next/image";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-20 w-20"
};

export default function Logo({ size = "md", className }: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-white/60 bg-white/75 p-1.5 shadow-soft backdrop-blur-md backdrop-saturate-150",
        className
      )}
    >
      <Image
        src="/mainlogo.png"
        alt="Anti-Scam PH — anti booking scam of resorts"
        width={80}
        height={80}
        unoptimized
        className={cn("object-contain", sizeMap[size])}
        priority={size !== "sm"}
      />
    </span>
  );
}
