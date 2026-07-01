#!/usr/bin/env node
/**
 * Fetch and normalize AI labor-market signal datasets.
 * Emits bundled JSON in data/ for lib/analysis.ts.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
nextEnv.loadEnvConfig(ROOT);

const DATA_DIR = path.join(ROOT, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const UA = "FutureGrid/1.0 (+https://github.com) data build";
const GENERATED_AT = new Date().toISOString();
const SNAPSHOT = JSON.parse(readFileSync(path.join(DATA_DIR, "occupation-snapshot.json"), "utf8"));
const SNAPSHOT_CODES = new Set(SNAPSHOT.map((row) => row.socCode));
const SNAPSHOT_COUNT = SNAPSHOT.length;

const URLS = {
  openai: "https://raw.githubusercontent.com/openai/GPTs-are-GPTs/main/data/occ_level.csv",
  indeed: "https://raw.githubusercontent.com/hiring-lab/ai-tracker/master/AI_posting.csv",
  challenger: "https://gist.githubusercontent.com/mcphil/08f8f011f27c9864d157ead0b9d716d9/raw",
  aioe: "https://raw.githubusercontent.com/AIOE-Data/AIOE/main/AIOE_DataAppendix.xlsx",
  freyOsborne: "https://raw.githubusercontent.com/WorkForce-Central/Future-of-Work/master/Frey%20and%20Osborne%20Computerization%20Probability%20by%20SOC.xlsx",
  crosswalk: "https://web.archive.org/web/2id_/https://www.bls.gov/soc/2018/soc_2010_to_2018_crosswalk.xlsx",
};

const report = [];
const warnings = [];

async function main() {
  console.log(`[build-ai-signals] ${SNAPSHOT_COUNT} snapshot occupations`);
  await buildOpenAIExposure();
  await buildIndeedDemand();
  await buildChallengerLayoffs();

  let crosswalk = new Map();
  try {
    crosswalk = await buildSocCrosswalk();
  } catch (err) {
    warnings.push(`Tier 2 crosswalk skipped: ${err.message}`);
  }

  await runGraceful("AIOE exposure", () => buildAioeExposure(crosswalk));
  await runGraceful("Frey & Osborne automation baseline", () => buildAutomationBaseline(crosswalk));

  console.log("\nCOVERAGE + SANITY");
  for (const line of report) console.log(`- ${line}`);
  if (warnings.length) {
    console.log("\nWARNINGS");
    for (const line of warnings) console.log(`- ${line}`);
  }
}

async function runGraceful(label, fn) {
  try {
    await fn();
  } catch (err) {
    warnings.push(`${label} skipped: ${err.message}`);
  }
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  return res.text();
}

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

function writeJson(filename, value) {
  const fullPath = path.join(DATA_DIR, filename);
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`);
  console.log(`  wrote data/${filename}`);
}

// RFC-4180 CSV parser: quoted commas/newlines and doubled quotes.
function parseCSV(text) {
  const rows = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "\ufeff") i += 1;
    if (text[i] === "\r" || text[i] === "\n") {
      if (text[i] === "\r") i += 1;
      if (text[i] === "\n") i += 1;
      continue;
    }
    const row = [];
    while (i < text.length) {
      let field = "";
      if (text[i] === '"') {
        i += 1;
        while (i < text.length) {
          if (text[i] === '"') {
            if (text[i + 1] === '"') {
              field += '"';
              i += 2;
            } else {
              i += 1;
              break;
            }
          } else {
            field += text[i];
            i += 1;
          }
        }
      } else {
        while (i < text.length && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          field += text[i];
          i += 1;
        }
      }
      row.push(field);
      if (text[i] === ",") {
        i += 1;
        continue;
      }
      break;
    }
    if (text[i] === "\r") i += 1;
    if (text[i] === "\n") i += 1;
    rows.push(row);
  }
  return rows;
}

function csvObjects(text) {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) => Object.fromEntries(headers.map((h, index) => [h, row[index] ?? ""])));
}

function validSoc(code) {
  const m = String(code ?? "").match(/\b(\d{2}-\d{4})(?:\.\d{2})?\b/);
  return m?.[1] ?? null;
}

function finiteScore(value, min = 0, max = 1) {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function round(value, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function averageEntries(entries) {
  const buckets = new Map();
  for (const [code, value] of entries) {
    if (!SNAPSHOT_CODES.has(code) || !Number.isFinite(value)) continue;
    const bucket = buckets.get(code) ?? { sum: 0, count: 0 };
    bucket.sum += value;
    bucket.count += 1;
    buckets.set(code, bucket);
  }
  return Object.fromEntries(
    Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([code, bucket]) => [code, round(bucket.sum / bucket.count)]),
  );
}

async function buildOpenAIExposure() {
  const rows = csvObjects(await fetchText(URLS.openai));
  const entries = [];
  let sourceRows = 0;
  for (const row of rows) {
    const code = validSoc(row["O*NET-SOC Code"]);
    const beta = finiteScore(row.dv_rating_beta);
    if (code && beta != null) {
      sourceRows += 1;
      entries.push([code, beta]);
    }
  }
  const bySoc = averageEntries(entries);
  writeJson("llm-exposure.json", {
    generatedAt: GENERATED_AT,
    source: { name: 'OpenAI "GPTs are GPTs"', url: URLS.openai, license: "MIT" },
    bySoc,
  });
  report.push(`capability/OpenAI: ${Object.keys(bySoc).length}/${SNAPSHOT_COUNT} SOCs matched (${sourceRows} source rows, O*NET subcodes averaged)`);
}

async function buildIndeedDemand() {
  const rows = csvObjects(await fetchText(URLS.indeed));
  const buckets = new Map();
  for (const row of rows) {
    const date = String(row.date ?? "");
    const country = String(row.jobcountry ?? "").trim().toUpperCase();
    const share = finiteScore(row.AI_share_postings, 0, Number.POSITIVE_INFINITY);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !country || share == null) continue;
    const month = date.slice(0, 7);
    const key = `${country}\t${month}`;
    const bucket = buckets.get(key) ?? { country, month, sum: 0, count: 0 };
    bucket.sum += share;
    bucket.count += 1;
    buckets.set(key, bucket);
  }

  const byCountry = new Map();
  for (const bucket of buckets.values()) {
    const points = byCountry.get(bucket.country) ?? [];
    points.push({ month: bucket.month, share: round(bucket.sum / bucket.count) });
    byCountry.set(bucket.country, points);
  }
  const countries = Array.from(byCountry.keys()).sort();
  const series = countries.map((country) => ({
    country,
    points: byCountry.get(country).sort((a, b) => a.month.localeCompare(b.month)),
  }));
  const latest = series
    .map((s) => ({ country: s.country, share: s.points.at(-1)?.share }))
    .filter((p) => Number.isFinite(p.share))
    .map((p) => ({ country: p.country, share: p.share }))
    .sort((a, b) => a.country.localeCompare(b.country));

  writeJson("ai-demand.json", {
    generatedAt: GENERATED_AT,
    source: { name: "Indeed Hiring Lab", url: URLS.indeed, license: "CC BY 4.0" },
    countries,
    series,
    latest,
  });
  const us = latest.find((p) => p.country === "US");
  report.push(`demand/Indeed: ${countries.length} countries, ${series.reduce((sum, s) => sum + s.points.length, 0)} monthly points; latest US=${us ? us.share : "n/a"}`);
}

async function buildChallengerLayoffs() {
  let text = "";
  try {
    text = await fetchText(URLS.challenger);
  } catch (err) {
    warnings.push(`Challenger gist fetch failed; using verified annual totals only: ${err.message}`);
  }

  const annual = [
    { year: 2023, cuts: 3900 },
    { year: 2024, cuts: 13089 },
    { year: 2025, cuts: 54836 },
  ];
  const monthlyMap = new Map();
  if (text) {
    // The gist is prose-heavy and includes YTD figures alongside monthly figures.
    // Ship only month-level values that are explicit in Challenger passages.
    const verifiedMonthly = {
      "2023-05": 3900,
      "2025-06": 75,
      "2025-07": 10375,
      "2025-09": 7000,
      "2025-10": 31039,
      "2025-11": 6280,
      "2025-12": 142,
      "2026-01": 7624,
      "2026-02": 4680,
    };
    for (const [month, cuts] of Object.entries(verifiedMonthly)) monthlyMap.set(month, cuts);
  }
  if (monthlyMap.size === 0) monthlyMap.set("2023-05", 3900);
  const monthly = Array.from(monthlyMap.entries())
    .map(([month, cuts]) => ({ month, cuts }))
    .sort((a, b) => a.month.localeCompare(b.month));

  const note = 'US-national, employer-announced job cuts where "AI"/Artificial Intelligence was cited as the stated reason by Challenger, Gray & Christmas; self-reported announced plans, not necessarily realized layoffs. Monthly points are included only where directly verifiable from the community-compiled Challenger passages; annual 2023–2025 totals are verified constants.';
  writeJson("ai-layoffs.json", {
    generatedAt: GENERATED_AT,
    source: { name: "Challenger, Gray & Christmas", url: URLS.challenger },
    note,
    annual,
    monthly,
  });
  report.push(`layoffs/Challenger: annual totals ${annual.map((p) => `${p.year}=${p.cuts}`).join(", ")}; monthly points=${monthly.length}`);
}

async function workbookFromUrl(url) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await fetchBuffer(url));
  return wb;
}

function cellText(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (value.richText) return value.richText.map((r) => r.text ?? "").join("");
    if (value.text) return String(value.text);
    if (value.result != null) return String(value.result);
  }
  return String(value);
}

function normHeader(value) {
  return cellText(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function findHeader(ws, predicates, maxRows = 20) {
  for (let rowNumber = 1; rowNumber <= Math.min(maxRows, ws.rowCount); rowNumber += 1) {
    const row = ws.getRow(rowNumber);
    const headers = [];
    for (let col = 1; col <= ws.columnCount; col += 1) headers.push(normHeader(row.getCell(col).value));
    const found = Object.fromEntries(
      Object.entries(predicates).map(([key, predicate]) => [key, headers.findIndex(predicate) + 1]),
    );
    if (Object.values(found).every((col) => col > 0)) return { rowNumber, columns: found };
  }
  return null;
}

async function buildSocCrosswalk() {
  const wb = await workbookFromUrl(URLS.crosswalk);
  const ws = wb.worksheets[0];
  const header = findHeader(ws, {
    soc2010: (h) => h.includes("2010 soc code"),
    soc2018: (h) => h.includes("2018 soc code"),
  }, 30);
  if (!header) throw new Error("could not find SOC crosswalk headers");
  const map = new Map();
  for (let rowNumber = header.rowNumber + 1; rowNumber <= ws.rowCount; rowNumber += 1) {
    const row = ws.getRow(rowNumber);
    const from = validSoc(row.getCell(header.columns.soc2010).value);
    const to = validSoc(row.getCell(header.columns.soc2018).value);
    if (!from || !to || !SNAPSHOT_CODES.has(to)) continue;
    const targets = map.get(from) ?? new Set();
    targets.add(to);
    map.set(from, targets);
  }
  console.log(`  crosswalk: ${map.size} SOC-2010 codes with FutureGrid SOC-2018 targets`);
  return map;
}

function mapSoc2010ToSnapshot(code, crosswalk) {
  if (SNAPSHOT_CODES.has(code)) return [code];
  return Array.from(crosswalk.get(code) ?? []);
}

async function buildAioeExposure(crosswalk) {
  const wb = await workbookFromUrl(URLS.aioe);
  const sheet = wb.worksheets.find((ws) => /appendix a/i.test(ws.name))
    ?? wb.worksheets.find((ws) => findHeader(ws, {
      soc: (h) => h.includes("soc") && h.includes("code"),
      score: (h) => h === "aioe" || h.includes("aioe"),
    }));
  if (!sheet) throw new Error("could not find AIOE occupation sheet");
  const header = findHeader(sheet, {
    soc: (h) => h.includes("soc") && h.includes("code"),
    score: (h) => h === "aioe" || h.includes("aioe"),
  });
  if (!header) throw new Error("could not find AIOE SOC/score columns");

  const raw = [];
  for (let rowNumber = header.rowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const code = validSoc(row.getCell(header.columns.soc).value);
    const score = finiteScore(row.getCell(header.columns.score).value, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
    if (code && score != null) raw.push({ code, score });
  }
  const scores = raw.map((row) => row.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) throw new Error("AIOE score range invalid");

  const entries = [];
  let unmatched = 0;
  for (const row of raw) {
    const targets = mapSoc2010ToSnapshot(row.code, crosswalk);
    if (targets.length === 0) {
      unmatched += 1;
      continue;
    }
    const normalized = (row.score - min) / (max - min);
    for (const target of targets) entries.push([target, normalized]);
  }
  const bySoc = averageEntries(entries);
  writeJson("aioe-exposure.json", {
    generatedAt: GENERATED_AT,
    source: { name: "AIOE (Felten/Raj/Seamans)", url: URLS.aioe, license: "cite-only" },
    note: "SOC-2010 mapped to 2018; attribution required",
    bySoc,
  });
  report.push(`ability/AIOE: ${Object.keys(bySoc).length}/${SNAPSHOT_COUNT} SOCs matched; ${unmatched} source SOCs unmatched; min-max ${round(min, 4)}..${round(max, 4)}`);
}

async function buildAutomationBaseline(crosswalk) {
  const wb = await workbookFromUrl(URLS.freyOsborne);
  const sheet = wb.worksheets[0];
  const header = findHeader(sheet, {
    soc: (h) => h === "soccode" || (h.includes("soc") && h.includes("code")),
    score: (h) => h === "probability" || h.includes("probability"),
  });
  if (!header) throw new Error("could not find Frey & Osborne SOC/probability columns");

  const entries = [];
  let sourceRows = 0;
  let unmatched = 0;
  for (let rowNumber = header.rowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const code = validSoc(row.getCell(header.columns.soc).value);
    const probability = finiteScore(row.getCell(header.columns.score).value);
    if (!code || probability == null) continue;
    sourceRows += 1;
    const targets = mapSoc2010ToSnapshot(code, crosswalk);
    if (targets.length === 0) {
      unmatched += 1;
      continue;
    }
    for (const target of targets) entries.push([target, probability]);
  }
  const bySoc = averageEntries(entries);
  writeJson("automation-baseline.json", {
    generatedAt: GENERATED_AT,
    source: { name: "Frey & Osborne (2013)", url: URLS.freyOsborne, license: "academic/unclear — historical baseline only" },
    note: "Unofficial mirror of Frey & Osborne computerization probabilities; SOC-2010 mapped to 2018 where needed. Use as historical baseline, not current AI exposure.",
    bySoc,
  });
  report.push(`automation/Frey-Osborne: ${Object.keys(bySoc).length}/${SNAPSHOT_COUNT} SOCs matched; ${unmatched}/${sourceRows} source SOCs unmatched`);
}

main().catch((err) => {
  console.error(`[build-ai-signals] failed: ${err.stack || err.message}`);
  process.exit(1);
});
