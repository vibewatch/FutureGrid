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
  sourceStatus?: string;
  sourceType?: string;
  sourceUrls?: string[];
  adapter?: string | null;
  notes?: string | null;
  parserConfidence?: number | null;
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
  sourceType?: string;
  sourceUrls?: string[];
  adapter?: string | null;
  recordsIncluded?: boolean;
  notices?: number;
  dateRange?: WarnDateRange | null;
  buildStatus?: string;
  name?: string | null;
  publisher?: string | null;
  url?: string | null;
  notes?: string | null;
  error?: string | null;
  parserConfidence?: number | null;
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
  // WI requires GOOGLE_SHEETS_API_KEY; skipped in builds without that credential
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
const MACHINE_READABLE_STATUSES = new Set(["live", "machine-readable", "current-machine-readable"]);
const NON_MACHINE_READABLE_STATUSES = new Set(["manual-only", "pdf-only", "unavailable"]);
const VALID_SOURCE_TYPES = new Set(["api", "csv", "html", "json", "none", "pdf", "xls", "xlsx", "xml"]);
const MAX_NOTICES_PER_STATE = 2_500;
const MIN_WARN_NOTICE_DATE = "2010-01-01";
// Upper bound: current_year + 2 (WARN horizon documented in issue #116)
const MAX_WARN_EFFECTIVE_DATE = `${new Date().getUTCFullYear() + 2}-12-31`;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;
const TIMESTAMPED_VA_CSV_URL = /virginiaworks\.gov\/warn_notices_\d+\.csv(?:$|[?#])/i;

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
  return status && MACHINE_READABLE_STATUSES.has(status) ? "machine-readable" : status;
}

function sourceStatus(source: WarnSource): string | null {
  const status = normalizeStatus(source.sourceStatus);
  return status && MACHINE_READABLE_STATUSES.has(status) ? "machine-readable" : status;
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

function expectAbsoluteUrl(value: unknown, label: string): void {
  expectTrimmedString(value, label);
  if (typeof value !== "string") return;
  expect(() => new URL(value), `${label} should be an absolute URL`).not.toThrow();
}

function expectSourceUrls(value: unknown, label: string, required = false): string[] {
  if (value == null) {
    expect(required, `${label} should be present`).toBe(false);
    return [];
  }

  expect(Array.isArray(value), `${label} should be an array`).toBe(true);
  if (!Array.isArray(value)) return [];
  if (required) expect(value.length, `${label} should include at least one URL`).toBeGreaterThan(0);

  const urls: string[] = [];
  for (const [index, url] of value.entries()) {
    expectAbsoluteUrl(url, `${label}[${index}]`);
    if (typeof url === "string") urls.push(url);
  }
  expect(new Set(urls).size, `${label} should not contain duplicate URLs`).toBe(urls.length);
  return urls;
}

function expectSourceType(value: unknown, label: string, required = false): string | null {
  if (value == null) {
    expect(required, `${label} should be present`).toBe(false);
    return null;
  }

  expectTrimmedString(value, label);
  if (typeof value !== "string") return null;
  const type = normalizeStatus(value);
  expect(VALID_SOURCE_TYPES.has(type ?? ""), `${label} should be a known source type`).toBe(true);
  return type;
}

function expectParserConfidence(value: unknown, label: string): void {
  if (value == null) return;
  expect(typeof value, `${label} should be numeric when present`).toBe("number");
  if (typeof value !== "number") return;
  expect(Number.isFinite(value), `${label} should be finite`).toBe(true);
  expect(value, `${label} should be >= 0`).toBeGreaterThanOrEqual(0);
  expect(value, `${label} should be <= 1`).toBeLessThanOrEqual(1);
}

function expectPlausibleWarnDate(value: string, label: string): void {
  expect(value, label).toMatch(ISO_DATE);
  expect(value >= MIN_WARN_NOTICE_DATE, `${label} should not predate ${MIN_WARN_NOTICE_DATE}`).toBe(true);
  expect(value <= MAX_WARN_EFFECTIVE_DATE, `${label} should not exceed ${MAX_WARN_EFFECTIVE_DATE} (current_year + 2 horizon)`).toBe(true);
}

function expectPositiveInteger(value: number, label: string): void {
  expect(Number.isInteger(value), `${label} should be an integer`).toBe(true);
  expect(value, `${label} should be positive`).toBeGreaterThan(0);
}

function expectValidDateRange(range: WarnDateRange, label: string): void {
  if (range.earliest !== null) expectPlausibleWarnDate(range.earliest, `${label}.earliest`);
  if (range.latest !== null) expectPlausibleWarnDate(range.latest, `${label}.latest`);
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
      expectAbsoluteUrl(source.url, `${source.state}.url`);

      expect(sourceStatus(source), `${source.state}.sourceStatus should identify a parsed/live feed`).toBe(
        "machine-readable",
      );
      const type = expectSourceType(source.sourceType, `${source.state}.sourceType`, true);
      expect(type, `${source.state}.sourceType should not be none for parsed sources`).not.toBe("none");
      const urls = expectSourceUrls(source.sourceUrls, `${source.state}.sourceUrls`, true);
      expect(urls, `${source.state}.sourceUrls should include source.url`).toContain(source.url);
      expectTrimmedString(source.adapter, `${source.state}.adapter`);
      expectOptionalTrimmedString(source.notes, `${source.state}.notes`);
      expectParserConfidence(source.parserConfidence, `${source.state}.parserConfidence`);
    }
  });

  it("does not claim hard-coded timestamped Virginia CSV URLs as fetched provenance", () => {
    const registry = coverageRegistry();
    const vaSource = warnData.sources.find((source) => source.state === "VA");
    const vaCoverage = registry?.find((entry) => entry.state === "VA");
    const urls: string[] = [];

    expect(vaSource, "VA source metadata should be present").toBeDefined();
    expect(vaCoverage, "VA coverage metadata should be present").toBeDefined();

    if (vaSource) {
      urls.push(vaSource.url, ...expectSourceUrls(vaSource.sourceUrls, "VA.source.sourceUrls", true));
    }
    if (vaCoverage) {
      if (vaCoverage.url) urls.push(vaCoverage.url);
      urls.push(...expectSourceUrls(vaCoverage.sourceUrls, "VA.coverage.sourceUrls", true));
    }

    expect(urls.length, "VA provenance should include source URLs").toBeGreaterThan(0);
    for (const url of urls) {
      expect(url, "VA source metadata should not hard-code timestamped warn_notices_*.csv URLs").not.toMatch(
        TIMESTAMPED_VA_CSV_URL,
      );
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
      if (entry.recordsIncluded !== undefined) {
        expect(entry.recordsIncluded, `${entry.state} should not mark records included`).toBe(false);
      }
      if (entry.notices !== undefined) expect(entry.notices, `${entry.state} should report zero notices`).toBe(0);
      expect(entry.adapter ?? null, `${entry.state} should not declare a parsed adapter`).toBeNull();
    }
  });

  it("ties parsed coverage states to live source metadata and real records", () => {
    const registry = coverageRegistry();
    expect(registry, "WARN coverage registry should be available").not.toBeNull();
    if (!registry) return;

    const coverageByState = new Map(registry.map((entry) => [entry.state, entry]));
    const sourceByState = new Map(warnData.sources.map((source) => [source.state, source]));
    const noticeCounts = new Map<string, number>();
    const summaryByState = new Map(warnData.summary.byState.map((state) => [state.state, state]));

    for (const notice of warnData.notices) {
      noticeCounts.set(notice.state, (noticeCounts.get(notice.state) ?? 0) + 1);
    }

    for (const entry of registry) {
      const status = coverageStatus(entry);
      // recordsIncluded:false marks credential-skipped sources (e.g. WI/GOOGLE_SHEETS_API_KEY)
      // that report sourceStatus:"live" but produced no records in this build
      const parsed = status === "machine-readable" && entry.recordsIncluded !== false;
      const source = sourceByState.get(entry.state);
      const noticesForState = noticeCounts.get(entry.state) ?? 0;
      const sourceType = expectSourceType(entry.sourceType, `${entry.state}.coverage.sourceType`, parsed);
      const coverageUrls = expectSourceUrls(entry.sourceUrls, `${entry.state}.coverage.sourceUrls`, parsed);

      expectOptionalTrimmedString(entry.name, `${entry.state}.coverage.name`);
      expectOptionalTrimmedString(entry.publisher, `${entry.state}.coverage.publisher`);
      expectOptionalTrimmedString(entry.notes, `${entry.state}.coverage.notes`);
      expectOptionalTrimmedString(entry.error, `${entry.state}.coverage.error`);
      if (entry.url != null) expectAbsoluteUrl(entry.url, `${entry.state}.coverage.url`);
      if (entry.buildStatus != null) expectTrimmedString(entry.buildStatus, `${entry.state}.coverage.buildStatus`);
      expectParserConfidence(entry.parserConfidence, `${entry.state}.coverage.parserConfidence`);

      if (parsed) {
        expect(source, `${entry.state} parsed coverage should have source metadata`).toBeDefined();
        expect(sourceType, `${entry.state} parsed coverage should not use sourceType=none`).not.toBe("none");
        expectTrimmedString(entry.adapter, `${entry.state}.coverage.adapter`);
        expect(entry.recordsIncluded, `${entry.state} parsed coverage should include records`).toBe(true);
        expect(entry.notices ?? noticesForState, `${entry.state} parsed coverage should report notices`).toBeGreaterThan(0);
        expect(noticesForState, `${entry.state} parsed coverage should have real notice rows`).toBeGreaterThan(0);
        expect(summaryByState.has(entry.state), `${entry.state} parsed coverage should have a summary row`).toBe(true);
        expect(entry.dateRange, `${entry.state} parsed coverage should expose a date range`).not.toBeNull();
        if (entry.dateRange) expectValidDateRange(entry.dateRange, `${entry.state}.coverage.dateRange`);

        if (source) {
          const sourceTypeFromSource = expectSourceType(source.sourceType, `${entry.state}.source.sourceType`, true);
          expect(sourceStatus(source), `${entry.state}.sourceStatus should align with coverage`).toBe("machine-readable");
          expect(sourceTypeFromSource, `${entry.state}.sourceType should align with coverage`).toBe(sourceType);
          expect(source.adapter, `${entry.state}.adapter should align with coverage`).toBe(entry.adapter);
          for (const url of expectSourceUrls(source.sourceUrls, `${entry.state}.source.sourceUrls`, true)) {
            expect(coverageUrls, `${entry.state}.coverage.sourceUrls should include source URL ${url}`).toContain(url);
          }
        }

        if (sourceType === "html" || sourceType === "pdf") {
          expectTrimmedString(entry.adapter, `${entry.state} parsed ${sourceType} coverage should name its adapter`);
          expect(coverageUrls.length, `${entry.state} parsed ${sourceType} coverage should keep source URLs`).toBeGreaterThan(0);
        }
      } else if (status && NON_MACHINE_READABLE_STATUSES.has(status)) {
        expect(source, `${entry.state} non-parsed coverage should not be listed as a source`).toBeUndefined();
        expect(noticesForState, `${entry.state} non-parsed coverage should not have notices`).toBe(0);
        expect(summaryByState.has(entry.state), `${entry.state} non-parsed coverage should not have summary rows`).toBe(false);
        expect(entry.recordsIncluded, `${entry.state} non-parsed coverage should not include records`).toBe(false);
        expect(entry.notices ?? 0, `${entry.state} non-parsed coverage should report zero notices`).toBe(0);
        expect(entry.adapter ?? null, `${entry.state} non-parsed coverage should not declare an adapter`).toBeNull();
        expect(entry.dateRange ?? null, `${entry.state} non-parsed coverage should not expose a fake date range`).toBeNull();
      }
    }

    for (const source of warnData.sources) {
      const entry = coverageByState.get(source.state);
      expect(entry, `${source.state} source should have coverage metadata`).toBeDefined();
      expect(entry ? coverageStatus(entry) : null, `${source.state} source should be parsed/live in coverage`).toBe(
        "machine-readable",
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
      const noticeLabel = `notices[${index}] ${notice.state}`;
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
        expectPlausibleWarnDate(notice.noticeDate, `${noticeLabel}.noticeDate`);
        if (previousNoticeDate !== null) {
          expect(
            previousNoticeDate >= notice.noticeDate,
            `notices should be sorted descending at index ${index}`,
          ).toBe(true);
        }
      } else if (previousNoticeDate !== null) {
        previousNoticeDate = null;
      }
      if (notice.effectiveDate !== null) {
        expectPlausibleWarnDate(notice.effectiveDate, `${noticeLabel}.effectiveDate`);
      }

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
