"use client";

import dynamic from "next/dynamic";
import Reveal from "@/components/ui/Reveal";
import { useT } from "@/lib/i18n/useT";
import DataAsOfBadge from "@/components/ui/DataAsOfBadge";
import {
  getAIFrontierData,
  getComputeModels,
  getCountryLeaderboard,
  getCostTrend,
  getPowerTrend,
  formatFlop,
} from "@/lib/ai-frontier";

// ── Loading stub ──────────────────────────────────────────────────────────────

function LoadingStub() {
  const t = useT("frontier");
  return (
    <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-10 flex items-center justify-center text-zinc-500 dark:text-zinc-400 text-sm">
      {t("loading")}
    </div>
  );
}

// ── Dynamic imports (ssr:false — charts use canvas/D3/window) ─────────────────

const ComputeTimelineChart = dynamic(
  () => import("@/components/frontier/ComputeTimelineChart"),
  { ssr: false, loading: () => <LoadingStub /> },
);

const FrontierLeadersChart = dynamic(
  () => import("@/components/frontier/FrontierLeadersChart"),
  { ssr: false, loading: () => <LoadingStub /> },
);

const CostPowerTrends = dynamic(
  () => import("@/components/frontier/CostPowerTrends"),
  { ssr: false, loading: () => <LoadingStub /> },
);

const FrontierMixCards = dynamic(
  () => import("@/components/frontier/FrontierMixCards"),
  { ssr: false, loading: () => <LoadingStub /> },
);

const FrontierOriginsTreemap = dynamic(
  () => import("@/components/frontier/FrontierOriginsTreemap"),
  { loading: () => <LoadingStub /> },
);

// ── Cost/power formatters (mirrors CostPowerTrends.tsx) ──────────────────────

function fmtUsd(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

function fmtWatt(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} GW`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} MW`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)} kW`;
  return `${Math.round(v)} W`;
}

// ── Decorative hero sparkline (violet; purely ornamental) ────────────────────

function Sparkline({ series }: { series: number[] }) {
  // Guard: never render a broken/empty sparkline.
  if (!series || series.length < 2) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) return null;

  const w = 96;
  const h = 26;
  const pad = 2;
  const n = series.length;
  const points = series.map((v, i) => {
    const x = (i / (n - 1)) * (w - pad * 2) + pad;
    const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-1 w-24 h-6 text-violet-500 dark:text-violet-400"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polygon points={area} fill="rgba(139,92,246,0.12)" stroke="none" />
      <polyline
        points={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
  spark,
  sparkHint,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "violet" | "amber" | "green" | "rose";
  spark?: number[];
  sparkHint?: string;
}) {
  const accentClass =
    accent === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : accent === "green"
        ? "text-green-600 dark:text-green-400"
        : accent === "rose"
          ? "text-rose-600 dark:text-rose-400"
          : "text-violet-600 dark:text-violet-400";

  const hasSpark = Array.isArray(spark) && spark.length >= 2;

  return (
    <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">
        {label}
      </p>
      <p className={`text-2xl font-bold tabular-nums leading-tight ${accentClass}`}>
        {value}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-snug">{sub}</p>
      {hasSpark && (
        <>
          <Sparkline series={spark as number[]} />
          {sparkHint && <span className="sr-only">{sparkHint}</span>}
        </>
      )}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title,
  subhead,
  children,
  delay = 0,
}: {
  title: string;
  subhead?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Reveal delay={delay}>
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {title}
          </h2>
          {subhead && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1 max-w-3xl leading-relaxed">
              {subhead}
            </p>
          )}
        </div>
        {children}
      </section>
    </Reveal>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export default function AIFrontierView() {
  const t = useT("frontier");
  const data = getAIFrontierData();
  const { source, caveats, counts, aggregates } = data;
  const regression = aggregates.computeTrend.modernEra;
  const computeModels = getComputeModels();
  const largest =
    computeModels.length > 0
      ? computeModels.reduce((a, b) => (b.computeFlop > a.computeFlop ? b : a))
      : null;
  const countryLeaderboard = getCountryLeaderboard();
  const top = countryLeaderboard[0] ?? null;

  // ── Peak cost / power for whyPoint3 interpolation ─────────────────────────
  const costTrend = getCostTrend();
  const powerTrend = getPowerTrend();
  const maxCostRaw = costTrend.reduce(
    (m, d) => (Number.isFinite(d.maxCostUsd2023) && d.maxCostUsd2023 > m ? d.maxCostUsd2023 : m),
    0,
  );
  const maxPowerRaw = powerTrend.reduce(
    (m, d) => (Number.isFinite(d.maxPowerW) && d.maxPowerW > m ? d.maxPowerW : m),
    0,
  );
  const peakCost = maxCostRaw > 0 ? fmtUsd(maxCostRaw) : "—";
  const peakPower = maxPowerRaw > 0 ? fmtWatt(maxPowerRaw) : "—";

  // ── Decorative sparkline series (real selectors only; no fabrication) ─────
  // Compute-frontier over time: per-year highest reported training compute.
  const computeSpark = aggregates.computeTrend.frontierByYear
    .map((p) => p.maxLog10Compute)
    .filter((v) => Number.isFinite(v));
  // Peak training cost over time (2023 USD) for the compute-known subset.
  const costSpark = costTrend
    .map((d) => d.maxCostUsd2023)
    .filter((v) => Number.isFinite(v) && v > 0);
  const sparkHint = t("statSparklineSrHint");

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-10">
      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <Reveal>
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-500/25">
              {t("pageBadge")}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gradient">
            {t("pageTitle")}
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-2xl leading-relaxed">
            {t("pageSubhead")}
          </p>
          <div className="mt-3">
            <DataAsOfBadge datasetId="ai-frontier" />
          </div>
        </div>
      </Reveal>

      {/* ── Headline stat cards ────────────────────────────────────────────── */}
      <Reveal delay={80}>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label={t("statDoublingLabel")}
            value={
              regression?.doublingTimeMonths != null
                ? `~${regression.doublingTimeMonths.toFixed(1)} months`
                : "—"
            }
            sub={t("statDoublingSub", {
              modernEraStart: String(data.methodology.modernEraStart),
              r2: regression?.r2.toFixed(2) ?? "—",
            })}
            accent="violet"
            spark={computeSpark}
            sparkHint={sparkHint}
          />
          <StatCard
            label={t("statModelsLabel")}
            value={String(counts.withCompute)}
            sub={t("statModelsSub")}
            accent="violet"
          />
          <StatCard
            label={t("statFrontierLabel")}
            value={top?.countryShort ?? "—"}
            sub={
              top
                ? `${top.recentCount} recent tracked · ${top.modelCount} total dated`
                : "—"
            }
            accent="amber"
          />
          <StatCard
            label={t("statLargestLabel")}
            value={largest ? formatFlop(largest.computeFlop) : "—"}
            sub={
              largest
                ? `${largest.name} · ${largest.organization} · ${largest.year}`
                : "—"
            }
            accent="amber"
            spark={costSpark}
            sparkHint={sparkHint}
          />
        </div>
      </Reveal>

      {/* ── Compute Timeline ──────────────────────────────────────────────── */}
      <Section
        title={t("timelineSectionTitle")}
        subhead={t("timelineSectionSubhead")}
        delay={100}
      >
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <ComputeTimelineChart />
          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500 leading-relaxed">
            {t("timelineAnnotationFull", {
              doublingTime: regression?.doublingTimeMonths?.toFixed(1) ?? "—",
              r2: regression?.r2.toFixed(2) ?? "—",
              n: String(regression?.n ?? "—"),
            })}
          </p>
        </div>
      </Section>

      {/* ── Where Tracked Models Are Developed (share/concentration treemap) ─ */}
      <Section
        title={t("originsSectionTitle")}
        subhead={t("originsSectionSubhead")}
        delay={110}
      >
        <FrontierOriginsTreemap />
      </Section>

      {/* ── Frontier Leaders ─────────────────────────────────────────────── */}
      <Section
        title={t("leadersSectionTitle")}
        subhead={t("leadersSectionSubhead")}
        delay={120}
      >
        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
          <FrontierLeadersChart />
        </div>
      </Section>

      {/* ── Cost & Power Trends ───────────────────────────────────────────── */}
      <Section
        title={t("costPowerSectionTitle")}
        subhead={t("costPowerSectionSubhead")}
        delay={140}
      >
        <CostPowerTrends />
      </Section>

      {/* ── Model Landscape (Mix Cards) ───────────────────────────────────── */}
      <Section title={t("mixSectionTitle")} delay={160}>
        <FrontierMixCards />
      </Section>

      {/* ── Why It Matters ────────────────────────────────────────────────── */}
      <Reveal delay={180}>
        <section
          className="rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50/60 dark:bg-violet-500/5 p-6 space-y-5"
          aria-labelledby="why-matters-heading"
        >
          <h2
            id="why-matters-heading"
            className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white"
          >
            {t("whyTitle")}
          </h2>
          <p className="text-sm text-zinc-700 dark:text-zinc-300 max-w-3xl leading-relaxed">
            {t("whyBody", {
              doublingTime: regression?.doublingTimeMonths?.toFixed(1) ?? "—",
            })}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {(
              [
                ["whyPoint1Title", "whyPoint1", "violet"],
                ["whyPoint2Title", "whyPoint2", "amber"],
                ["whyPoint3Title", "whyPoint3", "rose"],
              ] as const
            ).map(([titleKey, bodyKey, color]) => (
              <div
                key={titleKey}
                className={`rounded-lg border p-4 space-y-1.5 ${
                  color === "amber"
                    ? "border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5"
                    : color === "rose"
                      ? "border-rose-200 dark:border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5"
                      : "border-violet-200 dark:border-violet-500/20 bg-white/50 dark:bg-zinc-900/30"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    color === "amber"
                      ? "text-amber-700 dark:text-amber-400"
                      : color === "rose"
                        ? "text-rose-700 dark:text-rose-400"
                        : "text-violet-700 dark:text-violet-400"
                  }`}
                >
                  {t(titleKey)}
                </p>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {bodyKey === "whyPoint3"
                    ? t(bodyKey, { peakCost, peakPower })
                    : t(bodyKey)}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ── Data Attribution ──────────────────────────────────────────────── */}
      <Reveal delay={200}>
        <section
          className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4"
          aria-labelledby="attribution-heading"
        >
          <h2
            id="attribution-heading"
            className="text-base font-semibold text-zinc-800 dark:text-zinc-100"
          >
            {t("attributionSectionTitle")}
          </h2>

          {/* Source details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">
                {source.name}
              </p>
              <p className="text-zinc-700 dark:text-zinc-300">
                <span className="text-zinc-500">{t("attributionPublisher")}: </span>
                {source.publisher}
              </p>
              <p className="text-zinc-700 dark:text-zinc-300">
                <span className="text-zinc-500">{t("attributionLicense")}: </span>
                {source.license.startsWith("CC") ? (
                  <a
                    href="https://creativecommons.org/licenses/by/4.0/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-green-600 dark:text-green-400 text-xs bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded px-1.5 py-0.5 hover:underline"
                  >
                    {source.license}
                  </a>
                ) : (
                  <span className="font-mono text-green-600 dark:text-green-400 text-xs bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded px-1.5 py-0.5">
                    {source.license}
                  </span>
                )}
              </p>
              <p className="text-zinc-700 dark:text-zinc-300">
                <span className="text-zinc-500">{t("attributionAccessed")}: </span>
                {source.accessed}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-violet-600 dark:text-violet-400 hover:underline font-medium"
              >
                {source.name} ↗
              </a>
              <a
                href={source.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:underline"
              >
                {t("attributionDownload")} ↗
              </a>
              <p className="text-xs text-zinc-500 dark:text-zinc-500 italic">
                {regression != null &&
                  `r²=${regression.r2.toFixed(2)} · n=${regression.n} · `}
                {counts.countries}{" "}
                {t("countries")}
              </p>
            </div>
          </div>

          {/* Caveats */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3 space-y-1.5">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-500 uppercase tracking-wide">
              {t("attributionCaveatsTitle")}
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li className="text-xs text-zinc-500 dark:text-zinc-500 leading-snug">
                {source.caveat}
              </li>
              {caveats.map((caveat) => (
                <li
                  key={caveat}
                  className="text-xs text-zinc-500 dark:text-zinc-500 leading-snug"
                >
                  {caveat}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
