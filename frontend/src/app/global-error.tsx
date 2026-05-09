"use client";

import "./globals.css";
import { useEffect } from "react";

/**
 * Root error boundary — must define <html> and <body> (Next.js requirement).
 * Providing this file avoids dev bundler failures resolving the built-in global-error
 * when the project path contains spaces or on some Turbopack/RSC edge cases.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F4F4F9] font-sans text-zinc-900 antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-lg">
            <h1 className="text-lg font-semibold text-zinc-900">Something went wrong</h1>
            <p className="mt-2 text-sm text-zinc-600">Please refresh the page or try again.</p>
            {error.digest ? <p className="mt-4 font-mono text-xs text-zinc-400">Ref: {error.digest}</p> : null}
            <button
              type="button"
              onClick={() => reset()}
              className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
