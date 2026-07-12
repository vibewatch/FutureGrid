import { describe, expect, it } from "vitest";
import {
  getAICompanyStocksData,
  type AICompanyStocksData,
} from "@/lib/ai-company-stocks";
import { getAIPressureSynthesisData } from "@/lib/ai-pressure-synthesis";
import { getDatasetProvenance, selectLatestAsOf } from "@/lib/provenance";
import { DEEP_LINK_HREFS, SECTION_IDS } from "@/lib/section-anchors";

describe("getAIPressureSynthesisData", () => {
  it("builds compact cross-dataset props from existing loaders", () => {
    const data = getAIPressureSynthesisData();

    expect(data.global.href).toBe(DEEP_LINK_HREFS.globalAIEcosystemMap);
    expect(data.global.modelCount).toBeGreaterThan(200);
    expect(data.global.endpointProviderCount).toBeGreaterThan(10);
    expect(data.global.rankableCountries).toBeGreaterThan(100);
    expect(data.global.topReadinessGapCountry?.name).toEqual(expect.any(String));
    expect(Number.isFinite(data.global.topReadinessGapCountry?.gap)).toBe(true);

    expect(data.talent.href).toBe(DEEP_LINK_HREFS.visaTalentBottleneckLens);
    expect(data.talent.occupationsTracked).toBeGreaterThan(700);
    expect(data.talent.latestH1bFiscalYear).toBeGreaterThanOrEqual(2020);
    expect(data.talent.topOccupation).toMatchObject({
      socCode: expect.stringMatching(/^\d{2}-\d{4}$/),
      title: expect.any(String),
    });
    expect(data.talent.topOccupation?.score).toBeGreaterThan(0);
    expect(data.talent.topOccupation?.score).toBeLessThanOrEqual(100);

    expect(data.market.href).toBe(DEEP_LINK_HREFS.analysisMarketAISensitivity);
    expect(data.market.stockHref).toBe(DEEP_LINK_HREFS.analysisAICompanyStockSignals);
    expect(data.market.sectorProxyCount).toBe(11);
    expect(data.market.companyCount).toBeGreaterThan(10);
    expect(data.market.positiveBreadth1Y).not.toBeNull();
    expect(data.market.positiveBreadth1Y ?? 0).toBeLessThanOrEqual(data.market.companyCount);
    expect(data.market.topSector?.ticker).toEqual(expect.any(String));
    expect(data.market.topSector?.score).toBeGreaterThan(0);
    expect(data.market.topSector?.score).toBeLessThanOrEqual(100);
  });

  it("carries explicit guardrail ids for descriptive interpretation", () => {
    expect(getAIPressureSynthesisData().guardrailIds).toEqual([
      "openrouterCatalogProxy",
      "h1bLcaFilings",
      "stockDescriptiveHistory",
      "jobPostingsProxy",
    ]);
  });

  it("keeps mined-data section anchors stable for cross-page CTAs", () => {
    expect(SECTION_IDS.openRouterCountryModelFootprint).toBe("openrouter-country-model-footprint");
    expect(SECTION_IDS.globalAIEcosystemMap).toBe("global-ai-ecosystem-map");
    expect(SECTION_IDS.readinessGapLens).toBe("readiness-gap-lens");
    expect(SECTION_IDS.talentBottleneckLens).toBe("talent-bottleneck-lens");
    expect(DEEP_LINK_HREFS.globalOpenRouterCountryModelFootprint).toBe(
      "/global#openrouter-country-model-footprint",
    );
    expect(DEEP_LINK_HREFS.globalAIEcosystemMap).toBe("/global#global-ai-ecosystem-map");
    expect(DEEP_LINK_HREFS.globalReadinessGapLens).toBe("/global#readiness-gap-lens");
    expect(DEEP_LINK_HREFS.visaTalentBottleneckLens).toBe("/visa#talent-bottleneck-lens");
  });

  it("recomputes positive 1Y breadth when summary exceeds company count", () => {
    const aiCompanyStocks = stockDataWithPositiveBreadthSummary(4);

    const data = getAIPressureSynthesisData({ aiCompanyStocks });

    expect(data.market.companyCount).toBe(3);
    expect(data.market.positiveBreadth1Y).toBe(2);
  });

  it.each([
    ["non-integer", 1.5],
    ["negative", -1],
  ])(
    "recomputes positive 1Y breadth when summary is %s",
    (_label, summaryPositive1Y) => {
      const aiCompanyStocks =
        stockDataWithPositiveBreadthSummary(summaryPositive1Y);

      const data = getAIPressureSynthesisData({ aiCompanyStocks });

      expect(data.market.companyCount).toBe(3);
      expect(data.market.positiveBreadth1Y).toBe(2);
    },
  );
});

describe("typed analysis section anchors", () => {
  it("exposes market-ai-sensitivity and ai-company-stock-signals as typed constants", () => {
    expect(SECTION_IDS.analysisMarketAISensitivity).toBe("market-ai-sensitivity");
    expect(SECTION_IDS.analysisAICompanyStockSignals).toBe("ai-company-stock-signals");
    expect(DEEP_LINK_HREFS.analysisMarketAISensitivity).toBe("/analysis#market-ai-sensitivity");
    expect(DEEP_LINK_HREFS.analysisAICompanyStockSignals).toBe("/analysis#ai-company-stock-signals");
  });

  it("market lane hrefs come from typed DEEP_LINK_HREFS, not hardcoded strings", () => {
    const data = getAIPressureSynthesisData();
    expect(data.market.href).toBe(DEEP_LINK_HREFS.analysisMarketAISensitivity);
    expect(data.market.stockHref).toBe(DEEP_LINK_HREFS.analysisAICompanyStockSignals);
  });
});

describe("lane provenance contracts", () => {
  it("global lane exposes registry-derived provenance for openrouter-models, country-exposure, global-ai-metrics", () => {
    const { global: g } = getAIPressureSynthesisData();

    expect(g.provenance.datasetIds).toEqual(["openrouter-models", "country-exposure", "global-ai-metrics"]);
    expect(g.provenance.latestAsOf).toBe(
      getDatasetProvenance("openrouter-models")?.asOf ?? null,
    );
    expect(g.provenance.sources).toHaveLength(3);
    for (const src of g.provenance.sources) {
      expect(typeof src.id).toBe("string");
      const entry = getDatasetProvenance(src.id);
      expect(src.asOf).toBe(entry?.asOf ?? null);
      expect(src.name).toBe(
        (() => {
          const raw = entry?.source ?? null;
          if (typeof raw === "string") return raw || null;
          if (raw && typeof raw === "object") return (raw as { name?: string }).name ?? null;
          return null;
        })(),
      );
    }
  });

  it("talent lane exposes registry-derived provenance for h1b-trends and job-postings", () => {
    const { talent } = getAIPressureSynthesisData();

    expect(talent.provenance.datasetIds).toEqual(["h1b-trends", "job-postings"]);
    expect(talent.provenance.sources).toHaveLength(2);

    const h1bSrc = talent.provenance.sources.find((s) => s.id === "h1b-trends");
    expect(h1bSrc?.asOf).toBe(getDatasetProvenance("h1b-trends")?.asOf ?? null);
    expect(h1bSrc?.name).toEqual(expect.any(String));

    const jpSrc = talent.provenance.sources.find((s) => s.id === "job-postings");
    expect(jpSrc?.asOf).toBe(getDatasetProvenance("job-postings")?.asOf ?? null);
  });

  it("market lane exposes registry-derived provenance for ai-company-stocks and market-ai-signals", () => {
    const { market } = getAIPressureSynthesisData();

    expect(market.provenance.datasetIds).toEqual(["ai-company-stocks", "market-ai-signals"]);
    expect(market.provenance.sources).toHaveLength(2);

    const stocksSrc = market.provenance.sources.find((s) => s.id === "ai-company-stocks");
    expect(stocksSrc?.asOf).toBe(getDatasetProvenance("ai-company-stocks")?.asOf ?? null);
    expect(stocksSrc?.name).toEqual(expect.any(String));

    const signalSrc = market.provenance.sources.find((s) => s.id === "market-ai-signals");
    expect(signalSrc?.asOf).toBe(getDatasetProvenance("market-ai-signals")?.asOf ?? null);
  });

  it("latestAsOf for global lane is the chronologically latest of its dataset asOf values", () => {
    const { global: g } = getAIPressureSynthesisData();
    const expected = selectLatestAsOf(g.provenance.sources.map((s) => s.asOf));
    expect(g.provenance.latestAsOf).toBe(expected);
  });

  it("latestAsOf for market lane is the chronologically latest of its dataset asOf values", () => {
    const { market } = getAIPressureSynthesisData();
    const expected = selectLatestAsOf(market.provenance.sources.map((s) => s.asOf));
    expect(market.provenance.latestAsOf).toBe(expected);
  });

  it("talent lane latestAsOf is 2025 (job-postings Dec 31) — FY2025 h1b-trends Sep 30 does not win", () => {
    // Validates that the calendar-aware comparator is used: FY2025 ends Sep 30
    // which is earlier than plain "2025" (Dec 31), so job-postings wins.
    const { talent } = getAIPressureSynthesisData();
    expect(talent.provenance.latestAsOf).toBe("2025");
  });

  it("unknown dataset IDs degrade gracefully to null asOf and null name", () => {
    // Verify that getDatasetProvenance returns undefined for an unknown id
    expect(getDatasetProvenance("__nonexistent_dataset__")).toBeUndefined();
    // The provenance builder must not throw and must null-safely handle missing entries
    const data = getAIPressureSynthesisData();
    // All sources in all lanes must have string ids and null-or-string values
    for (const lane of [data.global, data.talent, data.market]) {
      for (const src of lane.provenance.sources) {
        expect(typeof src.id).toBe("string");
        expect(src.asOf === null || typeof src.asOf === "string").toBe(true);
        expect(src.name === null || typeof src.name === "string").toBe(true);
      }
    }
  });

  it("provenance payload is serializable (JSON round-trip is lossless)", () => {
    const data = getAIPressureSynthesisData();
    const serialized = JSON.stringify(data);
    const parsed = JSON.parse(serialized) as typeof data;

    expect(parsed.global.provenance.datasetIds).toEqual(data.global.provenance.datasetIds);
    expect(parsed.talent.provenance.latestAsOf).toBe(data.talent.provenance.latestAsOf);
    expect(parsed.market.provenance.sources).toHaveLength(data.market.provenance.sources.length);
    // Ensure no undefined values leaked through (JSON.stringify drops undefined)
    expect(serialized).not.toContain('"asOf":undefined');
    expect(serialized).not.toContain('"name":undefined');
  });

  it("provenance sources are a fresh array independent of registry internals", () => {
    const d1 = getAIPressureSynthesisData();
    const d2 = getAIPressureSynthesisData();
    // Different call → different array instances
    expect(d1.global.provenance.sources).not.toBe(d2.global.provenance.sources);
    expect(d1.global.provenance.datasetIds).not.toBe(d2.global.provenance.datasetIds);
  });
});

function stockDataWithPositiveBreadthSummary(
  summaryPositive1Y: number,
): AICompanyStocksData {
  const base = getAICompanyStocksData();
  const companies = base.companies.slice(0, 3).map((company, index) => ({
    ...company,
    metrics: {
      ...company.metrics,
      returns: {
        ...company.metrics.returns,
        "1Y": index < 2 ? 0.1 : -0.1,
      },
    },
  }));

  return {
    ...base,
    companies,
    summary: {
      ...base.summary,
      companyCount: companies.length,
      breadth: {
        ...base.summary.breadth,
        positive1Y: summaryPositive1Y,
      },
    },
  };
}
