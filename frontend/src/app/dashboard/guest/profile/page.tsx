"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GuestProfileRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/client/profile");
  }, [router]);
  return null;
}
