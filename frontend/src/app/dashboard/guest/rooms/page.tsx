"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GuestRoomsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard/client/explore");
  }, [router]);
  return null;
}
