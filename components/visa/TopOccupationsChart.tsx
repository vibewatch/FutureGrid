"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { useT } from "@/lib/i18n/useT";
import { useFormatters } from "@/lib/i18n/useFormatters";
import AccessibleChart from "@/components/charts/AccessibleChart";
import { chartTheme, seriesColor } from "./chartSetup";

export interface OccupationSeries {
  label: string;
  data: number[];
}

export interface TopOccupationsChartProps {
  years: number[];
  series: OccupationSeries[];
}

export default function TopOccupationsChart({ years, series }: TopOccupationsChartProps) {
  const t = useT("visa");
  const { formatNumber } = useFormatters();
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
          data: s.data,
          borderColor: color,
          backgroundColor: color,
          pointBackgroundColor: color,
          pointRadius: 2,
          pointHoverRadius: 5,
          borderWidth: 2,
          tension: 0.3,
          fill: false,
        };
      }),
    }),
    [labels, series, isDark],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "nearest" as const, intersect: false },
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
            label: (ctx: { parsed: { y: number | null }; dataset: { label?: string } }) =>
              `${ctx.dataset.label ?? ""}: ${formatNumber(ctx.parsed.y ?? 0)}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: th.axisText,
            font: { size: 10 },
            callback: (v: number | string) => formatNumber(Number(v)),
          },
          grid: { color: th.gridColor },
          border: { color: th.borderClr },
          title: { display: true, text: t("occAxisY"), color: th.axisText, font: { size: 10 } },
        },
        x: {
          ticks: { color: th.axisText, font: { size: 10 } },
          grid: { display: false },
          border: { color: th.borderClr },
        },
      },
    }),
    [th, t, formatNumber],
  );

  const summary = (
    <table>
      <caption>{t("occSummary")}</caption>
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
        {years.map((y, i) => (
          <tr key={y}>
            <th scope="row">{`FY${y}`}</th>
            {series.map((s) => (
              <td key={s.label}>{formatNumber(s.data[i])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <AccessibleChart label={t("occChartName")} summary={summary}>
      <div className="h-96">
        <Line options={options} data={data} aria-label={t("occChartName")} />
      </div>
    </AccessibleChart>
  );
}
