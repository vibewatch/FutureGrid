import { describe, expect, it } from "vitest";
import { getLaborOpportunityData } from "@/lib/labor-opportunity";

describe("getLaborOpportunityData", () => {
  it("returns a non-empty opportunity lens with valid career links", () => {
    const data = getLaborOpportunityData();

    expect(data.summary.occupationsTracked).toBeGreaterThan(0);
    expect(data.summary.totalAnnualOpenings).toBeGreaterThan(0);
    expect(data.chartRows.length).toBeGreaterThan(0);
    expect(data.spotlight.lowerExposure.length).toBeGreaterThan(0);
    expect(data.spotlight.highExposure.length).toBeGreaterThan(0);

    for (const row of data.chartRows.slice(0, 5)) {
      expect(row.careerHref).toMatch(/^\/careers\//);
      expect(row.annualOpenings).toBeGreaterThan(0);
      expect(row.aiExposure).toBeGreaterThanOrEqual(0);
    }
  });

  it("uses the dedicated projections dataset and keeps job-postings context", () => {
    const data = getLaborOpportunityData();

    expect(data.source.mode).toBe("soc-dataset");
    expect(data.source.datasetId).toBe("employment-projections");
    expect(data.source.sourceName).toMatch(/employment projections/i);
    expect(data.chartRows.some((row) => row.employmentPercentChange != null)).toBe(true);
    expect(data.datasetBadgeIds).toContain("employment-projections");
    expect(data.datasetBadgeIds).toContain("job-postings");
  });
});
