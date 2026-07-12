export const SECTION_IDS = {
  openRouterCountryModelFootprint: "openrouter-country-model-footprint",
  globalAIEcosystemMap: "global-ai-ecosystem-map",
  readinessGapLens: "readiness-gap-lens",
  talentBottleneckLens: "talent-bottleneck-lens",
  workforceStructure: "workforce-structure",
  diffusionGrowthComparison: "diffusion-growth-comparison",
  analysisMarketAISensitivity: "market-ai-sensitivity",
  analysisAICompanyStockSignals: "ai-company-stock-signals",
} as const;

export const DEEP_LINK_HREFS = {
  globalOpenRouterCountryModelFootprint: `/global#${SECTION_IDS.openRouterCountryModelFootprint}`,
  globalAIEcosystemMap: `/global#${SECTION_IDS.globalAIEcosystemMap}`,
  globalReadinessGapLens: `/global#${SECTION_IDS.readinessGapLens}`,
  visaTalentBottleneckLens: `/visa#${SECTION_IDS.talentBottleneckLens}`,
  globalWorkforceStructure: `/global#${SECTION_IDS.workforceStructure}`,
  globalDiffusionGrowthComparison: `/global#${SECTION_IDS.diffusionGrowthComparison}`,
  analysisMarketAISensitivity: `/analysis#${SECTION_IDS.analysisMarketAISensitivity}`,
  analysisAICompanyStockSignals: `/analysis#${SECTION_IDS.analysisAICompanyStockSignals}`,
} as const;
