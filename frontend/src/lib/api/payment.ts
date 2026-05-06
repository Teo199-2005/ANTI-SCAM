import { apiClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

export type InvoiceResult = {
  invoice_url: string;
  invoice_id: string;
};

/** Create a Xendit invoice for a reservation. Returns the payment URL to redirect the user to. */
export async function createPaymentInvoice(reservationId: number): Promise<InvoiceResult> {
  const { data } = await apiClient.post<ApiEnvelope<InvoiceResult>>(
    `/reservations/${reservationId}/invoice`
  );
  return data.data;
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
