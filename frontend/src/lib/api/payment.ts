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

/** Release dates when the guest leaves Xendit without paying (does not cancel a confirmed stay). */
export async function releaseCheckoutHold(reservationId: number | string): Promise<ReservationDetail> {
  const { data } = await apiClient.post<ApiEnvelope<ReservationDetail>>(
    `/reservations/${reservationId}/release-checkout-hold`,
  );
  return data.data;
}

const PENDING_CHECKOUT_STORAGE_KEY = "antiScamPendingCheckoutReservationId";

export function rememberPendingCheckoutReservation(reservationId: number): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_CHECKOUT_STORAGE_KEY, String(reservationId));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearPendingCheckoutReservation(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PENDING_CHECKOUT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** If the user returned from Xendit without paying, free the hold on the server. */
export async function releasePendingCheckoutIfAny(): Promise<void> {
  if (typeof window === "undefined") return;
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PENDING_CHECKOUT_STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  const id = Number(raw);
  if (!Number.isFinite(id)) {
    clearPendingCheckoutReservation();
    return;
  }
  try {
    await releaseCheckoutHold(id);
  } catch {
    /* hold may already be expired server-side */
  } finally {
    clearPendingCheckoutReservation();
  }
}

export async function cancelReservation(id: number | string, reason?: string) {
  const { data } = await apiClient.post<ApiEnvelope<ReservationDetail>>(
    `/reservations/${id}/cancel`,
    { reason }
  );
  return data.data;
}
