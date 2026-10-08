import trackerData from "@/data/ai-adoption-tracker.json";
import { SOC_PREFIX_TO_SECTOR } from "@/lib/sector-taxonomy";

// ─── Types (mirror scripts/build-ai-adoption-tracker.mjs output) ─────────────

export interface DatedValue {
  date: string;
  value: number;
}

export interface WorkerOccupationGroup {
  socMajor: string;
  group: string;
  adoptionWorkPct: number;
  adoptionWorkPctYearAgo: number | null;
  timeSavingsPctOfHours: number | null;
  series: DatedValue[];
}

export interface WorkerIndustry {
  naics: string;
  industry: string;
  adoptionWorkPct: number;
  adoptionWorkPctYearAgo: number | null;
  timeSavingsPctOfHours: number | null;
}

export interface BusinessCycle {
  cycle: string;
  refStart: string | null;
  refEnd: string | null;
  aiUsePct: number;
  aiUseNext6mPct: number | null;
}

export interface BusinessCut {
  cycle: string;
  aiUsePct: number;
  aiUseNext6mPct: number | null;
}

export interface AIAdoptionTracker {
  meta: { generatedAt: string; asOf: string };
  sources: { id: string; name: string; publisher: string; url: string; license: string }[];
  caveats: string[];
  workers: {
    asOf: string;
    headline: {
      adoptionOverall: DatedValue[];
      adoptionWork: DatedValue[];
      adoptionNonWork: DatedValue[];
      dailyUseWork: DatedValue[];
      lastWeekUseWork: DatedValue[];
      timeSavingsPctOfHours: DatedValue[];
      workHoursAssistedPct: DatedValue[];
    };
    byOccupationGroup: WorkerOccupationGroup[];
    byIndustry: WorkerIndustry[];
  };
  businesses: {
    asOf: string;
    latestCycle: string;
    national: BusinessCycle[];
    bySector: (BusinessCut & { naics: string; sector: string })[];
    byState: (BusinessCut & { state: string })[];
  };
}

export function getAIAdoptionTracker(): AIAdoptionTracker {
  return trackerData as unknown as AIAdoptionTracker;
}

// ─── Derived views ────────────────────────────────────────────────────────────

export interface HeadlineMetric {
  value: number;
  date: string;
  /** Percentage-point change vs the same quarter one year earlier; null if unavailable. */
  yoyPp: number | null;
}

function headlineFrom(series: DatedValue[]): HeadlineMetric | null {
  const last = series.at(-1);
  if (!last) return null;
  const target = `${Number(last.date.slice(0, 4)) - 1}${last.date.slice(4)}`;
  const prev = series.find((p) => p.date === target);
  return {
    value: last.value,
    date: last.date,
    yoyPp: prev ? Math.round((last.value - prev.value) * 10) / 10 : null,
  };
}

/** Converts a quarter-start date (2026-04-01) to a compact label ("Q2 2026"). */
export function quarterLabel(date: string): string {
  const month = Number(date.slice(5, 7));
  return `Q${Math.floor((month - 1) / 3) + 1} ${date.slice(0, 4)}`;
}

export interface AdoptionHeadlines {
  workerAdoptionWork: HeadlineMetric | null;
  workerAdoptionOverall: HeadlineMetric | null;
  workerDailyUseWork: HeadlineMetric | null;
  workerTimeSavings: HeadlineMetric | null;
  businessAiUse: { value: number; refEnd: string | null; cycle: string; changePp: number | null } | null;
  businessAiUseNext6m: number | null;
}

export function getAdoptionHeadlines(): AdoptionHeadlines {
  const { workers, businesses } = getAIAdoptionTracker();
  const latest = businesses.national.at(-1) ?? null;
  const first = businesses.national[0] ?? null;
  return {
    workerAdoptionWork: headlineFrom(workers.headline.adoptionWork),
    workerAdoptionOverall: headlineFrom(workers.headline.adoptionOverall),
    workerDailyUseWork: headlineFrom(workers.headline.dailyUseWork),
    workerTimeSavings: headlineFrom(workers.headline.timeSavingsPctOfHours),
    businessAiUse: latest
      ? {
          value: latest.aiUsePct,
          refEnd: latest.refEnd,
          cycle: latest.cycle,
          changePp: first && first !== latest ? Math.round((latest.aiUsePct - first.aiUsePct) * 10) / 10 : null,
        }
      : null,
    businessAiUseNext6m: latest?.aiUseNext6mPct ?? null,
  };
}

export interface AdoptionByOccupationRow {
  socMajor: string;
  /** FutureGrid canonical sector name (SOC major group). */
  sector: string;
  adoptionWorkPct: number;
  adoptionWorkPctYearAgo: number | null;
  yoyPp: number | null;
  timeSavingsPctOfHours: number | null;
}

/** Worker GenAI adoption by SOC major group, joined to FutureGrid sector names, sorted desc. */
export function getAdoptionByOccupationGroup(): AdoptionByOccupationRow[] {
  return getAIAdoptionTracker()
    .workers.byOccupationGroup.map((g) => ({
      socMajor: g.socMajor,
      sector: SOC_PREFIX_TO_SECTOR[g.socMajor] ?? g.group,
      adoptionWorkPct: g.adoptionWorkPct,
      adoptionWorkPctYearAgo: g.adoptionWorkPctYearAgo,
      yoyPp:
        g.adoptionWorkPctYearAgo != null
          ? Math.round((g.adoptionWorkPct - g.adoptionWorkPctYearAgo) * 10) / 10
          : null,
      timeSavingsPctOfHours: g.timeSavingsPctOfHours,
    }))
    .sort((a, b) => b.adoptionWorkPct - a.adoptionWorkPct);
}

// ─── View models for the dashboard pulse and the Insights Lab lens ───────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-09-06" → "Sep 6 '26" — compact, locale-neutral axis label. */
export function shortDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ${Number(d)} '${y.slice(2)}`;
}

export interface AdoptionPulseData {
  workers: { labels: string[]; work: number[]; overall: number[] };
  firms: { labels: string[]; now: number[]; next6m: number[] };
  occupations: AdoptionByOccupationRow[];
  headlines: AdoptionHeadlines;
}

export function getAdoptionPulseData(): AdoptionPulseData {
  const { workers, businesses } = getAIAdoptionTracker();
  const overallByDate = new Map(workers.headline.adoptionOverall.map((p) => [p.date, p.value]));
  const workerPoints = workers.headline.adoptionWork.filter((p) => overallByDate.has(p.date));
  const firmPoints = businesses.national.filter((c) => c.aiUseNext6mPct != null && c.refEnd);
  return {
    workers: {
      labels: workerPoints.map((p) => quarterLabel(p.date)),
      work: workerPoints.map((p) => p.value),
      overall: workerPoints.map((p) => overallByDate.get(p.date) as number),
    },
    firms: {
      labels: firmPoints.map((c) => shortDateLabel(c.refEnd as string)),
      now: firmPoints.map((c) => c.aiUsePct),
      next6m: firmPoints.map((c) => c.aiUseNext6mPct as number),
    },
    occupations: getAdoptionByOccupationGroup(),
    headlines: getAdoptionHeadlines(),
  };
}

export interface IndustryAdoptionRow {
  naics: string;
  industry: string;
  workerAdoptionPct: number;
  workerYoyPp: number | null;
  firmAiUsePct: number | null;
}

/**
 * Worker (RPS) and firm (BTOS) adoption for the same NAICS sectors. The two
 * values stay in separate fields — they measure different units.
 */
export function getIndustryAdoption(): IndustryAdoptionRow[] {
  const { workers, businesses } = getAIAdoptionTracker();
  const firmByNaics = new Map(businesses.bySector.map((s) => [s.naics, s.aiUsePct]));
  return workers.byIndustry
    .map((r) => ({
      naics: r.naics,
      industry: r.industry,
      workerAdoptionPct: r.adoptionWorkPct,
      workerYoyPp:
        r.adoptionWorkPctYearAgo != null ? Math.round((r.adoptionWorkPct - r.adoptionWorkPctYearAgo) * 10) / 10 : null,
      // BTOS keys multi-code sectors (31-33, 44-45, 48-49) by their first code.
      firmAiUsePct: firmByNaics.get(r.naics.split("-")[0]) ?? null,
    }))
    .sort((a, b) => b.workerAdoptionPct - a.workerAdoptionPct);
}

export function getFirmAdoptionByState(): { state: string; aiUsePct: number }[] {
  return getAIAdoptionTracker()
    .businesses.byState.map((s) => ({ state: s.state, aiUsePct: s.aiUsePct }))
    .sort((a, b) => b.aiUsePct - a.aiUsePct);
}
