import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page Not Found · FutureGrid",
  description: "This page drifted off the grid.",
};

const NAV_LINKS = [
  { href: "/",        label: "Dashboard" },
  { href: "/careers", label: "Careers"   },
  { href: "/global",  label: "Global"    },
  { href: "/sources", label: "Sources"   },
];

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      {/* ── 404 Headline ─────────────────────────────────────────────────── */}
      <p
        aria-hidden="true"
        className="text-[clamp(6rem,20vw,12rem)] font-black leading-none tracking-tighter text-gradient select-none"
      >
        404
      </p>

      <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-white leading-snug">
        This page drifted off the grid
      </h1>

      <p className="mt-3 text-base text-zinc-400 max-w-md leading-relaxed">
        The URL you followed doesn&rsquo;t match any route in FutureGrid.
        Head back to a known destination below.
      </p>

      {/* ── Divider ──────────────────────────────────────────────────────── */}
      <hr className="divider-glow w-48 my-8" aria-hidden="true" />

      {/* ── Navigation links ─────────────────────────────────────────────── */}
      <nav aria-label="Return to a section">
        <ul className="flex flex-wrap justify-center gap-3">
          {NAV_LINKS.map(({ href, label }, i) =>
            i === 0 ? (
              /* Primary CTA — brand gradient pill */
              <li key={href}>
                <Link
                  href={href}
                  className="brand-grad inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
                >
                  ← {label}
                </Link>
              </li>
            ) : (
              /* Secondary links — glass pill */
              <li key={href}>
                <Link
                  href={href}
                  className="glass inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium text-zinc-300 hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
                >
                  {label}
                </Link>
              </li>
            )
          )}
        </ul>
      </nav>

      {/* ── Ambient glow (decorative, CSS-only — no animation) ───────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(600px, 80vw)",
            height: "min(600px, 80vw)",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)",
          }}
        />
      </div>
    </div>
  );
}
