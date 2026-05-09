"use client";

import { useEffect } from "react";

/**
 * Legacy Xendit success/failure URLs pointed here before the payments page was removed.
 * Keeps old invoices from 404ing.
 */
export default function LegacyPaymentsRedirectPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const qs = payment ? `?payment=${encodeURIComponent(payment)}` : "";
    window.location.replace(`/dashboard/resort${qs}`);
  }, []);

  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-600">
      Redirecting to your resort dashboard…
    </div>
  );
}
