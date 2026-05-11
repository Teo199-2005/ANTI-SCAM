/**
 * Illustrative split of the guest reservation fee (VAT, processing, platform share).
 * Reference amounts are for a ₱500.00 fee; other totals scale proportionally.
 */
export const RESERVATION_FEE_REFERENCE_TOTAL = 500;
const REF_VAT = 53.57;
const REF_PROCESSING = 15;

export const RESERVATION_FEE_COPY = {
  collectedOnline: "The Reservation Fee is collected online to secure the booking.",
  balanceAtResort: "Remaining resort charges shall be paid directly to the resort upon check-in.",
  vatInclusiveTag: "VAT inclusive",
  breakdownSummary:
    "The Reservation Fee secures your booking and includes applicable taxes and payment processing charges. Remaining resort charges shall be paid directly to the resort upon check-in.",
} as const;

export function roundPhp(n: number): number {
  return Math.round(n * 100) / 100;
}

export type ReservationFeeComponentAmounts = {
  total: number;
  vatIncluded: number;
  paymentProcessing: number;
  platformService: number;
};

/** Component lines that sum to `total` (within rounding). */
export function getReservationFeeComponents(total: number): ReservationFeeComponentAmounts {
  if (!Number.isFinite(total) || total <= 0) {
    return { total: 0, vatIncluded: 0, paymentProcessing: 0, platformService: 0 };
  }
  const scale = total / RESERVATION_FEE_REFERENCE_TOTAL;
  const vatIncluded = roundPhp(REF_VAT * scale);
  const paymentProcessing = roundPhp(REF_PROCESSING * scale);
  const platformService = roundPhp(total - vatIncluded - paymentProcessing);
  return { total: roundPhp(total), vatIncluded, paymentProcessing, platformService };
}

export function formatPhp(amount: number): string {
  return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
