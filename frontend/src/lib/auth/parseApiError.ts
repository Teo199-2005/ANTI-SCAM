import axios from "axios";

function appendDevHint(data: Record<string, unknown> | undefined, message: string): string {
  const hint = data?.devHint;
  if (hint && typeof hint === "string" && hint.trim() !== "") {
    return `${message} ${hint.trim()}`;
  }
  return message;
}

/** Flatten Laravel `errors` object (arrays of strings per field) into readable lines. */
export function flattenLaravelApiErrors(errors: unknown): string[] {
  if (!errors || typeof errors !== "object") return [];
  const lines: string[] = [];
  const noPrefixKeys = new Set(["hint", "devHint"]);
  const skipKeys = new Set(["code"]);
  for (const [key, val] of Object.entries(errors as Record<string, unknown>)) {
    if (skipKeys.has(key)) continue;
    const usePrefix = !noPrefixKeys.has(key);
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === "string" && item.trim() !== "") {
          if (key !== "images" && !key.startsWith("images.") && usePrefix) {
            lines.push(`${key}: ${item}`);
          } else {
            lines.push(item);
          }
        }
      }
    } else if (typeof val === "string" && val.trim() !== "") {
      if (key !== "images" && !key.startsWith("images.") && usePrefix) {
        lines.push(`${key}: ${val}`);
      } else {
        lines.push(val);
      }
    }
  }
  return lines;
}

export function parseApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;

    // Validation errors — prefer every line joined (room uploads often set multiple `images.*` messages)
    const errors = data?.errors;
    if (errors && typeof errors === "object") {
      const flat = flattenLaravelApiErrors(errors);
      const rawMsg = typeof data?.message === "string" ? data.message.trim() : "";
      const genericMsg = rawMsg === "" || rawMsg === "The given data was invalid.";

      if (flat.length > 0) {
        const joined = flat.join(" · ");
        let combined = genericMsg ? joined : `${rawMsg} — ${joined}`;
        combined = combined.replace(/\s+/g, " ").trim();
        const max = 480;
        const clipped = combined.length > max ? `${combined.slice(0, max).trim()}…` : combined;
        return appendDevHint(data, clipped);
      }
      const first = Object.values(errors as Record<string, string[] | string>)[0];
      if (Array.isArray(first) && first[0]) return appendDevHint(data, String(first[0]));
      if (typeof first === "string") return appendDevHint(data, first);
    }

    if (data?.message && typeof data.message === "string" && data.message !== "") {
      return appendDevHint(data, data.message);
    }

    if (error.response?.status === 401) return appendDevHint(data, "Session expired. Please log in again.");
    if (error.response?.status === 403) return appendDevHint(data, "You do not have permission to perform this action.");
    if (error.response?.status === 404) return appendDevHint(data, "The requested resource was not found.");
    if (error.response?.status === 413)
      return appendDevHint(data, "File is larger than the server allows. Try a smaller image or ask your host to raise upload limits.");
    if (error.response?.status === 422) return appendDevHint(data, "Validation failed. Check your input and try again.");
    if (error.response?.status === 502)
      return appendDevHint(data, "API server is unreachable. Please check that the backend is running.");
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
