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
  validateProvenance,
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
    expect(Array.isArray(dataset.data)).toBe(true);
    expect(dataset.data.length).toBeGreaterThanOrEqual(680);
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
    expect(Array.isArray(dataset.data)).toBe(true);
    expect(dataset.data.length).toBeGreaterThanOrEqual(680);
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
      annualPostings: {
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
      relatedAnnualPostings: {
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
      },
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
