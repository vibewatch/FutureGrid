// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AICompanyStockLens from "@/components/insights/AICompanyStockLens";
import { analysisEn } from "@/lib/i18n/messages/en/analysis";
import { analysisZh } from "@/lib/i18n/messages/zh/analysis";
import type {
  AICompanyStockMetrics,
  AICompanyStockReturns,
  AICompanyStocksData,
} from "@/lib/ai-company-stocks";

vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => ({ locale: "en" as const, setLocale: vi.fn() }),
}));

const FORBIDDEN_WORDING = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b/i,
  /\boutperform\b/i,
  /\bprice target\b/i,
  /\bshould invest\b/i,
];

function emptyReturns(): AICompanyStockReturns {
  return {
    "1M": null,
    "3M": null,
    "6M": null,
    YTD: null,
    "1Y": null,
    fullPeriod: null,
  };
}

function emptyLeaders(): AICompanyStocksData["summary"]["topGainers"] {
  return {
    "1M": [],
    "3M": [],
    "6M": [],
    YTD: [],
    "1Y": [],
    fullPeriod: [],
  };
}

function metrics(
  overrides: Omit<Partial<AICompanyStockMetrics>, "returns"> & {
    returns?: Partial<AICompanyStockReturns>;
  },
): AICompanyStockMetrics {
  const { returns, ...rest } = overrides;

  return {
    startDate: "2025-07-01",
    latestDate: "2026-07-02",
    latestClose: 100,
    observationCount: 13,
    observationInterval: "1mo",
    returns: {
      ...emptyReturns(),
      ...returns,
    },
    annualizedVolatility: 0.31,
    maxDrawdown: -0.18,
    momentum50d: null,
    momentum200d: null,
    ...rest,
  };
}

const fixture: AICompanyStocksData = {
  generatedAt: "2026-07-03T00:00:00.000Z",
  meta: {
    generatedAt: "2026-07-03T00:00:00.000Z",
    asOf: "2026-07-02",
    source: { name: "Fixture source" },
    version: "1.0.0",
  },
  source: {
    name: "Static adjusted-close fixture",
    access: "Committed deterministic test fixture",
    sourceMode: "committed-static-fixture",
    endpoint: "https://example.test/{ticker}",
    caveat: "Fixture caveat: delayed adjusted-close observations only.",
  },
  methodology: {},
  coverage: {},
  benchmarks: [
    {
      id: "spy",
      ticker: "SPY",
      name: "S&P 500 ETF benchmark",
      prices: [],
      metrics: metrics({ returns: { "1Y": 0.12 } }),
      dataQualityNotes: [],
    },
    {
      id: "qqq",
      ticker: "QQQ",
      name: "Nasdaq 100 ETF benchmark",
      prices: [],
      metrics: metrics({ returns: { "1Y": 0.18 } }),
      dataQualityNotes: [],
    },
  ],
  companies: [
    {
      id: "alpha-ai",
      ticker: "AAA",
      name: "Alpha AI Systems",
      primaryCategory: "platforms",
      categories: ["platforms"],
      prices: [],
      metrics: metrics({ returns: { "1M": 0.04, "6M": 0.22, "1Y": 0.36 } }),
      relativeReturns: {
        qqq: { ...metrics({ returns: { "1Y": 0.18 } }).returns, "1Y": 0.18 },
        spy: { ...metrics({ returns: { "1Y": 0.24 } }).returns, "1Y": 0.24 },
      },
      categoryRanks: [],
      dataQualityNotes: [],
    },
    {
      id: "beta-compute",
      ticker: "BBB",
      name: "Beta Compute",
      primaryCategory: "infrastructure",
      categories: ["infrastructure"],
      prices: [],
      metrics: metrics({
        returns: { "1M": -0.02, "6M": 0.08, "1Y": -0.05 },
        maxDrawdown: -0.27,
        annualizedVolatility: 0.42,
      }),
      relativeReturns: {
        qqq: { ...metrics({ returns: { "1Y": -0.23 } }).returns, "1Y": -0.23 },
        spy: { ...metrics({ returns: { "1Y": -0.17 } }).returns, "1Y": -0.17 },
      },
      categoryRanks: [],
      dataQualityNotes: [],
    },
    {
      id: "gamma-data",
      ticker: "CCC",
      name: "Gamma Data Center",
      primaryCategory: "infrastructure",
      categories: ["infrastructure"],
      prices: [],
      metrics: metrics({ returns: { "1M": 0.01, "6M": -0.04, "1Y": 0.11 } }),
      relativeReturns: {
        qqq: { ...metrics({ returns: { "1Y": -0.07 } }).returns, "1Y": -0.07 },
        spy: { ...metrics({ returns: { "1Y": -0.01 } }).returns, "1Y": -0.01 },
      },
      categoryRanks: [],
      dataQualityNotes: [],
    },
  ],
  categories: [
    {
      id: "platforms",
      label: "AI platforms",
      companyCount: 1,
      tickers: ["AAA"],
      breadth: { positive1Y: 1 },
      topGainers1Y: [],
      laggards1Y: [],
    },
    {
      id: "infrastructure",
      label: "AI infrastructure",
      companyCount: 2,
      tickers: ["BBB", "CCC"],
      breadth: { positive1Y: 1 },
      topGainers1Y: [],
      laggards1Y: [],
    },
  ],
  summary: {
    companyCount: 3,
    benchmarkCount: 2,
    latestDate: "2026-07-02",
    benchmarkTickers: ["SPY", "QQQ"],
    topGainers: emptyLeaders(),
    laggards: emptyLeaders(),
    breadth: { positive1Y: 2 },
    benchmarkLatestClose: { SPY: 600, QQQ: 500 },
    caveats: ["Descriptive historical signals only; not investment advice, not a forecast, and not a recommendation."],
  },
};

describe("AICompanyStockLens", () => {
  it("renders title, caveat, KPI cards, accessible chart/list/table, and source caveat", () => {
    render(<AICompanyStockLens data={fixture} />);

    expect(screen.getAllByText("AI company stock signals").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Delayed historical adjusted-close data/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/not investment advice/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Companies tracked")).toBeInTheDocument();
    expect(screen.getByText("Latest date")).toBeInTheDocument();
    expect(screen.getAllByText("Positive 1Y breadth").length).toBeGreaterThan(0);
    expect(screen.getByText("Benchmark basket")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    expect(screen.getByText("SPY / QQQ")).toBeInTheDocument();

    expect(screen.getByRole("img", { name: /category breadth/i })).toBeInTheDocument();
    const textEquivalent = screen.getByLabelText("AI company stock category text equivalents");
    expect(within(textEquivalent).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Relative return vs QQQ / SPY" })).toBeInTheDocument();
    expect(screen.getByText("Alpha AI Systems")).toBeInTheDocument();
    expect(screen.getByText("Static adjusted-close fixture")).toBeInTheDocument();
    expect(screen.getByText("committed-static-fixture")).toBeInTheDocument();
    expect(screen.getByText(/delayed adjusted-close observations only/i)).toBeInTheDocument();
  });

  it("does not render finance recommendation action wording", () => {
    render(<AICompanyStockLens data={fixture} />);
    const renderedText = document.body.textContent ?? "";

    for (const pattern of FORBIDDEN_WORDING) {
      expect(renderedText).not.toMatch(pattern);
    }
  });
});

describe("AI company stock analysis wiring", () => {
  it("keeps English and Chinese analysis i18n keys in parity", () => {
    const enKeys = Object.keys(analysisEn).filter((key) => key.startsWith("aiCompanyStock")).sort();
    const zhKeys = Object.keys(analysisZh).filter((key) => key.startsWith("aiCompanyStock")).sort();

    expect(zhKeys).toEqual(enKeys);
    for (const key of enKeys) {
      expect((analysisZh as Record<string, string>)[key]?.trim().length).toBeGreaterThan(0);
    }
  });

  it("imports the stock helper in /analysis and passes data into AICompanyStockLens", () => {
    const pageSource = readFileSync(path.join(process.cwd(), "app/analysis/page.tsx"), "utf8");
    const insightsSource = readFileSync(path.join(process.cwd(), "components/insights/InsightsView.tsx"), "utf8");

    expect(pageSource).toMatch(/getAICompanyStocksData/);
    expect(pageSource).toMatch(/aiCompanyStocks=\{aiCompanyStocks\}/);
    expect(insightsSource).toMatch(/AICompanyStockLens/);
    expect(insightsSource).toMatch(/data=\{aiCompanyStocks\}/);
  });
});
