import { publicClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

// ── Types ──────────────────────────────────────────────────────────────────

export type VerifiedResort = {
  id: number;
  name: string;
  slug: string | null;
  description: string | null;
  logoUrl: string | null;
  backgroundImageUrl: string | null;
  address: string | null;
  badgeLabel: string | null;
  isPremiumVerified: boolean;
  roomsCount: number;
  rooms: { name: string; basePrice: number; images: { id: number; url: string }[] }[];
  priceFrom: number | null;
  map: { address: string | null; embedUrl: string | null; searchUrl: string | null } | null;
  landingUrl: string | null;
  verificationStatus: string;
  isVip: boolean;
};

export type VerifyResortResult =
  | { verified: true; resort: VerifiedResort; message: null }
  | { verified: false; resort: { id: number; name: string } | null; message: string | null };

// ── API ────────────────────────────────────────────────────────────────────

export async function verifyResortLink(url: string): Promise<VerifyResortResult> {
  const { data } = await publicClient.post<ApiEnvelope<VerifyResortResult>>(
    "/public/verify-resort-link",
    { url },
  );
  return data.data;
}
