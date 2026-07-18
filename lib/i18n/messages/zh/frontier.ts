export const frontierZh = {
  // ── Page ──────────────────────────────────────────────────────────────────
  pageTitle: "AI 前沿",
  pageBadge: "颠覆驱动引擎",
  pageSubhead:
    "FutureGrid 的其他页面呈现 AI 对就业的冲击，而这里展示其背后的训练算力记录——来自 Epoch AI 追踪目录的指数级增长曲线。",

  // ── Hero stat cards ────────────────────────────────────────────────────────
  statDoublingLabel: "算力翻倍周期",
  /** 插值变量：{modernEraStart} {r2} */
  statDoublingSub: "现代纪元 {modernEraStart}–至今 · r²={r2}",
  statModelsLabel: "已知算力记录",
  statModelsSub: "具有已报告或估算训练算力的模型",
  statFrontierLabel: "近期追踪发布最多的国家",
  statLargestLabel: "最大已报告训练规模",

  // ── Section: Compute Timeline ──────────────────────────────────────────────
  timelineSectionTitle: "训练算力随时间的演变",
  timelineSectionSubhead:
    "每个数据点代表 Epoch AI 已知算力子集中的一个模型（具有已报告或估算训练浮点运算量的记录）。前沿模型——Epoch 在发布时按训练算力排名历史前 10——已高亮标出。趋势线为现代纪元指数拟合结果。",
  /** 插值变量：{doublingTime} */
  timelineAnnotation: "每约 {doublingTime} 个月翻倍",
  /** 插值变量：{doublingTime} {r2} {n} */
  timelineAnnotationFull: "算力每约 {doublingTime} 个月翻倍（现代纪元，r²={r2}，n={n}）",
  axisDate: "年份",
  axisCompute: "训练算力 (FLOP)",
  legendAll: "所有已知算力模型",
  legendFrontier: "算力前沿模型",
  /** 插值变量：{modernEraStart} */
  legendTrend: "指数趋势（{modernEraStart}–）",
  tooltipModel: "模型",
  tooltipOrg: "机构",
  tooltipDate: "日期",
  tooltipCompute: "训练算力",
  tooltipCountry: "国家/地区",
  tooltipFrontier: "算力前沿",
  tooltipFrontierYes: "是",
  tooltipFrontierNo: "否",
  tooltipConfidence: "置信度",

  // ── Section: Tracked Model Activity ───────────────────────────────────────
  leadersSectionTitle: "各机构与国家的追踪模型活动",
  leadersSectionSubhead:
    "排名反映 Epoch AI 的追踪目录——而非总体 AI 能力、产品采用率或经济影响。默认排序依据近三年追踪发布数量。算力与前沿指标仅适用于已知算力子集，并偏向于披露训练算力的机构。机构实体按原始数据源记录保留，不进行编辑合并。",
  leadersTabOrgs: "机构",
  leadersTabCountries: "国家/地区",
  leadersColName: "名称",
  leadersColModels: "所有有日期记录",
  leadersColFrontier: "算力前沿",
  leadersColMaxCompute: "峰值已报告算力",
  leadersColCategory: "类别",
  leadersGeopoliticsNote: "AI 算力披露的地理集中度直接关联全球经济与劳动力市场动态——详见",
  leadersGeopoliticsLink: "全球视图",
  leadersBarModels: "所有有日期追踪记录",
  leadersBarFrontier: "算力前沿记录",
  leadersNoData: "暂无数据。",
  frontierBadge: "算力前沿",

  // ── Metric selector labels (供 Neo 接入使用) ──────────────────────────────
  metricRecentCount: "近期追踪发布",
  metricModelCount: "所有有日期记录",
  metricOpenWeightsCount: "权重可用记录",
  metricComputeKnownCount: "已知算力记录",
  metricFrontierCount: "算力前沿记录",
  metricLargestRun: "最大已报告训练规模",

  // ── 各指标说明 ────────────────────────────────────────────────────────────
  /** 插值变量：{windowStart} {windowEnd} */
  metricRecentCountDesc:
    "在近三年窗口（{windowStart} – {windowEnd}）内具有记录发布日期的全目录模型。默认排序。反映来自完整有日期目录的当前追踪产出活动。",
  metricModelCountDesc:
    "所有具有有效发布日期的 Epoch AI 追踪记录，无论算力披露情况。完整有日期目录。",
  metricOpenWeightsCountDesc:
    "数据源目录活动代理指标：Epoch AI「开放模型权重？」字段为「是」、受限使用开放权重或非商业开放权重的记录。许可证可能限制使用。不衡量下载量、采用率、开源许可宽松程度、模型质量或开源影响。",
  metricComputeKnownCountDesc:
    "具有已报告或估算训练算力值的记录。该子集系统性地低估了不披露算力的机构和国家。",
  metricFrontierCountDesc:
    "带有 Epoch AI「前沿」标签的记录：发布时已报告训练算力历史前 10 名。是算力披露记录——而非能力、商业成功或当前前沿地位的衡量指标。",
  metricLargestRunDesc:
    "已知算力子集中峰值已报告或估算训练算力（FLOPs）。仅反映已披露算力；不披露的实验室不在其中。",

  // ── Epoch 前沿定义 ────────────────────────────────────────────────────────
  frontierDefinitionNote:
    "Epoch AI「前沿」标签：发布时按已报告训练算力排名前 10 的模型。这是历史算力披露记录——而非模型能力、产品影响或当前前沿地位的衡量指标。",

  // ── 覆盖率说明（含插值变量）───────────────────────────────────────────────
  /** 插值变量：{totalDated} {computeKnown} {coveragePct} {windowStart} {windowEnd} */
  coverageNote:
    "追踪有日期记录共 {totalDated} 条；其中 {computeKnown} 条具有已报告或估算训练算力（算力覆盖率 {coveragePct}%）。近期窗口：{windowStart} – {windowEnd}。",

  // ── 国家归属说明 ───────────────────────────────────────────────────────────
  countryAttributionNote:
    "国家归属遵循 Epoch AI 原始数据。具有多国附属机构的模型可能同时被归入多个国家，这可能会增加积极参与国际合作的国家的计数。算力和前沿指标仅适用于已知算力子集，并偏向于披露训练算力的机构。举例而言：若某活跃的中国开放权重模型开发者未披露训练算力，该开发者的模型将出现在近期发布与权重可用视图中，但不会出现在已知算力或前沿排名中——这一情况同样适用于全球任何不公开算力数据的开发者，并非中国实验室所特有。",

  // ── 双语定义字符串（供 Neo 详情块渲染使用）────────────────────────────────
  /** 国家默认排序及算力前沿排名注意事项 */
  countryDefaultSortDefinition:
    "国家默认视图按近三年追踪发布数量排序，统计窗口内所有有日期目录记录，与算力披露无关。已知算力列与前沿列仅反映披露训练算力的机构，不得将其解读为各国 AI 能力或产出的综合排名。",
  /** 多国共同归属及计数加总注意事项 */
  multiCountryAttributionDefinition:
    "具有多国附属机构的模型将分别计入每个所属国家一次。因此，各国计数之和可能超过目录中唯一模型的总数。",

  // ── 机构实体说明 ───────────────────────────────────────────────────────────
  orgEntitiesNote:
    "机构按 Epoch AI 数据源中的记录显示（例如，Google、DeepMind 和 Google DeepMind 为独立条目）。不进行编辑上的家族合并。",

  // ── 数据免责声明（醒目展示）──────────────────────────────────────────────
  dataDisclaimer:
    "这些排名反映 Epoch AI 的追踪记录，不衡量 AI 能力、产品采用率、商业影响力、开源使用量或社会与经济影响。",

  // ── Section: Cost & Power Trends ───────────────────────────────────────────
  costPowerSectionTitle: "训练成本与能耗趋势",
  costPowerSectionSubhead:
    "前沿模型的训练成本与能耗正呈指数级增长。以 2023 年美元计算的中位数和峰值成本；功耗单位为瓦特。",
  costChartTitle: "各年度训练成本",
  costAxisYear: "年份",
  costAxisUsd: "成本（2023 美元，对数刻度）",
  costLabelMedian: "中位成本",
  costLabelMax: "峰值成本",
  powerChartTitle: "各年度功耗",
  powerAxisYear: "年份",
  powerAxisW: "功耗（W，对数刻度）",
  powerLabelMedian: "中位功耗",
  powerLabelMax: "峰值功耗",
  costPowerNote:
    "仅包含有成本/功耗记录的模型。数据覆盖有限，可能低估实际资源消耗。",

  // ── Section: Mix Cards ─────────────────────────────────────────────────────
  mixSectionTitle: "模型生态全景",
  mixAccessTitle: "访问方式",
  mixAccessSubhead: "覆盖全部有日期目录记录的分布",
  mixOpenWeights: "开放权重",
  mixClosed: "闭源",
  mixUnknown: "未知",
  mixDomainsTitle: "领域分布",
  mixDomainsSubhead: "已知算力记录中的主要领域",
  mixCountLabel: "个模型",
  /** 访问方式注意事项：权重可用 ≠ 宽松开源 */
  mixAccessCaveat:
    "权重可用记录包含受限使用及非商业发布；许可条款各异，本目录未作核验。权重可用不代表采用宽松的开源许可。",

  // ── Section: Why It Matters ────────────────────────────────────────────────
  whyTitle: "为何驱动劳动力颠覆",
  /** 插值变量：{doublingTime} */
  whyBody:
    "AI 训练算力每约 {doublingTime} 个月翻倍，意味着两年前看似遥不可及的能力如今已成常态。这一自 2010 年持续至今、且仍在加速的步伐，与 FutureGrid 在劳动力市场、行业和职业层面所追踪的各类位移信号存在关联。这并非某一家公司或某一个国家的产物，而是机器智能在全球范围内系统性扩张的结果。",
  whyPoint1Title: "能力扩展速度超过适应速度",
  whyPoint1:
    "当算力翻倍的速度超过企业再培训员工或重新设计工作流程的速度时，AI 的能力边界与现有岗位需求之间的差距已持续扩大。",
  whyPoint2Title: "算力披露反映集中现象",
  whyPoint2:
    "Epoch AI 目录中的算力前沿记录高度集中于公开报告训练算力的机构——主要是规模大、资本充足的实验室。这在很大程度上反映的是披露模式而非能力格局；全球许多活跃的 AI 开发者并不公开算力数据，因此算力和前沿指标系统性地低估了不披露数据的参与者。",
  whyPoint3Title: "成本与能耗放大了博弈筹码",
  /** 插值变量：{peakCost} {peakPower} */
  whyPoint3:
    "据数据源记录，已报告或估算的峰值训练运行成本已达 {peakCost}，功耗已达 {peakPower}。只有资本雄厚的机构才能突破算力前沿——进一步强化了披露者的先发优势集中效应。",

  // ── Section: Attribution ──────────────────────────────────────────────────
  attributionSectionTitle: "数据来源",
  attributionPublisher: "发布方",
  attributionLicense: "许可证",
  attributionAccessed: "访问日期",
  attributionDownload: "下载数据集",
  attributionCaveatsTitle: "数据注意事项",
  attributionCaveat: "注意事项",
  attributionOpenSource: "开放数据集",

  // ── General ───────────────────────────────────────────────────────────────
  loading: "加载中…",
  models: "个模型",
  organizations: "个机构",
  countries: "个国家/地区",
  frontier: "算力前沿",
  sectionOf: "共",
  showMore: "显示更多",
  globalPageLink: "/global",

  // ── Accessible names / summaries ─────────────────────────────────────────
  a11yCostPowerSummary:
    "两幅对数 Y 轴折线图。左图：AI 训练成本趋势（2023 年美元），展示中位数与最高值折线。" +
    "右图：AI 训练能耗趋势（瓦特），展示中位数与最高值折线。两图均涵盖近期 AI 模型历史。",
  a11yFrontierLeadersSummary:
    "横向柱状图，展示各机构与国家的追踪模型活动。" +
    "机构标签页：按所有有日期追踪记录和算力前沿记录排名前 12 名。" +
    "国家标签页：按近期追踪发布数量（近三年）排名前 10 名。" +
    "图表下方提供数据表，方便屏幕阅读器用户访问。",
  a11yFrontierLeadersName: "柱状图：各机构与国家的追踪模型活动",
};
