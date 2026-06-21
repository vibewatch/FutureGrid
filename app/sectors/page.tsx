import CareerTrendChart from "@/components/charts/CareerTrendChart";
import JobImpactChart from "@/components/charts/JobImpactChart";
import { getSectorAggregates } from "@/lib/data";
import Link from "next/link";
import { colorForRisk } from "@/lib/utils";

export default function SectorsPage() {
  const sectors = getSectorAggregates();

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">AI Disruption by Sector</h1>
        <p className="text-zinc-400 mt-1">Compare automation risk, employment growth, and occupation counts across major industry sectors.</p>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <CareerTrendChart />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Top Occupations by Automation Risk</h2>
        <JobImpactChart />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectors.map((s) => (
          <Link
            key={s.sector}
            href={`/sectors/${encodeURIComponent(s.sector)}`}
            className="block bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-600 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorForRisk(s.avgRisk < 0.3 ? "Low" : s.avgRisk < 0.6 ? "Medium" : s.avgRisk < 0.85 ? "High" : "Very High") }} />
              <h3 className="text-lg font-semibold text-white">{s.sector}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Avg AI Risk</span>
                <span className="font-medium text-white">{(s.avgRisk * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Growth Rate</span>
                <span className={`font-medium ${s.avgGrowth >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {s.avgGrowth >= 0 ? "+" : ""}{s.avgGrowth.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Occupations</span>
                <span className="font-medium text-white">{s.occupationCount}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}