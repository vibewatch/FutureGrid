import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { getCountryExposure, getAIUsageProxies, getCountryMapData, getDiffusionRisers } from "@/lib/data";
// CountryExposureChart and WorldChoroplethInteractive are client islands authored by teammates
import CountryExposureChart from "@/components/charts/CountryExposureChart";
import WorldChoroplethInteractive from "@/components/charts/WorldChoroplethInteractive";
import CountryDetailPanel, { type EnrichedCountry } from "@/components/dashboard/CountryDetailPanel";

// ─── Tiny 3-point sparkline (pure SVG, no animation, reduced-motion safe) ─────

function Sparkline3({ h1, h2, q1 }: { h1: number; h2: number; q1: number }) {
  const W = 60, H = 24;
  const vals = [h1, h2, q1];
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const span = maxV - minV || 0.1;
  const px = (i: number) => (((i / 2) * (W - 8)) + 4).toFixed(1);
  const py = (v: number) => (H - 4 - ((v - minV) / span) * (H - 8)).toFixed(1);
  const pts = `${px(0)},${py(vals[0])} ${px(1)},${py(vals[1])} ${px(2)},${py(vals[2])}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke="rgb(139,92,246)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={px(0)} cy={py(vals[0])} r="2" fill="rgb(139,92,246)" opacity="0.5" />
      <circle cx={px(1)} cy={py(vals[1])} r="2" fill="rgb(139,92,246)" opacity="0.5" />
      <circle cx={px(2)} cy={py(vals[2])} r="2.5" fill="rgb(139,92,246)" />
    </svg>
  );
}

export default function GlobalPage() {
  const allCountries = getCountryExposure();
  const proxies = getAIUsageProxies();

  // Extract China proxy figures from live data (with hardcoded fallbacks)
  const cnnicEntry = proxies.countrySurveyMetrics.find(
    (m) => (m as { id?: string }).id === "cn-cnnic-genai-users-2025-06",
  );
  const questEntry = proxies.chinaAppMarketMetrics.find(
    (m) => (m as { id?: string }).id === "cn-questmobile-mobile-ai-app-users-2025-06",
  );
  const doubaoEntry = proxies.chinaNativeAppMau.find(
    (m) => (m as { id?: string }).id === "cn-questmobile-doubao-mau-2025-12",
  );
  const cnnicUsers = cnnicEntry
    ? `${Math.round(Number((cnnicEntry as { value?: unknown }).value) / 1e6)}M`
    : "515M";
  const questMau = questEntry
    ? `${Math.round(Number((questEntry as { value?: unknown }).value) / 1e6)}M`
    : "680M";
  const doubaoMau = doubaoEntry
    ? `${Math.round(Number((doubaoEntry as { value?: unknown }).value) / 1e6)}M`
    : "226M";

  // Diffusion layer data: China's Microsoft AIEI figure + top leaders
  const mapData = getCountryMapData();
  const chinaDiffusion = mapData.find((c) => c.iso3 === "CHN")?.diffusionPct ?? 16.4;
  const diffusionLeaders = [...mapData]
    .filter((c) => c.diffusionPct !== null)
    .sort((a, b) => (b.diffusionPct ?? 0) - (a.diffusionPct ?? 0))
    .slice(0, 3);

  // Enrich mapData with gdpPerWorkingAgeCapita + usageCount from CountryExposure
  const enrichedCountries: EnrichedCountry[] = mapData.map((c) => {
    const exp = allCountries.find((e) => e.iso3 === c.iso3);
    return {
      ...c,
      gdpPerWorkingAgeCapita: exp?.gdpPerWorkingAgeCapita ?? null,
      usageCount: exp?.usageCount ?? null,
    };
  });

  // Ranked list: exclude zeros, sort desc by usageIndex
  const rankedEnriched = enrichedCountries
    .filter((c) => c.usageIndex !== null && c.usageIndex > 0)
    .sort((a, b) => (b.usageIndex ?? 0) - (a.usageIndex ?? 0));

  // Fastest-rising GenAI diffusion adopters (H1 2025 → Q1 2026)
  const rawRisers = getDiffusionRisers(5);
  const diffusionRisers = rawRisers.map((r) => {
    const trend = mapData.find((c) => c.iso3 === r.iso3)?.diffusionTrend ?? null;
    return { ...r, h2: trend?.h2_2025 ?? null };
  });

  const top12 = rankedEnriched.slice(0, 12);
  const totalCovered = allCountries.length;
  const topCountry = rankedEnriched[0];
  const topIndex = topCountry?.usageIndex ?? 0;

  // Normalise bar widths relative to the top country
  const maxIndex = topIndex > 0 ? topIndex : 1;

  return (
    <div className="space-y-12 max-w-[1400px]">
      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-4 pb-6">
        <Reveal>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
            <span className="text-gradient">Global AI Adoption</span>
            <br />
            <span className="text-zinc-900 dark:text-white">by Country</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            AI adoption varies dramatically across countries. This page shows{" "}
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">real per-capita AI (Claude.ai) usage</span>{" "}
            from the{" "}
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">
              Anthropic Economic Index (Aug 2025)
            </span>{" "}
            — a usage-based measure grounded in observed behaviour, not forecasts.
          </p>
        </Reveal>

        {/* ─── HEADLINE STATS ──────────────────────────────────────────── */}
        <Reveal delay={160} className="mt-8">
          <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
            <div>
              <AnimatedCounter
                value={totalCovered}
                durationMs={1400}
                className="text-4xl sm:text-5xl font-extrabold text-gradient tabular-nums"
              />
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
                Countries tracked
              </p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-zinc-300 dark:bg-zinc-800" aria-hidden="true" />
            <div>
              <AnimatedCounter
                value={rankedEnriched.length}
                durationMs={1400}
                className="text-4xl sm:text-5xl font-extrabold text-gradient tabular-nums"
              />
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
                With measurable usage
              </p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-zinc-300 dark:bg-zinc-800" aria-hidden="true" />
            <div>
              <AnimatedCounter
                value={topIndex}
                decimals={2}
                durationMs={1600}
                className="text-4xl sm:text-5xl font-extrabold text-gradient tabular-nums"
              />
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
                Top usage index ({topCountry?.name ?? "—"})
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <hr className="divider-glow" />

      {/* ─── WORLD MAP ───────────────────────────────────────────────────────── */}
      <Reveal delay={80}>
        <section aria-labelledby="world-map-heading">
          <h2
            id="world-map-heading"
            className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gradient mb-2"
          >
            Global AI Adoption — World Map
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 max-w-2xl leading-relaxed">
            Two lenses are available via the layer toggle:{" "}
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">Claude.ai usage</span>{" "}
            (per-capita observed interactions, Anthropic Economic Index Aug&nbsp;2025 —
            availability-biased; China and restricted markets appear grey) and{" "}
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">GenAI diffusion</span>{" "}
            (Microsoft AIEI Q1&nbsp;2026, % of working-age population using GenAI across
            147&nbsp;countries,{" "}
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">China included</span>
            ). The two metrics use different denominators and cannot be merged — see{" "}
            <Link
              href="/sources"
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              Data &amp; Sources
            </Link>
            .
          </p>
          <div className="glass p-4 sm:p-6 rounded-2xl">
            <WorldChoroplethInteractive />
          </div>

          {/* GenAI diffusion leaders */}
          {diffusionLeaders.length > 0 && (
            <div className="mt-5" aria-label="Top GenAI diffusion countries">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                GenAI diffusion leaders · Microsoft AIEI Q1&nbsp;2026
              </p>
              <div className="flex flex-wrap gap-2">
                {diffusionLeaders.map((c) => (
                  <div
                    key={c.iso3}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700/40 text-sm"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">{c.name}</span>
                    <span className="text-violet-400 font-bold tabular-nums">
                      {c.diffusionPct?.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-600 mt-1.5">
                % working-age population using generative AI (147-country survey).
              </p>
            </div>
          )}
        </section>
      </Reveal>

      {/* ─── CHINA CALLOUT ───────────────────────────────────────────────────── */}
      <Reveal delay={120}>
        <div
          className="glass rounded-2xl overflow-hidden"
          style={{ borderColor: "rgba(245,158,11,0.2)", borderWidth: 1 }}
          aria-label="China AI adoption proxy context"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-4 border-b border-amber-500/10">
            <span aria-hidden="true" className="text-lg">🇨🇳</span>
            <h2 className="text-base font-semibold text-amber-200">
              China — Proxy Context
            </h2>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Claude layer: grey
            </span>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-5">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Claude.ai is{" "}
              <span className="text-zinc-700 dark:text-zinc-200 font-medium">unavailable in mainland China</span>,
              so it appears grey on the Claude.ai usage layer and is excluded from the
              per-capita usage index. On the{" "}
              <span className="text-zinc-700 dark:text-zinc-200 font-medium">GenAI diffusion layer</span>, China
              does appear — Microsoft AIEI estimates{" "}
              <span className="text-amber-300 font-bold">~{chinaDiffusion.toFixed(1)}%</span>{" "}
              of working-age adults used GenAI in Q1&nbsp;2026. Note that Western telemetry
              likely undercounts domestic apps (Doubao, Kimi, etc.) — CNNIC&rsquo;s survey
              implies ~43% penetration. The native-ecosystem figures below use different
              measurement approaches and denominators and are{" "}
              <span className="text-zinc-700 dark:text-zinc-200 font-medium">not merged into either index</span>.
            </p>

            {/* Proxy stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl px-4 py-3 bg-white/70 dark:bg-zinc-900/50 border border-amber-500/10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                  CNNIC · Jun 2025
                </p>
                <p className="text-2xl font-extrabold text-amber-300 tabular-nums">
                  {cnnicUsers}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Generative-AI users</p>
              </div>
              <div className="rounded-xl px-4 py-3 bg-white/70 dark:bg-zinc-900/50 border border-amber-500/10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                  QuestMobile · H1 2025
                </p>
                <p className="text-2xl font-extrabold text-amber-300 tabular-nums">
                  {questMau}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">Mobile-AI MAU</p>
              </div>
              <div className="rounded-xl px-4 py-3 bg-white/70 dark:bg-zinc-900/50 border border-amber-500/10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                  Doubao (QuestMobile) · Dec 2025
                </p>
                <p className="text-2xl font-extrabold text-amber-300 tabular-nums">
                  {doubaoMau}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">App MAU</p>
              </div>
              <div className="rounded-xl px-4 py-3 bg-white/70 dark:bg-zinc-900/50 border border-violet-500/10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                  Microsoft AIEI · Q1 2026
                </p>
                <p className="text-2xl font-extrabold text-violet-300 tabular-nums">
                  ~{chinaDiffusion.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">GenAI diffusion (working-age pop.)</p>
              </div>
            </div>

            {/* Caveat */}
            <p className="text-xs text-zinc-500 leading-relaxed">
              These proxies use different measurement methods (government survey, app-market scan,
              product MAU) and cannot be summed or directly compared to each other.{" "}
              <span className="text-zinc-600 dark:text-zinc-400">
                The <code className="text-zinc-700 dark:text-zinc-300">usageIndex</code> (Claude.ai interactions
                per working-age capita) and <code className="text-zinc-700 dark:text-zinc-300">diffusionPct</code>{" "}
                (Microsoft AIEI survey %) use entirely different denominators — do not merge them.
              </span>{" "}
              See the{" "}
              <Link
                href="/sources"
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
              >
                Data &amp; Sources
              </Link>{" "}
              page for full provenance details.
            </p>
          </div>
        </div>
      </Reveal>

      <hr className="divider-glow" />

      {/* ─── FASTEST-RISING ADOPTERS ──────────────────────────────────────── */}
      {diffusionRisers.length > 0 && (
        <Reveal delay={100}>
          <section aria-labelledby="diffusion-risers-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-4 mb-1">
              <h2
                id="diffusion-risers-heading"
                className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gradient"
              >
                Fastest-Rising Adopters
              </h2>
              <Link
                href="/sources"
                className="text-xs text-zinc-500 hover:text-violet-400 underline underline-offset-2 transition-colors shrink-0"
              >
                Microsoft AIEI · see sources
              </Link>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 max-w-2xl leading-relaxed">
              Countries with the largest GenAI diffusion gains,{" "}
              <span className="text-zinc-700 dark:text-zinc-200 font-medium">H1&nbsp;2025 → Q1&nbsp;2026</span>.
              Based on Microsoft&rsquo;s AI Economic Impact Index (Western telemetry — may
              undercount domestic apps in some markets).{" "}
              <Link
                href="/sources"
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
              >
                Full source details →
              </Link>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {diffusionRisers.map((r) => (
                <div
                  key={r.iso3}
                  className="glass rounded-xl px-4 py-3 space-y-2"
                >
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white leading-tight">
                    {r.name}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 tabular-nums">
                      {r.from.toFixed(1)}% → {r.to.toFixed(1)}%
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400 tabular-nums bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 ml-auto">
                      +{r.delta.toFixed(1)}pp
                    </span>
                  </div>
                  {r.h2 !== null && (
                    <Sparkline3 h1={r.from} h2={r.h2} q1={r.to} />
                  )}
                </div>
              ))}
            </div>

            <p className="text-[10px] text-zinc-600 mt-3 leading-relaxed">
              Microsoft AIEI · H1 2025 → Q1 2026 · % working-age population using
              generative AI across 147&nbsp;economies. Western telemetry —{" "}
              <Link
                href="/sources"
                className="text-zinc-500 hover:text-zinc-400 transition-colors underline underline-offset-2"
              >
                see sources
              </Link>{" "}
              for caveats.
            </p>
          </section>
        </Reveal>
      )}

      <hr className="divider-glow" />

      {/* ─── CHART PANEL ─────────────────────────────────────────────────── */}
      <Reveal delay={80}>
        <div>
          <h2 className="text-xl font-bold text-gradient mb-2">
            World Map — AI Usage Index
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            Per-capita AI usage index normalised against working-age population.
            Darker / higher = more AI usage relative to population size.
          </p>
          <hr className="divider-glow mb-6" />
          <div className="glass p-6">
            <CountryExposureChart />
          </div>
        </div>
      </Reveal>

      <hr className="divider-glow" />

      {/* ─── TOP 12 RANKED LIST / COUNTRY DETAIL ─────────────────────── */}
      <Reveal delay={120}>
        <CountryDetailPanel
          countries={enrichedCountries}
          top12={top12}
          maxIndex={maxIndex}
          cnnicUsers={cnnicUsers}
          questMau={questMau}
          doubaoMau={doubaoMau}
        />
      </Reveal>

      <hr className="divider-glow" />

      {/* ─── METHODOLOGY NOTE ────────────────────────────────────────────── */}
      <Reveal delay={0}>
        <div
          className="glass px-5 py-4 rounded-xl text-sm text-zinc-600 dark:text-zinc-400 max-w-3xl space-y-2"
          role="note"
          aria-label="Methodology"
        >
          <p className="font-semibold text-zinc-700 dark:text-zinc-200">Methodology</p>
          <p>
            Usage index = observed Claude.ai interactions per working-age capita,
            normalised across all countries. Source:{" "}
            <span className="text-zinc-700 dark:text-zinc-300">
              Anthropic Economic Index, August 2025 snapshot
            </span>{" "}
            (194 reported country rows, plus a supplemental China row using World Bank 2024 GDP
            and working-age population). GDP data comes from World Bank / IMF fields bundled in
            the Anthropic dataset, with China GDP-per-worker sourced directly from World Bank.
            Countries with zero recorded interactions are excluded from ranked lists but remain
            in the dataset; countries with unreported Claude.ai usage metrics do not rank.
          </p>
          <p>
            For full details on data provenance and licensing, see the{" "}
            <Link
              href="/sources"
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              Data &amp; Sources
            </Link>{" "}
            page.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
