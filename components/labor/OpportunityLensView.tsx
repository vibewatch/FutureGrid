"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import * as d3 from "d3";
import AccessibleChart from "@/components/charts/AccessibleChart";
import DataAsOfBadge from "@/components/ui/DataAsOfBadge";
import { useFormatters } from "@/lib/i18n/useFormatters";
import { useLocale, useT } from "@/lib/i18n/useT";
import type { LaborOpportunityData, LaborOpportunityRow } from "@/lib/labor-opportunity";
import { colorForRisk } from "@/lib/utils";

const CHART_W = 760;
const CHART_H = 430;
const CHART_MARGIN = { top: 28, right: 24, bottom: 62, left: 68 };

const RISK_TONES: Record<LaborOpportunityRow["automationRisk"], string> = {
  Low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/30",
  Medium: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/30",
  High: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-400/30",
  "Very High": "bg-red-500/15 text-red-700 dark:text-red-300 border-red-400/30",
};

interface OpportunityLensViewProps {
  data: LaborOpportunityData;
}

export default function OpportunityLensView({ data }: OpportunityLensViewProps) {
  const t = useT("labor");
  const careersT = useT("careers");
  const locale = useLocale();
  const { formatCurrency, formatNumber } = useFormatters();

  if (data.chartRows.length === 0) {
    return (
      <section className="glass rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("opportunityNoRows")}</p>
      </section>
    );
  }

  const compactNumber = new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  const xMax = Math.max(
    40,
    Math.ceil((d3.max(data.chartRows, (row) => row.aiExposure * 100) ?? 40) / 10) * 10,
  );
  const xScale = d3
    .scaleLinear()
    .domain([0, xMax])
    .range([CHART_MARGIN.left, CHART_W - CHART_MARGIN.right]);

  const minOpenings = Math.max(
    1,
    d3.min(data.chartRows, (row) => row.annualOpenings) ?? 1,
  );
  const maxOpenings = Math.max(
    minOpenings * 1.2,
    d3.max(data.chartRows, (row) => row.annualOpenings) ?? minOpenings * 1.2,
  );
  const yScale = d3
    .scaleLog()
    .domain([minOpenings * 0.9, maxOpenings * 1.05])
    .range([CHART_H - CHART_MARGIN.bottom, CHART_MARGIN.top]);

  const sizeMax =
    d3.max(
      data.chartRows,
      (row) => row.currentEmployment ?? row.projectedEmployment ?? row.annualOpenings,
    ) ?? 1;
  const rScale = d3.scaleSqrt().domain([0, sizeMax]).range([4, 16]);

  const xTicks = xScale.ticks(5);
  const yTicks = uniqueNumbers(
    yScale
      .ticks(5)
      .map((value) => Math.round(value))
      .filter((value) => value >= minOpenings && value <= maxOpenings),
  );

  const exposureMedianX = xScale(data.summary.exposureMedian * 100);
  const openingsMedianY = yScale(Math.max(1, data.summary.openingsMedian));

  const srSummary = (
    <table>
      <caption>{t("opportunityA11yTableCaption")}</caption>
      <thead>
        <tr>
          <th scope="col">{t("opportunityA11yThOccupation")}</th>
          <th scope="col">{t("opportunityA11yThRisk")}</th>
          <th scope="col">{t("opportunityA11yThExposure")}</th>
          <th scope="col">{t("opportunityA11yThOpenings")}</th>
          <th scope="col">{t("opportunityA11yThWage")}</th>
        </tr>
      </thead>
      <tbody>
        {data.chartRows.slice(0, 12).map((row) => (
          <tr key={row.socCode}>
            <th scope="row">{row.title}</th>
            <td>{riskLabel(row.automationRisk, careersT)}</td>
            <td>{`${formatNumber(row.aiExposure * 100, 1)}%`}</td>
            <td>{formatNumber(row.annualOpenings)}</td>
            <td>{row.medianAnnualWage != null ? formatCurrency(row.medianAnnualWage) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
          {data.source.mode === "soc-dataset"
            ? t("opportunitySourceModeDataset")
            : t("opportunitySourceModeFallback")}
        </span>
        <span className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
          {t("opportunityBadge")}
        </span>
        <DataAsOfBadge datasetIds={data.datasetBadgeIds} />
        <Link
          href="/sources"
          className="text-xs text-zinc-500 underline underline-offset-2 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          {t("opportunitySeeSources")} →
        </Link>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight text-gradient">
          {t("opportunityHeroTitle")}
        </h2>
        <p className="mt-1.5 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          {t("opportunityHeroSubhead")}
        </p>
      </div>

      <div className="glass rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">
              {t("opportunitySourceTitle")}
            </p>
            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-white">
              {data.source.sourceName}
              {data.source.publisher ? ` · ${data.source.publisher}` : ""}
              {data.source.asOf ? ` · ${t("opportunitySourceAsOf", { date: data.source.asOf })}` : ""}
            </p>
            <p className="mt-2 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
              {data.source.mode === "soc-dataset"
                ? t("opportunitySourceDescriptionDataset")
                : t("opportunitySourceDescriptionFallback")}
            </p>
          </div>
          <p className="max-w-md text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("opportunitySourceDisclaimer")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          value={formatNumber(data.summary.occupationsTracked)}
          label={t("opportunityStatOccupations")}
        />
        <StatCard
          value={formatNumber(Math.round(data.summary.totalAnnualOpenings))}
          label={t("opportunityStatOpenings")}
        />
        <StatCard
          value={`${Math.round(data.summary.highExposureOpeningsShare * 100)}%`}
          label={t("opportunityStatHighExposureShare")}
        />
        <StatCard
          value={
            data.summary.medianTopDemandWage != null
              ? formatCurrency(data.summary.medianTopDemandWage)
              : "—"
          }
          label={t("opportunityStatMedianWage")}
        />
      </div>

      <div className="glass rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-5 sm:p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {t("opportunityChartTitle")}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t("opportunityChartDesc")}
          </p>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <LegendChip>{t("opportunityLegendExposure")}</LegendChip>
          <LegendChip>{t("opportunityLegendDemand")}</LegendChip>
          <LegendChip>{t("opportunityLegendBubble")}</LegendChip>
          <LegendChip>{t("opportunityLegendRisk")}</LegendChip>
        </div>

        <AccessibleChart
          label={t("opportunityA11yLabel")}
          summary={srSummary}
          className="block"
        >
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            className="h-auto w-full text-zinc-500 dark:text-zinc-400"
            aria-hidden="true"
          >
            {xTicks.map((tick) => {
              const x = xScale(tick);
              return (
                <g key={`x-${tick}`}>
                  <line
                    x1={x}
                    x2={x}
                    y1={CHART_MARGIN.top}
                    y2={CHART_H - CHART_MARGIN.bottom}
                    stroke="rgba(113,113,122,0.18)"
                    strokeDasharray="3 4"
                  />
                  <text
                    x={x}
                    y={CHART_H - CHART_MARGIN.bottom + 18}
                    textAnchor="middle"
                    fontSize="11"
                    fill="currentColor"
                  >
                    {tick}%
                  </text>
                </g>
              );
            })}
            {yTicks.map((tick) => {
              const y = yScale(tick);
              return (
                <g key={`y-${tick}`}>
                  <line
                    x1={CHART_MARGIN.left}
                    x2={CHART_W - CHART_MARGIN.right}
                    y1={y}
                    y2={y}
                    stroke="rgba(113,113,122,0.18)"
                    strokeDasharray="3 4"
                  />
                  <text
                    x={CHART_MARGIN.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="currentColor"
                  >
                    {compactNumber.format(tick)}
                  </text>
                </g>
              );
            })}

            <line
              x1={CHART_MARGIN.left}
              x2={CHART_W - CHART_MARGIN.right}
              y1={CHART_H - CHART_MARGIN.bottom}
              y2={CHART_H - CHART_MARGIN.bottom}
              stroke="rgba(113,113,122,0.42)"
            />
            <line
              x1={CHART_MARGIN.left}
              x2={CHART_MARGIN.left}
              y1={CHART_MARGIN.top}
              y2={CHART_H - CHART_MARGIN.bottom}
              stroke="rgba(113,113,122,0.42)"
            />

            <line
              x1={exposureMedianX}
              x2={exposureMedianX}
              y1={CHART_MARGIN.top}
              y2={CHART_H - CHART_MARGIN.bottom}
              stroke="rgba(139,92,246,0.65)"
              strokeDasharray="6 5"
            />
            <line
              x1={CHART_MARGIN.left}
              x2={CHART_W - CHART_MARGIN.right}
              y1={openingsMedianY}
              y2={openingsMedianY}
              stroke="rgba(34,211,238,0.65)"
              strokeDasharray="6 5"
            />

            {data.chartRows.map((row) => {
              const sizeValue =
                row.currentEmployment ?? row.projectedEmployment ?? row.annualOpenings;
              return (
                <circle
                  key={row.socCode}
                  cx={xScale(row.aiExposure * 100)}
                  cy={yScale(row.annualOpenings)}
                  r={rScale(sizeValue)}
                  fill={colorForRisk(row.automationRisk)}
                  fillOpacity="0.72"
                  stroke="rgba(255,255,255,0.78)"
                  strokeWidth="1"
                >
                  <title>
                    {[
                      row.title,
                      `${t("opportunityChipOpenings", {
                        n: formatNumber(row.annualOpenings),
                      })}`,
                      `${t("opportunityChipExposure", {
                        pct: formatNumber(row.aiExposure * 100, 1),
                      })}`,
                      row.medianAnnualWage != null
                        ? t("opportunityChipWage", {
                            value: formatCurrency(row.medianAnnualWage),
                          })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </title>
                </circle>
              );
            })}

            <text
              x={CHART_MARGIN.left + (CHART_W - CHART_MARGIN.left - CHART_MARGIN.right) / 2}
              y={CHART_H - 12}
              textAnchor="middle"
              fontSize="11"
              fill="currentColor"
            >
              {t("opportunityAxisExposure")}
            </text>
            <text
              transform={`translate(16 ${CHART_MARGIN.top + (CHART_H - CHART_MARGIN.top - CHART_MARGIN.bottom) / 2}) rotate(-90)`}
              textAnchor="middle"
              fontSize="11"
              fill="currentColor"
            >
              {t("opportunityAxisDemand")}
            </text>
          </svg>
        </AccessibleChart>

        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
          {t("opportunityMedianNote")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SpotlightSection
          title={t("opportunitySpotlightLowerTitle")}
          description={t("opportunitySpotlightLowerDesc")}
          rows={data.spotlight.lowerExposure}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          careersT={careersT}
          t={t}
        />
        <SpotlightSection
          title={t("opportunitySpotlightHighTitle")}
          description={t("opportunitySpotlightHighDesc")}
          rows={data.spotlight.highExposure}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          careersT={careersT}
          t={t}
        />
      </div>
    </section>
  );
}

function SpotlightSection({
  title,
  description,
  rows,
  formatCurrency,
  formatNumber,
  careersT,
  t,
}: {
  title: string;
  description: string;
  rows: LaborOpportunityRow[];
  formatCurrency: (value: number) => string;
  formatNumber: (value: number, decimals?: number) => string;
  careersT: ReturnType<typeof useT>;
  t: ReturnType<typeof useT>;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>

      <div className="space-y-3">
        {rows.map((row) => (
          <Link
            key={row.socCode}
            href={row.careerHref}
            className="group block rounded-2xl border border-zinc-200 bg-white/70 p-4 transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-violet-700/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 transition group-hover:text-violet-600 dark:text-white dark:group-hover:text-violet-300">
                  {row.title}
                </h4>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {row.sector} · SOC {row.socCode}
                </p>
              </div>
              <span
                className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${RISK_TONES[row.automationRisk]}`}
              >
                {riskLabel(row.automationRisk, careersT)}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Chip>{t("opportunityChipOpenings", { n: formatNumber(row.annualOpenings) })}</Chip>
              <Chip>{t("opportunityChipExposure", { pct: formatNumber(row.aiExposure * 100, 1) })}</Chip>
              {row.medianAnnualWage != null && (
                <Chip>
                  {t("opportunityChipWage", { value: formatCurrency(row.medianAnnualWage) })}
                </Chip>
              )}
              {row.latestAnnualPostings != null && (
                <Chip>
                  {t("opportunityChipPostings", {
                    n: formatNumber(row.latestAnnualPostings),
                  })}
                </Chip>
              )}
              {row.employmentPercentChange != null && (
                <Chip>
                  {t("opportunityChipGrowth", {
                    pct: signedPercent(row.employmentPercentChange),
                  })}
                </Chip>
              )}
            </div>

            <span className="mt-3 inline-flex items-center text-xs font-medium text-violet-600 dark:text-violet-300">
              {t("opportunityViewCareer")} →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="glass rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 p-4">
      <div className="text-2xl font-bold text-gradient">{value}</div>
      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
    </div>
  );
}

function LegendChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-700 px-2.5 py-1">
      {children}
    </span>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100/80 px-2.5 py-1 text-[11px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/80 dark:text-zinc-300">
      {children}
    </span>
  );
}

function riskLabel(risk: LaborOpportunityRow["automationRisk"], careersT: ReturnType<typeof useT>): string {
  switch (risk) {
    case "Low":
      return careersT("filterLow");
    case "Medium":
      return careersT("filterMedium");
    case "High":
      return careersT("filterHigh");
    case "Very High":
      return careersT("filterVeryHigh");
    default:
      return risk;
  }
}

function signedPercent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function uniqueNumbers(values: number[]): number[] {
  return [...new Set(values)];
}
