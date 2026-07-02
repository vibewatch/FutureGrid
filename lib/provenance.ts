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
 * The overall latest `asOf` across all datasets (lexicographically max, which
 * is chronological for ISO-8601 / year strings), or `null` when none present.
 */
export function getLatestAsOf(): string | null {
  let latest: string | null = null;
  for (const d of registry.datasets) {
    if (d.asOf && (latest === null || d.asOf > latest)) latest = d.asOf;
  }
  return latest;
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
