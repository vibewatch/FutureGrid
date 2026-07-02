"use client";

import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import CountryExposureChart from "@/components/charts/CountryExposureChart";
import WorldChoroplethInteractive from "@/components/charts/WorldChoroplethInteractive";
import CountryDetailPanel, {
  type EnrichedCountry,
} from "@/components/dashboard/CountryDetailPanel";
import AIAdoptionSignals from "@/components/global/AIAdoptionSignals";
import { useT } from "@/lib/i18n/useT";
import type { AdoptionSignalsDataset } from "@/lib/adoption-signals";
import type { DiffusionRiser } from "@/lib/data";

// ─── Tiny 3-point sparkline (pure SVG, no animation, reduced-motion safe) ─────
function Sparkline3({ h1, h2, q1 }: { h1: number; h2: number; q1: number }) {
  const W = 60,
    H = 24;
  const vals = [h1, h2, q1];
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const span = maxV - minV || 0.1;
  const px = (i: number) => (((i / 2) * (W - 8)) + 4).toFixed(1);
  const py = (v: number) =>
    (H - 4 - ((v - minV) / span) * (H - 8)).toFixed(1);
  const pts = `${px(0)},${py(vals[0])} ${px(1)},${py(vals[1])} ${px(2)},${py(vals[2])}`;
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
    >
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

export interface DiffusionLeader {
  iso3: string;
  name: string;
  diffusionPct: number | null;
}

export interface DiffusionRiserWithH2 extends DiffusionRiser {
  h2: number | null;
}

export interface GlobalViewProps {
  totalCovered: number;
  rankedLength: number;
  topIndex: number;
  topCountryName: string;
  cnnicUsers: string;
  questMau: string;
  doubaoMau: string;
  chinaDiffusion: number;
  diffusionLeaders: DiffusionLeader[];
  diffusionRisers: DiffusionRiserWithH2[];
  enrichedCountries: EnrichedCountry[];
  top12: EnrichedCountry[];
  maxIndex: number;
  adoptionSignals: AdoptionSignalsDataset;
}

export default function GlobalView({
  totalCovered,
  rankedLength,
  topIndex,
  topCountryName,
  cnnicUsers,
  questMau,
  doubaoMau,
  chinaDiffusion,
  diffusionLeaders,
  diffusionRisers,
  enrichedCountries,
  top12,
  maxIndex,
  adoptionSignals,
}: GlobalViewProps) {
  const t = useT("global");

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-12">
      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-4 pb-6">
        <Reveal>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1]">
            <span className="text-gradient">{t("heroHeadline1")}</span>
            <br />
            <span className="text-zinc-900 dark:text-white">
              {t("heroHeadline2")}
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
            {t("heroIntroBefore")}{" "}
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">
              {t("heroIntroHighlight1")}
            </span>{" "}
            {t("heroIntroMid")}{" "}
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">
              {t("heroIntroHighlight2")}
            </span>{" "}
            {t("heroIntroAfter")}
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
                {t("statCountriesLabel")}
              </p>
            </div>
            <div
              className="hidden sm:block w-px h-10 bg-zinc-300 dark:bg-zinc-800"
              aria-hidden="true"
            />
            <div>
              <AnimatedCounter
                value={rankedLength}
                durationMs={1400}
                className="text-4xl sm:text-5xl font-extrabold text-gradient tabular-nums"
              />
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
                {t("statMeasurableLabel")}
              </p>
            </div>
            <div
              className="hidden sm:block w-px h-10 bg-zinc-300 dark:bg-zinc-800"
              aria-hidden="true"
            />
            <div>
              <AnimatedCounter
                value={topIndex}
                decimals={2}
                durationMs={1600}
                className="text-4xl sm:text-5xl font-extrabold text-gradient tabular-nums"
              />
              <p className="text-xs text-zinc-500 mt-1 uppercase tracking-widest">
                {t("statTopIndexLabel", { name: topCountryName })}
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
            {t("worldMapHeading")}
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 max-w-2xl leading-relaxed">
            {t("mapIntroBefore")}{" "}
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">
              {t("mapHighlight1")}
            </span>{" "}
            {t("mapIntroMid1")}{" "}
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">
              {t("mapHighlight2")}
            </span>{" "}
            {t("mapIntroMid2")}{" "}
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">
              {t("mapHighlight3")}
            </span>
            {t("mapIntroAfter")}{" "}
            <Link
              href="/sources"
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              {t("mapSourcesLink")}
            </Link>
            .
          </p>
          <div className="glass p-4 sm:p-6 rounded-2xl">
            <p className="mb-3 text-[11px] text-zinc-500 leading-relaxed">
              {t("mapDemandSourceNote")}
            </p>
            <WorldChoroplethInteractive />
          </div>

          {/* GenAI diffusion leaders */}
          {diffusionLeaders.length > 0 && (
            <div className="mt-5" aria-label="Top GenAI diffusion countries">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">
                {t("diffusionLeadersLabel")}
              </p>
              <div className="flex flex-wrap gap-2">
                {diffusionLeaders.map((c) => (
                  <div
                    key={c.iso3}
                    className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-white/80 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-700/40 text-sm"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {c.name}
                    </span>
                    <span className="text-violet-400 font-bold tabular-nums">
                      {c.diffusionPct?.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-600 mt-1.5">
                {t("diffusionLeadersCaption")}
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
            <span aria-hidden="true" className="text-lg">
              🇨🇳
            </span>
            <h2 className="text-base font-semibold text-amber-200">
              {t("chinaTitle")}
            </h2>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {t("chinaLayerBadge")}
            </span>
          </div>

          {/* Body */}
          <div className="px-5 py-5 space-y-5">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {t("chinaIntroBefore")}{" "}
              <span className="text-zinc-700 dark:text-zinc-200 font-medium">
                {t("chinaUnavailable")}
              </span>
              {t("chinaIntroMid1")}{" "}
              <span className="text-zinc-700 dark:text-zinc-200 font-medium">
                {t("chinaIntroHighlight2")}
              </span>
              {t("chinaIntroMid2")}{" "}
              <span className="text-amber-300 font-bold">
                ~{chinaDiffusion.toFixed(1)}%
              </span>{" "}
              {t("chinaIntroMid3")}{" "}
              <span className="text-zinc-700 dark:text-zinc-200 font-medium">
                {t("chinaNotMerged")}
              </span>
              .
            </p>

            {/* Proxy stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl px-4 py-3 bg-white/70 dark:bg-zinc-900/50 border border-amber-500/10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                  {t("cnnicLabel")}
                </p>
                <p className="text-2xl font-extrabold text-amber-300 tabular-nums">
                  {cnnicUsers}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {t("cnnicDesc")}
                </p>
              </div>
              <div className="rounded-xl px-4 py-3 bg-white/70 dark:bg-zinc-900/50 border border-amber-500/10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                  {t("questLabel")}
                </p>
                <p className="text-2xl font-extrabold text-amber-300 tabular-nums">
                  {questMau}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {t("questDesc")}
                </p>
              </div>
              <div className="rounded-xl px-4 py-3 bg-white/70 dark:bg-zinc-900/50 border border-amber-500/10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                  {t("doubaoLabel")}
                </p>
                <p className="text-2xl font-extrabold text-amber-300 tabular-nums">
                  {doubaoMau}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {t("doubaoDesc")}
                </p>
              </div>
              <div className="rounded-xl px-4 py-3 bg-white/70 dark:bg-zinc-900/50 border border-violet-500/10">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">
                  {t("aieiLabel")}
                </p>
                <p className="text-2xl font-extrabold text-violet-300 tabular-nums">
                  ~{chinaDiffusion.toFixed(1)}%
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {t("aieiDesc")}
                </p>
              </div>
            </div>

            {/* Caveat */}
            <p className="text-xs text-zinc-500 leading-relaxed">
              {t("chinaCaveatPart1")}{" "}
              <span className="text-zinc-600 dark:text-zinc-400">
                The{" "}
                <code className="text-zinc-700 dark:text-zinc-300">
                  usageIndex
                </code>{" "}
                (Claude.ai interactions per working-age capita) and{" "}
                <code className="text-zinc-700 dark:text-zinc-300">
                  diffusionPct
                </code>{" "}
                (Microsoft AIEI survey %) {t("chinaCaveatMid")}
              </span>{" "}
              {t("chinaCaveatSee")}{" "}
              <Link
                href="/sources"
                className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
              >
                {t("mapSourcesLink")}
              </Link>{" "}
              {t("chinaCaveatPage")}
            </p>
          </div>
        </div>
      </Reveal>

      <hr className="divider-glow" />

      {/* ─── AI ADOPTION SIGNALS ───────────────────────────────────────────── */}
      <Reveal delay={100}>
        <AIAdoptionSignals dataset={adoptionSignals} />
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
                {t("risersHeading")}
              </h2>
              <Link
                href="/sources"
                className="text-xs text-zinc-500 hover:text-violet-400 underline underline-offset-2 transition-colors shrink-0"
              >
                {t("risersSourceLink")}
              </Link>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5 max-w-2xl leading-relaxed">
              {t("risersIntroBefore")}{" "}
              <span className="text-zinc-700 dark:text-zinc-200 font-medium">
                {t("risersIntroHighlight")}
              </span>
              .{" "}
              {t("risersIntroAfter")}{" "}
              <Link
                href="/sources"
                className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
              >
                {t("risersFullDetailsLink")}
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
              {t("risersCaption")}{" "}
              <Link
                href="/sources"
                className="text-zinc-500 hover:text-zinc-400 transition-colors underline underline-offset-2"
              >
                {t("risersCaptionSeeLink")}
              </Link>{" "}
              {t("risersCaptionAfter")}
            </p>
          </section>
        </Reveal>
      )}

      <hr className="divider-glow" />

      {/* ─── CHART PANEL ─────────────────────────────────────────────────── */}
      <Reveal delay={80}>
        <div>
          <h2 className="text-xl font-bold text-gradient mb-2">
            {t("chartHeading")}
          </h2>
          <p className="text-xs text-zinc-500 mb-4">{t("chartCaption")}</p>
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
          <p className="font-semibold text-zinc-700 dark:text-zinc-200">
            {t("methodologyLabel")}
          </p>
          <p>{t("methodologyText")}</p>
          <p>
            {t("methodologySourceBefore")}{" "}
            <Link
              href="/sources"
              className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
            >
              {t("methodologySourceLink")}
            </Link>{" "}
            {t("methodologySourceAfter")}
          </p>
        </div>
      </Reveal>
    </div>
  );
}
