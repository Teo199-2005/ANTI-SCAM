/**
 * Marketing partner profile — input sanitizers and client-side validation
 * aligned with backend AuthController::updateProfile and MarketingGovIdCatalog.
 */

import type { MarketingGovIdOption } from "@/lib/api/marketingGovId";
import { INPUT_MAX, sanitizeEmailTyping, sanitizePersonName, sanitizePhilippinesMobileInput, sanitizeTinTyping } from "@/lib/inputRestrictions";
import type { PhilippineLocationValue } from "@/components/locations/PhilippineLocationPicker";

const PH_MOBILE_RE = /^09\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Barangay / locality name */
export function sanitizeBarangayName(raw: string, maxLen = 180): string {
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[^\p{L}\p{N}\s\-.,'#()]/gu, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, maxLen);
}

/** Display helper: 0917 123 4567 (digits only in state). */
export function formatPhilippinesMobileDisplay(digits: string): string {
  const d = sanitizePhilippinesMobileInput(digits);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

/** Format TIN for display while typing (digits only in state): XXX-XXX-XXX-XXX up to 12 digits. */
export function formatTinDisplay(digits: string): string {
  const d = sanitizeTinTyping(digits);
  const parts: string[] = [];
  if (d.length > 0) parts.push(d.slice(0, 3));
  if (d.length > 3) parts.push(d.slice(3, 6));
  if (d.length > 6) parts.push(d.slice(6, 9));
  if (d.length > 9) parts.push(d.slice(9, 12));
  return parts.join("-");
}

function digitsOnly(raw: string, max: number): string {
  return raw.replace(/\D/g, "").slice(0, max);
}

function alnumUpper(raw: string, max: number, extra = ""): string {
  const re = new RegExp(`[^A-Z0-9${extra.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}]`, "g");
  return raw.toUpperCase().replace(re, "").slice(0, max);
}

/** Sanitize government ID number based on selected ID type. */
export function sanitizeGovIdNumberForType(slug: string, raw: string): string {
  const s = slug.trim();
  switch (s) {
    case "philsys":
      return digitsOnly(raw, 16);
    case "passport":
      return alnumUpper(raw, 9);
    case "drivers_license":
      return alnumUpper(raw, 20, "-");
    case "umid":
      return digitsOnly(raw, 12);
    case "sss": {
      const d = digitsOnly(raw, 10);
      if (d.length <= 2) return d;
      if (d.length <= 9) return `${d.slice(0, 2)}-${d.slice(2)}`;
      return `${d.slice(0, 2)}-${d.slice(2, 9)}-${d.slice(9)}`;
    }
    case "tin": {
      const d = digitsOnly(raw, 12);
      const parts: string[] = [];
      if (d.length > 0) parts.push(d.slice(0, 3));
      if (d.length > 3) parts.push(d.slice(3, 6));
      if (d.length > 6) parts.push(d.slice(6, 9));
      if (d.length > 9) parts.push(d.slice(9, 12));
      return parts.join("-");
    }
    case "postal":
      return digitsOnly(raw, 16);
    case "voters":
      return alnumUpper(raw, 20);
    case "prc":
      return digitsOnly(raw, 12);
    case "philhealth": {
      const d = digitsOnly(raw, 14);
      if (d.length <= 2) return d;
      if (d.length <= 11) return `${d.slice(0, 2)}-${d.slice(2)}`;
      return `${d.slice(0, 2)}-${d.slice(2, 11)}-${d.slice(11)}`;
    }
    case "other":
    default:
      return raw
        .replace(/[\u0000-\u001F\u007F]/g, "")
        .replace(/[^\p{L}\p{N}\s\-./]/gu, "")
        .replace(/\s{2,}/g, " ")
        .slice(0, INPUT_MAX.govIdNumber);
  }
}

export function formatGovIdDisplay(slug: string, value: string): string {
  const s = slug.trim();
  const v = value;
  switch (s) {
    case "philsys": {
      const d = digitsOnly(v, 16);
      return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    }
    case "postal": {
      const d = digitsOnly(v, 16);
      return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
    }
  }
  return v;
}

export type MarketingProfileFieldErrors = Partial<{
  name: string;
  email: string;
  phone: string;
  mailingLocation: string;
  tin: string;
  govIdType: string;
  govIdNumber: string;
  gcashNumber: string;
  gcashHolder: string;
}>;

export function validateMarketingPersonalForm(input: {
  name: string;
  email: string;
  phone: string;
  mailingLocation: PhilippineLocationValue;
  tin: string;
}): MarketingProfileFieldErrors {
  const errors: MarketingProfileFieldErrors = {};
  const name = sanitizePersonName(input.name);
  if (name.length < 2) errors.name = "Enter your full legal name (at least 2 characters).";
  const email = sanitizeEmailTyping(input.email).toLowerCase();
  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  const phone = sanitizePhilippinesMobileInput(input.phone);
  if (!phone) {
    errors.phone = "Mobile number is required (11 digits starting with 09).";
  } else if (!PH_MOBILE_RE.test(phone)) {
    errors.phone = "Use a valid Philippine mobile number (09 followed by 9 digits, e.g. 09171234567).";
  }
  if (!input.mailingLocation.provinceCode) {
    errors.mailingLocation = "Select your province.";
  } else if (!input.mailingLocation.cityCode) {
    errors.mailingLocation = "Select your city or municipality.";
  } else if (!input.mailingLocation.barangayName?.trim()) {
    errors.mailingLocation = "Enter your barangay.";
  }
  const tinDigits = sanitizeTinTyping(input.tin);
  if (tinDigits && (tinDigits.length < 9 || tinDigits.length > 12)) {
    errors.tin = "BIR TIN must be 9 to 12 digits.";
  }
  return errors;
}

export function validateMarketingGovIdForm(input: {
  govIdType: string;
  govIdNumber: string;
  selectedOption?: MarketingGovIdOption;
}): MarketingProfileFieldErrors {
  const errors: MarketingProfileFieldErrors = {};
  const type = input.govIdType.trim();
  const num = input.govIdNumber.trim();
  if (!type) {
    errors.govIdType = "Select your government-issued ID type.";
    if (num) errors.govIdNumber = "Select ID type first.";
    return errors;
  }
  if (!num) {
    errors.govIdNumber = "Enter the ID number exactly as shown on your document.";
    return errors;
  }
  const digitsOnlyTypes = new Set(["philsys", "umid", "postal", "prc"]);
  const numCore = num.replace(/[\s\-./]/g, "");
  if (digitsOnlyTypes.has(type) && /\D/.test(numCore)) {
    errors.govIdNumber = "This ID type uses numbers only (no letters).";
  }
  if (type === "passport" && num.length > 0 && !/^[A-Z]\d{7}[A-Z]$/i.test(num.replace(/\s/g, ""))) {
    errors.govIdNumber = "Passport format is typically one letter, seven digits, and one letter (e.g. P1234567A).";
  }
  if (type === "sss" && num.length > 0 && !/^\d{2}-\d{7}-\d$/.test(num)) {
    errors.govIdNumber = "SSS format: 34-1234567-8 (two digits, seven digits, one check digit).";
  }
  return errors;
}

export function validateMarketingGcashForm(input: {
  gcashNumber: string;
  gcashHolder: string;
  hasExistingNumber: boolean;
}): MarketingProfileFieldErrors {
  const errors: MarketingProfileFieldErrors = {};
  const num = sanitizePhilippinesMobileInput(input.gcashNumber);
  const holder = sanitizePersonName(input.gcashHolder, INPUT_MAX.gcashHolder);
  if (!num && !holder) {
    errors.gcashNumber = "Enter your GCash mobile number and account name, or update the name only.";
    return errors;
  }
  if (num) {
    if (!PH_MOBILE_RE.test(num)) {
      errors.gcashNumber = "GCash number must be 11 digits starting with 09 (e.g. 09171234567).";
    }
    if (!holder || holder.length < 2) {
      errors.gcashHolder = "Enter the full name registered on your GCash wallet (letters only).";
    }
  } else if (holder) {
    if (holder.length < 2) {
      errors.gcashHolder = "Account name must be at least 2 characters.";
    }
    if (!input.hasExistingNumber) {
      errors.gcashNumber = "Add your GCash mobile number when setting the account name for the first time.";
    }
  }
  return errors;
}

export function hasFieldErrors(errors: MarketingProfileFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
