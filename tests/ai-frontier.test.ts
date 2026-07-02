import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAIFrontierData,
  getComputeModels,
  getOrgLeaderboard,
  getCountryLeaderboard,
  getModernEraRegression,
  formatFlop,
} from "@/lib/ai-frontier";

const DATA_PATH = path.join(process.cwd(), "data/ai-frontier.json");

// ── Helpers ────────────────────────────────────────────────────────────────────

function readSnapshot() {
  expect(existsSync(DATA_PATH), "data/ai-frontier.json must exist").toBe(true);
  return JSON.parse(readFileSync(DATA_PATH, "utf8")) as ReturnType<typeof getAIFrontierData>;
}

// ── Data integrity ─────────────────────────────────────────────────────────────

describe("data integrity — models array", () => {
  it("models[] is non-empty", () => {
    const { models } = readSnapshot();
    expect(models.length).toBeGreaterThan(0);
  });

  it("every model has computeFlop > 0 and finite log10Compute consistent with Math.log10(computeFlop)", () => {
    const { models } = readSnapshot();
    for (const m of models) {
      expect(m.computeFlop, `${m.name} computeFlop must be > 0`).toBeGreaterThan(0);
      expect(Number.isFinite(m.log10Compute), `${m.name} log10Compute must be finite`).toBe(true);
      const expected = Math.log10(m.computeFlop);
      expect(
        Math.abs(m.log10Compute - expected),
        `${m.name} log10Compute=${m.log10Compute} should ≈ Math.log10(${m.computeFlop})=${expected}`,
      ).toBeLessThan(0.011);
    }
  });

  it("every model date matches YYYY-MM-DD and year is an integer in 1950..2100", () => {
    const { models } = readSnapshot();
    for (const m of models) {
      expect(m.date, `${m.name} date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isInteger(m.year), `${m.name} year must be integer`).toBe(true);
      expect(m.year, `${m.name} year lower bound`).toBeGreaterThanOrEqual(1950);
      expect(m.year, `${m.name} year upper bound`).toBeLessThanOrEqual(2100);
    }
  });

  it("every model has a domains array and a countries array; at least 99% have non-empty domains", () => {
    const { models } = readSnapshot();
    let emptyDomains = 0;
    for (const m of models) {
      expect(Array.isArray(m.domains), `${m.name} domains must be array`).toBe(true);
      expect(Array.isArray(m.countries), `${m.name} countries must be array`).toBe(true);
      if (m.domains.length === 0) emptyDomains++;
    }
    // Upstream data may have rare entries without domain tags; allow up to 1%
    expect(
      emptyDomains / models.length,
      `More than 1% of models (${emptyDomains}/${models.length}) have empty domains`,
    ).toBeLessThanOrEqual(0.01);
  });

  it("every model frontier is boolean and openWeights is boolean|null", () => {
    const { models } = readSnapshot();
    for (const m of models) {
      expect(typeof m.frontier, `${m.name} frontier must be boolean`).toBe("boolean");
      const validOW =
        m.openWeights === true || m.openWeights === false || m.openWeights === null;
      expect(validOW, `${m.name} openWeights must be boolean or null`).toBe(true);
    }
  });

  it("models are sorted ascending by date (lexicographic YYYY-MM-DD)", () => {
    const { models } = readSnapshot();
    for (let i = 1; i < models.length; i++) {
      expect(
        models[i].date >= models[i - 1].date,
        `models[${i}].date=${models[i].date} should be >= models[${i - 1}].date=${models[i - 1].date}`,
      ).toBe(true);
    }
  });
});

// ── Doubling-time sanity ───────────────────────────────────────────────────────

describe("doubling-time sanity — computeTrend regressions", () => {
  it("modernEra has positive finite doublingTimeMonths in sane band and valid regression params", () => {
    const { aggregates } = readSnapshot();
    const me = aggregates.computeTrend.modernEra;
    if (me === null) throw new Error("modernEra regression is null — dataset too small?");

    expect(Number.isFinite(me.slopeLog10PerYear), "modernEra slopeLog10PerYear finite").toBe(true);
    expect(me.slopeLog10PerYear, "modernEra slope > 0").toBeGreaterThan(0);
    expect(Number.isFinite(me.intercept), "modernEra intercept finite").toBe(true);
    expect(me.r2, "modernEra r2 >= 0").toBeGreaterThanOrEqual(0);
    expect(me.r2, "modernEra r2 <= 1").toBeLessThanOrEqual(1);
    expect(me.n, "modernEra n > 0").toBeGreaterThan(0);
    expect(me.doublingTimeMonths, "modernEra doublingTimeMonths not null").not.toBeNull();
    const dt = me.doublingTimeMonths as number;
    expect(Number.isFinite(dt), "modernEra doublingTimeMonths finite").toBe(true);
    expect(dt, "modernEra doublingTimeMonths > 0").toBeGreaterThan(0);
    expect(dt, "modernEra doublingTimeMonths < 60 months").toBeLessThan(60);
  });

  it("overall regression has positive slope, valid r2, and positive doublingTimeMonths", () => {
    const { aggregates } = readSnapshot();
    const ov = aggregates.computeTrend.overall;
    if (ov === null) throw new Error("overall regression is null — dataset too small?");

    expect(Number.isFinite(ov.slopeLog10PerYear), "overall slope finite").toBe(true);
    expect(ov.slopeLog10PerYear, "overall slope > 0").toBeGreaterThan(0);
    expect(Number.isFinite(ov.intercept), "overall intercept finite").toBe(true);
    expect(ov.r2, "overall r2 >= 0").toBeGreaterThanOrEqual(0);
    expect(ov.r2, "overall r2 <= 1").toBeLessThanOrEqual(1);
    expect(ov.n, "overall n > 0").toBeGreaterThan(0);
    const dt = ov.doublingTimeMonths as number;
    expect(Number.isFinite(dt), "overall doublingTimeMonths finite").toBe(true);
    expect(dt, "overall doublingTimeMonths > 0").toBeGreaterThan(0);
  });
});

// ── Leaderboard cleanliness ────────────────────────────────────────────────────

describe("leaderboard cleanliness — regression guards", () => {
  it("every countryLeaderboard entry has a non-empty countryShort with no comma", () => {
    const { aggregates } = readSnapshot();
    for (const entry of aggregates.countryLeaderboard) {
      expect(
        entry.countryShort.trim().length,
        `country ${entry.country} must have non-empty countryShort`,
      ).toBeGreaterThan(0);
      expect(
        entry.countryShort.includes(","),
        `countryShort "${entry.countryShort}" must not contain a comma (duplicate-token bug)`,
      ).toBe(false);
    }
  });

  it("no two countryLeaderboard entries share the same countryShort", () => {
    const { aggregates } = readSnapshot();
    const shorts = aggregates.countryLeaderboard.map((e) => e.countryShort);
    const unique = new Set(shorts);
    expect(unique.size, "all countryShort values should be distinct").toBe(shorts.length);
  });

  it("orgLeaderboard has no blank/empty and no 'Unknown' organizations", () => {
    const { aggregates } = readSnapshot();
    for (const entry of aggregates.orgLeaderboard) {
      expect(
        entry.organization.trim().length,
        "orgLeaderboard entry must have non-empty organization",
      ).toBeGreaterThan(0);
      expect(
        entry.organization,
        "orgLeaderboard must not contain 'Unknown' organization",
      ).not.toBe("Unknown");
    }
  });

  it("every leaderboard entry has non-negative integer counts with frontierCount <= modelCount", () => {
    const { aggregates } = readSnapshot();
    const entries = [
      ...aggregates.orgLeaderboard,
      ...aggregates.countryLeaderboard,
    ];
    for (const entry of entries) {
      expect(
        Number.isInteger(entry.modelCount) && entry.modelCount >= 0,
        `modelCount ${entry.modelCount} must be non-negative integer`,
      ).toBe(true);
      expect(
        Number.isInteger(entry.frontierCount) && entry.frontierCount >= 0,
        `frontierCount ${entry.frontierCount} must be non-negative integer`,
      ).toBe(true);
      expect(
        entry.frontierCount <= entry.modelCount,
        `frontierCount (${entry.frontierCount}) must be <= modelCount (${entry.modelCount})`,
      ).toBe(true);
    }
  });
});

// ── Aggregate consistency ──────────────────────────────────────────────────────

describe("aggregate consistency", () => {
  it("accessibilityMix sums exactly to getComputeModels().length", () => {
    const { accessibilityMix } = getAIFrontierData().aggregates;
    const total =
      accessibilityMix.openWeights + accessibilityMix.closed + accessibilityMix.unknown;
    expect(total).toBe(getComputeModels().length);
  });

  it("costTrend years are strictly ascending", () => {
    const costTrend = getAIFrontierData().aggregates.costTrend;
    for (let i = 1; i < costTrend.length; i++) {
      expect(
        costTrend[i].year,
        `costTrend[${i}].year should be > costTrend[${i - 1}].year`,
      ).toBeGreaterThan(costTrend[i - 1].year);
    }
  });

  it("powerTrend years are strictly ascending", () => {
    const powerTrend = getAIFrontierData().aggregates.powerTrend;
    for (let i = 1; i < powerTrend.length; i++) {
      expect(
        powerTrend[i].year,
        `powerTrend[${i}].year should be > powerTrend[${i - 1}].year`,
      ).toBeGreaterThan(powerTrend[i - 1].year);
    }
  });

  it("frontierByYear years are ascending and each computeFlop > 0", () => {
    const frontierByYear = getAIFrontierData().aggregates.computeTrend.frontierByYear;
    expect(frontierByYear.length).toBeGreaterThan(0);
    for (let i = 1; i < frontierByYear.length; i++) {
      expect(
        frontierByYear[i].year,
        `frontierByYear[${i}].year should be >= frontierByYear[${i - 1}].year`,
      ).toBeGreaterThanOrEqual(frontierByYear[i - 1].year);
    }
    for (const point of frontierByYear) {
      expect(point.computeFlop, `frontierByYear computeFlop must be > 0`).toBeGreaterThan(0);
    }
  });
});

// ── Selectors ─────────────────────────────────────────────────────────────────

describe("selectors", () => {
  it("getOrgLeaderboard(5) returns at most 5 entries", () => {
    expect(getOrgLeaderboard(5).length).toBeLessThanOrEqual(5);
  });

  it("getAIFrontierData().source.license is 'CC BY 4.0'", () => {
    expect(getAIFrontierData().source.license).toBe("CC BY 4.0");
  });

  it("formatFlop(5e26) returns a non-empty string", () => {
    const result = formatFlop(5e26);
    expect(typeof result).toBe("string");
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it("getModernEraRegression() returns finite slope and intercept", () => {
    const reg = getModernEraRegression();
    if (reg === null) throw new Error("getModernEraRegression() must not return null");
    expect(Number.isFinite(reg.slopeLog10PerYear)).toBe(true);
    expect(Number.isFinite(reg.intercept)).toBe(true);
  });

  it("getCountryLeaderboard() returns at least one entry", () => {
    const result = getCountryLeaderboard();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ── Non-advisory framing ───────────────────────────────────────────────────────

describe("non-advisory framing", () => {
  it("caveats[] is non-empty", () => {
    const { caveats } = readSnapshot();
    expect(Array.isArray(caveats)).toBe(true);
    expect(caveats.length).toBeGreaterThan(0);
  });

  it("caveats or methodology notes include descriptive/estimate language (not forecast claims)", () => {
    const snap = readSnapshot();
    const allText = [
      ...snap.caveats,
      snap.methodology.notes,
      snap.source.caveat,
    ].join(" ").toLowerCase();
    expect(allText).toMatch(
      /descriptive|estimate|historical|not a forecast|not forecast|not intended as/,
    );
  });
});
