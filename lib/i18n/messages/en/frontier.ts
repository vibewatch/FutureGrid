export const frontierEn = {
  // ── Page ──────────────────────────────────────────────────────────────────
  pageTitle: "AI Frontier",
  pageBadge: "Engine of Disruption",
  pageSubhead:
    "Everywhere else in FutureGrid you see AI's impact on jobs. Here you see the raw training-compute records behind it — an unrelenting exponential drawn from Epoch AI's tracked catalog.",

  // ── Hero stat cards ────────────────────────────────────────────────────────
  statDoublingLabel: "Compute doubling time",
  /** Interpolation vars: {modernEraStart} {r2} */
  statDoublingSub: "Modern era {modernEraStart}–present · r²={r2}",
  statModelsLabel: "Compute-known records",
  statModelsSub: "Models with reported or estimated training compute",
  statFrontierLabel: "Top country by recent tracked releases",
  statLargestLabel: "Largest reported training run",
  /** sr-only hint for the decorative hero sparklines; the numeric value stays the accessible content. */
  statSparklineSrHint:
    "The small trendline is decorative; the labeled figure above is the reported value.",

  // ── Section: Compute Timeline ──────────────────────────────────────────────
  timelineSectionTitle: "Training Compute Over Time",
  timelineSectionSubhead:
    "Each point is a model from Epoch AI's compute-known subset — records with reported or estimated training FLOPs. Frontier models (Epoch's historical top 10 by training compute at release) are highlighted. The trend line shows the fitted modern-era exponential.",
  /** Interpolation vars: {doublingTime} */
  timelineAnnotation: "doubles every ~{doublingTime} months",
  /** Interpolation vars: {doublingTime} {r2} {n} */
  timelineAnnotationFull: "Compute doubles every ~{doublingTime} months (modern era, r²={r2}, n={n})",
  axisDate: "Year",
  axisCompute: "Training Compute (FLOP)",
  legendAll: "All compute-known models",
  legendFrontier: "Compute-frontier models",
  /** Interpolation vars: {modernEraStart} */
  legendTrend: "Exponential trend ({modernEraStart}–)",
  tooltipModel: "Model",
  tooltipOrg: "Organization",
  tooltipDate: "Date",
  tooltipCompute: "Training compute",
  tooltipCountry: "Country",
  tooltipFrontier: "Compute frontier",
  tooltipFrontierYes: "Yes",
  tooltipFrontierNo: "No",
  tooltipConfidence: "Confidence",

  // ── Compute-frontier envelope ─────────────────────────────────────────────
  envelopeLabel: "Compute-frontier envelope",
  envelopeDefinition:
    "Traces the highest reported training compute recorded in each year — an upper envelope of disclosed compute, not a measure of capability and not a leaderboard. Developers that do not disclose training compute are absent, so the line reflects only compute that has been reported.",
  /** sr-only summary sentence describing the envelope line. */
  envelopeSrSummary:
    "An upper-bound line tracing the highest reported training compute per year across the compute-known subset; it shows disclosed compute only, not model capability.",

  // ── Section: Tracked Model Activity ───────────────────────────────────────
  leadersSectionTitle: "Tracked Model Activity by Organization and Country",
  leadersSectionSubhead:
    "Rankings reflect Epoch AI's tracked catalog — not general AI capability, product adoption, or economic impact. The default sort is recent tracked releases (past 3 years). Compute and frontier metrics apply only to the compute-known subset and are biased toward organizations that disclose training compute. Org entities are preserved as recorded in the source; no editorial consolidation is applied.",
  leadersTabOrgs: "Organizations",
  leadersTabCountries: "Countries",
  leadersColName: "Name",
  leadersColModels: "All dated records",
  leadersColFrontier: "Compute frontier",
  leadersColMaxCompute: "Peak reported compute",
  leadersColCategory: "Category",
  leadersGeopoliticsNote:
    "Geographic concentration in AI compute disclosure is directly tied to global economic and labor-market dynamics — see the",
  leadersGeopoliticsLink: "Global view",
  leadersBarModels: "All dated tracked records",
  leadersBarFrontier: "Compute-frontier records",
  leadersNoData: "No data available.",
  frontierBadge: "Compute frontier",

  // ── Redesigned leaderboard (rows-as-bars) ─────────────────────────────────
  /** Neutral sort-order column/label. NOT a capability rank — see dataDisclaimer. */
  leadersColRank: "Rank",
  /** sr-only caption for the leaderboard table that doubles as the visualization. */
  leadersTableCaption:
    "Tracked model activity leaderboard for the selected view and metric. Each row lists the entity, a fill bar encoding its value for the selected metric, the value shown as text, and its peak reported training compute.",
  /** Expandable disclosure holding coverage and definition caveats. */
  leadersWhyDisclosure: "Why these numbers?",

  // ── Metric selector labels (for Neo to wire) ──────────────────────────────
  metricRecentCount: "Recent tracked releases",
  metricModelCount: "All dated records",
  metricOpenWeightsCount: "Weights-available records",
  metricComputeKnownCount: "Compute-known records",
  metricFrontierCount: "Compute-frontier records",
  metricLargestRun: "Largest reported training run",

  // ── Per-metric descriptions ───────────────────────────────────────────────
  /** Interpolation vars: {windowStart} {windowEnd} */
  metricRecentCountDesc:
    "Full-catalog models with a recorded release date in the 3-year recent window ({windowStart} – {windowEnd}). Default sort. Reflects current tracked-output activity from the full dated catalog.",
  metricModelCountDesc:
    "All tracked Epoch AI records with a valid publication date, regardless of compute disclosure. Full dated catalog.",
  metricOpenWeightsCountDesc:
    "Source-catalog activity proxy: records where Epoch AI's 'Open model weights?' field is Yes, restricted-use open weights, or non-commercial open weights. Licenses may restrict use. Not a measure of downloads, adoption, permissive open-source status, model quality, or open-source impact.",
  metricComputeKnownCountDesc:
    "Records with a reported or estimated training compute value. This subset systematically underrepresents organizations and countries that do not disclose compute.",
  metricFrontierCountDesc:
    "Records carrying Epoch AI's 'Frontier' label: the historical top 10 by reported training compute at time of release. A compute-disclosure record — not a measure of capability, commercial success, or current relevance.",
  metricLargestRunDesc:
    "Peak reported or estimated training compute (FLOPs) from the compute-known subset. Reflects only disclosed compute; non-disclosing labs are absent.",

  // ── Epoch frontier definition ─────────────────────────────────────────────
  frontierDefinitionNote:
    "Epoch AI 'Frontier' label: the top 10 models by reported training compute at the time of release. This is a historical compute-disclosure record — not a measure of model capability, product impact, or current frontier status.",

  // ── Coverage note (interpolation-ready) ──────────────────────────────────
  /** Interpolation vars: {totalDated} {computeKnown} {coveragePct} {windowStart} {windowEnd} */
  coverageNote:
    "{totalDated} total dated records tracked; {computeKnown} with reported or estimated training compute ({coveragePct}% compute coverage). Recent window: {windowStart} – {windowEnd}.",

  // ── Country attribution note ──────────────────────────────────────────────
  countryAttributionNote:
    "Country attribution follows Epoch AI's source data. A model with multi-country affiliated organizations may be credited to multiple countries simultaneously, which can inflate counts for countries with active international collaborations. Compute and frontier metrics apply only to the compute-known subset and are biased toward organizations that disclose training compute. For example, an active Chinese open-weight model developer that does not disclose training compute would appear in recent-release and weights-available views but not in compute-known or frontier rankings; the same applies to any non-disclosing developer worldwide, and is not specific to Chinese labs.",

  // ── Bilingual definition strings (for Neo's details block) ───────────────
  /** Country default sort and compute-frontier ranking caveat. */
  countryDefaultSortDefinition:
    "Default country view: sorted by recent tracked releases (past 3 years), counting all dated catalog records in the window regardless of compute disclosure. Compute-known and compute-frontier columns reflect only organizations that disclose training compute and must not be used as a general ranking of national AI capability or output.",
  /** Multi-country co-attribution and summed-count caveat. */
  multiCountryAttributionDefinition:
    "A model with organizations affiliated with multiple countries is credited once to each named country. Summed country counts can therefore exceed the total number of unique models in the catalog.",

  // ── Org entities note ─────────────────────────────────────────────────────
  orgEntitiesNote:
    "Organizations appear as recorded in the Epoch AI source (e.g., Google, DeepMind, and Google DeepMind are separate entries). No editorial family consolidation is applied.",

  // ── Prominent data disclaimer ─────────────────────────────────────────────
  dataDisclaimer:
    "These rankings reflect Epoch AI's tracked records and do not measure AI capability, product adoption, commercial reach, open-source usage, or societal and economic impact.",

  // ── Section: Tracked Model Origins (World Map) ────────────────────────────
  mapSectionTitle: "Where Tracked Models Are Developed",
  mapSectionSubhead:
    "A geographic view of Epoch AI's tracked model records by attributed country. It depicts where tracked records originate — a descriptive view of catalog coverage, not a ranking of national AI capability, output, or impact.",
  /** Group label for the map's metric toggle. Reuses metricRecentCount / metricModelCount / metricOpenWeightsCount labels. */
  mapMetricSelectorLabel: "Map metric",
  mapLegendLabel: "Tracked records (selected metric)",
  mapLegendLow: "Fewer records",
  mapLegendHigh: "More records",
  /** Interpolation vars: {mapped} {total} {unmapped} */
  mapCoverageNote:
    "{mapped} of {total} tracked regions shown on map; {unmapped} multinational or unmapped entities excluded.",
  mapTooltipLabel: "Tracked records",
  mapTableCaption: "Tracked model records by country for the selected metric",
  mapTableColRegion: "Country or region",
  mapTableColCount: "Tracked records",
  mapEmpty: "No tracked records to map for the selected metric.",
  mapLoading: "Loading map…",

  // ── Section: Cost & Power Trends ───────────────────────────────────────────
  costPowerSectionTitle: "Training Cost & Power Draw",
  costPowerSectionSubhead:
    "Frontier training is becoming exponentially more expensive and energy-intensive. Median and peak costs shown in 2023 USD; power in Watts.",
  costChartTitle: "Training Cost by Year",
  costAxisYear: "Year",
  costAxisUsd: "Cost (2023 USD, log scale)",
  costLabelMedian: "Median cost",
  costLabelMax: "Peak cost",
  powerChartTitle: "Power Draw by Year",
  powerAxisYear: "Year",
  powerAxisW: "Power (W, log scale)",
  powerLabelMedian: "Median power",
  powerLabelMax: "Peak power",
  costPowerNote:
    "Only models with reported cost/power data are included. Coverage is limited and likely under-estimates true resource use.",

  // ── Section: Mix Cards ─────────────────────────────────────────────────────
  mixSectionTitle: "Model Landscape",
  mixAccessTitle: "Access mix",
  mixAccessSubhead: "Distribution across all dated catalog records",
  mixOpenWeights: "Open weights",
  mixClosed: "Closed",
  mixUnknown: "Unknown",
  mixDomainsTitle: "Domain distribution",
  mixDomainsSubhead: "Top domains across compute-known records",
  mixCountLabel: "models",
  /** Access-mix caveat: weights-available ≠ permissive open source. */
  mixAccessCaveat:
    "Weights-available records include restricted-use and non-commercial releases; license terms vary and are not validated in this catalog. Availability of weights does not imply permissive open-source licensing.",

  // ── Section: Why It Matters ────────────────────────────────────────────────
  whyTitle: "Why This Drives Workforce Disruption",
  /** Interpolation vars: {doublingTime} */
  whyBody:
    "A doubling of AI training compute every ~{doublingTime} months means that capabilities which seemed out of reach just two years ago are standard today. This pace — sustained since 2010 and still accelerating — has coincided with the displacement signals FutureGrid tracks across labor markets, sectors, and occupations. It is not driven by one company or one country; it is a systemic, global scaling of machine intelligence.",
  whyPoint1Title: "Capability expands faster than adaptation",
  whyPoint1:
    "When compute doubles faster than organizations can retrain workers or redesign workflows, the gap between what AI can do and what jobs currently require has continued to widen.",
  whyPoint2Title: "Compute disclosure reflects concentration",
  whyPoint2:
    "The compute-frontier records in Epoch AI's catalog are heavily concentrated among organizations that report training compute — primarily large, well-capitalized labs. This reflects a disclosure pattern as much as a capability pattern; many active AI developers worldwide do not publish compute figures, so compute and frontier metrics systematically undercount non-disclosing participants.",
  whyPoint3Title: "Cost and energy amplify the stakes",
  /** Interpolation vars: {peakCost} {peakPower} */
  whyPoint3:
    "Reported or estimated peak training runs in the source have reached {peakCost} and {peakPower}. Only well-capitalized entities can push the compute frontier — further concentrating the advantage among those who disclose it.",

  // ── Section: Attribution ──────────────────────────────────────────────────
  attributionSectionTitle: "Data Attribution",
  attributionPublisher: "Publisher",
  attributionLicense: "License",
  attributionAccessed: "Accessed",
  attributionDownload: "Download dataset",
  attributionCaveatsTitle: "Source caveats",
  attributionCaveat: "Caveat",
  attributionOpenSource: "Open dataset",

  // ── General ───────────────────────────────────────────────────────────────
  loading: "Loading…",
  models: "models",
  organizations: "organizations",
  countries: "countries",
  frontier: "compute frontier",
  sectionOf: "of",
  showMore: "Show more",
  globalPageLink: "/global",

  // ── Accessible names / summaries ─────────────────────────────────────────
  a11yCostPowerSummary:
    "Two line charts on a logarithmic y-axis. Left: AI training cost trends in 2023 USD " +
    "showing median and maximum cost lines over time. Right: AI training power draw trends " +
    "in watts showing median and maximum power lines over time. Both charts cover recent AI model history.",
  a11yFrontierLeadersSummary:
    "A leaderboard table of tracked model activity by organization and country. " +
    "Each row combines an entity name, an animated fill bar encoding its value for the selected metric, " +
    "and that value shown as text alongside its peak reported training compute. " +
    "Organizations tab: top 12 entities. Countries tab: top 10, sorted by recent tracked releases (past 3 years) by default. " +
    "The metric is changed with the controls above; the fill bars and text values are the accessible data — there is no separate chart or duplicate table.",
  a11yFrontierLeadersName: "Tracked model activity by organization and country",
};
