/**
 * Client-side keystroke sanitizers — align typing with field intent.
 * Server-side validation remains authoritative.
 */

export const INPUT_MAX = {
  personName: 120,
  businessName: 160,
  email: 254,
  phonePh: 11,
  phoneIntl: 16,
  tinDigits: 12,
  address: 500,
  description: 8000,
  referralCode: 32,
  roomCode: 24,
  roomName: 120,
  govIdNumber: 64,
  gcashHolder: 120,
  bankAccountHolder: 120,
  bankAccountNumber: 34,
  bankBranch: 120,
  subdomain: 63,
  numericId: 12,
  otp: 6,
} as const;

const CTRL = /[\u0000-\u001F\u007F]/g;

/** Legal / display names: letters (any script), spaces, apostrophe, hyphen, period */
export function sanitizePersonName(raw: string, maxLen: number = INPUT_MAX.personName): string {
  return raw
    .normalize("NFC")
    .replace(CTRL, "")
    .replace(/[^\p{L}\s'\-.]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maxLen);
}

/** Resort / business / listing titles — allow digits and common punctuation */
export function sanitizeBusinessOrResortName(raw: string, maxLen: number = INPUT_MAX.businessName): string {
  return raw
    .normalize("NFC")
    .replace(CTRL, "")
    .replace(/[^\p{L}\p{N}\s'&.,\-]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maxLen);
}

/** Room display names (e.g. "Deluxe 101") */
export function sanitizeRoomNameInput(raw: string, maxLen: number = INPUT_MAX.roomName): string {
  return raw
    .normalize("NFC")
    .replace(CTRL, "")
    .replace(/[^\p{L}\p{N}\s'&.,\-·]/gu, "")
    .slice(0, maxLen);
}

export function sanitizeEmailTyping(raw: string, maxLen: number = INPUT_MAX.email): string {
  return raw.replace(CTRL, "").replace(/\s/g, "").slice(0, maxLen);
}

/** PH-focused mobile: digits only, max length (e.g. 11 for 09xxxxxxxxx) */
export function sanitizePhilippinesMobileInput(raw: string, maxLen: number = INPUT_MAX.phonePh): string {
  return raw.replace(/\D/g, "").slice(0, maxLen);
}

/** Optional leading + then digits (international paste-friendly) */
export function sanitizePhoneInput(raw: string, maxLen: number = INPUT_MAX.phoneIntl): string {
  const t = raw.replace(CTRL, "").trim();
  if (t.startsWith("+")) {
    return "+" + t.slice(1).replace(/\D/g, "").slice(0, maxLen);
  }
  return t.replace(/\D/g, "").slice(0, maxLen);
}

export function sanitizeTinTyping(raw: string, maxLen: number = INPUT_MAX.tinDigits): string {
  return raw.replace(/\D/g, "").slice(0, maxLen);
}

/** Street / mailing lines — letters, numbers, common address symbols */
export function sanitizeAddressLine(raw: string, maxLen: number = INPUT_MAX.address): string {
  return raw.replace(CTRL, "").replace(/[^\p{L}\p{N}\s#.,\-/()&]/gu, "").slice(0, maxLen);
}

/** Long text (descriptions, policies) — strip control chars only */
export function sanitizeLongText(raw: string, maxLen: number = INPUT_MAX.description): string {
  return raw.replace(CTRL, "").slice(0, maxLen);
}

/** Comma-separated amenity tags typed in one field */
export function sanitizeAmenityListTyping(raw: string, maxLen: number = 2000): string {
  return raw.replace(CTRL, "").replace(/[^\p{L}\p{N}\s,\-']/gu, "").slice(0, maxLen);
}

export function sanitizeReferralCodeInput(raw: string, maxLen: number = INPUT_MAX.referralCode): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, maxLen);
}

export function sanitizeRoomCodeInput(raw: string, maxLen: number = INPUT_MAX.roomCode): string {
  return raw.toUpperCase().replace(/[^A-Z0-9\-]/g, "").slice(0, maxLen);
}

export function sanitizeSubdomainInput(raw: string, maxLen: number = INPUT_MAX.subdomain): string {
  return raw.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, maxLen);
}

export function sanitizeGovIdNumberInput(raw: string, maxLen: number = INPUT_MAX.govIdNumber): string {
  return raw.toUpperCase().replace(/[^A-Z0-9\-]/g, "").slice(0, maxLen);
}

export function sanitizeNumericIdInput(raw: string, maxLen: number = INPUT_MAX.numericId): string {
  return raw.replace(/\D/g, "").slice(0, maxLen);
}

export function sanitizeOtpInput(raw: string, maxLen: number = INPUT_MAX.otp): string {
  return raw.replace(/\D/g, "").slice(0, maxLen);
}

/** Free-text search / filter box — no control chars, reasonable length */
export function sanitizeSearchQuery(raw: string, maxLen: number = 120): string {
  return raw.replace(CTRL, "").slice(0, maxLen);
}

/** Whole non-negative integers only (e.g. max uses, counts) */
export function sanitizeIntegerDigitsOnly(raw: string, maxLen: number = 9): string {
  return raw.replace(/\D/g, "").slice(0, maxLen);
}

/**
 * Non-negative decimal for typed money fields (single `.`, limited fraction).
 * Empty allowed while typing.
 */
export function sanitizeUnsignedDecimal(raw: string, maxIntDigits = 9, maxFrac = 2): string {
  let s = raw.replace(CTRL, "").replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot === -1) return s.replace(/\D/g, "").slice(0, maxIntDigits);
  const intPart = s.slice(0, firstDot).replace(/\D/g, "").slice(0, maxIntDigits);
  const frac = s
    .slice(firstDot + 1)
    .replace(/\D/g, "")
    .slice(0, maxFrac);
  if (frac.length === 0 && s.endsWith(".")) return intPart === "" ? "" : `${intPart}.`;
  if (frac.length && intPart === "") return `0.${frac}`;
  return frac.length ? `${intPart}.${frac}` : intPart;
}

/** Bank account number: letters, digits, hyphens; spaces stripped on save. */
export function sanitizeBankAccountNumber(raw: string, maxLen: number = INPUT_MAX.bankAccountNumber): string {
  return raw
    .replace(CTRL, "")
    .replace(/\s/g, "")
    .replace(/[^\p{L}\p{N}\-]/gu, "")
    .slice(0, maxLen);
}
