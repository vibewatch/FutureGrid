/**
 * Wage-Tier AI-Exposure Polarization — server-only derived data helper.
 *
 * Partitions the occupation-snapshot universe (medianSalary > 0, finite
 * aiExposure, employment > 0) into employment-weighted wage terciles, then
 * cross-tabulates by AI-exposure band. Answers: "Is AI exposure concentrated
 * in low-, middle-, or high-wage work — and how much of the workforce sits in
 * each exposure band within each tier?"
 *
 * Framing: descriptive cross-sectional snapshot only. aiExposure is a modelled
 * proxy; association ≠ causation; tiers are constructed equal-employment thirds.
 *
 * Intended consumers: Neo (WageTierPolarizationLens), Mouse (tests).
 * No source formulas are re-implemented; values derive solely from
 * occupation-snapshot-slim.json (OEWS wages/employment + modelled exposure).
 *
 * Bundle boundary: this module is guarded by import "server-only". No
 * component in components/sectors/* may runtime-import this module or any
 * @/data/*.json file. Pass only the resolved WageTierPolarization value as a
 * prop across the server/client boundary.
 */

import "server-only";

import occupationSnapshotSlim from "@/data/occupation-snapshot-slim.json";

// ─── Internal snapshot type ──────────────────────────────────────────────────

interface SlimRow {
  socCode: string;
  title: string;
  sector: string;
  aiExposure: number;
  medianSalary: number;
  employment: number | null;
}

const _snapshot = (
  occupationSnapshotSlim as { data: SlimRow[] }
).data;

// ─── Exported types ──────────────────────────────────────────────────────────

export type WageTierId = "low" | "middle" | "high";
export type ExposureBandId = "minimal" | "low" | "moderate" | "elevated";

/** Half-open interval [min, max) defining an AI-exposure band on a 0–1 scale. */
export interface ExposureBandDef {
  id: ExposureBandId;
  /** Inclusive lower bound. */
  min: number;
  /** Exclusive upper bound (use ≥ 1.0 sentinel for the topmost band). */
  max: number;
}

/** Employment and occupation-count breakdown for one band within one wage tier. */
export interface WageTierBandCell {
  band: ExposureBandId;
  employment: number;
  /** Band employment as a share of the enclosing tier's employment (0–1). */
  employmentShare: number;
  occupationCount: number;
  /** Band occupation count as a share of the enclosing tier's occupation count (0–1). */
  occupationShare: number;
}

/** One employment-weighted wage tercile with cross-tabulated exposure bands. */
export interface WageTier {
  id: WageTierId;
  /** Minimum medianSalary (USD) among occupations assigned to this tier. */
  wageFloor: number;
  /** Maximum medianSalary (USD) among occupations assigned to this tier. */
  wageCeiling: number;
  /** Total employment headcount across occupations in this tier. */
  employment: number;
  /** This tier's employment as a share of total tiered employment (0–1). */
  employmentShare: number;
  /** Count of distinct occupations in this tier. */
  occupationCount: number;
  /** Employment-weighted mean aiExposure: Σ(emp·exp) / Σemp. */
  weightedMeanExposure: number;
  /** Simple (unweighted) mean aiExposure: Σ(exp) / occupationCount. */
  meanExposure: number;
  /**
   * Four exposure-band cells, always present (zero-filled when empty).
   * Ordered: minimal → low → moderate → elevated.
   */
  bands: WageTierBandCell[];
}

export interface WageTierPolarizationSummary {
  /** Count of occupations passing all inclusion filters (salary, exposure, employment). */
  includedOccupations: number;
  /** Total employment across included occupations. */
  totalEmployment: number;
  /** Occupations excluded because employment was null/NaN/non-positive. */
  excludedForMissingEmployment: number;
  /** Occupations excluded because medianSalary or aiExposure was non-finite. */
  excludedForMissingSalaryOrExposure: number;
  /** Employment-weighted mean aiExposure across the entire included universe (0–1). */
  overallWeightedMeanExposure: number;
  /** Difference: high-tier weightedMeanExposure − low-tier weightedMeanExposure (pp). */
  highMinusLowExposureGap: number;
}

export interface WageTierPolarizationMethodology {
  label: string;
  description: string;
  /** Interpretive and data-quality caveats for visible UI disclosure. */
  caveats: string[];
  /** Provenance badge IDs following existing conventions (see lib/provenance.ts). */
  datasetBadgeIds: string[];
  /** Ordered band definitions (same across all tiers). */
  bands: ExposureBandDef[];
  tierMethod: "employment-weighted-tercile";
}

/** Top-level return type from getWageTierPolarization(). */
export interface WageTierPolarization {
  /** Three wage tiers ordered low → middle → high. */
  tiers: WageTier[];
  summary: WageTierPolarizationSummary;
  methodology: WageTierPolarizationMethodology;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TIER_IDS: WageTierId[] = ["low", "middle", "high"];

const BAND_DEFS: ExposureBandDef[] = [
  { id: "minimal",  min: 0,    max: 0.05 },
  { id: "low",      min: 0.05, max: 0.15 },
  { id: "moderate", min: 0.15, max: 0.30 },
  { id: "elevated", min: 0.30, max: 1.0  },
];

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Clamp n to [lo, hi]. */
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Assign an aiExposure value (0–1) to one of the four band indices (0–3). */
function bandIndex(exposure: number): number {
  if (exposure < 0.05) return 0; // minimal
  if (exposure < 0.15) return 1; // low
  if (exposure < 0.30) return 2; // moderate
  return 3;                       // elevated [0.30, 1]
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Returns a fresh, immutable WageTierPolarization object computed from the
 * occupation-snapshot universe.
 *
 * Universe: rows with finite medianSalary > 0, finite aiExposure, and finite
 * positive employment — currently 755 occupations (1 excluded for missing
 * employment). The same 755-row universe and tier boundaries back both the
 * employment-weighted and occupation-count views so that tier composition is
 * stable regardless of toggle state.
 *
 * Tier assignment: deterministic employment-weighted tercile. Sort rows by
 * (medianSalary ASC, socCode ASC); assign each whole occupation to
 *   tier = clamp(floor(3 · (cumEmpBefore + emp/2) / totalEmp), 0, 2).
 *
 * Call from a Server Component at build time. The function performs the full
 * calculation on every call (no shared module cache) so that each call returns
 * a structurally independent object — mutations to one result never affect
 * another.
 */
export function getWageTierPolarization(): WageTierPolarization {
  // ── 1. Classify rows ───────────────────────────────────────────────────────
  let excludedForMissingEmployment = 0;
  let excludedForMissingSalaryOrExposure = 0;

  const included: SlimRow[] = [];
  for (const row of _snapshot) {
    const salOk = Number.isFinite(row.medianSalary) && row.medianSalary > 0;
    const expOk = Number.isFinite(row.aiExposure);
    const empOk =
      row.employment != null &&
      Number.isFinite(row.employment) &&
      row.employment > 0;

    if (!salOk || !expOk) {
      excludedForMissingSalaryOrExposure++;
    } else if (!empOk) {
      excludedForMissingEmployment++;
    } else {
      included.push(row);
    }
  }

  // ── 2. Sort deterministically: salary ASC then socCode ASC ────────────────
  included.sort((a, b) =>
    a.medianSalary !== b.medianSalary
      ? a.medianSalary - b.medianSalary
      : a.socCode.localeCompare(b.socCode)
  );

  // ── 3. Compute total employment ────────────────────────────────────────────
  const totalEmployment = included.reduce(
    (sum, r) => sum + (r.employment as number),
    0
  );

  // ── 4. Assign each occupation to a tier ────────────────────────────────────
  // tier[i] accumulates: employment, salary bounds, exposure sums, band counts
  type TierAccum = {
    employment: number;
    occupationCount: number;
    wageFloor: number;
    wageCeiling: number;
    weightedExpSum: number; // Σ(emp·exp)
    expSum: number;         // Σ(exp) for unweighted mean
    bandEmp: number[];      // [4] employment per band
    bandOcc: number[];      // [4] occupation count per band
  };

  const accums: TierAccum[] = TIER_IDS.map(() => ({
    employment: 0,
    occupationCount: 0,
    wageFloor: Infinity,
    wageCeiling: -Infinity,
    weightedExpSum: 0,
    expSum: 0,
    bandEmp: [0, 0, 0, 0],
    bandOcc: [0, 0, 0, 0],
  }));

  let cumEmpBefore = 0;
  for (const row of included) {
    const emp = row.employment as number;
    const midpoint = cumEmpBefore + emp / 2;
    const tierIdx = clamp(
      Math.floor((3 * midpoint) / totalEmployment),
      0,
      2
    );
    const acc = accums[tierIdx];
    const bi = bandIndex(row.aiExposure);

    acc.employment += emp;
    acc.occupationCount += 1;
    acc.wageFloor = Math.min(acc.wageFloor, row.medianSalary);
    acc.wageCeiling = Math.max(acc.wageCeiling, row.medianSalary);
    acc.weightedExpSum += emp * row.aiExposure;
    acc.expSum += row.aiExposure;
    acc.bandEmp[bi] += emp;
    acc.bandOcc[bi] += 1;

    cumEmpBefore += emp;
  }

  // ── 5. Build tier objects ──────────────────────────────────────────────────
  const tiers: WageTier[] = TIER_IDS.map((id, i) => {
    const acc = accums[i];
    const tierEmp = acc.employment;
    const tierOcc = acc.occupationCount;

    const bands: WageTierBandCell[] = BAND_DEFS.map((def, bi) => {
      const bEmp = acc.bandEmp[bi];
      const bOcc = acc.bandOcc[bi];
      return {
        band: def.id,
        employment: bEmp,
        employmentShare: tierEmp > 0 ? bEmp / tierEmp : 0,
        occupationCount: bOcc,
        occupationShare: tierOcc > 0 ? bOcc / tierOcc : 0,
      };
    });

    return {
      id,
      wageFloor: acc.wageFloor === Infinity ? 0 : acc.wageFloor,
      wageCeiling: acc.wageCeiling === -Infinity ? 0 : acc.wageCeiling,
      employment: tierEmp,
      employmentShare: totalEmployment > 0 ? tierEmp / totalEmployment : 0,
      occupationCount: tierOcc,
      weightedMeanExposure:
        tierEmp > 0 ? acc.weightedExpSum / tierEmp : 0,
      meanExposure: tierOcc > 0 ? acc.expSum / tierOcc : 0,
      bands,
    };
  });

  // ── 6. Summary ────────────────────────────────────────────────────────────
  const totalWeightedExpSum = tiers.reduce(
    (s, t) => s + t.weightedMeanExposure * t.employment,
    0
  );
  const overallWeightedMeanExposure =
    totalEmployment > 0 ? totalWeightedExpSum / totalEmployment : 0;

  const lowTier = tiers[0];
  const highTier = tiers[2];
  const highMinusLowExposureGap =
    highTier.weightedMeanExposure - lowTier.weightedMeanExposure;

  const summary: WageTierPolarizationSummary = {
    includedOccupations: included.length,
    totalEmployment,
    excludedForMissingEmployment,
    excludedForMissingSalaryOrExposure,
    overallWeightedMeanExposure,
    highMinusLowExposureGap,
  };

  // ── 7. Methodology ────────────────────────────────────────────────────────
  const methodology: WageTierPolarizationMethodology = {
    label: "Wage-Tier AI-Exposure Polarization",
    description:
      "Employment-weighted distribution of AI-exposure scores across three " +
      "wage terciles, derived from the occupation snapshot. Each tercile " +
      "contains approximately one-third of the total workforce. Within each " +
      "tier, occupations are further grouped into four AI-exposure bands.",
    caveats: [
      "Cross-sectional single-period snapshot. This is not a time-series or " +
        "longitudinal trend; wage tiers and exposure scores reflect a single " +
        "survey period.",
      "Employment is a pre-outcome baseline count (OEWS), not a measure of " +
        "job loss or displacement.",
      "AI exposure is a modelled adoption/usage proxy (derived from the " +
        "Anthropic Economic Index 2025 and O*NET task analysis). It is not " +
        "observed automation or a deployment rate. A large share of " +
        "occupations have near-zero exposure (right-skewed distribution).",
      "Association ≠ causation. The pattern of higher exposure in higher-wage " +
        "tiers reflects distributional overlap between cognitive task content " +
        "and wage levels; it does not imply that AI causes wage changes.",
      "Tiers are constructed equal-employment thirds of the 755-occupation " +
        "included universe. One occupation (Legislators) is excluded for " +
        "missing employment data.",
    ],
    datasetBadgeIds: ["occupation-snapshot"],
    bands: BAND_DEFS.map((d) => ({ ...d })),
    tierMethod: "employment-weighted-tercile",
  };

  return { tiers, summary, methodology };
}
