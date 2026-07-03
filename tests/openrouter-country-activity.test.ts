import { describe, expect, it } from "vitest";
import {
  getOpenRouterCountryActivityData,
  type OpenRouterCountryActivityCountry,
} from "@/lib/openrouter-country-activity";
import { resolveOpenRouterProviderGeography } from "@/lib/openrouter-provider-geography";

function countryByIso3(iso3: string): OpenRouterCountryActivityCountry {
  const country = getOpenRouterCountryActivityData().countries.find(
    (entry) => entry.iso3 === iso3,
  );
  expect(country, `${iso3} should be present`).toBeTruthy();
  return country as OpenRouterCountryActivityCountry;
}

describe("OpenRouter country activity helpers", () => {
  it("returns finite non-negative counts for every country", () => {
    const data = getOpenRouterCountryActivityData();
    expect(data.countries.length).toBeGreaterThan(0);

    for (const country of data.countries) {
      for (const field of [
        "modelCount",
        "endpointCount",
        "modelProviderCount",
        "endpointProviderCount",
        "recentModelCount",
      ] as const) {
        expect(Number.isInteger(country[field]), `${country.iso3}.${field}`).toBe(true);
        expect(country[field], `${country.iso3}.${field}`).toBeGreaterThanOrEqual(0);
      }
      expect(["high", "medium", "low"]).toContain(country.mappingConfidence);
      expect(Array.isArray(country.topFamilies)).toBe(true);
    }
  });

  it("reconciles mapped and unknown model and endpoint counts to source totals", () => {
    const data = getOpenRouterCountryActivityData();
    const mappedModelCount = data.countries.reduce(
      (total, country) => total + country.modelCount,
      0,
    );
    const mappedEndpointCount = data.countries.reduce(
      (total, country) => total + country.endpointCount,
      0,
    );
    const unknownModelCount = data.unknownProviders.reduce(
      (total, provider) => total + provider.modelCount,
      0,
    );
    const unknownEndpointCount = data.unknownProviders.reduce(
      (total, provider) => total + provider.endpointCount,
      0,
    );

    expect(mappedModelCount).toBe(data.summary.mappedModelCount);
    expect(unknownModelCount).toBe(data.summary.unknownModelCount);
    expect(mappedEndpointCount).toBe(data.summary.mappedEndpointCount);
    expect(unknownEndpointCount).toBe(data.summary.unknownEndpointCount);
    expect(mappedModelCount + unknownModelCount).toBe(data.summary.sourceModelCount);
    expect(mappedEndpointCount + unknownEndpointCount).toBe(
      data.summary.sourceEndpointCount,
    );
  });

  it("maps known model publishers to expected country proxies", () => {
    expect(
      resolveOpenRouterProviderGeography(
        { slug: "openai", name: "OpenAI" },
        "modelPublisher",
      ),
    ).toMatchObject({ status: "mapped", geography: { iso3: "USA" } });
    expect(
      resolveOpenRouterProviderGeography(
        { slug: "anthropic", name: "Anthropic" },
        "modelPublisher",
      ),
    ).toMatchObject({ status: "mapped", geography: { iso3: "USA" } });
    expect(
      resolveOpenRouterProviderGeography(
        { slug: "deepseek", name: "DeepSeek" },
        "modelPublisher",
      ),
    ).toMatchObject({ status: "mapped", geography: { iso3: "CHN" } });
    expect(
      resolveOpenRouterProviderGeography({ slug: "qwen", name: "Qwen" }, "modelPublisher"),
    ).toMatchObject({ status: "mapped", geography: { iso3: "CHN" } });
    expect(
      resolveOpenRouterProviderGeography(
        { slug: "mistralai", name: "Mistral" },
        "modelPublisher",
      ),
    ).toMatchObject({ status: "mapped", geography: { iso3: "FRA" } });

    expect(countryByIso3("USA").modelCount).toBeGreaterThan(0);
    expect(countryByIso3("CHN").modelCount).toBeGreaterThan(0);
    expect(countryByIso3("FRA").modelCount).toBeGreaterThan(0);
  });

  it("surfaces unknown and ambiguous providers instead of redistributing them", () => {
    const data = getOpenRouterCountryActivityData();
    expect(data.unknownProviders.length).toBeGreaterThan(0);
    expect(
      data.unknownProviders.some(
        (provider) => provider.lens === "modelPublisher" && provider.modelCount > 0,
      ),
    ).toBe(true);
    expect(
      data.unknownProviders.some(
        (provider) => provider.lens === "endpointProvider" && provider.endpointCount > 0,
      ),
    ).toBe(true);
    expect(data.summary.unknownProviderCount).toBe(data.unknownProviders.length);
  });

  it("does not expose wording or fields that imply request volume", () => {
    const data = getOpenRouterCountryActivityData();
    const text = [...data.methodology, ...data.caveats].join(" ").toLowerCase();

    expect(text).not.toMatch(/\btraffic\b/);
    expect(text).not.toMatch(/\busage\b/);
    expect(text).not.toMatch(/\brequests?\b/);
    expect(data.countries.some((country) => "activityScore" in country)).toBe(false);
  });
});
