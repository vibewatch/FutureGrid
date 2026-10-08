export const pulseZh: Record<string, string> = {
  // ── 页面头部 ──────────────────────────────────────────────────────────────
  pageHeading: "劳动力市场脉搏",
  pageSubhead:
    "来自美国劳工统计局职位空缺和劳动力流动调查（JOLTS）的月度劳动力市场动态——裁员、招聘、职位空缺与辞职数据。",
  dataSource: "数据来源：{publisher} · {survey}",
  generatedAt: "数据快照：{date}",

  // ── 最新快照统计卡片 ──────────────────────────────────────────────────────
  sectionSnapshot: "最新快照",
  statLatestMonth: "最新数据：{month}",
  statLayoffs: "裁员与解雇",
  statOpenings: "职位空缺",
  statHires: "新招聘",
  statQuits: "主动离职",
  statThousands: "×1,000人",

  // ── 趋势图 ────────────────────────────────────────────────────────────────
  sectionTrend: "全国裁员与解雇趋势",
  sectionTrendDesc:
    "2016年以来美国月度裁员与解雇数据，含NBER经济衰退期阴影。可切换叠加招聘数据进行对比。",

  chartToggleHires: "叠加招聘数据",
  legendLayoffs: "裁员与解雇",
  legendHires: "招聘",
  legendRecession: "经济衰退期",
  chartPeakAnnotation: "新冠疫情峰值",
  chartAxisDate: "年份",
  chartAxisLevel: "水平",

  tooltipLayoffs: "裁员",
  tooltipHires: "招聘",

  srTrendSummary:
    "面积图：2016年以来美国月度裁员与解雇数据。经济衰退期已标注阴影。2020年初新冠疫情期间出现大幅峰值。",

  // ── 行业分布图 ────────────────────────────────────────────────────────────
  sectionIndustry: "各行业裁员情况",
  sectionIndustryDesc:
    "最新月度各行业超部门裁员与解雇数据（已排除汇总项）。可切换绝对值与比率视图。",

  toggleLevel: "绝对值（千人）",
  toggleRate: "比率（%）",
  chartIndustryAxisX: "千人",
  chartIndustryAxisXRate: "比率（%）",

  tooltipLDL: "裁员（千人）",
  tooltipLDR: "裁员率",

  srIndustrySummary: "水平条形图：美国各行业超部门最新裁员与解雇数据。",

  // ── 方法论 / 数据来源说明 ──────────────────────────────────────────────────
  methodologyTitle: "方法论与数据来源",
  methodologyText:
    "美国劳工统计局JOLTS调查衡量美国非农业部门的职位空缺、招聘及离职情况（含裁员与解雇、主动离职及其他离职形式）。数值为季节调整后的月度估计值。",
  licenseLine: "许可证：{license}",
  sourceNote: "{note}",
  learnMore: "了解更多 BLS JOLTS →",
};
