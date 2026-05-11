const KEY = "rs_pending_referral_signup";

export type PendingReferralFromSignup = {
  code: string;
  marketerName?: string;
};

export function setPendingReferralFromSignup(payload: PendingReferralFromSignup): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        code: payload.code.trim().toUpperCase(),
        marketerName: payload.marketerName?.trim() || undefined,
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function readPendingReferralSignup(): PendingReferralFromSignup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { code?: unknown; marketerName?: unknown };
    if (typeof p.code !== "string" || !p.code.trim()) return null;
    return {
      code: p.code.trim().toUpperCase(),
      marketerName: typeof p.marketerName === "string" ? p.marketerName.trim() : undefined,
    };
  } catch {
    return null;
  }
}

export function clearPendingReferralSignup(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
