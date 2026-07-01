import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";

const DATA_PATH = path.join(process.cwd(), "data/market-ai-signals.json");
const HELPER_PATH = path.join(process.cwd(), "lib/market-signals.ts");
const EXPECTED_SECTOR_COUNT = 11;
const MIN_WINDOW_START = "2022-11-30";

type UnknownRecord = Record<string, unknown>;
type MarketSignalsModule = {
  getMarketAISignals?: (limit?: number) => unknown;
  getMarketSignals?: (limit?: number) => unknown;
  getMarketSignalData?: (limit?: number) => unknown;
  getMarketSignalSectors?: (limit?: number) => unknown;
  getTopMarketAISectors?: (limit?: number) => unknown;
  getTopMarketSignals?: (limit?: number) => unknown;
  getTopMarketSignalSectors?: (limit?: number) => unknown;
  marketAISignals?: unknown;
  marketSignals?: unknown;
};

const SECTOR_ARRAY_KEYS = [
  "sectors",
  "sectorSignals",
  "signals",
  "marketSignals",
  "marketAiSignals",
  "marketAISignals",
  "sectorEtfs",
  "sectorETFs",
];

const RETURN_KEYS = ["return", "returnPct", "periodReturn", "periodReturnPct", "totalReturn", "totalReturnPct"];
const EXCESS_KEYS = ["excessReturn", "excessReturnPct", "excessVsBenchmark", "excessVsSpy", "relativeReturn", "relativeReturnPct"];
const VOLATILITY_KEYS = ["volatility", "volatilityPct", "annualizedVolatility", "annualizedVolatilityPct"];
const DRAWDOWN_KEYS = ["drawdown", "drawdownPct", "maxDrawdown", "maxDrawdownPct"];
const EXPOSURE_KEYS = [
  "aiExposure",
  "aiExposureScore",
  "exposure",
  "exposureScore",
  "laborExposure",
  "employmentWeightedAIExposure",
];
const SCORE_KEYS = [
  "score",
  "sensitivityScore",
  "aiSensitivityScore",
  "marketAiSensitivityScore",
  "marketAISensitivityScore",
  "marketImpliedScore",
];
const START_DATE_KEYS = ["startDate", "windowStart", "priceStartDate", "priceDateStart", "periodStart", "from"];
const END_DATE_KEYS = ["endDate", "latestDate", "windowEnd", "priceEndDate", "priceDateEnd", "periodEnd", "to", "asOf"];

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function record(value: unknown, label: string): UnknownRecord {
  expect(value, `${label} should be an object`).toBeTruthy();
  expect(typeof value, `${label} should be an object`).toBe("object");
  expect(Array.isArray(value), `${label} should not be an array`).toBe(false);
  return value as UnknownRecord;
}

function readMarketSignalsSnapshot(): UnknownRecord {
  expect(
    existsSync(DATA_PATH),
    "Expected data/market-ai-signals.json to contain the bundled market-implied AI sensitivity snapshot",
  ).toBe(true);
  return record(JSON.parse(readFileSync(DATA_PATH, "utf8")), "market-ai-signals snapshot");
}

function likelySectorRow(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const hasLabel = ["sector", "sectorName", "name", "label", "ticker", "symbol", "etf", "etfTicker"].some(
    (key) => typeof value[key] === "string" && (value[key] as string).trim().length > 0,
  );
  const hasMetric = [...RETURN_KEYS, ...EXCESS_KEYS, ...VOLATILITY_KEYS, ...DRAWDOWN_KEYS, ...SCORE_KEYS].some(
    (key) => typeof value[key] === "number" && Number.isFinite(value[key]),
  );
  return hasLabel && hasMetric;
}

function sectorRowsFrom(value: unknown, label: string): UnknownRecord[] {
  if (Array.isArray(value)) return value.map((item, index) => record(item, `${label}[${index}]`));

  const data = record(value, label);
  for (const key of SECTOR_ARRAY_KEYS) {
    if (Array.isArray(data[key])) {
      return (data[key] as unknown[]).map((item, index) => record(item, `${label}.${key}[${index}]`));
    }
  }

  for (const [key, nested] of Object.entries(data)) {
    if (Array.isArray(nested) && nested.length >= EXPECTED_SECTOR_COUNT && nested.some(likelySectorRow)) {
      return nested.map((item, index) => record(item, `${label}.${key}[${index}]`));
    }
  }

  throw new Error(`${label} should expose sector rows through one of: ${SECTOR_ARRAY_KEYS.join(", ")}`);
}

function metricContainers(row: UnknownRecord): UnknownRecord[] {
  return [row, row.metrics, row.marketMetrics, row.priceMetrics, row.sensitivity].filter(isRecord);
}

function numberFrom(row: UnknownRecord, keys: string[], label: string): number {
  for (const container of metricContainers(row)) {
    for (const key of keys) {
      const value = container[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
  }
  throw new Error(`${label} should expose a finite number via one of: ${keys.join(", ")}`);
}

function stringFrom(row: UnknownRecord, keys: string[], label: string): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  throw new Error(`${label} should expose one of: ${keys.join(", ")}`);
}

function dateContainers(snapshot: UnknownRecord): UnknownRecord[] {
  return [snapshot, snapshot.metadata, snapshot.source, snapshot.window, snapshot.priceWindow, snapshot.period].filter(isRecord);
}

function dateStringFrom(snapshot: UnknownRecord, sectors: UnknownRecord[], keys: string[], label: string): string {
  for (const container of dateContainers(snapshot)) {
    for (const key of keys) {
      const value = container[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }

  for (const sector of sectors) {
    for (const container of metricContainers(sector)) {
      for (const key of keys) {
        const value = container[key];
        if (typeof value === "string" && value.trim()) return value;
      }
    }
  }

  throw new Error(`${label} should expose one of: ${keys.join(", ")}`);
}

function collectText(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectText);
  if (isRecord(value)) return Object.values(value).flatMap(collectText);
  return [];
}

async function importMarketSignalsModule(): Promise<MarketSignalsModule> {
  expect(
    existsSync(HELPER_PATH),
    "Expected lib/market-signals.ts to expose market signal helpers",
  ).toBe(true);
  return (await import(/* @vite-ignore */ pathToFileURL(HELPER_PATH).href)) as MarketSignalsModule;
}

function helperDataset(module: MarketSignalsModule): unknown {
  for (const key of ["getMarketAISignals", "getMarketSignals", "getMarketSignalData", "getMarketSignalSectors"] as const) {
    if (typeof module[key] === "function") return module[key]();
  }
  for (const key of ["marketAISignals", "marketSignals"] as const) {
    if (module[key] != null) return module[key];
  }
  throw new Error("lib/market-signals.ts should export a dataset helper such as getMarketAISignals()");
}

function topSectorHelper(module: MarketSignalsModule): (limit?: number) => unknown {
  for (const key of ["getTopMarketAISectors", "getTopMarketSignals", "getTopMarketSignalSectors"] as const) {
    if (typeof module[key] === "function") return module[key];
  }
  throw new Error("lib/market-signals.ts should export a top-sector helper such as getTopMarketAISectors(limit)");
}

describe("market-implied AI sensitivity data", () => {
  it("validates the bundled JSON shape, benchmark, window, and sector metrics", () => {
    const snapshot = readMarketSignalsSnapshot();
    const sectors = sectorRowsFrom(snapshot, "market-ai-signals snapshot");

    expect(sectors, "Expected one row for each GICS sector ETF").toHaveLength(EXPECTED_SECTOR_COUNT);
    expect(JSON.stringify(snapshot.benchmark ?? snapshot.metadata ?? snapshot.source ?? snapshot)).toMatch(/\bSPY\b/i);

    const startDate = dateStringFrom(snapshot, sectors, START_DATE_KEYS, "price window start date");
    const endDate = dateStringFrom(snapshot, sectors, END_DATE_KEYS, "price window end date");
    const startTime = Date.parse(startDate);
    const endTime = Date.parse(endDate);

    expect(Number.isNaN(startTime), `Invalid price window start date: ${startDate}`).toBe(false);
    expect(Number.isNaN(endTime), `Invalid price window end date: ${endDate}`).toBe(false);
    expect(startTime, "Price window should start on or after the ChatGPT release date").toBeGreaterThanOrEqual(
      Date.parse(MIN_WINDOW_START),
    );
    expect(endTime, "Price window end should be after the start").toBeGreaterThan(startTime);

    for (const [index, sector] of sectors.entries()) {
      stringFrom(sector, ["sector", "sectorName", "name", "label"], `sector ${index} label`);
      stringFrom(sector, ["ticker", "symbol", "etf", "etfTicker"], `sector ${index} ETF ticker`);

      numberFrom(sector, RETURN_KEYS, `sector ${index} return`);
      numberFrom(sector, EXCESS_KEYS, `sector ${index} excess return`);
      numberFrom(sector, VOLATILITY_KEYS, `sector ${index} volatility`);
      numberFrom(sector, DRAWDOWN_KEYS, `sector ${index} drawdown`);

      const exposure = numberFrom(sector, EXPOSURE_KEYS, `sector ${index} AI exposure`);
      expect(exposure).toBeGreaterThanOrEqual(0);
      expect(exposure).toBeLessThanOrEqual(100);

      const score = numberFrom(sector, SCORE_KEYS, `sector ${index} score`);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it("documents Yahoo source risk and non-advisory methodology", () => {
    const snapshot = readMarketSignalsSnapshot();
    const metadataText = collectText({
      source: snapshot.source,
      sources: snapshot.sources,
      metadata: snapshot.metadata,
      methodology: snapshot.methodology,
      caveat: snapshot.caveat,
      notes: snapshot.notes,
    }).join(" ");

    expect(metadataText).toMatch(/yahoo/i);
    expect(metadataText).toMatch(/unofficial|undocumented|change[- ]?prone/i);
    expect(metadataText).toMatch(
      /non[- ]?advisory|informational|descriptive only|not investment advice|not financial advice|not advice/i,
    );
  });
});

describe("market signal helpers", () => {
  it("exposes sorted top sectors from the helper module", async () => {
    const marketSignalsModule = await importMarketSignalsModule();
    const sectors = sectorRowsFrom(helperDataset(marketSignalsModule), "market signal helper output");
    const topThree = sectorRowsFrom(topSectorHelper(marketSignalsModule)(3), "top market signal helper output");

    expect(sectors).toHaveLength(EXPECTED_SECTOR_COUNT);
    expect(topThree).toHaveLength(3);

    const expectedScores = sectors
      .map((sector) => numberFrom(sector, SCORE_KEYS, "sector score"))
      .sort((a, b) => b - a)
      .slice(0, 3);
    const actualScores = topThree.map((sector) => numberFrom(sector, SCORE_KEYS, "top sector score"));

    expect(actualScores).toEqual(expectedScores);
  });
});

describe("build:market-signals script", () => {
  it("is registered in package.json", () => {
    const scripts = packageJson.scripts as Record<string, string>;

    expect(scripts["build:market-signals"], "package.json should register build:market-signals").toEqual(
      expect.any(String),
    );
    expect(scripts["build:market-signals"].length).toBeGreaterThan(0);
  });
});
