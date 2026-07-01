import marketSignalData from "@/data/market-ai-signals.json";

export interface MarketSignalSource {
  name: string;
  endpointTemplate: string;
  access: string;
  caveat: string;
}

export interface MarketSignalMethodology {
  feature: string;
  windowStart: string;
  interval: string;
  priceField: string;
  benchmark: string;
  metrics: string;
  occupationMapping: string;
  scoring: string;
}

export interface MarketSignalPricePoint {
  date: string;
  close: number;
}

export interface MarketSignalMetrics {
  startDate: string;
  latestDate: string;
  totalReturn: number;
  benchmarkReturn: number | null;
  excessReturn: number | null;
  annualizedVolatility: number | null;
  maxDrawdown: number | null;
  latestClose: number | null;
  observationCount: number;
  ytdReturn: number | null;
  oneYearReturn: number | null;
}

export interface MarketSignalScoreComponents {
  normalizedExcessReturn: number;
  normalizedAIExposure: number;
  excessReturnWeight: number;
  aiExposureWeight: number;
}

export type MarketSignalClassification =
  | "High descriptive sensitivity"
  | "Moderate descriptive sensitivity"
  | "Low descriptive sensitivity"
  | "Unclassified";

export interface MarketSignalSector {
  id: string;
  name: string;
  ticker: string;
  mappedOccupationSectors: string[];
  mappedOccupationCount: number;
  mappedEmployment: number;
  employmentWeightedAIExposure: number | null;
  prices: MarketSignalPricePoint[];
  metrics: MarketSignalMetrics;
  marketAiSensitivityScore: number;
  classification: MarketSignalClassification;
  scoreComponents: MarketSignalScoreComponents;
  dataQualityNotes: string[];
}

export interface MarketSignalBenchmark {
  id: string;
  name: string;
  ticker: string;
  prices: MarketSignalPricePoint[];
  metrics: MarketSignalMetrics;
  dataQualityNotes: string[];
}

export interface MarketSignalSummaryTopSector {
  id: string;
  name: string;
  ticker: string;
  marketAiSensitivityScore: number;
  excessReturn: number | null;
  employmentWeightedAIExposure: number | null;
}

export interface MarketSignalMappingCoverage {
  occupationCount: number;
  uniqueOccupationSectorCount: number;
  coveredOccupationSectorCount: number;
  uncoveredOccupationSectors: string[];
}

export interface MarketSignalSummary {
  sectorCount: number;
  requestedSectorCount: number;
  omittedTickers: string[];
  latestDate: string | null;
  windowStart: string;
  topSectors: MarketSignalSummaryTopSector[];
  mappingCoverage: MarketSignalMappingCoverage;
  caveats: string[];
}

export interface MarketSignalData {
  generatedAt: string;
  source: MarketSignalSource;
  methodology: MarketSignalMethodology;
  benchmark: MarketSignalBenchmark;
  sectors: MarketSignalSector[];
  summary: MarketSignalSummary;
}

const data = marketSignalData as unknown as MarketSignalData;

export function getMarketSignalData(): MarketSignalData {
  return cloneData(data);
}

export function getMarketSignalSource(): MarketSignalSource {
  return { ...data.source };
}

export function getMarketSignalSectors(): MarketSignalSector[] {
  return cloneSectors(data.sectors).sort(
    (a, b) => b.marketAiSensitivityScore - a.marketAiSensitivityScore || a.name.localeCompare(b.name),
  );
}

export function getTopMarketSignalSectors(limit = 10): MarketSignalSector[] {
  return getMarketSignalSectors().slice(0, Math.max(0, limit));
}

export function getMarketSignalSummary(): MarketSignalSummary {
  return cloneSummary(data.summary);
}

function cloneData(value: MarketSignalData): MarketSignalData {
  return {
    generatedAt: value.generatedAt,
    source: { ...value.source },
    methodology: { ...value.methodology },
    benchmark: cloneBenchmark(value.benchmark),
    sectors: cloneSectors(value.sectors),
    summary: cloneSummary(value.summary),
  };
}

function cloneBenchmark(value: MarketSignalBenchmark): MarketSignalBenchmark {
  return {
    ...value,
    prices: clonePrices(value.prices),
    metrics: { ...value.metrics },
    dataQualityNotes: [...value.dataQualityNotes],
  };
}

function cloneSectors(sectors: MarketSignalSector[]): MarketSignalSector[] {
  return sectors.map((sector) => ({
    ...sector,
    mappedOccupationSectors: [...sector.mappedOccupationSectors],
    prices: clonePrices(sector.prices),
    metrics: { ...sector.metrics },
    scoreComponents: { ...sector.scoreComponents },
    dataQualityNotes: [...sector.dataQualityNotes],
  }));
}

function clonePrices(prices: MarketSignalPricePoint[]): MarketSignalPricePoint[] {
  return prices.map((point) => ({ ...point }));
}

function cloneSummary(summary: MarketSignalSummary): MarketSignalSummary {
  return {
    ...summary,
    omittedTickers: [...summary.omittedTickers],
    topSectors: summary.topSectors.map((sector) => ({ ...sector })),
    mappingCoverage: {
      ...summary.mappingCoverage,
      uncoveredOccupationSectors: [...summary.mappingCoverage.uncoveredOccupationSectors],
    },
    caveats: [...summary.caveats],
  };
}
