/**
 * Mirrors backend `PRICING_PILOT_MODE` / `PRICING_PILOT_AMOUNT` for subscribe UI and marketing pricing.
 * Set NEXT_PUBLIC_PRICING_PILOT_MODE=true and NEXT_PUBLIC_PRICING_PILOT_AMOUNT=1 when running live Xendit smoke tests.
 */

export function pricingPilotEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_PRICING_PILOT_MODE;
  return v === "1" || v === "true" || v === "yes";
}

export function pricingPilotUnitPhp(): number {
  const n = Number(process.env.NEXT_PUBLIC_PRICING_PILOT_AMOUNT ?? "1");
  return Number.isFinite(n) && n >= 0.01 ? Math.round(n * 100) / 100 : 1;
}

/** Fallback when room payload omits `reservationFee` (must match backend pilot / default reservation fee). */
export function defaultReservationFeeFallbackPhp(): number {
  return pricingPilotEnabled() ? pricingPilotUnitPhp() : 500;
}

/** Fallback when subscription payload omits `extra_room_fee`. */
export function defaultExtraRoomFeeFallbackPhp(): number {
  return pricingPilotEnabled() ? pricingPilotUnitPhp() : 300;
}
