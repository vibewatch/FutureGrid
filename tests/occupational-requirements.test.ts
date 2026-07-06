import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { validateOccupationalRequirements } from "../scripts/lib/validate.mjs";
import {
  deriveAutomationFrictionScore,
  getAutomationFrictionScoreBySoc,
  getOccupationalRequirementBySoc,
  getOccupationalRequirementsData,
  getOccupationsByAutomationFriction,
  interpretAutomationFrictionScore,
  OCCUPATIONAL_REQUIREMENTS_CAVEAT,
} from "@/lib/occupational-requirements";

const ROOT = process.cwd();
const read = (rel: string) => JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));

describe("occupational requirements dataset", () => {
  const data = read("data/occupational-requirements.json");

  it("committed data/occupational-requirements.json passes validation", () => {
    expect(() => validateOccupationalRequirements(data)).not.toThrow();
  });

  it("covers the FutureGrid SOC source set with explicit seed coverage", () => {
    const dataset = getOccupationalRequirementsData();

    expect(dataset.coverage.primaryKey).toBe("socCode");
    expect(dataset.coverage.occupations).toBeGreaterThanOrEqual(756);
    expect(dataset.coverage.mode).toBe("seed-static");
    expect(dataset.coverage.broadSocRows).toBe(dataset.coverage.occupations);
    expect(dataset.coverage.exactSocRows).toBe(0);
    expect(dataset.methodology.caveat).toBe(OCCUPATIONAL_REQUIREMENTS_CAVEAT);
    expect(dataset.methodology.caveat).toMatch(/FutureGrid broad-SOC seed/i);
    expect(dataset.methodology.caveat).toMatch(/not direct occupation-level ORS survey estimates/i);
    expect(dataset.methodology.caveat).not.toMatch(/come from BLS ORS employer survey estimates/i);
    expect(dataset.providerContract.recommendedSource).toMatch(/BLS ORS/i);
  });

  it("exposes SOC-keyed requirement rows and defensive clones", () => {
    const softwareDevelopers = getOccupationalRequirementBySoc("15-1252");
    expect(softwareDevelopers).toMatchObject({
      socCode: "15-1252",
      title: expect.stringMatching(/software developers/i),
      coverage: "broad-soc",
    });
    expect(softwareDevelopers?.physical.physicalPresenceScore).toBeLessThan(40);
    expect(softwareDevelopers?.cognitive.problemSolvingPct).toBeGreaterThan(80);
    expect(getAutomationFrictionScoreBySoc("15-1252")).toBe(softwareDevelopers?.automationFrictionScore);

    if (softwareDevelopers) softwareDevelopers.physical.physicalPresenceScore = 100;
    expect(getOccupationalRequirementBySoc("15-1252")?.physical.physicalPresenceScore).toBeLessThan(40);
  });

  it("derives higher friction for physical/preparation-heavy roles than remote analytical roles", () => {
    const fieldRole = deriveAutomationFrictionScore({
      preparation: {
        educationRequirement: "Postsecondary nondegree award",
        relatedWorkExperience: "5 years or more",
        onTheJobTraining: "Long-term on-the-job training",
        svp: 7,
      },
      physical: {
        physicalPresenceScore: 95,
        standingWalkingPct: 90,
        heavyLiftingPct: 45,
      },
      workConditions: {
        hazardousPct: 55,
        outdoorsPct: 60,
        physicalEnvironmentScore: 58,
      },
      cognitive: {
        decisionMakingPct: 70,
        problemSolvingPct: 65,
      },
    });
    const remoteAnalyticalRole = deriveAutomationFrictionScore({
      preparation: {
        educationRequirement: "Bachelor's degree",
        relatedWorkExperience: "None",
        onTheJobTraining: "None",
        svp: 6,
      },
      physical: {
        physicalPresenceScore: 10,
        standingWalkingPct: 5,
        heavyLiftingPct: 0,
      },
      workConditions: {
        hazardousPct: 0,
        outdoorsPct: 0,
        physicalEnvironmentScore: 0,
      },
      cognitive: {
        decisionMakingPct: 60,
        problemSolvingPct: 80,
      },
    });

    expect(fieldRole).not.toBeNull();
    expect(remoteAnalyticalRole).not.toBeNull();
    expect((fieldRole ?? 0) - (remoteAnalyticalRole ?? 0)).toBeGreaterThan(25);
    expect(interpretAutomationFrictionScore(fieldRole)?.label).toMatch(/friction/i);
  });

  it("returns friction rankings in deterministic score order", () => {
    const highest = getOccupationsByAutomationFriction(8, "highest");
    const lowest = getOccupationsByAutomationFriction(8, "lowest");

    expect(highest).toHaveLength(8);
    expect(lowest).toHaveLength(8);
    for (let index = 1; index < highest.length; index += 1) {
      expect(highest[index - 1].automationFrictionScore ?? 0).toBeGreaterThanOrEqual(
        highest[index].automationFrictionScore ?? 0,
      );
      expect(lowest[index - 1].automationFrictionScore ?? 0).toBeLessThanOrEqual(
        lowest[index].automationFrictionScore ?? 0,
      );
    }
  });

  it("rejects datasets that omit the ORS caveat or score too few rows", () => {
    const badCaveat = structuredClone(data);
    badCaveat.methodology.caveat = "ORS data";
    expect(() => validateOccupationalRequirements(badCaveat)).toThrow(/limitations language/);

    const overclaim = structuredClone(data);
    overclaim.methodology.caveat =
      "Occupational requirements come from BLS ORS employer survey estimates. They describe job requirements, not worker ability, AI capability, or displacement probability.";
    expect(() => validateOccupationalRequirements(overclaim)).toThrow(/broad-SOC seed|direct ORS/);

    const tooFewScored = structuredClone(data);
    for (const row of tooFewScored.occupations) row.automationFrictionScore = null;
    tooFewScored.coverage.scoredRows = 0;
    expect(() => validateOccupationalRequirements(tooFewScored)).toThrow(/too few scored occupations/);
  });
});
