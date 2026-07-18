/**
 * scripts/lib/country-iso3.mjs
 *
 * Small, explicit, self-contained country-name → ISO-3166-1 alpha-3 lookup for
 * data builders. Deterministic, offline, and dependency-free — NO network, NO
 * keyed API, NO npm package. Used by build-ai-frontier.mjs to derive a purely
 * geographic join key (`iso3`) for the country leaderboard so the UI can plot a
 * world-map choropleth.
 *
 * SCOPE / SEMANTICS:
 *   • `iso3` is ONLY a geographic join key. It carries NO capability, impact,
 *     leadership, or ranking meaning (see PR #129 / commit dc587bea). It exists
 *     solely so a country can be matched to a polygon in
 *     public/world-countries.geo.json.
 *   • Aggregate / multinational / non-country entities (e.g. "Multinational")
 *     have no ISO-3 code and resolve to null.
 *   • The lookup is keyed on the NORMALISED short display names produced by
 *     build-ai-frontier.mjs's COUNTRY_SHORT_MAP (e.g. "United States",
 *     "South Korea", "UAE") as well as the common verbose ISO variants, so the
 *     mapping stays stable across source refreshes.
 *
 * The name-override table is seeded from the same conventions already used by
 * scripts/build-global-metrics.mjs (NAME_OVERRIDES) — but as a static, offline
 * table here so this builder never needs the network ISO crosswalk.
 */

/**
 * Static name → ISO-3 alpha-3 table. Keys are matched case-insensitively after
 * trimming (see {@link countryNameToIso3}). Both short display names and common
 * verbose ISO variants are included.
 * @type {Record<string, string>}
 */
export const COUNTRY_NAME_TO_ISO3 = {
  // ── Americas ──────────────────────────────────────────────────────────────
  "united states": "USA",
  "united states of america": "USA",
  canada: "CAN",
  mexico: "MEX",
  brazil: "BRA",
  argentina: "ARG",
  chile: "CHL",
  colombia: "COL",
  peru: "PER",
  uruguay: "URY",
  bolivia: "BOL",
  venezuela: "VEN",

  // ── Europe ──────────────────────────────────────────────────────────────
  "united kingdom": "GBR",
  "united kingdom of great britain and northern ireland": "GBR",
  france: "FRA",
  germany: "DEU",
  italy: "ITA",
  spain: "ESP",
  portugal: "PRT",
  netherlands: "NLD",
  belgium: "BEL",
  luxembourg: "LUX",
  switzerland: "CHE",
  austria: "AUT",
  ireland: "IRL",
  denmark: "DNK",
  sweden: "SWE",
  norway: "NOR",
  finland: "FIN",
  iceland: "ISL",
  poland: "POL",
  czechia: "CZE",
  "czech republic": "CZE",
  slovakia: "SVK",
  hungary: "HUN",
  romania: "ROU",
  bulgaria: "BGR",
  greece: "GRC",
  croatia: "HRV",
  slovenia: "SVN",
  serbia: "SRB",
  ukraine: "UKR",
  russia: "RUS",
  "russian federation": "RUS",
  estonia: "EST",
  latvia: "LVA",
  lithuania: "LTU",
  turkey: "TUR",
  "türkiye": "TUR",

  // ── Asia-Pacific ──────────────────────────────────────────────────────────
  china: "CHN",
  japan: "JPN",
  "south korea": "KOR",
  "korea (republic of)": "KOR",
  "korea, republic of": "KOR",
  "north korea": "PRK",
  india: "IND",
  taiwan: "TWN",
  "taiwan, province of china": "TWN",
  "hong kong": "HKG",
  macau: "MAC",
  singapore: "SGP",
  malaysia: "MYS",
  indonesia: "IDN",
  thailand: "THA",
  vietnam: "VNM",
  "viet nam": "VNM",
  philippines: "PHL",
  australia: "AUS",
  "new zealand": "NZL",
  pakistan: "PAK",
  bangladesh: "BGD",
  "sri lanka": "LKA",

  // ── Middle East ─────────────────────────────────────────────────────────
  israel: "ISR",
  "saudi arabia": "SAU",
  uae: "ARE",
  "united arab emirates": "ARE",
  qatar: "QAT",
  kuwait: "KWT",
  bahrain: "BHR",
  oman: "OMN",
  jordan: "JOR",
  lebanon: "LBN",
  iran: "IRN",
  "iran (islamic republic of)": "IRN",
  "iran, islamic republic of": "IRN",
  iraq: "IRQ",

  // ── Africa ────────────────────────────────────────────────────────────────
  "south africa": "ZAF",
  egypt: "EGY",
  nigeria: "NGA",
  kenya: "KEN",
  morocco: "MAR",
  tunisia: "TUN",
  algeria: "DZA",
  ethiopia: "ETH",
  ghana: "GHA",
};

/**
 * Resolve a country display name to an ISO-3 alpha-3 code.
 *
 * Returns null for empty input, aggregate/multinational labels, or any name not
 * present in {@link COUNTRY_NAME_TO_ISO3}. The caller decides whether the
 * resulting code is actually plottable (i.e. present as a feature id in the
 * world-map GeoJSON); this function only performs the name → code lookup.
 *
 * @param {string | null | undefined} name  country display name
 * @returns {string | null} ISO-3 alpha-3 code, or null if unmappable
 */
export function countryNameToIso3(name) {
  if (name == null) return null;
  const key = String(name).trim().toLowerCase();
  if (!key) return null;
  return COUNTRY_NAME_TO_ISO3[key] ?? null;
}
