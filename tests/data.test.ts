import { describe, it, expect } from "vitest";
import {
  generateAllCareerInsights,
  getSectorAggregatesExtended,
  getHighlights,
  computeResiliencyScore,
  getTotalWorkforce,
  searchInsights,
  getSearchIndex,
  getCountryMapData,
  getReskillingPaths,
} from "@/lib/data";
import { isCanonicalSector } from "@/lib/sector-taxonomy";

// ─── generateAllCareerInsights ────────────────────────────────────────────────

describe("generateAllCareerInsights", () => {
  const insights = generateAllCareerInsights();

  it("returns 756 occupations", () => {
    expect(insights).toHaveLength(756);
  });

  it("every item has required CareerInsight fields", () => {
    for (const item of insights) {
      expect(typeof item.occupationCode).toBe("string");
      expect(item.occupationCode.length).toBeGreaterThan(0);
      expect(typeof item.occupationName).toBe("string");
      expect(item.occupationName.length).toBeGreaterThan(0);
      expect(["Low", "Medium", "High", "Very High"]).toContain(item.automationRisk);
      expect(typeof item.automationProbability).toBe("number");
      expect(typeof item.medianSalary).toBe("number");
      expect(typeof item.sectorName).toBe("string");
      expect(Array.isArray(item.skills)).toBe(true);
      expect(["Bright", "Average"]).toContain(item.outlook);
    }
  });

  it("automationProbability is in [0, 1] for every item", () => {
    for (const item of insights) {
      expect(item.automationProbability).toBeGreaterThanOrEqual(0);
      expect(item.automationProbability).toBeLessThanOrEqual(1);
    }
  });

  it("automationRisk is one of the 4 valid bands", () => {
    const validBands = new Set(["Low", "Medium", "High", "Very High"]);
    for (const item of insights) {
      expect(validBands.has(item.automationRisk)).toBe(true);
    }
  });

  it("all four risk bands are non-empty (percentile calibration)", () => {
    const bands = new Set(insights.map((i) => i.automationRisk));
    expect(bands.has("Low")).toBe(true);
    expect(bands.has("Medium")).toBe(true);
    expect(bands.has("High")).toBe(true);
    expect(bands.has("Very High")).toBe(true);
  });

  it("employment is a positive number or null for each item, and present for large majority", () => {
    let withEmployment = 0;
    for (const item of insights) {
      if (item.totalEmployment !== null) {
        expect(item.totalEmployment).toBeGreaterThan(0);
        withEmployment++;
      }
    }
    // At least 755 of 756 occupations should have employment data
    expect(withEmployment).toBeGreaterThanOrEqual(755);
  });

  it("medianSalary is >= 0 for every item", () => {
    for (const item of insights) {
      expect(item.medianSalary).toBeGreaterThanOrEqual(0);
    }
  });

  it("projection enrichment exposes positive annual openings for a large majority", () => {
    const withOpenings = insights.filter((item) => item.projectedOpenings !== null);
    expect(withOpenings.length).toBeGreaterThanOrEqual(650);
    expect(insights.length - withOpenings.length).toBeGreaterThan(0);
    for (const item of withOpenings) {
      expect(item.projectedOpenings).toBeGreaterThan(0);
    }
  });

  it("growth enrichment carries a valid derived window for every occupation", () => {
    for (const item of insights) {
      expect(item.growthRate).not.toBeNull();
      expect(item.growthWindow).toEqual({
        fromYear: expect.any(Number),
        toYear: expect.any(Number),
      });
      expect(item.growthWindow!.fromYear).toBeLessThan(item.growthWindow!.toYear);
    }
  });

  it("top projected-opening occupation remains the BLS-backed Cashiers record", () => {
    const topProjected = [...insights]
      .filter((item) => item.projectedOpenings !== null)
      .sort((a, b) => (b.projectedOpenings ?? 0) - (a.projectedOpenings ?? 0))[0];

    expect(topProjected.occupationCode).toBe("41-2011");
    expect(topProjected.occupationName).toBe("Cashiers");
    expect(topProjected.projectedOpenings).toBeGreaterThan(600_000);
    expect(topProjected.outlook).toBe("Bright");
  });
});

// ─── getSectorAggregatesExtended ─────────────────────────────────────────────

describe("getSectorAggregatesExtended", () => {
  const sectors = getSectorAggregatesExtended();

  it("returns at least one sector", () => {
    expect(sectors.length).toBeGreaterThan(0);
  });

  it("avgRisk is in [0, 1] for every sector", () => {
    for (const s of sectors) {
      expect(s.avgRisk).toBeGreaterThanOrEqual(0);
      expect(s.avgRisk).toBeLessThanOrEqual(1);
    }
  });

  it("brightShare is in [0, 1] for every sector", () => {
    for (const s of sectors) {
      expect(s.brightShare).toBeGreaterThanOrEqual(0);
      expect(s.brightShare).toBeLessThanOrEqual(1);
    }
  });

  it("totalEmployment is null or > 0", () => {
    for (const s of sectors) {
      if (s.totalEmployment !== null) {
        expect(s.totalEmployment).toBeGreaterThan(0);
      }
    }
  });

  it("returns exactly 22 sectors (one per BLS SOC major group, no alias duplicates)", () => {
    expect(sectors).toHaveLength(22);
  });

  it("all sector names are canonical (no alias strings in aggregates)", () => {
    for (const s of sectors) {
      expect(isCanonicalSector(s.sector), `"${s.sector}" is non-canonical`).toBe(true);
    }
  });

  it("no duplicate sector names in aggregates", () => {
    const names = sectors.map(s => s.sector);
    expect(new Set(names).size).toBe(names.length);
  });

  it("does not contain isolated alias 'Computer & Mathematical'", () => {
    expect(sectors.find(s => s.sector === "Computer & Mathematical")).toBeUndefined();
  });
});

// ─── getHighlights ────────────────────────────────────────────────────────────

describe("getHighlights", () => {
  const highlights = getHighlights();

  it("contains all required keys", () => {
    expect(highlights).toHaveProperty("mostAtRisk");
    expect(highlights).toHaveProperty("brightOutlook");
    expect(highlights).toHaveProperty("mostResilient");
    expect(highlights).toHaveProperty("highestPaid");
    expect(highlights).toHaveProperty("largestWorkforce");
  });

  it("each key is non-empty", () => {
    expect(highlights.mostAtRisk.length).toBeGreaterThan(0);
    expect(highlights.brightOutlook.length).toBeGreaterThan(0);
    expect(highlights.mostResilient.length).toBeGreaterThan(0);
    expect(highlights.highestPaid.length).toBeGreaterThan(0);
    expect(highlights.largestWorkforce.length).toBeGreaterThan(0);
  });

  it("largestWorkforce[0] has a large employment (>= 100,000)", () => {
    const top = highlights.largestWorkforce[0];
    expect(top.totalEmployment).not.toBeNull();
    expect(top.totalEmployment!).toBeGreaterThanOrEqual(100_000);
  });

  // ── brightOutlook sort-order invariant ──────────────────────────────────────

  it("brightOutlook[0] is the Bright Outlook occupation with the highest projected openings (Cashiers)", () => {
    const top = highlights.brightOutlook[0];
    expect(top.occupationCode).toBe("41-2011");
    expect(top.occupationName).toBe("Cashiers");
    expect(top.projectedOpenings).toBeGreaterThan(600_000);
  });

  it("brightOutlook is sorted by projectedOpenings descending, not by AI exposure", () => {
    const bo = highlights.brightOutlook;
    // Projected openings must be non-increasing across the list (where non-null).
    for (let i = 0; i < bo.length - 1; i++) {
      const a = bo[i].projectedOpenings ?? 0;
      const b = bo[i + 1].projectedOpenings ?? 0;
      expect(a).toBeGreaterThanOrEqual(b);
    }
    // The first entry must NOT be the one with the highest automationProbability
    // among Bright Outlook occupations — that would mean we are (wrongly) sorting
    // by AI exposure again.
    const allBright = generateAllCareerInsights().filter((i) => i.outlook === "Bright");
    const maxAIProbBright = Math.max(...allBright.map((i) => i.automationProbability));
    expect(bo[0].automationProbability).not.toBeCloseTo(maxAIProbBright, 3);
  });

  it("every brightOutlook entry has outlook === 'Bright'", () => {
    for (const entry of highlights.brightOutlook) {
      expect(entry.outlook).toBe("Bright");
    }
  });

  it("Customer Service Representatives (43-4051) is a legitimate dual-signal career: both high AI exposure and Bright Outlook", () => {
    const allInsights = generateAllCareerInsights();
    const cs = allInsights.find((i) => i.occupationCode === "43-4051");
    expect(cs).toBeDefined();
    expect(cs!.outlook).toBe("Bright");
    // High AI exposure (Very High band)
    expect(cs!.automationProbability).toBeGreaterThan(0.5);
    // Large annual openings — an independent labor demand signal, not the O*NET designation reason
    expect(cs!.projectedOpenings).toBeGreaterThan(200_000);
  });
});

// ─── computeResiliencyScore ───────────────────────────────────────────────────

describe("computeResiliencyScore", () => {
  it("returns 100 for probability 0 and 0 for probability 1", () => {
    expect(computeResiliencyScore(0)).toBe(100);
    expect(computeResiliencyScore(1)).toBe(0);
  });

  it("is monotonically decreasing (higher exposure → lower score)", () => {
    const probs = [0, 0.1, 0.2, 0.3, 0.5, 0.7, 0.9, 1.0];
    for (let i = 0; i < probs.length - 1; i++) {
      expect(computeResiliencyScore(probs[i])).toBeGreaterThanOrEqual(
        computeResiliencyScore(probs[i + 1])
      );
    }
  });

  it("output is always in [0, 100]", () => {
    for (const p of [0, 0.25, 0.5, 0.75, 1.0]) {
      const score = computeResiliencyScore(p);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});

// ─── getTotalWorkforce ────────────────────────────────────────────────────────

describe("getTotalWorkforce", () => {
  it("returns a value > 100,000,000 (approx 140M)", () => {
    expect(getTotalWorkforce()).toBeGreaterThan(100_000_000);
  });
});

// ─── searchInsights ───────────────────────────────────────────────────────────

describe("searchInsights", () => {
  it("returns empty array for empty query", () => {
    expect(searchInsights("")).toHaveLength(0);
    expect(searchInsights("   ")).toHaveLength(0);
  });

  it("returns <= limit results for 'software' with limit=5", () => {
    const results = searchInsights("software", 5);
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it("all results for 'software' match the query", () => {
    const results = searchInsights("software", 5);
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      const lower = r.occupationName.toLowerCase() + " " + r.sectorName.toLowerCase();
      expect(lower).toContain("software");
    }
  });
});

// ─── getSearchIndex ───────────────────────────────────────────────────────────

describe("getSearchIndex", () => {
  const index = getSearchIndex();

  it("contains items of all three types: occupation, sector, skill", () => {
    const types = new Set(index.map((i) => i.type));
    expect(types.has("occupation")).toBe(true);
    expect(types.has("sector")).toBe(true);
    expect(types.has("skill")).toBe(true);
  });

  it("all hrefs are non-empty strings starting with /", () => {
    for (const item of index) {
      expect(typeof item.href).toBe("string");
      expect(item.href.startsWith("/")).toBe(true);
    }
  });
});

// ─── getCountryMapData ────────────────────────────────────────────────────────

describe("getCountryMapData", () => {
  const mapData = getCountryMapData();

  it("returns 195 entries", () => {
    expect(mapData).toHaveLength(195);
  });

  it("China (CHN) has hasClaudeData=false and non-null proxyNote", () => {
    const chn = mapData.find((c) => c.iso3 === "CHN");
    expect(chn).toBeDefined();
    expect(chn!.hasClaudeData).toBe(false);
    expect(chn!.proxyNote).not.toBeNull();
    expect(typeof chn!.proxyNote).toBe("string");
  });

  it("China (CHN) has diffusionPct approximately 16.4 (within 1%)", () => {
    const chn = mapData.find((c) => c.iso3 === "CHN");
    expect(chn!.diffusionPct).not.toBeNull();
    expect(chn!.diffusionPct!).toBeGreaterThan(15.5);
    expect(chn!.diffusionPct!).toBeLessThan(17.5);
  });

  it("USA has usageIndex > 0", () => {
    const usa = mapData.find((c) => c.iso3 === "USA");
    expect(usa).toBeDefined();
    expect(usa!.usageIndex).not.toBeNull();
    expect(usa!.usageIndex!).toBeGreaterThan(0);
  });
});

// ─── getReskillingPaths — D5 sentinel jobZone regression ─────────────────────
//
// D5 fix: when source.jobZone ≤ 0 OR target.jobZone ≤ 0, jobZoneDelta must be
// null so the ease dimension uses the neutral score (0.5) instead of rewarding
// sentinel zeros as if they were same-zone transitions (delta=0 → ease=1.0).

describe("getReskillingPaths — D5 sentinel jobZone produces null delta", () => {
  // 11-2032 Public Relations Managers: jobZone=0, aiExposure=0.2315, has skills.
  // Any source with sentinel jobZone must yield null delta for ALL paths.
  const sentinelPaths = getReskillingPaths("11-2032", 20);

  it("returns paths for a sentinel-zone source (jobZone=0)", () => {
    expect(sentinelPaths.length).toBeGreaterThan(0);
  });

  it("every path from a sentinel-zone source has jobZoneDelta === null", () => {
    for (const p of sentinelPaths) {
      expect(
        p.jobZoneDelta,
        `expected null for target ${p.occupationCode} (${p.occupationName}) when source has sentinel zone`,
      ).toBeNull();
    }
  });

  it("transition scores for sentinel-zone source are bounded 0–100", () => {
    for (const p of sentinelPaths) {
      expect(p.transitionScore).toBeGreaterThanOrEqual(0);
      expect(p.transitionScore).toBeLessThanOrEqual(100);
    }
  });

  it("paths from valid-zone source (Data Entry Keyers, zone=2) include non-null deltas", () => {
    // 43-9021 Data Entry Keyers: jobZone=2 — a valid zone that produces real deltas
    const paths = getReskillingPaths("43-9021", 20);
    expect(paths.length).toBeGreaterThan(0);
    const nonNullDeltaPaths = paths.filter((p) => p.jobZoneDelta !== null);
    // Data Entry Keyers has many targets with valid zones; at least some should have real deltas
    expect(nonNullDeltaPaths.length).toBeGreaterThan(0);
    for (const p of nonNullDeltaPaths) {
      // Valid delta = target.jobZone − 2; must be an integer in range (-4)–(+3)
      expect(typeof p.jobZoneDelta).toBe("number");
      expect(p.jobZoneDelta).toBeGreaterThanOrEqual(-4);
      expect(p.jobZoneDelta).toBeLessThanOrEqual(3);
    }
  });

  it("paths from valid-zone source still yield null delta when the TARGET zone is a sentinel", () => {
    // 43-9021 (zone=2): some target occupations have jobZone=0 or -1 — their delta must be null
    const paths = getReskillingPaths("43-9021", 50);
    const nullDeltaPaths = paths.filter((p) => p.jobZoneDelta === null);
    // The dataset has 143 sentinel-zone targets (zones 0 and -1); some appear in this list
    expect(nullDeltaPaths.length).toBeGreaterThan(0);
    // And transition scores are still bounded
    for (const p of nullDeltaPaths) {
      expect(p.transitionScore).toBeGreaterThanOrEqual(0);
      expect(p.transitionScore).toBeLessThanOrEqual(100);
    }
  });

  it("exhaustive: every path from any sentinel-zone source has jobZoneDelta === null", () => {
    // The 756-occupation snapshot has 143 occupations with jobZone ≤ 0 (zones 0 and -1).
    // We test 4 known sentinel-zone sources spanning both zone=0 and zone=-1.
    const sentinelSocCodes = [
      "11-2032", // Public Relations Managers, zone=0, aiExposure=0.23
      "11-3012", // Administrative Services Managers, zone=0
      "15-2099", // Mathematical Science Occupations, All Other, zone=-1, aiExposure=0.48
      "41-3031", // Securities, Commodities, and Financial Services Sales Agents, zone=-1
    ];

    for (const socCode of sentinelSocCodes) {
      const paths = getReskillingPaths(socCode, 10);
      for (const p of paths) {
        expect(
          p.jobZoneDelta,
          `source ${socCode} (sentinel zone) → target ${p.occupationCode}: expected null jobZoneDelta`,
        ).toBeNull();
      }
    }
  });

  it("valid 1–5 zone transitions produce correct arithmetic delta", () => {
    // 43-4051 Customer Service Representatives: jobZone=2, high exposure.
    // 13-1161 Market Research Analysts: jobZone=4.
    // Expected delta for a path to a zone-4 target: 4 − 2 = +2.
    const paths = getReskillingPaths("43-4051", 50);
    const zone4Paths = paths.filter((p) => p.jobZone === 4 && p.jobZoneDelta !== null);
    for (const p of zone4Paths) {
      expect(p.jobZoneDelta).toBe(2); // zone=4 − source zone=2
    }
    const zone2Paths = paths.filter((p) => p.jobZone === 2 && p.jobZoneDelta !== null);
    for (const p of zone2Paths) {
      expect(p.jobZoneDelta).toBe(0); // same zone → ≤ 0, same-or-easier
    }
  });
});
