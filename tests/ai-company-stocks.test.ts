import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";
import packageJson from "@/package.json";
import {
  getAICompanyStockCategories,
  getAICompanyStockCompanies,
  getAICompanyStocksData,
  getTopAICompanyStockGainers,
} from "@/lib/ai-company-stocks";
import { returnSinceDate } from "../scripts/build-ai-company-stocks.mjs";
import { validateAICompanyStocks } from "../scripts/lib/validate.mjs";

const DATA_PATH = path.join(process.cwd(), "data/ai-company-stocks.json");
const PERIODS = ["1M", "3M", "6M", "YTD", "1Y", "fullPeriod"] as const;
const EXPANSION_TICKERS = [
  "ARM",
  "INTC",
  "MU",
  "MRVL",
  "QCOM",
  "LRCX",
  "KLAC",
  "CDNS",
  "ALAB",
  "IBM",
  "SAP",
  "CRWV",
  "NBIS",
  "BABA",
  "BIDU",
  "AI",
  "DDOG",
  "MDB",
  "NET",
  "CSCO",
  "HPE",
  "GEV",
  "PSTG",
  "CLS",
  "CRDO",
] as const;

describe("AI company stock insights data", () => {
  it("ships a validated, source-attributed data file", () => {
    expect(existsSync(DATA_PATH)).toBe(true);
    const snapshot = JSON.parse(readFileSync(DATA_PATH, "utf8"));

    expect(() => validateAICompanyStocks(snapshot)).not.toThrow();
    expect(snapshot.companies.length).toBeGreaterThanOrEqual(47);
    expect(snapshot.benchmarks.map((benchmark: { id: string }) => benchmark.id)).toEqual(
      expect.arrayContaining(["spy", "qqq", "sox"]),
    );
  });

  it("keeps metrics descriptive and period-complete", () => {
    const data = getAICompanyStocksData();
    const text = JSON.stringify({
      source: data.source,
      methodology: data.methodology,
      summary: data.summary,
    });

    expect(text).toMatch(/descriptive/i);
    expect(text).toMatch(/not financial advice|not a recommendation/i);
    expect(data.source.sourceMode).toMatch(/alpha-vantage|committed-static-fixture/);

    for (const company of data.companies) {
      expect(company.categories.length).toBeGreaterThan(0);
      expect(company.categoryRanks.length).toBeGreaterThan(0);
      expect(company.metrics.observationCount).toBe(company.prices.length);
      expect(company.relativeReturns).toEqual(
        expect.objectContaining({
          spy: expect.any(Object),
          qqq: expect.any(Object),
        }),
      );
      for (const period of PERIODS) {
        expect(company.metrics.returns).toHaveProperty(period);
        expect(company.relativeReturns.spy).toHaveProperty(period);
      }
      expect("recommendation" in company).toBe(false);
    }
  });

  it("exposes category summaries and sorted gainers from helpers", () => {
    const categories = getAICompanyStockCategories();
    const companies = getAICompanyStockCompanies();
    const topFive = getTopAICompanyStockGainers("1Y", 5);

    expect(categories.map((category) => category.id)).toEqual(
      expect.arrayContaining([
        "semis-equipment-eda",
        "cloud-platforms",
        "ai-cloud-infrastructure",
        "public-model-lab-proxies",
        "enterprise-ai-software",
        "data-center-power-networking",
        "ai-memory-interconnect-storage",
      ]),
    );
    expect(companies.length).toBeGreaterThanOrEqual(47);
    expect(topFive.length).toBeLessThanOrEqual(5);
    for (let index = 1; index < topFive.length; index += 1) {
      expect(topFive[index].metrics.returns["1Y"] ?? Number.NEGATIVE_INFINITY).toBeLessThanOrEqual(
        topFive[index - 1].metrics.returns["1Y"] ?? Number.NEGATIVE_INFINITY,
      );
    }
  });

  it("includes the expanded AI public-company ticker set with committed price histories", () => {
    const data = getAICompanyStocksData();
    const companyByTicker = new Map(data.companies.map((company) => [company.ticker, company]));

    for (const ticker of EXPANSION_TICKERS) {
      const company = companyByTicker.get(ticker);
      expect(company, ticker).toBeDefined();
      expect(company?.prices.length, ticker).toBeGreaterThanOrEqual(2);
      expect(company?.metrics.observationCount, ticker).toBe(company?.prices.length);
      expect(company?.categoryRanks.length, ticker).toBeGreaterThan(0);
    }

    expect(data.categories.find((category) => category.id === "ai-cloud-infrastructure")?.tickers).toEqual(
      expect.arrayContaining(["CRWV", "NBIS", "BABA", "BIDU"]),
    );
    expect(data.categories.find((category) => category.id === "ai-memory-interconnect-storage")?.tickers).toEqual(
      expect.arrayContaining(["MU", "MRVL", "ALAB", "PSTG", "CRDO"]),
    );
  });
});

describe("build:ai-company-stocks script", () => {
  it("is registered and runs before provenance in build:data", () => {
    const scripts = packageJson.scripts as Record<string, string>;

    expect(scripts["build:ai-company-stocks"]).toEqual(expect.any(String));
    expect(scripts["build:data"]).toContain("build:ai-company-stocks");
    expect(scripts["build:data"].indexOf("build:ai-company-stocks")).toBeLessThan(
      scripts["build:data"].indexOf("build:provenance"),
    );
  });

  it("rebuilds byte-for-byte from committed fixture without credentials or network bootstrap", () => {
    const before = readFileSync(DATA_PATH, "utf8");

    execFileSync(process.execPath, ["scripts/build-ai-company-stocks.mjs"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ALPHA_VANTAGE_API_KEY: "",
        AI_COMPANY_STOCKS_BOOTSTRAP_YAHOO: "",
      },
      stdio: "pipe",
    });

    expect(readFileSync(DATA_PATH, "utf8")).toBe(before);
  });

  it("preserves Yahoo-bootstrap provenance on first offline rebuild (byte-for-byte idempotent)", () => {
    // Reproduce PR #124 failure scenario: committed fixture carries Yahoo-bootstrap
    // coverage metadata; the very first offline rebuild must be byte-identical.
    // This test does NOT use network calls and does not rely on self-healing side effects.
    const originalContent = readFileSync(DATA_PATH, "utf8");

    // Construct a Yahoo-bootstrap-shaped fixture: same prices/metrics, but with the
    // coverage provenance fields that `AI_COMPANY_STOCKS_BOOTSTRAP_YAHOO=1` writes.
    const original = JSON.parse(originalContent) as {
      coverage: Record<string, unknown>;
      [key: string]: unknown;
    };
    const yahooBootstrapped = {
      ...original,
      coverage: {
        ...original.coverage,
        fallbackBehavior:
          "AI_COMPANY_STOCKS_BOOTSTRAP_YAHOO=1 was set; builder refreshed the committed fixture from Yahoo chart JSON. Default CI rebuilds omit this flag and reuse committed observations without network access.",
        fixtureBootstrapMode: "yahoo-chart-json",
      },
    };
    const yahooContent = `${JSON.stringify(yahooBootstrapped, null, 2)}\n`;

    writeFileSync(DATA_PATH, yahooContent);
    try {
      execFileSync(process.execPath, ["scripts/build-ai-company-stocks.mjs"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          ALPHA_VANTAGE_API_KEY: "",
          AI_COMPANY_STOCKS_BOOTSTRAP_YAHOO: "",
        },
        stdio: "pipe",
      });

      // Offline rebuild must be byte-for-byte identical — Yahoo provenance preserved.
      expect(readFileSync(DATA_PATH, "utf8")).toBe(yahooContent);
    } finally {
      writeFileSync(DATA_PATH, originalContent);
    }
  });

  it("uses an on-or-before start observation for sparse monthly 1Y returns", () => {
    const targetDate = "2025-07-02";
    const sparseMonthlyPrices = [
      { date: "2025-07-01", close: 90 },
      { date: "2025-08-01", close: 100 },
      { date: "2026-07-02", close: 120 },
    ];

    expect(sparseMonthlyPrices.find((point) => point.date >= targetDate)?.date).toBe("2025-08-01");
    expect(returnSinceDate(sparseMonthlyPrices, targetDate)).toBeCloseTo(120 / 90 - 1, 6);
  });

  it("emits null when sparse monthly data cannot support the labeled period", () => {
    const sparseMonthlyPrices = [
      { date: "2025-08-01", close: 100 },
      { date: "2026-07-02", close: 120 },
    ];

    expect(returnSinceDate(sparseMonthlyPrices, "2025-07-02")).toBeNull();
  });
});
