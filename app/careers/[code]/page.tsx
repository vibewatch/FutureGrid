"use client";

import { useParams } from "next/navigation";
import { generateAllCareerInsights, getSectorAggregates, computeResiliencyScore } from "@/lib/data";
import { colorForRisk, formatCurrency, formatPercent } from "@/lib/utils";
import PredictiveChart from "@/components/charts/PredictiveChart";
import Link from "next/link";
import { useMemo } from "react";

export default function CareerDetailPage() {
  const params = useParams();
  const code = decodeURIComponent(params.code as string);

  const allInsights = useMemo(() => generateAllCareerInsights(), []);
  const career = allInsights.find((i) => i.occupationCode === code);
  const sectorAgg = useMemo(
    () => getSectorAggregates().find((s) => s.sector === career?.sectorName),
    [career],
  );

  if (!career) {
    return (
      <div className="space-y-4">
        <Link href="/careers" className="text-sm text-zinc-400 hover:text-white">
          &larr; Back to Careers
        </Link>
        <h1 className="text-3xl font-bold text-white">Career Not Found</h1>
        <p className="text-zinc-400">No data available for occupation &quot;{code}&quot;.</p>
      </div>
    );
  }

  const riskColor = colorForRisk(career.automationRisk);
  const resiliency = computeResiliencyScore(career.automationProbability);

  return (
    <div className="space-y-8 max-w-[1400px]">
      <Link
        href="/careers"
        className="text-sm text-zinc-400 hover:text-white inline-block transition-colors"
      >
        &larr; Back to Careers
      </Link>

      {/* Hero */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">
            {career.occupationName}
          </h1>
          <p className="text-zinc-400 mt-1">
            {career.sectorName} &middot; SOC {career.occupationCode}
          </p>
        </div>
        <div className="shrink-0">
          <span
            className="inline-block px-4 py-2 rounded-lg text-base font-bold"
            style={{
              backgroundColor: `${riskColor}22`,
              color: riskColor,
            }}
          >
            {(career.automationProbability * 100).toFixed(1)}% AI Risk &mdash; {career.automationRisk}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            value: formatCurrency(career.medianSalary),
            label: "Median Annual Salary",
            className: "text-white",
          },
          {
            value: formatPercent(career.growthRate),
            label: "10-Year Growth",
            className: career.growthRate >= 0 ? "text-green-400" : "text-red-400",
          },
          {
            value: career.totalEmployment.toLocaleString(),
            label: "Est. Employment",
            className: "text-white",
          },
          {
            value: `${resiliency}`,
            label: "AI Resiliency Score",
            className: "text-cyan-400",
            suffix: "/100",
          },
        ].map(({ value, label, className, suffix }) => (
          <div
            key={label}
            className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center"
          >
            <div className={`text-2xl font-bold ${className}`}>
              {value}
              {suffix && (
                <span className="text-sm text-zinc-500 font-normal">{suffix}</span>
              )}
            </div>
            <div className="text-xs text-zinc-400 mt-1">{label}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500 italic -mt-4">
        Employment figures are illustrative estimates; automation-risk reflects the Frey &amp; Osborne (2013) model.
      </p>

      {/* Risk analysis + skills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Risk Analysis</h2>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-zinc-400">Automation Probability</span>
                <span className="font-semibold" style={{ color: riskColor }}>
                  {(career.automationProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${career.automationProbability * 100}%`,
                    backgroundColor: riskColor,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-zinc-400">AI Resiliency</span>
                <span className="font-semibold text-cyan-400">{resiliency}/100</span>
              </div>
              <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${resiliency}%`,
                    background: "linear-gradient(90deg, #8b5cf6, #22d3ee)",
                  }}
                />
              </div>
            </div>
            <div className="pt-2 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Risk Category</span>
                <span style={{ color: riskColor }} className="font-semibold">
                  {career.automationRisk}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Sector Average Risk</span>
                <span className="text-white">
                  {sectorAgg ? `${(sectorAgg.avgRisk * 100).toFixed(1)}%` : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top Skills</h2>
          <div className="space-y-2.5">
            {career.skills.map((skill, idx) => (
              <div key={skill} className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-600 w-5 tabular-nums">
                  {idx + 1}.
                </span>
                <span
                  className="flex-1 px-3 py-1.5 rounded-lg bg-violet-900/20 border border-violet-700/20 text-sm text-violet-200"
                >
                  {skill}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Predictive chart */}
      <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Employment Projections with AI Impact
        </h2>
        <PredictiveChart selectedSector={career.sectorName} />
      </div>

      {/* Sector comparison table */}
      <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
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
                <td className="py-3 px-4 text-right" style={{ color: riskColor }}>
                  {(career.automationProbability * 100).toFixed(1)}%
                </td>
                <td className="py-3 px-4 text-right text-white">
                  {sectorAgg ? `${(sectorAgg.avgRisk * 100).toFixed(1)}%` : "N/A"}
                </td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-3 px-4 text-zinc-400">Growth Rate</td>
                <td
                  className={`py-3 px-4 text-right font-medium ${
                    career.growthRate >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formatPercent(career.growthRate)}
                </td>
                <td className="py-3 px-4 text-right text-white">
                  {sectorAgg ? formatPercent(sectorAgg.avgGrowth) : "N/A"}
                </td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="py-3 px-4 text-zinc-400">Median Salary</td>
                <td className="py-3 px-4 text-right text-white font-medium">
                  {formatCurrency(career.medianSalary)}
                </td>
                <td className="py-3 px-4 text-right text-zinc-500">N/A</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-zinc-400">AI Resiliency</td>
                <td className="py-3 px-4 text-right text-cyan-400 font-bold">
                  {resiliency}/100
                </td>
                <td className="py-3 px-4 text-right text-zinc-500">N/A</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
