export const methodologyEn = {
  // ── Hero ─────────────────────────────────────────────────────────────────────
  heroHeadline: "Methodology & Data Changelog",
  heroSubhead:
    "How each metric is derived, what it measures, and the provenance of every dataset that powers FutureGrid.",

  // ── Caveat callout ───────────────────────────────────────────────────────────
  caveatHeading: "⚠ Important: Do Not Merge Non-Comparable Metrics",
  caveatBody:
    "Each metric on FutureGrid uses a different source, scale, and vintage. AI Exposure scores, WARN Pressure ranks, Market-Signal scores, and Disruption Index values are not on a common scale and must not be combined, averaged, or directly compared as if they were. Similarly, a null value in any metric means data is unavailable for that jurisdiction or occupation — it is NOT zero and must not be treated as such.",
  caveatNullNote:
    "Null ≠ Zero: when a state or occupation shows no value, it means the required data (machine-readable WARN coverage, valid LAUS labor force, overlapping notice window, or exposure index coverage) is absent — not that the risk is zero.",

  // ── Section: AI Exposure Blending ────────────────────────────────────────────
  exposureHeading: "AI Exposure Blending",
  exposureSubhead:
    "How FutureGrid measures the degree to which AI tools are already used in, or could affect, an occupation.",
  exposureLensUsage: "Usage (observed AEI exposure)",
  exposureLensUsageDesc:
    "The primary metric. Derived from the Anthropic Economic Index (AEI), which surveyed real-world Claude API usage patterns to score how frequently AI is currently used in tasks associated with each SOC occupation. Scaled 0–100.",
  exposureLensCapability: "Capability (LLM exposure)",
  exposureLensCapabilityDesc:
    "From the OpenAI 'GPTs are GPTs' study (Eloundou et al., MIT license). Scores how capable GPT-4-class models are at performing occupation tasks, independent of whether workers currently use AI. Scaled 0–100.",
  exposureLensAbility: "Ability (AIOE index)",
  exposureLensAbilityDesc:
    "The Felten, Raj & Seamans (2021) AI Occupational Exposure index, mapping AI application areas to O*NET work activities. Reflects structural task-level AI applicability, not current adoption. Scaled 0–100.",
  exposureLensAutomation: "Automation baseline",
  exposureLensAutomationDesc:
    "Frey & Osborne (2013) computerization probability. An older benchmark measuring susceptibility to task automation (not specifically AI). Included for longitudinal context; license is unclear so it is not offered for download.",
  exposureConsensusDesc:
    "The 'consensus' lens is the unweighted average of Usage, Capability, and Ability — the three modern, AI-specific lenses — for occupations where all three are available. When one or more lenses are missing, consensus is the average of the available modern lenses. The automation baseline is intentionally excluded from the consensus average because it measures a broader, older concept of task computerization.",
  exposureGapDesc:
    "The 'gap' (Capability minus Usage) indicates how much further AI could displace occupation tasks beyond current observed usage. A high positive gap suggests the occupation is structurally exposed but workers have not yet adopted AI heavily.",
  exposureCaveat:
    "Caveat: These scores describe current and potential AI involvement in occupational tasks. They do not predict job loss, and observed exposure today can increase or decrease as AI tools evolve. Cross-occupation comparisons should account for differences in data vintage and methodology across the three source studies.",

  // ── Section: WARN Pressure Ranking ───────────────────────────────────────────
  warnHeading: "WARN Pressure Ranking",
  warnSubhead:
    "Which states are ranked, how the pressure score is built, and why many jurisdictions show null instead of a score.",
  warnEligibilityTitle: "Ranking Eligibility",
  warnEligibilityDesc:
    "A state is eligible for ranking only if all three conditions are met: (1) the state has machine-readable WARN Act notice data available (not manual-only or unavailable), (2) BLS LAUS labor-force data is valid for the latest reported month, and (3) at least one WARN notice falls within the rolling 12-month lookback window ending at the most recent data build date. States that fail any condition receive a null pressure score — NOT zero.",
  warnNullNote:
    "Manual-only states (those that publish WARN data as PDF or HTML tables only) and states with no machine-readable coverage are not ranked. Their null value signals a data gap, not the absence of WARN activity.",
  warnScoringTitle: "Pressure Score Formula",
  warnScoringDesc:
    "For eligible states, the pressure score blends WARN employee notices (normalized per 10 000 labor-force) with the year-over-year change in the state unemployment rate. Both components are percentile-ranked across all eligible states in the current build. Higher scores indicate both more WARN-notice volume relative to labor force and worsening unemployment rates.",
  warnWindowTitle: "12-Month WARN Window",
  warnWindowDesc:
    "Only notices with an effective date falling within the 12 months prior to the data build date are counted. Notices outside this window are excluded to keep the ranking current and comparable across builds.",
  warnCaveat:
    "Caveat: WARN coverage is uneven across states — some states have comprehensive machine-readable data, others rely on manual scraping or offer no public machine-readable feed. The ranking reflects available data, not the true distribution of WARN activity nationwide. Do not interpret a state's null as having zero layoff pressure.",

  // ── Section: Market-Signal Scoring ───────────────────────────────────────────
  marketHeading: "Market-Signal Scoring",
  marketSubhead:
    "How the 0–100 Market AI Sensitivity Score is constructed and what it does — and does not — mean.",
  marketScoringTitle: "Score Construction",
  marketScoringDesc:
    "The marketAiSensitivityScore is a clamped 0–100 descriptive blend of two normalized components: 65% weight on the sector ETF's excess total return versus the S&P 500 (SPY) benchmark, and 35% weight on the employment-weighted AI exposure of occupations mapped to that sector. Both components are min-max normalized across all available sector ETFs in the current build window.",
  marketBenchmarkDesc:
    "The benchmark comparison window starts from a fixed date (typically 12 months prior to data build) and uses daily price observations sourced from the Yahoo Finance chart endpoint. Because the Yahoo Finance endpoint is unofficial and redistribution is prohibited under Yahoo's Terms of Service, the raw market-signal dataset is not available for download.",
  marketNonAdvisoryTitle: "Non-Advisory Disclaimer",
  marketNonAdvisoryDesc:
    "The Market AI Sensitivity Score is a descriptive, exploratory metric only. It is not investment advice, financial advice, or a recommendation to buy or sell any security or ETF. Past performance of sector ETFs versus SPY does not predict future returns. The score must not be scaled as a fraction of another metric or merged with non-market metrics.",
  marketCaveat:
    "Caveat: ETF-to-occupation mappings are heuristic — a technology-sector ETF may contain companies from multiple O*NET sectors and vice versa. Coverage gaps are listed in the dataset's 'omittedTickers' field. Scores change with each data build as market conditions shift.",

  // ── Section: Forecast / Regression / Disruption ──────────────────────────────
  forecastHeading: "Forecast, Regression & Disruption Index",
  forecastSubhead:
    "How employment forecasts, the Pearson correlation, and the Disruption Index are computed.",
  regressionTitle: "Linear Regression & Pearson Correlation",
  regressionDesc:
    "For each scatter analysis (AI exposure vs. employment growth; AI exposure vs. wage growth), FutureGrid applies ordinary least-squares linear regression using all occupations with finite values for both variables. The Pearson r coefficient is computed from the same pairs. These are purely descriptive statistics on historical BLS OEWS data (2016–2025) — they describe associations, not causal relationships.",
  forecastTitle: "2030 Employment Forecast",
  forecastDesc:
    "The baseline 2030 forecast extrapolates each occupation's historical employment trend (a CAGR computed from its BLS OEWS history) linearly from 2026 to 2030. The AI-adjusted forecast applies a sensitivity multiplier (default 0.5) that nudges the projected growth rate downward proportional to the occupation's AI exposure score. Both are projections based on trend extrapolation — not economic models. Actual 2030 employment will differ.",
  disruptionTitle: "Disruption Index",
  disruptionDesc:
    "The AI Disruption Index score (0–100) for each occupation is a weighted combination of four percentile-ranked components: AI exposure (40%), employment decline rate (25%), wage stagnation (20%), and absence of a BLS 'Bright Outlook' designation (15%). Each component is min-max normalized across all occupations with complete data. The index describes relative structural pressure — it is not a prediction of layoffs.",
  forecastCaveat:
    "Caveat: All forecasts and regression results are descriptive analyses of historical data. They are not econometric causal models, they do not account for policy changes, technological disruption beyond historical trends, or macroeconomic shocks. 2030 projections carry wide uncertainty intervals that are not displayed in the UI.",

  // ── Section: Data Changelog ───────────────────────────────────────────────────
  changelogHeading: "Data Changelog",
  changelogSubhead:
    "Dataset vintages sourced from the provenance registry (data/provenance.json). Sorted by most-recent build date.",
  changelogColDataset: "Dataset",
  changelogColAsOf: "As Of",
  changelogColGenerated: "Generated",
  changelogColVersion: "Version",
  changelogColRows: "Records",
  changelogColSource: "Source",
  changelogNa: "—",
  changelogNoData: "No provenance data available.",

  // ── Section: Download ─────────────────────────────────────────────────────────
  downloadHeading: "Download Data",
  downloadSubhead:
    "Compliance-cleared datasets are available for download. Files flagged with redistribution restrictions are listed as unavailable.",
  downloadClearedLabel: "Download",
  downloadSizeNote: "(file size: {size})",
  downloadUnavailable: "Not available for redistribution",
  downloadUnavailableReason: "Reason:",
  downloadLicenseLabel: "License:",
  downloadAttributionLabel: "Required attribution:",
  downloadComplianceLink: "See COMPLIANCE.md",
  downloadClearedHeading: "Available Downloads",
  downloadFlaggedHeading: "Flagged / Restricted",
};

export type MethodologyEn = typeof methodologyEn;
