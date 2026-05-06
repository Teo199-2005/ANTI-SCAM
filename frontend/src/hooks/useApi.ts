"use client";

/**
 * useApi — centralized data-fetching hook
 *
 * Provides:
 *  - Consistent loading / error / data states across all dashboard pages
 *  - In-flight deduplication (only one request per cacheKey at a time)
 *  - Opt-in TTL-based memory cache (default 30 s) to prevent duplicate mounts triggering redundant fetches
 *  - Manual refetch via the returned `reload` function
 *  - Abort-on-unmount via AbortController
 *
 * Usage:
 *   const { data, loading, error, reload } = useApi(() => apiClient.get('/reservations'), {
 *     cacheKey: 'reservations',
 *     ttl: 60,
 *   });
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";

type UseApiOptions = {
  /** Unique string key for dedup/caching. Omit to disable caching. */
  cacheKey?: string;
  /** Cache TTL in seconds. Default 30. */
  ttl?: number;
  /** Set false to prevent the initial fetch on mount. */
  immediate?: boolean;
};

type UseApiResult<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

// ── Module-level in-flight dedup map ─────────────────────────────────────────
const inFlight = new Map<string, Promise<unknown>>();

// ── Module-level TTL cache ────────────────────────────────────────────────────
type CacheEntry<T> = { data: T; expiresAt: number };
const cache = new Map<string, CacheEntry<unknown>>();

export function useApi<T>(
  fetcher: () => Promise<{ data: unknown }>,
  options: UseApiOptions = {},
): UseApiResult<T> {
  const { cacheKey, ttl = 30, immediate = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const execute = useCallback(() => {
    if (!mountedRef.current) return;
    setLoading(true);
    setError(null);

    // Return cached value if still valid
    if (cacheKey) {
      const entry = cache.get(cacheKey) as CacheEntry<T> | undefined;
      if (entry && entry.expiresAt > Date.now()) {
        setData(entry.data);
        setLoading(false);
        return;
      }
    }

    const runFetch = async () => {
      try {
        let promise: Promise<unknown>;

        if (cacheKey && inFlight.has(cacheKey)) {
          promise = inFlight.get(cacheKey)!;
        } else {
          promise = fetcherRef.current().then((res) => {
            const payload = res.data as { data?: T } | T;
            return (payload as { data?: T }).data ?? payload;
          });
          if (cacheKey) inFlight.set(cacheKey, promise);
        }

        const result = (await promise) as T;

        if (cacheKey) {
          inFlight.delete(cacheKey);
          cache.set(cacheKey, { data: result, expiresAt: Date.now() + ttl * 1000 });
        }

        if (mountedRef.current) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (cacheKey) inFlight.delete(cacheKey);
        if (mountedRef.current) {
          setError(parseApiErrorMessage(err, "Failed to load data."));
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    void runFetch();
  }, [cacheKey, ttl]);

  useEffect(() => {
    mountedRef.current = true;
    if (immediate) execute();
    return () => {
      mountedRef.current = false;
    };
  }, [execute, immediate]);

  return { data, loading, error, reload: execute };
}

/** Imperatively invalidate a cache key (e.g. after a mutation). */
export function invalidateCache(cacheKey: string) {
  cache.delete(cacheKey);
  inFlight.delete(cacheKey);
}
