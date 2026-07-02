"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { useT } from "@/lib/i18n/useT";
import { useFormatters } from "@/lib/i18n/useFormatters";
import AccessibleChart from "@/components/charts/AccessibleChart";
import { chartTheme, seriesColor } from "./chartSetup";

export interface OccWageSeries {
  label: string;
  /** Wages indexed by fiscal year string, null = gap (< 50 filings that year). */
  wageByYear: Record<string, number | null>;
}

export interface OccWageTrendChartProps {
  years: number[];
  series: OccWageSeries[];
}

export default function OccWageTrendChart({ years, series }: OccWageTrendChartProps) {
  const t = useT("visa");
  const { formatCurrency, formatNumber } = useFormatters();
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const th = chartTheme(isDark);

  const labels = years.map((y) => `FY${y}`);

  const data = useMemo(
    () => ({
      labels,
      datasets: series.map((s, i) => {
        const color = seriesColor(i, isDark);
        return {
          label: s.label,
          // null keeps Chart.js gap (spanGaps defaults to false)
          data: years.map((y) => s.wageByYear[String(y)] ?? null),
          borderColor: color,
          backgroundColor: color,
          pointBackgroundColor: color,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2,
          tension: 0.3,
          fill: false,
          spanGaps: false,
        };
      }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [labels, series, isDark],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            color: th.axisText,
            usePointStyle: true,
            padding: 10,
            boxWidth: 8,
            font: { size: 10 },
          },
        },
        tooltip: {
          backgroundColor: th.ttBg,
          titleColor: th.ttTitle,
          bodyColor: th.ttBody,
          borderColor: th.ttBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx: { parsed: { y: number | null }; dataset: { label?: string } }) => {
              if (ctx.parsed.y === null) return `${ctx.dataset.label ?? ""}: —`;
              return `${ctx.dataset.label ?? ""}: ${formatCurrency(ctx.parsed.y)}`;
            },
          },
        },
      },
      scales: {
        y: {
          ticks: {
            color: th.axisText,
            font: { size: 10 },
            callback: (v: number | string) => formatCurrency(Number(v)),
          },
          grid: { color: th.gridColor },
          border: { color: th.borderClr },
          title: {
            display: true,
            text: t("occWageTrendAxisY"),
            color: th.axisText,
            font: { size: 10 },
          },
        },
        x: {
          ticks: { color: th.axisText, font: { size: 10 } },
          grid: { display: false },
          border: { color: th.borderClr },
        },
      },
    }),
    [th, t, formatCurrency],
  );

  const summary = (
    <table>
      <caption>{t("occWageTrendSummary")}</caption>
      <thead>
        <tr>
          <th scope="col">{t("colYear")}</th>
          {series.map((s) => (
            <th key={s.label} scope="col">
              {s.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {years.map((y) => (
          <tr key={y}>
            <th scope="row">{`FY${y}`}</th>
            {series.map((s) => {
              const v = s.wageByYear[String(y)];
              return <td key={s.label}>{v != null ? formatCurrency(v) : "—"}</td>;
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  // Caption noting gaps
  const hasGaps = series.some((s) => years.some((y) => s.wageByYear[String(y)] == null));

  return (
    <AccessibleChart label={t("occWageTrendChartName")} summary={summary}>
      <div className="h-96">
        <Line options={options} data={data} aria-label={t("occWageTrendChartName")} />
      </div>
      {hasGaps && (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
          {t("occWageTrendGapNote")}
        </p>
      )}
      {/* sr-only count summary */}
      <p className="sr-only">
        {t("occWageTrendSeriesCount", { n: String(series.length), years: formatNumber(years.length) })}
      </p>
    </AccessibleChart>
  );
}
