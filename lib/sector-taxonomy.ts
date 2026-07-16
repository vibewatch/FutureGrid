/**
 * lib/sector-taxonomy.ts
 *
 * Canonical sector taxonomy for FutureGrid.
 *
 * FutureGrid tracks 22 industry sectors that correspond exactly to the U.S.
 * Bureau of Labor Statistics Standard Occupational Classification (SOC)
 * major groups. The source data (Anthropic Economic Index CSV) uses abbreviated
 * display labels for some sectors (e.g. "Computer & Mathematical" instead of
 * the BLS canonical "Computer and Mathematical"). This module is the single
 * source of truth for:
 *
 *   - The 22 canonical sector names  (CANONICAL_SECTORS)
 *   - The alias → canonical mapping  (SECTOR_ALIAS_MAP)
 *   - The SOC prefix → canonical mapping  (SOC_PREFIX_TO_SECTOR)
 *   - The canonicalizeSector() helper used by all data consumers
 *
 * Add new aliases here; do not add ad hoc replacements at individual call sites.
 */

// ─── Canonical sector list (BLS SOC major group names) ───────────────────────

export const CANONICAL_SECTORS = [
  "Architecture and Engineering",
  "Arts, Design, Entertainment, Sports, and Media",
  "Building and Grounds Cleaning and Maintenance",
  "Business and Financial Operations",
  "Community and Social Service",
  "Computer and Mathematical",
  "Construction and Extraction",
  "Education, Training, and Library",
  "Farming, Fishing, and Forestry",
  "Food Preparation and Serving Related",
  "Healthcare Practitioners and Technical",
  "Healthcare Support",
  "Installation, Maintenance, and Repair",
  "Legal",
  "Life, Physical, and Social Science",
  "Management",
  "Office and Administrative Support",
  "Personal Care and Service",
  "Production",
  "Protective Service",
  "Sales and Related",
  "Transportation and Material Moving",
] as const;

export type CanonicalSector = (typeof CANONICAL_SECTORS)[number];

// ─── Alias map ────────────────────────────────────────────────────────────────
//
// Maps every known non-canonical label to its canonical counterpart.
// Covers:
//   - Ampersand vs "and"  (AEI CSV uses "&"; BLS uses "and")
//   - Abbreviated labels  (AEI JobFamily column)
//   - SECTOR_FALLBACK abbreviations  (build-data-snapshot.mjs fallback map)

export const SECTOR_ALIAS_MAP: Readonly<Record<string, CanonicalSector>> = {
  // ── Ampersand vs "and" (same sector, different punctuation) ─────────────────
  "Computer & Mathematical": "Computer and Mathematical",
  "Life, Physical & Social Science": "Life, Physical, and Social Science",

  // ── AEI JobFamily column abbreviated labels ──────────────────────────────────
  "Arts, Entertainment & Media": "Arts, Design, Entertainment, Sports, and Media",
  "Business & Financial": "Business and Financial Operations",
  "Education & Library": "Education, Training, and Library",
  // "Healthcare" alone is the AEI abbreviation for the 29-xxxx practitioners group.
  // "Healthcare Support" (31-xxxx) is already canonical and must remain distinct.
  "Healthcare": "Healthcare Practitioners and Technical",
  // "Construction" alone (47-5xxx mining/extraction SOCs) belongs in "Construction and Extraction".
  "Construction": "Construction and Extraction",
  "Food Preparation": "Food Preparation and Serving Related",
  "Personal Care": "Personal Care and Service",
  "Transportation & Logistics": "Transportation and Material Moving",

  // ── SECTOR_FALLBACK abbreviations (build-data-snapshot.mjs fallback map) ────
  "Architecture & Engineering": "Architecture and Engineering",
  "Community & Social Service": "Community and Social Service",
  "Building & Grounds": "Building and Grounds Cleaning and Maintenance",
  "Sales": "Sales and Related",
  "Office & Administrative": "Office and Administrative Support",
  "Farming & Forestry": "Farming, Fishing, and Forestry",
  "Installation & Repair": "Installation, Maintenance, and Repair",
} as const;

// ─── SOC prefix → canonical sector ───────────────────────────────────────────
//
// Maps the two-digit SOC major-group prefix to the canonical sector name.
// Used as the authoritative fallback when a raw sector label is absent or
// unrecognised by the alias map.

export const SOC_PREFIX_TO_SECTOR: Readonly<Record<string, CanonicalSector>> = {
  "11": "Management",
  "13": "Business and Financial Operations",
  "15": "Computer and Mathematical",
  "17": "Architecture and Engineering",
  "19": "Life, Physical, and Social Science",
  "21": "Community and Social Service",
  "23": "Legal",
  "25": "Education, Training, and Library",
  "27": "Arts, Design, Entertainment, Sports, and Media",
  "29": "Healthcare Practitioners and Technical",
  "31": "Healthcare Support",
  "33": "Protective Service",
  "35": "Food Preparation and Serving Related",
  "37": "Building and Grounds Cleaning and Maintenance",
  "39": "Personal Care and Service",
  "41": "Sales and Related",
  "43": "Office and Administrative Support",
  "45": "Farming, Fishing, and Forestry",
  "47": "Construction and Extraction",
  "49": "Installation, Maintenance, and Repair",
  "51": "Production",
  "53": "Transportation and Material Moving",
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve a raw sector label to its canonical form.
 *
 * If `raw` is already canonical, it is returned unchanged (identity).
 * If `raw` is a known alias, its canonical counterpart is returned.
 * Otherwise `raw` is returned as-is (unknown sectors are preserved, not
 * silently dropped).
 */
export function canonicalizeSector(raw: string): string {
  const trimmed = raw.trim();
  return (SECTOR_ALIAS_MAP as Record<string, string>)[trimmed] ?? trimmed;
}

/**
 * Derive the canonical sector for a SOC code from the SOC major-group prefix,
 * bypassing any raw label. Used as a build-time authoritative fallback.
 */
export function sectorFromSocCode(socCode: string): CanonicalSector | null {
  const prefix = socCode.slice(0, 2);
  return (SOC_PREFIX_TO_SECTOR as Record<string, CanonicalSector>)[prefix] ?? null;
}

/**
 * Return true if `name` is already a canonical sector name.
 */
export function isCanonicalSector(name: string): name is CanonicalSector {
  return (CANONICAL_SECTORS as readonly string[]).includes(name);
}
