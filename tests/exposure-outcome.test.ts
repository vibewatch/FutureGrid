/**
 * tests/exposure-outcome.test.ts
 *
 * Unit tests for the Exposure → Outcome Reality Matrix helper.
 * Issue: vibewatch/FutureGrid#105
 *
 * Coverage:
 *  - All SOC entries present, sorted ascending by code
 *  - Known SOC values match source helpers (getExposureComparison, getAISignalData)
 *  - gap = capability − usage where both are non-null
 *  - Bounds computed correctly over non-null values
 *  - Summary counts consistent with point-level flags
 *  - Correlation coefficients in [-1, 1] range
 *  - Explicit null dependencies preserved (gap null when capability or usage null)
 *  - Fresh immutability: two calls return distinct object references
 *  - Methodology label, description, caveats, and datasetBadgeIds accurate
 */

import { describe, expect, it } from "vitest";
import {
  getExposureOutcomeMatrix,
  type ExposureOutcomeMatrix,
  type ExposureOutcomePoint,
} from "@/lib/exposure-outcome";
import {
  getExposureComparison,
  getAISignalData,
  getDisruptionIndex,
} from "@/lib/analysis";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

// Call once at module scope so the heavy data load only happens once.
const matrix: ExposureOutcomeMatrix = getExposureOutcomeMatrix();
const { points, summary, methodology } = matrix;

// Source datasets used for cross-validation.
const comparison = getExposureComparison();
const signal = getAISignalData();
const disruption = getDisruptionIndex();

// ─── Deterministic sort ───────────────────────────────────────────────────────

describe("points sort order", () => {
  it("contains as many points as getExposureComparison occupations", () => {
    expect(points.length).toBe(comparison.occupations.length);
  });

  it("is sorted ascending by SOC code", () => {
    for (let i = 1; i < points.length; i++) {
      expect(
        points[i].code.localeCompare(points[i - 1].code),
        `points[${i}].code (${points[i].code}) should sort after points[${i - 1}].code (${points[i - 1].code})`,
      ).toBeGreaterThan(0);
    }
  });

  it("contains each SOC code from getExposureComparison exactly once", () => {
    const matrixCodes = new Set(points.map((p) => p.code));
    for (const occ of comparison.occupations) {
      expect(matrixCodes.has(occ.code), `SOC ${occ.code} should be present in matrix`).toBe(true);
    }
    expect(matrixCodes.size).toBe(comparison.occupations.length);
  });
});

// ─── Known SOC cross-validation ───────────────────────────────────────────────

describe("known SOC values match source helpers", () => {
  // Software Developers — 15-1252 — a high-coverage SOC present in all source datasets.
  const softwareDev = points.find((p) => p.code === "15-1252");
  const sdSource = comparison.occupations.find((o) => o.code === "15-1252");
  const sdSignal = signal.points.find((s) => s.code === "15-1252");

  it("finds Software Developers (15-1252) in the matrix", () => {
    expect(softwareDev, "15-1252 should be present").toBeDefined();
  });

  it("capability and usage match getExposureComparison for 15-1252", () => {
    if (!softwareDev || !sdSource) return;
    expect(softwareDev.capability).toBe(sdSource.capability);
    expect(softwareDev.usage).toBe(sdSource.usage);
  });

  it("title and sector match getExposureComparison for 15-1252", () => {
    if (!softwareDev || !sdSource) return;
    expect(softwareDev.title).toBe(sdSource.name);
    expect(softwareDev.sector).toBe(sdSource.sector);
  });

  it("empGrowth and wageGrowth match getAISignalData for 15-1252 when signal present", () => {
    if (!softwareDev || !sdSignal) return;
    expect(softwareDev.empGrowth).toBeCloseTo(sdSignal.empGrowth, 5);
    expect(softwareDev.wageGrowth).toBeCloseTo(sdSignal.wageGrowth, 5);
  });

  it("employment matches getExposureComparison for 15-1252", () => {
    if (!softwareDev || !sdSource) return;
    expect(softwareDev.employment).toBe(sdSource.employment);
  });

  it("disruptionScore and disruptionRank are consistent with getDisruptionIndex for 15-1252", () => {
    if (!softwareDev) return;
    const disruptionEntry = disruption.occupations.find((d) => d.code === "15-1252");
    if (disruptionEntry) {
      expect(softwareDev.disruptionScore).toBeCloseTo(disruptionEntry.score, 4);
      expect(softwareDev.disruptionRank).toBe(disruptionEntry.rank);
    } else {
      expect(softwareDev.disruptionScore).toBeNull();
      expect(softwareDev.disruptionRank).toBeNull();
    }
  });

  // Secretaries/clerks — high capability, lower usage historically — validates gap direction.
  it("gap = capability − usage for a high-gap clerical occupation when both lenses present", () => {
    // Find any occupation where both capability and usage are non-null.
    const p = points.find((pt) => pt.capability != null && pt.usage != null);
    if (!p) return;
    expect(p.gap).toBeCloseTo(p.capability! - p.usage!, 5);
  });
});

// ─── Gap relation ─────────────────────────────────────────────────────────────

describe("gap = capability − usage", () => {
  it("holds for every non-null gap entry", () => {
    for (const p of points) {
      if (p.gap != null) {
        expect(
          p.capability,
          `gap non-null implies capability non-null for ${p.code}`,
        ).not.toBeNull();
        expect(
          p.usage,
          `gap non-null implies usage non-null for ${p.code}`,
        ).not.toBeNull();
        expect(p.gap, `gap ≈ capability − usage for ${p.code}`).toBeCloseTo(
          p.capability! - p.usage!,
          4,
        );
      }
    }
  });

  it("gap is null when capability is null", () => {
    for (const p of points) {
      if (p.capability == null) {
        expect(p.gap, `gap must be null when capability is null for ${p.code}`).toBeNull();
      }
    }
  });

  it("gap is null when usage is null", () => {
    for (const p of points) {
      if (p.usage == null) {
        expect(p.gap, `gap must be null when usage is null for ${p.code}`).toBeNull();
      }
    }
  });
});

// ─── Lens ranges ─────────────────────────────────────────────────────────────

describe("exposure lens values in valid ranges", () => {
  const lenses = ["capability", "usage", "ability", "automation", "consensus"] as const;

  it("all non-null lens values are in [0, 100]", () => {
    for (const p of points) {
      for (const lens of lenses) {
        const v = p[lens];
        if (v != null) {
          expect(Number.isFinite(v), `${lens} for ${p.code} should be finite`).toBe(true);
          expect(v, `${lens} for ${p.code} should be ≥ 0`).toBeGreaterThanOrEqual(0);
          expect(v, `${lens} for ${p.code} should be ≤ 100`).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("employment headcount is a positive integer", () => {
    for (const p of points) {
      expect(Number.isFinite(p.employment), `employment for ${p.code} should be finite`).toBe(true);
      expect(p.employment, `employment for ${p.code} should be > 0`).toBeGreaterThan(0);
    }
  });
});

// ─── Null dependencies (explicit null = absent data) ─────────────────────────

describe("explicit null dependencies", () => {
  it("empGrowth is null for SOC codes absent from getAISignalData", () => {
    const signalCodes = new Set(signal.points.map((s) => s.code));
    for (const p of points) {
      if (!signalCodes.has(p.code)) {
        expect(
          p.empGrowth,
          `empGrowth must be null for ${p.code} (not in signal dataset)`,
        ).toBeNull();
        expect(
          p.wageGrowth,
          `wageGrowth must be null for ${p.code} (not in signal dataset)`,
        ).toBeNull();
      }
    }
  });

  it("disruptionScore is null for SOC codes absent from getDisruptionIndex", () => {
    const disruptionCodes = new Set(disruption.occupations.map((d) => d.code));
    for (const p of points) {
      if (!disruptionCodes.has(p.code)) {
        expect(
          p.disruptionScore,
          `disruptionScore must be null for ${p.code} (not in disruption index)`,
        ).toBeNull();
        expect(
          p.disruptionRank,
          `disruptionRank must be null for ${p.code} (not in disruption index)`,
        ).toBeNull();
      }
    }
  });

  it("disruptionRank is null exactly when disruptionScore is null", () => {
    for (const p of points) {
      if (p.disruptionScore == null) {
        expect(p.disruptionRank, `disruptionRank must be null when score is null for ${p.code}`).toBeNull();
      } else {
        expect(p.disruptionRank, `disruptionRank must be non-null when score is present for ${p.code}`).not.toBeNull();
      }
    }
  });
});

// ─── Summary counts ───────────────────────────────────────────────────────────

describe("summary counts consistent with point flags", () => {
  it("totalOccupations matches points.length", () => {
    expect(summary.totalOccupations).toBe(points.length);
  });

  it("withLaborOutcomes counts entries where both empGrowth and wageGrowth are non-null", () => {
    const expected = points.filter((p) => p.empGrowth != null && p.wageGrowth != null).length;
    expect(summary.withLaborOutcomes).toBe(expected);
  });

  it("withCapability counts entries where capability is non-null", () => {
    const expected = points.filter((p) => p.capability != null).length;
    expect(summary.withCapability).toBe(expected);
  });

  it("withGap counts entries where gap is non-null", () => {
    const expected = points.filter((p) => p.gap != null).length;
    expect(summary.withGap).toBe(expected);
  });

  it("withDisruptionScore counts entries where disruptionScore is non-null", () => {
    const expected = points.filter((p) => p.disruptionScore != null).length;
    expect(summary.withDisruptionScore).toBe(expected);
  });

  it("all counts are positive (coverage is meaningful)", () => {
    expect(summary.withLaborOutcomes).toBeGreaterThan(0);
    expect(summary.withCapability).toBeGreaterThan(0);
    expect(summary.withGap).toBeGreaterThan(0);
    expect(summary.withDisruptionScore).toBeGreaterThan(0);
  });
});

// ─── Bounds ───────────────────────────────────────────────────────────────────

describe("bounds min ≤ max and within domain expectations", () => {
  it("capability bounds are in [0, 100]", () => {
    const { min, max } = summary.bounds.capability;
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeLessThanOrEqual(100);
    expect(min).toBeLessThanOrEqual(max);
  });

  it("usage bounds are in [0, 100]", () => {
    const { min, max } = summary.bounds.usage;
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeLessThanOrEqual(100);
    expect(min).toBeLessThanOrEqual(max);
  });

  it("gap bounds allow negative values (usage > capability possible)", () => {
    const { min, max } = summary.bounds.gap;
    expect(Number.isFinite(min)).toBe(true);
    expect(Number.isFinite(max)).toBe(true);
    expect(min).toBeLessThanOrEqual(max);
  });

  it("empGrowth bounds are finite growth rates", () => {
    const { min, max } = summary.bounds.empGrowth;
    expect(Number.isFinite(min)).toBe(true);
    expect(Number.isFinite(max)).toBe(true);
    expect(min).toBeLessThanOrEqual(max);
  });

  it("wageGrowth bounds are finite growth rates", () => {
    const { min, max } = summary.bounds.wageGrowth;
    expect(Number.isFinite(min)).toBe(true);
    expect(Number.isFinite(max)).toBe(true);
    expect(min).toBeLessThanOrEqual(max);
  });

  it("employment bounds are positive headcounts", () => {
    const { min, max } = summary.bounds.employment;
    expect(min).toBeGreaterThan(0);
    expect(max).toBeGreaterThan(min);
  });

  it("disruptionScore bounds are in [0, 100]", () => {
    const { min, max } = summary.bounds.disruptionScore;
    expect(min).toBeGreaterThanOrEqual(0);
    expect(max).toBeLessThanOrEqual(100);
    expect(min).toBeLessThanOrEqual(max);
  });

  it("bounds.capability.min equals the minimum non-null capability value across points", () => {
    const capValues = points.map((p) => p.capability).filter((v): v is number => v != null);
    expect(summary.bounds.capability.min).toBeCloseTo(Math.min(...capValues), 5);
    expect(summary.bounds.capability.max).toBeCloseTo(Math.max(...capValues), 5);
  });
});

// ─── Outcome window ───────────────────────────────────────────────────────────

describe("outcomeWindow from getAISignalData", () => {
  it("matches the signal.window fromYear and toYear", () => {
    expect(summary.outcomeWindow.fromYear).toBe(signal.window.fromYear);
    expect(summary.outcomeWindow.toYear).toBe(signal.window.toYear);
  });

  it("fromYear < toYear (window is forward in time)", () => {
    expect(summary.outcomeWindow.fromYear).toBeLessThan(summary.outcomeWindow.toYear);
  });
});

// ─── Correlations ─────────────────────────────────────────────────────────────

describe("Pearson correlations", () => {
  const rFields = [
    "capabilityVsEmpGrowthR",
    "capabilityVsWageGrowthR",
    "gapVsEmpGrowthR",
    "gapVsWageGrowthR",
  ] as const;

  for (const field of rFields) {
    it(`${field} is a finite number in [-1, 1]`, () => {
      const r = matrix[field];
      expect(Number.isFinite(r), `${field} should be finite`).toBe(true);
      expect(r, `${field} should be ≥ -1`).toBeGreaterThanOrEqual(-1);
      expect(r, `${field} should be ≤ 1`).toBeLessThanOrEqual(1);
    });
  }

  it("capabilityVsWageGrowthR is descriptively negative (higher-exposure roles show slower wage growth)", () => {
    // Directional check matching getAISignalData regression direction.
    expect(matrix.capabilityVsWageGrowthR).toBeLessThan(0);
  });
});

// ─── Fresh immutability ───────────────────────────────────────────────────────

describe("fresh immutability", () => {
  it("two consecutive calls return distinct object references", () => {
    const a = getExposureOutcomeMatrix();
    const b = getExposureOutcomeMatrix();
    expect(a).not.toBe(b);
    expect(a.points).not.toBe(b.points);
  });

  it("mutating the returned points array does not affect a subsequent call", () => {
    const first = getExposureOutcomeMatrix();
    const origLen = first.points.length;
    (first.points as ExposureOutcomePoint[]).push({} as ExposureOutcomePoint);
    const second = getExposureOutcomeMatrix();
    expect(second.points.length).toBe(origLen);
  });
});

// ─── Methodology provenance and caveats ───────────────────────────────────────

describe("methodology provenance and caveats", () => {
  it("has a non-empty label", () => {
    expect(methodology.label.trim().length).toBeGreaterThan(0);
  });

  it("has a non-empty description mentioning the main source helpers", () => {
    const desc = methodology.description;
    expect(desc).toMatch(/getExposureComparison/);
    expect(desc).toMatch(/getAISignalData/);
    expect(desc).toMatch(/getDisruptionIndex/);
  });

  it("description explicitly states correlation ≠ causation", () => {
    expect(methodology.description).toMatch(/correlation.*causation|causal/i);
  });

  it("has at least 7 caveats", () => {
    expect(methodology.caveats.length).toBeGreaterThanOrEqual(7);
  });

  it("every caveat is a non-empty string", () => {
    for (const caveat of methodology.caveats) {
      expect(typeof caveat).toBe("string");
      expect(caveat.trim().length).toBeGreaterThan(0);
    }
  });

  it("caveats include explicit null / missing-data caveat", () => {
    const nullCaveat = methodology.caveats.some((c) => /null|absent|missing|excluded/i.test(c));
    expect(nullCaveat, "A caveat should mention null/absent/missing data").toBe(true);
  });

  it("caveats do not use causal or job-loss predictive language", () => {
    const BANNED = [/\bproves?\b/i, /\bcauses?\b/i, /\bpredicts?\s+layoffs?\b/i, /\bguaranteed\b/i];
    for (const caveat of methodology.caveats) {
      for (const pattern of BANNED) {
        expect(caveat, `caveat should not contain banned wording matching ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("datasetBadgeIds references expected source datasets", () => {
    const ids = methodology.datasetBadgeIds;
    expect(ids).toContain("occupation-snapshot");
    expect(ids).toContain("llm-exposure");
    expect(ids.length).toBeGreaterThanOrEqual(3);
  });
});
