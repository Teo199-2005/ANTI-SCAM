import axios, { type AxiosError } from "axios";

/** Laravel / framework messages that add no value for end users when combined with field errors. */
const GENERIC_BAG_MESSAGES = new Set([
  "the given data was invalid.",
  "validation failed",
  "bad request",
]);

function isGenericBagMessage(s: string): boolean {
  const t = s.trim().toLowerCase();
  return t === "" || GENERIC_BAG_MESSAGES.has(t);
}

/** Map API / snake_case keys to short labels users see on forms. */
const FIELD_LABELS: Record<string, string> = {
  address_barangay_name: "Barangay",
  address_barangay_psgc: "Barangay",
  address_province_psgc: "Province / region",
  address_city_municipality_psgc: "City or municipality",
  contact_number: "Contact number",
  representative_contact_number: "Representative contact number",
  representative_name: "Representative name",
  representative_email: "Contact email",
  owner_contact_number: "Owner contact number",
  name: "Name",
  email: "Email",
  password: "Password",
  password_confirmation: "Password confirmation",
  phone: "Phone",
  current_password: "Current password",
  description: "Description",
  cancellation_policy: "Cancellation policy",
  amenities: "Amenities",
  logo_url: "Resort logo",
  background_image_url: "Background image",
  facebook_url: "Facebook link",
  instagram_url: "Instagram link",
  tiktok_url: "TikTok link",
  resort_subdomain: "Resort link",
  role_intent: "Account type",
  guest_count: "Number of guests",
  check_in_date: "Check-in date",
  check_out_date: "Check-out date",
  room_id: "Room",
  images: "Photos",
  otp: "Verification code",
  marketer_bank_channel_code: "Bank",
  marketer_bank_account_name: "Account holder name",
  marketer_bank_account_number: "Account number",
  marketer_bank_branch: "Branch",
  mailing_province_psgc: "Province / region",
  mailing_city_municipality_psgc: "City or municipality",
  mailing_barangay_name: "Barangay",
};

function friendlyFieldLabel(fieldKey: string): string {
  if (fieldKey === "images" || fieldKey.startsWith("images.")) return "Photo";
  const direct = FIELD_LABELS[fieldKey];
  if (direct) return direct;
  const leaf = fieldKey.includes(".") ? (fieldKey.split(".").pop() ?? fieldKey) : fieldKey;
  const mapped = FIELD_LABELS[leaf];
  if (mapped) return mapped;
  return leaf
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Turn common Laravel validation sentences into shorter, plain language.
 * Uses the field key when the sentence is generic ("The X field is required").
 */
function humanizeValidationLine(fieldKey: string, raw: string): string {
  let msg = raw.trim();
  if (!msg) return msg;

  const label = friendlyFieldLabel(fieldKey);

  const reqFull = /^the\s+(.+?)\s+field\s+is\s+required\.?$/i.exec(msg);
  if (reqFull) {
    return `${label} is required.`;
  }

  msg = msg.replace(/^the\s+email\s+field\s+must\s+be\s+a\s+valid\s+email\.?$/i, "Enter a valid email address.");
  msg = msg.replace(/^the\s+password\s+field\s+confirmation\s+does\s+not\s+match\.?$/i, "Passwords do not match.");
  msg = msg.replace(/^the\s+password\s+field\s+must\s+be\s+at\s+least\s+(\d+)\s+characters\.?$/i, "Password must be at least $1 characters.");
  msg = msg.replace(/^the\s+selected\s+.+?\s+is\s+invalid\.?$/i, "That choice is not valid. Pick another option.");

  // If message still contains "field" jargon with snake_case, soften
  if (/field is required/i.test(msg) && msg.length < 120) {
    return `${label} is required.`;
  }

  return msg;
}

function dedupeLines(lines: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const k = line.trim().toLowerCase();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(line.trim());
  }
  return out;
}

/**
 * Flatten Laravel `errors` into short, user-readable lines (no `address_barangay_name: …` prefixes).
 * Suitable for inline debug panels; for toasts prefer {@link parseApiErrorMessage}.
 */
export function flattenLaravelApiErrors(errors: unknown): string[] {
  if (!errors || typeof errors !== "object") return [];
  const lines: string[] = [];
  const skipKeys = new Set(["code", "hint", "devHint"]);

  for (const [key, val] of Object.entries(errors as Record<string, unknown>)) {
    if (skipKeys.has(key)) continue;

    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "string" && item.trim() !== "") {
          lines.push(humanizeValidationLine(key, item));
        }
      }
    } else if (typeof val === "string" && val.trim() !== "") {
      lines.push(humanizeValidationLine(key, val));
    }
  }

  return dedupeLines(lines);
}

function requestUrlPath(error: AxiosError): string {
  const base = (error.config?.baseURL ?? "").replace(/\/+$/, "");
  const url = error.config?.url ?? "";
  return `${base}/${url}`.replace(/([^:]\/)\/+/g, "$1").toLowerCase();
}

function isAuthApiRequest(error: AxiosError): boolean {
  const path = requestUrlPath(error);
  return path.includes("/api/auth") || /\/(login|register|logout|me)(\?|$|\/)/.test(path);
}

function isUploadRequest(error: AxiosError): boolean {
  const path = requestUrlPath(error);
  const data = error.config?.data;
  if (typeof FormData !== "undefined" && data instanceof FormData) return true;
  return path.includes("/upload") || path.includes("/images");
}

function joinValidationLines(lines: string[]): string {
  if (lines.length === 0) return "";
  if (lines.length === 1) return lines[0];
  const withStop = lines.map((s) => (/[.!?…]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`));
  if (withStop.length === 2) return `${withStop[0]} ${withStop[1]}`;
  if (withStop.length <= 4) return withStop.join(" ");
  return `${withStop.slice(0, 3).join(" ")} ${withStop[3]} Check the form for anything else.`;
}

export function parseApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    if (error.code === "ECONNABORTED") {
      if (isAuthApiRequest(error)) {
        return "Sign-in timed out. Start the Laravel API (cd backend && php artisan serve), set LARAVEL_API_BASE_URL=http://127.0.0.1:8000/api/v1 in frontend/.env.local, then restart the Next.js dev server.";
      }
      if (isUploadRequest(error)) {
        return "Upload timed out. On a VPS set LARAVEL_API_BASE_URL=http://127.0.0.1:8080/api/v1 and run php artisan media:verify.";
      }
      return "The request timed out. Check that the API is running and LARAVEL_API_BASE_URL in frontend/.env.local points to it.";
    }

    if (!error.response && (error.code === "ERR_NETWORK" || error.message.toLowerCase().includes("network"))) {
      if (isAuthApiRequest(error)) {
        return "Could not reach the sign-in service. Start Laravel (php artisan serve), confirm frontend/.env.local has LARAVEL_API_BASE_URL=http://127.0.0.1:8000/api/v1, then restart Next.js.";
      }
    }

    const data = error.response?.data as Record<string, unknown> | undefined;

    const errors = data?.errors;
    if (errors && typeof errors === "object") {
      const flat = flattenLaravelApiErrors(errors);
      const rawMsg = typeof data?.message === "string" ? data.message.trim() : "";
      const rawNorm = rawMsg.toLowerCase();
      const bagGeneric = !rawMsg || isGenericBagMessage(rawMsg);

      if (flat.length > 0) {
        const joined = joinValidationLines(flat);
        if (bagGeneric) {
          return joined;
        }
        // Top-level message often repeats one field error (e.g. "Enter barangay." + errors.address_barangay_name)
        const rawLower = rawMsg.toLowerCase();
        const flatLower = joined.toLowerCase();
        if (rawLower && (flatLower.includes(rawLower) || rawLower.includes(flatLower))) {
          return joined;
        }
        if (rawMsg && flat.length === 1 && rawLower === flat[0].toLowerCase()) {
          return joined;
        }
        if (rawMsg && !isGenericBagMessage(rawMsg)) {
          return `${rawMsg} ${joined}`.replace(/\s+/g, " ").trim();
        }
        return joined;
      }

      const first = Object.values(errors as Record<string, string[] | string>)[0];
      if (Array.isArray(first) && first[0]) {
        const k = Object.keys(errors as Record<string, unknown>)[0] ?? "";
        return humanizeValidationLine(k, String(first[0]));
      }
      if (typeof first === "string") {
        const k = Object.keys(errors as Record<string, unknown>)[0] ?? "";
        return humanizeValidationLine(k, first);
      }
    }

    if (data?.message && typeof data.message === "string" && data.message !== "") {
      const m = data.message.trim();
      if (!isGenericBagMessage(m)) {
        return m;
      }
    }

    if (error.response?.status === 401) return "Your session expired. Please sign in again.";
    if (error.response?.status === 403) {
      return "You are not allowed to do that.";
    }
    if (error.response?.status === 500)
      return typeof data?.message === "string" && data.message.trim() !== ""
        ? data.message.trim()
        : "The server hit an error while signing you in. Check Laravel logs, database migrations (including personal_access_tokens), and APP_KEY on the VPS.";
    if (error.response?.status === 404) return "We could not find that. It may have been removed.";
    if (error.response?.status === 413)
      return "That file is too large for the server. Try a smaller image, or use a compressed JPEG or WebP.";
    if (error.response?.status === 422) return "Some information looks incorrect. Check the form and try again.";
    if (error.response?.status === 429) return "Too many attempts. Please wait a moment and try again.";
    if (error.response?.status === 502) {
      const m = typeof data?.message === "string" ? data.message.trim() : "";
      if (m !== "" && !isGenericBagMessage(m)) {
        return m;
      }
      return "The service is temporarily unavailable. Please try again in a moment.";
    }
    if (error.response?.status === 503) {
      const code = typeof data?.code === "string" ? data.code : "";
      if (code === "bff_laravel_not_loopback" && typeof data?.message === "string" && data.message.trim() !== "") {
        return data.message.trim();
      }
      return typeof data?.message === "string" && data.message.trim() !== ""
        ? data.message.trim()
        : "We are doing brief maintenance. Please try again shortly.";
    }
    if (error.response?.status === 504) {
      return typeof data?.message === "string" && data.message.trim() !== ""
        ? data.message.trim()
        : "Saving the file timed out. Check R2 (php artisan media:verify) and that the API uses loopback on the server.";
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
