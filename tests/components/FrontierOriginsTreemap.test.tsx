// @vitest-environment jsdom
//
// tests/components/FrontierOriginsTreemap.test.tsx
//
// FrontierOriginsTreemap — "Where Tracked Models Are Developed" redesigned from a
// world choropleth into a share/concentration TREEMAP (d3.treemap, pure prerendered
// SVG — NO runtime geojson fetch, NO Chart.js/canvas).
//
// This file replaces the deleted tests/components/FrontierOriginsMap.test.tsx.
// The map-specific assertions (choropleth country paths, geojson fetch mock,
// legend gradient, mapCoverageNote {mapped}{total}{unmapped}) are intentionally
// gone; in their place are the treemap's regression guards.
//
// Strategy (mirrors FrontierLeadersChart.test.tsx):
// - next-themes + the LanguageProvider are mocked so useTheme/useT resolve
//   without providers.
// - The component is imported dynamically after the mocks are registered.
// - CRUCIALLY: NO global.fetch mock is installed. The treemap must render its
//   tiles + table with no network stubbed — proving the world-geojson fetch is
//   gone (unlike the old map / WorldChoropleth).

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  within,
  fireEvent,
  act,
} from "@testing-library/react";
import { getCountryOriginShares } from "@/lib/ai-frontier";
import { frontierEn } from "@/lib/i18n/messages/en/frontier";

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
  const { default: FrontierOriginsTreemap } = await import(
    "@/components/frontier/FrontierOriginsTreemap"
  );
  return FrontierOriginsTreemap;
}

// Restore the tests/setup.ts globals after any local stubbing.
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

// Metric labels reused by the share toggle (frontier namespace).
const METRIC_LABELS = [
  frontierEn.metricRecentCount,
  frontierEn.metricModelCount,
  frontierEn.metricOpenWeightsCount,
];

function metricButtons(container: HTMLElement) {
  const group = container.querySelector('[role="group"]')!;
  return Array.from(group.querySelectorAll("button[aria-pressed]"));
}

function clickMetric(container: HTMLElement, label: string) {
  const btn = metricButtons(container).find((b) => b.textContent === label) as
    | HTMLElement
    | undefined;
  expect(btn, `metric button '${label}' must be present`).not.toBeUndefined();
  fireEvent.click(btn!);
}

describe("FrontierOriginsTreemap", () => {
  beforeEach(() => {
    mockUseLanguage.mockReturnValue({ locale: "en", setLocale: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    reapplySetupGlobals();
    vi.restoreAllMocks();
  });

  // ── No-geojson-fetch regression guard ──────────────────────────────────────

  it("REGRESSION GUARD: renders WITHOUT any global fetch mock (world-geojson fetch is gone)", () => {
    // Deliberately do NOT stub global.fetch. If the component still fetched
    // world-countries.geo.json (like the old choropleth), rendering with no
    // fetch would leave the table empty. Populated rows prove the fetch is gone.
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    return importComponent().then((FrontierOriginsTreemap) => {
      const { container } = render(<FrontierOriginsTreemap />);
      const expectedRows = getCountryOriginShares().length;
      const bodyRows = container.querySelectorAll("table tbody tr");
      expect(
        bodyRows.length,
        "treemap table must render all origin rows with no fetch stubbed",
      ).toBe(expectedRows);
      expect(
        fetchSpy,
        "the treemap must NOT call fetch (no runtime geometry request)",
      ).not.toHaveBeenCalled();
    });
  });

  // ── Accessible data table (the numeric truth) ───────────────────────────────

  it("renders the accessible data table (queryable by role) with the localized sr-only caption", async () => {
    const FrontierOriginsTreemap = await importComponent();
    render(<FrontierOriginsTreemap />);
    const table = screen.getByRole("table", {
      name: frontierEn.originsTableCaption,
    });
    expect(table).toBeInTheDocument();
  });

  it("renders exactly one table body row per origin country for the default metric", async () => {
    const FrontierOriginsTreemap = await importComponent();
    const { container } = render(<FrontierOriginsTreemap />);
    const expectedRows = getCountryOriginShares().length;
    const bodyRows = container.querySelectorAll("table tbody tr");
    expect(
      bodyRows.length,
      "one accessible table row per attributed origin country",
    ).toBe(expectedRows);
  });

  it("exposes THREE column headers including the Share % column (the redesign's value-add)", async () => {
    const FrontierOriginsTreemap = await importComponent();
    const { container } = render(<FrontierOriginsTreemap />);
    const colHeaders = Array.from(
      container.querySelectorAll('thead th[scope="col"]'),
    ).map((th) => th.textContent ?? "");
    expect(colHeaders.length, "exactly three column headers").toBe(3);
    // Country + Records + Share — Share is the new column vs the old 2-col map table.
    expect(
      colHeaders.some((h) => h.includes(frontierEn.originsTableColCountry)),
      "Country column header present",
    ).toBe(true);
    expect(
      colHeaders.some((h) => h.includes(frontierEn.originsTableColRecords)),
      "Records column header present",
    ).toBe(true);
    expect(
      colHeaders.some((h) => h.includes(frontierEn.originsTableColShare)),
      "Share % column header present (value-add of the treemap redesign)",
    ).toBe(true);
  });

  it("each table row exposes a percentage share cell (%)", async () => {
    const FrontierOriginsTreemap = await importComponent();
    const { container } = render(<FrontierOriginsTreemap />);
    const firstRow = container.querySelector("table tbody tr")!;
    const cells = within(firstRow as HTMLElement).getAllByRole("cell");
    // Row header (country) is a th; the two <td> cells are records + share.
    const shareCell = cells[cells.length - 1];
    expect(
      shareCell.textContent,
      "last cell renders a percentage share",
    ).toMatch(/\d+(\.\d+)?%/);
  });

  // ── WCAG regression guards: decorative treemap SVG ──────────────────────────

  it("REGRESSION GUARD: NO <canvas>, NO role='img'; the treemap SVG is aria-hidden with no focusable tiles", async () => {
    const FrontierOriginsTreemap = await importComponent();
    const { container } = render(<FrontierOriginsTreemap />);

    // No canvas anywhere (no Chart.js, no bitmap map).
    expect(container.querySelector("canvas"), "NO <canvas> element").toBeNull();

    // No element is exposed to AT as an image.
    expect(
      container.querySelector('[role="img"]'),
      "NO role='img' anywhere in the treemap",
    ).toBeNull();

    const svg = container.querySelector("svg");
    expect(svg, "decorative treemap SVG must render").not.toBeNull();
    expect(
      svg!.getAttribute("aria-hidden"),
      "treemap SVG must be aria-hidden (decorative)",
    ).toBe("true");
    expect(
      svg!.getAttribute("role"),
      "treemap SVG must NOT have role='img'",
    ).toBeNull();

    // No focusable / interactive elements inside the decorative SVG.
    const focusable = svg!.querySelectorAll(
      'a, button, [tabindex], [role="button"], [role="link"], [focusable="true"]',
    );
    expect(
      focusable.length,
      "decorative treemap SVG must contain NO focusable/interactive elements",
    ).toBe(0);

    // Tiles are <rect>s; they must carry no role and no tabindex.
    const rects = svg!.querySelectorAll("rect");
    expect(rects.length, "treemap should render tile rects").toBeGreaterThan(0);
    for (const r of Array.from(rects)) {
      expect(r.getAttribute("role"), "tiles must have NO role").toBeNull();
      expect(r.getAttribute("tabindex"), "tiles must NOT be focusable").toBeNull();
    }
  });

  it("pairs the decorative SVG with the sr-only originsSrSummary description", async () => {
    const FrontierOriginsTreemap = await importComponent();
    render(<FrontierOriginsTreemap />);
    expect(
      screen.getByText(frontierEn.originsSrSummary),
      "sr-only treemap summary must be present",
    ).toBeInTheDocument();
  });

  // ── Metric controls: exactly the 3 fair metrics ─────────────────────────────

  it("renders exactly the 3 fair-metric toggle buttons with recentCount pressed by default", async () => {
    const FrontierOriginsTreemap = await importComponent();
    const { container } = render(<FrontierOriginsTreemap />);
    const labels = metricButtons(container).map((b) => b.textContent);
    expect(labels).toEqual(METRIC_LABELS);

    const pressed = metricButtons(container).filter(
      (b) => b.getAttribute("aria-pressed") === "true",
    );
    expect(pressed.length, "exactly one metric pressed by default").toBe(1);
    expect(pressed[0].textContent).toBe(frontierEn.metricRecentCount);
  });

  it("REGRESSION GUARD: NO compute/frontier metric option is offered", async () => {
    const FrontierOriginsTreemap = await importComponent();
    const { container } = render(<FrontierOriginsTreemap />);
    const labels = metricButtons(container).map((b) => (b.textContent ?? "").toLowerCase());
    for (const banned of ["compute", "frontier", "flop", "training run"]) {
      expect(
        labels.some((l) => l.includes(banned)),
        `no metric button may reference '${banned}' (compute/capability ranking is unrenderable)`,
      ).toBe(false);
    }
    // Exactly three metrics, no more.
    expect(metricButtons(container).length).toBe(3);
  });

  it("switching metric changes the rendered values and shares in the table", async () => {
    const FrontierOriginsTreemap = await importComponent();
    const { container } = render(<FrontierOriginsTreemap />);

    const origins = getCountryOriginShares();
    const sum = (k: "recentCount" | "modelCount" | "openWeightsCount") =>
      origins.reduce((a, e) => a + e[k], 0);
    const topRecent = Math.max(...origins.map((e) => e.recentCount));
    const topModel = Math.max(...origins.map((e) => e.modelCount));
    const topOpen = Math.max(...origins.map((e) => e.openWeightsCount));

    function firstRowCells(): { value: string; share: string } {
      const firstRow = container.querySelector("table tbody tr")!;
      const cells = within(firstRow as HTMLElement).getAllByRole("cell");
      return {
        value: (cells[0].textContent ?? "").trim(),
        share: (cells[cells.length - 1].textContent ?? "").trim(),
      };
    }

    const pct = (v: number, total: number) => `${((v / total) * 100).toFixed(1)}%`;

    // Default: recentCount.
    expect(firstRowCells().value).toBe(topRecent.toLocaleString());
    expect(firstRowCells().share).toBe(pct(topRecent, sum("recentCount")));

    clickMetric(container, frontierEn.metricModelCount);
    expect(firstRowCells().value).toBe(topModel.toLocaleString());
    expect(firstRowCells().share).toBe(pct(topModel, sum("modelCount")));

    clickMetric(container, frontierEn.metricOpenWeightsCount);
    expect(firstRowCells().value).toBe(topOpen.toLocaleString());
    expect(firstRowCells().share).toBe(pct(topOpen, sum("openWeightsCount")));

    // The three top values must be genuinely distinguishable metrics.
    expect(new Set([topRecent, topModel, topOpen]).size).toBeGreaterThan(1);
  });

  // ── Coverage note & disclaimers (point of use) ──────────────────────────────

  it("renders the coverage note with the real origin count (34) and no unresolved tokens", async () => {
    const FrontierOriginsTreemap = await importComponent();
    render(<FrontierOriginsTreemap />);
    const n = getCountryOriginShares().length;
    const expected = frontierEn.originsCoverageNote.replace(
      "{countries}",
      String(n),
    );
    expect(screen.getByText(expected)).toBeInTheDocument();

    const bodyText = document.body.textContent ?? "";
    expect(
      bodyText.match(/\{[a-zA-Z]+\}/g),
      "no unresolved interpolation tokens",
    ).toBeNull();
  });

  it("renders the dataDisclaimer and the countryAttributionNote at point of use", async () => {
    const FrontierOriginsTreemap = await importComponent();
    render(<FrontierOriginsTreemap />);
    expect(screen.getByText(frontierEn.dataDisclaimer)).toBeInTheDocument();
    expect(
      screen.getByText(frontierEn.countryAttributionNote),
    ).toBeInTheDocument();
  });

  // ── Framing guard: no ranking / leadership / capability language ────────────

  it("FRAMING GUARD: rendered text contains no leadership / ranking / capability language", async () => {
    const FrontierOriginsTreemap = await importComponent();
    const { container } = render(<FrontierOriginsTreemap />);

    // "ranking" is permitted ONLY inside the explicit non-ranking negations in
    // the subhead / sr summary / coverage note. Strip those before scanning so a
    // literal "ranking" token there doesn't trip the guard, then scan the rest.
    const BANNED = [
      "leader",
      "#1",
      "top ",
      "best ",
      "dominant",
      "dominance",
      "most advanced",
      "winner",
      "champion",
      "superiority",
      "supremacy",
    ];

    function scan(context: string) {
      const text = (document.body.textContent ?? "").toLowerCase();
      for (const term of BANNED) {
        expect(
          text.includes(term),
          `framing term '${term.trim()}' must not appear (${context})`,
        ).toBe(false);
      }
    }

    for (const label of METRIC_LABELS) {
      clickMetric(container, label);
      scan(label);
    }
  });

  // ── Reduced-motion: final layout renders instantly ──────────────────────────

  it("renders its final state (tiles + rows) under prefers-reduced-motion", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }));
    const FrontierOriginsTreemap = await importComponent();
    const { container } = render(<FrontierOriginsTreemap />);
    // Flush the requestAnimationFrame entrance/reduced-motion ticks.
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    const expectedRows = getCountryOriginShares().length;
    expect(container.querySelectorAll("table tbody tr").length).toBe(expectedRows);
    expect(container.querySelectorAll("svg rect").length).toBeGreaterThan(0);
    // Regression guards still hold under reduced-motion.
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector('[role="img"]')).toBeNull();
  });
});
