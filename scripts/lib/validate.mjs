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
 * Current committed file: 756 occupations (plain array).
 * No generatedAt in this file (see issue #52) — provenance is NOT required.
 * @param {Array<Record<string, unknown>>} data  the parsed JSON (an array)
 */
export function validateOccupationSnapshot(data) {
  assertMinRows(data, 680, "occupation-snapshot");
  // Spot-check required fields on first entry
  if (data.length > 0) {
    assertFields(
      data[0],
      ["socCode", "title", "sector", "aiExposure", "automationRisk"],
      "occupation-snapshot[0]"
    );
  }
}

/**
 * Validate data/occupation-snapshot-slim.json.
 * Current committed file: 756 rows (plain array, no generatedAt).
 * No provenance check — this file is derived from occupation-snapshot.json.
 * @param {Array<Record<string, unknown>>} data  the parsed JSON (an array)
 */
export function validateOccupationSnapshotSlim(data) {
  assertMinRows(data, 680, "occupation-snapshot-slim");
  if (data.length > 0) {
    assertFields(
      data[0],
      ["socCode", "title", "sector", "aiExposure", "automationRisk"],
      "occupation-snapshot-slim[0]"
    );
  }
}
