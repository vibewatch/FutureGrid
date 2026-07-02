// ─── WARN mass-layoff notice types ──────────────────────────────────────────
// Type-only module (no JSON import) so client components can share these types
// without dragging warn-notices.json into their bundle. The heavy data lives in
// lib/warn.ts (server) and public/warn-notices.json (fetched at runtime).

export interface WarnNotice {
  company: string;
  county: string | null;
  city: string | null;
  employees: number;
  noticeDate: string | null; // ISO "YYYY-MM-DD"
  effectiveDate: string | null;
  layoffType: string | null;
  state: string; // 2-letter, e.g. "CA"
  stateName: string; // e.g. "California"
}

export interface WarnMonth {
  month: string; // "YYYY-MM"
  notices: number;
  employees: number;
}

export interface WarnDateRange {
  earliest: string | null;
  latest: string | null;
}

export interface WarnStateStat {
  state: string;
  stateName: string;
  notices: number;
  employees: number;
  dateRange: WarnDateRange;
}

export interface WarnSummary {
  total: number;
  totalEmployees: number;
  dateRange: WarnDateRange;
  byState: WarnStateStat[];
  byMonth: WarnMonth[];
  byType: { type: string; notices: number; employees: number }[];
  topEmployers: { company: string; employees: number; notices: number; state: string }[];
}

export interface WarnSource {
  state: string;
  stateName: string;
  name: string;
  publisher: string;
  url: string;
  license: string;
}

export interface WarnData {
  generatedAt: string;
  coverage: string;
  sources: WarnSource[];
  notices: WarnNotice[];
  summary: WarnSummary;
}
