/**
 * scripts/lib/data360.mjs
 * Pure helpers for World Bank Data360 OECD_AI dataset processing.
 * Extracted from build-ai-usage-proxies.mjs to allow focused unit testing
 * without triggering the builder's HTTP side-effects.
 */

/**
 * Returns true for URL prefixes that require the node:https HTTP/1.1 fallback.
 * Node.js native fetch uses HTTP/2 which triggers HTTP 417 Expectation Failed
 * from certain government/intergovernmental API hosts (Census, OECD SDMX,
 * World Bank Data360).
 *
 * @param {string} url
 * @returns {boolean}
 */
export function needsHttpsFallback(url) {
  return (
    url.startsWith("https://api.census.gov/") ||
    url.startsWith("https://sdmx.oecd.org/") ||
    url.startsWith("https://data360api.worldbank.org/")
  );
}

function round(value, digits = 4) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * Processes raw OECD_AI rows from the World Bank Data360 API.
 *
 * Filters to the OECD_AI_PUBS_TOT indicator, selects the latest TIME_PERIOD
 * per REF_AREA (country), maps to a normalized country entry, and sorts
 * descending by value.
 *
 * @param {Array<Record<string, unknown>>} rows  Raw page rows from all fetched pages.
 * @param {Map<string, string>} [countryNames]   Optional ISO-3 → display name map.
 * @returns {Array<{geo: {code: string, name: string}, period: string, value: number, unit: string|undefined, status: unknown}>}
 */
export function processData360Rows(rows, countryNames = new Map()) {
  const latestByCountry = new Map();
  for (const row of rows) {
    if (row.INDICATOR !== "OECD_AI_PUBS_TOT" || !row.REF_AREA || !row.TIME_PERIOD) continue;
    const existing = latestByCountry.get(row.REF_AREA);
    if (!existing || Number(row.TIME_PERIOD) > Number(existing.TIME_PERIOD)) {
      latestByCountry.set(row.REF_AREA, row);
    }
  }
  return Array.from(latestByCountry.values())
    .map((row) => ({
      geo: { code: row.REF_AREA, name: countryNames.get(row.REF_AREA) ?? row.REF_AREA },
      period: row.TIME_PERIOD,
      value: round(Number(row.OBS_VALUE), 3),
      unit: row.UNIT_MEASURE,
      status: row.OBS_STATUS,
    }))
    .filter((row) => Number.isFinite(row.value))
    .sort((a, b) => b.value - a.value);
}
