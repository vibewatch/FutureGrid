// @vitest-environment jsdom

import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SourcesView from "@/components/sources/SourcesView";
import type { DataSource } from "@/lib/data";

vi.mock("@/components/ui/Reveal", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/i18n/useT", () => ({
  useT: () => (key: string) => key,
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
