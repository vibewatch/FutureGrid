"use client";

import Link from "next/link";
import { useId } from "react";
import { useT, useLocale } from "@/lib/i18n/useT";
import { SECTION_IDS } from "@/lib/section-anchors";
import type { DiffusionComparisonRow } from "@/lib/data";
import type { Locale } from "@/lib/i18n/types";

// ─── Layout constants ─────────────────────────────────────────────────────────

const CHART_W = 680;
const MARGIN = { top: 36, right: 44, bottom: 44, left: 152 };
// ROW_H must accommodate one bar per period + gaps per country group
const ROW_H = 34;
const BAR_H = 6;
const BAR_GAP = 2;
const X_TICKS = [0, 25, 50, 75, 100];

type PeriodKey = "h1_2025" | "h2_2025" | "q1_2026" | "q2_2026";

// Ordered survey waves → single-hue ordinal ramp (light → dark), validated for
// both light and dark surfaces. Lightness alone separates periods in grayscale.
const PERIODS: { key: PeriodKey; fill: string; labelKey: string; colKey: string }[] = [
  { key: "h1_2025", fill: "#86b6ef", labelKey: "diffusionGrowthH1Label", colKey: "diffusionGrowthColH1" },
  { key: "h2_2025", fill: "#5598e7", labelKey: "diffusionGrowthH2Label", colKey: "diffusionGrowthColH2" },
  { key: "q1_2026", fill: "#2a78d6", labelKey: "diffusionGrowthQ1Label", colKey: "diffusionGrowthColQ1" },
  { key: "q2_2026", fill: "#1c5cab", labelKey: "diffusionGrowthQ2Label", colKey: "diffusionGrowthColQ2" },
];
const LATEST = PERIODS[PERIODS.length - 1];

const NUMBER_LOCALES: Record<Locale, string> = { en: "en-US", zh: "zh-CN" };

function fmtPct(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value) + "%";
}

function fmtDelta(value: number, locale: string): string {
  const abs = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(Math.abs(value));
  return value >= 0 ? `+${abs}` : `\u2212${abs}`;
}

// ─── Inner bar chart (pure declarative SVG, no D3, no useEffect) ─────────────

function BarChart({
  rows,
  labels,
  axisLabel,
}: {
  rows: DiffusionComparisonRow[];
  labels: Record<PeriodKey, string>;
  axisLabel: string;
}) {
  const n = rows.length;
  const plotW = CHART_W - MARGIN.left - MARGIN.right;
  const plotH = n * ROW_H;
  const totalH = MARGIN.top + plotH + MARGIN.bottom;
  // Shared x-axis max rounded up to the next 25pp so the leader never clips
  const maxValue = Math.max(...rows.flatMap((r) => PERIODS.map((p) => r[p.key])), 25);
  const scaleMax = Math.ceil(maxValue / 25) * 25;
  const xTicks = X_TICKS.filter((tick) => tick <= scaleMax);

  function scaleX(v: number) {
    return (v / scaleMax) * plotW;
  }

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${CHART_W} ${totalH}`}
      className="w-full"
      style={{ height: "auto" }}
    >
      {/* ─── X-axis grid lines and tick labels ───── */}
      {xTicks.map((tick) => {
        const x = MARGIN.left + scaleX(tick);
        return (
          <g key={tick}>
            <line
              x1={x} y1={MARGIN.top - 6}
              x2={x} y2={MARGIN.top + plotH}
              stroke="currentColor" strokeOpacity="0.1" strokeWidth="1"
            />
            <text
              x={x} y={MARGIN.top - 10}
              textAnchor="middle" fontSize="10"
              fill="currentColor" fillOpacity="0.55"
            >
              {tick}%
            </text>
          </g>
        );
      })}

      {/* ─── Country rows ─────────────────────────── */}
      {rows.map((row, ri) => {
        const rowY = MARGIN.top + ri * ROW_H;
        // Vertically center the bar group within the row
        const groupH = PERIODS.length * BAR_H + (PERIODS.length - 1) * BAR_GAP;
        const groupY = rowY + (ROW_H - groupH) / 2;
        const latestW = Math.max(scaleX(row[LATEST.key]), 2);
        const latestY = groupY + (PERIODS.length - 1) * (BAR_H + BAR_GAP);

        return (
          <g key={row.iso3}>
            <title>
              {`${row.name}: ${PERIODS.map((p) => `${labels[p.key]} ${row[p.key].toFixed(1)}%`).join(", ")}`}
            </title>
            {/* Country name label */}
            <text
              x={MARGIN.left - 8}
              y={rowY + ROW_H / 2 + 3.5}
              textAnchor="end"
              fontSize="11"
              fill="currentColor"
              fillOpacity="0.85"
            >
              {row.name}
            </text>

            {PERIODS.map((p, pi) => (
              <rect
                key={p.key}
                x={MARGIN.left}
                y={groupY + pi * (BAR_H + BAR_GAP)}
                width={Math.max(scaleX(row[p.key]), 2)}
                height={BAR_H}
                fill={p.fill}
                rx="1.5"
              />
            ))}

            {/* Latest value label (selective direct label at the bar end) */}
            <text
              x={MARGIN.left + latestW + 4}
              y={latestY + BAR_H - 0.5}
              fontSize="9" fill="currentColor" fillOpacity="0.7"
            >
              {row[LATEST.key].toFixed(1)}%
            </text>

            {/* Thin row separator */}
            {ri < n - 1 && (
              <line
                x1={MARGIN.left} y1={rowY + ROW_H}
                x2={MARGIN.left + plotW} y2={rowY + ROW_H}
                stroke="currentColor" strokeOpacity="0.06" strokeWidth="1"
              />
            )}
          </g>
        );
      })}

      {/* ─── Axis baseline ─────────────────────────── */}
      <line
        x1={MARGIN.left} y1={MARGIN.top + plotH}
        x2={MARGIN.left + plotW} y2={MARGIN.top + plotH}
        stroke="currentColor" strokeOpacity="0.2" strokeWidth="1"
      />

      {/* ─── X-axis label ──────────────────────────── */}
      <text
        x={MARGIN.left + plotW / 2}
        y={MARGIN.top + plotH + 28}
        textAnchor="middle" fontSize="10"
        fill="currentColor" fillOpacity="0.5"
      >
        {axisLabel}
      </text>
    </svg>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

export default function DiffusionGrowthComparison({
  data,
}: {
  data: DiffusionComparisonRow[];
}) {
  const t = useT("global");
  const locale = useLocale();
  const numberLocale = NUMBER_LOCALES[locale];
  const headingId = useId();

  if (data.length === 0) return null;
  const periodLabels = Object.fromEntries(PERIODS.map((p) => [p.key, t(p.labelKey)])) as Record<PeriodKey, string>;

  return (
    <section
      id={SECTION_IDS.diffusionGrowthComparison}
      className="scroll-mt-24"
      aria-labelledby={headingId}
    >
      {/* ─── Section header ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
            {t("diffusionGrowthEyebrow")}
          </p>
          <h2
            id={headingId}
            className="mt-1 text-lg font-semibold tracking-tight text-gradient"
          >
            {t("diffusionGrowthTitle")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t("diffusionGrowthSubtitle")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("diffusionGrowthGuardrail")}
          </p>
        </div>
        <Link
          href="/sources"
          className="shrink-0 text-xs text-zinc-500 hover:text-violet-400 underline underline-offset-2 transition-colors"
        >
          {t("diffusionGrowthSourceLink")}
        </Link>
      </div>

      {/* ─── Legend (non-SVG, keyboard accessible) ─── */}
      <div
        role="list"
        aria-label={t("diffusionGrowthLegendLabel")}
        className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5"
      >
        {PERIODS.map((p) => (
          <div
            key={p.key}
            role="listitem"
            className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
          >
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{ backgroundColor: p.fill }}
              aria-hidden="true"
            />
            {t(p.labelKey)}
          </div>
        ))}
      </div>

      {/* ─── Chart ─── */}
      <div className="mt-5 glass rounded-2xl p-4 sm:p-6 overflow-x-auto">
        <figure aria-label={t("diffusionGrowthFigureAria")}>
          <BarChart
            rows={data}
            labels={periodLabels}
            axisLabel={t("diffusionGrowthAxisLabel")}
          />
          {/* Screen-reader summary list — all values readable without color */}
          <figcaption className="sr-only">
            <ul>
              {data.map((row) => (
                <li key={row.iso3}>
                  {row.name}:{" "}
                  {PERIODS.map((p) => `${periodLabels[p.key]} ${fmtPct(row[p.key], numberLocale)}`).join(", ")}
                </li>
              ))}
            </ul>
          </figcaption>
        </figure>
      </div>

      {/* ─── Visible accessible table ─── */}
      <div className="mt-5 overflow-x-auto rounded-2xl border border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/50">
        <table className="min-w-full text-sm">
          <caption className="sr-only">{t("diffusionGrowthTableCaption")}</caption>
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs uppercase tracking-widest text-zinc-500 dark:border-zinc-800">
              <th scope="col" className="px-4 py-3">
                {t("diffusionGrowthColCountry")}
              </th>
              {PERIODS.map((p) => (
                <th key={p.key} scope="col" className="px-4 py-3 text-right">
                  {t(p.colKey)}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right">
                {t("diffusionGrowthColChange")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const delta = Math.round((row[LATEST.key] - row.h1_2025) * 10) / 10;
              return (
                <tr
                  key={row.iso3}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/70"
                >
                  <th scope="row" className="px-4 py-3 text-left font-medium text-zinc-900 dark:text-white">
                    {row.name}
                    <span className="ml-2 text-xs font-normal text-zinc-500">{row.iso3}</span>
                  </th>
                  {PERIODS.map((p) => (
                    <td key={p.key} className="px-4 py-3 text-right tabular-nums">
                      {fmtPct(row[p.key], numberLocale)}
                    </td>
                  ))}
                  <td
                    className={`px-4 py-3 text-right tabular-nums font-semibold ${
                      delta >= 0
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400"
                    }`}
                  >
                    {fmtDelta(delta, numberLocale)}pp
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Source caveat ─── */}
      <p className="mt-4 rounded-xl border border-amber-300/40 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
        {t("diffusionGrowthCaveat")}
      </p>
    </section>
  );
}
