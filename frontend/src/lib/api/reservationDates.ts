/** Normalize reservation date fields from API (snake_case or camelCase). */
export function reservationCheckIn(row: Record<string, unknown>): string {
  return String(row.check_in_date ?? row.checkInDate ?? "").slice(0, 10);
}

export function reservationCheckOut(row: Record<string, unknown>): string {
  return String(row.check_out_date ?? row.checkOutDate ?? "").slice(0, 10);
}

/** Hotel stay: guest occupies night of `day` when check-in ≤ day < check-out. */
export function reservationCoversNight(checkIn: string, checkOut: string, dayKey: string): boolean {
  const inIso = checkIn.slice(0, 10);
  const outIso = checkOut.slice(0, 10);
  if (!inIso || !outIso) return false;
  return inIso <= dayKey && dayKey < outIso;
}

/** Owner calendar display: highlight check-in through check-out (inclusive). */
export function reservationCoversCalendarDay(checkIn: string, checkOut: string, dayKey: string): boolean {
  const inIso = checkIn.slice(0, 10);
  const outIso = checkOut.slice(0, 10);
  if (!inIso || !outIso) return false;
  return inIso <= dayKey && dayKey <= outIso;
}
