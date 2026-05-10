import axios from "axios";

function appendDevHint(data: Record<string, unknown> | undefined, message: string): string {
  const hint = data?.devHint;
  if (hint && typeof hint === "string" && hint.trim() !== "") {
    return `${message} ${hint.trim()}`;
  }
  return message;
}

export function parseApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;

    // Validation errors — surface the first one
    const errors = data?.errors;
    if (errors && typeof errors === "object") {
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
    if (error.response?.status === 422) return appendDevHint(data, "Validation failed. Check your input and try again.");
    if (error.response?.status === 502)
      return appendDevHint(data, "API server is unreachable. Please check that the backend is running.");
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
