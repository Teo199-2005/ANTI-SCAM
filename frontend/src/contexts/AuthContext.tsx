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
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    phone?: string;
    business_name?: string;
    role_intent?: "resort_owner" | "client";
    password: string;
    password_confirmation: string;
    accept_terms: boolean;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthEnvelope = {
  success: boolean;
  message?: string;
  data?: { user: AuthUser };
};

const ME_ATTEMPTS = 3;
const ME_TIMEOUT_MS = 20_000;

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

  const login = useCallback(
    async (email: string, password: string) => {
      bumpAuthEpoch();
      try {
        const { data } = await authClient.post<AuthEnvelope>("/login", { email, password });
        if (!data.success || !data.data?.user) {
          throw new Error(data.message ?? "Login failed.");
        }
        setUser(data.data.user);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        throw new Error(parseApiErrorMessage(err, "Login failed."));
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
      role_intent?: "resort_owner" | "client";
      password: string;
      password_confirmation: string;
      accept_terms: boolean;
    }) => {
      bumpAuthEpoch();
      try {
        const { data } = await authClient.post<AuthEnvelope>("/register", input);
        if (!data.success || !data.data?.user) {
          throw new Error(data.message ?? "Registration failed.");
        }
        setUser(data.data.user);
        setLoading(false);
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
    () => ({ user, loading, login, register, logout, refreshUser }),
    [user, loading, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}
