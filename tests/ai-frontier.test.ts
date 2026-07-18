import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getAIFrontierData,
  getComputeModels,
  getOrgLeaderboard,
  getCountryLeaderboard,
  getCountryOriginShares,
  getModernEraRegression,
  getOverallRegression,
  getRecentlyActiveOrgs,
  getFullCatalogAccessibilityMix,
  getRecentWindow,
  getDefinitions,
  getCostTrend,
  getPowerTrend,
  getDomainMix,
  getAccessibilityMix,
  formatFlop,
  formatLog10Flop,
} from "@/lib/ai-frontier";
import { frontierEn } from "@/lib/i18n/messages/en/frontier";
import { frontierZh } from "@/lib/i18n/messages/zh/frontier";

const DATA_PATH = path.join(process.cwd(), "data/ai-frontier.json");

// ── Helpers ────────────────────────────────────────────────────────────────────

function readSnapshot() {
  expect(existsSync(DATA_PATH), "data/ai-frontier.json must exist").toBe(true);
  return JSON.parse(readFileSync(DATA_PATH, "utf8")) as ReturnType<typeof getAIFrontierData>;
}

// ── Data integrity ─────────────────────────────────────────────────────────────

describe("data integrity — models array", () => {
  it("models[] is non-empty", () => {
    const { models } = readSnapshot();
    expect(models.length).toBeGreaterThan(0);
  });

  it("every model has computeFlop > 0 and finite log10Compute consistent with Math.log10(computeFlop)", () => {
    const { models } = readSnapshot();
    for (const m of models) {
      expect(m.computeFlop, `${m.name} computeFlop must be > 0`).toBeGreaterThan(0);
      expect(Number.isFinite(m.log10Compute), `${m.name} log10Compute must be finite`).toBe(true);
      const expected = Math.log10(m.computeFlop);
      expect(
        Math.abs(m.log10Compute - expected),
        `${m.name} log10Compute=${m.log10Compute} should ≈ Math.log10(${m.computeFlop})=${expected}`,
      ).toBeLessThan(0.011);
    }
  });

  it("every model date matches YYYY-MM-DD and year is an integer in 1950..2100", () => {
    const { models } = readSnapshot();
    for (const m of models) {
      expect(m.date, `${m.name} date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isInteger(m.year), `${m.name} year must be integer`).toBe(true);
      expect(m.year, `${m.name} year lower bound`).toBeGreaterThanOrEqual(1950);
      expect(m.year, `${m.name} year upper bound`).toBeLessThanOrEqual(2100);
    }
  });

  it("every model has a domains array and a countries array; at least 99% have non-empty domains", () => {
    const { models } = readSnapshot();
    let emptyDomains = 0;
    for (const m of models) {
      expect(Array.isArray(m.domains), `${m.name} domains must be array`).toBe(true);
      expect(Array.isArray(m.countries), `${m.name} countries must be array`).toBe(true);
      if (m.domains.length === 0) emptyDomains++;
    }
    // Upstream data may have rare entries without domain tags; allow up to 1%
    expect(
      emptyDomains / models.length,
      `More than 1% of models (${emptyDomains}/${models.length}) have empty domains`,
    ).toBeLessThanOrEqual(0.01);
  });

  it("every model frontier is boolean and openWeights is boolean|null", () => {
    const { models } = readSnapshot();
    for (const m of models) {
      expect(typeof m.frontier, `${m.name} frontier must be boolean`).toBe("boolean");
      const validOW =
        m.openWeights === true || m.openWeights === false || m.openWeights === null;
      expect(validOW, `${m.name} openWeights must be boolean or null`).toBe(true);
    }
  });

  it("models are sorted ascending by date (lexicographic YYYY-MM-DD)", () => {
    const { models } = readSnapshot();
    for (let i = 1; i < models.length; i++) {
      expect(
        models[i].date >= models[i - 1].date,
        `models[${i}].date=${models[i].date} should be >= models[${i - 1}].date=${models[i - 1].date}`,
      ).toBe(true);
    }
  });
});

// ── Doubling-time sanity ───────────────────────────────────────────────────────

describe("doubling-time sanity — computeTrend regressions", () => {
  it("modernEra has positive finite doublingTimeMonths in sane band and valid regression params", () => {
    const { aggregates } = readSnapshot();
    const me = aggregates.computeTrend.modernEra;
    if (me === null) throw new Error("modernEra regression is null — dataset too small?");

    expect(Number.isFinite(me.slopeLog10PerYear), "modernEra slopeLog10PerYear finite").toBe(true);
    expect(me.slopeLog10PerYear, "modernEra slope > 0").toBeGreaterThan(0);
    expect(Number.isFinite(me.intercept), "modernEra intercept finite").toBe(true);
    expect(me.r2, "modernEra r2 >= 0").toBeGreaterThanOrEqual(0);
    expect(me.r2, "modernEra r2 <= 1").toBeLessThanOrEqual(1);
    expect(me.n, "modernEra n > 0").toBeGreaterThan(0);
    expect(me.doublingTimeMonths, "modernEra doublingTimeMonths not null").not.toBeNull();
    const dt = me.doublingTimeMonths as number;
    expect(Number.isFinite(dt), "modernEra doublingTimeMonths finite").toBe(true);
    expect(dt, "modernEra doublingTimeMonths > 0").toBeGreaterThan(0);
    expect(dt, "modernEra doublingTimeMonths < 60 months").toBeLessThan(60);
  });

  it("overall regression has positive slope, valid r2, and positive doublingTimeMonths", () => {
    const { aggregates } = readSnapshot();
    const ov = aggregates.computeTrend.overall;
    if (ov === null) throw new Error("overall regression is null — dataset too small?");

    expect(Number.isFinite(ov.slopeLog10PerYear), "overall slope finite").toBe(true);
    expect(ov.slopeLog10PerYear, "overall slope > 0").toBeGreaterThan(0);
    expect(Number.isFinite(ov.intercept), "overall intercept finite").toBe(true);
    expect(ov.r2, "overall r2 >= 0").toBeGreaterThanOrEqual(0);
    expect(ov.r2, "overall r2 <= 1").toBeLessThanOrEqual(1);
    expect(ov.n, "overall n > 0").toBeGreaterThan(0);
    const dt = ov.doublingTimeMonths as number;
    expect(Number.isFinite(dt), "overall doublingTimeMonths finite").toBe(true);
    expect(dt, "overall doublingTimeMonths > 0").toBeGreaterThan(0);
  });
});

// ── Leaderboard cleanliness ────────────────────────────────────────────────────

describe("leaderboard cleanliness — regression guards", () => {
  it("every countryLeaderboard entry has a non-empty countryShort with no comma", () => {
    const { aggregates } = readSnapshot();
    for (const entry of aggregates.countryLeaderboard) {
      expect(
        entry.countryShort.trim().length,
        `country ${entry.country} must have non-empty countryShort`,
      ).toBeGreaterThan(0);
      expect(
        entry.countryShort.includes(","),
        `countryShort "${entry.countryShort}" must not contain a comma (duplicate-token bug)`,
      ).toBe(false);
    }
  });

  it("no two countryLeaderboard entries share the same countryShort", () => {
    const { aggregates } = readSnapshot();
    const shorts = aggregates.countryLeaderboard.map((e) => e.countryShort);
    const unique = new Set(shorts);
    expect(unique.size, "all countryShort values should be distinct").toBe(shorts.length);
  });

  it("orgLeaderboard has no blank/empty and no 'Unknown' organizations", () => {
    const { aggregates } = readSnapshot();
    for (const entry of aggregates.orgLeaderboard) {
      expect(
        entry.organization.trim().length,
        "orgLeaderboard entry must have non-empty organization",
      ).toBeGreaterThan(0);
      expect(
        entry.organization,
        "orgLeaderboard must not contain 'Unknown' organization",
      ).not.toBe("Unknown");
    }
  });

  it("every leaderboard entry has non-negative integer counts with frontierCount <= modelCount", () => {
    const { aggregates } = readSnapshot();
    const entries = [
      ...aggregates.orgLeaderboard,
      ...aggregates.countryLeaderboard,
    ];
    for (const entry of entries) {
      expect(
        Number.isInteger(entry.modelCount) && entry.modelCount >= 0,
        `modelCount ${entry.modelCount} must be non-negative integer`,
      ).toBe(true);
      expect(
        Number.isInteger(entry.frontierCount) && entry.frontierCount >= 0,
        `frontierCount ${entry.frontierCount} must be non-negative integer`,
      ).toBe(true);
      expect(
        entry.frontierCount <= entry.modelCount,
        `frontierCount (${entry.frontierCount}) must be <= modelCount (${entry.modelCount})`,
      ).toBe(true);
    }
  });
});

// ── Aggregate consistency ──────────────────────────────────────────────────────

describe("aggregate consistency", () => {
  it("accessibilityMix sums exactly to getComputeModels().length", () => {
    const { accessibilityMix } = getAIFrontierData().aggregates;
    const total =
      accessibilityMix.openWeights + accessibilityMix.closed + accessibilityMix.unknown;
    expect(total).toBe(getComputeModels().length);
  });

  it("costTrend years are strictly ascending", () => {
    const costTrend = getAIFrontierData().aggregates.costTrend;
    for (let i = 1; i < costTrend.length; i++) {
      expect(
        costTrend[i].year,
        `costTrend[${i}].year should be > costTrend[${i - 1}].year`,
      ).toBeGreaterThan(costTrend[i - 1].year);
    }
  });

  it("powerTrend years are strictly ascending", () => {
    const powerTrend = getAIFrontierData().aggregates.powerTrend;
    for (let i = 1; i < powerTrend.length; i++) {
      expect(
        powerTrend[i].year,
        `powerTrend[${i}].year should be > powerTrend[${i - 1}].year`,
      ).toBeGreaterThan(powerTrend[i - 1].year);
    }
  });

  it("frontierByYear years are ascending and each computeFlop > 0", () => {
    const frontierByYear = getAIFrontierData().aggregates.computeTrend.frontierByYear;
    expect(frontierByYear.length).toBeGreaterThan(0);
    for (let i = 1; i < frontierByYear.length; i++) {
      expect(
        frontierByYear[i].year,
        `frontierByYear[${i}].year should be >= frontierByYear[${i - 1}].year`,
      ).toBeGreaterThanOrEqual(frontierByYear[i - 1].year);
    }
    for (const point of frontierByYear) {
      expect(point.computeFlop, `frontierByYear computeFlop must be > 0`).toBeGreaterThan(0);
    }
  });
});

// ── Selectors ─────────────────────────────────────────────────────────────────

describe("selectors", () => {
  it("getOrgLeaderboard(5) returns at most 5 entries", () => {
    expect(getOrgLeaderboard(5).length).toBeLessThanOrEqual(5);
  });

  it("getAIFrontierData().source.license is 'CC BY 4.0'", () => {
    expect(getAIFrontierData().source.license).toBe("CC BY 4.0");
  });

  it("formatFlop(5e26) returns a non-empty string", () => {
    const result = formatFlop(5e26);
    expect(typeof result).toBe("string");
    expect(result.trim().length).toBeGreaterThan(0);
  });

  it("getModernEraRegression() returns finite slope and intercept", () => {
    const reg = getModernEraRegression();
    if (reg === null) throw new Error("getModernEraRegression() must not return null");
    expect(Number.isFinite(reg.slopeLog10PerYear)).toBe(true);
    expect(Number.isFinite(reg.intercept)).toBe(true);
  });

  it("getCountryLeaderboard() returns at least one entry", () => {
    const result = getCountryLeaderboard();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});

// ── Non-advisory framing ───────────────────────────────────────────────────────

describe("non-advisory framing", () => {
  it("caveats[] is non-empty", () => {
    const { caveats } = readSnapshot();
    expect(Array.isArray(caveats)).toBe(true);
    expect(caveats.length).toBeGreaterThan(0);
  });

  it("caveats or methodology notes include descriptive/estimate language (not forecast claims)", () => {
    const snap = readSnapshot();
    const allText = [
      ...snap.caveats,
      snap.methodology.notes,
      snap.source.caveat,
    ].join(" ").toLowerCase();
    expect(allText).toMatch(
      /descriptive|estimate|historical|not a forecast|not forecast|not intended as/,
    );
  });
});

// ── Schema invariants — full-catalog vs compute-known ─────────────────────────

describe("schema invariants — full-catalog vs compute-known", () => {
  it("counts.withDate (full catalog) >= counts.withCompute (compute-known)", () => {
    const { counts } = readSnapshot();
    expect(counts.withDate, "full dated catalog must be >= compute-known subset").toBeGreaterThanOrEqual(
      counts.withCompute,
    );
  });

  it("counts.withDate is at least 1000 (full dated catalog sanity)", () => {
    const { counts } = readSnapshot();
    expect(counts.withDate).toBeGreaterThanOrEqual(1000);
  });

  it("counts.withCompute is at least 400 (compute-known subset sanity)", () => {
    const { counts } = readSnapshot();
    expect(counts.withCompute).toBeGreaterThanOrEqual(400);
  });

  it("recentWindowStart and recentWindowEnd are valid YYYY-MM-DD dates", () => {
    const { counts } = readSnapshot();
    expect(counts.recentWindowStart, "recentWindowStart").toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(counts.recentWindowEnd, "recentWindowEnd").toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("recentWindowEnd >= recentWindowStart", () => {
    const { counts } = readSnapshot();
    expect(counts.recentWindowEnd >= counts.recentWindowStart).toBe(true);
  });

  it("recentWindowCount > 0", () => {
    const { counts } = readSnapshot();
    expect(counts.recentWindowCount, "recentWindowCount must be positive").toBeGreaterThan(0);
  });

  it("definitions block is present with all required keys", () => {
    const { definitions } = readSnapshot();
    expect(definitions, "definitions must be present").toBeTruthy();
    const required = [
      "frontierDefinition",
      "orgLeaderboardMetric",
      "countryLeaderboardDefaultSort",
      "openWeightsMetric",
      "multiCountryAttribution",
      "googleEntitiesNote",
      "coverageNote",
    ] as const;
    for (const key of required) {
      expect(
        typeof definitions[key] === "string" && definitions[key].length > 0,
        `definitions.${key} must be a non-empty string`,
      ).toBe(true);
    }
  });

  it("definitions.frontierDefinition discloses compute-only nature (not capability)", () => {
    const { definitions } = readSnapshot();
    const text = definitions.frontierDefinition.toLowerCase();
    expect(text).toMatch(/compute/);
    expect(text).toMatch(/not|historical|disclosure/);
  });

  it("methodology.recentWindow is present with valid years/start/end", () => {
    const { methodology } = readSnapshot();
    expect(methodology.recentWindow, "recentWindow must be present").toBeTruthy();
    const rw = methodology.recentWindow!;
    expect(rw.years, "recentWindow.years must be positive").toBeGreaterThan(0);
    expect(rw.start, "recentWindow.start format").toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rw.end, "recentWindow.end format").toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rw.end >= rw.start).toBe(true);
  });

  it("all OrgLeaderboardEntry: sub-counts do not exceed modelCount; recentCount/openWeightsCount non-negative", () => {
    const { aggregates } = readSnapshot();
    for (const entry of aggregates.orgLeaderboard) {
      const label = entry.organization;
      expect(
        Number.isInteger(entry.modelCount) && entry.modelCount >= 0,
        `${label} modelCount non-negative integer`,
      ).toBe(true);
      expect(
        Number.isInteger(entry.computeKnownCount) && entry.computeKnownCount >= 0,
        `${label} computeKnownCount non-negative integer`,
      ).toBe(true);
      expect(
        Number.isInteger(entry.recentCount) && entry.recentCount >= 0,
        `${label} recentCount non-negative integer`,
      ).toBe(true);
      expect(
        Number.isInteger(entry.openWeightsCount) && entry.openWeightsCount >= 0,
        `${label} openWeightsCount non-negative integer`,
      ).toBe(true);
      expect(
        entry.computeKnownCount,
        `${label} computeKnownCount <= modelCount`,
      ).toBeLessThanOrEqual(entry.modelCount);
      expect(
        entry.frontierCount,
        `${label} frontierCount <= computeKnownCount (frontier is compute-known subset)`,
      ).toBeLessThanOrEqual(entry.computeKnownCount);
      expect(
        entry.recentCount,
        `${label} recentCount <= modelCount`,
      ).toBeLessThanOrEqual(entry.modelCount);
      expect(
        entry.openWeightsCount,
        `${label} openWeightsCount <= modelCount`,
      ).toBeLessThanOrEqual(entry.modelCount);
      expect(Number.isFinite(entry.maxComputeFlop), `${label} maxComputeFlop must be finite`).toBe(true);
      expect(entry.maxComputeFlop, `${label} maxComputeFlop >= 0`).toBeGreaterThanOrEqual(0);
    }
  });

  it("all CountryLeaderboardEntry: sub-counts do not exceed modelCount; recentCount/openWeightsCount non-negative", () => {
    const { aggregates } = readSnapshot();
    for (const entry of aggregates.countryLeaderboard) {
      const label = entry.country;
      expect(
        Number.isInteger(entry.modelCount) && entry.modelCount >= 0,
        `${label} modelCount`,
      ).toBe(true);
      expect(
        Number.isInteger(entry.computeKnownCount) && entry.computeKnownCount >= 0,
        `${label} computeKnownCount`,
      ).toBe(true);
      expect(
        Number.isInteger(entry.recentCount) && entry.recentCount >= 0,
        `${label} recentCount`,
      ).toBe(true);
      expect(
        Number.isInteger(entry.openWeightsCount) && entry.openWeightsCount >= 0,
        `${label} openWeightsCount`,
      ).toBe(true);
      expect(
        Number.isInteger(entry.frontierCount) && entry.frontierCount >= 0,
        `${label} frontierCount`,
      ).toBe(true);
      expect(
        entry.computeKnownCount,
        `${label} computeKnownCount <= modelCount`,
      ).toBeLessThanOrEqual(entry.modelCount);
      expect(
        entry.frontierCount,
        `${label} frontierCount <= computeKnownCount`,
      ).toBeLessThanOrEqual(entry.computeKnownCount);
      expect(
        entry.recentCount,
        `${label} recentCount <= modelCount`,
      ).toBeLessThanOrEqual(entry.modelCount);
      expect(
        entry.openWeightsCount,
        `${label} openWeightsCount <= modelCount`,
      ).toBeLessThanOrEqual(entry.modelCount);
    }
  });

  it("fullCatalogAccessibilityMix sums to counts.withDate", () => {
    const snap = readSnapshot();
    const mix = snap.aggregates.fullCatalogAccessibilityMix;
    const total = mix.openWeights + mix.closed + mix.unknown;
    expect(total, "fullCatalogAccessibilityMix must sum to withDate").toBe(snap.counts.withDate);
  });

  it("compute-known accessibilityMix sums to counts.withCompute", () => {
    const snap = readSnapshot();
    const mix = snap.aggregates.accessibilityMix;
    const total = mix.openWeights + mix.closed + mix.unknown;
    expect(total, "accessibilityMix must sum to withCompute").toBe(snap.counts.withCompute);
  });

  it("source.url references the correct epoch.ai AI models endpoint", () => {
    const snap = readSnapshot();
    expect(snap.source.url).toMatch(/epoch\.ai/);
    expect(snap.source.url, "source URL must reference ai-models not notable-ai-models").not.toMatch(
      /notable-ai-models/,
    );
  });
});

// ── Data spot checks — methodology correction ─────────────────────────────────

describe("data spot checks — methodology correction", () => {
  it("country leaderboard is sorted by recentCount descending (default sort)", () => {
    const countries = getCountryLeaderboard();
    for (let i = 1; i < countries.length; i++) {
      expect(
        countries[i].recentCount,
        `countries[${i}].recentCount (${countries[i].recentCount}) must be <= countries[${i - 1}].recentCount (${countries[i - 1].recentCount})`,
      ).toBeLessThanOrEqual(countries[i - 1].recentCount);
    }
  });

  it("China (recentCount 104) ranks above United Kingdom (recentCount 6) in default country view — key methodology correction", () => {
    const countries = getCountryLeaderboard();
    const china = countries.find((c) => c.country === "China");
    const uk = countries.find(
      (c) => c.country === "United Kingdom" || c.countryShort === "United Kingdom",
    );
    expect(china, "China must be in country leaderboard").toBeTruthy();
    expect(uk, "United Kingdom must be in country leaderboard").toBeTruthy();
    // Exact snapshot values that protect the correction
    expect(china!.recentCount, "China recentCount snapshot").toBe(104);
    expect(uk!.recentCount, "UK recentCount snapshot").toBe(6);
    // China must rank above UK by default recentCount sort
    const chinaIdx = countries.indexOf(china!);
    const ukIdx = countries.indexOf(uk!);
    expect(
      chinaIdx,
      `China (idx ${chinaIdx}) must appear before UK (idx ${ukIdx}) in the default recentCount-sorted country leaderboard`,
    ).toBeLessThan(ukIdx);
  });

  it("United States is #1 country by recentCount with snapshot value 189", () => {
    const countries = getCountryLeaderboard();
    expect(countries[0].country, "US must be #1 by recentCount").toMatch(/United States/);
    expect(countries[0].recentCount, "US recentCount snapshot").toBe(189);
  });

  it("OpenAI is present in orgLeaderboard with correct snapshot counts", () => {
    const { aggregates } = readSnapshot();
    const openai = aggregates.orgLeaderboard.find((o) => o.organization === "OpenAI");
    expect(openai, "OpenAI must be in orgLeaderboard").toBeTruthy();
    expect(openai!.recentCount, "OpenAI recentCount snapshot").toBe(44);
    expect(openai!.modelCount, "OpenAI modelCount (full catalog) snapshot").toBe(65);
    expect(openai!.computeKnownCount, "OpenAI computeKnownCount snapshot").toBe(22);
  });

  it("Anthropic is present and visible in the recent org view with snapshot recentCount 15", () => {
    const { aggregates } = readSnapshot();
    const anthropic = aggregates.orgLeaderboard.find((o) => o.organization === "Anthropic");
    expect(anthropic, "Anthropic must be in orgLeaderboard (was missing from compute-filtered view)").toBeTruthy();
    expect(anthropic!.recentCount, "Anthropic recentCount snapshot").toBe(15);
    expect(anthropic!.modelCount, "Anthropic modelCount snapshot").toBeGreaterThanOrEqual(15);
    // Anthropic should rank in top 5 by recentCount (it should be visible by default)
    const recentlySorted = aggregates.orgLeaderboard
      .slice()
      .sort((a, b) => b.recentCount - a.recentCount || b.modelCount - a.modelCount || a.organization.localeCompare(b.organization));
    const anthropicRank = recentlySorted.findIndex((o) => o.organization === "Anthropic");
    expect(anthropicRank, "Anthropic must be in top 10 by recentCount").toBeLessThan(10);
  });

  it("Google DeepMind recentCount snapshot is 31", () => {
    const { aggregates } = readSnapshot();
    const gdm = aggregates.orgLeaderboard.find((o) => o.organization === "Google DeepMind");
    expect(gdm, "Google DeepMind must be in orgLeaderboard").toBeTruthy();
    expect(gdm!.recentCount, "Google DeepMind recentCount snapshot").toBe(31);
  });

  it("UK frontierCount (9) > China frontierCount (4) showing UK historical compute advantage", () => {
    const countries = getCountryLeaderboard();
    const china = countries.find((c) => c.country === "China");
    const uk = countries.find(
      (c) => c.country === "United Kingdom" || c.countryShort === "United Kingdom",
    );
    expect(uk!.frontierCount, "UK frontierCount snapshot").toBe(9);
    expect(china!.frontierCount, "China frontierCount snapshot").toBe(4);
    expect(
      uk!.frontierCount,
      "UK frontierCount must exceed China frontierCount (historical compute-known models)",
    ).toBeGreaterThan(china!.frontierCount);
  });

  it("frontierCount and computeKnownCount dimensions are separately available on each country entry", () => {
    const countries = getCountryLeaderboard();
    for (const c of countries.slice(0, 5)) {
      expect(
        "frontierCount" in c,
        `${c.country} must have frontierCount field`,
      ).toBe(true);
      expect(
        "computeKnownCount" in c,
        `${c.country} must have computeKnownCount field`,
      ).toBe(true);
      expect(
        "recentCount" in c,
        `${c.country} must have recentCount field`,
      ).toBe(true);
      expect(
        "openWeightsCount" in c,
        `${c.country} must have openWeightsCount field`,
      ).toBe(true);
    }
  });

  it("orgLeaderboard is sorted by modelCount (full catalog) descending", () => {
    const { aggregates } = readSnapshot();
    const orgs = aggregates.orgLeaderboard;
    for (let i = 1; i < orgs.length; i++) {
      expect(
        orgs[i].modelCount,
        `orgs[${i}].modelCount (${orgs[i].modelCount}) must be <= orgs[${i - 1}].modelCount (${orgs[i - 1].modelCount})`,
      ).toBeLessThanOrEqual(orgs[i - 1].modelCount);
    }
  });
});

// ── Selectors — new API ────────────────────────────────────────────────────────

describe("selectors — new API", () => {
  it("getRecentlyActiveOrgs() returns entries sorted by recentCount descending with stable name tie-breaker", () => {
    const orgs = getRecentlyActiveOrgs();
    expect(Array.isArray(orgs)).toBe(true);
    expect(orgs.length).toBeGreaterThan(0);
    for (let i = 1; i < orgs.length; i++) {
      const prev = orgs[i - 1];
      const curr = orgs[i];
      if (prev.recentCount === curr.recentCount) {
        // Tie on recentCount: fall back to modelCount desc then name asc
        if (prev.modelCount === curr.modelCount) {
          expect(
            curr.organization.localeCompare(prev.organization),
            `tie-breaker name: ${prev.organization} should precede ${curr.organization}`,
          ).toBeGreaterThanOrEqual(0);
        } else {
          expect(curr.modelCount).toBeLessThanOrEqual(prev.modelCount);
        }
      } else {
        expect(
          curr.recentCount,
          `getRecentlyActiveOrgs sort: ${curr.organization} (${curr.recentCount}) must be <= ${prev.organization} (${prev.recentCount})`,
        ).toBeLessThanOrEqual(prev.recentCount);
      }
    }
  });

  it("getRecentlyActiveOrgs() OpenAI is #1 with recentCount 44", () => {
    const orgs = getRecentlyActiveOrgs();
    expect(orgs[0].organization, "OpenAI must be #1 by recentCount").toBe("OpenAI");
    expect(orgs[0].recentCount).toBe(44);
  });

  it("getRecentlyActiveOrgs(5) returns at most 5 entries", () => {
    expect(getRecentlyActiveOrgs(5).length).toBeLessThanOrEqual(5);
  });

  it("getFullCatalogAccessibilityMix() returns all three keys summing to counts.withDate", () => {
    const mix = getFullCatalogAccessibilityMix();
    expect("openWeights" in mix).toBe(true);
    expect("closed" in mix).toBe(true);
    expect("unknown" in mix).toBe(true);
    const total = mix.openWeights + mix.closed + mix.unknown;
    expect(total).toBe(getAIFrontierData().counts.withDate);
  });

  it("getAccessibilityMix() (compute-known) sums to getComputeModels().length", () => {
    const mix = getAccessibilityMix();
    const total = mix.openWeights + mix.closed + mix.unknown;
    expect(total).toBe(getComputeModels().length);
  });

  it("getRecentWindow() returns valid window with start/end/years", () => {
    const rw = getRecentWindow();
    expect(rw, "recentWindow must not be null").not.toBeNull();
    expect(rw!.years).toBeGreaterThan(0);
    expect(rw!.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rw!.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(rw!.end >= rw!.start).toBe(true);
  });

  it("getDefinitions() returns all required keys as non-empty strings", () => {
    const defs = getDefinitions();
    const required: Array<keyof typeof defs> = [
      "frontierDefinition",
      "orgLeaderboardMetric",
      "countryLeaderboardDefaultSort",
      "openWeightsMetric",
      "multiCountryAttribution",
      "googleEntitiesNote",
      "coverageNote",
    ];
    for (const key of required) {
      expect(
        typeof defs[key] === "string" && defs[key].length > 0,
        `getDefinitions().${key} must be a non-empty string`,
      ).toBe(true);
    }
  });

  it("getDefinitions().frontierDefinition explicitly discloses compute-history, not capability", () => {
    const defs = getDefinitions();
    const text = defs.frontierDefinition.toLowerCase();
    expect(text, "frontierDefinition must mention compute").toMatch(/compute/);
    expect(
      text,
      "frontierDefinition must clarify it is NOT capability",
    ).toMatch(/not|historical|disclosure/);
  });

  it("getDefinitions().countryLeaderboardDefaultSort explains recentCount as default sort", () => {
    const defs = getDefinitions();
    const text = defs.countryLeaderboardDefaultSort.toLowerCase();
    expect(text).toMatch(/recent/);
  });

  it("getOrgLeaderboard() returns entries sorted by modelCount (full catalog) descending", () => {
    const orgs = getOrgLeaderboard(50);
    for (let i = 1; i < orgs.length; i++) {
      expect(
        orgs[i].modelCount,
        `getOrgLeaderboard sort: orgs[${i}].modelCount must be <= orgs[${i - 1}].modelCount`,
      ).toBeLessThanOrEqual(orgs[i - 1].modelCount);
    }
  });

  it("getCountryLeaderboard() returns entries sorted by recentCount descending", () => {
    const countries = getCountryLeaderboard();
    for (let i = 1; i < countries.length; i++) {
      expect(
        countries[i].recentCount,
        `getCountryLeaderboard sort: countries[${i}].recentCount must be <= countries[${i - 1}].recentCount`,
      ).toBeLessThanOrEqual(countries[i - 1].recentCount);
    }
  });

  it("getOverallRegression() returns valid regression or null", () => {
    const reg = getOverallRegression();
    if (reg !== null) {
      expect(Number.isFinite(reg.slopeLog10PerYear)).toBe(true);
      expect(Number.isFinite(reg.intercept)).toBe(true);
      expect(reg.r2).toBeGreaterThanOrEqual(0);
      expect(reg.r2).toBeLessThanOrEqual(1);
    }
  });

  it("getCostTrend() returns array of CostTrendPoints with valid fields", () => {
    const trend = getCostTrend();
    expect(Array.isArray(trend)).toBe(true);
    for (const pt of trend) {
      expect(Number.isInteger(pt.year)).toBe(true);
      expect(pt.n).toBeGreaterThan(0);
      expect(Number.isFinite(pt.medianCostUsd2023)).toBe(true);
      expect(Number.isFinite(pt.maxCostUsd2023)).toBe(true);
    }
  });

  it("getPowerTrend() returns array of PowerTrendPoints with valid fields", () => {
    const trend = getPowerTrend();
    expect(Array.isArray(trend)).toBe(true);
    for (const pt of trend) {
      expect(Number.isInteger(pt.year)).toBe(true);
      expect(pt.n).toBeGreaterThan(0);
      expect(Number.isFinite(pt.medianPowerW)).toBe(true);
      expect(Number.isFinite(pt.maxPowerW)).toBe(true);
    }
  });

  it("getDomainMix() returns non-empty sorted array with positive counts", () => {
    const domains = getDomainMix();
    expect(domains.length).toBeGreaterThan(0);
    for (let i = 1; i < domains.length; i++) {
      expect(domains[i].count).toBeLessThanOrEqual(domains[i - 1].count);
    }
    for (const d of domains) {
      expect(d.count).toBeGreaterThan(0);
      expect(d.domain.length).toBeGreaterThan(0);
    }
  });

  it("formatLog10Flop formats a finite log10 value as '10^X.X' string", () => {
    const result = formatLog10Flop(24.82);
    expect(result).toMatch(/^10\^\d+\.\d+$/);
    expect(formatLog10Flop(NaN)).toBe("unknown");
  });
});

// ── Selectors — six metric dimensions; missing/zero and tie-breaker behaviour ──

describe("selectors — all six metric dimensions", () => {
  it("all six MetricKey values map to finite non-negative fields on OrgLeaderboardEntry", () => {
    const orgs = getOrgLeaderboard(50);
    for (const org of orgs) {
      expect(Number.isFinite(org.recentCount) && org.recentCount >= 0, `${org.organization} recentCount`).toBe(true);
      expect(Number.isFinite(org.modelCount) && org.modelCount >= 0, `${org.organization} modelCount`).toBe(true);
      expect(Number.isFinite(org.openWeightsCount) && org.openWeightsCount >= 0, `${org.organization} openWeightsCount`).toBe(true);
      expect(Number.isFinite(org.computeKnownCount) && org.computeKnownCount >= 0, `${org.organization} computeKnownCount`).toBe(true);
      expect(Number.isFinite(org.frontierCount) && org.frontierCount >= 0, `${org.organization} frontierCount`).toBe(true);
      expect(Number.isFinite(org.maxComputeFlop) && org.maxComputeFlop >= 0, `${org.organization} maxComputeFlop (largestRun)`).toBe(true);
    }
  });

  it("all six MetricKey values map to finite non-negative fields on CountryLeaderboardEntry", () => {
    const countries = getCountryLeaderboard();
    for (const c of countries) {
      expect(Number.isFinite(c.recentCount) && c.recentCount >= 0, `${c.country} recentCount`).toBe(true);
      expect(Number.isFinite(c.modelCount) && c.modelCount >= 0, `${c.country} modelCount`).toBe(true);
      expect(Number.isFinite(c.openWeightsCount) && c.openWeightsCount >= 0, `${c.country} openWeightsCount`).toBe(true);
      expect(Number.isFinite(c.computeKnownCount) && c.computeKnownCount >= 0, `${c.country} computeKnownCount`).toBe(true);
      expect(Number.isFinite(c.frontierCount) && c.frontierCount >= 0, `${c.country} frontierCount`).toBe(true);
      expect(Number.isFinite(c.maxComputeFlop) && c.maxComputeFlop >= 0, `${c.country} maxComputeFlop (largestRun)`).toBe(true);
    }
  });

  it("largestRun (maxComputeFlop) — all fields exist and formatFlop handles zero correctly", () => {
    const orgs = getOrgLeaderboard(50);
    // All leaderboard entries should have non-negative maxComputeFlop
    for (const o of orgs) {
      expect(
        Number.isFinite(o.maxComputeFlop) && o.maxComputeFlop >= 0,
        `${o.organization} maxComputeFlop must be finite non-negative`,
      ).toBe(true);
    }
    // formatFlop correctly handles the zero/missing case (used when filtering largestRun)
    expect(formatFlop(0), "formatFlop(0) must return '0 FLOP'").toBe("0 FLOP");
    // Country entries also have the field
    const countries = getCountryLeaderboard();
    for (const c of countries) {
      expect(
        Number.isFinite(c.maxComputeFlop) && c.maxComputeFlop >= 0,
        `${c.country} maxComputeFlop must be finite non-negative`,
      ).toBe(true);
    }
  });

  it("frontierCount is a subset of computeKnownCount on all orgs and countries", () => {
    const orgs = getOrgLeaderboard(50);
    for (const o of orgs) {
      expect(o.frontierCount, `${o.organization} frontierCount <= computeKnownCount`).toBeLessThanOrEqual(o.computeKnownCount);
    }
    const countries = getCountryLeaderboard();
    for (const c of countries) {
      expect(c.frontierCount, `${c.country} frontierCount <= computeKnownCount`).toBeLessThanOrEqual(c.computeKnownCount);
    }
  });

  it("getRecentlyActiveOrgs sort is deterministic across multiple calls", () => {
    const a = getRecentlyActiveOrgs(10).map((o) => o.organization);
    const b = getRecentlyActiveOrgs(10).map((o) => o.organization);
    expect(a).toEqual(b);
  });

  it("getCountryLeaderboard sort is deterministic across multiple calls", () => {
    const a = getCountryLeaderboard().map((c) => c.country);
    const b = getCountryLeaderboard().map((c) => c.country);
    expect(a).toEqual(b);
  });
});

// ── Copy guardrails — i18n strings (EN + ZH) ──────────────────────────────────

describe("copy guardrails — EN i18n strings", () => {
  it("dataDisclaimer explicitly states these rankings do not measure capability or impact", () => {
    const text = frontierEn.dataDisclaimer.toLowerCase();
    expect(text, "dataDisclaimer must be non-empty").toBeTruthy();
    // Must contain denial of impact/capability claims
    expect(text).toMatch(/do not measure|not measure|does not measure/);
    expect(text).toMatch(/capability|impact/);
  });

  it("leadersSectionSubhead scopes rankings to tracked catalog, not general AI capability", () => {
    const text = frontierEn.leadersSectionSubhead.toLowerCase();
    // Must contain explicit scope limitation — tracked catalog, not impact/capability
    expect(text).toMatch(/not.*capability|not.*impact|tracked catalog/);
    // The subhead must explicitly negate capability/impact claims (positive assertion)
    expect(
      text,
      "subhead must explicitly state this does NOT rank general AI capability or impact",
    ).toMatch(/not general ai capability|not.*general ai|not.*capability.*not.*impact|not.*product adoption/);
  });

  it("metricFrontierCountDesc explicitly states frontier label is not capability", () => {
    const text = frontierEn.metricFrontierCountDesc.toLowerCase();
    expect(text).toMatch(/not.*capability|not a measure.*capability|capability.*not/);
  });

  it("metricOpenWeightsCountDesc identifies open-release proxy limitation (not downloads/adoption)", () => {
    const text = frontierEn.metricOpenWeightsCountDesc.toLowerCase();
    expect(text).toMatch(/not.*measure|proxy|not.*download|not.*adoption/);
    expect(text).toMatch(/proxy|source.catalog|catalog activity/i.source ? /catalog/ : /not.*measure/);
  });

  it("metricRecentCountDesc is the default sort description and contains recentCount explanation", () => {
    const text = frontierEn.metricRecentCountDesc.toLowerCase();
    expect(text).toMatch(/recent|default|3.year|3-year/);
  });

  it("frontierDefinitionNote discloses compute-only definition (not capability)", () => {
    const text = frontierEn.frontierDefinitionNote.toLowerCase();
    expect(text).toMatch(/compute/);
    expect(text).toMatch(/not.*capability|not a measure.*capability|capability.*not/);
  });

  it("coverageNote is a template string with required interpolation variables", () => {
    const str = frontierEn.coverageNote;
    expect(str).toContain("{totalDated}");
    expect(str).toContain("{computeKnown}");
    expect(str).toContain("{coveragePct}");
    expect(str).toContain("{windowStart}");
    expect(str).toContain("{windowEnd}");
  });

  it("countryAttributionNote is non-empty and mentions multi-country attribution", () => {
    const text = frontierEn.countryAttributionNote.toLowerCase();
    expect(text.length, "countryAttributionNote must be non-empty").toBeGreaterThan(0);
    expect(text).toMatch(/multiple|multi.country|simultaneously/);
  });

  it("orgEntitiesNote is non-empty and clarifies entities are preserved as recorded", () => {
    const text = frontierEn.orgEntitiesNote.toLowerCase();
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/recorded|source|no.*consolidation|separate/);
  });

  it("statDoublingSub uses interpolation tokens (not hardcoded r² or n values)", () => {
    expect(frontierEn.statDoublingSub).toContain("{modernEraStart}");
    expect(frontierEn.statDoublingSub).toContain("{r2}");
    // Must NOT hardcode a static r² number
    expect(frontierEn.statDoublingSub).not.toMatch(/r²=0\.\d+/);
  });

  it("timelineAnnotationFull uses interpolation tokens for doublingTime, r2, and n", () => {
    expect(frontierEn.timelineAnnotationFull).toContain("{doublingTime}");
    expect(frontierEn.timelineAnnotationFull).toContain("{r2}");
    expect(frontierEn.timelineAnnotationFull).toContain("{n}");
    // Must NOT hardcode any of these as static numbers
    expect(frontierEn.timelineAnnotationFull).not.toMatch(/n=\d+/);
    expect(frontierEn.timelineAnnotationFull).not.toMatch(/r²=0\.\d+/);
  });

  it("metricRecentCountDesc uses interpolation tokens for windowStart and windowEnd", () => {
    expect(frontierEn.metricRecentCountDesc).toContain("{windowStart}");
    expect(frontierEn.metricRecentCountDesc).toContain("{windowEnd}");
  });

  it("all six metricLabel keys are defined in EN and non-empty", () => {
    const labelKeys = [
      "metricRecentCount",
      "metricModelCount",
      "metricOpenWeightsCount",
      "metricComputeKnownCount",
      "metricFrontierCount",
      "metricLargestRun",
    ] as const;
    for (const key of labelKeys) {
      expect(frontierEn[key].length, `EN ${key} must be non-empty`).toBeGreaterThan(0);
    }
  });

  it("all six metricDesc keys are defined in EN and non-empty", () => {
    const descKeys = [
      "metricRecentCountDesc",
      "metricModelCountDesc",
      "metricOpenWeightsCountDesc",
      "metricComputeKnownCountDesc",
      "metricFrontierCountDesc",
      "metricLargestRunDesc",
    ] as const;
    for (const key of descKeys) {
      expect(frontierEn[key].length, `EN ${key} must be non-empty`).toBeGreaterThan(0);
    }
  });
});

describe("copy guardrails — ZH i18n strings", () => {
  it("dataDisclaimer (ZH) explicitly states rankings do not measure capability or impact", () => {
    const text = frontierZh.dataDisclaimer;
    expect(text.length, "ZH dataDisclaimer must be non-empty").toBeGreaterThan(0);
    // ZH denial of measuring: 不衡量 = "does not measure"
    expect(text).toMatch(/不衡量|不代表|不反映|不评估/);
    expect(text).toMatch(/能力|影响|采用/);
  });

  it("leadersSectionSubhead (ZH) scopes to tracked catalog, not general AI capability", () => {
    const text = frontierZh.leadersSectionSubhead;
    expect(text.length).toBeGreaterThan(0);
    expect(text).toMatch(/不.*能力|而非.*能力|追踪目录/);
  });

  it("metricFrontierCountDesc (ZH) explicitly states it is not capability", () => {
    const text = frontierZh.metricFrontierCountDesc;
    expect(text).toMatch(/不.*能力|而非.*能力|非.*能力|不衡量.*能力/);
  });

  it("frontierDefinitionNote (ZH) discloses compute-only definition, not capability", () => {
    const text = frontierZh.frontierDefinitionNote;
    expect(text).toMatch(/算力/);
    expect(text).toMatch(/不.*能力|而非.*能力|非.*能力/);
  });

  it("coverageNote (ZH) is a template string with required interpolation variables", () => {
    const str = frontierZh.coverageNote;
    expect(str).toContain("{totalDated}");
    expect(str).toContain("{computeKnown}");
    expect(str).toContain("{coveragePct}");
    expect(str).toContain("{windowStart}");
    expect(str).toContain("{windowEnd}");
  });

  it("metricRecentCountDesc (ZH) uses interpolation tokens for window dates", () => {
    expect(frontierZh.metricRecentCountDesc).toContain("{windowStart}");
    expect(frontierZh.metricRecentCountDesc).toContain("{windowEnd}");
  });

  it("statDoublingSub (ZH) uses interpolation tokens not hardcoded r² values", () => {
    expect(frontierZh.statDoublingSub).toContain("{modernEraStart}");
    expect(frontierZh.statDoublingSub).toContain("{r2}");
    expect(frontierZh.statDoublingSub).not.toMatch(/r²=0\.\d+/);
  });

  it("timelineAnnotationFull (ZH) uses interpolation tokens for all three regression stats", () => {
    expect(frontierZh.timelineAnnotationFull).toContain("{doublingTime}");
    expect(frontierZh.timelineAnnotationFull).toContain("{r2}");
    expect(frontierZh.timelineAnnotationFull).toContain("{n}");
    expect(frontierZh.timelineAnnotationFull).not.toMatch(/n=\d+/);
  });

  it("all six metricLabel and metricDesc keys are defined in ZH and non-empty", () => {
    const keys = [
      "metricRecentCount",
      "metricModelCount",
      "metricOpenWeightsCount",
      "metricComputeKnownCount",
      "metricFrontierCount",
      "metricLargestRun",
      "metricRecentCountDesc",
      "metricModelCountDesc",
      "metricOpenWeightsCountDesc",
      "metricComputeKnownCountDesc",
      "metricFrontierCountDesc",
      "metricLargestRunDesc",
    ] as const;
    for (const key of keys) {
      expect(frontierZh[key].length, `ZH ${key} must be non-empty`).toBeGreaterThan(0);
    }
  });

  it("ZH and EN have matching keys for all frontier namespace strings", () => {
    const enKeys = Object.keys(frontierEn).sort();
    const zhKeys = Object.keys(frontierZh).sort();
    expect(zhKeys, "ZH frontier namespace must have the same keys as EN").toEqual(enKeys);
  });
});

// ── Regression-derived stats ───────────────────────────────────────────────────

describe("regression-derived stats — data drives UI, not hardcoded values", () => {
  it("coverageNote rendered with real data produces no unresolved {placeholder} tokens", () => {
    const snap = readSnapshot();
    const { counts } = snap;
    // coveragePct uses withComputeAndDate/withDate — matching FrontierLeadersChart's computation
    const coveragePct =
      counts.withDate > 0 ? Math.round((counts.withComputeAndDate / counts.withDate) * 1000) / 10 : 0;
    // Simulate what FrontierLeadersChart passes to t("coverageNote", {...})
    const resolved = frontierEn.coverageNote
      .replace(/\{totalDated\}/g, String(counts.withDate))
      .replace(/\{computeKnown\}/g, String(counts.withCompute))
      .replace(/\{coveragePct\}/g, String(coveragePct))
      .replace(/\{windowStart\}/g, counts.recentWindowStart)
      .replace(/\{windowEnd\}/g, counts.recentWindowEnd);
    expect(
      resolved,
      "coverageNote with real data must have no unresolved {placeholder} tokens",
    ).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("metricRecentCountDesc rendered with recentWindow produces no unresolved tokens", () => {
    const rw = getRecentWindow();
    expect(rw).not.toBeNull();
    const resolved = frontierEn.metricRecentCountDesc
      .replace(/\{windowStart\}/g, rw!.start)
      .replace(/\{windowEnd\}/g, rw!.end);
    expect(resolved).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("statDoublingSub rendered with real regression data produces no unresolved tokens", () => {
    const snap = readSnapshot();
    const regression = snap.aggregates.computeTrend.modernEra;
    if (regression === null) return; // skip if no regression
    const resolved = frontierEn.statDoublingSub
      .replace(/\{modernEraStart\}/g, String(snap.methodology.modernEraStart))
      .replace(/\{r2\}/g, regression.r2.toFixed(2));
    expect(resolved).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("timelineAnnotationFull rendered with real regression data produces no unresolved tokens", () => {
    const snap = readSnapshot();
    const regression = snap.aggregates.computeTrend.modernEra;
    if (regression === null) return;
    const dt = regression.doublingTimeMonths;
    const resolved = frontierEn.timelineAnnotationFull
      .replace(/\{doublingTime\}/g, dt != null ? dt.toFixed(1) : "—")
      .replace(/\{r2\}/g, regression.r2.toFixed(2))
      .replace(/\{n\}/g, String(regression.n));
    expect(resolved).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("whyBody rendered with real regression data produces no unresolved tokens", () => {
    const snap = readSnapshot();
    const regression = snap.aggregates.computeTrend.modernEra;
    const dt = regression?.doublingTimeMonths;
    const resolved = frontierEn.whyBody
      .replace(/\{doublingTime\}/g, dt != null ? dt.toFixed(1) : "—");
    expect(resolved).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("ZH coverageNote rendered with real data produces no unresolved tokens", () => {
    const snap = readSnapshot();
    const { counts } = snap;
    // coveragePct uses withComputeAndDate/withDate — matching FrontierLeadersChart's computation
    const coveragePct =
      counts.withDate > 0 ? Math.round((counts.withComputeAndDate / counts.withDate) * 1000) / 10 : 0;
    const resolved = frontierZh.coverageNote
      .replace(/\{totalDated\}/g, String(counts.withDate))
      .replace(/\{computeKnown\}/g, String(counts.withCompute))
      .replace(/\{coveragePct\}/g, String(coveragePct))
      .replace(/\{windowStart\}/g, counts.recentWindowStart)
      .replace(/\{windowEnd\}/g, counts.recentWindowEnd);
    expect(resolved).not.toMatch(/\{[a-zA-Z]+\}/);
  });
});

// ── FrontierMixCards — full-catalog accessibility mix snapshot ────────────────

describe("FrontierMixCards — full-catalog accessibility mix snapshot", () => {
  it("getFullCatalogAccessibilityMix() has snapshot counts: 318 open weights, 452 closed, 260 unknown, 1030 total", () => {
    const mix = getFullCatalogAccessibilityMix();
    expect(mix.openWeights, "openWeights snapshot").toBe(318);
    expect(mix.closed, "closed snapshot").toBe(452);
    expect(mix.unknown, "unknown snapshot").toBe(260);
    expect(mix.openWeights + mix.closed + mix.unknown, "total must be 1030").toBe(1030);
  });

  it("FrontierMixCards access-mix percentages compute to 31/44/25 (open/closed/unknown) from full dated catalog", () => {
    const mix = getFullCatalogAccessibilityMix();
    const total = mix.openWeights + mix.closed + mix.unknown;
    expect(total, "total must be positive for percentages").toBeGreaterThan(0);
    const pctOpen = Math.round((mix.openWeights / total) * 100);
    const pctClosed = Math.round((mix.closed / total) * 100);
    const pctUnknown = Math.round((mix.unknown / total) * 100);
    expect(pctOpen, "open-weights percentage snapshot").toBe(31);
    expect(pctClosed, "closed percentage snapshot").toBe(44);
    expect(pctUnknown, "unknown percentage snapshot").toBe(25);
  });

  it("fullCatalogAccessibilityMix total (1030) is greater than compute-only accessibilityMix total", () => {
    const fullMix = getFullCatalogAccessibilityMix();
    const computeMix = getAccessibilityMix();
    const fullTotal = fullMix.openWeights + fullMix.closed + fullMix.unknown;
    const computeTotal = computeMix.openWeights + computeMix.closed + computeMix.unknown;
    expect(
      fullTotal,
      "full-catalog mix total must exceed compute-only total (full catalog includes non-compute rows)",
    ).toBeGreaterThan(computeTotal);
  });

  it("getAIFrontierData().counts.withDate matches fullCatalogAccessibilityMix total", () => {
    const snap = readSnapshot();
    const mix = snap.aggregates.fullCatalogAccessibilityMix;
    expect(mix.openWeights + mix.closed + mix.unknown).toBe(snap.counts.withDate);
    expect(snap.counts.withDate, "withDate snapshot sanity").toBe(1030);
  });

  it("mixAccessSubhead (EN) references the full dated catalog scope (not compute-only)", () => {
    const text = frontierEn.mixAccessSubhead.toLowerCase();
    expect(text.length, "EN mixAccessSubhead must be non-empty").toBeGreaterThan(0);
    expect(text, "EN mixAccessSubhead must mention dated catalog scope").toMatch(
      /dated|all.*catalog|full.*catalog|catalog/,
    );
  });

  it("mixAccessSubhead (ZH) is non-empty and references full catalog scope", () => {
    const text = frontierZh.mixAccessSubhead;
    expect(text.length, "ZH mixAccessSubhead must be non-empty").toBeGreaterThan(0);
    expect(text, "ZH mixAccessSubhead must reference full dated catalog").toMatch(
      /有日期|全部|全目录|目录|全.*记录/,
    );
  });
});

// ── FrontierLeadersChart — coverage percentage uses withComputeAndDate ────────

describe("FrontierLeadersChart — coverage percentage population invariant", () => {
  it("counts.withComputeAndDate is a non-negative integer <= withDate and <= withCompute", () => {
    const { counts } = readSnapshot();
    expect(
      Number.isInteger(counts.withComputeAndDate) && counts.withComputeAndDate >= 0,
      "withComputeAndDate must be a non-negative integer",
    ).toBe(true);
    expect(
      counts.withComputeAndDate,
      "withComputeAndDate must be <= withDate",
    ).toBeLessThanOrEqual(counts.withDate);
    expect(
      counts.withComputeAndDate,
      "withComputeAndDate must be <= withCompute",
    ).toBeLessThanOrEqual(counts.withCompute);
  });

  it("coverage pct via withComputeAndDate/withDate matches withCompute/withDate — confirms all compute rows have dates", () => {
    const { counts } = readSnapshot();
    // FrontierLeadersChart derives coveragePct from withComputeAndDate/withDate.
    // If this equals the withCompute/withDate ratio, no undated compute rows inflate withCompute.
    const pctComputeAndDate =
      counts.withDate > 0
        ? Math.round((counts.withComputeAndDate / counts.withDate) * 1000) / 10
        : 0;
    const pctCompute =
      counts.withDate > 0
        ? Math.round((counts.withCompute / counts.withDate) * 1000) / 10
        : 0;
    expect(
      pctComputeAndDate,
      "withComputeAndDate/withDate coverage pct must equal withCompute/withDate (all compute rows are dated)",
    ).toBe(pctCompute);
  });

  it("coverageNote EN rendered using withComputeAndDate coverage pct has no unresolved tokens", () => {
    const snap = readSnapshot();
    const { counts } = snap;
    const coveragePct =
      counts.withDate > 0
        ? Math.round((counts.withComputeAndDate / counts.withDate) * 1000) / 10
        : 0;
    const resolved = frontierEn.coverageNote
      .replace(/\{totalDated\}/g, String(counts.withDate))
      .replace(/\{computeKnown\}/g, String(counts.withCompute))
      .replace(/\{coveragePct\}/g, String(coveragePct))
      .replace(/\{windowStart\}/g, counts.recentWindowStart)
      .replace(/\{windowEnd\}/g, counts.recentWindowEnd);
    expect(resolved, "EN coverageNote with withComputeAndDate pct must have no unresolved tokens").not.toMatch(
      /\{[a-zA-Z]+\}/,
    );
  });

  it("coverageNote ZH rendered using withComputeAndDate coverage pct has no unresolved tokens", () => {
    const snap = readSnapshot();
    const { counts } = snap;
    const coveragePct =
      counts.withDate > 0
        ? Math.round((counts.withComputeAndDate / counts.withDate) * 1000) / 10
        : 0;
    const resolved = frontierZh.coverageNote
      .replace(/\{totalDated\}/g, String(counts.withDate))
      .replace(/\{computeKnown\}/g, String(counts.withCompute))
      .replace(/\{coveragePct\}/g, String(coveragePct))
      .replace(/\{windowStart\}/g, counts.recentWindowStart)
      .replace(/\{windowEnd\}/g, counts.recentWindowEnd);
    expect(resolved, "ZH coverageNote with withComputeAndDate pct must have no unresolved tokens").not.toMatch(
      /\{[a-zA-Z]+\}/,
    );
  });
});

// ── AIFrontierView — whyPoint3 peakCost/peakPower interpolation ───────────────

// Local replicas of fmtUsd / fmtWatt from AIFrontierView.tsx (not exported).
function testFmtUsd(v: number): string {
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}
function testFmtWatt(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} GW`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} MW`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)} kW`;
  return `${Math.round(v)} W`;
}

describe("AIFrontierView — whyPoint3 peakCost/peakPower interpolation", () => {
  it("whyPoint3 (EN) contains both {peakCost} and {peakPower} interpolation tokens", () => {
    expect(frontierEn.whyPoint3, "EN whyPoint3 must contain {peakCost}").toContain("{peakCost}");
    expect(frontierEn.whyPoint3, "EN whyPoint3 must contain {peakPower}").toContain("{peakPower}");
  });

  it("whyPoint3 (ZH) contains both {peakCost} and {peakPower} interpolation tokens", () => {
    expect(frontierZh.whyPoint3, "ZH whyPoint3 must contain {peakCost}").toContain("{peakCost}");
    expect(frontierZh.whyPoint3, "ZH whyPoint3 must contain {peakPower}").toContain("{peakPower}");
  });

  it("whyPoint3 EN rendered with real peakCost/peakPower has no unresolved tokens", () => {
    const costTrend = getCostTrend();
    const powerTrend = getPowerTrend();
    const maxCostRaw = costTrend.reduce(
      (m, d) => (Number.isFinite(d.maxCostUsd2023) && d.maxCostUsd2023 > m ? d.maxCostUsd2023 : m),
      0,
    );
    const maxPowerRaw = powerTrend.reduce(
      (m, d) => (Number.isFinite(d.maxPowerW) && d.maxPowerW > m ? d.maxPowerW : m),
      0,
    );
    const peakCost = maxCostRaw > 0 ? testFmtUsd(maxCostRaw) : "—";
    const peakPower = maxPowerRaw > 0 ? testFmtWatt(maxPowerRaw) : "—";
    const resolved = frontierEn.whyPoint3
      .replace(/\{peakCost\}/g, peakCost)
      .replace(/\{peakPower\}/g, peakPower);
    expect(
      resolved,
      "EN whyPoint3 must have no unresolved tokens after substitution",
    ).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("whyPoint3 ZH rendered with real peakCost/peakPower has no unresolved tokens", () => {
    const costTrend = getCostTrend();
    const powerTrend = getPowerTrend();
    const maxCostRaw = costTrend.reduce(
      (m, d) => (Number.isFinite(d.maxCostUsd2023) && d.maxCostUsd2023 > m ? d.maxCostUsd2023 : m),
      0,
    );
    const maxPowerRaw = powerTrend.reduce(
      (m, d) => (Number.isFinite(d.maxPowerW) && d.maxPowerW > m ? d.maxPowerW : m),
      0,
    );
    const peakCost = maxCostRaw > 0 ? testFmtUsd(maxCostRaw) : "—";
    const peakPower = maxPowerRaw > 0 ? testFmtWatt(maxPowerRaw) : "—";
    const resolved = frontierZh.whyPoint3
      .replace(/\{peakCost\}/g, peakCost)
      .replace(/\{peakPower\}/g, peakPower);
    expect(
      resolved,
      "ZH whyPoint3 must have no unresolved tokens after substitution",
    ).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("peak training cost and power are non-trivial positive values — real data has cost/power records", () => {
    const costTrend = getCostTrend();
    const powerTrend = getPowerTrend();
    const maxCostRaw = costTrend.reduce(
      (m, d) => (Number.isFinite(d.maxCostUsd2023) && d.maxCostUsd2023 > m ? d.maxCostUsd2023 : m),
      0,
    );
    const maxPowerRaw = powerTrend.reduce(
      (m, d) => (Number.isFinite(d.maxPowerW) && d.maxPowerW > m ? d.maxPowerW : m),
      0,
    );
    // peakCost should resolve to a dollar value, not the fallback dash
    expect(maxCostRaw, "peak training cost must be positive (non-dash)").toBeGreaterThan(0);
    expect(maxPowerRaw, "peak training power must be positive (non-dash)").toBeGreaterThan(0);
    // Guard against regression to pre-2024 data: cost must exceed $100M, power > 10 MW
    expect(
      maxCostRaw,
      "peak training cost must exceed $100M (guards against stale/regression data)",
    ).toBeGreaterThan(100_000_000);
    expect(
      maxPowerRaw,
      "peak training power must exceed 10 MW (guards against stale/regression data)",
    ).toBeGreaterThan(10_000_000);
  });

  it("peakCost renders as a dollar-formatted string (not fallback dash)", () => {
    const costTrend = getCostTrend();
    const maxCostRaw = costTrend.reduce(
      (m, d) => (Number.isFinite(d.maxCostUsd2023) && d.maxCostUsd2023 > m ? d.maxCostUsd2023 : m),
      0,
    );
    const peakCost = maxCostRaw > 0 ? testFmtUsd(maxCostRaw) : "—";
    expect(peakCost, "peakCost must not be the unavailable fallback").not.toBe("—");
    expect(peakCost, "peakCost must start with $").toMatch(/^\$/);
  });

  it("peakPower renders as a watt-formatted string (not fallback dash)", () => {
    const powerTrend = getPowerTrend();
    const maxPowerRaw = powerTrend.reduce(
      (m, d) => (Number.isFinite(d.maxPowerW) && d.maxPowerW > m ? d.maxPowerW : m),
      0,
    );
    const peakPower = maxPowerRaw > 0 ? testFmtWatt(maxPowerRaw) : "—";
    expect(peakPower, "peakPower must not be the unavailable fallback").not.toBe("—");
    expect(peakPower, "peakPower must end with a power unit").toMatch(/W$|kW$|MW$|GW$/);
  });
});

// ── Copy guardrails — accessibility metric label and description ──────────────

describe("copy guardrails — accessibility metric (EN + ZH)", () => {
  it("EN metricOpenWeightsCount label is 'Weights-available records'", () => {
    expect(
      frontierEn.metricOpenWeightsCount,
      "EN metricOpenWeightsCount must be the canonical 'Weights-available records' label",
    ).toBe("Weights-available records");
  });

  it("ZH metricOpenWeightsCount label is non-empty", () => {
    expect(
      frontierZh.metricOpenWeightsCount.length,
      "ZH metricOpenWeightsCount must be non-empty",
    ).toBeGreaterThan(0);
  });

  it("EN metricOpenWeightsCountDesc references Epoch AI's 'Open model weights?' source field", () => {
    const text = frontierEn.metricOpenWeightsCountDesc;
    expect(
      text,
      "EN metricOpenWeightsCountDesc must name the Epoch AI source field",
    ).toMatch(/Open model weights\?/i);
  });

  it("EN metricOpenWeightsCountDesc states that licenses may restrict use", () => {
    const text = frontierEn.metricOpenWeightsCountDesc.toLowerCase();
    expect(
      text,
      "EN metricOpenWeightsCountDesc must mention license restrictions",
    ).toMatch(/licen.*restrict|restrict.*use|licenses may/);
  });

  it("ZH metricOpenWeightsCountDesc references Epoch AI source field and mentions license restriction", () => {
    const text = frontierZh.metricOpenWeightsCountDesc;
    expect(text.length, "ZH metricOpenWeightsCountDesc must be non-empty").toBeGreaterThan(0);
    // ZH should reference the source field: 开放模型权重 (Open model weights)
    expect(text, "ZH metricOpenWeightsCountDesc must reference source field").toMatch(/开放.*权重|权重/);
    // ZH should mention license/use restriction: 许可证 or 限制使用
    expect(text, "ZH metricOpenWeightsCountDesc must mention license restriction").toMatch(
      /许可证|限制使用|使用限制/,
    );
  });

  it("EN and ZH metricOpenWeightsCountDesc are both non-empty and non-trivial (> 20 chars)", () => {
    expect(
      frontierEn.metricOpenWeightsCountDesc.length,
      "EN metricOpenWeightsCountDesc must be substantive",
    ).toBeGreaterThan(20);
    expect(
      frontierZh.metricOpenWeightsCountDesc.length,
      "ZH metricOpenWeightsCountDesc must be substantive",
    ).toBeGreaterThan(20);
  });

  it("EN metricOpenWeightsCountDesc clarifies this is not a measure of downloads, adoption, or open-source impact", () => {
    const text = frontierEn.metricOpenWeightsCountDesc.toLowerCase();
    expect(text).toMatch(/not.*measure|not a measure/);
    expect(text).toMatch(/download|adoption|open.source.*impact|impact/);
  });

  it("ZH metricOpenWeightsCountDesc clarifies this is not a measure of downloads or adoption", () => {
    const text = frontierZh.metricOpenWeightsCountDesc;
    // ZH: 不衡量 = "does not measure"; 下载量 = downloads; 采用率 = adoption
    expect(text).toMatch(/不衡量|不代表|不反映/);
    expect(text).toMatch(/下载量|采用率/);
  });
});

// ── Rai YELLOW advisories: countryAttributionNote Chinese open-weight caution ──

describe("copy guardrails — countryAttributionNote: Chinese open-weight caution (EN)", () => {
  it("mentions that Chinese open-weight developers may be understated in compute/frontier views when compute is undisclosed", () => {
    const text = frontierEn.countryAttributionNote.toLowerCase();
    expect(text).toMatch(/chinese.*open.weight|open.weight.*chinese/);
    expect(text).toMatch(/compute|frontier/);
  });

  it("clarifies the compute/frontier undercount applies to any non-disclosing developer worldwide, not only Chinese labs", () => {
    const text = frontierEn.countryAttributionNote.toLowerCase();
    expect(text).toMatch(/not specific to chinese|worldwide/);
    expect(text).toMatch(/any.*non.disclos|any.*developer|worldwide/);
  });

  it("uses a specific example framing rather than asserting ALL Chinese labs are understated", () => {
    const text = frontierEn.countryAttributionNote.toLowerCase();
    expect(text, "must use an example framing (e.g. 'for example')").toMatch(/for example|such as/);
    expect(text, "must NOT assert all Chinese labs are understated").not.toMatch(/all chinese labs|chinese labs do not/);
  });

  it("does not equate the default recent-release metric with compute/frontier undercount — notes devs DO appear in recent/open-weights views", () => {
    const text = frontierEn.countryAttributionNote.toLowerCase();
    // The note must say they appear in recent-release and weights-available views (default metric is fine)
    expect(text).toMatch(/recent.release|weights.available|open.weight.*view/);
    // But they do not appear in compute-known or frontier
    expect(text).toMatch(/not.*in compute|not.*compute.known|not.*frontier.*ranking/);
  });

  it("has no unresolved {placeholder} tokens", () => {
    expect(frontierEn.countryAttributionNote).not.toMatch(/\{[a-zA-Z]+\}/);
  });
});

describe("copy guardrails — countryAttributionNote: Chinese open-weight caution (ZH)", () => {
  it("mentions that Chinese open-weight developers may be understated in compute/frontier views", () => {
    const text = frontierZh.countryAttributionNote;
    expect(text.length, "ZH countryAttributionNote must be non-empty").toBeGreaterThan(0);
    // 中国 = Chinese; 开放权重 = open weights; 算力 = compute; 前沿 = frontier
    expect(text).toMatch(/中国.*开放.*权重|开放.*权重.*中国/);
    expect(text).toMatch(/算力|前沿/);
  });

  it("clarifies the undercount applies to non-disclosing developers worldwide, not only Chinese labs", () => {
    const text = frontierZh.countryAttributionNote;
    // 并非中国实验室所特有 = "not specific to Chinese labs"; 全球 = worldwide
    expect(text).toMatch(/并非.*中国.*特有|全球.*任何|不.*仅限.*中国/);
  });

  it("uses a specific example framing (举例/若某), not a blanket assertion about all Chinese labs", () => {
    const text = frontierZh.countryAttributionNote;
    expect(text, "must use example framing").toMatch(/举例|若某|例如/);
    expect(text, "must NOT assert all Chinese labs are understated").not.toMatch(/所有中国.*实验室/);
  });

  it("does not equate the default metric with compute/frontier undercount — notes they DO appear in recent/open-weights views", () => {
    const text = frontierZh.countryAttributionNote;
    // 近期发布 = recent releases; 权重可用 = weights-available (default metric is fine)
    expect(text).toMatch(/近期发布|权重可用/);
    // 不会出现 = will not appear; 算力 = compute; 前沿排名 = frontier rankings
    expect(text).toMatch(/不会出现.*算力|不.*前沿排名/);
  });

  it("has no unresolved {placeholder} tokens", () => {
    expect(frontierZh.countryAttributionNote).not.toMatch(/\{[a-zA-Z]+\}/);
  });
});

// ── Rai YELLOW advisories: mixAccessCaveat semantics ─────────────────────────

describe("copy guardrails — mixAccessCaveat: weights ≠ permissive open source (EN + ZH)", () => {
  it("EN mixAccessCaveat exists and states weights-available includes restricted/non-commercial releases", () => {
    const text = frontierEn.mixAccessCaveat.toLowerCase();
    expect(text.length, "EN mixAccessCaveat must be non-empty").toBeGreaterThan(0);
    expect(text).toMatch(/restricted|non.commercial/);
  });

  it("EN mixAccessCaveat states that availability of weights does not imply permissive open-source licensing", () => {
    const text = frontierEn.mixAccessCaveat.toLowerCase();
    expect(text).toMatch(/not imply|does not imply/);
    expect(text).toMatch(/permissive|open.source/);
  });

  it("ZH mixAccessCaveat exists and states weights include restricted/non-commercial releases", () => {
    const text = frontierZh.mixAccessCaveat;
    expect(text.length, "ZH mixAccessCaveat must be non-empty").toBeGreaterThan(0);
    // 受限使用 = restricted use; 非商业 = non-commercial
    expect(text).toMatch(/受限使用|非商业/);
  });

  it("ZH mixAccessCaveat states that weights availability does not imply permissive open-source licensing", () => {
    const text = frontierZh.mixAccessCaveat;
    // 不代表采用宽松的开源许可 = "does not imply permissive open-source licensing"
    expect(text).toMatch(/不代表.*开源|宽松.*开源|宽松.*许可/);
  });

  it("EN mixAccessCaveat has no unresolved {placeholder} tokens", () => {
    expect(frontierEn.mixAccessCaveat).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("ZH mixAccessCaveat has no unresolved {placeholder} tokens", () => {
    expect(frontierZh.mixAccessCaveat).not.toMatch(/\{[a-zA-Z]+\}/);
  });
});

// ── Rai YELLOW advisories: countryDefaultSortDefinition / multiCountryAttributionDefinition ──

describe("copy guardrails — countryDefaultSortDefinition and multiCountryAttributionDefinition (EN + ZH)", () => {
  it("EN and ZH countryDefaultSortDefinition and multiCountryAttributionDefinition have key parity", () => {
    expect("countryDefaultSortDefinition" in frontierEn, "EN must have countryDefaultSortDefinition").toBe(true);
    expect("countryDefaultSortDefinition" in frontierZh, "ZH must have countryDefaultSortDefinition").toBe(true);
    expect("multiCountryAttributionDefinition" in frontierEn, "EN must have multiCountryAttributionDefinition").toBe(true);
    expect("multiCountryAttributionDefinition" in frontierZh, "ZH must have multiCountryAttributionDefinition").toBe(true);
  });

  it("EN countryDefaultSortDefinition explains recent tracked releases as the default sort", () => {
    const text = frontierEn.countryDefaultSortDefinition.toLowerCase();
    expect(text.length, "EN countryDefaultSortDefinition must be non-empty").toBeGreaterThan(0);
    expect(text).toMatch(/recent/);
    expect(text).toMatch(/sort|default/);
  });

  it("EN countryDefaultSortDefinition warns compute/frontier columns must not be used as general national AI ranking", () => {
    const text = frontierEn.countryDefaultSortDefinition.toLowerCase();
    expect(text).toMatch(/compute|frontier/);
    expect(text).toMatch(/must not|not.*used as.*general|not.*general ranking/);
  });

  it("EN multiCountryAttributionDefinition explains models are credited once to each affiliated country", () => {
    const text = frontierEn.multiCountryAttributionDefinition.toLowerCase();
    expect(text.length, "EN multiCountryAttributionDefinition must be non-empty").toBeGreaterThan(0);
    expect(text).toMatch(/credited.*each|each.*countr|credited once/);
  });

  it("EN multiCountryAttributionDefinition states summed country counts can exceed the total number of unique models", () => {
    const text = frontierEn.multiCountryAttributionDefinition.toLowerCase();
    expect(text).toMatch(/exceed/);
    expect(text).toMatch(/unique.*model|total.*model/);
  });

  it("ZH countryDefaultSortDefinition exists and explains recent releases as default sort", () => {
    const text = frontierZh.countryDefaultSortDefinition;
    expect(text.length, "ZH countryDefaultSortDefinition must be non-empty").toBeGreaterThan(0);
    // 排序 = sorted; 近三年 / 近期 = recent / past 3 years
    expect(text).toMatch(/排序|近.*年/);
  });

  it("ZH countryDefaultSortDefinition warns compute/frontier must not be used as a general national AI ranking", () => {
    const text = frontierZh.countryDefaultSortDefinition;
    // 算力 = compute; 前沿 = frontier; 不得将其解读 = must not be interpreted; 综合排名 = general ranking
    expect(text).toMatch(/算力|前沿/);
    expect(text).toMatch(/不得|综合排名/);
  });

  it("ZH multiCountryAttributionDefinition exists and explains multi-country attribution with summed-count caveat", () => {
    const text = frontierZh.multiCountryAttributionDefinition;
    expect(text.length, "ZH multiCountryAttributionDefinition must be non-empty").toBeGreaterThan(0);
    // 超过 = exceed; 每个.*国家 = each country; 计数 = counts
    expect(text).toMatch(/超过/);
    expect(text).toMatch(/每个.*国家|各国.*计数|计数.*超过/);
  });

  it("EN countryDefaultSortDefinition has no unresolved {placeholder} tokens", () => {
    expect(frontierEn.countryDefaultSortDefinition).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("ZH countryDefaultSortDefinition has no unresolved {placeholder} tokens", () => {
    expect(frontierZh.countryDefaultSortDefinition).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("EN multiCountryAttributionDefinition has no unresolved {placeholder} tokens", () => {
    expect(frontierEn.multiCountryAttributionDefinition).not.toMatch(/\{[a-zA-Z]+\}/);
  });

  it("ZH multiCountryAttributionDefinition has no unresolved {placeholder} tokens", () => {
    expect(frontierZh.multiCountryAttributionDefinition).not.toMatch(/\{[a-zA-Z]+\}/);
  });
});

// ── getCountryOriginShares() — treemap origin-set projection ────────────────────
//
// getCountryOriginShares() backs components/frontier/FrontierOriginsTreemap.tsx
// ("Where Tracked Models Are Developed" share/concentration treemap). It projects
// aggregates.countryLeaderboard into every country with a real geographic identity
// (Singapore + Hong Kong INCLUDED — they were only dropped from the world map for
// lacking polygons) and EXCLUDES the non-geographic "Multinational" aggregate. It
// exposes ONLY the fair full-catalog metrics (recentCount, modelCount,
// openWeightsCount); compute/frontier fields are structurally absent so a
// compute/capability ranking is unrenderable (PR #129 / #130 guardrail).

describe("getCountryOriginShares() — treemap origin projection", () => {
  it("returns 34 origins (35-country leaderboard minus the Multinational aggregate)", () => {
    const origins = getCountryOriginShares();
    expect(
      origins.length,
      "origin set must be full leaderboard minus the one non-geographic aggregate",
    ).toBe(getCountryLeaderboard().length - 1);
    expect(origins.length, "confirmed 34 attributed origin countries").toBe(34);
  });

  it("EXCLUDES the non-geographic 'Multinational' aggregate label", () => {
    const origins = getCountryOriginShares();
    expect(
      origins.some((e) => e.country === "Multinational"),
      "Multinational must NOT appear as a treemap tile",
    ).toBe(false);
    expect(origins.some((e) => e.countryShort === "Multinational")).toBe(false);
  });

  it("INCLUDES Singapore and Hong Kong (map-excluded before; a treemap needs no polygon)", () => {
    const origins = getCountryOriginShares();
    const present = (needle: string) =>
      origins.some(
        (e) => e.country.includes(needle) || e.countryShort.includes(needle),
      );
    expect(present("Singapore"), "Singapore must be present in the origin set").toBe(true);
    expect(present("Hong Kong"), "Hong Kong must be present in the origin set").toBe(true);
  });

  it("REGRESSION GUARD: every entry exposes ONLY the fair field set (no compute/frontier leakage)", () => {
    const FAIR_KEYS = [
      "country",
      "countryShort",
      "iso3",
      "recentCount",
      "modelCount",
      "openWeightsCount",
    ].sort();
    // Fields that must NEVER appear — they would enable a compute/capability
    // ranking the redesign deliberately makes structurally unrenderable.
    const FORBIDDEN_KEYS = [
      "computeKnownCount",
      "frontierCount",
      "maxComputeFlop",
    ];
    const origins = getCountryOriginShares();
    expect(origins.length).toBeGreaterThan(0);
    for (const entry of origins) {
      expect(
        Object.keys(entry).sort(),
        `entry '${entry.country}' must expose EXACTLY the fair key set`,
      ).toEqual(FAIR_KEYS);
      for (const forbidden of FORBIDDEN_KEYS) {
        expect(
          Object.prototype.hasOwnProperty.call(entry, forbidden),
          `entry '${entry.country}' must NOT leak compute/frontier field '${forbidden}'`,
        ).toBe(false);
      }
    }
  });

  it("exposes the three fair metrics as finite non-negative numbers", () => {
    for (const entry of getCountryOriginShares()) {
      for (const key of ["recentCount", "modelCount", "openWeightsCount"] as const) {
        expect(Number.isFinite(entry[key]), `${entry.country}.${key} finite`).toBe(true);
        expect(entry[key], `${entry.country}.${key} non-negative`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("is ordered deterministically: recentCount desc → modelCount desc → countryShort asc", () => {
    const origins = getCountryOriginShares();
    for (let i = 1; i < origins.length; i++) {
      const prev = origins[i - 1];
      const cur = origins[i];
      const inOrder =
        prev.recentCount > cur.recentCount ||
        (prev.recentCount === cur.recentCount &&
          (prev.modelCount > cur.modelCount ||
            (prev.modelCount === cur.modelCount &&
              prev.countryShort.localeCompare(cur.countryShort) <= 0)));
      expect(
        inOrder,
        `origins must be sorted recentCount↓ modelCount↓ countryShort↑ at index ${i} (${prev.countryShort} → ${cur.countryShort})`,
      ).toBe(true);
    }
  });

  it("is deterministic — two calls return equal projections", () => {
    expect(getCountryOriginShares()).toEqual(getCountryOriginShares());
  });
});

// ── i18n parity — new AI-Frontier origins / envelope / sparkline keys ───────────

describe("i18n parity — frontier origins/envelope/sparkline keys (EN ⇔ ZH)", () => {
  // The map* choropleth keys were removed/renamed when "Where Tracked Models Are
  // Developed" was redesigned from a world map into a share/concentration treemap
  // (5 map* keys removed, 8 renamed → origins*, 3 new origins* with no map*
  // predecessor). This list is the treemap's 12 origins* keys plus the unchanged
  // compute-envelope + hero-sparkline keys.
  const NEW_FRONTIER_KEYS = [
    "originsSectionTitle",
    "originsSectionSubhead",
    "originsMetricSelectorLabel",
    "originsTooltipRecords",
    "originsTooltipShare",
    "originsTableCaption",
    "originsTableColCountry",
    "originsTableColRecords",
    "originsTableColShare",
    "originsCoverageNote",
    "originsEmpty",
    "originsSrSummary",
    "envelopeLabel",
    "envelopeDefinition",
    "envelopeSrSummary",
    "statSparklineSrHint",
  ] as const;

  it("all 16 new keys are present in the EN frontier namespace", () => {
    for (const key of NEW_FRONTIER_KEYS) {
      expect(
        Object.prototype.hasOwnProperty.call(frontierEn, key),
        `EN frontier must define '${key}'`,
      ).toBe(true);
    }
  });

  it("all 16 new keys are present in the ZH frontier namespace", () => {
    for (const key of NEW_FRONTIER_KEYS) {
      expect(
        Object.prototype.hasOwnProperty.call(frontierZh, key),
        `ZH frontier must define '${key}'`,
      ).toBe(true);
    }
  });

  it("EN and ZH have IDENTICAL key sets (full namespace parity)", () => {
    const enKeys = Object.keys(frontierEn).sort();
    const zhKeys = Object.keys(frontierZh).sort();
    expect(zhKeys).toEqual(enKeys);
  });

  it("no EN frontier value is empty or whitespace-only", () => {
    for (const [key, value] of Object.entries(frontierEn)) {
      expect(typeof value, `EN '${key}' must be a string`).toBe("string");
      expect(
        (value as string).trim().length,
        `EN '${key}' must be non-empty`,
      ).toBeGreaterThan(0);
    }
  });

  it("no ZH frontier value is empty or whitespace-only", () => {
    for (const [key, value] of Object.entries(frontierZh)) {
      expect(typeof value, `ZH '${key}' must be a string`).toBe("string");
      expect(
        (value as string).trim().length,
        `ZH '${key}' must be non-empty`,
      ).toBeGreaterThan(0);
    }
  });

  it("originsCoverageNote (EN & ZH) carries the {countries} interpolation token", () => {
    expect(
      frontierEn.originsCoverageNote,
      "EN originsCoverageNote must contain {countries}",
    ).toContain("{countries}");
    expect(
      frontierZh.originsCoverageNote,
      "ZH originsCoverageNote must contain {countries}",
    ).toContain("{countries}");
  });

  it("originsCoverageNote does NOT carry the removed map* {mapped}/{total}/{unmapped} tokens", () => {
    for (const token of ["{mapped}", "{total}", "{unmapped}"]) {
      expect(
        frontierEn.originsCoverageNote,
        `EN originsCoverageNote must NOT contain the removed ${token} token`,
      ).not.toContain(token);
      expect(
        frontierZh.originsCoverageNote,
        `ZH originsCoverageNote must NOT contain the removed ${token} token`,
      ).not.toContain(token);
    }
  });

  it("all 5 removed map* keys are gone from EN and ZH (choropleth → treemap migration)", () => {
    const REMOVED_MAP_KEYS = [
      "mapLegendLabel",
      "mapLegendLow",
      "mapLegendHigh",
      "mapCoverageNote",
      "mapLoading",
    ];
    // The 8 renamed keys must also no longer exist under their old map* names.
    const RENAMED_AWAY_MAP_KEYS = [
      "mapSectionTitle",
      "mapSectionSubhead",
      "mapMetricSelectorLabel",
      "mapTooltipLabel",
      "mapTableCaption",
      "mapTableColRegion",
      "mapTableColCount",
      "mapEmpty",
    ];
    for (const key of [...REMOVED_MAP_KEYS, ...RENAMED_AWAY_MAP_KEYS]) {
      expect(
        Object.prototype.hasOwnProperty.call(frontierEn, key),
        `EN frontier must no longer define removed map* key '${key}'`,
      ).toBe(false);
      expect(
        Object.prototype.hasOwnProperty.call(frontierZh, key),
        `ZH frontier must no longer define removed map* key '${key}'`,
      ).toBe(false);
    }
  });
});
