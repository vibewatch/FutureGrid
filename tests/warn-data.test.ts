import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const US_JURISDICTIONS = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
} as const;

type JurisdictionCode = keyof typeof US_JURISDICTIONS;

interface WarnSource {
  state: string;
  stateName: string;
  name: string;
  publisher: string;
  url: string;
  license: string;
}

interface WarnNotice {
  company: string;
  county: string | null;
  city: string | null;
  employees: number;
  noticeDate: string | null;
  effectiveDate: string | null;
  layoffType: string | null;
  state: string;
  stateName: string;
}

interface WarnDateRange {
  earliest: string | null;
  latest: string | null;
}

interface WarnStateStat {
  state: string;
  stateName: string;
  notices: number;
  employees: number;
  dateRange: WarnDateRange;
}

interface WarnSummary {
  total: number;
  totalEmployees: number;
  dateRange: WarnDateRange;
  byState: WarnStateStat[];
  byMonth: { month: string; notices: number; employees: number }[];
  byType: { type: string; notices: number; employees: number }[];
  topEmployers: { company: string; employees: number; notices: number; state: string }[];
}

interface WarnCoverageEntry {
  state: string;
  stateName: string;
  status?: string;
  availability?: string;
  access?: string;
  sourceStatus?: string;
  coverageStatus?: string;
}

interface WarnData {
  generatedAt: string;
  coverage: string;
  sources: WarnSource[];
  notices: WarnNotice[];
  summary: WarnSummary;
  coverageRegistry?: WarnCoverageEntry[];
  coverageStates?: WarnCoverageEntry[];
  stateCoverage?: WarnCoverageEntry[];
  coverageByState?: WarnCoverageEntry[];
  sourceCoverage?: WarnCoverageEntry[];
}

const RETAINED_MACHINE_READABLE_STATES = [
  "CA",
  "GA",
  "KY",
  "NJ",
  "NY",
  "OH",
  "OR",
  "TN",
  "TX",
  "WI",
] as const;
const COVERAGE_REGISTRY_KEYS = [
  "coverageRegistry",
  "coverageStates",
  "stateCoverage",
  "coverageByState",
  "sourceCoverage",
] as const;
const VALID_COVERAGE_STATUSES = new Set([
  "machine-readable",
  "manual-only",
  "pdf-only",
  "unavailable",
]);
const NON_MACHINE_READABLE_STATUSES = new Set(["manual-only", "pdf-only", "unavailable"]);
const MAX_NOTICES_PER_STATE = 2_500;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

const warnData = JSON.parse(
  readFileSync(path.join(process.cwd(), "data/warn-notices.json"), "utf8"),
) as WarnData;

function isJurisdictionCode(value: string): value is JurisdictionCode {
  return Object.prototype.hasOwnProperty.call(US_JURISDICTIONS, value);
}

function normalizeStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function coverageStatus(entry: WarnCoverageEntry): string | null {
  const status = normalizeStatus(
    entry.coverageStatus ??
      entry.sourceStatus ??
      entry.availability ??
      entry.access ??
      entry.status,
  );
  return status === "live" ? "machine-readable" : status;
}

function coverageRegistry(): WarnCoverageEntry[] | null {
  for (const key of COVERAGE_REGISTRY_KEYS) {
    const value = warnData[key];
    if (Array.isArray(value)) return value;
  }
  return null;
}

function expectTrimmedString(value: unknown, label: string): void {
  expect(typeof value, `${label} should be a string`).toBe("string");
  if (typeof value !== "string") return;
  expect(value.length, `${label} should be non-empty`).toBeGreaterThan(0);
  expect(value, `${label} should be trimmed`).toBe(value.trim());
}

function expectOptionalTrimmedString(value: unknown, label: string): void {
  if (value == null) return;
  expectTrimmedString(value, label);
}

function expectPositiveInteger(value: number, label: string): void {
  expect(Number.isInteger(value), `${label} should be an integer`).toBe(true);
  expect(value, `${label} should be positive`).toBeGreaterThan(0);
}

function expectValidDateRange(range: WarnDateRange, label: string): void {
  if (range.earliest !== null) expect(range.earliest, `${label}.earliest`).toMatch(ISO_DATE);
  if (range.latest !== null) expect(range.latest, `${label}.latest`).toMatch(ISO_DATE);
  if (range.earliest !== null && range.latest !== null) {
    expect(range.earliest <= range.latest, `${label} should be chronological`).toBe(true);
  }
}

describe("WARN data snapshot", () => {
  it("keeps the stable top-level schema", () => {
    expectTrimmedString(warnData.generatedAt, "generatedAt");
    expect(Date.parse(warnData.generatedAt), "generatedAt should parse as a date").not.toBeNaN();
    expectTrimmedString(warnData.coverage, "coverage");
    expect(Array.isArray(warnData.sources), "sources should be an array").toBe(true);
    expect(Array.isArray(warnData.notices), "notices should be an array").toBe(true);
    expect(typeof warnData.summary, "summary should be an object").toBe("object");
    expect(warnData.summary).not.toBeNull();
    expect(Array.isArray(warnData.summary.byState), "summary.byState should be an array").toBe(true);
    expect(Array.isArray(warnData.summary.byMonth), "summary.byMonth should be an array").toBe(true);
    expect(Array.isArray(warnData.summary.byType), "summary.byType should be an array").toBe(true);
    expect(Array.isArray(warnData.summary.topEmployers), "summary.topEmployers should be an array").toBe(
      true,
    );
  });

  it("keeps source metadata unique, URL-backed, and state-consistent", () => {
    const seenStates = new Set<string>();

    for (const source of warnData.sources) {
      expectTrimmedString(source.state, "source.state");
      expect(isJurisdictionCode(source.state), `${source.state} should be a U.S. state/DC code`).toBe(
        true,
      );
      expect(seenStates.has(source.state), `${source.state} should appear once in sources`).toBe(false);
      seenStates.add(source.state);

      expect(source.stateName).toBe(US_JURISDICTIONS[source.state as JurisdictionCode]);
      expectTrimmedString(source.name, `${source.state}.name`);
      expectTrimmedString(source.publisher, `${source.state}.publisher`);
      expectTrimmedString(source.license, `${source.state}.license`);
      expect(() => new URL(source.url), `${source.state}.url should be an absolute URL`).not.toThrow();
    }
  });

  it("retains the existing ten machine-readable WARN states", () => {
    const sourceStates = new Set(warnData.sources.map((source) => source.state));
    const noticeStates = new Set(warnData.notices.map((notice) => notice.state));
    const summaryStates = new Set(warnData.summary.byState.map((state) => state.state));
    const registry = coverageRegistry();

    for (const state of RETAINED_MACHINE_READABLE_STATES) {
      expect(sourceStates.has(state), `${state} source should remain present`).toBe(true);
      expect(noticeStates.has(state), `${state} notices should remain present`).toBe(true);
      expect(summaryStates.has(state), `${state} summary should remain present`).toBe(true);

      if (registry) {
        const entry = registry.find((candidate) => candidate.state === state);
        expect(entry, `${state} should be in coverage registry`).toBeDefined();
        expect(entry ? coverageStatus(entry) : null, `${state} should remain machine-readable`).toBe(
          "machine-readable",
        );
      }
    }
  });

  it("includes complete all-state plus DC coverage metadata", () => {
    const registry = coverageRegistry();
    expect(
      registry,
      `Expected all-state coverage metadata in one of: ${COVERAGE_REGISTRY_KEYS.join(", ")}`,
    ).not.toBeNull();
    if (!registry) return;

    const seenStates = new Set<string>();
    for (const entry of registry) {
      expectTrimmedString(entry.state, "coverage.state");
      expect(isJurisdictionCode(entry.state), `${entry.state} should be a U.S. state/DC code`).toBe(
        true,
      );
      expect(seenStates.has(entry.state), `${entry.state} should appear once in coverage metadata`).toBe(
        false,
      );
      seenStates.add(entry.state);

      expect(entry.stateName).toBe(US_JURISDICTIONS[entry.state as JurisdictionCode]);
      const status = coverageStatus(entry);
      expect(status, `${entry.state} should declare coverage status`).not.toBeNull();
      expect(VALID_COVERAGE_STATUSES.has(status ?? ""), `${entry.state} has invalid status`).toBe(true);
    }

    for (const state of Object.keys(US_JURISDICTIONS)) {
      expect(seenStates.has(state), `${state} missing from WARN coverage metadata`).toBe(true);
    }
  });

  it("does not create notices for manual-only, PDF-only, or unavailable states", () => {
    const registry = coverageRegistry();
    if (!registry) return;

    const noticeStates = new Set(warnData.notices.map((notice) => notice.state));
    const summaryStates = new Set(warnData.summary.byState.map((state) => state.state));

    for (const entry of registry) {
      const status = coverageStatus(entry);
      if (!status || !NON_MACHINE_READABLE_STATUSES.has(status)) continue;
      expect(noticeStates.has(entry.state), `${entry.state} should not have synthetic notices`).toBe(false);
      expect(summaryStates.has(entry.state), `${entry.state} should not have synthetic summary rows`).toBe(
        false,
      );
    }
  });

  it("keeps notices, totals, aggregates, sorting, and trimming consistent", () => {
    const sourceStates = new Set(warnData.sources.map((source) => source.state));
    const registry = coverageRegistry();
    const machineReadableStates = new Set(
      registry
        ?.filter((entry) => coverageStatus(entry) === "machine-readable")
        .map((entry) => entry.state),
    );
    const perStateTrimmedCounts = new Map<string, number>();
    let trimmedEmployeeTotal = 0;
    let previousNoticeDate: string | null = null;

    for (const [index, notice] of warnData.notices.entries()) {
      expectTrimmedString(notice.company, `notices[${index}].company`);
      expectOptionalTrimmedString(notice.county, `notices[${index}].county`);
      expectOptionalTrimmedString(notice.city, `notices[${index}].city`);
      expectOptionalTrimmedString(notice.layoffType, `notices[${index}].layoffType`);
      expectPositiveInteger(notice.employees, `notices[${index}].employees`);
      expect(sourceStates.has(notice.state), `${notice.state} should have source metadata`).toBe(true);
      expect(isJurisdictionCode(notice.state), `${notice.state} should be a U.S. state/DC code`).toBe(true);
      expect(notice.stateName).toBe(US_JURISDICTIONS[notice.state as JurisdictionCode]);
      if (registry) {
        expect(machineReadableStates.has(notice.state), `${notice.state} notices require machine-readable coverage`).toBe(
          true,
        );
      }

      if (notice.noticeDate !== null) {
        expect(notice.noticeDate).toMatch(ISO_DATE);
        if (previousNoticeDate !== null) {
          expect(
            previousNoticeDate >= notice.noticeDate,
            `notices should be sorted descending at index ${index}`,
          ).toBe(true);
        }
      } else if (previousNoticeDate !== null) {
        previousNoticeDate = null;
      }
      if (notice.effectiveDate !== null) expect(notice.effectiveDate).toMatch(ISO_DATE);

      previousNoticeDate = notice.noticeDate;
      trimmedEmployeeTotal += notice.employees;
      perStateTrimmedCounts.set(notice.state, (perStateTrimmedCounts.get(notice.state) ?? 0) + 1);
    }

    for (const [state, count] of perStateTrimmedCounts) {
      expect(count, `${state} should be trimmed to latest ${MAX_NOTICES_PER_STATE} notices`).toBeLessThanOrEqual(
        MAX_NOTICES_PER_STATE,
      );
    }

    const byStateTotal = warnData.summary.byState.reduce(
      (total, state) => ({
        notices: total.notices + state.notices,
        employees: total.employees + state.employees,
      }),
      { notices: 0, employees: 0 },
    );

    expect(warnData.summary.total).toBe(byStateTotal.notices);
    expect(warnData.summary.totalEmployees).toBe(byStateTotal.employees);
    expect(warnData.summary.total).toBeGreaterThanOrEqual(warnData.notices.length);
    expect(warnData.summary.totalEmployees).toBeGreaterThanOrEqual(trimmedEmployeeTotal);
    expectValidDateRange(warnData.summary.dateRange, "summary.dateRange");

    for (let index = 0; index < warnData.summary.byState.length; index += 1) {
      const state = warnData.summary.byState[index];
      expect(isJurisdictionCode(state.state), `${state.state} should be a U.S. state/DC code`).toBe(true);
      expect(state.stateName).toBe(US_JURISDICTIONS[state.state as JurisdictionCode]);
      expectPositiveInteger(state.notices, `summary.byState[${index}].notices`);
      expectPositiveInteger(state.employees, `summary.byState[${index}].employees`);
      expectValidDateRange(state.dateRange, `summary.byState[${index}].dateRange`);
      if (index > 0) {
        expect(state.employees).toBeLessThanOrEqual(warnData.summary.byState[index - 1].employees);
      }
    }

    for (let index = 0; index < warnData.summary.byMonth.length; index += 1) {
      const month = warnData.summary.byMonth[index];
      expect(month.month).toMatch(ISO_MONTH);
      expectPositiveInteger(month.notices, `summary.byMonth[${index}].notices`);
      expectPositiveInteger(month.employees, `summary.byMonth[${index}].employees`);
      if (index > 0) {
        expect(month.month > warnData.summary.byMonth[index - 1].month).toBe(true);
      }
    }

    for (let index = 0; index < warnData.summary.byType.length; index += 1) {
      const type = warnData.summary.byType[index];
      expectTrimmedString(type.type, `summary.byType[${index}].type`);
      expectPositiveInteger(type.notices, `summary.byType[${index}].notices`);
      expectPositiveInteger(type.employees, `summary.byType[${index}].employees`);
      if (index > 0) expect(type.employees).toBeLessThanOrEqual(warnData.summary.byType[index - 1].employees);
    }
  }, 20_000);

  it("keeps top employer entries shaped and sorted", () => {
    expect(warnData.summary.topEmployers.length).toBeGreaterThan(0);
    expect(warnData.summary.topEmployers.length).toBeLessThanOrEqual(20);

    for (let index = 0; index < warnData.summary.topEmployers.length; index += 1) {
      const employer = warnData.summary.topEmployers[index];
      expectTrimmedString(employer.company, `summary.topEmployers[${index}].company`);
      expectPositiveInteger(employer.employees, `summary.topEmployers[${index}].employees`);
      expectPositiveInteger(employer.notices, `summary.topEmployers[${index}].notices`);
      expect(isJurisdictionCode(employer.state), `${employer.state} should be a U.S. state/DC code`).toBe(
        true,
      );
      if (index > 0) {
        expect(employer.employees).toBeLessThanOrEqual(
          warnData.summary.topEmployers[index - 1].employees,
        );
      }
    }
  });
});
