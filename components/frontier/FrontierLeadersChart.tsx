"use client";

import { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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
    // For largestRun only show entries with actual compute data
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

  // ── Active chart data ──────────────────────────────────────────────────────
  const activeLabels = useMemo(
    () =>
      activeTab === "orgs"
        ? orgEntries.map((o) => o.organization)
        : countryEntries.map((c) => c.countryShort),
    [activeTab, orgEntries, countryEntries],
  );

  const activeRawValues = useMemo(
    () =>
      activeTab === "orgs"
        ? orgEntries.map((o) => getOrgValue(o, metric))
        : countryEntries.map((c) => getCountryValue(c, metric)),
    [activeTab, orgEntries, countryEntries, metric],
  );

  // For largestRun: use log10(value) for bar height (linear scale, log-formatted labels)
  const activeChartValues = useMemo(
    () =>
      activeRawValues.map((v) =>
        isLogMetric ? (v > 0 ? Math.log10(v) : null) : v,
      ),
    [activeRawValues, isLogMetric],
  );

  // ── Color tokens ───────────────────────────────────────────────────────────
  const axisText = isDark ? "#71717a" : "#52525b";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const borderColor = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const ttBg = isDark ? "rgba(9,9,11,0.92)" : "rgba(255,255,255,0.95)";
  const ttTitle = isDark ? "#e4e4e7" : "#18181b";
  const ttBody = isDark ? "#a1a1aa" : "#52525b";
  const ttBorder = isDark ? "rgba(139,92,246,0.30)" : "rgba(139,92,246,0.25)";
  const barBg = isDark ? "rgba(139,92,246,0.55)" : "rgba(124,58,237,0.55)";
  const barBorder = isDark ? "rgba(139,92,246,0.80)" : "rgba(124,58,237,0.80)";

  // ── Chart options ──────────────────────────────────────────────────────────
  const chartOptions = useMemo(
    () => ({
      indexAxis: "y" as const,
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500, easing: "easeOutQuart" as const },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: ttBg,
          titleColor: ttTitle,
          bodyColor: ttBody,
          borderColor: ttBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx: { dataIndex: number }) => {
              const raw = activeRawValues[ctx.dataIndex] ?? 0;
              if (isLogMetric) return raw > 0 ? ` ${formatFlop(raw)}` : " —";
              return ` ${raw.toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: axisText,
            font: { size: 10 },
            ...(isLogMetric
              ? {
                  callback: (v: number | string) => {
                    const n = Number(v);
                    return isNaN(n) ? "" : `10^${Math.round(n)}`;
                  },
                  maxTicksLimit: 6,
                }
              : {}),
          },
          grid: { color: gridColor },
          border: { color: borderColor },
        },
        y: {
          ticks: { color: axisText, font: { size: 10 } },
          grid: { display: false },
          border: { color: borderColor },
        },
      },
    }),
    [
      axisText, gridColor, borderColor,
      ttBg, ttTitle, ttBody, ttBorder,
      isLogMetric, activeRawValues,
    ],
  );

  const chartData = useMemo(
    () => ({
      labels: activeLabels,
      datasets: [
        {
          label: t(METRIC_I18N[metric].label),
          data: activeChartValues,
          backgroundColor: barBg,
          borderColor: barBorder,
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    }),
    [activeLabels, activeChartValues, barBg, barBorder, metric, t],
  );

  // ── Derived text ───────────────────────────────────────────────────────────
  const metricLabel = t(METRIC_I18N[metric].label);
  const metricDesc =
    metric === "recentCount" && recentWindow
      ? t("metricRecentCountDesc", {
          windowStart: recentWindow.start,
          windowEnd: recentWindow.end,
        })
      : t(METRIC_I18N[metric].desc);

  const chartHeight =
    activeTab === "orgs"
      ? Math.max(280, orgEntries.length * 34 + 60)
      : Math.max(240, countryEntries.length * 34 + 60);

  // ── Cell renderer ──────────────────────────────────────────────────────────
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

  return (
    <div className="space-y-4">
      {/* ── Disclaimer ─────────────────────────────────────────────────────── */}
      <div className="rounded-lg bg-amber-50/80 dark:bg-amber-500/8 border border-amber-200 dark:border-amber-500/20 px-4 py-3">
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <strong className="font-semibold">{t("attributionCaveat")}: </strong>
          {t("dataDisclaimer")}
        </p>
      </div>

      {/* ── Coverage note ───────────────────────────────────────────────────── */}
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
        {t("coverageNote", {
          totalDated: String(counts.withDate),
          computeKnown: String(counts.withCompute),
          coveragePct: String(coveragePct),
          windowStart: counts.recentWindowStart,
          windowEnd: counts.recentWindowEnd,
        })}
      </p>

      {/* ── Tab bar: Organizations / Countries ─────────────────────────────── */}
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
                ? "bg-violet-600 text-white shadow"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
            }`}
          >
            {tab === "orgs" ? t("leadersTabOrgs") : t("leadersTabCountries")}
          </button>
        ))}
      </div>

      {/* ── Metric selector ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div
          role="group"
          aria-labelledby="metric-group-label"
          className="flex flex-wrap gap-1.5"
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                metric === mk
                  ? "bg-violet-600 text-white shadow"
                  : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
              }`}
            >
              {t(METRIC_I18N[mk].label)}
            </button>
          ))}
        </div>

        {/* Metric description — always visible, never hover-only */}
        <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 px-3 py-2.5">
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <strong className="font-semibold text-zinc-700 dark:text-zinc-300">
              {metricLabel}:{" "}
            </strong>
            {metricDesc}
          </p>
        </div>

        {/* Epoch frontier definition — shown only when frontierCount is selected */}
        {metric === "frontierCount" && (
          <div className="rounded-lg bg-amber-50/60 dark:bg-amber-500/8 border border-amber-200 dark:border-amber-500/20 px-3 py-2.5">
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {t("frontierDefinitionNote")}
            </p>
          </div>
        )}

        {/* Org entities note — shown on orgs tab */}
        {activeTab === "orgs" && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {t("orgEntitiesNote")}
          </p>
        )}
      </div>

      {/* ── Chart ────────────────────────────────────────────────────────────── */}
      <div style={{ height: chartHeight }}>
        <Bar
          options={chartOptions}
          data={chartData}
          aria-label={`${t("a11yFrontierLeadersName")}: ${metricLabel}`}
          role="img"
        />
      </div>

      {/* ── Supplemental table ───────────────────────────────────────────────── */}
      {activeTab === "orgs" && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-1.5 pr-3 font-semibold text-zinc-500 dark:text-zinc-400">
                  {t("leadersColName")}
                </th>
                <th className="py-1.5 pr-3 font-semibold text-zinc-500 dark:text-zinc-400 text-right">
                  {metricLabel}
                </th>
                {metric !== "largestRun" && (
                  <th className="py-1.5 font-semibold text-zinc-500 dark:text-zinc-400 text-right">
                    {t("leadersColMaxCompute")}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {orgEntries.map((org) => (
                <tr
                  key={org.organization}
                  className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="py-1.5 pr-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {org.organization}
                  </td>
                  <td className="py-1.5 pr-3 text-right text-zinc-600 dark:text-zinc-400">
                    {renderMetricCell(getOrgValue(org, metric), org.maxComputeFlop)}
                  </td>
                  {metric !== "largestRun" && (
                    <td className="py-1.5 text-right font-mono text-violet-600 dark:text-violet-400 text-[11px]">
                      {org.maxComputeFlop > 0 ? (
                        formatFlop(org.maxComputeFlop)
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
      )}

      {activeTab === "countries" && (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-1.5 pr-3 font-semibold text-zinc-500 dark:text-zinc-400">
                    {t("leadersColName")}
                  </th>
                  <th className="py-1.5 pr-3 font-semibold text-zinc-500 dark:text-zinc-400 text-right">
                    {metricLabel}
                  </th>
                  {metric !== "largestRun" && (
                    <th className="py-1.5 font-semibold text-zinc-500 dark:text-zinc-400 text-right">
                      {t("leadersColMaxCompute")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {countryEntries.map((c) => (
                  <tr
                    key={c.country}
                    className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="py-1.5 pr-3 font-medium text-zinc-900 dark:text-zinc-100">
                      {c.countryShort}
                    </td>
                    <td className="py-1.5 pr-3 text-right text-zinc-600 dark:text-zinc-400">
                      {renderMetricCell(getCountryValue(c, metric), c.maxComputeFlop)}
                    </td>
                    {metric !== "largestRun" && (
                      <td className="py-1.5 text-right font-mono text-violet-600 dark:text-violet-400 text-[11px]">
                        {c.maxComputeFlop > 0 ? (
                          formatFlop(c.maxComputeFlop)
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
          {/* Country attribution note */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {t("countryAttributionNote")}
          </p>
          {/* Geopolitics link */}
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

      {/* ── Definitions reference (always visible, source-anchored) ─────────── */}
      <details className="text-xs text-zinc-500 dark:text-zinc-400">
        <summary className="cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded">
          {t("attributionCaveatsTitle")}
        </summary>
        <div className="mt-2 space-y-1.5 pl-3 border-l border-zinc-200 dark:border-zinc-700">
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
