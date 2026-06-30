import occupationSnapshot from "@/data/occupation-snapshot.json";
import countryExposureData from "@/data/country-exposure.json";
import aiUsageProxiesData from "@/data/ai-usage-proxies.json";
import sourcesData from "@/data/sources.json";

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
  sectorName: string;
}

export interface Highlights {
  mostAtRisk: HighlightEntry[];
  /** Replaces fastestGrowing: top Bright Outlook occupations by AI exposure */
  brightOutlook: HighlightEntry[];
  mostResilient: HighlightEntry[];
  highestPaid: HighlightEntry[];
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
  };
}

// ─── Lookup helpers ──────────────────────────────────────────────────────────

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
  countrySurveyMetrics: Record<string, unknown>[];
  chinaAppMarketMetrics: Record<string, unknown>[];
  chinaNativeAppMau: Record<string, unknown>[];
  openModelDownloadProxies: Record<string, unknown>[];
  developerEcosystemProxies: Record<string, unknown>[];
  sourceCatalogForFutureCollection: Record<string, unknown>[];
}

export function getAIUsageProxies(): AIUsageProxyDataset {
  return aiUsageProxiesData as AIUsageProxyDataset;
}

// ─── Data sources ─────────────────────────────────────────────────────────────

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