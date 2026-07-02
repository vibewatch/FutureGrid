// @vitest-environment jsdom
//
// ChartA11y — accessibility assertions for chart components
//
// Each test verifies that the chart wraps its primary content in an accessible
// region (role="img" + aria-label OR <figure aria-label>) AND provides a
// visually-hidden text / table alternative (sr-only).
//
// Scope: CareerTrendChart, JobImpactChart, SkillTransitionChart, PredictiveChart,
// and the AccessibleChart primitive itself.
//
// Note: Chart.js (<Bar>, <Line>) requires a canvas element. jsdom does not
// implement the Canvas API but Chart.js renders gracefully to a 0×0 element,
// so the wrapping accessible markup is still emitted and can be asserted.

import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

// ── Mocks required by chart components ───────────────────────────────────────

// Mock next/navigation (used by charts that import useRouter)
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

// Mock next-themes so resolvedTheme is stable without a ThemeProvider
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

// ── Imports (after mocks) ─────────────────────────────────────────────────────

import AccessibleChart from "@/components/charts/AccessibleChart";
import CareerTrendChart from "@/components/charts/CareerTrendChart";
import JobImpactChart from "@/components/charts/JobImpactChart";
import PredictiveChart from "@/components/charts/PredictiveChart";
import SkillTransitionChart from "@/components/charts/SkillTransitionChart";

// ── AccessibleChart primitive ─────────────────────────────────────────────────

describe("AccessibleChart primitive", () => {
  it("renders a <figure> with the provided aria-label", () => {
    const { container } = render(
      <AccessibleChart label="Test chart label" summary="Test summary">
        <div data-testid="child">Chart content</div>
      </AccessibleChart>,
    );
    const fig = container.querySelector("figure");
    expect(fig).not.toBeNull();
    expect(fig?.getAttribute("aria-label")).toBe("Test chart label");
  });

  it("renders an sr-only <figcaption> with the summary text", () => {
    const { container } = render(
      <AccessibleChart label="Label" summary="Accessible summary text">
        <div />
      </AccessibleChart>,
    );
    const fc = container.querySelector("figcaption.sr-only");
    expect(fc).not.toBeNull();
    expect(fc?.textContent).toContain("Accessible summary text");
  });

  it("renders children inside the figure", () => {
    const { container } = render(
      <AccessibleChart label="L" summary="S">
        <span data-testid="inner">inner</span>
      </AccessibleChart>,
    );
    expect(container.querySelector("[data-testid='inner']")).not.toBeNull();
  });
});

// ── CareerTrendChart ──────────────────────────────────────────────────────────

describe("CareerTrendChart accessibility", () => {
  it("wraps the chart in a <figure> with a non-empty aria-label", () => {
    const { container } = render(<CareerTrendChart />);
    const fig = container.querySelector("figure[aria-label]");
    expect(fig).not.toBeNull();
    const label = fig?.getAttribute("aria-label") ?? "";
    expect(label.length).toBeGreaterThan(0);
  });

  it("provides an sr-only <figcaption> summary", () => {
    const { container } = render(<CareerTrendChart />);
    const fc = container.querySelector("figcaption.sr-only");
    expect(fc).not.toBeNull();
    expect((fc?.textContent ?? "").length).toBeGreaterThan(0);
  });

  it("includes an sr-only data table with sector rows", () => {
    const { container } = render(<CareerTrendChart />);
    const table = container.querySelector("figcaption.sr-only table");
    expect(table).not.toBeNull();
    const rows = table?.querySelectorAll("tbody tr") ?? [];
    expect(rows.length).toBeGreaterThan(0);
  });
});

// ── JobImpactChart ────────────────────────────────────────────────────────────

describe("JobImpactChart accessibility", () => {
  it("wraps the chart in a <figure> with a non-empty aria-label", () => {
    const { container } = render(<JobImpactChart />);
    const fig = container.querySelector("figure[aria-label]");
    expect(fig).not.toBeNull();
    const label = fig?.getAttribute("aria-label") ?? "";
    expect(label.length).toBeGreaterThan(0);
  });

  it("provides an sr-only <figcaption> summary", () => {
    const { container } = render(<JobImpactChart />);
    const fc = container.querySelector("figcaption.sr-only");
    expect(fc).not.toBeNull();
    expect((fc?.textContent ?? "").length).toBeGreaterThan(0);
  });

  it("includes an sr-only data table with occupation rows", () => {
    const { container } = render(<JobImpactChart />);
    const table = container.querySelector("figcaption.sr-only table");
    expect(table).not.toBeNull();
    const rows = table?.querySelectorAll("tbody tr") ?? [];
    expect(rows.length).toBeGreaterThan(0);
  });

  it("SVG inside the chart is aria-hidden (visual only)", () => {
    const { container } = render(<JobImpactChart />);
    // The SVG is decorated with aria-hidden="true" since the figure carries the role
    const svg = container.querySelector("figure svg[aria-hidden='true']");
    expect(svg).not.toBeNull();
  });
});

// ── SkillTransitionChart ──────────────────────────────────────────────────────

describe("SkillTransitionChart accessibility", () => {
  it("wraps the chart in a <figure> with a non-empty aria-label", () => {
    const { container } = render(<SkillTransitionChart />);
    const fig = container.querySelector("figure[aria-label]");
    expect(fig).not.toBeNull();
    const label = fig?.getAttribute("aria-label") ?? "";
    expect(label.length).toBeGreaterThan(0);
  });

  it("provides an sr-only <figcaption> summary", () => {
    const { container } = render(<SkillTransitionChart />);
    const fc = container.querySelector("figcaption.sr-only");
    expect(fc).not.toBeNull();
    expect((fc?.textContent ?? "").length).toBeGreaterThan(0);
  });
});

// ── PredictiveChart ───────────────────────────────────────────────────────────

describe("PredictiveChart accessibility", () => {
  it("SVG has role=img and a non-empty aria-label", () => {
    const { container } = render(<PredictiveChart />);
    const svg = container.querySelector('svg[role="img"]');
    expect(svg).not.toBeNull();
    const label = svg?.getAttribute("aria-label") ?? "";
    expect(label.length).toBeGreaterThan(0);
  });

  it("renders an sr-only summary span", () => {
    const { container } = render(<PredictiveChart />);
    const srEls = container.querySelectorAll(".sr-only");
    // At least one sr-only element should be present and non-empty
    const nonEmpty = Array.from(srEls).some((el) => (el.textContent ?? "").length > 0);
    expect(nonEmpty).toBe(true);
  });
});
