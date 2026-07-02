"use client";

import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LogarithmicScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useTheme } from "next-themes";
import { getCostTrend, getPowerTrend } from "@/lib/ai-frontier";
import { useT } from "@/lib/i18n/useT";

ChartJS.register(
  CategoryScale,
  LogarithmicScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
);

function fmtUsd(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

function fmtWatt(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} GW`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} MW`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)} kW`;
  return `${Math.round(v)} W`;
}

export default function CostPowerTrends() {
  const t = useT("frontier");
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const costTrend = useMemo(() => getCostTrend(), []);
  const powerTrend = useMemo(() => getPowerTrend(), []);

  const axisText = isDark ? "#71717a" : "#52525b";
  const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
  const borderClr = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
  const ttBg = isDark ? "rgba(9,9,11,0.92)" : "rgba(255,255,255,0.95)";
  const ttTitle = isDark ? "#e4e4e7" : "#18181b";
  const ttBody = isDark ? "#a1a1aa" : "#52525b";
  const ttBorder = isDark ? "rgba(139,92,246,0.30)" : "rgba(139,92,246,0.25)";

  const costLabels = costTrend.map((d) => String(d.year));
  const powerLabels = powerTrend.map((d) => String(d.year));

  const costOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: "easeOutQuart" as const },
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            color: axisText,
            usePointStyle: true,
            pointStyleWidth: 10,
            padding: 12,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: ttBg,
          titleColor: ttTitle,
          bodyColor: ttBody,
          borderColor: ttBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx: { parsed: { y: number | null }; dataset: { label?: string } }) =>
              `${ctx.dataset.label ?? ""}: ${fmtUsd(ctx.parsed.y ?? 0)}`,
          },
        },
      },
      scales: {
        y: {
          type: "logarithmic" as const,
          ticks: {
            color: axisText,
            font: { size: 10 },
            callback: (v: number | string) => fmtUsd(Number(v)),
            maxTicksLimit: 8,
          },
          grid: { color: gridColor },
          border: { color: borderClr },
          title: {
            display: true,
            text: t("costAxisUsd"),
            color: axisText,
            font: { size: 10 },
          },
        },
        x: {
          ticks: { color: axisText, font: { size: 10 } },
          grid: { display: false },
          border: { color: borderClr },
        },
      },
    }),
    [axisText, gridColor, borderClr, ttBg, ttTitle, ttBody, ttBorder, t],
  );

  const powerOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: "easeOutQuart" as const },
      plugins: {
        legend: {
          position: "top" as const,
          labels: {
            color: axisText,
            usePointStyle: true,
            pointStyleWidth: 10,
            padding: 12,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: ttBg,
          titleColor: ttTitle,
          bodyColor: ttBody,
          borderColor: ttBorder,
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (ctx: { parsed: { y: number | null }; dataset: { label?: string } }) =>
              `${ctx.dataset.label ?? ""}: ${fmtWatt(ctx.parsed.y ?? 0)}`,
          },
        },
      },
      scales: {
        y: {
          type: "logarithmic" as const,
          ticks: {
            color: axisText,
            font: { size: 10 },
            callback: (v: number | string) => fmtWatt(Number(v)),
            maxTicksLimit: 8,
          },
          grid: { color: gridColor },
          border: { color: borderClr },
          title: {
            display: true,
            text: t("powerAxisW"),
            color: axisText,
            font: { size: 10 },
          },
        },
        x: {
          ticks: { color: axisText, font: { size: 10 } },
          grid: { display: false },
          border: { color: borderClr },
        },
      },
    }),
    [axisText, gridColor, borderClr, ttBg, ttTitle, ttBody, ttBorder, t],
  );

  const costData = useMemo(
    () => ({
      labels: costLabels,
      datasets: [
        {
          label: t("costLabelMedian"),
          data: costTrend.map((d) => d.medianCostUsd2023),
          borderColor: isDark ? "rgba(139,92,246,0.90)" : "rgba(124,58,237,0.90)",
          backgroundColor: isDark ? "rgba(139,92,246,0.15)" : "rgba(124,58,237,0.10)",
          pointBackgroundColor: isDark ? "rgba(139,92,246,0.90)" : "rgba(124,58,237,0.90)",
          fill: false,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: t("costLabelMax"),
          data: costTrend.map((d) => d.maxCostUsd2023),
          borderColor: isDark ? "rgba(245,158,11,0.85)" : "rgba(217,119,6,0.85)",
          backgroundColor: "transparent",
          pointBackgroundColor: isDark ? "rgba(245,158,11,0.85)" : "rgba(217,119,6,0.85)",
          fill: false,
          tension: 0.3,
          borderWidth: 2,
          borderDash: [5, 3],
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }),
    [costLabels, costTrend, isDark, t],
  );

  const powerData = useMemo(
    () => ({
      labels: powerLabels,
      datasets: [
        {
          label: t("powerLabelMedian"),
          data: powerTrend.map((d) => d.medianPowerW),
          borderColor: isDark ? "rgba(52,211,153,0.90)" : "rgba(16,185,129,0.90)",
          backgroundColor: "transparent",
          pointBackgroundColor: isDark ? "rgba(52,211,153,0.90)" : "rgba(16,185,129,0.90)",
          fill: false,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: t("powerLabelMax"),
          data: powerTrend.map((d) => d.maxPowerW),
          borderColor: isDark ? "rgba(251,113,133,0.85)" : "rgba(244,63,94,0.85)",
          backgroundColor: "transparent",
          pointBackgroundColor: isDark ? "rgba(251,113,133,0.85)" : "rgba(244,63,94,0.85)",
          fill: false,
          tension: 0.3,
          borderWidth: 2,
          borderDash: [5, 3],
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }),
    [powerLabels, powerTrend, isDark, t],
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Cost chart */}
      <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {t("costChartTitle")}
        </h3>
        <div className="h-64">
          <Line options={costOptions} data={costData} />
        </div>
      </div>

      {/* Power chart */}
      <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-2">
        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
          {t("powerChartTitle")}
        </h3>
        <div className="h-64">
          <Line options={powerOptions} data={powerData} />
        </div>
      </div>

      {/* Coverage note */}
      <p className="lg:col-span-2 text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
        {t("costPowerNote")}
      </p>
    </div>
  );
}
