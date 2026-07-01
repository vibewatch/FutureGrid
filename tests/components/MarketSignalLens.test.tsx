// @vitest-environment jsdom

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentType } from "react";
import { render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const COMPONENT_PATH = path.join(process.cwd(), "components/insights/MarketSignalLens.tsx");
const DATA_PATH = path.join(process.cwd(), "data/market-ai-signals.json");
const ANALYSIS_ENTRYPOINTS = [
  path.join(process.cwd(), "app/analysis/page.tsx"),
  path.join(process.cwd(), "components/insights/InsightsView.tsx"),
  path.join(process.cwd(), "lib/i18n/messages/en/analysis.ts"),
];
const SUB_ONE_SCORE_TICKERS = ["XLE", "XLU"] as const;

const BANNED_WORDING = [
  { label: "buy", pattern: /\bbuy\b/i },
  { label: "sell", pattern: /\bsell\b/i },
  { label: "financial advice", pattern: /\bfinancial\s+advice\b/i },
  { label: "guaranteed", pattern: /\bguaranteed\b/i },
  { label: "predicts returns", pattern: /\bpredicts?\s+returns?\b/i },
  { label: "caused by AI", pattern: /\bcaused\s+by\s+AI\b/i },
  { label: "AI caused", pattern: /\bAI\s+caused\b/i },
];

const SECTOR_TEXT = /\b(XLK|XLY|XLP|XLE|XLF|XLV|XLI|XLB|XLRE|XLU|XLC|technology|financials|health care|energy|industrials|utilities)\b/i;

type MarketSignalLensModule = {
  default?: ComponentType;
  MarketSignalLens?: ComponentType;
};
type MarketSignalSnapshot = {
  sectors?: Array<{
    name?: unknown;
    ticker?: unknown;
    marketAiSensitivityScore?: unknown;
  }>;
};
type SubOneScoreSector = {
  name: string;
  ticker: string;
  score: number;
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

async function importMarketSignalLens(): Promise<ComponentType> {
  expect(
    existsSync(COMPONENT_PATH),
    "Expected components/insights/MarketSignalLens.tsx to render the market-implied AI sensitivity lens",
  ).toBe(true);

  const importedModule = (await import(/* @vite-ignore */ pathToFileURL(COMPONENT_PATH).href)) as MarketSignalLensModule;
  const Component = importedModule.default ?? importedModule.MarketSignalLens;
  expect(typeof Component, "MarketSignalLens should be a React component export").toBe("function");
  return Component as ComponentType;
}

function sectorMarkCount(container: HTMLElement): number {
  return container.querySelectorAll(
    [
      "[data-market-sector]",
      "[data-sector]",
      "[data-testid*='sector']",
      "[data-testid*='Sector']",
      "[data-testid*='point']",
      "[data-testid*='Point']",
      "tbody tr",
      "[role='row']",
      "[role='listitem']",
      "li",
      "circle",
      "rect",
    ].join(","),
  ).length;
}

function readSubOneScoreSectors(): SubOneScoreSector[] {
  expect(
    existsSync(DATA_PATH),
    "Expected data/market-ai-signals.json to contain bundled market sensitivity scores",
  ).toBe(true);

  const snapshot = JSON.parse(readFileSync(DATA_PATH, "utf8")) as MarketSignalSnapshot;
  expect(Array.isArray(snapshot.sectors), "market-ai-signals snapshot should expose sectors").toBe(true);

  return SUB_ONE_SCORE_TICKERS.map((ticker) => {
    const sector = snapshot.sectors?.find((candidate) => candidate.ticker === ticker);
    expect(sector, `Expected ${ticker} in data/market-ai-signals.json`).toBeTruthy();
    expect(typeof sector?.name, `${ticker} should expose a sector name`).toBe("string");
    expect(typeof sector?.marketAiSensitivityScore, `${ticker} should expose a numeric marketAiSensitivityScore`).toBe(
      "number",
    );

    const score = sector?.marketAiSensitivityScore as number;
    expect(score, `${ticker} fixture should remain a non-zero sub-1 score`).toBeGreaterThan(0);
    expect(score, `${ticker} fixture should remain a non-zero sub-1 score`).toBeLessThan(1);

    return { name: sector?.name as string, ticker, score };
  });
}

function numberPattern(value: number): RegExp {
  const formatted = value.toFixed(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\d.])${formatted}(?!\\d)`);
}

function accessiblePointLabel(ticker: string): string | null {
  return (
    Array.from(document.querySelectorAll("[aria-label]"))
      .map((element) => element.getAttribute("aria-label") ?? "")
      .find((label) => label.includes(`(${ticker})`)) ?? null
  );
}

function rankingRowText(ticker: string): string | null {
  return (
    Array.from(document.querySelectorAll("button"))
      .map((element) => element.textContent ?? "")
      .find((text) => text.includes(ticker)) ?? null
  );
}

function expectUnscaledScore(text: string, sector: SubOneScoreSector, label: string): void {
  expect(text, `${label} should render ${sector.ticker} JSON score ${sector.score.toFixed(1)}`).toMatch(
    numberPattern(sector.score),
  );
  expect(text, `${label} should not multiply ${sector.ticker} JSON score by 100`).not.toMatch(
    numberPattern(sector.score * 100),
  );
}

describe("MarketSignalLens", () => {
  it("is wired into the analysis page", () => {
    const analysisSource = ANALYSIS_ENTRYPOINTS
      .filter((entrypoint) => existsSync(entrypoint))
      .map((entrypoint) => readFileSync(entrypoint, "utf8"))
      .join("\n");

    expect(analysisSource, "Expected /analysis to import or render MarketSignalLens").toMatch(/MarketSignalLens/);
    expect(analysisSource, "Expected /analysis to use a market signal section title").toMatch(
      /marketSignalTitle|Market AI Sensitivity|Market Signal Lens/i,
    );
  });

  it("renders the lens title, sector marks, source caveat, and no banned wording", async () => {
    const MarketSignalLens = await importMarketSignalLens();
    const { container } = render(<MarketSignalLens />);

    await waitFor(() => {
      const renderedText = document.body.textContent ?? "";
      expect(
        sectorMarkCount(container) > 0 || SECTOR_TEXT.test(renderedText),
        "MarketSignalLens should render at least one sector row, list item, or chart point",
      ).toBe(true);
    });

    const pageText = document.body.textContent ?? "";
    expect(pageText).toMatch(/yahoo/i);
    expect(pageText).toMatch(/unofficial|undocumented|change[- ]?prone/i);
    expect(pageText).toMatch(/non[- ]?advisory|informational|descriptive only|not investment advice|not advice/i);

    for (const { label, pattern } of BANNED_WORDING) {
      expect(pageText, `MarketSignalLens should avoid banned wording: ${label}`).not.toMatch(pattern);
    }
  });

  it("does not multiply sub-1 market sensitivity scores from the bundled JSON", async () => {
    const subOneScoreSectors = readSubOneScoreSectors();
    const MarketSignalLens = await importMarketSignalLens();
    render(<MarketSignalLens />);

    await waitFor(() => {
      for (const sector of subOneScoreSectors) {
        expect(accessiblePointLabel(sector.ticker), `Expected accessible chart label for ${sector.ticker}`).toEqual(
          expect.any(String),
        );
        expect(rankingRowText(sector.ticker), `Expected ranking row for ${sector.ticker}`).toEqual(expect.any(String));
      }
    });

    for (const sector of subOneScoreSectors) {
      expectUnscaledScore(accessiblePointLabel(sector.ticker) ?? "", sector, `${sector.name} chart label`);
      expectUnscaledScore(rankingRowText(sector.ticker) ?? "", sector, `${sector.name} ranking row`);
    }
  });
});
