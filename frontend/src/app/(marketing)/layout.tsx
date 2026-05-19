"use client";

import MarketingLayoutClient from "@/app/(marketing)/MarketingLayoutClient";
import AppLoadingScreen from "@/components/layout/AppLoadingScreen";
import { RegisterModalProvider } from "@/contexts/RegisterModalContext";
import { Suspense, type ReactNode } from "react";

export default function MarketingLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense
      fallback={
        <AppLoadingScreen variant="marketing" message="Loading…" submessage="Checking your session." />
      }
    >
      <RegisterModalProvider>
        <MarketingLayoutClient>{children}</MarketingLayoutClient>
      </RegisterModalProvider>
    </Suspense>
  );
}
