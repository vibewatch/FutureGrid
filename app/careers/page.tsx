"use client";

import { generateAllCareerInsights } from "@/lib/data";
import { colorForRisk, formatCurrency, formatPercent } from "@/lib/utils";
import Link from "next/link";
import { useState, useMemo } from "react";

export default function CareersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"risk" | "growth" | "salary">("risk");

  const allInsights = useMemo(() => generateAllCareerInsights(), []);

  const filtered = useMemo(() => {
    let result = allInsights;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((i) => i.occupationName.toLowerCase().includes(q) || i.sectorName.toLowerCase().includes(q));
    }
    if (riskFilter !== "all") {
      result = result.filter((i) => i.automationRisk === riskFilter);
    }
    return result.sort((a, b) => {
      if (sortBy === "risk") return b.automationProbability - a.automationProbability;
      if (sortBy === "growth") return b.growthRate - a.growthRate;
      return b.medianSalary - a.medianSalary;
    });
  }, [searchQuery, riskFilter, sortBy, allInsights]);

  return (
    <div className="space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Career Explorer</h1>
        <p className="text-zinc-400 mt-1">Browse occupations and their AI automation risk profiles.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search occupations or sectors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
        />
        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
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
          className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
        >
          <option value="risk">Sort by Risk</option>
          <option value="growth">Sort by Growth</option>
          <option value="salary">Sort by Salary</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((i) => (
          <Link
            key={i.occupationCode}
            href={`/careers/${i.occupationCode}`}
            className="block bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-white">{i.occupationName}</h3>
                <div className="text-xs text-zinc-500 mt-0.5">{i.sectorName} &middot; {i.occupationCode}</div>
              </div>
              <span
                className="shrink-0 px-2 py-1 rounded text-xs font-medium"
                style={{ backgroundColor: `${colorForRisk(i.automationRisk)}22`, color: colorForRisk(i.automationRisk) }}
              >
                {(i.automationProbability * 100).toFixed(0)}%
              </span>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500">Growth</span>
                <span className={i.growthRate >= 0 ? "text-green-400" : "text-red-400"}>{formatPercent(i.growthRate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Median Salary</span>
                <span className="text-white">{formatCurrency(i.medianSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Employment</span>
                <span className="text-white">{i.totalEmployment.toLocaleString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {filtered.length === 0 && <div className="text-center text-zinc-500 py-12">No occupations match your criteria.</div>}
    </div>
  );
}