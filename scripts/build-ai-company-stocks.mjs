#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildMeta } from "./lib/meta.mjs";
import { validateAICompanyStocks } from "./lib/validate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const OUTPUT_FILE = path.join(DATA_DIR, "ai-company-stocks.json");

const START_DATE = process.env.AI_COMPANY_STOCKS_START_DATE || "2024-01-01";
const ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query";
const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}";
const ALPHA_VANTAGE_DELAY_MS = Number(process.env.ALPHA_VANTAGE_DELAY_MS || 12_500);
const YAHOO_CHART_DELAY_MS = Number(process.env.YAHOO_CHART_DELAY_MS || 250);
const BOOTSTRAP_YAHOO = process.env.AI_COMPANY_STOCKS_BOOTSTRAP_YAHOO === "1";
const USER_AGENT = "FutureGrid/1.0 AI company stocks data build (+https://github.com)";
const DAY_MS = 86_400_000;

const RETURN_PERIODS = [
  { key: "1M", days: 31 },
  { key: "3M", days: 92 },
  { key: "6M", days: 183 },
  { key: "YTD", ytd: true },
  { key: "1Y", days: 365 },
  { key: "fullPeriod", full: true },
];

const BENCHMARKS = [
  { id: "spy", ticker: "SPY", name: "S&P 500 ETF benchmark" },
  { id: "qqq", ticker: "QQQ", name: "Nasdaq-100 ETF benchmark" },
  { id: "sox", ticker: "SOXX", name: "Semiconductor benchmark proxy (SOXX ETF)" },
];

const PRICE_SYMBOL_OVERRIDES = {
  PSTG: "P",
};

const CATEGORIES = [
  {
    id: "semis-equipment-eda",
    label: "Semiconductors, equipment & EDA",
    tickers: [
      "NVDA",
      "AMD",
      "AVGO",
      "TSM",
      "ASML",
      "AMAT",
      "SNPS",
      "ARM",
      "INTC",
      "MU",
      "MRVL",
      "QCOM",
      "LRCX",
      "KLAC",
      "CDNS",
      "ALAB",
    ],
  },
  {
    id: "cloud-platforms",
    label: "Cloud and AI platforms",
    tickers: ["MSFT", "GOOGL", "AMZN", "META", "ORCL", "IBM", "SAP", "BABA", "BIDU"],
  },
  {
    id: "ai-cloud-infrastructure",
    label: "AI cloud, platforms & infrastructure",
    tickers: ["MSFT", "GOOGL", "AMZN", "META", "ORCL", "IBM", "SAP", "CRWV", "NBIS", "BABA", "BIDU"],
  },
  {
    id: "public-model-lab-proxies",
    label: "Public model-lab proxies",
    tickers: ["MSFT", "GOOGL", "AMZN", "META"],
  },
  {
    id: "enterprise-ai-software",
    label: "Enterprise AI software",
    tickers: ["PLTR", "CRM", "NOW", "ADBE", "SNOW", "AI", "DDOG", "MDB", "NET"],
  },
  {
    id: "data-center-power-networking",
    label: "Data center, power & networking",
    tickers: ["ANET", "ETN", "VRT", "SMCI", "DELL", "CSCO", "HPE", "GEV", "PSTG", "CLS", "CRDO"],
  },
  {
    id: "ai-memory-interconnect-storage",
    label: "AI memory, interconnect & storage",
    tickers: ["MU", "MRVL", "ALAB", "PSTG", "CRDO", "HPE", "DELL", "CLS"],
  },
];

const COMPANIES = [
  { ticker: "NVDA", name: "NVIDIA", primaryCategory: "semis-equipment-eda" },
  { ticker: "AMD", name: "Advanced Micro Devices", primaryCategory: "semis-equipment-eda" },
  { ticker: "AVGO", name: "Broadcom", primaryCategory: "semis-equipment-eda" },
  { ticker: "TSM", name: "Taiwan Semiconductor Manufacturing", primaryCategory: "semis-equipment-eda" },
  { ticker: "ASML", name: "ASML", primaryCategory: "semis-equipment-eda" },
  { ticker: "AMAT", name: "Applied Materials", primaryCategory: "semis-equipment-eda" },
  { ticker: "SNPS", name: "Synopsys", primaryCategory: "semis-equipment-eda" },
  { ticker: "ARM", name: "Arm Holdings", primaryCategory: "semis-equipment-eda" },
  { ticker: "INTC", name: "Intel", primaryCategory: "semis-equipment-eda" },
  { ticker: "MU", name: "Micron Technology", primaryCategory: "semis-equipment-eda" },
  { ticker: "MRVL", name: "Marvell Technology", primaryCategory: "semis-equipment-eda" },
  { ticker: "QCOM", name: "Qualcomm", primaryCategory: "semis-equipment-eda" },
  { ticker: "LRCX", name: "Lam Research", primaryCategory: "semis-equipment-eda" },
  { ticker: "KLAC", name: "KLA", primaryCategory: "semis-equipment-eda" },
  { ticker: "CDNS", name: "Cadence Design Systems", primaryCategory: "semis-equipment-eda" },
  { ticker: "ALAB", name: "Astera Labs", primaryCategory: "semis-equipment-eda" },
  { ticker: "MSFT", name: "Microsoft", primaryCategory: "cloud-platforms" },
  { ticker: "GOOGL", name: "Alphabet", primaryCategory: "cloud-platforms" },
  { ticker: "AMZN", name: "Amazon", primaryCategory: "cloud-platforms" },
  { ticker: "META", name: "Meta Platforms", primaryCategory: "cloud-platforms" },
  { ticker: "ORCL", name: "Oracle", primaryCategory: "cloud-platforms" },
  { ticker: "IBM", name: "IBM", primaryCategory: "ai-cloud-infrastructure" },
  { ticker: "SAP", name: "SAP", primaryCategory: "ai-cloud-infrastructure" },
  { ticker: "CRWV", name: "CoreWeave", primaryCategory: "ai-cloud-infrastructure" },
  { ticker: "NBIS", name: "Nebius Group", primaryCategory: "ai-cloud-infrastructure" },
  { ticker: "BABA", name: "Alibaba Group", primaryCategory: "ai-cloud-infrastructure" },
  { ticker: "BIDU", name: "Baidu", primaryCategory: "ai-cloud-infrastructure" },
  { ticker: "PLTR", name: "Palantir", primaryCategory: "enterprise-ai-software" },
  { ticker: "CRM", name: "Salesforce", primaryCategory: "enterprise-ai-software" },
  { ticker: "NOW", name: "ServiceNow", primaryCategory: "enterprise-ai-software" },
  { ticker: "ADBE", name: "Adobe", primaryCategory: "enterprise-ai-software" },
  { ticker: "SNOW", name: "Snowflake", primaryCategory: "enterprise-ai-software" },
  { ticker: "AI", name: "C3.ai", primaryCategory: "enterprise-ai-software" },
  { ticker: "DDOG", name: "Datadog", primaryCategory: "enterprise-ai-software" },
  { ticker: "MDB", name: "MongoDB", primaryCategory: "enterprise-ai-software" },
  { ticker: "NET", name: "Cloudflare", primaryCategory: "enterprise-ai-software" },
  { ticker: "ANET", name: "Arista Networks", primaryCategory: "data-center-power-networking" },
  { ticker: "ETN", name: "Eaton", primaryCategory: "data-center-power-networking" },
  { ticker: "VRT", name: "Vertiv", primaryCategory: "data-center-power-networking" },
  { ticker: "SMCI", name: "Super Micro Computer", primaryCategory: "data-center-power-networking" },
  { ticker: "DELL", name: "Dell Technologies", primaryCategory: "data-center-power-networking" },
  { ticker: "CSCO", name: "Cisco Systems", primaryCategory: "data-center-power-networking" },
  { ticker: "HPE", name: "Hewlett Packard Enterprise", primaryCategory: "data-center-power-networking" },
  { ticker: "GEV", name: "GE Vernova", primaryCategory: "data-center-power-networking" },
  { ticker: "PSTG", name: "Pure Storage", primaryCategory: "ai-memory-interconnect-storage" },
  { ticker: "CLS", name: "Celestica", primaryCategory: "ai-memory-interconnect-storage" },
  { ticker: "CRDO", name: "Credo Technology Group", primaryCategory: "ai-memory-interconnect-storage" },
];

async function main() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  const apiKey = process.env.ALPHA_VANTAGE_API_KEY?.trim();
  const symbols = [...new Set([...COMPANIES.map((c) => c.ticker), ...BENCHMARKS.map((b) => b.ticker)])];
  const generatedAt = apiKey ? new Date().toISOString() : null;
  const sourceInput = apiKey
    ? await loadAlphaVantagePrices(symbols, apiKey)
    : BOOTSTRAP_YAHOO
      ? await loadYahooChartFixturePrices(symbols)
      : loadCommittedFixturePrices(symbols);

  const output = buildDataset({
    priceByTicker: sourceInput.priceByTicker,
    sourceMode: sourceInput.sourceMode,
    loaderMode: sourceInput.loaderMode,
    observationInterval: sourceInput.observationInterval,
    generatedAt: generatedAt || sourceInput.generatedAt,
    fixtureAsOf: sourceInput.fixtureAsOf,
    committedFixtureBootstrapMode: sourceInput.committedFixtureBootstrapMode,
    committedFallbackBehavior: sourceInput.committedFallbackBehavior,
  });

  validateAICompanyStocks(output);
  writeFileSync(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`);
  console.log(
    `[build-ai-company-stocks] wrote ${output.companies.length} companies, ` +
      `${output.benchmarks.length} benchmarks (${output.coverage.sourceMode}) -> ${OUTPUT_FILE}`,
  );
}

async function loadAlphaVantagePrices(symbols, apiKey) {
  const priceByTicker = new Map();
  for (const [index, symbol] of symbols.entries()) {
    if (index > 0 && ALPHA_VANTAGE_DELAY_MS > 0) await sleep(ALPHA_VANTAGE_DELAY_MS);
    priceByTicker.set(symbol, await fetchAlphaVantageDailyAdjusted(priceSymbolFor(symbol), apiKey));
  }
  return {
    priceByTicker,
    generatedAt: new Date().toISOString(),
    fixtureAsOf: null,
    sourceMode: "alpha-vantage-daily-adjusted",
    loaderMode: "alpha-vantage",
    observationInterval: "1d",
  };
}

async function loadYahooChartFixturePrices(symbols) {
  const priceByTicker = new Map();
  for (const [index, symbol] of symbols.entries()) {
    if (index > 0 && YAHOO_CHART_DELAY_MS > 0) await sleep(YAHOO_CHART_DELAY_MS);
    priceByTicker.set(symbol, await fetchYahooMonthlyAdjusted(priceSymbolFor(symbol)));
  }
  return {
    priceByTicker,
    generatedAt: new Date().toISOString(),
    fixtureAsOf: null,
    sourceMode: "committed-static-fixture",
    loaderMode: "yahoo-chart-bootstrap",
    observationInterval: "1mo",
  };
}

function loadCommittedFixturePrices(symbols) {
  if (!existsSync(OUTPUT_FILE)) {
    throw new Error(
      "ALPHA_VANTAGE_API_KEY is not set and data/ai-company-stocks.json is missing. " +
        "Provide ALPHA_VANTAGE_API_KEY to build from Alpha Vantage, set AI_COMPANY_STOCKS_BOOTSTRAP_YAHOO=1 " +
        "for an explicit Yahoo chart bootstrap, or commit a source-attributed fixture first.",
    );
  }

  const fixture = JSON.parse(readFileSync(OUTPUT_FILE, "utf8"));
  const rows = [...(Array.isArray(fixture.companies) ? fixture.companies : []), ...(Array.isArray(fixture.benchmarks) ? fixture.benchmarks : [])];
  const priceByTicker = new Map();
  for (const row of rows) {
    const ticker = typeof row?.ticker === "string" ? row.ticker.toUpperCase() : null;
    if (!ticker || !Array.isArray(row.prices)) continue;
    priceByTicker.set(ticker, normalizePrices(row.prices));
  }

  const missing = symbols.filter((symbol) => !priceByTicker.has(symbol));
  if (missing.length > 0) {
    throw new Error(`[build-ai-company-stocks] committed fixture is missing ticker(s): ${missing.join(", ")}`);
  }

  return {
    priceByTicker,
    generatedAt: fixture.meta?.generatedAt || fixture.generatedAt || "2026-07-03T00:00:00.000Z",
    fixtureAsOf: fixture.coverage?.latestDate || fixture.meta?.asOf || null,
    sourceMode: "committed-static-fixture",
    loaderMode: "committed-fixture",
    observationInterval: fixture.coverage?.observationInterval || "1mo",
    // Preserve committed fixture's origin metadata so offline deterministic rebuilds
    // are byte-for-byte identical regardless of how the fixture was originally bootstrapped.
    committedFixtureBootstrapMode: fixture.coverage?.fixtureBootstrapMode ?? null,
    committedFallbackBehavior: fixture.coverage?.fallbackBehavior ?? null,
  };
}

async function fetchAlphaVantageDailyAdjusted(symbol, apiKey) {
  const url = new URL(ALPHA_VANTAGE_URL);
  url.searchParams.set("function", "TIME_SERIES_DAILY_ADJUSTED");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("outputsize", "full");
  url.searchParams.set("apikey", apiKey);

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) throw new Error(`Alpha Vantage ${symbol} HTTP ${res.status}`);

  const json = await res.json();
  if (json.Note || json.Information) {
    throw new Error(`Alpha Vantage ${symbol}: ${json.Note || json.Information}`);
  }
  if (json["Error Message"]) throw new Error(`Alpha Vantage ${symbol}: ${json["Error Message"]}`);

  const series = json["Time Series (Daily)"];
  if (!series || typeof series !== "object" || Array.isArray(series)) {
    throw new Error(`Alpha Vantage ${symbol}: missing Time Series (Daily)`);
  }

  const points = Object.entries(series)
    .map(([date, row]) => ({
      date,
      close: round(toFiniteNumber(row?.["5. adjusted close"]) ?? toFiniteNumber(row?.["4. close"]), 6),
    }))
    .filter((point) => point.date >= START_DATE && point.close != null && point.close > 0);

  const normalized = normalizePrices(points);
  if (normalized.length < 2) {
    throw new Error(`Alpha Vantage ${symbol}: fewer than two usable adjusted close observations`);
  }
  return normalized;
}

async function fetchYahooMonthlyAdjusted(symbol) {
  const period1 = Math.floor(new Date(`${START_DATE}T00:00:00Z`).getTime() / 1000);
  const period2 = Math.floor((Date.now() + DAY_MS) / 1000);
  const url = new URL(YAHOO_CHART_URL.replace("{ticker}", encodeURIComponent(symbol)));
  url.searchParams.set("period1", String(period1));
  url.searchParams.set("period2", String(period2));
  url.searchParams.set("interval", "1mo");
  url.searchParams.set("events", "history");
  url.searchParams.set("includeAdjustedClose", "true");

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) throw new Error(`Yahoo chart ${symbol} HTTP ${res.status}`);

  const json = await res.json();
  const chartError = json?.chart?.error;
  if (chartError) {
    throw new Error(`Yahoo chart ${symbol}: ${chartError.code ?? "error"} ${chartError.description ?? ""}`.trim());
  }
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`Yahoo chart ${symbol}: missing result`);

  const timestamps = Array.isArray(result.timestamp) ? result.timestamp : [];
  const close = Array.isArray(result.indicators?.quote?.[0]?.close) ? result.indicators.quote[0].close : [];
  const adjustedClose = Array.isArray(result.indicators?.adjclose?.[0]?.adjclose)
    ? result.indicators.adjclose[0].adjclose
    : [];
  const points = [];
  for (let index = 0; index < timestamps.length; index += 1) {
    const adjusted = toFiniteNumber(adjustedClose[index]);
    const rawClose = toFiniteNumber(close[index]);
    const price = adjusted ?? rawClose;
    if (price == null || price <= 0) continue;
    points.push({
      date: new Date(timestamps[index] * 1000).toISOString().slice(0, 10),
      close: round(price, 6),
    });
  }

  const normalized = normalizePrices(points.filter((point) => point.date >= START_DATE));
  if (normalized.length < 2) {
    throw new Error(`Yahoo chart ${symbol}: fewer than two usable monthly adjusted close observations`);
  }
  return normalized;
}

function buildDataset({ priceByTicker, sourceMode, loaderMode, observationInterval, generatedAt, fixtureAsOf, committedFixtureBootstrapMode, committedFallbackBehavior }) {
  const benchmarks = BENCHMARKS.map((benchmark) => {
    const prices = priceByTicker.get(benchmark.ticker) || [];
    return {
      ...benchmark,
      prices,
      metrics: computeMetrics(prices, observationInterval),
      dataQualityNotes: buildDataQualityNotes(benchmark.ticker, prices, sourceMode, observationInterval),
    };
  });

  const benchmarkById = new Map(benchmarks.map((benchmark) => [benchmark.id, benchmark]));
  const benchmarkByTicker = new Map(benchmarks.map((benchmark) => [benchmark.ticker, benchmark]));
  const companies = COMPANIES.map((company) => {
    const categories = categoriesForTicker(company.ticker);
    const prices = priceByTicker.get(company.ticker) || [];
    const metrics = computeMetrics(prices, observationInterval);
    return {
      id: company.ticker.toLowerCase(),
      ticker: company.ticker,
      name: company.name,
      primaryCategory: company.primaryCategory,
      categories,
      prices,
      metrics,
      relativeReturns: Object.fromEntries(
        BENCHMARKS.map((benchmark) => [
          benchmark.id,
          relativeReturns(metrics.returns, benchmarkById.get(benchmark.id)?.metrics?.returns),
        ]),
      ),
      categoryRanks: [],
      dataQualityNotes: buildDataQualityNotes(company.ticker, prices, sourceMode, observationInterval),
    };
  });

  applyCategoryRanks(companies);
  const categorySummaries = CATEGORIES.map((category) => summarizeCategory(category, companies));
  const latestDate = maxDate([...companies, ...benchmarks].map((row) => row.metrics.latestDate));
  const earliestDate = minDate([...companies, ...benchmarks].map((row) => row.metrics.startDate));

  return {
    generatedAt,
    meta: buildMeta({
      generatedAt,
      asOf: latestDate || fixtureAsOf || generatedAt.slice(0, 10),
      source: {
        name:
          sourceMode === "alpha-vantage-daily-adjusted"
            ? "Alpha Vantage TIME_SERIES_DAILY_ADJUSTED"
            : "Committed AI company stock fixture derived from FutureGrid's accepted market-signal source pattern",
        publisher: sourceMode === "alpha-vantage-daily-adjusted" ? "Alpha Vantage" : "FutureGrid",
        url:
          sourceMode === "alpha-vantage-daily-adjusted"
            ? ALPHA_VANTAGE_URL
            : "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}",
      },
    }),
    source: {
      name:
        sourceMode === "alpha-vantage-daily-adjusted"
          ? "Alpha Vantage TIME_SERIES_DAILY_ADJUSTED"
          : "Static adjusted-close fixture sourced from Yahoo Finance chart JSON",
      access:
        sourceMode === "alpha-vantage-daily-adjusted"
          ? "Documented API using ALPHA_VANTAGE_API_KEY"
          : "Committed fixture; no network or credentials required for CI rebuilds",
      sourceMode,
      endpoint:
        sourceMode === "alpha-vantage-daily-adjusted"
          ? `${ALPHA_VANTAGE_URL}?function=TIME_SERIES_DAILY_ADJUSTED&symbol={ticker}&outputsize=full&apikey=...`
          : "https://query1.finance.yahoo.com/v8/finance/chart/{ticker}",
      caveat:
        sourceMode === "alpha-vantage-daily-adjusted"
          ? "Alpha Vantage responses depend on account limits and API availability; values are descriptive historical adjusted closes only."
          : "Fixture was bootstrapped from the same public Yahoo chart JSON source already used by data/market-ai-signals.json; Yahoo is unofficial/undocumented and may change, so CI uses only the committed fixture unless ALPHA_VANTAGE_API_KEY is supplied.",
    },
    methodology: {
      feature:
        "Historical AI company stock insight layer for /analysis; descriptive only, not financial advice, not a forecast, and not a recommendation.",
      watchlist:
        "Public companies are grouped into AI semiconductors/equipment/EDA, cloud/platform infrastructure, model-lab proxy, enterprise/data AI software, data-center power/networking, and AI memory/interconnect/storage categories.",
      priceField:
        sourceMode === "alpha-vantage-daily-adjusted"
          ? "Alpha Vantage adjusted close from TIME_SERIES_DAILY_ADJUSTED."
          : "Committed monthly adjusted close fixture; metrics use the available observation interval.",
      metrics:
        "Returns are computed for 1M, 3M, 6M, YTD, 1Y, and full available window when price history supports the period. Volatility is annualized from log returns; drawdown uses the available close series; period returns and 50/200 day momentum use the latest available observation on or before target dates.",
      benchmarks:
        "Relative returns compare the same period return against SPY, QQQ, and a SOXX semiconductor proxy for SOX when benchmark observations exist.",
      safeguards:
        "The dataset emits null for unsupported metrics and intentionally excludes forecasts, guarantees, and trading-action labels.",
    },
    coverage: {
      sourceMode,
      observationInterval,
      startDate: earliestDate,
      latestDate,
      companyCount: companies.length,
      benchmarkCount: benchmarks.length,
      categories: CATEGORIES.map(({ id, label, tickers }) => ({ id, label, tickerCount: tickers.length })),
      alphaVantageKeyRequired: sourceMode === "alpha-vantage-daily-adjusted",
      // When rebuilding from a committed fixture, preserve the fixture's origin metadata
      // verbatim so the output is byte-for-byte identical to what was last committed.
      // Yahoo-bootstrap and Alpha Vantage runs always write their own descriptive values.
      fallbackBehavior:
        loaderMode === "yahoo-chart-bootstrap"
          ? "AI_COMPANY_STOCKS_BOOTSTRAP_YAHOO=1 was set; builder refreshed the committed fixture from Yahoo chart JSON. Default CI rebuilds omit this flag and reuse committed observations without network access."
          : loaderMode === "committed-fixture" && committedFallbackBehavior != null
          ? committedFallbackBehavior
          : sourceMode === "committed-static-fixture"
          ? "ALPHA_VANTAGE_API_KEY was absent; builder reused committed source-attributed price observations."
          : "ALPHA_VANTAGE_API_KEY was present; builder fetched documented daily adjusted observations.",
      fixtureBootstrapMode:
        loaderMode === "yahoo-chart-bootstrap"
          ? "yahoo-chart-json"
          : loaderMode === "committed-fixture"
          ? (committedFixtureBootstrapMode ?? null)
          : null,
    },
    benchmarks,
    companies: companies.sort((a, b) => a.ticker.localeCompare(b.ticker)),
    categories: categorySummaries,
    summary: buildSummary(companies, benchmarks, benchmarkByTicker),
  };
}

function computeMetrics(points, observationInterval) {
  const normalized = normalizePrices(points);
  const first = normalized[0] || null;
  const latest = normalized.at(-1) || null;
  const returns = {};
  for (const period of RETURN_PERIODS) {
    returns[period.key] = latest ? roundNullable(returnForPeriod(normalized, latest.date, period)) : null;
  }
  return {
    startDate: first?.date || null,
    latestDate: latest?.date || null,
    latestClose: latest ? round(latest.close, 2) : null,
    observationCount: normalized.length,
    observationInterval,
    returns,
    annualizedVolatility: roundNullable(annualizedVolatility(normalized, observationInterval)),
    maxDrawdown: roundNullable(maxDrawdown(normalized)),
    momentum50d: latest ? roundNullable(returnSinceDays(normalized, latest.date, 50)) : null,
    momentum200d: latest ? roundNullable(returnSinceDays(normalized, latest.date, 200)) : null,
  };
}

function returnForPeriod(points, latestDate, period) {
  if (period.full) {
    const first = points[0];
    const latest = points.at(-1);
    return first && latest && first.date !== latest.date ? latest.close / first.close - 1 : null;
  }
  if (period.ytd) return returnSinceDate(points, `${latestDate.slice(0, 4)}-01-01`);
  return returnSinceDays(points, latestDate, period.days);
}

function returnSinceDays(points, latestDate, days) {
  return returnSinceDate(points, shiftDate(latestDate, -days));
}

export function returnSinceDate(points, targetDate) {
  const latest = points.at(-1);
  const start = latestObservationOnOrBefore(points, targetDate);
  if (!start || !latest || start.date === latest.date) return null;
  return latest.close / start.close - 1;
}

function latestObservationOnOrBefore(points, targetDate) {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    if (points[index].date <= targetDate) return points[index];
  }
  return null;
}

function annualizedVolatility(points, observationInterval) {
  const returns = [];
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1].close;
    const next = points[index].close;
    if (prev > 0 && next > 0) returns.push(Math.log(next / prev));
  }
  if (returns.length < 2) return null;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  const periodsPerYear = observationInterval === "1d" ? 252 : 12;
  return Math.sqrt(variance) * Math.sqrt(periodsPerYear);
}

function maxDrawdown(points) {
  if (points.length === 0) return null;
  let peak = points[0].close;
  let worst = 0;
  for (const point of points) {
    peak = Math.max(peak, point.close);
    worst = Math.min(worst, point.close / peak - 1);
  }
  return worst;
}

function relativeReturns(companyReturns, benchmarkReturns) {
  const out = {};
  for (const period of RETURN_PERIODS) {
    const companyValue = companyReturns?.[period.key];
    const benchmarkValue = benchmarkReturns?.[period.key];
    out[period.key] =
      companyValue == null || benchmarkValue == null ? null : round(companyValue - benchmarkValue);
  }
  return out;
}

function applyCategoryRanks(companies) {
  for (const category of CATEGORIES) {
    const members = companies.filter((company) => company.categories.includes(category.id));
    const oneYearRanks = rankBy(members, (company) => company.metrics.returns["1Y"]);
    const ytdRanks = rankBy(members, (company) => company.metrics.returns.YTD);
    const momentumRanks = rankBy(members, (company) => company.metrics.momentum200d);
    for (const company of members) {
      company.categoryRanks.push({
        categoryId: category.id,
        oneYearReturnRank: oneYearRanks.get(company.ticker) ?? null,
        ytdReturnRank: ytdRanks.get(company.ticker) ?? null,
        momentum200dRank: momentumRanks.get(company.ticker) ?? null,
        memberCount: members.length,
      });
    }
  }
}

function summarizeCategory(category, companies) {
  const members = companies.filter((company) => company.categories.includes(category.id));
  const positiveCount = (period) => members.filter((company) => (company.metrics.returns[period] ?? 0) > 0).length;
  return {
    id: category.id,
    label: category.label,
    companyCount: members.length,
    tickers: members.map((company) => company.ticker).sort(),
    breadth: {
      positive1M: positiveCount("1M"),
      positive3M: positiveCount("3M"),
      positive6M: positiveCount("6M"),
      positiveYTD: positiveCount("YTD"),
      positive1Y: positiveCount("1Y"),
      above50dMomentum: members.filter((company) => (company.metrics.momentum50d ?? 0) > 0).length,
      above200dMomentum: members.filter((company) => (company.metrics.momentum200d ?? 0) > 0).length,
    },
    topGainers1Y: summarizeLeaders(members, "1Y", 3, "desc"),
    laggards1Y: summarizeLeaders(members, "1Y", 3, "asc"),
  };
}

function buildSummary(companies, benchmarks, benchmarkByTicker) {
  return {
    companyCount: companies.length,
    benchmarkCount: benchmarks.length,
    latestDate: maxDate([...companies, ...benchmarks].map((row) => row.metrics.latestDate)),
    benchmarkTickers: benchmarks.map((benchmark) => benchmark.ticker),
    topGainers: Object.fromEntries(RETURN_PERIODS.map((period) => [period.key, summarizeLeaders(companies, period.key, 5, "desc")])),
    laggards: Object.fromEntries(RETURN_PERIODS.map((period) => [period.key, summarizeLeaders(companies, period.key, 5, "asc")])),
    breadth: {
      positive1M: companies.filter((company) => (company.metrics.returns["1M"] ?? 0) > 0).length,
      positive3M: companies.filter((company) => (company.metrics.returns["3M"] ?? 0) > 0).length,
      positive6M: companies.filter((company) => (company.metrics.returns["6M"] ?? 0) > 0).length,
      positiveYTD: companies.filter((company) => (company.metrics.returns.YTD ?? 0) > 0).length,
      positive1Y: companies.filter((company) => (company.metrics.returns["1Y"] ?? 0) > 0).length,
      aboveSpy1Y: companies.filter((company) => (company.relativeReturns.spy?.["1Y"] ?? 0) > 0).length,
      aboveQqq1Y: companies.filter((company) => (company.relativeReturns.qqq?.["1Y"] ?? 0) > 0).length,
      aboveSoxProxy1Y: companies.filter((company) => (company.relativeReturns.sox?.["1Y"] ?? 0) > 0).length,
    },
    benchmarkLatestClose: Object.fromEntries(
      ["SPY", "QQQ", "SOXX"].map((ticker) => [ticker, benchmarkByTicker.get(ticker)?.metrics.latestClose ?? null]),
    ),
    caveats: [
      "Descriptive historical signals only; no investment advice, no forecast, and no guaranteed future outcome.",
      "Company selection is a small AI watchlist and is not a complete public-market universe.",
      "Relative returns are descriptive benchmark comparisons, not causal estimates of AI exposure.",
      "Static fixture mode exists for credential-free CI reproducibility; set ALPHA_VANTAGE_API_KEY to refresh from the documented Alpha Vantage daily adjusted API.",
    ],
  };
}

function summarizeLeaders(companies, periodKey, limit, direction) {
  return companies
    .map((company) => ({
      ticker: company.ticker,
      name: company.name,
      primaryCategory: company.primaryCategory,
      return: company.metrics.returns[periodKey],
    }))
    .filter((row) => row.return != null)
    .sort((a, b) => (direction === "desc" ? b.return - a.return : a.return - b.return) || a.ticker.localeCompare(b.ticker))
    .slice(0, limit);
}

function rankBy(companies, getValue) {
  const rows = companies
    .map((company) => ({ ticker: company.ticker, value: getValue(company) }))
    .filter((row) => row.value != null && Number.isFinite(row.value))
    .sort((a, b) => b.value - a.value || a.ticker.localeCompare(b.ticker));
  return new Map(rows.map((row, index) => [row.ticker, index + 1]));
}

function categoriesForTicker(ticker) {
  return CATEGORIES.filter((category) => category.tickers.includes(ticker)).map((category) => category.id);
}

function buildDataQualityNotes(ticker, prices, sourceMode, observationInterval) {
  const latest = prices.at(-1)?.date ?? "unknown";
  const sourceTicker = priceSymbolFor(ticker);
  return [
    `${ticker} uses ${prices.length} ${observationInterval} adjusted close observation(s); latest observation ${latest}.`,
    ...(sourceTicker !== ticker ? [`${ticker} price history is sourced with current Yahoo/market symbol ${sourceTicker}.`] : []),
    sourceMode === "alpha-vantage-daily-adjusted"
      ? "Fetched from Alpha Vantage TIME_SERIES_DAILY_ADJUSTED with ALPHA_VANTAGE_API_KEY."
      : "Loaded from committed static fixture because ALPHA_VANTAGE_API_KEY was absent.",
  ];
}

function priceSymbolFor(ticker) {
  return PRICE_SYMBOL_OVERRIDES[ticker] || ticker;
}

function normalizePrices(points) {
  const byDate = new Map();
  for (const point of Array.isArray(points) ? points : []) {
    const date = typeof point?.date === "string" ? point.date.slice(0, 10) : null;
    const close = round(toFiniteNumber(point?.close), 6);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || close == null || close <= 0) continue;
    byDate.set(date, { date, close });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function shiftDate(date, days) {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function minDate(dates) {
  return dates.filter(Boolean).sort((a, b) => a.localeCompare(b)).at(0) ?? null;
}

function maxDate(dates) {
  return dates.filter(Boolean).sort((a, b) => a.localeCompare(b)).at(-1) ?? null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(`ERROR: ${err.message}`);
    process.exit(1);
  });
}
