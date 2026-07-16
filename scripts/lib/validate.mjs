/**
 * scripts/lib/validate.mjs
 *
 * Shared sanity-gate helpers for data builders.
 *
 * Each throwing helper produces an actionable error message and exits
 * non-zero (via throw) so the caller's writeFileSync is never reached on
 * a degenerate dataset.
 *
 * Per-dataset validators encode thresholds derived from the current committed
 * files (≈80 % of current counts) so they catch future degeneration without
 * failing today's builds.
 */

import { CANONICAL_SECTORS, isCanonicalSector } from "./sector-taxonomy.mjs";

// ─── Primitive helpers ────────────────────────────────────────────────────────

/**
 * Assert that `rows` is an array with at least `min` elements.
 * @param {unknown[]} rows
 * @param {number} min
 * @param {string} name  human-readable dataset name
 */
export function assertMinRows(rows, min, name) {
  if (!Array.isArray(rows)) {
    throw new Error(
      `[validate] ${name}: expected an array, got ${typeof rows}`
    );
  }
  if (rows.length < min) {
    throw new Error(
      `[validate] ${name}: too few rows — got ${rows.length}, need at least ${min}`
    );
  }
}

/**
 * Assert that `obj` is a non-null object that contains every key in
 * `requiredKeys`.
 * @param {Record<string, unknown>} obj
 * @param {string[]} requiredKeys
 * @param {string} name
 */
export function assertFields(obj, requiredKeys, name) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    throw new Error(
      `[validate] ${name}: expected a plain object, got ${
        obj === null ? "null" : Array.isArray(obj) ? "array" : typeof obj
      }`
    );
  }
  const missing = requiredKeys.filter((k) => !(k in obj));
  if (missing.length > 0) {
    throw new Error(
      `[validate] ${name}: missing required top-level key(s): ${missing.join(", ")}`
    );
  }
}

/**
 * Assert that `obj` has a non-empty `generatedAt` string (ISO-8601 timestamp).
 * Also accepts `obj.meta.generatedAt` as a fallback.
 * @param {Record<string, unknown>} obj
 * @param {string} name
 */
export function assertProvenance(obj, name) {
  const ts =
    (typeof obj.generatedAt === "string" && obj.generatedAt) ||
    (obj.meta &&
      typeof obj.meta === "object" &&
      typeof obj.meta.generatedAt === "string" &&
      obj.meta.generatedAt);
  if (!ts) {
    throw new Error(
      `[validate] ${name}: missing or empty generatedAt / meta.generatedAt`
    );
  }
}

/**
 * Assert that every state code in `requiredSet` appears among the state codes
 * derived from `states` (an array of objects with a `state` string field, or
 * a Set/array of plain strings).
 * @param {Array<{state: string} | string> | Set<string>} states
 * @param {string[]} requiredSet  two-letter state codes that MUST be present
 * @param {string} name
 */
export function assertLiveStates(states, requiredSet, name) {
  let codeSet;
  if (states instanceof Set) {
    codeSet = states;
  } else if (Array.isArray(states)) {
    codeSet = new Set(
      states.map((s) => (typeof s === "string" ? s : s.state))
    );
  } else {
    throw new Error(
      `[validate] ${name}: assertLiveStates expects an array or Set, got ${typeof states}`
    );
  }
  const missing = requiredSet.filter((code) => !codeSet.has(code));
  if (missing.length > 0) {
    throw new Error(
      `[validate] ${name}: missing required live state(s): ${missing.join(", ")}`
    );
  }
}

function finiteNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function nullableFiniteInRange(value, min, max) {
  return (
    value == null ||
    (typeof value === "number" &&
      Number.isFinite(value) &&
      value >= min &&
      value <= max)
  );
}

// ─── Per-dataset validators ───────────────────────────────────────────────────

// Minimum live WARN states that MUST always be present in coverage.
// Derived from the current 16-state live set; these 11 are the conservative
// must-have subset per issue #49.
const REQUIRED_LIVE_WARN_STATES = [
  "CA", "GA", "IA", "KY", "NJ", "NY", "OH", "OR", "TN", "TX", "WI",
];

/**
 * Maximum plausible WARN effective date: current_year + 2.
 * WARN Act requires 60-day notice; legitimate near-future layoffs may be filed
 * months ahead. Beyond current_year + 2 is a data-entry or parsing error.
 * Horizon documented in issue #116.
 */
const MAX_PLAUSIBLE_WARN_EFFECTIVE_YEAR = new Date().getUTCFullYear() + 2;
const MAX_PLAUSIBLE_WARN_EFFECTIVE_DATE = `${MAX_PLAUSIBLE_WARN_EFFECTIVE_YEAR}-12-31`;
const MIN_PLAUSIBLE_WARN_DATE = "2010-01-01";

/**
 * Validate data/warn-notices.json.
 * Current committed file: 12,527 notices, 51 coverageStates, 16 live states.
 * Thresholds set at ≈80 % of current values.
 * Also enforces date plausibility upper bound (current_year + 2).
 * @param {Record<string, unknown>} data
 */
export function validateWarnNotices(data) {
  assertFields(
    data,
    ["generatedAt", "coverageSummary", "coverageStates", "notices"],
    "warn-notices"
  );
  assertProvenance(data, "warn-notices");
  assertMinRows(data.notices, 10000, "warn-notices.notices");
  assertMinRows(data.coverageStates, 50, "warn-notices.coverageStates");
  const liveStates = data.coverageStates
    .filter((s) => s.sourceStatus === "live")
    .map((s) => s.state);
  assertLiveStates(liveStates, REQUIRED_LIVE_WARN_STATES, "warn-notices");

  // Upper-bound date plausibility: no effectiveDate may exceed current_year + 2
  const absurdDates = data.notices.filter(
    (n) => n.effectiveDate && n.effectiveDate > MAX_PLAUSIBLE_WARN_EFFECTIVE_DATE
  );
  if (absurdDates.length > 0) {
    const examples = absurdDates.slice(0, 3).map(
      (n) => `${n.company ?? "?"} (${n.effectiveDate})`
    ).join("; ");
    throw new Error(
      `[validate] warn-notices: ${absurdDates.length} notice(s) have effectiveDate beyond ` +
      `${MAX_PLAUSIBLE_WARN_EFFECTIVE_DATE} (max plausible horizon = current_year + 2): ${examples}`
    );
  }

  // Lower-bound date plausibility
  const ancientDates = data.notices.filter(
    (n) => n.effectiveDate && n.effectiveDate < MIN_PLAUSIBLE_WARN_DATE
  );
  if (ancientDates.length > 0) {
    throw new Error(
      `[validate] warn-notices: ${ancientDates.length} notice(s) have effectiveDate before ${MIN_PLAUSIBLE_WARN_DATE}`
    );
  }
}

/**
 * Validate data/state-labor.json.
 * Current committed file: 51 states, ≥9 ranked states, 16 live-coverage states.
 * @param {Record<string, unknown>} data
 */
export function validateStateLabor(data) {
  assertFields(
    data,
    ["generatedAt", "source", "methodology", "summary", "states"],
    "state-labor"
  );
  assertProvenance(data, "state-labor");
  assertMinRows(data.states, 46, "state-labor.states");
  const liveStates = data.states
    .filter((s) => s.warnCoverageStatus === "live")
    .map((s) => s.state);
  assertLiveStates(liveStates, REQUIRED_LIVE_WARN_STATES, "state-labor");
}

/**
 * Validate data/state-qcew.json.
 * Current committed file: 51 states.
 * @param {Record<string, unknown>} data
 */
export function validateStateQcew(data) {
  assertFields(
    data,
    ["generatedAt", "source", "methodology", "summary", "states"],
    "state-qcew"
  );
  assertProvenance(data, "state-qcew");
  assertMinRows(data.states, 46, "state-qcew.states");
}

/**
 * Validate data/jolts.json.
 * Current committed file: national series with 10 keys, 21 industries,
 * LDL/LDR with 120 monthly observations.
 * @param {Record<string, unknown>} data
 */
export function validateJolts(data) {
  assertFields(
    data,
    ["generatedAt", "source", "national", "industries"],
    "jolts"
  );
  assertProvenance(data, "jolts");
  // national.series must be a non-empty object
  const series = data.national?.series;
  if (!series || typeof series !== "object" || Array.isArray(series)) {
    throw new Error("[validate] jolts: national.series must be a non-null object");
  }
  const seriesKeys = Object.keys(series);
  if (seriesKeys.length < 4) {
    throw new Error(
      `[validate] jolts: national.series has only ${seriesKeys.length} series (need ≥ 4)`
    );
  }
  // Key layoffs series must be present and have sufficient observations
  const ldl = series.LDL;
  if (!Array.isArray(ldl) || ldl.length < 24) {
    throw new Error(
      `[validate] jolts: national.series.LDL has ${Array.isArray(ldl) ? ldl.length : "no"} observations (need ≥ 24)`
    );
  }
  assertMinRows(data.industries, 15, "jolts.industries");
}

/**
 * Validate data/occupation-snapshot.json.
 * Current committed file: `{ meta, data }` with 756 occupations (issue #52).
 * Also accepts a bare array (the pre-#52 shape) for backward-compatible callers.
 * @param {{ meta?: object, data?: unknown[] } | Array<Record<string, unknown>>} dataset
 */
export function validateOccupationSnapshot(dataset) {
  const rows = Array.isArray(dataset) ? dataset : dataset?.data;
  if (!Array.isArray(dataset)) {
    assertFields(dataset, ["meta", "data"], "occupation-snapshot");
    assertProvenance(dataset, "occupation-snapshot");
  }
  assertMinRows(rows, 680, "occupation-snapshot");
  // Spot-check required fields on first entry
  if (rows.length > 0) {
    assertFields(
      rows[0],
      ["socCode", "title", "sector", "aiExposure", "automationRisk"],
      "occupation-snapshot[0]"
    );
  }
  // Assert all sector values are canonical (max 22 BLS SOC major groups)
  const uniqueSectors = new Set(rows.map(r => r.sector));
  const nonCanonical = [...uniqueSectors].filter(s => !isCanonicalSector(s));
  if (nonCanonical.length > 0) {
    throw new Error(
      `[validate] occupation-snapshot: non-canonical sector(s) found — ${nonCanonical.join(", ")}\n` +
      `  Canonical sectors: ${CANONICAL_SECTORS.join(", ")}`
    );
  }
  if (uniqueSectors.size > 22) {
    throw new Error(
      `[validate] occupation-snapshot: expected ≤22 sectors, got ${uniqueSectors.size} — ${[...uniqueSectors].join(", ")}`
    );
  }
}

/**
 * Validate data/occupation-snapshot-slim.json.
 * Current committed file: `{ meta, data }` with 756 rows (issue #52).
 * Also accepts a bare array (the pre-#52 shape) for backward-compatible callers.
 * @param {{ meta?: object, data?: unknown[] } | Array<Record<string, unknown>>} dataset
 */
export function validateOccupationSnapshotSlim(dataset) {
  const rows = Array.isArray(dataset) ? dataset : dataset?.data;
  if (!Array.isArray(dataset)) {
    assertFields(dataset, ["meta", "data"], "occupation-snapshot-slim");
    assertProvenance(dataset, "occupation-snapshot-slim");
  }
  assertMinRows(rows, 680, "occupation-snapshot-slim");
  if (rows.length > 0) {
    assertFields(
      rows[0],
      ["socCode", "title", "sector", "aiExposure", "automationRisk"],
      "occupation-snapshot-slim[0]"
    );
  }
  // Assert all sector values are canonical (max 22 BLS SOC major groups)
  const uniqueSectors = new Set(rows.map(r => r.sector));
  const nonCanonical = [...uniqueSectors].filter(s => !isCanonicalSector(s));
  if (nonCanonical.length > 0) {
    throw new Error(
      `[validate] occupation-snapshot-slim: non-canonical sector(s) found — ${nonCanonical.join(", ")}\n` +
      `  Canonical sectors: ${CANONICAL_SECTORS.join(", ")}`
    );
  }
  if (uniqueSectors.size > 22) {
    throw new Error(
      `[validate] occupation-snapshot-slim: expected ≤22 sectors, got ${uniqueSectors.size} — ${[...uniqueSectors].join(", ")}`
    );
  }
}

/**
 * Validate data/h1b-trends.json (issue: work-visa job trends).
 *
 * The dataset aggregates DOL OFLC H-1B/LCA disclosure data into a small
 * per-fiscal-year snapshot. Thresholds are intentionally conservative so a
 * partial (>=4 year) backfill still passes while a degenerate/empty build fails.
 *
 * Gates:
 *  - required top-level keys + non-empty provenance (meta.generatedAt + source)
 *  - a minimum number of fiscal years present
 *  - a minimum certifiedLcas per year (guards against an empty/broken parse)
 *  - coverage.fiscalYears matches the fiscalYears present in byYear
 *  - occupations/byState/topEmployers are present and non-empty
 *  - occupations[].wageByYear (when present) hold positive-or-null medians
 *  - byState[] carry wageByYear + topOccupations; topEmployers carry meanWageAnnual
 *  - at least `minEmployers` (default 50) top employers are present
 *
 * @param {Record<string, unknown>} data
 * @param {{ minYears?: number, minCertifiedPerYear?: number, minEmployers?: number }} [opts]
 */
export function validateH1bTrends(data, opts = {}) {
  const minYears = opts.minYears ?? 4;
  const minEmployers = opts.minEmployers ?? 50;
  // Full-year figures: FY2020+ sum all four quarterly files (distinct
  // CASE_NUMBER union), and FY2016–FY2019 use the annual workbook, so every
  // covered year now carries a full fiscal year of certified H-1B LCAs
  // (~200K–650K). The floor guards against a regression to the old Q4-only
  // undercount (~80K–110K) or an empty/broken parse.
  const minCertifiedPerYear = opts.minCertifiedPerYear ?? 200000;

  assertFields(
    data,
    ["meta", "coverage", "byYear", "occupations", "topEmployers", "byState"],
    "h1b-trends"
  );
  assertProvenance(data, "h1b-trends");

  // Provenance source must be present (name/url) — not just a timestamp.
  const src = data.meta && typeof data.meta === "object" ? data.meta.source : null;
  if (!src || (typeof src === "object" && !src.name && !src.url)) {
    throw new Error("[validate] h1b-trends: missing meta.source (name/url)");
  }

  assertMinRows(data.byYear, minYears, "h1b-trends.byYear");

  const seenYears = [];
  for (const b of data.byYear) {
    assertFields(
      b,
      [
        "fiscalYear",
        "certifiedLcas",
        "totalWorkerPositions",
        "distinctEmployers",
        "medianWageAnnual",
        "p25WageAnnual",
        "p75WageAnnual",
      ],
      `h1b-trends.byYear[FY${b && b.fiscalYear}]`
    );
    if (typeof b.certifiedLcas !== "number" || b.certifiedLcas < minCertifiedPerYear) {
      throw new Error(
        `[validate] h1b-trends: FY${b.fiscalYear} has too few certifiedLcas — ` +
          `got ${b.certifiedLcas}, need at least ${minCertifiedPerYear}`
      );
    }
    if (!(typeof b.medianWageAnnual === "number" && b.medianWageAnnual > 0)) {
      throw new Error(
        `[validate] h1b-trends: FY${b.fiscalYear} medianWageAnnual must be a positive number`
      );
    }
    seenYears.push(b.fiscalYear);
  }

  // byYear must be sorted ascending by fiscalYear.
  for (let i = 1; i < seenYears.length; i++) {
    if (seenYears[i] <= seenYears[i - 1]) {
      throw new Error(
        "[validate] h1b-trends: byYear must be sorted ascending by fiscalYear"
      );
    }
  }

  // coverage.fiscalYears must exactly match the years present in byYear.
  const coverage = data.coverage;
  if (!coverage || typeof coverage !== "object" || !Array.isArray(coverage.fiscalYears)) {
    throw new Error("[validate] h1b-trends: coverage.fiscalYears must be an array");
  }
  const covSorted = [...coverage.fiscalYears].sort((a, b) => a - b);
  if (
    covSorted.length !== seenYears.length ||
    covSorted.some((y, i) => y !== seenYears[i])
  ) {
    throw new Error(
      "[validate] h1b-trends: coverage.fiscalYears does not match byYear fiscal years"
    );
  }

  assertMinRows(data.occupations, 50, "h1b-trends.occupations");
  assertMinRows(data.topEmployers, minEmployers, "h1b-trends.topEmployers");
  assertMinRows(data.byState, 20, "h1b-trends.byState");

  // Spot-check that SOC codes are normalized to ##-#### form.
  const bad = data.occupations.find(
    (o) => typeof o.socCode !== "string" || !/^\d{2}-\d{4}$/.test(o.socCode)
  );
  if (bad) {
    throw new Error(
      `[validate] h1b-trends: occupation SOC code not normalized: ${bad && bad.socCode}`
    );
  }

  // ── New enrichment fields (wage-by-occupation, state/employer deep-dives) ──

  // occupations[].wageByYear: emitted for high-volume occupations; every value
  // must be a positive number or null (noisy/low-sample years are nulled).
  for (const o of data.occupations) {
    if (o.wageByYear === undefined) continue; // omitted for low-volume SOCs — OK
    if (o.wageByYear === null || typeof o.wageByYear !== "object" || Array.isArray(o.wageByYear)) {
      throw new Error(
        `[validate] h1b-trends: occupation ${o.socCode} wageByYear must be an object`
      );
    }
    for (const [y, v] of Object.entries(o.wageByYear)) {
      if (v !== null && !(typeof v === "number" && v > 0)) {
        throw new Error(
          `[validate] h1b-trends: occupation ${o.socCode} wageByYear[${y}] must be a positive number or null`
        );
      }
    }
  }

  // byState[].wageByYear + topOccupations must be present and well-formed.
  for (const s of data.byState) {
    if (!s.wageByYear || typeof s.wageByYear !== "object" || Array.isArray(s.wageByYear)) {
      throw new Error(
        `[validate] h1b-trends: byState ${s && s.state} missing/invalid wageByYear`
      );
    }
    for (const [y, v] of Object.entries(s.wageByYear)) {
      if (v !== null && !(typeof v === "number" && v > 0)) {
        throw new Error(
          `[validate] h1b-trends: byState ${s.state} wageByYear[${y}] must be a positive number or null`
        );
      }
    }
    if (!Array.isArray(s.topOccupations)) {
      throw new Error(
        `[validate] h1b-trends: byState ${s.state} missing topOccupations array`
      );
    }
    for (const t of s.topOccupations) {
      if (
        !t ||
        typeof t.socCode !== "string" ||
        !(typeof t.count === "number" && t.count > 0)
      ) {
        throw new Error(
          `[validate] h1b-trends: byState ${s.state} topOccupations entry malformed`
        );
      }
    }
  }

  // topEmployers[].meanWageAnnual must be a positive number or null.
  for (const e of data.topEmployers) {
    if (
      e.meanWageAnnual !== null &&
      e.meanWageAnnual !== undefined &&
      !(typeof e.meanWageAnnual === "number" && e.meanWageAnnual > 0)
    ) {
      throw new Error(
        `[validate] h1b-trends: topEmployers ${e && e.employer} meanWageAnnual must be a positive number or null`
      );
    }
  }
}

/**
 * Validate data/job-postings.json.
 *
 * This dataset is intentionally provider-ready seed data: every occupation in the
 * current FutureGrid source set receives a 10-year annual series keyed by SOC,
 * plus an aggregate series for O*NET related occupations. The validator focuses
 * on schema stability (years, coverage, key fields) so a future provider swap can
 * replace the counts without changing the downstream contract.
 *
 * @param {Record<string, unknown>} data
 */
export function validateJobPostings(data) {
  assertFields(
    data,
    ["meta", "coverage", "methodology", "providerContract", "summary", "occupations"],
    "job-postings"
  );
  assertProvenance(data, "job-postings");
  assertMinRows(data.occupations, 680, "job-postings.occupations");

  const years = data.coverage?.years;
  if (!Array.isArray(years) || years.length !== 10) {
    throw new Error("[validate] job-postings: coverage.years must list exactly 10 annual points");
  }
  for (let index = 0; index < years.length; index += 1) {
    const year = years[index];
    if (!(typeof year === "number" && Number.isInteger(year))) {
      throw new Error("[validate] job-postings: coverage.years must contain integer years");
    }
    if (index > 0 && year !== years[index - 1] + 1) {
      throw new Error("[validate] job-postings: coverage.years must be contiguous and sorted ascending");
    }
  }

  const latestYear = data.summary?.latestYear;
  if (latestYear !== years[years.length - 1]) {
    throw new Error("[validate] job-postings: summary.latestYear must equal the last coverage year");
  }

  const totalAnnual = data.summary?.totalAnnualPostingsByYear;
  if (!totalAnnual || typeof totalAnnual !== "object" || Array.isArray(totalAnnual)) {
    throw new Error("[validate] job-postings: summary.totalAnnualPostingsByYear must be an object");
  }
  const yearKeySet = new Set(years.map(String));
  for (const [year, value] of Object.entries(totalAnnual)) {
    if (!yearKeySet.has(year)) {
      throw new Error(
        `[validate] job-postings: summary.totalAnnualPostingsByYear[${year}] is outside coverage.years`
      );
    }
    if (!(typeof value === "number" && Number.isFinite(value) && value > 0)) {
      throw new Error(
        `[validate] job-postings: summary.totalAnnualPostingsByYear[${year}] must be a positive number`
      );
    }
  }

  const requiredYears = data.providerContract?.requiredYears;
  if (
    !Array.isArray(requiredYears) ||
    requiredYears.length !== years.length ||
    requiredYears.some((year, index) => year !== years[index])
  ) {
    throw new Error("[validate] job-postings: providerContract.requiredYears must match coverage.years");
  }

  for (const occ of data.occupations) {
    assertFields(
      occ,
      [
        "socCode",
        "title",
        "sector",
        "sampleTitles",
        "relatedOccupations",
        "annualPostings",
        "relatedAnnualPostings",
        "latestAnnualPostings",
        "latestRelatedAnnualPostings",
        "sourceStatus",
      ],
      `job-postings:${occ && occ.socCode ? occ.socCode : "?"}`
    );

    if (typeof occ.socCode !== "string" || !/^\d{2}-\d{4}$/.test(occ.socCode)) {
      throw new Error(
        `[validate] job-postings: occupation SOC code not normalized: ${occ && occ.socCode}`
      );
    }
    if (!Array.isArray(occ.sampleTitles)) {
      throw new Error(
        `[validate] job-postings:${occ.socCode}: sampleTitles must be an array`
      );
    }
    if (!Array.isArray(occ.relatedOccupations)) {
      throw new Error(
        `[validate] job-postings:${occ.socCode}: relatedOccupations must be an array`
      );
    }
    for (const rel of occ.relatedOccupations) {
      assertFields(
        rel,
        ["socCode", "title", "brightOutlook"],
        `job-postings:${occ.socCode}.relatedOccupation`
      );
      if (!/^\d{2}-\d{4}$/.test(rel.socCode)) {
        throw new Error(
          `[validate] job-postings:${occ.socCode}: related occupation SOC code not normalized: ${rel.socCode}`
        );
      }
    }

    for (const field of ["annualPostings", "relatedAnnualPostings"]) {
      const obj = occ[field];
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
        throw new Error(
          `[validate] job-postings:${occ.socCode}: ${field} must be an object`
        );
      }
      for (const year of years) {
        const value = obj[String(year)];
        if (!(typeof value === "number" && Number.isFinite(value) && value >= 0)) {
          throw new Error(
            `[validate] job-postings:${occ.socCode}: ${field}[${year}] must be a finite non-negative number`
          );
        }
      }
      const outsideCoverage = Object.keys(obj).find((year) => !yearKeySet.has(year));
      if (outsideCoverage) {
        throw new Error(
          `[validate] job-postings:${occ.socCode}: ${field}[${outsideCoverage}] is outside coverage.years`
        );
      }
    }

    const latestKey = String(latestYear);
    if (occ.latestAnnualPostings !== occ.annualPostings[latestKey]) {
      throw new Error(
        `[validate] job-postings:${occ.socCode}: latestAnnualPostings must mirror annualPostings[${latestKey}]`
      );
    }
    if (occ.latestRelatedAnnualPostings !== occ.relatedAnnualPostings[latestKey]) {
      throw new Error(
        `[validate] job-postings:${occ.socCode}: latestRelatedAnnualPostings must mirror relatedAnnualPostings[${latestKey}]`
      );
    }
  }
}

/**
 * Validate data/occupational-requirements.json.
 *
 * ORS is a SOC-keyed job-requirements layer. The committed snapshot may be a
 * broad-SOC FutureGrid seed or exact SOC provider/ORS overlay, but the contract
 * must stay stable so downstream career evidence cards can consume the same
 * fields when expanded public ORS rows are wired in later.
 *
 * @param {Record<string, unknown>} data
 */
export function validateOccupationalRequirements(data) {
  assertFields(
    data,
    [
      "meta",
      "coverage",
      "methodology",
      "providerContract",
      "summary",
      "occupations",
    ],
    "occupational-requirements"
  );
  assertProvenance(data, "occupational-requirements");
  assertMinRows(data.occupations, 680, "occupational-requirements.occupations");

  if (data.coverage?.primaryKey !== "socCode") {
    throw new Error(
      "[validate] occupational-requirements: coverage.primaryKey must be socCode"
    );
  }
  const exactSocRows = finiteNonNegativeInteger(data.coverage?.exactSocRows);
  const broadSocRows = finiteNonNegativeInteger(data.coverage?.broadSocRows);
  const missingRows = finiteNonNegativeInteger(data.coverage?.missingRows);
  if (exactSocRows == null || broadSocRows == null || missingRows == null) {
    throw new Error(
      "[validate] occupational-requirements: coverage row counts must be non-negative integers"
    );
  }
  if (exactSocRows + broadSocRows + missingRows !== data.occupations.length) {
    throw new Error(
      "[validate] occupational-requirements: coverage row counts must sum to occupations.length"
    );
  }

  const caveat = String(data.methodology?.caveat ?? "");
  if (
    !/not worker ability, AI capability, or displacement probability/i.test(
      caveat
    )
  ) {
    throw new Error(
      "[validate] occupational-requirements: methodology.caveat must include the ORS limitations language"
    );
  }
  if (
    data.coverage?.mode === "seed-static" &&
    exactSocRows === 0 &&
    !/FutureGrid broad-SOC seed derived from public BLS ORS requirement concepts/i.test(
      caveat
    )
  ) {
    throw new Error(
      "[validate] occupational-requirements: seed-static data must be caveated as a FutureGrid broad-SOC seed, not direct ORS estimates"
    );
  }
  if (
    data.coverage?.mode === "seed-static" &&
    exactSocRows === 0 &&
    /come from BLS ORS employer survey estimates/i.test(caveat)
  ) {
    throw new Error(
      "[validate] occupational-requirements: seed-static caveat must not imply direct ORS employer survey estimates"
    );
  }

  let scoredRows = 0;
  const seen = new Set();
  for (const occ of data.occupations) {
    const label = `occupational-requirements:${
      occ && occ.socCode ? occ.socCode : "?"
    }`;
    assertFields(
      occ,
      [
        "socCode",
        "title",
        "preparation",
        "physical",
        "cognitive",
        "automationFrictionScore",
        "coverage",
      ],
      label
    );
    if (typeof occ.socCode !== "string" || !/^\d{2}-\d{4}$/.test(occ.socCode)) {
      throw new Error(
        `[validate] occupational-requirements: occupation SOC code not normalized: ${
          occ && occ.socCode
        }`
      );
    }
    if (seen.has(occ.socCode)) {
      throw new Error(
        `[validate] occupational-requirements:${occ.socCode}: duplicate SOC code`
      );
    }
    seen.add(occ.socCode);
    if (!["exact-soc", "broad-soc", "missing"].includes(occ.coverage)) {
      throw new Error(
        `[validate] occupational-requirements:${occ.socCode}: invalid coverage ${occ.coverage}`
      );
    }
    assertFields(
      occ.preparation,
      [
        "educationRequirement",
        "relatedWorkExperience",
        "onTheJobTraining",
        "svp",
      ],
      `${label}.preparation`
    );
    if (!nullableFiniteInRange(occ.preparation.svp, 0, 9)) {
      throw new Error(
        `[validate] occupational-requirements:${occ.socCode}: preparation.svp must be null or 0-9`
      );
    }
    for (const [objectName, fields] of [
      [
        "physical",
        ["standingWalkingPct", "heavyLiftingPct", "physicalPresenceScore"],
      ],
      ["cognitive", ["decisionMakingPct", "problemSolvingPct"]],
      ["workConditions", ["hazardousPct", "outdoorsPct", "physicalEnvironmentScore"]],
    ]) {
      if (occ[objectName] == null) continue;
      assertFields(occ[objectName], fields, `${label}.${objectName}`);
      for (const field of fields) {
        if (!nullableFiniteInRange(occ[objectName][field], 0, 100)) {
          throw new Error(
            `[validate] occupational-requirements:${occ.socCode}: ${objectName}.${field} must be null or 0-100`
          );
        }
      }
    }
    if (!nullableFiniteInRange(occ.automationFrictionScore, 0, 100)) {
      throw new Error(
        `[validate] occupational-requirements:${occ.socCode}: automationFrictionScore must be null or 0-100`
      );
    }
    if (occ.automationFrictionScore != null) scoredRows += 1;
  }
  if (scoredRows < 650) {
    throw new Error(
      `[validate] occupational-requirements: too few scored occupations — got ${scoredRows}, need at least 650`
    );
  }
  if (
    data.coverage?.scoredRows != null &&
    data.coverage.scoredRows !== scoredRows
  ) {
    throw new Error(
      "[validate] occupational-requirements: coverage.scoredRows must equal scored occupation rows"
    );
  }
}

/**
 * Validate data/employment-projections.json.
  *
 * This dataset joins a public BLS Employment Projections mirror onto the
 * committed FutureGrid occupation snapshot so every SOC gets a 2024→2034
 * projection row plus the existing AI-risk lens fields used by the UI.
 *
 * @param {Record<string, unknown>} data
 */
export function validateEmploymentProjections(data) {
  assertFields(
    data,
    ["meta", "coverage", "methodology", "summary", "rows"],
    "employment-projections"
  );
  assertProvenance(data, "employment-projections");
  assertMinRows(data.rows, 680, "employment-projections.rows");

  const baseYear = data.coverage?.baseYear;
  const projectionYear = data.coverage?.projectionYear;
  const windowYears = data.coverage?.windowYears;
  if (
    !Number.isInteger(baseYear) ||
    !Number.isInteger(projectionYear) ||
    !Number.isInteger(windowYears)
  ) {
    throw new Error(
      "[validate] employment-projections: coverage years must be integers"
    );
  }
  if (projectionYear - baseYear !== windowYears || windowYears !== 10) {
    throw new Error(
      "[validate] employment-projections: expected a 10-year projection window"
    );
  }
  if (data.coverage?.matchedSnapshotRows !== data.rows.length) {
    throw new Error(
      "[validate] employment-projections: coverage.matchedSnapshotRows must equal rows.length"
    );
  }
  if (
    typeof data.coverage?.rowsWithProjectedOpenings !== "number" ||
    data.coverage.rowsWithProjectedOpenings < 600
  ) {
    throw new Error(
      "[validate] employment-projections: coverage.rowsWithProjectedOpenings is unexpectedly low"
    );
  }

  for (const row of data.rows) {
    const label = `employment-projections:${row && row.socCode ? row.socCode : "?"}`;
    assertFields(
      row,
      [
        "socCode",
        "title",
        "sector",
        "employment2024",
        "employment2034",
        "employmentChange",
        "employmentChangePct",
        "projectedOpenings",
        "aiExposure",
        "automationRisk",
        "automationProbability",
        "brightOutlook",
      ],
      label
    );

    if (typeof row.socCode !== "string" || !/^\d{2}-\d{4}$/.test(row.socCode)) {
      throw new Error(
        `[validate] employment-projections: occupation SOC code not normalized: ${row && row.socCode}`
      );
    }

    for (const field of ["employment2024", "employment2034", "employmentChange"]) {
      if (!(typeof row[field] === "number" && Number.isFinite(row[field]))) {
        throw new Error(
          `[validate] ${label}: ${field} must be a finite number`
        );
      }
    }

    if (
      !(
        typeof row.employmentChangePct === "number" &&
        Number.isFinite(row.employmentChangePct)
      )
    ) {
      throw new Error(
        `[validate] ${label}: employmentChangePct must be a finite number`
      );
    }

    if (
      row.projectedOpenings !== null &&
      !(
        typeof row.projectedOpenings === "number" &&
        Number.isFinite(row.projectedOpenings) &&
        row.projectedOpenings >= 0
      )
    ) {
      throw new Error(
        `[validate] ${label}: projectedOpenings must be null or a finite non-negative number`
      );
    }
  }

  const summary = data.summary;
  if (
    !(
      typeof summary?.totalEmployment2024 === "number" &&
      typeof summary?.totalEmployment2034 === "number" &&
      typeof summary?.totalEmploymentChange === "number"
    )
  ) {
    throw new Error(
      "[validate] employment-projections: summary employment totals must be numeric"
    );
  }
  if (summary.totalEmployment2024 <= 100000000) {
    throw new Error(
      "[validate] employment-projections: summary.totalEmployment2024 is implausibly low"
    );
  }
}

/**
 * Validate data/openrouter-models.json.
 *
 * The dataset captures OpenRouter's public model catalog plus public per-model
 * endpoint/provider counts. It intentionally excludes scraped activity pages and
 * private account usage/activity endpoints.
 *
 * @param {Record<string, unknown>} data
 * @param {{ minModels?: number, minEndpointDetailRatio?: number }} [opts]
 */
export function validateOpenRouterModels(data, opts = {}) {
  const minModels = opts.minModels ?? 200;
  const minEndpointDetailRatio = opts.minEndpointDetailRatio ?? 0.75;

  assertFields(
    data,
    ["meta", "coverage", "methodology", "models"],
    "openrouter-models"
  );
  assertProvenance(data, "openrouter-models");
  assertMinRows(data.models, minModels, "openrouter-models.models");

  if (!data.meta?.source) {
    throw new Error("[validate] openrouter-models: missing meta.source");
  }
  if (data.coverage?.modelCount !== data.models.length) {
    throw new Error(
      "[validate] openrouter-models: coverage.modelCount must equal models.length"
    );
  }

  const details = data.coverage?.endpointDetails;
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    throw new Error(
      "[validate] openrouter-models: coverage.endpointDetails must be an object"
    );
  }
  if (details.attempted !== data.models.length) {
    throw new Error(
      "[validate] openrouter-models: endpointDetails.attempted must equal models.length"
    );
  }
  if (
    typeof details.fetched !== "number" ||
    details.fetched < data.models.length * minEndpointDetailRatio
  ) {
    throw new Error(
      "[validate] openrouter-models: too few public endpoint detail responses fetched"
    );
  }
  if (
    typeof details.endpointCount !== "number" ||
    details.endpointCount < details.fetched
  ) {
    throw new Error(
      "[validate] openrouter-models: endpointDetails.endpointCount is unexpectedly low"
    );
  }
  if (!Array.isArray(details.providerNames) || details.providerNames.length === 0) {
    throw new Error(
      "[validate] openrouter-models: endpointDetails.providerNames must be non-empty"
    );
  }

  for (const model of data.models) {
    const label = `openrouter-models:${model && model.id ? model.id : "?"}`;
    assertFields(
      model,
      [
        "id",
        "name",
        "canonicalSlug",
        "provider",
        "family",
        "createdAt",
        "createdDate",
        "contextLength",
        "maxOutputTokens",
        "architecture",
        "pricing",
        "topProvider",
        "endpoints",
        "supportedParameters",
        "description",
      ],
      label
    );

    if (typeof model.id !== "string" || !model.id.includes("/")) {
      throw new Error(`[validate] ${label}: id must be a provider/model string`);
    }
    if (typeof model.name !== "string" || model.name.length === 0) {
      throw new Error(`[validate] ${label}: name must be non-empty`);
    }
    if (
      model.canonicalSlug !== null &&
      typeof model.canonicalSlug !== "string"
    ) {
      throw new Error(`[validate] ${label}: canonicalSlug must be string or null`);
    }
    if (
      model.createdAt !== null &&
      !/^\d{4}-\d{2}-\d{2}T/.test(model.createdAt)
    ) {
      throw new Error(`[validate] ${label}: createdAt must be ISO-like or null`);
    }
    if (
      model.createdDate !== null &&
      !/^\d{4}-\d{2}-\d{2}$/.test(model.createdDate)
    ) {
      throw new Error(`[validate] ${label}: createdDate must be YYYY-MM-DD or null`);
    }
    for (const field of ["contextLength", "maxOutputTokens"]) {
      if (
        model[field] !== null &&
        !(typeof model[field] === "number" && Number.isFinite(model[field]) && model[field] >= 0)
      ) {
        throw new Error(`[validate] ${label}: ${field} must be null or a non-negative number`);
      }
    }

    const provider = model.provider;
    if (
      !provider ||
      typeof provider !== "object" ||
      typeof provider.slug !== "string" ||
      provider.slug.length === 0
    ) {
      throw new Error(`[validate] ${label}: provider.slug must be non-empty`);
    }
    const family = model.family;
    if (
      !family ||
      typeof family !== "object" ||
      (family.slug !== null && typeof family.slug !== "string")
    ) {
      throw new Error(`[validate] ${label}: family.slug must be string or null`);
    }

    const architecture = model.architecture;
    if (!architecture || typeof architecture !== "object" || Array.isArray(architecture)) {
      throw new Error(`[validate] ${label}: architecture must be an object`);
    }
    for (const field of ["inputModalities", "outputModalities"]) {
      if (!Array.isArray(architecture[field])) {
        throw new Error(`[validate] ${label}: architecture.${field} must be an array`);
      }
    }
    if (!Array.isArray(model.supportedParameters)) {
      throw new Error(`[validate] ${label}: supportedParameters must be an array`);
    }

    const topProvider = model.topProvider;
    if (!topProvider || typeof topProvider !== "object" || Array.isArray(topProvider)) {
      throw new Error(`[validate] ${label}: topProvider must be an object`);
    }
    for (const field of ["contextLength", "maxCompletionTokens"]) {
      if (
        topProvider[field] !== null &&
        !(typeof topProvider[field] === "number" && Number.isFinite(topProvider[field]))
      ) {
        throw new Error(`[validate] ${label}: topProvider.${field} must be numeric or null`);
      }
    }

    if (model.endpoints !== null) {
      const endpoints = model.endpoints;
      assertFields(
        endpoints,
        ["endpointCount", "providerCount", "providers", "supportedParameters"],
        `${label}.endpoints`
      );
      if (
        typeof endpoints.endpointCount !== "number" ||
        endpoints.endpointCount < 0 ||
        typeof endpoints.providerCount !== "number" ||
        endpoints.providerCount < 0
      ) {
        throw new Error(`[validate] ${label}: endpoint/provider counts must be non-negative`);
      }
      if (!Array.isArray(endpoints.providers)) {
        throw new Error(`[validate] ${label}: endpoints.providers must be an array`);
      }
    }
  }
}

/**
 * Validate data/ai-company-stocks.json.
 *
 * The dataset is a finance-safe descriptive stock-history layer for /analysis.
 * It may be refreshed from Alpha Vantage when ALPHA_VANTAGE_API_KEY is present,
 * or rebuilt deterministically from a committed static fixture when credentials
 * are absent.
 *
 * @param {Record<string, unknown>} data
 * @param {{ minCompanies?: number, minBenchmarks?: number }} [opts]
 */
export function validateAICompanyStocks(data, opts = {}) {
  const minCompanies = opts.minCompanies ?? 15;
  const minBenchmarks = opts.minBenchmarks ?? 2;

  assertFields(
    data,
    ["meta", "source", "methodology", "coverage", "benchmarks", "companies", "categories", "summary"],
    "ai-company-stocks"
  );
  assertProvenance(data, "ai-company-stocks");
  if (!data.meta?.source) {
    throw new Error("[validate] ai-company-stocks: missing meta.source");
  }
  assertMinRows(data.companies, minCompanies, "ai-company-stocks.companies");
  assertMinRows(data.benchmarks, minBenchmarks, "ai-company-stocks.benchmarks");
  assertMinRows(data.categories, 5, "ai-company-stocks.categories");

  const sourceMode = data.coverage?.sourceMode;
  if (!["alpha-vantage-daily-adjusted", "committed-static-fixture"].includes(sourceMode)) {
    throw new Error("[validate] ai-company-stocks: coverage.sourceMode must identify Alpha Vantage or committed fixture mode");
  }

  const methodologyText = Object.values(data.methodology)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value) => typeof value === "string")
    .join(" ");
  if (!/descriptive/i.test(methodologyText) || !/not financial advice|not a recommendation/i.test(methodologyText)) {
    throw new Error("[validate] ai-company-stocks: methodology must state descriptive, non-advisory use");
  }

  const benchmarkIds = new Set();
  for (const benchmark of data.benchmarks) {
    validateStockAssetRow(benchmark, `ai-company-stocks.benchmarks:${benchmark && benchmark.ticker ? benchmark.ticker : "?"}`);
    if (benchmarkIds.has(benchmark.id)) {
      throw new Error(`[validate] ai-company-stocks: duplicate benchmark id ${benchmark.id}`);
    }
    benchmarkIds.add(benchmark.id);
  }

  for (const requiredBenchmark of ["spy", "qqq"]) {
    if (!benchmarkIds.has(requiredBenchmark)) {
      throw new Error(`[validate] ai-company-stocks: missing ${requiredBenchmark.toUpperCase()} benchmark`);
    }
  }

  const tickers = new Set();
  for (const company of data.companies) {
    const label = `ai-company-stocks.companies:${company && company.ticker ? company.ticker : "?"}`;
    validateStockAssetRow(company, label);
    assertFields(
      company,
      ["id", "primaryCategory", "categories", "relativeReturns", "categoryRanks"],
      label
    );
    if (tickers.has(company.ticker)) {
      throw new Error(`[validate] ai-company-stocks: duplicate company ticker ${company.ticker}`);
    }
    tickers.add(company.ticker);
    if (!Array.isArray(company.categories) || company.categories.length === 0) {
      throw new Error(`[validate] ${label}: categories must be a non-empty array`);
    }
    if (!Array.isArray(company.categoryRanks) || company.categoryRanks.length === 0) {
      throw new Error(`[validate] ${label}: categoryRanks must be a non-empty array`);
    }
    if (hasTradingActionLabel(company)) {
      throw new Error(`[validate] ${label}: trading-action labels are not allowed`);
    }
    for (const benchmarkId of benchmarkIds) {
      if (!company.relativeReturns || typeof company.relativeReturns !== "object" || !(benchmarkId in company.relativeReturns)) {
        throw new Error(`[validate] ${label}: missing relativeReturns.${benchmarkId}`);
      }
      validateReturns(company.relativeReturns[benchmarkId], `${label}.relativeReturns.${benchmarkId}`);
    }
  }

  for (const category of data.categories) {
    assertFields(
      category,
      ["id", "label", "companyCount", "tickers", "breadth", "topGainers1Y", "laggards1Y"],
      `ai-company-stocks.categories:${category && category.id ? category.id : "?"}`
    );
    if (!Array.isArray(category.tickers) || category.tickers.length === 0) {
      throw new Error(`[validate] ai-company-stocks.categories:${category.id}: tickers must be non-empty`);
    }
    if (category.companyCount !== category.tickers.length) {
      throw new Error(`[validate] ai-company-stocks.categories:${category.id}: companyCount must equal tickers.length`);
    }
  }

  if (data.summary?.companyCount !== data.companies.length) {
    throw new Error("[validate] ai-company-stocks: summary.companyCount must equal companies.length");
  }
  if (data.coverage?.companyCount !== data.companies.length) {
    throw new Error("[validate] ai-company-stocks: coverage.companyCount must equal companies.length");
  }
}

function validateStockAssetRow(row, label) {
  assertFields(row, ["ticker", "name", "prices", "metrics", "dataQualityNotes"], label);
  if (typeof row.ticker !== "string" || !/^[A-Z.]{1,8}$/.test(row.ticker)) {
    throw new Error(`[validate] ${label}: ticker must be an uppercase market symbol`);
  }
  if (typeof row.name !== "string" || row.name.length === 0) {
    throw new Error(`[validate] ${label}: name must be non-empty`);
  }
  assertMinRows(row.prices, 2, `${label}.prices`);
  let prevDate = "";
  for (const point of row.prices) {
    if (
      !point ||
      typeof point.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(point.date) ||
      !(typeof point.close === "number" && Number.isFinite(point.close) && point.close > 0)
    ) {
      throw new Error(`[validate] ${label}: prices must contain { date: YYYY-MM-DD, close: positive number }`);
    }
    if (prevDate && point.date <= prevDate) {
      throw new Error(`[validate] ${label}: prices must be sorted ascending by date`);
    }
    prevDate = point.date;
  }

  const metrics = row.metrics;
  assertFields(
    metrics,
    [
      "startDate",
      "latestDate",
      "latestClose",
      "observationCount",
      "observationInterval",
      "returns",
      "annualizedVolatility",
      "maxDrawdown",
      "momentum50d",
      "momentum200d",
    ],
    `${label}.metrics`
  );
  if (metrics.observationCount !== row.prices.length) {
    throw new Error(`[validate] ${label}: metrics.observationCount must equal prices.length`);
  }
  if (metrics.startDate !== row.prices[0].date || metrics.latestDate !== row.prices[row.prices.length - 1].date) {
    throw new Error(`[validate] ${label}: metrics date bounds must match prices`);
  }
  if (!(typeof metrics.latestClose === "number" && metrics.latestClose > 0)) {
    throw new Error(`[validate] ${label}: metrics.latestClose must be positive`);
  }
  validateReturns(metrics.returns, `${label}.metrics.returns`);
  for (const field of ["annualizedVolatility", "maxDrawdown", "momentum50d", "momentum200d"]) {
    const value = metrics[field];
    if (value !== null && !(typeof value === "number" && Number.isFinite(value))) {
      throw new Error(`[validate] ${label}: metrics.${field} must be numeric or null`);
    }
  }
}

function validateReturns(returns, label) {
  if (!returns || typeof returns !== "object" || Array.isArray(returns)) {
    throw new Error(`[validate] ${label}: returns must be an object`);
  }
  for (const key of ["1M", "3M", "6M", "YTD", "1Y", "fullPeriod"]) {
    if (!(key in returns)) {
      throw new Error(`[validate] ${label}: missing ${key}`);
    }
    const value = returns[key];
    if (value !== null && !(typeof value === "number" && Number.isFinite(value))) {
      throw new Error(`[validate] ${label}: ${key} must be numeric or null`);
    }
  }
}

function hasTradingActionLabel(row) {
  const forbiddenKeys = [
    "advice",
    "action",
    "rating",
    "recommendation",
    "signal",
    "tradingAction",
    "tradingLabel",
  ];
  return forbiddenKeys.some((key) => key in row);
}

/**
 * Validate data/provenance.json (the central provenance registry, issue #52).
 * Ensures the registry lists datasets and that every entry carries a
 * generatedAt timestamp and a source.
 * @param {Record<string, unknown>} registry
 * @param {{ expectedIds?: string[] }} [opts]
 */
/**
 * Validate data/international-occupation-mix.json.
 * Enforces structural completeness, gate outcomes, and share integrity.
 * @param {Record<string, unknown>} data
 */
export function validateInternationalOccupationMix(data) {
  assertFields(
    data,
    ["meta", "source", "coverage", "included", "excluded", "countries", "dissimilarity"],
    "international-occupation-mix"
  );
  assertProvenance(data, "international-occupation-mix");

  // Source block
  assertFields(
    data.source,
    ["name", "indicator", "dataflow", "accessEndpoint", "license", "licenseUrl", "publisher", "accessDate"],
    "international-occupation-mix.source"
  );
  if (!/CC BY 4\.0/i.test(String(data.source?.license ?? ""))) {
    throw new Error(
      "[validate] international-occupation-mix: source.license must state CC BY 4.0"
    );
  }

  // Coverage block
  assertFields(
    data.coverage,
    ["classification", "sex", "frequency", "datasetLatestYear", "withinYearsWindow",
     "minGroupCoverageRatio", "minGroupCount", "includedCount", "excludedCount"],
    "international-occupation-mix.coverage"
  );
  if (data.coverage.classification !== "ISCO-08") {
    throw new Error(
      "[validate] international-occupation-mix: coverage.classification must be ISCO-08"
    );
  }
  if (data.coverage.sex !== "SEX_T") {
    throw new Error(
      "[validate] international-occupation-mix: coverage.sex must be SEX_T"
    );
  }
  const datasetLatestYear = data.coverage.datasetLatestYear;
  if (!(typeof datasetLatestYear === "number" && datasetLatestYear > 2000 && datasetLatestYear <= 2100)) {
    throw new Error(
      "[validate] international-occupation-mix: coverage.datasetLatestYear must be a plausible 4-digit year"
    );
  }

  // Minimum included countries
  if (!Array.isArray(data.included) || data.included.length < 4) {
    throw new Error(
      `[validate] international-occupation-mix: fewer than 4 countries passed gates (got ${Array.isArray(data.included) ? data.included.length : 0})`
    );
  }
  if (data.included.length !== data.coverage.includedCount) {
    throw new Error(
      "[validate] international-occupation-mix: included.length must equal coverage.includedCount"
    );
  }

  // Excluded block
  if (!Array.isArray(data.excluded)) {
    throw new Error("[validate] international-occupation-mix: excluded must be an array");
  }
  for (const e of data.excluded) {
    assertFields(e, ["iso3", "reason"], "international-occupation-mix.excluded[]");
    if (!e.reason || String(e.reason).trim().length === 0) {
      throw new Error(
        `[validate] international-occupation-mix: excluded entry for ${e.iso3} missing reason`
      );
    }
  }

  // Countries block
  if (!data.countries || typeof data.countries !== "object" || Array.isArray(data.countries)) {
    throw new Error("[validate] international-occupation-mix: countries must be an object");
  }
  const ISCO08_GROUPS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (const iso3 of data.included) {
    const c = data.countries[iso3];
    if (!c) {
      throw new Error(`[validate] international-occupation-mix: countries.${iso3} missing`);
    }
    assertFields(
      c,
      ["iso3", "name", "year", "totalEmployment", "groupCoverageRatio", "groups"],
      `international-occupation-mix.countries.${iso3}`
    );

    // Year within window
    const yr = c.year;
    if (typeof yr !== "number" || yr < datasetLatestYear - 3 || yr > datasetLatestYear) {
      throw new Error(
        `[validate] international-occupation-mix.countries.${iso3}: year ${yr} outside qualifying window (${datasetLatestYear - 3}–${datasetLatestYear})`
      );
    }

    // All 9 groups present
    for (const g of ISCO08_GROUPS) {
      const grp = c.groups[String(g)];
      if (!grp || typeof grp !== "object") {
        throw new Error(
          `[validate] international-occupation-mix.countries.${iso3}: missing group ${g}`
        );
      }
      assertFields(grp, ["employment", "share"], `international-occupation-mix.countries.${iso3}.groups.${g}`);
      if (!(typeof grp.employment === "number" && grp.employment > 0)) {
        throw new Error(
          `[validate] international-occupation-mix.countries.${iso3}.groups.${g}: employment must be positive`
        );
      }
      if (!(typeof grp.share === "number" && grp.share > 0 && grp.share < 1)) {
        throw new Error(
          `[validate] international-occupation-mix.countries.${iso3}.groups.${g}: share must be between 0 and 1`
        );
      }
    }

    // Share sum within 0.005 of 1.0 (normalized to group sum, not total)
    const shareSum = ISCO08_GROUPS.reduce((s, g) => s + c.groups[String(g)].share, 0);
    if (Math.abs(shareSum - 1.0) > 0.005) {
      throw new Error(
        `[validate] international-occupation-mix.countries.${iso3}: share sum ${shareSum.toFixed(6)} not within 0.005 of 1.0`
      );
    }

    // Coverage ratio >= 98%
    if (c.groupCoverageRatio < 0.98) {
      throw new Error(
        `[validate] international-occupation-mix.countries.${iso3}: groupCoverageRatio ${c.groupCoverageRatio} below 0.98`
      );
    }

    // No imputed status
    if (Array.isArray(c.observationStatuses)) {
      const IMPUTED = new Set(["I"]);
      const imputed = c.observationStatuses.filter((s) => IMPUTED.has(s));
      if (imputed.length > 0) {
        throw new Error(
          `[validate] international-occupation-mix.countries.${iso3}: imputed observation status present: ${imputed.join(",")}`
        );
      }
    }
  }

  // Dissimilarity block
  assertFields(
    data.dissimilarity,
    ["method", "note", "pairs"],
    "international-occupation-mix.dissimilarity"
  );
  if (!data.dissimilarity.method || String(data.dissimilarity.method).trim().length === 0) {
    throw new Error("[validate] international-occupation-mix: dissimilarity.method must be non-empty");
  }
}

export function validateProvenance(registry, opts = {}) {
  assertFields(registry, ["generatedAt", "datasets"], "provenance");
  assertProvenance(registry, "provenance");
  assertMinRows(registry.datasets, 1, "provenance.datasets");
  for (const entry of registry.datasets) {
    assertFields(
      entry,
      ["id", "file", "generatedAt", "source"],
      `provenance:${entry && entry.id ? entry.id : "?"}`
    );
    assertProvenance(entry, `provenance:${entry.id}`);
    if (entry.source == null) {
      throw new Error(
        `[validate] provenance:${entry.id}: missing source`
      );
    }
  }
  const { expectedIds } = opts;
  if (Array.isArray(expectedIds)) {
    const present = new Set(registry.datasets.map((d) => d.id));
    const missing = expectedIds.filter((id) => !present.has(id));
    if (missing.length > 0) {
      throw new Error(
        `[validate] provenance: registry is missing dataset(s): ${missing.join(", ")}`
      );
    }
  }
}

// ─── Validators for previously ungated builders (issue #116) ──────────────────

/**
 * Validate data/ai-frontier.json.
 * Epoch AI notable models dataset with compute/cost/power trends.
 * @param {Record<string, unknown>} data
 */
export function validateAIFrontier(data) {
  assertFields(
    data,
    ["generatedAt", "source", "counts", "models", "aggregates", "caveats"],
    "ai-frontier"
  );
  assertProvenance(data, "ai-frontier");
  assertMinRows(data.models, 100, "ai-frontier.models");
  if (!data.source || typeof data.source !== "object") {
    throw new Error("[validate] ai-frontier: missing source object");
  }
  if (!data.aggregates || typeof data.aggregates !== "object") {
    throw new Error("[validate] ai-frontier: missing aggregates object");
  }
  if (!Array.isArray(data.caveats) || data.caveats.length === 0) {
    throw new Error("[validate] ai-frontier: caveats must be a non-empty array");
  }
  const counts = data.counts;
  if (!counts || typeof counts.totalRows !== "number" || counts.totalRows < 100) {
    throw new Error("[validate] ai-frontier: counts.totalRows must be >= 100");
  }
}

/**
 * Validate data/ai-usage-proxies.json.
 * Supplemental AI usage/adoption proxy metrics.
 * @param {Record<string, unknown>} data
 */
export function validateAIUsageProxies(data) {
  assertFields(
    data,
    ["generatedAt", "scope", "caveat", "enterpriseAdoptionMetrics", "openModelDownloadProxies"],
    "ai-usage-proxies"
  );
  assertProvenance(data, "ai-usage-proxies");
  if (typeof data.scope !== "string" || data.scope.length === 0) {
    throw new Error("[validate] ai-usage-proxies: scope must be a non-empty string");
  }
  if (typeof data.caveat !== "string" || data.caveat.length === 0) {
    throw new Error("[validate] ai-usage-proxies: caveat must be a non-empty string");
  }
  if (!Array.isArray(data.enterpriseAdoptionMetrics) || data.enterpriseAdoptionMetrics.length === 0) {
    throw new Error("[validate] ai-usage-proxies: enterpriseAdoptionMetrics must be a non-empty array");
  }
  if (!Array.isArray(data.openModelDownloadProxies) || data.openModelDownloadProxies.length === 0) {
    throw new Error("[validate] ai-usage-proxies: openModelDownloadProxies must be a non-empty array");
  }
}

/**
 * Validate data/global-ai-metrics.json.
 * Multi-source global AI readiness/diffusion metrics.
 * @param {Record<string, unknown>} data
 */
export function validateGlobalMetrics(data) {
  assertFields(
    data,
    ["generatedAt", "sources", "metrics"],
    "global-ai-metrics"
  );
  assertProvenance(data, "global-ai-metrics");
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    throw new Error("[validate] global-ai-metrics: sources must be a non-empty array");
  }
  const metrics = data.metrics;
  if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)) {
    throw new Error("[validate] global-ai-metrics: metrics must be a non-null object");
  }
  if (!metrics.diffusion || typeof metrics.diffusion !== "object") {
    throw new Error("[validate] global-ai-metrics: metrics.diffusion must be a non-null object");
  }
  if (Object.keys(metrics.diffusion).length < 20) {
    throw new Error("[validate] global-ai-metrics: metrics.diffusion must have >= 20 countries");
  }
}

/**
 * Validate data/market-ai-signals.json.
 * Sector ETF market sensitivity analysis.
 * @param {Record<string, unknown>} data
 */
export function validateMarketSignals(data) {
  assertFields(
    data,
    ["generatedAt", "source", "methodology", "benchmark", "sectors", "summary"],
    "market-ai-signals"
  );
  assertProvenance(data, "market-ai-signals");
  assertMinRows(data.sectors, 8, "market-ai-signals.sectors");
  if (!data.benchmark || typeof data.benchmark !== "object") {
    throw new Error("[validate] market-ai-signals: benchmark must be an object");
  }
  if (!data.summary || typeof data.summary !== "object") {
    throw new Error("[validate] market-ai-signals: summary must be an object");
  }
  // Sector names must be unique
  const sectorNames = new Set();
  for (const sector of data.sectors) {
    if (!sector.name || typeof sector.name !== "string") {
      throw new Error("[validate] market-ai-signals: each sector must have a non-empty name");
    }
    if (sectorNames.has(sector.name)) {
      throw new Error(`[validate] market-ai-signals: duplicate sector name: ${sector.name}`);
    }
    sectorNames.add(sector.name);
  }
}

/**
 * Validate data/onet-enrichment.json.
 * O*NET enrichment data for priority occupations.
 * @param {Record<string, unknown>} data
 */
export function validateOnetEnrichment(data) {
  assertFields(
    data,
    ["generatedAt", "source", "coverage", "occupations"],
    "onet-enrichment"
  );
  assertProvenance(data, "onet-enrichment");
  if (!data.source || typeof data.source !== "object") {
    throw new Error("[validate] onet-enrichment: missing source object");
  }
  if (!data.coverage || typeof data.coverage !== "object") {
    throw new Error("[validate] onet-enrichment: missing coverage object");
  }
  const occupations = data.occupations;
  if (!occupations || typeof occupations !== "object" || Array.isArray(occupations)) {
    throw new Error("[validate] onet-enrichment: occupations must be a non-null object");
  }
  const enriched = Object.keys(occupations).length;
  if (enriched < 50) {
    throw new Error(
      `[validate] onet-enrichment: too few enriched occupations — got ${enriched}, need at least 50`
    );
  }
}

/**
 * Validate data/world-countries.geo.json.
 * Natural Earth 110m country polygons in GeoJSON format.
 * @param {Record<string, unknown>} data
 */
export function validateWorldGeo(data) {
  if (data.type !== "FeatureCollection") {
    throw new Error("[validate] world-geo: type must be FeatureCollection");
  }
  if (!Array.isArray(data.features) || data.features.length < 170) {
    throw new Error(
      `[validate] world-geo: expected >= 170 features, got ${Array.isArray(data.features) ? data.features.length : 0}`
    );
  }
  // ISO3 uniqueness
  const ids = new Set();
  for (const f of data.features) {
    if (!f.id || typeof f.id !== "string" || f.id.length !== 3) {
      throw new Error(`[validate] world-geo: feature missing valid 3-letter id: ${f.id}`);
    }
    if (ids.has(f.id)) {
      throw new Error(`[validate] world-geo: duplicate ISO3 feature id: ${f.id}`);
    }
    ids.add(f.id);
  }
  // Required countries
  const required = ["CHN", "USA", "IND", "BRA"];
  for (const iso of required) {
    if (!ids.has(iso)) {
      throw new Error(`[validate] world-geo: missing required country: ${iso}`);
    }
  }
}

/**
 * Validate output of build-ai-signals.mjs individual files.
 * Checks the llm-exposure.json, ai-demand.json, ai-layoffs.json,
 * aioe-exposure.json, automation-baseline.json shapes.
 * @param {Record<string, unknown>} data
 * @param {string} filename
 */
export function validateAISignalsFile(data, filename) {
  const name = `ai-signals:${filename}`;
  assertProvenance(data, name);
  if (!data.source || typeof data.source !== "object") {
    throw new Error(`[validate] ${name}: missing source object`);
  }

  // File-specific shape validation
  switch (filename) {
    case "llm-exposure.json": {
      if (!data.bySoc || typeof data.bySoc !== "object" || Array.isArray(data.bySoc)) {
        throw new Error(`[validate] ${name}: bySoc must be a non-null object`);
      }
      if (Object.keys(data.bySoc).length < 100) {
        throw new Error(`[validate] ${name}: bySoc must have >= 100 entries`);
      }
      for (const [soc, value] of Object.entries(data.bySoc)) {
        if (!/^\d{2}-\d{4}$/.test(soc)) {
          throw new Error(`[validate] ${name}: invalid SOC key "${soc}"`);
        }
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
          throw new Error(`[validate] ${name}: bySoc["${soc}"] must be a number in [0,1]`);
        }
      }
      break;
    }

    case "aioe-exposure.json": {
      if (!data.bySoc || typeof data.bySoc !== "object" || Array.isArray(data.bySoc)) {
        throw new Error(`[validate] ${name}: bySoc must be a non-null object`);
      }
      if (Object.keys(data.bySoc).length < 100) {
        throw new Error(`[validate] ${name}: bySoc must have >= 100 entries`);
      }
      for (const [soc, value] of Object.entries(data.bySoc)) {
        if (!/^\d{2}-\d{4}$/.test(soc)) {
          throw new Error(`[validate] ${name}: invalid SOC key "${soc}"`);
        }
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
          throw new Error(`[validate] ${name}: bySoc["${soc}"] must be a number in [0,1]`);
        }
      }
      if (typeof data.note !== "string" || data.note.length === 0) {
        throw new Error(`[validate] ${name}: note must be a non-empty string`);
      }
      break;
    }

    case "automation-baseline.json": {
      if (!data.bySoc || typeof data.bySoc !== "object" || Array.isArray(data.bySoc)) {
        throw new Error(`[validate] ${name}: bySoc must be a non-null object`);
      }
      if (Object.keys(data.bySoc).length < 100) {
        throw new Error(`[validate] ${name}: bySoc must have >= 100 entries`);
      }
      for (const [soc, value] of Object.entries(data.bySoc)) {
        if (!/^\d{2}-\d{4}$/.test(soc)) {
          throw new Error(`[validate] ${name}: invalid SOC key "${soc}"`);
        }
        if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
          throw new Error(`[validate] ${name}: bySoc["${soc}"] must be a number in [0,1]`);
        }
      }
      if (typeof data.note !== "string" || data.note.length === 0) {
        throw new Error(`[validate] ${name}: note must be a non-empty string`);
      }
      break;
    }

    case "ai-demand.json": {
      if (!Array.isArray(data.countries) || data.countries.length < 1) {
        throw new Error(`[validate] ${name}: countries must be a non-empty array`);
      }
      if (!Array.isArray(data.series) || data.series.length < 1) {
        throw new Error(`[validate] ${name}: series must be a non-empty array`);
      }
      for (const entry of data.series) {
        if (typeof entry.country !== "string" || !entry.country) {
          throw new Error(`[validate] ${name}: series entry missing country`);
        }
        if (!Array.isArray(entry.points) || entry.points.length < 6) {
          throw new Error(
            `[validate] ${name}: series entry "${entry.country}" must have >= 6 monthly points`
          );
        }
        for (const point of entry.points) {
          if (!/^\d{4}-\d{2}$/.test(point.month)) {
            throw new Error(
              `[validate] ${name}: series point month must be YYYY-MM, got "${point.month}"`
            );
          }
        }
      }
      if (!Array.isArray(data.latest) || data.latest.length < 1) {
        throw new Error(`[validate] ${name}: latest must be a non-empty array`);
      }
      break;
    }

    case "ai-layoffs.json": {
      if (!Array.isArray(data.annual) || data.annual.length < 1) {
        throw new Error(`[validate] ${name}: annual must be a non-empty array`);
      }
      for (const entry of data.annual) {
        if (typeof entry.year !== "number" || !Number.isFinite(entry.year)) {
          throw new Error(`[validate] ${name}: annual entry missing valid year`);
        }
        if (typeof entry.cuts !== "number" || !Number.isFinite(entry.cuts) || entry.cuts < 0) {
          throw new Error(`[validate] ${name}: annual entry missing valid cuts count`);
        }
      }
      if (!Array.isArray(data.monthly) || data.monthly.length < 1) {
        throw new Error(`[validate] ${name}: monthly must be a non-empty array`);
      }
      for (const entry of data.monthly) {
        if (!/^\d{4}-\d{2}$/.test(entry.month)) {
          throw new Error(
            `[validate] ${name}: monthly entry month must be YYYY-MM, got "${entry.month}"`
          );
        }
        if (typeof entry.cuts !== "number" || !Number.isFinite(entry.cuts) || entry.cuts < 0) {
          throw new Error(`[validate] ${name}: monthly entry missing valid cuts count`);
        }
      }
      if (typeof data.note !== "string" || data.note.length === 0) {
        throw new Error(`[validate] ${name}: note must be a non-empty string`);
      }
      break;
    }

    default:
      throw new Error(
        `[validate] ${name}: unknown AI signals filename "${filename}"; expected one of: llm-exposure.json, aioe-exposure.json, automation-baseline.json, ai-demand.json, ai-layoffs.json`
      );
  }
}

/**
 * Validate data/country-exposure.json.
 * { meta, data } with ~195 country rows keyed by iso3.
 * Thresholds: >= 150 countries (≈80 % of 195).
 * @param {Record<string, unknown>} dataset
 */
export function validateCountryExposure(dataset) {
  assertFields(dataset, ["meta", "data"], "country-exposure");
  assertProvenance(dataset, "country-exposure");
  assertMinRows(dataset.data, 150, "country-exposure.data");
  if (dataset.data.length > 0) {
    assertFields(
      dataset.data[0],
      ["iso3", "name"],
      "country-exposure.data[0]"
    );
  }
}

/**
 * Validate data/sources.json.
 * Top-level keys: generatedAt, license, attribution, sources (array), note.
 * Thresholds: >= 30 sources (≈80 % of 43).
 * @param {Record<string, unknown>} data
 */
export function validateSources(data) {
  assertFields(
    data,
    ["generatedAt", "license", "attribution", "sources", "note"],
    "sources"
  );
  assertProvenance(data, "sources");
  if (!Array.isArray(data.sources) || data.sources.length < 30) {
    throw new Error(
      `[validate] sources: expected >= 30 source entries, got ${Array.isArray(data.sources) ? data.sources.length : 0}`
    );
  }
  // Each source must have name and publisher
  for (let i = 0; i < data.sources.length; i++) {
    const s = data.sources[i];
    if (!s.name || typeof s.name !== "string") {
      throw new Error(`[validate] sources[${i}]: missing or empty name`);
    }
    if (!s.publisher || typeof s.publisher !== "string") {
      throw new Error(`[validate] sources[${i}]: missing or empty publisher`);
    }
  }
}
