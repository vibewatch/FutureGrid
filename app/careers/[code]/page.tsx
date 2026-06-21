"use client";

import { useParams } from "next/navigation";
import { generateAllCareerInsights, getSectorAggregates } from "@/lib/data";
import { colorForRisk, formatCurrency, formatPercent } from "@/lib/utils";
import PredictiveChart from "@/components/charts/PredictiveChart";
import Link from "next/link";

export default function CareerDetailPage() {
  const params = useParams();
  const code = decodeURIComponent(params.code as string);
  const allInsights = generateAllCareerInsights();
  const career = allInsights.find((i) => i.occupationCode === code);
  const sectorAgg = getSectorAggregates().find((s) => s.sector === career?.sectorName);

  if (!career) {
    return (
      <div className="space-y-4">
        <Link href="/careers" className="text-sm text-zinc-400 hover:text-white">&larr; Back to Careers</Link>
        <h1 className="text-3xl font-bold text-white">Career Not Found</h1>
        <p className="text-zinc-400">No data available for occupation &quot;{code}&quot;.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1400px]">
      <Link href="/careers" className="text-sm text-zinc-400 hover:text-white inline-block">&larr; Back to Careers</Link>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{career.occupationName}</h1>
          <p className="text-zinc-400 mt-1">
            {career.sectorName} &middot; SOC {career.occupationCode}
          </p>
        </div>
        <div className="shrink-0">
          <span
            className="inline-block px-4 py-2 rounded-lg text-lg font-bold"
            style={{ backgroundColor: `${colorForRisk(career.automationRisk)}22`, color: colorForRisk(career.automationRisk) }}
          >
            {(career.automationProbability * 100).toFixed(1)}% AI Risk - {career.automationRisk}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{formatCurrency(career.medianSalary)}</div>
          <div className="text-xs text-zinc-400 mt-1">Median Annual Salary</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <div className={`text-2xl font-bold ${career.growthRate >= 0 ? "text-green-400" : "text-red-400"}`}>
            {formatPercent(career.growthRate)}
          </div>
          <div className="text-xs text-zinc-400 mt-1">10-Year Growth</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{career.totalEmployment.toLocaleString()}</div>
          <div className="text-xs text-zinc-400 mt-1">Current Employment</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">87</div>
          <div className="text-xs text-zinc-400 mt-1">AI Resiliency Score</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Risk Analysis</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-zinc-400">Automation Probability</span>
                <span className="text-white">{(career.automationProbability * 100).toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${career.automationProbability * 100}%`, backgroundColor: colorForRisk(career.automationRisk) }}
                />
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Risk Category</span>
              <span style={{ color: colorForRisk(career.automationRisk) }} className="font-medium">{career.automationRisk}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Sector Average Risk</span>
              <span className="text-white">{sectorAgg ? `${(sectorAgg.avgRisk * 100).toFixed(1)}%` : "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Top Skills</h2>
          <div className="space-y-2">
            {career.skills.map((skill, i) => (
              <div key={skill} className="flex items-center gap-3">
                <span className="text-xs font-medium text-zinc-500 w-5">{i + 1}.</span>
                <span className="text-sm text-white">{skill}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Employment Projections with AI Impact</h2>
        <PredictiveChart selectedSector={career.sectorName} />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Sector Comparison</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                <th className="text-left py-3 px-4">Metric</th>
                <th className="text-right py-3 px-4">This Career</th>
                <th className="text-right py-3 px-4">Sector Average</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-800/50">
                <td className="py-3 px-4 text-zinc-400">Automation Risk</td>
                <td className="py-3 px-4 text-right text-white">{(career.automationProbability * 100).toFixed(1)}%</td>
                <td className="py-3 px-4 text-right text-white">{sectorAgg ? `${(sectorAgg.avgRisk * 100).toFixed(1)}%` : "N/A"}</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-3 px-4 text-zinc-400">Growth Rate</td>
                <td className={`py-3 px-4 text-right ${career.growthRate >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {formatPercent(career.growthRate)}
                </td>
                <td className="py-3 px-4 text-right text-white">
                  {sectorAgg ? formatPercent(sectorAgg.avgGrowth) : "N/A"}
                </td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-3 px-4 text-zinc-400">Median Salary</td>
                <td className="py-3 px-4 text-right text-white">{formatCurrency(career.medianSalary)}</td>
                <td className="py-3 px-4 text-right text-white">N/A</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}