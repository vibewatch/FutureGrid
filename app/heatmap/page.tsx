import HeatmapChart from "@/components/charts/HeatmapChart";
import { getSectorAggregatesExtended } from "@/lib/data";
import { colorForRisk, formatCurrency } from "@/lib/utils";
import Link from "next/link";

const RISK_LEGEND = [
  { label: "Low AI Exposure",       color: "#22c55e", range: "< 30%"  },
  { label: "Medium AI Exposure",    color: "#eab308", range: "30–60%" },
  { label: "High AI Exposure",      color: "#f97316", range: "60–85%" },
  { label: "Very High AI Exposure", color: "#ef4444", range: "> 85%"  },
] as const;

function riskLabel(r: number): "Low" | "Medium" | "High" | "Very High" {
  if (r < 0.3) return "Low";
  if (r < 0.6) return "Medium";
  if (r < 0.85) return "High";
  return "Very High";
}

export default function HeatmapPage() {
  const sectors = getSectorAggregatesExtended();

  return (
    <div className="space-y-8 max-w-[1400px]">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-3xl font-bold tracking-tight text-gradient">
          Country × AI Readiness Heatmap
        </h1>
        <p className="text-zinc-400 mt-1">
          Real AI metrics for 25 major economies — usage index, GenAI diffusion, IMF AI
          Readiness, and four AIPI sub-indices. Each metric is independently normalised to 0–1
          for colour comparability.{" "}
          <Link href="/sources" className="text-violet-400 hover:text-violet-300 underline underline-offset-2">
            View sources →
          </Link>
        </p>
      </div>

      {/* Legend */}
      <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl px-5 py-4">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          AI Exposure Legend
        </h2>
        <div className="flex flex-wrap gap-4">
          {RISK_LEGEND.map(({ label, color, range }) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className="w-3.5 h-3.5 rounded-sm shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-zinc-300">{label}</span>
              <span className="text-xs text-zinc-600">{range}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Heatmap chart */}
      <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <HeatmapChart />
      </div>

      {/* Sector detail cards */}
      <div className="glass bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-5">Sector Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sectors.map((s) => {
            const rl = riskLabel(s.avgRisk);
            const riskColor = colorForRisk(rl);
            return (
              <Link
                key={s.sector}
                href={`/sectors/${encodeURIComponent(s.sector)}`}
                className="relative group block glass glass-hover bg-zinc-800/40 border border-zinc-700/40 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all overflow-hidden"
              >
                {/* Accent stripe */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                  style={{ backgroundColor: riskColor }}
                />

                <div className="pl-3">
                  <h3 className="font-semibold text-white text-sm leading-tight mb-3 group-hover:text-cyan-300 transition-colors">
                    {s.sector}
                  </h3>

                  {/* Risk bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-500">Avg Risk</span>
                      <span className="font-semibold" style={{ color: riskColor }}>
                        {(s.avgRisk * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${s.avgRisk * 100}%`,
                          backgroundColor: riskColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Bright Outlook</span>
                      <span className="text-green-400 font-medium">
                        {(s.brightShare * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Avg Salary</span>
                      <span className="text-white font-medium">
                        {s.avgSalary != null ? formatCurrency(s.avgSalary) : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Occupations</span>
                      <span className="text-white font-medium">{s.occupationCount}</span>
                    </div>
                  </div>
                </div>

                {/* Hover tooltip overlay */}
                <div className="absolute inset-x-0 bottom-0 h-0 group-hover:h-auto overflow-hidden transition-all duration-200">
                  <div className="bg-zinc-900/95 border-t border-zinc-700/50 px-4 py-2 text-xs text-zinc-400 invisible group-hover:visible">
                    Employment: {s.totalEmployment != null ? s.totalEmployment.toLocaleString() : "—"} &middot; Exposure: {rl}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
