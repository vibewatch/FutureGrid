export const globalZh: Record<string, string> = {
  // Hero
  heroHeadline1: "全球人工智能应用",
  heroHeadline2: "各国概览",
  heroIntroBefore: "各国的AI采用程度差异显著。本页展示",
  heroIntroHighlight1: "真实的人均AI（Claude.ai）使用数据",
  heroIntroMid: "，来源于",
  heroIntroHighlight2: "Anthropic经济指数（2025年8月）",
  heroIntroAfter: "\u2014\u2014基于实际观测行为的使用量化指标，而非预测数据。",
  statCountriesLabel: "覆盖国家",
  statMeasurableLabel: "有可测量数据",
  statTopIndexLabel: "最高使用指数（{name}）",

  // World Map
  worldMapHeading: "全球AI采用情况 \u2014 世界地图",
  mapIntroBefore: "地图提供两种数据视角，可通过图层切换查看：",
  mapHighlight1: "Claude.ai使用量",
  mapIntroMid1:
    "（人均实际交互次数，Anthropic经济指数2025年8月\u2014受服务可用性影响；中国及受限市场显示为灰色）以及",
  mapHighlight2: "生成式AI普及率",
  mapIntroMid2:
    "（微软AIEI 2026年Q1，覆盖147个国家的劳动年龄人口使用比例，",
  mapHighlight3: "包含中国",
  mapIntroAfter: "）。两项指标使用不同分母，不可合并\u2014\u2014请参阅",
  mapSourcesLink: "数据与来源",
  diffusionLeadersLabel:
    "生成式AI普及率领跑国家 \u00b7 微软AIEI 2026年Q1",
  diffusionLeadersCaption:
    "劳动年龄人口使用生成式AI的比例（147国调查）。",

  // China callout
  chinaTitle: "中国 \u2014 替代数据参考",
  chinaLayerBadge: "Claude图层：灰色",
  chinaIntroBefore: "Claude.ai",
  chinaUnavailable: "在中国大陆不可用",
  chinaIntroMid1:
    "，因此在Claude.ai使用图层中显示为灰色，并被排除在人均使用指数之外。在",
  chinaIntroHighlight2: "生成式AI普及率图层",
  chinaIntroMid2: "中，中国有所体现\u2014\u2014微软AIEI估计",
  chinaIntroMid3:
    "的劳动年龄成人在2026年Q1使用了生成式AI。注意西方遥测数据可能低估国内应用（豆包、Kimi等）\u2014CNNIC调查显示渗透率约为43%。下方本土生态数据采用不同的测量方法和分母，",
  chinaNotMerged: "不纳入任何指数",
  cnnicLabel: "CNNIC \u00b7 2025年6月",
  cnnicDesc: "生成式AI用户数",
  questLabel: "QuestMobile \u00b7 2025年上半年",
  questDesc: "移动AI月活用户",
  doubaoLabel: "豆包（QuestMobile）\u00b7 2025年12月",
  doubaoDesc: "应用月活用户",
  aieiLabel: "微软AIEI \u00b7 2026年Q1",
  aieiDesc: "生成式AI普及率（劳动年龄人口）",
  chinaCaveatPart1:
    "以上替代数据采用不同的测量方法（政府调查、应用市场扫描、产品月活），不可相加或直接比较。",
  chinaCaveatMid: "使用完全不同的分母\u2014\u2014请勿合并。",
  chinaCaveatSee: "请参阅",
  chinaCaveatPage: "页面了解完整数据来源详情。",

  // Fastest-rising adopters
  risersHeading: "增速最快的采用国",
  risersSourceLink: "微软AIEI \u00b7 查看来源",
  risersIntroBefore: "生成式AI普及率增幅最大的国家，",
  risersIntroHighlight: "2025年上半年 \u2192 2026年Q1",
  risersIntroAfter:
    "数据基于微软AI经济影响指数（西方遥测\u2014\u2014部分市场的本土应用可能被低估）。",
  risersFullDetailsLink: "查看完整来源 \u2192",
  risersCaption:
    "微软AIEI \u00b7 2025年H1 \u2192 2026年Q1 \u00b7 147个经济体劳动年龄人口使用生成式AI的比例。西方遥测\u2014",
  risersCaptionSeeLink: "查看来源",
  risersCaptionAfter: "了解注意事项。",

  // Chart panel
  chartHeading: "世界地图 \u2014 AI使用指数",
  chartCaption:
    "按劳动年龄人口标准化后的人均AI使用指数。颜色越深/数值越高 = 相对人口规模的AI使用量越大。",

  // Methodology
  methodologyLabel: "方法论",
  methodologyText:
    "使用指数 = 观测到的Claude.ai交互次数除以劳动年龄人口，并在所有国家间标准化。数据来源：Anthropic经济指数，2025年8月快照（194个国家行，另有使用世界银行2024年GDP和劳动年龄人口的中国补充行）。GDP数据来自Anthropic数据集中包含的世界银行/IMF字段，中国的人均劳动年龄GDP直接来源于世界银行。交互次数为零的国家被排除在排名列表之外，但仍保留在数据集中；未报告Claude.ai使用数据的国家不参与排名。",
  methodologySourceBefore:
    "有关数据来源和许可证的完整详情，请参阅",
  methodologySourceLink: "数据与来源",
  methodologySourceAfter: "页面。",

  // Country detail panel
  countryTopHeading: "AI 采用率最高的国家",
  countryTopDesc1:
    "按使用指数排名（人均 Claude.ai 使用量，已标准化）。记录使用量为零或未报告 Claude.ai 指标的国家不包含在内。",
  countryTopDesc2: "点击任意行或使用选择器查看完整指标。",
  countrySelectorLabel: "任意国家：",
  countrySelectorAria: "选择任意国家查看详情",
  countrySelectorPlaceholder: "🔍 选择国家…",
  countryRankingAria: "AI 采用率最高的国家",
  countryRankAria: "第 {rank} 名：{name} — 使用指数 {index}。激活以查看完整详情。",
  countryRelativeUsageAria: "{name} 相对使用量",
  countryShareLabel: "份额：",
  countryInteractionsLabel: "交互次数：",
  countryDetailsLink: "详情 →",
  countryCloseAria: "关闭国家详情",
  countryClaudeUsageHeading: "Claude.ai 使用量 · Anthropic Economic Index Aug 2025",
  countryUsageIndexLabel: "使用指数",
  countryGlobalShareLabel: "全球份额",
  countryNoClaudeData: "无 Claude.ai 数据",
  countryGenAiDiffusion: "GenAI 普及率",
  countrySourcesLink: "来源",
  countryAiReadiness: "AI 准备度",
  countryGovernmentReadiness: "政府 AI 准备度（Oxford 2023）",
  countryGdpPerWorkingAge: "劳动年龄人均 GDP",
  countryImfSubIndices: "IMF AI Preparedness — 子指数",
  countryDigitalInfrastructure: "数字基础设施",
  countryHumanCapital: "人力资本与劳动力市场",
  countryInnovation: "创新与经济融合",
  countryRegulationEthics: "监管与伦理",
  countryNoData: "无数据",
  countrySubPillarNote: "子指标分数 0–1（2023 年版本）。来源：",
  countryDataSourcesLink: "数据与来源",
  countryNativeEcosystemHeading: "本土生态背景 · Claude 图层：灰色",
  countryGenAiUsers: "GenAI 用户",
  countryMobileAiMau: "移动 AI MAU",
  countryAppMau: "应用 MAU",
  countryChinaProxyNote:
    "这些替代数据采用不同测量方法，不可相加或直接比较。Claude.ai 在中国大陆不可用——因此在 Claude.ai 使用图层上显示为灰色。",
  countryFullProvenance: "完整来源：",
};
