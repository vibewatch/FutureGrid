"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  const handleRetry = unstable_retry ?? reset;

  useEffect(() => {
    console.error("[FutureGrid] Route error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Brand logo mark */}
      <div
        className="brand-grad mb-6 inline-flex items-center justify-center rounded-xl text-white font-black text-sm tracking-tight shadow-lg"
        style={{ width: 48, height: 48 }}
        aria-hidden="true"
      >
        FG
      </div>

      <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white leading-snug">
        Something went wrong
      </h2>

      <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400 max-w-sm leading-relaxed">
        An unexpected error disrupted this page. You can try again or go back
        to the dashboard.
      </p>

      {error.digest && (
        <p className="mt-2 text-xs text-zinc-600 font-mono">
          Error ID: {error.digest}
        </p>
      )}

      <hr className="divider-glow w-48 my-7" aria-hidden="true" />

      <div className="flex flex-wrap justify-center gap-3">
        {handleRetry && (
          <button
            onClick={handleRetry}
            className="brand-grad inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
          >
            ↺ Try again
          </button>
        )}

        <Link
          href="/"
          className="glass inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        >
          ← Dashboard
        </Link>
      </div>
    </div>
  );
}
