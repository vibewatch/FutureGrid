import aiCompanyStocksData from "@/data/ai-company-stocks.json";

export type AICompanyStockReturnPeriod = "1M" | "3M" | "6M" | "YTD" | "1Y" | "fullPeriod";

export interface AICompanyStockSource {
  name: string;
  access: string;
  sourceMode: "alpha-vantage-daily-adjusted" | "committed-static-fixture";
  endpoint: string;
  caveat: string;
}

export interface AICompanyStockPricePoint {
  date: string;
  close: number;
}

export type AICompanyStockReturns = Record<AICompanyStockReturnPeriod, number | null>;

export interface AICompanyStockMetrics {
  startDate: string | null;
  latestDate: string | null;
  latestClose: number | null;
  observationCount: number;
  observationInterval: string;
  returns: AICompanyStockReturns;
  annualizedVolatility: number | null;
  maxDrawdown: number | null;
  momentum50d: number | null;
  momentum200d: number | null;
}

export interface AICompanyStockBenchmark {
  id: string;
  ticker: string;
  name: string;
  prices: AICompanyStockPricePoint[];
  metrics: AICompanyStockMetrics;
  dataQualityNotes: string[];
}

export interface AICompanyStockCategoryRank {
  categoryId: string;
  oneYearReturnRank: number | null;
  ytdReturnRank: number | null;
  momentum200dRank: number | null;
  memberCount: number;
}

export interface AICompanyStockCompany {
  id: string;
  ticker: string;
  name: string;
  primaryCategory: string;
  categories: string[];
  prices: AICompanyStockPricePoint[];
  metrics: AICompanyStockMetrics;
  relativeReturns: Record<string, AICompanyStockReturns>;
  categoryRanks: AICompanyStockCategoryRank[];
  dataQualityNotes: string[];
}

export interface AICompanyStockCategory {
  id: string;
  label: string;
  companyCount: number;
  tickers: string[];
  breadth: Record<string, number>;
  topGainers1Y: Array<{ ticker: string; name: string; primaryCategory: string; return: number | null }>;
  laggards1Y: Array<{ ticker: string; name: string; primaryCategory: string; return: number | null }>;
}

export interface AICompanyStockSummary {
  companyCount: number;
  benchmarkCount: number;
  latestDate: string | null;
  benchmarkTickers: string[];
  topGainers: Record<AICompanyStockReturnPeriod, Array<{ ticker: string; name: string; primaryCategory: string; return: number | null }>>;
  laggards: Record<AICompanyStockReturnPeriod, Array<{ ticker: string; name: string; primaryCategory: string; return: number | null }>>;
  breadth: Record<string, number>;
  benchmarkLatestClose: Record<string, number | null>;
  caveats: string[];
}

export interface AICompanyStocksData {
  generatedAt: string;
  meta: {
    generatedAt: string;
    asOf: string;
    source: unknown;
    version: string;
  };
  source: AICompanyStockSource;
  methodology: Record<string, string>;
  coverage: Record<string, unknown>;
  benchmarks: AICompanyStockBenchmark[];
  companies: AICompanyStockCompany[];
  categories: AICompanyStockCategory[];
  summary: AICompanyStockSummary;
}

const data = aiCompanyStocksData as unknown as AICompanyStocksData;

export function getAICompanyStocksData(): AICompanyStocksData {
  return cloneData(data);
}

export function getAICompanyStockCompanies(): AICompanyStockCompany[] {
  return cloneCompanies(data.companies).sort((a, b) => a.ticker.localeCompare(b.ticker));
}

export function getAICompanyStockBenchmarks(): AICompanyStockBenchmark[] {
  return data.benchmarks.map(cloneBenchmark);
}

export function getAICompanyStockCategories(): AICompanyStockCategory[] {
  return data.categories.map(cloneCategory);
}

export function getTopAICompanyStockGainers(period: AICompanyStockReturnPeriod = "1Y", limit = 5): AICompanyStockCompany[] {
  return getAICompanyStockCompanies()
    .filter((company) => company.metrics.returns[period] != null)
    .sort(
      (a, b) =>
        (b.metrics.returns[period] ?? Number.NEGATIVE_INFINITY) -
          (a.metrics.returns[period] ?? Number.NEGATIVE_INFINITY) ||
        a.ticker.localeCompare(b.ticker),
    )
    .slice(0, Math.max(0, limit));
}

export function getAICompanyStockSummary(): AICompanyStockSummary {
  return cloneSummary(data.summary);
}

function cloneData(value: AICompanyStocksData): AICompanyStocksData {
  return {
    ...value,
    meta: { ...value.meta },
    source: { ...value.source },
    methodology: { ...value.methodology },
    coverage: { ...value.coverage },
    benchmarks: value.benchmarks.map(cloneBenchmark),
    companies: cloneCompanies(value.companies),
    categories: value.categories.map(cloneCategory),
    summary: cloneSummary(value.summary),
  };
}

function cloneCompanies(companies: AICompanyStockCompany[]): AICompanyStockCompany[] {
  return companies.map((company) => ({
    ...company,
    categories: [...company.categories],
    prices: clonePrices(company.prices),
    metrics: cloneMetrics(company.metrics),
    relativeReturns: Object.fromEntries(
      Object.entries(company.relativeReturns).map(([key, value]) => [key, { ...value }]),
    ),
    categoryRanks: company.categoryRanks.map((rank) => ({ ...rank })),
    dataQualityNotes: [...company.dataQualityNotes],
  }));
}

function cloneBenchmark(benchmark: AICompanyStockBenchmark): AICompanyStockBenchmark {
  return {
    ...benchmark,
    prices: clonePrices(benchmark.prices),
    metrics: cloneMetrics(benchmark.metrics),
    dataQualityNotes: [...benchmark.dataQualityNotes],
  };
}

function cloneCategory(category: AICompanyStockCategory): AICompanyStockCategory {
  return {
    ...category,
    tickers: [...category.tickers],
    breadth: { ...category.breadth },
    topGainers1Y: category.topGainers1Y.map((row) => ({ ...row })),
    laggards1Y: category.laggards1Y.map((row) => ({ ...row })),
  };
}

function cloneSummary(summary: AICompanyStockSummary): AICompanyStockSummary {
  return {
    ...summary,
    benchmarkTickers: [...summary.benchmarkTickers],
    topGainers: clonePeriodLeaders(summary.topGainers),
    laggards: clonePeriodLeaders(summary.laggards),
    breadth: { ...summary.breadth },
    benchmarkLatestClose: { ...summary.benchmarkLatestClose },
    caveats: [...summary.caveats],
  };
}

function clonePeriodLeaders(
  leaders: AICompanyStockSummary["topGainers"],
): AICompanyStockSummary["topGainers"] {
  return Object.fromEntries(
    Object.entries(leaders).map(([period, rows]) => [period, rows.map((row) => ({ ...row }))]),
  ) as AICompanyStockSummary["topGainers"];
}

function cloneMetrics(metrics: AICompanyStockMetrics): AICompanyStockMetrics {
  return {
    ...metrics,
    returns: { ...metrics.returns },
  };
}

function clonePrices(prices: AICompanyStockPricePoint[]): AICompanyStockPricePoint[] {
  return prices.map((point) => ({ ...point }));
}
