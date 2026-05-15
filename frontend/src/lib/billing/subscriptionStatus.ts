/** DB stores unpaid signups as `expired`; product copy uses "Inactive". */
export function formatSubscriptionStatusLabel(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "expired") {
    return "Inactive";
  }
  return normalized.replaceAll("_", " ");
}

export function formatOwnerConsoleStatusLabel(
  status: string,
  hasActiveReferralTrial: boolean,
): string {
  if (status === "expired" && !hasActiveReferralTrial) {
    return "Inactive";
  }
  if (hasActiveReferralTrial && status !== "active") {
    return "Trial";
  }
  return formatSubscriptionStatusLabel(status);
}
