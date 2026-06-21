import SummaryCard from "@/components/dashboard/SummaryCard";
import JobImpactChart from "@/components/charts/JobImpactChart";
import PredictiveChart from "@/components/charts/PredictiveChart";
import { generateAllCareerInsights, getSectorAggregates } from "@/lib/data";

export default function HomePage() {
  const insights = generateAllCareerInsights();
  const sectors = getSectorAggregates();
  const highRiskCount = insights.filter((i) => i.automationRisk === "High" || i.automationRisk === "Very High").length;
  const lowRiskCount = insights.filter((i) => i.automationRisk === "Low").length;
  const avgRiskAll = insights.length > 0 ? insights.reduce((s, i) => s + i.automationProbability, 0) / insights.length : 0;

  return (
    <div className="space-y-8 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">AI Career Impact Dashboard</h1>
        <p className="text-zinc-400 mt-1">Real-time analysis of how artificial intelligence is reshaping the job market across sectors and occupations.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Occupations Tracked"
          value={insights.length.toString()}
          subtitle="Across 22 major sectors"
          color="#8b5cf6"
          href="/careers"
        />
        <SummaryCard
          title="Average AI Risk"
          value={`${(avgRiskAll * 100).toFixed(1)}%`}
          subtitle="Automation probability"
          trend={avgRiskAll > 0.5 ? "Above 50% threshold" : "Below 50% threshold"}
          trendUp={avgRiskAll > 0.5}
          color="#f59e0b"
          href="/sectors"
        />
        <SummaryCard
          title="High Risk Occupations"
          value={highRiskCount.toString()}
          subtitle="High or Very High automation risk"
          color="#ef4444"
          href="/careers?risk=high"
        />
        <SummaryCard
          title="AI-Resilient Careers"
          value={lowRiskCount.toString()}
          subtitle="Low automation probability"
          color="#22c55e"
          href="/careers?risk=low"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top 20 Occupations by Automation Risk</h2>
          <JobImpactChart />
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Employment Projections with AI Impact</h2>
          <PredictiveChart />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectors.slice(0, 6).map((s) => (
          <div key={s.sector} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">{s.sector}</h3>
              <span className={`text-xs px-2 py-1 rounded-full ${
                s.avgRisk < 0.3 ? "bg-green-900/30 text-green-400" :
                s.avgRisk < 0.6 ? "bg-yellow-900/30 text-yellow-400" :
                "bg-red-900/30 text-red-400"
              }`}>
                {(s.avgRisk * 100).toFixed(0)}% risk
              </span>
            </div>
            <div className="text-sm text-zinc-400">
              <div>{s.occupationCount} occupations</div>
              <div className="mt-1">
                <span className={s.avgGrowth >= 0 ? "text-green-400" : "text-red-400"}>
                  {s.avgGrowth >= 0 ? "+" : ""}{s.avgGrowth.toFixed(1)}%
                </span>
                {" "} growth rate
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}