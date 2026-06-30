// @vitest-environment jsdom
//
// SkillFlowSankey — regression tests
//
// The d3-sankey layout runs in a mount effect. d3-sankey is configured with
// `.nodeId(d => d.id)`, so links MUST reference nodes by their string id. If
// the links are built with numeric indices instead, d3-sankey throws
// "missing: 0" and the whole page crashes (this previously took down /skills
// and /report in real browsers — jsdom's mocked ResizeObserver hid it, and the
// chart had no test). These tests render the chart and assert the graph was
// actually laid out, so the regression cannot silently return.

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

import SkillFlowSankey from "@/components/charts/SkillFlowSankey";

describe("SkillFlowSankey", () => {
  it("lays out the d3-sankey graph without throwing (regression: 'missing: 0')", async () => {
    const { container } = render(<SkillFlowSankey />);

    // Links only exist if d3-sankey successfully resolved every link's
    // source/target node id. A "missing: <id>" throw would leave the SVG empty.
    await waitFor(() => {
      expect(
        container.querySelectorAll("path.sankey-link").length
      ).toBeGreaterThan(0);
    });

    // Nodes for both the high-exposure sources and resilient targets.
    expect(
      container.querySelectorAll("rect.sankey-node").length
    ).toBeGreaterThan(0);
  });

  it("renders a non-empty screen-reader summary", () => {
    const { container } = render(<SkillFlowSankey />);
    const summary = container.querySelector(".sr-only");
    expect(summary).not.toBeNull();
    expect((summary?.textContent ?? "").length).toBeGreaterThan(0);
  });
});
