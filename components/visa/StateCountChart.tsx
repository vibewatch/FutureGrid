"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { useT } from "@/lib/i18n/useT";
import { useFormatters } from "@/lib/i18n/useFormatters";
import AccessibleChart from "@/components/charts/AccessibleChart";
import { chartTheme } from "./chartSetup";

export interface StateCountChartProps {
  state: string;
  years: number[];
  countByYear: Record<string, number>;
}

export default function StateCountChart({ state, years, countByYear }: StateCountChartProps) {
  const t = useT("visa");
  const { formatNumber } = useFormatters();
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const th = chartTheme(isDark);

  const labels = years.map((y) => `FY${y}`);
  const violet = isDark ? "rgba(139,92,246,0.85)" : "rgba(124,58,237,0.85)";
  const values = years.map((y) => countByYear[String(y)] ?? 0);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: t("colCertified"),
          data: values,
          backgroundColor: violet,
          borderColor: violet,
          borderWidth: 0,
          borderRadius: 3,
        },
      ],
    }),
    [labels, values, violet, t],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: th.ttBg,
          titleColor: th.ttTitle,
          bodyColor: th.ttBody,
          borderColor: th.ttBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx: { parsed: { y: number | null } }) =>
              `${t("colCertified")}: ${formatNumber(ctx.parsed.y ?? 0)}`,
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
          title: { display: true, text: t("colCertified"), color: th.axisText, font: { size: 10 } },
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

  const chartLabel = t("stateCountChartName", { state });

  const summary = (
    <table>
      <caption>{chartLabel}</caption>
      <thead>
        <tr>
          <th scope="col">{t("colYear")}</th>
          <th scope="col">{t("colCertified")}</th>
        </tr>
      </thead>
      <tbody>
        {years.map((y) => (
          <tr key={y}>
            <th scope="row">{`FY${y}`}</th>
            <td>{formatNumber(countByYear[String(y)] ?? 0)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <AccessibleChart label={chartLabel} summary={summary}>
      <div className="h-48">
        <Bar options={options} data={chartData} aria-label={chartLabel} />
      </div>
    </AccessibleChart>
  );
}
