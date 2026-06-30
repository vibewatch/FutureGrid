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

  // ── WorldChoropleth bubble legend ────────────────────────────────────────
  legendBubbleColourSize: "气泡颜色与大小 = {metric}",
  legendMetricAIUsage:    "AI 使用指数",
  legendMetricGenAI:      "生成式 AI 普及率",
  legendMetricGovReady:   "政府 AI 就绪度",
  legendMetricAIReady:    "AI 就绪度",

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
};
