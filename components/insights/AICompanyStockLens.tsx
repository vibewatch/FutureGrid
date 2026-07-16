"use client";

import { useId, useMemo } from "react";
import DataAsOfBadge from "@/components/ui/DataAsOfBadge";
import { useT } from "@/lib/i18n/useT";
import type { AICompanyStockCategory, AICompanyStockCompany, AICompanyStocksData } from "@/lib/ai-company-stocks";

interface AICompanyStockLensProps {
  data: AICompanyStocksData;
}

type CategoryRow = {
  id: string;
  label: string;
  companyCount: number;
  positive1Y: number;
  average1Y: number | null;
};

const CHART_WIDTH = 760;
const ROW_HEIGHT = 62;
const CHART_PADDING = { top: 28, right: 120, bottom: 34, left: 210 };
const INNER_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right;

export default function AICompanyStockLens({ data }: AICompanyStockLensProps) {
  const t = useT("analysis");
  const chartId = useId();

  const categoryRows = useMemo(() => buildCategoryRows(data), [data]);
  const companyRows = useMemo(() => {
    return [...data.companies].sort((a, b) => {
      const aReturn = a.metrics.returns["1Y"] ?? Number.NEGATIVE_INFINITY;
      const bReturn = b.metrics.returns["1Y"] ?? Number.NEGATIVE_INFINITY;
      return bReturn - aReturn || a.ticker.localeCompare(b.ticker);
    });
  }, [data.companies]);

  const latestDate = data.summary.latestDate ?? data.meta.asOf ?? t("aiCompanyStockUnavailable");
  const benchmarkBasket = data.summary.benchmarkTickers.length
    ? data.summary.benchmarkTickers.join(" / ")
    : data.benchmarks.map((benchmark) => benchmark.ticker).join(" / ");
  const positiveBreadth = data.summary.breadth.positive1Y ?? countPositive1Y(data.companies);
  const positiveBreadthValue = `${positiveBreadth.toLocaleString()} / ${data.summary.companyCount.toLocaleString()}`;
  const chartHeight = CHART_PADDING.top + CHART_PADDING.bottom + Math.max(1, categoryRows.length) * ROW_HEIGHT;
  const returnExtent = Math.max(0.1, ...categoryRows.map((row) => Math.abs(row.average1Y ?? 0)));
  const titleId = `${chartId}-title`;
  const descId = `${chartId}-desc`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-bold text-zinc-950 dark:text-white">{t("aiCompanyStockTitle")}</h3>
            <DataAsOfBadge datasetId="ai-company-stocks" />
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {t("aiCompanyStockIntro")}
          </p>
        </div>
        <span className="w-fit rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
          {t("aiCompanyStockBadge")}
        </span>
      </div>

      <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300" role="note">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">
          {t("aiCompanyStockCaveatTitle")}
        </p>
        <p className="mt-2">{t("aiCompanyStockCaveatText")}</p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label={t("aiCompanyStockCompaniesTracked")} value={data.summary.companyCount.toLocaleString()} />
        <KpiCard label={t("aiCompanyStockLatestDate")} value={latestDate} />
        <KpiCard
          label={t("aiCompanyStockPositiveBreadth")}
          value={positiveBreadthValue}
          detail={formatShare(positiveBreadth, data.summary.companyCount)}
        />
        <KpiCard label={t("aiCompanyStockBenchmarkBasket")} value={benchmarkBasket || t("aiCompanyStockUnavailable")} />
      </dl>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.05fr)_0.95fr]">
        <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35" aria-labelledby={`${chartId}-section`}>
          <div className="mb-4">
            <p id={`${chartId}-section`} className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {t("aiCompanyStockChartTitle")}
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("aiCompanyStockChartExplainer")}</p>
          </div>
          <div className="overflow-x-auto" tabIndex={0}>
            <svg
              className="h-auto w-full min-w-[720px]"
              viewBox={`0 0 ${CHART_WIDTH} ${chartHeight}`}
              role="img"
              aria-labelledby={`${titleId} ${descId}`}
            >
              <title id={titleId}>{t("aiCompanyStockChartAria")}</title>
              <desc id={descId}>{t("aiCompanyStockChartDescription")}</desc>
              {[0, 25, 50, 75, 100].map((tick) => {
                const x = CHART_PADDING.left + (tick / 100) * INNER_WIDTH;
                return (
                  <g key={tick}>
                    <line
                      x1={x}
                      x2={x}
                      y1={CHART_PADDING.top - 10}
                      y2={chartHeight - CHART_PADDING.bottom}
                      stroke="currentColor"
                      className="text-zinc-200 dark:text-zinc-800"
                      strokeDasharray="3 5"
                    />
                    <text x={x} y={chartHeight - 10} textAnchor="middle" className="fill-zinc-500 text-[11px]">
                      {tick}%
                    </text>
                  </g>
                );
              })}
              {categoryRows.map((row, index) => {
                const y = CHART_PADDING.top + index * ROW_HEIGHT;
                const breadthPercent = row.companyCount > 0 ? (row.positive1Y / row.companyCount) * 100 : 0;
                const returnWidth = Math.min(100, (Math.abs(row.average1Y ?? 0) / returnExtent) * 100);
                const returnPositive = (row.average1Y ?? 0) >= 0;
                return (
                  <g key={row.id}>
                    <text x={CHART_PADDING.left - 14} y={y + 18} textAnchor="end" className="fill-zinc-700 text-[12px] font-semibold dark:fill-zinc-200">
                      {row.label}
                    </text>
                    <rect
                      x={CHART_PADDING.left}
                      y={y + 5}
                      width={(breadthPercent / 100) * INNER_WIDTH}
                      height="16"
                      rx="8"
                      fill="#22d3ee"
                      fillOpacity="0.74"
                    />
                    <rect
                      x={CHART_PADDING.left}
                      y={y + 29}
                      width={(returnWidth / 100) * INNER_WIDTH}
                      height="16"
                      rx="8"
                      fill={returnPositive ? "#a855f7" : "#f59e0b"}
                      fillOpacity="0.74"
                    />
                    <text x={CHART_PADDING.left + INNER_WIDTH + 10} y={y + 18} className="fill-zinc-600 text-[11px] dark:fill-zinc-300">
                      {row.positive1Y}/{row.companyCount}
                    </text>
                    <text x={CHART_PADDING.left + INNER_WIDTH + 10} y={y + 42} className="fill-zinc-600 text-[11px] dark:fill-zinc-300">
                      {formatPercent(row.average1Y, true)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" aria-hidden="true" />
              {t("aiCompanyStockLegendBreadth")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" aria-hidden="true" />
              {t("aiCompanyStockLegendReturn")}
            </span>
          </div>
          <ul className="sr-only" aria-label={t("aiCompanyStockChartListLabel")}>
            {categoryRows.map((row) => (
              <li key={row.id}>{categoryLabel(row, t)}</li>
            ))}
          </ul>
        </section>

        <section className="min-w-0 rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("aiCompanyStockSourceTitle")}</p>
          <dl className="mt-3 space-y-3 text-sm">
            <SourceMetric label={t("aiCompanyStockSourceName")} value={data.source.name} />
            <SourceMetric label={t("aiCompanyStockSourceMode")} value={data.source.sourceMode} />
            <SourceMetric label={t("aiCompanyStockSourceAccess")} value={data.source.access} />
          </dl>
          <p className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm leading-relaxed text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-400">
            {data.source.caveat}
          </p>
          {data.summary.caveats.length > 0 && (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {data.summary.caveats.slice(0, 3).map((caveat) => (
                <li key={caveat}>{caveat}</li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("aiCompanyStockTableTitle")}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("aiCompanyStockTableExplainer")}</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800" tabIndex={0}>
          <table className="min-w-[980px] w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-100/70 text-left text-[11px] uppercase tracking-widest text-zinc-500 dark:bg-zinc-900/70">
              <tr>
                <th scope="col" className="px-3 py-2">{t("aiCompanyStockTickerCompanyHeader")}</th>
                <th scope="col" className="px-3 py-2">{t("aiCompanyStockCategoryHeader")}</th>
                <th scope="col" className="px-3 py-2">{t("aiCompanyStockReturn1MHeader")}</th>
                <th scope="col" className="px-3 py-2">{t("aiCompanyStockReturn6MHeader")}</th>
                <th scope="col" className="px-3 py-2">{t("aiCompanyStockReturn1YHeader")}</th>
                <th scope="col" className="px-3 py-2">{t("aiCompanyStockDrawdownHeader")}</th>
                <th scope="col" className="px-3 py-2">{t("aiCompanyStockVolatilityHeader")}</th>
                <th scope="col" className="px-3 py-2">{t("aiCompanyStockRelativeHeader")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {companyRows.map((company) => (
                <tr key={company.id}>
                  <th scope="row" className="px-3 py-3 text-left">
                    <span className="block font-semibold text-zinc-900 dark:text-white">{company.ticker}</span>
                    <span className="text-xs text-zinc-500">{company.name}</span>
                  </th>
                  <td className="px-3 py-3 text-zinc-700 dark:text-zinc-300">{categoryName(company.primaryCategory, data.categories)}</td>
                  <td className="px-3 py-3 tabular-nums">{formatPercent(company.metrics.returns["1M"], true)}</td>
                  <td className="px-3 py-3 tabular-nums">{formatPercent(company.metrics.returns["6M"], true)}</td>
                  <td className="px-3 py-3 tabular-nums font-semibold">{formatPercent(company.metrics.returns["1Y"], true)}</td>
                  <td className="px-3 py-3 tabular-nums">{formatPercent(company.metrics.maxDrawdown, false)}</td>
                  <td className="px-3 py-3 tabular-nums">{formatPercent(company.metrics.annualizedVolatility, false)}</td>
                  <td className="px-3 py-3 tabular-nums">
                    <span className="block">QQQ {formatPercent(company.relativeReturns.qqq?.["1Y"] ?? null, true)}</span>
                    <span className="block">SPY {formatPercent(company.relativeReturns.spy?.["1Y"] ?? null, true)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-zinc-900 dark:text-white">{value}</dd>
      {detail && <dd className="mt-1 text-xs text-zinc-500">{detail}</dd>}
    </div>
  );
}

function SourceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{label}</dt>
      <dd className="mt-1 text-zinc-800 dark:text-zinc-200">{value}</dd>
    </div>
  );
}

function buildCategoryRows(data: AICompanyStocksData): CategoryRow[] {
  return data.categories.map((category) => {
    const members = data.companies.filter((company) => category.tickers.includes(company.ticker));
    return {
      id: category.id,
      label: category.label,
      companyCount: category.companyCount,
      positive1Y: category.breadth.positive1Y ?? countPositive1Y(members),
      average1Y: average(members.map((company) => company.metrics.returns["1Y"])),
    };
  });
}

function countPositive1Y(companies: AICompanyStockCompany[]): number {
  return companies.filter((company) => (company.metrics.returns["1Y"] ?? 0) > 0).length;
}

function average(values: Array<number | null>): number | null {
  const finite = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (finite.length === 0) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function formatPercent(value: number | null, signed = false): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const percent = value * 100;
  const sign = signed && percent > 0 ? "+" : "";
  return `${sign}${percent.toFixed(1)}%`;
}

function formatShare(numerator: number, denominator: number): string {
  if (!denominator) return "—";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function categoryName(categoryId: string, categories: AICompanyStockCategory[]): string {
  return categories.find((category) => category.id === categoryId)?.label ?? categoryId;
}

function categoryLabel(row: CategoryRow, t: ReturnType<typeof useT>): string {
  return t("aiCompanyStockCategorySummary", {
    category: row.label,
    positive: row.positive1Y,
    total: row.companyCount,
    return: formatPercent(row.average1Y, true),
  });
}
