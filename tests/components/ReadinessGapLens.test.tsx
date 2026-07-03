// @vitest-environment jsdom

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentType } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { globalEn } from "@/lib/i18n/messages/en/global";
import { globalZh } from "@/lib/i18n/messages/zh/global";
import type { ReadinessGapData } from "@/lib/readiness-gap";
import { SECTION_IDS } from "@/lib/section-anchors";

const COMPONENT_PATH = path.join(process.cwd(), "components/global/ReadinessGapLens.tsx");
const GLOBAL_PAGE_PATH = path.join(process.cwd(), "app/global/page.tsx");
const GLOBAL_VIEW_PATH = path.join(process.cwd(), "components/global/GlobalView.tsx");

const mockUseLanguage = vi.fn(() => ({
  locale: "en" as "en" | "zh",
  setLocale: vi.fn(),
}));

vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
}));

const BANNED_WORDING = [
  /\bwinner\b/i,
  /\blaggard\b/i,
  /\bcaused\b/i,
  /\bpredicts\b/i,
  /\bpolicy failure\b/i,
];

const FIXTURE_DATA: ReadinessGapData = {
  countries: [
    {
      iso3: "AST",
      name: "Asteria",
      diffusionPct: 18.4,
      diffusionDelta: 2.1,
      aiReadiness: 0.47,
      readinessScore: 47,
      adoptionPercentile: 92.5,
      readinessPercentile: 60,
      gap: 32.5,
      quadrant: "adoption-outpacing-readiness",
    },
    {
      iso3: "BOR",
      name: "Borealis",
      diffusionPct: 7.2,
      diffusionDelta: null,
      aiReadiness: 0.78,
      readinessScore: 78,
      adoptionPercentile: 41.6,
      readinessPercentile: 70,
      gap: -28.4,
      quadrant: "latent-capacity",
    },
    {
      iso3: "CYR",
      name: "Cyrenia",
      diffusionPct: 14.6,
      diffusionDelta: 1.4,
      aiReadiness: 0.74,
      readinessScore: 74,
      adoptionPercentile: 78,
      readinessPercentile: 75.4,
      gap: 2.6,
      quadrant: "balanced-leader",
    },
    {
      iso3: "DOR",
      name: "Doravia",
      diffusionPct: 5.5,
      diffusionDelta: -0.3,
      aiReadiness: 0.43,
      readinessScore: 43,
      adoptionPercentile: 48,
      readinessPercentile: 50,
      gap: -2,
      quadrant: "balanced-watchlist",
    },
  ],
  adoptionOutpacingReadiness: [
    {
      iso3: "AST",
      name: "Asteria",
      diffusionPct: 18.4,
      diffusionDelta: 2.1,
      aiReadiness: 0.47,
      readinessScore: 47,
      adoptionPercentile: 92.5,
      readinessPercentile: 60,
      gap: 32.5,
      quadrant: "adoption-outpacing-readiness",
    },
  ],
  latentCapacity: [
    {
      iso3: "BOR",
      name: "Borealis",
      diffusionPct: 7.2,
      diffusionDelta: null,
      aiReadiness: 0.78,
      readinessScore: 78,
      adoptionPercentile: 41.6,
      readinessPercentile: 70,
      gap: -28.4,
      quadrant: "latent-capacity",
    },
  ],
  balancedLeaders: [
    {
      iso3: "CYR",
      name: "Cyrenia",
      diffusionPct: 14.6,
      diffusionDelta: 1.4,
      aiReadiness: 0.74,
      readinessScore: 74,
      adoptionPercentile: 78,
      readinessPercentile: 75.4,
      gap: 2.6,
      quadrant: "balanced-leader",
    },
  ],
  summary: {
    totalCountries: 6,
    rankableCountries: 4,
    coveragePct: 66.7,
    averageGap: 1.2,
    medianGap: 0.3,
    adoptionOutpacingReadinessCount: 1,
    latentCapacityCount: 1,
    balancedLeaderCount: 1,
    topAdoptionOutpacingReadiness: { iso3: "AST", name: "Asteria", gap: 32.5 },
    topLatentCapacity: { iso3: "BOR", name: "Borealis", gap: -28.4 },
  },
  methodology: {
    inputs: ["Fixture diffusion input", "Fixture readiness input"],
    ranking: "Fixture percentile ranks.",
    scoring: "Fixture scores for component rendering only.",
    quadrants: "Fixture quadrant labels.",
    exclusions: "No fixture exclusions.",
    caveats: ["Descriptive fixture only."],
  },
};

type ReadinessGapLensModule = {
  default?: ComponentType<{ data: ReadinessGapData }>;
  ReadinessGapLens?: ComponentType<{ data: ReadinessGapData }>;
};

function setLocale(locale: "en" | "zh") {
  mockUseLanguage.mockReturnValue({ locale, setLocale: vi.fn() });
}

async function importReadinessGapLens(): Promise<ComponentType<{ data: ReadinessGapData }>> {
  expect(
    existsSync(COMPONENT_PATH),
    "Expected components/global/ReadinessGapLens.tsx to render the readiness gap lens",
  ).toBe(true);

  const importedModule = (await import(/* @vite-ignore */ pathToFileURL(COMPONENT_PATH).href)) as ReadinessGapLensModule;
  const Component = importedModule.default ?? importedModule.ReadinessGapLens;
  expect(typeof Component, "ReadinessGapLens should be a React component export").toBe("function");
  return Component as ComponentType<{ data: ReadinessGapData }>;
}

describe("ReadinessGapLens", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("is wired into /global with server-loaded readiness-gap data", () => {
    const globalPageSource = readFileSync(GLOBAL_PAGE_PATH, "utf8");
    const globalViewSource = readFileSync(GLOBAL_VIEW_PATH, "utf8");

    expect(globalPageSource).toMatch(/import\s+\{\s*getReadinessGapData\s*\}\s+from\s+["']@\/lib\/readiness-gap["']/);
    expect(globalPageSource).toMatch(/const\s+readinessGap\s*=\s*getReadinessGapData\(\)/);
    expect(globalPageSource).toContain("readinessGap={readinessGap}");
    expect(globalViewSource).toMatch(/<ReadinessGapLens\s+data=\{readinessGap\}\s*\/>/);
  });

  it("keeps English and Chinese readiness-gap i18n keys identical", () => {
    const enKeys = Object.keys(globalEn).filter((key) => key.startsWith("readinessGap")).sort();
    const zhKeys = Object.keys(globalZh).filter((key) => key.startsWith("readinessGap")).sort();

    expect(enKeys.length).toBeGreaterThan(0);
    expect(zhKeys).toEqual(enKeys);
  });

  it("renders headings, KPI cards, ranked lists, source link, accessible scatter, caveat, and neutral wording", async () => {
    const ReadinessGapLens = await importReadinessGapLens();

    render(<ReadinessGapLens data={FIXTURE_DATA} />);

    const section = document.getElementById(SECTION_IDS.readinessGapLens);
    expect(section).toHaveClass("scroll-mt-24");
    expect(section).toHaveAttribute(
      "aria-labelledby",
      `${SECTION_IDS.readinessGapLens}-heading`,
    );
    expect(screen.getByRole("heading", { name: "Adoption–Readiness Gap" })).toBeInTheDocument();
    expect(screen.getByText(/Descriptive alignment only/i)).toBeInTheDocument();
    expect(screen.getByText(/Rankable countries/i)).toBeInTheDocument();
    expect(screen.getByText(/Largest positive gap/i)).toBeInTheDocument();
    expect(screen.getByText(/Largest latent capacity/i)).toBeInTheDocument();

    expect(screen.getByRole("heading", { name: /Adoption outpacing readiness/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Latent capacity/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Balanced leaders/i })).toBeInTheDocument();

    for (const list of [
      FIXTURE_DATA.adoptionOutpacingReadiness,
      FIXTURE_DATA.latentCapacity,
      FIXTURE_DATA.balancedLeaders,
    ]) {
      expect(list.length, "Expected readiness-gap fixture to expose non-empty ranked lists").toBeGreaterThan(0);
      expect(document.body.textContent ?? "").toContain(list[0].name);
    }

    const sourceLink = screen.getByRole("link", { name: /Data & Sources/i });
    expect(sourceLink).toHaveAttribute("href", "/sources");

    expect(
      screen.getByRole("img", { name: /readiness score on the x-axis and generative-AI diffusion percent/i }),
    ).toBeInTheDocument();
    expect(document.querySelector("ul.sr-only")?.textContent ?? "").toContain(FIXTURE_DATA.countries[0].name);

    const pageText = document.body.textContent ?? "";
    expect(pageText).toContain(globalEn.readinessGapGapUnit);
    for (const pattern of BANNED_WORDING) {
      expect(pageText, `ReadinessGapLens should avoid banned wording ${pattern}`).not.toMatch(pattern);
    }
  }, 10000);

  it("localizes gap units in rendered and accessible Chinese text", async () => {
    setLocale("zh");
    const ReadinessGapLens = await importReadinessGapLens();

    render(<ReadinessGapLens data={FIXTURE_DATA} />);

    const pageText = document.body.textContent ?? "";
    expect(pageText).toContain(globalZh.readinessGapGapUnit);
    expect(pageText).not.toContain(globalEn.readinessGapGapUnit);

    const accessibleText = document.querySelector("ul.sr-only")?.textContent ?? "";
    expect(accessibleText).toContain(globalZh.readinessGapGapUnit);
    expect(accessibleText).not.toContain(globalEn.readinessGapGapUnit);
  });
});
