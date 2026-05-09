/** Matches backend XenditSubscriptionInvoiceService: extra_room_fee × (tier / 2300) per month of prepay. */
export type SlotPrepayDuration = 1 | 3 | 6 | 12;

const REFERENCE_BASE = 2300;
const STANDARD_TIER: Record<SlotPrepayDuration, number> = {
  1: 2300,
  3: 2000,
  6: 1900,
  12: 1800,
};

export function slotPrepayMonthlyRate(extraRoomFee: number, duration: SlotPrepayDuration): number {
  const tier = STANDARD_TIER[duration];
  return Math.round(extraRoomFee * (tier / REFERENCE_BASE) * 100) / 100;
}

export function slotPrepayTotal(extraRoomFee: number, duration: SlotPrepayDuration, quantity: number): number {
  const monthly = slotPrepayMonthlyRate(extraRoomFee, duration);
  return Math.round(monthly * quantity * duration * 100) / 100;
}

export const SLOT_PREPAY_LABELS: { duration: SlotPrepayDuration; billingType: string }[] = [
  { duration: 1, billingType: "Monthly" },
  { duration: 3, billingType: "Upfront" },
  { duration: 6, billingType: "Upfront" },
  { duration: 12, billingType: "Upfront" },
];
