"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useMemo } from "react";
import { useTheme } from "next-themes";
import { getSectorAggregates } from "@/lib/data";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function riskFill(r: number, alpha = 0.75): string {
  if (r < 0.30) return `rgba(34,197,94,${alpha})`;
  if (r < 0.60) return `rgba(234,179,8,${alpha})`;
  if (r < 0.85) return `rgba(249,115,22,${alpha})`;
  return `rgba(239,68,68,${alpha})`;
}

export default function CareerTrendChart() {
  const sectors = useMemo(() => getSectorAggregates(), []);
  const { resolvedTheme } = useTheme();
  const isDark = (resolvedTheme ?? "dark") !== "light";

  const options = useMemo(() => {
    const reduced = typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
    const axisText  = isDark ? "#71717a" : "#52525b";
    const legendText = isDark ? "#a1a1aa" : "#52525b";
    const titleText = isDark ? "#d4d4d8" : "#18181b";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
    const borderColor = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.10)";
    const ttBg = isDark ? "rgba(9,9,11,0.92)" : "rgba(255,255,255,0.95)";
    const ttTitle = isDark ? "#e4e4e7" : "#18181b";
    const ttBody  = isDark ? "#a1a1aa" : "#52525b";
    const ttBorder = isDark ? "rgba(139,92,246,0.30)" : "rgba(139,92,246,0.25)";
    return {
    responsive: true,
    maintainAspectRatio: false,
    animation: reduced ? (false as const) : { duration: 700, easing: "easeOutQuart" as const },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: legendText,
          usePointStyle: true,
          pointStyleWidth: 10,
          padding: 16,
          font: { size: 12 },
        },
      },
      title: {
        display: true,
        text: "Average AI Exposure by Sector",
        color: titleText,
        font: { size: 14, weight: 500 },
        padding: { bottom: 14 },
      },
      tooltip: {
        backgroundColor: ttBg,
        titleColor: ttTitle,
        bodyColor: ttBody,
        borderColor: ttBorder,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: { parsed: { y: number | null } }) =>
            `  AI Exposure: ${((ctx.parsed.y ?? 0) * 100).toFixed(1)}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: {
          callback: (v: string | number) => `${(Number(v) * 100).toFixed(0)}%`,
          color: axisText,
          font: { size: 11 },
        },
        grid: { color: gridColor },
        border: { color: borderColor },
      },
      x: {
        ticks: { color: axisText, font: { size: 11 } },
        grid: { display: false },
        border: { color: borderColor },
      },
    },
    };
  }, [isDark]);

  const data = useMemo(() => ({
    labels: sectors.map((s) => s.sector),
    datasets: [
      {
        label: "AI Exposure",
        data: sectors.map((s) => s.avgRisk),
        backgroundColor:     sectors.map((s) => riskFill(s.avgRisk, 0.75)),
        borderColor:         sectors.map((s) => riskFill(s.avgRisk, 1.00)),
        hoverBackgroundColor: sectors.map((s) => riskFill(s.avgRisk, 0.95)),
        borderWidth: 1,
        borderRadius: 5,
        borderSkipped: false as const,
      },
    ],
  }), [sectors]);

  return (
    <div className="w-full h-[400px]">
      <Bar options={options} data={data} />
    </div>
  );
}