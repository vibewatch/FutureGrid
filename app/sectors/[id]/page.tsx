"use client";

import { useParams } from "next/navigation";
import { generateAllCareerInsights } from "@/lib/data";
import { colorForRisk, formatCurrency } from "@/lib/utils";
import JobImpactChart from "@/components/charts/JobImpactChart";
import PredictiveChart from "@/components/charts/PredictiveChart";
import Link from "next/link";
import { useMemo } from "react";
import { useT } from "@/lib/i18n/useT";

export default function SectorDetailPage() {
  const params = useParams();
  const t = useT("sectors");
  const sectorName = decodeURIComponent(params.id as string);

  const sectorInsights = useMemo(
    () => generateAllCareerInsights().filter((i) => i.sectorName === sectorName),
    [sectorName],
  );

  if (sectorInsights.length === 0) {
    return (
      <div className="space-y-4">
        <Link href="/sectors" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
          &larr; Back to Sectors
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Sector Not Found</h1>
        <p className="text-zinc-600 dark:text-zinc-400">No data available for &quot;{sectorName}&quot;.</p>
      </div>
    );
  }

  const avgRisk = sectorInsights.reduce((s, i) => s + i.automationProbability, 0) / sectorInsights.length;
  const brightCount = sectorInsights.filter((i) => i.outlook === "Bright").length;
  const brightShare = sectorInsights.length > 0 ? brightCount / sectorInsights.length : 0;
  const avgSalary = sectorInsights.reduce((s, i) => s + i.medianSalary, 0) / sectorInsights.length;

  const sectorEmployment = sectorInsights.some(
    (i) => i.totalEmployment != null && i.totalEmployment > 0,
  )
    ? sectorInsights.reduce((sum, i) => sum + (i.totalEmployment ?? 0), 0)
    : null;

  const riskLabel =
    avgRisk < 0.3 ? "Low" : avgRisk < 0.6 ? "Medium" : avgRisk < 0.85 ? "High" : "Very High";
  const riskColor = colorForRisk(riskLabel);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8">
      {/* Back + header */}
      <div className="animate-fade-up">
        <Link
          href="/sectors"
          className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white mb-3 inline-block transition-colors"
        >
          &larr; Back to Sectors
        </Link>
        <h1 className="text-3xl font-bold tracking-tight text-gradient">
          {sectorName}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          {sectorInsights.length} occupations analyzed
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold" style={{ color: riskColor }}>
            {(avgRisk * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Avg AI Exposure</div>
        </div>
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
            {(brightShare * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Bright Outlook</div>
        </div>
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">
            {formatCurrency(avgSalary)}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Avg Median Salary</div>
        </div>
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-zinc-900 dark:text-white">{sectorInsights.length}</div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Occupations Analyzed</div>
        </div>
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {sectorEmployment != null ? sectorEmployment.toLocaleString() : "—"}
          </div>
          <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Total Employment</div>
        </div>
      </div>
      <p className="text-xs text-zinc-500 italic -mt-4">
        AI exposure from the Anthropic Economic Index (2025); salary from BLS; skills from O*NET.{" "}
        <Link href="/sources" className="underline underline-offset-2 hover:text-zinc-400">
          See /sources
        </Link>
        .
      </p>

      {/* Risk overview bar */}
      <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">Sector Avg AI Exposure</span>
          <span className="font-bold" style={{ color: riskColor }}>
            {(avgRisk * 100).toFixed(1)}% AI Exposure &mdash; {riskLabel}
          </span>
        </div>
        <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${avgRisk * 100}%`, backgroundColor: riskColor }}
          />
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">{t("occupationRiskLevels")}</h2>
          <JobImpactChart selectedSector={sectorName} />
        </div>
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">{t("employmentProjections")}</h2>
          <PredictiveChart selectedSector={sectorName} />
        </div>
      </div>

      {/* Occupations table */}
      <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          {t("occupationsIn", { sector: sectorName })}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                <th className="text-left py-3 px-4">{t("thOccupation")}</th>
              <th className="text-right py-3 px-4">{t("thAiExposure")}</th>
              <th className="text-right py-3 px-4">{t("thOutlook")}</th>
                <th className="text-right py-3 px-4">{t("thMedianSalary")}</th>
                <th className="text-left py-3 px-4">{t("thTopSkills")}</th>
              </tr>
            </thead>
            <tbody>
              {sectorInsights.map((i) => (
                <tr
                  key={i.occupationCode}
                  className="border-b border-zinc-200/60 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
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
                    className="py-3 px-4 text-right"
                  >
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${
                        i.outlook === "Bright"
                          ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20"
                          : "bg-zinc-100 dark:bg-zinc-700/30 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700/30"
                      }`}
                    >
                      {i.outlook === "Bright" ? t("outlookBright") : t("outlookAverage")}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-zinc-900 dark:text-white">
                    {formatCurrency(i.medianSalary)}
                  </td>
                  <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 text-xs">
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
