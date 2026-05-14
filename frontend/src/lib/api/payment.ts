import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

export type InvoiceResult = {
  invoice_url: string | null;
  invoice_id: string;
  already_confirmed?: boolean;
  resumed?: boolean;
};

/**
 * Browser origin for Xendit return URLs (same host as auth cookies).
 * Use from client components before `createPaymentInvoice` / redirect to checkout.
 */
export function paymentCheckoutReturnBase(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.location.origin;
}

/** Create a Xendit invoice for a reservation. Returns the payment URL to redirect the user to. */
export async function createPaymentInvoice(
  reservationId: number,
  options?: { checkoutReturnBase?: string | null },
): Promise<InvoiceResult> {
  const payload: Record<string, unknown> = {};
  const base = options?.checkoutReturnBase?.trim();
  if (base) {
    payload.checkout_return_base = base;
  }
  const { data } = await apiClient.post<ApiEnvelope<InvoiceResult>>(
    `/reservations/${reservationId}/invoice`,
    payload,
  );
  const inner = data?.data;
  if (!inner || typeof inner !== "object") {
    throw new Error("Payment service returned an empty response. Please try again.");
  }
  return inner;
}

export type ReservationDetail = {
  id: number;
  referenceNo: string;
  resortId: number;
  roomId: number;
  clientId: number;
  checkInDate: string;
  checkOutDate: string;
  guestCount: number;
  reservationFee: number;
  totalAmount: number;
  status: string;
  xenditPaymentStatus: string;
  xenditInvoiceId: string | null;
  reservedAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
  refundStatus: string | null;
  // optional full objects returned by some endpoints
  resort?: {
    id: number;
    name: string;
    address?: string;
  };
  room?: {
    id: number;
    name: string;
  };
};

export async function getReservation(id: number | string): Promise<ReservationDetail> {
  const { data } = await apiClient.get<ApiEnvelope<ReservationDetail>>(`/reservations/${id}`);
  return data.data;
}

export async function cancelReservation(id: number | string, reason?: string) {
  const { data } = await apiClient.post<ApiEnvelope<ReservationDetail>>(
    `/reservations/${id}/cancel`,
    { reason }
  );
  return data.data;
}
