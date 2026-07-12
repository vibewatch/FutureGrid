import provenanceRegistry from "@/data/provenance.json";

/**
 * lib/provenance.ts
 *
 * Typed loader over the central provenance registry (data/provenance.json,
 * built by scripts/build-provenance.mjs, issue #52).
 *
 * This is the single source of truth for "when was each dataset last refreshed
 * and where did it come from". It is consumed by the UI provenance badge and
 * the future methodology changelog (issue #57), so the surface is deliberately
 * small and stable.
 */

/** A normalized data source descriptor. */
export interface ProvenanceSource {
  name?: string;
  publisher?: string;
  url?: string;
}

/** Provenance metadata for a single dataset. */
export interface DatasetProvenance {
  /** Stable id (the data file basename without extension), e.g. "warn-notices". */
  id: string;
  /** Repo-relative path, e.g. "data/warn-notices.json". */
  file: string;
  /** ISO-8601 timestamp the dataset file was produced. */
  generatedAt: string;
  /** Period the data describes ("as of"), e.g. "2025" or an ISO date. */
  asOf: string | null;
  /** Where the data came from — an object descriptor or a free-form string. */
  source: ProvenanceSource | string | null;
  /** Meta-contract version for this entry. */
  version: string;
  /** Primary record count, when the dataset is row-oriented. */
  rows: number | null;
}

/** The whole registry as written to data/provenance.json. */
export interface ProvenanceRegistry {
  /** ISO-8601 timestamp the registry itself was generated. */
  generatedAt: string;
  datasets: DatasetProvenance[];
}

const registry = provenanceRegistry as ProvenanceRegistry;

/** Every dataset's provenance, in registry order. */
export const datasets: DatasetProvenance[] = registry.datasets;

/** ISO-8601 timestamp when the provenance registry itself was generated. */
export const registryGeneratedAt: string = registry.generatedAt;

const byId = new Map<string, DatasetProvenance>(
  registry.datasets.map((d) => [d.id, d]),
);

/** Look up a single dataset's provenance by id, or `undefined` if unknown. */
export function getDatasetProvenance(
  datasetId: string,
): DatasetProvenance | undefined {
  return byId.get(datasetId);
}

/**
 * The `asOf` value for a dataset (the period the data describes), or `null`
 * when the dataset is unknown or carries no `asOf`.
 */
export function getDataAsOf(datasetId: string): string | null {
  return byId.get(datasetId)?.asOf ?? null;
}

/**
 * The `generatedAt` timestamp for a dataset, or `null` when the dataset is
 * unknown.
 */
export function getDataGeneratedAt(datasetId: string): string | null {
  return byId.get(datasetId)?.generatedAt ?? null;
}

/**
 * Parse an asOf label to its latest representable calendar date for ordering.
 * This function is comparison-only — it never modifies the original string.
 *
 * Recognized canonical forms (Node 20 compatible):
 *   YYYY-MM-DD  → that UTC date
 *   YYYY-MM     → last day of that month (UTC)
 *   YYYY        → Dec 31 of that year (UTC)
 *   FY2025 / FY 2025 → Sep 30 of the fiscal year (US federal FY end)
 *
 * Returns null for projection windows (e.g. "2024-2034"), free-form text, or
 * any other unrecognized form.  Unknown labels are intentionally not assigned
 * a date so they can never be falsely promoted as "newest".
 *
 * Assumption: US fiscal year ends Sep 30 (documented here for transparency).
 * This is used for ordering only; display strings are never rewritten.
 */
export function asOfToComparableDate(asOf: string): Date | null {
  const s = asOf.trim();

  // US fiscal year: FY2025 or FY 2025 (case-insensitive)
  const fyMatch = /^FY\s*(\d{4})$/i.exec(s);
  if (fyMatch) {
    const year = parseInt(fyMatch[1], 10);
    // US federal FY ends Sep 30; use that date for chronological ordering.
    return new Date(Date.UTC(year, 8, 30)); // month index 8 = September
  }

  // Full ISO date YYYY-MM-DD (months 01–12, days 01–31)
  if (/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(s)) {
    const d = new Date(s + "T00:00:00Z");
    return isNaN(d.getTime()) ? null : d;
  }

  // Partial date YYYY-MM with valid month (01–12).
  // This also excludes projection windows like "2024-2034" since 34 > 12.
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) {
    const [yr, mo] = s.split("-").map(Number);
    // day=0 of month (mo + 1) resolves to the last day of month mo
    const d = new Date(Date.UTC(yr, mo, 0));
    return isNaN(d.getTime()) ? null : d;
  }

  // Plain 4-digit calendar year
  if (/^\d{4}$/.test(s)) {
    const year = parseInt(s, 10);
    return new Date(Date.UTC(year, 11, 31)); // Dec 31
  }

  // Everything else: projection windows ("2024-2034"), free-form text, etc.
  return null;
}

/**
 * Return the chronologically latest asOf label from a collection of candidates.
 * Preserves the original display string — selection is done by calendar date,
 * but the winner's label is returned verbatim.
 *
 * - Recognized forms (YYYY-MM-DD, YYYY-MM, YYYY, FY YYYY) are ranked by their
 *   calendar end-date via asOfToComparableDate.
 * - Unrecognized labels (projection windows, free-form text) are skipped when
 *   any recognized label is available — they never win over a recognized date.
 * - When NO recognized label is present, the first non-null value is returned
 *   as a deterministic fallback so projection windows (e.g. "2024-2034")
 *   remain displayable.  No recency claim is implied.
 * - Returns null only when all candidates are null.
 */
export function selectLatestAsOf(
  values: ReadonlyArray<string | null>,
): string | null {
  let bestLabel: string | null = null;
  let bestTime = -Infinity;
  let firstNonNull: string | null = null;

  for (const v of values) {
    if (v === null) continue;
    if (firstNonNull === null) firstNonNull = v;
    const d = asOfToComparableDate(v);
    if (d === null) continue; // unrecognized — skip during ordered selection
    const t = d.getTime();
    if (t > bestTime) {
      bestTime = t;
      bestLabel = v;
    }
  }

  // Return the best recognized label, or the first non-null as a display
  // fallback (e.g. "2024-2034" projection windows still render in badges).
  return bestLabel ?? firstNonNull;
}

/**
 * The overall latest `asOf` across all datasets (chronologically latest by
 * calendar date), or `null` when none present.  Uses asOfToComparableDate so
 * FY labels and projection windows are handled correctly.
 */
export function getLatestAsOf(): string | null {
  return selectLatestAsOf(registry.datasets.map((d) => d.asOf));
}

/** The overall most-recent `generatedAt` across all datasets. */
export function getLatestGeneratedAt(): string | null {
  let latest: string | null = null;
  for (const d of registry.datasets) {
    if (d.generatedAt && (latest === null || d.generatedAt > latest)) {
      latest = d.generatedAt;
    }
  }
  return latest;
}

export default registry;
