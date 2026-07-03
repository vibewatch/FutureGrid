import { getCountryMapData, type CountryMapDatum } from "@/lib/data";

const GAP_THRESHOLD = 15;
const BALANCED_LEADER_MIN_PERCENTILE = 66;

export type ReadinessGapQuadrant =
  | "adoption-outpacing-readiness"
  | "latent-capacity"
  | "balanced-leader"
  | "balanced-watchlist";

export interface ReadinessGapCountry {
  iso3: string;
  name: string;
  diffusionPct: number;
  diffusionDelta: number | null;
  aiReadiness: number;
  readinessScore: number;
  adoptionPercentile: number;
  readinessPercentile: number;
  gap: number;
  quadrant: ReadinessGapQuadrant;
}

export interface ReadinessGapSummary {
  totalCountries: number;
  rankableCountries: number;
  coveragePct: number;
  averageGap: number;
  medianGap: number;
  adoptionOutpacingReadinessCount: number;
  latentCapacityCount: number;
  balancedLeaderCount: number;
  topAdoptionOutpacingReadiness: ReadinessGapSummaryCountry | null;
  topLatentCapacity: ReadinessGapSummaryCountry | null;
}

export interface ReadinessGapSummaryCountry {
  iso3: string;
  name: string;
  gap: number;
}

export interface ReadinessGapMethodology {
  inputs: string[];
  ranking: string;
  scoring: string;
  quadrants: string;
  exclusions: string;
  caveats: string[];
}

export interface ReadinessGapData {
  countries: ReadinessGapCountry[];
  adoptionOutpacingReadiness: ReadinessGapCountry[];
  latentCapacity: ReadinessGapCountry[];
  balancedLeaders: ReadinessGapCountry[];
  summary: ReadinessGapSummary;
  methodology: ReadinessGapMethodology;
}

type RankableCountryMapDatum = CountryMapDatum & {
  diffusionPct: number;
  aiReadiness: number;
};

export function getReadinessGapData(): ReadinessGapData {
  const allCountries = getCountryMapData();
  const rankableCountries = allCountries.filter(isRankableCountry);
  const adoptionPercentiles = percentileByIso(rankableCountries, (country) => country.diffusionPct);
  const readinessPercentiles = percentileByIso(rankableCountries, (country) => country.aiReadiness);

  const countries = rankableCountries
    .map((country) => {
      const adoptionPercentile = requiredPercentile(adoptionPercentiles, country.iso3, "adoption");
      const readinessPercentile = requiredPercentile(readinessPercentiles, country.iso3, "readiness");
      const gap = round2(adoptionPercentile - readinessPercentile);

      return {
        iso3: country.iso3,
        name: country.name,
        diffusionPct: country.diffusionPct,
        diffusionDelta: country.diffusionDelta,
        aiReadiness: country.aiReadiness,
        readinessScore: country.aiReadiness * 100,
        adoptionPercentile,
        readinessPercentile,
        gap,
        quadrant: classifyQuadrant(adoptionPercentile, readinessPercentile, gap),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.iso3.localeCompare(b.iso3));

  const adoptionOutpacingReadiness = countries
    .filter((country) => country.quadrant === "adoption-outpacing-readiness")
    .sort(compareAdoptionOutpacing);
  const latentCapacity = countries
    .filter((country) => country.quadrant === "latent-capacity")
    .sort(compareLatentCapacity);
  const balancedLeaders = countries
    .filter((country) => country.quadrant === "balanced-leader")
    .sort(compareBalancedLeaders);

  return {
    countries: countries.map(cloneCountry),
    adoptionOutpacingReadiness: adoptionOutpacingReadiness.map(cloneCountry),
    latentCapacity: latentCapacity.map(cloneCountry),
    balancedLeaders: balancedLeaders.map(cloneCountry),
    summary: buildSummary(
      allCountries.length,
      countries,
      adoptionOutpacingReadiness,
      latentCapacity,
      balancedLeaders,
    ),
    methodology: buildMethodology(rankableCountries.length),
  };
}

function isRankableCountry(country: CountryMapDatum): country is RankableCountryMapDatum {
  return (
    typeof country.diffusionPct === "number" &&
    Number.isFinite(country.diffusionPct) &&
    typeof country.aiReadiness === "number" &&
    Number.isFinite(country.aiReadiness)
  );
}

function percentileByIso(
  countries: RankableCountryMapDatum[],
  valueOf: (country: RankableCountryMapDatum) => number,
): Map<string, number> {
  const sorted = countries
    .map((country) => ({ iso3: country.iso3, value: valueOf(country) }))
    .sort((a, b) => a.value - b.value || a.iso3.localeCompare(b.iso3));
  const percentiles = new Map<string, number>();

  if (sorted.length === 0) return percentiles;
  if (sorted.length === 1) {
    percentiles.set(sorted[0].iso3, 100);
    return percentiles;
  }

  let start = 0;
  while (start < sorted.length) {
    let end = start;
    while (end + 1 < sorted.length && sorted[end + 1].value === sorted[start].value) {
      end++;
    }

    const averageZeroBasedRank = (start + end) / 2;
    const percentile = round2((averageZeroBasedRank / (sorted.length - 1)) * 100);
    for (let index = start; index <= end; index++) {
      percentiles.set(sorted[index].iso3, percentile);
    }
    start = end + 1;
  }

  return percentiles;
}

function requiredPercentile(percentiles: Map<string, number>, iso3: string, label: string): number {
  const percentile = percentiles.get(iso3);
  if (percentile === undefined) {
    throw new Error(`Missing ${label} percentile for ${iso3}`);
  }
  return percentile;
}

function classifyQuadrant(
  adoptionPercentile: number,
  readinessPercentile: number,
  gap: number,
): ReadinessGapQuadrant {
  if (gap >= GAP_THRESHOLD) return "adoption-outpacing-readiness";
  if (gap <= -GAP_THRESHOLD) return "latent-capacity";
  if (
    adoptionPercentile >= BALANCED_LEADER_MIN_PERCENTILE &&
    readinessPercentile >= BALANCED_LEADER_MIN_PERCENTILE
  ) {
    return "balanced-leader";
  }
  return "balanced-watchlist";
}

function compareAdoptionOutpacing(a: ReadinessGapCountry, b: ReadinessGapCountry): number {
  return (
    b.gap - a.gap ||
    b.adoptionPercentile - a.adoptionPercentile ||
    a.name.localeCompare(b.name) ||
    a.iso3.localeCompare(b.iso3)
  );
}

function compareLatentCapacity(a: ReadinessGapCountry, b: ReadinessGapCountry): number {
  return (
    a.gap - b.gap ||
    b.readinessPercentile - a.readinessPercentile ||
    a.name.localeCompare(b.name) ||
    a.iso3.localeCompare(b.iso3)
  );
}

function compareBalancedLeaders(a: ReadinessGapCountry, b: ReadinessGapCountry): number {
  return (
    leaderScore(b) - leaderScore(a) ||
    Math.min(b.adoptionPercentile, b.readinessPercentile) -
      Math.min(a.adoptionPercentile, a.readinessPercentile) ||
    a.name.localeCompare(b.name) ||
    a.iso3.localeCompare(b.iso3)
  );
}

function leaderScore(country: ReadinessGapCountry): number {
  return country.adoptionPercentile + country.readinessPercentile;
}

function buildSummary(
  totalCountries: number,
  countries: ReadinessGapCountry[],
  adoptionOutpacingReadiness: ReadinessGapCountry[],
  latentCapacity: ReadinessGapCountry[],
  balancedLeaders: ReadinessGapCountry[],
): ReadinessGapSummary {
  return {
    totalCountries,
    rankableCountries: countries.length,
    coveragePct: totalCountries > 0 ? round2((countries.length / totalCountries) * 100) : 0,
    averageGap: average(countries.map((country) => country.gap)),
    medianGap: median(countries.map((country) => country.gap)),
    adoptionOutpacingReadinessCount: adoptionOutpacingReadiness.length,
    latentCapacityCount: latentCapacity.length,
    balancedLeaderCount: balancedLeaders.length,
    topAdoptionOutpacingReadiness: summaryCountry(adoptionOutpacingReadiness[0]),
    topLatentCapacity: summaryCountry(latentCapacity[0]),
  };
}

function buildMethodology(rankableCountryCount: number): ReadinessGapMethodology {
  return {
    inputs: [
      "diffusionPct from the existing global country map helper: Microsoft Q1 2026 generative-AI diffusion, measured as a percent of working-age population.",
      "aiReadiness from the existing global country map helper: IMF AI Preparedness Index on a 0–1 capacity scale; readinessScore is aiReadiness × 100.",
      "diffusionDelta is carried through when the existing helper has a H1 2025 to Q1 2026 percentage-point change; otherwise it remains null.",
    ],
    ranking: `${rankableCountryCount} countries with both diffusionPct and aiReadiness are ranked separately by metric using tie-aware percentile ranks from 0 to 100.`,
    scoring:
      "gap = adoptionPercentile − readinessPercentile. The lens compares relative ranks only; it does not average unlike units, fit regressions, or forecast adoption.",
    quadrants:
      "adoption-outpacing-readiness means gap ≥ 15; latent-capacity means gap ≤ -15; balanced-leader means both percentiles are at least 66 with no material gap; all other rows are balanced-watchlist.",
    exclusions:
      "Claude API-session indexes and other proxy telemetry are not used in the readiness-gap score.",
    caveats: [
      "The lens is descriptive and cross-sectional; it is intended to reveal adoption-capacity gaps, not causal effects.",
      "Diffusion and readiness have different sources, vintages, and denominators, so percentile ranks are safer than unit averaging.",
    ],
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return round2(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return round2(sorted[middle]);
  return round2((sorted[middle - 1] + sorted[middle]) / 2);
}

function summaryCountry(country: ReadinessGapCountry | undefined): ReadinessGapSummaryCountry | null {
  if (!country) return null;
  return {
    iso3: country.iso3,
    name: country.name,
    gap: country.gap,
  };
}

function cloneCountry(country: ReadinessGapCountry): ReadinessGapCountry {
  return { ...country };
}

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
