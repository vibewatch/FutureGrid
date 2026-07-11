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
// ROW_H must accommodate 3 bars + gaps per country group
const ROW_H = 28;
const BAR_H = 7;
const BAR_GAP = 1.5;
// Shared x-axis max — covers the dataset maximum of ~70.1%; round up to 75
const SCALE_MAX = 75;

// Non-color encoding: three violet/cyan shades with distinct luminance levels.
// Opacity differences allow grayscale differentiation.
const PERIOD_FILL: Record<"h1" | "h2" | "q1", { fill: string; opacity: number }> = {
  h1: { fill: "#8b5cf6", opacity: 0.35 }, // violet — lightest
  h2: { fill: "#8b5cf6", opacity: 0.68 }, // violet — medium
  q1: { fill: "#06b6d4", opacity: 1.0 },  // cyan   — full opacity, distinct hue
};

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
  h1Label,
  h2Label,
  q1Label,
  axisLabel,
}: {
  rows: DiffusionComparisonRow[];
  h1Label: string;
  h2Label: string;
  q1Label: string;
  axisLabel: string;
}) {
  const n = rows.length;
  const plotW = CHART_W - MARGIN.left - MARGIN.right;
  const plotH = n * ROW_H;
  const totalH = MARGIN.top + plotH + MARGIN.bottom;

  function scaleX(v: number) {
    return (v / SCALE_MAX) * plotW;
  }

  const xTicks = [0, 25, 50, SCALE_MAX];

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
              fill="currentColor" fillOpacity="0.45"
            >
              {tick}%
            </text>
          </g>
        );
      })}

      {/* ─── Country rows ─────────────────────────── */}
      {rows.map((row, ri) => {
        const rowY = MARGIN.top + ri * ROW_H;
        // Vertically center the 3-bar group within the row
        const groupH = 3 * BAR_H + 2 * BAR_GAP;
        const groupY = rowY + (ROW_H - groupH) / 2;

        const h1Y = groupY;
        const h2Y = groupY + BAR_H + BAR_GAP;
        const q1Y = groupY + 2 * (BAR_H + BAR_GAP);

        const barX = MARGIN.left;
        const h1W = Math.max(scaleX(row.h1_2025), 2);
        const h2W = Math.max(scaleX(row.h2_2025), 2);
        const q1W = Math.max(scaleX(row.q1_2026), 2);

        return (
          <g key={row.iso3}>
            {/* Country name label */}
            <text
              x={MARGIN.left - 8}
              y={rowY + ROW_H / 2 + 3.5}
              textAnchor="end"
              fontSize="11"
              fill="currentColor"
              fillOpacity="0.8"
            >
              {row.name}
            </text>

            {/* H1 bar */}
            <rect
              x={barX} y={h1Y} width={h1W} height={BAR_H}
              fill={PERIOD_FILL.h1.fill} opacity={PERIOD_FILL.h1.opacity}
              rx="1"
            />

            {/* H2 bar */}
            <rect
              x={barX} y={h2Y} width={h2W} height={BAR_H}
              fill={PERIOD_FILL.h2.fill} opacity={PERIOD_FILL.h2.opacity}
              rx="1"
            />

            {/* Q1 bar */}
            <rect
              x={barX} y={q1Y} width={q1W} height={BAR_H}
              fill={PERIOD_FILL.q1.fill} opacity={PERIOD_FILL.q1.opacity}
              rx="1"
            />

            {/* Q1 value label (shown at bar end for readability) */}
            <text
              x={barX + q1W + 4}
              y={q1Y + BAR_H - 0.5}
              fontSize="9" fill="currentColor" fillOpacity="0.6"
            >
              {row.q1_2026.toFixed(1)}%
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
        fill="currentColor" fillOpacity="0.4"
      >
        {axisLabel}
      </text>

      {/* ─── Legend ────────────────────────────────── */}
      {[
        { key: "h1" as const, label: h1Label },
        { key: "h2" as const, label: h2Label },
        { key: "q1" as const, label: q1Label },
      ].map(({ key, label }, i) => {
        const lx = MARGIN.left + i * 110;
        const ly = MARGIN.top + plotH + 42;
        return (
          <g key={key}>
            <rect
              x={lx} y={ly - 7}
              width={10} height={7}
              fill={PERIOD_FILL[key].fill}
              opacity={PERIOD_FILL[key].opacity}
              rx="1"
            />
            <text
              x={lx + 13} y={ly - 0.5}
              fontSize="10" fill="currentColor" fillOpacity="0.55"
            >
              {label}
            </text>
          </g>
        );
      })}
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

  return (
    <section
      id={SECTION_IDS.diffusionGrowthComparison}
      className="scroll-mt-24"
      aria-labelledby={headingId}
    >
      {/* ─── Section header ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
            {t("diffusionGrowthEyebrow")}
          </p>
          <h2
            id={headingId}
            className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-gradient"
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
        {(
          [
            { key: "h1" as const, label: t("diffusionGrowthH1Label") },
            { key: "h2" as const, label: t("diffusionGrowthH2Label") },
            { key: "q1" as const, label: t("diffusionGrowthQ1Label") },
          ] as const
        ).map(({ key, label }) => (
          <div
            key={key}
            role="listitem"
            className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400"
          >
            <span
              className="inline-block h-3 w-3 rounded-sm"
              style={{
                backgroundColor: PERIOD_FILL[key].fill,
                opacity: PERIOD_FILL[key].opacity,
              }}
              aria-hidden="true"
            />
            {label}
          </div>
        ))}
      </div>

      {/* ─── Chart ─── */}
      <div className="mt-5 glass rounded-2xl p-4 sm:p-6 overflow-x-auto">
        <figure aria-label={t("diffusionGrowthFigureAria")}>
          <BarChart
            rows={data}
            h1Label={t("diffusionGrowthH1Label")}
            h2Label={t("diffusionGrowthH2Label")}
            q1Label={t("diffusionGrowthQ1Label")}
            axisLabel={t("diffusionGrowthAxisLabel")}
          />
          {/* Screen-reader summary list — all values readable without color */}
          <figcaption className="sr-only">
            <ul>
              {data.map((row) => (
                <li key={row.iso3}>
                  {row.name}: {t("diffusionGrowthH1Label")}{" "}
                  {fmtPct(row.h1_2025, numberLocale)},{" "}
                  {t("diffusionGrowthH2Label")}{" "}
                  {fmtPct(row.h2_2025, numberLocale)},{" "}
                  {t("diffusionGrowthQ1Label")}{" "}
                  {fmtPct(row.q1_2026, numberLocale)}
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
              <th scope="col" className="px-4 py-3 text-right">
                {t("diffusionGrowthColH1")}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t("diffusionGrowthColH2")}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t("diffusionGrowthColQ1")}
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                {t("diffusionGrowthColChange")}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const delta = Math.round((row.q1_2026 - row.h1_2025) * 10) / 10;
              return (
                <tr
                  key={row.iso3}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/70"
                >
                  <th scope="row" className="px-4 py-3 text-left font-medium text-zinc-900 dark:text-white">
                    {row.name}
                    <span className="ml-2 text-xs font-normal text-zinc-500">{row.iso3}</span>
                  </th>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {fmtPct(row.h1_2025, numberLocale)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {fmtPct(row.h2_2025, numberLocale)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {fmtPct(row.q1_2026, numberLocale)}
                  </td>
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
