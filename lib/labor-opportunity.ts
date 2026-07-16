import { generateAllCareerInsights, type CareerInsight } from "@/lib/data";
import {
  getEmploymentProjectionData,
  type EmploymentProjectionRow,
} from "@/lib/employment-projections";
import { getOccupationJobPostingsBySoc } from "@/lib/job-postings";

type ProjectionSourceMode = "soc-dataset" | "snapshot-fallback";

interface NormalizedProjectionRow {
  socCode: string;
  title: string;
  annualOpenings: number;
  employment2024: number | null;
  employment2034: number | null;
  employmentChange: number | null;
  employmentPercentChange: number | null;
  medianAnnualWage: number | null;
}

export interface LaborOpportunityRow {
  socCode: string;
  title: string;
  sector: string;
  careerHref: string;
  aiExposure: number;
  automationRisk: CareerInsight["automationRisk"];
  annualOpenings: number;
  currentEmployment: number | null;
  projectedEmployment: number | null;
  employmentChange: number | null;
  employmentPercentChange: number | null;
  medianAnnualWage: number | null;
  latestAnnualPostings: number | null;
}

export interface LaborOpportunityData {
  source: {
    mode: ProjectionSourceMode;
    datasetId: string;
    sourceName: string;
    publisher: string | null;
    asOf: string | null;
  };
  datasetBadgeIds: string[];
  summary: {
    occupationsTracked: number;
    totalAnnualOpenings: number;
    highExposureOpeningsShare: number;
    medianTopDemandWage: number | null;
    exposureMedian: number;
    openingsMedian: number;
  };
  chartRows: LaborOpportunityRow[];
  spotlight: {
    lowerExposure: LaborOpportunityRow[];
    highExposure: LaborOpportunityRow[];
  };
}

interface DetectedProjectionDataset {
  datasetId: string;
  sourceName: string;
  publisher: string | null;
  asOf: string | null;
  rows: NormalizedProjectionRow[];
}

export function getLaborOpportunityData(): LaborOpportunityData {
  const careers = generateAllCareerInsights();
  const careerBySoc = new Map(careers.map((career) => [career.occupationCode, career]));
  const detected = loadProjectionDataset();

  const rows = buildOpportunityRows(
    detected?.rows.length ? detected.rows : buildSnapshotFallbackRows(careers),
    careerBySoc,
  );
  const resolvedRows = rows.length > 0 ? rows : buildOpportunityRows(buildSnapshotFallbackRows(careers), careerBySoc);

  const chartRows = resolvedRows.slice(0, 48);
  const exposureMedian = median(resolvedRows.map((row) => row.aiExposure)) ?? 0;
  const openingsMedian = median(resolvedRows.map((row) => row.annualOpenings)) ?? 0;
  const totalAnnualOpenings = resolvedRows.reduce((sum, row) => sum + row.annualOpenings, 0);
  const highExposureOpenings = resolvedRows.reduce(
    (sum, row) => sum + (row.aiExposure >= exposureMedian ? row.annualOpenings : 0),
    0,
  );
  const medianTopDemandWage = median(
    resolvedRows
      .slice(0, 20)
      .map((row) => row.medianAnnualWage)
      .filter((value): value is number => value != null && value > 0),
  );

  const lowerExposure = resolvedRows
    .filter((row) => row.aiExposure < exposureMedian)
    .sort(compareRows)
    .slice(0, 6);
  const highExposure = resolvedRows
    .filter((row) => row.aiExposure >= exposureMedian)
    .sort(compareRows)
    .slice(0, 6);

  return {
    source: {
      mode: detected && rows.length > 0 ? "soc-dataset" : "snapshot-fallback",
      datasetId: detected && rows.length > 0 ? detected.datasetId : "occupation-snapshot",
      sourceName:
        detected && rows.length > 0
          ? detected.sourceName
          : "Anthropic Economic Index — Wage & Forecast Data",
      publisher:
        detected && rows.length > 0
          ? detected.publisher
          : "Anthropic / O*NET / BLS (bundled)",
      asOf: detected && rows.length > 0 ? detected.asOf : null,
    },
    datasetBadgeIds: uniqueStrings(
      detected && rows.length > 0
        ? [detected.datasetId, "job-postings", "occupation-snapshot"]
        : ["occupation-snapshot", "job-postings"],
    ),
    summary: {
      occupationsTracked: resolvedRows.length,
      totalAnnualOpenings,
      highExposureOpeningsShare:
        totalAnnualOpenings > 0 ? highExposureOpenings / totalAnnualOpenings : 0,
      medianTopDemandWage,
      exposureMedian,
      openingsMedian,
    },
    chartRows,
    spotlight: {
      lowerExposure: lowerExposure.length > 0 ? lowerExposure : resolvedRows.slice(0, 6),
      highExposure: highExposure.length > 0 ? highExposure : resolvedRows.slice(0, 6),
    },
  };
}

function buildOpportunityRows(
  normalizedRows: NormalizedProjectionRow[],
  careerBySoc: Map<string, CareerInsight>,
): LaborOpportunityRow[] {
  return normalizedRows
    .map((row) => toLaborOpportunityRow(row, careerBySoc.get(row.socCode)))
    .filter((row): row is LaborOpportunityRow => Boolean(row))
    .sort(compareRows);
}

function loadProjectionDataset(): DetectedProjectionDataset {
  const dataset = getEmploymentProjectionData();
  const source = normalizeSource(dataset.meta.source);
  return {
    datasetId: "employment-projections",
    sourceName: source.name ?? "BLS Employment Projections",
    publisher: source.publisher ?? null,
    asOf: dataset.meta.asOf ?? null,
    rows: dataset.rows.map(normalizeProjectionRow).filter(Boolean) as NormalizedProjectionRow[],
  };
}

function normalizeProjectionRow(row: EmploymentProjectionRow): NormalizedProjectionRow | null {
  if (row.projectedOpenings == null || row.projectedOpenings <= 0) return null;
  return {
    socCode: row.socCode,
    title: row.title,
    annualOpenings: row.projectedOpenings,
    employment2024: row.employment2024,
    employment2034: row.employment2034,
    employmentChange: row.employmentChange,
    employmentPercentChange: row.employmentChangePct,
    medianAnnualWage: row.medianAnnualWage,
  };
}

function buildSnapshotFallbackRows(careers: CareerInsight[]): NormalizedProjectionRow[] {
  return careers
    .filter((career) => career.projectedOpenings != null && career.projectedOpenings > 0)
    .map((career) => ({
      socCode: career.occupationCode,
      title: career.occupationName,
      annualOpenings: career.projectedOpenings as number,
      employment2024: career.totalEmployment,
      employment2034: null,
      employmentChange: null,
      employmentPercentChange: null,
      medianAnnualWage: career.medianSalary > 0 ? career.medianSalary : null,
    }));
}

function toLaborOpportunityRow(
  row: NormalizedProjectionRow,
  career?: CareerInsight,
): LaborOpportunityRow | null {
  if (!career || row.annualOpenings <= 0) return null;

  const postings = getOccupationJobPostingsBySoc(row.socCode);

  return {
    socCode: row.socCode,
    title: career.occupationName || row.title,
    sector: career.sectorName,
    careerHref: `/careers/${row.socCode}`,
    aiExposure: career.automationProbability,
    automationRisk: career.automationRisk,
    annualOpenings: row.annualOpenings,
    currentEmployment: row.employment2024 ?? career.totalEmployment,
    projectedEmployment: row.employment2034,
    employmentChange: row.employmentChange,
    employmentPercentChange: row.employmentPercentChange,
    // D6: OEWS snapshot wage (career.medianSalary) is canonical — matches career pages.
    // Projections medianAnnualWage is a different vintage and capped for high earners;
    // use it only as fallback when the snapshot value is unavailable or non-positive.
    medianAnnualWage: career.medianSalary > 0 ? career.medianSalary : row.medianAnnualWage,
    latestAnnualPostings: postings?.latestAnnualPostings ?? null,
  };
}

function normalizeSource(
  source: { name?: string; publisher?: string } | string | null,
): { name: string | null; publisher: string | null } {
  if (typeof source === "string") {
    return { name: source, publisher: null };
  }
  return {
    name: source?.name ?? null,
    publisher: source?.publisher ?? null,
  };
}

function compareRows(a: LaborOpportunityRow, b: LaborOpportunityRow): number {
  return (
    b.annualOpenings - a.annualOpenings ||
    (b.latestAnnualPostings ?? 0) - (a.latestAnnualPostings ?? 0) ||
    a.title.localeCompare(b.title)
  );
}

function median(values: number[]): number | null {
  const filtered = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (filtered.length === 0) return null;

  const mid = Math.floor(filtered.length / 2);
  return filtered.length % 2 === 0
    ? (filtered[mid - 1] + filtered[mid]) / 2
    : filtered[mid];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
