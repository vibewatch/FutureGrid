"use client";

import { useParams } from "next/navigation";
import { generateAllCareerInsights } from "@/lib/data";
import { colorForRisk, formatCurrency, formatPercent } from "@/lib/utils";
import JobImpactChart from "@/components/charts/JobImpactChart";
import PredictiveChart from "@/components/charts/PredictiveChart";
import Link from "next/link";
import { useMemo } from "react";

export default function SectorDetailPage() {
  const params = useParams();
  const sectorName = decodeURIComponent(params.id as string);

  const sectorInsights = useMemo(
    () => generateAllCareerInsights().filter((i) => i.sectorName === sectorName),
    [sectorName],
  );

  if (sectorInsights.length === 0) {
    return (
      <div className="space-y-4">
        <Link href="/sectors" className="text-sm text-zinc-400 hover:text-white">
          &larr; Back to Sectors
        </Link>
        <h1 className="text-3xl font-bold text-white">Sector Not Found</h1>
        <p className="text-zinc-400">No data available for &quot;{sectorName}&quot;.</p>
      </div>
    );
  }

  const avgRisk = sectorInsights.reduce((s, i) => s + i.automationProbability, 0) / sectorInsights.length;
  const avgGrowth = sectorInsights.reduce((s, i) => s + i.growthRate, 0) / sectorInsights.length;
  const avgSalary = sectorInsights.reduce((s, i) => s + i.medianSalary, 0) / sectorInsights.length;
  const totalEmp = sectorInsights.reduce((s, i) => s + i.totalEmployment, 0);

  const riskLabel =
    avgRisk < 0.3 ? "Low" : avgRisk < 0.6 ? "Medium" : avgRisk < 0.85 ? "High" : "Very High";
  const riskColor = colorForRisk(riskLabel);

  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* Back + header */}
      <div className="animate-fade-up">
        <Link
          href="/sectors"
          className="text-sm text-zinc-400 hover:text-white mb-3 inline-block transition-colors"
        >
          &larr; Back to Sectors
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gradient">
          {sectorName}
        </h1>
        <p className="text-zinc-400 mt-1">
          {sectorInsights.length} occupations analyzed
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: riskColor }}>
            {(avgRisk * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-zinc-400 mt-1">Avg Automation Risk</div>
        </div>
        <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <div
            className={`text-2xl font-bold ${
              avgGrowth >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {formatPercent(avgGrowth)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">Avg Growth Rate</div>
        </div>
        <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">
            {formatCurrency(avgSalary)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">Avg Median Salary</div>
        </div>
        <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{totalEmp.toLocaleString()}</div>
          <div className="text-xs text-zinc-400 mt-1">Est. Total Employment</div>
        </div>
      </div>
      <p className="text-xs text-zinc-500 italic -mt-4">
        Employment figures are illustrative estimates; automation-risk reflects the Frey &amp; Osborne (2013) model.
      </p>

      {/* Risk overview bar */}
      <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-zinc-400">Sector Average AI Risk</span>
          <span className="font-bold" style={{ color: riskColor }}>
            {(avgRisk * 100).toFixed(1)}% &mdash; {riskLabel}
          </span>
        </div>
        <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${avgRisk * 100}%`, backgroundColor: riskColor }}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Occupation Risk Levels</h2>
          <JobImpactChart selectedSector={sectorName} />
        </div>
        <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Employment Projections</h2>
          <PredictiveChart selectedSector={sectorName} />
        </div>
      </div>

      {/* Occupations table */}
      <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Occupations in {sectorName}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="text-left py-3 px-4">Occupation</th>
                <th className="text-right py-3 px-4">AI Risk</th>
                <th className="text-right py-3 px-4">Growth</th>
                <th className="text-right py-3 px-4">Median Salary</th>
                <th className="text-left py-3 px-4">Top Skills</th>
              </tr>
            </thead>
            <tbody>
              {sectorInsights.map((i) => (
                <tr
                  key={i.occupationCode}
                  className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="py-3 px-4">
                    <Link
                      href={`/careers/${i.occupationCode}`}
                      className="text-violet-400 hover:text-violet-300 font-medium focus:outline-none focus:underline"
                    >
                      {i.occupationName}
                    </Link>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold"
                      style={{
                        backgroundColor: `${colorForRisk(i.automationRisk)}22`,
                        color: colorForRisk(i.automationRisk),
                      }}
                    >
                      {(i.automationProbability * 100).toFixed(0)}% &mdash; {i.automationRisk}
                    </span>
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-medium ${
                      i.growthRate >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {formatPercent(i.growthRate)}
                  </td>
                  <td className="py-3 px-4 text-right text-white">
                    {formatCurrency(i.medianSalary)}
                  </td>
                  <td className="py-3 px-4 text-zinc-400 text-xs">
                    {i.skills.slice(0, 3).join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
