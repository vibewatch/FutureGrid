// @vitest-environment jsdom
//
// BarChartRace — regression tests
//
// The d3 race-chart effect builds track rects (background) and bar-fill rects
// (colored bars) in a single useEffect keyed on yearIdx + frames. If the data
// layer fails to produce frames, or d3 throws during layout, the SVG stays
// empty and these tests fail — surfacing the regression before it hits users.

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, waitFor } from "@testing-library/react";

// Mock next/navigation so useRouter doesn't crash in jsdom
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

import BarChartRace from "@/components/charts/BarChartRace";

// BarChartRace has no d3 transition cleanup in its useEffect. d3-interpolate's
// parseSvg() calls SVGElement.transform.baseVal.consolidate(), but jsdom does
// not implement SVGElement.transform (it is undefined). Polyfilling it to
// return null from consolidate() causes parseSvg to fall back to the identity
// transform, silencing the post-teardown unhandled exceptions from d3's rAF
// transition callbacks without affecting what is actually asserted on.
beforeAll(() => {
  if (typeof SVGElement !== "undefined" && !("transform" in SVGElement.prototype)) {
    Object.defineProperty(SVGElement.prototype, "transform", {
      configurable: true,
      get() {
        return { baseVal: { consolidate: () => null } };
      },
    });
  }
});

describe("BarChartRace", () => {
  it("renders d3 bar-fill rects and background track rects without throwing", async () => {
    const { container } = render(<BarChartRace />);

    // rect.track — background rank slots drawn immediately (no transition);
    // rect.bar-fill — colored employment bars, entered via d3 join.
    // Both are appended to the DOM as soon as the mount effect runs.
    await waitFor(() => {
      expect(
        container.querySelectorAll("rect.bar-fill").length
      ).toBeGreaterThan(0);
    });

    expect(
      container.querySelectorAll("rect.track").length
    ).toBeGreaterThan(0);
  });

  it("renders play/pause and replay control buttons", () => {
    const { container } = render(<BarChartRace />);
    // The controls are rendered via React JSX (not d3) and are always present
    // when frames exist. At minimum: Replay + Play/Pause = 2 buttons.
    expect(container.querySelectorAll("button").length).toBeGreaterThanOrEqual(2);
  });
});
