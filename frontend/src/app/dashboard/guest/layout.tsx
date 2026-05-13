"use client";

import type { ReactNode } from "react";

/**
 * Guest dashboard segment — shell (sidebar, OTP gate, topbar) lives in `../layout.tsx`.
 * This layout exists so guest routes can own future guest-only providers without touching the global dashboard shell.
 */
export default function GuestDashboardSegmentLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <>{children}</>;
}
