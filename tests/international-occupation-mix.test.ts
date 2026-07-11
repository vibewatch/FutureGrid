/**
 * tests/international-occupation-mix.test.ts
 *
 * Comprehensive quality-gate tests for the International Occupation Mix feature:
 *
 *   data/international-occupation-mix.json         — snapshot / data integrity
 *   scripts/build-international-occupation-mix.mjs — builder source contract
 *   lib/international-occupation-mix.ts            — server-only helper
 *   app/global/page.tsx                            — server page wiring
 *   components/global/GlobalView.tsx               — client shell / prop contract
 *   components/global/InternationalOccupationMixSection.tsx — client island
 *   components/global/InternationalOccupationMixChart.tsx   — presentation client
 *   lib/i18n/messages/en/global.ts                 — EN global i18n namespace
 *   lib/i18n/messages/zh/global.ts                 — ZH global i18n namespace
 *   data/provenance.json                           — provenance registry
 *   data/sources.json                              — source registry
 *   data/COMPLIANCE.md                             — compliance table
 *   scripts/build-downloads.mjs                   — download pipeline wiring
 *   scripts/a11y-test.mjs                          — accessibility route list
 *
 * Tests marked [FORWARD GATE] fail until the named implementation gap is filled;
 * all other tests pass given the committed implementation.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  getInternationalOccupationMixData,
  getOccupationMixSlim,
  getOccupationMixCountry,
  getOccupationMixShares,
  getOccupationMixDissimilarity,
  getOccupationMixDissimilarityForCountry,
} from "@/lib/international-occupation-mix";

import { globalEn } from "@/lib/i18n/messages/en/global";
import { globalZh } from "@/lib/i18n/messages/zh/global";

const ROOT = process.cwd();

// ─── Paths ────────────────────────────────────────────────────────────────────

const BUILDER_SCRIPT   = path.join(ROOT, "scripts/build-international-occupation-mix.mjs");
const HELPER_LIB       = path.join(ROOT, "lib/international-occupation-mix.ts");
const GLOBAL_PAGE      = path.join(ROOT, "app/global/page.tsx");
const GLOBAL_VIEW      = path.join(ROOT, "components/global/GlobalView.tsx");
const MIX_SECTION      = path.join(ROOT, "components/global/InternationalOccupationMixSection.tsx");
const MIX_CHART        = path.join(ROOT, "components/global/InternationalOccupationMixChart.tsx");
const PROVENANCE       = path.join(ROOT, "data/provenance.json");
const SOURCES          = path.join(ROOT, "data/sources.json");
const COMPLIANCE       = path.join(ROOT, "data/COMPLIANCE.md");
const A11Y_SCRIPT      = path.join(ROOT, "scripts/a11y-test.mjs");
const DOWNLOADS_SCRIPT = path.join(ROOT, "scripts/build-downloads.mjs");

// ─── Constants ────────────────────────────────────────────────────────────────

const INCLUDED_ISO3 = ["AUS", "DEU", "ESP", "FRA", "GBR", "ITA", "KOR", "NLD", "USA"] as const;
const EXCLUDED_ISO3 = ["CAN", "JPN"] as const;
const ISCO08_GROUPS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

// ─── Pattern helpers ──────────────────────────────────────────────────────────

/** Runtime import pattern — excludes `import type { … }` erased at compile time. */
function runtimeImportOf(module: string): RegExp {
  return new RegExp(
    `^import\\s+(?!type[\\s{])(?:[^;\\n]*?)["'][^"']*${module}[^"']*["']`,
    "m",
  );
}

/** Pattern for direct raw JSON data file imports. */
const RAW_DATA_JSON_RE = /from\s+["'](?:@\/)?data\/[^"']+\.json["']/;

// ─────────────────────────────────────────────────────────────────────────────
// 1. DATA SNAPSHOT — top-level structure
// ─────────────────────────────────────────────────────────────────────────────

describe("data/international-occupation-mix.json — top-level structure", () => {
  const data = getInternationalOccupationMixData();

  it("has a meta block with generatedAt, asOf, source, and version", () => {
    expect(data.meta).toMatchObject({
      generatedAt: expect.any(String),
      asOf: expect.any(String),
      version: expect.any(String),
    });
    expect(data.meta.source).not.toBeNull();
  });

  it("has a source block with all required ILOSTAT fields", () => {
    expect(data.source).toMatchObject({
      name:           expect.any(String),
      indicator:      expect.any(String),
      dataflow:       expect.any(String),
      accessEndpoint: expect.any(String),
      license:        expect.any(String),
      licenseUrl:     expect.any(String),
      publisher:      expect.any(String),
      accessDate:     expect.any(String),
    });
  });

  it("has a coverage block with all required fields", () => {
    expect(data.coverage).toMatchObject({
      classification:      expect.any(String),
      sex:                 expect.any(String),
      frequency:           expect.any(String),
      datasetLatestYear:   expect.any(Number),
      withinYearsWindow:   expect.any(Number),
      minGroupCoverageRatio: expect.any(Number),
      minGroupCount:       expect.any(Number),
      includedCount:       expect.any(Number),
      excludedCount:       expect.any(Number),
    });
  });

  it("has included array, excluded array, countries object, and dissimilarity block", () => {
    expect(Array.isArray(data.included)).toBe(true);
    expect(Array.isArray(data.excluded)).toBe(true);
    expect(typeof data.countries).toBe("object");
    expect(!Array.isArray(data.countries)).toBe(true);
    expect(typeof data.dissimilarity).toBe("object");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. DATA SNAPSHOT — source contract (ILOSTAT, national survey, CC BY 4.0)
// ─────────────────────────────────────────────────────────────────────────────

describe("data/international-occupation-mix.json — source contract (ILOSTAT, national survey, CC BY 4.0)", () => {
  const data = getInternationalOccupationMixData();

  it("source.indicator is the national-survey ILOSTAT indicator EMP_TEMP_SEX_OCU_NB (not a model-based indicator)", () => {
    expect(data.source.indicator).toBe("EMP_TEMP_SEX_OCU_NB");
  });

  it("source.dataflow is DF_EMP_TEMP_SEX_OCU_NB", () => {
    expect(data.source.dataflow).toBe("DF_EMP_TEMP_SEX_OCU_NB");
  });

  it("source.accessEndpoint is the ILO rplumber.ilo.org CSV endpoint for EMP_TEMP_SEX_OCU_NB_A", () => {
    expect(data.source.accessEndpoint).toMatch(/rplumber\.ilo\.org/);
    expect(data.source.accessEndpoint).toMatch(/EMP_TEMP_SEX_OCU_NB/);
  });

  it("source.license states CC BY 4.0 (ILO open license)", () => {
    expect(data.source.license).toMatch(/CC BY 4\.0/i);
  });

  it("source.publisher identifies the International Labour Organization (ILO)", () => {
    expect(data.source.publisher).toMatch(/International Labour Organization|ILO/i);
  });

  it("coverage.classification is ISCO-08 (not ISCO-88 or skill-level only)", () => {
    expect(data.coverage.classification).toBe("ISCO-08");
  });

  it("coverage.sex is SEX_T (total employment, not disaggregated)", () => {
    expect(data.coverage.sex).toBe("SEX_T");
  });

  it("coverage.frequency is Annual", () => {
    expect(data.coverage.frequency).toBe("Annual");
  });

  it("coverage.datasetLatestYear is a plausible 4-digit year", () => {
    expect(data.coverage.datasetLatestYear).toBeGreaterThan(2000);
    expect(data.coverage.datasetLatestYear).toBeLessThanOrEqual(2100);
  });

  it("coverage.minGroupCount is 9 (all ISCO-08 major groups 1–9 required for inclusion)", () => {
    expect(data.coverage.minGroupCount).toBe(9);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. DATA SNAPSHOT — included country set (9 countries, counts consistent)
// ─────────────────────────────────────────────────────────────────────────────

describe("data/international-occupation-mix.json — included country set", () => {
  const data = getInternationalOccupationMixData();

  it("includes exactly 9 countries: AUS, DEU, ESP, FRA, GBR, ITA, KOR, NLD, USA", () => {
    expect([...data.included].sort()).toEqual([...INCLUDED_ISO3].sort());
  });

  it("coverage.includedCount matches the actual length of the included array", () => {
    expect(data.coverage.includedCount).toBe(data.included.length);
  });

  it("every included ISO3 has a corresponding entry in data.countries", () => {
    for (const iso3 of data.included) {
      expect(data.countries[iso3], `countries.${iso3} must exist`).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. DATA SNAPSHOT — excluded set (CAN, JPN with explicit reasons)
// ─────────────────────────────────────────────────────────────────────────────

describe("data/international-occupation-mix.json — excluded set (CAN, JPN with explicit reasons)", () => {
  const data = getInternationalOccupationMixData();

  it("Canada (CAN) is excluded", () => {
    expect(data.excluded.some((e) => e.iso3 === "CAN")).toBe(true);
  });

  it("CAN exclusion reason is non-empty and references ISCO-08 data availability or year window", () => {
    const entry = data.excluded.find((e) => e.iso3 === "CAN");
    expect(entry?.reason.trim().length).toBeGreaterThan(0);
    expect(entry?.reason).toMatch(/ISCO-08|year|window|data/i);
  });

  it("Japan (JPN) is excluded", () => {
    expect(data.excluded.some((e) => e.iso3 === "JPN")).toBe(true);
  });

  it("JPN exclusion reason is non-empty and references ISCO-08 group count or coverage", () => {
    const entry = data.excluded.find((e) => e.iso3 === "JPN");
    expect(entry?.reason.trim().length).toBeGreaterThan(0);
    expect(entry?.reason).toMatch(/ISCO-08|group|coverage/i);
  });

  it("no excluded country also appears in the included set", () => {
    const includedSet = new Set(data.included);
    for (const e of data.excluded) {
      expect(
        includedSet.has(e.iso3),
        `${e.iso3} must not appear in both included and excluded`,
      ).toBe(false);
    }
  });

  it("every excluded entry has a non-empty reason string", () => {
    for (const e of data.excluded) {
      expect(e.reason.trim().length, `excluded entry ${e.iso3} must have a reason`).toBeGreaterThan(0);
    }
  });

  it("coverage.excludedCount matches the actual length of the excluded array", () => {
    expect(data.coverage.excludedCount).toBe(data.excluded.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. DATA SNAPSHOT — per-country group integrity (9 groups, no zero-fill, no imputation)
// ─────────────────────────────────────────────────────────────────────────────

describe("data/international-occupation-mix.json — per-country group integrity", () => {
  const data = getInternationalOccupationMixData();

  for (const iso3 of INCLUDED_ISO3) {
    it(`${iso3}: has exactly 9 ISCO-08 major groups (1–9), all keyed as strings`, () => {
      const country = data.countries[iso3];
      expect(country).toBeDefined();
      expect(Object.keys(country.groups)).toHaveLength(9);
      for (const g of ISCO08_GROUPS) {
        expect(country.groups[g], `${iso3}: group "${g}" must exist`).toBeDefined();
      }
    });

    it(`${iso3}: no zero-filled or negative group employment value`, () => {
      const country = data.countries[iso3];
      for (const g of ISCO08_GROUPS) {
        expect(
          country.groups[g]?.employment,
          `${iso3}: group ${g} employment must be a positive number`,
        ).toBeGreaterThan(0);
      }
    });

    it(`${iso3}: all group shares are strictly between 0 and 1 exclusive`, () => {
      const country = data.countries[iso3];
      for (const g of ISCO08_GROUPS) {
        const share = country.groups[g]?.share;
        expect(share, `${iso3}: group ${g} share must be > 0`).toBeGreaterThan(0);
        expect(share, `${iso3}: group ${g} share must be < 1`).toBeLessThan(1);
      }
    });

    it(`${iso3}: observation statuses do not include imputed code "I"`, () => {
      const statuses = data.countries[iso3].observationStatuses ?? [];
      expect(statuses, `${iso3}: imputed status "I" must be absent`).not.toContain("I");
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. DATA SNAPSHOT — year and coverage windows
// ─────────────────────────────────────────────────────────────────────────────

describe("data/international-occupation-mix.json — year and coverage windows", () => {
  const data = getInternationalOccupationMixData();
  const { datasetLatestYear, withinYearsWindow, minGroupCoverageRatio } = data.coverage;

  for (const iso3 of INCLUDED_ISO3) {
    it(`${iso3}: year is within the ${withinYearsWindow}-year qualifying window (${datasetLatestYear - withinYearsWindow}–${datasetLatestYear})`, () => {
      const year = data.countries[iso3].year;
      expect(year).toBeGreaterThanOrEqual(datasetLatestYear - withinYearsWindow);
      expect(year).toBeLessThanOrEqual(datasetLatestYear);
    });

    it(`${iso3}: groupCoverageRatio >= ${minGroupCoverageRatio} (coverage gate)`, () => {
      const ratio = data.countries[iso3].groupCoverageRatio;
      expect(ratio).toBeGreaterThanOrEqual(minGroupCoverageRatio);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. DATA SNAPSHOT — shares normalization (sum 1 ± 0.005, no zero-fill)
// ─────────────────────────────────────────────────────────────────────────────

describe("data/international-occupation-mix.json — shares normalization (sum 1 ± 0.005)", () => {
  const data = getInternationalOccupationMixData();

  for (const iso3 of INCLUDED_ISO3) {
    it(`${iso3}: group shares 1–9 sum to 1.0 within ±0.005 (normalized to group sum, not total)`, () => {
      const country = data.countries[iso3];
      const sum = ISCO08_GROUPS.reduce((s, g) => s + (country.groups[g]?.share ?? 0), 0);
      expect(
        Math.abs(sum - 1.0),
        `${iso3}: share sum ${sum.toFixed(6)} must be within 0.005 of 1.0`,
      ).toBeLessThanOrEqual(0.005);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. DATA SNAPSHOT — dissimilarity (symmetric, range [0,1], descriptive note)
// ─────────────────────────────────────────────────────────────────────────────

describe("data/international-occupation-mix.json — dissimilarity (symmetric, range [0,1], descriptive)", () => {
  const data = getInternationalOccupationMixData();

  it("dissimilarity.method describes the Half-L1 / Bray-Curtis formula", () => {
    expect(data.dissimilarity.method.trim().length).toBeGreaterThan(0);
    expect(data.dissimilarity.method).toMatch(/Half-L1|Bray-Curtis|0\.5.*sum/i);
  });

  it("dissimilarity.note states descriptive-only framing and no ranking implied", () => {
    expect(data.dissimilarity.note).toMatch(/[Dd]escriptive|no ranking/i);
  });

  it("all dissimilarity pair values are in range [0, 1]", () => {
    for (const [pair, value] of Object.entries(data.dissimilarity.pairs)) {
      expect(value, `pair "${pair}" must be >= 0`).toBeGreaterThanOrEqual(0);
      expect(value, `pair "${pair}" must be <= 1`).toBeLessThanOrEqual(1);
    }
  });

  it("all pair keys use alphabetical ISO3 order (first < second), ensuring canonical symmetry", () => {
    for (const key of Object.keys(data.dissimilarity.pairs)) {
      const parts = key.split("_");
      expect(parts).toHaveLength(2);
      const [a, b] = parts as [string, string];
      expect(
        a < b,
        `pair key "${key}": first ISO3 must precede second alphabetically for canonical keying`,
      ).toBe(true);
    }
  });

  it("dissimilarity.pairs covers exactly all unique pairs among included countries", () => {
    const n = data.included.length;
    const expectedPairCount = (n * (n - 1)) / 2;
    expect(Object.keys(data.dissimilarity.pairs)).toHaveLength(expectedPairCount);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. BUILDER SOURCE CONTRACT
// ─────────────────────────────────────────────────────────────────────────────

describe("scripts/build-international-occupation-mix.mjs — source contract", () => {
  it("script file exists", () => {
    expect(existsSync(BUILDER_SCRIPT)).toBe(true);
  });

  const src = readFileSync(BUILDER_SCRIPT, "utf8");

  it("uses the national-survey ILOSTAT indicator EMP_TEMP_SEX_OCU_NB (not a model-based source)", () => {
    expect(src).toMatch(/EMP_TEMP_SEX_OCU_NB/);
  });

  it("imports buildMeta from ./lib/meta.mjs (canonical meta block builder)", () => {
    expect(src).toMatch(
      /import\s+\{[^}]*\bbuildMeta\b[^}]*\}\s+from\s+['"]\.\/lib\/meta\.mjs['"]/,
    );
  });

  it("imports validateInternationalOccupationMix from ./lib/validate.mjs", () => {
    expect(src).toMatch(
      /import\s+\{[^}]*\bvalidateInternationalOccupationMix\b[^}]*\}\s+from\s+['"]\.\/lib\/validate\.mjs['"]/,
    );
  });

  it("calls validateInternationalOccupationMix() strictly before writeFileSync (fail-loud validation gate)", () => {
    const validatePos = src.indexOf("validateInternationalOccupationMix(output)");
    const writePos    = src.indexOf("writeFileSync(");
    expect(validatePos, "validateInternationalOccupationMix must be called").toBeGreaterThan(-1);
    expect(writePos,    "writeFileSync must be called").toBeGreaterThan(-1);
    expect(validatePos, "validate must precede write").toBeLessThan(writePos);
  });

  it("fails loudly on HTTP fetch failure (throws on non-ok response)", () => {
    expect(src).toMatch(/res\.ok|!res\.ok|res\.status/);
    expect(src).toMatch(/throw\s+new\s+Error/);
  });

  it("fails loudly on empty CSV response (throws on blank or zero-length text)", () => {
    expect(src).toMatch(/[Ee]mpty\s+response|text\.trim\(\)\.length\s*===\s*0|!text/);
  });

  it("fails loudly if zero rows are parsed from the CSV", () => {
    expect(src).toMatch(/totalRowCount\s*===\s*0|[Zz]ero\s+rows/);
  });

  it("includes Accept-Language: en header in the ILOSTAT fetch request", () => {
    expect(src).toMatch(/Accept-Language/);
  });

  it("contains no hardcoded API keys, bearer tokens, or secrets", () => {
    expect(src).not.toMatch(/api[_-]?key\s*[:=]\s*['"][^'"]{8}/i);
    expect(src).not.toMatch(/Authorization\s*:\s*['"]Bearer\s+[^'"]{4}/i);
    expect(src).not.toMatch(/token\s*[:=]\s*['"][A-Za-z0-9_\-]{20}/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. HELPER — server-only guard and exported functions
// ─────────────────────────────────────────────────────────────────────────────

describe("lib/international-occupation-mix.ts — server-only guard and exported functions", () => {
  it("file exists", () => {
    expect(existsSync(HELPER_LIB)).toBe(true);
  });

  const src = readFileSync(HELPER_LIB, "utf8");

  it("contains 'import \"server-only\"' to prevent client bundle inclusion", () => {
    expect(src).toMatch(/import\s+['"]server-only['"]/);
  });

  it("exports getInternationalOccupationMixData as a named function", () => {
    expect(src).toMatch(/export\s+function\s+getInternationalOccupationMixData/);
  });

  it("exports getOccupationMixSlim as a named function", () => {
    expect(src).toMatch(/export\s+function\s+getOccupationMixSlim/);
  });

  it("exports getOccupationMixDissimilarity as a named function", () => {
    expect(src).toMatch(/export\s+function\s+getOccupationMixDissimilarity/);
  });

  it("exports getOccupationMixDissimilarityForCountry as a named function", () => {
    expect(src).toMatch(/export\s+function\s+getOccupationMixDissimilarityForCountry/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 11. HELPER — getOccupationMixSlim() compact payload
// ─────────────────────────────────────────────────────────────────────────────

describe("lib/international-occupation-mix.ts — getOccupationMixSlim() compact payload", () => {
  const slim = getOccupationMixSlim();

  it("returns generatedAt, datasetLatestYear, classification, countries, excluded", () => {
    expect(slim).toMatchObject({
      generatedAt:       expect.any(String),
      datasetLatestYear: expect.any(Number),
      classification:    expect.any(String),
      countries:         expect.any(Array),
      excluded:          expect.any(Array),
    });
  });

  it("countries array contains exactly the 9 included ISO3 codes", () => {
    expect(slim.countries.map((c) => c.iso3).sort()).toEqual([...INCLUDED_ISO3].sort());
  });

  it("each compact country exposes observationStatuses (status), noteIndicators (notes), and groupCoverageRatio (coverage)", () => {
    for (const c of slim.countries) {
      expect("observationStatuses" in c, `${c.iso3}: must expose observationStatuses`).toBe(true);
      expect("noteIndicators" in c,      `${c.iso3}: must expose noteIndicators`).toBe(true);
      expect("groupCoverageRatio" in c,  `${c.iso3}: must expose groupCoverageRatio`).toBe(true);
    }
  });

  it("each compact country has shares (0–1) and labels for all 9 ISCO-08 groups", () => {
    for (const c of slim.countries) {
      for (const g of ISCO08_GROUPS) {
        expect(c.shares[g], `${c.iso3}: share for group ${g} must be defined`).toBeDefined();
        expect(c.labels[g], `${c.iso3}: label for group ${g} must be defined`).toBeDefined();
        expect(c.shares[g]).toBeGreaterThan(0);
        expect(c.shares[g]).toBeLessThan(1);
      }
    }
  });

  it("compact payload does NOT expose raw totalEmployment or groups employment breakdown", () => {
    for (const c of slim.countries) {
      expect((c as Record<string, unknown>).totalEmployment).toBeUndefined();
      expect((c as Record<string, unknown>).groups).toBeUndefined();
    }
  });

  it("each excluded entry carries iso3, name, and a non-empty reason", () => {
    for (const e of slim.excluded) {
      expect(typeof e.iso3).toBe("string");
      expect(typeof e.name).toBe("string");
      expect(typeof e.reason).toBe("string");
      expect(e.reason.trim().length).toBeGreaterThan(0);
    }
  });

  it("classification is ISCO-08", () => {
    expect(slim.classification).toBe("ISCO-08");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. HELPER — immutable / fresh results
// ─────────────────────────────────────────────────────────────────────────────

describe("lib/international-occupation-mix.ts — immutable / fresh results", () => {
  it("getOccupationMixSlim returns a new countries array on each call (not the same reference)", () => {
    const a = getOccupationMixSlim();
    const b = getOccupationMixSlim();
    expect(a.countries).not.toBe(b.countries);
  });

  it("getOccupationMixSlim returns a new excluded array on each call", () => {
    const a = getOccupationMixSlim();
    const b = getOccupationMixSlim();
    expect(a.excluded).not.toBe(b.excluded);
  });

  it("getOccupationMixShares returns a fresh shares object (not the internal groups reference)", () => {
    const sharesA = getOccupationMixShares("AUS");
    const sharesB = getOccupationMixShares("AUS");
    expect(sharesA).not.toBeNull();
    expect(sharesA).not.toBe(sharesB);
  });

  it("getOccupationMixCountry returns the country record (may be shared reference — do not mutate)", () => {
    const country = getOccupationMixCountry("AUS");
    expect(country).not.toBeNull();
    expect(country?.iso3).toBe("AUS");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. HELPER — dissimilarity helpers (symmetric, range 0–1, descriptive)
// ─────────────────────────────────────────────────────────────────────────────

describe("lib/international-occupation-mix.ts — dissimilarity helpers (symmetric, range 0–1)", () => {
  it("getOccupationMixDissimilarity(A, B) === getOccupationMixDissimilarity(B, A) (symmetric)", () => {
    const ab = getOccupationMixDissimilarity("AUS", "DEU");
    const ba = getOccupationMixDissimilarity("DEU", "AUS");
    expect(ab).not.toBeNull();
    expect(ba).not.toBeNull();
    expect(ab).toBe(ba);
  });

  it("getOccupationMixDissimilarity returns null for excluded country CAN", () => {
    expect(getOccupationMixDissimilarity("AUS", "CAN")).toBeNull();
  });

  it("getOccupationMixDissimilarity returns null for excluded country JPN", () => {
    expect(getOccupationMixDissimilarity("AUS", "JPN")).toBeNull();
  });

  it("all pairwise dissimilarity values returned by helper are in range [0, 1]", () => {
    for (let i = 0; i < INCLUDED_ISO3.length; i++) {
      for (let j = i + 1; j < INCLUDED_ISO3.length; j++) {
        const val = getOccupationMixDissimilarity(INCLUDED_ISO3[i]!, INCLUDED_ISO3[j]!);
        expect(val, `pair ${INCLUDED_ISO3[i]}-${INCLUDED_ISO3[j]}: must be non-null`).not.toBeNull();
        expect(val!, `pair ${INCLUDED_ISO3[i]}-${INCLUDED_ISO3[j]}: must be >= 0`).toBeGreaterThanOrEqual(0);
        expect(val!, `pair ${INCLUDED_ISO3[i]}-${INCLUDED_ISO3[j]}: must be <= 1`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("getOccupationMixDissimilarityForCountry(AUS) returns n-1 entries (all included, excluding self)", () => {
    const results = getOccupationMixDissimilarityForCountry("AUS");
    expect(results).toHaveLength(INCLUDED_ISO3.length - 1);
    expect(results.every((r) => r.iso3 !== "AUS")).toBe(true);
  });

  it("getOccupationMixDissimilarityForCountry returns results sorted ascending by dissimilarity", () => {
    const results = getOccupationMixDissimilarityForCountry("AUS");
    for (let i = 1; i < results.length; i++) {
      expect(
        results[i]!.dissimilarity,
        `entry ${i} dissimilarity must be >= entry ${i - 1}`,
      ).toBeGreaterThanOrEqual(results[i - 1]!.dissimilarity);
    }
  });

  it("getOccupationMixDissimilarityForCountry all values are in range [0, 1]", () => {
    const results = getOccupationMixDissimilarityForCountry("USA");
    for (const r of results) {
      expect(r.dissimilarity).toBeGreaterThanOrEqual(0);
      expect(r.dissimilarity).toBeLessThanOrEqual(1);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. ARCHITECTURE — server page contract
// ─────────────────────────────────────────────────────────────────────────────

describe("app/global/page.tsx — Server Component contract", () => {
  it("file exists", () => {
    expect(existsSync(GLOBAL_PAGE)).toBe(true);
  });

  const src = readFileSync(GLOBAL_PAGE, "utf8");

  it("has no 'use client' directive (must stay a Server Component)", () => {
    expect(src).not.toMatch(/^['"]use client['"]/m);
  });

  it("imports getOccupationMixSlim from lib/international-occupation-mix", () => {
    expect(src).toMatch(
      /import\s+[^;]*\bgetOccupationMixSlim\b[^;]*from\s+["'][^"']*international-occupation-mix["']/,
    );
  });

  it("calls getOccupationMixSlim() to resolve occupation-mix data at server render time", () => {
    expect(src).toMatch(/\bgetOccupationMixSlim\s*\(\s*\)/);
  });

  it("passes the resolved occupationMix to GlobalView as a prop", () => {
    expect(src).toMatch(/occupationMix\s*=\s*\{/);
  });

  it("does NOT import raw JSON data files directly (must use typed helpers)", () => {
    expect(src).not.toMatch(RAW_DATA_JSON_RE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. ARCHITECTURE — GlobalView client shell
// ─────────────────────────────────────────────────────────────────────────────

describe("components/global/GlobalView.tsx — client shell contract", () => {
  it("file exists", () => {
    expect(existsSync(GLOBAL_VIEW)).toBe(true);
  });

  const src = readFileSync(GLOBAL_VIEW, "utf8");

  it("declares 'use client' at the top (client shell, not a Server Component)", () => {
    expect(src).toMatch(/^['"]use client['"]/m);
  });

  it("GlobalViewProps includes occupationMix: OccupationMixSlim (server-resolved prop)", () => {
    expect(src).toMatch(/occupationMix\s*:\s*OccupationMixSlim/);
  });

  it("imports InternationalOccupationMixSection (renders the occupation-mix island)", () => {
    expect(src).toMatch(/import\s+[^;]*InternationalOccupationMixSection[^;]*from/);
  });

  it("renders <InternationalOccupationMixSection> in the returned JSX with occupationMix data", () => {
    const returnSection = src.slice(Math.max(0, src.indexOf("return (")));
    expect(returnSection).toMatch(/<InternationalOccupationMixSection/);
  });

  it("does NOT have a runtime import of lib/international-occupation-mix (server-only boundary)", () => {
    expect(src).not.toMatch(runtimeImportOf("international-occupation-mix"));
  });

  it("does NOT import raw JSON data files directly", () => {
    expect(src).not.toMatch(RAW_DATA_JSON_RE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. ARCHITECTURE — InternationalOccupationMixSection client island
// ─────────────────────────────────────────────────────────────────────────────

describe("components/global/InternationalOccupationMixSection.tsx — client island contract", () => {
  it("file exists", () => {
    expect(existsSync(MIX_SECTION)).toBe(true);
  });

  const src = readFileSync(MIX_SECTION, "utf8");

  it("declares 'use client' at the top", () => {
    expect(src).toMatch(/^['"]use client['"]/m);
  });

  it("does NOT have a runtime import of lib/international-occupation-mix (server-only boundary)", () => {
    expect(src).not.toMatch(runtimeImportOf("international-occupation-mix"));
  });

  it("does NOT import raw JSON data files directly", () => {
    expect(src).not.toMatch(RAW_DATA_JSON_RE);
  });

  it("renders InternationalOccupationMixChart in its returned JSX (delegates to canonical chart)", () => {
    const returnSection = src.slice(Math.max(0, src.indexOf("return (")));
    expect(returnSection).toMatch(/<InternationalOccupationMixChart/);
  });

  it("renders attribution with a link to ilostat.ilo.org (CC BY 4.0 requirement)", () => {
    expect(src).toMatch(/ilostat\.ilo\.org/);
  });

  it("exposes excluded countries and their reasons in the rendered output (data.excluded)", () => {
    expect(src).toMatch(/data\.excluded/);
  });

  it("exposes the survey year in the selected-country drilldown", () => {
    expect(src).toMatch(/selectedCountry\.year/);
  });

  it("exposes groupCoverageRatio in the selected-country drilldown", () => {
    expect(src).toMatch(/groupCoverageRatio/);
  });

  it("does NOT expose totalEmployment (raw full-dataset field excluded from slim payload)", () => {
    expect(src).not.toMatch(/totalEmployment/);
  });

  it("does NOT claim AI scores, wages, or absolute employment totals for occupation groups", () => {
    // The section renders only ISCO-08 shares — no exposure scores, wages, or raw employment
    expect(src).not.toMatch(/\baiScore\b|\bwageScore\b|\busageIndex\b/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. ARCHITECTURE — InternationalOccupationMixChart presentation client
// ─────────────────────────────────────────────────────────────────────────────

describe("components/global/InternationalOccupationMixChart.tsx — presentation client contract", () => {
  it("file exists", () => {
    expect(existsSync(MIX_CHART)).toBe(true);
  });

  const src = readFileSync(MIX_CHART, "utf8");

  it("declares 'use client' at the top", () => {
    expect(src).toMatch(/^['"]use client['"]/m);
  });

  it("does NOT have a runtime import of lib/international-occupation-mix (server-only boundary)", () => {
    expect(src).not.toMatch(runtimeImportOf("international-occupation-mix"));
  });

  it("does NOT import raw JSON data files (data arrives via props from the server layer)", () => {
    expect(src).not.toMatch(RAW_DATA_JSON_RE);
  });

  it("renders a visible complete table (country × ISCO-08 group shares) not only visual bars", () => {
    expect(src).toMatch(/<table/);
  });

  it("provides a sr-only textual equivalent of the bar chart for screen readers", () => {
    expect(src).toMatch(/sr-only/);
  });

  it("frames dissimilarity as descriptive-only with no ranking implied", () => {
    expect(src).toMatch(/[Dd]escriptive|no ranking/i);
  });

  it("does NOT render AI exposure scores, wages, or absolute employment ranking columns", () => {
    expect(src).not.toMatch(/aiScore|exposureScore/i);
    expect(src).not.toMatch(/wage.*column|col.*wage/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. i18n — workforce / intlOccMix keys [FORWARD GATE]
//
//     InternationalOccupationMixSection and InternationalOccupationMixChart use
//     translation keys (workforceEyebrow, intlOccMixFigureCaption, etc.) that
//     must be present in both EN and ZH before the /global page renders the
//     occupation-mix section without silent key-identity fallbacks.
//
//     These tests FAIL until Tank/Neo adds the keys to both locales.
// ─────────────────────────────────────────────────────────────────────────────

const WORKFORCE_I18N_KEYS = [
  "workforceEyebrow",
  "workforceTitle",
  "workforceSubtitle",
  "workforceSourcesLink",
  "workforceCaveat",
  "workforceDrilldownHeading",
  "workforceDrilldownClear",
  "workforceDrilldownClearLabel",
  "workforceDrilldownYear",
  "workforceDrilldownCoverage",
  "workforceDrilldownStatuses",
  "workforceDrilldownTableCaption",
  "workforceDrilldownGroup",
  "workforceDrilldownLabel",
  "workforceDrilldownShare",
  "workforceDrilldownNone",
  "workforceAttribution",
  "workforceAttributionLicense",
  "workforcePartialCoverage",
  "workforceExclusionCaveat",
  "workforceExposureNote",
  "workforceExposureLinkText",
  "workforceExposureNoteAfter",
] as const;

const INTL_OCC_MIX_I18N_KEYS = [
  "intlOccMixGroupPrefix",
  "intlOccMixFigureCaption",
  "intlOccMixChartAria",
  "intlOccMixChartDesc",
  "intlOccMixCoverageInline",
  "intlOccMixDissimilarityInline",
  "intlOccMixTableTitle",
  "intlOccMixTableCaption",
  "intlOccMixColCountry",
  "intlOccMixColYear",
  "intlOccMixColCoverage",
  "intlOccMixColStatus",
  "intlOccMixColDissimilarity",
  "intlOccMixCaptionShares",
  "intlOccMixCaptionDissimilarity",
  "intlOccMixCaptionExcluded",
] as const;

describe("global i18n — workforce section keys [FORWARD GATE]", () => {
  for (const key of WORKFORCE_I18N_KEYS) {
    it(`EN global contains key "${key}"`, () => {
      expect(globalEn, `EN global must contain "${key}"`).toHaveProperty(key);
    });

    it(`ZH global contains key "${key}"`, () => {
      expect(globalZh, `ZH global must contain "${key}"`).toHaveProperty(key);
    });
  }

  it("no EN global workforce key has an empty string value", () => {
    for (const key of WORKFORCE_I18N_KEYS) {
      if (key in globalEn) {
        expect(
          globalEn[key as keyof typeof globalEn],
          `EN "${key}" must not be empty`,
        ).not.toBe("");
      }
    }
  });

  it("no ZH global workforce key has an empty string value", () => {
    for (const key of WORKFORCE_I18N_KEYS) {
      if (key in globalZh) {
        expect(
          globalZh[key as keyof typeof globalZh],
          `ZH "${key}" must not be empty`,
        ).not.toBe("");
      }
    }
  });
});

describe("global i18n — intlOccMix chart keys [FORWARD GATE]", () => {
  for (const key of INTL_OCC_MIX_I18N_KEYS) {
    it(`EN global contains key "${key}"`, () => {
      expect(globalEn, `EN global must contain "${key}"`).toHaveProperty(key);
    });

    it(`ZH global contains key "${key}"`, () => {
      expect(globalZh, `ZH global must contain "${key}"`).toHaveProperty(key);
    });
  }

  it("no EN global intlOccMix key has an empty string value", () => {
    for (const key of INTL_OCC_MIX_I18N_KEYS) {
      if (key in globalEn) {
        expect(
          globalEn[key as keyof typeof globalEn],
          `EN "${key}" must not be empty`,
        ).not.toBe("");
      }
    }
  });

  it("no ZH global intlOccMix key has an empty string value", () => {
    for (const key of INTL_OCC_MIX_I18N_KEYS) {
      if (key in globalZh) {
        expect(
          globalZh[key as keyof typeof globalZh],
          `ZH "${key}" must not be empty`,
        ).not.toBe("");
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. i18n — EN / ZH global key-set parity
// ─────────────────────────────────────────────────────────────────────────────

describe("global i18n — EN / ZH key-set parity", () => {
  it("EN and ZH global namespaces have identical sorted key sets (no locale drift)", () => {
    const enKeys = Object.keys(globalEn).sort();
    const zhKeys = Object.keys(globalZh).sort();
    expect(enKeys).toEqual(zhKeys);
  });

  it("no EN global value is an empty string", () => {
    for (const [key, value] of Object.entries(globalEn)) {
      expect(value, `EN global key "${key}" must not be empty`).not.toBe("");
    }
  });

  it("no ZH global value is an empty string", () => {
    for (const [key, value] of Object.entries(globalZh)) {
      expect(value, `ZH global key "${key}" must not be empty`).not.toBe("");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. PROVENANCE AND SOURCE REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

describe("provenance and source registry — international-occupation-mix wiring", () => {
  it("data/provenance.json includes an entry with id 'international-occupation-mix'", () => {
    const prov = JSON.parse(readFileSync(PROVENANCE, "utf8")) as {
      datasets: Array<{ id: string; file: string; source: unknown }>;
    };
    const entry = prov.datasets.find((d) => d.id === "international-occupation-mix");
    expect(entry, "provenance.json must include an 'international-occupation-mix' dataset entry").toBeDefined();
  });

  it("provenance entry references the correct data file (international-occupation-mix.json)", () => {
    const prov = JSON.parse(readFileSync(PROVENANCE, "utf8")) as {
      datasets: Array<{ id: string; file: string }>;
    };
    const entry = prov.datasets.find((d) => d.id === "international-occupation-mix");
    expect(entry?.file).toMatch(/international-occupation-mix\.json/);
  });

  it("provenance entry source block references ILO or ILOSTAT", () => {
    const prov = JSON.parse(readFileSync(PROVENANCE, "utf8")) as {
      datasets: Array<{ id: string; source: unknown }>;
    };
    const entry = prov.datasets.find((d) => d.id === "international-occupation-mix");
    const sourceText = JSON.stringify(entry?.source ?? "").toLowerCase();
    expect(sourceText).toMatch(/ilostat|international labour organization|ilo/i);
  });

  it("data/sources.json includes an entry referencing international-occupation-mix.json and ILOSTAT", () => {
    const sources = JSON.parse(readFileSync(SOURCES, "utf8")) as {
      sources: Array<{ usedFor?: string; name?: string }>;
    };
    const registryText = JSON.stringify(sources.sources).toLowerCase();
    expect(registryText).toMatch(/international-occupation-mix\.json|ilostat|emp_temp_sex_ocu/i);
  });

  it("data/COMPLIANCE.md includes an entry for data/international-occupation-mix.json", () => {
    const compliance = readFileSync(COMPLIANCE, "utf8");
    expect(compliance).toMatch(/international-occupation-mix\.json/);
  });

  it("COMPLIANCE.md documents CC BY 4.0 for the international-occupation-mix entry", () => {
    const compliance = readFileSync(COMPLIANCE, "utf8");
    const start = compliance.indexOf("international-occupation-mix.json");
    expect(start).toBeGreaterThan(-1);
    const context = compliance.slice(start, start + 400);
    expect(context).toMatch(/CC BY 4\.0/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 21. DOWNLOADS / BUILD-DOWNLOADS WIRING
// ─────────────────────────────────────────────────────────────────────────────

describe("downloads / build-downloads wiring", () => {
  it("scripts/build-downloads.mjs references international-occupation-mix.json in the download list", () => {
    const src = readFileSync(DOWNLOADS_SCRIPT, "utf8");
    expect(src).toMatch(/international-occupation-mix\.json/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 22. ACCESSIBILITY — /global route in a11y-test.mjs
// ─────────────────────────────────────────────────────────────────────────────

describe("scripts/a11y-test.mjs — /global route exists exactly once", () => {
  const src = readFileSync(A11Y_SCRIPT, "utf8");

  it("/global is included in the ROUTES array audited by the a11y script", () => {
    expect(src).toMatch(/ROUTES\s*=\s*\[[\s\S]*?["']\/global["']/);
  });

  it("/global appears exactly once in the ROUTES array (no duplicate entries)", () => {
    const routesMatch = src.match(/const\s+ROUTES\s*=\s*\[([\s\S]*?)\]/);
    expect(routesMatch, "ROUTES array definition must be present").not.toBeNull();
    const routesContent = routesMatch![1]!;
    const occurrences = (routesContent.match(/["']\/global["']/g) ?? []).length;
    expect(
      occurrences,
      "/global must appear exactly once in ROUTES — adding a duplicate wastes a browser tab per audit run",
    ).toBe(1);
  });
});
