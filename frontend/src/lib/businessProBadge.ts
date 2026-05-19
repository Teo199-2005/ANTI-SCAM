/**
 * Gold verified.png — exclusive to Business Pro / Premium Verified resorts.
 * Standard verified resorts use {@link VerifiedBadge} with a shield icon instead.
 *
 * After replacing `verified.png` at repo root, run: `node frontend/scripts/process-verified-badge.mjs`
 * Then bump BADGE_ASSET_VERSION so browsers fetch the new file (same URL is cached aggressively).
 */
export const BADGE_ASSET_VERSION = "3";

export const BUSINESS_PRO_VERIFIED_BADGE_SRC = `/verified.png?v=${BADGE_ASSET_VERSION}`;
