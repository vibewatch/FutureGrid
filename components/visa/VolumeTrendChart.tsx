"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { useT } from "@/lib/i18n/useT";
import { useFormatters } from "@/lib/i18n/useFormatters";
import AccessibleChart from "@/components/charts/AccessibleChart";
import { chartTheme } from "./chartSetup";

export interface VolumeTrendChartProps {
  years: number[];
  certified: number[];
  positions: number[];
}

export default function VolumeTrendChart({ years, certified, positions }: VolumeTrendChartProps) {
  const t = useT("visa");
  const { formatNumber } = useFormatters();
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const th = chartTheme(isDark);

  const labels = years.map((y) => `FY${y}`);
  const violet = isDark ? "rgba(139,92,246,0.95)" : "rgba(124,58,237,0.95)";
  const cyan = isDark ? "rgba(34,211,238,0.95)" : "rgba(8,145,178,0.95)";

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: t("volumeCertifiedLabel"),
          data: certified,
          borderColor: violet,
          backgroundColor: violet,
          pointBackgroundColor: violet,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          tension: 0.3,
          fill: false,
        },
        {
          label: t("volumePositionsLabel"),
          data: positions,
          borderColor: cyan,
          backgroundColor: cyan,
          pointBackgroundColor: cyan,
          pointRadius: 3,
          pointHoverRadius: 5,
          borderWidth: 2.5,
          borderDash: [5, 3],
          tension: 0.3,
          fill: false,
        },
      ],
    }),
    [labels, certified, positions, violet, cyan, t],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index" as const, intersect: false },
      plugins: {
        legend: {
          position: "top" as const,
          labels: { color: th.axisText, usePointStyle: true, padding: 12, font: { size: 11 } },
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
          title: { display: true, text: t("volumeAxisY"), color: th.axisText, font: { size: 10 } },
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
      <caption>{t("volumeSummary")}</caption>
      <thead>
        <tr>
          <th scope="col">{t("colYear")}</th>
          <th scope="col">{t("colCertified")}</th>
          <th scope="col">{t("colPositions")}</th>
        </tr>
      </thead>
      <tbody>
        {years.map((y, i) => (
          <tr key={y}>
            <th scope="row">{`FY${y}`}</th>
            <td>{formatNumber(certified[i])}</td>
            <td>{formatNumber(positions[i])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <AccessibleChart label={t("volumeChartName")} summary={summary}>
      <div className="h-72">
        <Line options={options} data={data} aria-label={t("volumeChartName")} />
      </div>
    </AccessibleChart>
  );
}
