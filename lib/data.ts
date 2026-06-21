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
      totalEmployment: Math.floor(Math.random() * 2000000) + 50000,
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