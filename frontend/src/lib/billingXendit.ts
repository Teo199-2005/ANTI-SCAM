/** Matches backend `XenditMode` — derived from XENDIT_SECRET_KEY prefix on /auth/me. */
export type BillingXenditMode = "live" | "test" | "unset";

export function isXenditTestMode(mode: BillingXenditMode | undefined): boolean {
  return mode === "test";
}

export function isXenditLiveMode(mode: BillingXenditMode | undefined): boolean {
  return mode === "live";
}
