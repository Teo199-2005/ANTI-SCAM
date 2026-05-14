import { isAxiosError } from "axios";

/** True for timeouts, no response, 408/425/429, and 5xx — safe to retry idempotent GETs only */
export function isTransientRequestFailure(error: unknown): boolean {
  if (!isAxiosError(error)) {
    return false;
  }
  if (!error.response) {
    return true;
  }
  const s = error.response.status;
  if (s === 408 || s === 425 || s === 429) {
    return true;
  }
  return s >= 500 && s <= 599;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Retries the same async factory on transient failures (timeouts, 5xx, no response).
 * Does not retry 401/403/422 — those need user action or a different fix.
 */
export async function withAxiosRetries<T>(
  factory: () => Promise<T>,
  options?: { attempts?: number; delaysMs?: number[] },
): Promise<T> {
  const attempts = Math.max(1, options?.attempts ?? 3);
  const delaysMs = options?.delaysMs ?? [350, 800, 1600];
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await factory();
    } catch (e) {
      lastError = e;
      const canRetry = i < attempts - 1 && isTransientRequestFailure(e);
      if (!canRetry) {
        throw e;
      }
      await sleep(delaysMs[i] ?? delaysMs[delaysMs.length - 1] ?? 1000);
    }
  }
  throw lastError;
}
