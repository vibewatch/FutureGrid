"use client";

import { generateAllCareerInsights, computeResiliencyScore } from "@/lib/data";
import type { CareerInsight } from "@/lib/data";
import { colorForRisk, formatCurrency, formatPercent } from "@/lib/utils";
import Link from "next/link";
import { useState, useMemo, useCallback } from "react";

const MAX_COMPARE = 3;

export default function CareersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"risk" | "growth" | "salary">("risk");
  const [compareList, setCompareList] = useState<CareerInsight[]>([]);
  const [showComparePanel, setShowComparePanel] = useState(false);

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
      if (sortBy === "growth") return b.growthRate - a.growthRate;
      return b.medianSalary - a.medianSalary;
    });
  }, [searchQuery, riskFilter, sortBy, allInsights]);

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
    <div className="space-y-6 max-w-[1400px] pb-28">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">Career Explorer</h1>
        <p className="text-zinc-400 mt-1">
          Browse {allInsights.length} occupations and their AI automation risk profiles.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-up">
        <input
          type="text"
          placeholder="Search occupations or sectors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search occupations or sectors"
          className="flex-1 bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors"
        />
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          aria-label="Filter by risk level"
          className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors"
        >
          <option value="all">All Risk Levels</option>
          <option value="Low">Low Risk</option>
          <option value="Medium">Medium Risk</option>
          <option value="High">High Risk</option>
          <option value="Very High">Very High Risk</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "risk" | "growth" | "salary")}
          aria-label="Sort occupations"
          className="bg-zinc-900/80 border border-zinc-700/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-violet-500 transition-colors"
        >
          <option value="risk">Sort by Risk</option>
          <option value="growth">Sort by Growth</option>
          <option value="salary">Sort by Salary</option>
        </select>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-zinc-400">
          <span className="font-semibold text-white">{filtered.length}</span>{" "}
          occupation{filtered.length !== 1 ? "s" : ""}
          {compareList.length > 0 && (
            <span className="ml-2 text-violet-400">
              &middot; {compareList.length}/{MAX_COMPARE} selected for compare
            </span>
          )}
        </p>
        {compareList.length === 0 && (
          <p className="text-zinc-600 text-xs hidden sm:block">
            Use{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs font-mono">
              +
            </kbd>{" "}
            on cards to compare up to {MAX_COMPARE}
          </p>
        )}
      </div>

      {/* Career grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i) => {
            const selected = isInCompare(i.occupationCode);
            const canAdd = compareList.length < MAX_COMPARE;
            const riskColor = colorForRisk(i.automationRisk);
            return (
              <div
                key={i.occupationCode}
                className={`relative glass glass-hover bg-zinc-900/50 border rounded-xl p-5 transition-all duration-200 ${
                  selected
                    ? "border-violet-500/60 ring-1 ring-violet-500/20"
                    : "border-zinc-800"
                }`}
              >
                {/* Compare toggle */}
                <button
                  onClick={() => toggleCompare(i)}
                  disabled={!selected && !canAdd}
                  aria-pressed={selected}
                  aria-label={
                    selected
                      ? `Remove ${i.occupationName} from comparison`
                      : `Add ${i.occupationName} to comparison`
                  }
                  className={`absolute top-3 right-3 z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-zinc-900 focus:ring-violet-500 ${
                    selected
                      ? "brand-grad text-white shadow-md"
                      : canAdd
                      ? "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                      : "bg-zinc-800/50 text-zinc-600 cursor-not-allowed"
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
                    <h3 className="font-semibold text-white leading-tight group-hover:text-cyan-300 transition-colors">
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
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
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
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Growth</span>
                      <span
                        className={
                          i.growthRate >= 0 ? "text-green-400" : "text-red-400"
                        }
                      >
                        {formatPercent(i.growthRate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Median Salary</span>
                      <span className="text-white">{formatCurrency(i.medianSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Employment</span>
                      <span className="text-white">
                        {i.totalEmployment.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass bg-zinc-900/40 border border-zinc-800 rounded-xl py-16 flex flex-col items-center gap-3 animate-fade-up">
          <span className="text-4xl opacity-30" aria-hidden="true">
            &#128269;
          </span>
          <p className="text-zinc-400 text-sm">No occupations match your criteria.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setRiskFilter("all");
            }}
            className="text-xs text-violet-400 hover:underline focus:outline-none focus:underline"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Compare sticky bar ─────────────────────────────────────────────── */}
      {compareList.length >= 1 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-700/50 bg-zinc-950/95 backdrop-blur-xl"
          role="region"
          aria-label="Career comparison"
        >
          <div className="max-w-[1400px] mx-auto px-4 py-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              {/* Selected careers */}
              <div className="flex-1 flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Compare
                </span>
                {compareList.map((c) => (
                  <span
                    key={c.occupationCode}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800/80 border border-zinc-700/50 text-xs"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: colorForRisk(c.automationRisk) }}
                    />
                    <span className="text-white font-medium">{c.occupationName}</span>
                    <button
                      onClick={() => toggleCompare(c)}
                      aria-label={`Remove ${c.occupationName} from comparison`}
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
                    {showComparePanel ? "Hide" : "Compare"} Side-by-Side
                  </button>
                )}
                <button
                  onClick={() => {
                    setCompareList([]);
                    setShowComparePanel(false);
                  }}
                  className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-600 transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Side-by-side comparison table */}
            {showComparePanel && compareList.length >= 2 && (
              <div className="mt-4 overflow-x-auto border-t border-zinc-800 pt-4">
                <table className="w-full text-sm min-w-[480px]">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 text-zinc-500 font-medium w-32">
                        Metric
                      </th>
                      {compareList.map((c) => (
                        <th
                          key={c.occupationCode}
                          className="py-2 px-3 text-left min-w-[160px]"
                        >
                          <div className="font-semibold text-white text-sm leading-tight">
                            {c.occupationName}
                          </div>
                          <div className="text-xs text-zinc-500 font-normal">
                            {c.sectorName}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    <tr>
                      <td className="py-2 px-3 text-zinc-500">AI Risk</td>
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
                      <td className="py-2 px-3 text-zinc-500">Growth</td>
                      {compareList.map((c) => (
                        <td
                          key={c.occupationCode}
                          className={`py-2 px-3 font-semibold ${
                            c.growthRate >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {formatPercent(c.growthRate)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-zinc-500">Median Salary</td>
                      {compareList.map((c) => (
                        <td
                          key={c.occupationCode}
                          className="py-2 px-3 text-white font-semibold"
                        >
                          {formatCurrency(c.medianSalary)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-zinc-500">Est. Employment</td>
                      {compareList.map((c) => (
                        <td key={c.occupationCode} className="py-2 px-3 text-white">
                          {c.totalEmployment.toLocaleString()}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-zinc-500">Resiliency</td>
                      {compareList.map((c) => {
                        const score = computeResiliencyScore(c.automationProbability);
                        return (
                          <td key={c.occupationCode} className="py-2 px-3">
                            <span className="text-cyan-400 font-bold tabular-nums">
                              {score}
                            </span>
                            <span className="text-zinc-500">/100</span>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-zinc-500">Key Skills</td>
                      {compareList.map((c) => (
                        <td key={c.occupationCode} className="py-2 px-3">
                          <div className="flex flex-wrap gap-1">
                            {c.skills.slice(0, 3).map((s) => (
                              <span
                                key={s}
                                className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300"
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
