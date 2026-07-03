import jobPostingsData from "@/data/job-postings.json";

export interface JobPostingsRelatedOccupation {
  socCode: string;
  title: string;
  brightOutlook: boolean;
}

export interface JobPostingsOccupation {
  socCode: string;
  title: string;
  sector: string;
  sampleTitles: string[];
  relatedOccupations: JobPostingsRelatedOccupation[];
  annualPostings: Record<string, number>;
  relatedAnnualPostings: Record<string, number>;
  latestAnnualPostings: number;
  latestRelatedAnnualPostings: number;
  sourceStatus: "seed-derived" | (string & {});
}

export interface JobPostingsCoverage {
  years: number[];
  occupations: number;
  occupationsWithRelatedJobs: number;
  currentSourceDataset: string;
  relatedOccupationSourceDataset: string;
  observedHistoricalPostings: boolean;
  mode: "seed-static" | (string & {});
  primaryKey: "socCode" | (string & {});
}

export interface JobPostingsSummary {
  latestYear: number;
  totalAnnualPostingsByYear: Record<string, number>;
  totalRelatedAnnualPostingsByYear: Record<string, number>;
  topOccupationsLatestYear: {
    socCode: string;
    title: string;
    annualPostings: number;
  }[];
}

export interface JobPostingsDataset {
  meta: {
    generatedAt: string;
    asOf: string;
    source: { name?: string; publisher?: string; url?: string } | string | null;
    version: string;
  };
  coverage: JobPostingsCoverage;
  methodology: {
    provenanceDecision: string;
    annualization: string;
    relatedJobs: string;
    caveat: string;
  };
  providerContract: {
    metric: string;
    grain: string;
    primaryKey: string;
    alternateKeys: string[];
    requiredYears: number[];
    replaceFields: string[];
    recommendedProviders: string[];
  };
  summary: JobPostingsSummary;
  occupations: JobPostingsOccupation[];
}

const data = jobPostingsData as unknown as JobPostingsDataset;
const bySoc = new Map(data.occupations.map((row) => [row.socCode, row]));

export function getJobPostingsData(): JobPostingsDataset {
  return {
    ...data,
    coverage: {
      ...data.coverage,
      years: [...data.coverage.years],
    },
    providerContract: {
      ...data.providerContract,
      alternateKeys: [...data.providerContract.alternateKeys],
      requiredYears: [...data.providerContract.requiredYears],
      replaceFields: [...data.providerContract.replaceFields],
      recommendedProviders: [...data.providerContract.recommendedProviders],
    },
    summary: getJobPostingsSummary(),
    occupations: data.occupations.map(cloneOccupation),
  };
}

export function getJobPostingYears(): number[] {
  return [...data.coverage.years];
}

export function getJobPostingsCoverage(): JobPostingsCoverage {
  return {
    ...data.coverage,
    years: [...data.coverage.years],
  };
}

export function getJobPostingsSummary(): JobPostingsSummary {
  return {
    ...data.summary,
    totalAnnualPostingsByYear: { ...data.summary.totalAnnualPostingsByYear },
    totalRelatedAnnualPostingsByYear: {
      ...data.summary.totalRelatedAnnualPostingsByYear,
    },
    topOccupationsLatestYear: data.summary.topOccupationsLatestYear.map((row) => ({
      ...row,
    })),
  };
}

export function getOccupationJobPostingsBySoc(
  socCode: string
): JobPostingsOccupation | undefined {
  const row = bySoc.get(socCode);
  return row ? cloneOccupation(row) : undefined;
}

export function getTopJobPostingOccupations(
  limit = 10,
  year = data.summary.latestYear
): JobPostingsOccupation[] {
  const key = String(year);
  return [...data.occupations]
    .sort(
      (a, b) =>
        (b.annualPostings[key] ?? 0) - (a.annualPostings[key] ?? 0) ||
        a.title.localeCompare(b.title)
    )
    .slice(0, limit)
    .map(cloneOccupation);
}

export function getRelatedJobPostingsBySoc(
  socCode: string
): JobPostingsOccupation[] {
  const row = bySoc.get(socCode);
  if (!row) return [];
  return row.relatedOccupations
    .map((related) => bySoc.get(related.socCode))
    .filter((related): related is JobPostingsOccupation => Boolean(related))
    .sort(
      (a, b) =>
        b.latestAnnualPostings - a.latestAnnualPostings ||
        a.title.localeCompare(b.title)
    )
    .map(cloneOccupation);
}

function cloneOccupation(row: JobPostingsOccupation): JobPostingsOccupation {
  return {
    ...row,
    sampleTitles: [...row.sampleTitles],
    relatedOccupations: row.relatedOccupations.map((related) => ({ ...related })),
    annualPostings: { ...row.annualPostings },
    relatedAnnualPostings: { ...row.relatedAnnualPostings },
  };
}
