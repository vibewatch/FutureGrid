import { getCountryExposure, getAIUsageProxies, getCountryMapData, getDiffusionRisers } from "@/lib/data";
import GlobalView from "@/components/global/GlobalView";
import type { EnrichedCountry } from "@/components/dashboard/CountryDetailPanel";
import { getAdoptionSignals } from "@/lib/adoption-signals";

export default function GlobalPage() {
  const allCountries = getCountryExposure();
  const proxies = getAIUsageProxies();
  const adoptionSignals = getAdoptionSignals({ topN: 8 });

  // Extract China proxy figures from live data (with hardcoded fallbacks)
  const cnnicEntry = proxies.countrySurveyMetrics.find(
    (m) => (m as { id?: string }).id === "cn-cnnic-genai-users-2025-06",
  );
  const questEntry = proxies.chinaAppMarketMetrics.find(
    (m) => (m as { id?: string }).id === "cn-questmobile-mobile-ai-app-users-2025-06",
  );
  const doubaoEntry = proxies.chinaNativeAppMau.find(
    (m) => (m as { id?: string }).id === "cn-questmobile-doubao-mau-2025-12",
  );
  const cnnicUsers = cnnicEntry
    ? `${Math.round(Number((cnnicEntry as { value?: unknown }).value) / 1e6)}M`
    : "515M";
  const questMau = questEntry
    ? `${Math.round(Number((questEntry as { value?: unknown }).value) / 1e6)}M`
    : "680M";
  const doubaoMau = doubaoEntry
    ? `${Math.round(Number((doubaoEntry as { value?: unknown }).value) / 1e6)}M`
    : "226M";

  // Diffusion layer data: China's Microsoft AIEI figure + top leaders
  const mapData = getCountryMapData();
  const chinaDiffusion = mapData.find((c) => c.iso3 === "CHN")?.diffusionPct ?? 16.4;
  const diffusionLeaders = [...mapData]
    .filter((c) => c.diffusionPct !== null)
    .sort((a, b) => (b.diffusionPct ?? 0) - (a.diffusionPct ?? 0))
    .slice(0, 3);

  // Enrich mapData with gdpPerWorkingAgeCapita + usageCount from CountryExposure
  const enrichedCountries: EnrichedCountry[] = mapData.map((c) => {
    const exp = allCountries.find((e) => e.iso3 === c.iso3);
    return {
      ...c,
      gdpPerWorkingAgeCapita: exp?.gdpPerWorkingAgeCapita ?? null,
      usageCount: exp?.usageCount ?? null,
    };
  });

  // Ranked list: exclude zeros, sort desc by usageIndex
  const rankedEnriched = enrichedCountries
    .filter((c) => c.usageIndex !== null && c.usageIndex > 0)
    .sort((a, b) => (b.usageIndex ?? 0) - (a.usageIndex ?? 0));

  // Fastest-rising GenAI diffusion adopters (H1 2025 -> Q1 2026)
  const rawRisers = getDiffusionRisers(5);
  const diffusionRisers = rawRisers.map((r) => {
    const trend = mapData.find((c) => c.iso3 === r.iso3)?.diffusionTrend ?? null;
    return { ...r, h2: trend?.h2_2025 ?? null };
  });

  const top12 = rankedEnriched.slice(0, 12);
  const totalCovered = allCountries.length;
  const topCountry = rankedEnriched[0];
  const topIndex = topCountry?.usageIndex ?? 0;

  // Normalise bar widths relative to the top country
  const maxIndex = topIndex > 0 ? topIndex : 1;

  return (
    <GlobalView
      totalCovered={totalCovered}
      rankedLength={rankedEnriched.length}
      topIndex={topIndex}
      topCountryName={topCountry?.name ?? "\u2014"}
      cnnicUsers={cnnicUsers}
      questMau={questMau}
      doubaoMau={doubaoMau}
      chinaDiffusion={chinaDiffusion}
      diffusionLeaders={diffusionLeaders}
      diffusionRisers={diffusionRisers}
      enrichedCountries={enrichedCountries}
      top12={top12}
      maxIndex={maxIndex}
      adoptionSignals={adoptionSignals}
    />
  );
}
