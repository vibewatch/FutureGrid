"use client";

import { useMemo } from "react";
import { useT } from "@/lib/i18n/useT";
import {
  getStateLaborData,
  getStateLaborSource,
  getWarnPressureStates,
  getWarnPressureSummary,
  getWarnPressureTopStates,
} from "@/lib/state-labor";
import {
  getQcewBaselineStates,
  getQcewBaselineSummary,
  getQcewBaselineTopStates,
  getStateQcewData,
  getStateQcewSource,
} from "@/lib/state-qcew";

type PressureBand = "high" | "elevated" | "watch" | "low" | "not-ranked";
type CoverageGroup = "live" | "manual" | "unavailable" | "historical" | "pdf" | "failed";

interface StateLaborSource {
  name?: string;
  publisher?: string;
  survey?: string;
  url?: string;
  license?: string;
  note?: string;
}

interface WarnPressureSummary {
  states?: number;
  totalStates?: number;
  totalJurisdictions?: number;
  rankEligibleStates?: number;
  rankedStates?: number;
  excludedStates?: number;
  medianPressureScore?: number | null;
  topStates?: string[];
  totalWarnEmployees?: number;
  warnWindowMonths?: string[];
  warnWindowStart?: string;
  warnWindowEnd?: string;
  latestMonth?: string;
}

interface StateLaborData {
  generatedAt?: string;
  analysisMonth?: string;
  latestBlsMonth?: string;
  latestWarnMonth?: string | null;
  windowMonths?: string[];
  source?: StateLaborSource;
  summary?: WarnPressureSummary;
  methodology?: {
    warnWindowMonths?: number;
    scoreFormula?: string;
    rankingNote?: string;
  };
}

interface StateQcewSource {
  name?: string;
  publisher?: string;
  survey?: string;
  url?: string;
  license?: string;
  year?: number;
  note?: string;
}

interface QcewBaselineSummary {
  states?: number;
  totalStates?: number;
  totalJurisdictions?: number;
  rankedStates?: number;
  statesWithBaselineRate?: number;
  qcewYear?: number;
  latestQuarter?: string;
  latestPeriod?: string;
  totalWarnEmployees?: number;
}

interface StateQcewData {
  generatedAt?: string;
  latestQuarter?: string;
  latestPeriod?: string;
  source?: StateQcewSource;
  summary?: QcewBaselineSummary;
}

interface QcewSnapshot {
  privateEmployment?: number | null;
  qcewPrivateEmployment?: number | null;
  qcewEmployment?: number | null;
  employment?: number | null;
  averageEmployment?: number | null;
  annualAverageEmployment?: number | null;
  avgWeeklyWage?: number | null;
  averageWeeklyWage?: number | null;
  weeklyWage?: number | null;
  avgAnnualPay?: number | null;
  averageAnnualPay?: number | null;
  annualPay?: number | null;
  year?: number | null;
  quarter?: number | string | null;
  period?: string | null;
}

interface QcewNestedSnapshot extends QcewSnapshot {
  latest?: QcewSnapshot | null;
}

interface QcewBaselineMetrics {
  warnEmployeesPer10kQcewPrivateEmployment?: number | null;
  warnEmployeesPer10kPrivateEmployment?: number | null;
  warnEmployeesPer10kQcewEmployment?: number | null;
  qcewPrivateEmployment?: number | null;
  privateEmployment?: number | null;
  annualAverageEmployment?: number | null;
  avgWeeklyWage?: number | null;
  averageWeeklyWage?: number | null;
  avgAnnualPay?: number | null;
  averageAnnualPay?: number | null;
  warnPressureScore?: number | null;
}

interface QcewBaselineState {
  state: string;
  stateName?: string;
  name?: string;
  rank?: number | null;
  baselineRank?: number | null;
  qcew?: QcewNestedSnapshot | null;
  qcewLatest?: QcewSnapshot | null;
  latest?: QcewSnapshot | null;
  metrics?: QcewBaselineMetrics;
  warnWindow?: {
    employees12m?: number | null;
    notices12m?: number | null;
    employees?: number | null;
    notices?: number | null;
  };
  warnEmployees12m?: number | null;
  warnNotices12m?: number | null;
  warnEmployees?: number | null;
  warnNotices?: number | null;
  warnEmployeesPer10kQcewPrivateEmployment?: number | null;
  warnEmployeesPer10kPrivateEmployment?: number | null;
  warnEmployeesPer10kQcewEmployment?: number | null;
  qcewPrivateEmployment?: number | null;
  privateEmployment?: number | null;
  annualAverageEmployment?: number | null;
  qcewEmployment?: number | null;
  avgWeeklyWage?: number | null;
  averageWeeklyWage?: number | null;
  avgAnnualPay?: number | null;
  averageAnnualPay?: number | null;
  lausLatest?: {
    laborForce?: number | null;
  } | null;
  latestLaus?: {
    laborForce?: number | null;
  } | null;
  lausLaborForce?: number | null;
  warnPressureScore?: number | null;
  pressureScore?: number | null;
}

interface StateLaborState {
  state: string;
  stateName: string;
  warnCoverage?: {
    status?: string;
    sourceStatus?: string;
    rankEligible?: boolean;
    exclusionReason?: string | null;
    recordsIncluded?: boolean;
    latestNoticeDate?: string | null;
    notes?: string | null;
    error?: string | null;
  };
  latest?: {
    month?: string;
    date?: string | null;
    unemploymentRate?: number | null;
    laborForce?: number | null;
  } | null;
  lausLatest?: {
    date?: string | null;
    unemploymentRate?: number | null;
    laborForce?: number | null;
  } | null;
  changes?: {
    unemploymentRateYoYPpt?: number | null;
    unemploymentRateYoYDelta?: number | null;
  };
  warnWindow?: {
    months?: string[];
    notices3m?: number;
    employees3m?: number;
    notices12m?: number;
    employees12m?: number;
  };
  metrics?: {
    warnRate3mPer10k?: number | null;
    warnRate3mPer100k?: number | null;
    warnRate12mPer10k?: number | null;
    warnRate12mPer100k?: number | null;
    pressureScore?: number | null;
    pressureBand?: string | null;
    rank?: number | null;
  };
  monthly?: Array<{
    month: string;
    unemploymentRate?: number | null;
    warnRatePer10k?: number | null;
    warnRatePer100k?: number | null;
  }>;
  latestMonth?: string | null;
  unemploymentRate?: number | null;
  unemploymentRateYoYDelta?: number | null;
  laborForce?: number | null;
  warnEmployees3m?: number;
  warnNotices3m?: number;
  warnEmployees12m?: number | null;
  warnNotices12m?: number | null;
  warnEmployeesPer10kLaborForce?: number | null;
  warnEmployeesPer100kLaborForce?: number | null;
  coverageStatus?: string;
  warnCoverageStatus?: string;
  coverageUnavailable?: boolean;
  recordsIncluded?: boolean;
  rankEligible?: boolean;
  rankStatus?: string;
  rankIneligibleReason?: string | null;
  score?: number | null;
  pressureScore?: number | null;
  pressureLevel?: string | null;
  rank?: number | null;
  status?: string;
}

const BAND_CLASSES: Record<PressureBand, string> = {
  high: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-400/30",
  elevated: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-400/30",
  watch: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-400/30",
  low: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-400/30",
  "not-ranked": "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-400/20",
};

const COVERAGE_GROUPS: CoverageGroup[] = [
  "live",
  "manual",
  "unavailable",
  "historical",
  "pdf",
  "failed",
];

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function firstFiniteNumber(...values: Array<number | null | undefined>): number | null {
  for (const value of values) {
    if (isFiniteNumber(value)) return value;
  }
  return null;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </p>
      <p className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
        {value}
      </p>
      {sub && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{sub}</p>}
    </div>
  );
}

function formatMonth(month: string | null | undefined): string {
  if (!month) return "—";
  const [year, monthIndex] = month.split("-").map(Number);
  if (!isFiniteNumber(year) || !isFiniteNumber(monthIndex)) return month;

  return new Date(year, monthIndex - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatWindow(months: string[]): string {
  if (months.length === 0) return "—";
  if (months.length === 1) return formatMonth(months[0]);
  return `${formatMonth(months[0])} – ${formatMonth(months[months.length - 1])}`;
}

function formatNumber(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return "—";
  return Math.round(value).toLocaleString();
}

function formatCurrency(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return "—";
  return `$${Math.round(value).toLocaleString()}`;
}

function formatCompact(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1_000)}K`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return Math.round(value).toLocaleString();
}

function formatPercent(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function formatPpt(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} ppt`;
}

function formatRate(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return "—";
  return value >= 10 ? value.toFixed(1) : value.toFixed(2);
}

function formatScore(value: number | null | undefined): string {
  if (!isFiniteNumber(value)) return "—";
  return String(Math.round(value));
}

function getRank(state: StateLaborState): number | null {
  return state.metrics?.rank ?? state.rank ?? null;
}

function getPressureScore(state: StateLaborState | undefined): number | null {
  if (!state) return null;
  return state.metrics?.pressureScore ?? state.pressureScore ?? state.score ?? null;
}

function normalizeBand(band: string | null | undefined): PressureBand {
  const normalized = band?.toLowerCase();
  if (
    normalized === "high" ||
    normalized === "elevated" ||
    normalized === "watch" ||
    normalized === "low"
  ) {
    return normalized;
  }
  if (normalized === "moderate") {
    return "watch";
  }
  return "not-ranked";
}

function getPressureBand(state: StateLaborState): PressureBand {
  return normalizeBand(state.metrics?.pressureBand ?? state.pressureLevel ?? state.status);
}

function getBandLabelKey(band: PressureBand): string {
  switch (band) {
    case "high":
      return "pressureBandHigh";
    case "elevated":
      return "pressureBandElevated";
    case "watch":
      return "pressureBandWatch";
    case "low":
      return "pressureBandLow";
    default:
      return "pressureBandNotRanked";
  }
}

function getCoverageStatus(state: StateLaborState): string {
  if (state.warnCoverage?.status) return state.warnCoverage.status;
  if (state.warnCoverage?.sourceStatus) return state.warnCoverage.sourceStatus;
  if (state.warnCoverageStatus) return state.warnCoverageStatus;
  if (state.coverageStatus) return state.coverageStatus;
  return isRankEligible(state) ? "current-machine-readable" : "unavailable";
}

function getCoverageGroup(state: StateLaborState): CoverageGroup {
  const status = getCoverageStatus(state);
  if (status === "current-machine-readable" || status === "machine-readable" || status === "live") {
    return "live";
  }
  if (status === "manual-only") return "manual";
  if (status === "pdf-only") return "pdf";
  if (status === "historical" || status === "stale") return "historical";
  if (status === "failed") return "failed";
  return "unavailable";
}

function getCoverageLabelKey(group: CoverageGroup): string {
  switch (group) {
    case "live":
      return "pressureCoverageLive";
    case "manual":
      return "pressureCoverageManual";
    case "historical":
      return "pressureCoverageHistorical";
    case "pdf":
      return "pressureCoveragePdf";
    case "failed":
      return "pressureCoverageFailed";
    default:
      return "pressureCoverageUnavailable";
  }
}

function isRankEligible(state: StateLaborState): boolean {
  if (typeof state.warnCoverage?.rankEligible === "boolean") {
    return state.warnCoverage.rankEligible;
  }
  if (typeof state.rankEligible === "boolean") return state.rankEligible;
  if (state.rankStatus === "ranked") return true;
  if (typeof state.warnCoverage?.recordsIncluded === "boolean") {
    return state.warnCoverage.recordsIncluded;
  }
  if (typeof state.recordsIncluded === "boolean") return state.recordsIncluded;
  return getRank(state) !== null && getPressureScore(state) !== null;
}

function getWarnEmployees(state: StateLaborState): number | null {
  return (
    state.warnWindow?.employees12m ??
    state.warnWindow?.employees3m ??
    state.warnEmployees12m ??
    state.warnEmployees3m ??
    null
  );
}

function getWarnNotices(state: StateLaborState): number | null {
  return (
    state.warnWindow?.notices12m ??
    state.warnWindow?.notices3m ??
    state.warnNotices12m ??
    state.warnNotices3m ??
    null
  );
}

function getLaborForce(state: StateLaborState | undefined): number | null {
  if (!state) return null;
  return state.latest?.laborForce ?? state.lausLatest?.laborForce ?? state.laborForce ?? null;
}

function getWarnRatePer10k(state: StateLaborState): number | null {
  if (isFiniteNumber(state.warnEmployeesPer10kLaborForce)) {
    return state.warnEmployeesPer10kLaborForce;
  }
  if (isFiniteNumber(state.metrics?.warnRate3mPer10k)) {
    return state.metrics.warnRate3mPer10k;
  }
  if (isFiniteNumber(state.metrics?.warnRate12mPer10k)) {
    return state.metrics.warnRate12mPer10k;
  }
  if (isFiniteNumber(state.warnEmployeesPer100kLaborForce)) {
    return state.warnEmployeesPer100kLaborForce / 10;
  }
  if (isFiniteNumber(state.metrics?.warnRate3mPer100k)) {
    return state.metrics.warnRate3mPer100k / 10;
  }
  if (isFiniteNumber(state.metrics?.warnRate12mPer100k)) {
    return state.metrics.warnRate12mPer100k / 10;
  }

  const laborForce = state.latest?.laborForce ?? state.lausLatest?.laborForce ?? state.laborForce;
  if (isFiniteNumber(laborForce) && laborForce > 0) {
    return ((getWarnEmployees(state) ?? 0) / laborForce) * 10_000;
  }

  return null;
}

function getQcewSnapshot(state: QcewBaselineState): QcewSnapshot | null {
  return state.qcewLatest ?? state.qcew?.latest ?? state.latest ?? state.qcew ?? null;
}

function getQcewStateName(state: QcewBaselineState): string {
  return state.stateName ?? state.name ?? state.state;
}

function getQcewRank(state: QcewBaselineState): number | null {
  return firstFiniteNumber(state.baselineRank, state.rank);
}

function getQcewWarnEmployees(state: QcewBaselineState): number | null {
  return firstFiniteNumber(
    state.warnWindow?.employees12m,
    state.warnWindow?.employees,
    state.warnEmployees12m,
    state.warnEmployees,
  );
}

function getQcewWarnNotices(state: QcewBaselineState): number | null {
  return firstFiniteNumber(
    state.warnWindow?.notices12m,
    state.warnWindow?.notices,
    state.warnNotices12m,
    state.warnNotices,
  );
}

function getQcewPrivateEmployment(state: QcewBaselineState): number | null {
  const latest = getQcewSnapshot(state);
  return firstFiniteNumber(
    state.qcewPrivateEmployment,
    state.privateEmployment,
    state.qcewEmployment,
    state.metrics?.qcewPrivateEmployment,
    state.metrics?.privateEmployment,
    state.metrics?.annualAverageEmployment,
    state.annualAverageEmployment,
    latest?.privateEmployment,
    latest?.qcewPrivateEmployment,
    latest?.qcewEmployment,
    latest?.employment,
    latest?.averageEmployment,
    latest?.annualAverageEmployment,
  );
}

function getQcewAverageWeeklyWage(state: QcewBaselineState): number | null {
  const latest = getQcewSnapshot(state);
  return firstFiniteNumber(
    state.avgWeeklyWage,
    state.averageWeeklyWage,
    state.metrics?.avgWeeklyWage,
    state.metrics?.averageWeeklyWage,
    latest?.avgWeeklyWage,
    latest?.averageWeeklyWage,
    latest?.weeklyWage,
  );
}

function getQcewAverageAnnualPay(state: QcewBaselineState): number | null {
  const latest = getQcewSnapshot(state);
  return firstFiniteNumber(
    state.avgAnnualPay,
    state.averageAnnualPay,
    state.metrics?.avgAnnualPay,
    state.metrics?.averageAnnualPay,
    latest?.avgAnnualPay,
    latest?.averageAnnualPay,
    latest?.annualPay,
  );
}

function getQcewWarnRatePer10k(state: QcewBaselineState): number | null {
  const rate = firstFiniteNumber(
    state.warnEmployeesPer10kQcewPrivateEmployment,
    state.warnEmployeesPer10kPrivateEmployment,
    state.warnEmployeesPer10kQcewEmployment,
    state.metrics?.warnEmployeesPer10kQcewPrivateEmployment,
    state.metrics?.warnEmployeesPer10kPrivateEmployment,
    state.metrics?.warnEmployeesPer10kQcewEmployment,
  );
  if (rate !== null) return rate;

  const warnEmployees = getQcewWarnEmployees(state);
  const privateEmployment = getQcewPrivateEmployment(state);
  if (warnEmployees !== null && isFiniteNumber(privateEmployment) && privateEmployment > 0) {
    return (warnEmployees / privateEmployment) * 10_000;
  }

  return null;
}

function getQcewContextLaborForce(
  qcewState: QcewBaselineState,
  laborState: StateLaborState | undefined,
): number | null {
  return firstFiniteNumber(
    qcewState.lausLaborForce,
    qcewState.lausLatest?.laborForce,
    qcewState.latestLaus?.laborForce,
    getLaborForce(laborState),
  );
}

function getQcewContextPressureScore(
  qcewState: QcewBaselineState,
  laborState: StateLaborState | undefined,
): number | null {
  return firstFiniteNumber(
    qcewState.warnPressureScore,
    qcewState.pressureScore,
    qcewState.metrics?.warnPressureScore,
    getPressureScore(laborState),
  );
}

function compareQcewBaselineStates(a: QcewBaselineState, b: QcewBaselineState): number {
  const rankA = getQcewRank(a);
  const rankB = getQcewRank(b);
  if (rankA !== null && rankB !== null && rankA !== rankB) return rankA - rankB;

  const rateA = getQcewWarnRatePer10k(a) ?? -1;
  const rateB = getQcewWarnRatePer10k(b) ?? -1;
  if (rateA !== rateB) return rateB - rateA;

  const employeesA = getQcewWarnEmployees(a) ?? -1;
  const employeesB = getQcewWarnEmployees(b) ?? -1;
  if (employeesA !== employeesB) return employeesB - employeesA;

  return getQcewStateName(a).localeCompare(getQcewStateName(b));
}

function getUnemploymentRate(state: StateLaborState): number | null {
  return state.latest?.unemploymentRate ?? state.lausLatest?.unemploymentRate ?? state.unemploymentRate ?? null;
}

function getUnemploymentYoYDelta(state: StateLaborState): number | null {
  return (
    state.changes?.unemploymentRateYoYPpt ??
    state.changes?.unemploymentRateYoYDelta ??
    state.unemploymentRateYoYDelta ??
    null
  );
}

function getLatestMonth(state: StateLaborState | undefined): string | null {
  if (!state) return null;
  return state.latest?.month ?? state.latest?.date ?? state.lausLatest?.date ?? state.latestMonth ?? null;
}

function compareRankedStates(a: StateLaborState, b: StateLaborState): number {
  const rankA = getRank(a) ?? Number.MAX_SAFE_INTEGER;
  const rankB = getRank(b) ?? Number.MAX_SAFE_INTEGER;
  if (rankA !== rankB) return rankA - rankB;
  return a.stateName.localeCompare(b.stateName);
}

function getWindowMonths(
  data: StateLaborData,
  summary: WarnPressureSummary,
  topState: StateLaborState | undefined,
): string[] {
  return (
    data.windowMonths ??
    summary.warnWindowMonths ??
    (summary.warnWindowStart && summary.warnWindowEnd
      ? [summary.warnWindowStart, summary.warnWindowEnd]
      : undefined) ??
    topState?.warnWindow?.months ??
    []
  );
}

function getCoverageReason(state: StateLaborState, fallback: string): string {
  return (
    state.warnCoverage?.exclusionReason ??
    state.rankIneligibleReason ??
    state.warnCoverage?.notes ??
    state.warnCoverage?.error ??
    fallback
  );
}

export default function WarnPressureView() {
  const t = useT("labor");

  const data = useMemo(() => (getStateLaborData() ?? {}) as StateLaborData, []);
  const source = useMemo(() => (getStateLaborSource() ?? {}) as StateLaborSource, []);
  const summary = useMemo(
    () => (getWarnPressureSummary() ?? {}) as WarnPressureSummary,
    [],
  );
  const allStates = useMemo(
    () => (getWarnPressureStates() ?? []) as StateLaborState[],
    [],
  );
  const topStates = useMemo(
    () => (getWarnPressureTopStates(10) ?? []) as StateLaborState[],
    [],
  );
  const qcewData = useMemo(() => (getStateQcewData() ?? {}) as StateQcewData, []);
  const qcewSource = useMemo(() => (getStateQcewSource() ?? {}) as StateQcewSource, []);
  const qcewSummary = useMemo(
    () => (getQcewBaselineSummary() ?? {}) as QcewBaselineSummary,
    [],
  );
  const qcewAllStates = useMemo(
    () => (getQcewBaselineStates() ?? []) as QcewBaselineState[],
    [],
  );
  const qcewTopStates = useMemo(
    () => (getQcewBaselineTopStates(10) ?? []) as QcewBaselineState[],
    [],
  );

  const rankedStates = useMemo(
    () => allStates.filter(isRankEligible).sort(compareRankedStates),
    [allStates],
  );

  const notRankedStates = useMemo(
    () =>
      allStates
        .filter((state) => !isRankEligible(state))
        .sort((a, b) => {
          const groupDiff =
            COVERAGE_GROUPS.indexOf(getCoverageGroup(a)) -
            COVERAGE_GROUPS.indexOf(getCoverageGroup(b));
          return groupDiff || a.stateName.localeCompare(b.stateName);
        }),
    [allStates],
  );

  const coverageCounts = useMemo(
    () =>
      COVERAGE_GROUPS.map((group) => ({
        group,
        count: allStates.filter((state) => getCoverageGroup(state) === group).length,
      })),
    [allStates],
  );
  const laborStateByCode = useMemo(
    () => new Map(allStates.map((state) => [state.state, state])),
    [allStates],
  );
  const qcewBaselineStates = useMemo(() => {
    const states = qcewTopStates.length > 0 ? qcewTopStates : qcewAllStates;
    return [...states].sort(compareQcewBaselineStates).slice(0, 10);
  }, [qcewAllStates, qcewTopStates]);
  const maxQcewRate = useMemo(
    () =>
      qcewBaselineStates.reduce(
        (max, state) => Math.max(max, getQcewWarnRatePer10k(state) ?? 0),
        0,
      ),
    [qcewBaselineStates],
  );

  const topState = topStates[0] ?? rankedStates[0];
  const mergedSummary = { ...(data.summary ?? {}), ...summary };
  const totalStates =
    mergedSummary.states ?? mergedSummary.totalStates ?? mergedSummary.totalJurisdictions ?? allStates.length;
  const rankedCount =
    mergedSummary.rankEligibleStates ?? mergedSummary.rankedStates ?? rankedStates.length;
  const excludedCount =
    mergedSummary.excludedStates ?? Math.max(totalStates - rankedCount, notRankedStates.length);
  const totalWarnEmployees =
    mergedSummary.totalWarnEmployees ?? rankedStates.reduce((sum, state) => sum + (getWarnEmployees(state) ?? 0), 0);
  const windowMonths = getWindowMonths(data, mergedSummary, topState);
  const latestBlsMonth =
    data.latestBlsMonth ?? data.analysisMonth ?? mergedSummary.latestMonth ?? getLatestMonth(topState);
  const latestWarnMonth =
    data.latestWarnMonth ?? mergedSummary.warnWindowEnd ?? windowMonths[windowMonths.length - 1] ?? null;
  const sourceName = source.name ?? data.source?.name ?? "BLS Local Area Unemployment Statistics";
  const sourcePublisher = source.publisher ?? data.source?.publisher ?? "U.S. Bureau of Labor Statistics";
  const sourceSurvey = source.survey ?? data.source?.survey ?? "LAUS";
  const sourceUrl = source.url ?? data.source?.url;
  const sourceLicense = source.license ?? data.source?.license ?? "Public Domain";
  const sourceNote = source.note ?? data.source?.note;
  const qcewSourceName =
    qcewSource.name ?? qcewData.source?.name ?? "BLS Quarterly Census of Employment and Wages";
  const qcewSourcePublisher =
    qcewSource.publisher ?? qcewData.source?.publisher ?? "U.S. Bureau of Labor Statistics";
  const qcewSourceUrl = qcewSource.url ?? qcewData.source?.url;
  const qcewSourceLicense = qcewSource.license ?? qcewData.source?.license ?? "Public Domain";
  const qcewSourceNote = qcewSource.note ?? qcewData.source?.note;
  const mergedQcewSummary = { ...(qcewData.summary ?? {}), ...qcewSummary };
  const qcewTotalStates =
    mergedQcewSummary.statesWithBaselineRate ??
    mergedQcewSummary.rankedStates ??
    mergedQcewSummary.states ??
    mergedQcewSummary.totalStates ??
    mergedQcewSummary.totalJurisdictions ??
    qcewAllStates.length;
  const qcewLatestPeriod =
    mergedQcewSummary.latestPeriod ??
    mergedQcewSummary.latestQuarter ??
    (isFiniteNumber(mergedQcewSummary.qcewYear) ? String(mergedQcewSummary.qcewYear) : undefined) ??
    qcewData.latestPeriod ??
    qcewData.latestQuarter ??
    (isFiniteNumber(qcewSource.year) ? String(qcewSource.year) : undefined) ??
    "—";

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-10">
      <div className="animate-fade-up">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-400/30">
            {t("pressureBadge")}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-gradient">
          {t("pressureHeroTitle")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-3xl">
          {t("pressureHeroSubhead")}
        </p>
        <div className="mt-4 glass bg-white/60 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 max-w-4xl">
          <p className="text-sm font-semibold text-zinc-900 dark:text-white">
            {t("pressureFormulaTitle")}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {t("pressureFormulaText")}
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">
            {t("pressureNonCausalNote")}
          </p>
        </div>
      </div>

      <section aria-labelledby="pressure-snapshot-heading">
        <div className="mb-4">
          <h2
            id="pressure-snapshot-heading"
            className="text-xl font-semibold text-zinc-900 dark:text-white"
          >
            {t("pressureSnapshotHeading")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t("pressureSnapshotDesc", {
              blsMonth: formatMonth(latestBlsMonth),
              warnMonth: formatMonth(latestWarnMonth),
            })}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label={t("pressureStatRankedStates")}
            value={String(rankedCount)}
            sub={t("pressureStatRankedStatesSub", {
              total: String(totalStates),
              excluded: String(excludedCount),
            })}
          />
          <StatCard
            label={t("pressureStatTopState")}
            value={topState?.stateName ?? "—"}
            sub={t("pressureStatTopStateSub", {
              score: formatScore(getPressureScore(topState)),
              band: topState ? t(getBandLabelKey(getPressureBand(topState))) : "—",
            })}
          />
          <StatCard
            label={t("pressureStatWarnWindow")}
            value={formatWindow(windowMonths)}
            sub={t("pressureStatWarnWindowSub", {
              employees: formatCompact(totalWarnEmployees),
            })}
          />
          <StatCard
            label={t("pressureStatLatestLaus")}
            value={formatMonth(latestBlsMonth)}
            sub={t("pressureStatLatestLausSub", {
              survey: sourceSurvey,
              publisher: sourcePublisher,
            })}
          />
        </div>
      </section>

      <section aria-labelledby="pressure-ranking-heading">
        <div className="mb-4">
          <h2
            id="pressure-ranking-heading"
            className="text-xl font-semibold text-zinc-900 dark:text-white"
          >
            {t("pressureRankingHeading")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t("pressureRankingDesc")}
          </p>
        </div>

        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          {rankedStates.length === 0 ? (
            <div className="py-12 px-4 text-center text-zinc-500 text-sm">
              {t("pressureNoRankedStates")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[920px]">
                <caption className="sr-only">{t("pressureRankingSrLabel")}</caption>
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureTableRank")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureTableState")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureTableScore")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureTableLevel")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureTableWarnRate")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureTableWarnEmployees")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureTableUnemployment")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureTableUnemploymentDelta")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {rankedStates.map((state) => {
                    const band = getPressureBand(state);
                    const score = getPressureScore(state);
                    return (
                      <tr
                        key={state.state}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white tabular-nums">
                          #{getRank(state) ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-900 dark:text-white">
                            {state.stateName}
                          </div>
                          <div className="text-xs text-zinc-500">{state.state}</div>
                        </td>
                        <td className="px-4 py-3 min-w-36">
                          <div className="flex items-center gap-3">
                            <span className="font-semibold tabular-nums text-zinc-900 dark:text-white w-8">
                              {formatScore(score)}
                            </span>
                            <div className="h-2 flex-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden" aria-hidden="true">
                              <div
                                className="h-full bg-violet-500 rounded-full"
                                style={{ width: `${Math.max(0, Math.min(score ?? 0, 100))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${BAND_CLASSES[band]}`}>
                            {t(getBandLabelKey(band))}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatRate(getWarnRatePer10k(state))}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatNumber(getWarnEmployees(state))}
                          <span className="block text-[10px] text-zinc-500">
                            {t("pressureNoticeCount", {
                              notices: formatNumber(getWarnNotices(state)),
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatPercent(getUnemploymentRate(state))}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatPpt(getUnemploymentYoYDelta(state))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="pressure-qcew-heading">
        <div className="mb-4">
          <h2
            id="pressure-qcew-heading"
            className="text-xl font-semibold text-zinc-900 dark:text-white"
          >
            {t("pressureQcewHeading")}
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-4xl">
            {t("pressureQcewDesc", {
              states: formatNumber(qcewTotalStates),
              period: qcewLatestPeriod,
            })}
          </p>
        </div>

        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
          {qcewBaselineStates.length === 0 ? (
            <div className="py-12 px-4 text-center text-zinc-500 text-sm">
              {t("pressureQcewNoStates")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[980px]">
                <caption className="sr-only">{t("pressureQcewSrLabel")}</caption>
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60">
                    <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureQcewTableState")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureQcewTableWarnRate")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureQcewTableWarnActivity")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureQcewTableEmployment")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureQcewTableWagePay")}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {t("pressureQcewTableLausContext")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                  {qcewBaselineStates.map((qcewState, index) => {
                    const laborState = laborStateByCode.get(qcewState.state);
                    const rank = getQcewRank(qcewState) ?? index + 1;
                    const rate = getQcewWarnRatePer10k(qcewState);
                    const rateWidth =
                      maxQcewRate > 0 && rate !== null && rate > 0
                        ? `${Math.max(4, Math.min((rate / maxQcewRate) * 100, 100))}%`
                        : "0%";
                    const weeklyWage = getQcewAverageWeeklyWage(qcewState);
                    const annualPay = getQcewAverageAnnualPay(qcewState);
                    const wagePay = weeklyWage ?? annualPay;
                    const wagePayLabelKey =
                      weeklyWage !== null
                        ? "pressureQcewWeeklyWage"
                        : annualPay !== null
                          ? "pressureQcewAnnualPay"
                          : null;
                    const laborForce = getQcewContextLaborForce(qcewState, laborState);
                    const pressureScore = getQcewContextPressureScore(qcewState, laborState);
                    const pressureBand = laborState ? getPressureBand(laborState) : "not-ranked";

                    return (
                      <tr
                        key={qcewState.state}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-xs font-semibold text-violet-600 dark:text-violet-400">
                              {rank}
                            </span>
                            <div>
                              <div className="font-medium text-zinc-900 dark:text-white">
                                {getQcewStateName(qcewState)}
                              </div>
                              <div className="text-xs text-zinc-500">{qcewState.state}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          <div className="flex items-center justify-end gap-3">
                            <div className="h-2 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden" aria-hidden="true">
                              <div
                                className="h-full bg-violet-500 rounded-full"
                                style={{ width: rateWidth }}
                              />
                            </div>
                            <span className="min-w-12 font-semibold text-zinc-900 dark:text-white">
                              {formatRate(rate)}
                            </span>
                          </div>
                          <span className="block text-[10px] text-zinc-500">
                            {t("pressureQcewWarnRateUnit")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatNumber(getQcewWarnEmployees(qcewState))}
                          <span className="block text-[10px] text-zinc-500">
                            {t("pressureNoticeCount", {
                              notices: formatNumber(getQcewWarnNotices(qcewState)),
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatNumber(getQcewPrivateEmployment(qcewState))}
                          <span className="block text-[10px] text-zinc-500">
                            {t("pressureQcewEmploymentSub")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-zinc-700 dark:text-zinc-300">
                          {formatCurrency(wagePay)}
                          {wagePayLabelKey && (
                            <span className="block text-[10px] text-zinc-500">
                              {t(wagePayLabelKey)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            {laborForce !== null && (
                              <span className="inline-flex items-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-white/70 dark:bg-zinc-950/40 px-2 py-1 text-[10px] font-semibold text-zinc-600 dark:text-zinc-300">
                                {t("pressureQcewLausLaborForceChip", {
                                  laborForce: formatCompact(laborForce),
                                })}
                              </span>
                            )}
                            {pressureScore !== null && (
                              <span className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-semibold ${BAND_CLASSES[pressureBand]}`}>
                                {t("pressureQcewPressureScoreChip", {
                                  score: formatScore(pressureScore),
                                })}
                              </span>
                            )}
                            {laborForce === null && pressureScore === null && (
                              <span className="text-zinc-500">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-zinc-200 dark:border-zinc-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-zinc-500 dark:text-zinc-500">
              {t("pressureQcewSourceLine", {
                source: qcewSourceName,
                publisher: qcewSourcePublisher,
                license: qcewSourceLicense,
              })}
              {qcewSourceNote ? ` ${qcewSourceNote}` : ""}
            </p>
            {qcewSourceUrl && (
              <a
                href={qcewSourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline"
              >
                {t("pressureQcewSourceLink")}
              </a>
            )}
          </div>
        </div>
      </section>

      <section
        aria-labelledby="pressure-coverage-heading"
        className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6"
      >
        <div>
          <div className="mb-4">
            <h2
              id="pressure-coverage-heading"
              className="text-xl font-semibold text-zinc-900 dark:text-white"
            >
              {t("pressureCoverageHeading")}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t("pressureCoverageDesc")}
            </p>
          </div>
          <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {coverageCounts.map(({ group, count }) => (
                <div
                  key={group}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/30 p-3"
                >
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                    {count}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t(getCoverageLabelKey(group))}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-4">
              {t("pressureCoverageNote")}
            </p>
          </div>
        </div>

        <div className="glass bg-white/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            {t("pressureNotRankedHeading")}
          </h3>
          {notRankedStates.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {t("pressureNoExcludedStates")}
            </p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {notRankedStates.map((state) => {
                const group = getCoverageGroup(state);
                return (
                  <li
                    key={state.state}
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/30 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-white">
                          {state.stateName}
                        </p>
                        <p className="text-xs text-zinc-500">{state.state}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${BAND_CLASSES["not-ranked"]}`}>
                        {t(getCoverageLabelKey(group))}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                      {getCoverageReason(state, t("pressureDefaultExclusion"))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <section aria-labelledby="pressure-method-heading">
        <div className="glass bg-white/70 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 space-y-4">
          <h2
            id="pressure-method-heading"
            className="text-base font-semibold text-zinc-900 dark:text-white"
          >
            {t("pressureMethodHeading")}
          </h2>
          <div className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            <p>{t("pressureMethodText")}</p>
            <p>{t("pressureMethodFormula")}</p>
            <p>{t("pressureMethodCaveats")}</p>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            {t("pressureSourceLine", {
              source: sourceName,
              publisher: sourcePublisher,
              license: sourceLicense,
            })}
            {sourceNote ? ` ${sourceNote}` : ""}
          </p>
          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-violet-600 dark:text-violet-400 hover:underline"
            >
              {t("pressureSourceLink")}
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
