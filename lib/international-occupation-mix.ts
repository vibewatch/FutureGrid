/**
 * Canonical server-only helper for the ILOSTAT international occupation-mix dataset.
 *
 * Returns fresh, immutable, serializable data derived from
 * data/international-occupation-mix.json. Never imported by client components;
 * the `import "server-only"` guard enforces this at build time.
 *
 * Consumers: server components, API routes, and other server-side helpers.
 * Classification: ISCO-08 major groups 1–9, total sex, annual.
 */

import "server-only";

import rawData from "@/data/international-occupation-mix.json";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OccupationMixMeta {
  generatedAt: string;
  asOf: string;
  source: {
    name?: string;
    publisher?: string;
    url?: string;
  } | string | null;
  version: string;
}

export interface OccupationMixSource {
  name: string;
  indicator: string;
  dataflow: string;
  accessEndpoint: string;
  license: string;
  licenseUrl: string;
  publisher: string;
  publisherUrl: string;
  accessDate: string;
}

export interface OccupationMixCoverage {
  classification: string;
  sex: string;
  frequency: string;
  datasetLatestYear: number;
  withinYearsWindow: number;
  minGroupCoverageRatio: number;
  minGroupCount: number;
  includedCount: number;
  excludedCount: number;
}

export interface OccupationMixGroup {
  label: string;
  /** Employment in thousands (native ILOSTAT unit). */
  employment: number;
  /** Share of total national employment (0–1). */
  share: number;
}

export interface OccupationMixCountry {
  iso3: string;
  name: string;
  year: number;
  iloSource: string;
  observationStatuses: string[];
  noteIndicators: string[];
  /** Total employment (thousands). */
  totalEmployment: number;
  /** Fraction of total covered by ISCO-08 groups 1–9. */
  groupCoverageRatio: number;
  /** ISCO-08 groups 1–9. */
  groups: Record<string, OccupationMixGroup>;
}

export interface OccupationMixExcluded {
  iso3: string;
  name: string;
  reason: string;
  latestYear: number | null;
}

export interface OccupationMixDissimilarity {
  method: string;
  note: string;
  /** Keys are "ISO3_ISO3" pairs (alphabetical order), values are dissimilarity (0–1). */
  pairs: Record<string, number>;
}

export interface OccupationMixDataset {
  meta: OccupationMixMeta;
  source: OccupationMixSource;
  coverage: OccupationMixCoverage;
  included: string[];
  excluded: OccupationMixExcluded[];
  countries: Record<string, OccupationMixCountry>;
  dissimilarity: OccupationMixDissimilarity;
}

// ─── Compact client-safe types ────────────────────────────────────────────────

/**
 * Minimal country record suitable for passing to client components.
 * Contains only serializable primitives — no raw employment totals that
 * could carry PII or large payload weight.
 */
export interface OccupationMixCountrySlim {
  iso3: string;
  name: string;
  year: number;
  /** ISCO-08 group shares (0–1), keyed "1"–"9". */
  shares: Record<string, number>;
  /** Labels for ISCO-08 groups, keyed "1"–"9". */
  labels: Record<string, string>;
  /** ILOSTAT observation-status codes present in this country's data. */
  observationStatuses?: string[];
  /** ILOSTAT note-indicator codes attached to this country's data. */
  noteIndicators?: string[];
  /** Fraction of total employment covered by ISCO-08 groups 1–9. */
  groupCoverageRatio?: number;
}

export interface OccupationMixSlim {
  generatedAt: string;
  datasetLatestYear: number;
  classification: string;
  countries: OccupationMixCountrySlim[];
  excluded: { iso3: string; name: string; reason: string }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const _data = rawData as unknown as OccupationMixDataset;

/**
 * Return the full immutable dataset. Server-only; do not forward to client
 * components without narrowing to compact types.
 */
export function getInternationalOccupationMixData(): OccupationMixDataset {
  return _data;
}

/**
 * Return compact, client-safe derived data containing only shares and labels.
 * Safe to pass as a serializable prop to client components.
 */
export function getOccupationMixSlim(): OccupationMixSlim {
  const countries: OccupationMixCountrySlim[] = _data.included.map((iso3) => {
    const c = _data.countries[iso3];
    const shares: Record<string, number> = {};
    const labels: Record<string, string> = {};
    for (const g of Object.keys(c.groups)) {
      shares[g] = c.groups[g].share;
      labels[g] = c.groups[g].label;
    }
    return {
        iso3,
        name: c.name,
        year: c.year,
        shares,
        labels,
        observationStatuses: [...c.observationStatuses],
        noteIndicators: [...c.noteIndicators],
        groupCoverageRatio: c.groupCoverageRatio,
      };
  });

  return {
    generatedAt: _data.meta.generatedAt,
    datasetLatestYear: _data.coverage.datasetLatestYear,
    classification: _data.coverage.classification,
    countries,
    excluded: _data.excluded.map((e) => ({
      iso3: e.iso3,
      name: e.name,
      reason: e.reason,
    })),
  };
}

/**
 * Return the OccupationMixCountry record for a specific ISO3 code, or null
 * if the country was excluded or not in the seed universe.
 */
export function getOccupationMixCountry(iso3: string): OccupationMixCountry | null {
  return _data.countries[iso3] ?? null;
}

/**
 * Return the ISCO-08 group shares (0–1) for a specific country, or null if
 * the country is not included.
 */
export function getOccupationMixShares(iso3: string): Record<string, number> | null {
  const c = _data.countries[iso3];
  if (!c) return null;
  const shares: Record<string, number> = {};
  for (const g of Object.keys(c.groups)) {
    shares[g] = c.groups[g].share;
  }
  return shares;
}

/**
 * Return the pairwise dissimilarity value for two countries, or null if either
 * country was excluded. The pair key is always alphabetical (e.g. "AUS_DEU").
 *
 * D = 0.5 * sum(|share_i_A - share_i_B|) — ranges 0 (identical) to 1 (completely different).
 * Descriptive only; no ranking implied.
 */
export function getOccupationMixDissimilarity(iso3A: string, iso3B: string): number | null {
  const key =
    iso3A < iso3B ? `${iso3A}_${iso3B}` : `${iso3B}_${iso3A}`;
  return _data.dissimilarity.pairs[key] ?? null;
}

/**
 * Return all pairwise dissimilarity values for a given country against all
 * other included countries, sorted by dissimilarity ascending.
 * Descriptive only; no ranking implied.
 */
export function getOccupationMixDissimilarityForCountry(
  iso3: string
): Array<{ iso3: string; name: string; dissimilarity: number }> {
  return _data.included
    .filter((other) => other !== iso3)
    .map((other) => ({
      iso3: other,
      name: _data.countries[other]?.name ?? other,
      dissimilarity: getOccupationMixDissimilarity(iso3, other) ?? NaN,
    }))
    .filter((r) => Number.isFinite(r.dissimilarity))
    .sort((a, b) => a.dissimilarity - b.dissimilarity);
}
