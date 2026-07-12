import { describe, expect, it, vi } from "vitest";

import {
  getTalentBottleneckData,
  type TalentBottleneckRow,
} from "@/lib/talent-bottleneck";
import { getOccupationsSorted } from "@/lib/h1b";

describe("getTalentBottleneckData", () => {
  it("joins H-1B, projections, postings, and occupation snapshot fields by SOC", () => {
    const data = getTalentBottleneckData();
    const developer = findRow(data.rows, "11-1011");

    expect(developer.title).toBe("Chief Executives");
    expect(developer.sector).toBe("Management");
    expect(developer.sourceFlags).toMatchObject({
      hasH1b: true,
      hasEmploymentProjection: true,
      hasJobPostings: true,
      hasOccupationSnapshot: true,
    });
    expect(data.summary.jobPostingsMode).toBe("seed-static");
    expect(data.summary.jobPostingsObserved).toBe(false);
    expect(developer.sourceFlags.jobPostingsSourceStatus).toBe("seed-derived");
    expect(developer.latestLcas).toBeGreaterThan(0);
    expect(developer.totalLcas).toBeGreaterThan(0);
    expect(developer.h1bCagr).not.toBeNull();
    expect(developer.h1bTrend).toBe("rising");
    expect(developer.medianWageAnnual).toBeGreaterThan(0);
    expect(developer.projectedOpenings).toBe(16800);
    expect(developer.employmentChangePct).not.toBeNull();
    expect(developer.latestPostings).toBeGreaterThan(0);
    expect(developer.aiExposure).not.toBeNull();
    expect(developer.automationRisk).not.toBeNull();
  });

  it("returns finite bounded scores and sorted sequential ranks", () => {
    const { rows, summary } = getTalentBottleneckData();

    expect(rows.length).toBeGreaterThan(700);
    expect(summary.occupationsTracked).toBe(rows.length);
    expect(summary.scoreRange.min).toBeGreaterThanOrEqual(0);
    expect(summary.scoreRange.max).toBeLessThanOrEqual(100);

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      expect(row.rank).toBe(index + 1);
      expect(Number.isFinite(row.score)).toBe(true);
      expect(row.score).toBeGreaterThanOrEqual(0);
      expect(row.score).toBeLessThanOrEqual(100);
      for (const value of Object.values(row.scoreComponents)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      if (index > 0) {
        expect(rows[index - 1].score).toBeGreaterThanOrEqual(row.score);
      }
    }
  });

  it("keeps H-1B CAGR as a decimal fraction for scoring", () => {
    const { rows } = getTalentBottleneckData();
    const softwareDevelopers = findRow(rows, "15-1252");
    const h1bSource = getOccupationsSorted().find((row) => row.socCode === "15-1252");

    expect(h1bSource).toBeDefined();
    expect(softwareDevelopers.h1bCagr).toBe(h1bSource?.cagr);
    expect(softwareDevelopers.h1bCagr).toBe(0.0572);
    expect(softwareDevelopers.scoreComponents.h1bCagr).toBeGreaterThanOrEqual(0);
    expect(softwareDevelopers.scoreComponents.h1bCagr).toBeLessThanOrEqual(1);
  });

  it("has stable non-empty top rows", () => {
    const first = getTalentBottleneckData({ limit: 10 });
    const second = getTalentBottleneckData({ limit: 10 });

    expect(first.rows).toHaveLength(10);
    expect(first.summary.rowsReturned).toBe(10);
    expect(first.summary.topRows.length).toBeGreaterThan(0);
    expect(first.summary.topRows[0]).toMatchObject({
      rank: 1,
      socCode: first.rows[0].socCode,
      title: first.rows[0].title,
      score: first.rows[0].score,
    });
    expect(first).toEqual(second);
  });

  it("keeps missing source fields null while preserving a stable score", () => {
    const { rows } = getTalentBottleneckData();
    const noH1b = rows.find((row) => !row.sourceFlags.hasH1b);
    const h1bOnly = rows.find(
      (row) =>
        row.sourceFlags.hasH1b &&
        !row.sourceFlags.hasEmploymentProjection &&
        !row.sourceFlags.hasJobPostings &&
        !row.sourceFlags.hasOccupationSnapshot,
    );

    expect(noH1b).toBeDefined();
    expect(noH1b?.latestLcas).toBeNull();
    expect(noH1b?.totalLcas).toBeNull();
    expect(noH1b?.h1bCagr).toBeNull();
    expect(noH1b?.h1bTrend).toBeNull();
    expect(Number.isFinite(noH1b?.score)).toBe(true);
    expect(noH1b?.scoreComponents.latestLcas).toBe(0);
    expect(noH1b?.scoreComponents.totalLcas).toBe(0);

    expect(h1bOnly).toBeDefined();
    expect(h1bOnly?.projectedOpenings).toBeNull();
    expect(h1bOnly?.employmentChangePct).toBeNull();
    expect(h1bOnly?.latestPostings).toBeNull();
    expect(h1bOnly?.aiExposure).toBeNull();
    expect(h1bOnly?.automationRisk).toBeNull();
    expect(Number.isFinite(h1bOnly?.score)).toBe(true);
    expect(h1bOnly?.scoreComponents.projectedOpenings).toBe(0);
    expect(h1bOnly?.scoreComponents.latestPostings).toBe(0);
  });

  it("documents the descriptive methodology caveats", () => {
    const { methodology } = getTalentBottleneckData();
    const wording = [
      methodology.description,
      methodology.scoreFormula,
      methodology.normalization,
      ...methodology.caveats,
      ...methodology.sourceNotes,
    ].join(" ");

    expect(wording).toMatch(/LCAs are not approvals/i);
    expect(wording).toMatch(/score is not proof of shortage\/causality/i);
    expect(wording).toMatch(/job postings are proxy\/seed-derived where applicable/i);
    expect(wording).toMatch(/descriptive/i);
  });
});

// ── aiExposure semantic-field regression ──────────────────────────────────────
// This test uses a controlled mock to distinguish career.aiExposure from
// career.automationProbability. If toSnapshotSignal reverts to using
// automationProbability, the row's aiExposure will equal 0.99 instead of 0.42.

describe("getTalentBottleneckData aiExposure field regression", () => {
  it("uses career.aiExposure, not career.automationProbability, for row.aiExposure", async () => {
    // Build a fixture where aiExposure and automationProbability are distinct.
    const FIXTURE_SOC = "99-9999";
    const DISTINCT_AI_EXPOSURE = 0.42;
    const DISTINCT_AUTOMATION_PROB = 0.99;

    // Mock generateAllCareerInsights to return one controlled career.

    vi.spyOn(
      await import("@/lib/data"),
      "generateAllCareerInsights",
    ).mockReturnValue([
      {
        occupationCode: FIXTURE_SOC,
        occupationName: "Test Occupation",
        sectorName: "Test Sector",
        automationRisk: "Medium",
        aiExposure: DISTINCT_AI_EXPOSURE,
        automationProbability: DISTINCT_AUTOMATION_PROB,
        growthRate: null,
        growthWindow: null,
        medianSalary: 50000,
        totalEmployment: 1000,
        projectedOpenings: null,
        outlook: "Average",
        skills: [],
        employmentHistory: null,
        wageHistory: null,
      },
    ]);

    try {
      const { rows } = getTalentBottleneckData();
      const testRow = rows.find((r) => r.socCode === FIXTURE_SOC);

      expect(
        testRow,
        "Mocked SOC code must appear in talent bottleneck rows",
      ).toBeDefined();

      expect(
        testRow?.aiExposure,
        `row.aiExposure must equal career.aiExposure (${DISTINCT_AI_EXPOSURE}), ` +
          `not career.automationProbability (${DISTINCT_AUTOMATION_PROB})`,
      ).toBeCloseTo(DISTINCT_AI_EXPOSURE, 5);

      expect(
        testRow?.aiExposure,
        "row.aiExposure must NOT equal career.automationProbability",
      ).not.toBeCloseTo(DISTINCT_AUTOMATION_PROB, 5);
    } finally {
      vi.restoreAllMocks();
    }
  });
});

function findRow(rows: TalentBottleneckRow[], socCode: string): TalentBottleneckRow {
  const row = rows.find((candidate) => candidate.socCode === socCode);
  expect(row).toBeDefined();
  return row as TalentBottleneckRow;
}
