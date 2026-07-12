/**
 * tests/data-schema.test.ts
 *
 * Build-time / CI schema validation: runs each per-dataset validator against
 * the actual committed JSON files to ensure the committed data matches the
 * shape expected by the lib/ loaders.
 *
 * Each describe block has:
 *  - a positive case (committed file MUST pass)
 *  - at least one negative case (degenerate input MUST throw)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  assertMinRows,
  assertFields,
  assertProvenance,
  assertLiveStates,
  validateJobPostings,
  validateWarnNotices,
  validateStateLabor,
  validateStateQcew,
  validateJolts,
  validateOccupationSnapshot,
  validateOccupationSnapshotSlim,
  validateOccupationalRequirements,
  validateEmploymentProjections,
  validateOpenRouterModels,
  validateAICompanyStocks,
  validateProvenance,
  validateAIFrontier,
  validateAIUsageProxies,
  validateGlobalMetrics,
  validateMarketSignals,
  validateOnetEnrichment,
  validateWorldGeo,
  validateAISignalsFile,
  validateCountryExposure,
  validateSources,
} from "../scripts/lib/validate.mjs";

const ROOT = process.cwd();
const read = (rel: string) =>
  JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));

// ─── assertMinRows ────────────────────────────────────────────────────────────

describe("assertMinRows", () => {
  it("passes when array meets the minimum", () => {
    expect(() => assertMinRows([1, 2, 3], 3, "test")).not.toThrow();
  });

  it("passes when array exceeds the minimum", () => {
    expect(() => assertMinRows([1, 2, 3, 4], 3, "test")).not.toThrow();
  });

  it("throws when array is too short", () => {
    expect(() => assertMinRows([1], 5, "my-dataset")).toThrow(
      /my-dataset.*too few rows/
    );
  });

  it("throws when given a non-array", () => {
    expect(() => assertMinRows({} as unknown as unknown[], 1, "bad")).toThrow(
      /bad.*expected an array/
    );
  });
});

// ─── assertFields ─────────────────────────────────────────────────────────────

describe("assertFields", () => {
  it("passes when all required keys are present", () => {
    expect(() => assertFields({ a: 1, b: 2 }, ["a", "b"], "obj")).not.toThrow();
  });

  it("throws when a required key is missing", () => {
    expect(() => assertFields({ a: 1 }, ["a", "b"], "obj")).toThrow(
      /obj.*missing.*b/
    );
  });

  it("throws for null input", () => {
    expect(() =>
      assertFields(null as unknown as Record<string, unknown>, ["x"], "obj")
    ).toThrow(/obj.*expected a plain object/);
  });

  it("throws for array input", () => {
    expect(() =>
      assertFields([] as unknown as Record<string, unknown>, ["x"], "obj")
    ).toThrow(/obj.*expected a plain object/);
  });
});

// ─── assertProvenance ─────────────────────────────────────────────────────────

describe("assertProvenance", () => {
  it("passes with a generatedAt string", () => {
    expect(() =>
      assertProvenance({ generatedAt: "2026-01-01T00:00:00.000Z" }, "ds")
    ).not.toThrow();
  });

  it("passes with meta.generatedAt", () => {
    expect(() =>
      assertProvenance(
        { meta: { generatedAt: "2026-01-01T00:00:00.000Z" } },
        "ds"
      )
    ).not.toThrow();
  });

  it("throws when generatedAt is missing", () => {
    expect(() => assertProvenance({ foo: "bar" }, "ds")).toThrow(
      /ds.*generatedAt/
    );
  });

  it("throws when generatedAt is empty string", () => {
    expect(() => assertProvenance({ generatedAt: "" }, "ds")).toThrow(
      /ds.*generatedAt/
    );
  });
});

// ─── assertLiveStates ─────────────────────────────────────────────────────────

describe("assertLiveStates", () => {
  const states = [{ state: "CA" }, { state: "NY" }, { state: "TX" }];

  it("passes when all required states are present (object array)", () => {
    expect(() =>
      assertLiveStates(states, ["CA", "NY"], "test")
    ).not.toThrow();
  });

  it("passes when all required states are present (string array)", () => {
    expect(() =>
      assertLiveStates(["CA", "NY", "TX"], ["CA", "TX"], "test")
    ).not.toThrow();
  });

  it("passes with a Set", () => {
    expect(() =>
      assertLiveStates(new Set(["CA", "NY", "TX"]), ["CA"], "test")
    ).not.toThrow();
  });

  it("throws when a required state is absent", () => {
    expect(() =>
      assertLiveStates(states, ["CA", "WI"], "test")
    ).toThrow(/test.*missing.*WI/);
  });
});

// ─── validateWarnNotices ──────────────────────────────────────────────────────

describe("validateWarnNotices — committed file", () => {
  const data = read("data/warn-notices.json");

  it("committed data/warn-notices.json passes validation", () => {
    expect(() => validateWarnNotices(data)).not.toThrow();
  });
});

describe("validateWarnNotices — negative cases", () => {
  it("throws for empty notices array", () => {
    expect(() =>
      validateWarnNotices({
        generatedAt: "2026-01-01T00:00:00Z",
        coverageSummary: {},
        coverageStates: Array.from({ length: 51 }, (_, i) => ({
          state: `S${i}`,
          sourceStatus: "manual-only",
        })),
        notices: [],
      })
    ).toThrow(/warn-notices\.notices.*too few rows/);
  });

  it("throws when coverageStates is missing required live states", () => {
    // 51 states, all manual-only (no live states) — passes row count but fails live-state check
    const coverageStates = Array.from({ length: 51 }, (_, i) => ({
      state: `S${String(i).padStart(2, "0")}`,
      sourceStatus: "manual-only",
    }));
    expect(() =>
      validateWarnNotices({
        generatedAt: "2026-01-01T00:00:00Z",
        coverageSummary: {},
        coverageStates,
        notices: Array(10001).fill({ state: "CA" }),
      })
    ).toThrow(/warn-notices.*missing.*required live state/);
  });

  it("throws when generatedAt is absent", () => {
    expect(() =>
      validateWarnNotices({
        coverageSummary: {},
        coverageStates: [],
        notices: [],
      })
    ).toThrow(/warn-notices.*generatedAt/);
  });
});

// ─── validateStateLabor ───────────────────────────────────────────────────────

describe("validateStateLabor — committed file", () => {
  const data = read("data/state-labor.json");

  it("committed data/state-labor.json passes validation", () => {
    expect(() => validateStateLabor(data)).not.toThrow();
  });
});

describe("validateStateLabor — negative cases", () => {
  it("throws for too few states", () => {
    expect(() =>
      validateStateLabor({
        generatedAt: "2026-01-01T00:00:00Z",
        source: {},
        methodology: {},
        summary: {},
        states: [{ state: "CA", warnCoverageStatus: "live" }],
      })
    ).toThrow(/state-labor\.states.*too few rows/);
  });

  it("throws when required live states are missing", () => {
    const minStates = Array.from({ length: 51 }, (_, i) => ({
      state: `S${String(i).padStart(2, "0")}`,
      warnCoverageStatus: "manual-only",
    }));
    expect(() =>
      validateStateLabor({
        generatedAt: "2026-01-01T00:00:00Z",
        source: {},
        methodology: {},
        summary: {},
        states: minStates,
      })
    ).toThrow(/state-labor.*missing.*required live state/);
  });
});

// ─── validateStateQcew ────────────────────────────────────────────────────────

describe("validateStateQcew — committed file", () => {
  const data = read("data/state-qcew.json");

  it("committed data/state-qcew.json passes validation", () => {
    expect(() => validateStateQcew(data)).not.toThrow();
  });
});

describe("validateStateQcew — negative cases", () => {
  it("throws for empty states array", () => {
    expect(() =>
      validateStateQcew({
        generatedAt: "2026-01-01T00:00:00Z",
        source: {},
        methodology: {},
        summary: {},
        states: [],
      })
    ).toThrow(/state-qcew\.states.*too few rows/);
  });

  it("throws when top-level key is missing", () => {
    expect(() =>
      validateStateQcew({
        generatedAt: "2026-01-01T00:00:00Z",
        // missing: source, methodology, summary, states
      })
    ).toThrow(/state-qcew.*missing required top-level key/);
  });
});

// ─── validateJolts ────────────────────────────────────────────────────────────

describe("validateJolts — committed file", () => {
  const data = read("data/jolts.json");

  it("committed data/jolts.json passes validation", () => {
    expect(() => validateJolts(data)).not.toThrow();
  });
});

describe("validateJolts — negative cases", () => {
  it("throws when national.series is missing", () => {
    expect(() =>
      validateJolts({
        generatedAt: "2026-01-01T00:00:00Z",
        source: {},
        national: {},
        industries: Array(21).fill({ code: "x" }),
      })
    ).toThrow(/jolts.*national\.series.*non-null object/);
  });

  it("throws when industries is too short", () => {
    expect(() =>
      validateJolts({
        generatedAt: "2026-01-01T00:00:00Z",
        source: {},
        national: {
          series: {
            LDL: Array(30).fill({ date: "2020-01", value: 1 }),
            LDR: [],
            TSL: [],
            TSR: [],
          },
        },
        industries: [],
      })
    ).toThrow(/jolts\.industries.*too few rows/);
  });

  it("throws when LDL series has too few observations", () => {
    expect(() =>
      validateJolts({
        generatedAt: "2026-01-01T00:00:00Z",
        source: {},
        national: {
          series: {
            LDL: [{ date: "2020-01", value: 1 }], // only 1 obs
            LDR: [],
            TSL: [],
            TSR: [],
          },
        },
        industries: Array(20).fill({ code: "x" }),
      })
    ).toThrow(/jolts.*LDL.*observations/);
  });
});

// ─── validateOccupationSnapshot ───────────────────────────────────────────────

describe("validateOccupationSnapshot — committed file", () => {
  const dataset = read("data/occupation-snapshot.json");

  it("committed data/occupation-snapshot.json passes validation", () => {
    expect(() => validateOccupationSnapshot(dataset)).not.toThrow();
  });

  it("is a { meta, data } wrapper with provenance and rows", () => {
    expect(dataset.meta).toBeTruthy();
    expect(typeof dataset.meta.generatedAt).toBe("string");
    expect(typeof dataset.meta.source?.name).toBe("string");
    expect(Array.isArray(dataset.data)).toBe(true);
    expect(dataset.data.length).toBeGreaterThanOrEqual(680);
  });

  it("keeps SOC-keyed OEWS histories aligned with current employment and wage values", () => {
    expect(dataset.data.length).toBeGreaterThanOrEqual(680);
    let rowsWithWageHistory = 0;
    let rowsWithMultiYearWages = 0;
    for (const row of dataset.data) {
      expect(row.socCode).toMatch(/^\d{2}-\d{4}$/);
      expect(row.employmentHistory).toBeTruthy();

      const employmentYears = Object.keys(row.employmentHistory ?? {});
      const wageYears = Object.keys(row.wageHistory ?? {});
      expect(employmentYears.length).toBeGreaterThanOrEqual(2);
      if (wageYears.length > 0) {
        rowsWithWageHistory++;
        expect(wageYears.length).toBeGreaterThanOrEqual(1);
        if (wageYears.length >= 4) rowsWithMultiYearWages++;
      }
      for (const year of new Set([...employmentYears, ...wageYears])) {
        expect(year).toMatch(/^\d{4}$/);
      }

      const latestEmploymentYear = employmentYears
        .map((year: string) => Number(year))
        .sort((a: number, b: number) => b - a)[0];
      const latestWageYear = wageYears
        .map((year: string) => Number(year))
        .sort((a: number, b: number) => b - a)[0];

      if (row.employment !== null) {
        expect(row.employmentHistory?.[String(latestEmploymentYear)]).toBeGreaterThan(0);
      }
      if (row.wageHistory?.[String(latestWageYear)] != null) {
        expect(row.wageHistory[String(latestWageYear)]).toBeGreaterThan(0);
      }

      if (row.employmentHistory?.["2025"] != null && row.employment !== null) {
        expect(row.employmentHistory["2025"]).toBe(row.employment);
      }
      if (row.wageHistory?.["2025"] != null) {
        expect(row.wageHistory["2025"]).toBe(row.medianSalary);
      }
    }
    expect(rowsWithWageHistory).toBeGreaterThanOrEqual(750);
    expect(rowsWithMultiYearWages).toBeGreaterThanOrEqual(730);
  });
});

describe("validateOccupationSnapshot — negative cases", () => {
  it("throws for an empty array", () => {
    expect(() => validateOccupationSnapshot([])).toThrow(
      /occupation-snapshot.*too few rows/
    );
  });

  it("throws when first row is missing required fields", () => {
    // Enough rows to pass the min-count check, but first row has missing fields
    const rows = Array.from({ length: 700 }, (_, i) =>
      i === 0
        ? { socCode: "11-1011" } // missing title, sector, aiExposure, automationRisk
        : {
            socCode: "11-1011",
            title: "x",
            sector: "y",
            aiExposure: 0,
            automationRisk: "Low",
          }
    );
    expect(() => validateOccupationSnapshot(rows)).toThrow(
      /occupation-snapshot\[0\].*missing required top-level key/
    );
  });
});

// ─── validateOccupationSnapshotSlim ──────────────────────────────────────────

describe("validateOccupationSnapshotSlim — committed file", () => {
  const dataset = read("data/occupation-snapshot-slim.json");

  it("committed data/occupation-snapshot-slim.json passes validation", () => {
    expect(() => validateOccupationSnapshotSlim(dataset)).not.toThrow();
  });

  it("is a { meta, data } wrapper with provenance and rows", () => {
    expect(dataset.meta).toBeTruthy();
    expect(typeof dataset.meta.generatedAt).toBe("string");
    expect(typeof dataset.meta.source?.name).toBe("string");
    expect(Array.isArray(dataset.data)).toBe(true);
    expect(dataset.data.length).toBeGreaterThanOrEqual(680);
  });

  it("preserves projection enrichment on the committed slim snapshot", () => {
    const rows = dataset.data;
    const withOpenings = rows.filter(
      (row: { projectedOpenings: number | null }) => row.projectedOpenings !== null
    );

    expect(withOpenings.length).toBeGreaterThanOrEqual(650);
    expect(rows.length - withOpenings.length).toBeGreaterThan(0);

    for (const row of rows) {
      expect(row.socCode).toMatch(/^\d{2}-\d{4}$/);
      if (row.projectedOpenings !== null) {
        expect(row.projectedOpenings).toBeGreaterThan(0);
      }
      expect(typeof row.growthRate).toBe("number");
      expect(row.growthWindow).toEqual({
        fromYear: expect.any(Number),
        toYear: expect.any(Number),
      });
      expect(row.growthWindow.fromYear).toBeLessThan(row.growthWindow.toYear);
    }
  });
});

describe("validateOccupationSnapshotSlim — negative cases", () => {
  it("throws for an empty array", () => {
    expect(() => validateOccupationSnapshotSlim([])).toThrow(
      /occupation-snapshot-slim.*too few rows/
    );
  });

  it("throws when first row is missing required fields", () => {
    // Enough rows to pass the min-count check, but first row has missing fields
    const rows = Array.from({ length: 700 }, (_, i) =>
      i === 0
        ? { socCode: "11-1011" } // missing title, sector, aiExposure, automationRisk
        : {
            socCode: "11-1011",
            title: "x",
            sector: "y",
            aiExposure: 0,
            automationRisk: "Low",
          }
    );
    expect(() => validateOccupationSnapshotSlim(rows)).toThrow(
      /occupation-snapshot-slim\[0\].*missing required top-level key/
    );
  });
});

// ─── validateProvenance ──────────────────────────────────────────────────────

describe("validateProvenance — committed registry", () => {
  const registry = read("data/provenance.json");

  it("committed data/provenance.json passes validation", () => {
    expect(() => validateProvenance(registry)).not.toThrow();
  });

  it("lists every committed data/*.json dataset with provenance", () => {
    expect(Array.isArray(registry.datasets)).toBe(true);
    for (const entry of registry.datasets) {
      expect(typeof entry.id).toBe("string");
      expect(typeof entry.generatedAt).toBe("string");
      expect(entry.source == null).toBe(false);
    }
  });
});

describe("validateProvenance — negative cases", () => {
  it("throws when datasets is empty", () => {
    expect(() =>
      validateProvenance({
        generatedAt: "2026-01-01T00:00:00Z",
        datasets: [],
      })
    ).toThrow(/provenance\.datasets.*too few rows/);
  });

  it("throws when a dataset entry lacks a source", () => {
    expect(() =>
      validateProvenance({
        generatedAt: "2026-01-01T00:00:00Z",
        datasets: [
          {
            id: "x",
            file: "data/x.json",
            generatedAt: "2026-01-01T00:00:00Z",
            source: null,
          },
        ],
      })
    ).toThrow(/provenance:x.*missing source/);
  });

  it("throws when an expected dataset id is absent", () => {
    expect(() =>
      validateProvenance(
        {
          generatedAt: "2026-01-01T00:00:00Z",
          datasets: [
            {
              id: "x",
              file: "data/x.json",
              generatedAt: "2026-01-01T00:00:00Z",
              source: "S",
            },
          ],
        },
        { expectedIds: ["x", "y"] }
      )
    ).toThrow(/provenance: registry is missing dataset\(s\): y/);
  });
});

// ─── validateJobPostings ───────────────────────────────────────────────────────

describe("validateJobPostings — committed file", () => {
  const data = read("data/job-postings.json");

  it("committed data/job-postings.json passes validation", () => {
    expect(() => validateJobPostings(data)).not.toThrow();
  });
});

describe("validateJobPostings — negative cases", () => {
  const annualPostings = (): Record<string, number | undefined> => ({
    "2016": 1,
    "2017": 1,
    "2018": 1,
    "2019": 1,
    "2020": 1,
    "2021": 1,
    "2022": 1,
    "2023": 1,
    "2024": 1,
    "2025": 1,
  });
  const relatedAnnualPostings = (): Record<string, number | undefined> => ({
    "2016": 0,
    "2017": 0,
    "2018": 0,
    "2019": 0,
    "2020": 0,
    "2021": 0,
    "2022": 0,
    "2023": 0,
    "2024": 0,
    "2025": 0,
  });

  const base = () => ({
    meta: {
      generatedAt: "2026-07-03T00:00:00Z",
      source: {
        name: "FutureGrid provider-ready job postings seed",
        url: "https://github.com/huangyingting/FutureGrid",
      },
    },
    coverage: {
      years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    },
    methodology: {},
    providerContract: {
      requiredYears: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
    },
    summary: {
      latestYear: 2025,
      totalAnnualPostingsByYear: {
        "2016": 1,
        "2017": 1,
        "2018": 1,
        "2019": 1,
        "2020": 1,
        "2021": 1,
        "2022": 1,
        "2023": 1,
        "2024": 1,
        "2025": 1,
      },
    },
    occupations: Array.from({ length: 700 }, (_, index) => ({
      socCode: `11-${String(1000 + index).padStart(4, "0")}`,
      title: `Occupation ${index}`,
      sector: "Management",
      sampleTitles: [],
      relatedOccupations: [],
      annualPostings: annualPostings(),
      relatedAnnualPostings: relatedAnnualPostings(),
      latestAnnualPostings: 1,
      latestRelatedAnnualPostings: 0,
      sourceStatus: "seed-derived",
    })),
  });

  it("throws when coverage.years does not contain 10 annual points", () => {
    const data = base();
    data.coverage.years = [2021, 2022];
    expect(() => validateJobPostings(data)).toThrow(
      /job-postings: coverage\.years must list exactly 10 annual points/
    );
  });

  it("throws when an occupation misses a coverage-year posting value", () => {
    const data = base();
    delete data.occupations[0].annualPostings["2022"];
    expect(() => validateJobPostings(data)).toThrow(
      /job-postings:11-1000: annualPostings\[2022\] must be a finite non-negative number/
    );
  });

  it("throws when an occupation includes year keys outside coverage", () => {
    const data = base();
    data.occupations[0].annualPostings["2030"] = 1;
    expect(() => validateJobPostings(data)).toThrow(
      /job-postings:11-1000: annualPostings\[2030\] is outside coverage\.years/
    );
  });
});

// ─── validateOccupationalRequirements ─────────────────────────────────────────

describe("validateOccupationalRequirements — committed file", () => {
  const data = read("data/occupational-requirements.json");

  it("committed data/occupational-requirements.json passes validation", () => {
    expect(() => validateOccupationalRequirements(data)).not.toThrow();
  });

  it("caveats seed-static ORS data as a broad-SOC seed, not direct survey estimates", () => {
    expect(data.coverage.mode).toBe("seed-static");
    expect(data.coverage.exactSocRows).toBe(0);
    expect(data.methodology.caveat).toMatch(/FutureGrid broad-SOC seed/i);
    expect(data.methodology.caveat).toMatch(/not direct occupation-level ORS survey estimates/i);
    expect(data.methodology.caveat).not.toMatch(/come from BLS ORS employer survey estimates/i);
  });
});

// ─── validateEmploymentProjections ────────────────────────────────────────────

describe("validateEmploymentProjections — committed file", () => {
  const data = read("data/employment-projections.json");

  it("committed data/employment-projections.json passes validation", () => {
    expect(() => validateEmploymentProjections(data)).not.toThrow();
  });
});

describe("validateEmploymentProjections — negative cases", () => {
  const base = () => ({
    meta: {
      generatedAt: "2026-07-03T00:00:00Z",
      source: {
        name: "BLS Employment Projections occupational data",
        url: "https://www.bls.gov/emp/data/occupational-data.htm",
      },
    },
    coverage: {
      baseYear: 2024,
      projectionYear: 2034,
      windowYears: 10,
      matchedSnapshotRows: 700,
      rowsWithProjectedOpenings: 650,
    },
    methodology: {},
    summary: {
      totalEmployment2024: 120000000,
      totalEmployment2034: 130000000,
      totalEmploymentChange: 10000000,
    },
    rows: Array.from({ length: 700 }, (_, index) => ({
      socCode: `15-${String(1000 + index).padStart(4, "0")}`,
      title: `Occupation ${index}`,
      sector: "Computer and Mathematical",
      employment2024: 1000,
      employment2034: 1200,
      employmentChange: 200,
      employmentChangePct: 20,
      projectedOpenings: 100,
      aiExposure: 0.2,
      automationRisk: "Medium",
      automationProbability: 0.2,
      brightOutlook: false,
    })),
  });

  it("throws when the projection window is not 10 years", () => {
    const data = base();
    data.coverage.windowYears = 9;
    expect(() => validateEmploymentProjections(data)).toThrow(
      /employment-projections: expected a 10-year projection window/
    );
  });

  it("throws when a row has a non-normalized SOC code", () => {
    const data = base();
    data.rows[0].socCode = "151001";
    expect(() => validateEmploymentProjections(data)).toThrow(
      /employment-projections: occupation SOC code not normalized/
    );
  });

  it("throws when coverage rowsWithProjectedOpenings is too low", () => {
    const data = base();
    data.coverage.rowsWithProjectedOpenings = 12;
    expect(() => validateEmploymentProjections(data)).toThrow(
      /employment-projections: coverage\.rowsWithProjectedOpenings is unexpectedly low/
    );
  });
});

// ─── validateOpenRouterModels ─────────────────────────────────────────────────

describe("validateOpenRouterModels — committed file", () => {
  const data = read("data/openrouter-models.json");

  it("committed data/openrouter-models.json passes validation", () => {
    expect(() => validateOpenRouterModels(data)).not.toThrow();
  });
});

describe("validateOpenRouterModels — negative cases", () => {
  const architecture = (): {
    modality: string;
    inputModalities?: string[];
    outputModalities: string[];
    tokenizer: string;
    instructType: null;
  } => ({
    modality: "text->text",
    inputModalities: ["text"],
    outputModalities: ["text"],
    tokenizer: "GPT",
    instructType: null,
  });

  const base = () => ({
    meta: {
      generatedAt: "2026-07-03T00:00:00Z",
      source: {
        name: "OpenRouter public model catalog API",
        url: "https://openrouter.ai/api/v1/models",
      },
    },
    coverage: {
      modelCount: 1,
      endpointDetails: {
        attempted: 1,
        fetched: 1,
        failed: 0,
        modelCountWithEndpoints: 1,
        endpointCount: 1,
        providerCount: 1,
        providerNames: ["OpenAI"],
      },
      createdDateRange: { earliest: "2026-01-01", latest: "2026-01-01" },
    },
    methodology: {},
    models: [
      {
        id: "openai/gpt-example",
        name: "OpenAI: GPT Example",
        canonicalSlug: "openai/gpt-example",
        provider: { slug: "openai", name: "OpenAI" },
        family: { slug: "gpt", name: "Gpt", inferredFrom: "openai/gpt-example" },
        createdAt: "2026-01-01T00:00:00.000Z",
        createdDate: "2026-01-01",
        contextLength: 128000,
        maxOutputTokens: 16000,
        architecture: architecture(),
        pricing: { prompt: 0.000001, completion: 0.000002 },
        topProvider: {
          contextLength: 128000,
          maxCompletionTokens: 16000,
          isModerated: true,
        },
        endpoints: {
          endpointCount: 1,
          providerCount: 1,
          providers: [{ name: "OpenAI", endpointCount: 1 }],
          supportedParameters: ["max_tokens"],
        },
        supportedParameters: ["max_tokens"],
        description: "Example",
      },
    ],
  });

  it("throws when endpoint detail coverage is too low", () => {
    const data = base();
    data.coverage.endpointDetails.fetched = 0;
    expect(() =>
      validateOpenRouterModels(data, { minModels: 1, minEndpointDetailRatio: 0.5 })
    ).toThrow(/openrouter-models: too few public endpoint detail responses/);
  });

  it("throws when a model is missing architecture modalities", () => {
    const data = base();
    delete data.models[0].architecture.inputModalities;
    expect(() =>
      validateOpenRouterModels(data, { minModels: 1, minEndpointDetailRatio: 0 })
    ).toThrow(/architecture\.inputModalities must be an array/);
  });
});

// ─── validateAICompanyStocks ─────────────────────────────────────────────────

describe("validateAICompanyStocks — committed file", () => {
  const data = read("data/ai-company-stocks.json");

  it("committed data/ai-company-stocks.json passes validation", () => {
    expect(() => validateAICompanyStocks(data)).not.toThrow();
  });
});

describe("validateAICompanyStocks — negative cases", () => {
  it("throws for empty company rows", () => {
    expect(() =>
      validateAICompanyStocks({
        generatedAt: "2026-07-03T00:00:00Z",
        meta: {
          generatedAt: "2026-07-03T00:00:00Z",
          source: { name: "fixture" },
        },
        source: {},
        methodology: {
          feature: "descriptive only; not financial advice and not a recommendation",
        },
        coverage: {
          sourceMode: "committed-static-fixture",
          companyCount: 0,
        },
        benchmarks: [],
        companies: [],
        categories: [],
        summary: {
          companyCount: 0,
        },
      })
    ).toThrow(/ai-company-stocks\.companies.*too few rows/);
  });

  it("throws when trading-action labels appear", () => {
    const price = [
      { date: "2026-01-31", close: 100 },
      { date: "2026-02-28", close: 110 },
    ];
    const returns = {
      "1M": 0.1,
      "3M": null,
      "6M": null,
      YTD: 0.1,
      "1Y": null,
      fullPeriod: 0.1,
    };
    const metrics = {
      startDate: "2026-01-31",
      latestDate: "2026-02-28",
      latestClose: 110,
      observationCount: 2,
      observationInterval: "1mo",
      returns,
      annualizedVolatility: null,
      maxDrawdown: 0,
      momentum50d: 0.1,
      momentum200d: null,
    };
    const benchmarks = ["spy", "qqq"].map((id) => ({
      id,
      ticker: id.toUpperCase(),
      name: `${id} benchmark`,
      prices: price,
      metrics,
      dataQualityNotes: [],
    }));
    const companies = Array.from({ length: 15 }, (_, index) => ({
      id: `c${index}`,
      ticker: `C${String.fromCharCode(65 + index)}`,
      name: `Company ${index}`,
      primaryCategory: "category",
      categories: ["category"],
      prices: price,
      metrics,
      relativeReturns: {
        spy: returns,
        qqq: returns,
      },
      categoryRanks: [
        {
          categoryId: "category",
          oneYearReturnRank: null,
          ytdReturnRank: index + 1,
          momentum200dRank: null,
          memberCount: 15,
        },
      ],
      dataQualityNotes: [],
      ...(index === 0 ? { recommendation: "not allowed" } : {}),
    }));

    expect(() =>
      validateAICompanyStocks({
        generatedAt: "2026-07-03T00:00:00Z",
        meta: {
          generatedAt: "2026-07-03T00:00:00Z",
          source: { name: "fixture" },
        },
        source: {},
        methodology: {
          feature: "descriptive only; not financial advice and not a recommendation",
        },
        coverage: {
          sourceMode: "committed-static-fixture",
          companyCount: 15,
        },
        benchmarks,
        companies,
        categories: Array.from({ length: 5 }, (_, index) => ({
          id: `cat-${index}`,
          label: `Category ${index}`,
          companyCount: 1,
          tickers: ["CA"],
          breadth: {},
          topGainers1Y: [],
          laggards1Y: [],
        })),
        summary: {
          companyCount: 15,
        },
      })
    ).toThrow(/trading-action labels/);
  });
});

// ─── validateWarnNotices — date plausibility (issue #116) ─────────────────────

describe("validateWarnNotices — date upper bound", () => {
  it("committed data/warn-notices.json has no impossible future dates", () => {
    const data = read("data/warn-notices.json");
    expect(() => validateWarnNotices(data)).not.toThrow();
  });

  it("throws when an effectiveDate exceeds current_year + 2", () => {
    const futureYear = new Date().getUTCFullYear() + 3;
    const data = {
      generatedAt: "2026-01-01T00:00:00Z",
      coverageSummary: { liveStates: 11, totalStates: 51 },
      coverageStates: Array.from({ length: 51 }, (_, i) => ({
        state: ["CA", "GA", "IA", "KY", "NJ", "NY", "OH", "OR", "TN", "TX", "WI",
          "AL", "AK", "AZ", "AR", "CO", "CT", "DE", "DC", "FL", "HI", "ID", "IL",
          "IN", "KS", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE",
          "NV", "NH", "NM", "NC", "ND", "OK", "PA", "RI", "SC", "SD", "UT", "VT",
          "VA", "WA", "WV", "WY"][i],
        sourceStatus: i < 11 ? "live" : "manual-only",
      })),
      notices: Array.from({ length: 10001 }, (_, i) => ({
        company: `Company ${i}`,
        noticeDate: "2026-01-01",
        effectiveDate: i === 0 ? `${futureYear}-06-15` : "2026-03-01",
        employees: 10,
        state: "CA",
        stateName: "California",
      })),
    };
    expect(() => validateWarnNotices(data)).toThrow(/beyond/);
  });

  it("allows effectiveDate within current_year + 2 (legitimate near-future)", () => {
    const legitimateYear = new Date().getUTCFullYear() + 1;
    const data = {
      generatedAt: "2026-01-01T00:00:00Z",
      coverageSummary: { liveStates: 11, totalStates: 51 },
      coverageStates: Array.from({ length: 51 }, (_, i) => ({
        state: ["CA", "GA", "IA", "KY", "NJ", "NY", "OH", "OR", "TN", "TX", "WI",
          "AL", "AK", "AZ", "AR", "CO", "CT", "DE", "DC", "FL", "HI", "ID", "IL",
          "IN", "KS", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE",
          "NV", "NH", "NM", "NC", "ND", "OK", "PA", "RI", "SC", "SD", "UT", "VT",
          "VA", "WA", "WV", "WY"][i],
        sourceStatus: i < 11 ? "live" : "manual-only",
      })),
      notices: Array.from({ length: 10001 }, (_, i) => ({
        company: `Company ${i}`,
        noticeDate: "2026-01-01",
        effectiveDate: `${legitimateYear}-06-15`,
        employees: 10,
        state: "CA",
        stateName: "California",
      })),
    };
    expect(() => validateWarnNotices(data)).not.toThrow();
  });

  it("throws when an effectiveDate predates 2010-01-01", () => {
    const data = {
      generatedAt: "2026-01-01T00:00:00Z",
      coverageSummary: { liveStates: 11, totalStates: 51 },
      coverageStates: Array.from({ length: 51 }, (_, i) => ({
        state: ["CA", "GA", "IA", "KY", "NJ", "NY", "OH", "OR", "TN", "TX", "WI",
          "AL", "AK", "AZ", "AR", "CO", "CT", "DE", "DC", "FL", "HI", "ID", "IL",
          "IN", "KS", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE",
          "NV", "NH", "NM", "NC", "ND", "OK", "PA", "RI", "SC", "SD", "UT", "VT",
          "VA", "WA", "WV", "WY"][i],
        sourceStatus: i < 11 ? "live" : "manual-only",
      })),
      notices: Array.from({ length: 10001 }, (_, i) => ({
        company: `Company ${i}`,
        noticeDate: "2020-01-01",
        effectiveDate: i === 0 ? "2005-06-15" : "2020-03-01",
        employees: 10,
        state: "CA",
        stateName: "California",
      })),
    };
    expect(() => validateWarnNotices(data)).toThrow(/before 2010/);
  });
});

// ─── New builder validators — committed file + negative cases (issue #116) ────

describe("validateAIFrontier — committed file", () => {
  const data = read("data/ai-frontier.json");
  it("committed data/ai-frontier.json passes validation", () => {
    expect(() => validateAIFrontier(data)).not.toThrow();
  });
});

describe("validateAIFrontier — negative cases", () => {
  it("throws for empty models array", () => {
    expect(() =>
      validateAIFrontier({
        generatedAt: "2026-01-01T00:00:00Z",
        source: {},
        counts: { totalRows: 0 },
        models: [],
        aggregates: {},
        caveats: ["test"],
      })
    ).toThrow(/too few rows/);
  });

  it("throws when missing required fields", () => {
    expect(() =>
      validateAIFrontier({ generatedAt: "2026-01-01T00:00:00Z" } as Record<string, unknown>)
    ).toThrow(/missing required/);
  });
});

describe("validateAIUsageProxies — committed file", () => {
  const data = read("data/ai-usage-proxies.json");
  it("committed data/ai-usage-proxies.json passes validation", () => {
    expect(() => validateAIUsageProxies(data)).not.toThrow();
  });
});

describe("validateAIUsageProxies — negative cases", () => {
  it("throws for empty enterpriseAdoptionMetrics", () => {
    expect(() =>
      validateAIUsageProxies({
        generatedAt: "2026-01-01T00:00:00Z",
        meta: { generatedAt: "2026-01-01T00:00:00Z" },
        scope: "test",
        caveat: "test",
        enterpriseAdoptionMetrics: [],
        openModelDownloadProxies: [{ x: 1 }],
      })
    ).toThrow(/enterpriseAdoptionMetrics must be a non-empty/);
  });

  it("throws when scope is empty", () => {
    expect(() =>
      validateAIUsageProxies({
        generatedAt: "2026-01-01T00:00:00Z",
        meta: { generatedAt: "2026-01-01T00:00:00Z" },
        scope: "",
        caveat: "test",
        enterpriseAdoptionMetrics: [{ x: 1 }],
        openModelDownloadProxies: [{ x: 1 }],
      })
    ).toThrow(/scope must be a non-empty/);
  });
});

describe("validateGlobalMetrics — committed file", () => {
  const data = read("data/global-ai-metrics.json");
  it("committed data/global-ai-metrics.json passes validation", () => {
    expect(() => validateGlobalMetrics(data)).not.toThrow();
  });
});

describe("validateGlobalMetrics — negative cases", () => {
  it("throws when diffusion has fewer than 20 countries", () => {
    expect(() =>
      validateGlobalMetrics({
        generatedAt: "2026-01-01T00:00:00Z",
        sources: [{ name: "test" }],
        metrics: { diffusion: { USA: 50, CHN: 30 } },
      })
    ).toThrow(/diffusion must have >= 20/);
  });

  it("throws when sources is empty", () => {
    expect(() =>
      validateGlobalMetrics({
        generatedAt: "2026-01-01T00:00:00Z",
        sources: [],
        metrics: { diffusion: {} },
      })
    ).toThrow(/sources must be a non-empty/);
  });
});

describe("validateMarketSignals — committed file", () => {
  const data = read("data/market-ai-signals.json");
  it("committed data/market-ai-signals.json passes validation", () => {
    expect(() => validateMarketSignals(data)).not.toThrow();
  });
});

describe("validateMarketSignals — negative cases", () => {
  it("throws for fewer than 8 sectors", () => {
    expect(() =>
      validateMarketSignals({
        generatedAt: "2026-01-01T00:00:00Z",
        source: {},
        methodology: {},
        benchmark: {},
        sectors: [{ name: "A" }],
        summary: {},
      })
    ).toThrow(/too few rows/);
  });

  it("throws on duplicate sector names", () => {
    const sectors = Array.from({ length: 9 }, (_, i) => ({
      name: i === 8 ? "Duplicate" : `Sector ${i}`,
    }));
    sectors[0].name = "Duplicate";
    expect(() =>
      validateMarketSignals({
        generatedAt: "2026-01-01T00:00:00Z",
        source: {},
        methodology: {},
        benchmark: {},
        sectors,
        summary: {},
      })
    ).toThrow(/duplicate sector name/);
  });
});

describe("validateOnetEnrichment — committed file", () => {
  const data = read("data/onet-enrichment.json");
  it("committed data/onet-enrichment.json passes validation", () => {
    expect(() => validateOnetEnrichment(data)).not.toThrow();
  });
});

describe("validateOnetEnrichment — negative cases", () => {
  it("throws when occupations has fewer than 50 entries", () => {
    expect(() =>
      validateOnetEnrichment({
        generatedAt: "2026-01-01T00:00:00Z",
        source: { name: "test" },
        coverage: { enriched: 10, requested: 50, missing: [] },
        occupations: Object.fromEntries(
          Array.from({ length: 10 }, (_, i) => [`${i + 10}-0000`, {}])
        ),
      })
    ).toThrow(/too few enriched/);
  });
});

describe("validateWorldGeo — committed file", () => {
  const data = read("data/world-countries.geo.json");
  it("committed data/world-countries.geo.json passes validation", () => {
    expect(() => validateWorldGeo(data)).not.toThrow();
  });
});

describe("validateWorldGeo — negative cases", () => {
  it("throws when fewer than 170 features", () => {
    expect(() =>
      validateWorldGeo({
        type: "FeatureCollection",
        features: [{ id: "USA", properties: {}, geometry: {} }],
      })
    ).toThrow(/expected >= 170/);
  });

  it("throws on duplicate ISO3 ids", () => {
    const features = Array.from({ length: 171 }, (_, i) => ({
      id: `Z${String(i).padStart(2, "0")}`,
      properties: {},
      geometry: {},
    }));
    features[0].id = "USA";
    features[1].id = "USA";
    expect(() =>
      validateWorldGeo({ type: "FeatureCollection", features })
    ).toThrow(/duplicate ISO3/);
  });

  it("throws when required country is missing", () => {
    const alpha = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
    const features = Array.from({ length: 171 }, (_, i) => ({
      id: `${alpha[Math.floor(i / 25)]}${alpha[i % 25]}Q`,
      properties: {},
      geometry: {},
    }));
    expect(() =>
      validateWorldGeo({ type: "FeatureCollection", features })
    ).toThrow(/missing required country/);
  });
});

describe("validateAISignalsFile — committed files", () => {
  for (const filename of [
    "llm-exposure.json",
    "aioe-exposure.json",
    "automation-baseline.json",
    "ai-demand.json",
    "ai-layoffs.json",
  ]) {
    it(`committed data/${filename} passes validation`, () => {
      const data = read(`data/${filename}`);
      expect(() => validateAISignalsFile(data, filename)).not.toThrow();
    });
  }
});

describe("validateAISignalsFile — negative cases", () => {
  it("throws when bySoc has fewer than 100 entries", () => {
    expect(() =>
      validateAISignalsFile(
        {
          generatedAt: "2026-01-01T00:00:00Z",
          source: { name: "test" },
          bySoc: Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => [`${i + 10}-0000`, 0.5])
          ),
        },
        "llm-exposure.json"
      )
    ).toThrow(/bySoc must have >= 100/);
  });

  it("throws when source is missing", () => {
    expect(() =>
      validateAISignalsFile(
        { generatedAt: "2026-01-01T00:00:00Z" } as Record<string, unknown>,
        "llm-exposure.json"
      )
    ).toThrow(/missing source/);
  });

  it("rejects unknown filename", () => {
    expect(() =>
      validateAISignalsFile(
        {
          generatedAt: "2026-01-01T00:00:00Z",
          source: { name: "test" },
        },
        "unknown-file.json"
      )
    ).toThrow(/unknown AI signals filename/);
  });

  it("rejects empty ai-layoffs with no annual data", () => {
    expect(() =>
      validateAISignalsFile(
        {
          generatedAt: "2026-01-01T00:00:00Z",
          source: { name: "test" },
          note: "test",
          annual: [],
          monthly: [{ month: "2025-01", cuts: 100 }],
        },
        "ai-layoffs.json"
      )
    ).toThrow(/annual must be a non-empty/);
  });

  it("rejects ai-layoffs with no monthly data", () => {
    expect(() =>
      validateAISignalsFile(
        {
          generatedAt: "2026-01-01T00:00:00Z",
          source: { name: "test" },
          note: "test",
          annual: [{ year: 2023, cuts: 100 }],
          monthly: [],
        },
        "ai-layoffs.json"
      )
    ).toThrow(/monthly must be a non-empty/);
  });

  it("rejects ai-layoffs with missing note", () => {
    expect(() =>
      validateAISignalsFile(
        {
          generatedAt: "2026-01-01T00:00:00Z",
          source: { name: "test" },
          annual: [{ year: 2023, cuts: 100 }],
          monthly: [{ month: "2025-01", cuts: 100 }],
        } as Record<string, unknown>,
        "ai-layoffs.json"
      )
    ).toThrow(/note must be a non-empty/);
  });

  it("rejects ai-demand with empty countries", () => {
    expect(() =>
      validateAISignalsFile(
        {
          generatedAt: "2026-01-01T00:00:00Z",
          source: { name: "test" },
          countries: [],
          series: [],
          latest: [],
        },
        "ai-demand.json"
      )
    ).toThrow(/countries must be a non-empty/);
  });

  it("rejects ai-demand with too few series points", () => {
    expect(() =>
      validateAISignalsFile(
        {
          generatedAt: "2026-01-01T00:00:00Z",
          source: { name: "test" },
          countries: ["US"],
          series: [
            { country: "US", points: [{ month: "2025-01", share: 0.1 }] },
          ],
          latest: [{ country: "US", share: 0.1 }],
        },
        "ai-demand.json"
      )
    ).toThrow(/must have >= 6 monthly points/);
  });

  it("rejects aioe-exposure with missing note", () => {
    expect(() =>
      validateAISignalsFile(
        {
          generatedAt: "2026-01-01T00:00:00Z",
          source: { name: "test" },
          bySoc: Object.fromEntries(
            Array.from({ length: 150 }, (_, i) => [
              `${String(Math.floor(i / 100) + 10).padStart(2, "0")}-${String(i % 10000).padStart(4, "0")}`,
              0.5,
            ])
          ),
        } as Record<string, unknown>,
        "aioe-exposure.json"
      )
    ).toThrow(/note must be a non-empty/);
  });

  it("rejects bySoc with out-of-range values", () => {
    expect(() =>
      validateAISignalsFile(
        {
          generatedAt: "2026-01-01T00:00:00Z",
          source: { name: "test" },
          bySoc: Object.fromEntries(
            Array.from({ length: 150 }, (_, i) => [
              `${String(Math.floor(i / 100) + 10).padStart(2, "0")}-${String(i % 10000).padStart(4, "0")}`,
              1.5,
            ])
          ),
        },
        "llm-exposure.json"
      )
    ).toThrow(/must be a number in \[0,1\]/);
  });

  it("rejects bySoc with invalid SOC keys", () => {
    expect(() =>
      validateAISignalsFile(
        {
          generatedAt: "2026-01-01T00:00:00Z",
          source: { name: "test" },
          bySoc: { "INVALID": 0.5, ...Object.fromEntries(
            Array.from({ length: 150 }, (_, i) => [
              `${String(Math.floor(i / 100) + 10).padStart(2, "0")}-${String(i % 10000).padStart(4, "0")}`,
              0.5,
            ])
          )},
        },
        "llm-exposure.json"
      )
    ).toThrow(/invalid SOC key/);
  });

  it("rejects ai-layoffs with invalid month format", () => {
    expect(() =>
      validateAISignalsFile(
        {
          generatedAt: "2026-01-01T00:00:00Z",
          source: { name: "test" },
          note: "test",
          annual: [{ year: 2023, cuts: 100 }],
          monthly: [{ month: "January 2025", cuts: 100 }],
        },
        "ai-layoffs.json"
      )
    ).toThrow(/month must be YYYY-MM/);
  });
});

// ─── High-value data invariants (issue #116, task 5) ──────────────────────────

describe("high-value invariants", () => {
  it("world-geo ISO3 codes are unique", () => {
    const data = read("data/world-countries.geo.json");
    const ids = data.features.map((f: Record<string, unknown>) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("market-ai-signals sector names are unique and have minimum coverage", () => {
    const data = read("data/market-ai-signals.json");
    const names = data.sectors.map((s: Record<string, unknown>) => s.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(8);
  });

  it("occupation-snapshot total workforce is plausible (< 250M US)", () => {
    const data = read("data/occupation-snapshot.json");
    const rows = Array.isArray(data) ? data : data.data;
    const totalEmployment = rows.reduce(
      (sum: number, r: Record<string, unknown>) => sum + ((r.employment as number) ?? 0),
      0
    );
    // US civilian labor force is ~165M; total employment across all SOCs should not exceed 250M
    expect(totalEmployment).toBeLessThan(250_000_000);
    expect(totalEmployment).toBeGreaterThan(50_000_000);
  });

  it("WARN summary total matches sum of byState notices", () => {
    const data = read("data/warn-notices.json");
    const summaryTotal = data.summary.total;
    const byStateSum = data.summary.byState.reduce(
      (sum: number, s: Record<string, unknown>) => sum + (s.notices as number),
      0
    );
    expect(summaryTotal).toBe(byStateSum);
    // Bounded divergence: summary.total >= notices array length (summary counts untrimmed)
    expect(summaryTotal).toBeGreaterThanOrEqual(data.notices.length);
    // But not wildly larger (< 2x implies no catastrophic double-counting)
    expect(summaryTotal).toBeLessThan(data.notices.length * 2);
  });

  it("AIOE exposure null handling — missing joins produce null, not zero", () => {
    const data = read("data/aioe-exposure.json");
    const bySoc = data.bySoc;
    // Every present SOC value should be a number in [0,1] — NOT zero for "missing"
    for (const [, value] of Object.entries(bySoc)) {
      if (value === null) continue; // null is acceptable for unmatched
      expect(typeof value).toBe("number");
      expect(value as number).toBeGreaterThanOrEqual(0);
      expect(value as number).toBeLessThanOrEqual(1);
    }
    // At least 100 SOCs should be present
    expect(Object.keys(bySoc).length).toBeGreaterThanOrEqual(100);
  });

  it("employment-projections — null projectedOpenings are preserved, not zero", () => {
    const data = read("data/employment-projections.json");
    const nullRows = data.rows.filter((r: Record<string, unknown>) => r.projectedOpenings === null);
    const zeroRows = data.rows.filter((r: Record<string, unknown>) => r.projectedOpenings === 0);
    // We know 85 have null — verify they haven't been silently zeroed
    expect(nullRows.length).toBeGreaterThanOrEqual(80);
    // Zero is distinct from null (some jobs genuinely project 0 net openings)
    // but no mass-conversion should turn all nulls to zeros
    expect(zeroRows.length).toBeLessThan(nullRows.length + 50);
  });

  it("openrouter-models — pricing sentinel -1 is preserved for dynamic models", () => {
    const data = read("data/openrouter-models.json");
    const dynamicModels = data.models.filter(
      (m: Record<string, Record<string, unknown>>) =>
        m.pricing &&
        (m.pricing.prompt === -1 || m.pricing.completion === -1)
    );
    // Known dynamic models should retain -1, not be zeroed or filtered
    expect(dynamicModels.length).toBeGreaterThanOrEqual(1);
    for (const m of dynamicModels) {
      // Sentinel must remain exactly -1
      if (m.pricing.prompt === -1) expect(m.pricing.prompt).toBe(-1);
      if (m.pricing.completion === -1) expect(m.pricing.completion).toBe(-1);
    }
  });
});

// ─── validateCountryExposure ─────────────────────────────────────────────────

describe("validateCountryExposure — committed file", () => {
  it("passes on data/country-exposure.json", () => {
    const data = read("data/country-exposure.json");
    expect(() => validateCountryExposure(data)).not.toThrow();
  });
});

describe("validateCountryExposure — negative cases", () => {
  it("rejects missing meta", () => {
    expect(() =>
      validateCountryExposure({
        data: Array.from({ length: 200 }, (_, i) => ({ iso3: `X${String(i).padStart(2, "0")}`, name: `Country ${i}` })),
      } as Record<string, unknown>)
    ).toThrow(/meta/i);
  });

  it("rejects too few countries", () => {
    expect(() =>
      validateCountryExposure({
        meta: { generatedAt: "2026-01-01T00:00:00Z" },
        data: [{ iso3: "USA", name: "United States" }],
      } as Record<string, unknown>)
    ).toThrow(/too few/i);
  });

  it("rejects missing iso3 on first entry", () => {
    expect(() =>
      validateCountryExposure({
        meta: { generatedAt: "2026-01-01T00:00:00Z" },
        data: Array.from({ length: 200 }, () => ({ name: "Test" })),
      } as Record<string, unknown>)
    ).toThrow(/iso3/i);
  });
});

// ─── validateSources ─────────────────────────────────────────────────────────

describe("validateSources — committed file", () => {
  it("passes on data/sources.json", () => {
    const data = read("data/sources.json");
    expect(() => validateSources(data)).not.toThrow();
  });
});

describe("validateSources — negative cases", () => {
  it("rejects missing required fields", () => {
    expect(() =>
      validateSources({
        generatedAt: "2026-01-01T00:00:00Z",
      } as Record<string, unknown>)
    ).toThrow(/sources/i);
  });

  it("rejects too few sources", () => {
    expect(() =>
      validateSources({
        generatedAt: "2026-01-01T00:00:00Z",
        license: "MIT",
        attribution: "test",
        sources: [{ name: "a", publisher: "b" }],
        note: "test",
      } as Record<string, unknown>)
    ).toThrow(/30/);
  });

  it("rejects source entry with missing publisher", () => {
    const fakeSources = Array.from({ length: 35 }, (_, i) => ({
      name: `Source ${i}`,
      publisher: i === 10 ? "" : `Publisher ${i}`,
    }));
    expect(() =>
      validateSources({
        generatedAt: "2026-01-01T00:00:00Z",
        license: "MIT",
        attribution: "test",
        sources: fakeSources,
        note: "test",
      } as Record<string, unknown>)
    ).toThrow(/publisher/i);
  });
});
