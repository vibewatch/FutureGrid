"use client";

import { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { useTheme } from "next-themes";
import { useT } from "@/lib/i18n/useT";
import { useFormatters } from "@/lib/i18n/useFormatters";
import AccessibleChart from "@/components/charts/AccessibleChart";
import { chartTheme, TIER_COLORS } from "./chartSetup";

export interface ExposureTierChartSeries {
  /** Canonical tier key (Low | Medium | High | Very High | Unclassified). */
  tier: string;
  /** Localized label. */
  label: string;
  /** Certified-LCA volume per fiscal year. */
  data: number[];
}

export interface ExposureTierChartProps {
  years: number[];
  tiers: ExposureTierChartSeries[];
}

export default function ExposureTierChart({ years, tiers }: ExposureTierChartProps) {
  const t = useT("visa");
  const { formatNumber } = useFormatters();
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";
  const th = chartTheme(isDark);

  const [mode, setMode] = useState<"volume" | "share">("volume");
  const isShare = mode === "share";

  const labels = years.map((y) => `FY${y}`);

  // Column totals for share computation.
  const totals = useMemo(
    () => years.map((_, i) => tiers.reduce((sum, s) => sum + (s.data[i] ?? 0), 0)),
    [years, tiers],
  );

  const asShare = (v: number, i: number): number =>
    totals[i] > 0 ? (v / totals[i]) * 100 : 0;

  const data = useMemo(
    () => ({
      labels,
      datasets: tiers.map((s) => {
        const c = TIER_COLORS[s.tier] ?? TIER_COLORS.Unclassified;
        const color = isDark ? c.dark : c.light;
        return {
          label: s.label,
          data: isShare ? s.data.map((v, i) => asShare(v, i)) : s.data,
          backgroundColor: color,
          borderColor: color,
          borderWidth: 0,
        };
      }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [labels, tiers, isDark, isShare, totals],
  );

  const fmtVal = (v: number) => (isShare ? `${v.toFixed(1)}%` : formatNumber(v));

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
              `${ctx.dataset.label ?? ""}: ${fmtVal(ctx.parsed.y ?? 0)}`,
          },
        },
      },
      scales: {
        y: {
          stacked: true,
          beginAtZero: true,
          max: isShare ? 100 : undefined,
          ticks: {
            color: th.axisText,
            font: { size: 10 },
            callback: (v: number | string) => (isShare ? `${v}%` : formatNumber(Number(v))),
          },
          grid: { color: th.gridColor },
          border: { color: th.borderClr },
          title: {
            display: true,
            text: isShare ? t("exposureAxisYShare") : t("exposureAxisY"),
            color: th.axisText,
            font: { size: 10 },
          },
        },
        x: {
          stacked: true,
          ticks: { color: th.axisText, font: { size: 10 } },
          grid: { display: false },
          border: { color: th.borderClr },
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [th, t, isShare, formatNumber],
  );

  const summary = (
    <table>
      <caption>{t("exposureSummary")}</caption>
      <thead>
        <tr>
          <th scope="col">{t("colYear")}</th>
          {tiers.map((s) => (
            <th key={s.tier} scope="col">
              {s.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {years.map((y, i) => (
          <tr key={y}>
            <th scope="row">{`FY${y}`}</th>
            {tiers.map((s) => (
              <td key={s.tier}>{formatNumber(s.data[i])}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const btnBase =
    "px-2.5 py-1 text-xs font-medium rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors";
  const btnActive = "bg-violet-600 text-white";
  const btnIdle =
    "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2" role="group" aria-label={t("exposureToggleLabel")}>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{t("exposureToggleLabel")}:</span>
        <button
          type="button"
          className={`${btnBase} ${!isShare ? btnActive : btnIdle}`}
          aria-pressed={!isShare}
          onClick={() => setMode("volume")}
        >
          {t("exposureToggleVolume")}
        </button>
        <button
          type="button"
          className={`${btnBase} ${isShare ? btnActive : btnIdle}`}
          aria-pressed={isShare}
          onClick={() => setMode("share")}
        >
          {t("exposureToggleShare")}
        </button>
      </div>
      <AccessibleChart label={t("exposureChartName")} summary={summary}>
        <div className="h-96">
          <Bar options={options} data={data} aria-label={t("exposureChartName")} />
        </div>
      </AccessibleChart>
    </div>
  );
}
