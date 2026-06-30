// @vitest-environment jsdom
//
// QuadrantScatterChart — regression tests
//
// The d3 scatter-plot effect joins CareerInsight data to circle.qsc-dot
// elements. If d3 throws (e.g. bad scale domain, missing data fields), the
// circles are never appended and the test fails — guarding against layout
// regressions before they reach production.

import { describe, it, expect, vi } from "vitest";
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

import QuadrantScatterChart from "@/components/charts/QuadrantScatterChart";

describe("QuadrantScatterChart", () => {
  it("renders d3 scatter circles (circle.qsc-dot) without throwing", async () => {
    const { container } = render(<QuadrantScatterChart />);

    // circle.qsc-dot — one SVG circle per occupation, joined by d3.
    // Presence proves the xScale/yScale domains were valid and the effect ran.
    await waitFor(() => {
      expect(
        container.querySelectorAll("circle.qsc-dot").length
      ).toBeGreaterThan(0);
    });
  });

  it("renders a non-empty screen-reader occupation list", () => {
    const { container } = render(<QuadrantScatterChart />);
    // The sr-only <ul> is rendered synchronously via React JSX from all
    // CareerInsight data; it must not be empty.
    const list = container.querySelector("ul.sr-only");
    expect(list).not.toBeNull();
    expect(list?.querySelectorAll("li").length).toBeGreaterThan(0);
  });
});
