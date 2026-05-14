/**
 * API Client — Production Security Architecture
 *
 * Auth tokens are stored exclusively in httpOnly cookies managed by Next.js API routes.
 * No token ever touches localStorage or JavaScript-accessible browser storage.
 *
 * Auth calls  → /api/auth/...     (Next.js BFF routes that set/clear the httpOnly cookie)
 * All other   → /api/backend/...  (Next.js proxy that injects cookie token as Bearer)
 *
 * GET requests on apiClient, publicClient, and authClient automatically retry up to 3 times
 * on transient failures (timeouts, connection drops, 408/425/429, 5xx). Mutating methods are never retried.
 */
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { serverLaravelApiV1BaseUrl } from "@/lib/api/laravelApiBase";
import { isTransientRequestFailure } from "@/lib/api/withAxiosRetries";

type RetryableRequestConfig = InternalAxiosRequestConfig & { __getTransientRetryCount?: number };

const GET_TRANSIENT_RETRY_DELAYS_MS = [350, 800, 1600];
const GET_TRANSIENT_RETRY_MAX_ATTEMPTS = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Retries failed GET requests on transient errors (timeouts, 5xx, network loss).
 * POST/PUT/PATCH/DELETE are never retried here to avoid duplicate side effects.
 */
function attachTransientGetRetryInterceptor(instance: AxiosInstance, options?: { onFinal401?: boolean }): void {
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const cfg = error.config as RetryableRequestConfig | undefined;

      if (cfg && (cfg.method ?? "get").toLowerCase() === "get" && isTransientRequestFailure(error)) {
        const attempt = cfg.__getTransientRetryCount ?? 0;
        if (attempt < GET_TRANSIENT_RETRY_MAX_ATTEMPTS - 1) {
          cfg.__getTransientRetryCount = attempt + 1;
          const delay = GET_TRANSIENT_RETRY_DELAYS_MS[attempt] ?? GET_TRANSIENT_RETRY_DELAYS_MS.at(-1) ?? 1000;
          await sleep(delay);
          return instance.request(cfg);
        }
      }

      if (options?.onFinal401 !== false && error.response?.status === 401) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("auth:expired"));
        }
      }

      return Promise.reject(error);
    },
  );
}

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

attachTransientGetRetryInterceptor(publicClient, { onFinal401: false });

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

attachTransientGetRetryInterceptor(authClient, { onFinal401: false });

// ── Authenticated Laravel proxy: GET retries + session signal on 401 ─────────
attachTransientGetRetryInterceptor(apiClient);

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
