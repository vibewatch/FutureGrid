#!/usr/bin/env node
/**
 * build-jolts.mjs
 * Fetches BLS JOLTS (Job Openings and Labor Turnover Survey) data
 * and emits a committed JSON snapshot to data/jolts.json.
 * Run: node scripts/build-jolts.mjs
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";
import { validateJolts } from "./lib/validate.mjs";
import { deriveMeta } from "./lib/meta.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
nextEnv.loadEnvConfig(ROOT);

const DATA_DIR = path.join(ROOT, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const BLS_API_KEY = process.env.BLS_API_KEY;
if (!BLS_API_KEY) {
  console.error("ERROR: BLS_API_KEY is not set in .env — add it and retry.");
  process.exit(1);
}

const BLS_URL = "https://api.bls.gov/publicAPI/v2/timeseries/data/";

// Industry code → display name (000000 is kept in "national"; rest go to "industries")
const INDUSTRIES = {
  "000000": "Total nonfarm",
  "100000": "Total private",
  "110099": "Mining and logging",
  "230000": "Construction",
  "300000": "Manufacturing",
  "320000": "Durable goods manufacturing",
  "340000": "Nondurable goods manufacturing",
  "400000": "Trade, transportation, and utilities",
  "420000": "Wholesale trade",
  "440000": "Retail trade",
  "480099": "Transportation, warehousing, and utilities",
  "510000": "Information",
  "510099": "Financial activities",
  "540099": "Professional and business services",
  "600000": "Education and health services",
  "610000": "Educational services",
  "620000": "Health care and social assistance",
  "700000": "Leisure and hospitality",
  "710000": "Arts, entertainment, and recreation",
  "720000": "Accommodation and food services",
  "810000": "Other services",
  "900000": "Government",
};

// Build a 21-char BLS JOLTS series ID
// Format: JTS + industry(6) + 000000000 + dataElement(2) + rateLevel(1)
function sid(industryCode, dataElement, rateLevel) {
  return `JTS${industryCode}000000000${dataElement}${rateLevel}`;
}

// POST to BLS API with up to maxAttempts retries and exponential backoff
async function blsPost(seriesIds, startYear, endYear, attempt = 1, maxAttempts = 3) {
  const body = JSON.stringify({
    seriesid: seriesIds,
    startyear: String(startYear),
    endyear: String(endYear),
    registrationkey: BLS_API_KEY,
  });
  try {
    const res = await fetch(BLS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const json = await res.json();
    if (json.status !== "REQUEST_SUCCEEDED") {
      throw new Error(`BLS API: ${json.status} — ${(json.message || []).join("; ")}`);
    }
    return json.Results.series;
  } catch (err) {
    if (attempt < maxAttempts) {
      const delay = attempt * 2000;
      console.warn(`  Attempt ${attempt} failed (${err.message}). Retrying in ${delay}ms...`);
      await new Promise((r) => setTimeout(r, delay));
      return blsPost(seriesIds, startYear, endYear, attempt + 1, maxAttempts);
    }
    throw err;
  }
}

// Parse a BLS data array into [{date:"YYYY-MM", value:Number}] sorted ascending.
// Skips M13 (annual average) and "-" (suppressed/missing) values.
function parseBLSSeries(dataArr) {
  if (!dataArr) return [];
  return dataArr
    .filter((d) => d.period !== "M13")
    .map((d) => {
      if (d.value === "-") return null;
      const v = Number(d.value);
      if (isNaN(v)) return null;
      const mm = d.period.slice(1).padStart(2, "0");
      return { date: `${d.year}-${mm}`, value: v };
    })
    .filter(Boolean)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// Fetch many series over a year range, honouring the BLS API limits:
//   - max 50 series per request
//   - max 20 years per request
// Returns { seriesId: [{date, value}], ... }
async function fetchAll(seriesIds, startYear, endYear) {
  const result = Object.fromEntries(seriesIds.map((id) => [id, []]));

  // Split year range into ≤20-year chunks
  const yearChunks = [];
  for (let y = startYear; y <= endYear; y += 20) {
    yearChunks.push([y, Math.min(y + 19, endYear)]);
  }

  for (const [sy, ey] of yearChunks) {
    for (let i = 0; i < seriesIds.length; i += 50) {
      const batch = seriesIds.slice(i, i + 50);
      console.log(`  POST ${batch.length} series, years ${sy}–${ey}`);
      const series = await blsPost(batch, sy, ey);
      for (const s of series) {
        if (Object.prototype.hasOwnProperty.call(result, s.seriesID)) {
          result[s.seriesID].push(...parseBLSSeries(s.data));
        }
      }
    }
  }

  // Deduplicate and sort by date (two year-chunks may overlap at boundaries)
  for (const id of seriesIds) {
    const seen = new Set();
    result[id] = result[id]
      .filter((d) => {
        if (seen.has(d.date)) return false;
        seen.add(d.date);
        return true;
      })
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  return result;
}

async function main() {
  console.log("=== Building JOLTS data snapshot ===");

  const ELEMENTS = ["JO", "HI", "QU", "LD", "TS"];

  // ── 1. National (000000): all 5 data elements × level + rate = 10 series, 2016–2025 ──
  const natIds = ELEMENTS.flatMap((el) => ["L", "R"].map((rl) => sid("000000", el, rl)));
  console.log(`\nFetching national series (${natIds.length} series, 2016–2025)...`);
  const natData = await fetchAll(natIds, 2016, 2025);

  const nationalSeries = {};
  for (const el of ELEMENTS) {
    for (const rl of ["L", "R"]) {
      nationalSeries[`${el}${rl}`] = natData[sid("000000", el, rl)] ?? [];
    }
  }

  // ── 2. Industries (all except 000000): LDL + LDR history 2016–2025 ──
  const industryCodes = Object.keys(INDUSTRIES).filter((c) => c !== "000000");
  const indLdIds = industryCodes.flatMap((c) => [sid(c, "LD", "L"), sid(c, "LD", "R")]);
  console.log(
    `\nFetching industry LDL+LDR history (${indLdIds.length} series, 2016–2025)...`
  );
  const indLdData = await fetchAll(indLdIds, 2016, 2025);

  // ── 3. Industries: JOL + QUL + HIL snapshot (2024–2025 is enough for latest value) ──
  const indSnapIds = industryCodes.flatMap((c) => [
    sid(c, "JO", "L"),
    sid(c, "QU", "L"),
    sid(c, "HI", "L"),
  ]);
  console.log(
    `\nFetching industry snapshot (JOL/QUL/HIL, ${indSnapIds.length} series, 2024–2025)...`
  );
  const indSnapData = await fetchAll(indSnapIds, 2024, 2025);

  // ── Assemble industries array ──
  const industries = industryCodes.map((code) => {
    const ldl = indLdData[sid(code, "LD", "L")] ?? [];
    const ldr = indLdData[sid(code, "LD", "R")] ?? [];
    const jol = indSnapData[sid(code, "JO", "L")] ?? [];
    const qul = indSnapData[sid(code, "QU", "L")] ?? [];
    const hil = indSnapData[sid(code, "HI", "L")] ?? [];

    const latestDate =
      [ldl, ldr, jol, qul, hil]
        .map((arr) => arr.at(-1)?.date)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null;

    return {
      code,
      name: INDUSTRIES[code],
      layoffsLevel: ldl,
      layoffsRate: ldr,
      latest: {
        date: latestDate,
        LDL: ldl.at(-1)?.value ?? null,
        LDR: ldr.at(-1)?.value ?? null,
        JOL: jol.at(-1)?.value ?? null,
        QUL: qul.at(-1)?.value ?? null,
        HIL: hil.at(-1)?.value ?? null,
      },
    };
  });

  // ── Build output object ──
  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      name: "BLS Job Openings and Labor Turnover Survey (JOLTS)",
      publisher: "U.S. Bureau of Labor Statistics",
      survey: "JOLTS",
      url: "https://www.bls.gov/jlt/",
      license: "Public Domain",
      note: "Monthly data 2016–2025. Levels are in thousands of jobs. Series IDs: JTS{industry-6}000000000{element-2}{L|R}. Elements: JO=job openings, HI=hires, QU=quits, LD=layoffs & discharges, TS=total separations.",
    },
    national: { series: nationalSeries },
    industries,
  };

  // If JSON exceeds ~3 MB, trim industry monthly series to start at 2005-01
  output.meta = deriveMeta(output);
  let jsonStr = JSON.stringify(output, null, 2) + "\n";
  if (jsonStr.length > 3 * 1024 * 1024) {
    console.warn("Output > 3 MB — trimming industry series to 2005-01+");
    const TRIM = "2005-01";
    for (const ind of output.industries) {
      ind.layoffsLevel = ind.layoffsLevel.filter((d) => d.date >= TRIM);
      ind.layoffsRate = ind.layoffsRate.filter((d) => d.date >= TRIM);
    }
    jsonStr = JSON.stringify(output, null, 2) + "\n";
  }

  const outPath = path.join(DATA_DIR, "jolts.json");
  validateJolts(output);
  writeFileSync(outPath, jsonStr);

  // ── Summary ──
  const ldlSeries = output.national.series.LDL ?? [];
  const latestNat = ldlSeries.at(-1);
  console.log("\n✅  Written data/jolts.json");
  console.log(`   national.series.LDL length : ${ldlSeries.length}`);
  console.log(
    `   latest national LDL        : ${latestNat?.date} = ${latestNat?.value} (thousands)`
  );
  console.log(`   industries count           : ${output.industries.length}`);
  console.log(`   file size                  : ${(jsonStr.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("\nFATAL:", err.message);
  process.exit(1);
});
