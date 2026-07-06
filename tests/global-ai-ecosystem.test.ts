import { describe, expect, it } from "vitest";
import {
  getGlobalAIEcosystemData,
  type GlobalAIEcosystemData,
} from "@/lib/global-ai-ecosystem";
import type { OpenRouterCountryActivityData } from "@/lib/openrouter-country-activity";
import type { ReadinessGapData } from "@/lib/readiness-gap";

const OPENROUTER_FIXTURE: OpenRouterCountryActivityData = {
  source: {
    name: "OpenRouter models API",
    publisher: "OpenRouter",
    url: "https://openrouter.ai/models",
    catalogPath: "data/openrouter-models.json",
    version: "fixture",
  },
  summary: {
    generatedAt: "2026-07-03T00:00:00.000Z",
    asOf: "2026-07-03",
    catalogPath: "data/openrouter-models.json",
    sourceModelCount: 9,
    sourceEndpointCount: 13,
    mappedModelCount: 9,
    unknownModelCount: 0,
    mappedEndpointCount: 13,
    unknownEndpointCount: 0,
    countryCount: 2,
    modelProviderCount: 3,
    endpointProviderCount: 4,
    mappedModelProviderCount: 3,
    mappedEndpointProviderCount: 4,
    unknownModelProviderCount: 0,
    unknownEndpointProviderCount: 0,
    unknownProviderCount: 0,
    recentModelCutoffDate: "2025-07-03",
    latestModelCreatedDate: "2026-06-20",
  },
  countries: [
    {
      iso3: "USA",
      countryName: "United States",
      region: "North America",
      modelCount: 7,
      endpointCount: 10,
      modelProviderCount: 2,
      endpointProviderCount: 3,
      recentModelCount: 4,
      latestModelCreatedDate: "2026-06-20",
      mappingConfidence: "high",
      topFamilies: [{ slug: "alpha", name: "Alpha", modelCount: 7 }],
    },
    {
      iso3: "FRA",
      countryName: "France",
      region: "Europe",
      modelCount: 2,
      endpointCount: 3,
      modelProviderCount: 1,
      endpointProviderCount: 1,
      recentModelCount: 1,
      latestModelCreatedDate: "2026-05-01",
      mappingConfidence: "high",
      topFamilies: [{ slug: "mistral", name: "Mistral", modelCount: 2 }],
    },
  ],
  unknownProviders: [],
  methodology: ["Fixture methodology."],
  caveats: ["Fixture is a public catalog/provider-country proxy."],
};

const READINESS_FIXTURE: ReadinessGapData = {
  countries: [
    {
      iso3: "USA",
      name: "United States",
      diffusionPct: 31.2,
      diffusionDelta: 2.1,
      aiReadiness: 0.86,
      readinessScore: 86,
      adoptionPercentile: 96,
      readinessPercentile: 94,
      gap: 2,
      quadrant: "balanced-leader",
    },
    {
      iso3: "JPN",
      name: "Japan",
      diffusionPct: 18.4,
      diffusionDelta: 1.4,
      aiReadiness: 0.78,
      readinessScore: 78,
      adoptionPercentile: 80,
      readinessPercentile: 88,
      gap: -8,
      quadrant: "latent-capacity",
    },
  ],
  adoptionOutpacingReadiness: [],
  latentCapacity: [
    {
      iso3: "JPN",
      name: "Japan",
      diffusionPct: 18.4,
      diffusionDelta: 1.4,
      aiReadiness: 0.78,
      readinessScore: 78,
      adoptionPercentile: 80,
      readinessPercentile: 88,
      gap: -8,
      quadrant: "latent-capacity",
    },
  ],
  balancedLeaders: [
    {
      iso3: "USA",
      name: "United States",
      diffusionPct: 31.2,
      diffusionDelta: 2.1,
      aiReadiness: 0.86,
      readinessScore: 86,
      adoptionPercentile: 96,
      readinessPercentile: 94,
      gap: 2,
      quadrant: "balanced-leader",
    },
  ],
  summary: {
    totalCountries: 3,
    rankableCountries: 2,
    coveragePct: 66.7,
    averageGap: -3,
    medianGap: -3,
    adoptionOutpacingReadinessCount: 0,
    latentCapacityCount: 1,
    balancedLeaderCount: 1,
    topAdoptionOutpacingReadiness: null,
    topLatentCapacity: { iso3: "JPN", name: "Japan", gap: -8 },
  },
  methodology: {
    inputs: ["Fixture diffusion input", "Fixture readiness input"],
    ranking: "Fixture percentile ranks.",
    scoring: "Fixture scores for helper testing.",
    quadrants: "Fixture quadrant labels.",
    exclusions: "No fixture exclusions.",
    caveats: ["Descriptive fixture only."],
  },
};

describe("getGlobalAIEcosystemData", () => {
  it("joins catalog footprint, readiness, diffusion, and gap quadrants by country", () => {
    const data = getGlobalAIEcosystemData({
      openRouterCountryActivity: OPENROUTER_FIXTURE,
      readinessGap: READINESS_FIXTURE,
    });

    expect(data.summary).toEqual({
      comparedCountries: 3,
      countriesWithCatalog: 2,
      countriesWithReadiness: 2,
      countriesWithBoth: 1,
    });
    expect(rowByIso(data, "USA")).toMatchObject({
      countryName: "United States",
      region: "North America",
      modelCount: 7,
      endpointCount: 10,
      diffusionPct: 31.2,
      readinessScore: 86,
      readinessGap: 2,
      quadrant: "balanced-leader",
    });
    expect(rowByIso(data, "FRA")).toMatchObject({
      countryName: "France",
      quadrant: "catalog-without-readiness",
      readinessScore: null,
    });
    expect(rowByIso(data, "JPN")).toMatchObject({
      countryName: "Japan",
      modelCount: 0,
      quadrant: "latent-capacity",
      proxyCaveat: expect.stringContaining("No mapped OpenRouter catalog footprint"),
    });
  });

  it("exposes filter facets from joined rows", () => {
    const data = getGlobalAIEcosystemData({
      openRouterCountryActivity: OPENROUTER_FIXTURE,
      readinessGap: READINESS_FIXTURE,
    });

    expect(data.regions).toEqual(["Europe", "North America", "Other"]);
    expect(data.quadrants).toEqual([
      "balanced-leader",
      "catalog-without-readiness",
      "latent-capacity",
    ]);
  });
});

function rowByIso(data: GlobalAIEcosystemData, iso3: string) {
  const row = data.rows.find((candidate) => candidate.iso3 === iso3);
  expect(row).toBeDefined();
  return row;
}
