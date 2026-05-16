import { pricingPilotEnabled, pricingPilotUnitPhp } from "@/lib/pricingPilot";

/** Matches backend XenditSubscriptionInvoiceService: extra_room_fee × (tier / 2100) per month of prepay. */
export type SlotPrepayDuration = 1 | 3 | 6 | 12;

const REFERENCE_BASE = 2100;
const STANDARD_TIER: Record<SlotPrepayDuration, number> = {
  1: 2100,
  3: 1900,
  6: 1700,
  12: 1500,
};

export function slotPrepayMonthlyRate(extraRoomFee: number, duration: SlotPrepayDuration): number {
  if (pricingPilotEnabled()) {
    return pricingPilotUnitPhp();
  }
  const tier = STANDARD_TIER[duration];
  return Math.round(extraRoomFee * (tier / REFERENCE_BASE) * 100) / 100;
}

export function slotPrepayTotal(extraRoomFee: number, duration: SlotPrepayDuration, quantity: number): number {
  if (pricingPilotEnabled()) {
    return pricingPilotUnitPhp();
  }
  const monthly = slotPrepayMonthlyRate(extraRoomFee, duration);
  return Math.round(monthly * quantity * duration * 100) / 100;
}

export const SLOT_PREPAY_LABELS: { duration: SlotPrepayDuration; billingType: string }[] = [
  { duration: 1, billingType: "Monthly" },
  { duration: 3, billingType: "Upfront" },
  { duration: 6, billingType: "Upfront" },
  { duration: 12, billingType: "Upfront" },
];
