"use client";

import Link from "next/link";
import { colorForRisk, formatCurrency, formatNumber } from "@/lib/utils";
import { computeResiliencyScore } from "@/lib/data";
import type { CareerInsight, SectorAggregate, ReskillingTarget } from "@/lib/data";
import type { OnetEnrichmentOccupation } from "@/lib/onet";
import type { TrendPoint } from "@/lib/snapshot";
import type { OccExposureLenses } from "@/lib/exposure";
import type { H1bOccupationSignal } from "@/lib/h1b";
import type { CareerEvidencePassport } from "@/lib/career-evidence-passport";
import OccupationTrendChart from "@/components/charts/OccupationTrendChart";
import PredictiveChart from "@/components/charts/PredictiveChart";
import { useT } from "@/lib/i18n/useT";

interface CareerDetailClientProps {
  code: string;
  career: CareerInsight | null;
  allInsightCodes: string[];
  onet: OnetEnrichmentOccupation | null;
  sectorAgg: SectorAggregate | null;
  trend: TrendPoint[];
  transitions: ReskillingTarget[];
  exposureLenses: OccExposureLenses | null;
  h1bSignal: H1bOccupationSignal | null;
  evidencePassport: CareerEvidencePassport | null;
  h1bFirst: number;
  h1bLatest: number;
}

export default function CareerDetailClient({
  code,
  career,
  allInsightCodes,
  onet,
  sectorAgg,
  trend,
  transitions,
  exposureLenses,
  h1bSignal,
  evidencePassport,
  h1bFirst,
  h1bLatest,
}: CareerDetailClientProps) {
  const t = useT("careers");

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

  const allInsightCodeSet = new Set(allInsightCodes);
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

      {evidencePassport && (
        <CareerEvidencePassportPanel passport={evidencePassport} />
      )}

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

      {/* H-1B Visa Sponsorship Demand */}
      <section
        aria-labelledby="h1b-section-heading"
        className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6"
      >
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 id="h1b-section-heading" className="text-lg font-semibold text-gradient">
            {t("h1bSectionTitle")}
          </h2>
          <Link
            href="/visa"
            className="shrink-0 text-xs text-violet-500 dark:text-violet-400 hover:text-violet-400 dark:hover:text-violet-300 underline underline-offset-2 transition-colors"
          >
            {t("h1bViewTrends")}
          </Link>
        </div>
        {h1bSignal ? (
          <>
            <p className="text-xs text-zinc-500 mb-4 max-w-2xl">
              {t("h1bSectionSubtitle", { first: h1bSignal.firstYear, latest: h1bSignal.latestYear })}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
                  {formatNumber(h1bSignal.totalCount)}
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {t("h1bStatDecadeTotal")}
                </div>
              </div>
              <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
                  {formatNumber(h1bSignal.latestYearCount)}
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {t("h1bStatLatestVolume", { year: h1bSignal.latestYear })}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">
                  {t("h1bShareNote", {
                    pct: Math.round(h1bSignal.shareOfLatestYear * 100) + "%",
                    year: h1bSignal.latestYear,
                  })}
                </div>
              </div>
              <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold tabular-nums text-zinc-900 dark:text-white">
                  {formatCurrency(h1bSignal.medianWageAnnualLatest)}
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {t("h1bStatMedianWage")}
                </div>
              </div>
              <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center">
                <div className="text-xl font-bold tabular-nums text-zinc-900 dark:text-white">
                  {t("h1bRankValue", {
                    rank: h1bSignal.rankByTotal,
                    total: h1bSignal.totalOccupations,
                  })}
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {t("h1bStatRank")}
                </div>
              </div>
            </div>
            <H1bSparkline countByYear={h1bSignal.countByYear} label={t("h1bSparklineLabel", { first: h1bFirst, latest: h1bLatest })} />
          </>
        ) : (
          <p className="text-sm text-zinc-500 italic mt-2">
            {t("h1bNoData", { first: h1bFirst, latest: h1bLatest })}
          </p>
        )}
      </section>

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
                    return allInsightCodeSet.has(related.code) ? (
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
          <OccupationTrendChart code={code} data={trend} />
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

function CareerEvidencePassportPanel({
  passport,
}: {
  passport: CareerEvidencePassport;
}) {
  const t = useT("careers");
  const lcaCaveat = t("passportLcaCaveat");
  const postingsCaveat = t("passportPostingsCaveat", {
    mode: passport.jobPostingsMode,
    status: passport.jobPostingsSourceStatus ?? "proxy",
  });

  return (
    <section
      aria-labelledby="career-evidence-passport-title"
      className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
            {t("passportEyebrow")}
          </p>
          <h2 id="career-evidence-passport-title" className="mt-1 text-xl font-bold text-gradient">
            {t("passportTitle")}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t("passportSubtitle", { soc: passport.socCode })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
          <span className="rounded-full border border-amber-300/60 bg-amber-100/70 px-2.5 py-1 text-amber-800 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            {t("passportBadgeProxy")}
          </span>
          <span className="rounded-full border border-violet-300/60 bg-violet-100/70 px-2.5 py-1 text-violet-800 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-200">
            {t("passportBadgeDescriptive")}
          </span>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <PassportMetric
          label={t("passportExposureLabel")}
          value={`${passport.aiExposurePct.toFixed(1)}%`}
          detail={`${passport.automationRisk} · ${t("passportSourceAnthropic")}`}
        />
        <PassportMetric
          label={t("passportWageLabel")}
          value={formatCurrency(passport.medianAnnualSalary)}
          detail={
            passport.h1bMedianWageAnnual
              ? t("passportH1bWageDetail", {
                  wage: formatCurrency(passport.h1bMedianWageAnnual),
                })
              : t("passportNoH1bWage")
          }
        />
        <PassportMetric
          label={t("passportProjectionLabel")}
          value={
            passport.projectedOpenings != null
              ? formatNumber(passport.projectedOpenings)
              : "—"
          }
          detail={t("passportProjectionDetail", {
            window: passport.projectionWindow ?? "2024–2034",
            change:
              passport.employmentChangePct == null
                ? "—"
                : `${passport.employmentChangePct > 0 ? "+" : ""}${passport.employmentChangePct.toFixed(1)}%`,
          })}
        />
        <PassportMetric
          label={t("passportDemandLabel")}
          value={
            passport.h1bLatestLcas != null
              ? formatNumber(passport.h1bLatestLcas)
              : "—"
          }
          detail={t("passportDemandDetail", {
            year: passport.h1bLatestFiscalYear ? `FY${passport.h1bLatestFiscalYear}` : "FY—",
            postings:
              passport.latestAnnualPostings == null
                ? "—"
                : formatNumber(passport.latestAnnualPostings),
            postingYear: passport.jobPostingYear ?? "—",
          })}
        />
      </dl>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/45">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {t("passportSkillsTitle")}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {passport.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs text-cyan-800 dark:border-cyan-700/30 dark:bg-cyan-900/20 dark:text-cyan-200"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/45">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {t("passportTransitionsTitle")}
          </h3>
          <div className="mt-3 space-y-2">
            {passport.transitions.map((transition) => (
              <Link
                key={transition.socCode}
                href={`/careers/${transition.socCode}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white/60 px-3 py-2 text-sm transition-colors hover:border-violet-300 hover:text-violet-700 dark:border-zinc-800 dark:bg-zinc-950/35 dark:hover:border-violet-500/50 dark:hover:text-violet-200"
              >
                <span>{transition.title}</span>
                <span className="shrink-0 text-xs font-semibold text-zinc-500">
                  {t("passportTransitionScore", { score: transition.transitionScore })}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <ul className="mt-5 grid gap-2 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400 md:grid-cols-3">
        {[lcaCaveat, postingsCaveat, ...passport.caveats.slice(2)].map((caveat) => (
          <li key={caveat} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{caveat}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PassportMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/45">
      <dt className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold text-zinc-900 dark:text-white">
        {value}
      </dd>
      <dd className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {detail}
      </dd>
    </div>
  );
}

function formatLensPct(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function clampPct(value: number) {
  return Math.min(100, Math.max(0, value));
}

function H1bSparkline({
  countByYear,
  label,
}: {
  countByYear: Record<string, number>;
  label: string;
}) {
  const entries = Object.entries(countByYear).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  );
  if (entries.length < 2) return null;
  const values = entries.map(([, v]) => v);
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 200;
  const H = 40;
  const n = values.length;
  const pts = values
    .map((v, i) => {
      const x = (i / (n - 1)) * W;
      const y = H - 4 - ((v - min) / range) * (H - 8);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-labelledby="h1b-sparkline-title"
      className="w-full max-w-xs text-violet-500 dark:text-violet-400 mt-1"
    >
      <title id="h1b-sparkline-title">{label}</title>
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
