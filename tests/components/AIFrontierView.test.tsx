// @vitest-environment jsdom
//
// tests/components/AIFrontierView.test.tsx
//
// AIFrontierView — hero + section orchestration. This suite focuses on the NEW
// decorative violet hero sparklines on the two compute stat cards.
//
// Strategy (mirrors VisaTrendsView.test.tsx):
// - next/dynamic is mocked to render each chart's loading stub synchronously, so
//   the heavy d3/canvas chart bodies never mount. The hero stat cards (and their
//   sparklines) are rendered directly, so they are always present.
// - next-themes + LanguageProvider are mocked so useTheme/useT resolve.
// - The Sparkline is the only element that renders an SVG <polyline>, which lets
//   us count/inspect sparklines unambiguously.

import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { frontierEn } from "@/lib/i18n/messages/en/frontier";

// ── Framework mocks ───────────────────────────────────────────────────────────

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

vi.mock("next/dynamic", () => ({
  default: (_loader: unknown, options?: { loading?: () => ReactNode }) => {
    const DynamicStub = () => options?.loading?.() ?? <div data-testid="chart-stub" />;
    return DynamicStub;
  },
}));

const mockUseLanguage = vi.fn(() => ({
  locale: "en" as "en" | "zh",
  setLocale: vi.fn(),
}));
vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
}));

import AIFrontierView from "@/components/frontier/AIFrontierView";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sparklines are the only SVGs that contain a <polyline>. */
function sparklineSvgs(container: HTMLElement): SVGSVGElement[] {
  return Array.from(container.querySelectorAll("svg")).filter(
    (svg) => svg.querySelector("polyline") !== null,
  );
}

function cardFor(label: string): HTMLElement {
  const labelEl = screen.getByText(label);
  const card = labelEl.closest("div");
  expect(card, `stat card for '${label}' must exist`).not.toBeNull();
  return card as HTMLElement;
}

describe("AIFrontierView — hero sparklines", () => {
  beforeEach(() => {
    mockUseLanguage.mockReturnValue({ locale: "en", setLocale: vi.fn() });
  });

  it("renders exactly two decorative sparklines (the two compute stat cards)", () => {
    const { container } = render(<AIFrontierView />);
    expect(sparklineSvgs(container).length, "two compute stat cards carry sparklines").toBe(2);
  });

  it("every sparkline SVG is decorative (aria-hidden='true')", () => {
    const { container } = render(<AIFrontierView />);
    const sparks = sparklineSvgs(container);
    expect(sparks.length).toBeGreaterThan(0);
    for (const svg of sparks) {
      expect(svg.getAttribute("aria-hidden"), "sparklines must be aria-hidden").toBe("true");
      expect(svg.getAttribute("role"), "sparklines must NOT be role='img'").toBeNull();
    }
  });

  it("the statSparklineSrHint sr-only text accompanies each sparkline", () => {
    render(<AIFrontierView />);
    const hints = screen.getAllByText(frontierEn.statSparklineSrHint);
    expect(hints.length, "one sr-only hint per sparkline").toBe(2);
    for (const hint of hints) {
      expect(hint.className, "sparkline hint must be sr-only").toContain("sr-only");
    }
  });

  it("the compute stat cards still render their numeric value as accessible (non-hidden) content", () => {
    render(<AIFrontierView />);
    // Doubling-time card: value like "~N months" — visible, not aria-hidden.
    const doublingCard = cardFor(frontierEn.statDoublingLabel);
    expect(doublingCard.textContent ?? "").toMatch(/months|—/);
    const doublingSpark = doublingCard.querySelector("svg");
    if (doublingSpark) {
      expect(doublingSpark.getAttribute("aria-hidden")).toBe("true");
    }

    // Largest-run card: value is a formatted FLOP string — visible.
    const largestCard = cardFor(frontierEn.statLargestLabel);
    expect((largestCard.textContent ?? "").length).toBeGreaterThan(
      frontierEn.statLargestLabel.length,
    );
  });

  it("stat cards without a data series render NO sparkline (no broken/empty sparkline)", () => {
    render(<AIFrontierView />);
    // The "Compute-known records" and "Top country" cards receive no `spark` prop.
    const modelsCard = cardFor(frontierEn.statModelsLabel);
    const topCountryCard = cardFor(frontierEn.statFrontierLabel);
    expect(
      modelsCard.querySelector("polyline"),
      "records card must have no sparkline",
    ).toBeNull();
    expect(
      topCountryCard.querySelector("polyline"),
      "top-country card must have no sparkline",
    ).toBeNull();
  });
});
