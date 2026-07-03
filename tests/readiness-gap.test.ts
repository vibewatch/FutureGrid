import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getReadinessGapData, type ReadinessGapCountry } from "@/lib/readiness-gap";

const HELPER_PATH = path.join(process.cwd(), "lib/readiness-gap.ts");
const VALID_QUADRANTS = new Set([
  "adoption-outpacing-readiness",
  "latent-capacity",
  "balanced-leader",
  "balanced-watchlist",
]);

function expectDescending(values: number[], label: string) {
  for (let index = 1; index < values.length; index++) {
    expect(values[index], `${label} should be descending at index ${index}`).toBeLessThanOrEqual(
      values[index - 1],
    );
  }
}

function expectAscending(values: number[], label: string) {
  for (let index = 1; index < values.length; index++) {
    expect(values[index], `${label} should be ascending at index ${index}`).toBeGreaterThanOrEqual(
      values[index - 1],
    );
  }
}

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectStrings);
  return [];
}

describe("getReadinessGapData", () => {
  const data = getReadinessGapData();

  it("covers more than 100 rankable countries from existing global metrics", () => {
    expect(data.summary.totalCountries).toBeGreaterThanOrEqual(data.summary.rankableCountries);
    expect(data.summary.rankableCountries).toBe(data.countries.length);
    expect(data.summary.rankableCountries).toBeGreaterThan(100);
    expect(data.summary.coveragePct).toBeGreaterThan(50);
  });

  it("returns finite bounded scores for rankable countries", () => {
    for (const country of data.countries) {
      expect(country.iso3).toMatch(/^[A-Z]{3}$/);
      expect(country.name.length).toBeGreaterThan(0);
      expect(country.diffusionPct).toBeGreaterThanOrEqual(0);
      expect(country.diffusionPct).toBeLessThanOrEqual(100);
      expect(country.aiReadiness).toBeGreaterThanOrEqual(0);
      expect(country.aiReadiness).toBeLessThanOrEqual(1);
      expect(country.readinessScore).toBeCloseTo(country.aiReadiness * 100, 2);
      expect(country.readinessScore).toBeGreaterThanOrEqual(0);
      expect(country.readinessScore).toBeLessThanOrEqual(100);
      expect(country.adoptionPercentile).toBeGreaterThanOrEqual(0);
      expect(country.adoptionPercentile).toBeLessThanOrEqual(100);
      expect(country.readinessPercentile).toBeGreaterThanOrEqual(0);
      expect(country.readinessPercentile).toBeLessThanOrEqual(100);
      expect(country.gap).toBeGreaterThanOrEqual(-100);
      expect(country.gap).toBeLessThanOrEqual(100);
      expect(VALID_QUADRANTS.has(country.quadrant)).toBe(true);
      if (country.diffusionDelta !== null) {
        expect(Number.isFinite(country.diffusionDelta)).toBe(true);
      }
    }
  });

  it("computes gap as adoption percentile minus readiness percentile", () => {
    for (const country of data.countries) {
      expect(country.gap).toBeCloseTo(country.adoptionPercentile - country.readinessPercentile, 2);
    }
  });

  it("sorts spotlight lists by their gap lens", () => {
    expect(data.adoptionOutpacingReadiness.length).toBeGreaterThan(0);
    expect(data.latentCapacity.length).toBeGreaterThan(0);
    expect(data.balancedLeaders.length).toBeGreaterThan(0);

    expect(data.adoptionOutpacingReadiness.every((country) => country.gap >= 15)).toBe(true);
    expect(data.latentCapacity.every((country) => country.gap <= -15)).toBe(true);
    expect(
      data.balancedLeaders.every(
        (country) => country.adoptionPercentile >= 66 && country.readinessPercentile >= 66,
      ),
    ).toBe(true);

    expectDescending(
      data.adoptionOutpacingReadiness.map((country) => country.gap),
      "adoption-outpacing readiness gaps",
    );
    expectAscending(
      data.latentCapacity.map((country) => country.gap),
      "latent capacity readiness gaps",
    );
    expectDescending(
      data.balancedLeaders.map(leaderScore),
      "balanced leader combined percentiles",
    );
  });

  it("does not expose or score with the Claude usage index", () => {
    const helperSource = readFileSync(HELPER_PATH, "utf8");

    expect(helperSource).not.toMatch(/\.usageIndex\b/);
    for (const country of data.countries) {
      expect(Object.hasOwn(country, "usageIndex")).toBe(false);
    }
  });

  it("uses safe descriptive methodology wording", () => {
    const wording = collectStrings(data.methodology).join(" ");

    expect(wording).toMatch(/Microsoft/i);
    expect(wording).toMatch(/IMF/i);
    expect(wording).toMatch(/percentile/i);
    expect(wording).toMatch(/not average/i);
    expect(wording).toMatch(/regressions/i);
    expect(wording).toMatch(/forecast/i);
    expect(wording).toMatch(/descriptive/i);
  });
});

function leaderScore(country: ReadinessGapCountry): number {
  return country.adoptionPercentile + country.readinessPercentile;
}
