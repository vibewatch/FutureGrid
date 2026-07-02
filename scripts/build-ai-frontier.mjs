#!/usr/bin/env node
/**
 * Fetch and process Epoch AI "Notable AI Models" CSV to build AI Frontier
 * compute/cost/power trend data for the FutureGrid AI Frontier page.
 * Source: https://epoch.ai/data/notable_ai_models.csv (CC BY 4.0)
 */

import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const OUTPUT_FILE = path.join(DATA_DIR, "ai-frontier.json");
const CSV_URL = "https://epoch.ai/data/notable_ai_models.csv";
const UA = "FutureGrid/1.0 (+https://github.com) data build";
const GENERATED_AT = new Date().toISOString();
const TODAY = GENERATED_AT.slice(0, 10);
const MODERN_ERA_START = 2010;

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
  const parsed = [];
  let withCompute = 0, withComputeAndDate = 0, withPower = 0, withCost = 0;
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

    if (computeRaw != null && computeRaw > 0) withCompute += 1;
    if (costRaw != null && costRaw > 0) withCost += 1;
    if (powerRaw != null && powerRaw > 0) withPower += 1;
    for (let ci = 0; ci < countries.length; ci++) countrySet.add(countries[ci]);

    // models array: ONLY rows with numeric compute AND valid date
    if (computeRaw == null || computeRaw <= 0 || !validDate) continue;
    withComputeAndDate += 1;

    const dy = toDecimalYear(dateStr);
    const yr = parseInt(dateStr.slice(0, 4), 10);

    const domainsRaw = String(row["Domain"] || "").trim();
    const domains = domainsRaw
      ? domainsRaw.split(",").map(function (d) { return d.trim(); }).filter(Boolean)
      : [];

    const paramsRaw = parseNum(row["Parameters"]);

    const openWeightsStr = String(row["Open model weights?"] || "").trim().toLowerCase();
    const openWeights =
      openWeightsStr === "yes" ? true : openWeightsStr === "no" ? false : null;

    const frontierStr = String(row["Frontier model"] || "").trim().toLowerCase();
    const frontier = frontierStr === "true";

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
      frontier: frontier,
      openWeights: openWeights,
      accessibility: String(row["Model accessibility"] || "").trim() || null,
      confidence: String(row["Confidence"] || "").trim() || null,
      link: String(row["Link"] || "").trim() || null,
    });
  }

  // sort ascending by date
  parsed.sort(function (a, b) { return a.date.localeCompare(b.date); });

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

  // ── Org leaderboard ────────────────────────────────────────────────────────
  const orgMap = parsed.reduce(function (map, m) {
    const key = m.organization;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        organization: key,
        orgCategory: null,
        country: null,
        models: [],
      };
      map.set(key, entry);
    }
    if (entry.orgCategory === null && m.orgCategory !== null) entry.orgCategory = m.orgCategory;
    if (entry.country === null && m.country !== null) entry.country = m.country;
    entry.models.push(m);
    return map;
  }, new Map());

  const orgLeaderboard = Array.from(orgMap.values())
    .filter(function (entry) { return entry.organization && entry.organization !== "Unknown"; })
    .map(function (entry) {
      const models = entry.models;
      const frontierCount = models.filter(function (m) { return m.frontier; }).length;
      const maxComputeFlop = Math.max.apply(null, models.map(function (m) { return m.computeFlop; }));
      const latestDate = models
        .map(function (m) { return m.date; })
        .sort(function (a, b) { return b.localeCompare(a); })[0];
      const medLog10 = median(models.map(function (m) { return m.log10Compute; }));
      return {
        organization: entry.organization,
        orgCategory: entry.orgCategory,
        country: entry.country,
        modelCount: models.length,
        frontierCount: frontierCount,
        maxComputeFlop: maxComputeFlop,
        latestDate: latestDate,
        medianLog10Compute: round(medLog10, 3),
      };
    })
    .sort(function (a, b) {
      return b.modelCount - a.modelCount || a.organization.localeCompare(b.organization);
    })
    .slice(0, 20);

  // ── Country leaderboard (co-attribution over deduped country set) ─────────
  // Multi-country models are credited to EACH participating country.
  const countryMap = parsed.reduce(function (map, m) {
    for (let ci = 0; ci < m.countries.length; ci++) {
      const cname = m.countries[ci];
      let entry = map.get(cname);
      if (!entry) {
        entry = { country: cname, models: [], orgs: new Set() };
        map.set(cname, entry);
      }
      entry.models.push(m);
      if (m.organization && m.organization !== "Unknown") entry.orgs.add(m.organization);
    }
    return map;
  }, new Map());

  const countryLeaderboard = Array.from(countryMap.values())
    .map(function (entry) {
      return {
        country: entry.country,
        countryShort: COUNTRY_SHORT_MAP[entry.country] || entry.country,
        modelCount: entry.models.length,
        frontierCount: entry.models.filter(function (m) { return m.frontier; }).length,
        maxComputeFlop: Math.max.apply(null, entry.models.map(function (m) { return m.computeFlop; })),
        orgCount: entry.orgs.size,
      };
    })
    .sort(function (a, b) {
      return b.modelCount - a.modelCount || a.country.localeCompare(b.country);
    });

  // ── Accessibility mix ──────────────────────────────────────────────────────
  const accessibilityMix = parsed.reduce(
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
      url: "https://epoch.ai/data/notable-ai-models",
      downloadUrl: CSV_URL,
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
    },
    counts: {
      totalRows: rows.length,
      withCompute: withCompute,
      withComputeAndDate: withComputeAndDate,
      withPower: withPower,
      withCost: withCost,
      countries: countrySet.size,
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
      accessibilityMix: accessibilityMix,
      domainMix: domainMix,
    },
    caveats: [
      "Coverage is not exhaustive; Epoch curates 'notable' models.",
      "Compute estimates carry uncertainty (see Confidence field).",
      "Future-dated entries reflect the source snapshot and are shown as-is.",
      "Descriptive trends, not predictions.",
      "Multi-country collaboration models are co-attributed to each participating country in the country leaderboard.",
    ],
  };

  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n");
  console.log("  wrote data/ai-frontier.json");

  // ── Coverage / sanity report ───────────────────────────────────────────────
  const top3Orgs = orgLeaderboard
    .slice(0, 3)
    .map(function (o) { return o.organization + " (" + o.modelCount + ")"; })
    .join(", ");
  const top3Countries = countryLeaderboard
    .slice(0, 3)
    .map(function (c) { return c.countryShort + " (" + c.modelCount + ")"; })
    .join(", ");

  console.log("\nCOVERAGE + SANITY");
  console.log("- total rows parsed: " + rows.length);
  console.log("- with compute (any date): " + withCompute);
  console.log("- with compute + valid date (models array): " + withComputeAndDate);
  console.log("- with cost: " + withCost);
  console.log("- with power draw: " + withPower);
  console.log("- unique countries (all rows): " + countrySet.size);
  console.log(
    "- overall trend: slope=" + overallTrend?.slopeLog10PerYear +
    " log10/yr, doublingMonths=" + overallTrend?.doublingTimeMonths +
    ", r²=" + overallTrend?.r2 +
    ", n=" + overallTrend?.n,
  );
  console.log(
    "- modernEra trend (>=" + MODERN_ERA_START + "): slope=" + modernTrend?.slopeLog10PerYear +
    " log10/yr, doublingMonths=" + modernTrend?.doublingTimeMonths +
    ", r²=" + modernTrend?.r2 +
    ", n=" + modernTrend?.n,
  );
  console.log("- frontier models (flag=True): " + parsed.filter(function (m) { return m.frontier; }).length);
  console.log("- cost trend years: " + costTrend.length + ", power trend years: " + powerTrend.length);
  console.log("- org leaderboard entries: " + orgLeaderboard.length);
  console.log("- country leaderboard entries: " + countryLeaderboard.length);
  console.log("- domain types: " + domainMix.length);
  console.log("- accessibility mix: " + JSON.stringify(accessibilityMix));
  console.log("- top 3 orgs: " + top3Orgs);
  console.log("- top 3 countries: " + top3Countries);
  console.log("\nDone — data/ai-frontier.json ready.");
}

main().catch(function (err) {
  console.error("ERROR: " + (err.stack || err.message));
  process.exit(1);
});
