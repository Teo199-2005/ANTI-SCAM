"use client";

/**
 * This page handles legacy fragment-based OAuth callbacks for backward compatibility.
 * New Google OAuth sign-ins go through /api/auth/google-callback (httpOnly cookie BFF).
 *
 * If a user lands here with a #token fragment (old flow), we redirect them to login
 * with a clear message rather than silently doing nothing.
 */
import PageContainer from "@/components/layout/PageContainer";
import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Any token in the fragment is from the old, insecure flow.
    // Do NOT process it — just redirect to login.
    setReady(true);
    const timer = setTimeout(() => {
      window.location.replace("/login");
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!ready) return null;

  return (
    <PageContainer className="section-padding flex min-h-[40vh] flex-col items-center justify-center text-center">
      <div className="soft-panel max-w-md px-8 py-10">
        <p className="text-zinc-700">
          Your sign-in session has expired or used an unsupported flow.
          Redirecting you to the login page…
        </p>
        <a
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-skyBlue hover:underline"
        >
          Go to login now
        </a>
      </div>
    </PageContainer>
  );
}
