import { publicClient } from "@/lib/api/client";
import type { ApiEnvelope } from "@/lib/api/types";

/**
 * Generate or retrieve a session ID for visitor tracking.
 * Uses sessionStorage to persist the ID within a browser session.
 */
function getSessionId(): string {
  if (typeof window === "undefined") return "";

  const KEY = "asp_visitor_sid";
  let sid = sessionStorage.getItem(KEY);
  if (!sid) {
    sid = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(KEY, sid);
  }
  return sid;
}

/**
 * Extract a resort_id from the current page.
 * 1. Checks the global set by ResortPublicLandingTemplate (`window.__ASP_RESORT_ID__`).
 * 2. Falls back to URL pattern matching for /resorts/{id}.
 */
function extractResortIdFromUrl(): number | null {
  if (typeof window === "undefined") return null;

  // Preferred: read from the global set by the SSR landing template
  const globalId = (window as unknown as Record<string, unknown>).__ASP_RESORT_ID__;
  if (typeof globalId === "number" && Number.isFinite(globalId)) return globalId;

  // Fallback: match /resorts/{numeric-id} pattern
  const numericMatch = window.location.pathname.match(/\/resorts\/(\d+)/);
  if (numericMatch) return parseInt(numericMatch[1], 10);

  return null;
}

/**
 * Record a page visit to the backend.
 * Designed to be fire-and-forget — errors are silently ignored.
 */
export function recordVisitorVisit(): void {
  if (typeof window === "undefined") return;

  // Don't track dashboard/admin pages
  if (
    window.location.pathname.startsWith("/dashboard") ||
    window.location.pathname.startsWith("/login") ||
    window.location.pathname.startsWith("/register")
  ) {
    return;
  }

  const sessionId = getSessionId();
  if (!sessionId) return;

  const payload = {
    session_id: sessionId,
    page_url: window.location.href,
    referrer_url: document.referrer || null,
    resort_id: extractResortIdFromUrl(),
  };

  // Fire and forget — no await, no error handling
  publicClient
    .post<ApiEnvelope<null>>("/public/visitors/record", payload)
    .catch(() => {
      // silently ignore
    });
}
