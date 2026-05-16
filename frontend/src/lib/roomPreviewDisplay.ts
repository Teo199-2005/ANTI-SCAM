import {
  BedDouble,
  Car,
  Coffee,
  ShieldCheck,
  ShowerHead,
  Snowflake,
  Star,
  Tv,
  Waves,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { displayInclusionLabel, isCustomInclusionToken } from "@/lib/roomInclusions";

export function extractRoomMeta(amenities: string[]) {
  const bedCountRaw = amenities.find((a) => a.startsWith("BED_COUNT:"))?.split(":")[1] ?? null;
  const bedTypeRaw = amenities.find((a) => a.startsWith("BED_TYPE:"))?.split(":")[1] ?? null;
  const bedCount = bedCountRaw ? Number(bedCountRaw) : null;
  const bedType = bedTypeRaw ?? null;
  const visibleAmenities = amenities.filter(
    (a) => !a.startsWith("BED_COUNT:") && !a.startsWith("BED_TYPE:"),
  );
  return { bedCount, bedType, visibleAmenities };
}

export function amenityMeta(label: string): { icon: LucideIcon } {
  if (isCustomInclusionToken(label)) return { icon: Star };
  const display = displayInclusionLabel(label);
  const normalized = display.toLowerCase();
  if (normalized.includes("wifi")) return { icon: Wifi };
  if (normalized.includes("shower")) return { icon: ShowerHead };
  if (normalized.includes("air")) return { icon: Snowflake };
  if (normalized.includes("tv") || normalized.includes("netflix")) return { icon: Tv };
  if (normalized.includes("pool") || normalized.includes("jacuzzi")) return { icon: Waves };
  if (normalized.includes("breakfast") || normalized.includes("drink")) return { icon: Coffee };
  if (normalized.includes("parking")) return { icon: Car };
  return { icon: ShieldCheck };
}

export { formatPhp, formatPhpPerNight } from "@/lib/formatPhp";
