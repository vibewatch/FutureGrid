import occupationSnapshot from "@/data/occupation-snapshot.json";
import aioeExposureData from "@/data/aioe-exposure.json";
import automationBaselineData from "@/data/automation-baseline.json";
import llmExposureData from "@/data/llm-exposure.json";

export interface OccExposureLenses {
  code: string;
  name: string;
  sector: string;
  usage: number | null;
  capability: number | null;
  ability: number | null;
  automation: number | null;
  consensus: number | null;
  gap: number | null;
}

type SnapshotRow = {
  socCode: string;
  title: string;
  sector: string;
  aiExposure: number;
};
type ExposureBySocJson = { bySoc: Record<string, number> };

const snapshot = (occupationSnapshot as { data: SnapshotRow[] }).data;

let _occupationExposureLensesByCode: Map<string, OccExposureLenses> | null = null;

export function getOccupationExposureLenses(code: string): OccExposureLenses | null {
  if (!_occupationExposureLensesByCode) buildOccupationExposureLensesMap();
  const lenses = _occupationExposureLensesByCode?.get(code) ?? null;
  return lenses ? { ...lenses } : null;
}

function buildOccupationExposureLensesMap(): void {
  const capabilityBySoc = (llmExposureData as ExposureBySocJson).bySoc;
  const abilityBySoc = (aioeExposureData as ExposureBySocJson).bySoc;
  const automationBySoc = (automationBaselineData as ExposureBySocJson).bySoc;

  _occupationExposureLensesByCode = new Map(
    snapshot.map((row) => {
      const usage = toNullablePct(row.aiExposure);
      const capability = toNullablePct(capabilityBySoc[row.socCode]);
      const ability = toNullablePct(abilityBySoc[row.socCode]);
      const automation = toNullablePct(automationBySoc[row.socCode]);
      const modern = [usage, capability, ability].filter((value): value is number => value != null);
      const consensus = modern.length > 0 ? round1(avg(modern)) : null;
      const gap = capability != null && usage != null ? round1(capability - usage) : null;
      return [
        row.socCode,
        {
          code: row.socCode,
          name: row.title,
          sector: row.sector,
          usage,
          capability,
          ability,
          automation,
          consensus,
          gap,
        },
      ];
    }),
  );
}

function toNullablePct(value: number | null | undefined): number | null {
  if (!isFiniteNumber(value)) return null;
  return round1(clamp(value * 100, 0, 100));
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function avg(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 10) / 10 : 0;
}
