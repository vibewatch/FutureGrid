export const frontierEn = {
  // ── Page ──────────────────────────────────────────────────────────────────
  pageTitle: "AI Frontier",
  pageBadge: "Engine of Disruption",
  pageSubhead:
    "Everywhere else in FutureGrid you see AI's impact on jobs. Here you see why it keeps accelerating — the raw compute driving it is on a steep, unrelenting exponential.",

  // ── Hero stat cards ────────────────────────────────────────────────────────
  statDoublingLabel: "Compute doubling time",
  statDoublingSub: "Modern era 2010–2026 · r²=0.65",
  statModelsLabel: "Notable models tracked",
  statModelsSub: "1950–2026 with compute estimates",
  statFrontierLabel: "Top frontier country",
  statLargestLabel: "Largest training run",

  // ── Section: Compute Timeline ──────────────────────────────────────────────
  timelineSectionTitle: "Training Compute Over Time",
  timelineSectionSubhead:
    "Each point is a notable AI model with a compute estimate (training FLOPs). Frontier models are highlighted. The trend line shows the fitted modern-era exponential.",
  timelineAnnotation: "doubles every ~5.7 months",
  timelineAnnotationFull: "Compute doubles every ~5.7 months (modern era, r²=0.65, n=466)",
  axisDate: "Year",
  axisCompute: "Training Compute (FLOP)",
  legendAll: "All models",
  legendFrontier: "Frontier models",
  legendTrend: "Exponential trend (2010–)",
  tooltipModel: "Model",
  tooltipOrg: "Organization",
  tooltipDate: "Date",
  tooltipCompute: "Training compute",
  tooltipCountry: "Country",
  tooltipFrontier: "Frontier",
  tooltipFrontierYes: "Yes",
  tooltipFrontierNo: "No",
  tooltipConfidence: "Confidence",

  // ── Section: Frontier Leaders ──────────────────────────────────────────────
  leadersSectionTitle: "Who Builds the Frontier",
  leadersSectionSubhead:
    "Organizations and countries ranked by model count, frontier model count, and peak compute. The US leads by a wide margin; China and European institutions are growing contributors.",
  leadersTabOrgs: "Organizations",
  leadersTabCountries: "Countries",
  leadersColName: "Name",
  leadersColModels: "Models",
  leadersColFrontier: "Frontier",
  leadersColMaxCompute: "Peak compute",
  leadersColCategory: "Category",
  leadersGeopoliticsNote:
    "Geographic concentration in frontier AI is directly tied to global economic and labor-market dynamics — see the",
  leadersGeopoliticsLink: "Global view",
  leadersBarModels: "Model count",
  leadersBarFrontier: "Frontier count",
  leadersNoData: "No data available.",
  frontierBadge: "Frontier",

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
  mixAccessTitle: "Access model",
  mixOpenWeights: "Open weights",
  mixClosed: "Closed",
  mixUnknown: "Unknown",
  mixDomainsTitle: "Domain distribution",
  mixDomainsSubhead: "Top domains across all compute models",
  mixCountLabel: "models",

  // ── Section: Why It Matters ────────────────────────────────────────────────
  whyTitle: "Why This Drives Workforce Disruption",
  whyBody:
    "A doubling of AI training compute every ~5.7 months means that capabilities which seemed out of reach just two years ago are standard today. This pace — sustained since 2010 and still accelerating — has coincided with the displacement signals FutureGrid tracks across labor markets, sectors, and occupations. It is not driven by one company or one country; it is a systemic, global scaling of machine intelligence.",
  whyPoint1Title: "Capability expands faster than adaptation",
  whyPoint1:
    "When compute doubles faster than organizations can retrain workers or redesign workflows, the gap between what AI can do and what jobs currently require has continued to widen.",
  whyPoint2Title: "Concentration creates geopolitical asymmetries",
  whyPoint2:
    "77 of the tracked frontier models originate in the United States, compared to 4 in China and 9 in the United Kingdom. That concentration shapes which economies gain productivity leverage first.",
  whyPoint3Title: "Cost and energy amplify the stakes",
  whyPoint3:
    "Peak training runs now exceed $300 million and 100 MW. Only well-capitalized entities can push the frontier — further concentrating the advantage.",

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
  frontier: "frontier",
  sectionOf: "of",
  showMore: "Show more",
  globalPageLink: "/global",

  // ── Accessible names / summaries ─────────────────────────────────────────
  a11yCostPowerSummary:
    "Two line charts on a logarithmic y-axis. Left: AI training cost trends in 2023 USD " +
    "showing median and maximum cost lines over time. Right: AI training power draw trends " +
    "in watts showing median and maximum power lines over time. Both charts cover recent AI model history.",
  a11yFrontierLeadersSummary:
    "Horizontal bar chart showing top AI organizations and countries. " +
    "Organizations tab: top 12 by total model count and frontier model count. " +
    "Countries tab: top 10 by total and frontier model count. " +
    "A supplemental data table is visible below the chart.",
  a11yFrontierLeadersName: "Bar chart: top AI organizations and countries by frontier model count",
};
