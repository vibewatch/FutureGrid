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

  // ── Employers ────────────────────────────────────────────────────────────────
  employersSectionTitle: "Top Sponsoring Employers",
  employersSectionSubhead:
    "Employers with the most certified H-1B LCAs across the decade.",
  employersChartName: "Top H-1B sponsoring employers by total certified LCAs, FY2016–FY2025",
  employersSummary:
    "Horizontal bar chart of the employers with the highest total certified-LCA volume across the decade.",
  employersAxisX: "Certified LCAs (total)",

  // ── States ───────────────────────────────────────────────────────────────────
  statesSectionTitle: "Top States",
  statesSectionSubhead:
    "States with the most certified H-1B LCAs across the decade, with the latest-year median wage.",
  statesTableName: "Top states by total certified H-1B LCAs",
  statesTableCaption: "Top states ranked by total certified H-1B LCAs, FY2016–FY2025.",

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
