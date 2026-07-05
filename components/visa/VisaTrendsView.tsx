"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Reveal from "@/components/ui/Reveal";
import { useT } from "@/lib/i18n/useT";
import { useFormatters } from "@/lib/i18n/useFormatters";
import DataAsOfBadge from "@/components/ui/DataAsOfBadge";
import {
  getByYear,
  getFiscalYears,
  getLatestYear,
  getOccupationsSorted,
  getTopOccupationsByLatestYear,
  getTopOccupationsByTotal,
  getAllEmployers,
  getTopStates,
  getAllStates,
  getExposureTierAggregation,
  getOccupationsWithWageTrend,
  EXPOSURE_TIERS,
} from "@/lib/h1b";
import type { TalentBottleneckData } from "@/lib/talent-bottleneck";
// Deep-dive sections (client components with local state — no canvas, so no need for ssr:false)
import EmployerDeepDiveSection from "./EmployerDeepDiveSection";
import StateDeepDiveSection from "./StateDeepDiveSection";
import TalentBottleneckLens from "./TalentBottleneckLens";

// ── Loading stub ──────────────────────────────────────────────────────────────

function LoadingStub() {
  const t = useT("visa");
  return (
    <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
      {t("loading")}
    </div>
  );
}

// ── Dynamic chart imports (ssr:false — charts use canvas) ─────────────────────

const WageTrendChart = dynamic(() => import("./WageTrendChart"), {
  ssr: false,
  loading: () => <LoadingStub />,
});
const VolumeTrendChart = dynamic(() => import("./VolumeTrendChart"), {
  ssr: false,
  loading: () => <LoadingStub />,
});
const TopOccupationsChart = dynamic(() => import("./TopOccupationsChart"), {
  ssr: false,
  loading: () => <LoadingStub />,
});
const OccWageTrendChart = dynamic(() => import("./OccWageTrendChart"), {
  ssr: false,
  loading: () => <LoadingStub />,
});
const OccupationMixChart = dynamic(() => import("./OccupationMixChart"), {
  ssr: false,
  loading: () => <LoadingStub />,
});
const ExposureTierChart = dynamic(() => import("./ExposureTierChart"), {
  ssr: false,
  loading: () => <LoadingStub />,
});

// ── Small building blocks ─────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "violet" | "cyan" | "amber";
}) {
  const accentClass =
    accent === "cyan"
      ? "text-cyan-600 dark:text-cyan-400"
      : accent === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "text-violet-600 dark:text-violet-400";
  return (
    <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
        {label}
      </p>
      <p className={`text-2xl font-bold tabular-nums leading-tight ${accentClass}`}>{value}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">{sub}</p>
    </div>
  );
}

function Section({
  title,
  subhead,
  children,
  delay = 0,
}: {
  title: string;
  subhead?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">{title}</h2>
          {subhead && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              {subhead}
            </p>
          )}
        </div>
        {children}
      </section>
    </Reveal>
  );
}

const CARD =
  "glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4";

// ── Main view ─────────────────────────────────────────────────────────────────

export interface VisaTrendsViewProps {
  talentBottleneck?: TalentBottleneckData;
}

export default function VisaTrendsView({ talentBottleneck }: VisaTrendsViewProps = {}) {
  const t = useT("visa");
  const { formatNumber, formatCurrency } = useFormatters();

  const years = getFiscalYears();
  const byYear = getByYear();
  const latest = getLatestYear();
  const latestYearStr = String(latest.fiscalYear);

  // Wage + volume series aligned to `years`.
  const wage = useMemo(
    () => ({
      median: byYear.map((r) => r.medianWageAnnual),
      p25: byYear.map((r) => r.p25WageAnnual),
      p75: byYear.map((r) => r.p75WageAnnual),
    }),
    [byYear],
  );
  const volume = useMemo(
    () => ({
      certified: byYear.map((r) => r.certifiedLcas),
      positions: byYear.map((r) => r.totalWorkerPositions),
    }),
    [byYear],
  );

  // Top occupations (multi-line) — leaders in the latest fiscal year.
  const topOccLatest = useMemo(() => getTopOccupationsByLatestYear(9), []);
  const occSeries = useMemo(
    () =>
      topOccLatest.map((o) => ({
        label: o.socTitle,
        data: years.map((y) => o.countByYear[String(y)] ?? 0),
      })),
    [topOccLatest, years],
  );

  // Occupation wage trend — top 8 with wageByYear data.
  const occWithWage = useMemo(() => getOccupationsWithWageTrend(8), []);
  const occWageSeries = useMemo(
    () =>
      occWithWage.map((o) => ({
        label: o.socTitle,
        wageByYear: o.wageByYear!,
      })),
    [occWithWage],
  );

  // Occupation mix (100% stacked) — top 8 by total + aggregated "Other".
  const mixSeries = useMemo(() => {
    const top = getTopOccupationsByTotal(8);
    const allOcc = getOccupationsSorted();
    const totalByYear = years.map((y) =>
      allOcc.reduce((sum, o) => sum + (o.countByYear[String(y)] ?? 0), 0),
    );
    const topSeries = top.map((o) => ({
      label: o.socTitle,
      data: years.map((y, i) => {
        const total = totalByYear[i];
        return total > 0 ? ((o.countByYear[String(y)] ?? 0) / total) * 100 : 0;
      }),
    }));
    const otherData = years.map((_, i) => {
      const topShare = topSeries.reduce((sum, s) => sum + s.data[i], 0);
      return Math.max(0, 100 - topShare);
    });
    return [
      ...topSeries,
      { label: t("mixOtherLabel"), data: otherData, colorIndex: 10 },
    ];
  }, [years, t]);

  // AI-exposure tiers.
  const exposure = useMemo(() => getExposureTierAggregation(), []);
  const tierLabelKey: Record<string, string> = {
    Low: "tierLow",
    Medium: "tierMedium",
    High: "tierHigh",
    "Very High": "tierVeryHigh",
    Unclassified: "tierUnclassified",
  };
  const exposureTiers = useMemo(
    () =>
      EXPOSURE_TIERS.map((tier) => {
        const s = exposure.tiers.find((x) => x.tier === tier)!;
        return {
          tier,
          label: t(tierLabelKey[tier]),
          data: years.map((y) => s.countByYear[String(y)] ?? 0),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exposure, years, t],
  );
  const matchRatePct = `${Math.round(exposure.occupationMatchRate * 100)}%`;

  const allEmployers = useMemo(() => getAllEmployers(), []);
  const states = useMemo(() => getTopStates(10), []);
  const allStates = useMemo(() => getAllStates(), []);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-10">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <Reveal>
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/25">
              {t("pageBadge")}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">{t("pageTitle")}</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-2xl leading-relaxed">
            {t("pageSubhead")}
          </p>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <DataAsOfBadge datasetId="h1b-trends" />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 max-w-2xl leading-relaxed">
            {t("disclaimer")}
          </p>
        </div>
      </Reveal>

      {/* ── Headline stat cards ──────────────────────────────────────────── */}
      <Reveal delay={80}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={t("statVolumeLabel", { year: latestYearStr })}
            value={formatNumber(latest.certifiedLcas)}
            sub={t("statVolumeSub")}
            accent="violet"
          />
          <StatCard
            label={t("statWageLabel", { year: latestYearStr })}
            value={formatCurrency(latest.medianWageAnnual)}
            sub={t("statWageSub")}
            accent="cyan"
          />
          <StatCard
            label={t("statEmployersLabel", { year: latestYearStr })}
            value={formatNumber(latest.distinctEmployers)}
            sub={t("statEmployersSub")}
            accent="amber"
          />
          <StatCard
            label={t("statTopOccLabel", { year: latestYearStr })}
            value={topOccLatest[0]?.socTitle ?? "—"}
            sub={t("statTopOccSub")}
            accent="violet"
          />
        </div>
      </Reveal>

      {/* ── Wage trend ───────────────────────────────────────────────────── */}
      <Section title={t("wageSectionTitle")} subhead={t("wageSectionSubhead")} delay={100}>
        <div className={CARD}>
          <WageTrendChart years={years} median={wage.median} p25={wage.p25} p75={wage.p75} />
        </div>
      </Section>

      {/* ── Volume trend ─────────────────────────────────────────────────── */}
      <Section title={t("volumeSectionTitle")} subhead={t("volumeSectionSubhead")} delay={120}>
        <div className={CARD}>
          <VolumeTrendChart years={years} certified={volume.certified} positions={volume.positions} />
        </div>
      </Section>

      {/* ── Top occupations ──────────────────────────────────────────────── */}
      <Section title={t("occSectionTitle")} subhead={t("occSectionSubhead")} delay={140}>
        <div className={CARD}>
          <TopOccupationsChart years={years} series={occSeries} />
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
            {t("occNote")}
          </p>
        </div>
      </Section>

      {/* ── Occupation wage trend (deep-dive 1) ──────────────────────────── */}
      <Section
        title={t("occWageTrendSectionTitle")}
        subhead={t("occWageTrendSectionSubhead")}
        delay={145}
      >
        <div className={CARD}>
          <OccWageTrendChart years={years} series={occWageSeries} />
        </div>
      </Section>

      {/* ── Occupation mix ───────────────────────────────────────────────── */}
      <Section title={t("mixSectionTitle")} subhead={t("mixSectionSubhead")} delay={150}>
        <div className={CARD}>
          <OccupationMixChart years={years} series={mixSeries} />
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
            {t("mixNote")}
          </p>
        </div>
      </Section>

      {/* ── AI-exposure tiers ────────────────────────────────────────────── */}
      <Section
        title={t("exposureSectionTitle")}
        subhead={t("exposureSectionSubhead")}
        delay={160}
      >
        <div className={CARD}>
          <ExposureTierChart years={years} tiers={exposureTiers} />
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
            {t("exposureCaption", { rate: matchRatePct })}
          </p>
        </div>
      </Section>

      {talentBottleneck && <TalentBottleneckLens data={talentBottleneck} />}

      {/* ── Employer deep-dive (deep-dive 2) ─────────────────────────────── */}
      <Section
        title={t("employersSectionTitle")}
        subhead={t("employersSectionSubhead")}
        delay={170}
      >
        <div className={CARD}>
          <EmployerDeepDiveSection employers={allEmployers} years={years} />
        </div>
      </Section>

      {/* ── Top states (existing accessible table) ───────────────────────── */}
      <Section title={t("statesSectionTitle")} subhead={t("statesSectionSubhead")} delay={180}>
        <div className={`${CARD} overflow-x-auto`} tabIndex={0}>
          <table className="w-full text-sm" aria-label={t("statesTableName")}>
            <caption className="sr-only">{t("statesTableCaption")}</caption>
            <thead>
              <tr className="text-left text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                <th scope="col" className="py-2 pr-4 font-medium">
                  #
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  {t("colState")}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium text-right">
                  {t("colTotal")}
                </th>
                <th scope="col" className="py-2 pr-4 font-medium text-right">
                  {t("colMedianWage")}
                </th>
              </tr>
            </thead>
            <tbody>
              {states.map((s, i) => (
                <tr
                  key={s.state}
                  className="border-b border-zinc-100 dark:border-zinc-800/60 last:border-0"
                >
                  <td className="py-2 pr-4 tabular-nums text-zinc-400">{i + 1}</td>
                  <th
                    scope="row"
                    className="py-2 pr-4 font-medium text-zinc-800 dark:text-zinc-100"
                  >
                    {s.state}
                  </th>
                  <td className="py-2 pr-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatNumber(s.totalCount)}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                    {formatCurrency(s.medianWageAnnualLatest)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── State deep-dive (deep-dive 3) ────────────────────────────────── */}
      <Section
        title={t("stateDeepSectionTitle")}
        subhead={t("stateDeepSectionSubhead")}
        delay={185}
      >
        <div className={CARD}>
          <StateDeepDiveSection states={allStates} years={years} defaultState="CA" />
        </div>
      </Section>

      {/* ── Footer caveat ────────────────────────────────────────────────── */}
      <Reveal delay={200}>
        <section
          className="rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/60 dark:bg-amber-500/5 p-6 space-y-2"
          aria-labelledby="visa-caveat-heading"
        >
          <h2
            id="visa-caveat-heading"
            className="text-base font-bold tracking-tight text-zinc-900 dark:text-white"
          >
            {t("caveatTitle")}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {t("caveatBody")}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
            {t("sourceNote")}
          </p>
        </section>
      </Reveal>
    </div>
  );
}
