"use client";

import { generateAllCareerInsights, computeResiliencyScore } from "@/lib/data";
import type { CareerInsight } from "@/lib/data";
import { colorForRisk, formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { useState, useMemo, useCallback } from "react";
import { useT } from "@/lib/i18n/useT";

const MAX_COMPARE = 3;
const PAGE_SIZE = 48;

export default function CareersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"risk" | "openings" | "salary" | "employment">("risk");
  const [compareList, setCompareList] = useState<CareerInsight[]>([]);
  const [showComparePanel, setShowComparePanel] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const t = useT("careers");

  const allInsights = useMemo(() => generateAllCareerInsights(), []);

  const filtered = useMemo(() => {
    let result = allInsights;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.occupationName.toLowerCase().includes(q) ||
          i.sectorName.toLowerCase().includes(q),
      );
    }
    if (riskFilter !== "all") {
      result = result.filter((i) => i.automationRisk === riskFilter);
    }
    return [...result].sort((a, b) => {
      if (sortBy === "risk") return b.automationProbability - a.automationProbability;
      if (sortBy === "openings") return (b.projectedOpenings ?? -Infinity) - (a.projectedOpenings ?? -Infinity);
      if (sortBy === "employment") return (b.totalEmployment ?? -Infinity) - (a.totalEmployment ?? -Infinity);
      return b.medianSalary - a.medianSalary;
    });
  }, [searchQuery, riskFilter, sortBy, allInsights]);

  // Reset the visible window whenever the result set changes (render-time reset).
  const filterSig = `${searchQuery}|${riskFilter}|${sortBy}`;
  const [prevFilterSig, setPrevFilterSig] = useState(filterSig);
  if (prevFilterSig !== filterSig) {
    setPrevFilterSig(filterSig);
    setVisibleCount(PAGE_SIZE);
  }

  const toggleCompare = useCallback((career: CareerInsight) => {
    setCompareList((prev) => {
      const exists = prev.some((c) => c.occupationCode === career.occupationCode);
      if (exists) return prev.filter((c) => c.occupationCode !== career.occupationCode);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, career];
    });
  }, []);

  const isInCompare = (code: string) =>
    compareList.some((c) => c.occupationCode === code);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-28">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">{t("pageTitle")}</h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          {t("pageSubhead", { n: allInsights.length })}
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-up">
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label={t("searchPlaceholder")}
          className="flex-1 bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/50 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
        />
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          aria-label={t("filterAriaLabel")}
          className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/50 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
        >
          <option value="all">{t("filterAll")}</option>
          <option value="Low">{t("filterLow")}</option>
          <option value="Medium">{t("filterMedium")}</option>
          <option value="High">{t("filterHigh")}</option>
          <option value="Very High">{t("filterVeryHigh")}</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "risk" | "openings" | "salary" | "employment")}
          aria-label={t("sortAriaLabel")}
          className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-700/50 rounded-lg px-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
        >
          <option value="risk">{t("sortByRisk")}</option>
          <option value="openings">{t("sortByOpenings")}</option>
          <option value="salary">{t("sortBySalary")}</option>
          <option value="employment">{t("sortByEmployment")}</option>
        </select>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-zinc-600 dark:text-zinc-400">
          {t("resultCount", { n: filtered.length })}
          {compareList.length > 0 && (
            <span className="ml-2 text-violet-600 dark:text-violet-400">
              &middot; {t("selectedForCompare", { n: compareList.length, max: MAX_COMPARE })}
            </span>
          )}
        </p>
        {compareList.length === 0 && (
          <p className="text-zinc-600 text-xs hidden sm:block">
            {t("compareHintPre")}{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-mono">
              +
            </kbd>{" "}
            {t("compareHintPost", { max: MAX_COMPARE })}
          </p>
        )}
      </div>

      {/* Career grid */}
      {filtered.length > 0 ? (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.slice(0, visibleCount).map((i) => {
            const selected = isInCompare(i.occupationCode);
            const canAdd = compareList.length < MAX_COMPARE;
            const riskColor = colorForRisk(i.automationRisk);
            return (
              <div
                key={i.occupationCode}
                className={`relative glass glass-hover bg-white/70 dark:bg-zinc-900/50 border rounded-xl p-5 transition-all duration-200 ${
                  selected
                    ? "border-violet-500/60 ring-1 ring-violet-500/20"
                    : "border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {/* Compare toggle */}
                <button
                  onClick={() => toggleCompare(i)}
                  disabled={!selected && !canAdd}
                  aria-pressed={selected}
                  aria-label={
                    selected
                      ? t("removeFromComparison", { name: i.occupationName })
                      : t("addToComparison", { name: i.occupationName })
                  }
                  className={`absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-zinc-900 focus:ring-violet-500 ${
                    selected
                      ? "brand-grad text-white shadow-md"
                      : canAdd
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white"
                      : "bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
                  }`}
                >
                  {selected ? "✓" : "+"}
                </button>

                {/* Card body — links to detail */}
                <Link
                  href={`/careers/${i.occupationCode}`}
                  className="block focus:outline-none group"
                >
                  <div className="pr-8 mb-3">
                    <h3 className="font-semibold text-zinc-900 dark:text-white leading-tight group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                      {i.occupationName}
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {i.sectorName} &middot; {i.occupationCode}
                    </p>
                  </div>

                  {/* Risk chip + bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-semibold"
                        style={{
                          backgroundColor: `${riskColor}22`,
                          color: riskColor,
                        }}
                      >
                        {i.automationRisk}
                      </span>
                      <span
                        className="text-xs font-bold tabular-nums"
                        style={{ color: riskColor }}
                      >
                        {(i.automationProbability * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${i.automationProbability * 100}%`,
                          backgroundColor: riskColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">{t("labelOutlook")}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${
                          i.outlook === "Bright"
                            ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20"
                            : "bg-zinc-100 dark:bg-zinc-700/30 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/30"
                        }`}
                      >
                        {i.outlook === "Bright" ? t("outlookBright") : t("outlookAverage")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">{t("labelProjOpenings")}</span>
                      <span className="text-zinc-900 dark:text-white">
                        {i.projectedOpenings != null ? i.projectedOpenings.toLocaleString() : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">{t("labelMedianSalary")}</span>
                      <span className="text-zinc-900 dark:text-white">{formatCurrency(i.medianSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">{t("labelEmployment")}</span>
                      <span className="text-zinc-900 dark:text-white">
                        {i.totalEmployment != null ? i.totalEmployment.toLocaleString() : "—"}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
        {filtered.length > visibleCount && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-full px-6 py-2.5 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:border-violet-500 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {t("loadMore", { n: String(filtered.length - visibleCount) })}
            </button>
          </div>
        )}
        </>
      ) : (
        <div className="glass bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl py-16 flex flex-col items-center gap-3 animate-fade-up">
          <span className="text-4xl opacity-30" aria-hidden="true">
            &#128269;
          </span>
          <p className="text-zinc-600 dark:text-zinc-400 text-sm">{t("noResults")}</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setRiskFilter("all");
            }}
            className="text-xs text-violet-400 hover:underline focus:outline-none focus:underline"
          >
            {t("clearFilters")}
          </button>
        </div>
      )}

      {/* ── Compare sticky bar ─────────────────────────────────────────────── */}
      {compareList.length >= 1 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 dark:border-zinc-700/50 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl"
          role="region"
          aria-label={t("compareRegionLabel")}
        >
          <div className="max-w-[1400px] mx-auto px-4 py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Selected careers */}
              <div className="flex-1 flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {t("compareBarLabel")}
                </span>
                {compareList.map((c) => (
                  <span
                    key={c.occupationCode}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/50 text-xs"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: colorForRisk(c.automationRisk) }}
                    />
                    <span className="text-zinc-900 dark:text-white font-medium">{c.occupationName}</span>
                    <button
                      onClick={() => toggleCompare(c)}
                      aria-label={t("removeFromComparison", { name: c.occupationName })}
                      className="text-zinc-500 hover:text-white focus:outline-none focus:text-white ml-0.5 leading-none transition-colors"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 shrink-0">
                {compareList.length >= 2 && (
                  <button
                    onClick={() => setShowComparePanel((v) => !v)}
                    className="brand-grad text-white text-xs font-semibold px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 hover:opacity-90 transition-opacity"
                  >
                    {showComparePanel ? t("hideSideBySide") : t("compareSideBySide")}
                  </button>
                )}
                <button
                  onClick={() => {
                    setCompareList([]);
                    setShowComparePanel(false);
                  }}
                  className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-colors"
                >
                  {t("clearAll")}
                </button>
              </div>
            </div>

            {/* Side-by-side comparison table */}
            {showComparePanel && compareList.length >= 2 && (
              <div className="mt-4 overflow-x-auto border-t border-zinc-200 dark:border-zinc-800 pt-4">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 text-zinc-500 font-medium w-32">
                        {t("colMetric")}
                      </th>
                      {compareList.map((c) => (
                        <th
                          key={c.occupationCode}
                          className="py-2 px-3 text-left min-w-[160px]"
                        >
                          <div className="font-semibold text-zinc-900 dark:text-white text-sm leading-tight">
                            {c.occupationName}
                          </div>
                          <div className="text-xs text-zinc-500 font-normal">
                            {c.sectorName}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/60">
                    <tr>
                     <td className="py-2 px-3 text-zinc-500">{t("labelAIExposure")}</td>
                      {compareList.map((c) => (
                        <td key={c.occupationCode} className="py-2 px-3">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-semibold"
                            style={{
                              backgroundColor: `${colorForRisk(c.automationRisk)}22`,
                              color: colorForRisk(c.automationRisk),
                            }}
                          >
                            {(c.automationProbability * 100).toFixed(0)}%
                            &nbsp;&middot;&nbsp;{c.automationRisk}
                          </span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                     <td className="py-2 px-3 text-zinc-500">{t("labelOutlook")}</td>
                      {compareList.map((c) => (
                       <td key={c.occupationCode} className="py-2 px-3">
                         <span
                           className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${
                          c.outlook === "Bright"
                               ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20"
                               : "bg-zinc-100 dark:bg-zinc-700/30 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/30"
                           }`}
                         >
                           {c.outlook === "Bright" ? t("outlookBright") : t("outlookAverage")}
                         </span>
                       </td>
                     ))}
                    </tr>
                    <tr>
                     <td className="py-2 px-3 text-zinc-500">{t("labelProjOpenings")}</td>
                     {compareList.map((c) => (
                       <td key={c.occupationCode} className="py-2 px-3 text-zinc-900 dark:text-white">
                         {c.projectedOpenings != null ? c.projectedOpenings.toLocaleString() : "—"}
                       </td>
                     ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-zinc-500">{t("labelMedianSalary")}</td>
                      {compareList.map((c) => (
                        <td
                          key={c.occupationCode}
                          className="py-2 px-3 text-zinc-900 dark:text-white font-semibold"
                        >
                          {formatCurrency(c.medianSalary)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-zinc-500">{t("colEstEmployment")}</td>
                      {compareList.map((c) => (
                        <td key={c.occupationCode} className="py-2 px-3 text-zinc-900 dark:text-white">
                          {c.totalEmployment != null ? c.totalEmployment.toLocaleString() : "—"}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-zinc-500">{t("colResiliency")}</td>
                      {compareList.map((c) => {
                        const score = computeResiliencyScore(c.automationProbability);
                        return (
                          <td key={c.occupationCode} className="py-2 px-3">
                            <span className="text-cyan-700 dark:text-cyan-400 font-bold tabular-nums">
                              {score}
                            </span>
                            <span className="text-zinc-500">/100</span>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-zinc-500">{t("colKeySkills")}</td>
                      {compareList.map((c) => (
                        <td key={c.occupationCode} className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {c.skills.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
