/**
 * tests/ai-usage-proxies-data360.test.ts
 *
 * Focused regression tests for the World Bank Data360 OECD_AI pagination fix.
 *
 * Root cause (run 29305255883):
 *   Node.js native fetch (HTTP/2) returns HTTP 417 Expectation Failed from
 *   data360api.worldbank.org for requests with skip >= 3000.  The node:https
 *   HTTP/1.1 fallback (family 4) returns 200 OK with the remaining 421 records.
 *
 * These tests exercise:
 *   1. needsHttpsFallback() — ensures data360api.worldbank.org is in the fallback
 *      registry and will route through node:https on the last retry.
 *   2. processData360Rows() — ensures deduplication, latest-period selection,
 *      filtering, and sorting are correct for all page-count scenarios.
 */

import { describe, expect, it } from "vitest";
import { needsHttpsFallback, processData360Rows } from "../scripts/lib/data360.mjs";

// ─── needsHttpsFallback ───────────────────────────────────────────────────────

describe("needsHttpsFallback", () => {
  it("returns true for data360api.worldbank.org — the 417 regression fix", () => {
    expect(needsHttpsFallback("https://data360api.worldbank.org/data360/data?DATABASE_ID=OECD_AI")).toBe(true);
    expect(needsHttpsFallback("https://data360api.worldbank.org/data360/data?DATABASE_ID=OECD_AI&skip=3000")).toBe(true);
  });

  it("returns true for the pre-existing Census and OECD SDMX prefixes", () => {
    expect(needsHttpsFallback("https://api.census.gov/data/2018/abstcb?get=NAME")).toBe(true);
    expect(needsHttpsFallback("https://sdmx.oecd.org/public/rest/data/OECD.STI.DEP")).toBe(true);
  });

  it("returns false for other domains", () => {
    expect(needsHttpsFallback("https://ec.europa.eu/eurostat/api/dissemination/")).toBe(false);
    expect(needsHttpsFallback("https://raw.githubusercontent.com/rfordatascience/")).toBe(false);
    expect(needsHttpsFallback("https://api.github.com/repos/")).toBe(false);
    expect(needsHttpsFallback("https://data360.worldbank.org/en/dataset/OECD_AI")).toBe(false);
    expect(needsHttpsFallback("https://huggingface.co/api/models")).toBe(false);
  });

  it("is prefix-based: rejects a URL that is merely a superset of a covered host", () => {
    expect(needsHttpsFallback("https://not-api.census.gov/")).toBe(false);
    expect(needsHttpsFallback("https://data360api.worldbank.org.evil.example.com/")).toBe(false);
  });
});

// ─── processData360Rows ───────────────────────────────────────────────────────

const makeRow = (ref: string, period: string, value: string, indicator = "OECD_AI_PUBS_TOT") => ({
  INDICATOR: indicator,
  REF_AREA: ref,
  TIME_PERIOD: period,
  OBS_VALUE: value,
  UNIT_MEASURE: "NUMBER",
  OBS_STATUS: "A",
});

describe("processData360Rows", () => {
  it("returns an empty array for empty input", () => {
    expect(processData360Rows([])).toEqual([]);
  });

  it("returns an empty array when no rows have OECD_AI_PUBS_TOT indicator", () => {
    const rows = [makeRow("USA", "2024", "100", "OTHER_INDICATOR")];
    expect(processData360Rows(rows)).toEqual([]);
  });

  it("filters out rows missing REF_AREA", () => {
    const rows = [{ INDICATOR: "OECD_AI_PUBS_TOT", REF_AREA: "", TIME_PERIOD: "2024", OBS_VALUE: "100" }];
    expect(processData360Rows(rows)).toEqual([]);
  });

  it("filters out rows missing TIME_PERIOD", () => {
    const rows = [{ INDICATOR: "OECD_AI_PUBS_TOT", REF_AREA: "USA", TIME_PERIOD: "", OBS_VALUE: "100" }];
    expect(processData360Rows(rows)).toEqual([]);
  });

  it("filters out non-finite OBS_VALUE", () => {
    const rows = [makeRow("USA", "2024", "NaN"), makeRow("DEU", "2024", "N/A")];
    expect(processData360Rows(rows)).toEqual([]);
  });

  it("produces one entry per country", () => {
    const rows = [
      makeRow("USA", "2023", "500"),
      makeRow("USA", "2024", "600"),
      makeRow("CHN", "2024", "900"),
    ];
    const result = processData360Rows(rows);
    const codes = result.map((r) => r.geo.code);
    expect(codes).not.toContain(codes.filter((c, i) => codes.indexOf(c) !== i)[0]);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("selects the latest TIME_PERIOD when a country appears across multiple pages/rows", () => {
    // Simulates the page-4 scenario: pages 1-3 have 2023 data, page 4 has 2022 data
    const rows = [
      makeRow("USA", "2025", "700"),   // latest — should win
      makeRow("USA", "2024", "600"),
      makeRow("USA", "2022", "400"),
    ];
    const result = processData360Rows(rows);
    expect(result).toHaveLength(1);
    expect(result[0].period).toBe("2025");
    expect(result[0].value).toBe(700);
  });

  it("handles older page-4 rows correctly: earlier period does not replace later", () => {
    // Real-world scenario: page 4 contains older time-series data for countries
    // already seen in pages 1-3; the pages 1-3 value should be retained.
    const rows = [
      makeRow("CIV", "2025", "10"),    // page 1-3 entry (newer)
      makeRow("CIV", "2016", "2.833"), // page 4 entry (older — must NOT replace)
    ];
    const result = processData360Rows(rows);
    expect(result).toHaveLength(1);
    expect(result[0].period).toBe("2025");
    expect(result[0].value).toBe(10);
  });

  it("sorts results descending by value", () => {
    const rows = [
      makeRow("DEU", "2024", "100"),
      makeRow("CHN", "2024", "900"),
      makeRow("USA", "2024", "500"),
    ];
    const result = processData360Rows(rows);
    const values = result.map((r) => r.value);
    expect(values).toEqual([...values].sort((a, b) => b - a));
  });

  it("uses the countryNames map for geo.name when provided", () => {
    const rows = [makeRow("USA", "2024", "500")];
    const names = new Map([["USA", "United States"]]);
    const result = processData360Rows(rows, names);
    expect(result[0].geo.name).toBe("United States");
  });

  it("falls back to iso3 code as name when country not in names map", () => {
    const rows = [makeRow("XYZ", "2024", "10")];
    const result = processData360Rows(rows, new Map());
    expect(result[0].geo.name).toBe("XYZ");
  });

  it("rounds OBS_VALUE to 3 decimal places", () => {
    const rows = [makeRow("USA", "2024", "123.456789")];
    const result = processData360Rows(rows);
    expect(result[0].value).toBe(123.457);
  });

  it("handles all 4 pages scenario: same country count as 3-page subset when page4 only adds older records", () => {
    // Reproduce the exact run-29305255883 data shape:
    // pages 1-3 provide 2025 data for N countries; page 4 provides older records for the same countries
    const pages123 = Array.from({ length: 50 }, (_, i) => makeRow(`C${i}`, "2025", String((i + 1) * 10)));
    const page4 = Array.from({ length: 20 }, (_, i) => makeRow(`C${i}`, "2016", String((i + 1) * 5)));
    const allRows = [...pages123, ...page4];
    const result = processData360Rows(allRows);
    expect(result).toHaveLength(50);
    // Every entry should have period 2025 (page4's 2016 data was ignored)
    expect(result.every((r) => r.period === "2025")).toBe(true);
  });

  it("pagination guard scenario: page4 adds new countries not seen in pages 1-3", () => {
    // If page 4 introduces genuinely new countries, they should be included
    const pages123 = [makeRow("USA", "2025", "700"), makeRow("CHN", "2025", "900")];
    const page4 = [makeRow("CIV", "2025", "3")];  // new country
    const result = processData360Rows([...pages123, ...page4]);
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.geo.code)).toContain("CIV");
  });
});
