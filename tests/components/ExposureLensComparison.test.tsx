// @vitest-environment jsdom
/**
 * tests/components/ExposureLensComparison.test.tsx
 *
 * Real component render assertions for ExposureLensComparison.
 * Verifies that the capability-usage gap is displayed in percentage-point
 * units ("pp") in visible/list output, not as a raw % that would imply
 * the gap is itself a percentage.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ExposureLensComparison from "@/components/insights/ExposureLensComparison";
import type { ExposureComparison, OccExposure } from "@/lib/analysis";

vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => ({ locale: "en" as const, setLocale: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

// ── Minimal fixture ───────────────────────────────────────────────────────────

const makeLeader = (overrides: Partial<OccExposure> = {}): OccExposure => ({
  code: "15-1252",
  name: "Software Developers",
  sector: "Computer and Mathematical",
  employment: 1_800_000,
  usage: 35.5,
  capability: 78.2,
  ability: 60.0,
  automation: 45.0,
  consensus: null,
  gap: 42.7,
  ...overrides,
});

const makeComparison = (occupations: OccExposure[] = []): ExposureComparison => ({
  occupations,
  lensesAvailable: ["usage", "capability", "ability", "automation"],
  coverage: { usage: 1, capability: 1, ability: 1, automation: 1 },
  correlations: [
    { a: "capability", b: "usage", r: 0.62, n: occupations.length },
  ],
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ExposureLensComparison — pp unit rendering", () => {
  it("shows gap leader gap values with pp unit in the leaderboard list (visible output)", () => {
    const leader = makeLeader({ gap: 42.7 });
    render(
      <ExposureLensComparison
        comparison={makeComparison([leader])}
        leaders={[leader]}
      />,
    );

    // The gap column in the leaderboard must display "pp" units, not raw "%"
    const ppValues = screen.getAllByText(/\+42\.7pp/);
    expect(ppValues.length).toBeGreaterThanOrEqual(1);
  });

  it("shows negative gap with pp unit correctly", () => {
    const leader = makeLeader({ gap: -5.3, capability: 30.0, usage: 35.3 });
    render(
      <ExposureLensComparison
        comparison={makeComparison([leader])}
        leaders={[leader]}
      />,
    );

    const rendered = document.body.textContent ?? "";
    // Negative gap: usage > capability
    expect(rendered).toMatch(/-5\.3pp/);
  });

  it("shows null gap as em-dash (—) not pp", () => {
    const leader = makeLeader({ gap: null });
    render(
      <ExposureLensComparison
        comparison={makeComparison([leader])}
        leaders={[leader]}
      />,
    );

    const rendered = document.body.textContent ?? "";
    expect(rendered).toMatch(/—/);
  });

  it("renders multiple leaders with pp unit on each gap value", () => {
    const leaders: OccExposure[] = [
      makeLeader({ code: "15-1252", name: "Software Developers", gap: 42.7 }),
      makeLeader({ code: "13-2011", name: "Accountants and Auditors", gap: 31.2, capability: 70, usage: 38.8 }),
      makeLeader({ code: "41-2031", name: "Retail Salespersons", gap: 28.0, capability: 55, usage: 27.0 }),
    ];
    render(
      <ExposureLensComparison
        comparison={makeComparison(leaders)}
        leaders={leaders}
      />,
    );

    // All three gap values in leaderboard should have pp suffix
    expect(screen.getByText(/\+42\.7pp/)).toBeInTheDocument();
    expect(screen.getByText(/\+31\.2pp/)).toBeInTheDocument();
    expect(screen.getByText(/\+28\.0pp/)).toBeInTheDocument();
  });

  it("renders the leaderboard gap column without raw % (percentage symbol) for gap values", () => {
    const leader = makeLeader({ gap: 42.7 });
    render(
      <ExposureLensComparison
        comparison={makeComparison([leader])}
        leaders={[leader]}
      />,
    );

    // The amber-coloured gap span uses formatPp, not formatPct
    // Find the specific gap column element (amber text)
    const gapSpans = document.querySelectorAll(".text-amber-600, .text-amber-300");
    const gapTexts = Array.from(gapSpans).map((el) => el.textContent ?? "");
    expect(gapTexts.some((t) => t.includes("pp"))).toBe(true);
    // None of the gap column values should end with bare "%"
    expect(gapTexts.every((t) => !t.match(/\d+\.\d+%$/))).toBe(true);
  });
});
