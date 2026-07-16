/**
 * scripts/lib/sector-taxonomy.mjs
 *
 * Build-time mirror of lib/sector-taxonomy.ts.
 * Keep in sync with the TypeScript source.
 */

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
];

export const SECTOR_ALIAS_MAP = {
  "Computer & Mathematical": "Computer and Mathematical",
  "Life, Physical & Social Science": "Life, Physical, and Social Science",
  "Arts, Entertainment & Media": "Arts, Design, Entertainment, Sports, and Media",
  "Business & Financial": "Business and Financial Operations",
  "Education & Library": "Education, Training, and Library",
  "Healthcare": "Healthcare Practitioners and Technical",
  "Construction": "Construction and Extraction",
  "Food Preparation": "Food Preparation and Serving Related",
  "Personal Care": "Personal Care and Service",
  "Transportation & Logistics": "Transportation and Material Moving",
  "Architecture & Engineering": "Architecture and Engineering",
  "Community & Social Service": "Community and Social Service",
  "Building & Grounds": "Building and Grounds Cleaning and Maintenance",
  "Sales": "Sales and Related",
  "Office & Administrative": "Office and Administrative Support",
  "Farming & Forestry": "Farming, Fishing, and Forestry",
  "Installation & Repair": "Installation, Maintenance, and Repair",
};

export const SOC_PREFIX_TO_SECTOR = {
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
};

/** Resolve a raw sector label to its canonical form. */
export function canonicalizeSector(raw) {
  const trimmed = (raw ?? "").trim();
  return SECTOR_ALIAS_MAP[trimmed] ?? trimmed;
}

/** Derive canonical sector from the SOC major-group prefix. */
export function sectorFromSocCode(socCode) {
  const prefix = (socCode ?? "").slice(0, 2);
  return SOC_PREFIX_TO_SECTOR[prefix] ?? null;
}

/** Return true if name is already a canonical sector name. */
export function isCanonicalSector(name) {
  return CANONICAL_SECTORS.includes(name);
}
