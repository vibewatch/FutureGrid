export const laborEn = {
  pageTitle: "Labor Market",
  pageSubhead: "Turnover trends and layoff notices — BLS JOLTS data and WARN Act filings.",
  tabTrends: "Turnover & Trends",
  tabPressure: "WARN Pressure",
  tabNotices: "Layoff Notices",
  loading: "Loading…",
  pressureBadge: "WARN Pressure",
  pressureHeroTitle: "WARN Pressure Index",
  pressureHeroSubhead:
    "A state ranking that associates WARN employees with BLS LAUS labor-force and unemployment context. It ranks only current machine-readable WARN states with coverage in the 12-month WARN window.",
  pressureFormulaTitle: "Descriptive pressure score",
  pressureFormulaText:
    "Score = round(0.70 × WARN-rate percentile + 0.30 × unemployment YoY delta percentile).",
  pressureNonCausalNote:
    "This is an association and coverage ranking only; it is not evidence that one metric produces another.",
  pressureSnapshotHeading: "Pressure snapshot",
  pressureSnapshotDesc:
    "BLS LAUS latest month: {blsMonth} · WARN latest month: {warnMonth}",
  pressureStatRankedStates: "Ranked states",
  pressureStatRankedStatesSub: "{total} states + DC tracked · {excluded} not ranked",
  pressureStatTopState: "Highest index score",
  pressureStatTopStateSub: "{score} / 100 · {band}",
  pressureStatWarnWindow: "WARN window",
  pressureStatWarnWindowSub: "{employees} WARN employees in ranked states",
  pressureStatLatestLaus: "Latest LAUS month",
  pressureStatLatestLausSub: "{publisher} {survey}",
  pressureRankingHeading: "Ranked WARN pressure states",
  pressureRankingDesc:
    "Eligible states are sorted by pressure score. Rates normalize WARN employees against state labor force.",
  pressureNoRankedStates: "No states are currently eligible for WARN pressure ranking.",
  pressureRankingSrLabel:
    "Ranked table of WARN pressure scores, WARN rates, WARN employees, notices, unemployment rates, and unemployment year-over-year changes.",
  pressureTableRank: "Rank",
  pressureTableState: "State",
  pressureTableScore: "Pressure score",
  pressureTableLevel: "Pressure level",
  pressureTableWarnRate: "WARN employees per 10k labor force",
  pressureTableWarnEmployees: "WARN employees / notices",
  pressureTableUnemployment: "Unemployment rate",
  pressureTableUnemploymentDelta: "Unemployment YoY",
  pressureNoticeCount: "{notices} notices",
  pressureBandHigh: "High",
  pressureBandElevated: "Elevated",
  pressureBandWatch: "Watch",
  pressureBandLow: "Low",
  pressureBandNotRanked: "Not ranked",
  pressureCoverageHeading: "Coverage context",
  pressureCoverageDesc:
    "Manual, unavailable, PDF-only, failed, or historical WARN feeds stay visible but do not receive ranks.",
  pressureCoverageLive: "Current machine-readable",
  pressureCoverageManual: "Manual review",
  pressureCoverageUnavailable: "Unavailable",
  pressureCoverageHistorical: "Historical/stale",
  pressureCoveragePdf: "PDF-only",
  pressureCoverageFailed: "Failed",
  pressureCoverageNote:
    "Only current machine-readable WARN states with valid LAUS data and coverage in the 12-month WARN window enter the score ranking; all other states are listed for coverage context.",
  pressureNotRankedHeading: "Not-ranked states",
  pressureNoExcludedStates: "Every tracked state is currently rank eligible.",
  pressureDefaultExclusion: "WARN coverage is not current machine-readable for ranking.",
  pressureMethodHeading: "Methodology & sources",
  pressureMethodText:
    "WARN Pressure combines WARN employee rates with BLS LAUS unemployment movement for comparable state pressure context.",
  pressureMethodFormula:
    "Pressure score is rounded from 70% WARN-rate percentile plus 30% unemployment-rate YoY delta percentile among rank-eligible states.",
  pressureMethodCaveats:
    "WARN coverage varies by state; notices are filings for planned reductions; BLS LAUS data can lag. Use this as a descriptive association signal, not proof that one series explains another.",
  pressureSourceLine:
    "Source: {source} from {publisher}; WARN state filing snapshots. License: {license}.",
  pressureSourceLink: "Open BLS LAUS source",
};
