/**
 * Gold verified badge — exclusive to Business Pro / Premium Verified resorts.
 * Standard verified resorts use {@link VerifiedBadge} with a shield icon instead.
 *
 * After replacing `frontend/public/branding/verified-source.png`, run: `node frontend/scripts/process-verified-badge.mjs`
 * Then bump BADGE_ASSET_VERSION so browsers fetch the new file (same URL is cached aggressively).
 */
import { publicAssets } from "@/lib/content/publicAssets";

export const BADGE_ASSET_VERSION = "3";

export const BUSINESS_PRO_VERIFIED_BADGE_SRC = `${publicAssets.branding.verified}?v=${BADGE_ASSET_VERSION}`;
