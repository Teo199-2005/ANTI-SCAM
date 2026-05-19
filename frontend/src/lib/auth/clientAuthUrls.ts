/** Build marketing auth URLs with optional return path (relative paths only). */

export function sanitizeReturnTo(raw: string | null | undefined): string | null {
  const v = raw?.trim() ?? "";
  if (!v.startsWith("/") || v.startsWith("//")) return null;
  return v;
}

export function buildLoginUrl(opts?: { returnTo?: string | null; intent?: "client" | "owner" }): string {
  const params = new URLSearchParams();
  if (opts?.intent === "client") params.set("intent", "client");
  const ret = sanitizeReturnTo(opts?.returnTo ?? null);
  if (ret) params.set("returnTo", ret);
  const q = params.toString();
  return q ? `/login?${q}` : "/login";
}

export function buildRegisterUrl(opts?: {
  intent?: "client" | "owner";
  returnTo?: string | null;
  resortSlug?: string | null;
  /** Marketer referral code — always paired with `intent=owner` when set. */
  ref?: string | null;
  referral?: string | null;
}): string {
  const params = new URLSearchParams();
  const ref = (opts?.ref ?? opts?.referral)?.trim() ?? "";
  if (ref) {
    params.set("intent", "owner");
    params.set("ref", ref);
  } else if (opts?.intent) {
    params.set("intent", opts.intent);
  }
  const ret = sanitizeReturnTo(opts?.returnTo ?? null);
  if (ret) params.set("returnTo", ret);
  if (opts?.resortSlug?.trim()) params.set("resort", opts.resortSlug.trim());
  const q = params.toString();
  return q ? `/register?${q}` : "/register";
}

/** Absolute owner signup URL for marketers to share (includes `intent=owner`). */
export function buildOwnerReferralRegisterUrl(origin: string, referralCode: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${buildRegisterUrl({ ref: referralCode })}`;
}

export function postAuthDashboardPath(role: string, returnTo?: string | null): string {
  const ret = sanitizeReturnTo(returnTo ?? null);
  if (ret) return ret;
  if (role === "client" || role === "user" || role === "guest") return "/dashboard/client";
  if (role === "resort_owner") return "/dashboard/resort";
  if (role === "admin") return "/dashboard/admin";
  if (role === "marketing") return "/dashboard/marketing";
  if (role === "admin_staff") return "/dashboard/staff";
  return "/dashboard";
}
