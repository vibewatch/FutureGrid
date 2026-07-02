"use client";

import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { useT } from "@/lib/i18n/useT";
import { useFormatters } from "@/lib/i18n/useFormatters";
import AccessibleChart from "@/components/charts/AccessibleChart";
import { chartTheme } from "./chartSetup";

export interface EmployersChartProps {
  employers: Array<{ employer: string; totalCount: number }>;
}

export default function EmployersChart({ employers }: EmployersChartProps) {
  const t = useT("visa");
  const { formatNumber } = useFormatters();
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const th = chartTheme(isDark);

  const labels = employers.map((e) => e.employer);
  const violet = isDark ? "rgba(139,92,246,0.85)" : "rgba(124,58,237,0.85)";

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: t("employersAxisX"),
          data: employers.map((e) => e.totalCount),
          backgroundColor: violet,
          borderColor: violet,
          borderWidth: 0,
          borderRadius: 3,
        },
      ],
    }),
    [labels, employers, violet, t],
  );

  const options = useMemo(
    () => ({
      indexAxis: "y" as const,
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
            label: (ctx: { parsed: { x: number | null } }) =>
              `${t("employersAxisX")}: ${formatNumber(ctx.parsed.x ?? 0)}`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            color: th.axisText,
            font: { size: 10 },
            callback: (v: number | string) => formatNumber(Number(v)),
          },
          grid: { color: th.gridColor },
          border: { color: th.borderClr },
          title: { display: true, text: t("employersAxisX"), color: th.axisText, font: { size: 10 } },
        },
        y: {
          ticks: { color: th.axisText, font: { size: 10 }, autoSkip: false },
          grid: { display: false },
          border: { color: th.borderClr },
        },
      },
    }),
    [th, t, formatNumber],
  );

  const summary = (
    <table>
      <caption>{t("employersSummary")}</caption>
      <thead>
        <tr>
          <th scope="col">{t("colEmployer")}</th>
          <th scope="col">{t("colTotal")}</th>
        </tr>
      </thead>
      <tbody>
        {employers.map((e) => (
          <tr key={e.employer}>
            <th scope="row">{e.employer}</th>
            <td>{formatNumber(e.totalCount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <AccessibleChart label={t("employersChartName")} summary={summary}>
      <div style={{ height: `${Math.max(240, employers.length * 34)}px` }}>
        <Bar options={options} data={data} aria-label={t("employersChartName")} />
      </div>
    </AccessibleChart>
  );
}
