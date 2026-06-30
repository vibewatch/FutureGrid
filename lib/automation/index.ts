import occupationSnapshot from "@/data/occupation-snapshot.json";

export interface AutomationScore {
  socCode: string;
  occupationName: string;
  probability: number;
  riskLevel: "Low" | "Medium" | "High" | "Very High";
}

// Build lookup from the real Anthropic Economic Index snapshot
const AUTOMATION_SCORES: Map<string, AutomationScore> = new Map(
  (occupationSnapshot as Array<{
    socCode: string;
    title: string;
    aiExposure: number;
    automationRisk: "Low" | "Medium" | "High" | "Very High";
  }>).map((row) => [
    row.socCode,
    {
      socCode: row.socCode,
      occupationName: row.title,
      probability: row.aiExposure,
      riskLevel: row.automationRisk,
    },
  ])
);

export function classifyRisk(probability: number): AutomationScore["riskLevel"] {
  if (probability < 0.3) return "Low";
  if (probability < 0.6) return "Medium";
  if (probability < 0.85) return "High";
  return "Very High";
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