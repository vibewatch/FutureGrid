export const SECTION_IDS = {
  openRouterCountryModelFootprint: "openrouter-country-model-footprint",
  readinessGapLens: "readiness-gap-lens",
  talentBottleneckLens: "talent-bottleneck-lens",
} as const;

export const DEEP_LINK_HREFS = {
  globalOpenRouterCountryModelFootprint: `/global#${SECTION_IDS.openRouterCountryModelFootprint}`,
  globalReadinessGapLens: `/global#${SECTION_IDS.readinessGapLens}`,
  visaTalentBottleneckLens: `/visa#${SECTION_IDS.talentBottleneckLens}`,
} as const;
