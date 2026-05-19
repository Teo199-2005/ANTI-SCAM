import { formatPhp, formatPhpPerNight } from "@/lib/formatPhp";
import { defaultReservationFeeFallbackPhp } from "@/lib/pricingPilot";

/** Reservation fee in PHP for guest-facing display (room payload or platform default). */
export function resolveGuestReservationFeePhp(roomReservationFee?: number | null): number {
  if (roomReservationFee != null) {
    const n = Number(roomReservationFee);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return defaultReservationFeeFallbackPhp();
}

/**
 * Nightly rate shown to guests in catalog, modals, and checkout summaries.
 * Owner dashboards continue to show `basePrice` only.
 */
export function guestDisplayNightlyRate(basePricePhp: unknown, reservationFeePhp?: number | null): number {
  const base = Math.max(0, Number(basePricePhp) || 0);
  return base + resolveGuestReservationFeePhp(reservationFeePhp);
}

export function guestDisplayPriceFrom(priceFromPhp: unknown, reservationFeePhp?: number | null): number {
  return guestDisplayNightlyRate(priceFromPhp, reservationFeePhp);
}

export function formatGuestDisplayPhp(basePricePhp: unknown, reservationFeePhp?: number | null): string {
  return formatPhp(guestDisplayNightlyRate(basePricePhp, reservationFeePhp));
}

export function formatGuestDisplayPerNight(basePricePhp: unknown, reservationFeePhp?: number | null): string {
  return formatPhpPerNight(guestDisplayNightlyRate(basePricePhp, reservationFeePhp));
}

/** Room balance due at the resort (base × nights; reservation fee paid online separately). */
export function guestBalanceAtResortPhp(basePricePhp: unknown, nights: number): number {
  const nightsN = Math.max(0, Math.floor(Number(nights) || 0));
  const base = Math.max(0, Number(basePricePhp) || 0);
  return base * nightsN;
}
