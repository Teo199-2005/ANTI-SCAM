"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Legacy guest dashboard — migrated users use the client portal. */
export default function GuestDashboardRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/client");
  }, [router]);
  return null;
}
