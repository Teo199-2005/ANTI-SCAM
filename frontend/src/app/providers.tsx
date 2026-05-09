"use client";

import { LegalDocumentModalsProvider } from "@/contexts/LegalDocumentModalsContext";
import { ToastProvider } from "@/components/shared/ToastProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import type { ReactNode } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <LegalDocumentModalsProvider>
        <ToastProvider>{children}</ToastProvider>
      </LegalDocumentModalsProvider>
    </AuthProvider>
  );
}
