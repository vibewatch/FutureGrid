// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AIPressureSynthesisLens from "@/components/insights/AIPressureSynthesisLens";
import { analysisEn } from "@/lib/i18n/messages/en/analysis";
import { analysisZh } from "@/lib/i18n/messages/zh/analysis";
import type { AIPressureSynthesisData } from "@/lib/ai-pressure-synthesis";
import { DEEP_LINK_HREFS } from "@/lib/section-anchors";

vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => ({ locale: "en" as const, setLocale: vi.fn() }),
}));

const FIXTURE: AIPressureSynthesisData = {
  global: {
    href: DEEP_LINK_HREFS.globalAIEcosystemMap,
    modelCount: 340,
    endpointProviderCount: 72,
    rankableCountries: 122,
    topReadinessGapCountry: {
      iso3: "AAA",
      name: "Exampleland",
      gap: 24.5,
    },
  },
  talent: {
    href: DEEP_LINK_HREFS.visaTalentBottleneckLens,
    occupationsTracked: 756,
    latestH1bFiscalYear: 2025,
    latestJobPostingYear: 2025,
    topOccupation: {
      socCode: "15-1252",
      title: "Software Developers",
      score: 91.4,
    },
  },
  market: {
    href: "/analysis#market-ai-sensitivity",
    stockHref: "/analysis#ai-company-stock-signals",
    sectorProxyCount: 11,
    companyCount: 47,
    positiveBreadth1Y: 34,
    latestStockDate: "2026-07-02",
    benchmarkTickers: ["SPY", "QQQ"],
    topSector: {
      name: "Technology",
      ticker: "XLK",
      score: 94.6,
      excessReturn: 0.22,
      employmentWeightedAIExposure: 0.31,
    },
  },
  guardrailIds: [
    "openrouterCatalogProxy",
    "h1bLcaFilings",
    "stockDescriptiveHistory",
    "jobPostingsProxy",
  ],
};

const BANNED_OVERCLAIMS = [
  /\bproves?\b/i,
  /\bcaused by AI\b/i,
  /\bAI caused\b/i,
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bguaranteed\b/i,
  /\bpredicts returns\b/i,
];

describe("AIPressureSynthesisLens", () => {
  it("renders the cross-dataset radar with linked lanes and guardrails", () => {
    render(<AIPressureSynthesisLens data={FIXTURE} />);

    expect(screen.getByRole("heading", { name: "AI pressure synthesis" })).toBeInTheDocument();
    expect(screen.getByText("Model catalog + readiness gaps")).toBeInTheDocument();
    expect(screen.getByText("H-1B LCAs + SOC opportunities")).toBeInTheDocument();
    expect(screen.getByText("Stocks + market AI sensitivity")).toBeInTheDocument();
    expect(screen.getByText("340")).toBeInTheDocument();
    expect(screen.getByText("FY2025")).toBeInTheDocument();
    expect(screen.getByText("34 / 47")).toBeInTheDocument();

    expect(screen.getByRole("link", { name: "Open /global context" })).toHaveAttribute(
      "href",
      DEEP_LINK_HREFS.globalAIEcosystemMap,
    );
    expect(screen.getByRole("link", { name: "Open /visa context" })).toHaveAttribute(
      "href",
      DEEP_LINK_HREFS.visaTalentBottleneckLens,
    );
    expect(screen.getByRole("link", { name: "Jump to market sensitivity" })).toHaveAttribute(
      "href",
      "/analysis#market-ai-sensitivity",
    );
    expect(screen.getByRole("link", { name: "Jump to stock signals" })).toHaveAttribute(
      "href",
      "/analysis#ai-company-stock-signals",
    );

    const renderedText = document.body.textContent ?? "";
    expect(renderedText).toMatch(/catalog proxy, not usage, traffic/i);
    expect(renderedText).toMatch(/not visa approvals/i);
    expect(renderedText).toMatch(/not investment advice/i);
    expect(renderedText).toMatch(/seed\/proxy data/i);
  });

  it("avoids causal, adoption, and investment overclaim wording", () => {
    render(<AIPressureSynthesisLens data={FIXTURE} />);
    const renderedText = document.body.textContent ?? "";

    for (const pattern of BANNED_OVERCLAIMS) {
      expect(renderedText).not.toMatch(pattern);
    }
  });
});

describe("AI pressure synthesis wiring", () => {
  it("keeps English and Chinese analysis i18n keys in parity", () => {
    const enKeys = Object.keys(analysisEn).filter((key) => key.startsWith("aiPressure")).sort();
    const zhKeys = Object.keys(analysisZh).filter((key) => key.startsWith("aiPressure")).sort();

    expect(enKeys.length).toBeGreaterThan(0);
    expect(zhKeys).toEqual(enKeys);
  });

  it("loads compact synthesis props on /analysis and renders the lens before detailed lenses", () => {
    const pageSource = readFileSync(path.join(process.cwd(), "app/analysis/page.tsx"), "utf8");
    const insightsSource = readFileSync(path.join(process.cwd(), "components/insights/InsightsView.tsx"), "utf8");

    expect(pageSource).toMatch(/getAIPressureSynthesisData/);
    expect(pageSource).toContain("aiPressureSynthesis={aiPressureSynthesis}");
    expect(insightsSource).toMatch(/AIPressureSynthesisLens/);
    expect(insightsSource.indexOf("<AIPressureSynthesisLens")).toBeLessThan(
      insightsSource.indexOf("<EvidenceStack"),
    );
    expect(insightsSource).toContain('id="market-ai-sensitivity"');
    expect(insightsSource).toContain('id="ai-company-stock-signals"');
  });
});
