import employmentProjectionData from "@/data/employment-projections.json";

export interface EmploymentProjectionRow {
  socCode: string;
  title: string;
  sector: string;
  employment2024: number | null;
  employment2034: number | null;
  employmentChange: number | null;
  employmentChangePct: number | null;
  projectedOpenings: number | null;
  aiExposure: number | null;
  automationRisk: "Low" | "Medium" | "High" | "Very High";
  automationProbability: number | null;
  brightOutlook: boolean;
  medianAnnualWage: number | null;
  entryLevelEducation: string | null;
  onTheJobTraining: string | null;
  sourceUrl: string | null;
}

export interface EmploymentProjectionCoverage {
  baseYear: number;
  projectionYear: number;
  windowYears: number;
  primaryKey: "socCode" | (string & {});
  rows: number;
  sourceRows: number;
  matchedSnapshotRows: number;
  rowsWithProjectedOpenings: number;
}

export interface EmploymentProjectionSummaryRow {
  socCode: string;
  title: string;
  employment2024: number | null;
  employment2034: number | null;
  employmentChange: number | null;
  employmentChangePct: number | null;
  projectedOpenings: number | null;
}

export interface EmploymentProjectionSummary {
  totalEmployment2024: number;
  totalEmployment2034: number;
  totalEmploymentChange: number;
  rowsWithProjectedOpenings: number;
  topProjectedOpenings: EmploymentProjectionSummaryRow[];
  fastestGrowing: EmploymentProjectionSummaryRow[];
  steepestDeclines: EmploymentProjectionSummaryRow[];
}

export interface EmploymentProjectionsDataset {
  meta: {
    generatedAt: string;
    asOf: string;
    source: { name?: string; publisher?: string; url?: string } | string | null;
    version: string;
  };
  coverage: EmploymentProjectionCoverage;
  methodology: {
    provenanceDecision: string;
    accessMirror: string;
    mirrorRepository: string;
    joinStrategy: string;
    openingsStrategy: string;
    units: string;
  };
  summary: EmploymentProjectionSummary;
  rows: EmploymentProjectionRow[];
}

export interface EmploymentProjectionChartRow
  extends EmploymentProjectionRow {
  aiExposurePct: number | null;
  automationProbabilityPct: number | null;
  bubbleSize: number;
}

export interface EmploymentProjectionChartOptions {
  limit?: number;
  minProjectedOpenings?: number;
  sortBy?:
    | "projectedOpenings"
    | "employmentChangePct"
    | "employmentChange"
    | "employment2034";
}

const data = employmentProjectionData as unknown as EmploymentProjectionsDataset;
const bySoc = new Map(data.rows.map((row) => [row.socCode, row]));

export function getEmploymentProjectionData(): EmploymentProjectionsDataset {
  return {
    ...data,
    coverage: { ...data.coverage },
    methodology: { ...data.methodology },
    summary: getEmploymentProjectionSummary(),
    rows: data.rows.map(cloneRow),
  };
}

export function getEmploymentProjectionCoverage(): EmploymentProjectionCoverage {
  return { ...data.coverage };
}

export function getEmploymentProjectionSummary(): EmploymentProjectionSummary {
  return {
    ...data.summary,
    topProjectedOpenings: data.summary.topProjectedOpenings.map(cloneSummaryRow),
    fastestGrowing: data.summary.fastestGrowing.map(cloneSummaryRow),
    steepestDeclines: data.summary.steepestDeclines.map(cloneSummaryRow),
  };
}

export function getEmploymentProjectionRows(): EmploymentProjectionRow[] {
  return data.rows.map(cloneRow);
}

export function getEmploymentProjectionBySoc(
  socCode: string
): EmploymentProjectionRow | undefined {
  const row = bySoc.get(socCode);
  return row ? cloneRow(row) : undefined;
}

export function getEmploymentProjectionChartRows(
  options: EmploymentProjectionChartOptions = {}
): EmploymentProjectionChartRow[] {
  const {
    limit,
    minProjectedOpenings = 0,
    sortBy = "projectedOpenings",
  } = options;

  const rows = data.rows
    .filter(
      (row) =>
        row.employment2024 != null &&
        row.employment2034 != null &&
        row.employmentChangePct != null &&
        (row.projectedOpenings ?? 0) >= minProjectedOpenings
    )
    .map((row) => ({
      ...cloneRow(row),
      aiExposurePct: pct(row.aiExposure),
      automationProbabilityPct: pct(row.automationProbability),
      bubbleSize: row.projectedOpenings ?? row.employment2034 ?? 0,
    }))
    .sort((a, b) => compareRows(a, b, sortBy));

  return typeof limit === "number" ? rows.slice(0, limit) : rows;
}

function compareRows(
  a: EmploymentProjectionChartRow,
  b: EmploymentProjectionChartRow,
  sortBy: NonNullable<EmploymentProjectionChartOptions["sortBy"]>
) {
  if (sortBy === "employmentChangePct") {
    return (
      (b.employmentChangePct ?? 0) - (a.employmentChangePct ?? 0) ||
      (b.projectedOpenings ?? 0) - (a.projectedOpenings ?? 0) ||
      a.title.localeCompare(b.title)
    );
  }
  if (sortBy === "employmentChange") {
    return (
      (b.employmentChange ?? 0) - (a.employmentChange ?? 0) ||
      (b.projectedOpenings ?? 0) - (a.projectedOpenings ?? 0) ||
      a.title.localeCompare(b.title)
    );
  }
  if (sortBy === "employment2034") {
    return (
      (b.employment2034 ?? 0) - (a.employment2034 ?? 0) ||
      (b.projectedOpenings ?? 0) - (a.projectedOpenings ?? 0) ||
      a.title.localeCompare(b.title)
    );
  }
  return (
    (b.projectedOpenings ?? 0) - (a.projectedOpenings ?? 0) ||
    (b.employmentChangePct ?? 0) - (a.employmentChangePct ?? 0) ||
    a.title.localeCompare(b.title)
  );
}

function pct(value: number | null): number | null {
  return value == null ? null : Math.round(value * 1000) / 10;
}

function cloneSummaryRow(
  row: EmploymentProjectionSummaryRow
): EmploymentProjectionSummaryRow {
  return { ...row };
}

function cloneRow(row: EmploymentProjectionRow): EmploymentProjectionRow {
  return { ...row };
}
