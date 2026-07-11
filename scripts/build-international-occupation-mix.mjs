#!/usr/bin/env node
/**
 * scripts/build-international-occupation-mix.mjs
 *
 * Fetches ILOSTAT employment-by-occupation data (indicator EMP_TEMP_SEX_OCU_NB,
 * dataflow DF_EMP_TEMP_SEX_OCU_NB) for a seed set of countries and produces
 * data/international-occupation-mix.json.
 *
 * Classification: ISCO-08 major groups 1–9, total sex (SEX_T), annual frequency.
 * Endpoint: https://rplumber.ilo.org/data/indicator/?id=EMP_TEMP_SEX_OCU_NB_A&lang=en&format=.csv
 * License: CC BY 4.0 (ILO)
 *
 * Country gates (applied, not hardcoded):
 *   - Must have ISCO-08 data (not ISCO-88 or skill-level only)
 *   - Latest qualifying year must be within 3 years of the dataset's latest year
 *   - Exactly 9 ISCO-08 groups (1–9) must be individually reported
 *   - Covered group sum (1–9) / TOTAL >= 98%
 *   - No imputed observations (status "I" excluded; "B" = break-in-series is accepted)
 *   - Valid positive TOTAL
 *
 * Builder fails loudly (non-zero exit) if fewer than 4 countries pass gates.
 * Calls validateInternationalOccupationMix() before writeFileSync.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildMeta } from "./lib/meta.mjs";
import { validateInternationalOccupationMix } from "./lib/validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const OUTPUT_FILE = join(DATA_DIR, "international-occupation-mix.json");

// ─── Constants ────────────────────────────────────────────────────────────────

const ENDPOINT =
  "https://rplumber.ilo.org/data/indicator/?id=EMP_TEMP_SEX_OCU_NB_A&lang=en&format=.csv";

const SOURCE = {
  name: "ILOSTAT — Employment by sex and occupation (thousands) — Annual",
  indicator: "EMP_TEMP_SEX_OCU_NB",
  dataflow: "DF_EMP_TEMP_SEX_OCU_NB",
  accessEndpoint: ENDPOINT,
  license: "CC BY 4.0",
  licenseUrl: "https://www.ilo.org/global/copyright/lang--en/index.htm",
  publisher: "International Labour Organization (ILO)",
  publisherUrl: "https://ilostat.ilo.org/",
};

/** Seed universe: countries to evaluate for inclusion/exclusion. */
const SEED_COUNTRIES = [
  "AUS", "DEU", "ESP", "FRA", "GBR",
  "ITA", "KOR", "NLD", "USA",
  "CAN", "JPN", // explicit exclusion candidates
];

const COUNTRY_NAMES = {
  AUS: "Australia",
  DEU: "Germany",
  ESP: "Spain",
  FRA: "France",
  GBR: "United Kingdom",
  ITA: "Italy",
  KOR: "Republic of Korea",
  NLD: "Netherlands",
  USA: "United States of America",
  CAN: "Canada",
  JPN: "Japan",
};

/** ISCO-08 major group numbers (1–9 only; 0 = armed forces excluded from mix). */
const ISCO08_GROUPS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const ISCO08_LABELS = {
  1: "Managers",
  2: "Professionals",
  3: "Technicians and associate professionals",
  4: "Clerical support workers",
  5: "Service and sales workers",
  6: "Skilled agricultural, forestry and fishery workers",
  7: "Craft and related trades workers",
  8: "Plant and machine operators, and assemblers",
  9: "Elementary occupations",
};

/** Observation status codes that indicate imputed data (exclude these rows). */
const IMPUTED_STATUSES = new Set(["I"]);

/** Minimum share of total covered by groups 1–9 combined. */
const MIN_COVERAGE_RATIO = 0.98;

/** Qualifying window: latest year must be within this many years of dataset latest. */
const WITHIN_YEARS = 3;

/** Minimum included countries before build fails. */
const MIN_INCLUDED = 4;

// ─── CSV parser ───────────────────────────────────────────────────────────────

/**
 * Parse a single RFC-4180 CSV line, handling both quoted and unquoted fields.
 * The ILO CSV mixes quoted string fields with unquoted numeric fields.
 */
function parseCSVLine(line) {
  const fields = [];
  let inQuote = false;
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === "," && !inQuote) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

// ─── Fetch + parse ────────────────────────────────────────────────────────────

async function fetchCSV() {
  console.log(`[build-international-occupation-mix] Fetching ${ENDPOINT}`);
  const res = await fetch(ENDPOINT, {
    headers: { "Accept-Language": "en" },
  });
  if (!res.ok) {
    throw new Error(
      `[build-international-occupation-mix] HTTP ${res.status} ${res.statusText} from ${ENDPOINT}`
    );
  }
  const text = await res.text();
  if (!text || text.trim().length === 0) {
    throw new Error(
      "[build-international-occupation-mix] Empty response from endpoint"
    );
  }
  return text;
}

/**
 * Parse ILO CSV into per-country per-year ISCO-08 group data.
 * Returns { countryData, maxYear, totalRowCount }.
 */
function parseILOCSV(csvText) {
  const lines = csvText.split("\n");
  if (lines.length < 2) {
    throw new Error(
      "[build-international-occupation-mix] CSV has fewer than 2 lines — parse failed"
    );
  }

  const header = parseCSVLine(lines[0]);
  const CI = {};
  header.forEach((h, i) => {
    CI[h] = i;
  });

  const REQUIRED_COLS = [
    "ref_area", "sex", "classif1", "time",
    "obs_value", "obs_status", "source", "note_indicator",
  ];
  for (const col of REQUIRED_COLS) {
    if (!(col in CI)) {
      throw new Error(
        `[build-international-occupation-mix] Missing expected column "${col}" in CSV header`
      );
    }
  }

  const countryData = {};
  for (const c of SEED_COUNTRIES) countryData[c] = {};

  let maxYear = 0;
  let totalRowCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;

    const parts = parseCSVLine(raw);
    const ref = parts[CI["ref_area"]];
    if (!SEED_COUNTRIES.includes(ref)) continue;

    const sex = parts[CI["sex"]];
    if (sex !== "SEX_T") continue;

    const classif = parts[CI["classif1"]];
    if (!classif.startsWith("OCU_ISCO08_")) continue;

    const yr = parseInt(parts[CI["time"]], 10);
    if (isNaN(yr)) continue;

    const obsValueRaw = parts[CI["obs_value"]];
    const obsValue = parseFloat(obsValueRaw);
    // Skip rows with no reported value
    if (!Number.isFinite(obsValue)) continue;

    const obsStatus = parts[CI["obs_status"]] || "";
    const src = parts[CI["source"]] || "";
    const noteInd = parts[CI["note_indicator"]] || "";

    if (!countryData[ref][yr]) {
      countryData[ref][yr] = {
        groups: {},
        src,
        statuses: new Set(),
        noteInds: new Set(),
      };
    }

    const group = classif.replace("OCU_ISCO08_", "");
    countryData[ref][yr].groups[group] = obsValue;
    if (obsStatus) countryData[ref][yr].statuses.add(obsStatus);
    if (noteInd) {
      for (const n of noteInd.split("_")) {
        if (n) countryData[ref][yr].noteInds.add(n);
      }
    }

    if (yr > maxYear) maxYear = yr;
    totalRowCount++;
  }

  if (totalRowCount === 0) {
    throw new Error(
      "[build-international-occupation-mix] Zero rows parsed from CSV — check endpoint response"
    );
  }

  return { countryData, maxYear, totalRowCount };
}

// ─── Country gate evaluation ──────────────────────────────────────────────────

/**
 * Find the best qualifying year for a country and evaluate all gates.
 * Returns { pass: true, ... } or { pass: false, reason }.
 */
function evaluateCountry(iso3, yearMap, datasetLatestYear) {
  // Gate 1: any ISCO-08 data at all
  const allYears = Object.keys(yearMap)
    .map(Number)
    .filter((y) => y >= datasetLatestYear - WITHIN_YEARS && y <= datasetLatestYear)
    .sort((a, b) => b - a);

  if (allYears.length === 0) {
    return {
      pass: false,
      reason: `No ISCO-08 data within ${WITHIN_YEARS} years of dataset latest year (${datasetLatestYear})`,
      latestYear: null,
    };
  }

  // Try years newest-first, find the first one that meets all gates
  for (const yr of allYears) {
    const yd = yearMap[yr];

    // Gate 2: no imputed observations
    const hasImputation = [...yd.statuses].some((s) => IMPUTED_STATUSES.has(s));
    if (hasImputation) {
      continue; // try older year
    }

    // Gate 3: all 9 ISCO-08 groups individually reported with positive values
    const presentGroups = ISCO08_GROUPS.filter(
      (g) => Number.isFinite(yd.groups[String(g)]) && yd.groups[String(g)] > 0
    );
    if (presentGroups.length < 9) {
      continue; // try older year
    }

    // Gate 4: valid positive total
    const total = yd.groups["TOTAL"];
    if (!Number.isFinite(total) || total <= 0) {
      continue;
    }

    // Gate 5: covered group sum >= 98% of total
    const groupSum = ISCO08_GROUPS.reduce((s, g) => s + yd.groups[String(g)], 0);
    const coverageRatio = groupSum / total;
    if (coverageRatio < MIN_COVERAGE_RATIO) {
      continue;
    }

    // All gates passed
    return {
      pass: true,
      year: yr,
      total,
      groupSum,
      coverageRatio,
      groups: Object.fromEntries(
        ISCO08_GROUPS.map((g) => [String(g), yd.groups[String(g)]])
      ),
      source: yd.src,
      observationStatuses: [...yd.statuses],
      noteInds: [...yd.noteInds],
    };
  }

  // No qualifying year found — build exclusion reason
  const mostRecentYear = allYears[0];
  const yd = yearMap[mostRecentYear];

  const hasImputation = [...yd.statuses].some((s) => IMPUTED_STATUSES.has(s));
  if (hasImputation) {
    return {
      pass: false,
      reason: `Imputed observations present (status ${[...yd.statuses].join(",")}) in all qualifying years`,
      latestYear: mostRecentYear,
    };
  }

  const presentGroups = ISCO08_GROUPS.filter(
    (g) => Number.isFinite(yd.groups[String(g)]) && yd.groups[String(g)] > 0
  );
  if (presentGroups.length < 9) {
    const missing = ISCO08_GROUPS.filter(
      (g) => !presentGroups.includes(g)
    );
    return {
      pass: false,
      reason: `Insufficient ISCO-08 groups in all qualifying years: only ${presentGroups.length} of 9 present at latest year ${mostRecentYear} (missing groups: ${missing.join(",")})`,
      latestYear: mostRecentYear,
    };
  }

  const total = yd.groups["TOTAL"];
  if (!Number.isFinite(total) || total <= 0) {
    return {
      pass: false,
      reason: `No valid positive TOTAL in qualifying years`,
      latestYear: mostRecentYear,
    };
  }

  const groupSum = ISCO08_GROUPS.reduce((s, g) => s + (yd.groups[String(g)] || 0), 0);
  const coverageRatio = groupSum / total;
  return {
    pass: false,
    reason: `Group coverage ratio ${(coverageRatio * 100).toFixed(1)}% below required ${MIN_COVERAGE_RATIO * 100}% in all qualifying years`,
    latestYear: mostRecentYear,
  };
}

// ─── Pairwise dissimilarity ───────────────────────────────────────────────────

/**
 * Compute pairwise Bray-Curtis / half-L1 dissimilarity between two share vectors:
 *   D = 0.5 * sum(|share_i_A - share_i_B|)
 * Ranges 0 (identical mix) to 1 (completely different).
 */
function pairwiseDissimilarity(sharesA, sharesB) {
  let sum = 0;
  for (const g of ISCO08_GROUPS) {
    sum += Math.abs(sharesA[String(g)] - sharesB[String(g)]);
  }
  return Math.round((0.5 * sum) * 10000) / 10000;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

  const accessDate = new Date().toISOString();

  // 1. Fetch CSV
  const csvText = await fetchCSV();
  console.log(`[build-international-occupation-mix] Parsing CSV (${csvText.length} bytes)`);

  // 2. Parse CSV
  const { countryData, maxYear, totalRowCount } = parseILOCSV(csvText);
  console.log(
    `[build-international-occupation-mix] Parsed ${totalRowCount} ISCO-08/SEX_T rows; dataset latest year: ${maxYear}`
  );

  if (maxYear === 0) {
    throw new Error(
      "[build-international-occupation-mix] Could not determine dataset latest year"
    );
  }

  // 3. Evaluate each seed country against gates
  const included = [];
  const excluded = [];

  for (const iso3 of SEED_COUNTRIES) {
    const result = evaluateCountry(iso3, countryData[iso3], maxYear);
    if (result.pass) {
      included.push({ iso3, ...result });
      console.log(
        `[build-international-occupation-mix] INCLUDE ${iso3} (year=${result.year}, coverage=${(result.coverageRatio * 100).toFixed(2)}%, statuses=${JSON.stringify(result.observationStatuses)})`
      );
    } else {
      excluded.push({
        iso3,
        name: COUNTRY_NAMES[iso3] || iso3,
        reason: result.reason,
        latestYear: result.latestYear,
      });
      console.log(
        `[build-international-occupation-mix] EXCLUDE ${iso3}: ${result.reason}`
      );
    }
  }

  // 4. Minimum included gate
  if (included.length < MIN_INCLUDED) {
    throw new Error(
      `[build-international-occupation-mix] Only ${included.length} countries passed gates (minimum: ${MIN_INCLUDED}). Cannot produce dataset. See exclusion reasons above.`
    );
  }

  // 5. Build per-country data with shares
  const countries = {};
  for (const c of included) {
    const shares = {};
    for (const g of ISCO08_GROUPS) {
      // Normalize shares to group sum (groups 1-9) so they sum to 1.0.
      // groupCoverageRatio is separately recorded for data-quality traceability.
      shares[String(g)] = Math.round((c.groups[String(g)] / c.groupSum) * 1e6) / 1e6;
    }
    const shareSum = ISCO08_GROUPS.reduce((s, g) => s + shares[String(g)], 0);

    // Validate share sum ≈ 1.0 (within 0.005)
    if (Math.abs(shareSum - 1.0) > 0.005) {
      throw new Error(
        `[build-international-occupation-mix] ${c.iso3}: share sum ${shareSum.toFixed(6)} not within 0.005 of 1.0`
      );
    }

    const groupsOut = {};
    for (const g of ISCO08_GROUPS) {
      groupsOut[String(g)] = {
        label: ISCO08_LABELS[g],
        employment: Math.round(c.groups[String(g)] * 1000) / 1000,
        share: shares[String(g)],
      };
    }

    countries[c.iso3] = {
      iso3: c.iso3,
      name: COUNTRY_NAMES[c.iso3] || c.iso3,
      year: c.year,
      iloSource: c.source,
      observationStatuses: c.observationStatuses,
      noteIndicators: c.noteInds,
      totalEmployment: Math.round(c.total * 1000) / 1000,
      groupCoverageRatio: Math.round(c.coverageRatio * 10000) / 10000,
      groups: groupsOut,
    };
  }

  // 6. Pairwise dissimilarity (descriptive only)
  const dissimilarityPairs = {};
  const includedIso3 = included.map((c) => c.iso3).sort();
  for (let i = 0; i < includedIso3.length; i++) {
    for (let j = i + 1; j < includedIso3.length; j++) {
      const a = includedIso3[i];
      const b = includedIso3[j];
      const sharesA = Object.fromEntries(
        ISCO08_GROUPS.map((g) => [String(g), countries[a].groups[String(g)].share])
      );
      const sharesB = Object.fromEntries(
        ISCO08_GROUPS.map((g) => [String(g), countries[b].groups[String(g)].share])
      );
      dissimilarityPairs[`${a}_${b}`] = pairwiseDissimilarity(sharesA, sharesB);
    }
  }

  // 7. Assemble output
  const meta = buildMeta({
    asOf: String(maxYear),
    source: {
      name: SOURCE.name,
      publisher: SOURCE.publisher,
      url: SOURCE.accessEndpoint,
    },
  });

  const output = {
    meta,
    source: {
      ...SOURCE,
      accessDate,
    },
    coverage: {
      classification: "ISCO-08",
      sex: "SEX_T",
      frequency: "Annual",
      datasetLatestYear: maxYear,
      withinYearsWindow: WITHIN_YEARS,
      minGroupCoverageRatio: MIN_COVERAGE_RATIO,
      minGroupCount: 9,
      includedCount: included.length,
      excludedCount: excluded.length,
    },
    included: includedIso3,
    excluded: excluded.map((e) => ({
      iso3: e.iso3,
      name: e.name,
      reason: e.reason,
      latestYear: e.latestYear,
    })),
    countries,
    dissimilarity: {
      method: "Half-L1 (Bray-Curtis dissimilarity): D = 0.5 * sum(|share_i_A - share_i_B|) over ISCO-08 groups 1-9",
      note: "Descriptive only. Values range 0 (identical occupation mix) to 1 (completely different). No ranking implied.",
      pairs: dissimilarityPairs,
    },
  };

  // 8. Validate before writing
  validateInternationalOccupationMix(output);

  // 9. Write
  writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n");
  console.log(
    `[build-international-occupation-mix] Wrote ${OUTPUT_FILE} (${included.length} countries included, ${excluded.length} excluded)`
  );
  console.log(
    `[build-international-occupation-mix] Included: ${includedIso3.join(", ")}`
  );
  console.log(
    `[build-international-occupation-mix] Excluded: ${excluded.map((e) => e.iso3).join(", ")}`
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
