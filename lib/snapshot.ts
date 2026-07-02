import occupationSnapshot from "@/data/occupation-snapshot.json";

// ─── Full occupation snapshot (with multi-year OEWS history) ─────────────────
// This module is the ONLY importer of the full occupation-snapshot.json, which
// carries the heavy per-occupation employmentHistory / wageHistory maps. Keep it
// out of "use client" components: read it in a Server Component (or a build
// step) and pass the resolved, minimal data into client islands as props. The
// slim, history-free snapshot used by broad client code lives in lib/data.ts.

export type SnapshotRow = {
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
  employmentHistory?: Record<string, number>;
  wageHistory?: Record<string, number>;
};

const snapshot = occupationSnapshot as SnapshotRow[];

export interface TrendPoint {
  year: number;
  employment: number | null;
  wage: number | null;
}

/**
 * Sorted-by-year array of annual employment + wage datapoints for the given SOC
 * code, drawn from the OEWS history populated by the BLS pipeline. Years missing
 * a field are represented as null. Server-only (needs the full snapshot).
 */
export function getOccupationTrend(code: string): TrendPoint[] {
  const row = snapshot.find((r) => r.socCode === code);
  if (!row) return [];
  const empH = row.employmentHistory ?? {};
  const wageH = row.wageHistory ?? {};
  const years = new Set([...Object.keys(empH), ...Object.keys(wageH)]);
  return Array.from(years)
    .map((y) => ({
      year: parseInt(y, 10),
      employment: empH[y] ?? null,
      wage: wageH[y] ?? null,
    }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Map of SOC code → employmentHistory (year → employment) for every occupation
 * that has one. Used to feed the animated employment "bar chart race" without
 * shipping the full snapshot into a client chunk.
 */
export function getEmploymentHistoryMap(): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const row of snapshot) {
    if (row.employmentHistory && Object.keys(row.employmentHistory).length > 0) {
      out[row.socCode] = row.employmentHistory;
    }
  }
  return out;
}
