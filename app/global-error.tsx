"use client";

// global-error renders *outside* the root layout — it must own its html/body.
// Keep this file minimal: inline styles only (no globals.css import).

import Link from "next/link";

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

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* React title tag — metadata exports are not supported in global-error */}
        <title>Something went wrong · FutureGrid</title>
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
            Something went wrong
          </h1>

          <p
            style={{
              margin: "0 0 0.5rem",
              fontSize: "1rem",
              color: "#a1a1aa",
              lineHeight: 1.6,
            }}
          >
            An unexpected error disrupted the grid.
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
              Error ID: {error.digest}
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
                ↺ Try again
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
              ← Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
