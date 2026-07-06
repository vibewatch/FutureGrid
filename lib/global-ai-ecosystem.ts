import { getCountryMapData } from "@/lib/data";
import {
  getOpenRouterCountryActivityData,
  type OpenRouterCountryActivityCountry,
  type OpenRouterCountryActivityData,
} from "@/lib/openrouter-country-activity";
import {
  getReadinessGapData,
  type ReadinessGapCountry,
  type ReadinessGapData,
  type ReadinessGapQuadrant,
} from "@/lib/readiness-gap";

export type GlobalAIEcosystemQuadrant =
  | ReadinessGapQuadrant
  | "catalog-without-readiness"
  | "readiness-without-catalog";

export interface GlobalAIEcosystemRow {
  iso3: string;
  countryName: string;
  region: string;
  modelCount: number;
  endpointCount: number;
  modelProviderCount: number;
  endpointProviderCount: number;
  diffusionPct: number | null;
  readinessScore: number | null;
  readinessGap: number | null;
  quadrant: GlobalAIEcosystemQuadrant;
  proxyCaveat: string;
}

export interface GlobalAIEcosystemData {
  rows: GlobalAIEcosystemRow[];
  regions: string[];
  quadrants: GlobalAIEcosystemQuadrant[];
  summary: {
    comparedCountries: number;
    countriesWithCatalog: number;
    countriesWithReadiness: number;
    countriesWithBoth: number;
  };
}

export interface GlobalAIEcosystemInputs {
  openRouterCountryActivity?: OpenRouterCountryActivityData;
  readinessGap?: ReadinessGapData;
}

export function getGlobalAIEcosystemData(
  inputs: GlobalAIEcosystemInputs = {},
): GlobalAIEcosystemData {
  const openRouter = inputs.openRouterCountryActivity ?? getOpenRouterCountryActivityData();
  const readinessGap = inputs.readinessGap ?? getReadinessGapData();
  const countryMap = getCountryMapData();
  const readinessByIso = new Map(readinessGap.countries.map((country) => [country.iso3, country]));
  const catalogByIso = new Map(openRouter.countries.map((country) => [country.iso3, country]));
  const countryNames = new Map(countryMap.map((country) => [country.iso3, country.name]));
  const isoCodes = new Set([
    ...openRouter.countries.map((country) => country.iso3),
    ...readinessGap.countries.map((country) => country.iso3),
  ]);

  const rows = [...isoCodes]
    .map((iso3) => toRow(iso3, catalogByIso.get(iso3), readinessByIso.get(iso3), countryNames.get(iso3)))
    .sort(compareRows);
  const regions = [...new Set(rows.map((row) => row.region))].sort((a, b) => a.localeCompare(b));
  const quadrants = [...new Set(rows.map((row) => row.quadrant))].sort((a, b) => a.localeCompare(b));

  return {
    rows,
    regions,
    quadrants,
    summary: {
      comparedCountries: rows.length,
      countriesWithCatalog: rows.filter((row) => row.modelCount > 0 || row.endpointCount > 0).length,
      countriesWithReadiness: rows.filter((row) => row.readinessScore != null).length,
      countriesWithBoth: rows.filter(
        (row) => (row.modelCount > 0 || row.endpointCount > 0) && row.readinessScore != null,
      ).length,
    },
  };
}

function toRow(
  iso3: string,
  catalog: OpenRouterCountryActivityCountry | undefined,
  readiness: ReadinessGapCountry | undefined,
  fallbackName: string | undefined,
): GlobalAIEcosystemRow {
  const hasCatalog = Boolean(catalog && (catalog.modelCount > 0 || catalog.endpointCount > 0));
  return {
    iso3,
    countryName: readiness?.name ?? catalog?.countryName ?? fallbackName ?? iso3,
    region: catalog?.region ?? "Other",
    modelCount: catalog?.modelCount ?? 0,
    endpointCount: catalog?.endpointCount ?? 0,
    modelProviderCount: catalog?.modelProviderCount ?? 0,
    endpointProviderCount: catalog?.endpointProviderCount ?? 0,
    diffusionPct: readiness?.diffusionPct ?? null,
    readinessScore: readiness?.readinessScore ?? null,
    readinessGap: readiness?.gap ?? null,
    quadrant: readiness?.quadrant ?? (hasCatalog ? "catalog-without-readiness" : "readiness-without-catalog"),
    proxyCaveat: hasCatalog
      ? "OpenRouter catalog footprint is a provider-identity proxy, not usage or deployment geography."
      : "No mapped OpenRouter catalog footprint; readiness/adoption metrics may still exist.",
  };
}

function compareRows(a: GlobalAIEcosystemRow, b: GlobalAIEcosystemRow): number {
  return (
    b.modelCount - a.modelCount ||
    (b.readinessScore ?? -1) - (a.readinessScore ?? -1) ||
    a.countryName.localeCompare(b.countryName)
  );
}
