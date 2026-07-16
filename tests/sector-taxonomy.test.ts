import { describe, it, expect } from "vitest";
import {
  CANONICAL_SECTORS,
  SECTOR_ALIAS_MAP,
  SOC_PREFIX_TO_SECTOR,
  canonicalizeSector,
  sectorFromSocCode,
  isCanonicalSector,
} from "@/lib/sector-taxonomy";
import { generateAllCareerInsights, getSectorAggregatesExtended } from "@/lib/data";

// ── canonical sector list ────────────────────────────────────────────────────

describe("CANONICAL_SECTORS", () => {
  it("has exactly 22 entries (one per BLS SOC major group)", () => {
    expect(CANONICAL_SECTORS).toHaveLength(22);
  });

  it("contains no duplicate entries", () => {
    const unique = new Set(CANONICAL_SECTORS);
    expect(unique.size).toBe(22);
  });

  it("includes the Computer and Mathematical sector", () => {
    expect(CANONICAL_SECTORS).toContain("Computer and Mathematical");
  });

  it("does not include abbreviated forms as canonical", () => {
    expect(CANONICAL_SECTORS).not.toContain("Computer & Mathematical");
    expect(CANONICAL_SECTORS).not.toContain("Healthcare");
    expect(CANONICAL_SECTORS).not.toContain("Construction");
    expect(CANONICAL_SECTORS).not.toContain("Business & Financial");
  });
});

// ── SOC_PREFIX_TO_SECTOR ─────────────────────────────────────────────────────

describe("SOC_PREFIX_TO_SECTOR", () => {
  it("covers all 22 BLS SOC major-group prefixes", () => {
    const expectedPrefixes = [
      "11","13","15","17","19","21","23","25","27","29",
      "31","33","35","37","39","41","43","45","47","49","51","53",
    ];
    for (const prefix of expectedPrefixes) {
      expect(SOC_PREFIX_TO_SECTOR[prefix]).toBeDefined();
    }
    expect(Object.keys(SOC_PREFIX_TO_SECTOR)).toHaveLength(22);
  });

  it("all values are canonical sector names", () => {
    for (const [prefix, sector] of Object.entries(SOC_PREFIX_TO_SECTOR)) {
      expect(
        isCanonicalSector(sector),
        `SOC_PREFIX_TO_SECTOR["${prefix}"] = "${sector}" is not canonical`
      ).toBe(true);
    }
  });
});

// ── SECTOR_ALIAS_MAP ─────────────────────────────────────────────────────────

describe("SECTOR_ALIAS_MAP", () => {
  it("all values are canonical sector names", () => {
    for (const [alias, canonical] of Object.entries(SECTOR_ALIAS_MAP)) {
      expect(
        isCanonicalSector(canonical),
        `SECTOR_ALIAS_MAP["${alias}"] = "${canonical}" is not canonical`
      ).toBe(true);
    }
  });

  it("no alias key is itself a canonical sector name (no identity alias)", () => {
    for (const alias of Object.keys(SECTOR_ALIAS_MAP)) {
      expect(
        isCanonicalSector(alias),
        `"${alias}" is in both CANONICAL_SECTORS and SECTOR_ALIAS_MAP (identity alias)`
      ).toBe(false);
    }
  });

  // ── Reported pair ──────────────────────────────────────────────────────────
  it("resolves the reported pair: 'Computer & Mathematical' → 'Computer and Mathematical'", () => {
    expect(SECTOR_ALIAS_MAP["Computer & Mathematical"]).toBe("Computer and Mathematical");
  });

  // ── All 10 alias families ──────────────────────────────────────────────────
  it("resolves all ampersand aliases", () => {
    expect(SECTOR_ALIAS_MAP["Life, Physical & Social Science"]).toBe("Life, Physical, and Social Science");
    expect(SECTOR_ALIAS_MAP["Architecture & Engineering"]).toBe("Architecture and Engineering");
    expect(SECTOR_ALIAS_MAP["Community & Social Service"]).toBe("Community and Social Service");
    expect(SECTOR_ALIAS_MAP["Building & Grounds"]).toBe("Building and Grounds Cleaning and Maintenance");
    expect(SECTOR_ALIAS_MAP["Office & Administrative"]).toBe("Office and Administrative Support");
    expect(SECTOR_ALIAS_MAP["Farming & Forestry"]).toBe("Farming, Fishing, and Forestry");
    expect(SECTOR_ALIAS_MAP["Installation & Repair"]).toBe("Installation, Maintenance, and Repair");
    expect(SECTOR_ALIAS_MAP["Transportation & Logistics"]).toBe("Transportation and Material Moving");
  });

  it("resolves abbreviated AEI JobFamily labels", () => {
    expect(SECTOR_ALIAS_MAP["Arts, Entertainment & Media"]).toBe(
      "Arts, Design, Entertainment, Sports, and Media"
    );
    expect(SECTOR_ALIAS_MAP["Business & Financial"]).toBe("Business and Financial Operations");
    expect(SECTOR_ALIAS_MAP["Education & Library"]).toBe("Education, Training, and Library");
    expect(SECTOR_ALIAS_MAP["Healthcare"]).toBe("Healthcare Practitioners and Technical");
    expect(SECTOR_ALIAS_MAP["Construction"]).toBe("Construction and Extraction");
    expect(SECTOR_ALIAS_MAP["Food Preparation"]).toBe("Food Preparation and Serving Related");
    expect(SECTOR_ALIAS_MAP["Personal Care"]).toBe("Personal Care and Service");
    expect(SECTOR_ALIAS_MAP["Sales"]).toBe("Sales and Related");
  });

  it("keeps Healthcare Support separate from Healthcare Practitioners (different SOC major groups)", () => {
    // "Healthcare" is an alias for the 29-xxxx practitioners group
    expect(SECTOR_ALIAS_MAP["Healthcare"]).toBe("Healthcare Practitioners and Technical");
    // "Healthcare Support" must NOT appear as an alias — it is already canonical (31-xxxx)
    expect(SECTOR_ALIAS_MAP["Healthcare Support"]).toBeUndefined();
  });
});

// ── canonicalizeSector() ─────────────────────────────────────────────────────

describe("canonicalizeSector()", () => {
  it("returns canonical inputs unchanged (idempotent identity)", () => {
    for (const sector of CANONICAL_SECTORS) {
      expect(canonicalizeSector(sector)).toBe(sector);
    }
  });

  it("is idempotent (applying twice equals applying once)", () => {
    for (const alias of Object.keys(SECTOR_ALIAS_MAP)) {
      const once = canonicalizeSector(alias);
      const twice = canonicalizeSector(once);
      expect(twice).toBe(once);
    }
  });

  it("resolves the reported pair", () => {
    expect(canonicalizeSector("Computer & Mathematical")).toBe("Computer and Mathematical");
  });

  it("trims leading/trailing whitespace before resolving", () => {
    expect(canonicalizeSector("  Computer & Mathematical  ")).toBe("Computer and Mathematical");
  });

  it("returns unknown sector names unchanged (preserves unknown, does not drop)", () => {
    expect(canonicalizeSector("Quantum Computing")).toBe("Quantum Computing");
  });

  it("resolves all 10 alias families", () => {
    const cases: [string, string][] = [
      ["Computer & Mathematical",       "Computer and Mathematical"],
      ["Life, Physical & Social Science","Life, Physical, and Social Science"],
      ["Arts, Entertainment & Media",   "Arts, Design, Entertainment, Sports, and Media"],
      ["Business & Financial",          "Business and Financial Operations"],
      ["Education & Library",           "Education, Training, and Library"],
      ["Healthcare",                    "Healthcare Practitioners and Technical"],
      ["Construction",                  "Construction and Extraction"],
      ["Food Preparation",              "Food Preparation and Serving Related"],
      ["Personal Care",                 "Personal Care and Service"],
      ["Transportation & Logistics",    "Transportation and Material Moving"],
    ];
    for (const [alias, canonical] of cases) {
      expect(canonicalizeSector(alias), `alias "${alias}"`).toBe(canonical);
    }
  });
});

// ── sectorFromSocCode() ──────────────────────────────────────────────────────

describe("sectorFromSocCode()", () => {
  it("maps SOC prefix 15 → Computer and Mathematical", () => {
    expect(sectorFromSocCode("15-1252")).toBe("Computer and Mathematical");
  });

  it("maps SOC prefix 43 → Office and Administrative Support", () => {
    expect(sectorFromSocCode("43-4051")).toBe("Office and Administrative Support");
  });

  it("maps SOC prefix 29 → Healthcare Practitioners and Technical", () => {
    expect(sectorFromSocCode("29-1141")).toBe("Healthcare Practitioners and Technical");
  });

  it("maps SOC prefix 31 → Healthcare Support (distinct from 29)", () => {
    expect(sectorFromSocCode("31-1131")).toBe("Healthcare Support");
  });

  it("returns null for unrecognized SOC prefix", () => {
    expect(sectorFromSocCode("99-9999")).toBeNull();
  });

  it("all 22 prefixes return canonical values", () => {
    for (const [prefix, canonical] of Object.entries(SOC_PREFIX_TO_SECTOR)) {
      const result = sectorFromSocCode(`${prefix}-0000`);
      expect(result).toBe(canonical);
    }
  });
});

// ── isCanonicalSector() ──────────────────────────────────────────────────────

describe("isCanonicalSector()", () => {
  it("returns true for all 22 canonical sectors", () => {
    for (const sector of CANONICAL_SECTORS) {
      expect(isCanonicalSector(sector)).toBe(true);
    }
  });

  it("returns false for alias labels", () => {
    expect(isCanonicalSector("Computer & Mathematical")).toBe(false);
    expect(isCanonicalSector("Healthcare")).toBe(false);
    expect(isCanonicalSector("Construction")).toBe(false);
    expect(isCanonicalSector("Arts, Entertainment & Media")).toBe(false);
    expect(isCanonicalSector("Transportation & Logistics")).toBe(false);
  });
});

// ── Integration: getSectorAggregatesExtended() ───────────────────────────────

describe("sector aggregation integration", () => {
  it("returns exactly 22 sector aggregates (no alias duplicates)", () => {
    const sectors = getSectorAggregatesExtended();
    expect(sectors).toHaveLength(22);
  });

  it("all aggregated sector names are canonical", () => {
    const sectors = getSectorAggregatesExtended();
    for (const s of sectors) {
      expect(
        isCanonicalSector(s.sector),
        `"${s.sector}" is not a canonical sector name`
      ).toBe(true);
    }
  });

  it("no duplicate sector names in aggregates", () => {
    const sectors = getSectorAggregatesExtended();
    const names = sectors.map(s => s.sector);
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  it("Computer and Mathematical avgRisk uses employment-weighted formula: Σ(emp·automationProbability) / Σemp", () => {
    // Derive the expected value directly from the same insights generateAllCareerInsights()
    // returns — this proves the formula rather than hardcoding a magic number.
    const insights = generateAllCareerInsights();
    const csInsights = insights.filter(i => i.sectorName === "Computer and Mathematical");
    // 21 occupations after alias merge ("Computer & Mathematical" → canonical)
    expect(csInsights).toHaveLength(21);

    const empSum = csInsights.reduce((s, i) => s + (i.totalEmployment ?? 0), 0);
    const empRiskSum = csInsights.reduce((s, i) => s + (i.totalEmployment ?? 0) * i.automationProbability, 0);
    // All 21 occupations have employment data, so empSum > 0
    expect(empSum).toBeGreaterThan(0);
    const expected = empRiskSum / empSum; // ~0.353

    const sectors = getSectorAggregatesExtended();
    const cs = sectors.find(s => s.sector === "Computer and Mathematical");
    expect(cs).toBeDefined();
    // Result must match the employment-weighted formula derived from source rows
    expect(cs!.avgRisk).toBeCloseTo(expected, 4);
    // Sanity: employment-weighted value is less than count-weighted (~0.379)
    // because high-employment occupations in this sector have below-average risk
    expect(cs!.avgRisk).toBeGreaterThan(0.33);
    expect(cs!.avgRisk).toBeLessThan(0.38);
  });

  it("does not contain an isolated 'Computer & Mathematical' sector (alias eliminated)", () => {
    const sectors = getSectorAggregatesExtended();
    const aliased = sectors.find(s => s.sector === "Computer & Mathematical");
    expect(aliased).toBeUndefined();
  });
});

// ── Integration: generateAllCareerInsights() ─────────────────────────────────

describe("career insights sector invariant", () => {
  it("all career insights have canonical sector names", () => {
    const insights = generateAllCareerInsights();
    for (const insight of insights) {
      expect(
        isCanonicalSector(insight.sectorName),
        `insight "${insight.occupationName}" has non-canonical sector "${insight.sectorName}"`
      ).toBe(true);
    }
  });
});
