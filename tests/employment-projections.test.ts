import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { validateEmploymentProjections } from "../scripts/lib/validate.mjs";
import {
  getEmploymentProjectionBySoc,
  getEmploymentProjectionChartRows,
  getEmploymentProjectionCoverage,
  getEmploymentProjectionRows,
  getEmploymentProjectionSummary,
} from "@/lib/employment-projections";

const ROOT = process.cwd();
const read = (rel: string) =>
  JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));

describe("employment-projections dataset", () => {
  const data = read("data/employment-projections.json");

  it("committed data/employment-projections.json passes validation", () => {
    expect(() => validateEmploymentProjections(data)).not.toThrow();
  });

  it("covers a 10-year 2024→2034 window for the full snapshot", () => {
    const coverage = getEmploymentProjectionCoverage();
    expect(coverage.baseYear).toBe(2024);
    expect(coverage.projectionYear).toBe(2034);
    expect(coverage.windowYears).toBe(10);
    expect(coverage.primaryKey).toBe("socCode");
    expect(coverage.rows).toBeGreaterThanOrEqual(756);
    expect(coverage.matchedSnapshotRows).toBe(coverage.rows);
  });

  it("exposes projection rows keyed by SOC with joined AI lens fields", () => {
    const rows = getEmploymentProjectionRows();
    expect(rows.length).toBeGreaterThanOrEqual(756);
    const developers = rows.find((row) => row.socCode === "15-1252");
    expect(developers).toBeDefined();
    expect(developers?.title).toBe("Software Developers");
    expect(developers?.employment2024).toBeGreaterThan(0);
    expect(developers?.employment2034).toBeGreaterThan(
      developers?.employment2024 ?? 0
    );
    expect(developers?.aiExposure).not.toBeNull();

    const executives = rows.find((row) => row.socCode === "11-1011");
    expect(executives?.projectedOpenings).toBeGreaterThan(0);
  });

  it("provides lookup by SOC for page-level drilldowns", () => {
    const row = getEmploymentProjectionBySoc("11-1011");
    expect(row).toBeDefined();
    expect(row?.title).toBe("Chief Executives");
    expect(row?.employmentChangePct).not.toBeNull();
  });

  it("retains 15-1251 projection fields even when annual openings are unavailable", () => {
    const row = getEmploymentProjectionBySoc("15-1251");

    expect(row).toMatchObject({
      socCode: "15-1251",
      title: "Computer Programmers",
      employment2024: 121200,
      employment2034: 114000,
      employmentChangePct: -6,
      projectedOpenings: null,
    });
    expect(row?.aiExposure).not.toBeNull();
  });

  it("provides chart-ready rows sorted by projected openings by default", () => {
    const rows = getEmploymentProjectionChartRows({ limit: 20 });
    expect(rows).toHaveLength(20);
    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index - 1].bubbleSize).toBeGreaterThanOrEqual(
        rows[index].bubbleSize
      );
      expect(rows[index - 1].aiExposurePct).not.toBeNull();
      expect(rows[index - 1].automationProbabilityPct).not.toBeNull();
    }
  });

  it("summary surfaces opening, growth, and decline leaders", () => {
    const summary = getEmploymentProjectionSummary();
    expect(summary.totalEmployment2024).toBeGreaterThan(100_000_000);
    expect(summary.totalEmployment2034).toBeGreaterThan(
      summary.totalEmployment2024
    );
    expect(summary.topProjectedOpenings.length).toBeGreaterThan(0);
    expect(summary.fastestGrowing.length).toBeGreaterThan(0);
    expect(summary.steepestDeclines.length).toBeGreaterThan(0);
  });
});
