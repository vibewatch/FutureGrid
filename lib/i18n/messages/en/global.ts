export const globalEn: Record<string, string> = {
  // Hero
  heroHeadline1: "Global AI Adoption",
  heroHeadline2: "by Country",
  heroIntroBefore:
    "AI adoption varies dramatically across countries. This page shows",
  heroIntroHighlight1: "real per-capita AI (Claude.ai) usage",
  heroIntroMid: "from the",
  heroIntroHighlight2: "Anthropic Economic Index (Aug 2025)",
  heroIntroAfter:
    "\u2014 a usage-based measure grounded in observed behaviour, not forecasts.",
  statCountriesLabel: "Countries tracked",
  statMeasurableLabel: "With measurable usage",
  statTopIndexLabel: "Top usage index ({name})",

  // World Map
  worldMapHeading: "Global AI Adoption \u2014 World Map",
  mapIntroBefore: "Two lenses are available via the layer toggle:",
  mapHighlight1: "Claude.ai usage",
  mapIntroMid1:
    "(per-capita observed interactions, Anthropic Economic Index Aug\u00a02025 \u2014 availability-biased; China and restricted markets appear grey) and",
  mapHighlight2: "GenAI diffusion",
  mapIntroMid2:
    "(Microsoft AIEI Q1\u00a02026, % of working-age population using GenAI across 147\u00a0countries,",
  mapHighlight3: "China included",
  mapIntroAfter:
    "). The two metrics use different denominators and cannot be merged \u2014 see",
  mapSourcesLink: "Data & Sources",
  diffusionLeadersLabel:
    "GenAI diffusion leaders \u00b7 Microsoft AIEI Q1\u00a02026",
  diffusionLeadersCaption:
    "% working-age population using generative AI (147-country survey).",
  mapDemandLayerLabel: "AI job demand",
  mapDemandTooltipLabel: "AI job-posting share",
  mapDemandSourceNote:
    "AI job demand uses Indeed Hiring Lab job-posting share data for 9 economies, latest month.",

  // China callout
  chinaTitle: "China \u2014 Proxy Context",
  chinaLayerBadge: "Claude layer: grey",
  chinaIntroBefore: "Claude.ai is",
  chinaUnavailable: "unavailable in mainland China",
  chinaIntroMid1:
    ", so it appears grey on the Claude.ai usage layer and is excluded from the per-capita usage index. On the",
  chinaIntroHighlight2: "GenAI diffusion layer",
  chinaIntroMid2: ", China does appear \u2014 Microsoft AIEI estimates",
  chinaIntroMid3:
    "of working-age adults used GenAI in Q1\u00a02026. Note that Western telemetry likely undercounts domestic apps (Doubao, Kimi, etc.) \u2014 CNNIC\u2019s survey implies ~43% penetration. The native-ecosystem figures below use different measurement approaches and denominators and are",
  chinaNotMerged: "not merged into either index",
  cnnicLabel: "CNNIC \u00b7 Jun 2025",
  cnnicDesc: "Generative-AI users",
  questLabel: "QuestMobile \u00b7 H1 2025",
  questDesc: "Mobile-AI MAU",
  doubaoLabel: "Doubao (QuestMobile) \u00b7 Dec 2025",
  doubaoDesc: "App MAU",
  aieiLabel: "Microsoft AIEI \u00b7 Q1 2026",
  aieiDesc: "GenAI diffusion (working-age pop.)",
  chinaCaveatPart1:
    "These proxies use different measurement methods (government survey, app-market scan, product MAU) and cannot be summed or directly compared to each other.",
  chinaCaveatMid:
    "use entirely different denominators \u2014 do not merge them.",
  chinaCaveatSee: "See the",
  chinaCaveatPage: "page for full provenance details.",

  // AI adoption signals
  adoptionSignalsEyebrow: "Supplemental proxy evidence",
  adoptionSignalsTitle: "AI Adoption Signals",
  adoptionSignalsSubtitle:
    "Heterogeneous proxy evidence from surveys, app-market measures, open-model activity, developer sources, and research activity. These signals are not merged into the Claude usage index.",
  adoptionSignalsCaveatLabel: "Caveat:",
  adoptionSignalsSourceLabel: "Source:",
  adoptionSignalsPeriodLabel: "Period:",
  adoptionSignalsViewSources: "View Data & Sources →",
  adoptionSignalsCollectedFamilies: "Collected families",
  adoptionSignalsVisualizedFamilies: "Visualized families",
  adoptionSignalsFutureCatalogCount: "Future candidates",
  adoptionSignalsBarListAria: "{title} bar list",
  adoptionSignalsStackedShareAria: "{title} share distribution",
  adoptionSignalsProviderModelsAria: "{provider} top model activity proxies",
  adoptionSignalsBenchmarksLabel: "Benchmarks",
  adoptionSignalsModelLabel: "Model",
  adoptionSignalsStars: "Stars",
  adoptionSignalsForks: "Forks",
  adoptionSignalsOpenIssues: "Open issues",
  adoptionSignalsUpdated: "Updated",
  adoptionSignalsFutureSources: "Future collection candidates",
  adoptionSignalsFutureSourcesSummary: "{count} catalog sources",
  adoptEnterpriseTitle: "Enterprise AI survey shares",
  adoptEnterpriseDesc:
    "Business survey measures reporting respondent share using at least one AI technology. Comparable only within each source family.",
  adoptEnterpriseDescription:
    "Business survey measures reporting respondent share using at least one AI technology. Comparable only within each source family.",
  adoptIndividualTitle: "Individual GenAI respondent share",
  adoptIndividualDesc:
    "Survey-based respondent share for generative AI use by individuals, shown as proxy evidence rather than product telemetry.",
  adoptIndividualDescription:
    "Survey-based respondent share for generative AI use by individuals, shown as proxy evidence rather than product telemetry.",
  adoptCensusBusinessTitle: "U.S. business AI activity proxy",
  adoptCensusBusinessDesc:
    "U.S. Census business technology measures shown separately because geography, vintage, and denominator differ from global usage measures.",
  adoptUsBusinessTitle: "U.S. business AI activity proxy",
  adoptUsBusinessDescription:
    "U.S. Census business technology measures shown separately because geography, vintage, and denominator differ from global usage measures.",
  adoptCountrySurveyTitle: "Country survey proxy metrics",
  adoptCountrySurveyDesc:
    "Country-level survey and reported penetration measures for generative AI use, kept separate from app and Claude usage metrics.",
  adoptCountrySurveyDescription:
    "Country-level survey and reported penetration measures for generative AI use, kept separate from app and Claude usage metrics.",
  adoptChinaAppMarketTitle: "China app-market activity proxies",
  adoptChinaAppMarketDesc:
    "Mobile-AI app-market measures for China, using vendor-reported categories and periods as activity proxies.",
  adoptChinaAppsTitle: "China app-market activity proxies",
  adoptChinaAppsDescription:
    "Mobile-AI app-market measures for China, using vendor-reported categories and periods as activity proxies.",
  adoptChinaAppsMauTitle: "China app-market MAU proxies",
  adoptChinaAppsMauDescription:
    "China mobile-AI app-market rows reported in monthly active users, shown on one user-count scale.",
  adoptChinaAppsUsageTitle: "China app-market usage-volume proxies",
  adoptChinaAppsUsageDescription:
    "China app-market rows reported in tokens or other volume units, shown as separate KPI cards rather than a shared ranking.",
  adoptChinaNativeAppTitle: "China native app MAU proxies",
  adoptChinaNativeAppDesc:
    "Product-level monthly active-user signals for native AI apps, shown without combining them with survey or telemetry measures.",
  adoptChinaNativeTitle: "China native app MAU proxies",
  adoptChinaNativeDescription:
    "Product-level monthly active-user signals for native AI apps, shown without combining them with survey or telemetry measures.",
  adoptDeveloperSurveyTitle: "Developer AI usage survey",
  adoptDeveloperSurveyDesc:
    "Developer survey respondent shares indicating reported AI tool use across countries and response groups.",
  adoptDeveloperSurveyDescription:
    "Developer survey respondent shares indicating reported AI tool use across countries and response groups.",
  adoptDeveloperSurveyOverallTitle: "Developer survey overall distributions",
  adoptDeveloperSurveyOverallDescription:
    "Stack Overflow overall AI-tool response distributions, with each survey question kept separate.",
  adoptDeveloperSurveyCountriesTitle: "Developer survey country respondent shares",
  adoptDeveloperSurveyCountriesDescription:
    "Country rows show Stack Overflow respondent yes-shares for AI-tool use, not population adoption.",
  adoptOpenModelDownloadsTitle: "Open-model download activity",
  adoptOpenModelDownloadsDesc:
    "Provider and model download counts from open-model repositories, shown as activity proxy evidence with source-specific caveats.",
  adoptDeveloperEcosystemTitle: "Developer ecosystem repository KPIs",
  adoptDeveloperEcosystemDesc:
    "Repository stars, forks, open issues, and update recency as developer ecosystem activity proxies.",
  adoptDevEcosystemTitle: "Developer ecosystem repository KPIs",
  adoptDevEcosystemDescription:
    "Repository stars, forks, open issues, and update recency as developer ecosystem activity proxies.",
  adoptResearchActivityTitle: "AI research activity proxy",
  adoptResearchActivityDesc:
    "Country-level AI publication activity measures; useful for research context, not direct product usage.",
  adoptResearchTitle: "AI research activity proxy",
  adoptResearchDescription:
    "Country-level AI publication activity measures; useful for research context, not direct product usage.",
  adoptFutureSourcesTitle: "Future source catalog",
  adoptFutureSourcesDesc:
    "Cataloged source families that are candidates for future collection and are not yet visualized as current adoption signals.",
  adoptFutureSourcesDescription:
    "Cataloged source families that are candidates for future collection and are not yet visualized as current adoption signals.",
  adoptEnterpriseAiTitle: "Enterprise AI survey shares",
  adoptEnterpriseAiDesc:
    "Business survey measures reporting respondent share using at least one AI technology. Comparable only within each source family.",
  adoptBusinessTitle: "Business AI proxy measures",
  adoptBusinessDesc:
    "Business-level AI survey measures shown by source family without merging denominators.",
  adoptIndividualGenAiTitle: "Individual GenAI respondent share",
  adoptIndividualGenAiDesc:
    "Survey-based respondent share for generative AI use by individuals, shown as proxy evidence rather than product telemetry.",
  adoptUsCensusBusinessTitle: "U.S. business AI activity proxy",
  adoptUsCensusBusinessDesc:
    "U.S. Census business technology measures shown separately because geography, vintage, and denominator differ from global usage measures.",
  adoptDeveloperTitle: "Developer AI usage survey",
  adoptDeveloperDesc:
    "Developer survey respondent shares indicating reported AI tool use across countries and response groups.",
  adoptOpenModelsTitle: "Open-model download activity",
  adoptOpenModelsDesc:
    "Provider and model download counts from open-model repositories, shown as activity proxy evidence with source-specific caveats.",
  adoptOpenModelsDescription:
    "Provider and model download counts from open-model repositories, shown as activity proxy evidence with source-specific caveats.",
  adoptRepoKpisTitle: "Developer ecosystem repository KPIs",
  adoptRepoKpisDesc:
    "Repository stars, forks, open issues, and update recency as developer ecosystem activity proxies.",
  adoptAiResearchTitle: "AI research activity proxy",
  adoptAiResearchDesc:
    "Country-level AI publication activity measures; useful for research context, not direct product usage.",

  // OpenRouter country activity lens
  openRouterCountryActivityEyebrow: "OpenRouter catalog proxy",
  openRouterCountryActivityTitle: "AI model ecosystem footprint",
  openRouterCountryActivitySubtitle:
    "Country-level provider identity proxy from the OpenRouter public model catalog snapshot as of {asOf}. Model catalog counts and endpoint entries are separate lenses.",
  openRouterCountryActivityCaveatLabel: "Caveat:",
  openRouterCountryActivityCaveat:
    "Public catalog and endpoint availability only; not user traffic, usage, revenue, or national adoption. It is also not physical server location, training location, or a definitive national AI activity measure.",
  openRouterCountryActivitySourcesLink: "View Data & Sources →",
  openRouterCountryActivityModelsSnapshotLabel: "Models in snapshot",
  openRouterCountryActivityModelsSnapshotDetail:
    "{mapped} mapped to country-level provider identities.",
  openRouterCountryActivityCountriesMappedLabel: "Countries mapped",
  openRouterCountryActivityCountriesMappedDetail:
    "{providers} mapped model-provider entries across countries.",
  openRouterCountryActivityEndpointEntriesLabel: "Endpoint entries",
  openRouterCountryActivityEndpointEntriesDetail:
    "{mapped} mapped endpoint entries kept separate from model counts.",
  openRouterCountryActivityUnknownProvidersLabel: "Unknown/unmapped providers",
  openRouterCountryActivityUnknownProvidersDetail:
    "{models} model rows and {endpoints} endpoint entries remain unmapped.",
  openRouterCountryActivityChartTitle:
    "Top countries by model catalog count",
  openRouterCountryActivityChartDesc:
    "Model catalog counts are the primary bars. Endpoint entries are shown as secondary bars and labels, without combining the two measures.",
  openRouterCountryActivityChartAria:
    "Top countries by OpenRouter model catalog count, with endpoint entries shown separately.",
  openRouterCountryActivityModelsLegend: "Models",
  openRouterCountryActivityEndpointsLegend: "Endpoint entries",
  openRouterCountryActivityTableTitle:
    "Country-level OpenRouter catalog proxy table",
  openRouterCountryActivityCountryHeader: "Country",
  openRouterCountryActivityRegionHeader: "Region",
  openRouterCountryActivityModelProvidersHeader: "Model providers",
  openRouterCountryActivityModelsHeader: "Models",
  openRouterCountryActivityEndpointProvidersHeader: "Endpoint providers",
  openRouterCountryActivityEndpointsHeader: "Endpoints",
  openRouterCountryActivityTopFamiliesHeader: "Top families",

  // Global AI ecosystem comparison map
  ecosystemMapEyebrow: "Joined country comparison",
  ecosystemMapTitle: "Global AI ecosystem comparison map",
  ecosystemMapSubtitle:
    "Joins OpenRouter model catalog footprint, GenAI diffusion, readiness scores, and adoption-readiness gaps into one country table. Filters keep catalog proxies separate from adoption/readiness metrics.",
  ecosystemMapSourcesLink: "View Data & Sources →",
  ecosystemMapCountriesCompared: "Countries compared",
  ecosystemMapCatalogCountries: "With catalog footprint",
  ecosystemMapReadinessCountries: "With readiness metrics",
  ecosystemMapJoinedCountries: "With both lenses",
  ecosystemMapRegionFilter: "Region",
  ecosystemMapAllRegions: "All regions",
  ecosystemMapQuadrantFilter: "Quadrant",
  ecosystemMapAllQuadrants: "All quadrants",
  ecosystemMapTableCaption:
    "Country-level AI ecosystem comparison across model catalog footprint, readiness, diffusion, and gap quadrant.",
  ecosystemMapCountryHeader: "Country",
  ecosystemMapModelsHeader: "Models / endpoints",
  ecosystemMapReadinessHeader: "Readiness",
  ecosystemMapDiffusionHeader: "Diffusion",
  ecosystemMapQuadrantHeader: "Quadrant",
  ecosystemMapCaveat:
    "Proxy caveat: OpenRouter is a public catalog/provider-identity footprint, not traffic, usage, demand, physical deployment, or national adoption. Readiness and diffusion use different denominators and should not be averaged with catalog counts.",

  // Adoption-readiness gap lens
  readinessGapEyebrow: "Alignment lens",
  readinessGapTitle: "Adoption–Readiness Gap",
  readinessGapSubtitle:
    "Compares each country’s generative-AI diffusion percentile with its AI readiness percentile to surface where observed use and capacity are not aligned.",
  readinessGapCaveatLabel: "Caveat:",
  readinessGapCaveat:
    "Descriptive alignment only; the gap compares percentile ranks across two sources and is not a causal claim.",
  readinessGapSourcesLink: "View Data & Sources →",
  readinessGapRankableLabel: "Rankable countries",
  readinessGapRankableDetail: "{coverage}% coverage of {total} mapped countries with both inputs.",
  readinessGapPositiveLabel: "Largest positive gap",
  readinessGapLatentLabel: "Largest latent capacity",
  readinessGapScatterTitle: "Readiness score vs. GenAI diffusion",
  readinessGapScatterAria:
    "Scatter plot of readiness score on the x-axis and generative-AI diffusion percent on the y-axis.",
  readinessGapScatterDesc:
    "Each point is a country with both readiness and diffusion data; ranked lists below provide text equivalents.",
  readinessGapXAxis: "Readiness score",
  readinessGapYAxis: "Diffusion %",
  readinessGapGapLabel: "Gap",
  readinessGapGapUnit: "pctile",
  readinessGapDiffusionLabel: "Diffusion",
  readinessGapReadinessLabel: "Readiness",
  readinessGapAdoptionListTitle: "Adoption outpacing readiness",
  readinessGapLatentListTitle: "Latent capacity",
  readinessGapBalancedListTitle: "Balanced leaders",
  readinessGapEmptyList: "No countries in this group.",

  // Fastest-rising adopters
  risersHeading: "Fastest-Rising Adopters",
  risersSourceLink: "Microsoft AIEI \u00b7 see sources",
  risersIntroBefore: "Countries with the largest GenAI diffusion gains,",
  risersIntroHighlight: "H1\u00a02025 \u2192 Q1\u00a02026",
  risersIntroAfter:
    "Based on Microsoft\u2019s AI Economic Impact Index (Western telemetry \u2014 may undercount domestic apps in some markets).",
  risersFullDetailsLink: "Full source details \u2192",
  risersCaption:
    "Microsoft AIEI \u00b7 H1 2025 \u2192 Q1 2026 \u00b7 % working-age population using generative AI across 147\u00a0economies. Western telemetry \u2014",
  risersCaptionSeeLink: "see sources",
  risersCaptionAfter: "for caveats.",

  // Chart panel
  chartHeading: "World Map \u2014 AI Usage Index",
  chartCaption:
    "Per-capita AI usage index normalised against working-age population. Darker / higher = more AI usage relative to population size.",

  // Methodology
  methodologyLabel: "Methodology",
  methodologyText:
    "Usage index = observed Claude.ai interactions per working-age capita, normalised across all countries. Source: Anthropic Economic Index, August 2025 snapshot (194 reported country rows, plus a supplemental China row using World Bank 2024 GDP and working-age population). GDP data comes from World Bank / IMF fields bundled in the Anthropic dataset, with China GDP-per-worker sourced directly from World Bank. Countries with zero recorded interactions are excluded from ranked lists but remain in the dataset; countries with unreported Claude.ai usage metrics do not rank.",
  methodologySourceBefore:
    "For full details on data provenance and licensing, see the",
  methodologySourceLink: "Data & Sources",
  methodologySourceAfter: "page.",

  // Country detail panel
  countryTopHeading: "Top Countries by AI Adoption",
  countryTopDesc1:
    "Ranked by usage index (per-capita Claude.ai usage, normalised). Countries with zero recorded usage or unreported Claude.ai metrics are excluded.",
  countryTopDesc2: "Click any row or use the selector to view the full metric set.",
  countrySelectorLabel: "Any country:",
  countrySelectorAria: "Select any country to view details",
  countrySelectorPlaceholder: "🔍 Select a country…",
  countryRankingAria: "Top countries by AI adoption",
  countryRankAria: "Rank {rank}: {name} — usage index {index}. Activate to view full details.",
  countryRelativeUsageAria: "{name} relative usage",
  countryShareLabel: "Share:",
  countryInteractionsLabel: "Interactions:",
  countryDetailsLink: "details →",
  countryCloseAria: "Close country detail",
  countryClaudeUsageHeading: "Claude.ai Usage · Anthropic Economic Index Aug 2025",
  countryUsageIndexLabel: "usage index",
  countryGlobalShareLabel: "global share",
  countryNoClaudeData: "No Claude.ai data",
  countryGenAiDiffusion: "GenAI Diffusion",
  countrySourcesLink: "sources",
  countryAiReadiness: "AI Readiness",
  countryGovernmentReadiness: "Government AI Readiness (Oxford 2023)",
  countryGdpPerWorkingAge: "GDP per Working-Age Capita",
  countryImfSubIndices: "IMF AI Preparedness — Sub-indices",
  countryDigitalInfrastructure: "Digital Infrastructure",
  countryHumanCapital: "Human Capital & Labor Markets",
  countryInnovation: "Innovation & Economic Integration",
  countryRegulationEthics: "Regulation & Ethics",
  countryNoData: "no data",
  countrySubPillarNote: "Sub-pillar scores 0–1 (2023 vintage). Source:",
  countryDataSourcesLink: "Data & Sources",
  countryNativeEcosystemHeading: "Native Ecosystem Context · Claude layer: grey",
  countryGenAiUsers: "GenAI users",
  countryMobileAiMau: "Mobile-AI MAU",
  countryAppMau: "App MAU",
  countryChinaProxyNote:
    "These proxies use different measurement methods and cannot be summed or compared directly. Claude.ai is unavailable in mainland China — it appears grey on the Claude.ai usage layer.",
  countryFullProvenance: "Full provenance:",

  // ─── Workforce structure section ──────────────────────────────────────────
  workforceEyebrow: "International labor view",
  workforceTitle: "Workforce Structure by Major Economy",
  workforceSubtitle:
    "{count} economies included. ISCO-08 major-group employment shares; source: ILOSTAT annual data, total employment, latest year within 3 years of {year}. National survey definitions, reference periods, and coverage differ — descriptive comparison only.",
  workforceSourcesLink: "View Data & Sources →",
  workforceCaveat:
    "This section describes occupation composition only. No AI-exposure scores, wage rankings, or AI-impact claims are made. Displayed shares are normalized across the nine ISCO-08 major groups and sum to approximately 100%; each economy's coverage ratio separately discloses the share of total national employment those groups represent. Coverage is limited to economies with complete harmonized ISCO-08 data in the seed universe and does not represent all major economies.",
  workforceAttribution: "Source: ILOSTAT — Employment by sex and occupation (EMP_TEMP_SEX_OCU_NB_A).",
  workforceAttributionLicense: "CC BY 4.0 · International Labour Organization (ILO)",
  workforcePartialCoverage:
    "{count} economies passed the minimum coverage filter (all 9 of 9 ISCO-08 groups present, ≥ 98% of national employment covered, within 3 years of dataset latest year). Coverage is verified, not complete.",
  workforceExclusionCaveat: "Not included in comparable set:",
  workforceExposureNote: "For U.S.-only AI occupation-exposure analysis, see the",
  workforceExposureLinkText: "Analysis page",
  workforceExposureNoteAfter:
    "— a separate U.S.-only view using different methodology and data. It is not merged with the international occupation-mix data shown here.",
  workforceDrilldownHeading: "{name} — ISCO-08 Detail",
  workforceDrilldownNone:
    "Select a country bar above to see its detailed ISCO-08 occupation-mix breakdown.",
  workforceDrilldownClear: "Clear selection: {name}",
  workforceDrilldownClearLabel: "Clear selection",
  workforceDrilldownYear: "Survey year:",
  workforceDrilldownCoverage: "ISCO-08 group coverage:",
  workforceDrilldownStatuses: "Observation flags:",
  workforceDrilldownTableCaption: "ISCO-08 major-group employment shares — {name} ({year})",
  workforceDrilldownGroup: "Group",
  workforceDrilldownLabel: "Occupation type",
  workforceDrilldownShare: "Share",

  // ─── InternationalOccupationMixChart i18n keys ────────────────────────────
  intlOccMixFigureCaption:
    "Harmonized ISCO-08 major-group occupation shares across major economies",
  intlOccMixGroupPrefix: "Group",
  intlOccMixChartAria: "{classification} occupation shares across major economies",
  intlOccMixChartDesc:
    "100% stacked horizontal bars showing each country's employment share across {classification} major groups 1–9, ordered alphabetically by country name. This is not a ranked leaderboard.",
  intlOccMixCoverageInline: "cov.\u00a0{coverage}",
  intlOccMixDissimilarityInline: "dist.\u00a0{value}\u00a0vs\u00a0{reference}",
  intlOccMixTableTitle: "Full data table",
  intlOccMixTableCaption: "{classification} employment shares by country",
  intlOccMixColCountry: "Country",
  intlOccMixColYear: "Year",
  intlOccMixColCoverage: "Coverage",
  intlOccMixColStatus: "Status",
  intlOccMixColDissimilarity: "Dissimilarity",
  intlOccMixCaptionShares:
    "{classification} employment shares (fraction of total national employment) for {count} included countries. Values reflect each country's latest year within a 3-year window of {year}.",
  intlOccMixCaptionDissimilarity:
    "Dissimilarity (half-L1 / Bray\u2013Curtis, 0\u20131) relative to {reference}. Descriptive structural distance only; not a ranking or quality measure.",
  intlOccMixCaptionExcluded: "Not included in comparable set:",
  // ILOSTAT observation-status code labels
  intlOccMixStatus_B: "Break in series",
  intlOccMixStatus_P: "Provisional",
  intlOccMixStatus_E: "Estimated",
  intlOccMixStatus_F: "Forecast",
  intlOccMixStatus_I: "Imputed",

  // ─── Consumer GenAI Diffusion Growth comparison ───────────────────────────
  diffusionGrowthEyebrow: "Microsoft AIEI \u00b7 MIT License",
  diffusionGrowthTitle: "Consumer GenAI Diffusion \u2014 Top Economies",
  diffusionGrowthSubtitle:
    "Top 10 economies ranked by Q1\u00a02026 share of working-age population using a generative AI product. H1 2025, H2 2025, and Q1 2026 values shown for trend context. Ranked by Q1\u00a02026 level, descending \u2014 not a fastest-growth ranking.",
  diffusionGrowthH1Label: "H1 2025",
  diffusionGrowthH2Label: "H2 2025",
  diffusionGrowthQ1Label: "Q1 2026",
  diffusionGrowthAxisLabel: "% of working-age population",
  diffusionGrowthSourceLink: "Data & Sources",
  diffusionGrowthTableCaption:
    "Consumer GenAI diffusion — top 10 economies by Q1 2026 share (Microsoft AIEI, MIT)",
  diffusionGrowthColCountry: "Economy",
  diffusionGrowthColH1: "H1 2025 (%)",
  diffusionGrowthColH2: "H2 2025 (%)",
  diffusionGrowthColQ1: "Q1 2026 (%)",
  diffusionGrowthColChange: "Change (Q1\u2212H1, pp)",
  diffusionGrowthFigureAria:
    "Grouped bar chart: Consumer GenAI Diffusion \u2014 top 10 economies by Q1 2026 level, with H1 2025, H2 2025, Q1 2026 trend",
  diffusionGrowthGuardrail:
    "Usage \u2260 capability, workplace adoption, productivity, or labor-market impact.",
  diffusionGrowthLegendLabel: "Legend",
  diffusionGrowthCaveat:
    "Metric: % of working-age population who reported using a generative AI product in each survey period (Microsoft AI Economic Impact \u0026 Insights). Usage \u2260 capability, workplace adoption, productivity, or labor-market impact. Three survey periods (H1\u00a02025, H2\u00a02025, Q1\u00a02026) is a short window; caution on trend extrapolation. This absolute-share top 10 reflects economies with high Microsoft product penetration and digital-access infrastructure; it is not a representative sample of global AI diffusion. Digital-access gaps and Microsoft product reach independently affect which economies appear in this ranking. Western telemetry may undercount domestic AI apps (e.g.\u00a0Doubao, Kimi) in China and other markets. Source: Microsoft AI Diffusion Report (MIT). Not merged with Claude\u00a0usage\u00a0index, Indeed\u00a0job\u00a0demand, Anthropic indices, or IMF metrics.",
};
