import axios from "axios";

export function parseApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as Record<string, unknown> | undefined;

    // Validation errors — surface the first one
    const errors = data?.errors;
    if (errors && typeof errors === "object") {
      const first = Object.values(errors as Record<string, string[] | string>)[0];
      if (Array.isArray(first) && first[0]) return String(first[0]);
      if (typeof first === "string") return first;
    }

    if (data?.message && typeof data.message === "string" && data.message !== "") {
      return data.message;
    }

    if (error.response?.status === 401) return "Session expired. Please log in again.";
    if (error.response?.status === 403) return "You do not have permission to perform this action.";
    if (error.response?.status === 404) return "The requested resource was not found.";
    if (error.response?.status === 422) return "Validation failed. Check your input and try again.";
    if (error.response?.status === 502) return "API server is unreachable. Please check that the backend is running.";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
