"use client";

import Link from "next/link";
import JobImpactChart from "@/components/charts/JobImpactChart";
import PredictiveChart from "@/components/charts/PredictiveChart";
import HeroRiskChecker from "@/components/dashboard/HeroRiskChecker";
import HighlightsBento from "@/components/dashboard/HighlightsBento";
import SectorScatterChart from "@/components/charts/SectorScatterChart";
import AdoptionPulse from "@/components/dashboard/AdoptionPulse";
import StatTile from "@/components/ui/StatTile";
import DataAsOfBadge from "@/components/ui/DataAsOfBadge";
import { PageHeader, SectionHeader, buttonPrimary, buttonSecondary } from "@/components/ui/PageHeader";
import { useT } from "@/lib/i18n/useT";
import type { AdoptionPulseData } from "@/lib/ai-adoption-tracker";

interface SectorSummary {
  sector: string;
  avgRisk: number;
  occupationCount: number;
  brightShare: number;
}

interface WorkforceExposureData {
  highExposureShare: number;
  highExposureWorkforce: number;
  totalWorkforce: number;
}

export interface DashboardHomeProps {
  insightsLength: number;
  totalWorkforce: number;
  sectors: SectorSummary[];
  highRiskCount: number;
  lowRiskCount: number;
  avgRiskAll: number;
  workforceExposure: WorkforceExposureData;
  /** Measured adoption (St. Louis Fed RPS + Census BTOS); section hidden when absent. */
  adoption?: AdoptionPulseData;
}

const fmtM = (n: number) => (n / 1_000_000).toFixed(1);
const fmtDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export default function DashboardHome({
  insightsLength,
  totalWorkforce,
  sectors,
  avgRiskAll,
  workforceExposure,
  adoption,
}: DashboardHomeProps) {
  const t = useT("dashboard");
  const ta = useT("adoption");
  const tc = useT("common");
  const h = adoption?.headlines;

  const lensCards = [
    { href: "/global", eyebrow: t("lensGlobalEyebrow"), title: t("lensGlobalTitle"), description: t("lensGlobalDesc") },
    { href: "/careers", eyebrow: t("lensWorkforceEyebrow"), title: t("lensWorkforceTitle"), description: t("lensWorkforceDesc") },
    { href: "/labor", eyebrow: t("lensLaborEyebrow"), title: t("lensLaborTitle"), description: t("lensLaborDesc") },
    { href: "/analysis", eyebrow: t("lensAnalysisEyebrow"), title: t("lensAnalysisTitle"), description: t("lensAnalysisDesc") },
    { href: "/sources", eyebrow: t("lensGovernanceEyebrow"), title: t("lensGovernanceTitle"), description: t("lensGovernanceDesc") },
  ];

  const sectorMax = Math.max(...sectors.map((s) => s.avgRisk), 0.01);

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={t("pageEyebrow")}
        title={t("pageTitle")}
        description={t("heroSubhead", { count: insightsLength })}
        meta={<DataAsOfBadge datasetIds={["occupation-snapshot", "ai-adoption-tracker", "jolts"]} />}
        actions={
          <>
            <Link href="/report" className={buttonSecondary}>{t("readReport")}</Link>
            <Link href="/careers" className={buttonPrimary}>
              {t("exploreAllCareers")} <span aria-hidden="true">→</span>
            </Link>
          </>
        }
      />

      {/* ─── KPI ROW ───────────────────────────────────────────────────────── */}
      <section aria-label={t("pageEyebrow")} className="space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatTile
            label={t("kpiHighExposure")}
            value={`${(workforceExposure.highExposureShare * 100).toFixed(1)}%`}
            detail={t("kpiHighExposureDetail", { high: fmtM(workforceExposure.highExposureWorkforce), total: fmtM(workforceExposure.totalWorkforce) })}
            source={t("kpiSourceExposure")}
            href="/careers?risk=high"
          />
          <StatTile
            label={t("statAvgExposureLabel")}
            value={`${(avgRiskAll * 100).toFixed(1)}%`}
            detail={t("kpiAvgExposureDetail", { count: insightsLength })}
            source={t("kpiSourceExposure")}
            href="/sectors"
          />
          <StatTile
            label={t("statOccupationsLabel")}
            value={insightsLength.toLocaleString("en-US")}
            detail={t("kpiOccupationsDetail", { workers: fmtM(totalWorkforce) })}
            source={t("kpiSourceOccupations")}
            href="/careers"
          />
          {h?.workerAdoptionWork && (
            <StatTile
              label={ta("kpiWorkers")}
              value={`${h.workerAdoptionWork.value.toFixed(1)}%`}
              delta={h.workerAdoptionWork.yoyPp != null ? { value: h.workerAdoptionWork.yoyPp, suffix: "pp", label: ta("kpiYoy") } : null}
              source="St. Louis Fed RPS"
              href="/analysis#measured-adoption"
            />
          )}
          {h?.businessAiUse && (
            <StatTile
              label={ta("kpiFirms")}
              value={`${h.businessAiUse.value.toFixed(1)}%`}
              detail={h.businessAiUse.refEnd ? ta("kpiFirmsDetail", { date: fmtDay(h.businessAiUse.refEnd) }) : undefined}
              source="Census BTOS"
              href="/analysis#measured-adoption"
            />
          )}
          {h?.workerTimeSavings && (
            <StatTile
              label={ta("kpiTimeSavings")}
              value={`${h.workerTimeSavings.value.toFixed(1)}%`}
              delta={h.workerTimeSavings.yoyPp != null ? { value: h.workerTimeSavings.yoyPp, suffix: "pp", label: ta("kpiYoy") } : null}
              source="St. Louis Fed RPS"
              href="/analysis#measured-adoption"
            />
          )}
        </div>
        <p className="max-w-4xl text-xs leading-relaxed text-zinc-500 dark:text-zinc-400" role="note">
          {t("aboutDataNotePre")}{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Anthropic Economic Index</span>
          {t("aboutDataNotePost")}{" "}
          <Link href="/sources" className="text-[var(--accent)] underline underline-offset-2">{tc("seeSources")}</Link>.
        </p>
      </section>

      {/* ─── CHECKER + SECTOR TABLE ────────────────────────────────────────── */}
      <section className="grid gap-4 xl:grid-cols-2">
        <div>
          <SectionHeader title={t("checkerHeading")} description={t("checkerDesc", { count: insightsLength })} />
          <HeroRiskChecker />
        </div>
        <div>
          <SectionHeader
            title={t("sectorTableTitle")}
            description={t("sectorTableDesc")}
            actions={<Link href="/sectors" className="text-sm font-medium text-[var(--accent)] hover:underline underline-offset-2">{t("viewAllSectors")} →</Link>}
          />
          <div className="glass overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)] text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <th scope="col" className="px-4 py-2.5">{t("colSector")}</th>
                  <th scope="col" className="px-4 py-2.5">{t("colExposure")}</th>
                  <th scope="col" className="hidden px-4 py-2.5 text-right sm:table-cell">{t("colOccupations")}</th>
                  <th scope="col" className="px-4 py-2.5 text-right">{t("colBright")}</th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((s) => (
                  <tr key={s.sector} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-subtle)]">
                    <th scope="row" className="px-4 py-2.5 text-left font-medium">
                      <Link href={`/sectors/${encodeURIComponent(s.sector)}`} className="text-zinc-900 hover:text-[var(--accent)] dark:text-zinc-100">
                        {s.sector}
                      </Link>
                    </th>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/5" aria-hidden="true">
                          <span className="block h-full rounded-full bg-[#2a78d6] dark:bg-[#3987e5]" style={{ width: `${(s.avgRisk / sectorMax) * 100}%` }} />
                        </span>
                        <span className="tabular-nums text-zinc-700 dark:text-zinc-300">{(s.avgRisk * 100).toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="hidden px-4 py-2.5 text-right tabular-nums text-zinc-600 sm:table-cell dark:text-zinc-400">{s.occupationCount}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">{(s.brightShare * 100).toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {adoption && <AdoptionPulse data={adoption} />}

      {/* ─── MARKET INTELLIGENCE ───────────────────────────────────────────── */}
      <section>
        <SectionHeader title={t("marketIntelligence")} />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="glass p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">{t("chartTop20")}</h3>
            <JobImpactChart />
          </div>
          <div className="glass p-5">
            <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">{t("chartProjections")}</h3>
            <PredictiveChart />
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title={t("sectorLandscape")} description={t("sectorScatterDesc")} />
        <div className="glass p-5">
          <SectorScatterChart />
        </div>
      </section>

      <section>
        <SectionHeader
          title={t("standoutCareers")}
          description={
            <>
              {t("standoutSubhead")}{" "}
              <Link href="/sources" className="text-[var(--accent)] underline underline-offset-2">{tc("sources")}</Link>.
            </>
          }
        />
        <HighlightsBento />
      </section>

      {/* ─── EXPLORE ───────────────────────────────────────────────────────── */}
      <section aria-labelledby="choose-lens-heading">
        <SectionHeader id="choose-lens-heading" eyebrow={t("chooseLensKicker")} title={t("chooseLensHeading")} description={t("chooseLensSubhead")} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {lensCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="glass glass-hover group flex flex-col p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
            >
              <span className="eyebrow">{card.eyebrow}</span>
              <h3 className="mt-2 text-[15px] font-semibold text-zinc-900 group-hover:text-[var(--accent)] dark:text-white">{card.title}</h3>
              <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">{card.description}</p>
              <span className="mt-3 text-[13px] font-medium text-[var(--accent)]">
                {t("chooseLensCta")} <span aria-hidden="true">→</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
