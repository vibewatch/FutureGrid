export const methodologyZh = {
  // ── Hero ─────────────────────────────────────────────────────────────────────
  heroHeadline: "方法论与数据更新日志",
  heroSubhead:
    "每项指标的推导方式、衡量内容，以及驱动 FutureGrid 的每个数据集的溯源信息。",

  // ── Caveat callout ───────────────────────────────────────────────────────────
  caveatHeading: "⚠ 重要提示：请勿混合不可比较的指标",
  caveatBody:
    "FutureGrid 上的每项指标使用不同的数据来源、量纲和数据时期。AI 暴露评分、WARN 压力排名、市场信号评分和扰动指数值不在同一量纲上，不能进行合并、平均或直接比较。同样，某项指标中的空值（null）表示该辖区或职业的数据不可用，而非零值，不应将其视为零。",
  caveatNullNote:
    "空值 ≠ 零：当某州或职业显示无数据时，意味着所需数据（可机读 WARN 覆盖、有效 LAUS 劳动力、重叠通知窗口或暴露指数覆盖）不存在，而非风险为零。",

  // ── Section: AI Exposure Blending ────────────────────────────────────────────
  exposureHeading: "AI 暴露融合",
  exposureSubhead:
    "FutureGrid 如何衡量 AI 工具在某职业中已被使用或可能影响该职业的程度。",
  exposureLensUsage: "使用度（观测 AEI 暴露）",
  exposureLensUsageDesc:
    "主要指标。源自 Anthropic 经济指数（AEI），该指数通过调查真实 Claude API 使用模式，对每个 SOC 职业相关任务中 AI 的当前使用频率进行评分。范围 0–100。",
  exposureLensCapability: "能力度（LLM 暴露）",
  exposureLensCapabilityDesc:
    "来自 OpenAI 'GPTs are GPTs' 研究（Eloundou 等，MIT 许可）。评估 GPT-4 级别模型执行职业任务的能力，与工作者是否当前使用 AI 无关。范围 0–100。",
  exposureLensAbility: "适用度（AIOE 指数）",
  exposureLensAbilityDesc:
    "Felten、Raj 和 Seamans（2021）的 AI 职业暴露指数，将 AI 应用领域映射到 O*NET 工作活动。反映结构性任务层面的 AI 适用性，而非当前采用情况。范围 0–100。",
  exposureLensAutomation: "自动化基线",
  exposureLensAutomationDesc:
    "Frey 和 Osborne（2013）的计算机化概率。这是衡量任务自动化（而非专门针对 AI）易感性的较老基准。作为纵向背景参考；由于许可不明确，不提供下载。",
  exposureConsensusDesc:
    "「共识」维度是使用度、能力度和适用度（三个现代 AI 专用维度）的无权重平均，适用于三者均有数据的职业。当一个或多个维度缺失时，共识为可用现代维度的平均值。自动化基线不纳入共识平均，因为它衡量的是范围更广、概念更旧的任务计算机化。",
  exposureGapDesc:
    "「差距」（能力度减使用度）表明 AI 在当前观测使用度之外还能进一步取代职业任务的空间。高正差距表明该职业在结构上具有高暴露性，但工作者尚未大量采用 AI。",
  exposureCaveat:
    "注意：这些评分描述 AI 在职业任务中的当前和潜在参与程度。它们不预测失业，且随着 AI 工具的演进，当前的观测暴露度可能增加或降低。跨职业比较时应考虑三个来源研究的数据时期和方法论差异。",

  // ── Section: WARN Pressure Ranking ───────────────────────────────────────────
  warnHeading: "WARN 压力排名",
  warnSubhead:
    "哪些州被纳入排名、压力评分如何构建，以及为什么许多辖区显示空值而非评分。",
  warnEligibilityTitle: "排名资格",
  warnEligibilityDesc:
    "一个州只有满足以下三个条件才具备排名资格：（1）该州有可机读 WARN 法案通知数据（非仅手动或不可用）；（2）最新报告月份的 BLS LAUS 劳动力数据有效；（3）至少有一条 WARN 通知落在以最近数据构建日期为结束点的 12 个月回溯窗口内。未满足任一条件的州压力评分为空值，而非零。",
  warnNullNote:
    "仅手动州（以 PDF 或 HTML 表格发布 WARN 数据）和无可机读覆盖的州不参与排名。其空值表示数据缺口，而非 WARN 活动不存在。",
  warnScoringTitle: "压力评分公式",
  warnScoringDesc:
    "对于具备资格的州，压力评分将 WARN 员工通知（按每 10000 劳动力标准化）与州失业率同比变化融合。两个分量均按当前构建中所有具备资格州的百分位排名。评分越高，表明 WARN 通知量相对劳动力越多，且失业率越恶化。",
  warnWindowTitle: "12 个月 WARN 窗口",
  warnWindowDesc:
    "只统计有效日期落在数据构建日期前 12 个月内的通知。窗口外的通知被排除，以保持排名的时效性和各构建间的可比性。",
  warnCaveat:
    "注意：各州 WARN 覆盖率不均衡——部分州拥有完整的可机读数据，其他州依赖手动抓取或不提供公开的可机读来源。排名反映可用数据，而非全国 WARN 活动的真实分布。不应将某州的空值解读为零裁员压力。",

  // ── Section: Market-Signal Scoring ───────────────────────────────────────────
  marketHeading: "市场信号评分",
  marketSubhead:
    "0–100 市场 AI 敏感度评分的构建方式及其含义，以及不代表的含义。",
  marketScoringTitle: "评分构建",
  marketScoringDesc:
    "marketAiSensitivityScore 是两个标准化分量的截断 0–100 描述性融合：65% 权重来自行业 ETF 相对标普 500（SPY）基准的超额总回报，35% 权重来自映射到该行业的职业的就业加权 AI 暴露度。两个分量均在当前构建窗口中所有可用行业 ETF 之间进行最小-最大标准化。",
  marketBenchmarkDesc:
    "基准对比窗口从固定日期（通常为数据构建前 12 个月）开始，使用来自 Yahoo Finance 图表端点的每日价格观测。由于 Yahoo Finance 端点为非官方接口，且在 Yahoo 服务条款下禁止再分发，原始市场信号数据集不提供下载。",
  marketNonAdvisoryTitle: "非投资建议声明",
  marketNonAdvisoryDesc:
    "市场 AI 敏感度评分仅为描述性、探索性指标。它不构成投资建议、财务建议，也不构成买入或卖出任何证券或 ETF 的推荐。行业 ETF 相对 SPY 的历史表现不预测未来回报。该评分不得作为其他指标的分数比例使用，也不得与非市场指标合并。",
  marketCaveat:
    "注意：ETF 与职业的映射是启发式的——科技行业 ETF 可能包含来自多个 O*NET 行业的公司，反之亦然。覆盖缺口列在数据集的「omittedTickers」字段中。评分随每次数据构建时市场状况的变化而改变。",

  // ── Section: Forecast / Regression / Disruption ──────────────────────────────
  forecastHeading: "预测、回归与扰动指数",
  forecastSubhead:
    "就业预测、皮尔逊相关系数和扰动指数的计算方式。",
  regressionTitle: "线性回归与皮尔逊相关",
  regressionDesc:
    "对于每项散点分析（AI 暴露度 vs 就业增长；AI 暴露度 vs 薪资增长），FutureGrid 对所有两个变量均有有限值的职业应用普通最小二乘线性回归。皮尔逊 r 系数由相同数据对计算得出。这些都是对历史 BLS OEWS 数据（2016–2025）的纯描述性统计，描述关联性而非因果关系。",
  forecastTitle: "2030 年就业预测",
  forecastDesc:
    "2030 年基准预测将每个职业的历史就业趋势（从 BLS OEWS 历史记录计算的 CAGR）从 2026 年线性外推至 2030 年。AI 调整预测应用灵敏度乘数（默认 0.5），按职业 AI 暴露评分比例向下调整预计增长率。两者均为基于趋势外推的预测，而非经济模型。2030 年实际就业情况将有所不同。",
  disruptionTitle: "扰动指数",
  disruptionDesc:
    "每个职业的 AI 扰动指数评分（0–100）是四个百分位排名分量的加权组合：AI 暴露度（40%）、就业下降率（25%）、薪资停滞（20%）和缺乏 BLS「光明前景」认定（15%）。每个分量在所有具有完整数据的职业中进行最小-最大标准化。该指数描述相对结构性压力，而非裁员预测。",
  forecastCaveat:
    "注意：所有预测和回归结果均为历史数据的描述性分析。它们不是计量经济学因果模型，不考虑政策变化、历史趋势之外的技术颠覆或宏观经济冲击。2030 年预测具有较大的不确定区间，UI 中未予显示。",

  // ── Section: H-1B Work-Visa Trends ────────────────────────────────────────────
  h1bHeading: "H-1B 工作签证趋势",
  h1bSubhead:
    "如何从 DOL OFLC 披露数据中推导获批 H-1B LCA 指标，以及为何它是申请（而非签证批准）层面的需求信号。",
  h1bMetricTitle: "指标统计的内容",
  h1bMetricDesc:
    "核心指标是各财年获批的 H-1B 劳工条件申请（LCA）数量。LCA 是雇主在为 H-1B 员工提交申请之前，向劳工部外国劳工认证办公室（OFLC）提交的关于工资与工作条件的声明。获批 LCA 是获准的申请——并非签证批准、petition 或实际雇佣，且单份 LCA 可列出多个岗位。",
  h1bAggTitle: "按季度对不同案件求和",
  h1bAggDesc:
    "OFLC 自 FY2020 起按季度发布 LCA 披露文件，FY2016–FY2019 则为单一年度工作簿。季度文件为每季度快照而非累计，因此完整财年数据是对四个季度文件中不同案件编号取并集计算得出——去除在多个季度中重复出现的案件。FY2016–FY2019 直接使用年度披露工作簿。SOC 职业代码通过交叉映射统一为 2018 SOC 版本，以便十年数据可比。",
  h1bWageTitle: "工资年化",
  h1bWageDesc:
    "报告的工资有时薪、周薪、双周薪、月薪或年薪等形式。在计算中位数及第 25/75 百分位之前，每个工资都被年化为统一的年度数值，因此工资趋势在整个十年间反映的是可比的全年薪酬。",
  h1bExposureTitle: "AI 暴露等级关联",
  h1bExposureDesc:
    "每个职业的 SOC 代码与 FutureGrid 职业快照的自动化风险等级（低、中、高、极高）进行关联，以展示按 AI 暴露等级划分的获批 LCA 数量。约 72% 的 H-1B SOC 代码成功匹配；未匹配的代码归入“未分类”。这是两个独立数据集的描述性叠加，并非关于 AI 与签证需求的因果结论。",
  h1bCaveat:
    "注意：这些数字是雇主提交的申请，而非签证批准或发放。获批 LCA 并不保证 H-1B petition、批准或实际雇佣，且每份 LCA 可覆盖多个岗位。年度名额、USCIS petition 结果及撤回不在统计范围内。请将这些数字视为高技能、担保岗位需求的方向性信号——而非移民结果或建议。",

  // ── Section: Data Changelog ───────────────────────────────────────────────────
  changelogHeading: "数据更新日志",
  changelogSubhead:
    "数据集版本来源于溯源注册表（data/provenance.json）。按最新构建日期排序。",
  changelogColDataset: "数据集",
  changelogColAsOf: "数据截止",
  changelogColGenerated: "构建时间",
  changelogColVersion: "版本",
  changelogColRows: "记录数",
  changelogColSource: "来源",
  changelogNa: "—",
  changelogNoData: "暂无溯源数据。",

  // ── Section: Download ─────────────────────────────────────────────────────────
  downloadHeading: "数据下载",
  downloadSubhead:
    "合规清关的数据集可供下载。标记有再分发限制的文件显示为不可用。",
  downloadClearedLabel: "下载",
  downloadSizeNote: "（文件大小：{size}）",
  downloadUnavailable: "不可再分发",
  downloadUnavailableReason: "原因：",
  downloadLicenseLabel: "许可证：",
  downloadAttributionLabel: "必要署名：",
  downloadComplianceLink: "查看 COMPLIANCE.md",
  downloadClearedHeading: "可下载文件",
  downloadFlaggedHeading: "受限 / 受标记文件",
};

export type MethodologyZh = typeof methodologyZh;
