#!/usr/bin/env node
/**
 * build-state-qcew.mjs
 * Builds the /labor WARN Pressure "Employment & Wage Baseline" snapshot from
 * BLS QCEW annual state area CSVs and the existing state-labor WARN context.
 * Run: node scripts/build-state-qcew.mjs (or: npm run build:state-qcew)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { validateStateQcew } from "./lib/validate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const STATE_LABOR_PATH = path.join(DATA_DIR, "state-labor.json");
const OUT_PATH = path.join(DATA_DIR, "state-qcew.json");
const DEFAULT_CANDIDATE_YEARS = [2025, 2024, 2023];
const CANDIDATE_YEARS = parseCandidateYears(process.env.STATE_QCEW_YEARS) ?? DEFAULT_CANDIDATE_YEARS;
const REQUEST_CONCURRENCY = Number(process.env.STATE_QCEW_CONCURRENCY ?? 6);
const ENDPOINT_PATTERN = "https://data.bls.gov/cew/data/api/{year}/a/area/{stateFips}000.csv";
const WARN_WINDOW_MONTHS = 12;

const OWNERSHIP = {
  private: { code: "5", label: "Private" },
  all: { code: "0", label: "Total covered (all ownerships)" },
};

const INDUSTRY = { code: "10", label: "All industries" };

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

function parseCandidateYears(value) {
  if (!value) return null;
  const years = value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((year) => Number.isInteger(year) && year >= 1990);
  return years.length > 0 ? years : null;
}

function endpointUrl(year, stateFips) {
  return ENDPOINT_PATTERN.replace("{year}", String(year)).replace("{stateFips}", stateFips);
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function parseNumber(value) {
  if (value == null) return null;
  const text = String(value).replace(/,/g, "").trim();
  if (!text || text === "-" || /^n\/?a$/i.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function parseInteger(value) {
  const number = parseNumber(value);
  return number == null ? null : Math.round(number);
}

function splitCsvLine(line) {
  const fields = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === "\"") {
        if (line[i + 1] === "\"") {
          field += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      fields.push(field);
      field = "";
    } else {
      field += char;
    }
  }

  fields.push(field);
  return fields;
}

function rowFromCsvLine(headers, line) {
  const values = splitCsvLine(line);
  const row = {};
  headers.forEach((header, index) => {
    row[header] = values[index] ?? "";
  });
  return row;
}

function columnValue(row, names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name)) {
      const value = parseNumber(row[name]);
      if (value != null) return { value, source: name };
    }
  }
  return { value: null, source: null };
}

function monthEmploymentColumns(row) {
  return Object.keys(row)
    .map((name) => {
      const match = name.match(/^(?:month|m)(0?[1-9]|1[0-2])_emplvl$/i);
      return match ? { name, month: Number(match[1]) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.month - b.month)
    .map((item) => item.name);
}

function annualAverageEmployment(row) {
  const annual = columnValue(row, ["annual_avg_emplvl"]);
  if (annual.value != null) {
    return {
      value: Math.round(annual.value),
      source: annual.source,
      derived: false,
    };
  }

  const monthlyValues = monthEmploymentColumns(row)
    .map((name) => parseNumber(row[name]))
    .filter((value) => value != null);
  if (monthlyValues.length === 0) return { value: null, source: null, derived: false };

  const average = monthlyValues.reduce((sum, value) => sum + value, 0) / monthlyValues.length;
  return {
    value: Math.round(average),
    source: "monthly_emplvl_average",
    derived: true,
  };
}

function wageFields(row) {
  const weekly = columnValue(row, ["avg_wkly_wage", "annual_avg_wkly_wage"]);
  const annual = columnValue(row, ["avg_annual_pay"]);
  let averageWeeklyWage = weekly.value == null ? null : Math.round(weekly.value);
  let averageWeeklyWageSource = weekly.source;
  let averageAnnualPay = annual.value == null ? null : Math.round(annual.value);
  let averageAnnualPaySource = annual.source;

  if (averageWeeklyWage == null && averageAnnualPay != null) {
    averageWeeklyWage = Math.round(averageAnnualPay / 52);
    averageWeeklyWageSource = "derived_avg_annual_pay_div_52";
  }
  if (averageAnnualPay == null && averageWeeklyWage != null) {
    averageAnnualPay = Math.round(averageWeeklyWage * 52);
    averageAnnualPaySource = "derived_average_weekly_wage_times_52";
  }

  return {
    averageAnnualPay,
    averageAnnualPaySource,
    averageWeeklyWage,
    averageWeeklyWageSource,
  };
}

function buildSelection(row, usedAllOwnershipFallback) {
  if (!row) return null;

  const employment = annualAverageEmployment(row);
  const wages = wageFields(row);
  const ownCode = String(row.own_code ?? "").trim();
  const ownership = ownCode === OWNERSHIP.private.code ? OWNERSHIP.private : OWNERSHIP.all;
  const notes = [];

  if (usedAllOwnershipFallback) {
    notes.push(
      "Private ownership row (own_code 5) was unavailable; used total covered all ownerships (own_code 0) all-industries row as an explicit fallback.",
    );
  } else {
    notes.push("Uses QCEW private ownership (own_code 5), all industries (industry_code 10).");
  }
  if (employment.derived) {
    notes.push("annual_avg_emplvl was unavailable; annual average employment was derived from monthly employment fields.");
  }
  if (employment.value == null) notes.push("QCEW annual average employment is unavailable for the selected row.");
  if (wages.averageAnnualPay == null) notes.push("QCEW average annual pay is unavailable for the selected row.");
  if (wages.averageWeeklyWage == null) notes.push("QCEW average weekly wage is unavailable for the selected row.");
  if (String(row.disclosure_code ?? "").trim()) {
    notes.push(`QCEW row has disclosure_code "${String(row.disclosure_code).trim()}".`);
  }

  return {
    qcewYear: parseInteger(row.year),
    ownership,
    industry: INDUSTRY,
    annualAverageEmployment: employment.value,
    averageAnnualPay: wages.averageAnnualPay,
    averageWeeklyWage: wages.averageWeeklyWage,
    sourceRow: {
      areaFips: String(row.area_fips ?? "").trim() || null,
      ownCode: ownCode || null,
      industryCode: String(row.industry_code ?? "").trim() || null,
      aggregationLevelCode: String(row.agglvl_code ?? "").trim() || null,
      sizeCode: String(row.size_code ?? "").trim() || null,
      year: parseInteger(row.year),
      quarter: String(row.qtr ?? "").trim() || null,
      disclosureCode: String(row.disclosure_code ?? "").trim() || null,
      annualAverageEstablishments: parseInteger(row.annual_avg_estabs),
      totalAnnualWages: parseInteger(row.total_annual_wages),
      annualAverageEmploymentSource: employment.source,
      averageAnnualPaySource: wages.averageAnnualPaySource,
      averageWeeklyWageSource: wages.averageWeeklyWageSource,
      usedAllOwnershipFallback,
      derivedAnnualAverageEmployment: employment.derived,
    },
    dataQualityNotes: notes,
  };
}

function parseQcewCsv(text, stateInfo, year) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) throw new Error("QCEW CSV did not include data rows.");

  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  if (!headers.includes("area_fips") || !headers.includes("own_code") || !headers.includes("industry_code")) {
    throw new Error(`Unexpected QCEW CSV columns: ${headers.slice(0, 8).join(", ")}`);
  }

  const areaFips = `${stateInfo.fips}000`;
  let privateRow = null;
  let allOwnershipRow = null;
  let allIndustriesRows = 0;

  for (const line of lines.slice(1)) {
    const row = rowFromCsvLine(headers, line);
    const isStateArea = String(row.area_fips ?? "").trim() === areaFips;
    const isAnnual = String(row.qtr ?? "").trim() === "A";
    const isAllIndustries = String(row.industry_code ?? "").trim() === INDUSTRY.code;
    if (!isStateArea || !isAnnual || !isAllIndustries) continue;

    allIndustriesRows += 1;
    const ownCode = String(row.own_code ?? "").trim();
    if (ownCode === OWNERSHIP.private.code) privateRow = row;
    if (ownCode === OWNERSHIP.all.code) allOwnershipRow = row;
  }

  const selectedRow = privateRow ?? allOwnershipRow;
  const selection = buildSelection(selectedRow, !privateRow && Boolean(allOwnershipRow));

  return {
    year,
    headers,
    allIndustriesRows,
    selection,
  };
}

async function fetchTextWithRetry(url, attempt = 1, maxAttempts = 3) {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "text/csv,text/plain,*/*",
        "User-Agent": "FutureGrid QCEW baseline builder",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);

    const text = await res.text();
    if (!/"area_fips"/.test(text) && !/^area_fips,/.test(text)) {
      throw new Error("Response did not look like a QCEW area CSV.");
    }
    return text;
  } catch (err) {
    if (attempt < maxAttempts) {
      const delay = attempt * 1500;
      console.warn(`  ${url} failed (${err.message}); retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchTextWithRetry(url, attempt + 1, maxAttempts);
    }
    throw err;
  }
}

async function fetchStateQcew(stateInfo, year) {
  const url = endpointUrl(year, stateInfo.fips);
  try {
    const text = await fetchTextWithRetry(url);
    return {
      ...stateInfo,
      url,
      status: "ok",
      ...parseQcewCsv(text, stateInfo, year),
    };
  } catch (err) {
    return {
      ...stateInfo,
      url,
      year,
      status: "error",
      error: err.message,
      headers: [],
      allIndustriesRows: 0,
      selection: null,
    };
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

async function fetchCandidateYear(year) {
  console.log(`Fetching BLS QCEW annual area CSVs for ${year}...`);
  const results = await mapLimit(STATES, REQUEST_CONCURRENCY, (stateInfo) => fetchStateQcew(stateInfo, year));
  const statesWithEmployment = results.filter(
    (result) => result.selection?.annualAverageEmployment != null && result.selection.annualAverageEmployment > 0,
  );
  const missingStates = results
    .filter((result) => !result.selection || result.selection.annualAverageEmployment == null)
    .map((result) => result.state);

  return {
    year,
    results,
    complete: statesWithEmployment.length === STATES.length,
    statesWithEmployment: statesWithEmployment.length,
    missingStates,
  };
}

function loadStateLaborData() {
  if (!existsSync(STATE_LABOR_PATH)) throw new Error("data/state-labor.json is required before building QCEW baseline.");
  return JSON.parse(readFileSync(STATE_LABOR_PATH, "utf8"));
}

function hasUsableWarnCoverage(labor) {
  return labor?.rankEligible === true;
}

function warnCoverageQualityNote(labor) {
  const base = "WARN coverage is not rank-eligible; WARN counts/rates are unknown, not zero.";
  if (!labor) return `${base} No state-labor WARN Pressure row was found.`;

  const reason = typeof labor.rankIneligibleReason === "string" ? labor.rankIneligibleReason.trim() : "";
  if (reason) return `${base} Reason: ${reason}`;

  const status = labor.warnCoverage?.sourceStatus ?? labor.warnCoverageStatus ?? null;
  return status ? `${base} Coverage status: ${status}.` : base;
}

function selectedColumns(candidate) {
  return candidate.results.find((result) => Array.isArray(result.headers) && result.headers.length > 0)?.headers ?? [];
}

function joinStateRows(candidate, stateLaborData) {
  const laborByState = new Map((stateLaborData.states ?? []).map((state) => [state.state, state]));
  const qcewByState = new Map(candidate.results.map((result) => [result.state, result]));

  return STATES.map((stateInfo) => {
    const qcew = qcewByState.get(stateInfo.state);
    const labor = laborByState.get(stateInfo.state);
    const selection = qcew?.selection ?? null;
    const annualAverageEmployment = selection?.annualAverageEmployment ?? null;
    const usableWarnCoverage = hasUsableWarnCoverage(labor);
    const warnEmployees12m = usableWarnCoverage ? parseInteger(labor?.warnEmployees12m) : null;
    const warnNotices12m = usableWarnCoverage ? parseInteger(labor?.warnNotices12m) : null;
    const rate =
      usableWarnCoverage && annualAverageEmployment && annualAverageEmployment > 0 && warnEmployees12m != null
        ? round((warnEmployees12m / annualAverageEmployment) * 10000, 2)
        : null;
    const notes = [...(selection?.dataQualityNotes ?? [])];

    if (!selection) {
      notes.push(
        qcew?.error
          ? `QCEW fetch/parse failed for ${candidate.year}: ${qcew.error}`
          : "No QCEW state-level all-industries row was found for the selected annual CSV.",
      );
    }
    if (!usableWarnCoverage) {
      notes.push(warnCoverageQualityNote(labor));
    }

    return {
      state: stateInfo.state,
      stateName: stateInfo.stateName,
      fips: stateInfo.fips,
      qcewYear: selection?.qcewYear ?? candidate.year,
      ownership: selection?.ownership ?? null,
      industry: selection?.industry ?? INDUSTRY,
      annualAverageEmployment,
      averageAnnualPay: selection?.averageAnnualPay ?? null,
      averageWeeklyWage: selection?.averageWeeklyWage ?? null,
      warnEmployees12m,
      warnNotices12m,
      warnEmployeesPer10kQcewEmployment: rate,
      lausLaborForce: parseInteger(labor?.lausLatest?.laborForce),
      warnPressureRank: parseInteger(labor?.rank),
      warnPressureScore: parseInteger(labor?.pressureScore),
      rankEligible: Boolean(usableWarnCoverage && rate != null),
      dataQualityNotes: notes,
      sourceRow: selection?.sourceRow ?? null,
    };
  });
}

function rankedBaselineStates(states) {
  return states
    .filter((state) => state.rankEligible && state.warnEmployeesPer10kQcewEmployment != null)
    .sort(
      (a, b) =>
        b.warnEmployeesPer10kQcewEmployment - a.warnEmployeesPer10kQcewEmployment ||
        a.stateName.localeCompare(b.stateName),
    );
}

async function main() {
  console.log("=== Building BLS QCEW state employment/wage baseline ===");

  const stateLaborData = loadStateLaborData();
  const attempts = [];
  let selectedCandidate = null;

  for (const year of CANDIDATE_YEARS) {
    const candidate = await fetchCandidateYear(year);
    attempts.push({
      year,
      statesWithEmployment: candidate.statesWithEmployment,
      missingStates: candidate.missingStates,
    });

    if (candidate.complete) {
      selectedCandidate = candidate;
      break;
    }

    console.warn(
      `  ${year} QCEW annual data is incomplete (${candidate.statesWithEmployment}/${STATES.length}); trying next candidate year.`,
    );
  }

  if (!selectedCandidate) {
    throw new Error(
      `No candidate QCEW year had complete state employment data. Attempts: ${attempts
        .map((attempt) => `${attempt.year}=${attempt.statesWithEmployment}/${STATES.length}`)
        .join(", ")}`,
    );
  }

  const states = joinStateRows(selectedCandidate, stateLaborData);
  const rankedStates = rankedBaselineStates(states);
  const fallbackStates = states.filter((state) => state.sourceRow?.usedAllOwnershipFallback).map((state) => state.state);
  const columns = selectedColumns(selectedCandidate);
  const highestBaselineState = rankedStates[0] ?? null;

  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      name: "BLS Quarterly Census of Employment and Wages Annual Area CSVs",
      publisher: "U.S. Bureau of Labor Statistics",
      url: "https://www.bls.gov/cew/downloadable-data-files.htm",
      endpointPattern: ENDPOINT_PATTERN,
      license: "Public Domain",
      year: selectedCandidate.year,
      yearsTried: attempts.map((attempt) => attempt.year),
      verifiedColumns: columns,
      note:
        "Fetched live BLS QCEW annual area CSVs for each state area ({stateFips}000). The selected denominator is own_code 5/private and industry_code 10/all industries; own_code 0/all ownerships is used only when the private row is unavailable and is flagged per state.",
    },
    methodology: {
      qcewSelection:
        "For each of the 50 states plus DC, select the annual ('A') state total area row ({FIPS}000) with private ownership (own_code 5) and all industries (industry_code 10). If that row is absent, use total covered all ownerships (own_code 0) only as an explicit fallback.",
      wageFields:
        "annual_avg_emplvl supplies annualAverageEmployment. avg_annual_pay supplies averageAnnualPay. avg_wkly_wage is read when present; BLS annual area CSVs currently provide annual_avg_wkly_wage, which supplies averageWeeklyWage. If annual_avg_emplvl is absent and monthly employment fields exist, employment is derived as their average and flagged.",
      warnJoin:
        "WARN employees/notices for the current 12-month WARN Pressure window are copied from data/state-labor.json only when WARN coverage is rank-eligible/current-window valid there. When WARN coverage is unavailable, unusable, stale, or otherwise not rank-eligible, WARN counts and QCEW rates are null, not zero. LAUS labor force and existing WARN Pressure rank/score are copied as context; WARN Pressure ranks are not recomputed or altered here.",
      rateFormula:
        "warnEmployeesPer10kQcewEmployment = warnEmployees12m / annualAverageEmployment * 10000, computed only for non-null usable WARN counts and positive QCEW employment.",
      denominatorNote:
        "No industry mapping is inferred. WARN employees are compared only with state-level QCEW private/all-industries employment denominators; LAUS labor force appears as comparison context.",
    },
    summary: {
      qcewYear: selectedCandidate.year,
      totalJurisdictions: STATES.length,
      statesWithQcewData: states.filter((state) => state.annualAverageEmployment != null).length,
      privateOwnershipStates: states.filter((state) => state.ownership?.code === OWNERSHIP.private.code).length,
      allOwnershipFallbackStates: fallbackStates.length,
      fallbackStates,
      statesWithBaselineRate: states.filter(
        (state) => state.rankEligible && state.warnEmployeesPer10kQcewEmployment != null,
      ).length,
      rankedStates: rankedStates.length,
      highestBaselineState: highestBaselineState?.state ?? null,
      highestBaselineRate: highestBaselineState?.warnEmployeesPer10kQcewEmployment ?? null,
      warnWindowMonths: WARN_WINDOW_MONTHS,
      warnWindowStart: stateLaborData.summary?.warnWindowStart ?? null,
      warnWindowEnd: stateLaborData.summary?.warnWindowEnd ?? null,
      stateLaborGeneratedAt: stateLaborData.generatedAt ?? null,
      candidateYearAttempts: attempts,
    },
    states,
  };

  const jsonStr = JSON.stringify(output, null, 2) + "\n";
  validateStateQcew(output);
  writeFileSync(OUT_PATH, jsonStr);

  console.log("\n✅  Written data/state-qcew.json");
  console.log(`   QCEW year             : ${selectedCandidate.year}`);
  console.log(`   states with QCEW data : ${output.summary.statesWithQcewData}/${STATES.length}`);
  console.log(`   private ownership rows: ${output.summary.privateOwnershipStates}/${STATES.length}`);
  console.log(`   ranked baseline states: ${output.summary.rankedStates}/${STATES.length}`);
  console.log(
    `   top baseline state    : ${
      highestBaselineState
        ? `${highestBaselineState.state} (${highestBaselineState.warnEmployeesPer10kQcewEmployment})`
        : "n/a"
    }`,
  );
  console.log(`   file size             : ${(jsonStr.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
