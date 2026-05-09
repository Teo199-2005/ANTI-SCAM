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

  const refreshUser = useCallback(async () => {
    for (let attempt = 0; attempt < ME_ATTEMPTS; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ME_TIMEOUT_MS);
      try {
        const { data } = await authClient.get<AuthEnvelope>("/me", {
          signal: controller.signal,
        });
        clearTimeout(timer);
        setUser(data.success && data.data?.user ? data.data.user : null);
        setLoading(false);
        return;
      } catch (err) {
        clearTimeout(timer);

        if (axios.isAxiosError(err) && err.response?.status === 401) {
          setUser(null);
          setLoading(false);
          return;
        }

        if (attempt < ME_ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
        }
      }
    }

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

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data } = await authClient.post<AuthEnvelope>("/login", { email, password });
      if (!data.success || !data.data?.user) {
        throw new Error(data.message ?? "Login failed.");
      }
      setUser(data.data.user);
    } catch (err) {
      throw new Error(parseApiErrorMessage(err, "Login failed."));
    }
  }, []);

  const register = useCallback(
    async (input: {
      name: string;
      email: string;
      phone?: string;
      business_name?: string;
      role_intent?: "resort_owner" | "client";
      password: string;
      password_confirmation: string;
    }) => {
      try {
        const { data } = await authClient.post<AuthEnvelope>("/register", input);
        if (!data.success || !data.data?.user) {
          throw new Error(data.message ?? "Registration failed.");
        }
        setUser(data.data.user);
      } catch (err) {
        throw new Error(parseApiErrorMessage(err, "Registration failed."));
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authClient.post("/logout");
    } catch {
      /* Always clear local state even if backend call fails */
    }
    setUser(null);
  }, []);

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
