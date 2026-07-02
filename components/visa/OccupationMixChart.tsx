"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { useT } from "@/lib/i18n/useT";
import AccessibleChart from "@/components/charts/AccessibleChart";
import { chartTheme, seriesColor } from "./chartSetup";

export interface MixSeries {
  label: string;
  /** Percentage share (0–100) per fiscal year. */
  data: number[];
  /** Colour index override (e.g. the "Other" band uses the slate slot). */
  colorIndex?: number;
}

export interface OccupationMixChartProps {
  years: number[];
  series: MixSeries[];
}

export default function OccupationMixChart({ years, series }: OccupationMixChartProps) {
  const t = useT("visa");
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const th = chartTheme(isDark);

  const labels = years.map((y) => `FY${y}`);
  const fmtPct = (v: number) => `${v.toFixed(1)}%`;

  const data = useMemo(
    () => ({
      labels,
      datasets: series.map((s, i) => {
        const color = seriesColor(s.colorIndex ?? i, isDark);
        return {
          label: s.label,
          data: s.data,
          backgroundColor: color,
          borderColor: color,
          borderWidth: 0,
        };
      }),
    }),
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
            label: (ctx: { parsed: { y: number | null }; dataset: { label?: string } }) =>
              `${ctx.dataset.label ?? ""}: ${fmtPct(ctx.parsed.y ?? 0)}`,
          },
        },
      },
      scales: {
        y: {
          stacked: true,
          min: 0,
          max: 100,
          ticks: {
            color: th.axisText,
            font: { size: 10 },
            callback: (v: number | string) => `${v}%`,
          },
          grid: { color: th.gridColor },
          border: { color: th.borderClr },
          title: { display: true, text: t("mixAxisY"), color: th.axisText, font: { size: 10 } },
        },
        x: {
          stacked: true,
          ticks: { color: th.axisText, font: { size: 10 } },
          grid: { display: false },
          border: { color: th.borderClr },
        },
      },
    }),
    [th, t],
  );

  const summary = (
    <table>
      <caption>{t("mixSummary")}</caption>
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
              <td key={s.label}>{fmtPct(s.data[i])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <AccessibleChart label={t("mixChartName")} summary={summary}>
      <div className="h-96">
        <Bar options={options} data={data} aria-label={t("mixChartName")} />
      </div>
    </AccessibleChart>
  );
}
