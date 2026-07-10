// @vitest-environment jsdom
/**
 * Focused component tests for EvidenceConvergenceStrip and its InsightsView wiring.
 *
 * Acceptance criteria (vibewatch/FutureGrid#103):
 *  - Strip renders a non-color status label for each convergence item
 *  - Strip renders a confidence label for each item
 *  - Strip renders caveat / freshness context from the summary
 *  - Strip provides accessible drill-down links with valid app-route hrefs
 *  - Strip consumes the canonical getEvidenceConvergence() selector — not a local
 *    re-derivation from getEvidenceStack(). The behavioral mock test below is a spec
 *    blocker: it currently FAILS because the component calls getEvidenceStack() directly
 *    in deriveConvergenceItems() instead of using getEvidenceConvergence(). It will
 *    pass once the component is fixed to consume the canonical selector.
 *  - EvidenceStack is still rendered in InsightsView (behavioral DOM check)
 *  - EvidenceConvergenceStrip appears before EvidenceStack in InsightsView DOM
 *
 * Issue: vibewatch/FutureGrid#103
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentType } from "react";
import { render, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getEvidenceConvergence,
  getEvidenceStack,
  type EvidenceConfidence,
  type EvidenceStatus,
  type EvidenceConvergence,
  type EvidenceStack,
} from "@/lib/evidence";
import InsightsView from "@/components/insights/InsightsView";
import type { AnalysisPageData } from "@/lib/analysis";
import type { AICompanyStocksData } from "@/lib/ai-company-stocks";
import type { AIPressureSynthesisData } from "@/lib/ai-pressure-synthesis";

// ── Spy wrapper around @/lib/evidence ─────────────────────────────────────────────
// Wraps getEvidenceConvergence and getEvidenceStack as transparent spies so that:
//  • existing rendering tests continue to work (call-through to real data), AND
//  • behavioral mock tests can control return values per-test to detect which
//    function the component actually calls during render.
vi.mock("@/lib/evidence", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/evidence")>();
  return {
    ...original,
    getEvidenceConvergence: vi.fn(original.getEvidenceConvergence),
    getEvidenceStack: vi.fn(original.getEvidenceStack),
  };
});
// ── Mocks for InsightsView heavy children ─────────────────────────────────────────
// These children require complex data props and are not under test here.
// Mocking them to null lets InsightsView render in jsdom without fixtures,
// while EvidenceConvergenceStrip and EvidenceStack render their real output.
vi.mock("@/components/insights/AIPressureSynthesisLens", () => ({ default: () => null }));
vi.mock("@/components/insights/ExposureOutcomeMatrix", () => ({ default: () => null }));
vi.mock("@/components/insights/ExposureLensComparison", () => ({ default: () => null }));
vi.mock("@/components/insights/MarketSignalLens", () => ({ default: () => null }));
vi.mock("@/components/insights/AICompanyStockLens", () => ({ default: () => null }));
vi.mock("@/components/insights/EmploymentForecastChart", () => ({ default: () => null }));
vi.mock("@/components/insights/AIForcesTimeline", () => ({ default: () => null }));
vi.mock("@/components/insights/DisruptionLeaderboard", () => ({ default: () => null }));
// Reveal is an animation wrapper — pass children through so component content is testable.
vi.mock("@/components/ui/Reveal", () => ({
  default: ({ children }: { children: unknown }) => children,
}));

// ── Paths ──────────────────────────────────────────────────────────────────────

const STRIP_PATH = path.join(process.cwd(), "components/insights/EvidenceConvergenceStrip.tsx");

// ── Constants ──────────────────────────────────────────────────────────────────

const VALID_APP_ROUTE = /^\/(analysis|careers|sectors|labor|skills|explore|global|sources|report)(?:\/|#|$)/;

/** Text patterns that non-color status labels must match (from i18n keys used in EvidenceStack). */
const STATUS_TEXT_PATTERNS: Record<string, RegExp> = {
  agreement: /agreement/i,
  mixed: /mixed/i,
  "coverage-gap": /coverage[\s-]gap/i,
  watch: /watch/i,
};

/** Text patterns that confidence labels must match. */
const CONFIDENCE_TEXT_PATTERNS: Record<string, RegExp> = {
  high: /high/i,
  medium: /medium/i,
  low: /low/i,
};

// ── Next.js / theme mocks required by client components ───────────────────────

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

// ── Dynamic import helper ──────────────────────────────────────────────────────

async function importStrip(): Promise<ComponentType> {
  expect(
    existsSync(STRIP_PATH),
    "Tank/Neo must create components/insights/EvidenceConvergenceStrip.tsx",
  ).toBe(true);
  const mod = await import(/* @vite-ignore */ pathToFileURL(STRIP_PATH).href);
  const Component = (mod.default ?? mod.EvidenceConvergenceStrip) as ComponentType | undefined;
  expect(typeof Component, "EvidenceConvergenceStrip must be a React component (default or named export)").toBe(
    "function",
  );
  return Component as ComponentType;
}

// ── Global DOM cleanup ─────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

// ── File existence ─────────────────────────────────────────────────────────────

describe("EvidenceConvergenceStrip file", () => {
  it("exists at components/insights/EvidenceConvergenceStrip.tsx", () => {
    expect(existsSync(STRIP_PATH), "Neo must create components/insights/EvidenceConvergenceStrip.tsx").toBe(true);
  });

  it("exports a default or named React component", async () => {
    await importStrip();
  });
});

// ── Strip rendering ────────────────────────────────────────────────────────────

describe("EvidenceConvergenceStrip rendering", () => {
  it("renders a title or label for each convergence item", async () => {
    const Strip = await importStrip();
    render(<Strip />);
    const pageText = document.body.textContent ?? "";
    const { items } = getEvidenceConvergence();
    const renderedCount = items.filter((item) => pageText.includes(item.title)).length;
    expect(renderedCount, "Strip should render each convergence item title").toBeGreaterThanOrEqual(items.length);
  });

  it("renders a non-color text status label for each distinct status in the items", async () => {
    const Strip = await importStrip();
    render(<Strip />);
    const pageText = document.body.textContent ?? "";
    const { items } = getEvidenceConvergence();
    const distinctStatuses = [...new Set(items.map((item) => item.status))];

    for (const status of distinctStatuses) {
      const pattern = STATUS_TEXT_PATTERNS[status];
      expect(pageText, `Strip should display a text label for status "${status}"`).toMatch(pattern);
    }

    // Raw CSS color fragments must not leak into visible text
    expect(pageText, "Strip must not render raw CSS color tokens as visible text").not.toMatch(
      /\bbg-emerald\b|\bbg-amber\b|\bbg-rose\b|\bbg-cyan\b|\btext-emerald\b|\btext-amber\b|\btext-rose\b|\btext-cyan\b/,
    );
  });

  it("renders a confidence label for each distinct confidence level in the items", async () => {
    const Strip = await importStrip();
    render(<Strip />);
    const pageText = document.body.textContent ?? "";
    const { items } = getEvidenceConvergence();
    const distinctConfidences = [...new Set(items.map((item) => item.confidence))];

    for (const confidence of distinctConfidences) {
      const pattern = CONFIDENCE_TEXT_PATTERNS[confidence];
      expect(pageText, `Strip should display a label for confidence "${confidence}"`).toMatch(pattern);
    }
  });

  it("renders caveat or freshness context text from the summary", async () => {
    const Strip = await importStrip();
    render(<Strip />);
    const pageText = document.body.textContent ?? "";
    expect(pageText, "Strip should include caveat, coverage, or freshness context text").toMatch(
      /caveat|coverage|limitation|source|generated|not every/i,
    );
  });

  it("renders drill-down links pointing to valid app routes", async () => {
    const Strip = await importStrip();
    const { container } = render(<Strip />);
    const hrefs = Array.from(container.querySelectorAll("a"))
      .map((a) => a.getAttribute("href") ?? "")
      .filter(Boolean);

    expect(hrefs.length, "Strip should render at least one drill-down link").toBeGreaterThan(0);
    const validHrefs = hrefs.filter((href) => VALID_APP_ROUTE.test(href));
    expect(validHrefs.length, "All rendered links should target valid app routes").toBeGreaterThan(0);
    expect(validHrefs.length).toBe(hrefs.length);
  });

  it("every rendered drill-down link has discernible text or aria-label (accessible)", async () => {
    const Strip = await importStrip();
    const { container } = render(<Strip />);
    const anchors = Array.from(container.querySelectorAll("a")).filter((a) =>
      VALID_APP_ROUTE.test(a.getAttribute("href") ?? ""),
    );

    expect(anchors.length, "Strip must have at least one accessible drill-down link").toBeGreaterThan(0);

    for (const anchor of anchors) {
      const text = (anchor.textContent ?? "").trim();
      const ariaLabel = (anchor.getAttribute("aria-label") ?? "").trim();
      expect(
        text.length > 0 || ariaLabel.length > 0,
        `Link to "${anchor.getAttribute("href")}" must have non-empty text content or aria-label`,
      ).toBe(true);
    }
  });

  it("links cover at least two distinct app routes", async () => {
    const Strip = await importStrip();
    const { container } = render(<Strip />);
    const routes = new Set(
      Array.from(container.querySelectorAll("a"))
        .map((a) => (a.getAttribute("href") ?? "").split("#")[0])
        .filter((href) => VALID_APP_ROUTE.test(href)),
    );
    expect(routes.size, "Strip should link to at least two distinct app routes").toBeGreaterThanOrEqual(2);
  });
});

// ── InsightsView wiring — behavioral ──────────────────────────────────────────
// InsightsView heavy children are mocked to null (see file-level vi.mock calls above).
// EvidenceConvergenceStrip and EvidenceStack render for real; Reveal is a pass-through.
// These behavioral tests prove runtime DOM structure, not source-text shape.

describe("InsightsView EvidenceConvergenceStrip wiring", () => {
  // Provide minimal data with the fields InsightsView evaluates in JSX expressions.
  // All heavy children are mocked to null so other data fields are not accessed.
  const emptyData = { aiSignal: { points: [] } } as unknown as AnalysisPageData;
  const emptyStocks = {} as AICompanyStocksData;
  const emptyPressure = {} as AIPressureSynthesisData;

  it("EvidenceStack is still rendered in InsightsView (not removed by strip integration)", () => {
    const { container } = render(
      <InsightsView data={emptyData} aiCompanyStocks={emptyStocks} aiPressureSynthesis={emptyPressure} />,
    );
    // EvidenceStack renders t("evidenceTitle") = "Evidence Stack: where signals agree"
    expect(
      container.textContent,
      "InsightsView must still render <EvidenceStack /> — its heading must appear in the DOM",
    ).toContain("Evidence Stack: where signals agree");
  });

  it("EvidenceConvergenceStrip is rendered in InsightsView", () => {
    const { container } = render(
      <InsightsView data={emptyData} aiCompanyStocks={emptyStocks} aiPressureSynthesis={emptyPressure} />,
    );
    // EvidenceConvergenceStrip renders t("convergenceStripTitle") = "Evidence Convergence"
    expect(
      container.textContent,
      "InsightsView must render <EvidenceConvergenceStrip /> — its heading must appear in the DOM",
    ).toContain("Evidence Convergence");
  });

  it("EvidenceConvergenceStrip appears before EvidenceStack in InsightsView rendered DOM", () => {
    const { container } = render(
      <InsightsView data={emptyData} aiCompanyStocks={emptyStocks} aiPressureSynthesis={emptyPressure} />,
    );
    const pageText = container.textContent ?? "";
    // Strip heading: t("convergenceStripTitle") = "Evidence Convergence"
    // Stack heading: t("evidenceTitle") = "Evidence Stack: where signals agree"
    const stripPos = pageText.indexOf("Evidence Convergence");
    const stackPos = pageText.indexOf("Evidence Stack: where signals agree");

    expect(stripPos, "EvidenceConvergenceStrip heading must be present in InsightsView DOM").toBeGreaterThanOrEqual(0);
    expect(stackPos, "EvidenceStack heading must be present in InsightsView DOM").toBeGreaterThanOrEqual(0);
    expect(
      stripPos,
      "EvidenceConvergenceStrip must appear before EvidenceStack in InsightsView rendered output",
    ).toBeLessThan(stackPos);
  });
});

// ── BEHAVIORAL SPEC BLOCKER: canonical selector consumption ───────────────────
// This describe block is the core revision artifact.
//
// WHY THIS TEST CURRENTLY FAILS (rejected implementation):
//   EvidenceConvergenceStrip calls getEvidenceStack() directly via deriveConvergenceItems()
//   instead of calling the canonical getEvidenceConvergence() selector. Because both
//   functions derive from the same static source, the rendering tests above pass by
//   coincidence — they cannot distinguish "component called getEvidenceConvergence()"
//   from "component called getEvidenceStack() and happened to get the same data."
//
// HOW THIS TEST DETECTS THE DIVERGENCE:
//   getEvidenceStack() is mocked to return conclusions with DIVERGENT_ITEM_TITLE.
//   getEvidenceConvergence() is mocked to return items with SENTINEL_ITEM_TITLE.
//   If the component calls getEvidenceStack() directly, DIVERGENT_ITEM_TITLE appears.
//   If the component calls getEvidenceConvergence(), SENTINEL_ITEM_TITLE appears.
//   The test asserts SENTINEL_ITEM_TITLE is present → fails for the rejected impl,
//   passes once the component is fixed to use getEvidenceConvergence().

describe("EvidenceConvergenceStrip — behavioral: consumes canonical getEvidenceConvergence() selector", () => {
  /** Unique title that only appears if getEvidenceConvergence() is the data source. */
  const SENTINEL_ITEM_TITLE = "sentinel-canonical-item-title-zz9876";
  /** Unique title that only appears if getEvidenceStack() is called directly. */
  const DIVERGENT_ITEM_TITLE = "divergent-stack-item-title-aa1234";

  beforeEach(() => {
    // At this point the spy calls through — use it to get the real stack shape
    // so the divergent stack has all required fields and the component won't crash.
    const realStack = getEvidenceStack();
    const divergentStack: EvidenceStack = {
      ...realStack,
      conclusions: realStack.conclusions.map((c) => ({
        ...c,
        title: DIVERGENT_ITEM_TITLE,
      })),
    };

    // Sentinel convergence — 2 items with unique titles only reachable via getEvidenceConvergence().
    const sentinelConvergence: EvidenceConvergence = {
      items: [
        {
          id: "sentinel-1",
          title: SENTINEL_ITEM_TITLE,
          status: "agreement" as EvidenceStatus,
          confidence: "high" as EvidenceConfidence,
          primaryHref: "/analysis",
        },
        {
          id: "sentinel-2",
          title: "sentinel-item-two",
          status: "watch" as EvidenceStatus,
          confidence: "low" as EvidenceConfidence,
          primaryHref: "/labor",
        },
      ],
      summary: {
        title: "Sentinel Summary",
        finding: "Sentinel finding text",
        agreementCount: 1,
        mixedCount: 0,
        coverageGapCount: 0,
        watchCount: 1,
        caveat: "Sentinel caveat text",
        generatedAt: "2026-01-01",
      },
    };

    vi.mocked(getEvidenceConvergence).mockImplementation(() => sentinelConvergence);
    vi.mocked(getEvidenceStack).mockImplementation(() => divergentStack);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    // Restore call-through so subsequent test groups receive real data.
    const original = await vi.importActual<typeof import("@/lib/evidence")>("@/lib/evidence");
    vi.mocked(getEvidenceConvergence).mockImplementation(original.getEvidenceConvergence);
    vi.mocked(getEvidenceStack).mockImplementation(original.getEvidenceStack);
  });

  it(
    "renders item titles from getEvidenceConvergence(), not from local re-derivation via getEvidenceStack()" +
      " [SPEC BLOCKER — fails for rejected impl]",
    async () => {
      const Strip = await importStrip();
      render(<Strip />);
      const pageText = document.body.textContent ?? "";

      expect(
        pageText,
        [
          "EvidenceConvergenceStrip must render item titles from the canonical getEvidenceConvergence() selector.",
          `Expected "${SENTINEL_ITEM_TITLE}" in DOM (source: getEvidenceConvergence()).`,
          "The component rendered content from getEvidenceStack() instead (divergent titles present).",
          "Fix: replace deriveConvergenceItems() / getEvidenceStack() with getEvidenceConvergence() from @/lib/evidence.",
        ].join(" "),
      ).toContain(SENTINEL_ITEM_TITLE);

      expect(
        pageText,
        "Strip must not contain titles sourced directly from getEvidenceStack() — use getEvidenceConvergence() exclusively",
      ).not.toContain(DIVERGENT_ITEM_TITLE);
    },
  );

  it(
    "renders exactly the item count returned by getEvidenceConvergence(), not getEvidenceStack().conclusions.length" +
      " [SPEC BLOCKER — fails for rejected impl]",
    async () => {
      const Strip = await importStrip();
      const { container } = render(<Strip />);
      const listItems = container.querySelectorAll("li");

      // sentinel convergence has 2 items; real stack has 7 conclusions.
      // If the component uses getEvidenceStack() directly, 7 li elements appear.
      expect(
        listItems.length,
        "Strip must render exactly 2 items (from sentinel getEvidenceConvergence()). " +
          `Rendered ${listItems.length} items. If 7 appear, the component is reading getEvidenceStack().conclusions directly.`,
      ).toBe(2);
    },
  );
});
