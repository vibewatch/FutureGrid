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
};
