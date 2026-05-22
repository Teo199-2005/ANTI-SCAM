import { formatPhp } from "@/lib/formatPhp";

/** Policy bullets and summary lines using the marketer's effective per-booking rate. */
export function marketingCommissionPolicySections(ratePhp: number) {
  const rate = formatPhp(ratePhp);

  return {
    earnLine: `You earn ${rate} for each paid online guest booking at resorts linked to your referral.`,
    reversalLine: `If a paid booking is cancelled before your commission is paid out, the ${rate} credit is reversed while it is still pending.`,
    payoutLine:
      "Pending earnings are disbursed to your bank account on the platform schedule after withholding.",
    qualifyingRateLine: `${rate} credited per qualifying paid online guest booking at your assigned resorts.`,
  };
}
