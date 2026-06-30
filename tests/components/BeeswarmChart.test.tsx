// @vitest-environment jsdom

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

// Mock next-themes so resolvedTheme is stable (no ThemeProvider needed)
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import BeeswarmChart from "@/components/charts/BeeswarmChart";
import { generateAllCareerInsights } from "@/lib/data";

describe("BeeswarmChart", () => {
  it("renders SVG bee-dot circles for each occupation after d3 force mount", async () => {
    const data = generateAllCareerInsights();
    const { container } = render(<BeeswarmChart data={data} />);

    // d3 force simulation runs in a mount effect; circles are created by
    // .join("circle") once the effect fires, so waitFor is required.
    await waitFor(() => {
      expect(
        container.querySelectorAll("circle.bee-dot").length
      ).toBeGreaterThan(0);
    });
  });

  it("renders a non-empty screen-reader summary", () => {
    const data = generateAllCareerInsights();
    const { container } = render(<BeeswarmChart data={data} />);
    const summary = container.querySelector(".sr-only");
    expect(summary).not.toBeNull();
    expect((summary?.textContent ?? "").length).toBeGreaterThan(0);
  });

  it("renders sr-only occupation list with at least one link", async () => {
    const data = generateAllCareerInsights();
    const { container } = render(<BeeswarmChart data={data} />);
    await waitFor(() => {
      expect(container.querySelectorAll("ul.sr-only li a").length).toBeGreaterThan(0);
    });
  });
});
