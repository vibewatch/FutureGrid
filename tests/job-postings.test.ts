import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

import { validateJobPostings } from "../scripts/lib/validate.mjs";
import {
  getJobPostingYears,
  getJobPostingsCoverage,
  getJobPostingsSummary,
  getOccupationJobPostingsBySoc,
  getRelatedJobPostingsBySoc,
  getTopJobPostingOccupations,
} from "@/lib/job-postings";

const ROOT = process.cwd();
const read = (rel: string, baseDir = ROOT) =>
  JSON.parse(readFileSync(path.join(baseDir, rel), "utf8"));

describe("job-postings dataset", () => {
  const data = read("data/job-postings.json");

  it("committed data/job-postings.json passes validation", () => {
    expect(() => validateJobPostings(data)).not.toThrow();
  });

  it("covers a 10-year annual window for the full occupation source set", () => {
    const coverage = getJobPostingsCoverage();
    expect(coverage.years).toEqual([
      2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025,
    ]);
    expect(coverage.occupations).toBeGreaterThanOrEqual(756);
    expect(coverage.observedHistoricalPostings).toBe(false);
    expect(coverage.mode).toBe("seed-static");
    expect(coverage.observedOccupations).toBe(0);
    expect(coverage.seedFallbackOccupations).toBeGreaterThanOrEqual(756);
  });

  it("exposes aligned annual totals for every occupation row", () => {
    const years = getJobPostingYears().map(String);
    expect(data.occupations.length).toBeGreaterThanOrEqual(756);
    for (const row of data.occupations) {
      for (const year of years) {
        expect(row.annualPostings[year]).toBeGreaterThanOrEqual(0);
        expect(row.relatedAnnualPostings[year]).toBeGreaterThanOrEqual(0);
      }
      expect(row.latestAnnualPostings).toBe(row.annualPostings["2025"]);
      expect(row.latestRelatedAnnualPostings).toBe(row.relatedAnnualPostings["2025"]);
    }
  });

  it("keeps a provider-ready related-job mapping for Software Developers", () => {
    const programmers = getOccupationJobPostingsBySoc("15-1251");
    expect(programmers).toBeDefined();
    expect(programmers?.relatedOccupations.some((related) => related.socCode === "15-1252")).toBe(
      true
    );
    expect(programmers?.latestAnnualPostings).toBeGreaterThan(0);

    const related = getRelatedJobPostingsBySoc("15-1251");
    expect(related.length).toBeGreaterThan(0);
    expect(related[0].latestAnnualPostings).toBeGreaterThan(0);
  });

  it("top occupations are sorted by latest-year posting volume", () => {
    const leaders = getTopJobPostingOccupations(10);
    expect(leaders).toHaveLength(10);
    for (let index = 1; index < leaders.length; index += 1) {
      expect(leaders[index - 1].latestAnnualPostings).toBeGreaterThanOrEqual(
        leaders[index].latestAnnualPostings
      );
    }
  });

  it("summary totals are populated for every year", () => {
    const summary = getJobPostingsSummary();
    for (const year of getJobPostingYears()) {
      expect(summary.totalAnnualPostingsByYear[String(year)]).toBeGreaterThan(0);
      expect(summary.totalRelatedAnnualPostingsByYear[String(year)]).toBeGreaterThan(0);
    }
    expect(summary.topOccupationsLatestYear.length).toBeGreaterThan(0);
  });

  it("can overlay observed provider rows while preserving seed fallback coverage", () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "futuregrid-job-postings-"));
    const providerFile = path.join(tempDir, "provider.json");
    const outputFile = path.join(tempDir, "job-postings.json");

    try {
      writeFileSync(
        providerFile,
        JSON.stringify({
          meta: {
            asOf: "2026-01-31",
            source: {
              name: "Fixture observed postings provider",
              publisher: "Fixture",
              url: "https://example.com/postings",
            },
          },
          rows: [
            {
              socCode: "15-1252",
              annualPostings: {
                "2024": 123456,
                "2025": 234567,
              },
            },
          ],
        }),
      );

      execFileSync("node", ["scripts/build-job-postings.mjs"], {
        cwd: ROOT,
        env: {
          ...process.env,
          JOB_POSTINGS_PROVIDER_FILE: providerFile,
          JOB_POSTINGS_OUTPUT_FILE: outputFile,
        },
        stdio: "pipe",
      });

      const observedDataset = read("job-postings.json", tempDir);
      expect(() => validateJobPostings(observedDataset)).not.toThrow();
      expect(observedDataset.meta.asOf).toBe("2026-01-31");
      expect(observedDataset.coverage.observedHistoricalPostings).toBe(true);
      expect(observedDataset.coverage.mode).toBe("observed-provider-with-seed-fallback");
      expect(observedDataset.coverage.observedOccupations).toBe(1);
      expect(observedDataset.coverage.seedFallbackOccupations).toBeGreaterThan(700);

      const softwareDevelopers = observedDataset.occupations.find(
        (row: { socCode?: string }) => row.socCode === "15-1252",
      ) as
        | {
            annualPostings: Record<string, number>;
            latestAnnualPostings: number;
            sourceStatus: string;
            observedYears: string[];
          }
        | undefined;
      expect(softwareDevelopers).toBeDefined();
      expect(softwareDevelopers).toMatchObject({
        latestAnnualPostings: 234567,
        sourceStatus: "observed-provider-with-seed-fallback",
        observedYears: ["2024", "2025"],
      });
      expect(softwareDevelopers?.annualPostings["2025"]).toBe(234567);
      expect(softwareDevelopers?.annualPostings["2023"]).toBeGreaterThan(0);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
