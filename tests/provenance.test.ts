import { describe, expect, it } from "vitest";
import {
  asOfToComparableDate,
  selectLatestAsOf,
  getDatasetProvenance,
  getLatestAsOf,
} from "@/lib/provenance";

// ── asOfToComparableDate ───────────────────────────────────────────────────────

describe("asOfToComparableDate", () => {
  it("parses YYYY-MM-DD to UTC midnight of that date", () => {
    const d = asOfToComparableDate("2026-07-03");
    expect(d?.toISOString().slice(0, 10)).toBe("2026-07-03");
  });

  it("parses YYYY-MM to the last day of that month", () => {
    // July 2026 has 31 days
    const d = asOfToComparableDate("2026-07");
    expect(d?.toISOString().slice(0, 10)).toBe("2026-07-31");
  });

  it("parses YYYY to Dec 31 of that year", () => {
    const d = asOfToComparableDate("2025");
    expect(d?.toISOString().slice(0, 10)).toBe("2025-12-31");
  });

  it("parses FY2025 to Sep 30, 2025 (US federal FY end)", () => {
    // US federal fiscal year ends Sep 30; documented assumption.
    const d = asOfToComparableDate("FY2025");
    expect(d?.toISOString().slice(0, 10)).toBe("2025-09-30");
  });

  it("parses FY 2025 (with space) identically to FY2025", () => {
    const compact = asOfToComparableDate("FY2025");
    const spaced = asOfToComparableDate("FY 2025");
    expect(compact).not.toBeNull();
    expect(compact?.getTime()).toBe(spaced?.getTime());
  });

  it("calendar year 2025 (Dec 31) is later than FY2025 (Sep 30)", () => {
    // This is the key ordering: calendar 2025 ≥ FY2025
    const calYear = asOfToComparableDate("2025");
    const fyYear = asOfToComparableDate("FY2025");
    expect(calYear).not.toBeNull();
    expect(fyYear).not.toBeNull();
    expect(calYear!.getTime()).toBeGreaterThan(fyYear!.getTime());
  });

  it("returns null for a projection window (2024-2034): second segment 34 is not a valid month", () => {
    expect(asOfToComparableDate("2024-2034")).toBeNull();
  });

  it("returns null for free-form text that starts with a year", () => {
    expect(asOfToComparableDate("2025 ORS concepts / FutureGrid seed v1")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(asOfToComparableDate("")).toBeNull();
  });

  it("returns null for a string with only whitespace", () => {
    expect(asOfToComparableDate("   ")).toBeNull();
  });
});

// ── selectLatestAsOf ───────────────────────────────────────────────────────────

describe("selectLatestAsOf", () => {
  it("returns the chronologically latest recognized label among ISO dates", () => {
    expect(selectLatestAsOf(["2025", "2026-07-03", "2026-06-30"])).toBe("2026-07-03");
  });

  it("calendar year 2025 wins over FY2025 (Dec 31 > Sep 30)", () => {
    // The FY label has a higher lexicographic byte value but an earlier calendar end-date.
    expect(selectLatestAsOf(["FY2025", "2025"])).toBe("2025");
  });

  it("order-independent: 2025 still wins over FY2025 when listed first", () => {
    expect(selectLatestAsOf(["2025", "FY2025"])).toBe("2025");
  });

  it("projection window 2024-2034 is not treated as a date — cannot win over a recognized label", () => {
    expect(selectLatestAsOf(["2024-2034", "2025"])).toBe("2025");
  });

  it("free-form text labels do not win over recognized calendar dates", () => {
    expect(
      selectLatestAsOf(["2025 ORS concepts / FutureGrid seed v1", "2025"]),
    ).toBe("2025");
  });

  it("returns null when all inputs are null", () => {
    expect(selectLatestAsOf([null, null])).toBeNull();
  });

  it("returns the projection window as a display fallback when it is the only non-null input", () => {
    // "2024-2034" cannot be parsed as a date, but it is preserved for display
    // when no recognized calendar label is available.
    expect(selectLatestAsOf(["2024-2034"])).toBe("2024-2034");
  });

  it("returns null for an empty array", () => {
    expect(selectLatestAsOf([])).toBeNull();
  });

  it("handles mixed nulls alongside a single recognized label", () => {
    expect(selectLatestAsOf([null, "2025", null])).toBe("2025");
  });

  it("FY2025 wins when it is the only recognized candidate", () => {
    expect(selectLatestAsOf(["FY2025"])).toBe("FY2025");
  });
});

// ── Lane resolution with actual registry values ────────────────────────────────

describe("provenance lane resolution (live registry)", () => {
  it("global lane: selectLatestAsOf resolves to 2026-07-03 (openrouter-models)", () => {
    const ids = ["openrouter-models", "country-exposure", "global-ai-metrics"] as const;
    const asOfs = ids.map((id) => getDatasetProvenance(id)?.asOf ?? null);
    expect(selectLatestAsOf(asOfs)).toBe("2026-07-03");
  });

  it("talent lane: selectLatestAsOf resolves to 2025 (job-postings Dec 31 beats FY2025 Sep 30)", () => {
    const ids = ["h1b-trends", "job-postings"] as const;
    const asOfs = ids.map((id) => getDatasetProvenance(id)?.asOf ?? null);
    // FY2025 ends Sep 30 — earlier than calendar-year 2025 (Dec 31).
    expect(selectLatestAsOf(asOfs)).toBe("2025");
  });

  it("market lane: selectLatestAsOf resolves to 2026-07-02 (ai-company-stocks)", () => {
    const ids = ["ai-company-stocks", "market-ai-signals"] as const;
    const asOfs = ids.map((id) => getDatasetProvenance(id)?.asOf ?? null);
    expect(selectLatestAsOf(asOfs)).toBe("2026-07-02");
  });

  it("getLatestAsOf() returns the chronologically latest asOf across the whole registry", () => {
    const latest = getLatestAsOf();
    // Must not be an FY label — FY2025 (Sep 30, 2025) loses to any 2026-xx-xx date.
    expect(latest).not.toMatch(/^FY/i);
    // openrouter-models and sources both carry 2026-07-03 at time of writing.
    expect(latest).toBe("2026-07-03");
  });

  it("employment-projections asOf 2024-2034 does not corrupt getLatestAsOf", () => {
    // Projection windows must be skipped (null from asOfToComparableDate).
    const latest = getLatestAsOf();
    // Must not be the projection window itself
    expect(latest).not.toBe("2024-2034");
    // Must not produce a far-future year from false parsing
    expect(latest).not.toMatch(/\b2[1-9]\d{2}\b/);
  });
});
