import { RESERVATION_FEE_REFERENCE_TOTAL } from "@/lib/reservationFeeBreakdown";

/** Room subtotal stored as reservation.total_amount; fee is added on top for guest-facing totals. */
export function getTripPricing(roomSubtotalPhp: number, reservationFeePhp = RESERVATION_FEE_REFERENCE_TOTAL) {
  const room = Math.max(0, roomSubtotalPhp);
  const fee = Math.max(0, reservationFeePhp);
  return {
    roomSubtotal: room,
    reservationFee: fee,
    tripTotal: room + fee,
    payOnline: fee,
    balanceAtResort: room,
  };
}
