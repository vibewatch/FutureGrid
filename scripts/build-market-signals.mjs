#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const OUTPUT_FILE = path.join(DATA_DIR, "market-ai-signals.json");
const OCCUPATION_SNAPSHOT = JSON.parse(
  readFileSync(path.join(DATA_DIR, "occupation-snapshot.json"), "utf8"),
);

const USER_AGENT = "FutureGrid/1.0 market signals data build (+https://github.com)";
const PRIMARY_WINDOW_START = "2022-11-30";
const DAY_MS = 86_400_000;
const YAHOO_ENDPOINT_TEMPLATE =
  "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?period1={unixStart}&period2={unixEnd}&interval=1d&events=history&includeAdjustedClose=true";

const BENCHMARK = {
  id: "spy",
  name: "S&P 500 benchmark",
  ticker: "SPY",
};

const SECTOR_ETFS = [
  { id: "xlk", name: "Technology", ticker: "XLK" },
  { id: "xlc", name: "Communication Services", ticker: "XLC" },
  { id: "xly", name: "Consumer Discretionary", ticker: "XLY" },
  { id: "xlf", name: "Financials", ticker: "XLF" },
  { id: "xli", name: "Industrials", ticker: "XLI" },
  { id: "xlv", name: "Health Care", ticker: "XLV" },
  { id: "xle", name: "Energy", ticker: "XLE" },
  { id: "xlp", name: "Consumer Staples", ticker: "XLP" },
  { id: "xlu", name: "Utilities", ticker: "XLU" },
  { id: "xlb", name: "Materials", ticker: "XLB" },
  { id: "xlre", name: "Real Estate", ticker: "XLRE" },
];

const OCCUPATION_SECTOR_MAP = {
  xlk: [
    "Computer & Mathematical",
    "Computer and Mathematical",
    "Architecture and Engineering",
    "Life, Physical, and Social Science",
    "Life, Physical & Social Science",
  ],
  xlc: [
    "Arts, Design, Entertainment, Sports, and Media",
    "Arts, Entertainment & Media",
    "Sales and Related",
  ],
  xly: [
    "Sales and Related",
    "Food Preparation and Serving Related",
    "Food Preparation",
    "Personal Care and Service",
    "Personal Care",
    "Education, Training, and Library",
    "Education & Library",
  ],
  xlf: [
    "Business and Financial Operations",
    "Business & Financial",
    "Office and Administrative Support",
    "Legal",
    "Management",
  ],
  xli: [
    "Production",
    "Transportation and Material Moving",
    "Transportation & Logistics",
    "Construction and Extraction",
    "Construction",
    "Installation, Maintenance, and Repair",
    "Architecture and Engineering",
    "Management",
    "Protective Service",
  ],
  xlv: [
    "Healthcare Practitioners and Technical",
    "Healthcare Support",
    "Healthcare",
    "Community and Social Service",
  ],
  xle: [
    "Construction and Extraction",
    "Installation, Maintenance, and Repair",
    "Architecture and Engineering",
    "Life, Physical, and Social Science",
    "Life, Physical & Social Science",
  ],
  xlp: [
    "Farming, Fishing, and Forestry",
    "Food Preparation and Serving Related",
    "Food Preparation",
    "Production",
    "Sales and Related",
  ],
  xlu: [
    "Installation, Maintenance, and Repair",
    "Architecture and Engineering",
    "Life, Physical, and Social Science",
    "Life, Physical & Social Science",
    "Construction and Extraction",
  ],
  xlb: [
    "Production",
    "Life, Physical, and Social Science",
    "Life, Physical & Social Science",
    "Architecture and Engineering",
    "Construction and Extraction",
    "Farming, Fishing, and Forestry",
  ],
  xlre: [
    "Construction",
    "Construction and Extraction",
    "Sales and Related",
    "Office and Administrative Support",
    "Management",
    "Building and Grounds Cleaning and Maintenance",
  ],
};

async function main() {
  console.log("=== Building market-implied AI sensitivity data ===");
  const benchmarkPoints = await fetchChart(BENCHMARK.ticker);
  if (benchmarkPoints.length < 2) {
    throw new Error("SPY benchmark returned fewer than two usable observations.");
  }

  const benchmarkMetrics = computeMetrics(benchmarkPoints);
  const sectors = [];
  const warnings = [];

  for (const sector of SECTOR_ETFS) {
    try {
      const points = await fetchChart(sector.ticker);
      if (points.length < 2) throw new Error("fewer than two usable observations");
      const metrics = computeMetrics(points, benchmarkMetrics.totalReturn);
      const exposure = computeExposureStats(OCCUPATION_SECTOR_MAP[sector.id] ?? []);
      sectors.push({
        ...sector,
        mappedOccupationSectors: exposure.mappedOccupationSectors,
        mappedOccupationCount: exposure.mappedOccupationCount,
        mappedEmployment: exposure.mappedEmployment,
        employmentWeightedAIExposure: exposure.employmentWeightedAIExposure,
        prices: monthlyDownsample(points),
        metrics,
        marketAiSensitivityScore: 0,
        classification: "Unclassified",
        scoreComponents: {
          normalizedExcessReturn: 0,
          normalizedAIExposure: 0,
          excessReturnWeight: 0.65,
          aiExposureWeight: 0.35,
        },
        dataQualityNotes: buildDataQualityNotes(sector.ticker, points, exposure),
      });
    } catch (err) {
      warnings.push(`${sector.ticker} omitted: ${err.message}`);
      console.warn(`WARN: ${sector.ticker} omitted: ${err.message}`);
    }
  }

  if (sectors.length === 0) throw new Error("No sector ETF returned usable observations.");

  applySensitivityScores(sectors);

  const sortedSectors = [...sectors].sort(
    (a, b) => b.marketAiSensitivityScore - a.marketAiSensitivityScore || a.name.localeCompare(b.name),
  );
  const mappingCoverage = computeMappingCoverage();

  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      name: "Yahoo Finance chart JSON endpoint",
      endpointTemplate: YAHOO_ENDPOINT_TEMPLATE,
      access: "Public unauthenticated endpoint",
      caveat:
        "Yahoo Finance chart JSON is public and unauthenticated but unofficial/undocumented; availability, schema, symbols, and rate limits can change without notice.",
    },
    methodology: {
      feature:
        "Stock-history-based descriptive market AI sensitivity lens; not financial advice, not a forecast, and not causal proof.",
      windowStart: PRIMARY_WINDOW_START,
      interval: "1d",
      priceField: "Adjusted close when Yahoo supplies it; otherwise close.",
      benchmark: "SPY total return over the same window.",
      metrics:
        "Daily observations compute total return, SPY benchmark return, excess return, annualized volatility, max drawdown, latest close, YTD return, and one-year return. UI series are monthly downsampled.",
      occupationMapping:
        "FutureGrid occupation sector strings are hand-mapped to SPDR ETF sectors; several occupation sectors are coarse and may be relevant to multiple market sectors.",
      scoring:
        "marketAiSensitivityScore is a clamped 0–100 descriptive blend: 65% normalized excess return versus SPY and 35% normalized employment-weighted occupation AI exposure. It is non-predictive.",
    },
    benchmark: {
      ...BENCHMARK,
      prices: monthlyDownsample(benchmarkPoints),
      metrics: benchmarkMetrics,
      dataQualityNotes: buildBenchmarkNotes(benchmarkPoints),
    },
    sectors: sortedSectors,
    summary: {
      sectorCount: sortedSectors.length,
      requestedSectorCount: SECTOR_ETFS.length,
      omittedTickers: warnings,
      latestDate: maxDate([benchmarkMetrics.latestDate, ...sortedSectors.map((sector) => sector.metrics.latestDate)]),
      windowStart: PRIMARY_WINDOW_START,
      topSectors: sortedSectors.slice(0, 5).map((sector) => ({
        id: sector.id,
        name: sector.name,
        ticker: sector.ticker,
        marketAiSensitivityScore: sector.marketAiSensitivityScore,
        excessReturn: sector.metrics.excessReturn,
        employmentWeightedAIExposure: sector.employmentWeightedAIExposure,
      })),
      mappingCoverage,
      caveats: [
        "Descriptive historical lens only; does not forecast ETF performance or prove AI caused returns.",
        "Yahoo Finance endpoint is unofficial/undocumented and may change or rate-limit.",
        "Occupation-to-market-sector mapping is hand-authored and coarse; coverage counts should be shown with the score.",
      ],
    },
  };

  writeFileSync(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`wrote data/market-ai-signals.json`);
  console.log(
    `built ${sortedSectors.length}/${SECTOR_ETFS.length} sectors; top: ${sortedSectors
      .slice(0, 3)
      .map((sector) => `${sector.ticker} ${sector.marketAiSensitivityScore}`)
      .join(", ")}`,
  );
}

async function fetchChart(ticker) {
  const unixStart = Math.floor(new Date(`${PRIMARY_WINDOW_START}T00:00:00Z`).getTime() / 1000);
  const unixEnd = Math.floor((Date.now() + DAY_MS) / 1000);
  const url = YAHOO_ENDPOINT_TEMPLATE.replace("{ticker}", encodeURIComponent(ticker))
    .replace("{unixStart}", String(unixStart))
    .replace("{unixEnd}", String(unixEnd));
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) throw new Error(`Yahoo chart HTTP ${res.status}`);

  const json = await res.json();
  const chartError = json?.chart?.error;
  if (chartError) throw new Error(`${chartError.code ?? "Yahoo chart error"}: ${chartError.description ?? ""}`);
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error("Yahoo chart response missing result");

  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const quote = result.indicators?.quote?.[0] ?? {};
  const close = Array.isArray(quote.close) ? quote.close : [];
  const adjclose = result.indicators?.adjclose?.[0]?.adjclose;
  const adjustedClose = Array.isArray(adjclose) ? adjclose : [];
  const points = [];

  for (let index = 0; index < timestamps.length; index += 1) {
    const adjusted = toFiniteNumber(adjustedClose[index]);
    const rawClose = toFiniteNumber(close[index]);
    const price = adjusted ?? rawClose;
    if (price == null || price <= 0) continue;
    points.push({
      date: new Date(timestamps[index] * 1000).toISOString().slice(0, 10),
      close: round(price, 6),
      closeSource: adjusted != null ? "adjustedClose" : "close",
    });
  }

  return points
    .filter((point) => point.date >= PRIMARY_WINDOW_START)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function computeMetrics(points, benchmarkReturn = null) {
  const first = points[0];
  const latest = points.at(-1);
  const totalReturn = latest.close / first.close - 1;
  const ytdStart = `${latest.date.slice(0, 4)}-01-01`;
  const oneYearStart = yearsBefore(latest.date, 1);
  return {
    startDate: first.date,
    latestDate: latest.date,
    totalReturn: round(totalReturn),
    benchmarkReturn: benchmarkReturn == null ? null : round(benchmarkReturn),
    excessReturn: benchmarkReturn == null ? null : round(totalReturn - benchmarkReturn),
    annualizedVolatility: round(annualizedVolatility(points)),
    maxDrawdown: round(maxDrawdown(points)),
    latestClose: round(latest.close, 2),
    observationCount: points.length,
    ytdReturn: roundNullable(returnSince(points, ytdStart)),
    oneYearReturn: roundNullable(returnSince(points, oneYearStart)),
  };
}

function computeExposureStats(mappedOccupationSectors) {
  const sectorSet = new Set(mappedOccupationSectors);
  const rows = OCCUPATION_SNAPSHOT.filter((row) => sectorSet.has(row.sector));
  let employment = 0;
  let weightedExposure = 0;
  let fallbackExposure = 0;
  let fallbackCount = 0;

  for (const row of rows) {
    const exposure = toFiniteNumber(row.aiExposure);
    if (exposure == null) continue;
    fallbackExposure += exposure;
    fallbackCount += 1;

    const rowEmployment = toFiniteNumber(row.employment);
    if (rowEmployment != null && rowEmployment > 0) {
      employment += rowEmployment;
      weightedExposure += rowEmployment * exposure;
    }
  }

  const employmentWeightedAIExposure =
    employment > 0
      ? weightedExposure / employment
      : fallbackCount > 0
        ? fallbackExposure / fallbackCount
        : null;

  return {
    mappedOccupationSectors: [...sectorSet].sort((a, b) => a.localeCompare(b)),
    mappedOccupationCount: rows.length,
    mappedEmployment: Math.round(employment),
    employmentWeightedAIExposure: roundNullable(employmentWeightedAIExposure),
  };
}

function applySensitivityScores(sectors) {
  const exposures = sectors
    .map((sector) => sector.employmentWeightedAIExposure)
    .filter((value) => value != null && Number.isFinite(value));
  const minExposure = Math.min(...exposures);
  const maxExposure = Math.max(...exposures);

  for (const sector of sectors) {
    const normalizedExcessReturn = clamp(((sector.metrics.excessReturn ?? 0) + 0.25) / 0.5, 0, 1);
    const normalizedAIExposure = normalize(sector.employmentWeightedAIExposure, minExposure, maxExposure);
    const score = clamp(100 * (0.65 * normalizedExcessReturn + 0.35 * normalizedAIExposure), 0, 100);
    sector.scoreComponents = {
      normalizedExcessReturn: round(normalizedExcessReturn, 4),
      normalizedAIExposure: round(normalizedAIExposure, 4),
      excessReturnWeight: 0.65,
      aiExposureWeight: 0.35,
    };
    sector.marketAiSensitivityScore = round(score, 1);
    sector.classification = classifyScore(sector.marketAiSensitivityScore);
  }
}

function buildDataQualityNotes(ticker, points, exposure) {
  const notes = [
    `Yahoo ${ticker} chart observations use ${points.some((point) => point.closeSource === "adjustedClose") ? "adjusted close when available" : "close because adjusted close was unavailable"}.`,
    `Metrics use ${points.length} daily observations; prices are monthly downsampled for UI size.`,
    `Occupation mapping covers ${exposure.mappedOccupationCount} occupations across ${exposure.mappedOccupationSectors.length} FutureGrid sector label(s).`,
  ];
  if (exposure.mappedOccupationSectors.length < 4 || exposure.mappedOccupationCount < 20) {
    notes.push("Sparse/coarse occupation mapping; interpret exposure alignment with extra caution.");
  }
  return notes;
}

function buildBenchmarkNotes(points) {
  return [
    `Yahoo SPY chart observations use ${points.some((point) => point.closeSource === "adjustedClose") ? "adjusted close when available" : "close because adjusted close was unavailable"}.`,
    "SPY is used only as a descriptive benchmark for excess return calculations.",
  ];
}

function computeMappingCoverage() {
  const allOccupationSectors = new Set(OCCUPATION_SNAPSHOT.map((row) => row.sector));
  const mapped = new Set(Object.values(OCCUPATION_SECTOR_MAP).flat());
  const covered = [...allOccupationSectors].filter((sector) => mapped.has(sector));
  const uncovered = [...allOccupationSectors].filter((sector) => !mapped.has(sector));
  return {
    occupationCount: OCCUPATION_SNAPSHOT.length,
    uniqueOccupationSectorCount: allOccupationSectors.size,
    coveredOccupationSectorCount: covered.length,
    uncoveredOccupationSectors: uncovered.sort((a, b) => a.localeCompare(b)),
  };
}

function annualizedVolatility(points) {
  const returns = [];
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1].close;
    const next = points[index].close;
    if (prev > 0 && next > 0) returns.push(Math.log(next / prev));
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

function maxDrawdown(points) {
  let peak = points[0].close;
  let worst = 0;
  for (const point of points) {
    peak = Math.max(peak, point.close);
    worst = Math.min(worst, point.close / peak - 1);
  }
  return worst;
}

function returnSince(points, startDate) {
  const startPoint = points.find((point) => point.date >= startDate);
  const latest = points.at(-1);
  if (!startPoint || !latest || startPoint.date === latest.date) return null;
  return latest.close / startPoint.close - 1;
}

function monthlyDownsample(points) {
  const byMonth = new Map();
  for (const point of points) {
    byMonth.set(point.date.slice(0, 7), point);
  }
  return [...byMonth.values()].map((point) => ({
    date: point.date,
    close: round(point.close, 2),
  }));
}

function yearsBefore(date, years) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCFullYear(parsed.getUTCFullYear() - years);
  return parsed.toISOString().slice(0, 10);
}

function maxDate(dates) {
  return dates.filter(Boolean).sort((a, b) => a.localeCompare(b)).at(-1) ?? null;
}

function normalize(value, min, max) {
  if (value == null || !Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) return 0;
  if (max === min) return 0.5;
  return clamp((value - min) / (max - min), 0, 1);
}

function classifyScore(score) {
  if (score >= 70) return "High descriptive sensitivity";
  if (score >= 40) return "Moderate descriptive sensitivity";
  return "Low descriptive sensitivity";
}

function toFiniteNumber(value) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function roundNullable(value, digits = 6) {
  return value == null ? null : round(value, digits);
}

function round(value, digits = 6) {
  if (value == null || !Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

main().catch((err) => {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
});
