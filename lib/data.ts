import { getAllAutomationScores } from "@/lib/automation";

export interface CareerInsight {
  occupationCode: string;
  occupationName: string;
  automationRisk: "Low" | "Medium" | "High" | "Very High";
  automationProbability: number;
  growthRate: number;
  medianSalary: number;
  totalEmployment: number;
  sectorName: string;
  skills: string[];
}

const SECTOR_MAP: Record<string, string> = {
  "11": "Management",
  "13": "Business & Financial",
  "15": "Computer & Mathematical",
  "17": "Architecture & Engineering",
  "19": "Life, Physical & Social Science",
  "21": "Community & Social Service",
  "23": "Legal",
  "25": "Education & Library",
  "27": "Arts, Entertainment & Media",
  "29": "Healthcare",
  "31": "Healthcare Support",
  "33": "Protective Service",
  "35": "Food Preparation",
  "37": "Building & Grounds",
  "39": "Personal Care",
  "41": "Sales",
  "43": "Office & Administrative",
  "45": "Farming & Forestry",
  "47": "Construction",
  "49": "Installation & Repair",
  "51": "Production",
  "53": "Transportation & Logistics",
};

const MEDIAN_SALARIES: Record<string, number> = {
  "11": 120000, "13": 85000, "15": 105000, "17": 95000, "19": 82000,
  "21": 55000, "23": 140000, "25": 65000, "27": 68000, "29": 95000,
  "31": 38000, "33": 58000, "35": 32000, "37": 34000, "39": 36000,
  "41": 45000, "43": 44000, "45": 33000, "47": 55000, "49": 52000,
  "51": 45000, "53": 42000,
};

const GROWTH_RATES: Record<string, number> = {
  "15": 25.0, "29": 13.0, "17": 8.0, "31": 15.0, "13": 9.0,
  "11": 6.0, "25": 2.0, "27": 7.0, "19": 8.0, "21": 10.0,
  "23": 5.0, "33": 3.0, "35": 4.0, "37": 5.0, "39": 6.0,
  "41": -2.0, "43": -5.0, "45": -1.0, "47": 4.0, "49": 3.0,
  "51": -4.0, "53": 1.0,
};

const SAMPLE_SKILLS: Record<string, string[]> = {
  "15": ["Programming", "Systems Analysis", "Critical Thinking", "Complex Problem Solving", "Mathematics"],
  "29": ["Active Listening", "Critical Thinking", "Service Orientation", "Judgment and Decision Making", "Speaking"],
  "17": ["Mathematics", "Critical Thinking", "Complex Problem Solving", "Reading Comprehension", "Active Learning"],
  "13": ["Critical Thinking", "Mathematics", "Reading Comprehension", "Writing", "Active Listening"],
  "11": ["Management of Personnel", "Critical Thinking", "Complex Problem Solving", "Coordination", "Judgment"],
  "41": ["Persuasion", "Active Listening", "Speaking", "Service Orientation", "Critical Thinking"],
  "43": ["Reading Comprehension", "Active Listening", "Writing", "Speaking", "Critical Thinking"],
  "27": ["Creative Thinking", "Reading Comprehension", "Writing", "Speaking", "Critical Thinking"],
  "25": ["Instructing", "Learning Strategies", "Speaking", "Reading Comprehension", "Active Listening"],
  "35": ["Active Listening", "Service Orientation", "Coordination", "Time Management", "Social Perceptiveness"],
};

function deterministicInt(seed: string, min: number, max: number): number {
  // FNV-1a hash — stable pseudo-random number from a string seed
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h ^ seed.charCodeAt(i), 16777619)) >>> 0;
  }
  return min + (h % (max - min + 1));
}

export function generateAllCareerInsights(): CareerInsight[] {
  const scores = getAllAutomationScores();
  return scores.map((s) => {
    const majorGroup = s.socCode.slice(0, 2);
    return {
      occupationCode: s.socCode,
      occupationName: s.occupationName,
      automationRisk: s.riskLevel,
      automationProbability: s.probability,
      growthRate: GROWTH_RATES[majorGroup] ?? 4.0,
      medianSalary: MEDIAN_SALARIES[majorGroup] ?? 50000,
      totalEmployment: deterministicInt(s.socCode, 50000, 2050000),
      sectorName: SECTOR_MAP[majorGroup] ?? "Other",
      skills: SAMPLE_SKILLS[majorGroup] ?? ["Critical Thinking", "Reading Comprehension", "Active Listening"],
    };
  });
}

export function getSectorAggregates(): { sector: string; avgRisk: number; avgGrowth: number; occupationCount: number }[] {
  const insights = generateAllCareerInsights();
  const map = new Map<string, { riskSum: number; growthSum: number; count: number }>();
  for (const i of insights) {
    const e = map.get(i.sectorName) ?? { riskSum: 0, growthSum: 0, count: 0 };
    e.riskSum += i.automationProbability;
    e.growthSum += i.growthRate;
    e.count++;
    map.set(i.sectorName, e);
  }
  return Array.from(map.entries()).map(([sector, d]) => ({
    sector,
    avgRisk: d.riskSum / d.count,
    avgGrowth: d.growthSum / d.count,
    occupationCount: d.count,
  }));
}

// ─── Extended sector aggregate (includes salary + employment) ────────────────

export interface SectorAggregate {
  sector: string;
  avgRisk: number;
  avgGrowth: number;
  avgSalary: number;
  totalEmployment: number;
  occupationCount: number;
}

export function getSectorAggregatesExtended(): SectorAggregate[] {
  const insights = generateAllCareerInsights();
  const map = new Map<
    string,
    { riskSum: number; growthSum: number; salarySum: number; employmentSum: number; count: number }
  >();
  for (const i of insights) {
    const e = map.get(i.sectorName) ?? {
      riskSum: 0, growthSum: 0, salarySum: 0, employmentSum: 0, count: 0,
    };
    e.riskSum += i.automationProbability;
    e.growthSum += i.growthRate;
    e.salarySum += i.medianSalary;
    e.employmentSum += i.totalEmployment;
    e.count++;
    map.set(i.sectorName, e);
  }
  return Array.from(map.entries()).map(([sector, d]) => ({
    sector,
    avgRisk: d.riskSum / d.count,
    avgGrowth: d.growthSum / d.count,
    avgSalary: d.salarySum / d.count,
    totalEmployment: d.employmentSum,
    occupationCount: d.count,
  }));
}

// ─── Highlights ──────────────────────────────────────────────────────────────

export interface HighlightEntry {
  occupationCode: string;
  occupationName: string;
  automationRisk: CareerInsight["automationRisk"];
  automationProbability: number;
  growthRate: number;
  medianSalary: number;
  sectorName: string;
}

export interface Highlights {
  mostAtRisk: HighlightEntry[];
  fastestGrowing: HighlightEntry[];
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
    fastestGrowing: [...insights]
      .sort((a, b) => b.growthRate - a.growthRate)
      .slice(0, topN)
      .map(toHighlightEntry),
    mostResilient: [...insights]
      .sort((a, b) => a.automationProbability - b.automationProbability)
      .slice(0, topN)
      .map(toHighlightEntry),
    highestPaid: [...insights]
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

  // Aggregate sector counts
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

  // Distinct skills, stable order (first-seen)
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