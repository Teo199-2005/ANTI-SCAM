export const cn = (...classes: Array<string | undefined | false | null>) =>
  classes.filter(Boolean).join(" ");

/**
 * Converts a snake_case role string (e.g. "admin_staff") into a human-readable label.
 * Treats "user" as an alias for "Client" to match business domain language.
 */
export function formatRoleLabel(role?: string): string {
  if (!role || role === "user") return "Client";
  return role
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

/** Format a monetary value in USD. */
export function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

/** Format an ISO date string for display. */
export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", ...opts }).format(new Date(iso));
}
