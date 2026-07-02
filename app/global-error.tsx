"use client";

// global-error renders *outside* the root layout — it must own its html/body.
// Keep this file minimal: inline styles only (no globals.css import).
// LanguageProvider is NOT available here, so we read the locale defensively
// from localStorage / document.documentElement.lang and default to "en".

import { useEffect, useState } from "react";
import Link from "next/link";

type Locale = "en" | "zh";

/** Read locale without the LanguageProvider (best-effort, default "en"). */
function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem("fg-locale");
    if (stored === "en" || stored === "zh") return stored;
    if (
      typeof document !== "undefined" &&
      document.documentElement.lang === "zh"
    )
      return "zh";
  } catch {
    // localStorage / document unavailable (SSR guard)
  }
  return "en";
}

/** Inline bilingual dictionary — no dependency on catalog imports. */
const DICT: Record<Locale, Record<string, string>> = {
  en: {
    pageTitle:  "Something went wrong · FutureGrid",
    heading:    "Something went wrong",
    body:       "An unexpected error disrupted the grid.",
    errorId:    "Error ID",
    tryAgain:   "↺ Try again",
    goHome:     "← Go home",
  },
  zh: {
    pageTitle:  "出了些问题 · FutureGrid",
    heading:    "出了些问题",
    body:       "网格发生了意外错误。",
    errorId:    "错误 ID",
    tryAgain:   "↺ 重试",
    goHome:     "← 返回首页",
  },
};

export default function GlobalError({
  error,
  unstable_retry,
  reset,
}: {
  error: Error & { digest?: string };
  unstable_retry?: () => void;
  reset?: () => void;
}) {
  const handleRetry = unstable_retry ?? reset;

  // Start with "en" for SSR/SSG; correct to detected locale on mount.
  const [locale, setLocale] = useState<Locale>("en");
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setLocale(detectLocale()); }, []);

  const d = DICT[locale];

  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* React title tag — metadata exports are not supported in global-error */}
        <title>{d.pageTitle}</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07080d",
          color: "#e4e4e7",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem 1.5rem",
            maxWidth: 480,
            width: "100%",
          }}
        >
          {/* Brand logo mark */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #8b5cf6, #22d3ee)",
              color: "#fff",
              fontWeight: 900,
              fontSize: 14,
              letterSpacing: "-0.04em",
              marginBottom: "1.5rem",
            }}
          >
            FG
          </div>

          {/* Gradient headline */}
          <h1
            style={{
              margin: "0 0 0.75rem",
              fontSize: "clamp(1.5rem, 5vw, 2rem)",
              fontWeight: 800,
              lineHeight: 1.2,
              background: "linear-gradient(90deg, #8b5cf6, #22d3ee)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {d.heading}
          </h1>

          <p
            style={{
              margin: "0 0 0.5rem",
              fontSize: "1rem",
              color: "#a1a1aa",
              lineHeight: 1.6,
            }}
          >
            {d.body}
          </p>

          {/* Digest for support — shown only when available */}
          {error.digest && (
            <p
              style={{
                margin: "0 0 1.5rem",
                fontSize: "0.75rem",
                color: "#52525b",
                fontFamily: "monospace",
              }}
            >
              {d.errorId}: {error.digest}
            </p>
          )}

          {/* Divider hairline */}
          <div
            aria-hidden="true"
            style={{
              height: 1,
              border: "none",
              background:
                "linear-gradient(90deg, transparent 0%, #8b5cf6 30%, #22d3ee 70%, transparent 100%)",
              margin: "1.5rem auto",
              maxWidth: 192,
            }}
          />

          {/* Actions */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
            }}
          >
            {handleRetry && (
              <button
                onClick={handleRetry}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.625rem 1.25rem",
                  borderRadius: 9999,
                  border: "none",
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #8b5cf6, #22d3ee)",
                  color: "#fff",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  lineHeight: 1,
                  outline: "none",
                }}
                onFocus={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.outlineOffset =
                    "2px";
                  (e.currentTarget as HTMLButtonElement).style.outline =
                    "2px solid #a78bfa";
                }}
                onBlur={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.outline = "none";
                }}
              >
                {d.tryAgain}
              </button>
            )}

            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.625rem 1.25rem",
                borderRadius: 9999,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#d4d4d8",
                fontSize: "0.875rem",
                fontWeight: 500,
                textDecoration: "none",
                lineHeight: 1,
                outline: "none",
              }}
              onFocus={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.outlineOffset =
                  "2px";
                (e.currentTarget as HTMLAnchorElement).style.outline =
                  "2px solid #a78bfa";
              }}
              onBlur={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.outline = "none";
              }}
            >
              {d.goHome}
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
