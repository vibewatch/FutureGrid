// @vitest-environment jsdom

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentType } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const COMPONENT_PATH = path.join(process.cwd(), "components/global/AIAdoptionSignals.tsx");
const HELPER_PATH = path.join(process.cwd(), "lib/adoption-signals.ts");

const BANNED_WORDING = [
  /\bwinner\b/i,
  /\blaggard\b/i,
  /\btrue adoption\b/i,
  /\bcauses?\b/i,
  /\bpredicts?\b/i,
  /\bguaranteed\b/i,
];

const REPRESENTATIVE_FAMILIES = [
  "enterpriseAdoptionMetrics",
  "individualGenerativeAIUsageMetrics",
  "chinaAppMarketMetrics",
  "chinaNativeAppMau",
  "developerSurveyMetrics",
  "openModelDownloadProxies",
  "developerEcosystemProxies",
  "aiResearchActivityMetrics",
] as const;

const SPLIT_PANEL_TITLES = [
  "China app-market MAU proxies",
  "China app-market usage-volume proxies",
  "Developer survey overall distributions",
  "Developer survey country respondent shares",
] as const;

type UnknownRecord = Record<string, unknown>;
type SignalPanel = UnknownRecord & {
  family?: unknown;
  sourceSummary?: unknown;
  caveat?: unknown;
  values?: UnknownRecord[];
};
type AdoptionSignalsDataset = UnknownRecord & {
  caveat?: unknown;
  panels?: SignalPanel[];
};
type AdoptionSignalsModule = {
  getAdoptionSignals?: (options?: { topN?: number }) => AdoptionSignalsDataset;
};
type AIAdoptionSignalsProps = {
  dataset: AdoptionSignalsDataset;
};
type AIAdoptionSignalsModule = {
  default?: ComponentType<AIAdoptionSignalsProps>;
  AIAdoptionSignals?: ComponentType<AIAdoptionSignalsProps>;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => "/global",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

async function importAdoptionSignals(): Promise<Required<AdoptionSignalsModule>> {
  expect(
    existsSync(HELPER_PATH),
    "Expected lib/adoption-signals.ts to export getAdoptionSignals() for the AIAdoptionSignals component",
  ).toBe(true);

  const importedModule = (await import(/* @vite-ignore */ pathToFileURL(HELPER_PATH).href)) as AdoptionSignalsModule;
  expect(typeof importedModule.getAdoptionSignals, "getAdoptionSignals should be exported").toBe("function");
  return importedModule as Required<AdoptionSignalsModule>;
}

async function importAIAdoptionSignals(): Promise<ComponentType<AIAdoptionSignalsProps>> {
  expect(
    existsSync(COMPONENT_PATH),
    "Expected components/global/AIAdoptionSignals.tsx to render AI adoption signal panels on /global",
  ).toBe(true);

  const importedModule = (await import(/* @vite-ignore */ pathToFileURL(COMPONENT_PATH).href)) as AIAdoptionSignalsModule;
  const Component = importedModule.default ?? importedModule.AIAdoptionSignals;
  expect(typeof Component, "AIAdoptionSignals should be a React component export").toBe("function");
  return Component as ComponentType<AIAdoptionSignalsProps>;
}

function panelTextCandidates(panel: SignalPanel): string[] {
  const candidates: string[] = [];
  for (const value of panel.values ?? []) {
    for (const key of ["label", "name", "title", "metric", "provider", "product", "repository", "modelId"]) {
      if (typeof value[key] === "string" && value[key].trim()) candidates.push(value[key]);
    }
    const source = value.source;
    if (source && typeof source === "object" && !Array.isArray(source)) {
      const name = (source as UnknownRecord).name;
      if (typeof name === "string" && name.trim()) candidates.push(name);
    }
  }
  if (typeof panel.sourceSummary === "string") candidates.push(panel.sourceSummary);
  return candidates.sort((a, b) => b.length - a.length);
}

function textIncludesCandidate(pageText: string, candidates: string[]): boolean {
  return candidates.some((candidate) => pageText.includes(candidate));
}

describe("AIAdoptionSignals", () => {
  it("keeps adoption-signal imports type-only in the client component", () => {
    const source = readFileSync(COMPONENT_PATH, "utf8");
    const adoptionSignalImports = source
      .split("\n")
      .filter((line) => line.includes("@/lib/adoption-signals") && /^\s*import\b/.test(line));

    expect(adoptionSignalImports, "Expected the component to import adoption signal types").not.toEqual([]);
    expect(
      adoptionSignalImports.every((line) => /^\s*import\s+type\b/.test(line)),
      "AIAdoptionSignals should only use type imports from lib/adoption-signals",
    ).toBe(true);
  });

  it("renders adoption signal panels with sources, caveats, representative labels, and neutral wording", async () => {
    const { getAdoptionSignals } = await importAdoptionSignals();
    const AIAdoptionSignals = await importAIAdoptionSignals();
    const dataset = getAdoptionSignals({ topN: 8 });

    render(<AIAdoptionSignals dataset={dataset} />);

    expect(screen.getByRole("heading", { name: /AI Adoption Signals/i })).toBeInTheDocument();
    await waitFor(() => expect(document.body.textContent ?? "").toMatch(/source/i));

    const sourceLink = Array.from(document.querySelectorAll("a")).find((anchor) =>
      /sources?/i.test(`${anchor.textContent ?? ""} ${anchor.getAttribute("href") ?? ""}`),
    );
    expect(sourceLink, "Expected a sources link in AIAdoptionSignals").toBeTruthy();

    const pageText = document.body.textContent ?? "";
    const panels = dataset.panels ?? [];
    for (const title of SPLIT_PANEL_TITLES) {
      expect(pageText, `Expected rendered split panel title: ${title}`).toContain(title);
    }

    for (const family of REPRESENTATIVE_FAMILIES) {
      const panel = panels.find((candidate) => candidate.family === family);
      expect(panel, `Expected a rendered dataset panel for ${family}`).toBeTruthy();
      expect(
        textIncludesCandidate(pageText, panelTextCandidates(panel ?? {})),
        `Expected rendered text to include a representative label/source from ${family}`,
      ).toBe(true);
    }

    const firstPanel = panels.find((panel) => typeof panel.caveat === "string" && typeof panel.sourceSummary === "string");
    expect(firstPanel, "Expected at least one panel with caveat and sourceSummary").toBeTruthy();
    expect(pageText, "Expected rendered caveat text").toContain(firstPanel?.caveat as string);
    expect(pageText, "Expected rendered source summary text").toContain(firstPanel?.sourceSummary as string);

    for (const pattern of BANNED_WORDING) {
      expect(pageText, `AIAdoptionSignals should avoid banned wording ${pattern}`).not.toMatch(pattern);
    }
  });
});
