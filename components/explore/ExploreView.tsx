"use client";

import { useMemo, useState } from "react";
import { generateAllCareerInsights, getSectorAggregatesExtended } from "@/lib/data";
import type { CareerInsight } from "@/lib/data";
import BeeswarmChart from "@/components/charts/BeeswarmChart";
import TreemapChart from "@/components/charts/TreemapChart";
import QuadrantScatterChart from "@/components/charts/QuadrantScatterChart";
import BarChartRace from "@/components/charts/BarChartRace";
import HeatmapView from "@/components/heatmap/HeatmapView";
import { useT } from "@/lib/i18n/useT";

// ── Risk bands ────────────────────────────────────────────────────────────────

const RISK_OPTIONS: Array<{ value: CareerInsight["automationRisk"] | "all"; labelKey: string }> = [
  { value: "all",       labelKey: "filterAllRisks" },
  { value: "Low",       labelKey: "filterLow"      },
  { value: "Medium",    labelKey: "filterMedium"   },
  { value: "High",      labelKey: "filterHigh"     },
  { value: "Very High", labelKey: "filterVeryHigh" },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function ExploreView({
  employmentHistories,
}: {
  employmentHistories: Record<string, Record<string, number>>;
}) {
  const t = useT("explore");

  const allInsights = useMemo(() => generateAllCareerInsights(), []);
  const sectors     = useMemo(() => getSectorAggregatesExtended(), []);

  // Unique sectors sorted
  const allSectors = useMemo(
    () => Array.from(new Set(allInsights.map((i) => i.sectorName))).sort(),
    [allInsights],
  );

  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [riskFilter, setRiskFilter]           = useState<string>("all");

  const filtered = useMemo(() => {
    let result = allInsights;
    if (selectedSectors.length > 0) {
      result = result.filter((i) => selectedSectors.includes(i.sectorName));
    }
    if (riskFilter !== "all") {
      result = result.filter((i) => i.automationRisk === riskFilter);
    }
    return result;
  }, [allInsights, selectedSectors, riskFilter]);

  function toggleSector(s: string) {
    setSelectedSectors((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-10">
      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">
          {t("pageHeading")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-2xl">
          {t("pageSubhead", { n: String(allInsights.length) })}
        </p>
      </div>

      {/* ── Beeswarm section ───────────────────────────────────────────────── */}
      <section aria-labelledby="beeswarm-heading">
        <div className="mb-4">
          <h2
            id="beeswarm-heading"
            className="text-xl font-semibold text-zinc-900 dark:text-white"
          >
            {t("sectionBeeswarm")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t("sectionBeeswarmDesc")}
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3 mb-5">
          {/* Risk filter */}
          <div className="flex items-center gap-2">
            <label
              htmlFor="risk-filter"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400 shrink-0"
            >
              {t("filterRisk")}
            </label>
            <select
              id="risk-filter"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="h-8 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-xs px-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              {RISK_OPTIONS.map(({ value, labelKey }) => (
                <option key={value} value={value}>
                  {t(labelKey)}
                </option>
              ))}
            </select>
          </div>

          {/* Sector multi-toggle chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 shrink-0">
              {t("filterSector")}
            </span>
            {allSectors.map((s) => {
              const active = selectedSectors.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => toggleSector(s)}
                  aria-pressed={active}
                  className={`h-7 px-2.5 rounded-full text-[11px] font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    active
                      ? "bg-violet-600 border-violet-600 text-white"
                      : "bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-400"
                  }`}
                >
                  {s}
                </button>
              );
            })}
            {selectedSectors.length > 0 && (
              <button
                onClick={() => setSelectedSectors([])}
                className="h-7 px-2 rounded-full text-[11px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                ✕ {t("filterAllSectors")}
              </button>
            )}
          </div>
        </div>

        {/* Count */}
        <p className="text-xs text-zinc-500 mb-3">
          {t("occupationCount", {
            n: String(filtered.length),
            total: String(allInsights.length),
          })}
        </p>

        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <BeeswarmChart data={filtered} />
        </div>
      </section>

      {/* ── Treemap section ────────────────────────────────────────────────── */}
      <section aria-labelledby="treemap-heading">
        <div className="mb-4">
          <h2
            id="treemap-heading"
            className="text-xl font-semibold text-zinc-900 dark:text-white"
          >
            {t("sectionTreemap")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t("sectionTreemapDesc")}
          </p>
        </div>
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <TreemapChart />
        </div>
      </section>

      {/* ── Quadrant section ───────────────────────────────────────────────── */}
      <section aria-labelledby="quadrant-heading">
        <div className="mb-4">
          <h2
            id="quadrant-heading"
            className="text-xl font-semibold text-zinc-900 dark:text-white"
          >
            {t("sectionQuadrant")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t("sectionQuadrantDesc")}
          </p>
        </div>
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <QuadrantScatterChart />
        </div>
      </section>

      {/* ── Bar Chart Race section ──────────────────────────────────────────── */}
      <section aria-labelledby="race-heading">
        <div className="mb-4">
          <h2
            id="race-heading"
            className="text-xl font-semibold text-zinc-900 dark:text-white"
          >
            {t("raceTitle")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t("raceSubhead")}
          </p>
        </div>
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <BarChartRace employmentHistories={employmentHistories} />
        </div>
      </section>

      {/* ── Country × AI Readiness Heatmap (self-titled, incl. sector grid) ── */}
      <HeatmapView sectors={sectors} />
    </div>
  );
}
