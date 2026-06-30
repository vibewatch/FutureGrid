"use client";

import CareerTrendChart from "@/components/charts/CareerTrendChart";
import JobImpactChart from "@/components/charts/JobImpactChart";
import { getSectorAggregatesExtended } from "@/lib/data";
import type { SectorAggregate } from "@/lib/data";
import Link from "next/link";
import { colorForRisk, formatCurrency, formatPercent } from "@/lib/utils";
import { useState, useMemo } from "react";

type SortKey = "risk" | "growth" | "size" | "salary";

function riskLabel(avgRisk: number): "Low" | "Medium" | "High" | "Very High" {
  if (avgRisk < 0.3) return "Low";
  if (avgRisk < 0.6) return "Medium";
  if (avgRisk < 0.85) return "High";
  return "Very High";
}

export default function SectorsPage() {
  const [sortBy, setSortBy] = useState<SortKey>("risk");
  const allSectors = useMemo(() => getSectorAggregatesExtended(), []);

  const sorted = useMemo((): SectorAggregate[] => {
    return [...allSectors].sort((a, b) => {
      switch (sortBy) {
        case "risk":    return b.avgRisk - a.avgRisk;
        case "growth":  return b.avgGrowth - a.avgGrowth;
        case "size":    return b.occupationCount - a.occupationCount;
        case "salary":  return b.avgSalary - a.avgSalary;
      }
    });
  }, [sortBy, allSectors]);

  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">
          AI Disruption by Sector
        </h1>
        <p className="text-zinc-400 mt-1">
          Compare automation risk, employment growth, and occupation counts across major industry sectors.
        </p>
      </div>

      {/* Charts */}
      <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <CareerTrendChart />
      </div>

      <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Top Occupations by Automation Risk
        </h2>
        <JobImpactChart />
      </div>

      {/* Sector grid with sort */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">
            All Sectors{" "}
            <span className="text-zinc-500 font-normal text-sm">
              ({allSectors.length})
            </span>
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Sort by</span>
            {(["risk", "growth", "size", "salary"] as SortKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setSortBy(k)}
                aria-pressed={sortBy === k}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 ${
                  sortBy === k
                    ? "brand-grad text-white"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                }`}
              >
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((s) => {
            const rl = riskLabel(s.avgRisk);
            const riskColor = colorForRisk(rl);
            return (
              <Link
                key={s.sector}
                href={`/sectors/${encodeURIComponent(s.sector)}`}
                className="block glass glass-hover bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all group"
              >
                {/* Sector header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: riskColor }}
                  />
                  <h3 className="text-base font-semibold text-white group-hover:text-cyan-300 transition-colors leading-tight">
                    {s.sector}
                  </h3>
                </div>

                {/* Risk bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-zinc-500">AI Risk</span>
                    <span
                      className="font-semibold"
                      style={{ color: riskColor }}
                    >
                      {(s.avgRisk * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${s.avgRisk * 100}%`,
                        backgroundColor: riskColor,
                      }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Growth Rate</span>
                    <span
                      className={`font-medium ${
                        s.avgGrowth >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatPercent(s.avgGrowth)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Avg Salary</span>
                    <span className="font-medium text-white">
                      {formatCurrency(s.avgSalary)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Occupations</span>
                    <span className="font-medium text-white">{s.occupationCount}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
