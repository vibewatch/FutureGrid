// @vitest-environment jsdom
//
// tests/components/ComputeTimelineChart.test.tsx
//
// ComputeTimelineChart — d3 scatter of training compute over time, upgraded with
// an amber compute-frontier envelope, a screen-reader summary, and an
// envelopeLabel/definition caption.
//
// Strategy:
// - next-themes + LanguageProvider are mocked so useTheme/useT resolve.
// - jsdom does not implement SVGPathElement.getTotalLength (used by the non-
//   reduced stroke-draw animation), so we polyfill it to a finite number.
// - matchMedia defaults to matches:false (setup.ts). A dedicated test forces the
//   reduced-motion branch by returning matches:true, and asserts the final
//   (non-animated) state is rendered.
// - d3 draws into a real ref'd <svg>; we assert on the produced DOM.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { getComputeModels } from "@/lib/ai-frontier";
import { frontierEn } from "@/lib/i18n/messages/en/frontier";

// ── Framework mocks ───────────────────────────────────────────────────────────

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

const mockUseLanguage = vi.fn(() => ({
  locale: "en" as "en" | "zh",
  setLocale: vi.fn(),
}));
vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

async function importComponent() {
  const { default: ComputeTimelineChart } = await import(
    "@/components/frontier/ComputeTimelineChart"
  );
  return ComputeTimelineChart;
}

function stubMatchMedia(reducedMotion: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reducedMotion && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe("ComputeTimelineChart", () => {
  beforeEach(() => {
    mockUseLanguage.mockReturnValue({ locale: "en", setLocale: vi.fn() });
    stubMatchMedia(false);
    // jsdom lacks getTotalLength (SVG path elements are plain SVGElement) —
    // required by the (default, non-reduced) stroke-draw animation.
    const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
    (pathEl.constructor.prototype as unknown as { getTotalLength: () => number }).getTotalLength =
      () => 100;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    stubMatchMedia(false);
  });

  // ── Envelope: sr-only summary + label/definition caption ────────────────────

  it("renders the envelope screen-reader summary (envelopeSrSummary)", async () => {
    const ComputeTimelineChart = await importComponent();
    render(<ComputeTimelineChart />);
    expect(screen.getByText(frontierEn.envelopeSrSummary)).toBeInTheDocument();
  });

  it("renders the envelopeLabel + envelopeDefinition caption", async () => {
    const ComputeTimelineChart = await importComponent();
    render(<ComputeTimelineChart />);
    // Definition text is unique to the caption.
    expect(screen.getByText(frontierEn.envelopeDefinition)).toBeInTheDocument();
    // The envelopeLabel appears at least once (caption prefix).
    expect(screen.getAllByText(new RegExp(frontierEn.envelopeLabel, "i")).length).toBeGreaterThan(0);
  });

  it("draws the amber compute-frontier envelope group with area + line paths", async () => {
    const ComputeTimelineChart = await importComponent();
    const { container } = render(<ComputeTimelineChart />);
    const envelope = container.querySelector("g.compute-envelope");
    expect(envelope, "compute-frontier envelope group must be drawn").not.toBeNull();
    expect(
      envelope!.querySelectorAll("path").length,
      "envelope draws an area fill and a top line",
    ).toBeGreaterThanOrEqual(2);
  });

  // ── Existing scatter + trend-line assertions still pass ─────────────────────

  it("renders the scatter dots (non-frontier + frontier) from the compute-known catalog", async () => {
    const ComputeTimelineChart = await importComponent();
    const { container } = render(<ComputeTimelineChart />);

    const models = getComputeModels();
    const frontierCount = models.filter((m) => m.frontier).length;
    const nonFrontierCount = models.filter((m) => !m.frontier).length;

    expect(container.querySelectorAll("g.non-frontier circle").length).toBe(nonFrontierCount);
    expect(container.querySelectorAll("g.frontier-dots circle.dot").length).toBe(frontierCount);
  });

  it("renders the modern-era trend line (dashed 7,4 stroke)", async () => {
    const ComputeTimelineChart = await importComponent();
    const { container } = render(<ComputeTimelineChart />);
    const trend = container.querySelectorAll('path[stroke-dasharray="7,4"]');
    expect(trend.length, "modern-era trend line must be drawn").toBeGreaterThanOrEqual(1);
  });

  it("the chart SVG is an accessible image (role='img' + aria-label) backed by the sr summary/list", async () => {
    const ComputeTimelineChart = await importComponent();
    const { container } = render(<ComputeTimelineChart />);
    const svg = container.querySelector("svg[role='img']");
    expect(svg, "the data chart is exposed as an accessible image").not.toBeNull();
    expect(svg!.getAttribute("aria-label")).toBe(frontierEn.timelineSectionTitle);
  });

  // ── Reduced-motion path renders final state ─────────────────────────────────

  it("reduced-motion path renders the final (non-animated) frontier dots", async () => {
    stubMatchMedia(true);
    const ComputeTimelineChart = await importComponent();
    const { container } = render(<ComputeTimelineChart />);

    const dots = container.querySelectorAll("g.frontier-dots circle.dot");
    expect(dots.length, "frontier dots must be drawn").toBeGreaterThan(0);
    // Under reduced motion the entrance animation is skipped: radius is final (5.5),
    // never the animated start value of 0.
    for (const dot of Array.from(dots)) {
      expect(dot.getAttribute("r"), "reduced-motion dots must render at final radius").toBe("5.5");
    }
    // Envelope still renders its final state.
    expect(container.querySelector("g.compute-envelope")).not.toBeNull();
  });
});
