#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { buildMeta } from "./lib/meta.mjs";
import { validateOccupationalRequirements } from "./lib/validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const OUTPUT_FILE = process.env.ORS_OUTPUT_FILE
  ? resolvePath(process.env.ORS_OUTPUT_FILE)
  : join(DATA_DIR, "occupational-requirements.json");
const PROVIDER_FILE = process.env.ORS_PROVIDER_FILE
  ? resolvePath(process.env.ORS_PROVIDER_FILE)
  : null;

const SOURCE = {
  name: "BLS Occupational Requirements Survey (ORS)",
  publisher: "U.S. Bureau of Labor Statistics",
  url: "https://www.bls.gov/ors/data.htm",
};

const REQUIRED_CAVEAT =
  "This release is a FutureGrid broad-SOC seed derived from public BLS ORS requirement concepts and categories, not direct occupation-level ORS survey estimates. It describes job requirements, not worker ability, AI capability, or displacement probability. Automation friction is a FutureGrid derived score and should be read alongside exposure, demand, wage, and projection signals.";

const EDUCATION_BY_JOB_ZONE = {
  1: "No formal educational credential",
  2: "High school diploma or equivalent",
  3: "Postsecondary nondegree award",
  4: "Bachelor's degree",
  5: "Master's degree or higher",
};

const EXPERIENCE_BY_JOB_ZONE = {
  1: "None",
  2: "None",
  3: "Less than 5 years",
  4: "Less than 5 years",
  5: "5 years or more",
};

const TRAINING_BY_JOB_ZONE = {
  1: "Short-term on-the-job training",
  2: "Moderate-term on-the-job training",
  3: "Long-term on-the-job training",
  4: "None",
  5: "None",
};

const SVP_BY_JOB_ZONE = {
  1: 2,
  2: 4,
  3: 6,
  4: 7,
  5: 8,
};

const BROAD_SOC_FACTORS = {
  "11": { physicalPresenceScore: 45, standingWalkingPct: 18, heavyLiftingPct: 5, hazardousPct: 7, outdoorsPct: 3, decisionMakingPct: 82, problemSolvingPct: 78 },
  "13": { physicalPresenceScore: 35, standingWalkingPct: 10, heavyLiftingPct: 2, hazardousPct: 3, outdoorsPct: 1, decisionMakingPct: 70, problemSolvingPct: 72 },
  "15": { physicalPresenceScore: 25, standingWalkingPct: 5, heavyLiftingPct: 1, hazardousPct: 2, outdoorsPct: 1, decisionMakingPct: 72, problemSolvingPct: 82 },
  "17": { physicalPresenceScore: 50, standingWalkingPct: 20, heavyLiftingPct: 7, hazardousPct: 15, outdoorsPct: 10, decisionMakingPct: 70, problemSolvingPct: 80 },
  "19": { physicalPresenceScore: 45, standingWalkingPct: 25, heavyLiftingPct: 5, hazardousPct: 12, outdoorsPct: 12, decisionMakingPct: 70, problemSolvingPct: 78 },
  "21": { physicalPresenceScore: 65, standingWalkingPct: 45, heavyLiftingPct: 6, hazardousPct: 18, outdoorsPct: 8, decisionMakingPct: 72, problemSolvingPct: 68 },
  "23": { physicalPresenceScore: 35, standingWalkingPct: 8, heavyLiftingPct: 1, hazardousPct: 2, outdoorsPct: 1, decisionMakingPct: 78, problemSolvingPct: 74 },
  "25": { physicalPresenceScore: 78, standingWalkingPct: 55, heavyLiftingPct: 2, hazardousPct: 6, outdoorsPct: 3, decisionMakingPct: 72, problemSolvingPct: 70 },
  "27": { physicalPresenceScore: 45, standingWalkingPct: 22, heavyLiftingPct: 3, hazardousPct: 8, outdoorsPct: 5, decisionMakingPct: 62, problemSolvingPct: 67 },
  "29": { physicalPresenceScore: 82, standingWalkingPct: 63, heavyLiftingPct: 8, hazardousPct: 28, outdoorsPct: 2, decisionMakingPct: 78, problemSolvingPct: 76 },
  "31": { physicalPresenceScore: 88, standingWalkingPct: 76, heavyLiftingPct: 18, hazardousPct: 35, outdoorsPct: 3, decisionMakingPct: 60, problemSolvingPct: 55 },
  "33": { physicalPresenceScore: 92, standingWalkingPct: 70, heavyLiftingPct: 20, hazardousPct: 45, outdoorsPct: 35, decisionMakingPct: 75, problemSolvingPct: 65 },
  "35": { physicalPresenceScore: 90, standingWalkingPct: 84, heavyLiftingPct: 10, hazardousPct: 28, outdoorsPct: 5, decisionMakingPct: 48, problemSolvingPct: 44 },
  "37": { physicalPresenceScore: 92, standingWalkingPct: 86, heavyLiftingPct: 22, hazardousPct: 35, outdoorsPct: 32, decisionMakingPct: 44, problemSolvingPct: 40 },
  "39": { physicalPresenceScore: 88, standingWalkingPct: 78, heavyLiftingPct: 12, hazardousPct: 18, outdoorsPct: 6, decisionMakingPct: 56, problemSolvingPct: 50 },
  "41": { physicalPresenceScore: 70, standingWalkingPct: 58, heavyLiftingPct: 5, hazardousPct: 6, outdoorsPct: 4, decisionMakingPct: 58, problemSolvingPct: 52 },
  "43": { physicalPresenceScore: 55, standingWalkingPct: 28, heavyLiftingPct: 3, hazardousPct: 4, outdoorsPct: 1, decisionMakingPct: 55, problemSolvingPct: 58 },
  "45": { physicalPresenceScore: 95, standingWalkingPct: 88, heavyLiftingPct: 35, hazardousPct: 42, outdoorsPct: 82, decisionMakingPct: 48, problemSolvingPct: 45 },
  "47": { physicalPresenceScore: 96, standingWalkingPct: 86, heavyLiftingPct: 45, hazardousPct: 55, outdoorsPct: 62, decisionMakingPct: 55, problemSolvingPct: 55 },
  "49": { physicalPresenceScore: 92, standingWalkingPct: 72, heavyLiftingPct: 38, hazardousPct: 45, outdoorsPct: 28, decisionMakingPct: 62, problemSolvingPct: 62 },
  "51": { physicalPresenceScore: 90, standingWalkingPct: 82, heavyLiftingPct: 28, hazardousPct: 38, outdoorsPct: 8, decisionMakingPct: 50, problemSolvingPct: 48 },
  "53": { physicalPresenceScore: 94, standingWalkingPct: 76, heavyLiftingPct: 32, hazardousPct: 36, outdoorsPct: 24, decisionMakingPct: 58, problemSolvingPct: 52 },
};

const DEFAULT_FACTORS = {
  physicalPresenceScore: 65,
  standingWalkingPct: 45,
  heavyLiftingPct: 10,
  hazardousPct: 12,
  outdoorsPct: 8,
  decisionMakingPct: 60,
  problemSolvingPct: 60,
};

function main() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });

  const snapshotRaw = JSON.parse(readFileSync(join(DATA_DIR, "occupation-snapshot.json"), "utf8"));
  const occupations = (Array.isArray(snapshotRaw) ? snapshotRaw : snapshotRaw.data).map(normalizeSnapshotRow);
  const providerInput = PROVIDER_FILE ? readProviderInput(PROVIDER_FILE) : null;
  const providerRows = new Map((providerInput?.rows ?? []).map((row) => [row.socCode, row]));

  const rows = occupations
    .map((occupation) => {
      const providerRow = providerRows.get(occupation.socCode);
      return providerRow ? applyProviderRow(occupation, providerRow) : buildSeedRow(occupation);
    })
    .sort((a, b) => a.socCode.localeCompare(b.socCode));

  const scoredRows = rows.filter((row) => row.automationFrictionScore != null);
  const exactSocRows = rows.filter((row) => row.coverage === "exact-soc").length;
  const broadSocRows = rows.filter((row) => row.coverage === "broad-soc").length;
  const missingRows = rows.filter((row) => row.coverage === "missing").length;
  const sortedScored = [...scoredRows].sort(
    (a, b) =>
      (b.automationFrictionScore ?? -1) - (a.automationFrictionScore ?? -1) ||
      a.socCode.localeCompare(b.socCode)
  );

  const dataset = {
    generatedAt: new Date().toISOString(),
    meta: buildMeta({
      asOf: providerInput?.asOf ?? "2025 ORS concepts / FutureGrid seed v1",
      source: providerInput?.source ?? SOURCE,
    }),
    source: SOURCE,
    coverage: {
      mode: providerInput
        ? exactSocRows === rows.length
          ? "observed-ors-provider"
          : "observed-ors-provider-with-seed-fallback"
        : "seed-static",
      primaryKey: "socCode",
      occupations: rows.length,
      sourceOccupations: occupations.length,
      exactSocRows,
      broadSocRows,
      missingRows,
      scoredRows: scoredRows.length,
      providerInput: PROVIDER_FILE ? PROVIDER_FILE.replace(`${ROOT}/`, "") : null,
      seedSourceDataset: "data/occupation-snapshot.json",
    },
    methodology: {
      provenanceDecision:
        "BLS ORS publishes public SOC-keyed job requirement estimates, but its bulk time-series files and complete workbook are access-gated/bot-blocked in this build environment. This snapshot uses a deterministic ORS-concept seed derived from broad SOC families plus FutureGrid occupation metadata, with an ORS_PROVIDER_FILE overlay contract for future exact SOC estimates.",
      seedStrategy:
        "Broad SOC families provide expected physical presence, standing/walking, heavy lifting, hazardous/outdoor conditions, and decision-making/problem-solving anchors. Occupation job zones and skills refine preparation burden and cognitive intensity.",
      scoring:
        "Automation friction is 35% physical presence/body-environment requirements, 30% preparation burden, 25% decision/problem-solving requirements, and 10% adverse work conditions. Higher scores mean more job-requirement friction against direct AI substitution.",
      caveat: REQUIRED_CAVEAT,
    },
    providerContract: {
      grain: "occupation",
      primaryKey: "socCode",
      acceptedRows: ["rows", "occupations"],
      replaceFields: [
        "occupations[].preparation",
        "occupations[].physical",
        "occupations[].workConditions",
        "occupations[].cognitive",
        "occupations[].automationFrictionScore",
        "occupations[].coverage",
      ],
      requiredFields: ["socCode"],
      optionalFields: [
        "preparation.educationRequirement",
        "preparation.relatedWorkExperience",
        "preparation.onTheJobTraining",
        "preparation.svp",
        "physical.standingWalkingPct",
        "physical.heavyLiftingPct",
        "physical.physicalPresenceScore",
        "workConditions.hazardousPct",
        "workConditions.outdoorsPct",
        "cognitive.decisionMakingPct",
        "cognitive.problemSolvingPct",
        "automationFrictionScore",
      ],
      recommendedSource: "BLS ORS complete dataset or ORS time-series files joined by SOC code",
    },
    summary: {
      averageAutomationFrictionScore: round1(mean(scoredRows.map((row) => row.automationFrictionScore))),
      highFrictionOccupations: sortedScored.slice(0, 10).map(summaryRow),
      lowFrictionOccupations: [...sortedScored].reverse().slice(0, 10).map(summaryRow),
      byCoverage: {
        "exact-soc": exactSocRows,
        "broad-soc": broadSocRows,
        missing: missingRows,
      },
    },
    occupations: rows,
  };

  validateOccupationalRequirements(dataset);
  writeFileSync(OUTPUT_FILE, `${JSON.stringify(dataset, null, 2)}\n`);
  console.log(
    `[build-ors] wrote data/occupational-requirements.json (${rows.length} occupations, ${exactSocRows} exact ORS/provider rows, ${broadSocRows} seed rows)`
  );
}

function resolvePath(filePath) {
  return isAbsolute(filePath) ? filePath : resolve(ROOT, filePath);
}

function normalizeSnapshotRow(row) {
  return {
    socCode: String(row.socCode),
    title: String(row.title),
    sector: String(row.sector ?? "Unknown"),
    jobZone: Number.isFinite(Number(row.jobZone)) ? Number(row.jobZone) : null,
    skills: Array.isArray(row.skills) ? row.skills.map(String) : [],
  };
}

function buildSeedRow(occupation) {
  const factors = adjustedFactors(occupation);
  const jobZone = clampNumber(Math.round(occupation.jobZone ?? inferJobZone(occupation)), 1, 5);
  const preparation = {
    educationRequirement: EDUCATION_BY_JOB_ZONE[jobZone] ?? null,
    relatedWorkExperience: EXPERIENCE_BY_JOB_ZONE[jobZone] ?? null,
    onTheJobTraining: TRAINING_BY_JOB_ZONE[jobZone] ?? null,
    svp: SVP_BY_JOB_ZONE[jobZone] ?? null,
  };
  const physical = {
    standingWalkingPct: roundPct(factors.standingWalkingPct),
    heavyLiftingPct: roundPct(factors.heavyLiftingPct),
    physicalPresenceScore: roundPct(factors.physicalPresenceScore),
  };
  const workConditions = {
    hazardousPct: roundPct(factors.hazardousPct),
    outdoorsPct: roundPct(factors.outdoorsPct),
    physicalEnvironmentScore: roundPct((factors.hazardousPct + factors.outdoorsPct) / 2),
  };
  const cognitive = {
    decisionMakingPct: roundPct(factors.decisionMakingPct),
    problemSolvingPct: roundPct(factors.problemSolvingPct),
  };

  return {
    socCode: occupation.socCode,
    title: occupation.title,
    preparation,
    physical,
    workConditions,
    cognitive,
    automationFrictionScore: calculateAutomationFrictionScore({ preparation, physical, workConditions, cognitive }),
    coverage: "broad-soc",
  };
}

function adjustedFactors(occupation) {
  const broad = occupation.socCode.slice(0, 2);
  const factors = { ...(BROAD_SOC_FACTORS[broad] ?? DEFAULT_FACTORS) };
  const skillText = occupation.skills.join(" | ").toLowerCase();
  const title = occupation.title.toLowerCase();

  if (/nurse|physician|surgeon|dentist|therapist|paramedic|veterinarian/.test(title)) {
    add(factors, { physicalPresenceScore: 8, standingWalkingPct: 10, hazardousPct: 8, decisionMakingPct: 4 });
  }
  if (/driver|operator|mechanic|repair|installer|laborer|construction|carpenter|electrician|plumber/.test(title)) {
    add(factors, { physicalPresenceScore: 8, standingWalkingPct: 8, heavyLiftingPct: 10, hazardousPct: 8, outdoorsPct: 6 });
  }
  if (/software|developer|programmer|data scientist|web developer|actuar/.test(title)) {
    add(factors, { physicalPresenceScore: -8, standingWalkingPct: -5, heavyLiftingPct: -2, problemSolvingPct: 8 });
  }
  if (/teacher|instructor|professor|counselor|social worker/.test(title)) {
    add(factors, { physicalPresenceScore: 6, standingWalkingPct: 5, decisionMakingPct: 4 });
  }
  if (/manager|executive|supervisor|chief/.test(title)) {
    add(factors, { decisionMakingPct: 8, problemSolvingPct: 4 });
  }

  if (/judgment and decision making|management of personnel|negotiation/.test(skillText)) {
    add(factors, { decisionMakingPct: 6 });
  }
  if (/complex problem solving|systems analysis|programming|science|mathematics/.test(skillText)) {
    add(factors, { problemSolvingPct: 7 });
  }
  if (/equipment maintenance|repairing|operation and control|installation/.test(skillText)) {
    add(factors, { physicalPresenceScore: 5, heavyLiftingPct: 6, hazardousPct: 5 });
  }
  if (/service orientation|social perceptiveness|instructing|speaking/.test(skillText)) {
    add(factors, { physicalPresenceScore: 3 });
  }

  for (const key of Object.keys(factors)) {
    factors[key] = clampNumber(factors[key], 0, 100);
  }
  return factors;
}

function add(target, delta) {
  for (const [key, value] of Object.entries(delta)) {
    target[key] = (target[key] ?? 0) + value;
  }
}

function inferJobZone(occupation) {
  const skillText = occupation.skills.join(" | ").toLowerCase();
  if (/programming|systems analysis|science|mathematics|complex problem solving/.test(skillText)) return 4;
  if (/operation and control|equipment maintenance|repairing/.test(skillText)) return 3;
  return 3;
}

function readProviderInput(filePath) {
  const raw = JSON.parse(readFileSync(filePath, "utf8"));
  const rows = Array.isArray(raw?.rows)
    ? raw.rows
    : Array.isArray(raw?.occupations)
      ? raw.occupations
      : null;
  if (!rows) {
    throw new Error("[build-ors] provider input must contain a rows or occupations array");
  }
  return {
    asOf: typeof raw?.meta?.asOf === "string" ? raw.meta.asOf : "provider input",
    source: raw?.meta?.source ?? {
      name: "Configured ORS provider input",
      publisher: "Configured provider",
      url: null,
    },
    rows: rows.map(normalizeProviderRow),
  };
}

function normalizeProviderRow(row, index) {
  const socCode = typeof row?.socCode === "string" ? row.socCode : row?.soc;
  if (typeof socCode !== "string" || !/^\d{2}-\d{4}$/.test(socCode)) {
    throw new Error(`[build-ors] provider row ${index + 1} has invalid or missing SOC code`);
  }
  const preparation = normalizePreparation(row.preparation ?? row);
  const physical = normalizePhysical(row.physical ?? row);
  const workConditions = normalizeWorkConditions(row.workConditions ?? row);
  const cognitive = normalizeCognitive(row.cognitive ?? row);
  const score = toNullableScore(row.automationFrictionScore);
  return {
    socCode,
    title: typeof row.title === "string" ? row.title : null,
    preparation,
    physical,
    workConditions,
    cognitive,
    automationFrictionScore: score ?? calculateAutomationFrictionScore({ preparation, physical, workConditions, cognitive }),
  };
}

function applyProviderRow(occupation, providerRow) {
  const fallback = buildSeedRow(occupation);
  const preparation = mergeNested(fallback.preparation, providerRow.preparation);
  const physical = mergeNested(fallback.physical, providerRow.physical);
  const workConditions = mergeNested(fallback.workConditions, providerRow.workConditions);
  const cognitive = mergeNested(fallback.cognitive, providerRow.cognitive);
  return {
    socCode: occupation.socCode,
    title: providerRow.title ?? occupation.title,
    preparation,
    physical,
    workConditions,
    cognitive,
    automationFrictionScore:
      providerRow.automationFrictionScore ??
      calculateAutomationFrictionScore({ preparation, physical, workConditions, cognitive }),
    coverage: "exact-soc",
  };
}

function mergeNested(seed, overlay) {
  const merged = { ...seed };
  for (const [key, value] of Object.entries(overlay ?? {})) {
    if (value !== undefined && value !== null) merged[key] = value;
  }
  return merged;
}

function normalizePreparation(input) {
  return {
    educationRequirement: nullableString(input.educationRequirement ?? input.education),
    relatedWorkExperience: nullableString(input.relatedWorkExperience ?? input.experience),
    onTheJobTraining: nullableString(input.onTheJobTraining ?? input.training),
    svp: toNullableNumber(input.svp, 0, 9),
  };
}

function normalizePhysical(input) {
  return {
    standingWalkingPct: toNullableNumber(input.standingWalkingPct ?? input.standingWalkingPercent, 0, 100),
    heavyLiftingPct: toNullableNumber(input.heavyLiftingPct ?? input.heavyLiftingPercent, 0, 100),
    physicalPresenceScore: toNullableNumber(input.physicalPresenceScore ?? input.physicalPresencePct, 0, 100),
  };
}

function normalizeWorkConditions(input) {
  const hazardousPct = toNullableNumber(input.hazardousPct ?? input.hazardousPercent, 0, 100);
  const outdoorsPct = toNullableNumber(input.outdoorsPct ?? input.outdoorsPercent, 0, 100);
  return {
    hazardousPct,
    outdoorsPct,
    physicalEnvironmentScore:
      toNullableNumber(input.physicalEnvironmentScore, 0, 100) ??
      (hazardousPct == null && outdoorsPct == null ? null : roundPct(mean([hazardousPct, outdoorsPct].filter((v) => v != null)))),
  };
}

function normalizeCognitive(input) {
  return {
    decisionMakingPct: toNullableNumber(input.decisionMakingPct ?? input.decisionMakingPercent, 0, 100),
    problemSolvingPct: toNullableNumber(input.problemSolvingPct ?? input.problemSolvingPercent, 0, 100),
  };
}

function calculateAutomationFrictionScore({ preparation, physical, workConditions, cognitive }) {
  const physicalScore = mean([
    physical?.physicalPresenceScore,
    physical?.standingWalkingPct,
    physical?.heavyLiftingPct,
  ].filter((v) => v != null));
  const prepScore = preparationScore(preparation);
  const cognitiveScore = mean([
    cognitive?.decisionMakingPct,
    cognitive?.problemSolvingPct,
  ].filter((v) => v != null));
  const conditionsScore = workConditions?.physicalEnvironmentScore ?? mean([
    workConditions?.hazardousPct,
    workConditions?.outdoorsPct,
  ].filter((v) => v != null));

  const weighted = weightedMean([
    [physicalScore, 0.35],
    [prepScore, 0.3],
    [cognitiveScore, 0.25],
    [conditionsScore, 0.1],
  ]);
  return weighted == null ? null : roundPct(weighted);
}

function preparationScore(preparation) {
  if (!preparation) return null;
  const svpScore = preparation.svp == null ? null : clampNumber((preparation.svp / 9) * 100, 0, 100);
  const educationScore = educationRequirementScore(preparation.educationRequirement);
  const experienceScore = experienceRequirementScore(preparation.relatedWorkExperience);
  const trainingScore = trainingRequirementScore(preparation.onTheJobTraining);
  return weightedMean([
    [svpScore, 0.45],
    [educationScore, 0.3],
    [experienceScore, 0.15],
    [trainingScore, 0.1],
  ]);
}

function educationRequirementScore(value) {
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

function experienceRequirementScore(value) {
  if (!value) return null;
  const text = value.toLowerCase();
  if (text.includes("5 years") || text.includes("five years")) return 80;
  if (text.includes("less than")) return 45;
  if (text.includes("none")) return 0;
  return 35;
}

function trainingRequirementScore(value) {
  if (!value) return null;
  const text = value.toLowerCase();
  if (text.includes("long")) return 75;
  if (text.includes("moderate")) return 45;
  if (text.includes("short")) return 20;
  if (text.includes("none")) return 0;
  return 35;
}

function summaryRow(row) {
  return {
    socCode: row.socCode,
    title: row.title,
    automationFrictionScore: row.automationFrictionScore,
    coverage: row.coverage,
  };
}

function nullableString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toNullableScore(value) {
  return toNullableNumber(value, 0, 100);
}

function toNullableNumber(value, min = -Infinity, max = Infinity) {
  if (value == null || value === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return round1(clampNumber(number, min, max));
}

function weightedMean(entries) {
  let weightedSum = 0;
  let weightSum = 0;
  for (const [value, weight] of entries) {
    if (value == null || !Number.isFinite(value)) continue;
    weightedSum += value * weight;
    weightSum += weight;
  }
  return weightSum === 0 ? null : weightedSum / weightSum;
}

function mean(values) {
  const finite = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  if (finite.length === 0) return null;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function roundPct(value) {
  return Math.round(clampNumber(value, 0, 100));
}

function round1(value) {
  return value == null ? null : Math.round(value * 10) / 10;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

main();
