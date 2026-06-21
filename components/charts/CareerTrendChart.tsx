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
import { getSectorAggregates } from "@/lib/data";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function CareerTrendChart() {
  const sectors = getSectorAggregates();

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" as const },
      title: { display: true, text: "Average AI Automation Risk by Sector", color: "#a1a1aa", font: { size: 14 } },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: { callback: (v: string | number) => `${(Number(v) * 100).toFixed(0)}%`, color: "#a1a1aa" },
        grid: { color: "rgba(255,255,255,0.05)" },
      },
      x: {
        ticks: { color: "#a1a1aa" },
        grid: { display: false },
      },
    },
  };

  const data = {
    labels: sectors.map((s) => s.sector),
    datasets: [
      {
        label: "Automation Risk",
        data: sectors.map((s) => s.avgRisk),
        backgroundColor: sectors.map((s) => {
          if (s.avgRisk < 0.3) return "rgba(34, 197, 94, 0.7)";
          if (s.avgRisk < 0.6) return "rgba(234, 179, 8, 0.7)";
          if (s.avgRisk < 0.85) return "rgba(249, 115, 22, 0.7)";
          return "rgba(239, 68, 68, 0.7)";
        }),
        borderColor: sectors.map((s) => {
          if (s.avgRisk < 0.3) return "rgb(34, 197, 94)";
          if (s.avgRisk < 0.6) return "rgb(234, 179, 8)";
          if (s.avgRisk < 0.85) return "rgb(249, 115, 22)";
          return "rgb(239, 68, 68)";
        }),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  return (
    <div className="w-full h-[400px]">
      <Bar options={options} data={data} />
    </div>
  );
}