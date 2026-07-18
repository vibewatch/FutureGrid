// @vitest-environment jsdom
//
// tests/components/FrontierOriginsMap.test.tsx
//
// FrontierOriginsMap — world choropleth (d3-geo, runtime geometry fetch).
//
// Strategy (mirrors WorldChoropleth.test.tsx + FrontierLeadersChart.test.tsx):
// - global.fetch is mocked to return the REAL public/world-countries.geo.json so
//   d3-geo can compute projection paths deterministically and offline.
// - next-themes and the LanguageProvider are mocked so useTheme/useT resolve
//   without providers.
// - The decorative SVG is aria-hidden and its descendants are hidden from the
//   accessibility tree, so we assert on it with container.querySelector.
// - The accessible <table> does NOT depend on geometry, so it renders even if
//   the fetch never resolves / rejects.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within, waitFor, fireEvent } from "@testing-library/react";
import {
  getCountryLeaderboardGeo,
  getCountryGeoCoverage,
} from "@/lib/ai-frontier";
import { frontierEn } from "@/lib/i18n/messages/en/frontier";

// ── The real world geometry, loaded once (offline, deterministic) ─────────────

const REAL_GEO = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "public/world-countries.geo.json"),
    "utf8",
  ),
);

function makeFetchMock() {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(REAL_GEO),
  });
}

// ── Framework mocks ───────────────────────────────────────────────────────────

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

const mockUseLanguage = vi.fn(() => ({
  locale: "en" as "en" | "zh",
  setLocale: vi.fn(),
}));
vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

async function importComponent() {
  const { default: FrontierOriginsMap } = await import(
    "@/components/frontier/FrontierOriginsMap"
  );
  return FrontierOriginsMap;
}

function reapplySetupGlobals() {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

describe("FrontierOriginsMap", () => {
  beforeEach(() => {
    mockUseLanguage.mockReturnValue({ locale: "en", setLocale: vi.fn() });
    vi.stubGlobal("fetch", makeFetchMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    reapplySetupGlobals();
  });

  // ── Accessible table (geometry-independent) ─────────────────────────────────

  it("renders the accessible data table (queryable by role) with the localized caption", async () => {
    const FrontierOriginsMap = await importComponent();
    render(<FrontierOriginsMap />);
    const table = screen.getByRole("table", { name: frontierEn.mapTableCaption });
    expect(table).toBeInTheDocument();
  });

  it("renders exactly one table body row per geo country for the default metric", async () => {
    const FrontierOriginsMap = await importComponent();
    const { container } = render(<FrontierOriginsMap />);
    const expectedRows = getCountryLeaderboardGeo().length;
    const bodyRows = container.querySelectorAll("table tbody tr");
    expect(bodyRows.length, "one accessible table row per plottable country").toBe(
      expectedRows,
    );
  });

  it("the table renders even when geometry fetch rejects (table does not depend on the map)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const FrontierOriginsMap = await importComponent();
    const { container } = render(<FrontierOriginsMap />);
    const expectedRows = getCountryLeaderboardGeo().length;
    await waitFor(() => {
      expect(container.querySelectorAll("table tbody tr").length).toBe(expectedRows);
    });
  });

  // ── WCAG regression guard: decorative map SVG ───────────────────────────────

  it("WCAG guard: the map SVG is aria-hidden, has NO role='img', and NO focusable/interactive descendants", async () => {
    const FrontierOriginsMap = await importComponent();
    const { container } = render(<FrontierOriginsMap />);

    // The map SVG only renders after geometry loads.
    await waitFor(() => {
      expect(container.querySelector("svg")).not.toBeNull();
    });

    const svg = container.querySelector("svg")!;

    // aria-hidden decorative
    expect(svg.getAttribute("aria-hidden"), "map SVG must be aria-hidden").toBe("true");

    // NOT exposed as an image to AT
    expect(svg.getAttribute("role"), "map SVG must NOT have role='img'").toBeNull();
    expect(
      svg.querySelector('[role="img"]'),
      "map SVG must contain NO role='img' descendant",
    ).toBeNull();

    // No focusable / interactive elements inside the decorative SVG
    const focusable = svg.querySelectorAll(
      'a, button, [tabindex], [role="button"], [role="link"], [focusable="true"]',
    );
    expect(
      focusable.length,
      "decorative map SVG must contain NO focusable/interactive elements",
    ).toBe(0);

    // Country paths carry no role (not individually announced)
    const paths = svg.querySelectorAll("path");
    expect(paths.length, "map should render country paths").toBeGreaterThan(0);
    for (const p of Array.from(paths)) {
      expect(p.getAttribute("role"), "country paths must have NO role").toBeNull();
      expect(p.getAttribute("tabindex"), "country paths must NOT be focusable").toBeNull();
    }
  });

  // ── Metric toggle ───────────────────────────────────────────────────────────

  it("renders the three fair-metric toggle buttons with recentCount pressed by default", async () => {
    const FrontierOriginsMap = await importComponent();
    const { container } = render(<FrontierOriginsMap />);
    const group = container.querySelector('[role="group"]')!;
    expect(group, "metric selector group must be present").not.toBeNull();

    const labels = Array.from(group.querySelectorAll("button[aria-pressed]")).map(
      (b) => b.textContent,
    );
    expect(labels).toEqual([
      frontierEn.metricRecentCount,
      frontierEn.metricModelCount,
      frontierEn.metricOpenWeightsCount,
    ]);

    const pressed = Array.from(
      group.querySelectorAll('button[aria-pressed="true"]'),
    );
    expect(pressed.length, "exactly one metric pressed by default").toBe(1);
    expect(pressed[0].textContent).toBe(frontierEn.metricRecentCount);
  });

  it("switching metric updates the table values (recentCount → modelCount → openWeightsCount)", async () => {
    const FrontierOriginsMap = await importComponent();
    const { container } = render(<FrontierOriginsMap />);

    const entries = getCountryLeaderboardGeo();
    const topRecent = Math.max(...entries.map((e) => e.recentCount));
    const topModel = Math.max(...entries.map((e) => e.modelCount));
    const topOpen = Math.max(...entries.map((e) => e.openWeightsCount));

    function firstRowValue(): string {
      const firstRow = container.querySelector("table tbody tr")!;
      const valueCell = within(firstRow as HTMLElement).getAllByRole("cell")[0];
      return (valueCell.textContent ?? "").trim();
    }

    const group = container.querySelector('[role="group"]')!;
    const btn = (label: string) =>
      Array.from(group.querySelectorAll("button[aria-pressed]")).find(
        (b) => b.textContent === label,
      )!;

    // Default: recentCount
    expect(firstRowValue()).toBe(topRecent.toLocaleString());

    fireEvent.click(btn(frontierEn.metricModelCount));
    expect(firstRowValue()).toBe(topModel.toLocaleString());

    fireEvent.click(btn(frontierEn.metricOpenWeightsCount));
    expect(firstRowValue()).toBe(topOpen.toLocaleString());

    // The three top values must be genuinely distinguishable metrics.
    expect(new Set([topRecent, topModel, topOpen]).size).toBeGreaterThan(1);
  });

  // ── Coverage note & disclaimers ─────────────────────────────────────────────

  it("renders the coverage note with the real mapped/total/unmapped numbers (no unresolved tokens)", async () => {
    const FrontierOriginsMap = await importComponent();
    render(<FrontierOriginsMap />);
    const cov = getCountryGeoCoverage();
    const expected = frontierEn.mapCoverageNote
      .replace("{mapped}", String(cov.mapped))
      .replace("{total}", String(cov.total))
      .replace("{unmapped}", String(cov.unmapped));
    expect(screen.getByText(expected)).toBeInTheDocument();

    const bodyText = document.body.textContent ?? "";
    expect(bodyText.match(/\{[a-zA-Z]+\}/g), "no unresolved interpolation tokens").toBeNull();
  });

  it("renders the dataDisclaimer and the countryAttributionNote", async () => {
    const FrontierOriginsMap = await importComponent();
    render(<FrontierOriginsMap />);
    expect(screen.getByText(frontierEn.dataDisclaimer)).toBeInTheDocument();
    expect(screen.getByText(frontierEn.countryAttributionNote)).toBeInTheDocument();
  });
});
