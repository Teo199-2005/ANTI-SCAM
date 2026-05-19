"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GuestHistoryRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/client/bookings");
  }, [router]);
  return null;
}
