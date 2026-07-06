import occupationalRequirementsData from "@/data/occupational-requirements.json";

export type OccupationalRequirementsCoverage = "exact-soc" | "broad-soc" | "missing";

export interface OccupationalRequirementsPreparation {
  educationRequirement: string | null;
  relatedWorkExperience: string | null;
  onTheJobTraining: string | null;
  svp: number | null;
}

export interface OccupationalRequirementsPhysical {
  standingWalkingPct: number | null;
  heavyLiftingPct: number | null;
  physicalPresenceScore: number | null;
}

export interface OccupationalRequirementsWorkConditions {
  hazardousPct: number | null;
  outdoorsPct: number | null;
  physicalEnvironmentScore: number | null;
}

export interface OccupationalRequirementsCognitive {
  decisionMakingPct: number | null;
  problemSolvingPct: number | null;
}

export interface OccupationalRequirementsOccupation {
  socCode: string;
  title: string;
  preparation: OccupationalRequirementsPreparation;
  physical: OccupationalRequirementsPhysical;
  workConditions?: OccupationalRequirementsWorkConditions;
  cognitive: OccupationalRequirementsCognitive;
  automationFrictionScore: number | null;
  coverage: OccupationalRequirementsCoverage;
}

export interface OccupationalRequirementsDataset {
  generatedAt: string;
  meta: {
    generatedAt: string;
    asOf: string;
    source: { name?: string; publisher?: string; url?: string } | string | null;
    version: string;
  };
  source: { name: string; publisher: string; url: string };
  coverage: {
    mode: string;
    primaryKey: "socCode";
    occupations: number;
    sourceOccupations: number;
    exactSocRows: number;
    broadSocRows: number;
    missingRows: number;
    scoredRows: number;
    providerInput: string | null;
    seedSourceDataset: string;
  };
  methodology: {
    provenanceDecision: string;
    seedStrategy: string;
    scoring: string;
    caveat: string;
  };
  providerContract: {
    grain: string;
    primaryKey: string;
    acceptedRows: string[];
    replaceFields: string[];
    requiredFields: string[];
    optionalFields: string[];
    recommendedSource: string;
  };
  summary: {
    averageAutomationFrictionScore: number | null;
    highFrictionOccupations: Array<Pick<OccupationalRequirementsOccupation, "socCode" | "title" | "automationFrictionScore" | "coverage">>;
    lowFrictionOccupations: Array<Pick<OccupationalRequirementsOccupation, "socCode" | "title" | "automationFrictionScore" | "coverage">>;
    byCoverage: Record<OccupationalRequirementsCoverage, number>;
  };
  occupations: OccupationalRequirementsOccupation[];
}

export type AutomationFrictionBand = "low" | "moderate" | "high" | "very-high";

export interface AutomationFrictionInterpretation {
  band: AutomationFrictionBand;
  label: string;
  summary: string;
}

export const OCCUPATIONAL_REQUIREMENTS_CAVEAT =
  "This release is a FutureGrid broad-SOC seed derived from public BLS ORS requirement concepts and categories, not direct occupation-level ORS survey estimates. It describes job requirements, not worker ability, AI capability, or displacement probability. Automation friction is a FutureGrid derived score and should be read alongside exposure, demand, wage, and projection signals.";

const data = occupationalRequirementsData as unknown as OccupationalRequirementsDataset;
const bySoc = new Map(data.occupations.map((row) => [row.socCode, row]));

export function getOccupationalRequirementsData(): OccupationalRequirementsDataset {
  return {
    ...data,
    coverage: { ...data.coverage },
    methodology: { ...data.methodology },
    providerContract: {
      ...data.providerContract,
      acceptedRows: [...data.providerContract.acceptedRows],
      replaceFields: [...data.providerContract.replaceFields],
      requiredFields: [...data.providerContract.requiredFields],
      optionalFields: [...data.providerContract.optionalFields],
    },
    summary: {
      ...data.summary,
      highFrictionOccupations: data.summary.highFrictionOccupations.map((row) => ({ ...row })),
      lowFrictionOccupations: data.summary.lowFrictionOccupations.map((row) => ({ ...row })),
      byCoverage: { ...data.summary.byCoverage },
    },
    occupations: data.occupations.map(cloneOccupation),
  };
}

export function getOccupationalRequirementBySoc(
  socCode: string,
): OccupationalRequirementsOccupation | undefined {
  const row = bySoc.get(socCode);
  return row ? cloneOccupation(row) : undefined;
}

export function getAutomationFrictionScoreBySoc(socCode: string): number | null {
  return bySoc.get(socCode)?.automationFrictionScore ?? null;
}

export function getOccupationsByAutomationFriction(
  limit = 10,
  direction: "highest" | "lowest" = "highest",
): OccupationalRequirementsOccupation[] {
  const sign = direction === "highest" ? -1 : 1;
  return [...data.occupations]
    .filter((row) => row.automationFrictionScore != null)
    .sort(
      (a, b) =>
        sign * ((a.automationFrictionScore ?? 0) - (b.automationFrictionScore ?? 0)) ||
        a.socCode.localeCompare(b.socCode),
    )
    .slice(0, limit)
    .map(cloneOccupation);
}

export function deriveAutomationFrictionScore(input: {
  preparation?: Partial<OccupationalRequirementsPreparation> | null;
  physical?: Partial<OccupationalRequirementsPhysical> | null;
  workConditions?: Partial<OccupationalRequirementsWorkConditions> | null;
  cognitive?: Partial<OccupationalRequirementsCognitive> | null;
}): number | null {
  const physicalScore = mean([
    input.physical?.physicalPresenceScore,
    input.physical?.standingWalkingPct,
    input.physical?.heavyLiftingPct,
  ]);
  const prepScore = preparationScore(input.preparation);
  const cognitiveScore = mean([
    input.cognitive?.decisionMakingPct,
    input.cognitive?.problemSolvingPct,
  ]);
  const conditionsScore =
    input.workConditions?.physicalEnvironmentScore ??
    mean([input.workConditions?.hazardousPct, input.workConditions?.outdoorsPct]);

  const weighted = weightedMean([
    [physicalScore, 0.35],
    [prepScore, 0.3],
    [cognitiveScore, 0.25],
    [conditionsScore, 0.1],
  ]);
  return weighted == null ? null : clampRound(weighted);
}

export function interpretAutomationFrictionScore(
  score: number | null,
): AutomationFrictionInterpretation | null {
  if (score == null) return null;
  if (score >= 75) {
    return {
      band: "very-high",
      label: "Very high friction",
      summary: "Strong physical, preparation, or work-context requirements should temper exposure-only readings.",
    };
  }
  if (score >= 60) {
    return {
      band: "high",
      label: "High friction",
      summary: "Job requirements add meaningful friction against direct AI substitution.",
    };
  }
  if (score >= 40) {
    return {
      band: "moderate",
      label: "Moderate friction",
      summary: "Some job requirements may slow substitution; compare with demand and projection signals.",
    };
  }
  return {
    band: "low",
    label: "Low friction",
    summary: "Few measured job requirements stand between high AI exposure and task redesign pressure.",
  };
}

function cloneOccupation(row: OccupationalRequirementsOccupation): OccupationalRequirementsOccupation {
  return {
    ...row,
    preparation: { ...row.preparation },
    physical: { ...row.physical },
    workConditions: row.workConditions ? { ...row.workConditions } : undefined,
    cognitive: { ...row.cognitive },
  };
}

function preparationScore(preparation?: Partial<OccupationalRequirementsPreparation> | null) {
  if (!preparation) return null;
  return weightedMean([
    [preparation.svp == null ? null : clamp((preparation.svp / 9) * 100), 0.45],
    [educationRequirementScore(preparation.educationRequirement), 0.3],
    [experienceRequirementScore(preparation.relatedWorkExperience), 0.15],
    [trainingRequirementScore(preparation.onTheJobTraining), 0.1],
  ]);
}

function educationRequirementScore(value?: string | null): number | null {
  if (!value) return null;
  const text = value.toLowerCase();
  if (text.includes("doctoral") || text.includes("professional") || text.includes("master")) return 90;
  if (text.includes("bachelor")) return 70;
  if (text.includes("associate")) return 50;
  if (text.includes("postsecondary")) return 40;
  if (text.includes("high school")) return 25;
  if (text.includes("no formal")) return 10;
  return 45;
}

function experienceRequirementScore(value?: string | null): number | null {
  if (!value) return null;
  const text = value.toLowerCase();
  if (text.includes("5 years") || text.includes("five years")) return 80;
  if (text.includes("less than")) return 45;
  if (text.includes("none")) return 0;
  return 35;
}

function trainingRequirementScore(value?: string | null): number | null {
  if (!value) return null;
  const text = value.toLowerCase();
  if (text.includes("long")) return 75;
  if (text.includes("moderate")) return 45;
  if (text.includes("short")) return 20;
  if (text.includes("none")) return 0;
  return 35;
}

function weightedMean(entries: Array<[number | null | undefined, number]>): number | null {
  let weightedSum = 0;
  let weightSum = 0;
  for (const [value, weight] of entries) {
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    weightedSum += value * weight;
    weightSum += weight;
  }
  return weightSum === 0 ? null : weightedSum / weightSum;
}

function mean(values: Array<number | null | undefined>): number | null {
  const finite = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (finite.length === 0) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function clampRound(value: number): number {
  return Math.round(clamp(value));
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, value));
}
