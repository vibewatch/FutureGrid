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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const CACHE_DIR = path.join(ROOT, ".data-cache");

[DATA_DIR, CACHE_DIR].forEach((d) => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });

const UA = "FutureGrid-data-bot/1.0 (https://github.com/huangyingting/FutureGrid)";
const AEI_BASE = "https://huggingface.co/datasets/Anthropic/EconomicIndex/resolve/main/";
const ONET_ZIP_URL = "https://www.onetcenter.org/dl_files/database/db_28_3_text.zip";

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

function classifyRisk(exposure) {
  if (exposure < 0.3) return "Low";
  if (exposure < 0.6) return "Medium";
  if (exposure < 0.85) return "High";
  return "Very High";
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

    // employment: try bls by title match
    const titleLower = title.toLowerCase();
    const employment = blsTitleMap.get(titleLower) || blsTitleMap.get((wage?.jobName || "").toLowerCase()) || 0;

    // growth: if we have forecast (projected employment %) and current employment, compute growth
    // forecast in wage_data appears to be projected employment or % change — use as-is
    let growthRate = 0;
    if (wage?.forecast && employment > 0) {
      // forecast might be projected total employment (not %)
      // if it's >100 it's likely an employment count, not a percentage
      if (Math.abs(wage.forecast) <= 100) {
        growthRate = wage.forecast;
      } else {
        // projected employment total: compute % change
        growthRate = ((wage.forecast - employment) / employment) * 100;
      }
    } else if (wage?.forecast) {
      growthRate = Math.abs(wage.forecast) <= 100 ? wage.forecast : 0;
    }

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
      employment: Math.round(employment),
      growthRate: Math.round(growthRate * 100) / 100,
      jobZone: wage?.jobZone ?? 0,
      brightOutlook: wage?.bright ?? false,
      skills,
    });
  }

  console.log(`\n  Occupation snapshot: ${snapshot.length} records (skipped ${skippedNoExposure} missing exposure)`);

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
        usedFor: "Median salary, job forecast, job zone, bright outlook, sector (JobFamily)",
      },
      {
        name: "Anthropic Economic Index — BLS Employment May 2023",
        publisher: "Anthropic / BLS (bundled)",
        year: 2023,
        url: "https://huggingface.co/datasets/Anthropic/EconomicIndex",
        license: "CC-BY 4.0 (derived); BLS original is public domain",
        usedFor: "Employment totals by occupation",
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
    ],
    note: "Automation risk bands: Low < 0.30, Medium 0.30–0.60, High 0.60–0.85, Very High > 0.85. aiExposure = observed_exposure from Anthropic Economic Index (Claude AI-usage based, not Frey-Osborne 2013). O*NET skills are best-effort: " + (onetSkillsFailed ? "FAILED — default skills used" : "successfully loaded"),
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
  console.log("\n=== Done ===");
}

main().catch((err) => { console.error("FATAL:", err); process.exit(1); });
