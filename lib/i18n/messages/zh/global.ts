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
  mapDemandLayerLabel: "AI 招聘需求",
  mapDemandTooltipLabel: "AI 招聘岗位占比",
  mapDemandSourceNote:
    "AI 招聘需求使用 Indeed Hiring Lab 最新月份的招聘岗位占比数据，覆盖 9 个经济体。",

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

  // AI adoption signals
  adoptionSignalsEyebrow: "补充替代证据",
  adoptionSignalsTitle: "AI Adoption Signals",
  adoptionSignalsSubtitle:
    "来自调查、应用市场指标、开放模型活动、开发者来源与研究活动的异质替代证据。这些信号不合并到 Claude 使用指数中。",
  adoptionSignalsCaveatLabel: "注意：",
  adoptionSignalsSourceLabel: "来源：",
  adoptionSignalsPeriodLabel: "时期：",
  adoptionSignalsViewSources: "查看数据与来源 →",
  adoptionSignalsCollectedFamilies: "已采集来源族",
  adoptionSignalsVisualizedFamilies: "已可视化来源族",
  adoptionSignalsFutureCatalogCount: "未来候选",
  adoptionSignalsBarListAria: "{title} 条形列表",
  adoptionSignalsStackedShareAria: "{title} 份额分布",
  adoptionSignalsProviderModelsAria: "{provider} 热门模型活动替代指标",
  adoptionSignalsBenchmarksLabel: "基准",
  adoptionSignalsModelLabel: "模型",
  adoptionSignalsStars: "Stars",
  adoptionSignalsForks: "Forks",
  adoptionSignalsOpenIssues: "Open issues",
  adoptionSignalsUpdated: "更新",
  adoptionSignalsFutureSources: "未来采集候选",
  adoptionSignalsFutureSourcesSummary: "{count} 个目录来源",
  adoptEnterpriseTitle: "企业 AI 调查份额",
  adoptEnterpriseDesc:
    "企业调查中报告至少使用一种 AI 技术的受访者份额。仅适合在各自来源族内比较。",
  adoptEnterpriseDescription:
    "企业调查中报告至少使用一种 AI 技术的受访者份额。仅适合在各自来源族内比较。",
  adoptIndividualTitle: "个人 GenAI 受访者份额",
  adoptIndividualDesc:
    "个人使用生成式 AI 的调查型受访者份额，作为替代证据展示，而非产品遥测。",
  adoptIndividualDescription:
    "个人使用生成式 AI 的调查型受访者份额，作为替代证据展示，而非产品遥测。",
  adoptCensusBusinessTitle: "美国企业 AI 活动替代指标",
  adoptCensusBusinessDesc:
    "美国 Census 企业技术指标因地理范围、时间版本与分母不同，独立于全球使用指标展示。",
  adoptUsBusinessTitle: "美国企业 AI 活动替代指标",
  adoptUsBusinessDescription:
    "美国 Census 企业技术指标因地理范围、时间版本与分母不同，独立于全球使用指标展示。",
  adoptCountrySurveyTitle: "国家调查替代指标",
  adoptCountrySurveyDesc:
    "国家层面的生成式 AI 使用调查与公开渗透率指标，与应用和 Claude 使用指标分开呈现。",
  adoptCountrySurveyDescription:
    "国家层面的生成式 AI 使用调查与公开渗透率指标，与应用和 Claude 使用指标分开呈现。",
  adoptChinaAppMarketTitle: "中国应用市场活动替代指标",
  adoptChinaAppMarketDesc:
    "中国移动 AI 应用市场指标，使用供应商报告的类别与时期作为活动替代证据。",
  adoptChinaAppsTitle: "中国应用市场活动替代指标",
  adoptChinaAppsDescription:
    "中国移动 AI 应用市场指标，使用供应商报告的类别与时期作为活动替代证据。",
  adoptChinaAppsMauTitle: "中国应用市场 MAU 替代指标",
  adoptChinaAppsMauDescription:
    "中国移动 AI 应用市场中以月活用户报告的行，使用一致的用户数尺度展示。",
  adoptChinaAppsUsageTitle: "中国应用市场使用量替代指标",
  adoptChinaAppsUsageDescription:
    "中国应用市场中以 tokens 或其他使用量单位报告的行，以独立 KPI 卡片展示，不使用共享排名。",
  adoptChinaNativeAppTitle: "中国本土应用 MAU 替代指标",
  adoptChinaNativeAppDesc:
    "本土 AI 应用的产品级月活信号，不与调查或遥测指标合并。",
  adoptChinaNativeTitle: "中国本土应用 MAU 替代指标",
  adoptChinaNativeDescription:
    "本土 AI 应用的产品级月活信号，不与调查或遥测指标合并。",
  adoptDeveloperSurveyTitle: "开发者 AI 使用调查",
  adoptDeveloperSurveyDesc:
    "开发者调查受访者份额，反映不同国家和受访组中报告的 AI 工具使用情况。",
  adoptDeveloperSurveyDescription:
    "开发者调查受访者份额，反映不同国家和受访组中报告的 AI 工具使用情况。",
  adoptDeveloperSurveyOverallTitle: "开发者调查总体分布",
  adoptDeveloperSurveyOverallDescription:
    "Stack Overflow AI 工具相关总体回答分布，每个调查问题单独保留。",
  adoptDeveloperSurveyCountriesTitle: "开发者调查国家受访者份额",
  adoptDeveloperSurveyCountriesDescription:
    "国家行展示 Stack Overflow 受访者报告使用 AI 工具的 yes-share，不代表人口采用率。",
  adoptOpenModelDownloadsTitle: "开放模型下载活动",
  adoptOpenModelDownloadsDesc:
    "开放模型仓库中的提供方与模型下载量，作为带来源注意事项的活动替代证据展示。",
  adoptDeveloperEcosystemTitle: "开发者生态仓库 KPI",
  adoptDeveloperEcosystemDesc:
    "仓库 stars、forks、open issues 与更新近况，作为开发者生态活动替代指标。",
  adoptDevEcosystemTitle: "开发者生态仓库 KPI",
  adoptDevEcosystemDescription:
    "仓库 stars、forks、open issues 与更新近况，作为开发者生态活动替代指标。",
  adoptResearchActivityTitle: "AI 研究活动替代指标",
  adoptResearchActivityDesc:
    "国家层面的 AI 论文活动指标；用于研究背景，不代表直接产品使用。",
  adoptResearchTitle: "AI 研究活动替代指标",
  adoptResearchDescription:
    "国家层面的 AI 论文活动指标；用于研究背景，不代表直接产品使用。",
  adoptFutureSourcesTitle: "未来来源目录",
  adoptFutureSourcesDesc:
    "已编目的来源族，作为未来采集候选；尚未作为当前采用信号可视化。",
  adoptFutureSourcesDescription:
    "已编目的来源族，作为未来采集候选；尚未作为当前采用信号可视化。",
  adoptEnterpriseAiTitle: "企业 AI 调查份额",
  adoptEnterpriseAiDesc:
    "企业调查中报告至少使用一种 AI 技术的受访者份额。仅适合在各自来源族内比较。",
  adoptBusinessTitle: "企业 AI 替代指标",
  adoptBusinessDesc:
    "企业层面的 AI 调查指标按来源族展示，不合并不同分母。",
  adoptIndividualGenAiTitle: "个人 GenAI 受访者份额",
  adoptIndividualGenAiDesc:
    "个人使用生成式 AI 的调查型受访者份额，作为替代证据展示，而非产品遥测。",
  adoptUsCensusBusinessTitle: "美国企业 AI 活动替代指标",
  adoptUsCensusBusinessDesc:
    "美国 Census 企业技术指标因地理范围、时间版本与分母不同，独立于全球使用指标展示。",
  adoptDeveloperTitle: "开发者 AI 使用调查",
  adoptDeveloperDesc:
    "开发者调查受访者份额，反映不同国家和受访组中报告的 AI 工具使用情况。",
  adoptOpenModelsTitle: "开放模型下载活动",
  adoptOpenModelsDesc:
    "开放模型仓库中的提供方与模型下载量，作为带来源注意事项的活动替代证据展示。",
  adoptOpenModelsDescription:
    "开放模型仓库中的提供方与模型下载量，作为带来源注意事项的活动替代证据展示。",
  adoptRepoKpisTitle: "开发者生态仓库 KPI",
  adoptRepoKpisDesc:
    "仓库 stars、forks、open issues 与更新近况，作为开发者生态活动替代指标。",
  adoptAiResearchTitle: "AI 研究活动替代指标",
  adoptAiResearchDesc:
    "国家层面的 AI 论文活动指标；用于研究背景，不代表直接产品使用。",

  // OpenRouter country activity lens
  openRouterCountryActivityEyebrow: "OpenRouter 目录替代视角",
  openRouterCountryActivityTitle: "AI 模型生态足迹",
  openRouterCountryActivitySubtitle:
    "基于截至 {asOf} 的 OpenRouter 公共模型目录快照，按提供方身份映射到国家层面。模型目录计数与端点条目是分开的视角。",
  openRouterCountryActivityCaveatLabel: "注意：",
  openRouterCountryActivityCaveat:
    "仅代表公共目录与端点可用性；不代表用户流量、使用、收入或国家采用率。也不代表物理服务器位置、训练位置或确定性的国家 AI 活动。",
  openRouterCountryActivitySourcesLink: "查看数据与来源 →",
  openRouterCountryActivityModelsSnapshotLabel: "快照中的模型",
  openRouterCountryActivityModelsSnapshotDetail:
    "{mapped} 个已映射到国家层面的提供方身份。",
  openRouterCountryActivityCountriesMappedLabel: "已映射国家",
  openRouterCountryActivityCountriesMappedDetail:
    "各国合计 {providers} 个已映射模型提供方条目。",
  openRouterCountryActivityEndpointEntriesLabel: "端点条目",
  openRouterCountryActivityEndpointEntriesDetail:
    "{mapped} 个已映射端点条目，与模型计数分开呈现。",
  openRouterCountryActivityUnknownProvidersLabel: "未知/未映射提供方",
  openRouterCountryActivityUnknownProvidersDetail:
    "{models} 个模型行和 {endpoints} 个端点条目仍未映射。",
  openRouterCountryActivityChartTitle:
    "按模型目录计数排名的国家",
  openRouterCountryActivityChartDesc:
    "模型目录计数为主条形。端点条目作为次级条形与标签单独展示，不合并两项指标。",
  openRouterCountryActivityChartAria:
    "按 OpenRouter 模型目录计数排名的国家，端点条目单独显示。",
  openRouterCountryActivityModelsLegend: "模型",
  openRouterCountryActivityEndpointsLegend: "端点条目",
  openRouterCountryActivityTableTitle:
    "国家层面 OpenRouter 目录替代数据表",
  openRouterCountryActivityCountryHeader: "国家",
  openRouterCountryActivityRegionHeader: "地区",
  openRouterCountryActivityModelProvidersHeader: "模型提供方",
  openRouterCountryActivityModelsHeader: "模型",
  openRouterCountryActivityEndpointProvidersHeader: "端点提供方",
  openRouterCountryActivityEndpointsHeader: "端点",
  openRouterCountryActivityTopFamiliesHeader: "主要模型族",

  // Global AI ecosystem comparison map
  ecosystemMapEyebrow: "国家综合对比",
  ecosystemMapTitle: "全球 AI 生态系统对比地图",
  ecosystemMapSubtitle:
    "将 OpenRouter 模型目录足迹、生成式 AI 扩散、就绪度评分和采用-就绪度缺口合并到同一国家表格。筛选器会把目录代理指标与采用/就绪度指标分开呈现。",
  ecosystemMapSourcesLink: "查看数据与来源 →",
  ecosystemMapCountriesCompared: "对比国家数",
  ecosystemMapCatalogCountries: "有目录足迹",
  ecosystemMapReadinessCountries: "有就绪度指标",
  ecosystemMapJoinedCountries: "两类指标都有",
  ecosystemMapRegionFilter: "地区",
  ecosystemMapAllRegions: "所有地区",
  ecosystemMapQuadrantFilter: "象限",
  ecosystemMapAllQuadrants: "所有象限",
  ecosystemMapTableCaption:
    "按国家对比 AI 生态系统：模型目录足迹、就绪度、扩散率与缺口象限。",
  ecosystemMapCountryHeader: "国家",
  ecosystemMapModelsHeader: "模型 / 端点",
  ecosystemMapReadinessHeader: "就绪度",
  ecosystemMapDiffusionHeader: "扩散率",
  ecosystemMapQuadrantHeader: "象限",
  ecosystemMapCaveat:
    "代理指标提示：OpenRouter 是公开目录/提供商身份足迹，不代表流量、使用量、需求、物理部署或国家采用率。就绪度与扩散率使用不同分母，不应与目录计数取平均。",

  // Adoption-readiness gap lens
  readinessGapEyebrow: "对齐视角",
  readinessGapTitle: "采用–准备度差距",
  readinessGapSubtitle:
    "比较各国生成式 AI 普及率百分位与 AI 准备度百分位，呈现观测使用与能力基础不完全对齐的地方。",
  readinessGapCaveatLabel: "注意：",
  readinessGapCaveat:
    "仅描述对齐关系；该差距比较两个来源的百分位排名，并非因果判断。",
  readinessGapSourcesLink: "查看数据与来源 →",
  readinessGapRankableLabel: "可排名国家",
  readinessGapRankableDetail: "在 {total} 个地图国家中，{coverage}% 同时具备两项输入。",
  readinessGapPositiveLabel: "最大正向差距",
  readinessGapLatentLabel: "最大潜在容量",
  readinessGapScatterTitle: "准备度分数 vs. GenAI 普及率",
  readinessGapScatterAria:
    "散点图，横轴为准备度分数，纵轴为生成式 AI 普及率百分比。",
  readinessGapScatterDesc:
    "每个点代表同时具备准备度和普及率数据的国家；下方排名列表提供文本等价内容。",
  readinessGapXAxis: "准备度分数",
  readinessGapYAxis: "普及率 %",
  readinessGapGapLabel: "差距",
  readinessGapGapUnit: "百分位",
  readinessGapDiffusionLabel: "普及率",
  readinessGapReadinessLabel: "准备度",
  readinessGapAdoptionListTitle: "采用超过准备度",
  readinessGapLatentListTitle: "潜在容量",
  readinessGapBalancedListTitle: "均衡领先者",
  readinessGapEmptyList: "此分组暂无国家。",

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

  // ─── Workforce structure section ──────────────────────────────────────────
  workforceEyebrow: "国际劳动力视角",
  workforceTitle: "主要经济体劳动力结构",
  workforceSubtitle:
    "共包含 {count} 个经济体。ISCO-08 主要职业大类就业份额；数据来源：ILOSTAT 年度数据，全口径就业，最近距离 {year} 年以内的最新年份。各国调查定义、参考期与覆盖范围不同——仅作描述性比较。",
  workforceSourcesLink: "查看数据与来源 →",
  workforceCaveat:
    "本节仅描述职业构成，不涉及 AI 暴露评分、薪资排名或 AI 影响判断。所显示的各份额已在九个 ISCO-08 主要大类之间归一化，其总和约为 100%；每个经济体的覆盖率另行披露这些大类占全国总就业的比例。覆盖范围仅限于种子数据集中具有完整调和 ISCO-08 数据的经济体，不代表所有主要经济体。",
  workforceAttribution: "数据来源：ILOSTAT — 按性别和职业分类的就业人数（EMP_TEMP_SEX_OCU_NB_A）。",
  workforceAttributionLicense: "CC BY 4.0 · 国际劳工组织（ILO）",
  workforcePartialCoverage:
    "{count} 个经济体通过了最低覆盖率筛选（9 个 ISCO-08 大类全部有数据、全国就业覆盖率 ≥ 98%、年份在数据集最新年份 3 年以内）。覆盖已核实，但并非完整。",
  workforceExclusionCaveat: "未纳入可比集合：",
  workforceExposureNote: "如需美国专项 AI 职业暴露分析，请访问",
  workforceExposureLinkText: "分析页面",
  workforceExposureNoteAfter:
    "——该视图仅针对美国，采用不同方法和数据，与此处展示的国际职业混合数据不合并。",
  workforceDrilldownHeading: "{name} — ISCO-08 详情",
  workforceDrilldownNone: "请在上方选择一个国家，以查看其 ISCO-08 职业构成详细分解。",
  workforceDrilldownClear: "取消选择：{name}",
  workforceDrilldownClearLabel: "取消选择",
  workforceDrilldownYear: "调查年份：",
  workforceDrilldownCoverage: "ISCO-08 分组覆盖率：",
  workforceDrilldownStatuses: "观测标记：",
  workforceDrilldownTableCaption: "ISCO-08 主要职业大类就业份额 — {name}（{year}）",
  workforceDrilldownGroup: "大类",
  workforceDrilldownLabel: "职业类型",
  workforceDrilldownShare: "份额",

  // ─── InternationalOccupationMixChart i18n keys ────────────────────────────
  intlOccMixFigureCaption: "主要经济体 ISCO-08 主要大类职业份额（经调和）",
  intlOccMixGroupPrefix: "大类",
  intlOccMixChartAria: "主要经济体 {classification} 职业份额",
  intlOccMixChartDesc:
    "100% 堆叠水平条形图，展示各国就业在 {classification} 第 1–9 大类间的分布，按国家名称字母顺序排列。这不是排名榜单。",
  intlOccMixCoverageInline: "覆盖率\u00a0{coverage}",
  intlOccMixDissimilarityInline: "差异\u00a0{value}\u00a0对比\u00a0{reference}",
  intlOccMixTableTitle: "完整数据表",
  intlOccMixTableCaption: "{classification} 各国就业份额",
  intlOccMixColCountry: "国家",
  intlOccMixColYear: "年份",
  intlOccMixColCoverage: "覆盖率",
  intlOccMixColStatus: "状态",
  intlOccMixColDissimilarity: "差异度",
  intlOccMixCaptionShares:
    "{count} 个纳入国家的 {classification} 就业份额（占全国总就业的比例）。数值取各国距 {year} 年 3 年以内的最新年份。",
  intlOccMixCaptionDissimilarity:
    "相对于 {reference} 的差异度（半 L1 / Bray\u2013Curtis，0\u20131）。仅为描述性结构距离，不代表排名或质量评估。",
  intlOccMixCaptionExcluded: "未纳入可比集合：",
  // ILOSTAT 观测状态代码标签
  intlOccMixStatus_B: "序列断裂",
  intlOccMixStatus_P: "初步数据",
  intlOccMixStatus_E: "估算",
  intlOccMixStatus_F: "预测",
  intlOccMixStatus_I: "插补",

  // ─── 消费者生成式AI普及增长对比 ──────────────────────────────────────────────
  diffusionGrowthEyebrow: "微软AIEI \u00b7 MIT许可证",
  diffusionGrowthTitle: "消费者生成式AI普及增长",
  diffusionGrowthSubtitle:
    "按2026年第一季度劳动年龄人口使用生成式AI产品的比例，列出前10个经济体，涵盖三个调查期。所有行均具备完整的三期数据，按2026年Q1降序排列。",
  diffusionGrowthH1Label: "2025年上半年",
  diffusionGrowthH2Label: "2025年下半年",
  diffusionGrowthQ1Label: "2026年第一季度",
  diffusionGrowthAxisLabel: "劳动年龄人口占比（%）",
  diffusionGrowthSourceLink: "数据与来源",
  diffusionGrowthTableCaption:
    "消费者生成式AI普及率 \u2014 2026年Q1占比前10经济体（微软AIEI，MIT许可）",
  diffusionGrowthColCountry: "经济体",
  diffusionGrowthColH1: "2025上半年（%）",
  diffusionGrowthColH2: "2025下半年（%）",
  diffusionGrowthColQ1: "2026Q1（%）",
  diffusionGrowthColChange: "变化（Q1\u2212H1，百分点）",
  diffusionGrowthFigureAria:
    "分组条形图：消费者生成式AI普及增长 \u2014 前10经济体在2025H1、2025H2、2026Q1三期的占比",
  diffusionGrowthCaveat:
    "指标：各调查期内报告使用生成式AI产品的劳动年龄人口比例（微软AI经济影响与洞察）。使用率 ≠ 能力水平、职场采用、生产率或劳动力市场影响。三个调查期（2025上半年、2025下半年、2026第一季度）窗口较短，趋势外推需谨慎。西方遥测可能低估中国等市场的本土AI应用（如豆包、Kimi）。来源：微软AI扩散报告（MIT许可）。不与Claude使用指数、Indeed招聘需求、Anthropic指数或IMF指标合并。",
};
