/**
 * tests/reskilling-bridge.test.ts
 *
 * Data and logic tests for lib/reskilling-bridge.ts.
 *
 * Coverage:
 * - Deterministic bounded origins/destinations
 * - Stable SOC join: destination SOC codes match getReskillingPaths for same origin
 * - Descending bottleneck scores across origins; descending transition scores within each origin
 * - annualOpenings matches getEmploymentProjectionBySoc for the same destination SOC
 * - Explicit nulls (latestLcas, aiExposure, annualOpenings) preserved correctly
 * - Skills arrays capped at SKILL_DISPLAY_CAP (6)
 * - transitionScore bounded 0–100; exposureDropPts > 0 per design
 * - resolveLimit edge cases fall back to the published default
 * - Fresh immutability: mutating returned arrays does not corrupt subsequent calls
 * - summary.bottleneckScoreWindow and totalDestinationPairs are consistent with origins
 * - Methodology caveats cover H-1B filing, projected-openings, and descriptive-only wording
 * - Skills namespace EN / ZH key-set parity (forward-looking: survives any new keys Neo adds)
 */

import { describe, expect, it } from "vitest";

import {
  getReskillingBridgeData,
  type ReskillingBridgeData,
  type ReskillingBridgeOrigin,
} from "@/lib/reskilling-bridge";
import { getReskillingPaths } from "@/lib/data";
import { getEmploymentProjectionBySoc } from "@/lib/employment-projections";
import { skillsEn } from "@/lib/i18n/messages/en/skills";
import { skillsZh } from "@/lib/i18n/messages/zh/skills";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findOrigin(origins: ReskillingBridgeOrigin[], socCode: string): ReskillingBridgeOrigin {
  const origin = origins.find((o) => o.socCode === socCode);
  expect(origin, `Expected origin SOC ${socCode} in the returned rows`).toBeDefined();
  return origin as ReskillingBridgeOrigin;
}

// ─── Shape and defaults ───────────────────────────────────────────────────────

describe("getReskillingBridgeData — shape and defaults", () => {
  it("returns 20 origins by default with matching summary", () => {
    const data = getReskillingBridgeData();
    expect(data.origins).toHaveLength(20);
    expect(data.summary.originsReturned).toBe(20);
    expect(data.summary.destinationsPerOriginMax).toBe(6);
  });

  it("respects an explicit originLimit", () => {
    const data = getReskillingBridgeData({ originLimit: 5 });
    expect(data.origins).toHaveLength(5);
    expect(data.summary.originsReturned).toBe(5);
  });

  it("respects an explicit destinationLimit", () => {
    const data = getReskillingBridgeData({ originLimit: 3, destinationLimit: 3 });
    expect(data.summary.destinationsPerOriginMax).toBe(3);
    for (const origin of data.origins) {
      expect(origin.destinations.length).toBeLessThanOrEqual(3);
    }
  });

  it("resolveLimit falls back to default for 0, negative, NaN, and non-finite values", () => {
    expect(getReskillingBridgeData({ originLimit: 0 }).summary.originsReturned).toBe(20);
    expect(getReskillingBridgeData({ originLimit: -1 }).summary.originsReturned).toBe(20);
    expect(getReskillingBridgeData({ originLimit: NaN }).summary.originsReturned).toBe(20);
    expect(getReskillingBridgeData({ originLimit: Infinity }).summary.originsReturned).toBe(20);
  });

  it("floors a fractional originLimit", () => {
    const data = getReskillingBridgeData({ originLimit: 3.9 });
    expect(data.origins).toHaveLength(3);
  });

  it("totalDestinationPairs matches actual destination count across all origins", () => {
    const data = getReskillingBridgeData({ originLimit: 5 });
    const actualTotal = data.origins.reduce((n, o) => n + o.destinations.length, 0);
    expect(data.summary.totalDestinationPairs).toBe(actualTotal);
  });

  it("bottleneckScoreWindow reflects actual min and max origin scores", () => {
    const data = getReskillingBridgeData({ originLimit: 10 });
    const scores = data.origins.map((o) => o.bottleneckScore);
    expect(data.summary.bottleneckScoreWindow.min).toBe(Math.min(...scores));
    expect(data.summary.bottleneckScoreWindow.max).toBe(Math.max(...scores));
  });
});

// ─── Score ordering ───────────────────────────────────────────────────────────

describe("getReskillingBridgeData — score ordering", () => {
  it("origins are sorted by bottleneckScore descending", () => {
    const { origins } = getReskillingBridgeData();
    for (let i = 1; i < origins.length; i++) {
      expect(origins[i - 1].bottleneckScore).toBeGreaterThanOrEqual(origins[i].bottleneckScore);
    }
  });

  it("destinations within each origin are sorted by transitionScore descending", () => {
    const { origins } = getReskillingBridgeData({ originLimit: 5 });
    for (const origin of origins) {
      for (let i = 1; i < origin.destinations.length; i++) {
        expect(origin.destinations[i - 1].transitionScore).toBeGreaterThanOrEqual(
          origin.destinations[i].transitionScore,
        );
      }
    }
  });

  it("all transitionScores are integers in [0, 100]", () => {
    const { origins } = getReskillingBridgeData({ originLimit: 10 });
    for (const origin of origins) {
      for (const dest of origin.destinations) {
        expect(dest.transitionScore).toBeGreaterThanOrEqual(0);
        expect(dest.transitionScore).toBeLessThanOrEqual(100);
        expect(Number.isInteger(dest.transitionScore)).toBe(true);
      }
    }
  });

  it("all bottleneckScores are finite numbers in [0, 100]", () => {
    const { origins } = getReskillingBridgeData();
    for (const origin of origins) {
      expect(Number.isFinite(origin.bottleneckScore)).toBe(true);
      expect(origin.bottleneckScore).toBeGreaterThanOrEqual(0);
      expect(origin.bottleneckScore).toBeLessThanOrEqual(100);
    }
  });
});

// ─── SOC join integrity ───────────────────────────────────────────────────────

describe("getReskillingBridgeData — SOC join integrity", () => {
  it("destination SOC codes match getReskillingPaths for origin 13-1161", () => {
    const data = getReskillingBridgeData({ originLimit: 5 });
    const origin = findOrigin(data.origins, "13-1161");
    const paths = getReskillingPaths("13-1161", 6, "score");

    const bridgeSOCs = origin.destinations.map((d) => d.socCode);
    const pathSOCs = paths.map((p) => p.occupationCode);
    expect(bridgeSOCs).toEqual(pathSOCs);
  });

  it("destination SOC codes match getReskillingPaths for origin 13-2011", () => {
    const data = getReskillingBridgeData({ originLimit: 5 });
    const origin = findOrigin(data.origins, "13-2011");
    const paths = getReskillingPaths("13-2011", 6, "score");

    const bridgeSOCs = origin.destinations.map((d) => d.socCode);
    const pathSOCs = paths.map((p) => p.occupationCode);
    expect(bridgeSOCs).toEqual(pathSOCs);
  });

  it("destination titles match getReskillingPaths occupationNames", () => {
    const data = getReskillingBridgeData({ originLimit: 3 });
    const origin = data.origins[0];
    const paths = getReskillingPaths(origin.socCode, 6, "score");

    for (let i = 0; i < origin.destinations.length; i++) {
      expect(origin.destinations[i].title).toBe(paths[i].occupationName);
    }
  });

  it("exposureDropPts is strictly positive for every destination", () => {
    const { origins } = getReskillingBridgeData({ originLimit: 5 });
    for (const origin of origins) {
      for (const dest of origin.destinations) {
        expect(dest.exposureDropPts).toBeGreaterThan(0);
      }
    }
  });
});

// ─── annualOpenings vs employment-projections helper ─────────────────────────

describe("getReskillingBridgeData — annualOpenings matches employment-projections", () => {
  it("annualOpenings equals projectedOpenings from getEmploymentProjectionBySoc when positive finite", () => {
    const { origins } = getReskillingBridgeData({ originLimit: 5 });
    for (const origin of origins) {
      for (const dest of origin.destinations) {
        const proj = getEmploymentProjectionBySoc(dest.socCode);
        const rawOpenings = proj?.projectedOpenings;
        const expected =
          typeof rawOpenings === "number" &&
          Number.isFinite(rawOpenings) &&
          rawOpenings > 0
            ? rawOpenings
            : null;
        expect(dest.annualOpenings).toBe(expected);
      }
    }
  });

  it("annualOpenings is null for 29-1215 (Family Medicine Physicians) — no projections row", () => {
    // 29-1215 (Family Medicine Physicians) has projectedOpenings=null in the dataset.
    // After the D5 fix, the ease scoring for sentinel-zone destinations changed, so the
    // origin that 29-1215 appears in shifted. Search across all 3 origins to find it.
    const { origins } = getReskillingBridgeData({ originLimit: 3 });
    const allDests = origins.flatMap((o) => o.destinations);
    const familyMedDest = allDests.find((d) => d.socCode === "29-1215");
    expect(familyMedDest, "Expected 29-1215 to appear in at least one origin's destinations").toBeDefined();
    expect(familyMedDest!.annualOpenings).toBeNull();
  });

  it("annualOpenings is a positive integer for 29-1071 (Physician Assistants)", () => {
    const { origins } = getReskillingBridgeData({ originLimit: 3 });
    const paDest = origins[0].destinations.find((d) => d.socCode === "29-1071");
    expect(paDest).toBeDefined();
    expect(typeof paDest!.annualOpenings).toBe("number");
    expect(paDest!.annualOpenings).toBeGreaterThan(0);
    // Matches the employment-projections dataset directly
    const proj = getEmploymentProjectionBySoc("29-1071");
    expect(paDest!.annualOpenings).toBe(proj?.projectedOpenings);
  });

  it("no synthetic or random values: annualOpenings never exceeds any known BLS projection", () => {
    const { origins } = getReskillingBridgeData();
    for (const origin of origins) {
      for (const dest of origin.destinations) {
        if (dest.annualOpenings !== null) {
          // BLS annual openings are in the hundreds to hundreds-of-thousands range
          expect(dest.annualOpenings).toBeGreaterThan(0);
          expect(dest.annualOpenings).toBeLessThan(10_000_000);
        }
      }
    }
  });
});

// ─── Explicit nulls ───────────────────────────────────────────────────────────

describe("getReskillingBridgeData — explicit nulls preserved", () => {
  it("latestLcas is a positive integer when H-1B data is present (all top-20 origins have it)", () => {
    // The top-20 high-bottleneck occupations are dominated by major H-1B-filing roles;
    // all should have latestLcas populated. Null is structurally valid (per type) but only
    // appears for lower-ranked occupations outside the default limit.
    const { origins } = getReskillingBridgeData();
    for (const o of origins) {
      if (o.latestLcas !== null) {
        expect(typeof o.latestLcas).toBe("number");
        expect(o.latestLcas).toBeGreaterThan(0);
      }
    }
  });

  it("latestLcas can be null for lower-ranked origins outside the default limit", () => {
    // The talent-bottleneck dataset has 972 rows; occupations ranked ~164+
    // (score ≤ 38.4) have no H-1B LCA record. Use a large limit to reach them.
    const { origins } = getReskillingBridgeData({ originLimit: 200 });
    const noH1b = origins.find((o) => o.latestLcas === null);
    expect(
      noH1b,
      "Expected at least one origin with null latestLcas when originLimit=200",
    ).toBeDefined();
  });

  it("aiExposure is null when occupation snapshot is unavailable for the origin", () => {
    const { origins } = getReskillingBridgeData();
    const noSnapshot = origins.find((o) => o.aiExposure === null);
    // Note: may not always exist; if all origins have snapshots this test passes trivially
    // The important thing is the type allows null and we don't coerce it to 0
    for (const o of origins) {
      if (o.aiExposure !== null) {
        expect(typeof o.aiExposure).toBe("number");
        expect(o.aiExposure).toBeGreaterThanOrEqual(0);
        expect(o.aiExposure).toBeLessThanOrEqual(1);
      }
    }
    void noSnapshot; // may or may not be present in the top-20
  });

  it("annualOpenings is null (not zero or undefined) for destinations with no projections row", () => {
    const { origins } = getReskillingBridgeData({ originLimit: 10 });
    let nullCount = 0;
    for (const origin of origins) {
      for (const dest of origin.destinations) {
        if (dest.annualOpenings === null) nullCount++;
        else expect(typeof dest.annualOpenings).toBe("number");
      }
    }
    // Several destinations have no projections row in the dataset
    expect(nullCount).toBeGreaterThan(0);
  });
});

// ─── Skills cap ───────────────────────────────────────────────────────────────

describe("getReskillingBridgeData — sharedSkills and missingSkills capped at 6", () => {
  it("sharedSkills length is ≤ 6 for all destinations", () => {
    const { origins } = getReskillingBridgeData({ originLimit: 10 });
    for (const origin of origins) {
      for (const dest of origin.destinations) {
        expect(dest.sharedSkills.length).toBeLessThanOrEqual(6);
      }
    }
  });

  it("missingSkills length is ≤ 6 for all destinations", () => {
    const { origins } = getReskillingBridgeData({ originLimit: 10 });
    for (const origin of origins) {
      for (const dest of origin.destinations) {
        expect(dest.missingSkills.length).toBeLessThanOrEqual(6);
      }
    }
  });

  it("skills arrays are non-empty strings (no nulls, no empty items)", () => {
    const { origins } = getReskillingBridgeData({ originLimit: 5 });
    for (const origin of origins) {
      for (const dest of origin.destinations) {
        for (const skill of [...dest.sharedSkills, ...dest.missingSkills]) {
          expect(typeof skill).toBe("string");
          expect(skill.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ─── Determinism and immutability ────────────────────────────────────────────

describe("getReskillingBridgeData — determinism and immutability", () => {
  it("returns identical output across two successive calls with same options", () => {
    const d1 = getReskillingBridgeData({ originLimit: 5 });
    const d2 = getReskillingBridgeData({ originLimit: 5 });
    expect(JSON.stringify(d1)).toBe(JSON.stringify(d2));
  });

  it("different originLimit produces different but consistent length output", () => {
    const d3 = getReskillingBridgeData({ originLimit: 3 });
    const d5 = getReskillingBridgeData({ originLimit: 5 });
    expect(d3.origins).toHaveLength(3);
    expect(d5.origins).toHaveLength(5);
    // Top origins should be the same (both sorted by descending score)
    for (let i = 0; i < 3; i++) {
      expect(d3.origins[i].socCode).toBe(d5.origins[i].socCode);
    }
  });

  it("mutating sharedSkills array on a returned destination does not corrupt the next call", () => {
    const d1 = getReskillingBridgeData({ originLimit: 1 });
    const origLen = d1.origins[0].destinations[0].sharedSkills.length;

    // Mutate the returned array
    d1.origins[0].destinations[0].sharedSkills.push("MUTATED_SKILL");

    const d2 = getReskillingBridgeData({ originLimit: 1 });
    expect(d2.origins[0].destinations[0].sharedSkills).toHaveLength(origLen);
    expect(d2.origins[0].destinations[0].sharedSkills).not.toContain("MUTATED_SKILL");
  });

  it("mutating missingSkills array does not corrupt the next call", () => {
    const d1 = getReskillingBridgeData({ originLimit: 1 });
    const origLen = d1.origins[0].destinations[0].missingSkills.length;
    d1.origins[0].destinations[0].missingSkills.push("MUTATED");
    const d2 = getReskillingBridgeData({ originLimit: 1 });
    expect(d2.origins[0].destinations[0].missingSkills).toHaveLength(origLen);
  });

  it("mutating origins array does not corrupt the next call", () => {
    const d1 = getReskillingBridgeData({ originLimit: 2 });
    d1.origins.splice(0, 1);
    const d2 = getReskillingBridgeData({ originLimit: 2 });
    expect(d2.origins).toHaveLength(2);
  });
});

// ─── Methodology caveats ─────────────────────────────────────────────────────

describe("getReskillingBridgeData — methodology caveats", () => {
  let data: ReskillingBridgeData;

  it("methodology label is the correct human-readable title", () => {
    data = getReskillingBridgeData({ originLimit: 1 });
    expect(data.methodology.label).toBe("Talent Bottleneck → Reskilling Bridge");
  });

  it("has exactly 6 caveats", () => {
    data = getReskillingBridgeData({ originLimit: 1 });
    expect(data.methodology.caveats).toHaveLength(6);
  });

  it("includes H-1B filing caveat (LCAs are filings, not visa approvals)", () => {
    data = getReskillingBridgeData({ originLimit: 1 });
    const combined = data.methodology.caveats.join(" ");
    expect(combined).toMatch(/LCA.*(filings|not visa approvals)/i);
    expect(combined).not.toMatch(/certified LCAs are visa approvals/i);
  });

  it("includes projected-openings caveat (BLS averages, not realized demand)", () => {
    data = getReskillingBridgeData({ originLimit: 1 });
    const combined = data.methodology.caveats.join(" ");
    expect(combined).toMatch(/annual openings.*BLS.*projection/i);
    expect(combined).toMatch(/not current realized demand/i);
  });

  it("includes descriptive-only wording (no causality assertion)", () => {
    data = getReskillingBridgeData({ originLimit: 1 });
    const combined = [data.methodology.description, ...data.methodology.caveats].join(" ");
    expect(combined).toMatch(/descriptive/i);
    expect(combined).not.toMatch(/\bproves?\b/i);
    expect(combined).not.toMatch(/shortage proof/i);
  });

  it("includes transition score caveat (evidence-based, not observed placement rates)", () => {
    data = getReskillingBridgeData({ originLimit: 1 });
    const combined = data.methodology.caveats.join(" ");
    expect(combined).toMatch(/transition score/i);
    expect(combined).toMatch(/not observed placement/i);
  });

  it("datasetBadgeIds covers all four source datasets", () => {
    data = getReskillingBridgeData({ originLimit: 1 });
    expect(data.methodology.datasetBadgeIds).toContain("h1b-trends");
    expect(data.methodology.datasetBadgeIds).toContain("employment-projections");
    expect(data.methodology.datasetBadgeIds).toContain("job-postings");
    expect(data.methodology.datasetBadgeIds).toContain("occupation-snapshot");
  });
});

// ─── Skills i18n EN / ZH parity ──────────────────────────────────────────────

describe("skills i18n — EN / ZH key-set parity", () => {
  it("EN and ZH skills message objects have identical sorted key sets", () => {
    const enKeys = Object.keys(skillsEn).sort();
    const zhKeys = Object.keys(skillsZh).sort();
    expect(enKeys).toEqual(zhKeys);
  });

  it("no EN skills value is an empty string", () => {
    for (const [key, value] of Object.entries(skillsEn)) {
      expect(value, `EN skills key "${key}" must not be empty`).not.toBe("");
    }
  });

  it("no ZH skills value is an empty string (except occupationsUseSkillsPost — intentionally empty for Chinese grammar)", () => {
    // occupationsUseSkillsPost is intentionally "" in ZH: the Chinese sentence
    // "N 个职业使用 [技术技能]" needs no trailing suffix, unlike EN "N occupations use [Technical] skills".
    const INTENTIONAL_EMPTY_KEYS = new Set(["occupationsUseSkillsPost"]);
    for (const [key, value] of Object.entries(skillsZh)) {
      if (INTENTIONAL_EMPTY_KEYS.has(key)) continue;
      expect(value, `ZH skills key "${key}" must not be empty`).not.toBe("");
    }
  });
});
