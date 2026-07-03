import { describe, expect, it } from "vitest";

import { getEmploymentHistoryMap, getOccupationTrend } from "@/lib/snapshot";

describe("getOccupationTrend", () => {
  it("returns sorted OEWS employment and wage history for a known SOC code", () => {
    const trend = getOccupationTrend("11-1021");

    expect(trend).toEqual([
      { year: 2019, employment: 2400280, wage: 100780 },
      { year: 2020, employment: 2347420, wage: 103650 },
      { year: 2021, employment: 2984920, wage: 97970 },
      { year: 2022, employment: 3376680, wage: 98100 },
      { year: 2023, employment: 3507810, wage: 101280 },
      { year: 2025, employment: 3503020, wage: 105770 },
    ]);
  });

  it("returns an empty array for an unknown SOC code", () => {
    expect(getOccupationTrend("00-0000")).toEqual([]);
  });
});

describe("getEmploymentHistoryMap", () => {
  const historyMap = getEmploymentHistoryMap();

  it("returns a SOC-keyed employment history map for the committed snapshot", () => {
    expect(Object.keys(historyMap)).toHaveLength(756);
    expect(historyMap["11-1021"]).toEqual({
      "2019": 2400280,
      "2020": 2347420,
      "2021": 2984920,
      "2022": 3376680,
      "2023": 3507810,
      "2025": 3503020,
    });
  });

  it("only includes numeric yearly employment values", () => {
    for (const [code, history] of Object.entries(historyMap)) {
      expect(code).toMatch(/^\d{2}-\d{4}$/);
      expect(Object.keys(history).length).toBeGreaterThanOrEqual(2);
      for (const [year, value] of Object.entries(history)) {
        expect(year).toMatch(/^\d{4}$/);
        expect(typeof value).toBe("number");
        expect(value).toBeGreaterThan(0);
      }
    }
  });
});
