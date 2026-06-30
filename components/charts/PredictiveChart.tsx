"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { useMemo } from "react";
import { generateAllCareerInsights } from "@/lib/data";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

interface PredictiveChartProps {
  selectedSector?: string;
}

export default function PredictiveChart({ selectedSector }: PredictiveChartProps) {
  const { chartData, summary } = useMemo(() => {
    const insights = generateAllCareerInsights();
    const filtered = selectedSector
      ? insights.filter((i) => i.sectorName === selectedSector)
      : insights;

    const totalEmployment = filtered.reduce((s, i) => s + i.totalEmployment, 0);
    const avgGrowthRate = filtered.length > 0
      ? filtered.reduce((s, i) => s + i.growthRate, 0) / filtered.length
      : 0;

    const years = Array.from({ length: 11 }, (_, i) => 2024 + i);
    const baseline = years.map((y) => {
      const offset = (y - 2024);
      const growthMult = 1 + (avgGrowthRate / 100) * offset;
      return Math.round(totalEmployment * growthMult / 1_000_000 * 10) / 10;
    });
    const withAI = years.map((y) => {
      const offset = (y - 2024);
      const aiDampening = 1 - offset * 0.018;
      const growthMult = 1 + (avgGrowthRate / 100) * offset * aiDampening;
      return Math.round(totalEmployment * growthMult / 1_000_000 * 10) / 10;
    });

    return {
      chartData: {
        labels: years.map(String),
        datasets: [
          {
            label: "Without AI Impact",
            data: baseline,
            borderColor: "#8b5cf6",
            backgroundColor: "rgba(139,92,246,0.14)",
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: "#8b5cf6",
            pointBorderColor: "rgba(139,92,246,0.35)",
            pointBorderWidth: 2,
          },
          {
            label: "With AI Impact",
            data: withAI,
            borderColor: "#22d3ee",
            backgroundColor: "rgba(34,211,238,0.06)",
            fill: true,
            tension: 0.35,
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: "#22d3ee",
            pointBorderColor: "rgba(34,211,238,0.35)",
            pointBorderWidth: 2,
          },
        ],
      },
      summary: { totalEmployment, avgGrowthRate },
    };
  }, [selectedSector]);

  const options = useMemo(() => {
    const reduced = typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;
    return {
    responsive: true,
    maintainAspectRatio: false,
    animation: reduced ? (false as const) : { duration: 800, easing: "easeOutQuart" as const },
    interaction: { mode: "index" as const, intersect: false },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#a1a1aa",
          usePointStyle: true,
          pointStyleWidth: 14,
          padding: 18,
          font: { size: 12 },
        },
      },
      title: {
        display: true,
        text: `Employment Projections 2024–2034${selectedSector ? `: ${selectedSector}` : ""}`,
        color: "#d4d4d8",
        font: { size: 14, weight: 500 },
        padding: { bottom: 14 },
      },
      tooltip: {
        backgroundColor: "rgba(9,9,11,0.92)",
        titleColor: "#e4e4e7",
        bodyColor: "#a1a1aa",
        borderColor: "rgba(139,92,246,0.30)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            `  ${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)}M jobs`,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          callback: (v: string | number) => `${Number(v).toFixed(1)}M`,
          color: "#71717a",
          font: { size: 11 },
        },
        grid: { color: "rgba(255,255,255,0.05)" },
        border: { color: "rgba(255,255,255,0.10)" },
      },
      x: {
        ticks: { color: "#71717a", font: { size: 11 } },
        grid: { display: false },
        border: { color: "rgba(255,255,255,0.10)" },
      },
    },
    };
  }, [selectedSector]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div
          className="rounded-xl border p-3"
          style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
        >
          <div className="text-2xl font-bold" style={{ background: "linear-gradient(90deg,#8b5cf6,#22d3ee)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            {(summary.totalEmployment / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-xs text-zinc-400 mt-1">Current Employment</div>
        </div>
        <div
          className="rounded-xl border p-3"
          style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
        >
          <div
            className="text-2xl font-bold"
            style={{ color: summary.avgGrowthRate >= 0 ? "#22c55e" : "#ef4444" }}
          >
            {summary.avgGrowthRate >= 0 ? "+" : ""}{summary.avgGrowthRate.toFixed(1)}%
          </div>
          <div className="text-xs text-zinc-400 mt-1">10-Year Growth</div>
        </div>
        <div
          className="rounded-xl border p-3"
          style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
        >
          <div className="text-2xl font-bold" style={{ color: "#eab308" }}>
            {(summary.avgGrowthRate * 0.4).toFixed(1)}%
          </div>
          <div className="text-xs text-zinc-400 mt-1">AI Dampening Effect</div>
        </div>
      </div>
      <div className="h-[350px]">
        <Line options={options} data={chartData} />
      </div>
    </div>
  );
}