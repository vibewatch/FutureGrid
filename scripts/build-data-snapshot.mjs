#!/usr/bin/env node
/**
 * build-data-snapshot.mjs
 * Fetches Anthropic Economic Index + O*NET data and emits committed JSON snapshots.
 * Run: node scripts/build-data-snapshot.mjs
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
import https from "https";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import nextEnv from "@next/env";
import { feature as topoFeature } from "topojson-client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
nextEnv.loadEnvConfig(ROOT);

const DATA_DIR = path.join(ROOT, "data");
const CACHE_DIR = path.join(ROOT, ".data-cache");

[DATA_DIR, CACHE_DIR].forEach((d) => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

const UA = "FutureGrid-data-bot/1.0 (https://github.com/huangyingting/FutureGrid)";
const AEI_BASE = "https://huggingface.co/datasets/Anthropic/EconomicIndex/resolve/main/";
const ONET_ZIP_URL = "https://www.onetcenter.org/dl_files/database/db_28_3_text.zip";

const SUPPLEMENTAL_COUNTRY_EXPOSURE = [
  {
    iso3: "CHN",
    name: "China",
    usageIndex: null,
    usagePct: null,
    usageCount: null,
    gdpPerWorkingAgeCapita: 19189.00821390334,
  },
];

// ─── Tiny robust CSV parser (handles quoted fields, embedded commas/newlines) ──
function parseCSV(text) {
  const rows = [];
  let headers = null;
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let i = 0;

  function parseRow() {
    const fields = [];
    while (i < lines.length && lines[i] !== "\n") {
      if (lines[i] === '"') {
        // quoted field
        i++;
        let val = "";
        while (i < lines.length) {
          if (lines[i] === '"' && lines[i + 1] === '"') { val += '"'; i += 2; }
          else if (lines[i] === '"') { i++; break; }
          else { val += lines[i++]; }
        }
        fields.push(val);
        if (lines[i] === ",") i++;
      } else {
        let val = "";
        while (i < lines.length && lines[i] !== "," && lines[i] !== "\n") val += lines[i++];
        if (lines[i] === ",") i++;
        fields.push(val.trim());
      }
    }
    if (lines[i] === "\n") i++;
    return fields;
  }

  while (i < lines.length) {
    const row = parseRow();
    if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;
    if (!headers) { headers = row; continue; }
    // Allow trailing empty fields (rows ending with comma parse as length-1)
    if (row.length < headers.length - 1) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = row[j] ?? "";
    rows.push(obj);
  }
  return rows;
}

// Tab-separated (O*NET)
function parseTSV(text) {
  const rows = [];
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return rows;
  const headers = lines[0].split("\t");
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const parts = lines[i].split("\t");
    const obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = (parts[j] ?? "").trim();
    rows.push(obj);
  }
  return rows;
}

// ─── HTTP fetch helper ─────────────────────────────────────────────────────────
function resolveUrl(base, location) {
  if (!location) return base;
  if (location.startsWith("http://") || location.startsWith("https://")) return location;
  // Relative URL — resolve against the base URL's origin
  try {
    return new URL(location, base).href;
  } catch {
    // Fallback: prepend origin
    const u = new URL(base);
    return u.origin + location;
  }
}

function fetchText(url, cacheFile, opts = {}) {
  if (existsSync(cacheFile)) {
    console.log(`  [cache] ${cacheFile}`);
    return readFileSync(cacheFile, "utf8");
  }
  console.log(`  [fetch] ${url}`);
  return new Promise((resolve, reject) => {
    const options = {
      headers: { "User-Agent": UA, ...(opts.headers || {}) },
    };
    function doRequest(u) {
      const proto = u.startsWith("https") ? https : http;
      proto.get(u, options, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode)) {
          const loc = resolveUrl(u, res.headers.location);
          return doRequest(loc);
        }
        handleResponse(res, u);
      }).on("error", reject);
    }
    function handleResponse(res, u) {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} for ${u}`)); return; }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        const buf = Buffer.concat(chunks);
        writeFileSync(cacheFile, buf);
        resolve(buf.toString("utf8"));
      });
      res.on("error", reject);
    }
    doRequest(url);
  });
}

function fetchBinary(url, cacheFile) {
  if (existsSync(cacheFile)) {
    console.log(`  [cache] ${cacheFile}`);
    return Promise.resolve(readFileSync(cacheFile));
  }
  console.log(`  [fetch] ${url}`);
  return new Promise((resolve, reject) => {
    const options = { headers: { "User-Agent": UA } };
    function doRequest(u) {
      const p2 = u.startsWith("https") ? https : http;
      p2.get(u, options, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode)) {
          return doRequest(resolveUrl(u, res.headers.location));
        }
        if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} for ${u}`)); return; }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          writeFileSync(cacheFile, buf);
          resolve(buf);
        });
        res.on("error", reject);
      }).on("error", reject);
    }
    doRequest(url);
  });
}

// ─── SOC normalisation helpers ─────────────────────────────────────────────────
// O*NET-SOC 13-2011.00 → 13-2011
function onetToSoc6(code) {
  if (!code) return "";
  const m = code.match(/^(\d{2}-\d{4})/);
  return m ? m[1] : code;
}

// ─── BLS helpers ───────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** POST to BLS Public Data API v2, returns parsed JSON response. */
function blsPost(seriesids, startyear, endyear, registrationkey) {
  const body = JSON.stringify({ seriesid: seriesids, startyear, endyear, registrationkey });
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.bls.gov",
      path: "/publicAPI/v2/timeseries/data/",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": UA,
      },
    };
    const req = https.request(opts, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
        catch (e) { reject(new Error(`BLS JSON parse error: ${e.message}`)); }
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

/**
 * Find the latest annual (period A01) value in a BLS series data array.
 * Returns { value: number, year: string } or null.
 */
function getLatestAnnual(data) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const annual = data.filter((d) => d.period === "A01" && d.value && d.value !== "-");
  if (annual.length === 0) return null;
  annual.sort((a, b) => parseInt(b.year) - parseInt(a.year));
  const val = parseFloat(annual[0].value.replace(/,/g, ""));
  return isNaN(val) ? null : { value: val, year: annual[0].year };
}

/**
 * Enrich occupations[] in-place with OEWS employment + annual median wage from BLS API v2.
 *
 * With BLS_API_KEY: batches 50 series per request, retries with backoff, updates
 * `employment` (integer, OEWS total) and `medianSalary` (authoritative OEWS wage).
 * Without key: logs a clear notice and returns immediately (snapshot stays valid, employment null).
 *
 * @param {object[]} occupations  snapshot array (mutated in place)
 * @returns {{ enriched: boolean, empUpdated: number, wageUpdated: number }}
 */
async function enrichWithBLS(occupations) {
  const apiKey = process.env.BLS_API_KEY;

  if (!apiKey) {
    console.log("\n[BLS] BLS_API_KEY not set — skipping real employment/wage enrichment");
    console.log("      (set it and re-run `npm run build:data`).");
    return { enriched: false, empUpdated: 0, wageUpdated: 0 };
  }

  console.log(`\n[BLS] Enriching ${occupations.length} occupations via BLS Public Data API v2 …`);

  // Map series ID → { field: "emp"|"wage", occ: occupationObject }
  const seriesMap = new Map();
  const allSeriesIds = [];
  for (const occ of occupations) {
    const soc6 = occ.socCode.replace("-", "");
    const empId  = `OEUN0000000000000${soc6}01`;
    const wageId = `OEUN0000000000000${soc6}13`;
    seriesMap.set(empId,  { field: "emp",  occ });
    seriesMap.set(wageId, { field: "wage", occ });
    allSeriesIds.push(empId, wageId);
  }

  const BATCH_SIZE = 50;
  const totalBatches = Math.ceil(allSeriesIds.length / BATCH_SIZE);
  let empUpdated = 0, wageUpdated = 0;

  for (let i = 0; i < allSeriesIds.length; i += BATCH_SIZE) {
    const batch = allSeriesIds.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`  Batch ${batchNum}/${totalBatches} (${batch.length} series) … `);

    let success = false;
    for (let attempt = 1; attempt <= 3 && !success; attempt++) {
      try {
        const resp = await blsPost(batch, "2024", "2025", apiKey);

        if (resp.status === "REQUEST_SUCCEEDED") {
          for (const series of (resp.Results?.series ?? [])) {
            const latest = getLatestAnnual(series.data);
            if (latest === null) continue;
            const entry = seriesMap.get(series.seriesID);
            if (!entry) continue;
            if (entry.field === "emp") {
              entry.occ.employment = Math.round(latest.value);
              empUpdated++;
            } else {
              entry.occ.medianSalary = Math.round(latest.value);
              wageUpdated++;
            }
          }
          success = true;
        } else {
          const msgs = (resp.message ?? []).join(" ");
          const isLimit = /threshold|limit|exceeded/i.test(msgs);
          console.warn(`\n  ⚠ status=${resp.status} attempt=${attempt}: ${msgs}`);
          if (isLimit) {
            console.warn("  Rate limit hit — waiting 60 s …");
            await sleep(60_000);
          } else if (attempt < 3) {
            await sleep(2_000 * attempt);
          }
        }
      } catch (err) {
        console.warn(`\n  ⚠ batch ${batchNum} attempt ${attempt} error: ${err.message}`);
        if (attempt < 3) await sleep(2_000 * attempt);
      }
    }

    if (!success) {
      process.stdout.write("FAILED\n");
    } else {
      process.stdout.write("ok\n");
    }

    if (i + BATCH_SIZE < allSeriesIds.length) await sleep(300);
  }

  console.log(`  → employment updated: ${empUpdated}, wages updated: ${wageUpdated}`);
  return { enriched: true, empUpdated, wageUpdated };
}

// classifyRisk is defined inside main() using percentile thresholds from the actual distribution

// ─── World geometry builder ────────────────────────────────────────────────────
const WORLD_ATLAS_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const ISO_CROSSWALK_URL = "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json";

async function buildWorldGeo({ DATA_DIR: dataDir, CACHE_DIR: cacheDir }) {
  console.log("\n[GEO] Building world-countries.geo.json …");

  const topoText = await fetchText(
    WORLD_ATLAS_URL,
    path.join(cacheDir, "countries-110m.json")
  );
  const isoText = await fetchText(
    ISO_CROSSWALK_URL,
    path.join(cacheDir, "iso-crosswalk.json")
  );

  const topo = JSON.parse(topoText);
  const isoData = JSON.parse(isoText);

  // Build numeric (as integer) → ISO-3 alpha-3 lookup
  const numToIso3 = new Map();
  for (const entry of isoData) {
    const num = parseInt(entry["country-code"], 10);
    if (!isNaN(num) && entry["alpha-3"]) numToIso3.set(num, entry["alpha-3"]);
  }

  const geojson = topoFeature(topo, topo.objects.countries);

  const features = [];
  for (const f of geojson.features) {
    const numId = typeof f.id === "number" ? f.id : parseInt(String(f.id), 10);
    const iso3 = numToIso3.get(numId);
    if (!iso3 || iso3 === "ATA") continue; // drop Antarctica + unmapped
    features.push({
      type: "Feature",
      id: iso3,
      properties: { name: (f.properties && f.properties.name) || "" },
      geometry: f.geometry,
    });
  }

  const out = { type: "FeatureCollection", features };
  writeFileSync(path.join(dataDir, "world-countries.geo.json"), JSON.stringify(out));
  console.log(`✓ Written world-countries.geo.json (${features.length} features)`);

  // Spot-check
  const spot = ["CHN", "USA", "IND", "BRA"];
  for (const iso of spot) {
    const found = features.find((f) => f.id === iso);
    console.log(`  ${iso}: ${found ? "✓" : "✗ MISSING"}`);
  }
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────
async function main() {
  console.log("=== FutureGrid data pipeline ===");

  // 1. Fetch AEI CSVs
  console.log("\n[1/5] Fetching AEI job_exposure.csv …");
  const exposureText = await fetchText(
    AEI_BASE + "labor_market_impacts/job_exposure.csv",
    path.join(CACHE_DIR, "job_exposure.csv")
  );
  const exposureRows = parseCSV(exposureText);
  console.log(`  → ${exposureRows.length} rows`);

  // ── Percentile-based risk thresholds from actual distribution ──────────────
  const allExposures = exposureRows
    .map((r) => parseFloat(r["observed_exposure"] || r["aiExposure"] || ""))
    .filter((v) => !isNaN(v))
    .sort((a, b) => a - b);
  const en = allExposures.length;
  const pctVal = (p) => allExposures[Math.floor(p / 100 * (en - 1))];
  // Very High = top ~8% (above p92), High = next ~12% (p80–p92),
  // Medium = next ~25% (p55–p80), Low = bottom ~55% (≤ p55)
  const VH_THRESHOLD   = pctVal(92);
  const HIGH_THRESHOLD = pctVal(80);
  const MED_THRESHOLD  = pctVal(55);
  function classifyRisk(exposure) {
    if (exposure > VH_THRESHOLD)   return "Very High";
    if (exposure > HIGH_THRESHOLD) return "High";
    if (exposure > MED_THRESHOLD)  return "Medium";
    return "Low";
  }
  console.log(`  Percentile thresholds — VH > ${VH_THRESHOLD.toFixed(4)}, High > ${HIGH_THRESHOLD.toFixed(4)}, Med > ${MED_THRESHOLD.toFixed(4)}`);

  console.log("\n[2/5] Fetching AEI wage_data.csv …");
  const wageText = await fetchText(
    AEI_BASE + "release_2025_02_10/wage_data.csv",
    path.join(CACHE_DIR, "wage_data.csv")
  );
  const wageRows = parseCSV(wageText);
  console.log(`  → ${wageRows.length} rows`);

  console.log("\n[3/5] Fetching AEI bls_employment_may_2023.csv …");
  const blsText = await fetchText(
    AEI_BASE + "release_2025_02_10/bls_employment_may_2023.csv",
    path.join(CACHE_DIR, "bls_employment_may_2023.csv")
  );
  const blsRows = parseCSV(blsText);
  console.log(`  → ${blsRows.length} rows`);

  // 4. Country exposure
  console.log("\n[4/5] Fetching AEI country exposure CSV …");
  const countryText = await fetchText(
    AEI_BASE + "release_2025_09_15/data/output/aei_enriched_claude_ai_2025-08-04_to_2025-08-11.csv",
    path.join(CACHE_DIR, "aei_country_2025.csv")
  );
  const countryRows = parseCSV(countryText);
  console.log(`  → ${countryRows.length} rows (long format)`);

  // 5. O*NET skills (best-effort)
  let skillsMap = new Map(); // soc6 → string[]
  let onetSkillsFailed = false;
  try {
    console.log("\n[5/5] Fetching O*NET zip …");
    const zipCache = path.join(CACHE_DIR, "db_28_3_text.zip");
    await fetchBinary(ONET_ZIP_URL, zipCache);

    const unzipDir = path.join(CACHE_DIR, "onet_unzipped");
    if (!existsSync(unzipDir)) {
      mkdirSync(unzipDir, { recursive: true });
      console.log("  Unzipping O*NET archive …");
      execSync(`unzip -q "${zipCache}" -d "${unzipDir}"`, { stdio: "inherit" });
    }

    // Find Skills.txt (may be inside a subdirectory)
    let skillsFile = path.join(unzipDir, "Skills.txt");
    if (!existsSync(skillsFile)) {
      const found = execSync(`find "${unzipDir}" -name "Skills.txt" 2>/dev/null`).toString().trim().split("\n")[0];
      if (found) skillsFile = found;
    }
    if (!existsSync(skillsFile)) throw new Error("Skills.txt not found in O*NET zip");

    const skillsText = readFileSync(skillsFile, "utf8");
    const skillsRows = parseTSV(skillsText);
    console.log(`  → ${skillsRows.length} skill rows`);

    // Take IM (Importance) scale, top 5 skills per SOC
    const byOcc = new Map();
    for (const r of skillsRows) {
      if ((r["Scale ID"] || r["Scale Name"] || "").includes("IM") || r["Scale ID"] === "IM") {
        const soc = onetToSoc6(r["O*NET-SOC Code"]);
        if (!soc) continue;
        const score = parseFloat(r["Data Value"] || "0");
        const name = r["Element Name"] || "";
        if (!byOcc.has(soc)) byOcc.set(soc, []);
        byOcc.get(soc).push({ name, score });
      }
    }
    for (const [soc, arr] of byOcc.entries()) {
      arr.sort((a, b) => b.score - a.score);
      skillsMap.set(soc, arr.slice(0, 5).map((x) => x.name));
    }
    console.log(`  → skills mapped for ${skillsMap.size} SOC codes`);
  } catch (err) {
    console.warn(`  ⚠ O*NET skills step failed (${err.message}); continuing without skills`);
    onetSkillsFailed = true;
  }

  // Build wage/sector/employment lookup from wage_data
  // Strategy: prefer .00 base occupations; fall back to first .01/.02 etc entry for same SOC6
  const wageMapRaw = new Map(); // soc6 → { priority, ... }
  for (const r of wageRows) {
    const onetCode = (r["SOCcode"] || "").trim();
    if (!onetCode) continue;
    const soc6 = onetToSoc6(onetCode);
    if (!soc6) continue;
    const priority = onetCode.endsWith(".00") ? 0 : 1;
    const existing = wageMapRaw.get(soc6);
    if (existing && existing.priority <= priority) continue; // keep better record
    wageMapRaw.set(soc6, {
      priority,
      sector: r["JobFamily"] || "",
      salary: parseFloat(r["MedianSalary"] || "0") || 0,
      forecast: parseFloat(r["JobForecast"] || "0") || 0,
      jobZone: parseInt(r["JobZone"] || "0", 10) || 0,
      bright: (r["isBright"] || "").toLowerCase() === "true",
      wageGroup: r["WageGroup"] || "",
      jobName: r["JobName"] || "",
    });
  }
  const wageMap = wageMapRaw;
  console.log(`\n  Wage lookup: ${wageMap.size} SOC codes`);

  // ─── BLS employment lookup ────────────────────────────────────────────────
  // bls_employment uses title-matching against SOC titles; we use occ_code from exposure file
  // The bls_distribution field gives employment share. We'll use it as a distribution weight,
  // and also look for total employment in the rows.
  // Columns seem to be: first col = SOC title, second = bls_distribution (employment counts or share)
  const blsHeaders = blsRows.length > 0 ? Object.keys(blsRows[0]) : [];
  console.log("  BLS columns:", blsHeaders.join(", "));

  // Parse BLS: map SOC title -> employment value
  const blsTitleMap = new Map();
  for (const r of blsRows) {
    const titleKey = blsHeaders[0]; // "SOC or O*NET-SOC 2019 Title" or similar
    const valKey = blsHeaders[1] || "bls_distribution";
    const title = (r[titleKey] || "").trim();
    const val = parseFloat(r[valKey] || "0") || 0;
    if (title) blsTitleMap.set(title.toLowerCase(), val);
  }

  // ─── Build occupation snapshot ────────────────────────────────────────────
  const DEFAULT_SKILLS = ["Critical Thinking", "Reading Comprehension", "Active Listening", "Communication", "Problem Solving"];

  const snapshot = [];
  let skippedNoExposure = 0;

  for (const row of exposureRows) {
    const soc6 = (row["occ_code"] || "").trim();
    if (!soc6) continue;
    const exposureRaw = row["observed_exposure"] || row["aiExposure"] || "";
    const aiExposure = parseFloat(exposureRaw);
    if (isNaN(aiExposure)) { skippedNoExposure++; continue; }

    const title = (row["title"] || "").trim();
    const wage = wageMap.get(soc6);

    // employment: BLS file only has major-group totals, not individual SOC titles — null
    const employment = null;

    // projectedOpenings: from wage_data.JobForecast where > 0 (-1 and blank = no data)
    const projectedOpenings = (wage?.forecast && wage.forecast > 0) ? Math.round(wage.forecast) : null;

    // growth: no reliable per-occupation % growth source in AEI files — null, not fabricated
    const growthRate = null;

    // sector: from wage_data JobFamily, fallback to SOC major group
    const majorGroup = soc6.slice(0, 2);
    const SECTOR_FALLBACK = {
      "11": "Management", "13": "Business & Financial", "15": "Computer & Mathematical",
      "17": "Architecture & Engineering", "19": "Life, Physical & Social Science",
      "21": "Community & Social Service", "23": "Legal", "25": "Education & Library",
      "27": "Arts, Entertainment & Media", "29": "Healthcare", "31": "Healthcare Support",
      "33": "Protective Service", "35": "Food Preparation", "37": "Building & Grounds",
      "39": "Personal Care", "41": "Sales", "43": "Office & Administrative",
      "45": "Farming & Forestry", "47": "Construction", "49": "Installation & Repair",
      "51": "Production", "53": "Transportation & Logistics",
    };
    const sector = (wage?.sector && wage.sector.trim()) ? wage.sector.trim() : (SECTOR_FALLBACK[majorGroup] ?? "Other");

    // salary: if < 500, assume hourly and annualise (~2080 hrs)
    let medianSalary = (wage?.salary && wage.salary > 0) ? wage.salary : 0;
    if (medianSalary > 0 && medianSalary < 500) medianSalary = Math.round(medianSalary * 2080);

    // skills
    const skills = skillsMap.get(soc6) || DEFAULT_SKILLS;

    snapshot.push({
      socCode: soc6,
      title: title || wage?.jobName || soc6,
      sector,
      aiExposure: Math.round(aiExposure * 10000) / 10000,
      automationRisk: classifyRisk(aiExposure),
      automationProbability: Math.round(aiExposure * 10000) / 10000,
      medianSalary,
      employment,
      projectedOpenings,
      growthRate,
      jobZone: wage?.jobZone ?? 0,
      brightOutlook: wage?.bright ?? false,
      outlook: (wage?.bright ?? false) ? "Bright" : "Average",
      skills,
    });
  }

  console.log(`\n  Occupation snapshot: ${snapshot.length} records (skipped ${skippedNoExposure} missing exposure)`);

  // ─── BLS OEWS enrichment (employment + wages) ──────────────────────────────
  const { enriched: blsEnriched, empUpdated: blsEmpUpdated, wageUpdated: blsWageUpdated } =
    await enrichWithBLS(snapshot);

  // ─── Country exposure ──────────────────────────────────────────────────────
  // Long format: filter geography=="country", pivot variables to columns
  const countryPivot = new Map(); // iso3 → { iso3, name, usageIndex, usagePct, usageCount, gdpPerWorkingAgeCapita }
  for (const r of countryRows) {
    if ((r["geography"] || "").trim().toLowerCase() !== "country") continue;
    const iso3 = (r["geo_id"] || "").trim();
    const name = (r["geo_name"] || "").trim();
    const variable = (r["variable"] || "").trim();
    const value = parseFloat(r["value"] || "0") || 0;
    if (!iso3) continue;
    if (!countryPivot.has(iso3)) {
      countryPivot.set(iso3, { iso3, name, usageIndex: null, usagePct: null, usageCount: null, gdpPerWorkingAgeCapita: null });
    }
    const entry = countryPivot.get(iso3);
    if (variable === "usage_per_capita_index") entry.usageIndex = value;
    else if (variable === "usage_pct") entry.usagePct = value;
    else if (variable === "usage_count") entry.usageCount = value;
    else if (variable === "gdp_per_working_age_capita") entry.gdpPerWorkingAgeCapita = value;
  }

  const countryExposure = Array.from(countryPivot.values()).filter((c) => c.usageIndex !== null);
  for (const supplemental of SUPPLEMENTAL_COUNTRY_EXPOSURE) {
    if (!countryExposure.some((country) => country.iso3 === supplemental.iso3)) {
      countryExposure.push(supplemental);
    }
  }
  countryExposure.sort((a, b) => a.iso3.localeCompare(b.iso3));
  console.log(`  Country exposure: ${countryExposure.length} countries`);

  // ─── Sources ───────────────────────────────────────────────────────────────
  const sources = {
    generatedAt: new Date().toISOString(),
    license: "CC-BY 4.0 (Anthropic Economic Index); CC BY 4.0 (O*NET, USDOL/ETA); Public Domain (BLS)",
    attribution: "Anthropic Economic Index (Anthropic, 2025); O*NET 28.3 (U.S. Department of Labor/ETA); BLS Employment Statistics (U.S. Bureau of Labor Statistics, 2023)",
    sources: [
      {
        name: "Anthropic Economic Index — Job Exposure",
        publisher: "Anthropic",
        year: 2025,
        url: "https://huggingface.co/datasets/Anthropic/EconomicIndex",
        license: "CC-BY 4.0",
        usedFor: "Primary AI-exposure metric (observed_exposure) per SOC occupation — replaces Frey-Osborne 2013",
      },
      {
        name: "Anthropic Economic Index — Wage & Forecast Data",
        publisher: "Anthropic / O*NET / BLS (bundled)",
        year: 2025,
        url: "https://huggingface.co/datasets/Anthropic/EconomicIndex",
        license: "CC-BY 4.0",
        usedFor: "Median salary fallback, job forecast, job zone, bright outlook, sector (JobFamily)",
      },
      {
        name: "BLS Occupational Employment and Wage Statistics (OEWS) via BLS Public Data API (api.bls.gov)",
        publisher: "U.S. Bureau of Labor Statistics",
        year: 2025,
        url: "https://www.bls.gov/oes/",
        license: "Public Domain",
        usedFor: "per-occupation employment + median wage (authoritative; overrides AEI bundle when BLS_API_KEY set)",
      },
      {
        name: "Anthropic Economic Index — BLS Employment May 2023",
        publisher: "Anthropic / BLS (bundled)",
        year: 2023,
        url: "https://huggingface.co/datasets/Anthropic/EconomicIndex",
        license: "CC-BY 4.0 (derived); BLS original is public domain",
        usedFor: "Employment totals by occupation (legacy fallback — superseded by OEWS API when key is set)",
      },
      {
        name: "Anthropic Economic Index — Country AI Adoption (Aug 2025)",
        publisher: "Anthropic",
        year: 2025,
        url: "https://huggingface.co/datasets/Anthropic/EconomicIndex",
        license: "CC-BY 4.0",
        usedFor: "Per-country AI usage index, usage %, usage count, GDP per working-age capita",
      },
      {
        name: "World Bank Open Data — China GDP and Working-Age Population",
        publisher: "World Bank",
        year: 2024,
        url: "https://data.worldbank.org/country/china",
        license: "CC BY 4.0",
        usedFor: "Supplemental China GDP per working-age capita when Anthropic country usage metrics are not reported",
      },
      {
        name: "Eurostat — Artificial intelligence by size class of enterprise",
        publisher: "Eurostat",
        year: 2024,
        url: "https://ec.europa.eu/eurostat/databrowser/view/isoc_eb_ai/default/table?lang=en",
        license: "Eurostat reuse policy",
        usedFor: "Supplemental multi-country enterprise AI adoption rate for European reporting countries",
      },
      {
        name: "OECD ICT Access and Usage Database",
        publisher: "OECD",
        year: 2025,
        url: "https://data-explorer.oecd.org/",
        license: "OECD terms",
        usedFor: "Supplemental enterprise AI adoption and individual generative-AI usage rates by reporting country",
      },
      {
        name: "U.S. Census Annual Business Survey — Technology Characteristics of Businesses",
        publisher: "U.S. Census Bureau",
        year: 2018,
        url: "https://api.census.gov/data/2018/abstcb.html",
        license: "Public Domain",
        usedFor: "Supplemental U.S. employer-firm artificial-intelligence total-use counts and percentages",
      },
      {
        name: "CNNIC Generative AI Application Development Report summary",
        publisher: "CNNIC / Xinhua / State Council of the People's Republic of China",
        year: 2025,
        url: "https://english.www.gov.cn/archive/statistics/202510/18/content_WS68f30556c6d00ca5f9a06e05.html",
        license: "Government website terms",
        usedFor: "Supplemental China generative-AI user count, penetration rate, and six-month user growth proxy",
      },
      {
        name: "QuestMobile 2025 AI Application Market Half-Year Report",
        publisher: "QuestMobile",
        year: 2025,
        url: "https://www.questmobile.com.cn/research/report/1952664347667959809/",
        license: "QuestMobile terms",
        usedFor: "Supplemental China AI application MAU, category scale, and token-volume proxy metrics",
      },
      {
        name: "QuestMobile 2025 AI Application Ranking coverage",
        publisher: "Guancha, citing QuestMobile",
        year: 2026,
        url: "https://www.guancha.cn/economy/2026_03_03_808630.shtml",
        license: "Publisher terms",
        usedFor: "Secondary-source China-native AI app MAU figures for Doubao and DeepSeek",
      },
      {
        name: "Hugging Face public model API",
        publisher: "Hugging Face",
        year: 2026,
        url: "https://huggingface.co/docs/hub/api",
        license: "Hugging Face API terms",
        usedFor: "Supplemental open-model download and like-count proxies for Qwen, DeepSeek, Kimi, ChatGLM, and Baichuan",
      },
      {
        name: "GitHub REST API",
        publisher: "GitHub",
        year: 2026,
        url: "https://docs.github.com/rest",
        license: "GitHub API terms",
        usedFor: "Supplemental developer-ecosystem proxy metrics for AI repositories",
      },
      {
        name: "Stack Overflow Annual Developer Survey 2024 — TidyTuesday derived subset",
        publisher: "Stack Overflow / R4DS TidyTuesday",
        year: 2024,
        url: "https://github.com/rfordatascience/tidytuesday/tree/main/data/2024/2024-09-03",
        license: "Open Database License (ODbL) / Stack Overflow survey terms",
        usedFor: "Supplemental developer AI-tool usage, AI sentiment, and respondent-country proxy metrics",
      },
      {
        name: "World Bank Data360 — OECD Artificial Intelligence dataset",
        publisher: "World Bank Data360 / OECD.AI",
        year: 2025,
        url: "https://data360.worldbank.org/en/dataset/OECD_AI",
        license: "World Bank Data360 / OECD terms",
        usedFor: "Supplemental country-level AI research activity proxy from AI publication totals",
      },
      {
        name: "O*NET 28.3 Skills Database",
        publisher: "U.S. Department of Labor / Employment and Training Administration",
        year: 2024,
        url: "https://www.onetcenter.org/database.html",
        license: "CC BY 4.0",
        usedFor: "Top skills (by importance) per SOC occupation",
      },
      {
        name: "IMF Artificial Intelligence Occupational Exposure (AIOE) Index 2024",
        publisher: "International Monetary Fund",
        year: 2024,
        url: "https://www.imf.org/en/Publications/WP/Issues/2024/01/14/Gen-AI-Artificial-Intelligence-and-the-Future-of-Work-542379",
        license: "IMF Working Paper (cited context)",
        usedFor: "Context/validation reference only — not directly loaded",
      },
      {
        name: "OECD Employment Outlook 2023 — AI and the Labour Market",
        publisher: "OECD",
        year: 2023,
        url: "https://doi.org/10.1787/08785bba-en",
        license: "OECD terms (cited context)",
        usedFor: "Context/validation reference only — not directly loaded",
      },
      {
        name: "ILO World Employment and Social Outlook 2025 — Artificial Intelligence",
        publisher: "International Labour Organization",
        year: 2025,
        url: "https://www.ilo.org/publications/major-reports/world-employment-and-social-outlook",
        license: "ILO terms (cited context)",
        usedFor: "Context/validation reference only — not directly loaded",
      },
      {
        name: "Natural Earth / world-atlas@2 — 110m Country Polygons (TopoJSON)",
        publisher: "Natural Earth / Mike Bostock (world-atlas npm package)",
        year: 2023,
        url: "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json",
        license: "Public Domain (Natural Earth); ISC (world-atlas package)",
        usedFor: "World map choropleth geometry — country polygons at 110m resolution, Antarctica dropped; numeric ISO ids mapped to ISO 3166-1 alpha-3 via lukes/ISO-3166-Countries-with-Regional-Codes crosswalk. AEI usageIndex primary choropleth value; proxy context shown for restricted countries (e.g. China).",
      },
      {
        name: "ISO 3166-1 Country Codes Crosswalk (lukes/ISO-3166-Countries-with-Regional-Codes)",
        publisher: "Luke Duncalfe (GitHub)",
        year: 2024,
        url: "https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes",
        license: "Creative Commons Attribution-ShareAlike 4.0",
        usedFor: "Numeric ISO 3166-1 → alpha-3 mapping used to annotate world-atlas country features",
      },
    ],
    note: `automationRisk bands are percentile-calibrated from the aiExposure distribution (${en} occupations): Very High = top ~8% (aiExposure > ${VH_THRESHOLD.toFixed(4)}), High = next ~12% (> ${HIGH_THRESHOLD.toFixed(4)}), Medium = next ~25% (> ${MED_THRESHOLD.toFixed(4)}), Low = remainder (≤ ${MED_THRESHOLD.toFixed(4)}). aiExposure = observed_exposure from Anthropic Economic Index (Claude AI-usage based, not Frey-Osborne 2013). employment: ${blsEnriched ? `real OEWS 2025 figures (${blsEmpUpdated} occupations updated via BLS Public Data API)` : "null — BLS_API_KEY not set; set it and re-run npm run build:data"}. medianSalary: ${blsEnriched ? `OEWS 2025 where available (${blsWageUpdated} updated), AEI-bundled wage otherwise` : "AEI-bundled (BLS_API_KEY not set)"}. growthRate is null (no authoritative per-SOC % growth in AEI files). projectedOpenings from wage_data.JobForecast (BLS-EP annual openings) where > 0. China is included as a supplemental country row with World Bank 2024 GDP per working-age capita; Anthropic Claude.ai usage metrics for China are not reported and remain null. O*NET skills: ` + (onetSkillsFailed ? "FAILED — default skills used" : "successfully loaded"),
  };

  // ─── Write JSON files ──────────────────────────────────────────────────────
  const occupationOut = path.join(DATA_DIR, "occupation-snapshot.json");
  writeFileSync(occupationOut, JSON.stringify(snapshot, null, 2));
  console.log(`\n✓ Written ${occupationOut} (${snapshot.length} occupations)`);

  const countryOut = path.join(DATA_DIR, "country-exposure.json");
  writeFileSync(countryOut, JSON.stringify(countryExposure, null, 2));
  console.log(`✓ Written ${countryOut} (${countryExposure.length} countries)`);

  const sourcesOut = path.join(DATA_DIR, "sources.json");
  writeFileSync(sourcesOut, JSON.stringify(sources, null, 2));
  console.log(`✓ Written ${sourcesOut}`);

  // ─── Sanity check ──────────────────────────────────────────────────────────
  console.log("\n=== SANITY CHECK ===");
  const samples = ["11-2021", "15-1252", "43-9021", "29-1141", "35-3023"];
  for (const code of samples) {
    const o = snapshot.find((x) => x.socCode === code);
    if (o) console.log(`  ${code} ${o.title}: exposure=${o.aiExposure} salary=${o.medianSalary} sector=${o.sector}`);
    else console.log(`  ${code}: NOT FOUND`);
  }

  // ─── World geometry ───────────────────────────────────────────────────────
  await buildWorldGeo({ DATA_DIR, CACHE_DIR });

  console.log("\n=== Done ===");
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
