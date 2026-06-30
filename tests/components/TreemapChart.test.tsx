// @vitest-environment jsdom
//
// TreemapChart — regression tests
//
// The d3 treemap layout runs in a mount useEffect. It calls d3.treemap() on a
// hierarchy of sectors → occupations, then appends rect.tm-rect elements (one
// per leaf occupation tile). If the layout throws or produces an empty root,
// no rects appear and the test fails — catching the regression before release.

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

import TreemapChart from "@/components/charts/TreemapChart";

describe("TreemapChart", () => {
  it("lays out d3 treemap leaf cells (rect.tm-rect) without throwing", async () => {
    const { container } = render(<TreemapChart />);

    // rect.tm-rect — one colored rect per occupation tile appended by d3 join.
    // Existence proves treemap layout succeeded and produced leaf nodes.
    await waitFor(() => {
      expect(
        container.querySelectorAll("rect.tm-rect").length
      ).toBeGreaterThan(0);
    });
  });

  it("renders a non-empty screen-reader summary", () => {
    const { container } = render(<TreemapChart />);
    const summary = container.querySelector(".sr-only");
    expect(summary).not.toBeNull();
    expect((summary?.textContent ?? "").length).toBeGreaterThan(0);
  });
});
