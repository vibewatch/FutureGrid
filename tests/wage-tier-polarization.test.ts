/**
 * tests/wage-tier-polarization.test.ts
 *
 * Unit tests for lib/wage-tier-polarization.ts — server-only derived data helper.
 * Issue: FutureGrid#109
 *
 * Coverage:
 *  - 755 included / 1 excluded for missing employment; 0 excluded for salary/exposure
 *  - Deterministic employment-weighted tercile assignment (stable across calls)
 *  - Exactly 3 tiers ordered low → middle → high
 *  - Each tier has exactly 4 exposure-band cells; zero-filled when empty
 *  - All tier employmentShare values sum to ≈ 1
 *  - Band employmentShare values sum to 1 within each tier
 *  - Band occupationShare values sum to 1 within each tier
 *  - Tier occupation counts sum to total included occupations (755)
 *  - Same universe / boundaries across both display modes:
 *    wageFloor, wageCeiling, occupationCount, and tier assignment are stable;
 *    both employment-weighted and occupation-count metrics exist in the same object
 *  - Known bounds: wageFloor > 0, wageCeiling > wageFloor, tiers wage-ordered
 *  - weightedMeanExposure and meanExposure are finite and in [0, 1]
 *  - highMinusLowExposureGap is finite
 *  - overallWeightedMeanExposure in [0, 1]
 *  - Fresh immutability: two calls return distinct object references; mutations
 *    to the returned tiers array do not corrupt subsequent calls
 *  - Methodology: tierMethod, label, description, bands, caveats, provenance
 */

import { describe, expect, it } from "vitest";
import {
  getWageTierPolarization,
  type WageTierPolarization,
  type WageTier,
} from "@/lib/wage-tier-polarization";

// ─── Shared fixture ───────────────────────────────────────────────────────────
// Computed once; tests use this unless they need a fresh call.
const result: WageTierPolarization = getWageTierPolarization();
const { tiers, summary, methodology } = result;

// ─── Universe size ────────────────────────────────────────────────────────────

describe("universe size — 755 included, 1 excluded for missing employment", () => {
  it("includes exactly 755 occupations", () => {
    expect(summary.includedOccupations).toBe(755);
  });

  it("excludes exactly 1 occupation for missing/non-positive employment", () => {
    expect(summary.excludedForMissingEmployment).toBe(1);
  });

  it("excludes 0 occupations for missing salary or exposure", () => {
    expect(summary.excludedForMissingSalaryOrExposure).toBe(0);
  });

  it("total included matches the sum of all tier occupation counts", () => {
    const counted = tiers.reduce((n, t) => n + t.occupationCount, 0);
    expect(counted).toBe(summary.includedOccupations);
  });

  it("totalEmployment is a large positive integer reflecting U.S. workforce scale", () => {
    expect(summary.totalEmployment).toBeGreaterThan(100_000_000); // ~130M
    expect(Number.isFinite(summary.totalEmployment)).toBe(true);
  });
});

// ─── Three tiers ──────────────────────────────────────────────────────────────

describe("three wage tiers ordered low → middle → high", () => {
  it("returns exactly 3 tiers", () => {
    expect(tiers).toHaveLength(3);
  });

  it("tier IDs are 'low', 'middle', 'high' in order", () => {
    expect(tiers[0].id).toBe("low");
    expect(tiers[1].id).toBe("middle");
    expect(tiers[2].id).toBe("high");
  });

  it("each tier has at least one occupation (no empty tier)", () => {
    for (const tier of tiers) {
      expect(tier.occupationCount, `tier '${tier.id}' must not be empty`).toBeGreaterThan(0);
    }
  });

  it("each tier has positive total employment", () => {
    for (const tier of tiers) {
      expect(tier.employment, `tier '${tier.id}' must have positive employment`).toBeGreaterThan(0);
    }
  });

  it("wage floors are ordered: low < middle < high", () => {
    expect(tiers[0].wageFloor).toBeLessThan(tiers[1].wageFloor);
    expect(tiers[1].wageFloor).toBeLessThan(tiers[2].wageFloor);
  });

  it("each tier's wageFloor is positive (salary denominated in USD > 0)", () => {
    for (const tier of tiers) {
      expect(tier.wageFloor, `tier '${tier.id}' wageFloor must be > 0`).toBeGreaterThan(0);
    }
  });

  it("each tier's wageCeiling > wageFloor", () => {
    for (const tier of tiers) {
      expect(
        tier.wageCeiling,
        `tier '${tier.id}' wageCeiling (${tier.wageCeiling}) must exceed wageFloor (${tier.wageFloor})`,
      ).toBeGreaterThan(tier.wageFloor);
    }
  });

  it("adjacent tier wage ranges do not overlap (each tier ceiling ≤ next tier floor)", () => {
    // Strict non-overlap: ceil(low) <= floor(middle), ceil(middle) <= floor(high)
    // Allow equality (an occupation on the boundary may appear in either adjacent tier).
    expect(tiers[0].wageCeiling).toBeLessThanOrEqual(tiers[1].wageFloor);
    expect(tiers[1].wageCeiling).toBeLessThanOrEqual(tiers[2].wageFloor);
  });
});

// ─── Four bands per tier ──────────────────────────────────────────────────────

describe("four exposure-band cells per tier — ordered and zero-filled", () => {
  it("each tier has exactly 4 bands", () => {
    for (const tier of tiers) {
      expect(tier.bands, `tier '${tier.id}' must have 4 bands`).toHaveLength(4);
    }
  });

  it("band IDs are in order: minimal → low → moderate → elevated across all tiers", () => {
    const EXPECTED_ORDER = ["minimal", "low", "moderate", "elevated"];
    for (const tier of tiers) {
      const ids = tier.bands.map((b) => b.band);
      expect(ids, `tier '${tier.id}' band order must be minimal/low/moderate/elevated`).toEqual(
        EXPECTED_ORDER,
      );
    }
  });

  it("all band employment values are ≥ 0 (zero-filled, not negative)", () => {
    for (const tier of tiers) {
      for (const band of tier.bands) {
        expect(
          band.employment,
          `tier '${tier.id}' band '${band.band}' employment must be ≥ 0`,
        ).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("all band occupationCount values are ≥ 0 (zero-filled, not negative)", () => {
    for (const tier of tiers) {
      for (const band of tier.bands) {
        expect(
          band.occupationCount,
          `tier '${tier.id}' band '${band.band}' occupationCount must be ≥ 0`,
        ).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("all band employmentShare values are in [0, 1]", () => {
    for (const tier of tiers) {
      for (const band of tier.bands) {
        expect(band.employmentShare).toBeGreaterThanOrEqual(0);
        expect(band.employmentShare).toBeLessThanOrEqual(1);
      }
    }
  });

  it("all band occupationShare values are in [0, 1]", () => {
    for (const tier of tiers) {
      for (const band of tier.bands) {
        expect(band.occupationShare).toBeGreaterThanOrEqual(0);
        expect(band.occupationShare).toBeLessThanOrEqual(1);
      }
    }
  });
});

// ─── Shares sum correctly ─────────────────────────────────────────────────────

describe("shares sum to 1 (within floating-point rounding)", () => {
  it("tier employmentShare values sum to ≈ 1", () => {
    const total = tiers.reduce((s, t) => s + t.employmentShare, 0);
    expect(total).toBeCloseTo(1, 4);
  });

  it("band employmentShare values sum to ≈ 1 within each tier", () => {
    for (const tier of tiers) {
      const total = tier.bands.reduce((s, b) => s + b.employmentShare, 0);
      expect(
        total,
        `tier '${tier.id}' band employmentShare values must sum to ≈ 1 (got ${total})`,
      ).toBeCloseTo(1, 4);
    }
  });

  it("band occupationShare values sum to ≈ 1 within each tier", () => {
    for (const tier of tiers) {
      const total = tier.bands.reduce((s, b) => s + b.occupationShare, 0);
      expect(
        total,
        `tier '${tier.id}' band occupationShare values must sum to ≈ 1 (got ${total})`,
      ).toBeCloseTo(1, 4);
    }
  });

  it("band employment values sum to tier total employment within each tier", () => {
    for (const tier of tiers) {
      const bandSum = tier.bands.reduce((s, b) => s + b.employment, 0);
      expect(bandSum).toBeCloseTo(tier.employment, -2); // within $100 headcount rounding
    }
  });

  it("band occupationCount values sum to tier total occupationCount", () => {
    for (const tier of tiers) {
      const bandSum = tier.bands.reduce((s, b) => s + b.occupationCount, 0);
      expect(bandSum).toBe(tier.occupationCount);
    }
  });

  it("tier employment values sum to summary.totalEmployment", () => {
    const total = tiers.reduce((s, t) => s + t.employment, 0);
    expect(total).toBeCloseTo(summary.totalEmployment, -2);
  });
});

// ─── Same universe / boundaries across display modes ─────────────────────────

describe("stable universe: both employment-weighted and occupation-count views share same tier assignment", () => {
  it("wageFloor and wageCeiling are identical across two successive calls", () => {
    const first = getWageTierPolarization();
    const second = getWageTierPolarization();
    for (let i = 0; i < 3; i++) {
      expect(first.tiers[i].wageFloor).toBe(second.tiers[i].wageFloor);
      expect(first.tiers[i].wageCeiling).toBe(second.tiers[i].wageCeiling);
    }
  });

  it("occupationCount is identical across two successive calls (same tier assignment)", () => {
    const first = getWageTierPolarization();
    const second = getWageTierPolarization();
    for (let i = 0; i < 3; i++) {
      expect(first.tiers[i].occupationCount).toBe(second.tiers[i].occupationCount);
    }
  });

  it("each tier object pre-computes BOTH employment-weighted and occupation-count metrics", () => {
    // Both weightedMeanExposure (employment-weighted) and meanExposure (unweighted)
    // are available on every tier — consumer can toggle views without a fresh fetch.
    for (const tier of tiers) {
      expect(
        Number.isFinite(tier.weightedMeanExposure),
        `tier '${tier.id}' weightedMeanExposure must be finite`,
      ).toBe(true);
      expect(
        Number.isFinite(tier.meanExposure),
        `tier '${tier.id}' meanExposure must be finite`,
      ).toBe(true);
      expect(
        typeof tier.occupationCount,
        `tier '${tier.id}' occupationCount must be a number`,
      ).toBe("number");
    }
  });

  it("band cells also carry both employment and occupationCount (both display modes pre-computed)", () => {
    for (const tier of tiers) {
      for (const band of tier.bands) {
        expect(typeof band.employment).toBe("number");
        expect(typeof band.occupationCount).toBe("number");
        expect(typeof band.employmentShare).toBe("number");
        expect(typeof band.occupationShare).toBe("number");
      }
    }
  });
});

// ─── Weighted mean exposure bounds ───────────────────────────────────────────

describe("weighted mean exposure values are finite and in [0, 1]", () => {
  it("weightedMeanExposure is in [0, 1] for each tier", () => {
    for (const tier of tiers) {
      expect(tier.weightedMeanExposure).toBeGreaterThanOrEqual(0);
      expect(tier.weightedMeanExposure).toBeLessThanOrEqual(1);
    }
  });

  it("meanExposure (unweighted) is in [0, 1] for each tier", () => {
    for (const tier of tiers) {
      expect(tier.meanExposure).toBeGreaterThanOrEqual(0);
      expect(tier.meanExposure).toBeLessThanOrEqual(1);
    }
  });

  it("overallWeightedMeanExposure is finite and in [0, 1]", () => {
    expect(Number.isFinite(summary.overallWeightedMeanExposure)).toBe(true);
    expect(summary.overallWeightedMeanExposure).toBeGreaterThanOrEqual(0);
    expect(summary.overallWeightedMeanExposure).toBeLessThanOrEqual(1);
  });

  it("highMinusLowExposureGap is finite (may be positive, zero, or negative)", () => {
    expect(Number.isFinite(summary.highMinusLowExposureGap)).toBe(true);
  });

  it("highMinusLowExposureGap equals high tier weighted mean minus low tier weighted mean", () => {
    const expectedGap = tiers[2].weightedMeanExposure - tiers[0].weightedMeanExposure;
    expect(summary.highMinusLowExposureGap).toBeCloseTo(expectedGap, 6);
  });
});

// ─── Deterministic tercile assignment ─────────────────────────────────────────

describe("deterministic tercile assignment — identical output across calls", () => {
  it("two successive calls produce identical JSON-serialized output", () => {
    const a = getWageTierPolarization();
    const b = getWageTierPolarization();
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("employment-weighted tercile targets ~33% each; no tier holds more than 45%", () => {
    // Employment-weighted tercile: each tier should be close to 1/3 of total employment.
    // Allow up to 45% variance for occupations spanning boundaries.
    for (const tier of tiers) {
      expect(tier.employmentShare).toBeLessThanOrEqual(0.45);
      expect(tier.employmentShare).toBeGreaterThan(0.1);
    }
  });

  it("tier boundaries reflect salary ordering: low tier has the lowest wages", () => {
    expect(tiers[0].wageCeiling).toBeLessThan(tiers[2].wageFloor);
  });
});

// ─── Fresh immutability ───────────────────────────────────────────────────────

describe("fresh immutability — mutations do not affect subsequent calls", () => {
  it("two successive calls return distinct object references", () => {
    const a = getWageTierPolarization();
    const b = getWageTierPolarization();
    expect(a).not.toBe(b);
    expect(a.tiers).not.toBe(b.tiers);
    expect(a.summary).not.toBe(b.summary);
    expect(a.methodology).not.toBe(b.methodology);
  });

  it("mutating the returned tiers array does not corrupt a subsequent call", () => {
    const first = getWageTierPolarization();
    const origLen = first.tiers.length;
    (first.tiers as WageTier[]).pop();
    const second = getWageTierPolarization();
    expect(second.tiers).toHaveLength(origLen);
  });

  it("mutating a tier's bands array does not corrupt a subsequent call", () => {
    const first = getWageTierPolarization();
    const origBandLen = first.tiers[0].bands.length;
    first.tiers[0].bands.pop();
    const second = getWageTierPolarization();
    expect(second.tiers[0].bands).toHaveLength(origBandLen);
  });

  it("mutating summary does not corrupt a subsequent call", () => {
    const first = getWageTierPolarization();
    const origCount = first.summary.includedOccupations;
    (first.summary as { includedOccupations: number }).includedOccupations = 0;
    const second = getWageTierPolarization();
    expect(second.summary.includedOccupations).toBe(origCount);
  });
});

// ─── Methodology, caveats, provenance ────────────────────────────────────────

describe("methodology — tierMethod, label, description, bands, caveats, provenance", () => {
  it("tierMethod is 'employment-weighted-tercile'", () => {
    expect(methodology.tierMethod).toBe("employment-weighted-tercile");
  });

  it("label is a non-empty string", () => {
    expect(typeof methodology.label).toBe("string");
    expect(methodology.label.trim().length).toBeGreaterThan(0);
  });

  it("description is a non-empty string", () => {
    expect(typeof methodology.description).toBe("string");
    expect(methodology.description.trim().length).toBeGreaterThan(0);
  });

  it("description mentions employment-weighted terciles", () => {
    expect(methodology.description).toMatch(/tercile|employment.weighted/i);
  });

  it("has at least 4 caveats", () => {
    expect(methodology.caveats.length).toBeGreaterThanOrEqual(4);
  });

  it("every caveat is a non-empty string", () => {
    for (const caveat of methodology.caveats) {
      expect(typeof caveat).toBe("string");
      expect(caveat.trim().length).toBeGreaterThan(0);
    }
  });

  it("at least one caveat addresses cross-sectional / single-period snapshot", () => {
    const hasCrossSectional = methodology.caveats.some((c) =>
      /cross.sectional|snapshot|single.period|single period/i.test(c),
    );
    expect(hasCrossSectional, "A caveat should mention the cross-sectional nature of the data").toBe(true);
  });

  it("at least one caveat clarifies that employment is a baseline (not job-loss measure)", () => {
    const hasBaselineCaveat = methodology.caveats.some((c) =>
      /baseline|not.*job.loss|not.*displacement|pre.outcome/i.test(c),
    );
    expect(hasBaselineCaveat, "A caveat should clarify employment is a pre-outcome baseline").toBe(true);
  });

  it("caveats do not contain direct affirmative causal claims (proves, predicts layoffs, guaranteed)", () => {
    // Note: caveats may legitimately use "causes" in a negation
    // (e.g., "does not imply that AI causes wage changes") — only flag
    // unambiguous affirmative claims.
    const BANNED_PATTERNS = [
      /\bproves?\b/i,
      /\bpredicts?\s+layoffs?\b/i,
      /\bguaranteed\b/i,
    ];
    const combined = methodology.caveats.join(" ");
    for (const pattern of BANNED_PATTERNS) {
      expect(
        combined,
        `Methodology caveats should not contain direct causal language matching ${pattern}`,
      ).not.toMatch(pattern);
    }
  });

  it("caveats include an explicit statement that association ≠ causation", () => {
    const combined = methodology.caveats.join(" ");
    expect(combined).toMatch(/association.*causation|association.*≠|causal/i);
  });

  it("datasetBadgeIds contains 'occupation-snapshot'", () => {
    expect(methodology.datasetBadgeIds).toContain("occupation-snapshot");
  });

  it("methodology.bands has exactly 4 definitions", () => {
    expect(methodology.bands).toHaveLength(4);
  });

  it("methodology.bands IDs are minimal / low / moderate / elevated in order", () => {
    const ids = methodology.bands.map((b) => b.id);
    expect(ids).toEqual(["minimal", "low", "moderate", "elevated"]);
  });

  it("methodology.bands min/max form a contiguous partition of [0, 1]", () => {
    // Each band's max should equal or exceed the next band's min.
    const bands = methodology.bands;
    expect(bands[0].min).toBe(0);
    expect(bands[0].max).toBe(bands[1].min);
    expect(bands[1].max).toBe(bands[2].min);
    expect(bands[2].max).toBe(bands[3].min);
    expect(bands[3].max).toBeGreaterThanOrEqual(1.0);
  });

  it("methodology.bands match the live tier band definitions (no drift)", () => {
    // Each tier uses the same band definitions as methodology.bands.
    for (const tier of tiers) {
      const tierBandIds = tier.bands.map((b) => b.band);
      const methodBandIds = methodology.bands.map((b) => b.id);
      expect(tierBandIds).toEqual(methodBandIds);
    }
  });
});
