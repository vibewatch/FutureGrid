// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SourcesView from "@/components/sources/SourcesView";
import type { DataSource } from "@/lib/data";

vi.mock("@/components/ui/Reveal", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

// Use a real EN locale so GuardrailBadge renders localized labels correctly.
vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => ({ locale: "en" as const, setLocale: vi.fn() }),
}));

const SOURCES: DataSource[] = [
  {
    name: "State WARN notices",
    publisher: "State public records",
    year: 2026,
    url: "https://example.com/warn",
    license: "Public Domain",
    usedFor: "Observed layoff notices",
  },
  {
    name: "OpenRouter model catalog",
    publisher: "OpenRouter",
    year: 2026,
    url: "https://example.com/openrouter",
    license: "Public catalog",
    usedFor: "Model catalog proxy for provider-country footprint",
  },
  {
    name: "Market AI Signals",
    publisher: "Restricted provider",
    year: 2026,
    url: "https://example.com/market",
    license: "Restricted terms",
    usedFor: "Restricted market context",
  },
  {
    name: "Benchmark comparison",
    publisher: "FutureGrid",
    year: 2026,
    url: "https://example.com/benchmark",
    license: "CC-BY 4.0",
    usedFor: "Descriptive context comparison",
  },
];

describe("SourcesView guardrail badges", () => {
  it("renders observed, proxy, restricted, and descriptive-only badges on source cards", () => {
    render(
      <SourcesView
        generatedAt="2026-07-06T00:00:00.000Z"
        snapshotDate="Jul 6, 2026"
        sources={SOURCES}
        note={null}
      />,
    );

    expect(screen.getAllByLabelText(/Observed: Provider or public-record observations/i).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/Proxy: Proxy or seed-derived signal/i).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/Restricted: Source terms restrict redistribution/i).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(/Descriptive-only: Descriptive context only/i).length).toBeGreaterThan(0);
  });
});

// D2 regression: the badge/link row must use flex-wrap and must not use shrink-0.
// Before the fix, shrink-0 prevented the badge + link row from wrapping on mobile
// (375px viewport), causing visible overflow at /sources.
describe("SourcesView — D2 mobile badge/link row containment", () => {
  it("badge/link container uses flex-wrap (not shrink-0) so it wraps on narrow viewports", () => {
    const { container } = render(
      <SourcesView
        generatedAt="2026-07-06T00:00:00.000Z"
        snapshotDate="Jul 6, 2026"
        sources={SOURCES}
        note={null}
      />,
    );

    // The badge+link row is a flex div inside each source card.
    // Post-fix: it must have flex-wrap (via Tailwind class "flex-wrap").
    const flexWrapRows = container.querySelectorAll("div.flex-wrap");
    expect(flexWrapRows.length, "Expected at least one div.flex-wrap in the sources list").toBeGreaterThan(0);

    // Post-fix: the badge/link container must NOT use shrink-0.
    // Check that none of the flex-wrap divs also carry shrink-0 (the pre-fix pattern).
    for (const row of Array.from(flexWrapRows)) {
      expect(
        row.classList.contains("shrink-0"),
        `A div.flex-wrap has shrink-0 class — this was the pre-fix pattern that caused mobile overflow`,
      ).toBe(false);
    }
  });
});
