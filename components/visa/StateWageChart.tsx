"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { useT } from "@/lib/i18n/useT";
import { useFormatters } from "@/lib/i18n/useFormatters";
import AccessibleChart from "@/components/charts/AccessibleChart";
import { chartTheme } from "./chartSetup";

export interface StateWageChartProps {
  state: string;
  years: number[];
  wageByYear: Record<string, number | null>;
}

export default function StateWageChart({ state, years, wageByYear }: StateWageChartProps) {
  const t = useT("visa");
  const { formatCurrency } = useFormatters();
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const th = chartTheme(isDark);

  const labels = years.map((y) => `FY${y}`);
  const cyan = isDark ? "rgba(34,211,238,0.9)" : "rgba(8,145,178,0.9)";
  const values = years.map((y) => wageByYear[String(y)] ?? null);

  const chartData = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: t("colMedianWage"),
          data: values,
          borderColor: cyan,
          backgroundColor: cyan,
          pointBackgroundColor: cyan,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          tension: 0.3,
          fill: false,
          spanGaps: false,
        },
      ],
    }),
    [labels, values, cyan, t],
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
            label: (ctx: { parsed: { y: number | null } }) => {
              if (ctx.parsed.y === null) return `${t("colMedianWage")}: —`;
              return `${t("colMedianWage")}: ${formatCurrency(ctx.parsed.y)}`;
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
          title: { display: true, text: t("wageAxisY"), color: th.axisText, font: { size: 10 } },
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

  const chartLabel = t("stateWageChartName", { state });

  const summary = (
    <table>
      <caption>{chartLabel}</caption>
      <thead>
        <tr>
          <th scope="col">{t("colYear")}</th>
          <th scope="col">{t("colMedianWage")}</th>
        </tr>
      </thead>
      <tbody>
        {years.map((y) => {
          const v = wageByYear[String(y)];
          return (
            <tr key={y}>
              <th scope="row">{`FY${y}`}</th>
              <td>{v != null ? formatCurrency(v) : "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <AccessibleChart label={chartLabel} summary={summary}>
      <div className="h-48">
        <Line options={options} data={chartData} aria-label={chartLabel} />
      </div>
    </AccessibleChart>
  );
}
