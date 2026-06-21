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
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            fill: true,
            tension: 0.3,
            borderWidth: 2,
          },
          {
            label: "With AI Impact",
            data: withAI,
            borderColor: "rgb(239, 68, 68)",
            backgroundColor: "rgba(239, 68, 68, 0.05)",
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            borderDash: [6, 4],
          },
        ],
      },
      summary: { totalEmployment, avgGrowthRate },
    };
  }, [selectedSector]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const, labels: { color: "#a1a1aa" } },
      title: {
        display: true,
        text: `Employment Projections 2024–2034${selectedSector ? `: ${selectedSector}` : ""}`,
        color: "#a1a1aa",
        font: { size: 14 },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; parsed: { y: number | null } }) =>
            `${ctx.dataset.label}: ${(ctx.parsed.y ?? 0).toFixed(1)}M jobs`,
        },
      },
    },
    scales: {
      y: {
        ticks: { callback: (v: string | number) => `${Number(v).toFixed(1)}M`, color: "#a1a1aa" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
      x: {
        ticks: { color: "#a1a1aa" },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-400">
            {(summary.totalEmployment / 1_000_000).toFixed(1)}M
          </div>
          <div className="text-xs text-zinc-400 mt-1">Current Employment</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className={`text-2xl font-bold ${summary.avgGrowthRate >= 0 ? "text-green-400" : "text-red-400"}`}>
            {summary.avgGrowthRate >= 0 ? "+" : ""}{summary.avgGrowthRate.toFixed(1)}%
          </div>
          <div className="text-xs text-zinc-400 mt-1">10-Year Growth</div>
        </div>
        <div className="bg-zinc-800/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-amber-400">
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