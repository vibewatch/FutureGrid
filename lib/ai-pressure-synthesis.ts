import {
  getAICompanyStocksData,
  type AICompanyStocksData,
} from "@/lib/ai-company-stocks";
import {
  getMarketSignalData,
  type MarketSignalData,
} from "@/lib/market-signals";
import {
  getOpenRouterCountryActivityData,
  type OpenRouterCountryActivityData,
} from "@/lib/openrouter-country-activity";
import {
  getReadinessGapData,
  type ReadinessGapData,
  type ReadinessGapSummaryCountry,
} from "@/lib/readiness-gap";
import {
  getTalentBottleneckData,
  type TalentBottleneckData,
} from "@/lib/talent-bottleneck";
import { DEEP_LINK_HREFS } from "@/lib/section-anchors";

export interface AIPressureSynthesisData {
  global: {
    href: typeof DEEP_LINK_HREFS.globalOpenRouterCountryModelFootprint;
    modelCount: number;
    endpointProviderCount: number;
    rankableCountries: number;
    topReadinessGapCountry: ReadinessGapSummaryCountry | null;
  };
  talent: {
    href: typeof DEEP_LINK_HREFS.visaTalentBottleneckLens;
    occupationsTracked: number;
    latestH1bFiscalYear: number | null;
    latestJobPostingYear: number | null;
    topOccupation: {
      socCode: string;
      title: string;
      score: number;
    } | null;
  };
  market: {
    href: "/analysis#market-ai-sensitivity";
    stockHref: "/analysis#ai-company-stock-signals";
    sectorProxyCount: number;
    companyCount: number;
    positiveBreadth1Y: number | null;
    latestStockDate: string | null;
    benchmarkTickers: string[];
    topSector: {
      name: string;
      ticker: string;
      score: number;
      excessReturn: number | null;
      employmentWeightedAIExposure: number | null;
    } | null;
  };
  guardrailIds: Array<
    | "openrouterCatalogProxy"
    | "h1bLcaFilings"
    | "stockDescriptiveHistory"
    | "jobPostingsProxy"
  >;
}

export interface AIPressureSynthesisInputs {
  openRouterCountryActivity?: OpenRouterCountryActivityData;
  readinessGap?: ReadinessGapData;
  talentBottleneck?: TalentBottleneckData;
  aiCompanyStocks?: AICompanyStocksData;
  marketSignal?: MarketSignalData;
}

export function getAIPressureSynthesisData(
  inputs: AIPressureSynthesisInputs = {},
): AIPressureSynthesisData {
  const openRouter =
    inputs.openRouterCountryActivity ?? getOpenRouterCountryActivityData();
  const readinessGap = inputs.readinessGap ?? getReadinessGapData();
  const talentBottleneck =
    inputs.talentBottleneck ?? getTalentBottleneckData();
  const aiCompanyStocks = inputs.aiCompanyStocks ?? getAICompanyStocksData();
  const marketSignal = inputs.marketSignal ?? getMarketSignalData();
  const topOccupation =
    talentBottleneck.summary.topRows[0] ?? talentBottleneck.rows[0] ?? null;
  const topSector =
    marketSignal.summary.topSectors[0] ??
    [...marketSignal.sectors].sort(
      (a, b) =>
        b.marketAiSensitivityScore - a.marketAiSensitivityScore ||
        a.name.localeCompare(b.name),
    )[0] ??
    null;

  return {
    global: {
      href: DEEP_LINK_HREFS.globalOpenRouterCountryModelFootprint,
      modelCount: openRouter.summary.sourceModelCount,
      endpointProviderCount: openRouter.summary.endpointProviderCount,
      rankableCountries: readinessGap.summary.rankableCountries,
      topReadinessGapCountry: cloneSummaryCountry(
        readinessGap.summary.topAdoptionOutpacingReadiness,
      ),
    },
    talent: {
      href: DEEP_LINK_HREFS.visaTalentBottleneckLens,
      occupationsTracked: talentBottleneck.summary.occupationsTracked,
      latestH1bFiscalYear: talentBottleneck.summary.latestH1bFiscalYear,
      latestJobPostingYear: talentBottleneck.summary.latestJobPostingYear,
      topOccupation: topOccupation
        ? {
            socCode: topOccupation.socCode,
            title: topOccupation.title,
            score: topOccupation.score,
          }
        : null,
    },
    market: {
      href: "/analysis#market-ai-sensitivity",
      stockHref: "/analysis#ai-company-stock-signals",
      sectorProxyCount: marketSignal.summary.sectorCount,
      companyCount: aiCompanyStocks.summary.companyCount,
      positiveBreadth1Y:
        validPositiveBreadthOrNull(
          aiCompanyStocks.summary.breadth.positive1Y,
          aiCompanyStocks.summary.companyCount,
        ) ??
        countPositiveOneYearReturns(aiCompanyStocks),
      latestStockDate: aiCompanyStocks.summary.latestDate,
      benchmarkTickers: [...aiCompanyStocks.summary.benchmarkTickers],
      topSector: topSector
        ? {
            name: topSector.name,
            ticker: topSector.ticker,
            score: topSector.marketAiSensitivityScore,
            excessReturn: topSector.excessReturn,
            employmentWeightedAIExposure:
              topSector.employmentWeightedAIExposure,
          }
        : null,
    },
    guardrailIds: [
      "openrouterCatalogProxy",
      "h1bLcaFilings",
      "stockDescriptiveHistory",
      "jobPostingsProxy",
    ],
  };
}

function cloneSummaryCountry(
  country: ReadinessGapSummaryCountry | null,
): ReadinessGapSummaryCountry | null {
  return country ? { ...country } : null;
}

function validPositiveBreadthOrNull(
  value: unknown,
  companyCount: number,
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0 &&
    Number.isFinite(companyCount) &&
    Number.isInteger(companyCount) &&
    companyCount >= 0 &&
    value <= companyCount
    ? value
    : null;
}

function countPositiveOneYearReturns(data: AICompanyStocksData): number | null {
  const count = data.companies.filter((company) => {
    const value = company.metrics.returns["1Y"];
    return typeof value === "number" && Number.isFinite(value) && value > 0;
  }).length;

  return data.companies.length > 0 ? count : null;
}
