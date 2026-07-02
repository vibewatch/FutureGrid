import aiFrontierData from "@/data/ai-frontier.json";

// ── Source and methodology types ──────────────────────────────────────────────

export interface AIFrontierSource {
  name: string;
  publisher: string;
  url: string;
  downloadUrl: string;
  license: string;
  accessed: string;
  caveat: string;
}

export interface AIFrontierMethodology {
  computeField: string;
  doublingTimeMethod: string;
  modernEraStart: number;
  costUnit: string;
  notes: string;
}

export interface AIFrontierCounts {
  totalRows: number;
  withCompute: number;
  withComputeAndDate: number;
  withPower: number;
  withCost: number;
  countries: number;
}

// ── Per-model entry (lean: no abstracts/authors/notes) ────────────────────────

export interface AIFrontierModel {
  name: string;
  organization: string;
  orgCategory: string | null;
  country: string | null;
  /** De-duplicated array of participating countries (empty if unknown). */
  countries: string[];
  date: string; // YYYY-MM-DD
  year: number;
  decimalYear: number;
  domains: string[];
  task: string | null;
  parameters: number | null;
  computeFlop: number;
  log10Compute: number;
  trainingCostUsd2023: number | null;
  powerDrawW: number | null;
  frontier: boolean;
  openWeights: boolean | null;
  accessibility: string | null;
  confidence: string | null;
  link: string | null;
}

// ── Aggregate types ───────────────────────────────────────────────────────────

export interface ComputeRegression {
  slopeLog10PerYear: number;
  intercept: number;
  r2: number;
  doublingTimeMonths: number | null;
  startYear: number;
  endYear: number;
  n: number;
}

export interface FrontierYearPoint {
  year: number;
  maxLog10Compute: number;
  computeFlop: number;
  model: string;
  organization: string;
}

export interface ComputeTrend {
  overall: ComputeRegression | null;
  modernEra: ComputeRegression | null;
  frontierByYear: FrontierYearPoint[];
}

export interface CostTrendPoint {
  year: number;
  n: number;
  medianCostUsd2023: number;
  maxCostUsd2023: number;
  topModel: string;
}

export interface PowerTrendPoint {
  year: number;
  n: number;
  medianPowerW: number;
  maxPowerW: number;
}

export interface OrgLeaderboardEntry {
  organization: string;
  orgCategory: string | null;
  country: string | null;
  modelCount: number;
  frontierCount: number;
  maxComputeFlop: number;
  latestDate: string;
  medianLog10Compute: number;
}

export interface CountryLeaderboardEntry {
  country: string;
  /** Short display name (e.g. "United States" for "United States of America"). */
  countryShort: string;
  modelCount: number;
  frontierCount: number;
  maxComputeFlop: number;
  orgCount: number;
}

export interface AccessibilityMix {
  openWeights: number;
  closed: number;
  unknown: number;
}

export interface DomainMixEntry {
  domain: string;
  count: number;
}

export interface AIFrontierAggregates {
  computeTrend: ComputeTrend;
  costTrend: CostTrendPoint[];
  powerTrend: PowerTrendPoint[];
  orgLeaderboard: OrgLeaderboardEntry[];
  countryLeaderboard: CountryLeaderboardEntry[];
  accessibilityMix: AccessibilityMix;
  domainMix: DomainMixEntry[];
}

export interface AIFrontierData {
  generatedAt: string;
  source: AIFrontierSource;
  methodology: AIFrontierMethodology;
  counts: AIFrontierCounts;
  models: AIFrontierModel[];
  aggregates: AIFrontierAggregates;
  caveats: string[];
}

// ── Cast imported JSON to typed interface ─────────────────────────────────────

const data = aiFrontierData as unknown as AIFrontierData;

// ── Primary selector ──────────────────────────────────────────────────────────

export function getAIFrontierData(): AIFrontierData {
  return data;
}

// ── Helper selectors ──────────────────────────────────────────────────────────

/** All models with compute + date, sorted ascending by date. */
export function getComputeModels(): AIFrontierModel[] {
  return data.models;
}

/** Frontier-flagged models only, sorted ascending by date. */
export function getFrontierModels(): AIFrontierModel[] {
  return data.models.filter((m) => m.frontier);
}

/** Models from modernEraStart (2010) onward, sorted ascending by date. */
export function getModernEraModels(): AIFrontierModel[] {
  return data.models.filter((m) => m.year >= data.methodology.modernEraStart);
}

/** Highest-compute model per calendar year — the compute frontier over time. */
export function getComputeTimeline(): FrontierYearPoint[] {
  return data.aggregates.computeTrend.frontierByYear;
}

/** Top N organizations by model count (default 20, capped at available rows). */
export function getOrgLeaderboard(limit = 20): OrgLeaderboardEntry[] {
  return data.aggregates.orgLeaderboard.slice(0, Math.max(1, limit));
}

/** All countries with at least one compute model, sorted by model count desc. */
export function getCountryLeaderboard(): CountryLeaderboardEntry[] {
  return data.aggregates.countryLeaderboard;
}

/** OLS regression stats for the modern era (year >= 2010). */
export function getModernEraRegression(): ComputeRegression | null {
  return data.aggregates.computeTrend.modernEra;
}

/** Overall OLS regression stats across all compute models. */
export function getOverallRegression(): ComputeRegression | null {
  return data.aggregates.computeTrend.overall;
}

/** Cost trend points, one per year that has at least one model with cost data. */
export function getCostTrend(): CostTrendPoint[] {
  return data.aggregates.costTrend;
}

/** Power draw trend points, one per year that has at least one model with power data. */
export function getPowerTrend(): PowerTrendPoint[] {
  return data.aggregates.powerTrend;
}

/** Domain distribution across all compute models, sorted by count desc. */
export function getDomainMix(): DomainMixEntry[] {
  return data.aggregates.domainMix;
}

/** Open-weights / closed / unknown breakdown across compute models. */
export function getAccessibilityMix(): AccessibilityMix {
  return { ...data.aggregates.accessibilityMix };
}

/**
 * Format a raw FLOP count as a human-readable string with SI prefix.
 * Examples: 6.6e24 → "6.60 YFLOP", 5e21 → "5.00 ZFLOP", 1e15 → "1.00 PFLOP"
 */
export function formatFlop(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0 FLOP";
  const abs = Math.abs(n);
  const prefixes: Array<[number, string]> = [
    [1e24, "Y"],
    [1e21, "Z"],
    [1e18, "E"],
    [1e15, "P"],
    [1e12, "T"],
    [1e9, "G"],
    [1e6, "M"],
    [1e3, "k"],
  ];
  for (const [scale, prefix] of prefixes) {
    if (abs >= scale) {
      const v = n / scale;
      const s = v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2);
      return `${s} ${prefix}FLOP`;
    }
  }
  return `${n.toExponential(2)} FLOP`;
}

/**
 * Format a log10(FLOP) value as a power-of-10 string.
 * Example: 24.82 → "10^24.8"
 */
export function formatLog10Flop(log10: number): string {
  if (!Number.isFinite(log10)) return "unknown";
  return `10^${log10.toFixed(1)}`;
}
