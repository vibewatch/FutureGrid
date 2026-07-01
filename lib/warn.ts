import warnData from "@/data/warn-notices.json";

// ─── WARN mass-layoff notices (California EDD) ───────────────────────────────
// Company-level government layoff filings. Kept in its own module (not
// lib/data.ts) so the snapshot only ships in the Recent-Layoffs route chunk.

export interface WarnNotice {
  company: string;
  county: string | null;
  city: string | null;
  address: string | null;
  employees: number;
  noticeDate: string | null; // ISO "YYYY-MM-DD"
  effectiveDate: string | null;
  layoffType: string | null;
  state: string; // "CA"
}

export interface WarnMonth {
  month: string; // "YYYY-MM"
  notices: number;
  employees: number;
}

export interface WarnSummary {
  total: number;
  totalEmployees: number;
  dateRange: { earliest: string | null; latest: string | null };
  byMonth: WarnMonth[];
  byType: { type: string; notices: number; employees: number }[];
  topEmployers: { company: string; employees: number; notices: number }[];
}

export interface WarnSource {
  name: string;
  publisher: string;
  url: string;
  license: string;
  coverage: string;
  note?: string;
}

export interface WarnData {
  generatedAt: string;
  source: WarnSource;
  notices: WarnNotice[];
  summary: WarnSummary;
}

const data = warnData as unknown as WarnData;

export function getWarnData(): WarnData {
  return data;
}

export function getWarnSource(): WarnSource {
  return data.source;
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
