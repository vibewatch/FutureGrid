import {
  generateAllCareerInsights,
  getReskillingPaths,
  type CareerInsight,
} from "@/lib/data";
import { getEmploymentProjectionBySoc } from "@/lib/employment-projections";
import { getOccupationSignalBySoc } from "@/lib/h1b";
import {
  getJobPostingsCoverage,
  getJobPostingsSummary,
  getOccupationJobPostingsBySoc,
} from "@/lib/job-postings";

export interface CareerEvidencePassportTransition {
  socCode: string;
  title: string;
  transitionScore: number;
  exposureDropPts: number;
  missingSkills: string[];
}

export interface CareerEvidencePassport {
  socCode: string;
  title: string;
  sector: string;
  aiExposurePct: number;
  automationRisk: CareerInsight["automationRisk"];
  medianAnnualSalary: number;
  currentEmployment: number | null;
  projectedEmployment: number | null;
  employmentChangePct: number | null;
  projectedOpenings: number | null;
  projectionWindow: string | null;
  h1bTotalLcas: number | null;
  h1bLatestLcas: number | null;
  h1bLatestFiscalYear: number | null;
  h1bMedianWageAnnual: number | null;
  h1bCagr: number | null;
  latestAnnualPostings: number | null;
  jobPostingYear: number | null;
  jobPostingsSourceStatus: string | null;
  jobPostingsMode: string;
  skills: string[];
  transitions: CareerEvidencePassportTransition[];
  caveats: string[];
}

export function getCareerEvidencePassport(socCode: string): CareerEvidencePassport | null {
  const career = generateAllCareerInsights().find((row) => row.occupationCode === socCode);
  if (!career) return null;

  const projection = getEmploymentProjectionBySoc(socCode);
  const h1b = getOccupationSignalBySoc(socCode);
  const postings = getOccupationJobPostingsBySoc(socCode);
  const postingCoverage = getJobPostingsCoverage();
  const postingSummary = getJobPostingsSummary();
  const transitions = getReskillingPaths(socCode, 3, "score").map((row) => ({
    socCode: row.occupationCode,
    title: row.occupationName,
    transitionScore: row.transitionScore,
    exposureDropPts: row.exposureDropPts,
    missingSkills: row.missingSkills.slice(0, 3),
  }));

  return {
    socCode,
    title: career.occupationName,
    sector: career.sectorName,
    aiExposurePct: round1(career.automationProbability * 100),
    automationRisk: career.automationRisk,
    medianAnnualSalary: career.medianSalary,
    currentEmployment: projection?.employment2024 ?? career.totalEmployment,
    projectedEmployment: projection?.employment2034 ?? null,
    employmentChangePct: projection?.employmentChangePct ?? null,
    projectedOpenings: projection?.projectedOpenings ?? career.projectedOpenings,
    projectionWindow: projection ? "2024–2034" : null,
    h1bTotalLcas: h1b?.totalCount ?? null,
    h1bLatestLcas: h1b?.latestYearCount ?? null,
    h1bLatestFiscalYear: h1b?.latestYear ?? null,
    h1bMedianWageAnnual: h1b?.medianWageAnnualLatest ?? null,
    h1bCagr: h1b?.cagr ?? null,
    latestAnnualPostings: postings?.latestAnnualPostings ?? null,
    jobPostingYear: postingSummary.latestYear,
    jobPostingsSourceStatus: postings?.sourceStatus ?? null,
    jobPostingsMode: postingCoverage.mode,
    skills: career.skills.slice(0, 8),
    transitions,
    caveats: [
      "H-1B values are certified Labor Condition Applications, not visa approvals.",
      `Job postings are ${postingCoverage.mode} ${postings?.sourceStatus ?? "proxy"} data until a licensed observed provider is wired in.`,
      "Transition matches are directional skill-overlap context, not placement guarantees.",
    ],
  };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
