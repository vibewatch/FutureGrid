import aiFrontierData from "@/data/ai-frontier.json";

// ── Source and methodology types ──────────────────────────────────────────────

export interface AIFrontierSource {
  name: string;
  publisher: string;
  url: string;
  downloadUrl: string;
  docsUrl?: string;
  license: string;
  accessed: string;
  caveat: string;
}

export interface AIFrontierRecentWindow {
  years: number;
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

export interface AIFrontierMethodology {
  computeField: string;
  doublingTimeMethod: string;
  modernEraStart: number;
  costUnit: string;
  notes: string;
  recentWindow?: AIFrontierRecentWindow;
}

/**
 * Methodological definitions and disclosure text for every metric dimension.
 * Consumers should display these at point-of-use to avoid misinterpretation.
 */
export interface AIFrontierDefinitions {
  /** Discloses what Epoch AI's "Frontier model" flag means and its limitations. */
  frontierDefinition: string;
  /** Describes what modelCount, computeKnownCount, recentCount, and openWeightsCount mean for orgs. */
  orgLeaderboardMetric: string;
  /** Describes the default country sort key and why it is recentCount. */
  countryLeaderboardDefaultSort: string;
  /** Discloses openWeightsCount limitations. */
  openWeightsMetric: string;
  /** Explains co-attribution for multi-country models. */
  multiCountryAttribution: string;
  /** Explains that Google entities are preserved as distinct source entities. */
  googleEntitiesNote: string;
  /** General coverage caveat. */
  coverageNote: string;
}

export interface AIFrontierCounts {
  totalRows: number;
  /** Rows with a valid YYYY-MM-DD publication date (full catalog). */
  withDate: number;
  withCompute: number;
  withComputeAndDate: number;
  withPower: number;
  withCost: number;
  /** Rows with "Open model weights?" = Yes (across all rows). */
  withOpenWeights: number;
  countries: number;
  recentWindowStart: string;
  recentWindowEnd: string;
  recentWindowCount: number;
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
  /**
   * Full-catalog model count — all tracked Epoch AI rows with a valid
   * publication date, regardless of compute disclosure. Primary sort key.
   */
  modelCount: number;
  /**
   * Compute-known model count — rows with training compute estimates.
   * This was the old `modelCount` before the full-catalog expansion.
   */
  computeKnownCount: number;
  /**
   * Frontier-flagged model count (compute-known subset only).
   * Reflects top-10 training compute at release — not capability or impact.
   */
  frontierCount: number;
  /**
   * Full-catalog models published within the 3-year recent window.
   * Reflects current tracked-output activity.
   */
  recentCount: number;
  /**
   * Full-catalog models with confirmed open weights ("Open model weights?" = Yes).
   * Proxy for tracked open-release activity only.
   */
  openWeightsCount: number;
  /** Peak training compute FLOP (compute-known subset). Zero when no compute estimates exist. */
  maxComputeFlop: number;
  latestDate: string;
  /** Median log10(compute) across compute-known models, or null if none. */
  medianLog10Compute: number | null;
}

export interface CountryLeaderboardEntry {
  country: string;
  /** Short display name (e.g. "United States" for "United States of America"). */
  countryShort: string;
  /**
   * ISO-3166-1 alpha-3 code used purely as a geographic join key for the world
   * map. Derived deterministically at build time from `country` and gated on
   * presence in public/world-countries.geo.json. It carries NO capability,
   * impact, or ranking meaning. Null for multinational/aggregate entities and
   * for countries with no polygon on the map (e.g. city-states).
   */
  iso3: string | null;
  /**
   * Full-catalog model count — all dated Epoch AI rows attributed to this country,
   * regardless of compute disclosure.
   */
  modelCount: number;
  /**
   * Compute-known model count — rows with training compute estimates.
   * This was the old `modelCount` before the full-catalog expansion.
   */
  computeKnownCount: number;
  /**
   * Frontier-flagged model count (compute-known subset only).
   * Provided for historical context; not the default sort key.
   */
  frontierCount: number;
  /**
   * Full-catalog models published within the 3-year recent window.
   * Default sort key — reflects current tracked-output activity.
   */
  recentCount: number;
  /**
   * Full-catalog models with confirmed open weights.
   * Proxy for tracked open-release activity only.
   */
  openWeightsCount: number;
  /** Peak training compute FLOP (compute-known subset). Zero when no compute estimates exist. */
  maxComputeFlop: number;
  orgCount: number;
}

export interface AccessibilityMix {
  openWeights: number;
  closed: number;
  unknown: number;
}

/**
 * Geographic-safe projection of a CountryLeaderboardEntry for the world-map
 * choropleth. Exposes only the full-catalog country-fair metrics plus the
 * `iso3` join key — deliberately omits compute-known/frontier/maxComputeFlop so
 * the map cannot be read as a compute/capability ranking.
 */
export interface CountryGeoEntry {
  country: string;
  countryShort: string;
  /** ISO-3 join key — always non-null on entries returned by getCountryLeaderboardGeo(). */
  iso3: string;
  /** Full-catalog model count (all dated rows attributed to this country). */
  modelCount: number;
  /** Full-catalog models published within the 3-year recent window. */
  recentCount: number;
  /** Full-catalog models with confirmed open weights. */
  openWeightsCount: number;
  /** Distinct organizations attributed to this country. */
  orgCount: number;
}

/** How many country leaderboard entries carry a plottable `iso3` join key. */
export interface CountryGeoCoverage {
  mapped: number;
  unmapped: number;
  total: number;
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
  /** Country → world-map geo join coverage (mapped/unmapped/total). */
  countryGeoCoverage: CountryGeoCoverage;
  /**
   * Open-weights breakdown across compute-known rows only (backward compat).
   * Use `fullCatalogAccessibilityMix` for full dated-catalog coverage.
   */
  accessibilityMix: AccessibilityMix;
  /** Open-weights breakdown across all dated-catalog rows. */
  fullCatalogAccessibilityMix: AccessibilityMix;
  domainMix: DomainMixEntry[];
}

export interface AIFrontierData {
  generatedAt: string;
  source: AIFrontierSource;
  methodology: AIFrontierMethodology;
  definitions: AIFrontierDefinitions;
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

/** All compute-known models with valid date, sorted ascending by date. */
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

/**
 * Top N organizations by full-catalog model count (default 20, capped at available rows).
 * modelCount reflects all dated Epoch AI rows, not just compute-known rows.
 */
export function getOrgLeaderboard(limit = 20): OrgLeaderboardEntry[] {
  return data.aggregates.orgLeaderboard.slice(0, Math.max(1, limit));
}

/**
 * All countries with at least one dated model, sorted by recentCount descending.
 * recentCount = full-catalog models in the 3-year recent window.
 */
export function getCountryLeaderboard(): CountryLeaderboardEntry[] {
  return data.aggregates.countryLeaderboard;
}

/**
 * Country entries plottable on the world map — only those with a non-null
 * `iso3` join key — preserving the default recentCount-descending order.
 *
 * Returns a geographic-safe projection (CountryGeoEntry) that carries only the
 * full-catalog country-fair metrics (modelCount, recentCount, openWeightsCount,
 * orgCount) plus the iso3/country labels. It deliberately omits
 * compute-known/frontier/maxComputeFlop so the choropleth cannot be misread as a
 * compute or capability ranking. iso3 is purely a geographic join key.
 */
export function getCountryLeaderboardGeo(): CountryGeoEntry[] {
  return data.aggregates.countryLeaderboard
    .filter((c): c is CountryLeaderboardEntry & { iso3: string } => c.iso3 !== null)
    .map((c) => ({
      country: c.country,
      countryShort: c.countryShort,
      iso3: c.iso3,
      modelCount: c.modelCount,
      recentCount: c.recentCount,
      openWeightsCount: c.openWeightsCount,
      orgCount: c.orgCount,
    }));
}

/**
 * Country → world-map geo join coverage (mapped/unmapped/total).
 * Lets the UI show a "N of M countries plotted" coverage note.
 */
export function getCountryGeoCoverage(): CountryGeoCoverage {
  return { ...data.aggregates.countryGeoCoverage };
}

/**
 * Top N organizations by recent full-catalog activity (recentCount desc).
 * Useful for showing which orgs are most active in the recent window.
 */
export function getRecentlyActiveOrgs(limit = 20): OrgLeaderboardEntry[] {
  return data.aggregates.orgLeaderboard
    .slice()
    .sort(
      (a, b) =>
        b.recentCount - a.recentCount ||
        b.modelCount - a.modelCount ||
        a.organization.localeCompare(b.organization),
    )
    .slice(0, Math.max(1, limit));
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

/** Domain distribution across compute-known models, sorted by count desc. */
export function getDomainMix(): DomainMixEntry[] {
  return data.aggregates.domainMix;
}

/**
 * Open-weights / closed / unknown breakdown across compute-known models.
 * Use `getFullCatalogAccessibilityMix()` for full dated-catalog coverage.
 */
export function getAccessibilityMix(): AccessibilityMix {
  return { ...data.aggregates.accessibilityMix };
}

/**
 * Open-weights / closed / unknown breakdown across all dated-catalog rows.
 * Includes models without compute estimates.
 */
export function getFullCatalogAccessibilityMix(): AccessibilityMix {
  return { ...data.aggregates.fullCatalogAccessibilityMix };
}

/** Methodological definitions and disclosure text for metric dimensions. */
export function getDefinitions(): AIFrontierDefinitions {
  return data.definitions;
}

/**
 * Recent window metadata (start/end dates, years back).
 * Useful for rendering "last N years" labels in the UI.
 */
export function getRecentWindow(): AIFrontierRecentWindow | null {
  return data.methodology.recentWindow ?? null;
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
