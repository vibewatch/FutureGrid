import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { laborEn } from "@/lib/i18n/messages/en/labor";
import { laborZh } from "@/lib/i18n/messages/zh/labor";

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

const STATE_LABOR_JSON = path.join(process.cwd(), "data/state-labor.json");
const STATE_LABOR_MODULE = path.join(process.cwd(), "lib/state-labor.ts");
const WARN_NOTICES_JSON = path.join(process.cwd(), "data/warn-notices.json");
const ISO_MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const MACHINE_READABLE_STATUSES = new Set(["live", "machine-readable", "current-machine-readable"]);
const NON_MACHINE_READABLE_STATUSES = new Set(["manual-only", "pdf-only", "unavailable"]);

type UnknownRecord = Record<string, unknown>;

type StateLaborModule = {
  getStateLaborData: () => unknown;
  getWarnPressureStates: () => unknown;
  getWarnPressureTopStates: (limit?: number) => unknown;
  getWarnPressureSummary: () => unknown;
};

function record(value: unknown, label: string): UnknownRecord {
  expect(value, `${label} should be an object`).toBeTruthy();
  expect(typeof value, `${label} should be an object`).toBe("object");
  expect(Array.isArray(value), `${label} should not be an array`).toBe(false);
  return value as UnknownRecord;
}

function optionalRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined;
}

function stringFrom(scopes: UnknownRecord[], keys: string[], label: string): string {
  for (const scope of scopes) {
    for (const key of keys) {
      const value = scope[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  throw new Error(`${label} should expose one of: ${keys.join(", ")}`);
}

function optionalStringFrom(scopes: UnknownRecord[], keys: string[]): string | undefined {
  for (const scope of scopes) {
    for (const key of keys) {
      const value = scope[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return undefined;
}

function numberFrom(
  scopes: UnknownRecord[],
  keys: string[],
  label: string,
  options: { integer?: boolean; min?: number; max?: number } = {},
): number {
  for (const scope of scopes) {
    for (const key of keys) {
      const value = scope[key];
      if (typeof value !== "number") continue;
      expect(Number.isFinite(value), `${label} should be finite`).toBe(true);
      if (options.integer) expect(Number.isInteger(value), `${label} should be an integer`).toBe(true);
      if (options.min !== undefined) expect(value, `${label} should be >= ${options.min}`).toBeGreaterThanOrEqual(options.min);
      if (options.max !== undefined) expect(value, `${label} should be <= ${options.max}`).toBeLessThanOrEqual(options.max);
      return value;
    }
  }
  throw new Error(`${label} should expose one of: ${keys.join(", ")}`);
}

function optionalNumberFrom(
  scopes: UnknownRecord[],
  keys: string[],
  label: string,
  options: { integer?: boolean; min?: number; max?: number } = {},
): number | undefined {
  for (const scope of scopes) {
    for (const key of keys) {
      const value = scope[key];
      if (value == null) continue;
      expect(typeof value, `${label} should be numeric when present`).toBe("number");
      if (typeof value !== "number") return undefined;
      expect(Number.isFinite(value), `${label} should be finite`).toBe(true);
      if (options.integer) expect(Number.isInteger(value), `${label} should be an integer`).toBe(true);
      if (options.min !== undefined) expect(value, `${label} should be >= ${options.min}`).toBeGreaterThanOrEqual(options.min);
      if (options.max !== undefined) expect(value, `${label} should be <= ${options.max}`).toBeLessThanOrEqual(options.max);
      return value;
    }
  }
  return undefined;
}

function optionalBooleanFrom(scopes: UnknownRecord[], keys: string[]): boolean | undefined {
  for (const scope of scopes) {
    for (const key of keys) {
      const value = scope[key];
      if (typeof value === "boolean") return value;
    }
  }
  return undefined;
}

function statesFrom(value: unknown, label: string): UnknownRecord[] {
  if (Array.isArray(value)) return value.map((item, index) => record(item, `${label}[${index}]`));

  const data = record(value, label);
  const states = data.states ?? data.jurisdictions ?? data.stateLabor ?? data.stateLaborData;
  expect(Array.isArray(states), `${label} should expose states/jurisdictions array`).toBe(true);
  return (states as unknown[]).map((item, index) => record(item, `${label}.states[${index}]`));
}

function codeOf(row: UnknownRecord): keyof typeof US_JURISDICTIONS {
  const code = stringFrom([row], ["state", "stateCode", "code"], "state code");
  expect(Object.keys(US_JURISDICTIONS), `${code} should be a U.S. state/DC code`).toContain(code);
  return code as keyof typeof US_JURISDICTIONS;
}

function nameOf(row: UnknownRecord): string {
  return stringFrom([row], ["stateName", "name"], "state name");
}

function lausOf(row: UnknownRecord): UnknownRecord {
  return (
    optionalRecord(row.laus) ??
    optionalRecord(row.latestLaus) ??
    optionalRecord(row.lausLatest) ??
    optionalRecord(row.labor) ??
    optionalRecord(row.latestLabor) ??
    row
  );
}

function warnOf(row: UnknownRecord): UnknownRecord {
  return optionalRecord(row.warn) ?? optionalRecord(row.warnMetrics) ?? row;
}

function pressureOf(row: UnknownRecord): UnknownRecord {
  return (
    optionalRecord(row.warnPressure) ??
    optionalRecord(row.warnPressureIndex) ??
    optionalRecord(row.pressureIndex) ??
    optionalRecord(row.pressure) ??
    row
  );
}

function scoreComponentScopes(row: UnknownRecord): UnknownRecord[] {
  const pressure = pressureOf(row);
  return [
    optionalRecord(pressure.components),
    optionalRecord(pressure.scoreComponents),
    optionalRecord(pressure.percentiles),
    optionalRecord(pressure.pressurePercentiles),
    pressure,
    row,
  ].filter(Boolean) as UnknownRecord[];
}

function rankOf(row: UnknownRecord): number | undefined {
  return optionalNumberFrom([pressureOf(row), row], ["rank", "warnPressureRank"], "WARN pressure rank", {
    integer: true,
    min: 1,
  });
}

function scoreOf(row: UnknownRecord): number | undefined {
  return optionalNumberFrom(
    [pressureOf(row), row],
    ["score", "warnPressureScore", "pressureScore"],
    "WARN pressure score",
    { integer: true, min: 0, max: 100 },
  );
}

function rankEligibleOf(row: UnknownRecord): boolean {
  const value = optionalBooleanFrom(
    [pressureOf(row), row],
    ["rankEligible", "isRankEligible", "eligibleForRank", "hasWarnPressureRank"],
  );
  expect(typeof value, `${codeOf(row)} should declare WARN pressure rank eligibility`).toBe("boolean");
  return Boolean(value);
}

function coverageStatusOf(row: UnknownRecord): string | undefined {
  return optionalStringFrom(
    [pressureOf(row), warnOf(row), row],
    ["coverageStatus", "warnCoverageStatus", "sourceStatus", "availability", "access", "status"],
  )?.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function rankIneligibleReasonOf(row: UnknownRecord): string | undefined {
  return optionalStringFrom(
    [pressureOf(row), optionalRecord(row.warnCoverage) ?? {}, warnOf(row), row],
    ["rankIneligibleReason", "exclusionReason"],
  );
}

function isoDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
}

function noticeDate(notice: UnknownRecord): string | undefined {
  return isoDate(notice.noticeDate) ?? isoDate(notice.effectiveDate);
}

function dateRangeOverlapsWindow(dateRange: unknown, windowStart: string, windowEnd: string): boolean {
  const range = optionalRecord(dateRange);
  if (!range) return false;
  const earliest = isoDate(range.earliest);
  const latest = isoDate(range.latest);
  const rangeStart = earliest ?? latest;
  const rangeEnd = latest ?? earliest;
  return Boolean(rangeStart && rangeEnd && rangeStart <= windowEnd && rangeEnd >= windowStart);
}

function warnNoticeCountsInWindow(windowStart: string, windowEnd: string): Map<string, number> {
  const data = JSON.parse(readFileSync(WARN_NOTICES_JSON, "utf8")) as UnknownRecord;
  const notices = Array.isArray(data.notices) ? (data.notices as UnknownRecord[]) : [];
  const counts = new Map<string, number>();

  for (const notice of notices) {
    const code = typeof notice.state === "string" ? notice.state : undefined;
    const date = noticeDate(notice);
    if (!code || !date || date < windowStart || date > windowEnd) continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  return counts;
}

function hasWarnWindowCoverage(row: UnknownRecord, windowStart: string, windowEnd: string, counts: Map<string, number>): boolean {
  const code = codeOf(row);
  const coverage = optionalRecord(row.warnCoverage) ?? warnOf(row);
  return dateRangeOverlapsWindow(coverage.dateRange, windowStart, windowEnd) || (counts.get(code) ?? 0) > 0;
}

function staleLiveWarnFeeds(windowStart: string, windowEnd: string, counts: Map<string, number>): Set<string> {
  const data = JSON.parse(readFileSync(WARN_NOTICES_JSON, "utf8")) as UnknownRecord;
  const registry = Array.isArray(data.coverageStates) ? (data.coverageStates as UnknownRecord[]) : [];
  const stale = new Set<string>();

  for (const entry of registry) {
    const code = stringFrom([entry], ["state", "stateCode", "code"], "WARN coverage state code");
    const status = stringFrom(
      [entry],
      ["coverageStatus", "sourceStatus", "availability", "access", "status"],
      `${code} WARN coverage status`,
    ).trim().toLowerCase().replace(/[_\s]+/g, "-");
    if (!MACHINE_READABLE_STATUSES.has(status)) continue;
    const overlaps = dateRangeOverlapsWindow(entry.dateRange, windowStart, windowEnd) || (counts.get(code) ?? 0) > 0;
    if (!overlaps) stale.add(code);
  }

  return stale;
}

function validateLausMetrics(row: UnknownRecord): void {
  const laus = lausOf(row);
  const code = codeOf(row);
  const period = stringFrom(
    [laus, row],
    ["period", "date", "latestPeriod", "lausPeriod", "latestLausPeriod"],
    `${code} LAUS period`,
  );
  expect(period, `${code} should use a YYYY-MM LAUS period`).toMatch(ISO_MONTH);
  numberFrom([laus, row], ["laborForce", "labor_force"], `${code} LAUS labor force`, { integer: true, min: 1 });
  numberFrom([laus, row], ["employment", "employed"], `${code} LAUS employment`, { integer: true, min: 0 });
  numberFrom([laus, row], ["unemployment", "unemployed"], `${code} LAUS unemployment`, { integer: true, min: 0 });
  numberFrom([laus, row], ["unemploymentRate", "unemployment_rate"], `${code} LAUS unemployment rate`, {
    min: 0,
    max: 100,
  });
  numberFrom(
    [laus, row],
    ["unemploymentYoYDelta", "unemploymentRateYoYDelta", "unemploymentRateDeltaYoY", "unemploymentYoYChange"],
    `${code} LAUS unemployment YoY delta`,
    { min: -100, max: 100 },
  );
}

function validateScoreFormula(row: UnknownRecord): void {
  const scopes = scoreComponentScopes(row);
  const code = codeOf(row);
  const warnRatePercentile = numberFrom(
    scopes,
    [
      "warnRatePercentile",
      "warnAffectedRatePercentile",
      "warnEmployeesRatePercentile",
      "warnEmployeesPer10kLaborForce",
      "warnEmployeesPer100kLaborForce",
    ],
    `${code} WARN-rate percentile`,
    { min: 0, max: 100 },
  );
  const unemploymentYoYDeltaPercentile = numberFrom(
    scopes,
    [
      "unemploymentYoYDeltaPercentile",
      "unemploymentRateYoYDeltaPercentile",
      "unemploymentDeltaPercentile",
      "unemploymentRateYoYDelta",
    ],
    `${code} unemployment YoY delta percentile`,
    { min: 0, max: 100 },
  );
  expect(scoreOf(row), `${code} score should use the approved weighted formula`).toBe(
    Math.round(0.7 * warnRatePercentile + 0.3 * unemploymentYoYDeltaPercentile),
  );
}

function rankedStates(rows: UnknownRecord[]): UnknownRecord[] {
  return rows.filter((row) => rankOf(row) !== undefined);
}

function expectRanksSorted(rows: UnknownRecord[]): void {
  expect(rows.length, "there should be at least one ranked WARN pressure state").toBeGreaterThan(0);

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rank = rankOf(row);
    const score = scoreOf(row);
    expect(rank, `${codeOf(row)} rank should match sorted position`).toBe(index + 1);
    expect(score, `${codeOf(row)} should have a score`).not.toBeUndefined();
    if (index > 0) {
      expect(score ?? -1, `${codeOf(row)} score should be sorted descending`).toBeLessThanOrEqual(scoreOf(rows[index - 1]) ?? -1);
    }
  }
}

function warnCoverageRegistry(): Map<string, string> {
  const data = JSON.parse(readFileSync(WARN_NOTICES_JSON, "utf8")) as UnknownRecord;
  const registry = (
    data.coverageRegistry ??
    data.coverageStates ??
    data.stateCoverage ??
    data.coverageByState ??
    data.sourceCoverage
  ) as unknown;

  expect(Array.isArray(registry), "WARN coverage registry should be available for rank eligibility checks").toBe(true);

  const statuses = new Map<string, string>();
  for (const entry of registry as UnknownRecord[]) {
    const code = stringFrom([entry], ["state", "stateCode", "code"], "WARN coverage state code");
    const status = stringFrom(
      [entry],
      ["coverageStatus", "sourceStatus", "availability", "access", "status"],
      `${code} WARN coverage status`,
    ).trim().toLowerCase().replace(/[_\s]+/g, "-");
    statuses.set(code, status === "machine-readable" ? "live" : status);
  }
  return statuses;
}

async function importStateLaborModule(): Promise<StateLaborModule> {
  expect(
    existsSync(STATE_LABOR_MODULE),
    "Expected lib/state-labor.ts to export WARN Pressure helper functions",
  ).toBe(true);
  return import(/* @vite-ignore */ pathToFileURL(STATE_LABOR_MODULE).href) as Promise<StateLaborModule>;
}

describe("state-labor WARN Pressure snapshot", () => {
  it("represents all 50 states plus DC with latest LAUS metrics and WARN pressure fields", () => {
    expect(existsSync(STATE_LABOR_JSON), "Expected data/state-labor.json snapshot").toBe(true);

    const snapshot = JSON.parse(readFileSync(STATE_LABOR_JSON, "utf8")) as UnknownRecord;
    const states = statesFrom(snapshot, "state-labor snapshot");
    expect(states).toHaveLength(51);

    const seen = new Set<string>();
    for (const row of states) {
      const code = codeOf(row);
      expect(seen.has(code), `${code} should appear once`).toBe(false);
      seen.add(code);
      expect(nameOf(row)).toBe(US_JURISDICTIONS[code]);
      validateLausMetrics(row);
      rankEligibleOf(row);

      const pressure = pressureOf(row);
      expect(Object.keys(pressure).length, `${code} should expose WARN pressure fields`).toBeGreaterThan(0);
      if (rankEligibleOf(row)) {
        numberFrom(
          [pressure, warnOf(row), row],
          ["affectedEmployees", "warnAffectedEmployees", "warnEmployees12m", "employees"],
          `${code} WARN affected employees`,
          { integer: true, min: 0 },
        );
        numberFrom(
          [pressure, warnOf(row), row],
          [
            "warnRate",
            "warnRatePer100kLaborForce",
            "warnEmployeesPer10kLaborForce",
            "affectedEmployeesPer100kLaborForce",
          ],
          `${code} WARN rate`,
          { min: 0 },
        );
        validateScoreFormula(row);
      } else {
        expect(rankOf(row), `${code} should not have a rank when not rank eligible`).toBeUndefined();
        expect(scoreOf(row), `${code} should not have a score when not rank eligible`).toBeUndefined();
      }
    }

    expect(seen).toEqual(new Set(Object.keys(US_JURISDICTIONS)));
  });
});

describe("state-labor WARN Pressure helpers", () => {
  it("returns ranked states sorted by rank and score with formula-checked scores", async () => {
    const stateLaborModule = await importStateLaborModule();
    expect(typeof stateLaborModule.getWarnPressureStates).toBe("function");

    const states = statesFrom(stateLaborModule.getWarnPressureStates(), "getWarnPressureStates()");
    expect(states).toHaveLength(51);

    const ranked = rankedStates(states);
    expectRanksSorted(ranked);
    for (const row of ranked) {
      const code = codeOf(row);
      expect(rankEligibleOf(row), `${code} should be rank eligible when ranked`).toBe(true);
      validateLausMetrics(row);
      validateScoreFormula(row);
      const status = coverageStatusOf(row);
      expect(status, `${code} ranked states require live/machine-readable WARN coverage`).toBeTruthy();
      expect(MACHINE_READABLE_STATUSES.has(status ?? "")).toBe(true);
      numberFrom([lausOf(row), row], ["laborForce", "labor_force"], `${code} ranked-state labor force`, {
        integer: true,
        min: 1,
      });
    }

    for (const row of states.filter((state) => rankOf(state) === undefined)) {
      expect(rankEligibleOf(row), `${codeOf(row)} unranked state should not be rank eligible`).toBe(false);
      expect(scoreOf(row), `${codeOf(row)} unranked state should not expose a score`).toBeUndefined();
    }
  });

  it("keeps top-state and summary helpers consistent with ranked states", async () => {
    const stateLaborModule = await importStateLaborModule();
    expect(typeof stateLaborModule.getStateLaborData).toBe("function");
    expect(typeof stateLaborModule.getWarnPressureTopStates).toBe("function");
    expect(typeof stateLaborModule.getWarnPressureSummary).toBe("function");

    const allStates = statesFrom(stateLaborModule.getStateLaborData(), "getStateLaborData()");
    const pressureStates = statesFrom(stateLaborModule.getWarnPressureStates(), "getWarnPressureStates()");
    const ranked = rankedStates(pressureStates);
    const topFive = statesFrom(stateLaborModule.getWarnPressureTopStates(5), "getWarnPressureTopStates(5)");
    const summary = record(stateLaborModule.getWarnPressureSummary(), "getWarnPressureSummary()");

    expect(allStates).toHaveLength(51);
    expect(topFive).toHaveLength(Math.min(5, ranked.length));
    expect(topFive.map(codeOf)).toEqual(ranked.slice(0, 5).map(codeOf));
    expect(topFive.map(rankOf)).toEqual(ranked.slice(0, 5).map(rankOf));

    numberFrom([summary], ["totalJurisdictions", "stateCount", "jurisdictions"], "summary total jurisdictions", {
      integer: true,
      min: 51,
      max: 51,
    });
    numberFrom([summary], ["rankedStates", "rankEligibleStates", "rankedStateCount"], "summary ranked states", {
      integer: true,
      min: ranked.length,
      max: ranked.length,
    });
    const latestLausPeriod = stringFrom(
      [summary],
      ["latestLausPeriod", "latestPeriod", "lausPeriod", "latestMonth"],
      "summary latest LAUS period",
    );
    expect(latestLausPeriod).toMatch(ISO_MONTH);
  });

  it("ranks only current-window WARN feeds and excludes stale live feeds", async () => {
    const stateLaborModule = await importStateLaborModule();
    const snapshot = record(stateLaborModule.getStateLaborData(), "getStateLaborData()");
    const summary = record(snapshot.summary, "state-labor summary");
    const warnWindowStart = stringFrom([summary], ["warnWindowStart"], "summary WARN window start");
    const warnWindowEnd = stringFrom([summary], ["warnWindowEnd"], "summary WARN window end");
    const noticeCounts = warnNoticeCountsInWindow(warnWindowStart, warnWindowEnd);
    const staleLiveStates = staleLiveWarnFeeds(warnWindowStart, warnWindowEnd, noticeCounts);
    const states = statesFrom(stateLaborModule.getWarnPressureStates(), "getWarnPressureStates()");
    const ranked = rankedStates(states);

    expect([...staleLiveStates], "fixture should include stale live WARN feeds").toEqual(
      expect.arrayContaining(["GA", "NY", "TX"]),
    );

    for (const row of ranked) {
      const code = codeOf(row);
      expect(hasWarnWindowCoverage(row, warnWindowStart, warnWindowEnd, noticeCounts), `${code} ranked states require WARN coverage/notices overlapping the current 12-month window`).toBe(true);
      expect(staleLiveStates.has(code), `${code} stale live feed should not be ranked`).toBe(false);
    }

    for (const row of states.filter((state) => staleLiveStates.has(codeOf(state)))) {
      const code = codeOf(row);
      expect(rankEligibleOf(row), `${code} stale live feed should not be rank eligible`).toBe(false);
      expect(rankOf(row), `${code} stale live feed should not have a rank`).toBeUndefined();
      expect(scoreOf(row), `${code} stale live feed should not have a score`).toBeUndefined();
      expect(rankIneligibleReasonOf(row), `${code} stale live feed should explain why it is unranked`).toMatch(
        /no notices in the current 12-month window/i,
      );
    }
  });

  it("does not assign fake WARN pressure to manual, PDF-only, or unavailable WARN states", async () => {
    const stateLaborModule = await importStateLaborModule();
    const coverage = warnCoverageRegistry();
    const states = statesFrom(stateLaborModule.getWarnPressureStates(), "getWarnPressureStates()");

    for (const row of states) {
      const code = codeOf(row);
      const status = coverage.get(code);
      if (!status || !NON_MACHINE_READABLE_STATUSES.has(status)) continue;

      expect(rankEligibleOf(row), `${code} ${status} coverage should not be rank eligible`).toBe(false);
      expect(rankOf(row), `${code} ${status} coverage should not have a rank`).toBeUndefined();
      expect(scoreOf(row), `${code} ${status} coverage should not have a score`).toBeUndefined();
      expect(
        optionalNumberFrom(
          [pressureOf(row), warnOf(row), row],
          ["affectedEmployees", "warnAffectedEmployees", "warnEmployees12m", "employees"],
          `${code} WARN affected employees`,
          { integer: true, min: 0 },
        ) ?? 0,
        `${code} ${status} coverage should not have synthetic WARN affected employees`,
      ).toBe(0);
      expect(
        optionalNumberFrom(
          [pressureOf(row), warnOf(row), row],
          [
            "warnRate",
            "warnRatePer100kLaborForce",
            "warnEmployeesPer10kLaborForce",
            "affectedEmployeesPer100kLaborForce",
          ],
          `${code} WARN rate`,
          { min: 0 },
        ) ?? 0,
        `${code} ${status} coverage should not have synthetic WARN rate`,
      ).toBe(0);
    }
  });
});

describe("labor i18n WARN Pressure keys", () => {
  it("keeps English and Chinese labor keys in parity and includes the WARN Pressure tab label", () => {
    expect(Object.keys(laborZh).sort()).toEqual(Object.keys(laborEn).sort());
    const warnPressureKeys = Object.entries(laborEn).filter(([, value]) => /warn pressure/i.test(value));
    expect(warnPressureKeys.length, "laborEn should include a WARN Pressure label").toBeGreaterThan(0);

    for (const [key] of warnPressureKeys) {
      expect(typeof laborZh[key as keyof typeof laborZh]).toBe("string");
      expect(laborZh[key as keyof typeof laborZh].trim().length, `${key} zh translation should be non-empty`).toBeGreaterThan(0);
    }
  });
});
