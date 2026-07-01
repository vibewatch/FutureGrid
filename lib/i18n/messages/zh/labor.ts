export const laborZh = {
  pageTitle: "劳动力市场",
  pageSubhead: "就业流动趋势与裁员通告——BLS JOLTS 数据及 WARN 法案申报。",
  tabTrends: "流动与趋势",
  tabPressure: "WARN Pressure",
  tabNotices: "裁员通告",
  loading: "加载中…",
  pressureBadge: "WARN Pressure",
  pressureHeroTitle: "WARN Pressure 指数",
  pressureHeroSubhead:
    "将 WARN 员工人数与 BLS LAUS 劳动力和失业背景做关联排序；仅对当前机器可读且覆盖 12 个月 WARN 窗口的州进行排名。",
  pressureFormulaTitle: "描述性压力评分",
  pressureFormulaText:
    "Score = round(0.70 × WARN-rate percentile + 0.30 × unemployment YoY delta percentile)。",
  pressureNonCausalNote:
    "这是关联和覆盖范围排名，不表示一个指标会产生另一个指标。",
  pressureSnapshotHeading: "压力快照",
  pressureSnapshotDesc:
    "BLS LAUS 最新月份：{blsMonth} · WARN 最新月份：{warnMonth}",
  pressureStatRankedStates: "已排名州",
  pressureStatRankedStatesSub: "追踪 {total} 个州及 DC · {excluded} 个未排名",
  pressureStatTopState: "最高指数得分",
  pressureStatTopStateSub: "{score} / 100 · {band}",
  pressureStatWarnWindow: "WARN 窗口",
  pressureStatWarnWindowSub: "已排名州中 {employees} 名 WARN 员工",
  pressureStatLatestLaus: "最新 LAUS 月份",
  pressureStatLatestLausSub: "{publisher} {survey}",
  pressureRankingHeading: "WARN 压力州排名",
  pressureRankingDesc:
    "符合条件的州按压力评分排序；比率将 WARN 员工人数按州劳动力规模标准化。",
  pressureNoRankedStates: "当前没有州符合 WARN Pressure 排名条件。",
  pressureRankingSrLabel:
    "WARN Pressure 排名表，包含压力评分、WARN 比率、WARN 员工人数、申报数、失业率及失业率同比变化。",
  pressureTableRank: "排名",
  pressureTableState: "州",
  pressureTableScore: "压力评分",
  pressureTableLevel: "压力等级",
  pressureTableWarnRate: "每1万劳动力 WARN 员工",
  pressureTableWarnEmployees: "WARN 员工 / 申报",
  pressureTableUnemployment: "失业率",
  pressureTableUnemploymentDelta: "失业率同比",
  pressureNoticeCount: "{notices} 条申报",
  pressureBandHigh: "高",
  pressureBandElevated: "偏高",
  pressureBandWatch: "观察",
  pressureBandLow: "低",
  pressureBandNotRanked: "未排名",
  pressureCoverageHeading: "覆盖范围背景",
  pressureCoverageDesc:
    "手工、不可用、PDF-only、失败或历史 WARN 数据会保留展示，但不参与排名。",
  pressureCoverageLive: "当前机器可读",
  pressureCoverageManual: "手工审核",
  pressureCoverageUnavailable: "不可用",
  pressureCoverageHistorical: "历史/陈旧",
  pressureCoveragePdf: "PDF-only",
  pressureCoverageFailed: "失败",
  pressureCoverageNote:
    "只有当前机器可读、LAUS 数据有效且覆盖 12 个月 WARN 窗口的 WARN 州会进入评分排名；其他州用于覆盖范围背景说明。",
  pressureNotRankedHeading: "未排名州",
  pressureNoExcludedStates: "所有已追踪州当前都符合排名条件。",
  pressureDefaultExclusion: "WARN 覆盖不是当前机器可读状态，不能用于排名。",
  pressureMethodHeading: "方法与来源",
  pressureMethodText:
    "WARN Pressure 将 WARN 员工比率与 BLS LAUS 失业变化结合，用于比较各州压力背景。",
  pressureMethodFormula:
    "压力评分是在可排名州中，以 70% WARN-rate percentile 加 30% unemployment-rate YoY delta percentile 后四舍五入。",
  pressureMethodCaveats:
    "WARN 覆盖范围因州而异；申报代表计划中的裁减；BLS LAUS 数据可能滞后。请将其作为描述性关联信号，而不是一个序列解释另一个序列的证明。",
  pressureSourceLine:
    "来源：{publisher} 的 {source}；WARN 州申报快照。许可：{license}。",
  pressureSourceLink: "打开 BLS LAUS 来源",
};
