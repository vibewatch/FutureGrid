import warnData from "@/data/warn-notices.json";
import type {
  WarnData,
  WarnNotice,
  WarnSource,
  WarnStateStat,
  WarnSummary,
} from "@/lib/warn-types";

// ─── WARN mass-layoff notices (California EDD + others) ──────────────────────
// Company-level government layoff filings (~2.7MB). This module is the ONLY
// importer of warn-notices.json, so the dataset never enters a client chunk.
// The client Recent-Layoffs views fetch public/warn-notices.json at runtime
// instead (see lib/warn-client.ts). Server / build code may use these helpers.

export type {
  WarnData,
  WarnDateRange,
  WarnMonth,
  WarnNotice,
  WarnSource,
  WarnStateStat,
  WarnSummary,
} from "@/lib/warn-types";

const data = warnData as unknown as WarnData;

export function getWarnData(): WarnData {
  return data;
}

export function getWarnCoverage(): string {
  return data.coverage;
}

export function getWarnSources(): WarnSource[] {
  return data.sources;
}

/** Per-state totals (from the full pre-trim set), sorted by employees desc. */
export function getWarnByState(): WarnStateStat[] {
  return data.summary.byState;
}

export function getWarnSummary(): WarnSummary {
  return data.summary;
}

/** All notices (already sorted most-recent-first in the snapshot). */
export function getWarnNotices(): WarnNotice[] {
  return data.notices;
}

/** The most recent N notices. */
export function getRecentWarnNotices(limit = 25): WarnNotice[] {
  return data.notices.slice(0, limit);
}

/** Notices + affected employees aggregated by county (for a map / ranking). */
export function getWarnByCounty(): { county: string; notices: number; employees: number }[] {
  const map = new Map<string, { notices: number; employees: number }>();
  for (const n of data.notices) {
    const key = n.county ?? "Unknown";
    const e = map.get(key) ?? { notices: 0, employees: 0 };
    e.notices += 1;
    e.employees += n.employees;
    map.set(key, e);
  }
  return [...map.entries()]
    .map(([county, v]) => ({ county, ...v }))
    .sort((a, b) => b.employees - a.employees);
}
