export const pulseEn: Record<string, string> = {
  // ── Hero ──────────────────────────────────────────────────────────────────
  pageHeading: "Labor Market Pulse",
  pageSubhead:
    "Monthly U.S. labor-market dynamics from the Bureau of Labor Statistics Job Openings and Labor Turnover Survey (JOLTS) — layoffs, hires, openings, and quits.",
  dataSource: "Data: {publisher} · {survey}",
  generatedAt: "Snapshot: {date}",

  // ── Snapshot stat cards ───────────────────────────────────────────────────
  sectionSnapshot: "Latest Snapshot",
  statLatestMonth: "Latest data: {month}",
  statLayoffs: "Layoffs & Discharges",
  statOpenings: "Job Openings",
  statHires: "Hires",
  statQuits: "Quits",
  statThousands: "×1,000 persons",

  // ── Trend chart section ───────────────────────────────────────────────────
  sectionTrend: "National Layoffs & Discharges Trend",
  sectionTrendDesc:
    "Monthly U.S. layoffs and discharges since 2016 with NBER recession shading. Toggle hires overlay to compare.",

  chartToggleHires: "Overlay Hires",
  legendLayoffs: "Layoffs & Discharges",
  legendHires: "Hires",
  legendRecession: "Recession",
  chartPeakAnnotation: "COVID-19 peak",
  chartAxisDate: "Year",
  chartAxisLevel: "Level",

  tooltipLayoffs: "Layoffs",
  tooltipHires: "Hires",

  srTrendSummary:
    "Area chart showing U.S. monthly layoffs and discharges since 2016. Recession bands are shaded. A large spike occurred during the COVID-19 pandemic in early 2020.",

  // ── Industry chart section ────────────────────────────────────────────────
  sectionIndustry: "Layoffs by Industry",
  sectionIndustryDesc:
    "Latest month's layoffs and discharges by supersector (excludes aggregate totals). Toggle between level and rate.",

  toggleLevel: "Level (K)",
  toggleRate: "Rate (%)",
  chartIndustryAxisX: "Thousands",
  chartIndustryAxisXRate: "Rate (%)",

  tooltipLDL: "Layoffs (K)",
  tooltipLDR: "Layoffs rate",

  srIndustrySummary:
    "Horizontal bar chart showing the latest layoffs and discharges by U.S. industry supersector.",

  // ── Methodology / footnote ────────────────────────────────────────────────
  methodologyTitle: "Methodology & Source",
  methodologyText:
    "BLS JOLTS measures job openings, hires, and separations (layoffs & discharges, quits, and other separations) in the U.S. nonfarm sector. Values represent seasonally adjusted monthly estimates.",
  licenseLine: "License: {license}",
  sourceNote: "{note}",
  learnMore: "Learn more at BLS JOLTS →",
};
