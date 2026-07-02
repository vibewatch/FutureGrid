"use client";

import { useParams } from "next/navigation";
import { generateAllCareerInsights, getOnetEnrichment, getSectorAggregatesExtended, computeResiliencyScore, getOccupationTrend, getReskillingPaths } from "@/lib/data";
import OccupationTrendChart from "@/components/charts/OccupationTrendChart";
import { colorForRisk, formatCurrency } from "@/lib/utils";
import PredictiveChart from "@/components/charts/PredictiveChart";
import Link from "next/link";
import { useMemo } from "react";
import { useT } from "@/lib/i18n/useT";
import { getOccupationExposureLenses } from "@/lib/exposure";

export default function CareerDetailPage() {
  const params = useParams();
  const t = useT("careers");
  const code = decodeURIComponent(params.code as string);

  const allInsights = useMemo(() => generateAllCareerInsights(), []);
  const career = allInsights.find((i) => i.occupationCode === code);
  const allInsightCodes = useMemo(
    () => new Set(allInsights.map((insight) => insight.occupationCode)),
    [allInsights],
  );
  const onet = useMemo(() => getOnetEnrichment(code), [code]);
  const sectorAgg = useMemo(
    () => getSectorAggregatesExtended().find((s) => s.sector === career?.sectorName),
    [career],
  );
  const trend = useMemo(() => getOccupationTrend(code), [code]);
  const transitions = useMemo(() => getReskillingPaths(code, 3, "score"), [code]);
  const exposureLenses = useMemo(() => getOccupationExposureLenses(code), [code]);

  if (!career) {
    return (
      <div className="space-y-4">
        <Link href="/careers" className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
          &larr; {t("backToCareers")}
        </Link>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{t("careerNotFound")}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{t("noDataAvailable", { code })}</p>
      </div>
    );
  }

  const riskColor = colorForRisk(career.automationRisk);
  const resiliency = computeResiliencyScore(career.automationProbability);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8">
      <Link
        href="/careers"
        className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white inline-block transition-colors"
      >
        &larr; {t("backToCareers")}
      </Link>

      {/* Hero */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 animate-fade-up">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">
            {career.occupationName}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
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
            {t("aiExposureBadge", { pct: (career.automationProbability * 100).toFixed(1), risk: career.automationRisk })}
          </span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            value: formatCurrency(career.medianSalary),
            label: t("labelMedianAnnualSalary"),
            className: "text-zinc-900 dark:text-white",
          },
          {
            value: career.outlook === "Bright" ? t("outlookBright") : t("outlookAverage"),
            label: t("labelOnetOutlook"),
            className: career.outlook === "Bright" ? "text-green-700 dark:text-green-400" : "text-zinc-600 dark:text-zinc-400",
          },
          {
            value: career.projectedOpenings != null ? career.projectedOpenings.toLocaleString() : "—",
            label: t("labelProjAnnualOpenings"),
            className: "text-zinc-900 dark:text-white",
          },
          ...(career.totalEmployment != null
            ? [
                {
                  value: career.totalEmployment.toLocaleString(),
                  label: t("labelEmploymentOews"),
                  className: "text-zinc-900 dark:text-white",
                },
              ]
            : []),
          ...(career.growthRate != null
            ? [
                {
                  value: `${career.growthRate > 0 ? "+" : ""}${career.growthRate}%/yr`,
                  label: career.growthWindow
                    ? t("labelEmpGrowthWindow", {
                        from: String(career.growthWindow.fromYear),
                        to: String(career.growthWindow.toYear),
                      })
                    : t("labelEmpGrowth"),
                  className:
                    career.growthRate >= 0
                      ? "text-green-700 dark:text-green-400"
                      : "text-red-600 dark:text-red-400",
                },
              ]
            : []),
          {
            value: `${resiliency}`,
            label: t("labelAIResiliencyScore"),
            className: "text-cyan-700 dark:text-cyan-400",
            suffix: "/100",
          },
        ].map(({ value, label, className, suffix }) => (
          <div
            key={label}
            className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center"
          >
            <div className={`text-2xl font-bold ${className}`}>
              {value}
              {suffix && (
                <span className="text-sm text-zinc-500 font-normal">{suffix}</span>
              )}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">{label}</div>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500 italic -mt-4">
        {t("dataNote")}{" "}
        <Link href="/sources" className="underline underline-offset-2 hover:text-zinc-400">
          {t("seeSourcesLink")}
        </Link>
        .
      </p>

      {/* Best transitions from here */}
      {transitions.length > 0 && (
        <section aria-labelledby="best-transitions-heading">
          <div className="flex items-end justify-between gap-3 mb-1">
            <h2 id="best-transitions-heading" className="text-lg font-semibold text-gradient">
              {t("bestTransitionsTitle")}
            </h2>
            <Link
              href="/skills"
              className="shrink-0 text-xs text-violet-500 dark:text-violet-400 hover:text-violet-400 dark:hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              {t("seeAllPathways")} &rarr;
            </Link>
          </div>
          <p className="text-xs text-zinc-500 mb-4 max-w-2xl">{t("bestTransitionsDesc")}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {transitions.map((p) => {
              const scoreTone =
                p.transitionScore >= 70
                  ? "text-emerald-600 dark:text-emerald-400"
                  : p.transitionScore >= 50
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-zinc-500 dark:text-zinc-400";
              const retrain =
                p.jobZoneDelta <= 0 ? t("transRetrainSimilar") : t("transRetrainMore", { n: String(p.jobZoneDelta) });
              const payText = `${p.salaryDelta >= 0 ? "+" : "−"}$${Math.abs(Math.round(p.salaryDelta / 1000))}k`;
              return (
                <Link
                  key={p.occupationCode}
                  href={`/careers/${p.occupationCode}`}
                  className="block glass glass-hover bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 group transition-all focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white leading-snug group-hover:text-cyan-300 transition-colors">
                      {p.occupationName}
                    </h3>
                    <div className="shrink-0 text-right">
                      <div className={`text-lg font-bold tabular-nums leading-none ${scoreTone}`}>{p.transitionScore}</div>
                      <div className="text-[9px] uppercase tracking-wide text-zinc-500">{t("transScoreLabel")}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] mb-2.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      &darr;{p.exposureDropPts.toFixed(0)} <span className="text-zinc-500 font-normal">{t("transExposure")}</span>
                    </span>
                    <span
                      className={`font-medium ${
                        p.salaryDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
                      }`}
                    >
                      {payText} <span className="text-zinc-500 font-normal">{t("transPay")}</span>
                    </span>
                    <span className="text-zinc-500">{retrain}</span>
                  </div>
                  {p.missingSkills.length > 0 && (
                    <div>
                      <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mb-1">
                        {t("transSkillsToBuild")}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {p.missingSkills.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 text-amber-700 dark:text-amber-300 text-[10px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Risk analysis + skills */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">{t("sectionAIExposureAnalysis")}</h2>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-zinc-600 dark:text-zinc-400">{t("labelAIExposure")}</span>
                <span className="font-semibold" style={{ color: riskColor }}>
                  {(career.automationProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
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
                <span className="text-zinc-600 dark:text-zinc-400">{t("labelAIResiliency")}</span>
                <span className="font-semibold text-cyan-400">{resiliency}/100</span>
              </div>
              <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
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
                <span className="text-zinc-600 dark:text-zinc-400">{t("labelExposureBand")}</span>
                <span style={{ color: riskColor }} className="font-semibold">
                  {career.automationRisk}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600 dark:text-zinc-400">{t("labelSectorAvgExposure")}</span>
                <span className="text-zinc-900 dark:text-white">
                  {sectorAgg ? `${(sectorAgg.avgRisk * 100).toFixed(1)}%` : "N/A"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {exposureLenses && (
          <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t("sectionExposureLenses")}</h2>
                <p className="text-xs text-zinc-500 mt-1">{t("exposureLensesSubtitle")}</p>
              </div>
              {exposureLenses.consensus != null && (
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-white tabular-nums">
                    {formatLensPct(exposureLenses.consensus)}%
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">{t("lensConsensus")}</div>
                </div>
              )}
            </div>
            <div className="space-y-3.5">
              {[
                { label: t("lensActualAdoption"), source: "Anthropic", value: exposureLenses.usage, tone: "bg-cyan-500" },
                { label: t("lensAICapability"), source: "OpenAI", value: exposureLenses.capability, tone: "bg-violet-500" },
                { label: t("lensAIAbility"), source: "AIOE", value: exposureLenses.ability, tone: "bg-emerald-500" },
                {
                  label: t("lensAutomationBaseline"),
                  source: "Frey & Osborne",
                  value: exposureLenses.automation,
                  tone: "bg-zinc-400 dark:bg-zinc-600",
                },
              ]
                .filter(
                  (lens): lens is { label: string; source: string; value: number; tone: string } => lens.value != null,
                )
                .map((lens) => (
                  <div key={lens.label}>
                    <div className="flex items-baseline justify-between gap-3 text-sm mb-1.5">
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {lens.label} <span className="text-xs text-zinc-500">· {lens.source}</span>
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-white tabular-nums">
                        {formatLensPct(lens.value)}%
                      </span>
                    </div>
                    <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${lens.tone}`} style={{ width: `${clampPct(lens.value)}%` }} />
                    </div>
                  </div>
                ))}
            </div>
            {
              exposureLenses.gap != null &&
                Math.abs(exposureLenses.gap) >= 15 &&
                exposureLenses.capability != null &&
                exposureLenses.usage != null && (
                  <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700/30 dark:bg-amber-900/20 dark:text-amber-200">
                    {t("exposureGapCallout", {
                      capability: formatLensPct(exposureLenses.capability),
                      usage: formatLensPct(exposureLenses.usage),
                    })}
                  </p>
                )
            }
          </div>
        )}

        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">{t("sectionTopSkills")}</h2>
          <div className="space-y-2.5">
            {career.skills.map((skill, idx) => (
              <div key={skill} className="flex items-center gap-3">
                <span className="text-xs font-bold text-zinc-600 w-5 tabular-nums">
                  {idx + 1}.
                </span>
                <span
                  className="flex-1 px-3 py-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/20 text-sm text-violet-800 dark:text-violet-200"
                >
                  {skill}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {onet && (
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-6">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">
              {t("onetProfileLabel")}
            </p>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">{t("onetWhatThisWorkInvolves")}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-4xl">
              {onet.description}
            </p>
            {onet.sampleTitles.length > 0 && (
              <p className="text-xs text-zinc-500 mt-3">
                {t("commonTitlesLabel")} {onet.sampleTitles.slice(0, 6).join(", ")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">{t("sectionRepresentativeTasks")}</h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                {onet.tasks.slice(0, 5).map((task) => (
                  <li key={task.id} className="flex gap-2">
                    <span className="text-violet-400 mt-0.5">•</span>
                    <span>{task.title}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">{t("sectionDetailedWorkActivities")}</h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                {onet.detailedWorkActivities.slice(0, 5).map((activity) => (
                  <li key={activity.id} className="flex gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>{activity.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {onet.technologySkills.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">{t("sectionToolsAndTechnologies")}</h3>
                <div className="flex flex-wrap gap-2">
                  {onet.technologySkills.slice(0, 10).map((tech) => (
                    <span
                      key={`${tech.category}-${tech.name}`}
                      className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200 dark:border-zinc-700/60 text-xs text-zinc-700 dark:text-zinc-300"
                      title={tech.category}
                    >
                      {tech.name}
                      {tech.hot && <span className="text-orange-400"> · hot</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {onet.relatedOccupations.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-3">{t("sectionRelatedOccupations")}</h3>
                <div className="flex flex-wrap gap-2">
                  {onet.relatedOccupations.slice(0, 8).map((related) => {
                    const chip = (
                      <span className="px-2.5 py-1 rounded-lg bg-violet-100 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700/25 text-xs text-violet-800 dark:text-violet-200">
                        {related.title}
                        {related.brightOutlook && <span className="text-green-400"> · Bright</span>}
                      </span>
                    );
                    return allInsightCodes.has(related.code) ? (
                      <Link key={related.onetCode} href={`/careers/${related.code}`} className="hover:opacity-80 transition-opacity">
                        {chip}
                      </Link>
                    ) : (
                      <span key={related.onetCode}>{chip}</span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Predictive chart */}
      <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">
          {t("sectionEmploymentProjections")}
        </h2>
        <PredictiveChart selectedSector={career.sectorName} />
      </div>

      {/* Employment & wage trend */}
      <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gradient mb-1">
          {t("sectionEmploymentWageTrend")}
        </h2>
        <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3">
          {t("blsOewsPeriod")}
        </p>
        <hr className="divider-glow mb-5" />
        {trend.length >= 2 ? (
          <OccupationTrendChart code={code} />
        ) : (
          <p className="text-sm text-zinc-500 italic">
            {t("limitedHistoricalData")}
          </p>
        )}
        <p className="text-xs text-zinc-500 mt-4">
          {t("sourceOews")}{" "}
          <Link href="/sources" className="underline underline-offset-2 hover:text-zinc-400">
            {t("seeSourcesLink")}
          </Link>
          .
        </p>
      </div>

      {/* Sector comparison table */}
      <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">{t("sectionSectorComparison")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                <th className="text-left py-3 px-4">{t("colMetric")}</th>
                <th className="text-right py-3 px-4">{t("colThisCareer")}</th>
                <th className="text-right py-3 px-4">{t("colSectorAverage")}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-zinc-200/60 dark:border-zinc-800/50">
                <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{t("labelAIExposure")}</td>
                <td className="py-3 px-4 text-right" style={{ color: riskColor }}>
                  {(career.automationProbability * 100).toFixed(1)}%
                </td>
                <td className="py-3 px-4 text-right text-zinc-900 dark:text-white">
                  {sectorAgg ? `${(sectorAgg.avgRisk * 100).toFixed(1)}%` : "N/A"}
                </td>
              </tr>
              <tr className="border-b border-zinc-200/60 dark:border-zinc-800/50">
                <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{t("labelOutlook")}</td>
                <td
                  className={`py-3 px-4 text-right font-medium ${
                    career.outlook === "Bright" ? "text-green-400" : "text-zinc-400"
                  }`}
                >
                  {career.outlook === "Bright" ? t("outlookBright") : t("outlookAverage")}
                </td>
                <td className="py-3 px-4 text-right text-zinc-900 dark:text-white">
                  {sectorAgg ? `${(sectorAgg.brightShare * 100).toFixed(0)}% Bright` : "N/A"}
                </td>
              </tr>
              <tr className="border-b border-zinc-200/60 dark:border-zinc-800/50">
                <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{t("labelMedianSalary")}</td>
                <td className="py-3 px-4 text-right text-zinc-900 dark:text-white font-medium">
                  {formatCurrency(career.medianSalary)}
                </td>
                <td className="py-3 px-4 text-right text-zinc-500">N/A</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{t("labelAIResiliency")}</td>
                <td className="py-3 px-4 text-right text-cyan-700 dark:text-cyan-400 font-bold">
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
function formatLensPct(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function clampPct(value: number) {
  return Math.min(100, Math.max(0, value));
}
