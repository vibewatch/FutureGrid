#!/usr/bin/env node
/**
 * scripts/build-ai-adoption-tracker.mjs
 *
 * Builds data/ai-adoption-tracker.json — measured U.S. AI adoption from two
 * key-free official sources:
 *
 *   1. Workers  — St. Louis Fed Real-Time Population Survey (RPS) Generative AI
 *      Adoption Tracker (Bick, Blandin & Deming), published as FRED release 6.
 *      Quarterly share of adults / employed adults using generative AI, broken
 *      out by the 22 SOC major occupation groups and 20 NAICS industries, plus
 *      time savings (% of work hours).
 *   2. Businesses — U.S. Census Bureau Business Trends and Outlook Survey (BTOS).
 *      Biweekly share of employer firms that used AI in any business function
 *      in the prior two weeks, and the share expecting to within six months;
 *      national series plus latest NAICS-sector and state cuts.
 *
 * The two surveys measure different units (people vs firms) and must never be
 * merged or averaged. If one source is temporarily unavailable, its section is
 * preserved from the last-known-good committed file; the build fails only when
 * no prior data exists.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { buildMeta } from "./lib/meta.mjs";
import { validateAIAdoptionTracker } from "./lib/validate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(ROOT, "data", "ai-adoption-tracker.json");

// FRED and census.gov reject anonymous bots; a UA carrying contact details is accepted.
const UA = "FutureGrid data pipeline contact@futuregrid.genisisiq.com";
const FRED_CSV = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=";
const BTOS_BASE = "https://www.census.gov/hfp/btos/downloads/";
const TIMEOUT_MS = 60_000;

// ─── FRED RPS series catalogue ────────────────────────────────────────────────

const HEADLINE_SERIES = {
  adoptionOverall: "RPSGENAIUSAGESHAREALL",
  adoptionWork: "RPSGENAIUSAGESHAREWORK",
  adoptionNonWork: "RPSGENAIUSAGESHARENONWORK",
  dailyUseWork: "RPSGENAIUSAGESHAREEDLWWOR",
  lastWeekUseWork: "RPSGENAIUSAGESHARELWWORK",
  timeSavingsPctOfHours: "RPSGENAITSALL",
  workHoursAssistedPct: "RPSGENAIASSISTWRKHRSALL",
};

/** FRED OCC index → SOC 2018 major group (FutureGrid sector names). */
const OCCUPATION_GROUPS = [
  [1, "11", "Management"],
  [2, "13", "Business and Financial Operations"],
  [3, "15", "Computer and Mathematical"],
  [4, "17", "Architecture and Engineering"],
  [5, "19", "Life, Physical, and Social Science"],
  [6, "21", "Community and Social Service"],
  [7, "23", "Legal"],
  [8, "25", "Educational Instruction and Library"],
  [9, "27", "Arts, Design, Entertainment, Sports, and Media"],
  [10, "29", "Healthcare Practitioners and Technical"],
  [11, "31", "Healthcare Support"],
  [12, "33", "Protective Service"],
  [13, "35", "Food Preparation and Serving Related"],
  [14, "37", "Building and Grounds Cleaning and Maintenance"],
  [15, "39", "Personal Care and Service"],
  [16, "41", "Sales and Related"],
  [17, "43", "Office and Administrative Support"],
  [18, "45", "Farming, Fishing, and Forestry"],
  [19, "47", "Construction and Extraction"],
  [20, "49", "Installation, Maintenance, and Repair"],
  [21, "51", "Production"],
  [22, "53", "Transportation and Material Moving"],
];

/** FRED IND index → NAICS 2-digit sector. */
const INDUSTRIES = [
  [1, "11", "Agriculture, Forestry, Fishing, and Hunting"],
  [2, "21", "Mining, Quarrying, and Oil and Gas Extraction"],
  [3, "23", "Construction"],
  [4, "31-33", "Manufacturing"],
  [5, "42", "Wholesale Trade"],
  [6, "44-45", "Retail Trade"],
  [7, "48-49", "Transportation and Warehousing"],
  [8, "22", "Utilities"],
  [9, "51", "Information"],
  [10, "52", "Finance and Insurance"],
  [11, "53", "Real Estate and Rental and Leasing"],
  [12, "54", "Professional, Scientific, and Technical Services"],
  [13, "55", "Management of Companies and Enterprises"],
  [14, "56", "Administrative and Support and Waste Management Services"],
  [15, "61", "Educational Services"],
  [16, "62", "Health Care and Social Assistance"],
  [17, "71", "Arts, Entertainment, and Recreation"],
  [18, "72", "Accommodation and Food Services"],
  [19, "81", "Other Services, Except Public Administration"],
  [20, "92", "Public Administration"],
];

/** BTOS sector codes → NAICS titles (BTOS groups 31-33, 44-45, 48-49 under their first code). */
const BTOS_SECTORS = {
  "11": "Agriculture, Forestry, Fishing, and Hunting",
  "21": "Mining, Quarrying, and Oil and Gas Extraction",
  "22": "Utilities",
  "23": "Construction",
  "31": "Manufacturing",
  "42": "Wholesale Trade",
  "44": "Retail Trade",
  "48": "Transportation and Warehousing",
  "51": "Information",
  "52": "Finance and Insurance",
  "53": "Real Estate and Rental and Leasing",
  "54": "Professional, Scientific, and Technical Services",
  "55": "Management of Companies and Enterprises",
  "56": "Administrative and Support and Waste Management Services",
  "61": "Educational Services",
  "62": "Health Care and Social Assistance",
  "71": "Arts, Entertainment, and Recreation",
  "72": "Accommodation and Food Services",
  "81": "Other Services, Except Public Administration",
};

const BTOS_AI_USE_QID = 7;
const BTOS_AI_NEXT6M_QID = 24;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function round(n, digits = 1) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function readExisting() {
  if (!existsSync(OUTPUT_FILE)) return null;
  try {
    return JSON.parse(readFileSync(OUTPUT_FILE, "utf8"));
  } catch {
    return null;
  }
}

/** Fetch many FRED series in one CSV request → { id: [{ date, value }] }. */
async function fetchFredSeries(ids) {
  const out = {};
  // fredgraph.csv accepts comma-separated ids; keep URLs a reasonable length.
  for (let i = 0; i < ids.length; i += 12) {
    const chunk = ids.slice(i, i + 12);
    const res = await fetchWithTimeout(FRED_CSV + chunk.join(","));
    const text = await res.text();
    const [header, ...lines] = text.trim().split(/\r?\n/);
    const cols = header.split(",");
    if (cols[0] !== "observation_date") throw new Error(`Unexpected FRED CSV header: ${header.slice(0, 80)}`);
    for (const id of cols.slice(1)) out[id] = [];
    for (const line of lines) {
      const cells = line.split(",");
      cells.slice(1).forEach((cell, j) => {
        const v = Number(cell);
        if (cell !== "" && Number.isFinite(v)) out[cols[j + 1]].push({ date: cells[0], value: round(v, 2) });
      });
    }
  }
  return out;
}

function latestAndYearAgo(series) {
  if (!series?.length) return { latest: null, yearAgo: null, latestDate: null };
  const last = series[series.length - 1];
  const target = `${Number(last.date.slice(0, 4)) - 1}${last.date.slice(4)}`;
  const prev = series.find((p) => p.date === target) ?? null;
  return { latest: last.value, yearAgo: prev?.value ?? null, latestDate: last.date };
}

// ─── Workers: FRED RPS ────────────────────────────────────────────────────────

async function buildWorkers() {
  const ids = [
    ...Object.values(HEADLINE_SERIES),
    ...OCCUPATION_GROUPS.flatMap(([i]) => [`RPSGENAIUSAGESHAREOCC${i}`, `RPSGENAITSOCC${i}`]),
    ...INDUSTRIES.flatMap(([i]) => [`RPSGENAIUSAGESHAREIND${i}`, `RPSGENAITSIND${i}`]),
  ];
  const series = await fetchFredSeries(ids);
  const missing = ids.filter((id) => !series[id]?.length);
  if (missing.length > 4) throw new Error(`FRED RPS returned no data for ${missing.length} series: ${missing.slice(0, 6).join(", ")}…`);

  const headline = Object.fromEntries(
    Object.entries(HEADLINE_SERIES).map(([key, id]) => [key, series[id] ?? []]),
  );

  const byOccupationGroup = OCCUPATION_GROUPS.map(([i, socMajor, group]) => {
    const adoption = latestAndYearAgo(series[`RPSGENAIUSAGESHAREOCC${i}`]);
    const ts = latestAndYearAgo(series[`RPSGENAITSOCC${i}`]);
    return {
      socMajor,
      group,
      adoptionWorkPct: adoption.latest,
      adoptionWorkPctYearAgo: adoption.yearAgo,
      timeSavingsPctOfHours: ts.latest,
      series: series[`RPSGENAIUSAGESHAREOCC${i}`] ?? [],
    };
  }).filter((g) => g.adoptionWorkPct !== null);

  const byIndustry = INDUSTRIES.map(([i, naics, industry]) => {
    const adoption = latestAndYearAgo(series[`RPSGENAIUSAGESHAREIND${i}`]);
    const ts = latestAndYearAgo(series[`RPSGENAITSIND${i}`]);
    return {
      naics,
      industry,
      adoptionWorkPct: adoption.latest,
      adoptionWorkPctYearAgo: adoption.yearAgo,
      timeSavingsPctOfHours: ts.latest,
    };
  }).filter((g) => g.adoptionWorkPct !== null);

  const asOf = headline.adoptionWork.at(-1)?.date ?? null;
  console.log(`  RPS: ${byOccupationGroup.length} occupation groups, ${byIndustry.length} industries, latest quarter ${asOf}`);
  return {
    asOf,
    frequency: "quarterly",
    universe: "U.S. adults ages 18–64 (adoption overall/outside work) and employed adults (work adoption)",
    headline,
    byOccupationGroup,
    byIndustry,
  };
}

// ─── Businesses: Census BTOS ──────────────────────────────────────────────────

async function loadWorkbook(name) {
  const res = await fetchWithTimeout(BTOS_BASE + name);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(await res.arrayBuffer()));
  return wb;
}

function sheetRows(wb, sheetName) {
  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`BTOS workbook missing sheet "${sheetName}"`);
  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    rows.push(row.values.slice(1).map((v) => (v && typeof v === "object" && "result" in v ? v.result : v)));
  });
  return rows;
}

function parsePct(cell) {
  if (typeof cell === "number") return cell <= 1 ? round(cell * 100) : round(cell);
  if (typeof cell !== "string") return null;
  const m = cell.trim().match(/^(-?\d+(?:\.\d+)?)%$/);
  return m ? Number(m[1]) : null;
}

/** Extract { cycle → pct } for (question, answer "Yes") from a response-estimates sheet. */
function extractYesSeries(rows, { keyCol, qidCol, aidCol, firstCycleCol }) {
  const header = rows[0].map(String);
  const cycles = header.slice(firstCycleCol);
  const out = new Map(); // key → { [qid]: { cycle: pct } }
  for (const row of rows.slice(1)) {
    const qid = Number(row[qidCol]);
    if ((qid !== BTOS_AI_USE_QID && qid !== BTOS_AI_NEXT6M_QID) || Number(row[aidCol]) !== 1) continue;
    const key = keyCol === null ? "US" : String(row[keyCol]);
    if (!out.has(key)) out.set(key, {});
    const byCycle = {};
    cycles.forEach((cycle, j) => {
      const v = parsePct(row[firstCycleCol + j]);
      if (v !== null) byCycle[cycle] = v;
    });
    out.get(key)[qid] = byCycle;
  }
  return { cycles, byKey: out };
}

function isoDate(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return null;
}

async function buildBusinesses() {
  const national = await loadWorkbook("National.xlsx");
  const dates = new Map(); // cycle → { refStart, refEnd }
  for (const row of sheetRows(national, "Collection and Reference Dates").slice(1)) {
    const cycle = row[3] != null ? String(row[3]) : null;
    if (!cycle || !/^\d{6}$/.test(cycle)) continue;
    dates.set(cycle, { refStart: isoDate(row[6]), refEnd: isoDate(row[7]) });
  }

  const nat = extractYesSeries(sheetRows(national, "Response Estimates"), {
    keyCol: null, qidCol: 0, aidCol: 2, firstCycleCol: 4,
  });
  const us = nat.byKey.get("US") ?? {};
  const nationalSeries = [...nat.cycles]
    .sort()
    .filter((cycle) => us[BTOS_AI_USE_QID]?.[cycle] != null)
    .map((cycle) => ({
      cycle,
      refStart: dates.get(cycle)?.refStart ?? null,
      refEnd: dates.get(cycle)?.refEnd ?? null,
      aiUsePct: us[BTOS_AI_USE_QID][cycle],
      aiUseNext6mPct: us[BTOS_AI_NEXT6M_QID]?.[cycle] ?? null,
    }));
  if (nationalSeries.length < 20) throw new Error(`BTOS national AI series too short (${nationalSeries.length})`);
  const latestCycle = nationalSeries.at(-1).cycle;

  // Latest published value per key; suppressed cells ("S") fall back to the most recent non-suppressed cycle.
  function latestCut(byKey, labelFor) {
    const out = [];
    for (const [key, qs] of byKey) {
      const label = labelFor(key);
      if (!label) continue;
      const useCycles = Object.keys(qs[BTOS_AI_USE_QID] ?? {}).sort();
      const cycle = useCycles.at(-1);
      if (!cycle) continue;
      out.push({
        ...label,
        cycle,
        aiUsePct: qs[BTOS_AI_USE_QID][cycle],
        aiUseNext6mPct: qs[BTOS_AI_NEXT6M_QID]?.[cycle] ?? null,
      });
    }
    return out.sort((a, b) => b.aiUsePct - a.aiUsePct);
  }

  const sectorWb = await loadWorkbook("Sector.xlsx");
  const sector = extractYesSeries(sheetRows(sectorWb, "Response Estimates"), {
    keyCol: 0, qidCol: 1, aidCol: 3, firstCycleCol: 5,
  });
  const bySector = latestCut(sector.byKey, (code) => (BTOS_SECTORS[code] ? { naics: code, sector: BTOS_SECTORS[code] } : null));

  const stateWb = await loadWorkbook("State.xlsx");
  const state = extractYesSeries(sheetRows(stateWb, "Response Estimates"), {
    keyCol: 0, qidCol: 1, aidCol: 3, firstCycleCol: 5,
  });
  const byState = latestCut(state.byKey, (code) => (/^[A-Z]{2}$/.test(code) && code !== "XX" ? { state: code } : null));

  console.log(`  BTOS: ${nationalSeries.length} national cycles (latest ${latestCycle}), ${bySector.length} sectors, ${byState.length} states`);
  return {
    asOf: dates.get(latestCycle)?.refEnd ?? latestCycle,
    latestCycle,
    frequency: "biweekly",
    universe: "U.S. employer businesses (single-unit and multi-unit firms), weighted by firm count",
    national: nationalSeries,
    bySector,
    byState,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Building AI adoption tracker (FRED RPS + Census BTOS) ===");
  const existing = readExisting();
  const notes = [];

  async function section(name, build) {
    try {
      return await build();
    } catch (err) {
      const prior = existing?.[name];
      if (!prior) throw err;
      console.warn(`  ⚠ ${name}: ${err.message} — preserving last-known-good section`);
      notes.push(`${name} preserved from ${existing.meta?.generatedAt ?? "previous build"} after fetch failure`);
      return prior;
    }
  }

  const workers = await section("workers", buildWorkers);
  const businesses = await section("businesses", buildBusinesses);
  const generatedAt = new Date().toISOString();

  const output = {
    meta: buildMeta({
      generatedAt,
      asOf: [workers.asOf, businesses.asOf].filter(Boolean).sort().at(-1),
      source: {
        name: "St. Louis Fed RPS Generative AI Adoption Tracker + Census Business Trends and Outlook Survey",
        publisher: "Federal Reserve Bank of St. Louis / U.S. Census Bureau",
        url: "https://fred.stlouisfed.org/release?rid=6",
      },
    }),
    generatedAt,
    sources: [
      {
        id: "stlouisfed-rps-genai",
        name: "Real-Time Population Survey: Generative AI Adoption Tracker",
        publisher: "Federal Reserve Bank of St. Louis (Bick, Blandin & Deming)",
        url: "https://fred.stlouisfed.org/release?rid=6",
        license: "Public data via FRED; cite Bick, Blandin & Deming, \"The Rapid Adoption of Generative AI\"",
      },
      {
        id: "census-btos-ai",
        name: "Business Trends and Outlook Survey (BTOS) — AI use",
        publisher: "U.S. Census Bureau",
        url: "https://www.census.gov/hfp/btos/data",
        license: "Public Domain (U.S. Government work)",
      },
    ],
    caveats: [
      "Worker adoption (RPS) counts people; business AI use (BTOS) counts firms. They use different units and questions and must not be merged.",
      "RPS is an online survey of U.S. adults 18–64; occupation and industry cuts have smaller samples and wider error bands.",
      "BTOS asks whether the business used AI in any business function in the prior two weeks; cells suppressed by Census for disclosure fall back to the latest published cycle.",
      "The BTOS national series starts with the first cycle that publishes the current AI-use question wording; BTOS did not collect cycles 202521–202523 (Oct 6 – Nov 16, 2025) due to the federal funding lapse.",
    ],
    ...(notes.length ? { buildNotes: notes } : {}),
    workers,
    businesses,
  };

  validateAIAdoptionTracker(output);
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n");
  const w = workers.headline.adoptionWork.at(-1);
  const b = businesses.national.at(-1);
  console.log(`✅  Written ${path.relative(ROOT, OUTPUT_FILE)}`);
  console.log(`   Workers using GenAI for work : ${w?.value}% (${w?.date})`);
  console.log(`   Firms using AI               : ${b?.aiUsePct}% (cycle ${b?.cycle})`);
}

main().catch((err) => {
  console.error("❌ build-ai-adoption-tracker failed:", err.message);
  process.exit(1);
});
