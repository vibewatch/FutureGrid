import { generateAllCareerInsights, type CareerInsight } from "@/lib/data";
import {
  getEmploymentProjectionData,
  type EmploymentProjectionRow,
} from "@/lib/employment-projections";
import { getFiscalYears, getOccupationsSorted, type H1bOccupation } from "@/lib/h1b";
import {
  getJobPostingsData,
  type JobPostingsMode,
  type JobPostingsOccupation,
} from "@/lib/job-postings";

type AutomationRisk = CareerInsight["automationRisk"];

export type TalentBottleneckTrend = "rising" | "falling" | "flat";
export type TalentBottleneckMedianWageSource =
  | "h1b"
  | "employment-projections"
  | "occupation-snapshot"
  | null;

export interface TalentBottleneckSourceFlags {
  hasH1b: boolean;
  hasEmploymentProjection: boolean;
  hasJobPostings: boolean;
  hasOccupationSnapshot: boolean;
  jobPostingsSourceStatus: string | null;
}

export interface TalentBottleneckScoreComponents {
  latestLcas: number;
  totalLcas: number;
  h1bCagr: number;
  projectedOpenings: number;
  employmentChangePct: number;
  latestPostings: number;
  aiExposure: number;
}

export type TalentBottleneckScoreWeights = TalentBottleneckScoreComponents;

export interface TalentBottleneckRow {
  rank: number;
  score: number;
  socCode: string;
  title: string;
  sector: string | null;
  latestLcas: number | null;
  totalLcas: number | null;
  /** H-1B CAGR as a decimal fraction; 0.0572 means +5.72%. */
  h1bCagr: number | null;
  h1bTrend: TalentBottleneckTrend | null;
  medianWageAnnual: number | null;
  medianWageAnnualSource: TalentBottleneckMedianWageSource;
  projectedOpenings: number | null;
  employmentChangePct: number | null;
  latestPostings: number | null;
  aiExposure: number | null;
  automationRisk: AutomationRisk | null;
  scoreComponents: TalentBottleneckScoreComponents;
  sourceFlags: TalentBottleneckSourceFlags;
}

export interface TalentBottleneckMethodology {
  label: string;
  description: string;
  scoreFormula: string;
  normalization: string;
  caveats: string[];
  sourceNotes: string[];
}

export interface TalentBottleneckSummaryTopRow {
  rank: number;
  score: number;
  socCode: string;
  title: string;
}

export interface TalentBottleneckSummary {
  occupationsTracked: number;
  rowsReturned: number;
  latestH1bFiscalYear: number | null;
  latestJobPostingYear: number | null;
  jobPostingsMode: JobPostingsMode;
  jobPostingsObserved: boolean;
  projectionWindow: {
    baseYear: number | null;
    projectionYear: number | null;
  };
  matched: {
    h1b: number;
    employmentProjections: number;
    jobPostings: number;
    occupationSnapshot: number;
  };
  scoreRange: {
    min: number;
    max: number;
  };
  scoreWeights: TalentBottleneckScoreWeights;
  topRows: TalentBottleneckSummaryTopRow[];
}

export interface TalentBottleneckData {
  datasetBadgeIds: string[];
  methodology: TalentBottleneckMethodology;
  summary: TalentBottleneckSummary;
  rows: TalentBottleneckRow[];
}

export interface TalentBottleneckOptions {
  limit?: number;
}

interface SnapshotSignal {
  socCode: string;
  title: string;
  sector: string;
  aiExposure: number;
  automationRisk: AutomationRisk;
  medianSalary: number | null;
}

type TalentBottleneckBaseRow = Omit<
  TalentBottleneckRow,
  "rank" | "score" | "scoreComponents"
>;

const SCORE_WEIGHTS: TalentBottleneckScoreWeights = {
  latestLcas: 0.22,
  totalLcas: 0.12,
  h1bCagr: 0.1,
  projectedOpenings: 0.24,
  employmentChangePct: 0.1,
  latestPostings: 0.12,
  aiExposure: 0.1,
};

export function getTalentBottleneckData(
  options: TalentBottleneckOptions = {},
): TalentBottleneckData {
  const h1bOccupations = getOccupationsSorted();
  const employmentData = getEmploymentProjectionData();
  const jobPostingsData = getJobPostingsData();
  const snapshotSignals = generateAllCareerInsights().map(toSnapshotSignal);

  const h1bBySoc = new Map(h1bOccupations.map((row) => [row.socCode, row]));
  const projectionBySoc = new Map(
    employmentData.rows.map((row) => [row.socCode, row]),
  );
  const jobPostingsBySoc = new Map(
    jobPostingsData.occupations.map((row) => [row.socCode, row]),
  );
  const snapshotBySoc = new Map(snapshotSignals.map((row) => [row.socCode, row]));

  const socCodes = collectSocCodes([
    h1bBySoc,
    projectionBySoc,
    jobPostingsBySoc,
    snapshotBySoc,
  ]);

  const latestH1bFiscalYear = latestNumber(getFiscalYears());
  const baseRows = socCodes.map((socCode) =>
    buildBaseRow(
      socCode,
      latestH1bFiscalYear,
      h1bBySoc.get(socCode),
      projectionBySoc.get(socCode),
      jobPostingsBySoc.get(socCode),
      snapshotBySoc.get(socCode),
    ),
  );

  const normalizers = buildNormalizers(baseRows);
  const rankedRows = baseRows
    .map((row) => addScore(row, normalizers))
    .sort(compareRows)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  const rows = applyLimit(rankedRows, options.limit);

  return {
    datasetBadgeIds: [
      "h1b-trends",
      "employment-projections",
      "job-postings",
      "occupation-snapshot",
    ],
    methodology: buildMethodology(jobPostingsData.coverage.mode),
    summary: buildSummary(
      rankedRows,
      rows.length,
      latestH1bFiscalYear,
      latestNumber(jobPostingsData.coverage.years),
      jobPostingsData.coverage.mode,
      jobPostingsData.coverage.observedHistoricalPostings,
      employmentData.coverage.baseYear,
      employmentData.coverage.projectionYear,
    ),
    rows,
  };
}

function buildBaseRow(
  socCode: string,
  latestH1bFiscalYear: number | null,
  h1b: H1bOccupation | undefined,
  projection: EmploymentProjectionRow | undefined,
  postings: JobPostingsOccupation | undefined,
  snapshot: SnapshotSignal | undefined,
): TalentBottleneckBaseRow {
  const latestLcas =
    h1b && latestH1bFiscalYear != null
      ? finiteOrNull(h1b.countByYear[String(latestH1bFiscalYear)])
      : null;
  const medianWage = chooseMedianWage(h1b, projection, snapshot);

  return {
    socCode,
    title:
      snapshot?.title ??
      projection?.title ??
      postings?.title ??
      h1b?.socTitle ??
      "Unknown occupation",
    sector: snapshot?.sector ?? projection?.sector ?? postings?.sector ?? null,
    latestLcas,
    totalLcas: finiteOrNull(h1b?.totalCount),
    h1bCagr: finiteOrNull(h1b?.cagr),
    h1bTrend: trendFromCagr(finiteOrNull(h1b?.cagr)),
    medianWageAnnual: medianWage.value,
    medianWageAnnualSource: medianWage.source,
    projectedOpenings: finiteOrNull(projection?.projectedOpenings),
    employmentChangePct: finiteOrNull(projection?.employmentChangePct),
    latestPostings: finiteOrNull(postings?.latestAnnualPostings),
    aiExposure: finiteOrNull(snapshot?.aiExposure ?? projection?.aiExposure),
    automationRisk: snapshot?.automationRisk ?? projection?.automationRisk ?? null,
    sourceFlags: {
      hasH1b: Boolean(h1b),
      hasEmploymentProjection: Boolean(projection),
      hasJobPostings: Boolean(postings),
      hasOccupationSnapshot: Boolean(snapshot),
      jobPostingsSourceStatus: postings?.sourceStatus ?? null,
    },
  };
}

function addScore(
  row: TalentBottleneckBaseRow,
  normalizers: TalentBottleneckScoreComponents,
): TalentBottleneckRow {
  const scoreComponents: TalentBottleneckScoreComponents = {
    latestLcas: logNormalize(row.latestLcas, normalizers.latestLcas),
    totalLcas: logNormalize(row.totalLcas, normalizers.totalLcas),
    h1bCagr: linearPositiveNormalize(row.h1bCagr, normalizers.h1bCagr),
    projectedOpenings: logNormalize(
      row.projectedOpenings,
      normalizers.projectedOpenings,
    ),
    employmentChangePct: linearPositiveNormalize(
      row.employmentChangePct,
      normalizers.employmentChangePct,
    ),
    latestPostings: logNormalize(row.latestPostings, normalizers.latestPostings),
    aiExposure: clamp01(row.aiExposure ?? 0),
  };

  const score = round2(
    100 *
      (scoreComponents.latestLcas * SCORE_WEIGHTS.latestLcas +
        scoreComponents.totalLcas * SCORE_WEIGHTS.totalLcas +
        scoreComponents.h1bCagr * SCORE_WEIGHTS.h1bCagr +
        scoreComponents.projectedOpenings * SCORE_WEIGHTS.projectedOpenings +
        scoreComponents.employmentChangePct *
          SCORE_WEIGHTS.employmentChangePct +
        scoreComponents.latestPostings * SCORE_WEIGHTS.latestPostings +
        scoreComponents.aiExposure * SCORE_WEIGHTS.aiExposure),
  );

  return { ...row, rank: 0, score, scoreComponents };
}

function buildNormalizers(
  rows: TalentBottleneckBaseRow[],
): TalentBottleneckScoreComponents {
  return {
    latestLcas: maxPositive(rows.map((row) => row.latestLcas)),
    totalLcas: maxPositive(rows.map((row) => row.totalLcas)),
    h1bCagr: maxPositive(rows.map((row) => row.h1bCagr)),
    projectedOpenings: maxPositive(rows.map((row) => row.projectedOpenings)),
    employmentChangePct: maxPositive(rows.map((row) => row.employmentChangePct)),
    latestPostings: maxPositive(rows.map((row) => row.latestPostings)),
    aiExposure: 1,
  };
}

function buildSummary(
  rankedRows: TalentBottleneckRow[],
  rowsReturned: number,
  latestH1bFiscalYear: number | null,
  latestJobPostingYear: number | null,
  jobPostingsMode: JobPostingsMode,
  jobPostingsObserved: boolean,
  baseYear: number | null,
  projectionYear: number | null,
): TalentBottleneckSummary {
  const scores = rankedRows.map((row) => row.score);

  return {
    occupationsTracked: rankedRows.length,
    rowsReturned,
    latestH1bFiscalYear,
    latestJobPostingYear,
    jobPostingsMode,
    jobPostingsObserved,
    projectionWindow: { baseYear, projectionYear },
    matched: {
      h1b: rankedRows.filter((row) => row.sourceFlags.hasH1b).length,
      employmentProjections: rankedRows.filter(
        (row) => row.sourceFlags.hasEmploymentProjection,
      ).length,
      jobPostings: rankedRows.filter((row) => row.sourceFlags.hasJobPostings)
        .length,
      occupationSnapshot: rankedRows.filter(
        (row) => row.sourceFlags.hasOccupationSnapshot,
      ).length,
    },
    scoreRange: {
      min: scores.length > 0 ? Math.min(...scores) : 0,
      max: scores.length > 0 ? Math.max(...scores) : 0,
    },
    scoreWeights: { ...SCORE_WEIGHTS },
    topRows: rankedRows.slice(0, 10).map((row) => ({
      rank: row.rank,
      score: row.score,
      socCode: row.socCode,
      title: row.title,
    })),
  };
}

function buildMethodology(jobPostingMode: string): TalentBottleneckMethodology {
  return {
    label: "H-1B Talent Bottleneck Lens",
    description:
      "A descriptive SOC-level join across certified H-1B LCA filings, BLS-style employment projections, bundled job-posting signals, and occupation-snapshot AI exposure.",
    scoreFormula:
      "Score = fixed weighted average of normalized latest LCAs, total LCAs, positive H-1B CAGR, projected openings, positive employment-change %, latest postings, and AI exposure. Missing signals contribute zero and are not reweighted.",
    normalization:
      "Counts use log normalization against the in-dataset maximum; positive rates use linear normalization against the positive in-dataset maximum; AI exposure is already bounded 0–1. Final scores are rounded to 0–100.",
    caveats: [
      "Certified H-1B LCAs are employer filings, not visa approvals; LCAs are not approvals.",
      "The score is not proof of shortage/causality; it is a descriptive ranking of joined signals.",
      `Job postings are proxy/seed-derived where applicable; the current job-postings mode is ${jobPostingMode}.`,
    ],
    sourceNotes: [
      "Rows are keyed by normalized SOC code wherever each source provides one.",
      "This lens is intentionally separate from /analysis and does not infer causal effects.",
    ],
  };
}

function toSnapshotSignal(career: CareerInsight): SnapshotSignal {
  return {
    socCode: career.occupationCode,
    title: career.occupationName,
    sector: career.sectorName,
    aiExposure: career.automationProbability,
    automationRisk: career.automationRisk,
    medianSalary: career.medianSalary > 0 ? career.medianSalary : null,
  };
}

function chooseMedianWage(
  h1b: H1bOccupation | undefined,
  projection: EmploymentProjectionRow | undefined,
  snapshot: SnapshotSignal | undefined,
): { value: number | null; source: TalentBottleneckMedianWageSource } {
  const h1bWage = positiveFiniteOrNull(h1b?.medianWageAnnualLatest);
  if (h1bWage != null) return { value: h1bWage, source: "h1b" };

  const projectionWage = positiveFiniteOrNull(projection?.medianAnnualWage);
  if (projectionWage != null) {
    return { value: projectionWage, source: "employment-projections" };
  }

  const snapshotWage = positiveFiniteOrNull(snapshot?.medianSalary);
  if (snapshotWage != null) {
    return { value: snapshotWage, source: "occupation-snapshot" };
  }

  return { value: null, source: null };
}

function collectSocCodes(
  maps: Map<string, unknown>[],
): string[] {
  const codes = new Set<string>();
  for (const map of maps) {
    for (const code of map.keys()) {
      codes.add(code);
    }
  }
  return Array.from(codes).sort((a, b) => a.localeCompare(b));
}

function compareRows(a: TalentBottleneckRow, b: TalentBottleneckRow): number {
  return (
    b.score - a.score ||
    (b.latestLcas ?? 0) - (a.latestLcas ?? 0) ||
    (b.totalLcas ?? 0) - (a.totalLcas ?? 0) ||
    (b.projectedOpenings ?? 0) - (a.projectedOpenings ?? 0) ||
    (b.latestPostings ?? 0) - (a.latestPostings ?? 0) ||
    a.title.localeCompare(b.title) ||
    a.socCode.localeCompare(b.socCode)
  );
}

function applyLimit(
  rows: TalentBottleneckRow[],
  limit: number | undefined,
): TalentBottleneckRow[] {
  if (typeof limit !== "number") return rows;
  if (!Number.isFinite(limit) || limit <= 0) return [];
  return rows.slice(0, Math.floor(limit));
}

function latestNumber(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((latest, value) => Math.max(latest, value), values[0]);
}

function trendFromCagr(cagr: number | null): TalentBottleneckTrend | null {
  if (cagr == null) return null;
  if (cagr > 0.005) return "rising";
  if (cagr < -0.005) return "falling";
  return "flat";
}

function logNormalize(value: number | null, max: number): number {
  const positive = positiveFiniteOrNull(value);
  if (positive == null || max <= 0) return 0;
  return clamp01(Math.log(1 + positive) / Math.log(1 + max));
}

function linearPositiveNormalize(value: number | null, max: number): number {
  const positive = positiveFiniteOrNull(value);
  if (positive == null || max <= 0) return 0;
  return clamp01(positive / max);
}

function maxPositive(values: (number | null)[]): number {
  return values.reduce<number>((max, value) => {
    const positive = positiveFiniteOrNull(value);
    return positive == null ? max : Math.max(max, positive);
  }, 0);
}

function finiteOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function positiveFiniteOrNull(value: number | null | undefined): number | null {
  const finite = finiteOrNull(value);
  return finite != null && finite > 0 ? finite : null;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
