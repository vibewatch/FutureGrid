import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { getCountryExposure } from "@/lib/data";
// CountryExposureChart is a client island authored by a teammate
import CountryExposureChart from "@/components/charts/CountryExposureChart";

export const metadata = {
  title: "Global AI Adoption — FutureGrid",
  description:
    "Per-country AI (Claude.ai) usage from the Anthropic Economic Index (Aug 2025). See which nations lead in real-world AI adoption.",
};

export default function GlobalPage() {
  const allCountries = getCountryExposure();
  const china = allCountries.find((country) => country.iso3 === "CHN");

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

      {/* ─── CHINA COVERAGE ──────────────────────────────────────────────── */}
      {china && (
        <Reveal delay={90}>
          <div className="glass px-5 py-4 rounded-xl max-w-3xl border border-zinc-800/80">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">
                  Supplemental country coverage
                </p>
                <h2 className="text-lg font-semibold text-white">China</h2>
                <p className="text-sm text-zinc-400 mt-1">
                  Anthropic does not report mainland China Claude.ai usage metrics in this snapshot,
                  so usage index, global share, and interaction count are shown as unavailable.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:min-w-[300px]">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Usage index</p>
                  <p className="text-sm font-semibold text-zinc-300 mt-1">Not reported</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest">GDP / worker</p>
                  <p className="text-sm font-semibold text-cyan-300 mt-1">
                    {china.gdpPerWorkingAgeCapita != null
                      ? `$${Math.round(china.gdpPerWorkingAgeCapita).toLocaleString()}`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
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
