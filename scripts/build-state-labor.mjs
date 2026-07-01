#!/usr/bin/env node
/**
 * build-state-labor.mjs
 * Builds the WARN Pressure Index snapshot for the /labor tab by combining
 * BLS LAUS state labor-force context with current machine-readable WARN data.
 * Run: node scripts/build-state-labor.mjs (or: npm run build:state-labor)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
nextEnv.loadEnvConfig(ROOT);

const DATA_DIR = path.join(ROOT, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const WARN_PATH = path.join(DATA_DIR, "warn-notices.json");
const OUT_PATH = path.join(DATA_DIR, "state-labor.json");
const BLS_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const BLS_API_KEY = process.env.BLS_API_KEY?.trim();
const END_YEAR = Number(process.env.STATE_LABOR_END_YEAR ?? new Date().getUTCFullYear());
const START_YEAR = Number(process.env.STATE_LABOR_START_YEAR ?? END_YEAR - 2);
const WARN_WINDOW_MONTHS = 12;

const MEASURES = {
  unemploymentRate: "3",
  unemployed: "4",
  employment: "5",
  laborForce: "6",
};

const STATES = [
  { state: "AL", stateName: "Alabama", fips: "01" },
  { state: "AK", stateName: "Alaska", fips: "02" },
  { state: "AZ", stateName: "Arizona", fips: "04" },
  { state: "AR", stateName: "Arkansas", fips: "05" },
  { state: "CA", stateName: "California", fips: "06" },
  { state: "CO", stateName: "Colorado", fips: "08" },
  { state: "CT", stateName: "Connecticut", fips: "09" },
  { state: "DE", stateName: "Delaware", fips: "10" },
  { state: "DC", stateName: "District of Columbia", fips: "11" },
  { state: "FL", stateName: "Florida", fips: "12" },
  { state: "GA", stateName: "Georgia", fips: "13" },
  { state: "HI", stateName: "Hawaii", fips: "15" },
  { state: "ID", stateName: "Idaho", fips: "16" },
  { state: "IL", stateName: "Illinois", fips: "17" },
  { state: "IN", stateName: "Indiana", fips: "18" },
  { state: "IA", stateName: "Iowa", fips: "19" },
  { state: "KS", stateName: "Kansas", fips: "20" },
  { state: "KY", stateName: "Kentucky", fips: "21" },
  { state: "LA", stateName: "Louisiana", fips: "22" },
  { state: "ME", stateName: "Maine", fips: "23" },
  { state: "MD", stateName: "Maryland", fips: "24" },
  { state: "MA", stateName: "Massachusetts", fips: "25" },
  { state: "MI", stateName: "Michigan", fips: "26" },
  { state: "MN", stateName: "Minnesota", fips: "27" },
  { state: "MS", stateName: "Mississippi", fips: "28" },
  { state: "MO", stateName: "Missouri", fips: "29" },
  { state: "MT", stateName: "Montana", fips: "30" },
  { state: "NE", stateName: "Nebraska", fips: "31" },
  { state: "NV", stateName: "Nevada", fips: "32" },
  { state: "NH", stateName: "New Hampshire", fips: "33" },
  { state: "NJ", stateName: "New Jersey", fips: "34" },
  { state: "NM", stateName: "New Mexico", fips: "35" },
  { state: "NY", stateName: "New York", fips: "36" },
  { state: "NC", stateName: "North Carolina", fips: "37" },
  { state: "ND", stateName: "North Dakota", fips: "38" },
  { state: "OH", stateName: "Ohio", fips: "39" },
  { state: "OK", stateName: "Oklahoma", fips: "40" },
  { state: "OR", stateName: "Oregon", fips: "41" },
  { state: "PA", stateName: "Pennsylvania", fips: "42" },
  { state: "RI", stateName: "Rhode Island", fips: "44" },
  { state: "SC", stateName: "South Carolina", fips: "45" },
  { state: "SD", stateName: "South Dakota", fips: "46" },
  { state: "TN", stateName: "Tennessee", fips: "47" },
  { state: "TX", stateName: "Texas", fips: "48" },
  { state: "UT", stateName: "Utah", fips: "49" },
  { state: "VT", stateName: "Vermont", fips: "50" },
  { state: "VA", stateName: "Virginia", fips: "51" },
  { state: "WA", stateName: "Washington", fips: "53" },
  { state: "WV", stateName: "West Virginia", fips: "54" },
  { state: "WI", stateName: "Wisconsin", fips: "55" },
  { state: "WY", stateName: "Wyoming", fips: "56" },
];

function lausSeriesId(fips, measureDigit) {
  return `LASST${fips}000000000000${measureDigit}`;
}

function parseBLSSeries(dataArr) {
  if (!Array.isArray(dataArr)) return [];
  return dataArr
    .filter((d) => d.period !== "M13")
    .map((d) => {
      const period = String(d.period ?? "");
      const match = period.match(/^M(\d{2})$/);
      if (!match) return null;
      const month = Number(match[1]);
      if (month < 1 || month > 12) return null;
      const rawValue = String(d.value ?? "").replace(/,/g, "").trim();
      if (!rawValue || rawValue === "-") return null;
      const value = Number(rawValue);
      if (!Number.isFinite(value)) return null;
      return { date: `${d.year}-${String(month).padStart(2, "0")}`, value };
    })
    .filter(Boolean)
    .sort(compareDatePoints);
}

function compareDatePoints(a, b) {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
}

async function blsPost(seriesIds, startYear, endYear, attempt = 1, maxAttempts = 3) {
  const body = {
    seriesid: seriesIds,
    startyear: String(startYear),
    endyear: String(endYear),
  };
  if (BLS_API_KEY) body.registrationkey = BLS_API_KEY;

  try {
    const res = await fetch(BLS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const json = await res.json();
    if (json.status !== "REQUEST_SUCCEEDED") {
      const message = Array.isArray(json.message) ? json.message.join("; ") : String(json.message ?? "");
      throw new Error(`BLS API: ${json.status}${message ? ` — ${message}` : ""}`);
    }
    const series = Array.isArray(json.Results?.series) ? json.Results.series : [];
    const message = Array.isArray(json.message) ? json.message.join("; ") : String(json.message ?? "");
    if (/database is locked/i.test(message) && !series.some((item) => Array.isArray(item.data) && item.data.length > 0)) {
      throw new Error(`BLS API: ${message}`);
    }
    return series;
  } catch (err) {
    if (attempt < maxAttempts) {
      const delay = attempt * 2000;
      console.warn(`  Attempt ${attempt} failed (${err.message}). Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return blsPost(seriesIds, startYear, endYear, attempt + 1, maxAttempts);
    }
    throw err;
  }
}

async function fetchAll(seriesIds, startYear, endYear) {
  const result = Object.fromEntries(seriesIds.map((id) => [id, []]));
  const batchSize = BLS_API_KEY ? 50 : 25;
  const maxYearsPerRequest = BLS_API_KEY ? 20 : 10;

  for (let sy = startYear; sy <= endYear; sy += maxYearsPerRequest) {
    const ey = Math.min(sy + maxYearsPerRequest - 1, endYear);
    for (let i = 0; i < seriesIds.length; i += batchSize) {
      const batch = seriesIds.slice(i, i + batchSize);
      console.log(`  POST ${batch.length} LAUS series, years ${sy}–${ey}`);
      const series = await blsPost(batch, sy, ey);
      for (const s of series) {
        if (Object.prototype.hasOwnProperty.call(result, s.seriesID)) {
          result[s.seriesID].push(...parseBLSSeries(s.data));
        }
      }
    }
  }

  for (const id of seriesIds) {
    const byDate = new Map();
    for (const point of result[id]) byDate.set(point.date, point);
    result[id] = [...byDate.values()].sort(compareDatePoints);
  }

  return result;
}

function loadWarnData() {
  return JSON.parse(readFileSync(WARN_PATH, "utf8"));
}

function noticeDate(notice) {
  return normalizeISODate(notice.noticeDate) ?? normalizeISODate(notice.effectiveDate);
}

function normalizeISODate(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function maxString(values) {
  const filtered = values.filter(Boolean).sort();
  return filtered.at(-1) ?? null;
}

function monthEndDate(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber, 0));
  return formatDate(date);
}

function addMonths(dateString, months) {
  const date = parseUTCDate(dateString);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate()));
}

function parseUTCDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

function monthKey(dateString) {
  return dateString.slice(0, 7);
}

function buildMonthKeys(startDate, endDate) {
  const keys = [];
  const start = parseUTCDate(`${monthKey(startDate)}-01`);
  const end = parseUTCDate(`${monthKey(endDate)}-01`);
  for (
    let cursor = start;
    cursor <= end;
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
  ) {
    keys.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

function latestPoint(series) {
  return series.at(-1) ?? null;
}

function pointForDate(series, date) {
  return series.find((point) => point.date === date) ?? null;
}

function computeYoYDelta(unemploymentRateSeries) {
  const latest = latestPoint(unemploymentRateSeries);
  if (!latest || unemploymentRateSeries.length < 2) return null;
  const [latestYear, latestMonth] = latest.date.split("-").map(Number);
  const targetDate = `${latestYear - 1}-${String(latestMonth).padStart(2, "0")}`;
  const sameMonth = pointForDate(unemploymentRateSeries, targetDate);
  const prior = sameMonth ?? unemploymentRateSeries.find((point) => point.date < latest.date);
  if (!prior) return null;
  return round(latest.value - prior.value, 2);
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function pressureLevel(score) {
  if (score == null) return "Not ranked";
  if (score >= 75) return "High";
  if (score >= 50) return "Elevated";
  if (score >= 25) return "Moderate";
  return "Low";
}

function isCurrentMachineReadableWarnCoverage(coverageStatus) {
  return (
    coverageStatus === "live" ||
    coverageStatus === "machine-readable" ||
    coverageStatus === "current-machine-readable"
  );
}

function coverageDateRangeOverlapsWindow(dateRange, windowStart, windowEnd) {
  if (!dateRange || typeof dateRange !== "object") return false;
  const earliest = normalizeISODate(dateRange.earliest);
  const latest = normalizeISODate(dateRange.latest);
  const rangeStart = earliest ?? latest;
  const rangeEnd = latest ?? earliest;
  return Boolean(rangeStart && rangeEnd && rangeStart <= windowEnd && rangeEnd >= windowStart);
}

function rankIneligibleReason(coverageStatus, latestLaborForce, hasWarnWindowOverlap) {
  if (!isCurrentMachineReadableWarnCoverage(coverageStatus)) return "WARN source is not currently machine-readable";
  if (!latestLaborForce) return "Latest LAUS labor force is unavailable";
  if (!hasWarnWindowOverlap) return "WARN feed has no notices in the current 12-month window";
  return null;
}

function buildPercentile(values) {
  const unique = [...new Set(values.filter(Number.isFinite).sort((a, b) => a - b))];
  if (unique.length <= 1) return () => 0;
  return (value) => {
    const index = unique.findIndex((item) => item === value);
    if (index === -1) return 0;
    return (index / (unique.length - 1)) * 100;
  };
}

function aggregateWarn(notices, windowStart, windowEnd) {
  const totals = new Map(STATES.map((s) => [s.state, { notices: 0, employees: 0 }]));
  const monthly = new Map(STATES.map((s) => [s.state, new Map()]));

  for (const notice of notices) {
    const state = notice.state;
    if (!totals.has(state)) continue;
    const date = noticeDate(notice);
    if (!date || date < windowStart || date > windowEnd) continue;
    const employees = Number(notice.employees);
    if (!Number.isFinite(employees) || employees <= 0) continue;

    const total = totals.get(state);
    total.notices += 1;
    total.employees += Math.round(employees);

    const month = monthKey(date);
    const stateMonthly = monthly.get(state);
    const bucket = stateMonthly.get(month) ?? { date: month, notices: 0, employees: 0 };
    bucket.notices += 1;
    bucket.employees += Math.round(employees);
    stateMonthly.set(month, bucket);
  }

  return { totals, monthly };
}

function countWarnNoticesInWindow(notices, windowStart, windowEnd) {
  const counts = new Map(STATES.map((s) => [s.state, 0]));
  for (const notice of notices) {
    const state = notice.state;
    if (!counts.has(state)) continue;
    const date = noticeDate(notice);
    if (!date || date < windowStart || date > windowEnd) continue;
    counts.set(state, counts.get(state) + 1);
  }
  return counts;
}

function seriesForState(seriesById, fips) {
  return {
    unemploymentRate: seriesById[lausSeriesId(fips, MEASURES.unemploymentRate)] ?? [],
    unemployed: seriesById[lausSeriesId(fips, MEASURES.unemployed)] ?? [],
    employment: seriesById[lausSeriesId(fips, MEASURES.employment)] ?? [],
    laborForce: seriesById[lausSeriesId(fips, MEASURES.laborForce)] ?? [],
  };
}

function buildWarnMonthlySeries(monthKeys, stateMonthly, laborForceSeries) {
  return monthKeys.map((date) => {
    const bucket = stateMonthly.get(date) ?? { notices: 0, employees: 0 };
    const laborForce = pointForDate(laborForceSeries, date)?.value ?? latestPoint(laborForceSeries)?.value ?? null;
    return {
      date,
      notices: bucket.notices,
      employees: bucket.employees,
      employeesPer10kLaborForce:
        laborForce && laborForce > 0 ? round((bucket.employees / laborForce) * 10000, 2) : null,
    };
  });
}

function hasAnySeriesData(seriesById) {
  return Object.values(seriesById).some((series) => Array.isArray(series) && series.length > 0);
}

function normalizeCachedLausSeries(series) {
  if (!Array.isArray(series)) return [];
  return series
    .map((point) => {
      const date = typeof point?.date === "string" ? point.date : null;
      const value = Number(point?.value);
      if (!date || !Number.isFinite(value)) return null;
      return { date, value };
    })
    .filter(Boolean)
    .sort(compareDatePoints);
}

function loadCachedLausData(seriesIds) {
  if (!existsSync(OUT_PATH)) return null;

  try {
    const cached = JSON.parse(readFileSync(OUT_PATH, "utf8"));
    const cachedRows = Array.isArray(cached.states) ? cached.states : [];
    const cachedStates = new Map(cachedRows.map((state) => [state.state, state]));
    const seriesById = Object.fromEntries(seriesIds.map((id) => [id, []]));
    const years = [];

    for (const stateInfo of STATES) {
      const cachedState = cachedStates.get(stateInfo.state);
      for (const [measureName, measureDigit] of Object.entries(MEASURES)) {
        const id = lausSeriesId(stateInfo.fips, measureDigit);
        const series = normalizeCachedLausSeries(cachedState?.series?.[measureName]);
        seriesById[id] = series;
        for (const point of series) years.push(Number(point.date.slice(0, 4)));
      }
    }

    if (!hasAnySeriesData(seriesById)) return null;
    const validYears = years.filter(Number.isFinite);
    if (validYears.length === 0) return null;
    return {
      seriesById,
      startYear: Math.min(...validYears),
      endYear: Math.max(...validYears),
      fromCache: true,
    };
  } catch (err) {
    console.warn(`  Unable to read cached LAUS data from data/state-labor.json (${err.message}).`);
    return null;
  }
}

async function fetchLausData(seriesIds) {
  try {
    const seriesById = await fetchAll(seriesIds, START_YEAR, END_YEAR);
    if (hasAnySeriesData(seriesById)) return { seriesById, startYear: START_YEAR, endYear: END_YEAR };
    const cached = loadCachedLausData(seriesIds);
    if (cached) {
      console.warn("  BLS returned no LAUS observations; using cached LAUS series from data/state-labor.json.");
      return cached;
    }
    return { seriesById, startYear: START_YEAR, endYear: END_YEAR };
  } catch (err) {
    if (END_YEAR > START_YEAR && /year/i.test(err.message)) {
      const fallbackEndYear = END_YEAR - 1;
      const fallbackStartYear = Math.max(START_YEAR - 1, fallbackEndYear - 2);
      console.warn(
        `  BLS rejected ${START_YEAR}–${END_YEAR} (${err.message}); retrying ${fallbackStartYear}–${fallbackEndYear}`,
      );
      const seriesById = await fetchAll(seriesIds, fallbackStartYear, fallbackEndYear);
      if (hasAnySeriesData(seriesById)) {
        return {
          seriesById,
          startYear: fallbackStartYear,
          endYear: fallbackEndYear,
        };
      }
      const cached = loadCachedLausData(seriesIds);
      if (cached) {
        console.warn("  BLS fallback returned no LAUS observations; using cached LAUS series from data/state-labor.json.");
        return cached;
      }
      return {
        seriesById,
        startYear: fallbackStartYear,
        endYear: fallbackEndYear,
      };
    }
    const cached = loadCachedLausData(seriesIds);
    if (cached) {
      console.warn(`  BLS LAUS fetch failed (${err.message}); using cached LAUS series from data/state-labor.json.`);
      return cached;
    }
    throw err;
  }
}

async function main() {
  console.log("=== Building state labor WARN Pressure Index ===");
  if (BLS_API_KEY) console.log("Using BLS_API_KEY from environment.");
  else console.log("BLS_API_KEY not set; using keyless BLS API limits.");

  const warnData = loadWarnData();
  const coverageByState = new Map((warnData.coverageStates ?? []).map((item) => [item.state, item]));
  const notices = Array.isArray(warnData.notices) ? warnData.notices : [];

  const seriesIds = STATES.flatMap((state) =>
    Object.values(MEASURES).map((measureDigit) => lausSeriesId(state.fips, measureDigit)),
  );
  console.log(`Fetching ${seriesIds.length} BLS LAUS state series (${START_YEAR}–${END_YEAR})...`);
  const { seriesById, startYear, endYear, fromCache = false } = await fetchLausData(seriesIds);

  const latestMonth = maxString(
    STATES.flatMap((state) => Object.values(seriesForState(seriesById, state.fips)).map((series) => latestPoint(series)?.date)),
  );
  if (!latestMonth) throw new Error("No monthly LAUS data returned from BLS.");

  const lausWindowEnd = monthEndDate(latestMonth);
  const latestWarnNoticeDate = maxString(notices.map(noticeDate));
  const warnWindowEnd =
    latestWarnNoticeDate && latestWarnNoticeDate < lausWindowEnd ? latestWarnNoticeDate : lausWindowEnd;
  const warnWindowStartDate = addMonths(warnWindowEnd, -WARN_WINDOW_MONTHS);
  warnWindowStartDate.setUTCDate(warnWindowStartDate.getUTCDate() + 1);
  const warnWindowStart = formatDate(warnWindowStartDate);
  const warnWindowEndBasis =
    latestWarnNoticeDate && latestWarnNoticeDate < lausWindowEnd ? "warn-data-latest" : "laus-latest-month";
  const monthKeys = buildMonthKeys(warnWindowStart, warnWindowEnd);
  const warnAgg = aggregateWarn(notices, warnWindowStart, warnWindowEnd);
  const warnNoticeCountsInWindow = countWarnNoticesInWindow(notices, warnWindowStart, warnWindowEnd);

  const states = STATES.map((stateInfo) => {
    const stateSeries = seriesForState(seriesById, stateInfo.fips);
    const latestUnemploymentRate = latestPoint(stateSeries.unemploymentRate);
    const latestUnemployed = latestPoint(stateSeries.unemployed);
    const latestEmployment = latestPoint(stateSeries.employment);
    const latestLaborForce = latestPoint(stateSeries.laborForce);
    const coverage = coverageByState.get(stateInfo.state) ?? {
      state: stateInfo.state,
      stateName: stateInfo.stateName,
      sourceStatus: "unavailable",
      sourceType: "none",
      recordsIncluded: false,
      notices: 0,
      dateRange: null,
      name: `${stateInfo.stateName} WARN Notices`,
      publisher: null,
      url: null,
      notes: "No WARN coverage metadata was found in data/warn-notices.json.",
    };
    const coverageStatus = coverage.sourceStatus ?? "unavailable";
    const totals = warnAgg.totals.get(stateInfo.state) ?? { notices: 0, employees: 0 };
    const laborForce = latestLaborForce?.value ?? null;
    const warnRateRaw = laborForce && laborForce > 0 ? (totals.employees / laborForce) * 10000 : null;
    const hasWarnWindowOverlap =
      coverageDateRangeOverlapsWindow(coverage.dateRange, warnWindowStart, warnWindowEnd) ||
      (warnNoticeCountsInWindow.get(stateInfo.state) ?? 0) > 0;
    const rankEligible =
      isCurrentMachineReadableWarnCoverage(coverageStatus) && Boolean(laborForce && laborForce > 0) && hasWarnWindowOverlap;
    const ineligibleReason = rankIneligibleReason(coverageStatus, laborForce, hasWarnWindowOverlap);

    return {
      state: stateInfo.state,
      stateName: stateInfo.stateName,
      fips: stateInfo.fips,
      lausLatest: {
        date:
          latestLaborForce?.date ??
          latestUnemploymentRate?.date ??
          latestEmployment?.date ??
          latestUnemployed?.date ??
          null,
        unemploymentRate: latestUnemploymentRate?.value ?? null,
        unemployed: latestUnemployed?.value ?? null,
        employment: latestEmployment?.value ?? null,
        laborForce,
      },
      unemploymentRateYoYDelta: computeYoYDelta(stateSeries.unemploymentRate),
      warnCoverageStatus: coverageStatus,
      warnCoverage: {
        sourceStatus: coverageStatus,
        sourceType: coverage.sourceType ?? null,
        recordsIncluded: Boolean(coverage.recordsIncluded),
        notices: coverage.notices ?? 0,
        dateRange: coverage.dateRange ?? null,
        buildStatus: coverage.buildStatus ?? null,
        adapter: coverage.adapter ?? null,
        name: coverage.name ?? null,
        publisher: coverage.publisher ?? null,
        url: coverage.url ?? null,
        notes: coverage.notes ?? null,
        error: coverage.error ?? null,
      },
      rankEligible,
      rankStatus: rankEligible ? "ranked" : "not-ranked",
      rankIneligibleReason: ineligibleReason,
      rank: null,
      pressureScore: null,
      pressureLevel: "Not ranked",
      pressurePercentiles: {
        warnEmployeesPer10kLaborForce: null,
        unemploymentRateYoYDelta: null,
      },
      warnEmployees12m: totals.employees,
      warnNotices12m: totals.notices,
      warnEmployeesPer10kLaborForce: round(warnRateRaw, 2),
      series: {
        ...stateSeries,
        warn: buildWarnMonthlySeries(
          monthKeys,
          warnAgg.monthly.get(stateInfo.state) ?? new Map(),
          stateSeries.laborForce,
        ),
      },
      _warnRateRaw: warnRateRaw ?? 0,
    };
  });

  const eligible = states.filter((state) => state.rankEligible);
  const warnPercentile = buildPercentile(eligible.map((state) => state._warnRateRaw));
  const yoyPercentile = buildPercentile(
    eligible
      .map((state) => state.unemploymentRateYoYDelta)
      .filter((value) => value != null),
  );

  for (const state of eligible) {
    const warnPct = warnPercentile(state._warnRateRaw);
    const yoyPct = state.unemploymentRateYoYDelta == null ? 0 : yoyPercentile(state.unemploymentRateYoYDelta);
    const score = Math.round(0.7 * warnPct + 0.3 * yoyPct);
    state.pressurePercentiles = {
      warnEmployeesPer10kLaborForce: round(warnPct, 2),
      unemploymentRateYoYDelta: state.unemploymentRateYoYDelta == null ? null : round(yoyPct, 2),
    };
    state.pressureScore = score;
    state.pressureLevel = pressureLevel(score);
  }

  eligible
    .sort(
      (a, b) =>
        b.pressureScore - a.pressureScore ||
        b._warnRateRaw - a._warnRateRaw ||
        b.warnEmployees12m - a.warnEmployees12m ||
        a.stateName.localeCompare(b.stateName),
    )
    .forEach((state, index) => {
      state.rank = index + 1;
    });

  const highestPressureState = eligible.find((state) => state.rank === 1)?.state ?? null;
  for (const state of states) delete state._warnRateRaw;

  const warnWindowNote =
    warnWindowEndBasis === "warn-data-latest"
      ? `WARN latest notice date (${latestWarnNoticeDate}) is earlier than the latest LAUS month end (${lausWindowEnd}), so the 12-month WARN window ends at the WARN latest date.`
      : `The 12-month WARN window ends at the latest LAUS month end (${lausWindowEnd}); later WARN notices, if any, are excluded until LAUS context catches up.`;

  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      name: "BLS Local Area Unemployment Statistics",
      publisher: "U.S. Bureau of Labor Statistics",
      url: "https://www.bls.gov/lau/",
      license: "Public Domain",
      note: fromCache
        ? `Monthly LAUS state series reused from cached data/state-labor.json for ${startYear}–${endYear} because the BLS public API returned no current observations. Series IDs use LASST{state FIPS}000000000000{measure}, where 03=unemployment rate, 04=unemployed, 05=employment, and 06=labor force.`
        : `Monthly LAUS state series fetched from BLS public API v2 for ${startYear}–${endYear}. Series IDs use LASST{state FIPS}000000000000{measure}, where 03=unemployment rate, 04=unemployed, 05=employment, and 06=labor force.`,
    },
    methodology: {
      warnWindowMonths: WARN_WINDOW_MONTHS,
      scoreFormula:
        "round(0.70 * WARN employees per 10k labor force percentile + 0.30 * unemployment YoY delta percentile)",
      rankingNote:
        "Ranks only states whose WARN coverage sourceStatus is live/current machine-readable, whose latest LAUS labor force is available, and whose WARN coverage or notices overlap the current 12-month WARN window. Manual-only, unavailable, and stale historical WARN feeds remain in metadata but are not ranked. Higher WARN rates and higher unemployment-rate YoY deltas increase pressure score; null YoY deltas score as 0 for that component. This is a descriptive pressure/association ranking; it does not establish causality between WARN notices and broader labor-market indicators.",
      warnWindowEndBasis,
      warnWindowNote,
    },
    summary: {
      latestMonth,
      rankedStates: eligible.length,
      totalJurisdictions: STATES.length,
      warnWindowStart,
      warnWindowEnd,
      highestPressureState,
    },
    states,
  };

  const jsonStr = JSON.stringify(output, null, 2) + "\n";
  writeFileSync(OUT_PATH, jsonStr);

  console.log("\n✅  Written data/state-labor.json");
  console.log(`   latest LAUS month     : ${latestMonth}`);
  console.log(`   WARN window           : ${warnWindowStart} → ${warnWindowEnd}`);
  console.log(`   ranked states         : ${eligible.length}/${STATES.length}`);
  console.log(`   highest index score state: ${highestPressureState ?? "n/a"}`);
  console.log(`   file size             : ${(jsonStr.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
