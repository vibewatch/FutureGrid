"use client";

import Link from "next/link";
import { useId, useMemo } from "react";
import {
  getEvidenceConvergence,
  type EvidenceConfidence,
  type EvidenceConvergenceItem,
  type EvidenceStatus,
} from "@/lib/evidence";
import { useT } from "@/lib/i18n/useT";

// ---------------------------------------------------------------------------
// Status / confidence display helpers (reuse analysis namespace keys)
// Non-color text labels back every status so the strip is not color-only.
// ---------------------------------------------------------------------------
const STATUS_STYLES: Record<EvidenceStatus, { badge: string; dot: string }> = {
  agreement: {
    badge: "border-emerald-400/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-400",
  },
  mixed: {
    badge: "border-amber-400/35 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-400",
  },
  "coverage-gap": {
    badge: "border-rose-400/35 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-400",
  },
  watch: {
    badge: "border-cyan-400/35 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    dot: "bg-cyan-400",
  },
};

const STATUS_LABEL_KEYS: Record<EvidenceStatus, string> = {
  agreement: "evidenceStatusAgreement",
  mixed: "evidenceStatusMixed",
  "coverage-gap": "evidenceStatusCoverageGap",
  watch: "evidenceStatusWatch",
};

const CONFIDENCE_LABEL_KEYS: Record<EvidenceConfidence, string> = {
  high: "evidenceConfidenceHigh",
  medium: "evidenceConfidenceMedium",
  low: "evidenceConfidenceLow",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function EvidenceConvergenceStrip() {
  const t = useT("analysis");
  const headingId = useId();
  const { summary, items } = useMemo(() => getEvidenceConvergence(), []);
  const generatedOn = summary.generatedAt.slice(0, 10);

  return (
    <section aria-labelledby={headingId} className="space-y-4">
      {/* Strip header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500">
            {t("convergenceStripEyebrow")}
          </p>
          <h2 id={headingId} className="mt-1 text-xl font-bold text-gradient">
            {t("convergenceStripTitle")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t("convergenceStripExplainer")}
          </p>
        </div>
        {/* Freshness cue — reflects the convergence summary's own generatedAt. */}
        <span
          className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 sm:mt-1"
          title={t("convergenceStripGeneratedLabel", { date: generatedOn })}
        >
          {t("convergenceStripGeneratedLabel", { date: generatedOn })}
        </span>
      </div>

      {/* Strip-level caveat — one canonical caveat for the whole convergence. */}
      <p className="rounded-2xl border border-cyan-400/25 bg-cyan-500/10 p-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <span className="font-semibold">{t("convergenceStripCaveatLabel")}: </span>
        {summary.caveat}
      </p>

      {/* Convergence item cards */}
      <ol
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        aria-label={t("convergenceStripAria")}
      >
        {items.map((item: EvidenceConvergenceItem) => (
          <li key={item.id} className="flex">
            <article className="glass flex w-full flex-col gap-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
              {/* Status + confidence badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[item.status].badge}`}
                >
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${STATUS_STYLES[item.status].dot}`}
                    aria-hidden="true"
                  />
                  {t(STATUS_LABEL_KEYS[item.status])}
                </span>
                <span className="rounded-full border border-zinc-200 bg-white/70 px-2.5 py-0.5 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-300">
                  {t(CONFIDENCE_LABEL_KEYS[item.confidence])}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold leading-snug text-zinc-900 dark:text-white">
                {item.title}
              </h3>

              {/* Single canonical drill-down link (primaryHref only) */}
              <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                <Link
                  href={item.primaryHref}
                  aria-label={t("convergenceStripViewLinkAria", { title: item.title })}
                  className="rounded-full border border-violet-400/35 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-700 transition-colors hover:bg-violet-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400 dark:text-violet-300"
                >
                  {t("convergenceStripViewLink")} →
                </Link>
              </div>
            </article>
          </li>
        ))}
      </ol>
    </section>
  );
}
