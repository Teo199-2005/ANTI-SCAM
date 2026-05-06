import { checkAvailability, createBookingLock, createReservation } from "@/lib/api/client";

export async function verifyRoomAvailability(roomId: number, checkIn: string, checkOut: string) {
  return checkAvailability(roomId, checkIn, checkOut);
}

// Token params removed — auth is handled transparently by the BFF proxy via httpOnly cookie.
export async function lockRoom(payload: Record<string, unknown>) {
  return createBookingLock(payload);
}

export async function submitReservation(payload: Record<string, unknown>) {
  return createReservation(payload);
}
