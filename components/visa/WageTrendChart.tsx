"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { useT } from "@/lib/i18n/useT";
import { useFormatters } from "@/lib/i18n/useFormatters";
import AccessibleChart from "@/components/charts/AccessibleChart";
import { chartTheme } from "./chartSetup";

export interface WageTrendChartProps {
  years: number[];
  median: number[];
  p25: number[];
  p75: number[];
}

export default function WageTrendChart({ years, median, p25, p75 }: WageTrendChartProps) {
  const t = useT("visa");
  const { formatCurrency } = useFormatters();
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const th = chartTheme(isDark);

  const labels = years.map((y) => `FY${y}`);
  const violet = isDark ? "rgba(139,92,246,0.95)" : "rgba(124,58,237,0.95)";
  const bandFill = isDark ? "rgba(139,92,246,0.16)" : "rgba(124,58,237,0.12)";

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        // p25 (lower band bound) — invisible line, target for the fill.
        {
          label: t("colP25"),
          data: p25,
          borderColor: "transparent",
          backgroundColor: "transparent",
          pointRadius: 0,
          fill: false,
          order: 3,
        },
        // p75 (upper bound) — fills down to the previous dataset (p25).
        {
          label: t("wageBandLabel"),
          data: p75,
          borderColor: "transparent",
          backgroundColor: bandFill,
          pointRadius: 0,
          fill: "-1" as const,
          order: 2,
        },
        // Median line.
        {
          label: t("wageMedianLabel"),
          data: median,
          borderColor: violet,
          backgroundColor: violet,
          pointBackgroundColor: violet,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          tension: 0.3,
          fill: false,
          order: 1,
        },
      ],
    }),
    [labels, median, p25, p75, violet, bandFill, t],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            color: th.axisText,
            usePointStyle: true,
            padding: 12,
            font: { size: 11 },
            filter: (item: { text: string }) => item.text !== t("colP25"),
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
              `${ctx.dataset.label ?? ""}: ${formatCurrency(ctx.parsed.y ?? 0)}`,
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
          title: { display: true, text: t("wageAxisX"), color: th.axisText, font: { size: 10 } },
        },
      },
    }),
    [th, t, formatCurrency],
  );

  const summary = (
    <table>
      <caption>{t("wageSummary")}</caption>
      <thead>
        <tr>
          <th scope="col">{t("colYear")}</th>
          <th scope="col">{t("colMedianWage")}</th>
          <th scope="col">{t("colP25")}</th>
          <th scope="col">{t("colP75")}</th>
        </tr>
      </thead>
      <tbody>
        {years.map((y, i) => (
          <tr key={y}>
            <th scope="row">{`FY${y}`}</th>
            <td>{formatCurrency(median[i])}</td>
            <td>{formatCurrency(p25[i])}</td>
            <td>{formatCurrency(p75[i])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <AccessibleChart label={t("wageChartName")} summary={summary}>
      <div className="h-72">
        <Line options={options} data={data} aria-label={t("wageChartName")} />
      </div>
    </AccessibleChart>
  );
}
