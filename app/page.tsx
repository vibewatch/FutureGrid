import Link from "next/link";
import SummaryCard from "@/components/dashboard/SummaryCard";
import JobImpactChart from "@/components/charts/JobImpactChart";
import PredictiveChart from "@/components/charts/PredictiveChart";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import Reveal from "@/components/ui/Reveal";
import HeroRiskChecker from "@/components/dashboard/HeroRiskChecker";
import HighlightsBento from "@/components/dashboard/HighlightsBento";
import SectorScatterChart from "@/components/charts/SectorScatterChart";
import { generateAllCareerInsights, getSectorAggregatesExtended, getTotalWorkforce, getWorkforceExposure } from "@/lib/data";

export default function HomePage() {
  const insights = generateAllCareerInsights();
  const sectors = getSectorAggregatesExtended();
  const totalWorkforce = getTotalWorkforce();
  const workforceExposure = getWorkforceExposure();
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
            <span className="text-zinc-900 dark:text-white">AI is reshaping.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            Research-based estimates across{" "}
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">{insights.length}</span>{" "}
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
            <div className="hidden sm:block w-px h-10 bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
            <div>
              <AnimatedCounter
                value={avgRiskAll * 100}
                decimals={1}
                suffix="%"
                durationMs={1400}
                className="text-4xl sm:text-5xl font-extrabold text-gradient tabular-nums"
              />
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Avg AI exposure</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
            <div>
              <AnimatedCounter
                value={highRiskCount}
                durationMs={1400}
                className="text-4xl sm:text-5xl font-extrabold text-gradient tabular-nums"
              />
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">High-exposure roles</p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-zinc-200 dark:bg-zinc-800" aria-hidden="true" />
            <div>
              <AnimatedCounter
                value={totalWorkforce / 1_000_000}
                decimals={1}
                suffix="M"
                durationMs={1600}
                className="text-4xl sm:text-5xl font-extrabold text-gradient tabular-nums"
              />
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">Total workforce tracked</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={220} className="mt-6">
          <div
            className="glass flex gap-2.5 items-start px-4 py-3 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl"
            role="note"
            aria-label="About this data"
          >
            <span aria-hidden="true" className="text-zinc-500 shrink-0 mt-px select-none">ℹ</span>
            <p>
              AI-exposure figures reflect observed AI (LLM) usage from the{" "}
              <span className="text-zinc-700 dark:text-zinc-300">Anthropic Economic Index (2025)</span>, mapped to
              O*NET tasks — a relative exposure measure, not a prediction of job loss.{" "}
              <Link href="/sources" className="text-zinc-500 underline underline-offset-2 hover:text-zinc-400">
                See Sources
              </Link>
              .
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
            title="Average AI Exposure"
            value={`${(avgRiskAll * 100).toFixed(1)}%`}
            numericValue={avgRiskAll * 100}
            numericDecimals={1}
            numericSuffix="%"
            subtitle="AI usage exposure"
            trend={avgRiskAll > 0.5 ? "Above 50% threshold" : "Below 50% threshold"}
            trendUp={avgRiskAll > 0.5}
            color="#f59e0b"
            href="/sectors"
          />
          <SummaryCard
            title="High AI-Exposure Roles"
            value={highRiskCount.toString()}
            numericValue={highRiskCount}
            subtitle="High or Very High AI exposure"
            color="#ef4444"
            href="/careers?risk=high"
          />
          <SummaryCard
            title="AI-Resilient Careers"
            value={lowRiskCount.toString()}
            numericValue={lowRiskCount}
            subtitle="Low AI exposure"
            color="#22c55e"
            href="/careers?risk=low"
          />
        </div>
      </Reveal>

      <hr className="divider-glow" />

      {/* ─── WORKFORCE EXPOSURE HEADLINE ───────────────────────────────────── */}
      <Reveal delay={40}>
        <div className="glass rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="shrink-0">
            <AnimatedCounter
              value={workforceExposure.highExposureShare * 100}
              decimals={1}
              suffix="%"
              durationMs={1600}
              className="text-5xl sm:text-6xl font-extrabold text-gradient tabular-nums"
            />
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">of the U.S. workforce</p>
          </div>
          <div className="hidden sm:block w-px h-16 bg-zinc-200 dark:bg-zinc-800 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-white leading-snug">
              is in <span className="text-gradient">high AI-exposure</span> occupations
            </p>
            <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-400 max-w-xl leading-relaxed">
              Employment-weighted: BLS OEWS employment × Anthropic Economic Index exposure bands
              ({(workforceExposure.highExposureWorkforce / 1_000_000).toFixed(1)}M of {(workforceExposure.totalWorkforce / 1_000_000).toFixed(1)}M workers tracked).
              This measures occupational AI exposure — not predicted job loss.{" "}
              <Link href="/sources" className="text-zinc-500 underline underline-offset-2 hover:text-zinc-400">
                Sources
              </Link>
              .
            </p>
          </div>
        </div>
      </Reveal>

      <hr className="divider-glow" />

      {/* ─── STANDOUT CAREERS ──────────────────────────────────────────────── */}
      <Reveal delay={80}>
        <div>
          <h2 className="text-xl font-bold text-gradient mb-1">Standout Careers</h2>
          <p className="text-[10px] text-zinc-600 mb-2">
            AI-exposure from the Anthropic Economic Index (2025); outlook from O*NET.{" "}
            <Link href="/sources" className="text-zinc-500 underline underline-offset-2 hover:text-zinc-400">Sources</Link>.
          </p>
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
              AI exposure × Bright-Outlook share × sector size (bubble) — click a sector to explore
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
              <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-4 uppercase tracking-wider">
                Top 20 Occupations by AI Exposure
              </h3>
              <JobImpactChart />
            </div>
            <div className="glass p-6">
              <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-4 uppercase tracking-wider">
                Employment Projections &amp; AI Exposure
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
                  <h3 className="font-semibold text-zinc-900 dark:text-white text-sm">{s.sector}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${
                      s.avgRisk < 0.3
                        ? "bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20"
                        : s.avgRisk < 0.6
                        ? "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/20"
                        : "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20"
                    }`}
                  >
                    {(s.avgRisk * 100).toFixed(0)}% exposure
                  </span>
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-0.5">
                  <div>{s.occupationCount} occupations</div>
                  <div>
                    <span className="text-green-700 dark:text-green-400">{(s.brightShare * 100).toFixed(0)}%</span>{" "}
                    Bright Outlook
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