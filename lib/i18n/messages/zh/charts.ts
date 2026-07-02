export const chartsZh: Record<string, string> = {
  // ── Risk band labels ──────────────────────────────────────────────────────
  legendLow:       "低",
  legendMedium:    "中",
  legendHigh:      "高",
  legendVeryHigh:  "极高",

  // ── Axis titles (with arrow) ──────────────────────────────────────────────
  axisAIExposure:        "AI 暴露度 →",
  axisBrightOutlookShare: "光明前景占比 →",
  axisMedianSalaryLog:   "年薪中位数（对数）→",
  axisSkillCategoryFlows: "技能类别流向 →",
  axisGDPPerWorker:      "劳动年龄人口人均 GDP（对数）→",
  axisAIUsageIndexArrow: "AI 使用指数 →",

  // ── Shared labels (tooltips, non-arrow axis, legends) ────────────────────
  labelOccupations:      "职业",
  labelAIExposure:       "AI 暴露度",
  labelEmployment:       "就业人数",
  labelMedianWage:       "工资中位数",
  labelMedianSalary:     "薪资中位数",
  labelSalary:           "薪资",
  labelBrightOutlook:    "光明前景",
  labelUsageIndex:       "使用指数",
  labelGlobalShare:      "全球份额",
  labelUsageCount:       "使用量",
  labelGDPWorker:        "人均 GDP",
  labelProjectedOpenings: "年预计招聘岗位",

  // ── Click-to-explore tooltip footers ────────────────────────────────────
  tooltipClickSector:     "点击探索行业 →",
  tooltipClickOccupation: "点击探索职业 →",
  tooltipClickCareer:     "点击探索职业详情 →",

  // ── Legend annotations ───────────────────────────────────────────────────
  legendBubbleEmp:       "气泡大小 = 总就业人数",
  legendDotEmp:          "点大小 = 就业人数",
  legendAreaEmp:         "· 面积 = 总就业人数",
  legendLowAIExposure:   "低 AI 暴露度",
  legendHighAIExposure:  "高 AI 暴露度",
  legendSankeyLinkWidth: "连接宽度 = 共同技能数 · 点击目标职业探索",
  legendHeatmapNorm:     "各指标标准化至 0–1（仅颜色）· 灰色 = 无数据",

  // ── SkillTransitionChart ─────────────────────────────────────────────────
  sectionHighRisk:        "高风险",
  sectionLowRiskPathways: "低风险转型路径",
  tooltipHighRiskWorkers: "高风险从业者",
  tooltipLowRiskPathway:  "低风险路径",
  tooltipSkillsGroup:     "{group} 技能",

  // ── SkillFlowSankey ──────────────────────────────────────────────────────
  sankeyHighAIExposure:        "高 AI 暴露度",
  sankeyResilientPathways:     "韧性职业路径",
  legendHighAIExposureSource:  "高 AI 暴露度职业",
  legendResilientCareerTarget: "韧性职业目标",

  // ── WorldChoropleth metric toggles ───────────────────────────────────────
  metricClaude:       "Claude.ai 使用情况",
  metricDiffusion:    "生成式 AI 普及率",
  metricReadiness:    "AI 就绪度",
  metricGovReadiness: "政府 AI 就绪度",
  metricDemand:      "AI 招聘需求",

  // ── WorldChoropleth view mode ─────────────────────────────────────────────
  viewModeMap:     "地图",
  viewModeBubbles: "气泡图",

  // ── WorldChoropleth states / controls ────────────────────────────────────
  mapError:                 "地图不可用——无法加载世界地图数据。",
  noData:                   "暂无数据",
  noClaudeData:             "暂无 Claude.ai 数据",
  legendBubbleProportional: "气泡大小 ∝ 指标值",
  proxyRestrictedData:      "代理数据 / 受限数据",
  buttonResetView:          "重置视图",

  // ── WorldChoropleth legend descriptions ──────────────────────────────────
  legendAIUsagePcIndex:     "AI 使用指数（人均）",
  legendGenAIDiffusionPop:  "生成式 AI 普及率（劳动年龄人口占比）",
  legendGovReadinessOxford: "政府 AI 就绪度（牛津大学, 0–100）",
  legendAIReadinessIMF:     "AI 就绪度（IMF AIPI, 0–1）",
  legendAIJobDemand:       "AI 招聘需求（提及 AI 的招聘岗位占比）",

  // ── WorldChoropleth bubble legend ────────────────────────────────────────
  legendBubbleColourSize: "气泡颜色与大小 = {metric}",
  legendMetricAIUsage:    "AI 使用指数",
  legendMetricGenAI:      "生成式 AI 普及率",
  legendMetricGovReady:   "政府 AI 就绪度",
  legendMetricAIReady:    "AI 就绪度",
  legendMetricDemand:    "AI 招聘需求",

  // ── WorldChoropleth TooltipContent strings ───────────────────────────────
  tooltipReadinessLabel:    "AI 就绪度：",
  tooltipReadinessNote:     "IMF AIPI, 0–1",
  noAIReadinessData:        "暂无 AI 就绪度数据",
  tooltipGovReadinessLabel: "政府就绪度：",
  tooltipGovReadinessNote:  "牛津大学, 0–100",
  noGovReadinessData:       "暂无政府就绪度数据",
  tooltipGenAIUseLabel:     "生成式 AI 使用率：",
  tooltipGenAIUseNote:      "占劳动年龄人口",
  noGenAIDiffusionData:     "暂无生成式 AI 普及率数据",
  tooltipAIUsageIndexLabel: "AI 使用指数：",
  tooltipGlobalShareLabel:  "全球份额：",
  noClaudeAIUsageData:      "暂无 Claude.ai 使用数据",
  tooltipAIJobDemandLabel: "AI 招聘岗位占比：",
  noAIJobDemandData:       "暂无 AI 招聘需求数据",

  // ── CountryExposureChart ─────────────────────────────────────────────────
  barAxisAIUsageIndex:  "AI 使用指数（人均，全球均值 = 1.0）",
  barAxisGlobalShare:   "全球 AI 使用份额",
  metricPerCapitaIndex: "人均指数",

  // ── OccupationTrendChart ─────────────────────────────────────────────────
  emptyInsufficientHistory: "历史数据不足",

  // ── PredictiveChart ──────────────────────────────────────────────────────
  statOccupationsShown:  "展示职业数",
  statAvgAIExposure:     "平均 AI 暴露度",
  statBrightOutlook:     "光明前景",
  emptyNoProjectionData: "该行业暂无预测数据",

  // ── JobImpactChart ───────────────────────────────────────────────────────
  emptyNoSectorData: "该行业暂无数据",

  // ── CareerTrendChart (chart.js) ──────────────────────────────────────────
  chartTitleAvgAIExposure:   "各行业平均 AI 暴露度",
  datasetAIExposure:         "AI 暴露度",
  tooltipAIExposureCallback: "  AI 暴露度：{value}",

  // ── TreemapChart ─────────────────────────────────────────────────────────
  treemapClickHint: "点击行业标题放大 · 点击方块探索职业",
  treemapBack:      "← 全部行业",

  // ── QuadrantScatterChart ──────────────────────────────────────────────────
  quadrantLowerLower:   "低薪 · 低暴露度",
  quadrantLowerHigher:  "低薪 · 高暴露度",
  quadrantHigherLower:  "高薪 · 低暴露度",
  quadrantHigherHigher: "高薪 · 高暴露度",
  buttonResetZoom:      "重置缩放",

  // ── HeatmapChart column (short) labels ───────────────────────────────────
  heatmapShortAIUsage:    "AI 使用",
  heatmapShortDiffusion:  "普及率",
  heatmapShortReadiness:  "就绪度",
  heatmapShortGovReady:   "政府就绪",
  heatmapShortDigInfra:   "数字基础设施",
  heatmapShortHumanCap:   "人力资本",
  heatmapShortInnovation: "创新",
  heatmapShortRegEthics:  "监管/伦理",

  // ── HeatmapChart tooltip (full) labels ───────────────────────────────────
  heatmapLabelAIUsageIndex:   "AI 使用指数",
  heatmapLabelGenAIDiffusion: "生成式 AI 普及",
  heatmapLabelAIReadiness:    "AI 就绪度",
  heatmapLabelGovReadiness:   "政府就绪度",
  heatmapLabelDigInfra:       "数字基础设施",
  heatmapLabelHumanCapital:   "人力资本",
  heatmapLabelInnovation:     "创新",
  heatmapLabelRegEthics:      "监管与伦理",

  // ── Accessible names (aria-label / figure label) ─────────────────────────
  a11yCareerTrendName:     "柱状图：各行业平均 AI 暴露度",
  a11yJobImpactName:       "柱状图：AI 暴露概率最高的职业",
  a11ySkillTransitionName: "发散柱状图：高风险与低风险 AI 从业者的技能类别对比",
  a11yCostPowerName:       "折线图：AI 训练成本与能耗趋势",
  a11yFrontierLeadersName: "柱状图：前沿 AI 模型最多的组织与国家排名",
  a11yHeatmapName:         "热力图：25 个主要国家的 8 项 AI 就绪度指标",
  a11yPredictiveName:      "横向柱状图：年预计招聘岗位最多的职业",

  // ── Screen-reader summaries (figcaption / sr-only) ────────────────────────
  a11yCareerTrendSummary:
    "柱状图，比较各就业行业的平均 AI 暴露概率。" +
    "每根柱子代表一个行业。柱子颜色表示风险等级：绿色 = 低，" +
    "黄色 = 中，橙色 = 高，红色 = 极高。",
  a11yJobImpactSummary:
    "垂直柱状图，展示最高风险职业（最多 20 个）的 AI 暴露概率，从高到低排列。" +
    "柱子颜色表示风险等级：绿色 = 低，黄色 = 中，橙色 = 高，红色 = 极高。" +
    "悬停于柱子可查看职业名称及具体概率。",
  a11ySkillTransitionSummary:
    "发散柱状图，比较技术、认知、人际、行政、管理五大技能类别，" +
    "分别针对高 AI 风险从业者（柱子向左延伸，红色）和低风险职业路径（柱子向右延伸，绿色）。" +
    "柱子长度与估计从业人数成正比。",
  a11yCostPowerSummary:
    "两幅对数 Y 轴折线图。左图：AI 训练成本趋势（2023 年美元），展示中位数与最高值折线。" +
    "右图：AI 训练能耗趋势（瓦特），展示中位数与最高值折线。两图均涵盖近期 AI 模型历史。",
  a11yFrontierLeadersSummary:
    "横向柱状图，展示顶尖 AI 组织与国家。" +
    "组织标签页：按总模型数与前沿模型数排名前 12 名。" +
    "国家标签页：按总模型数与前沿模型数排名前 10 名。" +
    "图表下方提供数据表，方便屏幕阅读器用户访问。",
  a11yHeatmapSummary:
    "热力图，比较 25 个国家的 8 项 AI 指标：AI 使用指数、生成式 AI 普及率、" +
    "AI 就绪度（IMF AIPI）、政府 AI 就绪度（牛津大学，0–100）、" +
    "数字基础设施、人力资本、创新、监管与伦理子指数。" +
    "每项指标独立归一化至 0–1 以供颜色比较。灰色单元格表示无数据。" +
    "键盘和屏幕阅读器用户可通过以下数据表访问各单元格数值。",
  a11yPredictiveSummary:
    "横向柱状图，展示年预计招聘岗位最多的职业。" +
    "每根柱子的长度代表年预计招聘岗位数。" +
    "颜色渐变从紫色（较低）到青色（较高）。图表上方显示汇总统计数据。",

  // ── Heatmap accessible data table headers ────────────────────────────────
  a11yHeatmapTableCaption: "热力图数据：25 个国家 × 8 项 AI 指标",
  a11yHeatmapThCountry:    "国家",
  a11yHeatmapThValue:      "数值",
};
