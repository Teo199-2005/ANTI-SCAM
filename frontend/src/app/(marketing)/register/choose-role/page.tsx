"use client";

import { RegisterRoleChoiceModal } from "@/components/auth/RegisterRoleChoiceModal";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function ChooseRoleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const googleToken = searchParams.get("google_token")?.trim() ?? "";
  const googleName = searchParams.get("google_name")?.trim() ?? "";
  const googleEmail = searchParams.get("google_email")?.trim() ?? "";
  const returnTo = searchParams.get("returnTo")?.trim() ?? "";

  useEffect(() => {
    if (!googleToken) {
      router.replace("/register");
    }
  }, [googleToken, router]);

  if (!googleToken) {
    return (
      <AuthSplitShell>
        <p className="text-center text-sm text-zinc-600">Redirecting…</p>
      </AuthSplitShell>
    );
  }

  return (
    <AuthSplitShell>
      <RegisterRoleChoiceModal
        open
        onClose={() => router.push("/login")}
        googleToken={googleToken}
        googleName={googleName || undefined}
        googleEmail={googleEmail || undefined}
        returnTo={returnTo || undefined}
      />
    </AuthSplitShell>
  );
}

export default function RegisterChooseRolePage() {
  return (
    <Suspense
      fallback={
        <AuthSplitShell>
          <p className="text-center text-sm text-zinc-600">Loading…</p>
        </AuthSplitShell>
      }
    >
      <ChooseRoleContent />
    </Suspense>
  );
}
