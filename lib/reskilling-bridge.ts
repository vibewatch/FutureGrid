/**
 * Canonical SOC-keyed derived data contract for the Talent Bottleneck → Reskilling Bridge.
 *
 * Joins high-pressure bottleneck origins (scored from H-1B LCA filings, employment
 * projections, job-posting signals, and AI exposure) with evidence-based reskilling
 * destinations from the O*NET skill-overlap transition model, annotating each destination
 * with BLS projected annual openings when available.
 *
 * Intended consumers: Neo (UI charts/tables), Mouse (tests).
 * All values are derived from existing helpers; no source formulas are re-implemented here.
 */

import { getReskillingPaths, type CareerInsight, type ReskillingTarget } from "@/lib/data";
import { getEmploymentProjectionBySoc } from "@/lib/employment-projections";
import { getTalentBottleneckData, type TalentBottleneckRow } from "@/lib/talent-bottleneck";

const DEFAULT_ORIGIN_LIMIT = 20;
const DEFAULT_DESTINATION_LIMIT = 6;
/** Display cap for shared/missing skill arrays; keeps static client payload bounded. */
const SKILL_DISPLAY_CAP = 6;

// ─── Exported types ──────────────────────────────────────────────────────────

export type ReskillingBridgeAutomationRisk = CareerInsight["automationRisk"];

export interface ReskillingBridgeDestination {
  /** Destination SOC code. */
  socCode: string;
  title: string;
  /**
   * 0–100 composite transition score weighting skill overlap, AI-exposure reduction,
   * salary gain, destination outlook, and retraining effort.
   * Evidence-based; not an observed placement rate.
   */
  transitionScore: number;
  /** Reduction in AI exposure in percentage points (origin − destination). */
  exposureDropPts: number;
  /** Skills shared between origin and destination (capped at SKILL_DISPLAY_CAP). */
  sharedSkills: string[];
  /** Destination skills the mover would need to acquire (capped at SKILL_DISPLAY_CAP). */
  missingSkills: string[];
  /** Destination median salary − origin median salary in USD. */
  salaryDelta: number;
  /**
   * BLS projected average annual job openings for the destination occupation.
   * Sourced from the employment-projections dataset (authoritative LaborOpportunityRow
   * equivalent). Explicit null when the dataset has no record for this SOC code.
   */
  annualOpenings: number | null;
  /** Destination AI exposure fraction (0–1). */
  aiExposure: number;
  automationRisk: ReskillingBridgeAutomationRisk;
}

export interface ReskillingBridgeOrigin {
  /** Origin SOC code. */
  socCode: string;
  title: string;
  /** Composite bottleneck pressure score (0–100). Higher = more pressure. */
  bottleneckScore: number;
  /**
   * Certified H-1B LCA filing count for the latest tracked fiscal year.
   * Null when H-1B data has no record for this occupation.
   * Note: LCA counts are filings, not visa approvals.
   */
  latestLcas: number | null;
  /** AI exposure fraction (0–1). Null when occupation snapshot is unavailable. */
  aiExposure: number | null;
  /** Reskilling destinations ranked by transition score, best first. */
  destinations: ReskillingBridgeDestination[];
}

export interface ReskillingBridgeMethodology {
  label: string;
  description: string;
  /** Provenance and interpretive caveats for UI disclosure. */
  caveats: string[];
  /** Dataset badge identifiers following existing provenance conventions. */
  datasetBadgeIds: string[];
}

export interface ReskillingBridgeSummary {
  originsReturned: number;
  /** The destinationLimit applied; actual per-origin counts may be lower. */
  destinationsPerOriginMax: number;
  totalDestinationPairs: number;
  bottleneckScoreWindow: {
    min: number;
    max: number;
  };
}

export interface ReskillingBridgeData {
  methodology: ReskillingBridgeMethodology;
  summary: ReskillingBridgeSummary;
  /** Origins sorted by bottleneck score descending; deterministic across calls. */
  origins: ReskillingBridgeOrigin[];
}

export interface ReskillingBridgeOptions {
  /** Number of high-pressure origin occupations to include. Default: 20. */
  originLimit?: number;
  /** Max reskilling destinations per origin. Default: 6. */
  destinationLimit?: number;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function getReskillingBridgeData(
  options: ReskillingBridgeOptions = {},
): ReskillingBridgeData {
  const originLimit = resolveLimit(options.originLimit, DEFAULT_ORIGIN_LIMIT);
  const destinationLimit = resolveLimit(options.destinationLimit, DEFAULT_DESTINATION_LIMIT);

  const { rows } = getTalentBottleneckData({ limit: originLimit });
  const origins = rows.map((row) => buildOrigin(row, destinationLimit));

  const scores = origins.map((o) => o.bottleneckScore);
  const totalDestinationPairs = origins.reduce((n, o) => n + o.destinations.length, 0);

  return {
    methodology: buildMethodology(),
    summary: {
      originsReturned: origins.length,
      destinationsPerOriginMax: destinationLimit,
      totalDestinationPairs,
      bottleneckScoreWindow: {
        min: scores.length > 0 ? Math.min(...scores) : 0,
        max: scores.length > 0 ? Math.max(...scores) : 0,
      },
    },
    origins,
  };
}

// ─── Internals ───────────────────────────────────────────────────────────────

function buildOrigin(
  row: TalentBottleneckRow,
  destinationLimit: number,
): ReskillingBridgeOrigin {
  const paths = getReskillingPaths(row.socCode, destinationLimit, "score");
  return {
    socCode: row.socCode,
    title: row.title,
    bottleneckScore: row.score,
    latestLcas: row.latestLcas,
    aiExposure: row.aiExposure,
    destinations: paths.map(buildDestination),
  };
}

function buildDestination(path: ReskillingTarget): ReskillingBridgeDestination {
  const projection = getEmploymentProjectionBySoc(path.occupationCode);
  const rawOpenings = projection?.projectedOpenings;
  const annualOpenings =
    typeof rawOpenings === "number" &&
    Number.isFinite(rawOpenings) &&
    rawOpenings > 0
      ? rawOpenings
      : null;

  return {
    socCode: path.occupationCode,
    title: path.occupationName,
    transitionScore: path.transitionScore,
    exposureDropPts: path.exposureDropPts,
    sharedSkills: path.sharedSkills.slice(0, SKILL_DISPLAY_CAP),
    missingSkills: path.missingSkills.slice(0, SKILL_DISPLAY_CAP),
    salaryDelta: path.salaryDelta,
    annualOpenings,
    aiExposure: path.aiExposure,
    automationRisk: path.automationRisk,
  };
}

function buildMethodology(): ReskillingBridgeMethodology {
  return {
    label: "Talent Bottleneck → Reskilling Bridge",
    description:
      "A SOC-keyed derived join that pairs each high-pressure bottleneck occupation " +
      "(scored from certified H-1B LCA filings, BLS employment projections, job-posting " +
      "signals, and AI exposure) with evidence-based reskilling destinations. " +
      "Destinations are ranked by a 0–100 composite transition score that weights skill " +
      "overlap, AI-exposure reduction, salary gain, destination outlook, and retraining " +
      "effort. Annual openings for each destination are sourced from BLS employment " +
      "projections where available; otherwise null.",
    caveats: [
      "Certified H-1B LCAs are employer filings, not visa approvals; LCA filing counts are not evidence of actual shortages.",
      "Transition scores are evidence-based skill-overlap estimates derived from O*NET data, not observed placement rates.",
      "Annual openings are BLS 10-year projection averages, not current realized demand.",
      "Job postings used in bottleneck scoring are deterministic seed-derived proxies, not observed market postings.",
      "The bottleneck score is a descriptive composite ranking; it does not assert causality or shortage.",
      "Salary delta reflects snapshot median differences; individual wage outcomes will vary.",
    ],
    datasetBadgeIds: [
      "h1b-trends",
      "employment-projections",
      "job-postings",
      "occupation-snapshot",
    ],
  };
}

/** Coerce an options limit value to a positive integer, falling back to the default. */
function resolveLimit(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.floor(value);
}
