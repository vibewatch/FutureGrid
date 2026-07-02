/**
 * tests/h1b-data.test.ts
 *
 * Schema / shape validation for the committed data/h1b-trends.json snapshot
 * (built by scripts/build-h1b.mjs from DOL OFLC H-1B/LCA disclosure data).
 *
 * Mirrors tests/data-schema.test.ts:
 *  - a positive case (committed file MUST pass validateH1bTrends)
 *  - structural assertions (byYear sorted, wages positive, SOC codes normalized,
 *    coverage matches byYear)
 *  - negative cases (degenerate input MUST throw)
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { validateH1bTrends } from "../scripts/lib/validate.mjs";

const ROOT = process.cwd();
const read = (rel: string) =>
  JSON.parse(readFileSync(path.join(ROOT, rel), "utf8"));

type ByYear = {
  fiscalYear: number;
  certifiedLcas: number;
  totalWorkerPositions: number;
  distinctEmployers: number;
  medianWageAnnual: number;
  p25WageAnnual: number;
  p75WageAnnual: number;
};

type Occupation = {
  socCode: string;
  socTitle: string | null;
  countByYear: Record<string, number>;
  totalCount: number;
  medianWageAnnualLatest: number | null;
  cagr: number | null;
};

type H1bTrends = {
  meta: { generatedAt: string; source: { name?: string; url?: string } };
  coverage: {
    fiscalYears: number[];
    source: string;
    socCrosswalkApplied?: boolean;
    socVintage?: string;
  };
  byYear: ByYear[];
  occupations: Occupation[];
  topEmployers: { employer: string; totalCount: number; countByYear: Record<string, number> }[];
  byState: { state: string; totalCount: number; countByYear: Record<string, number>; medianWageAnnualLatest: number | null }[];
};

// ─── Committed file ───────────────────────────────────────────────────────────

describe("validateH1bTrends — committed file", () => {
  const data = read("data/h1b-trends.json") as H1bTrends;

  it("committed data/h1b-trends.json passes validation", () => {
    expect(() => validateH1bTrends(data)).not.toThrow();
  });

  it("has provenance stamping filings-not-approvals", () => {
    expect(data.meta.generatedAt).toBeTruthy();
    expect(data.meta.source.name).toBeTruthy();
    expect(data.meta.source.url).toBeTruthy();
  });

  it("byYear is sorted ascending by fiscalYear", () => {
    const years = data.byYear.map((b) => b.fiscalYear);
    const sorted = [...years].sort((a, b) => a - b);
    expect(years).toEqual(sorted);
    expect(new Set(years).size).toBe(years.length);
  });

  it("every byYear entry has positive wages and plausible percentile ordering", () => {
    for (const b of data.byYear) {
      expect(b.certifiedLcas).toBeGreaterThan(0);
      expect(b.totalWorkerPositions).toBeGreaterThanOrEqual(b.certifiedLcas);
      expect(b.distinctEmployers).toBeGreaterThan(0);
      expect(b.medianWageAnnual).toBeGreaterThan(0);
      expect(b.p25WageAnnual).toBeGreaterThan(0);
      expect(b.p75WageAnnual).toBeGreaterThan(0);
      expect(b.p25WageAnnual).toBeLessThanOrEqual(b.medianWageAnnual);
      expect(b.medianWageAnnual).toBeLessThanOrEqual(b.p75WageAnnual);
    }
  });

  it("has no FY2019→FY2020 undercount cliff (all years are full fiscal years)", () => {
    // Before the per-quarter fix, FY2020+ read only the Q4 file and undercounted
    // by ~5× (~108K vs ~500K). Every covered year must now be a full year.
    for (const b of data.byYear) {
      expect(b.certifiedLcas).toBeGreaterThanOrEqual(200000);
      expect(b.certifiedLcas).toBeLessThan(800000);
    }
  });

  it("FY2024 certified H-1B LCAs match the external ground truth (~524,612)", () => {
    const fy2024 = data.byYear.find((b) => b.fiscalYear === 2024);
    if (fy2024) {
      // Authoritative OFLC figure: ≈524,612 certified H-1B LCAs covering
      // ≈790,845 positions for FY2024. Allow a tolerance band around it.
      expect(fy2024.certifiedLcas).toBeGreaterThanOrEqual(500000);
      expect(fy2024.certifiedLcas).toBeLessThanOrEqual(545000);
      expect(fy2024.totalWorkerPositions).toBeGreaterThanOrEqual(750000);
      expect(fy2024.totalWorkerPositions).toBeLessThanOrEqual(830000);
    }
  });

  it("coverage.fiscalYears matches byYear fiscal years", () => {
    const cov = [...data.coverage.fiscalYears].sort((a, b) => a - b);
    const years = data.byYear.map((b) => b.fiscalYear).sort((a, b) => a - b);
    expect(cov).toEqual(years);
    expect(data.coverage.source).toMatch(/Wayback|OFLC|archive/i);
  });

  it("all occupation SOC codes are normalized to ##-#### form", () => {
    expect(data.occupations.length).toBeGreaterThan(50);
    for (const o of data.occupations) {
      expect(o.socCode).toMatch(/^\d{2}-\d{4}$/);
    }
  });

  it("occupation countByYear keys are all within coverage years", () => {
    const coverage = new Set(data.coverage.fiscalYears.map(String));
    for (const o of data.occupations) {
      for (const y of Object.keys(o.countByYear)) {
        expect(coverage.has(y)).toBe(true);
      }
    }
  });

  it("occupations are consolidated to the 2018 SOC vintage (crosswalk-tolerant)", () => {
    const codes = new Set(data.occupations.map((o) => o.socCode));
    if (data.coverage.socCrosswalkApplied) {
      // 2010-vintage Software Developer codes must be merged into the 2018 code
      // 15-1252 "Software Developers" — never split across SOC vintages.
      expect(codes.has("15-1132")).toBe(false);
      expect(codes.has("15-1133")).toBe(false);
      const dev = data.occupations.find((o) => o.socCode === "15-1252");
      expect(dev).toBeDefined();
      expect(dev?.socTitle).toMatch(/software develop/i);
      // Consolidation yields ONE continuous trend spanning every covered year.
      for (const y of data.coverage.fiscalYears.map(String)) {
        expect(dev?.countByYear[y]).toBeGreaterThan(0);
      }
    } else {
      // Graceful fallback: crosswalk unavailable — raw SOC codes are acceptable.
      expect(data.occupations.length).toBeGreaterThan(50);
    }
  });

  it("topEmployers and byState are non-empty and count-ordered", () => {
    expect(data.topEmployers.length).toBeGreaterThan(0);
    expect(data.topEmployers.length).toBeLessThanOrEqual(30);
    for (let i = 1; i < data.topEmployers.length; i++) {
      expect(data.topEmployers[i - 1].totalCount).toBeGreaterThanOrEqual(
        data.topEmployers[i].totalCount
      );
    }
    const states = data.byState.map((s) => s.state);
    expect(states).toContain("CA");
    // Two-letter USPS codes only.
    for (const s of states) expect(s).toMatch(/^[A-Z]{2}$/);
  });
});

// ─── Negative cases ───────────────────────────────────────────────────────────

describe("validateH1bTrends — negative cases", () => {
  const base = () => ({
    meta: {
      generatedAt: "2026-01-01T00:00:00Z",
      source: { name: "DOL OFLC LCA Disclosure Data", url: "https://www.dol.gov" },
      note: "Certified H-1B LCAs (filings, not approvals); wages annualized.",
    },
    coverage: { fiscalYears: [2020, 2021, 2022, 2023], source: "Wayback archive" },
    byYear: [2020, 2021, 2022, 2023].map((y) => ({
      fiscalYear: y,
      certifiedLcas: 300000,
      totalWorkerPositions: 450000,
      distinctEmployers: 15000,
      medianWageAnnual: 100000,
      p25WageAnnual: 80000,
      p75WageAnnual: 130000,
    })),
    occupations: Array.from({ length: 60 }, (_, i) => ({
      socCode: `15-${String(1000 + i).padStart(4, "0")}`,
      socTitle: "X",
      countByYear: { "2023": 10 },
      totalCount: 10,
      medianWageAnnualLatest: 100000,
      cagr: 0,
    })),
    topEmployers: Array.from({ length: 10 }, (_, i) => ({
      employer: `E${i}`,
      totalCount: 100 - i,
      countByYear: { "2023": 10 },
    })),
    byState: Array.from({ length: 25 }, (_, i) => ({
      state: `S${i}`,
      totalCount: 100,
      countByYear: { "2023": 10 },
      medianWageAnnualLatest: 100000,
    })),
  });

  it("passes for a well-formed synthetic dataset", () => {
    expect(() => validateH1bTrends(base())).not.toThrow();
  });

  it("throws when too few fiscal years", () => {
    const d = base();
    d.byYear = d.byYear.slice(0, 2);
    d.coverage.fiscalYears = [2020, 2021];
    expect(() => validateH1bTrends(d)).toThrow(/h1b-trends\.byYear.*too few rows/);
  });

  it("throws when a year has too few certifiedLcas", () => {
    const d = base();
    d.byYear[1].certifiedLcas = 10;
    expect(() => validateH1bTrends(d)).toThrow(/too few certifiedLcas/);
  });

  it("throws when byYear is not sorted", () => {
    const d = base();
    d.byYear = [d.byYear[1], d.byYear[0], d.byYear[2], d.byYear[3]];
    expect(() => validateH1bTrends(d)).toThrow(/must be sorted ascending/);
  });

  it("throws when coverage.fiscalYears does not match byYear", () => {
    const d = base();
    d.coverage.fiscalYears = [2019, 2020, 2021, 2022];
    expect(() => validateH1bTrends(d)).toThrow(/coverage\.fiscalYears does not match/);
  });

  it("throws when a SOC code is not normalized", () => {
    const d = base();
    d.occupations[0].socCode = "15-1252.00";
    expect(() => validateH1bTrends(d)).toThrow(/SOC code not normalized/);
  });

  it("throws when a required top-level key is missing", () => {
    const d = base() as Record<string, unknown>;
    delete d.byState;
    expect(() => validateH1bTrends(d)).toThrow(/h1b-trends.*missing required top-level key/);
  });

  it("throws when provenance source is absent", () => {
    const d = base();
    d.meta.source = {} as { name: string; url: string };
    expect(() => validateH1bTrends(d)).toThrow(/missing meta\.source/);
  });
});
