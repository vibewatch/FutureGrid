import Link from "next/link";
import SummaryCard from "@/components/dashboard/SummaryCard";
import JobImpactChart from "@/components/charts/JobImpactChart";
import PredictiveChart from "@/components/charts/PredictiveChart";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import Reveal from "@/components/ui/Reveal";
import HeroRiskChecker from "@/components/dashboard/HeroRiskChecker";
import HighlightsBento from "@/components/dashboard/HighlightsBento";
import SectorScatterChart from "@/components/charts/SectorScatterChart";
import { generateAllCareerInsights, getSectorAggregates } from "@/lib/data";

export default function HomePage() {
  const insights = generateAllCareerInsights();
  const sectors = getSectorAggregates();
  const highRiskCount = insights.filter(
    (i) => i.automationRisk === "High" || i.automationRisk === "Very High"
  ).length;
  const lowRiskCount = insights.filter((i) => i.automationRisk === "Low").length;
  const avgRiskAll =
    insights.length > 0
      ? insights.reduce((s, i) => s + i.automationProbability, 0) / insights.length
      : 0;

  return (
    <div className="space-y-12 max-w-[1400px]">

      {/* ─── HERO ──────────────────────────────────────────────────────────── */}
      <section className="pt-4 pb-6">
        <Reveal>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
            <span className="text-gradient">See which careers</span>
            <br />
            <span className="text-white">AI is reshaping.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
            Research-based estimates across{" "}
            <span className="text-zinc-200 font-medium">{insights.length}</span>{" "}
            occupations and 22 sectors — understand your exposure, discover resilient paths.
          </p>
        </Reveal>

        <Reveal delay={160} className="mt-8">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
            <div>
              <AnimatedCounter
                value={insights.length}
                suffix="+"
                durationMs={1400}
                className="text-4xl sm:text-5xl font-extrabold text-gradient tabular-nums"
              />
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Occupations tracked</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-zinc-800" aria-hidden="true" />
            <div>
              <AnimatedCounter
                value={avgRiskAll * 100}
                decimals={1}
                suffix="%"
                durationMs={1400}
                className="text-4xl sm:text-5xl font-extrabold text-gradient tabular-nums"
              />
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Avg AI risk</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-zinc-800" aria-hidden="true" />
            <div>
              <AnimatedCounter
                value={highRiskCount}
                durationMs={1400}
                className="text-4xl sm:text-5xl font-extrabold text-gradient tabular-nums"
              />
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">High-risk roles</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={220} className="mt-6">
          <div
            className="glass flex gap-2.5 items-start px-4 py-3 rounded-xl text-sm text-zinc-400 max-w-2xl"
            role="note"
            aria-label="About this data"
          >
            <span aria-hidden="true" className="text-zinc-500 shrink-0 mt-px select-none">ℹ</span>
            <p>
              Automation-risk figures are probabilistic estimates from the{" "}
              <span className="text-zinc-300">Frey &amp; Osborne (2013)</span> research model —
              not official forecasts or guarantees of job loss. Some employment figures are
              illustrative.
            </p>
          </div>
        </Reveal>

        <Reveal delay={320} className="mt-8">
          <HeroRiskChecker />
        </Reveal>

        <Reveal delay={400} className="mt-6">
          <Link
            href="/careers"
            className="brand-grad inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
          >
            Explore all careers
            <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
      </section>

      <hr className="divider-glow" />

      {/* ─── SUMMARY CARDS ─────────────────────────────────────────────────── */}
      <Reveal delay={0}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Occupations Tracked"
            value={insights.length.toString()}
            numericValue={insights.length}
            subtitle="Across 22 major sectors"
            color="#8b5cf6"
            href="/careers"
          />
          <SummaryCard
            title="Average AI Risk"
            value={`${(avgRiskAll * 100).toFixed(1)}%`}
            numericValue={avgRiskAll * 100}
            numericDecimals={1}
            numericSuffix="%"
            subtitle="Automation probability"
            trend={avgRiskAll > 0.5 ? "Above 50% threshold" : "Below 50% threshold"}
            trendUp={avgRiskAll > 0.5}
            color="#f59e0b"
            href="/sectors"
          />
          <SummaryCard
            title="High Risk Occupations"
            value={highRiskCount.toString()}
            numericValue={highRiskCount}
            subtitle="High or Very High automation risk"
            color="#ef4444"
            href="/careers?risk=high"
          />
          <SummaryCard
            title="AI-Resilient Careers"
            value={lowRiskCount.toString()}
            numericValue={lowRiskCount}
            subtitle="Low automation probability"
            color="#22c55e"
            href="/careers?risk=low"
          />
        </div>
      </Reveal>

      <hr className="divider-glow" />

      {/* ─── STANDOUT CAREERS ──────────────────────────────────────────────── */}
      <Reveal delay={80}>
        <div>
          <h2 className="text-xl font-bold text-gradient mb-1">Standout Careers</h2>
          <p className="text-xs text-zinc-600 mb-2">Figures are Frey &amp; Osborne (2013) model estimates.</p>
          <hr className="divider-glow mb-6" />
          <HighlightsBento />
        </div>
      </Reveal>

      <hr className="divider-glow" />

      {/* ─── SECTOR LANDSCAPE ──────────────────────────────────────────────── */}
      <Reveal delay={120}>
        <div>
          <h2 className="text-xl font-bold text-gradient mb-2">Sector Landscape</h2>
          <hr className="divider-glow mb-6" />
          <div className="glass p-6">
            <p className="text-xs text-zinc-500 mb-4 uppercase tracking-widest">
              Automation risk × growth rate × employment (bubble size) — click a sector to explore
            </p>
            <SectorScatterChart />
          </div>
        </div>
      </Reveal>

      <hr className="divider-glow" />

      {/* ─── CHARTS ────────────────────────────────────────────────────────── */}
      <Reveal delay={160}>
        <div>
          <h2 className="text-xl font-bold text-gradient mb-2">Market Intelligence</h2>
          <hr className="divider-glow mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass p-6">
              <h3 className="text-xs font-semibold text-zinc-400 mb-4 uppercase tracking-wider">
                Top 20 Occupations by Automation Risk
              </h3>
              <JobImpactChart />
            </div>
            <div className="glass p-6">
              <h3 className="text-xs font-semibold text-zinc-400 mb-4 uppercase tracking-wider">
                Employment Projections with AI Impact
              </h3>
              <PredictiveChart />
            </div>
          </div>
        </div>
      </Reveal>

      {/* ─── SECTOR GRID ───────────────────────────────────────────────────── */}
      <Reveal delay={240}>
        <div>
          <h2 className="text-xl font-bold text-gradient mb-2">Sector Snapshot</h2>
          <hr className="divider-glow mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.slice(0, 6).map((s) => (
              <div key={s.sector} className="glass glass-hover p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white text-sm">{s.sector}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      s.avgRisk < 0.3
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : s.avgRisk < 0.6
                        ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}
                  >
                    {(s.avgRisk * 100).toFixed(0)}% risk
                  </span>
                </div>
                <div className="text-sm text-zinc-400 space-y-0.5">
                  <div>{s.occupationCount} occupations</div>
                  <div>
                    <span className={s.avgGrowth >= 0 ? "text-green-400" : "text-red-400"}>
                      {s.avgGrowth >= 0 ? "+" : ""}
                      {s.avgGrowth.toFixed(1)}%
                    </span>{" "}
                    growth rate
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

    </div>
  );
}