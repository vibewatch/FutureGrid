#!/usr/bin/env node
/**
 * build-global-metrics.mjs
 * Fetches Microsoft AI Diffusion (AIEI) CSV, (best-effort) IMF AI Preparedness
 * Index, and Oxford Insights Government AI Readiness Index (2023),
 * maps Economy names → ISO-3, and writes data/global-ai-metrics.json.
 *
 * Run: node scripts/build-global-metrics.mjs
 * (or via: npm run build:global-metrics)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
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

const MS_DIFFUSION_URL =
  "https://raw.githubusercontent.com/microsoft/ai-diffusion-report/main/data/AI_Diffusion_Q12026_Update.csv";
const ISO_CROSSWALK_URL =
  "https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json";
// Correct indicator endpoint: AIPI dataset, AI_PI indicator (overall composite score)
// See: https://www.imf.org/external/datamapper/AI_PI@AIPI/ADVEC/EME/LIC
const IMF_AIPI_URL = "https://www.imf.org/external/datamapper/api/v1/AIPI/AI_PI";

// AIPI sub-index endpoints (verified 2026-06-30 via /indicators?dataset=AIPI)
const IMF_AIPI_SUBINDICES = [
  { code: "DI",    field: "digitalInfrastructure", label: "Digital Infrastructure" },
  { code: "HCLMP", field: "humanCapital",          label: "Human Capital & Labor Market Policies" },
  { code: "IEI",   field: "innovation",            label: "Innovation & Economic Integration" },
  { code: "RE",    field: "regulationEthics",      label: "Regulation & Ethics" },
];

// Oxford Insights Government AI Readiness Index 2023 — 193 countries, scale 0–100, CC-BY
// Hosted on openAFRICA (open data mirror of the official Oxford Insights release)
const OXFORD_GAIRI_URL =
  "https://open.africa/dataset/e6551895-bded-4f5a-aca1-b3ed0937efd0/resource/f3f84fa7-6974-42f4-9a12-f637ff8ba6b6/download/2023-ai-readiness-index-public-dataset-global-rankings.csv";

// ─── HTTP helpers ──────────────────────────────────────────────────────────────

function resolveUrl(base, location) {
  if (!location) return base;
  if (location.startsWith("http://") || location.startsWith("https://")) return location;
  try { return new URL(location, base).href; } catch { return new URL(base).origin + location; }
}

function fetchText(url, cacheFile, timeoutMs = 30_000) {
  if (existsSync(cacheFile)) {
    console.log(`  [cache] ${path.relative(ROOT, cacheFile)}`);
    return Promise.resolve(readFileSync(cacheFile, "utf8"));
  }
  console.log(`  [fetch] ${url}`);
  return new Promise((resolve, reject) => {
    const options = { headers: { "User-Agent": UA } };
    function doRequest(u) {
      const proto = u.startsWith("https") ? https : http;
      const req = proto.get(u, options, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode)) {
          return doRequest(resolveUrl(u, res.headers.location));
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${u}`));
          return;
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          writeFileSync(cacheFile, buf);
          resolve(buf.toString("utf8"));
        });
        res.on("error", reject);
      });
      req.on("error", reject);
      req.setTimeout(timeoutMs, () => { req.destroy(new Error(`Timeout fetching ${u}`)); });
    }
    doRequest(url);
  });
}

// ─── CSV parser (handles quoted fields) ────────────────────────────────────────

function parseCSV(text) {
  const rows = [];
  let headers = null;
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let i = 0;

  function parseRow() {
    const fields = [];
    while (i < lines.length && lines[i] !== "\n") {
      if (lines[i] === '"') {
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
    if (row.length < headers.length - 1) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) obj[headers[j]] = row[j] ?? "";
    rows.push(obj);
  }
  return rows;
}

// ─── Name → ISO-3 mapping ──────────────────────────────────────────────────────

// Manual overrides for names that differ between Microsoft CSV and the ISO crosswalk.
// Key: name as it appears in the Microsoft AIEI dataset (trimmed, as-is).
// Value: ISO-3 alpha-3 code.
const NAME_OVERRIDES = {
  // English common names missing from ISO official list
  "United Kingdom": "GBR",
  "Netherlands": "NLD",

  // Americas
  "United States": "USA",
  "Bolivia": "BOL",
  "Bolivia (Plurinational State of)": "BOL",
  "Venezuela": "VEN",
  "Venezuela, RB": "VEN",
  "Venezuela (Bolivarian Republic of)": "VEN",
  "Trinidad & Tobago": "TTO",
  "Trinidad and Tobago": "TTO",

  // Europe
  "Russia": "RUS",
  "Russian Federation": "RUS",
  "Turkey": "TUR",
  "Türkiye": "TUR",
  "Czechia": "CZE",
  "Czech Republic": "CZE",
  "Slovakia": "SVK",
  "North Macedonia": "MKD",
  "Kosovo": "XKX",

  // Asia-Pacific
  "South Korea": "KOR",
  "Korea, Rep.": "KOR",
  "Korea, Republic of": "KOR",
  "Republic of Korea": "KOR",
  "Vietnam": "VNM",
  "Viet Nam": "VNM",
  "Iran": "IRN",
  "Iran, Islamic Republic of": "IRN",
  "Iran, Islamic Rep.": "IRN",
  "Hong Kong": "HKG",
  "Hong Kong SAR, China": "HKG",
  "Hong Kong, China": "HKG",
  "Macao SAR, China": "MAC",
  "Macau": "MAC",
  "Taiwan": "TWN",
  "Taiwan, China": "TWN",
  "China (mainland)": "CHN",
  "Laos": "LAO",
  "Lao PDR": "LAO",
  "Lao People's Democratic Republic": "LAO",
  "Myanmar": "MMR",
  "Burma": "MMR",
  "Timor-Leste": "TLS",
  "East Timor": "TLS",
  "Kyrgyzstan": "KGZ",
  "Kyrgyz Republic": "KGZ",

  // Middle East / Africa
  "Egypt": "EGY",
  "Egypt, Arab Rep.": "EGY",
  "Palestinian Territories": "PSE",
  "West Bank and Gaza": "PSE",
  "Palestine, State of": "PSE",
  "Syria": "SYR",
  "Syrian Arab Republic": "SYR",
  "Yemen": "YEM",
  "Yemen, Rep.": "YEM",
  "Libya": "LBY",
  "Tanzania": "TZA",
  "Tanzania, United Republic of": "TZA",
  "Congo, Dem. Rep.": "COD",
  "Congo, Rep.": "COG",
  "Congo (DRC)": "COD",
  "Democratic Republic of the Congo": "COD",
  "Republic of the Congo": "COG",
  "Côte d'Ivoire": "CIV",
  "Cote d'Ivoire": "CIV",
  "Ivory Coast": "CIV",
  "Eswatini": "SWZ",
  "Swaziland": "SWZ",
  "São Tomé and Príncipe": "STP",
  "Sao Tome and Principe": "STP",
  "Cabo Verde": "CPV",
  "Cape Verde": "CPV",
  "Gambia, The": "GMB",
  "The Gambia": "GMB",
  "Gambia": "GMB",
  "Bahamas, The": "BHS",
  "The Bahamas": "BHS",
  "Bahamas": "BHS",

  // Other
  "Micronesia": "FSM",
  "Micronesia, Fed. Sts.": "FSM",
  "Federated States of Micronesia": "FSM",
  "Moldova": "MDA",
  "Republic of Moldova": "MDA",
  "Moldova, Republic of": "MDA",
  "North Korea": "PRK",
  "Korea, Dem. People's Rep.": "PRK",

  // Oxford Insights 2023 specific names
  "United States of America": "USA",
  "United Kingdom of Great Britain and Northern Ireland": "GBR",
  "Iran (Islamic Republic of)": "IRN",
  "Bolivia (Plurinational State of)": "BOL",
  "State of Palestine": "PSE",
  "United Republic of Tanzania": "TZA",
  "Gambia (Republic of The)": "GMB",
  "Guinea Bissau": "GNB",
  "Democratic People's Republic of Korea": "PRK",
};

/** Build a lookup: normalised name → ISO-3. Normalised = trimmed lower-case. */
function buildNameLookup(isoData) {
  const map = new Map();
  for (const [name, iso3] of Object.entries(NAME_OVERRIDES)) {
    map.set(name.toLowerCase().trim(), iso3);
  }
  for (const entry of isoData) {
    const key = (entry.name || "").toLowerCase().trim();
    if (key && !map.has(key)) map.set(key, entry["alpha-3"]);
  }
  return map;
}

/** Strip non-ASCII for fuzzy fallback (handles encoding-corrupted names like Türkiye). */
function asciiOnly(s) {
  return s.replace(/[^\x20-\x7E]/g, "").toLowerCase().trim();
}

/** ASCII-only version of NAME_OVERRIDES for fallback matching. */
function buildAsciiLookup() {
  const map = new Map();
  for (const [name, iso3] of Object.entries(NAME_OVERRIDES)) {
    const key = asciiOnly(name);
    if (key && !map.has(key)) map.set(key, iso3);
  }
  return map;
}

/** Parse a percent string like "16.40%" → 16.4. Returns null if not parseable. */
function parsePct(str) {
  if (!str || typeof str !== "string") return null;
  const v = parseFloat(str.replace("%", "").trim());
  return isNaN(v) ? null : v;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n[GLOBAL-METRICS] Building data/global-ai-metrics.json …");

  // 1. Fetch ISO crosswalk (cached)
  const isoText = await fetchText(
    ISO_CROSSWALK_URL,
    path.join(CACHE_DIR, "iso-crosswalk.json"),
  );
  const isoData = JSON.parse(isoText);
  const nameLookup = buildNameLookup(isoData);
  const asciiLookup = buildAsciiLookup();
  console.log(`  ISO crosswalk: ${isoData.length} entries`);

  // 2. Fetch Microsoft AI Diffusion CSV
  const msCsvText = await fetchText(
    MS_DIFFUSION_URL,
    path.join(CACHE_DIR, "microsoft-ai-diffusion-q12026.csv"),
  );
  const msRows = parseCSV(msCsvText);
  console.log(`  Microsoft AIEI CSV: ${msRows.length} rows`);

  // Detect all three diffusion columns
  const sampleRow = msRows[0] || {};
  const colKeys = Object.keys(sampleRow);
  const h1Col = colKeys.find((k) => /h1 2025/i.test(k));
  const h2Col = colKeys.find((k) => /h2 2025/i.test(k));
  const q1Col = colKeys.find((k) => /q1 2026/i.test(k));
  // Latest column for back-compat diffusion metric
  const diffCol = q1Col || h2Col || colKeys.find((k) => /diffusion/i.test(k));
  console.log(`  Diffusion columns — H1 2025: "${h1Col}", H2 2025: "${h2Col}", Q1 2026: "${q1Col}"`);
  console.log(`  Using latest diffusion column: "${diffCol}"`);

  // Map Economy → ISO-3 and parse all three diffusion periods
  const diffusion = {};
  const diffusionTrend = {};
  const unmatched = [];

  for (const row of msRows) {
    const economy = (row.Economy || "").trim();
    if (!economy) continue;

    const iso3 =
      NAME_OVERRIDES[economy] ||
      nameLookup.get(economy.toLowerCase().trim()) ||
      asciiLookup.get(asciiOnly(economy)) ||
      null;

    if (!iso3) {
      unmatched.push(economy);
      continue;
    }

    // Back-compat: keep latest single value
    const pct = parsePct(row[diffCol]);
    if (pct !== null) {
      diffusion[iso3] = pct;
    }

    // All-three-period trend
    const h1 = h1Col ? parsePct(row[h1Col]) : null;
    const h2 = h2Col ? parsePct(row[h2Col]) : null;
    const q1 = q1Col ? parsePct(row[q1Col]) : null;
    if (h1 !== null || h2 !== null || q1 !== null) {
      diffusionTrend[iso3] = {
        h1_2025: h1 ?? null,
        h2_2025: h2 ?? null,
        q1_2026: q1 ?? null,
      };
    }
  }

  const fullTrendCount = Object.values(diffusionTrend).filter(
    (t) => t.h1_2025 !== null && t.h2_2025 !== null && t.q1_2026 !== null,
  ).length;
  console.log(`  diffusionTrend entries: ${Object.keys(diffusionTrend).length} (${fullTrendCount} with all 3 periods)`);

  console.log(`  Mapped diffusion: ${Object.keys(diffusion).length} countries (latest), ${Object.keys(diffusionTrend).length} trend entries`);
  if (unmatched.length > 0) {
    console.warn(`  Unmatched names (${unmatched.length}): ${unmatched.join(", ")}`);
  } else {
    console.log("  All economy names matched.");
  }

  // Spot-check key countries
  const checks = { CHN: "China", USA: "United States", IND: "India", RUS: "Russia" };
  for (const [iso3, label] of Object.entries(checks)) {
    console.log(`  ${label} (${iso3}): diffusion=${diffusion[iso3] ?? "NOT FOUND"}%`);
  }

  // 3. Best-effort IMF AIPI
  let readiness = null;
  let imfIncluded = false;
  let imfSkipReason = "";

  try {
    const imfText = await fetchText(
      IMF_AIPI_URL,
      path.join(CACHE_DIR, "imf-aipi.json"),
      20_000,
    );
    const imfJson = JSON.parse(imfText);

    // IMF datamapper API response for AIPI/AI_PI endpoint:
    // { values: { AI_PI: { ISO3: { "2023": score } } } }
    const aipiValues =
      imfJson?.values?.AI_PI ||
      imfJson?.values?.AIPI ||
      imfJson?.AI_PI ||
      imfJson?.AIPI ||
      null;
    if (aipiValues && typeof aipiValues === "object") {
      readiness = {};
      for (const [iso3, yearMap] of Object.entries(aipiValues)) {
        if (!yearMap || typeof yearMap !== "object") continue;
        // Pick latest year available
        const years = Object.keys(yearMap)
          .map(Number)
          .filter((y) => !isNaN(y))
          .sort((a, b) => b - a);
        for (const yr of years) {
          const val = yearMap[String(yr)];
          if (val != null && !isNaN(Number(val))) {
            readiness[iso3.toUpperCase()] = Number(val);
            break;
          }
        }
      }
      const cnt = Object.keys(readiness).length;
      console.log(`  IMF AIPI: ${cnt} countries mapped`);
      if (cnt > 0) {
        imfIncluded = true;
      } else {
        imfSkipReason = "IMF AIPI returned 0 parseable values";
        readiness = null;
        console.warn(`  [IMF] Skipped: ${imfSkipReason}`);
      }
    } else {
      imfSkipReason = "IMF AIPI response did not contain expected values.AIPI structure";
      console.warn(`  [IMF] Skipped: ${imfSkipReason}`);
    }
  } catch (err) {
    imfSkipReason = `Fetch/parse error: ${err.message}`;
    console.warn(`  [IMF] Skipped: ${imfSkipReason}`);
  }

  // 4. Best-effort IMF AIPI sub-indices
  let readinessSubIndices = null;
  let subIndicesIncluded = false;

  try {
    // Fetch all four sub-indices in sequence (respect rate limits)
    const subIndexMaps = {};
    for (const { code, field } of IMF_AIPI_SUBINDICES) {
      const url = `https://www.imf.org/external/datamapper/api/v1/AIPI/${code}`;
      const cacheFile = path.join(CACHE_DIR, `imf-aipi-${code.toLowerCase()}.json`);
      const text = await fetchText(url, cacheFile, 20_000);
      const json = JSON.parse(text);
      const values = json?.values?.[code] ?? null;
      if (values && typeof values === "object") {
        subIndexMaps[field] = values;
      }
    }

    const fields = IMF_AIPI_SUBINDICES.map((s) => s.field);
    if (fields.every((f) => subIndexMaps[f])) {
      // Collect all ISO3 keys across sub-indices
      const allIso3 = new Set(
        fields.flatMap((f) => Object.keys(subIndexMaps[f])),
      );
      readinessSubIndices = {};
      for (const iso3 of allIso3) {
        const entry = {};
        for (const { field } of IMF_AIPI_SUBINDICES) {
          const yearMap = subIndexMaps[field][iso3];
          if (!yearMap || typeof yearMap !== "object") {
            entry[field] = null;
            continue;
          }
          const years = Object.keys(yearMap).map(Number).filter((y) => !isNaN(y)).sort((a, b) => b - a);
          let val = null;
          for (const yr of years) {
            const v = yearMap[String(yr)];
            if (v != null && !isNaN(Number(v))) { val = Number(v); break; }
          }
          entry[field] = val;
        }
        readinessSubIndices[iso3.toUpperCase()] = entry;
      }
      const cnt = Object.keys(readinessSubIndices).length;
      console.log(`  IMF AIPI sub-indices: ${cnt} countries`);
      if (cnt > 0) {
        subIndicesIncluded = true;
      } else {
        readinessSubIndices = null;
        console.warn("  [IMF sub-indices] Skipped: 0 parseable entries");
      }
    } else {
      console.warn("  [IMF sub-indices] Skipped: one or more sub-index fetches returned no data");
    }
  } catch (err) {
    console.warn(`  [IMF sub-indices] Skipped: ${err.message}`);
  }

  // 5. Best-effort Oxford Insights Government AI Readiness Index 2023
  let governmentReadiness = null;
  let oxfordIncluded = false;
  let oxfordSkipReason = "";

  try {
    const oxfordText = await fetchText(
      OXFORD_GAIRI_URL,
      path.join(CACHE_DIR, "oxford-gairi-2023.csv"),
      20_000,
    );
    const oxfordRows = parseCSV(oxfordText);
    if (oxfordRows.length > 0) {
      governmentReadiness = {};
      const oxfordUnmatched = [];
      for (const row of oxfordRows) {
        const country = (row.Country || row.country || "").trim();
        if (!country) continue;
        const rawScore = row.Total || row.total || "";
        const score = parseFloat(rawScore);
        if (isNaN(score)) continue;
        const iso3 = nameLookup.get(country.toLowerCase()) || nameLookup.get(asciiOnly(country));
        if (iso3) {
          governmentReadiness[iso3] = Math.round(score * 100) / 100;
        } else {
          oxfordUnmatched.push(country);
        }
      }
      const cnt = Object.keys(governmentReadiness).length;
      console.log(`  Oxford GAIRI 2023: ${cnt} countries mapped`);
      if (oxfordUnmatched.length > 0) {
        console.warn(`  Oxford unmatched (${oxfordUnmatched.length}): ${oxfordUnmatched.join(", ")}`);
      }
      if (cnt >= 100) {
        oxfordIncluded = true;
      } else {
        oxfordSkipReason = `Oxford GAIRI mapped only ${cnt} countries (expected ≥100)`;
        governmentReadiness = null;
        console.warn(`  [Oxford] Skipped: ${oxfordSkipReason}`);
      }
    } else {
      oxfordSkipReason = "Oxford GAIRI CSV parsed 0 rows";
      console.warn(`  [Oxford] Skipped: ${oxfordSkipReason}`);
    }
  } catch (err) {
    oxfordSkipReason = `Fetch/parse error: ${err.message}`;
    console.warn(`  [Oxford] Skipped: ${oxfordSkipReason}`);
  }

  // 6. Write output
  const sources = [
    {
      id: "microsoft-aiei",
      name: "Microsoft AI Diffusion Report (AI Economic Impact & Insights)",
      publisher: "Microsoft",
      year: 2026,
      url: "https://github.com/microsoft/ai-diffusion-report",
      license: "MIT",
      column: diffCol,
      periods: ["H1 2025 AI Diffusion", "H2 2025 AI Diffusion", "Q1 2026 AI Diffusion"],
      metric: "diffusionPct",
      description:
        "% of working-age population using generative AI across three periods: H1 2025, H2 2025, Q1 2026. " +
        "147 economies including China. diffusion keeps Q1 2026 (latest) for back-compat; " +
        "diffusionTrend retains all three periods for momentum/fastest-rising analysis. " +
        "COMPARABILITY CAVEAT: this is a behavior-based survey %; " +
        "do NOT merge with Claude.ai usageIndex (observed API sessions, different denominator). " +
        "Western telemetry may undercount domestic apps (e.g. Doubao, Kimi) in China — " +
        "CNNIC reports ~43% genAI penetration vs Microsoft's 16.4%.",
    },
  ];

  const readinessMeta = {
    id: "imf-aipi",
    name: "IMF AI Preparedness Index (AIPI) — overall composite score (AI_PI)",
    publisher: "International Monetary Fund",
    year: 2023,
    url: "https://www.imf.org/external/datamapper/AI_PI@AIPI/ADVEC/EME/LIC",
    apiEndpoint: "https://www.imf.org/external/datamapper/api/v1/AIPI/AI_PI",
    license: "IMF terms (https://www.imf.org/external/terms.htm)",
    metric: "aiReadiness",
    scaleMin: 0,
    scaleMax: 1,
    included: imfIncluded,
    description:
      "Overall AI preparedness composite score 0–1 for 178 countries (2023 vintage). " +
      "Measures institutional/infrastructure readiness capacity across four pillars: " +
      "digital infrastructure, AI regulation & ethics, AI innovation & capacity, human capital. " +
      "COMPARABILITY CAVEAT: capacity/infrastructure readiness metric, NOT user behavior %. " +
      "Do NOT merge or average with diffusionPct or usageIndex — different denominators.",
    ...(imfIncluded ? {} : { skipReason: imfSkipReason }),
  };
  sources.push(readinessMeta);

  const readinessSubIndexMeta = {
    id: "imf-aipi-subindices",
    name: "IMF AI Preparedness Index (AIPI) — sub-indices",
    publisher: "International Monetary Fund",
    year: 2023,
    url: "https://www.imf.org/external/datamapper/AI_PI@AIPI/ADVEC/EME/LIC",
    apiEndpoints: IMF_AIPI_SUBINDICES.map((s) => ({
      code: s.code,
      field: s.field,
      label: s.label,
      url: `https://www.imf.org/external/datamapper/api/v1/AIPI/${s.code}`,
    })),
    license: "IMF terms (https://www.imf.org/external/terms.htm)",
    scaleMin: 0,
    scaleMax: 1,
    included: subIndicesIncluded,
    description:
      "Four AIPI pillar sub-index scores (0–1, 2023 vintage): " +
      "DI=Digital Infrastructure, HCLMP=Human Capital & Labor Market Policies, " +
      "IEI=Innovation & Economic Integration, RE=Regulation & Ethics. " +
      "COMPARABILITY CAVEAT: capacity/infrastructure readiness sub-scores. " +
      "Do NOT merge with diffusionPct or usageIndex.",
  };
  sources.push(readinessSubIndexMeta);

  const oxfordMeta = {
    id: "oxford-gairi-2023",
    name: "Oxford Insights Government AI Readiness Index 2023 — overall composite score",
    publisher: "Oxford Insights",
    year: 2023,
    url: "https://open.africa/dataset/government-ai-readiness-index-2023",
    dataUrl: OXFORD_GAIRI_URL,
    license: "Creative Commons Attribution (CC-BY)",
    metric: "governmentReadiness",
    scaleMin: 0,
    scaleMax: 100,
    included: oxfordIncluded,
    description:
      "Overall government AI readiness composite score 0–100 for 193 countries (2023 edition). " +
      "Three pillars: Government, Technology Sector, Data and Infrastructure. " +
      "China ranks 16th (70.94). Measures government-level capacity and environment for deploying AI, " +
      "NOT user-behaviour or diffusion. " +
      "COMPARABILITY CAVEAT: government readiness score — do NOT average or merge with " +
      "diffusionPct (user behaviour %), usageIndex (API sessions), or aiReadiness (IMF capacity index 0–1).",
    ...(oxfordIncluded ? {} : { skipReason: oxfordSkipReason }),
  };
  sources.push(oxfordMeta);

  const output = {
    generatedAt: new Date().toISOString(),
    sources,
    unmatchedEconomies: unmatched,
    metrics: {
      diffusion: diffusion,
      diffusionTrend: diffusionTrend,
      ...(imfIncluded ? { readiness, readinessMeta } : {}),
      ...(subIndicesIncluded ? { readinessSubIndices, readinessSubIndexMeta } : {}),
      ...(oxfordIncluded ? { governmentReadiness, oxfordMeta } : {}),
    },
  };

  const outPath = path.join(DATA_DIR, "global-ai-metrics.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`\n  ✓ Wrote ${path.relative(ROOT, outPath)}`);
  console.log(`    diffusion countries: ${Object.keys(diffusion).length}`);
  console.log(`    diffusionTrend countries: ${Object.keys(diffusionTrend).length} (${fullTrendCount} with all 3 periods)`);
  console.log(`    China (CHN): diffusion=${diffusion["CHN"] ?? "NOT FOUND"}%, trend=${JSON.stringify(diffusionTrend["CHN"] ?? "NOT FOUND")}`);
  console.log(`    United States (USA): diffusion=${diffusion["USA"] ?? "NOT FOUND"}%`);
  console.log(`    India (IND): diffusion=${diffusion["IND"] ?? "NOT FOUND"}%`);
  console.log(`    IMF readiness included: ${imfIncluded}`);
  if (imfIncluded && readiness) {
    console.log(`    readiness countries: ${Object.keys(readiness).length}`);
    console.log(`    China readiness (CHN): ${readiness["CHN"] ?? "NOT FOUND"}`);
    console.log(`    USA readiness: ${readiness["USA"] ?? "NOT FOUND"}`);
  }
  if (!imfIncluded) console.log(`    IMF skip reason: ${imfSkipReason}`);
  console.log(`    IMF sub-indices included: ${subIndicesIncluded}`);
  if (subIndicesIncluded && readinessSubIndices) {
    console.log(`    sub-indices countries: ${Object.keys(readinessSubIndices).length}`);
    const chnSub = readinessSubIndices["CHN"];
    console.log(`    China sub-indices (CHN): DI=${chnSub?.digitalInfrastructure ?? "N/A"}, HCLMP=${chnSub?.humanCapital ?? "N/A"}, IEI=${chnSub?.innovation ?? "N/A"}, RE=${chnSub?.regulationEthics ?? "N/A"}`);
  }
  console.log(`    Oxford GAIRI included: ${oxfordIncluded}`);
  if (oxfordIncluded && governmentReadiness) {
    console.log(`    governmentReadiness countries: ${Object.keys(governmentReadiness).length}`);
    console.log(`    China governmentReadiness (CHN): ${governmentReadiness["CHN"] ?? "NOT FOUND"}`);
    console.log(`    USA governmentReadiness: ${governmentReadiness["USA"] ?? "NOT FOUND"}`);
  }
  if (!oxfordIncluded) console.log(`    Oxford skip reason: ${oxfordSkipReason}`);
  console.log(`    Unmatched names: ${unmatched.length}`);
  if (unmatched.length > 0) console.log(`    Unmatched: ${unmatched.join(", ")}`);
}

main().catch((err) => {
  console.error("\n[GLOBAL-METRICS] Fatal error:", err);
  process.exit(1);
});
