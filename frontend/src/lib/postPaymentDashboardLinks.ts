import type { UserRole } from "@/lib/api/types";

export type PostPaymentFlow = "success" | "failed";

export type PostPaymentReturnParams = {
  reservationId: string | number;
  ref?: string | null;
};

/**
 * Dashboard URL after Xendit booking invoice (guest/client only). Must match backend `XenditInvoiceService::bookingInvoiceReturnUrls`.
 * Returns `null` for other roles — use `/payment/success` or `/payment/failed` with legacy query instead.
 */
export function postPaymentDashboardReturnHref(
  role: UserRole | undefined,
  flow: PostPaymentFlow,
  params: PostPaymentReturnParams,
): string | null {
  if (role !== "guest" && role !== "client") {
    return null;
  }
  const base = role === "guest" ? "/dashboard/guest/history" : "/dashboard/client/bookings";
  const sp = new URLSearchParams();
  sp.set("from", flow === "success" ? "payment" : "payment_failed");
  sp.set("reservation_id", String(params.reservationId));
  const ref = params.ref?.trim();
  if (ref) sp.set("ref", ref);
  return `${base}?${sp.toString()}`;
}

/**
 * After Xendit redirect, send the signed-in user to the dashboard list that matches their role.
 * Admins / owners / staff land on their operational consoles; guests use travel history; clients use bookings.
 */
export function postPaymentBookingsHref(
  role: UserRole | undefined,
  authLoading: boolean,
  flow: PostPaymentFlow,
): string {
  if (authLoading) return "/dashboard";

  const guestQuery = flow === "success" ? "?from=payment" : "?from=payment_failed";

  switch (role) {
    case "guest":
      return `/dashboard/guest/history${guestQuery}`;
    case "admin":
      return "/dashboard/admin/reservations";
    case "admin_staff":
      return "/dashboard/staff/reservations";
    case "resort_owner":
      return "/dashboard/resort/reservations";
    case "marketing":
      return "/dashboard/marketing";
    default:
      return "/dashboard/client/bookings";
  }
}

export function postPaymentBookingsLabel(role: UserRole | undefined, authLoading: boolean): string {
  if (authLoading) return "My dashboard";
  switch (role) {
    case "guest":
      return "Travel history";
    case "admin":
      return "All reservations (admin)";
    case "admin_staff":
      return "Reservations (staff)";
    case "resort_owner":
      return "Resort reservations";
    case "marketing":
      return "Marketing dashboard";
    default:
      return "My bookings";
  }
}

/**
 * Second CTA after payment (or alongside confirmation): prefer the resort’s public landing when the slug is known;
 * otherwise send signed-in users to the dashboard; anonymous users to the resort directory (not the marketing home).
 */
export function postPaymentResortLandingOrDashboardHref(
  resortSlug: string | null | undefined,
  role: UserRole | undefined,
  authLoading: boolean,
): string {
  const slug = resortSlug?.trim() || null;
  if (slug) return `/resort/${encodeURIComponent(slug)}`;
  if (authLoading) return "/dashboard";
  if (role) return "/dashboard";
  return "/resorts";
}

export function postPaymentResortLandingOrDashboardLabel(
  resortSlug: string | null | undefined,
  role: UserRole | undefined,
  authLoading: boolean,
): string {
  const slug = resortSlug?.trim() || null;
  if (slug) return "Back to resort";
  if (authLoading) return "Dashboard";
  if (role) return "Dashboard";
  return "Browse resorts";
}
