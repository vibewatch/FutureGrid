import { describe, expect, it } from "vitest";
import {
  getAICompanyStocksData,
  type AICompanyStocksData,
} from "@/lib/ai-company-stocks";
import { getAIPressureSynthesisData } from "@/lib/ai-pressure-synthesis";
import { DEEP_LINK_HREFS, SECTION_IDS } from "@/lib/section-anchors";

describe("getAIPressureSynthesisData", () => {
  it("builds compact cross-dataset props from existing loaders", () => {
    const data = getAIPressureSynthesisData();

    expect(data.global.href).toBe(DEEP_LINK_HREFS.globalOpenRouterCountryModelFootprint);
    expect(data.global.modelCount).toBeGreaterThan(200);
    expect(data.global.endpointProviderCount).toBeGreaterThan(10);
    expect(data.global.rankableCountries).toBeGreaterThan(100);
    expect(data.global.freshness.asOf).toMatch(/2026|metrics through/);
    expect(data.global.freshness.source).toMatch(/OpenRouter|metrics/);
    expect(data.global.topReadinessGapCountry?.name).toEqual(expect.any(String));
    expect(Number.isFinite(data.global.topReadinessGapCountry?.gap)).toBe(true);

    expect(data.talent.href).toBe(DEEP_LINK_HREFS.visaTalentBottleneckLens);
    expect(data.talent.occupationsTracked).toBeGreaterThan(700);
    expect(data.talent.latestH1bFiscalYear).toBeGreaterThanOrEqual(2020);
    expect(data.talent.freshness.asOf).toMatch(/FY2025|2025/);
    expect(data.talent.freshness.source).toMatch(/DOL OFLC|job postings/i);
    expect(data.talent.topOccupation).toMatchObject({
      socCode: expect.stringMatching(/^\d{2}-\d{4}$/),
      title: expect.any(String),
    });
    expect(data.talent.topOccupation?.score).toBeGreaterThan(0);
    expect(data.talent.topOccupation?.score).toBeLessThanOrEqual(100);

    expect(data.market.href).toBe("/analysis#market-ai-sensitivity");
    expect(data.market.stockHref).toBe("/analysis#ai-company-stock-signals");
    expect(data.market.sectorProxyCount).toBe(11);
    expect(data.market.companyCount).toBeGreaterThan(10);
    expect(data.market.positiveBreadth1Y).not.toBeNull();
    expect(data.market.freshness.asOf).toMatch(/2026-07/);
    expect(data.market.freshness.source).toMatch(/Yahoo Finance|stock/i);
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
    expect(SECTION_IDS.readinessGapLens).toBe("readiness-gap-lens");
    expect(SECTION_IDS.talentBottleneckLens).toBe("talent-bottleneck-lens");
    expect(DEEP_LINK_HREFS.globalOpenRouterCountryModelFootprint).toBe(
      "/global#openrouter-country-model-footprint",
    );
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
