/**
 * lib/h1b.ts
 *
 * Typed loader over the certified H-1B LCA trends dataset
 * (data/h1b-trends.json, built by scripts/build-h1b.mjs).
 *
 * These are **certified H-1B Labor Condition Applications (LCAs) — employer
 * filings, NOT visa approvals**. Counts are comparable across all ten fiscal
 * years (FY2016–FY2025): per-quarter files are summed by distinct CASE_NUMBER
 * for FY2020+, annual disclosure files back FY2016–FY2019.
 *
 * Heavy aggregation (the AI-exposure-tier join) lives here so the client route
 * only imports pre-shaped, memo-friendly structures.
 */

import h1bTrends from "@/data/h1b-trends.json";
import occupationSnapshot from "@/data/occupation-snapshot-slim.json";

// ── Raw dataset types ─────────────────────────────────────────────────────────

export interface H1bSource {
  name: string;
  publisher: string;
  url: string;
}

export interface H1bMeta {
  generatedAt: string;
  asOf: string;
  source: H1bSource;
  version: string;
  note: string;
}

export interface H1bCoverage {
  fiscalYears: number[];
  skippedFiscalYears?: number[];
  incompleteFiscalYears: number[];
  source: string;
  aggregation: string;
  socVintage?: string;
  socCrosswalkApplied?: boolean;
}

export interface H1bYearRow {
  fiscalYear: number;
  certifiedLcas: number;
  certifiedWithdrawnLcas: number;
  totalWorkerPositions: number;
  distinctEmployers: number;
  medianWageAnnual: number;
  p25WageAnnual: number;
  p75WageAnnual: number;
}

export interface H1bOccupation {
  socCode: string;
  socTitle: string;
  countByYear: Record<string, number>;
  totalCount: number;
  medianWageAnnualLatest: number;
  /** Compound annual growth rate as a decimal fraction; 0.0572 means +5.72%. */
  cagr: number;
  /** Median annual wage by fiscal year — present only for occupations with ≥ 5,000 total filings. Null values indicate < 50 filings in that year. */
  wageByYear?: Record<string, number | null>;
  /** Alias for wageByYear (same data). */
  medianWageByYear?: Record<string, number | null>;
}

export interface H1bEmployer {
  employer: string;
  totalCount: number;
  countByYear: Record<string, number>;
  /** Mean annualized offered wage across all certified filings for this employer. */
  meanWageAnnual?: number;
}

export interface H1bStateTopOccupation {
  socCode: string;
  socTitle: string;
  count: number;
}

export interface H1bState {
  state: string;
  totalCount: number;
  countByYear: Record<string, number>;
  medianWageAnnualLatest: number;
  /** Median annual wage by fiscal year for this state. */
  wageByYear?: Record<string, number | null>;
  /** Top 5 occupations by certified-LCA volume in this state. */
  topOccupations?: H1bStateTopOccupation[];
}

export interface H1bTrends {
  meta: H1bMeta;
  coverage: H1bCoverage;
  byYear: H1bYearRow[];
  occupations: H1bOccupation[];
  topEmployers: H1bEmployer[];
  byState: H1bState[];
}

const data = h1bTrends as unknown as H1bTrends;

// ── Occupation-snapshot exposure rows (only the fields we join on) ────────────

interface ExposureRow {
  socCode: string;
  aiExposure: number;
  automationRisk: string;
}

const exposureRows = (
  occupationSnapshot as unknown as { data: ExposureRow[] }
).data;

const exposureBySoc = new Map<string, ExposureRow>(
  exposureRows.map((r) => [r.socCode, r]),
);

// ── Basic accessors ───────────────────────────────────────────────────────────

/** Dataset provenance / meta block. */
export function getMeta(): H1bMeta {
  return data.meta;
}

/** Coverage descriptor (fiscal-year span, aggregation notes). */
export function getCoverage(): H1bCoverage {
  return data.coverage;
}

/** Fiscal years covered, ascending (e.g. [2016 … 2025]). */
export function getFiscalYears(): number[] {
  return data.coverage.fiscalYears;
}

/** Per-year headline rows (volume + wage percentiles), ascending by year. */
export function getByYear(): H1bYearRow[] {
  return [...data.byYear].sort((a, b) => a.fiscalYear - b.fiscalYear);
}

/** The most-recent fiscal-year row. */
export function getLatestYear(): H1bYearRow {
  const rows = getByYear();
  return rows[rows.length - 1];
}

/** The earliest fiscal-year row. */
export function getEarliestYear(): H1bYearRow {
  return getByYear()[0];
}

// ── Occupations ───────────────────────────────────────────────────────────────

/** All occupations, sorted by total certified-LCA volume (descending). */
export function getOccupationsSorted(): H1bOccupation[] {
  return [...data.occupations].sort((a, b) => b.totalCount - a.totalCount);
}

/**
 * Top-N occupations by their volume in the latest fiscal year (the "job trend"
 * lens — which roles dominate hiring demand right now).
 */
export function getTopOccupationsByLatestYear(n = 9): H1bOccupation[] {
  const latest = String(getLatestYear().fiscalYear);
  return [...data.occupations]
    .sort(
      (a, b) => (b.countByYear[latest] ?? 0) - (a.countByYear[latest] ?? 0),
    )
    .slice(0, n);
}

/** Top-N occupations by total volume across the decade. */
export function getTopOccupationsByTotal(n = 9): H1bOccupation[] {
  return getOccupationsSorted().slice(0, n);
}

// Computed once at module load; reused by getOccupationSignalBySoc for O(1)-per-call rank lookup.
const _occupationsSortedByTotal: H1bOccupation[] = getOccupationsSorted();

// ── Employers & states ────────────────────────────────────────────────────────

/** Top-N sponsoring employers by total certified LCAs. */
export function getTopEmployers(n = 10): H1bEmployer[] {
  return [...data.topEmployers]
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, n);
}

/** All employers sorted by total certified LCAs (descending). */
export function getAllEmployers(): H1bEmployer[] {
  return [...data.topEmployers].sort((a, b) => b.totalCount - a.totalCount);
}

/** Top-N states by total certified LCAs. */
export function getTopStates(n = 10): H1bState[] {
  return [...data.byState]
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, n);
}

/** All states, sorted by total certified LCAs (descending). */
export function getAllStates(): H1bState[] {
  return [...data.byState].sort((a, b) => b.totalCount - a.totalCount);
}

/**
 * Detail for a single state by its two-letter code.
 * Returns undefined when the code is not in the dataset.
 */
export function getStateDetail(code: string): H1bState | undefined {
  return data.byState.find((s) => s.state === code);
}

/**
 * Top-N occupations (by latest-year volume) that have `wageByYear` data.
 * Use for the wage-trajectory multi-line chart.
 */
export function getOccupationsWithWageTrend(n = 8): H1bOccupation[] {
  const latest = String(getLatestYear().fiscalYear);
  return data.occupations
    .filter((o) => !!o.wageByYear)
    .sort(
      (a, b) => (b.countByYear[latest] ?? 0) - (a.countByYear[latest] ?? 0),
    )
    .slice(0, n);
}

// ── AI-exposure tier aggregation ──────────────────────────────────────────────

/**
 * Canonical automation-risk tiers (from the occupation snapshot), plus an
 * "Unclassified" bucket for H-1B SOC codes that have no exposure match.
 */
export const EXPOSURE_TIERS = [
  "Low",
  "Medium",
  "High",
  "Very High",
  "Unclassified",
] as const;

export type ExposureTier = (typeof EXPOSURE_TIERS)[number];

export interface ExposureTierSeries {
  tier: ExposureTier;
  /** Certified-LCA volume for this tier, keyed by fiscal year. */
  countByYear: Record<string, number>;
  /** Total certified LCAs across the decade for this tier. */
  totalCount: number;
  /** Number of distinct H-1B occupations mapped into this tier. */
  occupationCount: number;
}

export interface ExposureTierAggregation {
  years: number[];
  tiers: ExposureTierSeries[];
  /** Occupations with an exposure match / total occupations. */
  matchedOccupations: number;
  totalOccupations: number;
  /** Share of H-1B occupations that joined to an exposure tier (0–1). */
  occupationMatchRate: number;
  /** Share of certified-LCA volume that joined to an exposure tier (0–1). */
  volumeMatchRate: number;
}

/**
 * Join each H-1B occupation's `socCode` to FutureGrid's occupation-snapshot
 * exposure rows and bucket certified-LCA volume by automation-risk tier over
 * the decade. Unmatched SOC codes land in an "Unclassified" bucket.
 *
 * This is a **descriptive** join (which visa-sponsored roles fall into which
 * AI-exposure tier) — it is not causal.
 */
export function getExposureTierAggregation(): ExposureTierAggregation {
  const years = getFiscalYears();

  const emptyCounts = (): Record<string, number> =>
    Object.fromEntries(years.map((y) => [String(y), 0]));

  const series: Record<ExposureTier, ExposureTierSeries> = Object.fromEntries(
    EXPOSURE_TIERS.map((tier) => [
      tier,
      { tier, countByYear: emptyCounts(), totalCount: 0, occupationCount: 0 },
    ]),
  ) as Record<ExposureTier, ExposureTierSeries>;

  let matchedOccupations = 0;
  let totalVolume = 0;
  let matchedVolume = 0;

  for (const occ of data.occupations) {
    const match = exposureBySoc.get(occ.socCode);
    const tier: ExposureTier = match
      ? (EXPOSURE_TIERS.includes(match.automationRisk as ExposureTier)
          ? (match.automationRisk as ExposureTier)
          : "Unclassified")
      : "Unclassified";

    const bucket = series[tier];
    bucket.occupationCount += 1;
    totalVolume += occ.totalCount;

    if (match) {
      matchedOccupations += 1;
      matchedVolume += occ.totalCount;
    }

    for (const y of years) {
      const key = String(y);
      const v = occ.countByYear[key] ?? 0;
      bucket.countByYear[key] += v;
      bucket.totalCount += v;
    }
  }

  return {
    years,
    tiers: EXPOSURE_TIERS.map((tier) => series[tier]),
    matchedOccupations,
    totalOccupations: data.occupations.length,
    occupationMatchRate:
      data.occupations.length > 0
        ? matchedOccupations / data.occupations.length
        : 0,
    volumeMatchRate: totalVolume > 0 ? matchedVolume / totalVolume : 0,
  };
}

/** The AI-exposure score (0–1) for a SOC code, or null when unmatched. */
export function getAiExposureForSoc(socCode: string): number | null {
  return exposureBySoc.get(socCode)?.aiExposure ?? null;
}

// ── Per-SOC H-1B sponsorship signal ──────────────────────────────────────────

export interface H1bOccupationSignal {
  socCode: string;
  socTitle: string;
  totalCount: number;
  countByYear: Record<string, number>;
  firstYear: number;
  firstYearCount: number;
  latestYear: number;
  latestYearCount: number;
  medianWageAnnualLatest: number;
  cagr: number;
  rankByTotal: number;
  totalOccupations: number;
  shareOfLatestYear: number;
}

/**
 * H-1B visa-sponsorship signal for a SOC code, or null when this occupation
 * has NO certified H-1B LCA filings in the dataset. Descriptive labor-demand
 * signal (employer filings), NOT visa approvals.
 */
export function getOccupationSignalBySoc(
  socCode: string,
): H1bOccupationSignal | null {
  const occ = data.occupations.find((o) => o.socCode === socCode);
  if (!occ) return null;

  const years = getFiscalYears();
  const firstYear = years[0];
  const latestYear = years[years.length - 1];
  const latestKey = String(latestYear);

  const latestYearCount = occ.countByYear[latestKey] ?? 0;

  const sumLatest = data.occupations.reduce(
    (s, o) => s + (o.countByYear[latestKey] ?? 0),
    0,
  );

  const rankByTotal =
    _occupationsSortedByTotal.findIndex((o) => o.socCode === socCode) + 1;

  return {
    socCode: occ.socCode,
    socTitle: occ.socTitle,
    totalCount: occ.totalCount,
    countByYear: occ.countByYear,
    firstYear,
    firstYearCount: occ.countByYear[String(firstYear)] ?? 0,
    latestYear,
    latestYearCount,
    medianWageAnnualLatest: occ.medianWageAnnualLatest,
    cagr: occ.cagr,
    rankByTotal,
    totalOccupations: data.occupations.length,
    shareOfLatestYear: sumLatest > 0 ? latestYearCount / sumLatest : 0,
  };
}

export default data;
