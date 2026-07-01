import { describe, it, expect } from "vitest";
import {
  getAISignalData,
  getDisruptionIndex,
  getEmploymentForecast,
  getNationalForecast,
  linearRegression,
  pearson,
} from "@/lib/analysis";

describe("linearRegression", () => {
  it("fits a perfect positive line", () => {
    const regression = linearRegression([0, 1, 2, 3], [1, 3, 5, 7]);

    expect(regression.slope).toBeCloseTo(2);
    expect(regression.intercept).toBeCloseTo(1);
    expect(regression.r).toBeCloseTo(1);
    expect(regression.r2).toBeCloseTo(1);
    expect(regression.n).toBe(4);
  });

  it("reports negative correlation for a perfect negative line", () => {
    const regression = linearRegression([0, 1, 2, 3], [7, 5, 3, 1]);

    expect(regression.r).toBeCloseTo(-1);
  });

  it("keeps constant y input finite", () => {
    const regression = linearRegression([1, 2, 3], [5, 5, 5]);

    expect(Number.isFinite(regression.r)).toBe(true);
    expect(regression.r).toBeCloseTo(0);
    expect(regression.r2).toBeCloseTo(0);
  });
});

describe("pearson", () => {
  it("matches linearRegression.r on the same data", () => {
    const xs = [0, 1, 2, 3];
    const ys = [1, 3, 5, 7];

    expect(pearson(xs, ys)).toBeCloseTo(linearRegression(xs, ys).r);
  });

  it("is symmetric", () => {
    const xs = [1, 2, 4, 8, 16];
    const ys = [3, 5, 9, 17, 33];

    expect(pearson(xs, ys)).toBeCloseTo(pearson(ys, xs));
  });

  it("keeps constant input finite", () => {
    const correlation = pearson([5, 5, 5], [1, 2, 3]);

    expect(Number.isFinite(correlation)).toBe(true);
    expect(correlation).toBeCloseTo(0);
  });
});

describe("getAISignalData", () => {
  const signal = getAISignalData();

  it("returns a large signal point set", () => {
    expect(signal.points.length).toBeGreaterThan(700);
  });

  it("keeps point metrics in valid numeric ranges", () => {
    for (const point of signal.points) {
      expect(point.exposure).toBeGreaterThanOrEqual(0);
      expect(point.exposure).toBeLessThanOrEqual(100);
      expect(Number.isFinite(point.empGrowth)).toBe(true);
      expect(Number.isFinite(point.wageGrowth)).toBe(true);
    }
  });

  it("reports expected broad correlation directions", () => {
    expect(signal.empRegression.r).toBeGreaterThanOrEqual(-0.05);
    expect(signal.empRegression.r).toBeLessThanOrEqual(0.1);
    expect(signal.wageRegression.r).toBeLessThan(-0.1);
    expect(signal.wageRegression.r).toBeGreaterThan(-0.4);
  });

  it("includes employment and wage quartile stats", () => {
    expect(signal.quartiles).toHaveLength(2);
    expect(signal.quartiles.map((quartile) => quartile.metric)).toEqual(["employment", "wage"]);
  });
});

describe("getEmploymentForecast", () => {
  it("forecasts Chief Executives from history through 2030", () => {
    const forecast = getEmploymentForecast("11-1011");
    expect(forecast).not.toBeNull();
    if (!forecast) throw new Error("Expected Chief Executives forecast");

    expect(forecast.exposure).toBeGreaterThan(0);
    expect(forecast.exposure).toBeLessThanOrEqual(100);
    expect(forecast.history.length).toBeGreaterThan(0);
    for (const point of forecast.history) {
      expect(point.projected).toBe(false);
    }

    expect(forecast.baseline.map((point) => point.year)).toEqual([2026, 2027, 2028, 2029, 2030]);
    expect(forecast.aiAdjusted.map((point) => point.year)).toEqual([2026, 2027, 2028, 2029, 2030]);

    for (let index = 0; index < forecast.baseline.length; index += 1) {
      const baseline = forecast.baseline[index];
      const aiAdjusted = forecast.aiAdjusted[index];

      expect(baseline.projected).toBe(true);
      expect(aiAdjusted.projected).toBe(true);
      expect(Number.isFinite(baseline.value)).toBe(true);
      expect(Number.isFinite(aiAdjusted.value)).toBe(true);
      expect(baseline.value).toBeGreaterThan(0);
      expect(aiAdjusted.value).toBeGreaterThan(0);
      expect(aiAdjusted.value).toBeLessThanOrEqual(baseline.value);
    }

    const latestHistory = forecast.history[forecast.history.length - 1];
    const baseline2030 = forecast.baseline.find((point) => point.year === 2030);
    expect(baseline2030).toBeDefined();
    expect(baseline2030!.value).toBeLessThan(latestHistory.value * 3);
  });

  it("returns null for an unknown occupation code", () => {
    expect(getEmploymentForecast("00-0000")).toBeNull();
  });
});

describe("getNationalForecast", () => {
  it("summarizes positive baseline and AI-adjusted 2030 totals", () => {
    const forecast = getNationalForecast();

    expect(forecast.totalBaseline2030).toBeGreaterThan(0);
    expect(forecast.totalAiAdjusted2030).toBeGreaterThan(0);
  });

  it("computes 2030 job delta from AI-adjusted minus baseline totals", () => {
    const forecast = getNationalForecast();

    expect(forecast.deltaJobs2030).toBeLessThanOrEqual(0);
    expect(forecast.deltaJobs2030).toBeCloseTo(
      forecast.totalAiAdjusted2030 - forecast.totalBaseline2030,
    );
  });
});

describe("getDisruptionIndex", () => {
  const index = getDisruptionIndex();

  it("returns sorted occupation scores with sequential ranks", () => {
    for (let i = 0; i < index.occupations.length; i += 1) {
      const occupation = index.occupations[i];

      expect(occupation.score).toBeGreaterThanOrEqual(0);
      expect(occupation.score).toBeLessThanOrEqual(100);
      expect(occupation.rank).toBe(i + 1);
      if (i > 0) {
        expect(occupation.score).toBeLessThanOrEqual(index.occupations[i - 1].score);
        expect(occupation.rank).toBeGreaterThan(index.occupations[i - 1].rank);
      }
    }
  });

  it("returns sorted sector scores with occupation counts", () => {
    for (let i = 0; i < index.sectors.length; i += 1) {
      const sector = index.sectors[i];

      expect(sector.score).toBeGreaterThanOrEqual(0);
      expect(sector.score).toBeLessThanOrEqual(100);
      expect(sector.occupationCount).toBeGreaterThan(0);
      if (i > 0) {
        expect(sector.score).toBeLessThanOrEqual(index.sectors[i - 1].score);
      }
    }
  });

  it("defines positive weights that sum to one", () => {
    const weights = Object.values(index.weights);

    for (const weight of weights) {
      expect(weight).toBeGreaterThan(0);
    }
    expect(weights.reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1);
  });
});
