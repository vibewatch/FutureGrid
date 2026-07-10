"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import DataAsOfBadge from "@/components/ui/DataAsOfBadge";
import GuardrailBadge from "@/components/ui/GuardrailBadge";
import { useT } from "@/lib/i18n/useT";
import { useFormatters } from "@/lib/i18n/useFormatters";
import { colorForRisk } from "@/lib/utils";
import type {
  ReskillingBridgeData,
  ReskillingBridgeDestination,
} from "@/lib/reskilling-bridge";

type DestSortKey = "score" | "exposure" | "salary" | "openings";

function transitionScoreColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 50) return "#eab308";
  return "#f97316";
}

function bottleneckScoreColor(score: number, max: number): string {
  const ratio = max > 0 ? score / max : 0;
  if (ratio >= 0.75) return "#ef4444";
  if (ratio >= 0.5) return "#f97316";
  if (ratio >= 0.25) return "#eab308";
  return "#22c55e";
}

function sortDestinations(
  destinations: ReskillingBridgeDestination[],
  key: DestSortKey,
): ReskillingBridgeDestination[] {
  return [...destinations].sort((a, b) => {
    switch (key) {
      case "exposure":
        return b.exposureDropPts - a.exposureDropPts;
      case "salary":
        return b.salaryDelta - a.salaryDelta;
      case "openings":
        if (a.annualOpenings == null && b.annualOpenings == null) return 0;
        if (a.annualOpenings == null) return 1;
        if (b.annualOpenings == null) return -1;
        return b.annualOpenings - a.annualOpenings;
      default:
        return b.transitionScore - a.transitionScore;
    }
  });
}

export default function ReskillingBridge({ data }: { data: ReskillingBridgeData }) {
  const t = useT("skills");
  const { formatCurrency, formatNumber } = useFormatters();
  const headingId = useId();

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sortKey, setSortKey] = useState<DestSortKey>("score");
  const [caveatsOpen, setCaveatsOpen] = useState(false);

  // Roving-tabindex listbox: focus lives on the option buttons themselves
  // (one is tabbable, the rest are tabIndex={-1}). No aria-activedescendant —
  // the container is not focusable and does not manage a virtual focus.
  const originRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selectedOrigin = data.origins[selectedIdx] ?? null;
  const sortedDestinations = selectedOrigin
    ? sortDestinations(selectedOrigin.destinations, sortKey)
    : [];

  const scoreMax = data.summary.bottleneckScoreWindow.max;

  function moveSelection(nextIdx: number) {
    const clamped = Math.max(0, Math.min(data.origins.length - 1, nextIdx));
    setSelectedIdx(clamped);
    originRefs.current[clamped]?.focus();
  }

  function handleOriginKeyDown(e: React.KeyboardEvent, idx: number) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveSelection(idx + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveSelection(idx - 1);
        break;
      case "Home":
        e.preventDefault();
        moveSelection(0);
        break;
      case "End":
        e.preventDefault();
        moveSelection(data.origins.length - 1);
        break;
    }
  }

  return (
    <section aria-labelledby={headingId} className="space-y-5">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500 dark:text-violet-300">
            {t("bridgeEyebrow")}
          </p>
          <h2
            id={headingId}
            className="mt-1 text-xl font-bold tracking-tight text-gradient"
          >
            {t("bridgeTitle")}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
            {t("bridgeSubhead")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 pt-1">
          <GuardrailBadge kind="proxy" />
          <DataAsOfBadge datasetIds={data.methodology.datasetBadgeIds} />
        </div>
      </div>

      {/* ── Caveats ─────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-amber-400/25 bg-amber-500/[0.08] p-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-amber-700 dark:text-amber-300">
            {t("bridgeCaveatsLabel")}
          </span>
          <button
            type="button"
            onClick={() => setCaveatsOpen((v) => !v)}
            aria-expanded={caveatsOpen}
            className="text-amber-600 dark:text-amber-400 hover:underline focus:outline-none focus:ring-2 focus:ring-amber-400 rounded px-1"
          >
            {caveatsOpen ? t("bridgeCaveatsCollapse") : t("bridgeCaveatsExpand")}
          </button>
        </div>
        {caveatsOpen && (
          <ul className="mt-2 space-y-1 list-disc list-inside text-zinc-600 dark:text-zinc-400">
            {data.methodology.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Controls: summary + destination sort ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("bridgeSummaryText", {
            origins: String(data.summary.originsReturned),
            pairs: String(data.summary.totalDestinationPairs),
          })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-zinc-500">{t("bridgeDestSortLabel")}</span>
          {(
            [
              { key: "score" as DestSortKey, label: t("bridgeDestSortScore") },
              { key: "exposure" as DestSortKey, label: t("bridgeDestSortExposure") },
              { key: "salary" as DestSortKey, label: t("bridgeDestSortSalary") },
              { key: "openings" as DestSortKey, label: t("bridgeDestSortOpenings") },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSortKey(key)}
              aria-pressed={sortKey === key}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                sortKey === key
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Two-panel layout ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 items-start">
        {/* ── LEFT: Origins listbox ─────────────────────────────────────── */}
        <div
          className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-500 dark:text-violet-300">
              {t("bridgeOriginsHeader")}
            </p>
          </div>
          <div
            role="listbox"
            aria-label={t("bridgeOriginsLabel")}
            className="divide-y divide-zinc-100 dark:divide-zinc-800/60 max-h-[540px] overflow-y-auto overscroll-contain"
            aria-live="polite"
            aria-atomic="false"
          >
            {data.origins.map((origin, idx) => {
              const isSelected = idx === selectedIdx;
              const bColor = bottleneckScoreColor(origin.bottleneckScore, scoreMax);
              const lcaText =
                origin.latestLcas == null
                  ? t("bridgeNullLca")
                  : t("bridgeLcaCount", {
                      n: formatNumber(origin.latestLcas),
                    });
              const exposureText =
                origin.aiExposure == null
                  ? t("bridgeNullAiExposure")
                  : `${formatNumber(origin.aiExposure * 100, 0)}%`;
              const barWidth =
                scoreMax > 0
                  ? `${Math.round((origin.bottleneckScore / scoreMax) * 100)}%`
                  : "0%";

              return (
                <button
                  key={origin.socCode}
                  id={`bridge-origin-${idx}`}
                  ref={(el) => {
                    originRefs.current[idx] = el;
                  }}
                  role="option"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setSelectedIdx(idx)}
                  onKeyDown={(e) => handleOriginKeyDown(e, idx)}
                  className={`w-full text-left px-4 py-3 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-violet-500 ${
                    isSelected
                      ? "bg-violet-50 dark:bg-violet-900/20"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <span
                        className="shrink-0 mt-0.5 w-5 text-right text-[11px] tabular-nums text-zinc-400"
                        aria-hidden="true"
                      >
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-white leading-tight line-clamp-2">
                          {origin.title}
                        </p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">
                          {origin.socCode}
                        </p>
                      </div>
                    </div>
                    <span
                      className="shrink-0 mt-0.5 text-sm font-bold tabular-nums"
                      style={{ color: bColor }}
                      aria-label={`${t("bridgeScoreLabel")}: ${formatNumber(origin.bottleneckScore, 1)}`}
                    >
                      {formatNumber(origin.bottleneckScore, 1)}
                    </span>
                  </div>

                  {/* Score bar (decorative — aria-hidden) */}
                  <div
                    className="mt-2 ml-7 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300"
                      style={{ width: barWidth, backgroundColor: bColor }}
                    />
                  </div>

                  {/* Signal pills */}
                  <div className="mt-1.5 ml-7 flex flex-wrap gap-1">
                    <span
                      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400"
                      aria-label={`${t("bridgeLcaLabel")}: ${lcaText}`}
                    >
                      {lcaText}
                    </span>
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] ${
                        origin.aiExposure == null
                          ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                          : "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                      }`}
                      aria-label={`${t("bridgeAiExposureLabel")}: ${exposureText}`}
                    >
                      {t("bridgeAiExposureLabel")} {exposureText}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT: Destinations ────────────────────────────────────────── */}
        <div className="space-y-3" aria-live="polite" aria-atomic="false">
          {selectedOrigin && (
            <div className="px-1">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                {t("bridgeDestHeading", { title: selectedOrigin.title })}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">{t("bridgeDestHint")}</p>
            </div>
          )}

          {sortedDestinations.length === 0 && (
            <div className="glass bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl py-10 flex items-center justify-center">
              <p className="text-zinc-500 text-sm">{t("bridgeNoDestinations")}</p>
            </div>
          )}

          {sortedDestinations.map((dest, rank) => {
            const riskColor = colorForRisk(dest.automationRisk ?? "");
            const tColor = transitionScoreColor(dest.transitionScore);

            const salarySign = dest.salaryDelta >= 0 ? "+" : "−";
            const salaryAbs = Math.abs(dest.salaryDelta);
            const salaryCls =
              dest.salaryDelta > 0
                ? "text-emerald-600 dark:text-emerald-400"
                : dest.salaryDelta < 0
                ? "text-red-600 dark:text-red-400"
                : "text-zinc-500";

            const openingsText =
              dest.annualOpenings == null
                ? t("bridgeNullOpenings")
                : `${formatNumber(dest.annualOpenings)}${t("bridgePerYear")}`;
            const openingsCls =
              dest.annualOpenings == null
                ? "text-zinc-400 italic"
                : "text-zinc-700 dark:text-zinc-300";

            return (
              <article
                key={dest.socCode}
                className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-3"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      className="shrink-0 mt-0.5 w-5 text-right text-[11px] tabular-nums text-zinc-400"
                      aria-hidden="true"
                    >
                      {rank + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight">
                        {dest.title}
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {dest.socCode}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {/* Transition score — numeric to avoid color-only encoding */}
                    <span
                      className="text-sm font-bold tabular-nums"
                      style={{ color: tColor }}
                      aria-label={`${t("bridgeTransitionScore")}: ${formatNumber(dest.transitionScore, 1)} / 100`}
                    >
                      {formatNumber(dest.transitionScore, 1)}
                      <span className="font-normal text-zinc-400 text-xs ml-0.5">
                        /100
                      </span>
                    </span>

                    {/* Automation risk badge */}
                    {dest.automationRisk && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${riskColor}22`,
                          color: riskColor,
                        }}
                        aria-label={`${t("bridgeAutomationRisk")}: ${dest.automationRisk}`}
                      >
                        {dest.automationRisk}
                      </span>
                    )}
                    {/* Trailing space ensures word-boundary after risk text in textContent */}
                    {" "}
                  </div>
                </div>

                {/* Metrics row */}
                <dl className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs">
                  <div className="flex items-center gap-1">
                    <dt className="text-zinc-500">{t("bridgeExposureDrop")}</dt>
                    <dd className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      −{formatNumber(dest.exposureDropPts, 1)}{t("bridgePts")}
                    </dd>
                  </div>
                  <div className="flex items-center gap-1">
                    <dt className="text-zinc-500">{t("bridgeSalaryDelta")}</dt>
                    <dd className={`font-semibold tabular-nums ${salaryCls}`}>
                      {salarySign}{formatCurrency(salaryAbs)}
                    </dd>
                  </div>
                  <div className="flex items-center gap-1">
                    <dt className="text-zinc-500">{t("bridgeAnnualOpenings")}</dt>
                    <dd className={`font-semibold tabular-nums ${openingsCls}`}>
                      {openingsText}
                    </dd>
                  </div>
                  <div className="flex items-center gap-1">
                    <dt className="text-zinc-500">{t("bridgeAiExposureLabel")}</dt>
                    <dd className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatNumber(dest.aiExposure * 100, 0)}%
                    </dd>
                  </div>
                </dl>

                {/* Skills */}
                {(dest.sharedSkills.length > 0 || dest.missingSkills.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-zinc-100 dark:border-zinc-800">
                    {dest.sharedSkills.length > 0 && (
                      <div>
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-1"
                          id={`bridge-shared-${dest.socCode}`}
                        >
                          {t("bridgeSharedSkills")}
                        </p>
                        <ul
                          aria-labelledby={`bridge-shared-${dest.socCode}`}
                          className="flex flex-wrap gap-1"
                        >
                          {dest.sharedSkills.map((s) => (
                            <li key={s}>
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700/30 text-emerald-700 dark:text-emerald-300">
                                {s}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {dest.missingSkills.length > 0 && (
                      <div>
                        <p
                          className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1"
                          id={`bridge-missing-${dest.socCode}`}
                        >
                          {t("bridgeMissingSkills")}
                        </p>
                        <ul
                          aria-labelledby={`bridge-missing-${dest.socCode}`}
                          className="flex flex-wrap gap-1"
                        >
                          {dest.missingSkills.map((s) => (
                            <li key={s}>
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-300">
                                {s}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Career detail link */}
                <div className="flex justify-end pt-1 border-t border-zinc-100 dark:border-zinc-800">
                  <Link
                    href={`/careers/${encodeURIComponent(dest.socCode)}`}
                    className="inline-flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:underline focus:outline-none focus:ring-2 focus:ring-violet-500 rounded"
                    aria-label={`${t("bridgeViewCareer")}: ${dest.title}`}
                  >
                    {t("bridgeViewCareer")} →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
