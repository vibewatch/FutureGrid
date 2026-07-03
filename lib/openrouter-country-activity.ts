import openRouterCatalogJson from "@/data/openrouter-models.json";
import {
  type OpenRouterProviderLens,
  type OpenRouterProviderMappingConfidence,
  resolveOpenRouterProviderGeography,
  normalizeOpenRouterProviderKey,
} from "@/lib/openrouter-provider-geography";

export type {
  OpenRouterProviderLens,
  OpenRouterProviderMappingConfidence,
} from "@/lib/openrouter-provider-geography";

interface OpenRouterCatalog {
  meta: {
    generatedAt: string;
    asOf: string;
    source: {
      name: string;
      publisher: string;
      url: string;
    };
    version: string;
  };
  coverage: {
    modelCount: number;
    endpointDetails: {
      endpointCount: number;
      providerCount: number;
    };
  };
  models: OpenRouterModel[];
}

interface OpenRouterModel {
  id: string;
  provider: {
    slug: string | null;
    name: string | null;
  };
  family?: {
    slug: string | null;
    name: string | null;
  };
  createdDate?: string | null;
  endpoints?: {
    providers?: OpenRouterEndpointProvider[];
  };
}

interface OpenRouterEndpointProvider {
  name: string | null;
  endpointCount?: number | null;
}

interface FamilyAccumulator {
  slug: string;
  name: string;
  modelCount: number;
}

interface CountryAccumulator {
  iso3: string;
  countryName: string;
  region: string;
  modelCount: number;
  endpointCount: number;
  modelProviderKeys: Set<string>;
  endpointProviderKeys: Set<string>;
  recentModelCount: number;
  latestModelCreatedDate: string | null;
  familyCounts: Map<string, FamilyAccumulator>;
  confidenceRank: number;
}

interface UnknownProviderAccumulator {
  lens: OpenRouterProviderLens;
  status: "unknown" | "ambiguous";
  providerName: string;
  providerSlug: string | null;
  normalizedName: string;
  reason: string;
  modelCount: number;
  endpointCount: number;
}

export interface OpenRouterCountryTopFamily {
  slug: string;
  name: string;
  modelCount: number;
}

export interface OpenRouterCountryActivityCountry {
  iso3: string;
  countryName: string;
  region: string;
  modelCount: number;
  endpointCount: number;
  modelProviderCount: number;
  endpointProviderCount: number;
  recentModelCount: number;
  latestModelCreatedDate: string | null;
  topFamilies: OpenRouterCountryTopFamily[];
  mappingConfidence: OpenRouterProviderMappingConfidence;
}

export interface OpenRouterUnknownProvider {
  lens: OpenRouterProviderLens;
  status: "unknown" | "ambiguous";
  providerName: string;
  providerSlug: string | null;
  normalizedName: string;
  modelCount: number;
  endpointCount: number;
  reason: string;
}

export interface OpenRouterCountryActivitySummary {
  generatedAt: string;
  asOf: string;
  catalogPath: "data/openrouter-models.json";
  sourceModelCount: number;
  sourceEndpointCount: number;
  mappedModelCount: number;
  unknownModelCount: number;
  mappedEndpointCount: number;
  unknownEndpointCount: number;
  countryCount: number;
  modelProviderCount: number;
  endpointProviderCount: number;
  mappedModelProviderCount: number;
  mappedEndpointProviderCount: number;
  unknownModelProviderCount: number;
  unknownEndpointProviderCount: number;
  unknownProviderCount: number;
  recentModelCutoffDate: string;
  latestModelCreatedDate: string | null;
}

export interface OpenRouterCountryActivitySource {
  name: string;
  publisher: string;
  url: string;
  catalogPath: "data/openrouter-models.json";
  version: string;
}

export interface OpenRouterCountryActivityData {
  source: OpenRouterCountryActivitySource;
  summary: OpenRouterCountryActivitySummary;
  countries: OpenRouterCountryActivityCountry[];
  unknownProviders: OpenRouterUnknownProvider[];
  methodology: string[];
  caveats: string[];
}

const RECENT_MODEL_WINDOW_DAYS = 365;

const catalog = openRouterCatalogJson as unknown as OpenRouterCatalog;

function confidenceToRank(confidence: OpenRouterProviderMappingConfidence): number {
  return confidence === "high" ? 3 : confidence === "medium" ? 2 : 1;
}

function rankToConfidence(rank: number): OpenRouterProviderMappingConfidence {
  return rank >= 3 ? "high" : rank === 2 ? "medium" : "low";
}

function toEndpointCount(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 1;
  return Math.max(0, Math.trunc(value));
}

function toDateOnly(value: string | null | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function subtractDays(dateOnly: string, days: number): string {
  const [year, month, day] = dateOnly.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function createCountryAccumulator(
  iso3: string,
  countryName: string,
  region: string,
): CountryAccumulator {
  return {
    iso3,
    countryName,
    region,
    modelCount: 0,
    endpointCount: 0,
    modelProviderKeys: new Set(),
    endpointProviderKeys: new Set(),
    recentModelCount: 0,
    latestModelCreatedDate: null,
    familyCounts: new Map(),
    confidenceRank: 3,
  };
}

function unknownKey(
  lens: OpenRouterProviderLens,
  status: "unknown" | "ambiguous",
  normalizedName: string,
  providerSlug: string | null,
): string {
  return [lens, status, providerSlug ?? "", normalizedName].join("|");
}

function addUnknown(
  unknownProviders: Map<string, UnknownProviderAccumulator>,
  input: {
    lens: OpenRouterProviderLens;
    status: "unknown" | "ambiguous";
    providerName: string;
    providerSlug: string | null;
    normalizedName: string;
    reason: string;
    modelCount?: number;
    endpointCount?: number;
  },
): void {
  const key = unknownKey(
    input.lens,
    input.status,
    input.normalizedName,
    input.providerSlug,
  );
  const current =
    unknownProviders.get(key) ??
    {
      lens: input.lens,
      status: input.status,
      providerName: input.providerName,
      providerSlug: input.providerSlug,
      normalizedName: input.normalizedName,
      reason: input.reason,
      modelCount: 0,
      endpointCount: 0,
    };

  current.modelCount += input.modelCount ?? 0;
  current.endpointCount += input.endpointCount ?? 0;
  unknownProviders.set(key, current);
}

function sourceEndpointCount(models: OpenRouterModel[]): number {
  return models.reduce((total, model) => {
    return (
      total +
      (model.endpoints?.providers ?? []).reduce(
        (providerTotal, provider) =>
          providerTotal + toEndpointCount(provider.endpointCount),
        0,
      )
    );
  }, 0);
}

function topFamilies(familyCounts: Map<string, FamilyAccumulator>): OpenRouterCountryTopFamily[] {
  return [...familyCounts.values()]
    .sort((a, b) => b.modelCount - a.modelCount || a.name.localeCompare(b.name))
    .slice(0, 5);
}

export function getOpenRouterCountryActivityData(): OpenRouterCountryActivityData {
  const countries = new Map<string, CountryAccumulator>();
  const unknownProviders = new Map<string, UnknownProviderAccumulator>();
  const allModelProviderKeys = new Set<string>();
  const allEndpointProviderKeys = new Set<string>();
  const recentModelCutoffDate = subtractDays(
    catalog.meta.asOf || catalog.meta.generatedAt.slice(0, 10),
    RECENT_MODEL_WINDOW_DAYS,
  );
  let latestModelCreatedDate: string | null = null;

  for (const model of catalog.models) {
    const modelProviderKey = normalizeOpenRouterProviderKey(
      model.provider.slug ?? model.provider.name,
    );
    if (modelProviderKey) allModelProviderKeys.add(modelProviderKey);

    const modelCreatedDate = toDateOnly(model.createdDate);
    if (
      modelCreatedDate &&
      (!latestModelCreatedDate || modelCreatedDate > latestModelCreatedDate)
    ) {
      latestModelCreatedDate = modelCreatedDate;
    }

    const modelResolution = resolveOpenRouterProviderGeography(
      model.provider,
      "modelPublisher",
    );

    if (modelResolution.status === "mapped") {
      const { geography } = modelResolution;
      const country =
        countries.get(geography.iso3) ??
        createCountryAccumulator(
          geography.iso3,
          geography.countryName,
          geography.region,
        );
      const stableProviderKey = normalizeOpenRouterProviderKey(geography.providerName);
      country.modelCount += 1;
      country.modelProviderKeys.add(stableProviderKey);
      country.confidenceRank = Math.min(
        country.confidenceRank,
        confidenceToRank(geography.confidence),
      );
      if (modelCreatedDate && modelCreatedDate >= recentModelCutoffDate) {
        country.recentModelCount += 1;
      }
      if (
        modelCreatedDate &&
        (!country.latestModelCreatedDate || modelCreatedDate > country.latestModelCreatedDate)
      ) {
        country.latestModelCreatedDate = modelCreatedDate;
      }

      const familySlug = model.family?.slug?.trim() || "unknown";
      const familyName = model.family?.name?.trim() || "Unknown";
      const familyKey = normalizeOpenRouterProviderKey(familySlug || familyName);
      const family = country.familyCounts.get(familyKey) ?? {
        slug: familySlug,
        name: familyName,
        modelCount: 0,
      };
      family.modelCount += 1;
      country.familyCounts.set(familyKey, family);
      countries.set(country.iso3, country);
    } else {
      addUnknown(unknownProviders, {
        lens: modelResolution.lens,
        status: modelResolution.status,
        providerName: modelResolution.providerName,
        providerSlug: modelResolution.providerSlug,
        normalizedName: modelResolution.normalizedName,
        reason: modelResolution.reason,
        modelCount: 1,
      });
    }

    for (const provider of model.endpoints?.providers ?? []) {
      const providerName = provider.name?.trim() || "Unknown endpoint provider";
      const endpointProviderKey = normalizeOpenRouterProviderKey(providerName);
      const endpointCount = toEndpointCount(provider.endpointCount);
      if (endpointProviderKey) allEndpointProviderKeys.add(endpointProviderKey);

      const endpointResolution = resolveOpenRouterProviderGeography(
        { name: providerName },
        "endpointProvider",
      );

      if (endpointResolution.status === "mapped") {
        const { geography } = endpointResolution;
        const country =
          countries.get(geography.iso3) ??
          createCountryAccumulator(
            geography.iso3,
            geography.countryName,
            geography.region,
          );
        const stableProviderKey = normalizeOpenRouterProviderKey(geography.providerName);
        country.endpointCount += endpointCount;
        country.endpointProviderKeys.add(stableProviderKey);
        country.confidenceRank = Math.min(
          country.confidenceRank,
          confidenceToRank(geography.confidence),
        );
        countries.set(country.iso3, country);
      } else {
        addUnknown(unknownProviders, {
          lens: endpointResolution.lens,
          status: endpointResolution.status,
          providerName: endpointResolution.providerName,
          providerSlug: endpointResolution.providerSlug,
          normalizedName: endpointResolution.normalizedName,
          reason: endpointResolution.reason,
          endpointCount,
        });
      }
    }
  }

  const countryRows = [...countries.values()]
    .map((country) => ({
      iso3: country.iso3,
      countryName: country.countryName,
      region: country.region,
      modelCount: country.modelCount,
      endpointCount: country.endpointCount,
      modelProviderCount: country.modelProviderKeys.size,
      endpointProviderCount: country.endpointProviderKeys.size,
      recentModelCount: country.recentModelCount,
      latestModelCreatedDate: country.latestModelCreatedDate,
      topFamilies: topFamilies(country.familyCounts),
      mappingConfidence: rankToConfidence(country.confidenceRank),
    }))
    .sort(
      (a, b) =>
        b.modelCount - a.modelCount ||
        b.endpointCount - a.endpointCount ||
        a.countryName.localeCompare(b.countryName),
    );

  const unknownRows = [...unknownProviders.values()].sort(
    (a, b) =>
      a.lens.localeCompare(b.lens) ||
      b.modelCount - a.modelCount ||
      b.endpointCount - a.endpointCount ||
      a.providerName.localeCompare(b.providerName),
  );

  const mappedModelCount = countryRows.reduce(
    (total, country) => total + country.modelCount,
    0,
  );
  const mappedEndpointCount = countryRows.reduce(
    (total, country) => total + country.endpointCount,
    0,
  );
  const unknownModelCount = unknownRows.reduce(
    (total, provider) => total + provider.modelCount,
    0,
  );
  const unknownEndpointCount = unknownRows.reduce(
    (total, provider) => total + provider.endpointCount,
    0,
  );
  const unknownModelProviderCount = unknownRows.filter(
    (provider) => provider.lens === "modelPublisher",
  ).length;
  const unknownEndpointProviderCount = unknownRows.filter(
    (provider) => provider.lens === "endpointProvider",
  ).length;

  return {
    source: {
      ...catalog.meta.source,
      catalogPath: "data/openrouter-models.json",
      version: catalog.meta.version,
    },
    summary: {
      generatedAt: catalog.meta.generatedAt,
      asOf: catalog.meta.asOf,
      catalogPath: "data/openrouter-models.json",
      sourceModelCount: catalog.models.length,
      sourceEndpointCount: sourceEndpointCount(catalog.models),
      mappedModelCount,
      unknownModelCount,
      mappedEndpointCount,
      unknownEndpointCount,
      countryCount: countryRows.length,
      modelProviderCount: allModelProviderKeys.size,
      endpointProviderCount: allEndpointProviderKeys.size,
      mappedModelProviderCount: countryRows.reduce(
        (total, country) => total + country.modelProviderCount,
        0,
      ),
      mappedEndpointProviderCount: countryRows.reduce(
        (total, country) => total + country.endpointProviderCount,
        0,
      ),
      unknownModelProviderCount,
      unknownEndpointProviderCount,
      unknownProviderCount: unknownRows.length,
      recentModelCutoffDate,
      latestModelCreatedDate,
    },
    countries: countryRows,
    unknownProviders: unknownRows,
    methodology: [
      "Uses the generated OpenRouter public catalog snapshot at data/openrouter-models.json.",
      "The model publisher lens counts one listed model by model.provider slug/name.",
      "The endpoint provider lens sums model.endpoints.providers[].endpointCount by endpoint provider name.",
      `recentModelCount counts mapped publisher models created on or after ${recentModelCutoffDate}.`,
      "Unknown or ambiguous providers are kept in unknownProviders rather than allocated to countries.",
    ],
    caveats: [
      "This is a public catalog/provider-country proxy, not evidence of demand, sales, deployment geography, training location, or national AI capacity.",
      "Provider-country mappings use curated organization/provider identity proxies and can change as provider identities become clearer.",
      "modelCount and endpointCount are separate lenses and should not be summed into a single score.",
    ],
  };
}
