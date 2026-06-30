import occupationSnapshot from "@/data/occupation-snapshot.json";
import countryExposureData from "@/data/country-exposure.json";
import aiUsageProxiesData from "@/data/ai-usage-proxies.json";
import onetEnrichmentData from "@/data/onet-enrichment.json";
import sourcesData from "@/data/sources.json";
import globalAiMetricsData from "@/data/global-ai-metrics.json";

export interface CareerInsight {
  occupationCode: string;
  occupationName: string;
  automationRisk: "Low" | "Medium" | "High" | "Very High";
  automationProbability: number;
  growthRate: number | null;
  medianSalary: number;
  totalEmployment: number | null;
  projectedOpenings: number | null;
  outlook: "Bright" | "Average";
  sectorName: string;
  skills: string[];
}

type SnapshotRow = {
  socCode: string;
  title: string;
  sector: string;
  aiExposure: number;
  automationRisk: "Low" | "Medium" | "High" | "Very High";
  automationProbability: number;
  medianSalary: number;
  employment: number | null;
  projectedOpenings: number | null;
  growthRate: number | null;
  jobZone: number;
  brightOutlook: boolean;
  outlook: "Bright" | "Average";
  skills: string[];
};

const snapshot = occupationSnapshot as SnapshotRow[];

let _insightsCache: CareerInsight[] | null = null;

export function generateAllCareerInsights(): CareerInsight[] {
  if (!_insightsCache) {
    _insightsCache = snapshot.map((row) => ({
      occupationCode: row.socCode,
      occupationName: row.title,
      automationRisk: row.automationRisk,
      automationProbability: row.automationProbability,
      growthRate: row.growthRate,
      medianSalary: row.medianSalary,
      totalEmployment: row.employment,
      projectedOpenings: row.projectedOpenings ?? null,
      outlook: row.outlook ?? (row.brightOutlook ? "Bright" : "Average"),
      sectorName: row.sector,
      skills: row.skills,
    }));
  }
  return [..._insightsCache];
}

export function getSectorAggregates(): { sector: string; avgRisk: number; avgGrowth: number | null; occupationCount: number }[] {
  const insights = generateAllCareerInsights();
  const map = new Map<string, { riskSum: number; growthSum: number; growthCnt: number; count: number }>();
  for (const i of insights) {
    const e = map.get(i.sectorName) ?? { riskSum: 0, growthSum: 0, growthCnt: 0, count: 0 };
    e.riskSum += i.automationProbability;
    if (i.growthRate != null) { e.growthSum += i.growthRate; e.growthCnt++; }
    e.count++;
    map.set(i.sectorName, e);
  }
  return Array.from(map.entries()).map(([sector, d]) => ({
    sector,
    avgRisk: d.riskSum / d.count,
    avgGrowth: d.growthCnt > 0 ? d.growthSum / d.growthCnt : null,
    occupationCount: d.count,
  }));
}

// ─── Extended sector aggregate (includes salary + employment) ────────────────

export interface SectorAggregate {
  sector: string;
  avgRisk: number;
  avgGrowth: number | null;
  avgSalary: number | null;
  totalEmployment: number | null;
  brightShare: number;
  occupationCount: number;
}

export function getSectorAggregatesExtended(): SectorAggregate[] {
  const insights = generateAllCareerInsights();
  const map = new Map<
    string,
    { riskSum: number; growthSum: number; growthCnt: number; salarySum: number; salaryCnt: number; empSum: number; empCnt: number; brightCnt: number; count: number }
  >();
  for (const i of insights) {
    const e = map.get(i.sectorName) ?? {
      riskSum: 0, growthSum: 0, growthCnt: 0, salarySum: 0, salaryCnt: 0, empSum: 0, empCnt: 0, brightCnt: 0, count: 0,
    };
    e.riskSum += i.automationProbability;
    if (i.growthRate != null) { e.growthSum += i.growthRate; e.growthCnt++; }
    if (i.medianSalary > 0) { e.salarySum += i.medianSalary; e.salaryCnt++; }
    if (i.totalEmployment != null && i.totalEmployment > 0) { e.empSum += i.totalEmployment; e.empCnt++; }
    if (i.outlook === "Bright") e.brightCnt++;
    e.count++;
    map.set(i.sectorName, e);
  }
  return Array.from(map.entries()).map(([sector, d]) => ({
    sector,
    avgRisk: d.riskSum / d.count,
    avgGrowth: d.growthCnt > 0 ? d.growthSum / d.growthCnt : null,
    avgSalary: d.salaryCnt > 0 ? d.salarySum / d.salaryCnt : null,
    totalEmployment: d.empCnt > 0 ? d.empSum : null,
    brightShare: d.count > 0 ? d.brightCnt / d.count : 0,
    occupationCount: d.count,
  }));
}

// ─── Highlights ──────────────────────────────────────────────────────────────

export interface HighlightEntry {
  occupationCode: string;
  occupationName: string;
  automationRisk: CareerInsight["automationRisk"];
  automationProbability: number;
  growthRate: number | null;
  projectedOpenings: number | null;
  outlook: "Bright" | "Average";
  medianSalary: number;
  totalEmployment: number | null;
  sectorName: string;
}

export interface Highlights {
  mostAtRisk: HighlightEntry[];
  /** Replaces fastestGrowing: top Bright Outlook occupations by AI exposure */
  brightOutlook: HighlightEntry[];
  mostResilient: HighlightEntry[];
  highestPaid: HighlightEntry[];
  largestWorkforce: HighlightEntry[];
}

function toHighlightEntry(c: CareerInsight): HighlightEntry {
  return {
    occupationCode: c.occupationCode,
    occupationName: c.occupationName,
    automationRisk: c.automationRisk,
    automationProbability: c.automationProbability,
    growthRate: c.growthRate,
    projectedOpenings: c.projectedOpenings,
    outlook: c.outlook,
    medianSalary: c.medianSalary,
    totalEmployment: c.totalEmployment,
    sectorName: c.sectorName,
  };
}

export function getHighlights(topN = 5): Highlights {
  const insights = generateAllCareerInsights();
  return {
    mostAtRisk: [...insights]
      .sort((a, b) => b.automationProbability - a.automationProbability)
      .slice(0, topN)
      .map(toHighlightEntry),
    brightOutlook: [...insights]
      .filter((i) => i.outlook === "Bright")
      .sort((a, b) => b.automationProbability - a.automationProbability)
      .slice(0, topN)
      .map(toHighlightEntry),
    mostResilient: [...insights]
      .sort((a, b) => a.automationProbability - b.automationProbability)
      .slice(0, topN)
      .map(toHighlightEntry),
    highestPaid: [...insights]
      .filter((i) => i.medianSalary > 0)
      .sort((a, b) => b.medianSalary - a.medianSalary)
      .slice(0, topN)
      .map(toHighlightEntry),
    largestWorkforce: [...insights]
      .filter((i) => i.totalEmployment != null && i.totalEmployment > 0)
      .sort((a, b) => (b.totalEmployment ?? 0) - (a.totalEmployment ?? 0))
      .slice(0, topN)
      .map(toHighlightEntry),
  };
}

// ─── Workforce aggregate ──────────────────────────────────────────────────────

let _totalWorkforceCache: number | null = null;

export function getTotalWorkforce(): number {
  if (_totalWorkforceCache !== null) return _totalWorkforceCache;
  _totalWorkforceCache = generateAllCareerInsights().reduce(
    (sum, i) => sum + (i.totalEmployment ?? 0),
    0,
  );
  return _totalWorkforceCache;
}

// ─── Workforce exposure by AI band ────────────────────────────────────────────

export interface WorkforceExposure {
  totalWorkforce: number;
  byBand: Record<"Low" | "Medium" | "High" | "Very High", number>;
  highExposureWorkforce: number;
  /** 0–1: share of workforce in High + Very High exposure occupations */
  highExposureShare: number;
  veryHighShare: number;
}

let _workforceExposureCache: WorkforceExposure | null = null;

export function getWorkforceExposure(): WorkforceExposure {
  if (_workforceExposureCache) return _workforceExposureCache;
  const insights = generateAllCareerInsights();
  const byBand: Record<"Low" | "Medium" | "High" | "Very High", number> = {
    Low: 0,
    Medium: 0,
    High: 0,
    "Very High": 0,
  };
  let totalWorkforce = 0;
  for (const i of insights) {
    const emp = i.totalEmployment ?? 0;
    byBand[i.automationRisk] += emp;
    totalWorkforce += emp;
  }
  const highExposureWorkforce = byBand.High + byBand["Very High"];
  _workforceExposureCache = {
    totalWorkforce,
    byBand,
    highExposureWorkforce,
    highExposureShare: totalWorkforce > 0 ? highExposureWorkforce / totalWorkforce : 0,
    veryHighShare: totalWorkforce > 0 ? byBand["Very High"] / totalWorkforce : 0,
  };
  return _workforceExposureCache;
}

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getCareerByCode(code: string): CareerInsight | undefined {
  return generateAllCareerInsights().find((i) => i.occupationCode === code);
}

export function computeResiliencyScore(automationProbability: number): number {
  return Math.round((1 - automationProbability) * 100);
}

// ─── Search index ────────────────────────────────────────────────────────────

export interface SearchItem {
  type: "occupation" | "sector" | "skill";
  label: string;
  sublabel?: string;
  href: string;
  risk?: number;
}

let _searchIndexCache: SearchItem[] | null = null;

export function getSearchIndex(): SearchItem[] {
  if (_searchIndexCache) return _searchIndexCache;

  const insights = generateAllCareerInsights();

  const occupationItems: SearchItem[] = insights.map((i) => ({
    type: "occupation",
    label: i.occupationName,
    sublabel: i.sectorName,
    href: "/careers/" + i.occupationCode,
    risk: i.automationProbability * 100,
  }));

  const sectorCounts = new Map<string, number>();
  for (const i of insights) {
    sectorCounts.set(i.sectorName, (sectorCounts.get(i.sectorName) ?? 0) + 1);
  }
  const sectorItems: SearchItem[] = Array.from(sectorCounts.entries()).map(
    ([name, count]) => ({
      type: "sector",
      label: name,
      sublabel: count + " occupations",
      href: "/sectors/" + encodeURIComponent(name),
    }),
  );

  const seen = new Set<string>();
  const skillItems: SearchItem[] = [];
  for (const i of insights) {
    for (const skill of i.skills) {
      if (!seen.has(skill)) {
        seen.add(skill);
        skillItems.push({ type: "skill", label: skill, href: "/skills" });
      }
    }
  }

  _searchIndexCache = [...occupationItems, ...sectorItems, ...skillItems];
  return _searchIndexCache;
}

// ─── Search insights ─────────────────────────────────────────────────────────

export function searchInsights(query: string, limit = 8): CareerInsight[] {
  const q = query.trim();
  if (!q) return [];

  const lower = q.toLowerCase();
  const insights = generateAllCareerInsights();

  type Ranked = { insight: CareerInsight; rank: number };
  const results: Ranked[] = [];

  for (const i of insights) {
    const name = i.occupationName.toLowerCase();
    const sector = i.sectorName.toLowerCase();

    let rank: number;
    if (name.startsWith(lower)) {
      rank = 0;
    } else if (name.split(/\s+/).some((w) => w.startsWith(lower))) {
      rank = 1;
    } else if (name.includes(lower) || sector.includes(lower)) {
      rank = 2;
    } else {
      continue;
    }
    results.push({ insight: i, rank });
  }

  results.sort((a, b) => a.rank - b.rank);
  return results.slice(0, limit).map((r) => r.insight);
}

// ─── Country exposure (Anthropic Economic Index, Aug 2025) ───────────────────

export interface CountryExposure {
  iso3: string;
  name: string;
  usageIndex: number | null;
  usagePct: number | null;
  usageCount: number | null;
  gdpPerWorkingAgeCapita: number | null;
}

export function getCountryExposure(): CountryExposure[] {
  return countryExposureData as CountryExposure[];
}

// ─── Supplemental AI usage proxies ───────────────────────────────────────────

export interface AIUsageProxyDataset {
  generatedAt: string;
  scope: string;
  caveat: string;
  enterpriseAdoptionMetrics: Record<string, unknown>[];
  individualGenerativeAIUsageMetrics: Record<string, unknown>[];
  usCensusBusinessAIMetrics: Record<string, unknown>[];
  countrySurveyMetrics: Record<string, unknown>[];
  chinaAppMarketMetrics: Record<string, unknown>[];
  chinaNativeAppMau: Record<string, unknown>[];
  developerSurveyMetrics: Record<string, unknown>[];
  openModelDownloadProxies: Record<string, unknown>[];
  developerEcosystemProxies: Record<string, unknown>[];
  aiResearchActivityMetrics: Record<string, unknown>[];
  sourceCatalogForFutureCollection: Record<string, unknown>[];
}

export function getAIUsageProxies(): AIUsageProxyDataset {
  return aiUsageProxiesData as AIUsageProxyDataset;
}

// ─── O*NET enrichment ────────────────────────────────────────────────────────

export interface OnetEnrichmentOccupation {
  occupationCode: string;
  onetCode: string;
  title: string;
  description: string;
  sampleTitles: string[];
  jobZone: { code: number; title: string } | null;
  tasks: { id: string; title: string }[];
  detailedWorkActivities: { id: string; title: string }[];
  skills: { id: string; name: string; description: string }[];
  technologySkills: { name: string; category: string; hot: boolean; inDemand: boolean }[];
  relatedOccupations: { code: string; onetCode: string; title: string; brightOutlook: boolean }[];
}

export interface OnetEnrichmentData {
  generatedAt: string;
  coverage: { requested: number; enriched: number; missing: string[] };
  occupations: Record<string, OnetEnrichmentOccupation>;
}

export function getOnetEnrichment(code: string): OnetEnrichmentOccupation | undefined {
  return (onetEnrichmentData as OnetEnrichmentData).occupations[code];
}

// ─── Country map data (choropleth) ───────────────────────────────────────────

export interface CountryMapDatum {
  iso3: string;
  name: string;
  usageIndex: number | null;
  usagePct: number | null;
  hasClaudeData: boolean;
  proxyNote: string | null;
  /** Microsoft AIEI Q1 2026: % of working-age population using generative AI.
   *  Comparable across ~147 economies including China. NOT the same scale as
   *  usageIndex — do not average or merge. */
  diffusionPct: number | null;
  /** All three AIEI periods for momentum/trend analysis.
   *  null if the country was not present in all three survey waves. */
  diffusionTrend: { h1_2025: number; h2_2025: number; q1_2026: number } | null;
  /** Percentage-point change from H1 2025 → Q1 2026 (q1_2026 − h1_2025).
   *  null if either end-point is missing. */
  diffusionDelta: number | null;
  /** IMF AI Preparedness Index (capacity metric, not user-behavior %).
   *  null if IMF data was unavailable or skipped this build. */
  aiReadiness: number | null;
  /** IMF AIPI sub-index scores (0–1, 2023 vintage).
   *  Four pillars: Digital Infrastructure (DI), Human Capital & Labour Market Policies (HCLMP),
   *  Innovation & Economic Integration (IEI), Regulation & Ethics (RE).
   *  null if sub-index data was unavailable or skipped this build. */
  readinessSubIndices: {
    digitalInfrastructure: number | null;
    humanCapital: number | null;
    innovation: number | null;
    regulationEthics: number | null;
  } | null;
}

export function getCountryMapData(): CountryMapDatum[] {
  const exposure = getCountryExposure();
  const proxies = getAIUsageProxies();

  // Read China proxy figures from the actual data (with hardcoded fallbacks)
  const cnnicEntry = proxies.countrySurveyMetrics.find(
    (m) => (m as { id?: string }).id === "cn-cnnic-genai-users-2025-06",
  );
  const questEntry = proxies.chinaAppMarketMetrics.find(
    (m) => (m as { id?: string }).id === "cn-questmobile-mobile-ai-app-users-2025-06",
  );
  const cnnicVal = cnnicEntry
    ? `${Math.round(Number((cnnicEntry as { value?: unknown }).value) / 1e6)}M`
    : "515M";
  const qmVal = questEntry
    ? `${Math.round(Number((questEntry as { value?: unknown }).value) / 1e6)}M`
    : "680M";
  const chinaNote =
    `Claude.ai unavailable; CNNIC reports ${cnnicVal} generative-AI users, QuestMobile ${qmVal} mobile-AI MAU. ` +
    `Microsoft estimates 16.4% GenAI diffusion (Western telemetry undercounts domestic apps; CNNIC reports ~43%).`;

  // Join global AI metrics (diffusion + readiness)
  const metrics = globalAiMetricsData as {
    metrics: {
      diffusion: Record<string, number>;
      diffusionTrend?: Record<string, { h1_2025: number | null; h2_2025: number | null; q1_2026: number | null }>;
      readiness?: Record<string, number>;
      readinessSubIndices?: Record<string, {
        digitalInfrastructure: number | null;
        humanCapital: number | null;
        innovation: number | null;
        regulationEthics: number | null;
      }>;
    };
  };
  const diffusionMap: Record<string, number> = metrics?.metrics?.diffusion ?? {};
  const diffusionTrendMap = metrics?.metrics?.diffusionTrend ?? {};
  const readinessMap: Record<string, number> = metrics?.metrics?.readiness ?? {};
  const readinessSubIndicesMap = metrics?.metrics?.readinessSubIndices ?? {};

  return exposure.map((c) => {
    const hasClaudeData = c.usageIndex != null && c.usageIndex > 0;
    let proxyNote: string | null = null;
    if (!hasClaudeData && c.iso3 === "CHN") {
      proxyNote = chinaNote;
    }
    const rawTrend = diffusionTrendMap[c.iso3] ?? null;
    const diffusionTrend =
      rawTrend &&
      rawTrend.h1_2025 !== null &&
      rawTrend.h2_2025 !== null &&
      rawTrend.q1_2026 !== null
        ? { h1_2025: rawTrend.h1_2025, h2_2025: rawTrend.h2_2025, q1_2026: rawTrend.q1_2026 }
        : null;
    const diffusionDelta =
      rawTrend && rawTrend.h1_2025 !== null && rawTrend.q1_2026 !== null
        ? Math.round((rawTrend.q1_2026 - rawTrend.h1_2025) * 100) / 100
        : null;
    return {
      iso3: c.iso3,
      name: c.name,
      usageIndex: c.usageIndex,
      usagePct: c.usagePct,
      hasClaudeData,
      proxyNote,
      diffusionPct: diffusionMap[c.iso3] ?? null,
      diffusionTrend,
      diffusionDelta,
      aiReadiness: readinessMap[c.iso3] ?? null,
      readinessSubIndices: readinessSubIndicesMap[c.iso3]
        ? {
            digitalInfrastructure: readinessSubIndicesMap[c.iso3].digitalInfrastructure ?? null,
            humanCapital: readinessSubIndicesMap[c.iso3].humanCapital ?? null,
            innovation: readinessSubIndicesMap[c.iso3].innovation ?? null,
            regulationEthics: readinessSubIndicesMap[c.iso3].regulationEthics ?? null,
          }
        : null,
    };
  });
}

// ─── Diffusion trend helpers ──────────────────────────────────────────────────

export interface DiffusionRiser {
  iso3: string;
  name: string;
  from: number;
  to: number;
  delta: number;
}

/** Returns countries sorted by largest positive diffusionDelta (H1 2025 → Q1 2026).
 *  Requires all three AIEI periods to be present. */
export function getDiffusionRisers(limit = 5): DiffusionRiser[] {
  return getCountryMapData()
    .filter(
      (c): c is typeof c & { diffusionTrend: NonNullable<typeof c.diffusionTrend>; diffusionDelta: number } =>
        c.diffusionTrend !== null && c.diffusionDelta !== null && c.diffusionDelta > 0,
    )
    .sort((a, b) => b.diffusionDelta - a.diffusionDelta)
    .slice(0, limit)
    .map((c) => ({
      iso3: c.iso3,
      name: c.name,
      from: c.diffusionTrend.h1_2025,
      to: c.diffusionTrend.q1_2026,
      delta: c.diffusionDelta,
    }));
}

export interface DataSource {
  name: string;
  publisher: string;
  year: number;
  url: string;
  license: string;
  usedFor: string;
}

export interface DataSources {
  generatedAt: string;
  license: string;
  attribution: string;
  sources: DataSource[];
  note: string;
}

export function getDataSources(): DataSources {
  return sourcesData as DataSources;
}

// ─── Reskilling paths ─────────────────────────────────────────────────────────

export interface ReskillingTarget {
  occupationCode: string;
  occupationName: string;
  sectorName: string;
  automationRisk: CareerInsight["automationRisk"];
  aiExposure: number;
  medianSalary: number;
  outlook: CareerInsight["outlook"];
  sharedSkills: string[];
  sharedCount: number;
  /** sharedCount / fromSkills.length */
  overlapScore: number;
}

let _skillsByCodeCache: Map<string, string[]> | null = null;

function getSkillsByCode(): Map<string, string[]> {
  if (!_skillsByCodeCache) {
    _skillsByCodeCache = new Map(snapshot.map((row) => [row.socCode, row.skills]));
  }
  return _skillsByCodeCache;
}

export function getReskillingPaths(fromCode: string, limit = 6): ReskillingTarget[] {
  const source = snapshot.find((row) => row.socCode === fromCode);
  if (!source || source.skills.length === 0) return [];

  const fromSkills = [...new Set(source.skills)];
  const fromSkillSet = new Set(fromSkills);
  const skillsByCode = getSkillsByCode();

  const seenTitles = new Set<string>();
  seenTitles.add(source.title);

  const candidates: ReskillingTarget[] = [];

  for (const row of snapshot) {
    if (row.socCode === fromCode) continue;
    if (row.automationRisk !== "Low" && row.automationRisk !== "Medium") continue;
    if (row.aiExposure >= source.aiExposure) continue;
    if (seenTitles.has(row.title)) continue;

    const targetSkills = [...new Set(skillsByCode.get(row.socCode) ?? [])];
    const sharedSkills = targetSkills.filter((s) => fromSkillSet.has(s));
    if (sharedSkills.length === 0) continue;

    seenTitles.add(row.title);
    candidates.push({
      occupationCode: row.socCode,
      occupationName: row.title,
      sectorName: row.sector,
      automationRisk: row.automationRisk,
      aiExposure: row.aiExposure,
      medianSalary: row.medianSalary,
      outlook: row.outlook,
      sharedSkills,
      sharedCount: sharedSkills.length,
      overlapScore: sharedSkills.length / fromSkills.length,
    });
  }

  return candidates
    .sort((a, b) => b.sharedCount - a.sharedCount || b.medianSalary - a.medianSalary)
    .slice(0, limit);
}

export function getHighExposureOccupations(
  limit = 30,
): { occupationCode: string; occupationName: string; aiExposure: number; sectorName: string }[] {
  const sorted = [...snapshot].sort((a, b) => b.aiExposure - a.aiExposure);
  const seenTitles = new Set<string>();
  const results: { occupationCode: string; occupationName: string; aiExposure: number; sectorName: string }[] = [];

  for (const row of sorted) {
    if (seenTitles.has(row.title)) continue;
    seenTitles.add(row.title);
    results.push({
      occupationCode: row.socCode,
      occupationName: row.title,
      aiExposure: row.aiExposure,
      sectorName: row.sector,
    });
    if (results.length >= limit) break;
  }

  return results;
}