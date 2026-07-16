"use client";

import { useId } from "react";
import DataAsOfBadge from "@/components/ui/DataAsOfBadge";
import { useFormatters } from "@/lib/i18n/useFormatters";
import { useLocale, useT } from "@/lib/i18n/useT";
import { SECTION_IDS } from "@/lib/section-anchors";
import type { TalentBottleneckData, TalentBottleneckRow } from "@/lib/talent-bottleneck";

const PLOT_WIDTH = 760;
const PLOT_HEIGHT = 420;
const PLOT_MARGIN = { top: 28, right: 34, bottom: 68, left: 82 };
const TOP_TABLE_LIMIT = 12;

type RiskTier = NonNullable<TalentBottleneckRow["automationRisk"]> | "Unclassified";

const RISK_STYLES: Record<RiskTier, { fill: string; stroke: string; badge: string }> = {
  Low: {
    fill: "rgb(52,211,153)",
    stroke: "rgb(5,150,105)",
    badge: "border-emerald-400/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  Medium: {
    fill: "rgb(250,204,21)",
    stroke: "rgb(202,138,4)",
    badge: "border-amber-400/30 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  High: {
    fill: "rgb(245,158,11)",
    stroke: "rgb(217,119,6)",
    badge: "border-orange-400/30 bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
  "Very High": {
    fill: "rgb(251,113,133)",
    stroke: "rgb(225,29,72)",
    badge: "border-rose-400/30 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  Unclassified: {
    fill: "rgb(148,163,184)",
    stroke: "rgb(100,116,139)",
    badge: "border-slate-400/30 bg-slate-500/15 text-slate-700 dark:text-slate-300",
  },
};

function riskTier(row: TalentBottleneckRow): RiskTier {
  return row.automationRisk ?? "Unclassified";
}

function riskLabel(risk: RiskTier, t: ReturnType<typeof useT>): string {
  switch (risk) {
    case "Low":
      return t("tierLow");
    case "Medium":
      return t("tierMedium");
    case "High":
      return t("tierHigh");
    case "Very High":
      return t("tierVeryHigh");
    default:
      return t("tierUnclassified");
  }
}

function formatNullableNumber(
  value: number | null,
  formatNumber: (n: number, decimals?: number) => string,
  decimals = 0,
): string {
  return value == null ? "—" : formatNumber(value, decimals);
}

function formatExposure(
  value: number | null,
  formatNumber: (n: number, decimals?: number) => string,
): string {
  return value == null ? "—" : `${formatNumber(value * 100, 1)}%`;
}

function formatSignedDecimalPercent(
  value: number | null,
  formatNumber: (n: number, decimals?: number) => string,
): string {
  if (value == null) return "—";
  const percentagePoints = value * 100;
  return `${percentagePoints > 0 ? "+" : ""}${formatNumber(percentagePoints, 1)}%`;
}

function jobPostingModeLabel(
  mode: TalentBottleneckData["summary"]["jobPostingsMode"],
  observed: boolean,
  t: ReturnType<typeof useT>,
): string {
  if (mode === "observed-provider") return t("talentBottleneckJobPostingsObserved");
  if (mode === "observed-provider-with-seed-fallback") {
    return t("talentBottleneckJobPostingsObservedFallback");
  }
  if (observed) return t("talentBottleneckJobPostingsObservedFallback");
  return t("talentBottleneckJobPostingsSeed");
}

function KpiCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="glass rounded-2xl border border-zinc-200 bg-white/70 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold text-gradient tabular-nums">{value}</dd>
      <dd className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        {detail}
      </dd>
    </div>
  );
}

function TalentScatter({
  rows,
  t,
  formatNumber,
  formatCurrency,
  compactNumber,
}: {
  rows: TalentBottleneckRow[];
  t: ReturnType<typeof useT>;
  formatNumber: (n: number, decimals?: number) => string;
  formatCurrency: (n: number) => string;
  compactNumber: Intl.NumberFormat;
}) {
  const titleId = useId();
  const descId = useId();
  const chartRows = rows.filter(
    (row) => row.aiExposure != null && row.projectedOpenings != null,
  );
  const innerWidth = PLOT_WIDTH - PLOT_MARGIN.left - PLOT_MARGIN.right;
  const innerHeight = PLOT_HEIGHT - PLOT_MARGIN.top - PLOT_MARGIN.bottom;
  const maxOpenings = Math.max(
    1,
    ...chartRows.map((row) => row.projectedOpenings ?? 0),
  );
  const maxLcas = Math.max(1, ...chartRows.map((row) => row.latestLcas ?? 0));
  const x = (aiExposure: number | null) =>
    PLOT_MARGIN.left + Math.max(0, Math.min(1, aiExposure ?? 0)) * innerWidth;
  const y = (openings: number | null) =>
    PLOT_MARGIN.top +
    (1 - Math.max(0, Math.min(maxOpenings, openings ?? 0)) / maxOpenings) *
      innerHeight;
  const r = (latestLcas: number | null) =>
    4 + Math.sqrt(Math.max(0, latestLcas ?? 0) / maxLcas) * 15;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) =>
    Math.round(maxOpenings * ratio),
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
            {t("talentBottleneckChartTitle")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {t("talentBottleneckChartSubtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          {(["Low", "Medium", "High", "Very High", "Unclassified"] as RiskTier[]).map(
            (risk) => (
              <span key={risk} className="inline-flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: RISK_STYLES[risk].fill }}
                  aria-hidden="true"
                />
                {riskLabel(risk, t)}
              </span>
            ),
          )}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto" tabIndex={0}>
        <svg
          role="img"
          aria-label={t("talentBottleneckChartAria")}
          aria-describedby={descId}
          viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
          className="min-w-[42rem] max-w-full"
        >
          <title id={titleId}>{t("talentBottleneckChartAria")}</title>
          <desc id={descId}>{t("talentBottleneckChartDesc")}</desc>
          <rect width={PLOT_WIDTH} height={PLOT_HEIGHT} rx="18" fill="rgba(24,24,27,0.03)" />

          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={`x-${tick}`}>
              <line
                x1={x(tick)}
                x2={x(tick)}
                y1={PLOT_MARGIN.top}
                y2={PLOT_HEIGHT - PLOT_MARGIN.bottom}
                stroke="currentColor"
                className="text-zinc-200 dark:text-zinc-800"
              />
              <text
                x={x(tick)}
                y={PLOT_HEIGHT - 30}
                textAnchor="middle"
                className="fill-zinc-500 text-[10px]"
              >
                {formatNumber(tick * 100, 0)}%
              </text>
            </g>
          ))}

          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line
                x1={PLOT_MARGIN.left}
                x2={PLOT_WIDTH - PLOT_MARGIN.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="currentColor"
                className="text-zinc-200 dark:text-zinc-800"
              />
              <text
                x={PLOT_MARGIN.left - 10}
                y={y(tick) + 4}
                textAnchor="end"
                className="fill-zinc-500 text-[10px]"
              >
                {compactNumber.format(tick)}
              </text>
            </g>
          ))}

          <line
            x1={PLOT_MARGIN.left}
            x2={PLOT_WIDTH - PLOT_MARGIN.right}
            y1={PLOT_HEIGHT - PLOT_MARGIN.bottom}
            y2={PLOT_HEIGHT - PLOT_MARGIN.bottom}
            stroke="currentColor"
            className="text-zinc-400 dark:text-zinc-600"
          />
          <line
            x1={PLOT_MARGIN.left}
            x2={PLOT_MARGIN.left}
            y1={PLOT_MARGIN.top}
            y2={PLOT_HEIGHT - PLOT_MARGIN.bottom}
            stroke="currentColor"
            className="text-zinc-400 dark:text-zinc-600"
          />
          <text
            x={PLOT_MARGIN.left + innerWidth / 2}
            y={PLOT_HEIGHT - 8}
            textAnchor="middle"
            className="fill-zinc-600 text-[11px] font-semibold dark:fill-zinc-400"
          >
            {t("talentBottleneckXAxis")}
          </text>
          <text
            transform={`translate(20 ${PLOT_MARGIN.top + innerHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-zinc-600 text-[11px] font-semibold dark:fill-zinc-400"
          >
            {t("talentBottleneckYAxis")}
          </text>

          {chartRows.map((row) => {
            const risk = riskTier(row);
            const style = RISK_STYLES[risk];
            return (
              <circle
                key={row.socCode}
                cx={x(row.aiExposure)}
                cy={y(row.projectedOpenings)}
                r={r(row.latestLcas)}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth="1.3"
                opacity="0.82"
              >
                <title>{`${row.title}: ${t("talentBottleneckScoreLabel")} ${formatNumber(row.score, 1)}, ${t("talentBottleneckAiExposure")} ${formatExposure(row.aiExposure, formatNumber)}, ${t("talentBottleneckOpenings")} ${formatNullableNumber(row.projectedOpenings, formatNumber)}, ${t("talentBottleneckLatestLcas")} ${formatNullableNumber(row.latestLcas, formatNumber)}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      <ul className="sr-only [white-space:normal]">
        {chartRows.map((row) => {
          const risk = riskTier(row);
          return (
            <li key={row.socCode}>
              {row.title}: {t("talentBottleneckScoreLabel")} {formatNumber(row.score, 1)},{" "}
              {t("talentBottleneckAiExposure")} {formatExposure(row.aiExposure, formatNumber)},{" "}
              {t("talentBottleneckOpenings")} {formatNullableNumber(row.projectedOpenings, formatNumber)},{" "}
              {t("talentBottleneckLatestLcas")} {formatNullableNumber(row.latestLcas, formatNumber)},{" "}
              {t("talentBottleneckPostings")} {formatNullableNumber(row.latestPostings, formatNumber)},{" "}
              {t("talentBottleneckWage")}{" "}
              {row.medianWageAnnual == null ? "—" : formatCurrency(row.medianWageAnnual)},{" "}
              {riskLabel(risk, t)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RankedTable({
  rows,
  t,
  formatNumber,
  formatCurrency,
}: {
  rows: TalentBottleneckRow[];
  t: ReturnType<typeof useT>;
  formatNumber: (n: number, decimals?: number) => string;
  formatCurrency: (n: number) => string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/35" tabIndex={0}>
      <table className="w-full min-w-[54rem] text-sm" aria-label={t("talentBottleneckTableName")}>
        <caption className="sr-only">{t("talentBottleneckTableCaption")}</caption>
        <thead>
          <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
            <th scope="col" className="py-2 pr-4 font-medium">
              #
            </th>
            <th scope="col" className="py-2 pr-4 font-medium text-right">
              {t("talentBottleneckScoreLabel")}
            </th>
            <th scope="col" className="py-2 pr-4 font-medium">
              {t("talentBottleneckOccupation")}
            </th>
            <th scope="col" className="py-2 pr-4 font-medium text-right">
              {t("talentBottleneckLatestLcas")}
            </th>
            <th scope="col" className="py-2 pr-4 font-medium text-right">
              {t("talentBottleneckOpenings")}
            </th>
            <th scope="col" className="py-2 pr-4 font-medium text-right">
              {t("talentBottleneckPostings")}
            </th>
            <th scope="col" className="py-2 pr-4 font-medium text-right">
              {t("talentBottleneckWage")}
            </th>
            <th scope="col" className="py-2 font-medium text-right">
              {t("talentBottleneckRiskColumn")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, TOP_TABLE_LIMIT).map((row) => {
            const risk = riskTier(row);
            return (
              <tr
                key={row.socCode}
                className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/60"
              >
                <td className="py-3 pr-4 tabular-nums text-zinc-400">{row.rank}</td>
                <td className="py-3 pr-4 text-right font-semibold tabular-nums text-violet-600 dark:text-violet-300">
                  {formatNumber(row.score, 1)}
                </td>
                <th scope="row" className="py-3 pr-4 font-medium text-zinc-800 dark:text-zinc-100">
                  <span>{row.title}</span>
                  <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                    {row.socCode}
                    {row.sector ? ` · ${row.sector}` : ""}
                  </span>
                </th>
                <td className="py-3 pr-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatNullableNumber(row.latestLcas, formatNumber)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatNullableNumber(row.projectedOpenings, formatNumber)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {formatNullableNumber(row.latestPostings, formatNumber)}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                  {row.medianWageAnnual == null ? "—" : formatCurrency(row.medianWageAnnual)}
                </td>
                <td className="py-3 text-right">
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="tabular-nums text-zinc-700 dark:text-zinc-300">
                      {formatExposure(row.aiExposure, formatNumber)}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${RISK_STYLES[risk].badge}`}
                    >
                      {riskLabel(risk, t)}
                    </span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function TalentBottleneckLens({ data }: { data: TalentBottleneckData }) {
  const t = useT("visa");
  const locale = useLocale();
  const { formatNumber, formatCurrency } = useFormatters();
  const headingId = `${SECTION_IDS.talentBottleneckLens}-heading`;
  const topRow = data.summary.topRows[0] ?? data.rows[0] ?? null;
  const projectionWindow =
    data.summary.projectionWindow.baseYear != null &&
    data.summary.projectionWindow.projectionYear != null
      ? `${data.summary.projectionWindow.baseYear}–${data.summary.projectionWindow.projectionYear}`
      : "—";
  const jobPostingsModeLabel = jobPostingModeLabel(
    data.summary.jobPostingsMode,
    data.summary.jobPostingsObserved,
    t,
  );
  const compactNumber = new Intl.NumberFormat(locale === "zh" ? "zh-CN" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <section
      id={SECTION_IDS.talentBottleneckLens}
      aria-labelledby={headingId}
      className="scroll-mt-24 space-y-5"
    >
      <div className="glass rounded-2xl border border-zinc-200 bg-white/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/50 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-500 dark:text-violet-300">
              {t("talentBottleneckEyebrow")}
            </p>
            <h2 id={headingId} className="mt-1 text-2xl font-extrabold tracking-tight text-gradient sm:text-3xl">
              {t("talentBottleneckTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("talentBottleneckSubtitle")}
            </p>
            <p className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold text-amber-700 dark:text-amber-300">
                {t("talentBottleneckCaveatLabel")}
              </span>{" "}
              {t("talentBottleneckCaveat")}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <span className="inline-flex rounded-full border border-sky-300/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-700 dark:text-sky-200">
              {t("talentBottleneckJobPostingsModeLabel")}: {jobPostingsModeLabel}
            </span>
            <DataAsOfBadge datasetIds={data.datasetBadgeIds} />
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={t("talentBottleneckOccupationsTracked")}
            value={formatNumber(data.summary.occupationsTracked)}
            detail={t("talentBottleneckOccupationsTrackedDetail", {
              rows: data.summary.rowsReturned,
            })}
          />
          <KpiCard
            label={t("talentBottleneckLatestFiscalYear")}
            value={
              data.summary.latestH1bFiscalYear == null
                ? "—"
                : `FY${data.summary.latestH1bFiscalYear}`
            }
            detail={t("talentBottleneckLatestFiscalYearDetail")}
          />
          <KpiCard
            label={t("talentBottleneckProjectionWindow")}
            value={projectionWindow}
            detail={t("talentBottleneckProjectionWindowDetail")}
          />
          <KpiCard
            label={t("talentBottleneckTopScore")}
            value={topRow ? formatNumber(topRow.score, 1) : "—"}
            detail={topRow ? `${topRow.title} · ${topRow.socCode}` : "—"}
          />
        </dl>
      </div>

      <TalentScatter
        rows={data.rows}
        t={t}
        formatNumber={formatNumber}
        formatCurrency={formatCurrency}
        compactNumber={compactNumber}
      />

      <RankedTable
        rows={data.rows}
        t={t}
        formatNumber={formatNumber}
        formatCurrency={formatCurrency}
      />

      <div className="rounded-2xl border border-zinc-200 bg-white/60 p-4 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950/35 dark:text-zinc-400">
        <p>
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {data.methodology.label}:
          </span>{" "}
          {data.methodology.description}
        </p>
        <p className="mt-2">
          {t("talentBottleneckMethodology")} {data.methodology.normalization}
        </p>
        <p className="mt-2">
          {t("talentBottleneckH1bTrendLabel")}{" "}
          {data.rows[0]
            ? `${data.rows[0].title}: ${formatSignedDecimalPercent(data.rows[0].h1bCagr, formatNumber)}`
            : "—"}
        </p>
      </div>
    </section>
  );
}
