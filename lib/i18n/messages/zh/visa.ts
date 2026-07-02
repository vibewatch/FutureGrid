export const visaZh = {
  loading: "图表加载中…",

  // ── Hero ─────────────────────────────────────────────────────────────────────
  pageBadge: "H-1B 工作签证",
  pageTitle: "H-1B 工作签证趋势",
  pageSubhead:
    "十年间获批的 H-1B 劳工条件申请（LCA），FY2016–FY2025——反映美国经济中高技能、雇主担保岗位需求的信号。",
  disclaimer:
    "仅为描述性的劳动力需求信号，并非移民建议。数据为雇主提交的申请（获批 LCA），而非签证批准数量。",

  // ── Stat cards ───────────────────────────────────────────────────────────────
  statVolumeLabel: "FY{year} 获批 LCA",
  statVolumeSub: "由 DOL OFLC 认证的劳工条件申请数",
  statWageLabel: "FY{year} 工资中位数",
  statWageSub: "获批申请中折算年薪的中位数",
  statEmployersLabel: "FY{year} 独立雇主数",
  statEmployersSub: "最新年度中提交担保的独立雇主数量",
  statTopOccLabel: "FY{year} 最高职业",
  statTopOccSub: "最新年度获批 LCA 数量最高的职业",

  // ── Wage trend ───────────────────────────────────────────────────────────────
  wageSectionTitle: "薪资趋势",
  wageSectionSubhead: "十年间折算年薪中位数，并含第 25–75 百分位区间带。",
  wageMedianLabel: "年薪中位数",
  wageBandLabel: "第 25–75 百分位",
  wageAxisY: "年薪（美元）",
  wageAxisX: "财年",
  wageChartName: "H-1B 折算年薪中位数及第 25–75 百分位区间，FY2016–FY2025",
  wageSummary:
    "折线图展示获批 H-1B LCA 折算年薪中位数，并以阴影带表示第 25–75 百分位区间，按财年排列。",

  // ── Volume trend ─────────────────────────────────────────────────────────────
  volumeSectionTitle: "申请量趋势",
  volumeSectionSubhead: "获批 LCA 数量及其覆盖的岗位总数，FY2016–FY2025。",
  volumeCertifiedLabel: "获批 LCA",
  volumePositionsLabel: "岗位总数",
  volumeAxisY: "数量",
  volumeChartName: "各财年获批 H-1B LCA 数量与岗位总数，FY2016–FY2025",
  volumeSummary:
    "折线图对比各财年获批 H-1B LCA 数量与这些申请所覆盖的岗位总数。",

  // ── Top occupations ──────────────────────────────────────────────────────────
  occSectionTitle: "十年间的顶尖职业",
  occSectionSubhead:
    "在最新财年中获批 LCA 数量最高的职业，回溯至 FY2016——观察哪些岗位上升或下降。",
  occNote:
    "软件开发人员（SOC 15-1252）始终占据主导；数据、分析与 IT 管理类岗位位居前列。",
  occAxisY: "获批 LCA",
  occChartName: "各财年顶尖 H-1B 职业的获批 LCA 数量，FY2016–FY2025",
  occSummary: "多线图追踪十年间主要 H-1B 职业的获批 LCA 数量。",

  // ── Occupation mix ───────────────────────────────────────────────────────────
  mixSectionTitle: "职业构成随时间变化",
  mixSectionSubhead: "各主要职业在获批 LCA 中所占份额，按财年以百分比堆叠展示。",
  mixNote:
    "份额基于顶尖职业加上汇总的“其他”类别计算；反映构成变化，而非绝对数量。",
  mixOtherLabel: "其他职业",
  mixAxisY: "份额（%）",
  mixChartName: "各主要职业在获批 LCA 中的份额及财年，FY2016–FY2025",
  mixSummary: "百分比堆叠柱状图，展示各主要职业在各财年获批 LCA 中所占份额。",

  // ── AI-exposure tiers ────────────────────────────────────────────────────────
  exposureSectionTitle: "按 AI 暴露等级划分的 H-1B 需求",
  exposureSectionSubhead:
    "按各职业的自动化风险等级归类的获批 LCA 数量——高技能签证需求是否正转向 AI 暴露度更高的岗位？",
  exposureCaption:
    "每个 H-1B 职业的 SOC 代码与 FutureGrid 职业快照的自动化风险等级进行关联（{rate} 的职业成功匹配）；未匹配的代码归入“未分类”。这是两个数据集的描述性叠加，并非因果结论。",
  exposureAxisY: "获批 LCA",
  exposureAxisYShare: "份额（%）",
  exposureChartName: "按 AI 暴露（自动化风险）等级及财年划分的获批 LCA 数量，FY2016–FY2025",
  exposureSummary:
    "堆叠图展示十年间按自动化风险等级（低、中、高、极高、未分类）划分的获批 LCA 数量。",
  exposureToggleLabel: "视图",
  exposureToggleVolume: "数量",
  exposureToggleShare: "份额",
  tierLow: "低",
  tierMedium: "中",
  tierHigh: "高",
  tierVeryHigh: "极高",
  tierUnclassified: "未分类",

  // ── Employers ────────────────────────────────────────────────────────────────
  employersSectionTitle: "顶尖担保雇主",
  employersSectionSubhead:
    "十年间获批 H-1B LCA 数量最多的 50 家雇主——申请量、平均薪资及逐年申请趋势。",
  employersChartName: "按获批 LCA 总数排列的顶尖 H-1B 担保雇主，FY2016–FY2025",
  employersSummary: "水平条形图展示十年间获批 LCA 总量最高的雇主。",
  employersAxisX: "获批 LCA（总计）",
  employerDeepTableName: "顶尖 H-1B 担保雇主——含薪资与趋势的详细表格",
  employerDeepTableCaption:
    "顶尖 H-1B 担保雇主详细表格：获批 LCA 总数、年均薪资及逐年申请趋势。",
  colMeanWage: "年均薪资",
  colYearTrend: "年度趋势",
  employerShowMore: "展示全部 {n} 家雇主",
  employerShowLess: "收起",

  // ── States (existing) ─────────────────────────────────────────────────────────
  statesSectionTitle: "顶尖州",
  statesSectionSubhead:
    "十年间获批 H-1B LCA 数量最多的州，并附最新年度工资中位数。",
  statesTableName: "按获批 H-1B LCA 总数排列的顶尖州",
  statesTableCaption: "按获批 H-1B LCA 总数排列的顶尖州，FY2016–FY2025。",

  // ── State deep-dive ───────────────────────────────────────────────────────────
  stateDeepSectionTitle: "州级深度分析",
  stateDeepSectionSubhead:
    "按获批 LCA 总数或最新工资中位数排序，探索全部 52 个管辖区。点击行或使用下拉框选择州，查看其申请量趋势、薪资走势及顶尖职业。",
  stateSortLabel: "排序依据",
  stateSortByTotal: "LCA 总数",
  stateSortByWage: "工资中位数",
  stateSelectorLabel: "选择州",
  stateDetailTitle: "{state} 详情",
  stateDetailCountByYear: "各财年获批 LCA 数量",
  stateDetailWageByYear: "各财年年薪中位数",
  stateDetailTopOccs: "顶尖职业",
  statesDeepTableName: "所有 H-1B 州——可按 LCA 总数或工资中位数排序",
  statesDeepTableCaption:
    "52 个管辖区按获批 H-1B LCA 总数或最新工资中位数排列，FY2016–FY2025。",
  stateCountChartName: "{state} H-1B 获批 LCA 数量，FY2016–FY2025",
  stateWageChartName: "{state} H-1B 工资中位数，FY2016–FY2025",

  // ── Occupation wage trend ─────────────────────────────────────────────────────
  occWageTrendSectionTitle: "各职业薪资走势",
  occWageTrendSectionSubhead:
    "FY2025 申请量最高的前 8 个职业（含薪资趋势数据）获批 H-1B LCA 折算年薪中位数。折线断裂表示该财年申请数量不足 50 件。",
  occWageTrendAxisY: "年薪中位数（美元）",
  occWageTrendChartName: "顶尖 H-1B 职业各财年年薪中位数趋势，FY2016–FY2025",
  occWageTrendSummary:
    "多线图展示前 8 个含薪资数据的 H-1B 职业折算年薪中位数，按财年排列。折线断裂表示该职业某财年申请数量不足 50 件。",
  occWageTrendGapNote: "折线断裂表示该职业在该财年记录的申请数量不足 50 件。",
  occWageTrendSeriesCount: "共展示 {n} 个职业系列，跨越 {years} 个财年。",

  // ── Shared table headers ─────────────────────────────────────────────────────
  colYear: "财年",
  colMedianWage: "工资中位数",
  colP25: "第 25 百分位",
  colP75: "第 75 百分位",
  colCertified: "获批 LCA",
  colPositions: "岗位数",
  colEmployer: "雇主",
  colState: "州",
  colTotal: "获批 LCA 总数",
  colShare: "份额",

  // ── Footer caveat ────────────────────────────────────────────────────────────
  caveatTitle: "如何解读这些数字",
  caveatBody:
    "获批 LCA 是雇主提交的申请，而非签证批准或发放——单个 LCA 可覆盖多个岗位，且并非每份获批申请都会产生实际雇佣或签发签证。请将这些数字视为高技能岗位需求的方向性信号。",
  sourceNote:
    "来源：美国 DOL OFLC LCA 披露数据（公有领域）。FY2020+ 按不同案件编号对季度文件求和；FY2016–FY2019 使用年度披露文件。",
};
