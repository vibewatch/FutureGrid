// @vitest-environment jsdom
/**
 * tests/components/EmploymentForecastChart.test.tsx
 *
 * Validates that the EmploymentForecastChart component:
 *  1. Renders without crashing
 *  2. Displays the required illustrative/what-if caveat near the scenario controls
 *  3. Does NOT overclaim calibrated/empirical/forecast status for the drag formula
 *  4. Preserves the BLS baseline distinction in rendered text
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";

// ── Framework mocks ────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => "/analysis",
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// ── Fixture ────────────────────────────────────────────────────────────────────

import type { NationalForecast, OccupationForecast, SignalPoint, ForecastPoint } from "@/lib/analysis";

function makeForecastPoints(startYear: number, endYear: number, baseValue: number, projected: boolean): ForecastPoint[] {
  return Array.from({ length: endYear - startYear + 1 }, (_, i) => ({
    year: startYear + i,
    value: Math.round(baseValue * (1 + 0.01 * i)),
    projected,
  }));
}

function buildNationalFixture(): NationalForecast {
  const baseline = makeForecastPoints(2025, 2030, 152_000_000, true);
  const aiAdjusted = makeForecastPoints(2025, 2030, 151_000_000, true);
  return {
    history: makeForecastPoints(2016, 2024, 150_000_000, false),
    baseline,
    aiAdjusted,
    totalBaseline2030: baseline.at(-1)?.value ?? 0,
    totalAiAdjusted2030: aiAdjusted.at(-1)?.value ?? 0,
    deltaJobs2030: -800_000,
  };
}

function buildSignalPoints(): SignalPoint[] {
  return [
    { code: "15-1252", name: "Software Developers", sector: "Technology", exposure: 72, employment: 1_840_000, empGrowth: 1.8, wageGrowth: 2.1 },
  ];
}

function buildForecasts(): Record<string, OccupationForecast> {
  return {
    "15-1252": {
      code: "15-1252",
      name: "Software Developers",
      sector: "Technology",
      exposure: 72,
      cagr: 1.8,
      history: makeForecastPoints(2016, 2024, 1_500_000, false),
      baseline: makeForecastPoints(2025, 2030, 1_840_000, true),
      aiAdjusted: makeForecastPoints(2025, 2030, 1_800_000, true),
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

async function importForecastChart(): Promise<ComponentType<{
  national: NationalForecast;
  signalPoints: SignalPoint[];
  forecasts: Record<string, OccupationForecast>;
}>> {
  const mod = await import("@/components/insights/EmploymentForecastChart");
  return mod.default;
}

afterEach(() => cleanup());

// ── Basic rendering ────────────────────────────────────────────────────────────

describe("EmploymentForecastChart basic rendering", () => {
  it("renders without throwing", async () => {
    const ForecastChart = await importForecastChart();
    expect(() =>
      render(
        <ForecastChart
          national={buildNationalFixture()}
          signalPoints={buildSignalPoints()}
          forecasts={buildForecasts()}
        />,
      ),
    ).not.toThrow();
  });
});

// ── Scenario caveat ────────────────────────────────────────────────────────────

describe("EmploymentForecastChart scenario caveat", () => {
  it("renders a visible what-if / illustrative caveat near the scenario controls", async () => {
    const ForecastChart = await importForecastChart();
    const { container } = render(
      <ForecastChart
        national={buildNationalFixture()}
        signalPoints={buildSignalPoints()}
        forecasts={buildForecasts()}
      />,
    );
    const text = container.textContent ?? "";

    expect(
      text,
      "Component must display a caveat indicating the scenario is illustrative or a what-if assumption",
    ).toMatch(/illustrative|what.if|assumption|not.*calibrated|user.adjustable/i);
  });

  it("caveat mentions that 4% annual drag is an assumption, not an empirical calibration", async () => {
    const ForecastChart = await importForecastChart();
    const { container } = render(
      <ForecastChart
        national={buildNationalFixture()}
        signalPoints={buildSignalPoints()}
        forecasts={buildForecasts()}
      />,
    );
    const text = container.textContent ?? "";

    // The caveat must acknowledge the formula is illustrative/not-calibrated.
    expect(
      text,
      "Caveat must clarify the drag formula is not empirically calibrated",
    ).toMatch(/not.*calibrat|illustrative|assumption|what.if/i);
  });

  it("caveat explicitly NOT using overclaiming language (calibrated, empirical, proven forecast)", async () => {
    const ForecastChart = await importForecastChart();
    const { container } = render(
      <ForecastChart
        national={buildNationalFixture()}
        signalPoints={buildSignalPoints()}
        forecasts={buildForecasts()}
      />,
    );
    const text = container.textContent ?? "";

    // These patterns check for AFFIRMATIVE overclaims — they should never appear.
    // "not empirically calibrated" in the caveat is correct and should not trigger these.
    const BANNED_OVERCLAIM = [
      { label: "is an empirically calibrated forecast (positive claim)", pattern: /\bis (an?|the) empirically calibrated forecast\b/i },
      { label: "proven forecast", pattern: /\bproven\s+forecast\b/i },
      { label: "FutureGrid prediction (positive assertion)", pattern: /\b(?:this is|these are) (?:a |the )?FutureGrid predictions?\b/i },
      { label: "guarantees job losses", pattern: /guarantees? job loss/i },
    ];

    for (const { label, pattern } of BANNED_OVERCLAIM) {
      expect(
        text,
        `Component must NOT use overclaiming language: "${label}"`,
      ).not.toMatch(pattern);
    }
  });

  it("preserves the BLS baseline distinction in rendered text", async () => {
    const ForecastChart = await importForecastChart();
    const { container } = render(
      <ForecastChart
        national={buildNationalFixture()}
        signalPoints={buildSignalPoints()}
        forecasts={buildForecasts()}
      />,
    );
    const text = container.textContent ?? "";

    // The component must distinguish the BLS-derived Baseline from the AI-adjusted scenario.
    expect(
      text,
      "Component must render 'Baseline' or 'BLS' to distinguish the BLS-derived projection from the AI-adjusted scenario",
    ).toMatch(/Baseline|BLS/i);
  });

  it("caveat is screen-reader accessible via role=note or aria-label", async () => {
    const ForecastChart = await importForecastChart();
    const { container } = render(
      <ForecastChart
        national={buildNationalFixture()}
        signalPoints={buildSignalPoints()}
        forecasts={buildForecasts()}
      />,
    );

    const caveats = Array.from(
      container.querySelectorAll('[role="note"], [aria-label*="illustrative"], [aria-label*="assumption"], [aria-label*="what-if"]'),
    );
    expect(
      caveats.length,
      "Caveat element must have role='note' or an accessible aria-label for screen readers",
    ).toBeGreaterThan(0);
  });
});
