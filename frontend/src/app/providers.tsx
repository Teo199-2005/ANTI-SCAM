"use client";

import { ToastProvider } from "@/components/shared/ToastProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
