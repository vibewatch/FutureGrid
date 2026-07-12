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
import { getDatasetProvenance, selectLatestAsOf } from "@/lib/provenance";
import { DEEP_LINK_HREFS } from "@/lib/section-anchors";

/** Per-dataset provenance detail within a synthesis lane. */
export interface LaneProvenanceSource {
  id: string;
  asOf: string | null;
  name: string | null;
}

/**
 * Compact registry-derived provenance for one synthesis lane.
 * `latestAsOf` is the chronologically latest (by calendar date) of all
 * non-null per-dataset asOf values, resolved via selectLatestAsOf so that
 * FY labels and projection windows are handled correctly.
 * `sources` preserves per-dataset detail so heterogeneous date formats (e.g.
 * "FY2025" vs "2025") are never silently merged into a slash string.
 */
export interface LaneProvenance {
  datasetIds: string[];
  latestAsOf: string | null;
  sources: LaneProvenanceSource[];
}

export interface AIPressureSynthesisData {
  global: {
    href: typeof DEEP_LINK_HREFS.globalAIEcosystemMap;
    modelCount: number;
    endpointProviderCount: number;
    rankableCountries: number;
    topReadinessGapCountry: ReadinessGapSummaryCountry | null;
    provenance: LaneProvenance;
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
    provenance: LaneProvenance;
  };
  market: {
    href: typeof DEEP_LINK_HREFS.analysisMarketAISensitivity;
    stockHref: typeof DEEP_LINK_HREFS.analysisAICompanyStockSignals;
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
    provenance: LaneProvenance;
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

/** Dataset IDs that feed each synthesis lane. */
const GLOBAL_DATASET_IDS = ["openrouter-models", "country-exposure", "global-ai-metrics"] as const;
const TALENT_DATASET_IDS = ["h1b-trends", "job-postings"] as const;
const MARKET_DATASET_IDS = ["ai-company-stocks", "market-ai-signals"] as const;

/**
 * Build a compact provenance contract for a lane from the canonical registry.
 * Missing registry entries degrade to null — never fabricated.
 */
function buildLaneProvenance(datasetIds: readonly string[]): LaneProvenance {
  const sources: LaneProvenanceSource[] = datasetIds.map((id) => {
    const entry = getDatasetProvenance(id);
    const rawSource = entry?.source ?? null;
    const name =
      typeof rawSource === "string"
        ? rawSource || null
        : typeof rawSource === "object" && rawSource !== null
          ? (rawSource as { name?: string }).name ?? null
          : null;
    return {
      id,
      asOf: entry?.asOf ?? null,
      name: name ? String(name) : null,
    };
  });

  return { datasetIds: [...datasetIds], latestAsOf: selectLatestAsOf(sources.map((s) => s.asOf)), sources };
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
      href: DEEP_LINK_HREFS.globalAIEcosystemMap,
      modelCount: openRouter.summary.sourceModelCount,
      endpointProviderCount: openRouter.summary.endpointProviderCount,
      rankableCountries: readinessGap.summary.rankableCountries,
      topReadinessGapCountry: cloneSummaryCountry(
        readinessGap.summary.topAdoptionOutpacingReadiness,
      ),
      provenance: buildLaneProvenance(GLOBAL_DATASET_IDS),
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
      provenance: buildLaneProvenance(TALENT_DATASET_IDS),
    },
    market: {
      href: DEEP_LINK_HREFS.analysisMarketAISensitivity,
      stockHref: DEEP_LINK_HREFS.analysisAICompanyStockSignals,
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
      provenance: buildLaneProvenance(MARKET_DATASET_IDS),
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
