import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { getCountryExposure, getAIUsageProxies } from "@/lib/data";
// CountryExposureChart and WorldChoropleth are client islands authored by teammates
import CountryExposureChart from "@/components/charts/CountryExposureChart";
import WorldChoropleth from "@/components/charts/WorldChoropleth";

export const metadata = {
  title: "Global AI Adoption — FutureGrid",
  description:
    "Per-country AI (Claude.ai) usage from the Anthropic Economic Index (Aug 2025). See which nations lead in real-world AI adoption.",
};

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

  // Ranked list: exclude zeros, sort desc by usageIndex
  const ranked = allCountries
    .filter((c) => c.usageIndex !== null && c.usageIndex > 0)
    .sort((a, b) => (b.usageIndex ?? 0) - (a.usageIndex ?? 0));

  const top12 = ranked.slice(0, 12);
  const totalCovered = allCountries.length;
  const topCountry = ranked[0];
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
            <span className="text-white">by Country</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 max-w-2xl leading-relaxed">
            AI adoption varies dramatically across countries. This page shows{" "}
            <span className="text-zinc-200 font-medium">real per-capita AI (Claude.ai) usage</span>{" "}
            from the{" "}
            <span className="text-zinc-200 font-medium">
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
            <div className="hidden sm:block w-px h-10 bg-zinc-800" aria-hidden="true" />
            <div>
              <AnimatedCounter
                value={ranked.length}
                durationMs={1400}
                className="text-4xl sm:text-5xl font-extrabold text-gradient tabular-nums"
              />
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
                With measurable usage
              </p>
            </div>
            <div className="hidden sm:block w-px h-10 bg-zinc-800" aria-hidden="true" />
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
          <p className="text-sm text-zinc-400 mb-6 max-w-2xl leading-relaxed">
            Real per-capita Claude.ai usage from the Anthropic Economic Index (Aug 2025),
            visualised across all tracked countries. Nations with restricted or unavailable
            Claude.ai access — including China — are shown distinctly with proxy context
            instead of a usage score.
          </p>
          <div className="glass p-4 sm:p-6 rounded-2xl">
            <WorldChoropleth />
          </div>
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
              Not in usage index
            </span>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-5">
            <p className="text-sm text-zinc-400 leading-relaxed">
              Claude.ai is{" "}
              <span className="text-zinc-200 font-medium">unavailable in mainland China</span>,
              so it does not appear in the per-capita usage index. The figures below are
              third-party proxy metrics for broader domestic AI adoption — each uses a different
              measurement approach and denominator, and they are{" "}
              <span className="text-zinc-200 font-medium">not merged into the index</span>.
            </p>

            {/* Proxy stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl px-4 py-3 bg-zinc-900/50 border border-amber-500/10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                  CNNIC · Jun 2025
                </p>
                <p className="text-2xl font-extrabold text-amber-300 tabular-nums">
                  {cnnicUsers}
                </p>
                <p className="text-xs text-zinc-400 mt-1">Generative-AI users</p>
              </div>
              <div className="rounded-xl px-4 py-3 bg-zinc-900/50 border border-amber-500/10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                  QuestMobile · H1 2025
                </p>
                <p className="text-2xl font-extrabold text-amber-300 tabular-nums">
                  {questMau}
                </p>
                <p className="text-xs text-zinc-400 mt-1">Mobile-AI MAU</p>
              </div>
              <div className="rounded-xl px-4 py-3 bg-zinc-900/50 border border-amber-500/10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                  Doubao (QuestMobile) · Dec 2025
                </p>
                <p className="text-2xl font-extrabold text-amber-300 tabular-nums">
                  {doubaoMau}
                </p>
                <p className="text-xs text-zinc-400 mt-1">App MAU</p>
              </div>
            </div>

            {/* Caveat */}
            <p className="text-xs text-zinc-500 leading-relaxed">
              These proxies use different measurement methods (government survey, app-market scan,
              product MAU) and cannot be summed or directly compared to each other or to the
              Anthropic usage index. See the{" "}
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

      {/* ─── TOP 12 RANKED LIST ──────────────────────────────────────────── */}
      <Reveal delay={120}>
        <div>
          <h2 className="text-xl font-bold text-gradient mb-2">
            Top Countries by AI Adoption
          </h2>
          <p className="text-xs text-zinc-500 mb-4">
            Ranked by usage index (per-capita Claude.ai usage, normalised). Countries with
            zero recorded usage or unreported Claude.ai metrics are excluded.
          </p>
          <hr className="divider-glow mb-6" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {top12.map((country, i) => {
              const barWidth = ((country.usageIndex ?? 0) / maxIndex) * 100;
              const pct =
                country.usagePct !== null
                  ? `${(country.usagePct * 100).toFixed(2)}%`
                  : "—";

              return (
                <Reveal key={country.iso3} delay={i * 40}>
                  <div className="glass glass-hover p-4 rounded-xl relative overflow-hidden">
                    {/* Rank badge */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                          style={{
                            background:
                              i === 0
                                ? "linear-gradient(135deg,#8b5cf6,#22d3ee)"
                                : "rgba(255,255,255,0.06)",
                            color: i === 0 ? "#fff" : "#a1a1aa",
                          }}
                          aria-label={`Rank ${i + 1}`}
                        >
                          {i + 1}
                        </span>
                        <span className="font-semibold text-white text-sm">
                          {country.name}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 font-mono tabular-nums">
                        {(country.usageIndex ?? 0).toFixed(3)}
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div
                      className="h-1.5 rounded-full bg-zinc-800 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={Math.round(barWidth)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${country.name} usage index relative to top country`}
                    >
                      <div
                        className="h-full rounded-full brand-grad"
                        style={{ width: `${barWidth.toFixed(1)}%` }}
                      />
                    </div>

                    {/* Secondary stats */}
                    <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                      <span>
                        Share of global usage:{" "}
                        <span className="text-zinc-300">{pct}</span>
                      </span>
                      {country.usageCount !== null && (
                        <span>
                          Interactions:{" "}
                          <span className="text-zinc-300">
                            {country.usageCount.toLocaleString()}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Reveal>

      <hr className="divider-glow" />

      {/* ─── METHODOLOGY NOTE ────────────────────────────────────────────── */}
      <Reveal delay={0}>
        <div
          className="glass px-5 py-4 rounded-xl text-sm text-zinc-400 max-w-3xl space-y-2"
          role="note"
          aria-label="Methodology"
        >
          <p className="font-semibold text-zinc-200">Methodology</p>
          <p>
            Usage index = observed Claude.ai interactions per working-age capita,
            normalised across all countries. Source:{" "}
            <span className="text-zinc-300">
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
