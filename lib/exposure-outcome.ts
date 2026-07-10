/**
 * Canonical SOC-keyed data contract for the Exposure → Outcome Reality Matrix.
 *
 * Joins multi-methodology AI-exposure lenses from getExposureComparison() with
 * employment/wage outcome histories from getAISignalData() and the composite
 * Disruption Index from getDisruptionIndex(), keyed by stable SOC-2018 code.
 *
 * Intended consumers: Neo (static client visualization), Mouse (tests).
 * All values are derived from existing helpers; no source formulas are
 * re-implemented here.
 *
 * Bundle boundary: this module imports lib/analysis which in turn imports the
 * full occupation snapshot JSON and multi-source exposure datasets. It MUST NOT
 * be imported in a "use client" component. Neo: resolve getExposureOutcomeMatrix()
 * in a Server Component (or in getAnalysisPageData) and pass the result as props
 * to any client island, matching the pattern used for AnalysisPageData.
 */

import "server-only";

import {
  getExposureComparison,
  getAISignalData,
  getDisruptionIndex,
  pearson,
  type OccExposure,
  type SignalPoint,
  type DisruptionScore,
} from "@/lib/analysis";

// ─── Exported types ──────────────────────────────────────────────────────────

/** A single SOC-keyed row in the Exposure → Outcome Reality Matrix. */
export interface ExposureOutcomePoint {
  /** SOC-2018 occupation code, e.g. "15-1252". */
  code: string;
  /** Canonical BLS occupation title. */
  title: string;
  /** BLS major-group sector label. */
  sector: string;

  // ---- AI-exposure lenses (0–100 scale; null when source lacks coverage) ----

  /**
   * LLM-benchmark capability potential (0–100).
   * Source: llm-exposure.json — proportion of the occupation's task profile that
   * GPT-4-class models can perform at or above human level. Represents what AI
   * *could* do, not what is currently deployed. Distinct from observed usage.
   */
  capability: number | null;

  /**
   * Observed AI usage proxy (0–100).
   * Source: occupation-snapshot aiExposure — reflects current worker-reported or
   * task-level AI adoption signals. Represents what workers are *actually* using.
   */
  usage: number | null;

  /**
   * AIOE ability-weighted task exposure (0–100).
   * Source: aioe-exposure.json — the Acemoglu-style model weighting tasks by
   * required human-ability intensity.
   */
  ability: number | null;

  /**
   * Automation-baseline probability (0–100).
   * Source: automation-baseline.json — Frey & Osborne–style susceptibility
   * estimate based on routine-task framing. Note: negative correlation with
   * capability/usage lenses is a methodology artefact (different task framing),
   * not a substantive contradiction.
   */
  automation: number | null;

  /**
   * Unweighted average of capability, usage, and ability where available (0–100).
   * Null when all three modern lenses are missing for this SOC code.
   */
  consensus: number | null;

  /**
   * capability − usage (percentage points).
   * Positive = unrealised AI adoption potential for this occupation.
   * Null when either capability or usage is missing.
   */
  gap: number | null;

  // ---- Labor-market outcomes (annualised CAGR %; null when history unavailable) ----

  /**
   * Employment annualised CAGR % over the available BLS employment-history window.
   * Descriptive: reflects historical trends only. Correlation with AI exposure ≠ causation.
   * Null when the occupation had fewer than two valid BLS history data points.
   */
  empGrowth: number | null;

  /**
   * Median-wage annualised CAGR % over the available BLS wage-history window.
   * Descriptive: reflects historical trends only. Correlation with AI exposure ≠ causation.
   * Null when the occupation had fewer than two valid BLS history data points.
   */
  wageGrowth: number | null;

  // ---- Bubble weight ----

  /** Latest available BLS absolute employment headcount (for scatter bubble sizing). */
  employment: number;

  // ---- Composite disruption context ----

  /**
   * 0–100 Disruption Index composite score (higher = greater AI disruption signal).
   * Weighted composite of AI exposure, historical employment decline, wage stagnation,
   * and absence of BLS Bright Outlook designation.
   * Null when the occupation lacked sufficient employment/wage history to compute
   * the growth-rate components.
   */
  disruptionScore: number | null;

  /**
   * 1-based rank within the Disruption Index (lower rank = more disrupted).
   * Null when disruptionScore is null.
   */
  disruptionRank: number | null;
}

/** Numeric domain bounds [min, max] for a field, computed over all non-null values. */
export interface ExposureOutcomeBounds {
  min: number;
  max: number;
}

/** Aggregate statistics and axis-domain bounds for the matrix. */
export interface ExposureOutcomeSummary {
  /** Total SOC entries in the matrix (union of the exposure-comparison coverage universe). */
  totalOccupations: number;
  /** Occupations where both empGrowth and wageGrowth are non-null. */
  withLaborOutcomes: number;
  /** Occupations with non-null capability. */
  withCapability: number;
  /** Occupations with non-null gap (requires both capability and usage to be present). */
  withGap: number;
  /** Occupations with non-null disruptionScore. */
  withDisruptionScore: number;

  /**
   * Axis-domain bounds computed over non-null values, suitable for configuring
   * static client visualization scales without a second data pass.
   */
  bounds: {
    capability: ExposureOutcomeBounds;
    usage: ExposureOutcomeBounds;
    gap: ExposureOutcomeBounds;
    empGrowth: ExposureOutcomeBounds;
    wageGrowth: ExposureOutcomeBounds;
    employment: ExposureOutcomeBounds;
    disruptionScore: ExposureOutcomeBounds;
  };

  /** Calendar window for the labor-outcome series, derived from AISignalData. */
  outcomeWindow: { fromYear: number; toYear: number };
}

/** Methodology caveats and data provenance for UI disclosure. */
export interface ExposureOutcomeMethodology {
  label: string;
  description: string;
  /** Interpretive caveats for UI disclosure. */
  caveats: string[];
  /**
   * Dataset provenance identifiers matching data/provenance.json dataset ids.
   * Follows the existing provenance-badge convention used across FutureGrid.
   */
  datasetBadgeIds: string[];
}

/** The top-level Exposure → Outcome Reality Matrix. */
export interface ExposureOutcomeMatrix {
  /**
   * Per-SOC data points sorted ascending by SOC code for deterministic output.
   * Covers all occupations in the exposure-comparison universe; labor-outcome
   * and disruption fields are null where history was insufficient.
   */
  points: ExposureOutcomePoint[];

  summary: ExposureOutcomeSummary;

  /**
   * Pearson r: capability (0–100) vs. empGrowth (%), computed over the
   * intersecting subset where both values are non-null.
   * Exploratory/descriptive — correlation ≠ causation.
   */
  capabilityVsEmpGrowthR: number;

  /**
   * Pearson r: capability (0–100) vs. wageGrowth (%), computed over the
   * intersecting subset where both values are non-null.
   * Exploratory/descriptive — correlation ≠ causation.
   */
  capabilityVsWageGrowthR: number;

  /**
   * Pearson r: gap (capability − usage, pp) vs. empGrowth (%), computed over
   * the intersecting subset where all three values are non-null.
   */
  gapVsEmpGrowthR: number;

  /**
   * Pearson r: gap (capability − usage, pp) vs. wageGrowth (%), computed over
   * the intersecting subset where all three values are non-null.
   */
  gapVsWageGrowthR: number;

  methodology: ExposureOutcomeMethodology;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Returns a fresh Exposure → Outcome Reality Matrix joining multi-methodology
 * exposure lenses with BLS labor-market outcomes by SOC code.
 *
 * Call from a Server Component at build time. The underlying helper caches
 * (getExposureComparison, getAISignalData, getDisruptionIndex) are module-level
 * so repeated calls within a single build are efficient. Each call to this
 * function returns a new immutable object — do not mutate the returned arrays.
 */
export function getExposureOutcomeMatrix(): ExposureOutcomeMatrix {
  const comparison = getExposureComparison();
  const signal = getAISignalData();
  const disruption = getDisruptionIndex();

  const signalByCode = new Map<string, SignalPoint>(
    signal.points.map((p) => [p.code, p]),
  );
  const disruptionByCode = new Map<string, DisruptionScore>(
    disruption.occupations.map((d) => [d.code, d]),
  );

  const points: ExposureOutcomePoint[] = comparison.occupations
    .map((occ) => buildPoint(occ, signalByCode, disruptionByCode))
    .sort((a, b) => a.code.localeCompare(b.code));

  const summary = buildSummary(points, signal.window);

  const capEmpPairs = pairs(points, (p) => p.capability, (p) => p.empGrowth);
  const capWagePairs = pairs(points, (p) => p.capability, (p) => p.wageGrowth);
  const gapEmpPairs = pairs(points, (p) => p.gap, (p) => p.empGrowth);
  const gapWagePairs = pairs(points, (p) => p.gap, (p) => p.wageGrowth);

  return {
    points,
    summary,
    capabilityVsEmpGrowthR: safeR(capEmpPairs),
    capabilityVsWageGrowthR: safeR(capWagePairs),
    gapVsEmpGrowthR: safeR(gapEmpPairs),
    gapVsWageGrowthR: safeR(gapWagePairs),
    methodology: buildMethodology(),
  };
}

// ─── Internals ───────────────────────────────────────────────────────────────

function buildPoint(
  occ: OccExposure,
  signalByCode: Map<string, SignalPoint>,
  disruptionByCode: Map<string, DisruptionScore>,
): ExposureOutcomePoint {
  const sig = signalByCode.get(occ.code) ?? null;
  const dis = disruptionByCode.get(occ.code) ?? null;
  return {
    code: occ.code,
    title: occ.name,
    sector: occ.sector,
    capability: occ.capability,
    usage: occ.usage,
    ability: occ.ability,
    automation: occ.automation,
    consensus: occ.consensus,
    gap: occ.gap,
    empGrowth: sig?.empGrowth ?? null,
    wageGrowth: sig?.wageGrowth ?? null,
    employment: occ.employment,
    disruptionScore: dis?.score ?? null,
    disruptionRank: dis?.rank ?? null,
  };
}

function buildSummary(
  points: ExposureOutcomePoint[],
  outcomeWindow: { fromYear: number; toYear: number },
): ExposureOutcomeSummary {
  return {
    totalOccupations: points.length,
    withLaborOutcomes: points.filter(
      (p) => p.empGrowth != null && p.wageGrowth != null,
    ).length,
    withCapability: points.filter((p) => p.capability != null).length,
    withGap: points.filter((p) => p.gap != null).length,
    withDisruptionScore: points.filter((p) => p.disruptionScore != null).length,
    bounds: {
      capability: numericBounds(points.map((p) => p.capability)),
      usage: numericBounds(points.map((p) => p.usage)),
      gap: numericBounds(points.map((p) => p.gap)),
      empGrowth: numericBounds(points.map((p) => p.empGrowth)),
      wageGrowth: numericBounds(points.map((p) => p.wageGrowth)),
      employment: numericBounds(points.map((p) => p.employment)),
      disruptionScore: numericBounds(points.map((p) => p.disruptionScore)),
    },
    outcomeWindow,
  };
}

function numericBounds(values: (number | null)[]): ExposureOutcomeBounds {
  const finite = values.filter((v): v is number => v != null && Number.isFinite(v));
  if (finite.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...finite), max: Math.max(...finite) };
}

function pairs(
  points: ExposureOutcomePoint[],
  getX: (p: ExposureOutcomePoint) => number | null,
  getY: (p: ExposureOutcomePoint) => number | null,
): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const p of points) {
    const x = getX(p);
    const y = getY(p);
    if (x != null && y != null && Number.isFinite(x) && Number.isFinite(y)) {
      xs.push(x);
      ys.push(y);
    }
  }
  return { xs, ys };
}

function safeR({ xs, ys }: { xs: number[]; ys: number[] }): number {
  if (xs.length < 2) return 0;
  const r = pearson(xs, ys);
  return Number.isFinite(r) ? r : 0;
}

function buildMethodology(): ExposureOutcomeMethodology {
  return {
    label: "Exposure → Outcome Reality Matrix",
    description:
      "A SOC-keyed derived join of multi-methodology AI-exposure lenses " +
      "(getExposureComparison) with BLS employment and wage growth outcomes " +
      "(getAISignalData) and the composite Disruption Index (getDisruptionIndex). " +
      "Each point represents one occupation; labor-outcome fields are null where " +
      "BLS employment/wage history was insufficient to compute annualised growth. " +
      "Correlation statistics are Pearson r over the intersecting non-null subset. " +
      "All statistics are descriptive summaries of historical associations; they " +
      "do not establish or imply causal relationships between AI exposure and " +
      "labor-market outcomes.",
    caveats: [
      "Descriptive/exploratory only: all statistics summarise historical associations; correlation ≠ causation.",
      "Capability potential (llm-exposure) measures what GPT-4-class models can perform on occupation task profiles — not current AI deployment or worker displacement.",
      "Usage proxy (occupation-snapshot aiExposure) reflects adoption-signal estimates, not directly observed market data.",
      "AIOE ability scores (aioe-exposure) use a different task-weighting methodology than the LLM-benchmark capability scores; negative cross-lens correlation with automation-baseline is a methodology artefact.",
      "Labor-outcome CAGR figures cover the available BLS history window only; occupations with fewer than two valid data points are excluded (empGrowth/wageGrowth null).",
      "Employment headcounts reflect the latest available BLS figures; they are a pre-outcome baseline, not a post-adoption employment measure.",
      "The Disruption Index is a composite descriptive ranking; it does not assert future job loss.",
      "Explicit null values indicate absent data; no values have been fabricated or reweighted.",
    ],
    datasetBadgeIds: [
      "occupation-snapshot",
      "llm-exposure",
      "aioe-exposure",
      "automation-baseline",
    ],
  };
}
