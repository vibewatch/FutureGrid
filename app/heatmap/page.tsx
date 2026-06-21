import HeatmapChart from "@/components/charts/HeatmapChart";
import { getSectorAggregates } from "@/lib/data";
import Link from "next/link";

export default function HeatmapPage() {
  const sectors = getSectorAggregates();

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">AI Disruption Heatmap</h1>
        <p className="text-zinc-400 mt-1">Visualize automation risk across sectors and geographic regions.</p>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <HeatmapChart />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Sector Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectors.map((s) => (
            <Link
              key={s.sector}
              href={`/sectors/${encodeURIComponent(s.sector)}`}
              className="block bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-4 hover:border-zinc-600 transition-colors"
            >
              <h3 className="font-semibold text-white mb-2">{s.sector}</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Avg Risk</span>
                  <span className="text-white">{(s.avgRisk * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Growth</span>
                  <span className={s.avgGrowth >= 0 ? "text-green-400" : "text-red-400"}>
                    {s.avgGrowth >= 0 ? "+" : ""}{s.avgGrowth.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Occupations</span>
                  <span className="text-white">{s.occupationCount}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}