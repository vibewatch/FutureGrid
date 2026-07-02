export const chartsEn: Record<string, string> = {
  // ── Risk band labels ──────────────────────────────────────────────────────
  legendLow:       "Low",
  legendMedium:    "Medium",
  legendHigh:      "High",
  legendVeryHigh:  "Very High",

  // ── Axis titles (with arrow) ──────────────────────────────────────────────
  axisAIExposure:        "AI Exposure →",
  axisBrightOutlookShare: "Bright-Outlook Share →",
  axisMedianSalaryLog:   "Median Annual Salary (log) →",
  axisSkillCategoryFlows: "Skill Category Flows →",
  axisGDPPerWorker:      "GDP per Working-Age Adult (log scale) →",
  axisAIUsageIndexArrow: "AI Usage Index →",

  // ── Shared labels (tooltips, non-arrow axis, legends) ────────────────────
  labelOccupations:      "Occupations",
  labelAIExposure:       "AI Exposure",
  labelEmployment:       "Employment",
  labelMedianWage:       "Median Wage",
  labelMedianSalary:     "Median Salary",
  labelSalary:           "Salary",
  labelBrightOutlook:    "Bright Outlook",
  labelUsageIndex:       "Usage Index",
  labelGlobalShare:      "Global Share",
  labelUsageCount:       "Usage Count",
  labelGDPWorker:        "GDP / Worker",
  labelProjectedOpenings: "Projected Openings / yr",

  // ── Click-to-explore tooltip footers ────────────────────────────────────
  tooltipClickSector:     "Click to explore sector →",
  tooltipClickOccupation: "Click to explore occupation →",
  tooltipClickCareer:     "Click to explore career →",

  // ── Legend annotations ───────────────────────────────────────────────────
  legendBubbleEmp:       "bubble = total employment",
  legendDotEmp:          "dot size = employment",
  legendAreaEmp:         "· Area = total employment",
  legendLowAIExposure:   "Low AI exposure",
  legendHighAIExposure:  "High AI exposure",
  legendSankeyLinkWidth: "Link width = shared skill count · Click a target to explore",
  legendHeatmapNorm:     "Normalised 0–1 per metric (colour only) · grey = no data",

  // ── SkillTransitionChart ─────────────────────────────────────────────────
  sectionHighRisk:        "High Risk",
  sectionLowRiskPathways: "Low Risk Pathways",
  tooltipHighRiskWorkers: "High Risk Workers",
  tooltipLowRiskPathway:  "Low Risk Pathway",
  tooltipSkillsGroup:     "{group} Skills",

  // ── SkillFlowSankey ──────────────────────────────────────────────────────
  sankeyHighAIExposure:        "High AI Exposure",
  sankeyResilientPathways:     "Resilient Pathways",
  legendHighAIExposureSource:  "High AI-exposure source",
  legendResilientCareerTarget: "Resilient career target",

  // ── WorldChoropleth metric toggles (verbatim — asserted by tests) ────────
  metricClaude:       "Claude.ai usage",
  metricDiffusion:    "GenAI diffusion",
  metricReadiness:    "AI readiness",
  metricGovReadiness: "Gov. readiness",
  metricDemand:      "AI job demand",

  // ── WorldChoropleth view mode ─────────────────────────────────────────────
  viewModeMap:    "Map",
  viewModeBubbles: "Bubbles",

  // ── WorldChoropleth states / controls ────────────────────────────────────
  mapError:              "Map unavailable — could not load world geometry.",
  noData:                "No data",
  noClaudeData:          "No Claude.ai data",
  legendBubbleProportional: "Bubble size ∝ metric value",
  proxyRestrictedData:   "Proxy / restricted data",
  buttonResetView:       "Reset view",

  // ── WorldChoropleth legend descriptions ──────────────────────────────────
  legendAIUsagePcIndex:    "AI usage index (per-capita)",
  legendGenAIDiffusionPop: "GenAI diffusion (% of working-age pop)",
  legendGovReadinessOxford: "Gov. AI readiness (Oxford, 0–100)",
  legendAIReadinessIMF:    "AI readiness (IMF AIPI, 0–1)",
  legendAIJobDemand:      "AI job demand (% job postings mentioning AI)",

  // ── WorldChoropleth bubble legend ────────────────────────────────────────
  legendBubbleColourSize:  "Bubble colour + size = {metric}",
  legendMetricAIUsage:     "AI usage index",
  legendMetricGenAI:       "GenAI diffusion %",
  legendMetricGovReady:    "Gov. AI readiness",
  legendMetricAIReady:     "AI readiness",
  legendMetricDemand:     "AI job demand",

  // ── WorldChoropleth TooltipContent strings ───────────────────────────────
  tooltipReadinessLabel:    "AI readiness:",
  tooltipReadinessNote:     "IMF AIPI, 0–1",
  noAIReadinessData:        "No AI readiness data",
  tooltipGovReadinessLabel: "Gov. readiness:",
  tooltipGovReadinessNote:  "Oxford, 0–100",
  noGovReadinessData:       "No gov. readiness data",
  tooltipGenAIUseLabel:     "GenAI use:",
  tooltipGenAIUseNote:      "of working-age pop.",
  noGenAIDiffusionData:     "No GenAI diffusion data",
  tooltipAIUsageIndexLabel: "AI usage index:",
  tooltipGlobalShareLabel:  "Global share:",
  noClaudeAIUsageData:      "No Claude.ai usage data",
  tooltipAIJobDemandLabel: "AI job-posting share:",
  noAIJobDemandData:       "No AI job demand data",

  // ── CountryExposureChart ─────────────────────────────────────────────────
  barAxisAIUsageIndex: "AI USAGE INDEX (PER-CAPITA, WORLD AVG = 1.0)",
  barAxisGlobalShare:  "SHARE OF GLOBAL AI USAGE",
  metricPerCapitaIndex: "Per-Capita Index",

  // ── OccupationTrendChart ─────────────────────────────────────────────────
  emptyInsufficientHistory: "Insufficient history",

  // ── PredictiveChart ──────────────────────────────────────────────────────
  statOccupationsShown:  "Occupations Shown",
  statAvgAIExposure:     "Avg AI Exposure",
  statBrightOutlook:     "Bright Outlook",
  emptyNoProjectionData: "No projection data available for this sector",

  // ── JobImpactChart ───────────────────────────────────────────────────────
  emptyNoSectorData: "No data available for this sector",

  // ── CareerTrendChart (chart.js) ──────────────────────────────────────────
  chartTitleAvgAIExposure:    "Average AI Exposure by Sector",
  datasetAIExposure:          "AI Exposure",
  tooltipAIExposureCallback:  "  AI Exposure: {value}",

  // ── TreemapChart ─────────────────────────────────────────────────────────
  treemapClickHint: "Click a sector header to zoom in · click a tile to explore that career",
  treemapBack:      "← All Sectors",

  // ── QuadrantScatterChart ──────────────────────────────────────────────────
  quadrantLowerLower:  "Lower pay · Lower exposure",
  quadrantLowerHigher: "Lower pay · Higher exposure",
  quadrantHigherLower: "Higher pay · Lower exposure",
  quadrantHigherHigher: "Higher pay · Higher exposure",
  buttonResetZoom:     "Reset zoom",

  // ── HeatmapChart column (short) labels ───────────────────────────────────
  heatmapShortAIUsage:    "AI Usage",
  heatmapShortDiffusion:  "Diffusion",
  heatmapShortReadiness:  "Readiness",
  heatmapShortGovReady:   "Gov. Ready",
  heatmapShortDigInfra:   "Dig. Infra",
  heatmapShortHumanCap:   "H. Capital",
  heatmapShortInnovation: "Innovation",
  heatmapShortRegEthics:  "Reg./Ethics",

  // ── HeatmapChart tooltip (full) labels ───────────────────────────────────
  heatmapLabelAIUsageIndex:   "AI Usage Index",
  heatmapLabelGenAIDiffusion: "GenAI Diffusion",
  heatmapLabelAIReadiness:    "AI Readiness",
  heatmapLabelGovReadiness:   "Gov. Readiness",
  heatmapLabelDigInfra:       "Digital Infrastructure",
  heatmapLabelHumanCapital:   "Human Capital",
  heatmapLabelInnovation:     "Innovation",
  heatmapLabelRegEthics:      "Regulation & Ethics",

  // ── Accessible names (aria-label / figure label) ─────────────────────────
  a11yCareerTrendName:     "Bar chart: average AI exposure by sector",
  a11yJobImpactName:       "Bar chart: top occupations by AI exposure probability",
  a11ySkillTransitionName: "Diverging bar chart: skill category transitions for high vs low AI-risk workers",
  a11yCostPowerName:       "Line charts: AI training cost and power draw trends over time",
  a11yFrontierLeadersName: "Bar chart: top AI organizations and countries by frontier model count",
  a11yHeatmapName:         "Heatmap: 25 major countries scored on 8 AI readiness indicators",
  a11yPredictiveName:      "Horizontal bar chart: top occupations by projected annual openings",

  // ── Screen-reader summaries (figcaption / sr-only) ────────────────────────
  a11yCareerTrendSummary:
    "Bar chart comparing average AI exposure probability across employment sectors. " +
    "Each bar represents one sector. Bar color encodes risk level: green = low, " +
    "yellow = medium, orange = high, red = very high.",
  a11yJobImpactSummary:
    "Vertical bar chart showing AI exposure probability for up to 20 top-risk occupations, " +
    "sorted highest first. Bar color encodes risk level: green = low, yellow = medium, " +
    "orange = high, red = very high. Hover over a bar to see the occupation name and exact probability.",
  a11ySkillTransitionSummary:
    "Diverging bar chart comparing five skill categories — Technical, Cognitive, " +
    "Interpersonal, Administrative, Management — for high AI-risk workers (bars extend " +
    "left, red) versus low-risk career pathways (bars extend right, green). " +
    "Bar length is proportional to estimated worker count.",
  a11yCostPowerSummary:
    "Two line charts on a logarithmic y-axis. Left: AI training cost trends in 2023 USD " +
    "showing median and maximum cost lines over time. Right: AI training power draw trends " +
    "in watts showing median and maximum power lines over time. Both charts cover recent AI model history.",
  a11yFrontierLeadersSummary:
    "Horizontal bar chart showing top AI organizations and countries. " +
    "Organizations tab: top 12 by total model count and frontier model count. " +
    "Countries tab: top 10 by total and frontier model count. " +
    "A supplemental data table is visible below the chart for screen readers.",
  a11yHeatmapSummary:
    "Heatmap comparing 25 countries on 8 AI metrics: AI Usage Index, GenAI Diffusion %, " +
    "AI Readiness (IMF AIPI), Government AI Readiness (Oxford, 0–100), " +
    "Digital Infrastructure, Human Capital, Innovation, and Regulation & Ethics sub-indices. " +
    "Each metric is independently normalized 0–1 for color comparison. " +
    "Grey cells indicate no data. A data table follows for keyboard and screen-reader access.",
  a11yPredictiveSummary:
    "Horizontal bar chart showing occupations with the highest projected annual openings. " +
    "Each bar length represents annual projected openings. " +
    "Color uses a gradient from violet (lower) to cyan (higher). " +
    "Summary statistics are shown above the chart.",

  // ── Heatmap accessible data table headers ────────────────────────────────
  a11yHeatmapTableCaption: "Heatmap data: 25 countries × 8 AI metrics",
  a11yHeatmapThCountry:    "Country",
  a11yHeatmapThValue:      "Value",
};
