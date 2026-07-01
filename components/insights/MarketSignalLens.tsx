"use client";

import { useMemo, useState, useId } from "react";
import {
  getMarketSignalData,
  getMarketSignalSource,
  getMarketSignalSectors,
  getMarketSignalSummary,
  getTopMarketSignalSectors,
} from "@/lib/market-signals";
import { useT } from "@/lib/i18n/useT";

type Dict = Record<string, unknown>;
type Tone = "high" | "medium" | "low";

type DraftMarketSector = {
  key: string;
  name: string;
  ticker: string;
  employment: number;
  exposure: number;
  totalReturn: number | null;
  excessReturn: number;
  volatility: number | null;
  drawdown: number | null;
  rawScore: number | null;
  rawClassification: string | null;
};

type MarketSector = Omit<DraftMarketSector, "rawScore" | "rawClassification"> & {
  sensitivityScore: number;
  classification: Tone;
};

type SourceMeta = {
  provider: string;
  benchmark: string;
  start: string;
  end: string;
};

const FALLBACK_START = "2022-11-30";
const FALLBACK_PROVIDER = "Yahoo Finance chart JSON";
const FALLBACK_BENCHMARK = "SPY";
const CHART_WIDTH = 820;
const CHART_HEIGHT = 450;
const MARGIN = { top: 34, right: 30, bottom: 64, left: 74 };
const INNER_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const INNER_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

const TONE_FILL: Record<Tone, string> = {
  high: "#a855f7",
  medium: "#f59e0b",
  low: "#22d3ee",
};

const TONE_CLASSES: Record<Tone, string> = {
  high: "border-violet-400/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  medium: "border-amber-400/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  low: "border-cyan-400/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
};

const FIELD_ALIASES = {
  name: ["sector", "sectorName", "name", "displayName", "industry"],
  ticker: ["etf", "etfTicker", "ticker", "symbol", "proxyTicker", "marketProxy"],
  employment: ["mappedEmployment", "employment", "employmentMapped", "weightedEmployment", "sectorEmployment"],
  exposure: ["employmentWeightedAIExposure", "employmentWeightedExposure", "weightedExposure", "aiExposure", "exposure", "avgExposure", "averageExposure"],
  totalReturn: ["etfReturn", "totalReturn", "return", "returnSinceStart", "sectorReturn", "priceReturn"],
  excessReturn: ["excessReturnVsSPY", "excessReturnVsSpy", "excessReturn", "relativeReturn", "benchmarkExcessReturn"],
  volatility: ["volatility", "annualizedVolatility", "realizedVolatility", "returnVolatility"],
  drawdown: ["maxDrawdown", "drawdown", "maximumDrawdown", "realizedDrawdown"],
  score: ["marketAISensitivityScore", "marketAiSensitivityScore", "sensitivityScore", "aiSensitivityScore", "score"],
  classification: ["classification", "sensitivityClass", "sensitivityClassification", "class", "bucket"],
  benchmark: ["benchmark", "benchmarkTicker", "benchmarkSymbol"],
  provider: ["provider", "name", "source", "sourceName", "priceSource"],
  start: ["startDate", "since", "from", "windowStart"],
  end: ["endDate", "latestDate", "asOf", "to", "windowEnd", "lastDate"],
};

function isDict(value: unknown): value is Dict {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function candidateContainers(source: unknown): Dict[] {
  if (!isDict(source)) return [];
  return [source, source.metrics, source.marketMetrics, source.priceMetrics, source.sensitivity, source.scoreComponents].filter(isDict);
}

function pickValue(source: unknown, aliases: string[]): unknown {
  for (const container of candidateContainers(source)) {
    for (const alias of aliases) {
      if (alias in container) return container[alias];
    }
    const entries = Object.entries(container);
    for (const alias of aliases) {
      const needle = normalizedKey(alias);
      const found = entries.find(([key]) => normalizedKey(key) === needle);
      if (found) return found[1];
    }
  }
  return undefined;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/[%,_$]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function pickNumber(source: unknown, aliases: string[]): number | null {
  return parseNumber(pickValue(source, aliases));
}

function pickString(source: unknown, aliases: string[]): string | null {
  const value = pickValue(source, aliases);
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function toPercent(value: number | null): number | null {
  if (value == null) return null;
  const percent = Math.abs(value) <= 1.5 ? value * 100 : value;
  return round1(percent);
}

function toScore(value: number | null): number | null {
  if (value == null) return null;
  return round1(clamp(value, 0, 100));
}

function arrayFrom(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!isDict(value)) return [];
  for (const key of ["sectors", "sectorSignals", "signals", "points", "rows", "items", "data"]) {
    const nested = value[key];
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

function safeCall<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch {
    return null;
  }
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeValue(value: number, values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0.5;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (max === min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function normalizeTone(classification: string | null, score: number): Tone {
  const text = classification?.toLowerCase() ?? "";
  if (/high|strong|elevated|higher/.test(text)) return "high";
  if (/medium|moderate|mixed|middle/.test(text)) return "medium";
  if (/low|muted|lower|limited/.test(text)) return "low";
  if (score >= 66) return "high";
  if (score >= 33) return "medium";
  return "low";
}

function normalizeRow(row: unknown, index: number): DraftMarketSector | null {
  if (!isDict(row)) return null;
  const ticker = pickString(row, FIELD_ALIASES.ticker) ?? "";
  const name = pickString(row, FIELD_ALIASES.name) ?? (ticker || `Sector ${index + 1}`);
  const exposure = toPercent(pickNumber(row, FIELD_ALIASES.exposure));
  const excessReturn = toPercent(pickNumber(row, FIELD_ALIASES.excessReturn));
  if (exposure == null || excessReturn == null) return null;

  const rawDrawdown = toPercent(pickNumber(row, FIELD_ALIASES.drawdown));
  return {
    key: `${normalizedKey(name)}-${ticker || index}`,
    name,
    ticker,
    employment: Math.max(0, pickNumber(row, FIELD_ALIASES.employment) ?? 0),
    exposure: clamp(exposure, 0, 100),
    totalReturn: toPercent(pickNumber(row, FIELD_ALIASES.totalReturn)),
    excessReturn,
    volatility: toPercent(pickNumber(row, FIELD_ALIASES.volatility)),
    drawdown: rawDrawdown == null ? null : rawDrawdown > 0 ? -rawDrawdown : rawDrawdown,
    rawScore: toScore(pickNumber(row, FIELD_ALIASES.score)),
    rawClassification: pickString(row, FIELD_ALIASES.classification),
  };
}

function finalizeRows(rows: DraftMarketSector[]): MarketSector[] {
  const byKey = new Map<string, DraftMarketSector>();
  for (const row of rows) {
    if (!byKey.has(row.key)) byKey.set(row.key, row);
  }
  const uniqueRows = Array.from(byKey.values());
  const excessValues = uniqueRows.map((row) => row.excessReturn);

  return uniqueRows.map((row) => {
    const inferredScore = round1((row.exposure / 100) * 35 + normalizeValue(row.excessReturn, excessValues) * 65);
    const sensitivityScore = row.rawScore ?? inferredScore;
    return {
      ...row,
      sensitivityScore,
      classification: normalizeTone(row.rawClassification, sensitivityScore),
    };
  });
}

function buildRows(...values: unknown[]): MarketSector[] {
  const drafts = values
    .flatMap(arrayFrom)
    .map((row, index) => normalizeRow(row, index))
    .filter((row): row is DraftMarketSector => row != null);
  return finalizeRows(drafts);
}

function median(values: number[]): number {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (finite.length === 0) return 50;
  const mid = Math.floor(finite.length / 2);
  return finite.length % 2 ? finite[mid] : (finite[mid - 1] + finite[mid]) / 2;
}

function formatPct(value: number | null, signed = false): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatEmployment(value: number): string {
  if (!value) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000).toLocaleString()}K`;
  return value.toLocaleString();
}

function formatDate(value: string): string {
  return value || "—";
}

function buildSourceMeta(source: unknown, summary: unknown, data: unknown): SourceMeta {
  const benchmarkRecord = isDict(data) ? data.benchmark : null;
  const methodologyRecord = isDict(data) ? data.methodology : null;
  const provider = pickString(source, FIELD_ALIASES.provider) ?? (typeof source === "string" && source.trim() ? source.trim() : FALLBACK_PROVIDER);
  const benchmark = pickString(source, FIELD_ALIASES.benchmark) ?? pickString(summary, FIELD_ALIASES.benchmark) ?? pickString(benchmarkRecord, ["ticker", "symbol", "id", "name"]) ?? pickString(methodologyRecord, FIELD_ALIASES.benchmark) ?? pickString(data, FIELD_ALIASES.benchmark) ?? FALLBACK_BENCHMARK;
  const start = pickString(source, FIELD_ALIASES.start) ?? pickString(summary, FIELD_ALIASES.start) ?? pickString(methodologyRecord, FIELD_ALIASES.start) ?? pickString(data, FIELD_ALIASES.start) ?? FALLBACK_START;
  const end = pickString(source, FIELD_ALIASES.end) ?? pickString(summary, FIELD_ALIASES.end) ?? pickString(methodologyRecord, FIELD_ALIASES.end) ?? pickString(data, FIELD_ALIASES.end) ?? "latest";
  return { provider, benchmark, start, end };
}

function classLabel(t: ReturnType<typeof useT>, tone: Tone): string {
  return tone === "high" ? t("marketSignalClassHigh") : tone === "medium" ? t("marketSignalClassMedium") : t("marketSignalClassLow");
}

function pointLabel(point: MarketSector, t: ReturnType<typeof useT>, benchmark: string): string {
  return `${point.name}${point.ticker ? ` (${point.ticker})` : ""}: ${t("marketSignalXAxis")} ${formatPct(point.exposure)}, ${t("marketSignalYAxis", { benchmark })} ${formatPct(point.excessReturn, true)}, ${t("marketSignalMappedEmployment")} ${formatEmployment(point.employment)}, ${t("marketSignalScoreHeader")} ${point.sensitivityScore.toFixed(1)}.`;
}

export default function MarketSignalLens() {
  const t = useT("analysis");
  const chartId = useId();
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const rawData = useMemo(() => safeCall(() => getMarketSignalData()), []);
  const rawSectors = useMemo(() => safeCall(() => getMarketSignalSectors()), []);
  const rawTop = useMemo(() => safeCall(() => getTopMarketSignalSectors(10)), []);
  const rawSummary = useMemo(() => safeCall(() => getMarketSignalSummary()), []);
  const rawSource = useMemo(() => safeCall(() => getMarketSignalSource()), []);

  const sectors = useMemo(() => buildRows(rawSectors, rawData), [rawData, rawSectors]);
  const ranked = useMemo(() => {
    const topRows = buildRows(rawTop);
    return (topRows.length ? topRows : [...sectors].sort((a, b) => b.sensitivityScore - a.sensitivityScore)).slice(0, 10);
  }, [rawTop, sectors]);
  const source = useMemo(() => buildSourceMeta(rawSource, rawSummary, rawData), [rawData, rawSource, rawSummary]);

  const active = sectors.find((sector) => sector.key === activeKey) ?? ranked[0] ?? sectors[0] ?? null;
  const avgExcess = sectors.length ? sectors.reduce((sum, sector) => sum + sector.excessReturn, 0) / sectors.length : null;
  const xMid = median(sectors.map((sector) => sector.exposure));
  const yExtent = sectors.reduce(
    (extent, sector) => [Math.min(extent[0], sector.excessReturn), Math.max(extent[1], sector.excessReturn)] as [number, number],
    [0, 0] as [number, number],
  );
  const yPad = Math.max(4, (yExtent[1] - yExtent[0]) * 0.16);
  const yMin = yExtent[0] - yPad;
  const yMax = yExtent[1] + yPad;
  const maxEmployment = Math.max(1, ...sectors.map((sector) => sector.employment));
  const xScale = (value: number) => MARGIN.left + (clamp(value, 0, 100) / 100) * INNER_WIDTH;
  const yScale = (value: number) => MARGIN.top + ((yMax - value) / Math.max(1, yMax - yMin)) * INNER_HEIGHT;
  const rScale = (value: number) => 4.5 + Math.sqrt(value / maxEmployment) * 15;
  const yTicks = Array.from({ length: 5 }, (_, index) => yMin + ((yMax - yMin) * index) / 4);
  const titleId = `${chartId}-title`;
  const descId = `${chartId}-desc`;

  if (sectors.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        {t("marketSignalNoData")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_360px]">
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {t("marketSignalIntro", { count: sectors.length, benchmark: source.benchmark, start: source.start })}
            </p>
            <span className="w-fit rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
              {t("marketSignalLensBadge")}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white/55 p-3 dark:border-zinc-800 dark:bg-zinc-950/35">
            <svg className="h-auto w-full min-w-[720px]" viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-labelledby={`${titleId} ${descId}`}>
              <title id={titleId}>{t("marketSignalScatterAria")}</title>
              <desc id={descId}>{t("marketSignalScatterDescription", { count: sectors.length, benchmark: source.benchmark, start: source.start })}</desc>

              {[0, 25, 50, 75, 100].map((tick) => (
                <g key={`x-${tick}`}>
                  <line x1={xScale(tick)} x2={xScale(tick)} y1={MARGIN.top} y2={MARGIN.top + INNER_HEIGHT} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeDasharray="3 5" />
                  <text x={xScale(tick)} y={CHART_HEIGHT - 24} textAnchor="middle" className="fill-zinc-500 text-[11px]">{tick}%</text>
                </g>
              ))}
              {yTicks.map((tick, index) => (
                <g key={`y-${index}`}>
                  <line x1={MARGIN.left} x2={MARGIN.left + INNER_WIDTH} y1={yScale(tick)} y2={yScale(tick)} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeDasharray="3 5" />
                  <text x={MARGIN.left - 12} y={yScale(tick) + 4} textAnchor="end" className="fill-zinc-500 text-[11px]">{formatPct(tick, true)}</text>
                </g>
              ))}

              <line x1={xScale(xMid)} x2={xScale(xMid)} y1={MARGIN.top} y2={MARGIN.top + INNER_HEIGHT} stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="7 6" opacity="0.72" />
              <line x1={MARGIN.left} x2={MARGIN.left + INNER_WIDTH} y1={yScale(0)} y2={yScale(0)} stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="7 6" opacity="0.72" />
              <text x={xScale(xMid) + 8} y={MARGIN.top + 14} className="fill-zinc-500 text-[11px]">{t("marketSignalHigherExposure")}</text>
              <text x={MARGIN.left + INNER_WIDTH - 6} y={yScale(0) - 8} textAnchor="end" className="fill-zinc-500 text-[11px]">{t("marketSignalAboveBenchmark", { benchmark: source.benchmark })}</text>
              <text x={MARGIN.left + INNER_WIDTH / 2} y={CHART_HEIGHT - 6} textAnchor="middle" className="fill-zinc-500 text-[11px]">{t("marketSignalXAxis")}</text>
              <text transform={`rotate(-90 ${18} ${MARGIN.top + INNER_HEIGHT / 2})`} x="18" y={MARGIN.top + INNER_HEIGHT / 2} textAnchor="middle" className="fill-zinc-500 text-[11px]">{t("marketSignalYAxis", { benchmark: source.benchmark })}</text>

              {sectors.map((sector) => {
                const isActive = active?.key === sector.key;
                const radius = rScale(sector.employment);
                return (
                  <g
                    key={sector.key}
                    tabIndex={0}
                    role="listitem"
                    aria-label={pointLabel(sector, t, source.benchmark)}
                    onFocus={() => setActiveKey(sector.key)}
                    onBlur={() => setActiveKey(null)}
                    onMouseEnter={() => setActiveKey(sector.key)}
                    onMouseLeave={() => setActiveKey(null)}
                    className="cursor-default outline-none"
                  >
                    <circle
                      cx={xScale(sector.exposure)}
                      cy={yScale(sector.excessReturn)}
                      r={isActive ? radius + 2 : radius}
                      fill={TONE_FILL[sector.classification]}
                      fillOpacity={isActive ? 0.95 : 0.72}
                      stroke="currentColor"
                      strokeWidth={isActive ? 2.5 : 1.2}
                      className="text-white transition-all dark:text-zinc-950"
                    />
                    <text x={xScale(sector.exposure) + radius + 4} y={yScale(sector.excessReturn) + 4} className="fill-zinc-700 text-[11px] font-semibold dark:fill-zinc-200">
                      {sector.ticker || sector.name}
                    </text>
                    <title>{pointLabel(sector, t, source.benchmark)}</title>
                  </g>
                );
              })}
            </svg>
            <ul className="sr-only" aria-label={t("marketSignalScatterSrList")}>
              {sectors.map((sector) => <li key={sector.key}>{pointLabel(sector, t, source.benchmark)}</li>)}
            </ul>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <SummaryCard label={t("marketSignalSectorsMapped")} value={sectors.length.toLocaleString()} />
            <SummaryCard label={t("marketSignalBenchmark")} value={source.benchmark} />
            <SummaryCard label={t("marketSignalWindow")} value={`${formatDate(source.start)} – ${formatDate(source.end)}`} />
            <SummaryCard label={t("marketSignalAverageExcess")} value={formatPct(avgExcess, true)} />
          </div>

          {active && (
            <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("marketSignalSelectedTitle")}</p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-white">{active.name}</p>
                  <p className="text-xs text-zinc-500">{active.ticker ? t("marketSignalEtfLabel", { ticker: active.ticker }) : t("marketSignalEtfUnavailable")}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[active.classification]}`}>{classLabel(t, active.classification)}</span>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Metric label={t("marketSignalExposureHeader")} value={formatPct(active.exposure)} />
                <Metric label={t("marketSignalExcessHeader")} value={formatPct(active.excessReturn, true)} />
                <Metric label={t("marketSignalMappedEmployment")} value={formatEmployment(active.employment)} />
                <Metric label={t("marketSignalScoreHeader")} value={active.sensitivityScore.toFixed(1)} />
              </dl>
            </div>
          )}

          <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("marketSignalLegendTitle")}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["high", "medium", "low"] as Tone[]).map((tone) => (
                <span key={tone} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}>{classLabel(t, tone)}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("marketSignalRankTitle")}</p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{t("marketSignalRankExplainer", { benchmark: source.benchmark })}</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <div className="hidden grid-cols-[48px_minmax(0,1.4fr)_92px_92px_92px_132px_78px] gap-3 bg-zinc-100/70 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:bg-zinc-900/70 lg:grid">
            <span>{t("rankHeader")}</span>
            <span>{t("marketSignalSectorHeader")}</span>
            <span>{t("marketSignalReturnHeader")}</span>
            <span>{t("marketSignalExcessHeader")}</span>
            <span>{t("marketSignalExposureHeader")}</span>
            <span>{t("marketSignalRiskHeader")}</span>
            <span>{t("marketSignalScoreHeader")}</span>
          </div>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {ranked.map((sector, index) => (
              <button key={sector.key} type="button" onClick={() => setActiveKey(sector.key)} className="grid w-full gap-3 px-3 py-3 text-left transition-colors hover:bg-violet-500/5 lg:grid-cols-[48px_minmax(0,1.4fr)_92px_92px_92px_132px_78px] lg:items-center">
                <span className="text-sm font-bold text-zinc-500">#{index + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-white">{sector.name}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
                    {sector.ticker && <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">{sector.ticker}</span>}
                    <span className={`rounded-full border px-2 py-0.5 ${TONE_CLASSES[sector.classification]}`}>{classLabel(t, sector.classification)}</span>
                  </span>
                </span>
                <MobileMetric label={t("marketSignalReturnHeader")} value={formatPct(sector.totalReturn, true)} />
                <MobileMetric label={t("marketSignalExcessHeader")} value={formatPct(sector.excessReturn, true)} />
                <MobileMetric label={t("marketSignalExposureHeader")} value={formatPct(sector.exposure)} />
                <MobileMetric label={t("marketSignalRiskHeader")} value={`${t("marketSignalVolatilityShort")} ${formatPct(sector.volatility)} · ${t("marketSignalDrawdownShort")} ${formatPct(sector.drawdown)}`} />
                <span>
                  <span className="block text-sm font-bold tabular-nums" style={{ color: TONE_FILL[sector.classification] }}>{sector.sensitivityScore.toFixed(1)}</span>
                  <span className="mt-1 block h-2 rounded-full bg-zinc-200 dark:bg-zinc-800"><span className="block h-2 rounded-full" style={{ width: `${sector.sensitivityScore}%`, background: TONE_FILL[sector.classification] }} /></span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{t("marketSignalMethodologyTitle")}</p>
          <ol className="mt-3 space-y-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            <li>{t("marketSignalMethodStep1")}</li>
            <li>{t("marketSignalMethodStep2", { benchmark: source.benchmark })}</li>
            <li>{t("marketSignalMethodStep3")}</li>
          </ol>
        </div>
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300" role="note">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-700 dark:text-amber-300">{t("marketSignalCaveatTitle")}</p>
          <p className="mt-2">{t("marketSignalSourceLine", { provider: source.provider, benchmark: source.benchmark, start: source.start, end: source.end })}</p>
          <p className="mt-2">{t("marketSignalCaveatText")}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/55 p-4 dark:border-zinc-800 dark:bg-zinc-950/35">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-white">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-100/70 p-3 dark:bg-zinc-900/60">
      <dt className="text-[11px] uppercase tracking-widest text-zinc-500">{label}</dt>
      <dd className="mt-1 font-bold text-zinc-900 dark:text-white">{value}</dd>
    </div>
  );
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="grid grid-cols-[110px_1fr] gap-2 text-sm lg:block">
      <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 lg:hidden">{label}</span>
      <span className="tabular-nums text-zinc-700 dark:text-zinc-300">{value}</span>
    </span>
  );
}
