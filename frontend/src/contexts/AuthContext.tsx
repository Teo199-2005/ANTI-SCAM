"use client";

/**
 * AuthContext — Secure authentication state management.
 *
 * Token flow:
 *  login/register → /api/auth/login|register (Next.js BFF) → httpOnly cookie set
 *  session check  → /api/auth/me              (reads cookie, returns user)
 *  logout         → /api/auth/logout          (clears cookie, revokes backend token)
 *
 * No auth token is ever accessible to JavaScript.
 */

import { authClient } from "@/lib/api/client";
import type { AuthUser } from "@/lib/auth/types";
import { parseApiErrorMessage } from "@/lib/auth/parseApiError";
import axios from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: {
    name: string;
    email: string;
    phone?: string;
    business_name?: string;
    role_intent?: "resort_owner" | "client";
    signup_source_resort_id?: number;
    referral_code?: string;
    password: string;
    password_confirmation: string;
    accept_terms: boolean;
  }) => Promise<{ user: AuthUser; referralTrial: AuthUser["referral_trial"] }>;
  completeGoogleSignup: (input: {
    google_token: string;
    role_intent: "resort_owner" | "client";
    accept_terms: boolean;
    phone?: string;
    business_name?: string;
    referral_code?: string;
  }) => Promise<{ user: AuthUser; referralTrial: AuthUser["referral_trial"] }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthEnvelope = {
  success: boolean;
  message?: string;
  data?: {
    user: AuthUser;
    referral_trial?: AuthUser["referral_trial"];
  };
};

const ME_ATTEMPTS = 3;
const ME_TIMEOUT_MS = 20_000;

/** One retry after a short pause — masks brief nginx/Node upstream 502s after restarts or load blips. */
async function postAuthEnvelopeWithTransientRetry(
  url: "/login" | "/register" | "/google-complete",
  body: unknown,
): Promise<AuthEnvelope> {
  const run = () => authClient.post<AuthEnvelope>(url, body);
  try {
    const { data } = await run();
    return data;
  } catch (err) {
    if (!axios.isAxiosError(err)) throw err;
    const status = err.response?.status;
    const retryable =
      status === 502 ||
      status === 503 ||
      status === 504 ||
      err.code === "ECONNABORTED" ||
      (typeof err.message === "string" && err.message.toLowerCase().includes("network"));
    if (!retryable) throw err;
    await new Promise((r) => setTimeout(r, 480));
    const { data } = await run();
    return data;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  /**
   * Invalidates in-flight `refreshUser` work so a slow `/me` from the initial page load cannot:
   * - overwrite a user just set by `login` / `register`, or
   * - clear the session with a stale 401 after the cookie was set, or
   * - leave `loading` stuck true by returning early without `setLoading(false)`.
   */
  const authEpochRef = useRef(0);
  const bumpAuthEpoch = useCallback(() => {
    authEpochRef.current += 1;
  }, []);

  const refreshUser = useCallback(async () => {
    const epochAtRefreshStart = authEpochRef.current;
    for (let attempt = 0; attempt < ME_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ME_TIMEOUT_MS);
      try {
        const { data } = await authClient.get<AuthEnvelope>("/me", {
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (authEpochRef.current !== epochAtRefreshStart) return;
        setUser(data.success && data.data?.user ? data.data.user : null);
        setLoading(false);
        return;
      } catch (err) {
        clearTimeout(timer);
        if (authEpochRef.current !== epochAtRefreshStart) return;

        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setUser(null);
          setLoading(false);
          return;
        }

        if (attempt < ME_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
          if (authEpochRef.current !== epochAtRefreshStart) return;
        }
      }
    }

    if (authEpochRef.current !== epochAtRefreshStart) return;
    setUser(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  /**
   * A single 401 from /api/backend/* does not always mean the session cookie is invalid.
   * Re-check /api/auth/me before clearing user so refreshes and transient errors don’t “log out” the app.
   */
  useEffect(() => {
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const handle = () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        debounce = undefined;
        void refreshUser();
      }, 100);
    };
    window.addEventListener("auth:expired", handle);
    return () => {
      if (debounce) clearTimeout(debounce);
      window.removeEventListener("auth:expired", handle);
    };
  }, [refreshUser]);

  const loginLockRef = useRef(false);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      if (loginLockRef.current) {
        throw new Error("Sign-in already in progress. Please wait.");
      }
      loginLockRef.current = true;
      bumpAuthEpoch();
      try {
        const data = await postAuthEnvelopeWithTransientRetry("/login", { email, password });
        if (!data.success || !data.data?.user) {
          throw new Error(data.message ?? "Login failed.");
        }
        setUser(data.data.user);
        setLoading(false);
        return data.data.user;
      } catch (err) {
        setLoading(false);
        throw new Error(parseApiErrorMessage(err, "Login failed."));
      } finally {
        loginLockRef.current = false;
      }
    },
    [bumpAuthEpoch],
  );

  const register = useCallback(
    async (input: {
      name: string;
      email: string;
      phone?: string;
      business_name?: string;
      role_intent?: "resort_owner" | "client" | "guest";
      resort_subdomain?: string;
      referral_code?: string;
      password: string;
      password_confirmation: string;
      accept_terms: boolean;
    }): Promise<{ user: AuthUser; referralTrial: AuthUser["referral_trial"] }> => {
      bumpAuthEpoch();
      try {
        const data = await postAuthEnvelopeWithTransientRetry("/register", input);
        if (!data.success || !data.data?.user) {
          throw new Error(data.message ?? "Registration failed.");
        }
        const userPayload = {
          ...data.data.user,
          referral_trial: data.data.user.referral_trial ?? data.data.referral_trial ?? null,
        };
        setUser(userPayload);
        setLoading(false);
        return {
          user: userPayload,
          referralTrial: data.data.referral_trial ?? userPayload.referral_trial ?? null,
        };
      } catch (err) {
        setLoading(false);
        throw new Error(parseApiErrorMessage(err, "Registration failed."));
      }
    },
    [bumpAuthEpoch],
  );

  const completeGoogleSignup = useCallback(
    async (input: {
      google_token: string;
      role_intent: "resort_owner" | "client";
      accept_terms: boolean;
      phone?: string;
      business_name?: string;
      referral_code?: string;
    }): Promise<{ user: AuthUser; referralTrial: AuthUser["referral_trial"] }> => {
      bumpAuthEpoch();
      try {
        const data = await postAuthEnvelopeWithTransientRetry("/google-complete", input);
        if (!data.success || !data.data?.user) {
          throw new Error(data.message ?? "Registration failed.");
        }
        const userPayload = {
          ...data.data.user,
          referral_trial: data.data.user.referral_trial ?? data.data.referral_trial ?? null,
        };
        setUser(userPayload);
        setLoading(false);
        return {
          user: userPayload,
          referralTrial: data.data.referral_trial ?? userPayload.referral_trial ?? null,
        };
      } catch (err) {
        setLoading(false);
        throw new Error(parseApiErrorMessage(err, "Registration failed."));
      }
    },
    [bumpAuthEpoch],
  );

  const logout = useCallback(async () => {
    bumpAuthEpoch();
    try {
      await authClient.post("/logout");
    } catch {
      /* Always clear local state even if backend call fails */
    }
    setUser(null);
    setLoading(false);
  }, [bumpAuthEpoch]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, register, completeGoogleSignup, logout, refreshUser }),
    [user, loading, login, register, completeGoogleSignup, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}
