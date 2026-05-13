import { sanitizeLongText } from "@/lib/inputRestrictions";

/** Persisted prefix for owner-entered inclusion labels (not in the preset list). */
export const CUSTOM_INCLUSION_PREFIX = "CUSTOM_INCLUSION:" as const;

export const STANDARD_INCLUSION_OPTIONS = [
  "WiFi",
  "Hot Shower",
  "Air Conditioning",
  "TV",
  "Mini Fridge",
  "Breakfast Included",
  "Parking",
  "Pool Access",
  "Jacuzzi",
  "Balcony",
  "Toiletries",
  "Room Service",
] as const;

export type StandardInclusionOption = (typeof STANDARD_INCLUSION_OPTIONS)[number];

export function isCustomInclusionToken(token: string): boolean {
  return token.startsWith(CUSTOM_INCLUSION_PREFIX);
}

/** Human-readable label for chips (strips internal prefix). */
export function displayInclusionLabel(token: string): string {
  if (isCustomInclusionToken(token)) {
    const inner = token.slice(CUSTOM_INCLUSION_PREFIX.length).trim();
    return inner || "Custom";
  }
  return token;
}

export function encodeCustomInclusion(userLabel: string): string | null {
  const t = sanitizeCustomInclusionLine(userLabel);
  return t === "" ? null : `${CUSTOM_INCLUSION_PREFIX}${t}`;
}

export function sanitizeCustomInclusionLine(raw: string, maxLen = 80): string {
  return sanitizeLongText(raw.trim(), maxLen).trim();
}

/** One inclusion per line in the textarea. */
export function splitCustomInclusionInput(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export type ParsedStoredAmenities = {
  bedCount: number;
  bedType: string;
  inclusions: string[];
  customInclusionsText: string;
  customInclusionsEnabled: boolean;
  others: string[];
};

export function parseStoredAmenities(amenities: string[]): ParsedStoredAmenities {
  let bedCount = 1;
  let bedType = "Double";
  const inclusions: string[] = [];
  const customLabels: string[] = [];
  const others: string[] = [];

  for (const item of amenities) {
    if (item.startsWith("BED_COUNT:")) {
      const parsed = Number(item.replace("BED_COUNT:", "").trim());
      if (Number.isFinite(parsed) && parsed > 0) bedCount = parsed;
      continue;
    }
    if (item.startsWith("BED_TYPE:")) {
      const parsed = item.replace("BED_TYPE:", "").trim();
      if (parsed) bedType = parsed;
      continue;
    }
    if (isCustomInclusionToken(item)) {
      const inner = item.slice(CUSTOM_INCLUSION_PREFIX.length).trim();
      if (inner) customLabels.push(inner);
      continue;
    }
    if ((STANDARD_INCLUSION_OPTIONS as readonly string[]).includes(item)) {
      inclusions.push(item);
    } else {
      others.push(item);
    }
  }

  return {
    bedCount,
    bedType,
    inclusions,
    customInclusionsText: customLabels.join("\n"),
    customInclusionsEnabled: customLabels.length > 0,
    others,
  };
}

export type RoomAmenitiesPackInput = {
  bed_count: number;
  bed_type: string;
  inclusions: string[];
  custom_inclusions_enabled: boolean;
  custom_inclusions_text: string;
  amenities: string[];
};

/** Serialized room.amenities array for API (includes meta keys and inclusion tokens). */
export function buildStoredAmenitiesArray(v: RoomAmenitiesPackInput): string[] {
  const preset = Array.from(new Set(v.inclusions));
  const custom =
    v.custom_inclusions_enabled
      ? splitCustomInclusionInput(v.custom_inclusions_text)
          .map((line) => encodeCustomInclusion(line))
          .filter((t): t is string => Boolean(t))
      : [];
  const extra = Array.from(new Set(v.amenities.filter(Boolean)));
  return [`BED_COUNT:${v.bed_count}`, `BED_TYPE:${v.bed_type}`, ...preset, ...custom, ...extra];
}
