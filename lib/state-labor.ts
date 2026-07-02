import stateLaborData from "@/data/state-labor.json";

// ─── WARN Pressure Index (BLS LAUS × state WARN notices) ─────────────────────
// Kept route-specific so the state LAUS/WARN snapshot only ships with /labor.

export type WarnCoverageStatus = "live" | "manual-only" | "unavailable" | (string & {});
export type WarnRankStatus = "ranked" | "not-ranked";
export type WarnPressureLevel = "High" | "Elevated" | "Moderate" | "Low" | "Not ranked";

export interface StateLaborPoint {
  date: string; // "YYYY-MM"
  value: number;
}

export interface StateWarnPressurePoint {
  date: string; // "YYYY-MM"
  notices: number;
  employees: number;
  employeesPer10kLaborForce: number | null;
}

export interface StateLaborSource {
  name: string;
  publisher: string;
  url: string;
  license: string;
  note: string;
}

export interface StateLaborMethodology {
  warnWindowMonths: number;
  scoreFormula: string;
  rankingNote: string;
  warnWindowEndBasis?: string;
  warnWindowNote?: string;
}

export interface StateLaborSummary {
  latestMonth: string;
  rankedStates: number;
  totalJurisdictions: number;
  warnWindowStart: string;
  warnWindowEnd: string;
  highestPressureState: string | null;
}

export interface StateLaborLatest {
  date: string | null; // "YYYY-MM"
  unemploymentRate: number | null;
  unemployed: number | null;
  employment: number | null;
  laborForce: number | null;
}

export interface StateWarnCoverage {
  sourceStatus: WarnCoverageStatus;
  sourceType: string | null;
  recordsIncluded: boolean;
  notices: number;
  dateRange: { earliest: string | null; latest: string | null } | null;
  buildStatus: string | null;
  adapter: string | null;
  name: string | null;
  publisher: string | null;
  url: string | null;
  notes: string | null;
  error: string | null;
}

export interface WarnPressurePercentiles {
  warnEmployeesPer10kLaborForce: number | null;
  unemploymentRateYoYDelta: number | null;
}

export interface StateLaborSeries {
  unemploymentRate: StateLaborPoint[];
  unemployed: StateLaborPoint[];
  employment: StateLaborPoint[];
  laborForce: StateLaborPoint[];
  warn: StateWarnPressurePoint[];
}

export interface WarnPressureState {
  state: string;
  stateName: string;
  fips: string;
  lausLatest: StateLaborLatest;
  unemploymentRateYoYDelta: number | null;
  warnCoverageStatus: WarnCoverageStatus;
  warnCoverage: StateWarnCoverage;
  rankEligible: boolean;
  rankStatus: WarnRankStatus;
  rankIneligibleReason: string | null;
  rank: number | null;
  pressureScore: number | null;
  pressureLevel: WarnPressureLevel;
  pressurePercentiles: WarnPressurePercentiles;
  warnEmployees12m: number | null;
  warnNotices12m: number | null;
  warnEmployeesPer10kLaborForce: number | null;
  coverageUnavailable: boolean;
  series: StateLaborSeries;
}

export interface StateLaborData {
  generatedAt: string;
  source: StateLaborSource;
  methodology: StateLaborMethodology;
  summary: StateLaborSummary;
  states: WarnPressureState[];
}

export interface StateLaborCoverage {
  state: string;
  stateName: string;
  warnCoverageStatus: WarnCoverageStatus;
  rankEligible: boolean;
  rankStatus: WarnRankStatus;
  rankIneligibleReason: string | null;
  warnCoverage: StateWarnCoverage;
}

const data = stateLaborData as unknown as StateLaborData;

export function getStateLaborData(): StateLaborData {
  return data;
}

export function getStateLaborSource(): StateLaborSource {
  return { ...data.source };
}

export function getWarnPressureStates(): WarnPressureState[] {
  return [...data.states].sort((a, b) => {
    if (a.rankEligible && b.rankEligible) {
      return (
        (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) ||
        a.stateName.localeCompare(b.stateName)
      );
    }
    if (a.rankEligible !== b.rankEligible) return a.rankEligible ? -1 : 1;
    return a.stateName.localeCompare(b.stateName);
  });
}

export function getWarnPressureTopStates(limit = 10): WarnPressureState[] {
  return getWarnPressureStates()
    .filter((state) => state.rankEligible)
    .slice(0, limit);
}

export function getWarnPressureSummary(): StateLaborSummary {
  return { ...data.summary };
}

export function getStateLaborCoverage(): StateLaborCoverage[] {
  return data.states
    .map((state) => ({
      state: state.state,
      stateName: state.stateName,
      warnCoverageStatus: state.warnCoverageStatus,
      rankEligible: state.rankEligible,
      rankStatus: state.rankStatus,
      rankIneligibleReason: state.rankIneligibleReason,
      warnCoverage: state.warnCoverage,
    }))
    .sort((a, b) => a.stateName.localeCompare(b.stateName));
}
