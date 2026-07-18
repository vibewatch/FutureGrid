"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  getAIFrontierData,
  getDefinitions,
  getRecentWindow,
  formatFlop,
  type OrgLeaderboardEntry,
  type CountryLeaderboardEntry,
} from "@/lib/ai-frontier";
import { useT } from "@/lib/i18n/useT";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "orgs" | "countries";
type MetricKey =
  | "recentCount"
  | "modelCount"
  | "openWeightsCount"
  | "computeKnownCount"
  | "frontierCount"
  | "largestRun";

const METRIC_KEYS: MetricKey[] = [
  "recentCount",
  "modelCount",
  "openWeightsCount",
  "computeKnownCount",
  "frontierCount",
  "largestRun",
];

const METRIC_I18N: Record<MetricKey, { label: string; desc: string }> = {
  recentCount:       { label: "metricRecentCount",       desc: "metricRecentCountDesc" },
  modelCount:        { label: "metricModelCount",        desc: "metricModelCountDesc" },
  openWeightsCount:  { label: "metricOpenWeightsCount",  desc: "metricOpenWeightsCountDesc" },
  computeKnownCount: { label: "metricComputeKnownCount", desc: "metricComputeKnownCountDesc" },
  frontierCount:     { label: "metricFrontierCount",     desc: "metricFrontierCountDesc" },
  largestRun:        { label: "metricLargestRun",        desc: "metricLargestRunDesc" },
};

// Decorative monogram tints — chosen by a stable hash of the org name (identity
// colour, NOT rank order). Static class strings so Tailwind's JIT keeps them.
const MONO_PALETTE: string[] = [
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "bg-rose-500/10 text-rose-600 dark:text-rose-400",
];

// Local alpha-3 → alpha-2 lookup for the tracked countries. Kept in the
// component so the data layer (lib/ai-frontier.ts) stays untouched. iso3 is a
// geographic join key only; the flag glyph is decorative (aria-hidden).
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  USA: "US", CHN: "CN", KOR: "KR", FRA: "FR", GBR: "GB", CAN: "CA", ISR: "IL",
  JPN: "JP", SAU: "SA", ARE: "AE", DEU: "DE", CHE: "CH", AUS: "AU", FIN: "FI",
  NLD: "NL", CZE: "CZ", ITA: "IT", BEL: "BE", DNK: "DK", IND: "IN", POL: "PL",
  ESP: "ES", SWE: "SE", TWN: "TW", ARG: "AR", AUT: "AT", HRV: "HR", IRN: "IR",
  IRL: "IE", MYS: "MY", NOR: "NO", RUS: "RU",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getOrgValue(org: OrgLeaderboardEntry, metric: MetricKey): number {
  if (metric === "recentCount") return org.recentCount;
  if (metric === "modelCount") return org.modelCount;
  if (metric === "openWeightsCount") return org.openWeightsCount;
  if (metric === "computeKnownCount") return org.computeKnownCount;
  if (metric === "frontierCount") return org.frontierCount;
  return org.maxComputeFlop; // largestRun
}

function getCountryValue(c: CountryLeaderboardEntry, metric: MetricKey): number {
  if (metric === "recentCount") return c.recentCount;
  if (metric === "modelCount") return c.modelCount;
  if (metric === "openWeightsCount") return c.openWeightsCount;
  if (metric === "computeKnownCount") return c.computeKnownCount;
  if (metric === "frontierCount") return c.frontierCount;
  return c.maxComputeFlop; // largestRun
}

function sortByMetric<T>(
  arr: T[],
  getValue: (e: T) => number,
  getName: (e: T) => string,
): T[] {
  return arr.slice().sort(
    (a, b) => getValue(b) - getValue(a) || getName(a).localeCompare(getName(b)),
  );
}

// Fill-bar width (%) for the visible rows.
//   Count metrics: linear share of the largest visible value.
//   largestRun:    log10-normalised across visible rows with a 10% floor, so the
//                  smallest still shows a sliver (mirrors the old log bar).
function computeWidths(vals: number[], isLog: boolean): number[] {
  if (isLog) {
    const logs = vals.map((v) => (v > 0 ? Math.log10(v) : 0));
    const positives = logs.filter((_, i) => vals[i] > 0);
    const min = positives.length ? Math.min(...positives) : 0;
    const max = positives.length ? Math.max(...positives) : 0;
    return logs.map((l, i) =>
      vals[i] <= 0 ? 0 : max === min ? 100 : ((l - min) / (max - min)) * 90 + 10,
    );
  }
  const maxV = vals.length ? Math.max(...vals) : 0;
  return vals.map((v) => (maxV > 0 ? (v / maxV) * 100 : 0));
}

// Emoji flag from iso3 via alpha-2 → two Regional Indicator code points.
// Falls back to a neutral globe when iso3 is null or unmapped.
function flagEmoji(iso3: string | null): string {
  if (!iso3) return "🌐";
  const a2 = ALPHA3_TO_ALPHA2[iso3];
  if (!a2) return "🌐";
  const cps = [...a2].map((ch) => 0x1f1e6 + (ch.charCodeAt(0) - 65));
  return String.fromCodePoint(...cps);
}

// 1–2 letter monogram from the org name.
function monogram(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// Stable hash → palette index (identity colour, not rank order).
function hashIndex(name: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % mod;
}

interface ViewRow {
  key: string;
  name: string;
  kind: "flag" | "mono";
  chip: string;
  tint: string;
  rawValue: number;
  maxComputeFlop: number;
  width: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FrontierLeadersChart() {
  const t = useT("frontier");
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const [activeTab, setActiveTab] = useState<Tab>("orgs");
  const [metric, setMetric] = useState<MetricKey>("recentCount");

  // ── Data ───────────────────────────────────────────────────────────────────
  const frontierData = getAIFrontierData();
  const defs = getDefinitions();
  const recentWindow = getRecentWindow();
  const { counts, aggregates } = frontierData;
  const allOrgs = aggregates.orgLeaderboard;
  const allCountries = aggregates.countryLeaderboard;

  const isLogMetric = metric === "largestRun";

  const coveragePct = useMemo(
    () =>
      counts.withDate > 0
        ? Math.round((counts.withComputeAndDate / counts.withDate) * 1000) / 10
        : 0,
    [counts.withDate, counts.withComputeAndDate],
  );

  // ── Sorted entries ─────────────────────────────────────────────────────────
  const orgEntries = useMemo(() => {
    const sorted = sortByMetric(
      allOrgs,
      (o) => getOrgValue(o, metric),
      (o) => o.organization,
    );
    const filtered =
      metric === "largestRun" ? sorted.filter((o) => o.maxComputeFlop > 0) : sorted;
    return filtered.slice(0, 12);
  }, [allOrgs, metric]);

  const countryEntries = useMemo(() => {
    const sorted = sortByMetric(
      allCountries,
      (c) => getCountryValue(c, metric),
      (c) => c.country,
    );
    const filtered =
      metric === "largestRun" ? sorted.filter((c) => c.maxComputeFlop > 0) : sorted;
    return filtered.slice(0, 10);
  }, [allCountries, metric]);

  // ── Normalised rows (chip + value + bar width) ──────────────────────────────
  const viewRows: ViewRow[] = useMemo(() => {
    if (activeTab === "orgs") {
      const vals = orgEntries.map((o) => getOrgValue(o, metric));
      const widths = computeWidths(vals, isLogMetric);
      return orgEntries.map((o, i) => ({
        key: o.organization,
        name: o.organization,
        kind: "mono",
        chip: monogram(o.organization),
        tint: MONO_PALETTE[hashIndex(o.organization, MONO_PALETTE.length)],
        rawValue: vals[i],
        maxComputeFlop: o.maxComputeFlop,
        width: widths[i],
      }));
    }
    const vals = countryEntries.map((c) => getCountryValue(c, metric));
    const widths = computeWidths(vals, isLogMetric);
    return countryEntries.map((c, i) => ({
      key: c.country,
      name: c.countryShort,
      kind: "flag",
      chip: flagEmoji(c.iso3),
      tint: "bg-zinc-100 dark:bg-zinc-800",
      rawValue: vals[i],
      maxComputeFlop: c.maxComputeFlop,
      width: widths[i],
    }));
  }, [activeTab, orgEntries, countryEntries, metric, isLogMetric]);

  // ── Entrance animation ──────────────────────────────────────────────────────
  // Bars mount at 0 width then animate to their value on the next frame. Tab /
  // metric changes are handled by the CSS width transition on the same element.
  // Under prefers-reduced-motion the `motion-reduce:transition-none` utility
  // makes the width apply instantly (no animation).
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // ── Derived text ───────────────────────────────────────────────────────────
  const metricLabel = t(METRIC_I18N[metric].label);
  const metricDesc =
    metric === "recentCount" && recentWindow
      ? t("metricRecentCountDesc", {
          windowStart: recentWindow.start,
          windowEnd: recentWindow.end,
        })
      : t(METRIC_I18N[metric].desc);

  const barGradient = isDark
    ? "linear-gradient(90deg, rgba(139,92,246,0.22) 0%, rgba(167,139,250,0.42) 100%)"
    : "linear-gradient(90deg, rgba(124,58,237,0.14) 0%, rgba(167,139,250,0.30) 100%)";

  // ── Value cell renderer (unchanged semantics) ──────────────────────────────
  function renderMetricCell(
    rawValue: number,
    maxComputeFlop: number,
  ): React.ReactNode {
    if (metric === "largestRun") {
      return maxComputeFlop > 0 ? (
        <span className="font-mono text-violet-600 dark:text-violet-400 text-[11px]">
          {formatFlop(maxComputeFlop)}
        </span>
      ) : (
        <span className="text-zinc-400">—</span>
      );
    }
    if (metric === "frontierCount" && rawValue > 0) {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-400/20">
          {rawValue}
        </span>
      );
    }
    return (
      <span className={rawValue === 0 ? "text-zinc-400" : ""}>
        {rawValue.toLocaleString()}
      </span>
    );
  }

  const showComputeCol = metric !== "largestRun";

  return (
    <div className="space-y-4">
      {/* ── Segmented tab control: Organizations / Countries ───────────────── */}
      <div
        role="tablist"
        aria-label={`${t("leadersTabOrgs")} / ${t("leadersTabCountries")}`}
        className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 flex gap-1 w-fit"
      >
        {(["orgs", "countries"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
              activeTab === tab
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
            }`}
          >
            {tab === "orgs" ? t("leadersTabOrgs") : t("leadersTabCountries")}
          </button>
        ))}
      </div>

      {/* ── Segmented metric control (scrolls horizontally on narrow screens) ─ */}
      <div
        role="group"
        aria-labelledby="metric-group-label"
        className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1 flex gap-1 overflow-x-auto flex-nowrap"
      >
        <span id="metric-group-label" className="sr-only">
          {t("leadersSectionTitle")}
        </span>
        {METRIC_KEYS.map((mk) => (
          <button
            key={mk}
            type="button"
            aria-pressed={metric === mk}
            onClick={() => setMetric(mk)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
              metric === mk
                ? "bg-violet-600 text-white shadow-sm"
                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
            }`}
          >
            {t(METRIC_I18N[mk].label)}
          </button>
        ))}
      </div>

      {/* ── Metric description — one subtle, always-visible line ────────────── */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        <strong className="font-semibold text-zinc-700 dark:text-zinc-300">
          {metricLabel}:{" "}
        </strong>
        {metricDesc}
      </p>

      {/* ── Epoch frontier definition — inline amber note (frontierCount only) ─ */}
      {metric === "frontierCount" && (
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed border-l-2 border-amber-400/60 dark:border-amber-500/40 pl-3">
          {t("frontierDefinitionNote")}
        </p>
      )}

      {/* ── Data disclaimer — compact info row (point-of-use, always visible) ── */}
      <p className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 leading-relaxed border-l-2 border-amber-400/60 dark:border-amber-500/40 pl-3 py-0.5">
        <span aria-hidden="true" className="mt-px shrink-0 font-semibold">
          ⓘ
        </span>
        <span>
          <strong className="font-semibold">{t("attributionCaveat")}: </strong>
          {t("dataDisclaimer")}
        </span>
      </p>

      {/* ── The leaderboard: one semantic table of rows-as-bars ──────────────── */}
      <div role="group" aria-label={t("a11yFrontierLeadersName")} className="space-y-2">
        <p className="sr-only">{t("a11yFrontierLeadersSummary")}</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <caption className="sr-only">{t("leadersTableCaption")}</caption>
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500 font-medium">
                <th scope="col" className="pl-3 pr-2 py-1.5 text-right w-10">
                  {t("leadersColRank")}
                </th>
                <th scope="col" className="px-2 py-1.5 text-left">
                  {t("leadersColName")}
                </th>
                <th scope="col" className="px-2 py-1.5 text-right whitespace-nowrap">
                  {metricLabel}
                </th>
                {showComputeCol && (
                  <th scope="col" className="pl-2 pr-3 py-1.5 text-right whitespace-nowrap">
                    {t("leadersColMaxCompute")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {viewRows.map((row, i) => (
                <tr
                  key={row.key}
                  className="relative isolate transition-transform transition-shadow duration-150 hover:-translate-y-px hover:shadow-sm hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 motion-reduce:hover:translate-y-0 motion-reduce:transition-none"
                >
                  {/* Rank cell also hosts the decorative row-spanning track + fill */}
                  <th
                    scope="row"
                    className="pl-3 pr-2 py-2.5 text-right align-middle w-10 text-xs font-medium tabular-nums text-zinc-400 dark:text-zinc-500"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-1 left-0 right-0 -z-20 rounded-lg bg-zinc-100/70 dark:bg-zinc-800/40"
                    />
                    <span
                      aria-hidden="true"
                      style={{
                        width: entered ? `${row.width}%` : "0%",
                        backgroundImage: barGradient,
                      }}
                      className="absolute inset-y-1 left-0 -z-10 rounded-lg border-r border-violet-500/40 transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    />
                    {i + 1}
                  </th>
                  <td className="px-2 py-2.5 align-middle">
                    <span className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={`w-6 h-6 rounded-md grid place-items-center leading-none shrink-0 ${
                          row.kind === "flag"
                            ? "text-base bg-zinc-100 dark:bg-zinc-800"
                            : `text-[10px] font-semibold ${row.tint}`
                        }`}
                      >
                        {row.chip}
                      </span>
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {row.name}
                      </span>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right align-middle text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                    {renderMetricCell(row.rawValue, row.maxComputeFlop)}
                  </td>
                  {showComputeCol && (
                    <td className="pl-2 pr-3 py-2.5 text-right align-middle font-mono text-[11px] text-violet-600 dark:text-violet-400">
                      {row.maxComputeFlop > 0 ? (
                        formatFlop(row.maxComputeFlop)
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Context note (tab-specific, always visible) ─────────────────────── */}
      {activeTab === "orgs" ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          {t("orgEntitiesNote")}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {t("countryAttributionNote")}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {t("leadersGeopoliticsNote")}{" "}
            <Link
              href="/global"
              className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
            >
              {t("leadersGeopoliticsLink")} →
            </Link>
          </p>
        </div>
      )}

      {/* ── "Why these numbers?" disclosure (lower-priority context) ────────── */}
      <details className="text-xs text-zinc-500 dark:text-zinc-400">
        <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded">
          {t("leadersWhyDisclosure")}
        </summary>
        <div className="mt-2 space-y-1.5 pl-3 border-l border-zinc-200 dark:border-zinc-700">
          <p className="leading-relaxed">
            {t("coverageNote", {
              totalDated: String(counts.withDate),
              computeKnown: String(counts.withCompute),
              coveragePct: String(coveragePct),
              windowStart: counts.recentWindowStart,
              windowEnd: counts.recentWindowEnd,
            })}
          </p>
          <p className="leading-relaxed">{defs.orgLeaderboardMetric}</p>
          <p className="leading-relaxed">{defs.openWeightsMetric}</p>
          <p className="leading-relaxed">{defs.coverageNote}</p>
          <p className="leading-relaxed">{t("countryDefaultSortDefinition")}</p>
          <p className="leading-relaxed">{t("multiCountryAttributionDefinition")}</p>
        </div>
      </details>
    </div>
  );
}
