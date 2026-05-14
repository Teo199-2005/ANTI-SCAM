/**
 * API Client — Production Security Architecture
 *
 * Auth tokens are stored exclusively in httpOnly cookies managed by Next.js API routes.
 * No token ever touches localStorage or JavaScript-accessible browser storage.
 *
 * Auth calls  → /api/auth/...     (Next.js BFF routes that set/clear the httpOnly cookie)
 * All other   → /api/backend/...  (Next.js proxy that injects cookie token as Bearer)
 *
 * This prevents token theft via XSS because JavaScript has no access to rs_session cookie.
 */
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";

// ── Public catalog client (no auth required) ──────────────────────────────────
// Browser: same-origin `/api/public/*` → Next route proxies to Laravel (production has no `/api/v1` on nginx).
// Server: direct Laravel base from env.
export const publicClient = axios.create({
  baseURL: serverLaravelApiV1BaseUrl(),
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  timeout: 10_000,
});

publicClient.interceptors.request.use((config) => {
  const url = config.url ?? "";
  if (typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/$/, "");
    config.baseURL = `${origin}/api/public`;
    if (url.startsWith("/")) {
      config.url = url.slice(1);
    }
  } else {
    config.baseURL = serverLaravelApiV1BaseUrl();
    if (url.startsWith("/")) {
      config.url = url.slice(1);
    }
  }
  return config;
});

// ── Authenticated API client ──────────────────────────────────────────────────
// Routes through /api/backend proxy → Next.js reads httpOnly cookie → injects Bearer.
export const apiClient = axios.create({
  baseURL: "/api/backend",
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  timeout: 15_000,
  withCredentials: true,
});

// Auth client — calls Next.js BFF auth routes, not the Laravel backend directly.
export const authClient = axios.create({
  baseURL: "/api/auth",
  headers: { Accept: "application/json", "Content-Type": "application/json" },
  timeout: 10_000,
  withCredentials: true,
});

// ── Response interceptors ─────────────────────────────────────────────────────
function attachResponseInterceptor(client: typeof apiClient) {
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        // Session expired — let auth context handle redirect.
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:expired"));
        }
      }
      return Promise.reject(error);
    },
  );
}

attachResponseInterceptor(apiClient);

// ── Multipart helper ──────────────────────────────────────────────────────────
// Override Content-Type for FormData so the proxy doesn't accidentally set JSON.
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

// ── Public helper functions (backward-compatible) ────────────────────────────
export type Resort = { id: number; name: string };
export type Room = { id: number; name: string; base_price: number };

export async function fetchResorts() {
  const { data } = await publicClient.get("/public/resorts");
  return data.data ?? data;
}

export async function fetchResort(resortId: number) {
  const { data } = await publicClient.get(`/public/resorts/${resortId}`);
  return data.data ?? data;
}

export async function fetchRoom(roomId: number) {
  const { data } = await publicClient.get(`/public/rooms/${roomId}`);
  return data.data ?? data;
}

export async function checkAvailability(roomId: number, checkIn: string, checkOut: string) {
  const { data } = await publicClient.get(`/public/rooms/${roomId}/availability`, {
    params: { check_in_date: checkIn, check_out_date: checkOut },
  });
  return data.data ?? data;
}

export async function createBookingLock(payload: Record<string, unknown>) {
  const { data } = await apiClient.post("/booking-locks", payload);
  return data.data ?? data;
}

export async function createReservation(payload: Record<string, unknown>) {
  const { data } = await apiClient.post("/reservations", payload);
  return data.data ?? data;
}

/** @deprecated Token is now managed server-side via httpOnly cookie. These are no-ops kept for compatibility during migration. */
export function getStoredToken(): null { return null; }
/** @deprecated */
export function setStoredToken(_token: string): void { /* no-op */ }
/** @deprecated */
export function clearStoredToken(): void { /* no-op */ }
