export const visaEn = {
  loading: "Loading chart…",

  // ── Hero ─────────────────────────────────────────────────────────────────────
  pageBadge: "H-1B Work Visas",
  pageTitle: "H-1B Work-Visa Trends",
  pageSubhead:
    "A decade of certified H-1B Labor Condition Applications (LCAs), FY2016–FY2025 — a demand signal for high-skill, employer-sponsored roles across the US economy.",
  disclaimer:
    "Descriptive labor-demand signal only — this is not immigration advice. Figures are employer filings (certified LCAs), not visa approvals.",

  // ── Stat cards ───────────────────────────────────────────────────────────────
  statVolumeLabel: "FY{year} Certified LCAs",
  statVolumeSub: "Labor Condition Applications certified by DOL OFLC",
  statWageLabel: "FY{year} Median Wage",
  statWageSub: "Median annualized offered wage across certified filings",
  statEmployersLabel: "FY{year} Distinct Employers",
  statEmployersSub: "Unique sponsoring employers in the latest year",
  statTopOccLabel: "Top Occupation FY{year}",
  statTopOccSub: "Highest certified-LCA volume in the latest year",

  // ── Wage trend ───────────────────────────────────────────────────────────────
  wageSectionTitle: "Offered-Wage Trend",
  wageSectionSubhead:
    "Median annualized offered wage with the 25th–75th percentile band across the decade.",
  wageMedianLabel: "Median annual wage",
  wageBandLabel: "25th–75th percentile",
  wageAxisY: "Annual wage (USD)",
  wageAxisX: "Fiscal year",
  wageChartName: "Median H-1B offered wage with 25th–75th percentile band, FY2016–FY2025",
  wageSummary:
    "Line chart of the median annualized offered wage on certified H-1B LCAs, with a shaded 25th–75th percentile band, by fiscal year.",

  // ── Volume trend ─────────────────────────────────────────────────────────────
  volumeSectionTitle: "Filing-Volume Trend",
  volumeSectionSubhead:
    "Certified LCAs and the total worker positions they cover, FY2016–FY2025.",
  volumeCertifiedLabel: "Certified LCAs",
  volumePositionsLabel: "Total worker positions",
  volumeAxisY: "Count",
  volumeChartName: "Certified H-1B LCAs and total worker positions by fiscal year, FY2016–FY2025",
  volumeSummary:
    "Line chart comparing the number of certified H-1B LCAs and the total worker positions those filings cover, by fiscal year.",

  // ── Top occupations ──────────────────────────────────────────────────────────
  occSectionTitle: "Top Occupations Over the Decade",
  occSectionSubhead:
    "The roles with the highest certified-LCA volume in the latest fiscal year, tracked back to FY2016 — which jobs rose and fell.",
  occNote:
    "Software Developers (SOC 15-1252) dominate throughout; data, analytics, and IT-management roles round out the top tier.",
  occAxisY: "Certified LCAs",
  occChartName: "Certified-LCA volume for the top H-1B occupations by fiscal year, FY2016–FY2025",
  occSummary:
    "Multi-line chart tracking certified-LCA volume for the leading H-1B occupations across the decade.",

  // ── Occupation mix ───────────────────────────────────────────────────────────
  mixSectionTitle: "Occupation Mix Over Time",
  mixSectionSubhead:
    "Share of certified LCAs held by each leading occupation, as a 100% stacked view by fiscal year.",
  mixNote:
    "Shares are computed within the top occupations plus an aggregated ‘Other’ band; they show composition shifts, not absolute counts.",
  mixOtherLabel: "Other occupations",
  mixAxisY: "Share (%)",
  mixChartName: "Share of certified LCAs by leading occupation and fiscal year, FY2016–FY2025",
  mixSummary:
    "100% stacked bar chart showing each leading occupation's share of certified LCAs by fiscal year.",

  // ── AI-exposure tiers ────────────────────────────────────────────────────────
  exposureSectionTitle: "H-1B Demand by AI-Exposure Tier",
  exposureSectionSubhead:
    "Certified-LCA volume bucketed by the automation-risk tier of each occupation — is skilled-visa demand shifting toward AI-exposed roles?",
  exposureCaption:
    "Each H-1B occupation’s SOC code is joined to FutureGrid’s occupation-snapshot automation-risk tiers ({rate} of occupations matched); unmatched codes fall into ‘Unclassified’. This is a descriptive overlay of two datasets, not a causal claim.",
  exposureAxisY: "Certified LCAs",
  exposureAxisYShare: "Share (%)",
  exposureChartName: "Certified-LCA volume by AI-exposure (automation-risk) tier and fiscal year, FY2016–FY2025",
  exposureSummary:
    "Stacked chart of certified-LCA volume by automation-risk tier (Low, Medium, High, Very High, Unclassified) across the decade.",
  exposureToggleLabel: "View",
  exposureToggleVolume: "Volume",
  exposureToggleShare: "Share",
  tierLow: "Low",
  tierMedium: "Medium",
  tierHigh: "High",
  tierVeryHigh: "Very High",
  tierUnclassified: "Unclassified",

  // ── Talent bottleneck lens ───────────────────────────────────────────────────
  talentBottleneckEyebrow: "Mined-data lens",
  talentBottleneckTitle: "Talent Bottleneck Lens",
  talentBottleneckSubtitle:
    "A SOC-level view joining certified H-1B LCAs, projected openings, job-posting signals, wages, and AI exposure into a descriptive bottleneck index.",
  talentBottleneckCaveatLabel: "Read as an index:",
  talentBottleneckCaveat:
    "Certified LCAs are not visa approvals; the bottleneck score is an index, not proof of shortage or causality; job postings are proxy/seed-derived where applicable.",
  talentBottleneckOccupationsTracked: "Occupations tracked",
  talentBottleneckOccupationsTrackedDetail: "{rows} ranked rows displayed",
  talentBottleneckLatestFiscalYear: "Latest H-1B fiscal year",
  talentBottleneckLatestFiscalYearDetail: "Certified-LCA signals use the latest fiscal-year slice",
  talentBottleneckProjectionWindow: "Projection window",
  talentBottleneckProjectionWindowDetail: "Employment projections base year to target year",
  talentBottleneckTopScore: "Top score / occupation",
  talentBottleneckChartTitle: "AI exposure × projected openings",
  talentBottleneckChartSubtitle:
    "Bubble size follows latest certified LCAs; colour follows automation-risk tier.",
  talentBottleneckChartAria:
    "Talent bottleneck bubble chart with AI exposure on the x-axis and projected annual openings on the y-axis.",
  talentBottleneckChartDesc:
    "Each bubble is an occupation. Larger bubbles have more latest-year certified LCAs, and colour indicates automation-risk tier.",
  talentBottleneckXAxis: "AI exposure",
  talentBottleneckYAxis: "Projected annual openings",
  talentBottleneckTableName: "Top 12 talent bottleneck occupations",
  talentBottleneckTableCaption:
    "Top 12 ranked occupations with bottleneck score, certified LCAs, projected openings, job postings, wage, AI exposure, and automation-risk tier.",
  talentBottleneckScoreLabel: "Score",
  talentBottleneckOccupation: "Occupation",
  talentBottleneckLatestLcas: "Latest LCAs",
  talentBottleneckOpenings: "Openings",
  talentBottleneckPostings: "Postings",
  talentBottleneckWage: "Wage",
  talentBottleneckAiExposure: "AI exposure",
  talentBottleneckRiskColumn: "AI exposure / risk",
  talentBottleneckMethodology: "Method:",
  talentBottleneckH1bTrendLabel: "Top row H-1B CAGR:",

  // ── Employers ────────────────────────────────────────────────────────────────
  employersSectionTitle: "Top Sponsoring Employers",
  employersSectionSubhead:
    "The 50 employers with the most certified H-1B LCAs across the decade — volume, mean wage, and per-year filing trend.",
  employersChartName: "Top H-1B sponsoring employers by total certified LCAs, FY2016–FY2025",
  employersSummary:
    "Horizontal bar chart of the employers with the highest total certified-LCA volume across the decade.",
  employersAxisX: "Certified LCAs (total)",
  employerDeepTableName: "Top H-1B sponsoring employers — detailed table with wage and trend",
  employerDeepTableCaption:
    "Detailed table of top H-1B sponsoring employers: total certified LCAs, mean annual wage, and per-year filing trend.",
  colMeanWage: "Mean annual wage",
  colYearTrend: "Year trend",
  employerShowMore: "Show all {n} employers",
  employerShowLess: "Show fewer",

  // ── States (existing) ─────────────────────────────────────────────────────────
  statesSectionTitle: "Top States",
  statesSectionSubhead:
    "States with the most certified H-1B LCAs across the decade, with the latest-year median wage.",
  statesTableName: "Top states by total certified H-1B LCAs",
  statesTableCaption: "Top states ranked by total certified H-1B LCAs, FY2016–FY2025.",

  // ── State deep-dive ───────────────────────────────────────────────────────────
  stateDeepSectionTitle: "State Deep-Dive",
  stateDeepSectionSubhead:
    "Sort and explore all 52 jurisdictions by total certified LCAs or latest median wage. Select a state (click a row or use the dropdown) to reveal its filing-volume trend, wage trajectory, and top occupations.",
  stateSortLabel: "Sort by",
  stateSortByTotal: "Total LCAs",
  stateSortByWage: "Median wage",
  stateSelectorLabel: "Select a state",
  stateDetailTitle: "{state} Detail",
  stateDetailCountByYear: "Certified LCAs by fiscal year",
  stateDetailWageByYear: "Median annual wage by fiscal year",
  stateDetailTopOccs: "Top occupations",
  statesDeepTableName: "All H-1B states — sortable by total LCAs or median wage",
  statesDeepTableCaption:
    "All 52 jurisdictions ranked by total certified H-1B LCAs or latest median wage, FY2016–FY2025.",
  stateCountChartName: "H-1B certified LCA volume for {state}, FY2016–FY2025",
  stateWageChartName: "Median H-1B wage for {state}, FY2016–FY2025",

  // ── Occupation wage trend ─────────────────────────────────────────────────────
  occWageTrendSectionTitle: "Wage Trajectories by Occupation",
  occWageTrendSectionSubhead:
    "Median annual offered wage on certified H-1B LCAs for the top 8 occupations (by FY2025 volume) that have wage-trend data. Gaps indicate fewer than 50 filings in a given fiscal year.",
  occWageTrendAxisY: "Median annual wage (USD)",
  occWageTrendChartName:
    "Median annual wage trend for top H-1B occupations by fiscal year, FY2016–FY2025",
  occWageTrendSummary:
    "Multi-line chart of median annual offered wage for the top 8 H-1B occupations with wage data, by fiscal year. Gaps in lines indicate fiscal years with fewer than 50 filings for that occupation.",
  occWageTrendGapNote:
    "Gaps in lines indicate fiscal years where fewer than 50 filings were recorded for that occupation.",
  occWageTrendSeriesCount: "{n} occupation series shown across {years} fiscal years.",

  // ── Shared table headers ─────────────────────────────────────────────────────
  colYear: "Fiscal year",
  colMedianWage: "Median wage",
  colP25: "25th percentile",
  colP75: "75th percentile",
  colCertified: "Certified LCAs",
  colPositions: "Worker positions",
  colEmployer: "Employer",
  colState: "State",
  colTotal: "Total certified LCAs",
  colShare: "Share",

  // ── Footer caveat ────────────────────────────────────────────────────────────
  caveatTitle: "How to read these numbers",
  caveatBody:
    "Certified LCAs are employer filings, not visa approvals or grants — a single LCA can cover multiple worker positions, and not every certified filing results in a hire or an issued visa. Read the figures as a directional demand signal for high-skill roles.",
  sourceNote:
    "Source: U.S. DOL OFLC LCA Disclosure Data (public domain). Per-quarter files summed by distinct case number for FY2020+; annual disclosure files for FY2016–FY2019.",
};
