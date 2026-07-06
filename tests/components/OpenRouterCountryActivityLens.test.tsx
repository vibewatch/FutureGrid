// @vitest-environment jsdom

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentType } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { globalEn } from "@/lib/i18n/messages/en/global";
import { globalZh } from "@/lib/i18n/messages/zh/global";
import type { OpenRouterCountryActivityData } from "@/lib/openrouter-country-activity";
import { SECTION_IDS } from "@/lib/section-anchors";

const COMPONENT_PATH = path.join(process.cwd(), "components/global/OpenRouterCountryActivityLens.tsx");
const GLOBAL_PAGE_PATH = path.join(process.cwd(), "app/global/page.tsx");
const GLOBAL_VIEW_PATH = path.join(process.cwd(), "components/global/GlobalView.tsx");

const mockUseLanguage = vi.fn(() => ({
  locale: "en" as "en" | "zh",
  setLocale: vi.fn(),
}));

vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
}));

const FIXTURE_DATA: OpenRouterCountryActivityData = {
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
    sourceModelCount: 12,
    sourceEndpointCount: 21,
    mappedModelCount: 10,
    unknownModelCount: 2,
    mappedEndpointCount: 18,
    unknownEndpointCount: 3,
    countryCount: 3,
    modelProviderCount: 5,
    endpointProviderCount: 6,
    mappedModelProviderCount: 4,
    mappedEndpointProviderCount: 5,
    unknownModelProviderCount: 1,
    unknownEndpointProviderCount: 1,
    unknownProviderCount: 2,
    recentModelCutoffDate: "2025-07-03",
    latestModelCreatedDate: "2026-06-20",
  },
  countries: [
    {
      iso3: "USA",
      countryName: "United States",
      region: "North America",
      modelCount: 7,
      endpointCount: 11,
      modelProviderCount: 2,
      endpointProviderCount: 3,
      recentModelCount: 4,
      latestModelCreatedDate: "2026-06-20",
      mappingConfidence: "high",
      topFamilies: [
        { slug: "alpha", name: "Alpha", modelCount: 4 },
        { slug: "bravo", name: "Bravo", modelCount: 3 },
      ],
    },
    {
      iso3: "FRA",
      countryName: "France",
      region: "Europe",
      modelCount: 3,
      endpointCount: 5,
      modelProviderCount: 1,
      endpointProviderCount: 1,
      recentModelCount: 1,
      latestModelCreatedDate: "2026-02-15",
      mappingConfidence: "high",
      topFamilies: [{ slug: "mistral", name: "Mistral", modelCount: 3 }],
    },
    {
      iso3: "JPN",
      countryName: "Japan",
      region: "Asia",
      modelCount: 0,
      endpointCount: 2,
      modelProviderCount: 0,
      endpointProviderCount: 1,
      recentModelCount: 0,
      latestModelCreatedDate: null,
      mappingConfidence: "medium",
      topFamilies: [],
    },
  ],
  unknownProviders: [
    {
      lens: "modelPublisher",
      status: "unknown",
      providerName: "Mystery Models",
      providerSlug: "mystery",
      normalizedName: "mystery models",
      modelCount: 2,
      endpointCount: 0,
      reason: "Fixture provider is intentionally unmapped.",
    },
    {
      lens: "endpointProvider",
      status: "ambiguous",
      providerName: "Ambiguous Endpoints",
      providerSlug: null,
      normalizedName: "ambiguous endpoints",
      modelCount: 0,
      endpointCount: 3,
      reason: "Fixture endpoint provider is intentionally ambiguous.",
    },
  ],
  methodology: [
    "Fixture uses model publisher rows.",
    "Fixture sums endpoint provider entries separately.",
  ],
  caveats: [
    "Fixture is a public catalog/provider-country proxy.",
  ],
};

type LensModule = {
  default?: ComponentType<{ data: OpenRouterCountryActivityData }>;
  OpenRouterCountryActivityLens?: ComponentType<{ data: OpenRouterCountryActivityData }>;
};

function setLocale(locale: "en" | "zh") {
  mockUseLanguage.mockReturnValue({ locale, setLocale: vi.fn() });
}

async function importOpenRouterCountryActivityLens(): Promise<ComponentType<{ data: OpenRouterCountryActivityData }>> {
  expect(
    existsSync(COMPONENT_PATH),
    "Expected components/global/OpenRouterCountryActivityLens.tsx to render the OpenRouter country-level lens",
  ).toBe(true);

  const importedModule = (await import(/* @vite-ignore */ pathToFileURL(COMPONENT_PATH).href)) as LensModule;
  const Component = importedModule.default ?? importedModule.OpenRouterCountryActivityLens;
  expect(typeof Component, "OpenRouterCountryActivityLens should be a React component export").toBe("function");
  return Component as ComponentType<{ data: OpenRouterCountryActivityData }>;
}

function sentencesContaining(pageText: string, phrase: string): string[] {
  return pageText
    .split(/[.!?。；;]/)
    .filter((sentence) => sentence.toLowerCase().includes(phrase.toLowerCase()));
}

describe("OpenRouterCountryActivityLens", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("is wired into /global with server-loaded OpenRouter country activity data", () => {
    const globalPageSource = readFileSync(GLOBAL_PAGE_PATH, "utf8");
    const globalViewSource = readFileSync(GLOBAL_VIEW_PATH, "utf8");

    expect(globalPageSource).toMatch(/import\s+\{\s*getOpenRouterCountryActivityData\s*\}\s+from\s+["']@\/lib\/openrouter-country-activity["']/);
    expect(globalPageSource).toMatch(/const\s+openRouterCountryActivity\s*=\s*getOpenRouterCountryActivityData\(\)/);
    expect(globalPageSource).toContain("openRouterCountryActivity={openRouterCountryActivity}");
    expect(globalViewSource).toMatch(/import\s+OpenRouterCountryActivityLens\s+from\s+["']@\/components\/global\/OpenRouterCountryActivityLens["']/);
    expect(globalViewSource).toContain("openRouterCountryActivity: OpenRouterCountryActivityData");
    expect(globalViewSource).toContain("<OpenRouterCountryActivityLens data={openRouterCountryActivity} />");

    const adoptionIndex = globalViewSource.indexOf("<AIAdoptionSignals dataset={adoptionSignals} />");
    const openRouterIndex = globalViewSource.indexOf("<OpenRouterCountryActivityLens data={openRouterCountryActivity} />");
    const readinessIndex = globalViewSource.indexOf("<ReadinessGapLens data={readinessGap} />");
    expect(adoptionIndex, "Expected AIAdoptionSignals to render on /global").toBeGreaterThanOrEqual(0);
    expect(openRouterIndex, "Expected OpenRouterCountryActivityLens to render on /global").toBeGreaterThan(adoptionIndex);
    expect(readinessIndex, "Expected ReadinessGapLens to render on /global").toBeGreaterThan(openRouterIndex);
  });

  it("keeps English and Chinese OpenRouter country activity i18n keys identical", () => {
    const enKeys = Object.keys(globalEn).filter((key) => key.startsWith("openRouterCountryActivity")).sort();
    const zhKeys = Object.keys(globalZh).filter((key) => key.startsWith("openRouterCountryActivity")).sort();

    expect(enKeys.length).toBeGreaterThan(0);
    expect(zhKeys).toEqual(enKeys);
  });

  it("renders heading, caveat, KPIs, accessible chart, table, sources link, and neutral catalog/proxy copy", async () => {
    const OpenRouterCountryActivityLens = await importOpenRouterCountryActivityLens();

    render(<OpenRouterCountryActivityLens data={FIXTURE_DATA} />);

    const section = document.getElementById(SECTION_IDS.openRouterCountryModelFootprint);
    expect(section).toHaveClass("scroll-mt-24");
    expect(section).toHaveAttribute(
      "aria-labelledby",
      `${SECTION_IDS.openRouterCountryModelFootprint}-heading`,
    );
    expect(screen.getByRole("heading", { name: "AI model ecosystem footprint" })).toBeInTheDocument();
    expect(screen.getByText("OpenRouter catalog proxy")).toBeInTheDocument();
    expect(screen.getByLabelText(/Proxy: Proxy or seed-derived signal/i)).toBeInTheDocument();
    expect(screen.getByText(/Public catalog and endpoint availability only; not user traffic, usage, revenue, or national adoption/i)).toBeInTheDocument();

    for (const label of [
      "Models in snapshot",
      "Countries mapped",
      "Endpoint entries",
      "Unknown/unmapped providers",
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    expect(
      screen.getByRole("img", { name: /top countries by openrouter model catalog count/i }),
    ).toBeInTheDocument();
    expect(document.querySelector("ol.sr-only")?.textContent ?? "").toContain("United States");
    expect(document.querySelector("ol.sr-only")?.textContent ?? "").toContain("Endpoint entries");

    for (const header of [
      "Country",
      "Region",
      "Model providers",
      "Models",
      "Endpoint providers",
      "Endpoints",
      "Top families",
    ]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(screen.getByRole("rowheader", { name: "United States" })).toBeInTheDocument();
    expect(screen.getByText("Alpha (4), Bravo (3)")).toBeInTheDocument();

    const sourceLink = screen.getByRole("link", { name: /Data & Sources/i });
    expect(sourceLink).toHaveAttribute("href", "/sources");

    const pageText = document.body.textContent ?? "";
    expect(pageText).toMatch(/catalog proxy|provider identity proxy/i);
    expect(pageText).not.toMatch(/usage volume/i);
    expect(pageText).not.toMatch(/activity score/i);
    expect(pageText).not.toMatch(/\b(shows|measures|tracks|captures|indicates)\s+user traffic\b/i);
    expect(pageText).not.toMatch(/\b(shows|measures|tracks|captures|indicates)\s+national adoption\b/i);

    for (const phrase of ["user traffic", "usage", "national adoption"]) {
      const sentences = sentencesContaining(pageText, phrase);
      expect(sentences.length, `Expected ${phrase} to appear only as a caveated exclusion`).toBeGreaterThan(0);
      expect(sentences.every((sentence) => /\bnot\b/i.test(sentence))).toBe(true);
    }
  }, 10000);
});
