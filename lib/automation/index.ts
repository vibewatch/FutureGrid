import occupationSnapshot from "@/data/occupation-snapshot.json";

export interface AutomationScore {
  socCode: string;
  occupationName: string;
  probability: number;
  riskLevel: "Low" | "Medium" | "High" | "Very High";
}

// Build lookup from the real Anthropic Economic Index snapshot
const AUTOMATION_SCORES: Map<string, AutomationScore> = new Map(
  (occupationSnapshot as { data: Array<{
    socCode: string;
    title: string;
    aiExposure: number;
    automationRisk: "Low" | "Medium" | "High" | "Very High";
  }> }).data.map((row) => [
    row.socCode,
    {
      socCode: row.socCode,
      occupationName: row.title,
      probability: row.aiExposure,
      riskLevel: row.automationRisk,
    },
  ])
);

// Percentile-calibrated thresholds matching the build pipeline (computed from 756-occ AEI distribution):
// Very High = top ~8%  (aiExposure > 0.3104 / p92)
// High      = next ~12% (aiExposure > 0.1378 / p80)
// Medium    = next ~25% (aiExposure > 0.0080 / p55)
// Low       = remainder (≤ p55, includes ~0-exposure occupations)
export function classifyRisk(probability: number): AutomationScore["riskLevel"] {
  if (probability > 0.3104) return "Very High";
  if (probability > 0.1378) return "High";
  if (probability > 0.0080) return "Medium";
  return "Low";
}

export function getAutomationScore(socCode: string): AutomationScore | undefined {
  return AUTOMATION_SCORES.get(socCode);
}

export function getAllAutomationScores(): AutomationScore[] {
  return Array.from(AUTOMATION_SCORES.values());
}

export function getAutomationScoresByRisk(risk: AutomationScore["riskLevel"]): AutomationScore[] {
  return getAllAutomationScores().filter((s) => s.riskLevel === risk);
}