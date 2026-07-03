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

// ─── Per-dataset validators ───────────────────────────────────────────────────

// Minimum live WARN states that MUST always be present in coverage.
// Derived from the current 16-state live set; these 11 are the conservative
// must-have subset per issue #49.
const REQUIRED_LIVE_WARN_STATES = [
  "CA", "GA", "IA", "KY", "NJ", "NY", "OH", "OR", "TN", "TX", "WI",
];

/**
 * Validate data/warn-notices.json.
 * Current committed file: 12,527 notices, 51 coverageStates, 16 live states.
 * Thresholds set at ≈80 % of current values.
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
 * Validate data/provenance.json (the central provenance registry, issue #52).
 * Ensures the registry lists datasets and that every entry carries a
 * generatedAt timestamp and a source.
 * @param {Record<string, unknown>} registry
 * @param {{ expectedIds?: string[] }} [opts]
 */
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
