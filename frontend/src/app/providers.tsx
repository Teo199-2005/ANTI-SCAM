"use client";

import AppErrorBoundary from "@/components/shared/AppErrorBoundary";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { LegalDocumentModalsProvider } from "@/contexts/LegalDocumentModalsContext";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <LegalDocumentModalsProvider>
          <ToastProvider>{children}</ToastProvider>
        </LegalDocumentModalsProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
