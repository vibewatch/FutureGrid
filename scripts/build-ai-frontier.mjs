#!/usr/bin/env node
/**
 * Fetch and process Epoch AI "Notable AI Models" CSV to build AI Frontier
 * compute/cost/power trend data for the FutureGrid AI Frontier page.
 *
 * Source:       https://epoch.ai/data/ai-models  (landing page)
 * Download URL: https://epoch.ai/data/notable_ai_models.csv
 * License:      CC BY 4.0
 * Docs:         https://epoch.ai/data/ai-models-documentation
 *
 * KEY METHODOLOGY DECISIONS (see docs/frontier.md for full rationale):
 *
 * 1. Two data tiers:
 *    • catalogAll  — all rows with a valid YYYY-MM-DD publication date.
 *      Used for org/country tracked-output leaderboards so labs without
 *      compute estimates are not silently excluded.
 *    • computeKnown ("models" array) — catalogAll filtered to rows that
 *      ALSO have a numeric Training compute (FLOP).  Used for compute /
 *      cost / power scaling trend views only.
 *
 * 2. Epoch AI's "Frontier model" flag marks models in the top 10 by
 *    estimated training compute at time of release.  It is a historical
 *    compute-scale indicator, not a general capability or impact signal.
 *    frontierCount is derived from computeKnown rows only (frontier=True
 *    requires a compute estimate by definition).
 *
 * 3. Leaderboard sort keys:
 *    • orgLeaderboard  — sorted by full-catalog model count descending.
 *    • countryLeaderboard — sorted by recentCount (full-catalog models
 *      published within the 3-year recent window) descending.  This
 *      reflects current tracked-output activity better than historical
 *      frontier compute counts.
 *
 * 4. Multi-country models are co-attributed to every participating country;
 *    counts are not deduplicated across countries.
 *
 * 5. Google, DeepMind, Google Brain, Google Research, and Google DeepMind
 *    are preserved as distinct source entities exactly as Epoch AI records
 *    them.  No editorial merger is applied.
 *
 * 6. openWeightsCount derives from Epoch AI's "Open model weights?" column.
 *    It is a proxy for tracked open-release activity — not downloads,
 *    adoption, quality, or societal impact.
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { deriveMeta } from "./lib/meta.mjs";
import { validateAIFrontier } from "./lib/validate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const OUTPUT_FILE = path.join(DATA_DIR, "ai-frontier.json");
const CSV_URL = "https://epoch.ai/data/notable_ai_models.csv";
const SOURCE_URL = "https://epoch.ai/data/ai-models";
const SOURCE_DOCS_URL = "https://epoch.ai/data/ai-models-documentation";
const UA = "FutureGrid/1.0 (+https://github.com) data build";
const GENERATED_AT = new Date().toISOString();
const TODAY = GENERATED_AT.slice(0, 10);
const MODERN_ERA_START = 2010;
/** Recent-window: calendar years to look back from the latest date in the catalog. */
const RECENT_WINDOW_YEARS = 3;

// ── CSV parser: RFC-4180 with quoted commas, newlines, and "" escaped quotes ──

function parseCSV(text) {
  const rows = [];
  let i = text.charCodeAt(0) === 0xfeff ? 1 : 0; // skip BOM
  const len = text.length;

  while (i < len) {
    // skip blank lines between records
    if (text[i] === "\r" || text[i] === "\n") {
      if (text[i] === "\r") i += 1;
      if (i < len && text[i] === "\n") i += 1;
      continue;
    }

    const row = [];
    while (i < len) {
      let field = "";
      if (text[i] === '"') {
        i += 1; // skip opening quote
        while (i < len) {
          if (text[i] === '"') {
            if (i + 1 < len && text[i + 1] === '"') {
              field += '"'; // "" → single "
              i += 2;
            } else {
              i += 1; // closing quote
              break;
            }
          } else {
            field += text[i];
            i += 1;
          }
        }
      } else {
        while (i < len && text[i] !== "," && text[i] !== "\n" && text[i] !== "\r") {
          field += text[i];
          i += 1;
        }
      }
      row.push(field);
      if (i < len && text[i] === ",") {
        i += 1;
        continue;
      }
      break;
    }
    if (i < len && text[i] === "\r") i += 1;
    if (i < len && text[i] === "\n") i += 1;
    rows.push(row);
  }
  return rows;
}

function csvObjects(text) {
  const rows = parseCSV(text);
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((row) =>
    Object.fromEntries(headers.map((h, idx) => [h, row[idx] ?? ""])),
  );
}

// ── Number and date helpers ───────────────────────────────────────────────────

function parseNum(value) {
  if (value == null || value === "") return null;
  const s = String(value).replace(/,/g, "").trim();
  if (!s || s === "N/A" || s === "n/a" || s === "-" || s === "?") return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function round(value, digits) {
  if (value == null || !Number.isFinite(value)) return null;
  const f = Math.pow(10, digits);
  return Math.round(value * f) / f;
}

function toDecimalYear(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const y = d.getUTCFullYear();
  const yearStart = Date.UTC(y, 0, 1);
  const yearEnd = Date.UTC(y + 1, 0, 1);
  return y + (d.getTime() - yearStart) / (yearEnd - yearStart);
}

function median(values) {
  if (!values || values.length === 0) return null;
  const sorted = values.slice().sort(function (a, b) { return a - b; });
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// ── Country normalization helper ──────────────────────────────────────────────

/** Canonical short-display names for verbose country strings. */
const COUNTRY_SHORT_MAP = {
  "United States of America": "United States",
  "United Kingdom of Great Britain and Northern Ireland": "United Kingdom",
  "Korea (Republic of)": "South Korea",
  "Korea, Republic of": "South Korea",
  "Korea, Democratic People's Republic of": "North Korea",
  "Russian Federation": "Russia",
  "Iran (Islamic Republic of)": "Iran",
  "Iran, Islamic Republic of": "Iran",
  "Taiwan, Province of China": "Taiwan",
  "United Arab Emirates": "UAE",
  "Bolivia, Plurinational State of": "Bolivia",
  "Venezuela, Bolivarian Republic of": "Venezuela",
  "Tanzania, United Republic of": "Tanzania",
  "Moldova, Republic of": "Moldova",
  "Micronesia, Federated States of": "Micronesia",
};

/**
 * ISO country names that contain a comma as part of the name itself.
 * These must be shielded before splitting a comma-separated multi-country value.
 */
const COMMA_ISO_NAMES = [
  "Taiwan, Province of China",
  "Korea, Republic of",
  "Korea, Democratic People's Republic of",
  "Bolivia, Plurinational State of",
  "Venezuela, Bolivarian Republic of",
  "Tanzania, United Republic of",
  "Iran, Islamic Republic of",
  "Moldova, Republic of",
  "Micronesia, Federated States of",
];

/** Sentinel used to temporarily hide commas inside ISO names during splitting. */
const COMMA_PLACEHOLDER = "\uFFFE";

/**
 * Takes a raw "Country (of organization)" CSV value (may be comma-separated
 * repeated or multi-value) and returns a de-duplicated, order-preserving array
 * of trimmed non-empty country names, normalised through COUNTRY_SHORT_MAP.
 * ISO names that contain a comma (e.g. "Korea, Republic of") are protected
 * from fragmentation before the comma-split.
 * E.g. "United States of America,United States of America" -> ["United States"]
 *      "United States of America,France"                  -> ["United States","France"]
 *      "Korea, Republic of,China"                         -> ["South Korea","China"]
 *      ""                                                  -> []
 */
function normalizeCountries(raw) {
  if (!raw) return [];

  // Shield known ISO names-with-commas so they survive the split below
  let s = raw;
  for (let i = 0; i < COMMA_ISO_NAMES.length; i++) {
    const isoName = COMMA_ISO_NAMES[i];
    s = s.split(isoName).join(isoName.split(",").join(COMMA_PLACEHOLDER));
  }

  const seen = new Set();
  const result = [];
  const parts = s.split(",");
  for (let i = 0; i < parts.length; i++) {
    // Restore shielded commas, then fold through short-name map
    const rawName = parts[i].trim().split(COMMA_PLACEHOLDER).join(",");
    const name = COUNTRY_SHORT_MAP[rawName] || rawName;
    if (name && !seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

// ── OLS regression: y = intercept + slope * x ────────────────────────────────

function olsRegression(points) {
  const n = points.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let k = 0; k < n; k++) {
    const x = points[k].x;
    const y = points[k].y;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let k = 0; k < n; k++) {
    const y = points[k].y;
    const yHat = intercept + slope * points[k].x;
    ssTot += (y - meanY) * (y - meanY);
    ssRes += (y - yHat) * (y - yHat);
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  const doublingTimeMonths = slope > 0 ? 12 * Math.log10(2) / slope : null;
  return { slope, intercept, r2, doublingTimeMonths };
}

function buildTrendStats(models) {
  const pts = models.map(function (m) { return { x: m.decimalYear, y: m.log10Compute }; });
  const reg = olsRegression(pts);
  if (!reg) return null;
  const years = models.map(function (m) { return m.year; });
  return {
    slopeLog10PerYear: round(reg.slope, 4),
    intercept: round(reg.intercept, 4),
    r2: round(reg.r2, 4),
    doublingTimeMonths: reg.doublingTimeMonths != null ? round(reg.doublingTimeMonths, 1) : null,
    startYear: Math.min.apply(null, years),
    endYear: Math.max.apply(null, years),
    n: models.length,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Building AI Frontier compute data ===");

  let csvText;
  try {
    console.log("Fetching " + CSV_URL + " ...");
    const res = await fetch(CSV_URL, {
      headers: { "User-Agent": UA, Accept: "text/csv,*/*" },
    });
    if (!res.ok) throw new Error("HTTP " + res.status + " from " + CSV_URL);
    csvText = await res.text();
    console.log("  fetched " + (csvText.length / 1024).toFixed(0) + "KB");
  } catch (err) {
    if (existsSync(OUTPUT_FILE)) {
      console.warn("WARN: Fetch failed (" + err.message + "); keeping existing " + OUTPUT_FILE);
      return;
    }
    console.error("ERROR: " + err.message);
    process.exit(1);
  }

  const rows = csvObjects(csvText);
  console.log("  parsed " + rows.length + " data rows");

  // ── Parse + classify rows ──────────────────────────────────────────────────
  //
  // Two output tiers:
  //   catalogAll — every row with a valid YYYY-MM-DD publication date.
  //                Used for org/country tracked-output leaderboards.
  //   parsed     — catalogAll filtered further to rows that also have a
  //                positive Training compute (FLOP) estimate.
  //                Used for compute/cost/power scaling trend views.
  //
  const catalogAll = [];   // full dated catalog (any compute status)
  const parsed = [];       // compute-known subset
  let withCompute = 0, withComputeAndDate = 0, withPower = 0, withCost = 0, withOpenWeights = 0;
  const countrySet = new Set();

  for (let ri = 0; ri < rows.length; ri++) {
    const row = rows[ri];

    const computeRaw = parseNum(row["Training compute (FLOP)"]);
    const costRaw = parseNum(row["Training compute cost (2023 USD)"]);
    const powerRaw = parseNum(row["Training power draw (W)"]);
    const dateStr = String(row["Publication date"] || "").trim();
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    const rawCountry = String(row["Country (of organization)"] || "").trim();
    const countries = normalizeCountries(rawCountry);
    const country = countries.length > 0 ? countries.join(", ") : null;

    const openWeightsStr = String(row["Open model weights?"] || "").trim().toLowerCase();
    const openWeights =
      openWeightsStr === "yes" ? true : openWeightsStr === "no" ? false : null;

    if (computeRaw != null && computeRaw > 0) withCompute += 1;
    if (costRaw != null && costRaw > 0) withCost += 1;
    if (powerRaw != null && powerRaw > 0) withPower += 1;
    if (openWeights === true) withOpenWeights += 1;
    for (let ci = 0; ci < countries.length; ci++) countrySet.add(countries[ci]);

    // catalogAll: rows with a valid publication date (any compute status)
    if (!validDate) continue;

    const yr = parseInt(dateStr.slice(0, 4), 10);
    const dy = toDecimalYear(dateStr);

    const domainsRaw = String(row["Domain"] || "").trim();
    const domains = domainsRaw
      ? domainsRaw.split(",").map(function (d) { return d.trim(); }).filter(Boolean)
      : [];

    const frontierStr = String(row["Frontier model"] || "").trim().toLowerCase();
    const frontier = frontierStr === "true";

    const paramsRaw = parseNum(row["Parameters"]);

    // Lean catalog entry (used for leaderboard aggregation; no compute fields
    // unless compute is known so downstream can still read them as numbers).
    const catalogEntry = {
      name: String(row["Model"] || "").trim(),
      organization: String(row["Organization"] || "").trim() || "Unknown",
      orgCategory: String(row["Organization categorization"] || "").trim() || null,
      country: country,
      countries: countries,
      date: dateStr,
      year: yr,
      domains: domains,
      openWeights: openWeights,
      accessibility: String(row["Model accessibility"] || "").trim() || null,
      frontier: frontier,
      hasCompute: computeRaw != null && computeRaw > 0,
    };
    catalogAll.push(catalogEntry);

    // models array: ONLY rows with numeric compute AND valid date
    if (computeRaw == null || computeRaw <= 0) continue;
    withComputeAndDate += 1;

    // openWeights/frontier/accessibility already extracted above.
    // Re-read for clarity in the compute-known record (avoids referencing catalogEntry).
    const openWeightsStrC = String(row["Open model weights?"] || "").trim().toLowerCase();
    const openWeightsC =
      openWeightsStrC === "yes" ? true : openWeightsStrC === "no" ? false : null;
    const frontierStrC = String(row["Frontier model"] || "").trim().toLowerCase();
    const frontierC = frontierStrC === "true";

    parsed.push({
      name: String(row["Model"] || "").trim(),
      organization: String(row["Organization"] || "").trim() || "Unknown",
      orgCategory: String(row["Organization categorization"] || "").trim() || null,
      country: country,
      countries: countries,
      date: dateStr,
      year: yr,
      decimalYear: round(dy, 6),
      domains: domains,
      task: String(row["Task"] || "").trim() || null,
      parameters: paramsRaw != null && paramsRaw > 0 ? paramsRaw : null,
      computeFlop: computeRaw,
      log10Compute: round(Math.log10(computeRaw), 3),
      trainingCostUsd2023: costRaw != null && costRaw > 0 ? costRaw : null,
      powerDrawW: powerRaw != null && powerRaw > 0 ? powerRaw : null,
      frontier: frontierC,
      openWeights: openWeightsC,
      accessibility: String(row["Model accessibility"] || "").trim() || null,
      confidence: String(row["Confidence"] || "").trim() || null,
      link: String(row["Link"] || "").trim() || null,
    });
  }

  // sort ascending by date
  parsed.sort(function (a, b) { return a.date.localeCompare(b.date); });
  catalogAll.sort(function (a, b) { return a.date.localeCompare(b.date); });

  // ── Recent window: RECENT_WINDOW_YEARS back from the latest date in the full catalog ──
  const allDates = catalogAll.map(function (m) { return m.date; }).sort();
  const latestCatalogDate = allDates[allDates.length - 1] || TODAY;
  const latestYear = parseInt(latestCatalogDate.slice(0, 4), 10);
  const latestMonth = latestCatalogDate.slice(5, 7);
  const latestDay = latestCatalogDate.slice(8, 10);
  const recentWindowStart = (latestYear - RECENT_WINDOW_YEARS) + "-" + latestMonth + "-" + latestDay;
  const recentWindowEnd = latestCatalogDate;

  console.log("  full catalog (with date): " + catalogAll.length);
  console.log("  recent window: " + recentWindowStart + " → " + recentWindowEnd);

  // ── Compute trend ──────────────────────────────────────────────────────────
  const modernModels = parsed.filter(function (m) { return m.year >= MODERN_ERA_START; });
  const overallTrend = buildTrendStats(parsed);
  const modernTrend = buildTrendStats(modernModels);

  // frontierByYear: highest compute model per calendar year
  const byYearMap = parsed.reduce(function (map, m) {
    const cur = map.get(m.year);
    if (!cur || m.computeFlop > cur.computeFlop) map.set(m.year, m);
    return map;
  }, new Map());

  const frontierByYear = Array.from(byYearMap.entries())
    .sort(function (a, b) { return a[0] - b[0]; })
    .map(function (entry) {
      const m = entry[1];
      return {
        year: entry[0],
        maxLog10Compute: m.log10Compute,
        computeFlop: m.computeFlop,
        model: m.name,
        organization: m.organization,
      };
    });

  // ── Cost trend ─────────────────────────────────────────────────────────────
  const costByYearMap = parsed.reduce(function (map, m) {
    if (m.trainingCostUsd2023 == null) return map;
    const arr = map.get(m.year) || [];
    arr.push(m);
    map.set(m.year, arr);
    return map;
  }, new Map());

  const costTrend = Array.from(costByYearMap.entries())
    .sort(function (a, b) { return a[0] - b[0]; })
    .map(function (entry) {
      const year = entry[0];
      const models = entry[1];
      const costs = models.map(function (m) { return m.trainingCostUsd2023; });
      const maxCost = Math.max.apply(null, costs);
      const topModel = models.reduce(function (best, m) {
        return m.trainingCostUsd2023 > best.trainingCostUsd2023 ? m : best;
      }, models[0]);
      return {
        year: year,
        n: models.length,
        medianCostUsd2023: median(costs),
        maxCostUsd2023: maxCost,
        topModel: topModel ? topModel.name : "",
      };
    });

  // ── Power trend ────────────────────────────────────────────────────────────
  const powerByYearMap = parsed.reduce(function (map, m) {
    if (m.powerDrawW == null) return map;
    const arr = map.get(m.year) || [];
    arr.push(m);
    map.set(m.year, arr);
    return map;
  }, new Map());

  const powerTrend = Array.from(powerByYearMap.entries())
    .sort(function (a, b) { return a[0] - b[0]; })
    .map(function (entry) {
      const year = entry[0];
      const models = entry[1];
      const powers = models.map(function (m) { return m.powerDrawW; });
      return {
        year: year,
        n: models.length,
        medianPowerW: median(powers),
        maxPowerW: Math.max.apply(null, powers),
      };
    });

  // ── Org leaderboard — built from catalogAll (full dated catalog) ──────────
  //
  // Multi-metric fields per org:
  //   modelCount        — full catalog count (all rows with valid date)
  //   computeKnownCount — rows in compute-known subset
  //   frontierCount     — rows with frontier=True (always a subset of computeKnown)
  //   recentCount       — full catalog rows within the recent window
  //   openWeightsCount  — full catalog rows with confirmed open weights
  //
  const orgCatalogMap = catalogAll.reduce(function (map, m) {
    const key = m.organization;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        organization: key,
        orgCategory: null,
        country: null,
        allModels: [],
        computeModels: [], // subset of allModels where hasCompute===true
      };
      map.set(key, entry);
    }
    if (entry.orgCategory === null && m.orgCategory !== null) entry.orgCategory = m.orgCategory;
    if (entry.country === null && m.country !== null) entry.country = m.country;
    entry.allModels.push(m);
    if (m.hasCompute) entry.computeModels.push(m);
    return map;
  }, new Map());

  // For maxComputeFlop and medianLog10Compute we still need the compute-known data
  const parsedByOrg = parsed.reduce(function (map, m) {
    const arr = map.get(m.organization) || [];
    arr.push(m);
    map.set(m.organization, arr);
    return map;
  }, new Map());

  const orgLeaderboard = Array.from(orgCatalogMap.values())
    .filter(function (entry) { return entry.organization && entry.organization !== "Unknown"; })
    .map(function (entry) {
      const allMods = entry.allModels;
      const computeMods = parsedByOrg.get(entry.organization) || [];
      const frontierCount = computeMods.filter(function (m) { return m.frontier; }).length;
      const recentCount = allMods.filter(function (m) { return m.date >= recentWindowStart; }).length;
      const openWeightsCount = allMods.filter(function (m) { return m.openWeights === true; }).length;
      const maxComputeFlop = computeMods.length > 0
        ? Math.max.apply(null, computeMods.map(function (m) { return m.computeFlop; }))
        : 0;
      const latestDate = allMods
        .map(function (m) { return m.date; })
        .sort(function (a, b) { return b.localeCompare(a); })[0];
      const medLog10 = computeMods.length > 0
        ? median(computeMods.map(function (m) { return m.log10Compute; }))
        : null;
      return {
        organization: entry.organization,
        orgCategory: entry.orgCategory,
        country: entry.country,
        // modelCount = full catalog count (primary leaderboard metric)
        modelCount: allMods.length,
        // computeKnownCount = rows with compute estimates (was old modelCount)
        computeKnownCount: computeMods.length,
        frontierCount: frontierCount,
        recentCount: recentCount,
        openWeightsCount: openWeightsCount,
        maxComputeFlop: maxComputeFlop,
        latestDate: latestDate,
        medianLog10Compute: round(medLog10, 3),
      };
    })
    // Sort by full-catalog model count descending; ties broken alphabetically
    .sort(function (a, b) {
      return b.modelCount - a.modelCount || a.organization.localeCompare(b.organization);
    })
    .slice(0, 20);

  // ── Country leaderboard — built from catalogAll, sorted by recentCount ─────
  //
  // Multi-country models are co-attributed to each participating country.
  // Sort key: recentCount (full-catalog models in the 3-year recent window)
  // so the default ordering reflects current tracked-output activity rather
  // than historical compute-scale frontier counts.
  //
  const countryCatalogMap = catalogAll.reduce(function (map, m) {
    for (let ci = 0; ci < m.countries.length; ci++) {
      const cname = m.countries[ci];
      let entry = map.get(cname);
      if (!entry) {
        entry = { country: cname, allModels: [], orgs: new Set() };
        map.set(cname, entry);
      }
      entry.allModels.push(m);
      if (m.organization && m.organization !== "Unknown") entry.orgs.add(m.organization);
    }
    return map;
  }, new Map());

  // For compute-derived fields we still need the compute-known data keyed by country
  const parsedByCountryMap = parsed.reduce(function (map, m) {
    for (let ci = 0; ci < m.countries.length; ci++) {
      const cname = m.countries[ci];
      const arr = map.get(cname) || [];
      arr.push(m);
      map.set(cname, arr);
    }
    return map;
  }, new Map());

  const countryLeaderboard = Array.from(countryCatalogMap.values())
    .map(function (entry) {
      const allMods = entry.allModels;
      const computeMods = parsedByCountryMap.get(entry.country) || [];
      const frontierCount = computeMods.filter(function (m) { return m.frontier; }).length;
      const recentCount = allMods.filter(function (m) { return m.date >= recentWindowStart; }).length;
      const openWeightsCount = allMods.filter(function (m) { return m.openWeights === true; }).length;
      const maxComputeFlop = computeMods.length > 0
        ? Math.max.apply(null, computeMods.map(function (m) { return m.computeFlop; }))
        : 0;
      return {
        country: entry.country,
        countryShort: COUNTRY_SHORT_MAP[entry.country] || entry.country,
        // modelCount = full catalog count
        modelCount: allMods.length,
        // computeKnownCount = rows with compute estimates (was old modelCount)
        computeKnownCount: computeMods.length,
        frontierCount: frontierCount,
        // recentCount is the default sort key — current tracked-output activity
        recentCount: recentCount,
        openWeightsCount: openWeightsCount,
        maxComputeFlop: maxComputeFlop,
        orgCount: entry.orgs.size,
      };
    })
    // Sort by recent activity (full-catalog recent-window count) descending
    .sort(function (a, b) {
      return b.recentCount - a.recentCount
        || b.modelCount - a.modelCount
        || a.country.localeCompare(b.country);
    });

  // ── Accessibility mix ──────────────────────────────────────────────────────
  // Keep accessibilityMix over compute-known subset for backward compat.
  // fullCatalogAccessibilityMix covers the full dated catalog.
  const accessibilityMix = parsed.reduce(
    function (acc, m) {
      if (m.openWeights === true) acc.openWeights += 1;
      else if (m.openWeights === false) acc.closed += 1;
      else acc.unknown += 1;
      return acc;
    },
    { openWeights: 0, closed: 0, unknown: 0 },
  );

  const fullCatalogAccessibilityMix = catalogAll.reduce(
    function (acc, m) {
      if (m.openWeights === true) acc.openWeights += 1;
      else if (m.openWeights === false) acc.closed += 1;
      else acc.unknown += 1;
      return acc;
    },
    { openWeights: 0, closed: 0, unknown: 0 },
  );

  // ── Domain mix ─────────────────────────────────────────────────────────────
  const domainCounts = parsed.reduce(function (map, m) {
    for (let di = 0; di < m.domains.length; di++) {
      const d = m.domains[di];
      map.set(d, (map.get(d) || 0) + 1);
    }
    return map;
  }, new Map());

  const domainMix = Array.from(domainCounts.entries())
    .map(function (entry) { return { domain: entry[0], count: entry[1] }; })
    .sort(function (a, b) { return b.count - a.count || a.domain.localeCompare(b.domain); });

  // ── Assemble output ────────────────────────────────────────────────────────
  const output = {
    generatedAt: GENERATED_AT,
    source: {
      name: "Epoch AI \u2014 Notable AI Models",
      publisher: "Epoch AI",
      url: SOURCE_URL,
      downloadUrl: CSV_URL,
      docsUrl: SOURCE_DOCS_URL,
      license: "CC BY 4.0",
      accessed: TODAY,
      caveat:
        "Training-compute figures are Epoch AI estimates with varying confidence; not all models report compute/cost/power.",
    },
    methodology: {
      computeField: "Training compute (FLOP)",
      doublingTimeMethod: "OLS regression of log10(training compute) on decimal year",
      modernEraStart: MODERN_ERA_START,
      costUnit: "2023 USD",
      notes: "Descriptive historical trends only \u2014 not a forecast.",
      recentWindow: {
        years: RECENT_WINDOW_YEARS,
        start: recentWindowStart,
        end: recentWindowEnd,
      },
    },
    definitions: {
      frontierDefinition:
        "Epoch AI's 'Frontier model' flag marks models in the top 10 by estimated training " +
        "compute at the time of release. It reflects compute-disclosure availability and " +
        "historical compute scale \u2014 not capability, quality, or societal impact. " +
        "frontierCount is derived from compute-known rows only; models without compute " +
        "estimates (including many recent and open-source releases) cannot carry this flag.",
      orgLeaderboardMetric:
        "modelCount = all tracked Epoch AI rows with a valid publication date, regardless " +
        "of compute disclosure. computeKnownCount = rows with training compute estimates. " +
        "frontierCount = compute-known rows flagged as top-10 compute at release. " +
        "recentCount = full-catalog models published within the " + RECENT_WINDOW_YEARS + "-year recent window.",
      countryLeaderboardDefaultSort:
        "Default sort: recentCount (full-catalog models in the recent window) descending. " +
        "This reflects current tracked-output activity. frontierCount is provided for " +
        "historical context but must not be used as a general country ranking.",
      openWeightsMetric:
        "openWeightsCount derives from Epoch AI's 'Open model weights?' column ('Yes' = " +
        "confirmed open weights). A proxy for tracked open-release activity only \u2014 not " +
        "downloads, adoption, quality, or societal impact.",
      multiCountryAttribution:
        "Models attributed to multiple countries are counted once per participating country " +
        "(co-attribution). A single US\u2013UK collaboration increments both country totals.",
      googleEntitiesNote:
        "Google, DeepMind, Google Brain, Google Research, and Google DeepMind are preserved " +
        "as distinct Epoch AI source entities. No editorial merger is applied.",
      coverageNote:
        "Coverage is Epoch AI's 'Notable AI Models' curation \u2014 not an exhaustive " +
        "registry. Labs without compute disclosure and newer open-source releases may be " +
        "underrepresented in the compute-known subset.",
    },
    counts: {
      totalRows: rows.length,
      withDate: catalogAll.length,
      withCompute: withCompute,
      withComputeAndDate: withComputeAndDate,
      withPower: withPower,
      withCost: withCost,
      withOpenWeights: withOpenWeights,
      countries: countrySet.size,
      recentWindowStart: recentWindowStart,
      recentWindowEnd: recentWindowEnd,
      recentWindowCount: catalogAll.filter(function (m) { return m.date >= recentWindowStart; }).length,
    },
    models: parsed,
    aggregates: {
      computeTrend: {
        overall: overallTrend,
        modernEra: modernTrend,
        frontierByYear: frontierByYear,
      },
      costTrend: costTrend,
      powerTrend: powerTrend,
      orgLeaderboard: orgLeaderboard,
      countryLeaderboard: countryLeaderboard,
      // accessibilityMix: compute-known subset (backward-compat; use fullCatalogAccessibilityMix for full coverage)
      accessibilityMix: accessibilityMix,
      // fullCatalogAccessibilityMix: all dated rows (includes non-compute rows)
      fullCatalogAccessibilityMix: fullCatalogAccessibilityMix,
      domainMix: domainMix,
    },
    caveats: [
      "Coverage is not exhaustive; Epoch curates 'notable' models.",
      "Compute estimates carry uncertainty (see Confidence field).",
      "Future-dated entries reflect the source snapshot and are shown as-is.",
      "Descriptive trends, not predictions.",
      "Multi-country collaboration models are co-attributed to each participating country in the country leaderboard.",
      "Epoch AI's 'Frontier model' flag reflects top-10 training compute at release time, not capability or impact.",
      "Org/country model counts use the full dated catalog. Compute-derived metrics (frontierCount, maxComputeFlop) use only the compute-known subset.",
      "openWeightsCount is a proxy for tracked open-release activity only.",
    ],
  };

  output.meta = deriveMeta(output);
  validateAIFrontier(output);
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n");
  console.log("  wrote data/ai-frontier.json");

  // ── Coverage / sanity report ───────────────────────────────────────────────
  const top5Orgs = orgLeaderboard
    .slice(0, 5)
    .map(function (o) { return o.organization + " (" + o.modelCount + " full/" + o.computeKnownCount + " compute/" + o.recentCount + " recent)"; })
    .join(", ");
  const top5Countries = countryLeaderboard
    .slice(0, 5)
    .map(function (c) { return c.countryShort + " (" + c.recentCount + " recent/" + c.modelCount + " full)"; })
    .join(", ");

  console.log("\nCOVERAGE + SANITY");
  console.log("- total rows parsed: " + rows.length);
  console.log("- with valid date (catalogAll): " + catalogAll.length);
  console.log("- with compute (any date): " + withCompute);
  console.log("- with compute + valid date (models array): " + withComputeAndDate);
  console.log("- with cost: " + withCost);
  console.log("- with power draw: " + withPower);
  console.log("- with open weights: " + withOpenWeights);
  console.log("- unique countries (all rows): " + countrySet.size);
  console.log("- recent window: " + recentWindowStart + " to " + recentWindowEnd + " (" + output.counts.recentWindowCount + " models)");
  console.log(
    "- overall trend: slope=" + overallTrend?.slopeLog10PerYear +
    " log10/yr, doublingMonths=" + overallTrend?.doublingTimeMonths +
    ", r\u00B2=" + overallTrend?.r2 +
    ", n=" + overallTrend?.n,
  );
  console.log(
    "- modernEra trend (>=" + MODERN_ERA_START + "): slope=" + modernTrend?.slopeLog10PerYear +
    " log10/yr, doublingMonths=" + modernTrend?.doublingTimeMonths +
    ", r\u00B2=" + modernTrend?.r2 +
    ", n=" + modernTrend?.n,
  );
  console.log("- frontier models (flag=True, compute-known): " + parsed.filter(function (m) { return m.frontier; }).length);
  console.log("- cost trend years: " + costTrend.length + ", power trend years: " + powerTrend.length);
  console.log("- org leaderboard entries: " + orgLeaderboard.length);
  console.log("- country leaderboard entries: " + countryLeaderboard.length);
  console.log("- domain types: " + domainMix.length);
  console.log("- accessibilityMix (compute-known): " + JSON.stringify(accessibilityMix));
  console.log("- fullCatalogAccessibilityMix: " + JSON.stringify(fullCatalogAccessibilityMix));
  console.log("- top 5 orgs (full/compute/recent): " + top5Orgs);
  console.log("- top 5 countries by recentCount: " + top5Countries);
  console.log("\nSPOT CHECKS:");
  const spotOrgs = ["Google", "DeepMind", "Google DeepMind", "OpenAI", "Anthropic", "Meta AI", "xAI", "DeepSeek"];
  for (const orgName of spotOrgs) {
    const o = orgLeaderboard.find(function (e) { return e.organization === orgName; });
    if (o) {
      console.log("  " + orgName + ": modelCount=" + o.modelCount + ", computeKnown=" + o.computeKnownCount + ", frontier=" + o.frontierCount + ", recent=" + o.recentCount + ", ow=" + o.openWeightsCount + ", latest=" + o.latestDate);
    } else {
      console.log("  " + orgName + ": not in top-20 leaderboard");
    }
  }
  const spotCountries = ["United States", "China", "United Kingdom", "France", "South Korea"];
  for (const ctry of spotCountries) {
    const c = countryLeaderboard.find(function (e) { return e.countryShort === ctry; });
    if (c) {
      console.log("  " + ctry + ": modelCount=" + c.modelCount + ", computeKnown=" + c.computeKnownCount + ", frontier=" + c.frontierCount + ", recent=" + c.recentCount + ", ow=" + c.openWeightsCount);
    }
  }
  console.log("\nDone \u2014 data/ai-frontier.json ready.");
}

main().catch(function (err) {
  console.error("ERROR: " + (err.stack || err.message));
  process.exit(1);
});
