import { describe, expect, it } from "vitest";
import { getCareerEvidencePassport } from "@/lib/career-evidence-passport";

describe("getCareerEvidencePassport", () => {
  it("joins SOC exposure, wages, projections, demand, skills, and transitions", () => {
    const passport = getCareerEvidencePassport("11-1011");

    expect(passport).toMatchObject({
      socCode: "11-1011",
      title: expect.stringMatching(/chief executives/i),
      sector: expect.any(String),
      automationRisk: expect.any(String),
      jobPostingsMode: expect.any(String),
    });
    expect(passport?.aiExposurePct).toBeGreaterThan(0);
    expect(passport?.medianAnnualSalary).toBeGreaterThan(0);
    expect(passport?.projectedOpenings ?? 0).toBeGreaterThan(0);
    expect(passport?.h1bTotalLcas ?? 0).toBeGreaterThan(0);
    expect(passport?.latestAnnualPostings ?? 0).toBeGreaterThan(0);
    expect(passport?.orsAutomationFrictionScore ?? 0).toBeGreaterThan(0);
    expect(passport?.orsCoverage).toBe("broad-soc");
    expect(passport?.skills.length).toBeGreaterThan(0);
    expect(passport?.transitions.length).toBeGreaterThan(0);
    expect(passport?.caveats.join(" ")).toMatch(
      /not visa approvals|proxy|FutureGrid broad-SOC seed/i,
    );
  });

  it("returns null for an unknown SOC", () => {
    expect(getCareerEvidencePassport("00-0000")).toBeNull();
  });
});
