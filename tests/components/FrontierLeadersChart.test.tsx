// @vitest-environment jsdom
/**
 * tests/components/FrontierLeadersChart.test.tsx
 *
 * Coverage:
 * - Source-text structural checks: "use client", ARIA attributes, conditional notes
 * - Default metric is recentCount (aria-pressed="true" on first metric button)
 * - Accessible tab bar with role="tablist" and aria-selected
 * - Accessible metric selector with role="group" and aria-pressed buttons
 * - Metric description is always visible (not hover-only)
 * - coverageNote interpolation resolves: no unresolved {placeholder} tokens
 * - dataDisclaimer is rendered prominently
 * - orgEntitiesNote shown on organizations tab
 * - countryAttributionNote shown on countries tab
 * - frontierDefinitionNote shown only when frontierCount metric selected
 * - No unresolved {placeholder} tokens in rendered output
 *
 * Redesign coverage (rows-as-bars semantic table; Chart.js removed):
 * - Semantic <table> with sr-only caption + column headers via role/scope
 * - Correct row counts (orgs top 12, countries top 10) for recentCount
 * - REGRESSION GUARDS: no <canvas>, no role="img"; decorative fill bars + chips
 *   are aria-hidden and not exposed to the a11y tree
 * - Controls: tab switching + 6-metric selector update rows / aria-state
 * - Guardrail copy guard: no podium / medal / winner ranking language
 * - Point-of-use caveats + "Why these numbers?" <details> disclosure
 * - Flag/monogram decoration + largestRun peak-compute column handling
 * - Reduced-motion: rows still render their final state
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { frontierEn } from "@/lib/i18n/messages/en/frontier";
import { frontierZh } from "@/lib/i18n/messages/zh/frontier";
import { getAIFrontierData } from "@/lib/ai-frontier";

// ── Paths ─────────────────────────────────────────────────────────────────────

const COMPONENT_PATH = path.join(
  process.cwd(),
  "components/frontier/FrontierLeadersChart.tsx",
);

// ── Framework mocks ───────────────────────────────────────────────────────────

const mockUseLanguage = vi.fn(() => ({
  locale: "en" as "en" | "zh",
  setLocale: vi.fn(),
}));

vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark" }),
}));

// NOTE: Chart.js / react-chartjs-2 are intentionally NOT mocked here. The
// redesigned component replaced the Chart.js horizontal bar chart (and the old
// duplicate data table) with a single semantic rows-as-bars <table>. It no
// longer imports chart.js or react-chartjs-2, so no canvas stub is required.
// The "regression guards" describe block below locks in that Chart.js is gone
// (no <canvas>, no role="img").

// Mock next/link to render as a plain anchor
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function setLocale(locale: "en" | "zh") {
  mockUseLanguage.mockReturnValue({ locale, setLocale: vi.fn() });
}

// Dynamically import the component after all vi.mock calls
async function importComponent() {
  const { default: FrontierLeadersChart } = await import(
    "@/components/frontier/FrontierLeadersChart"
  );
  return FrontierLeadersChart;
}

// ── Source-text structural tests ──────────────────────────────────────────────

describe("FrontierLeadersChart — source-text structure", () => {
  it("component file exists", () => {
    expect(existsSync(COMPONENT_PATH)).toBe(true);
  });

  it("component has 'use client' directive (client component boundary)", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src.trimStart().startsWith('"use client"')).toBe(true);
  });

  it("component renders role=\"tablist\" for the org/country tab bar", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src).toContain('role="tablist"');
  });

  it("component renders aria-selected on tab buttons", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src).toContain("aria-selected={activeTab === tab}");
  });

  it("component uses role=\"group\" for the metric selector", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src).toContain('role="group"');
  });

  it("component uses aria-pressed on metric selector buttons", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src).toContain("aria-pressed={metric === mk}");
  });

  it("component renders metric description box always visible (not hover-only)", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    // The description div must not be gated by a hover or focus conditional
    // The pattern: metricDesc is rendered in a div that is always present, not inside a conditional
    expect(src).toContain("{metricDesc}");
  });

  it("component renders dataDisclaimer prominently with 'attributionCaveat' prefix", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src).toContain('t("dataDisclaimer")');
  });

  it("component renders coverageNote with interpolation variables", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src).toContain('t("coverageNote"');
    expect(src).toContain("totalDated");
    expect(src).toContain("computeKnown");
    expect(src).toContain("coveragePct");
    expect(src).toContain("windowStart");
    expect(src).toContain("windowEnd");
  });

  it("component conditionally shows frontierDefinitionNote only for frontierCount metric", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    // The conditional render block should check for frontierCount metric
    expect(src).toContain('metric === "frontierCount"');
    expect(src).toContain('t("frontierDefinitionNote")');
  });

  it("component shows orgEntitiesNote on orgs tab", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src).toContain('t("orgEntitiesNote")');
    expect(src).toContain('activeTab === "orgs"');
  });

  it("component shows countryAttributionNote on countries tab", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src).toContain('t("countryAttributionNote")');
  });

  it("component imports getDefinitions and getRecentWindow from ai-frontier", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src).toContain("getDefinitions");
    expect(src).toContain("getRecentWindow");
  });

  it("default metric state is 'recentCount'", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src).toContain('useState<MetricKey>("recentCount")');
  });
});

// ── Render tests ──────────────────────────────────────────────────────────────

describe("FrontierLeadersChart — rendered output", () => {
  beforeEach(() => setLocale("en"));
  afterEach(() => vi.restoreAllMocks());

  it("renders without crashing in EN locale", async () => {
    const FrontierLeadersChart = await importComponent();
    expect(() => render(<FrontierLeadersChart />)).not.toThrow();
  });

  it("renders the tab bar with role='tablist'", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const tablist = container.querySelector('[role="tablist"]');
    expect(tablist, "tablist must be present").not.toBeNull();
  });

  it("renders exactly two tabs: Organizations and Countries", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length, "exactly two tabs must be present").toBe(2);
    const tabTexts = Array.from(tabs).map((t) => t.textContent);
    expect(tabTexts).toContain(frontierEn.leadersTabOrgs);
    expect(tabTexts).toContain(frontierEn.leadersTabCountries);
  });

  it("Organizations tab is selected by default (aria-selected='true')", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const tabs = container.querySelectorAll('[role="tab"]');
    const selectedTabs = Array.from(tabs).filter(
      (t) => t.getAttribute("aria-selected") === "true",
    );
    expect(selectedTabs.length, "exactly one tab must be selected").toBe(1);
    expect(selectedTabs[0].textContent, "Organizations tab must be selected by default").toBe(
      frontierEn.leadersTabOrgs,
    );
  });

  it("renders the metric selector group with role='group'", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const metricGroup = container.querySelector('[role="group"]');
    expect(metricGroup, "metric selector group must be present").not.toBeNull();
  });

  it("default metric is recentCount: its button has aria-pressed='true'", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const pressedButtons = Array.from(
      container.querySelectorAll('[role="group"] [aria-pressed="true"]'),
    );
    expect(pressedButtons.length, "exactly one metric button must be pressed by default").toBe(1);
    expect(
      pressedButtons[0].textContent,
      "recentCount metric button must be pressed by default",
    ).toBe(frontierEn.metricRecentCount);
  });

  it("metric description panel is visible with metricLabel: metricDesc text", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    // The metric description description box renders a <strong> with the label text
    // Find among all <strong> elements the one that contains the recentCount label
    const strongs = Array.from(container.querySelectorAll("strong"));
    const metricLabelStrong = strongs.find((s) =>
      s.textContent?.includes(frontierEn.metricRecentCount),
    );
    expect(
      metricLabelStrong,
      `A strong element with the metric label '${frontierEn.metricRecentCount}' must be visible`,
    ).not.toBeUndefined();
  });

  it("dataDisclaimer is rendered in the output", async () => {
    const FrontierLeadersChart = await importComponent();
    render(<FrontierLeadersChart />);
    // The disclaimer contains non-capability language
    const disclaimerText = frontierEn.dataDisclaimer;
    // Check a distinctive substring that won't cause false-positive
    const distinctPart = "do not measure";
    expect(screen.getByText(disclaimerText, { exact: false })).toBeDefined();
    // And verify the content contains the required non-impact language
    const bodyText = document.body.textContent ?? "";
    expect(bodyText.toLowerCase()).toContain(distinctPart);
  });

  it("orgEntitiesNote is visible on the default organizations tab", async () => {
    const FrontierLeadersChart = await importComponent();
    render(<FrontierLeadersChart />);
    // orgEntitiesNote should be visible (default tab is orgs)
    const bodyText = document.body.textContent ?? "";
    expect(
      bodyText,
      "orgEntitiesNote must be visible on orgs tab",
    ).toContain("No editorial");
  });

  it("frontierDefinitionNote is NOT shown by default (recentCount metric)", async () => {
    const FrontierLeadersChart = await importComponent();
    render(<FrontierLeadersChart />);
    const bodyText = document.body.textContent ?? "";
    // The frontierDefinitionNote is conditional on frontierCount metric
    // The full note text should not be visible with default recentCount selection
    const noteDistinctPart = "historical top 10";
    expect(
      bodyText.toLowerCase(),
      "frontierDefinitionNote must NOT be visible on default recentCount metric",
    ).not.toContain(noteDistinctPart);
  });

  it("frontierDefinitionNote appears after switching to frontierCount metric", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    // Find and click the frontierCount metric button
    const metricGroup = container.querySelector('[role="group"]');
    expect(metricGroup).not.toBeNull();
    const frontierBtn = Array.from(
      metricGroup!.querySelectorAll("button[aria-pressed]"),
    ).find((b) => b.textContent === frontierEn.metricFrontierCount);
    expect(frontierBtn, "frontierCount metric button must be present").not.toBeNull();
    fireEvent.click(frontierBtn!);
    // After selecting frontierCount, the definition note should appear
    const bodyText = document.body.textContent ?? "";
    expect(
      bodyText,
      "frontierDefinitionNote must appear after selecting frontierCount metric",
    ).toContain("compute");
  });

  it("coverageNote rendered output contains actual counts (no unresolved {placeholder} tokens)", async () => {
    const FrontierLeadersChart = await importComponent();
    render(<FrontierLeadersChart />);
    const bodyText = document.body.textContent ?? "";
    // Any {word} pattern in the visible text would indicate an unresolved interpolation var
    const unresolved = bodyText.match(/\{[a-zA-Z]+\}/g);
    expect(
      unresolved,
      `Unresolved interpolation tokens found in rendered output: ${JSON.stringify(unresolved)}`,
    ).toBeNull();
  });

  it("switching to Countries tab shows countryAttributionNote", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const tabs = container.querySelectorAll('[role="tab"]');
    const countriesTab = Array.from(tabs).find(
      (t) => t.textContent === frontierEn.leadersTabCountries,
    );
    expect(countriesTab).not.toBeNull();
    fireEvent.click(countriesTab!);
    const bodyText = document.body.textContent ?? "";
    // countryAttributionNote mentions attribution follows Epoch AI source data
    expect(
      bodyText,
      "countryAttributionNote must appear on Countries tab",
    ).toMatch(/Epoch AI.*source|attribution.*Epoch|Country attribution/);
  });

  it("renders in ZH locale without crashing and uses ZH labels", async () => {
    setLocale("zh");
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const tabs = container.querySelectorAll('[role="tab"]');
    const tabTexts = Array.from(tabs).map((t) => t.textContent);
    expect(tabTexts).toContain(frontierZh.leadersTabOrgs);
    expect(tabTexts).toContain(frontierZh.leadersTabCountries);
  });
});

// ── Rai YELLOW advisories: details block definition keys ──────────────────────

describe("FrontierLeadersChart — source-text: details block renders both localized definition keys", () => {
  it("component source contains t('countryDefaultSortDefinition')", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src).toContain('t("countryDefaultSortDefinition")');
  });

  it("component source contains t('multiCountryAttributionDefinition')", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src).toContain('t("multiCountryAttributionDefinition")');
  });

  it("both definition keys appear inside the <details> block", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    const detailsStart = src.indexOf("<details");
    const detailsEnd = src.lastIndexOf("</details>");
    expect(detailsStart, "<details> block must be present").toBeGreaterThan(-1);
    expect(detailsEnd, "</details> must be present").toBeGreaterThan(-1);
    const detailsBlock = src.slice(detailsStart, detailsEnd + "</details>".length);
    expect(
      detailsBlock,
      "countryDefaultSortDefinition must be inside <details>",
    ).toContain('t("countryDefaultSortDefinition")');
    expect(
      detailsBlock,
      "multiCountryAttributionDefinition must be inside <details>",
    ).toContain('t("multiCountryAttributionDefinition")');
  });

  it("countryAttributionNote is rendered only in the countries tab block, not in the details block", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src, "countryAttributionNote must be present in source").toContain('t("countryAttributionNote")');
    const detailsStart = src.indexOf("<details");
    const detailsEnd = src.lastIndexOf("</details>");
    const detailsBlock = src.slice(detailsStart, detailsEnd + "</details>".length);
    expect(
      detailsBlock,
      "countryAttributionNote must NOT appear inside the <details> block",
    ).not.toContain('t("countryAttributionNote")');
  });
});

describe("FrontierLeadersChart — rendered: country tab isolation and details block content", () => {
  beforeEach(() => setLocale("en"));
  afterEach(() => vi.restoreAllMocks());

  it("countryAttributionNote is NOT rendered on the default orgs tab", async () => {
    const FrontierLeadersChart = await importComponent();
    render(<FrontierLeadersChart />);
    const bodyText = document.body.textContent ?? "";
    // "Country attribution follows Epoch AI" — distinctive phrase from the note
    expect(
      bodyText,
      "countryAttributionNote must NOT appear on default orgs tab",
    ).not.toContain("Country attribution follows");
  });

  it("details block renders countryDefaultSortDefinition text in the DOM", async () => {
    const FrontierLeadersChart = await importComponent();
    render(<FrontierLeadersChart />);
    const bodyText = document.body.textContent ?? "";
    // Substring distinctive to countryDefaultSortDefinition
    expect(
      bodyText.toLowerCase(),
      "countryDefaultSortDefinition text must be in the DOM",
    ).toMatch(/recent tracked releases|sorted by recent.*releases/);
  });

  it("details block renders multiCountryAttributionDefinition text in the DOM", async () => {
    const FrontierLeadersChart = await importComponent();
    render(<FrontierLeadersChart />);
    const bodyText = document.body.textContent ?? "";
    // Substring distinctive to multiCountryAttributionDefinition
    expect(
      bodyText.toLowerCase(),
      "multiCountryAttributionDefinition text must be in the DOM",
    ).toMatch(/credited once to each|each named country|once to each named/);
  });

  it("no unresolved {placeholder} tokens in rendered output including definitions block", async () => {
    const FrontierLeadersChart = await importComponent();
    render(<FrontierLeadersChart />);
    const bodyText = document.body.textContent ?? "";
    const unresolved = bodyText.match(/\{[a-zA-Z]+\}/g);
    expect(
      unresolved,
      `Unresolved interpolation tokens in full render: ${JSON.stringify(unresolved)}`,
    ).toBeNull();
  });
});

// ── Redesign: data-derived expectations (disk truth, not hardcoded) ───────────

// Replicates the component's sort: value desc, tie-break by name.localeCompare.
function topByRecent<T>(
  arr: T[],
  getName: (e: T) => string,
  getRecent: (e: T) => number,
  cap: number,
): string[] {
  return arr
    .slice()
    .sort((a, b) => getRecent(b) - getRecent(a) || getName(a).localeCompare(getName(b)))
    .slice(0, cap)
    .map(getName);
}

const FRONTIER = getAIFrontierData();
const ALL_ORGS = FRONTIER.aggregates.orgLeaderboard;
const ALL_COUNTRIES = FRONTIER.aggregates.countryLeaderboard;

// recentCount is the default metric; every entry has a recentCount so no
// largestRun-style filtering applies. Row caps: orgs 12, countries 10.
const EXPECTED_ORG_ROWS = Math.min(12, ALL_ORGS.length);
const EXPECTED_COUNTRY_ROWS = Math.min(10, ALL_COUNTRIES.length);
const EXPECTED_ORG_NAMES = topByRecent(
  ALL_ORGS,
  (o) => o.organization,
  (o) => o.recentCount,
  12,
);
const EXPECTED_COUNTRY_NAMES = topByRecent(
  ALL_COUNTRIES,
  (c) => c.countryShort,
  (c) => c.recentCount,
  10,
);

// A country with a mapped iso3 (→ real flag glyph, NOT the 🌐 fallback) that is
// present in the default top-10 recentCount country view.
const MAPPED_COUNTRY = "United States";

const PODIUM_TERMS = [
  "#1",
  "winner",
  "champion",
  "best ",
  "gold",
  "silver",
  "bronze",
  "medal",
  "podium",
  "leader in",
  "most advanced",
  "dominance",
];

function switchToCountries(container: HTMLElement) {
  const countriesTab = Array.from(container.querySelectorAll('[role="tab"]')).find(
    (t) => t.textContent === frontierEn.leadersTabCountries,
  ) as HTMLElement | undefined;
  expect(countriesTab, "Countries tab must be present").not.toBeUndefined();
  fireEvent.click(countriesTab!);
}

function clickMetric(container: HTMLElement, label: string) {
  const group = container.querySelector('[role="group"]')!;
  const btn = Array.from(group.querySelectorAll("button[aria-pressed]")).find(
    (b) => b.textContent === label,
  ) as HTMLElement | undefined;
  expect(btn, `metric button '${label}' must be present`).not.toBeUndefined();
  fireEvent.click(btn!);
}

// ── Redesign: semantic table structure ────────────────────────────────────────

describe("FrontierLeadersChart — semantic rows-as-bars table", () => {
  beforeEach(() => setLocale("en"));
  afterEach(() => vi.restoreAllMocks());

  it("renders a single <table> carrying the sr-only accessible caption", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const tables = container.querySelectorAll("table");
    expect(tables.length, "exactly one leaderboard table").toBe(1);
    const caption = tables[0].querySelector("caption");
    expect(caption, "table must have a <caption>").not.toBeNull();
    expect(caption!.textContent).toBe(frontierEn.leadersTableCaption);
  });

  it("exposes column headers (Rank, Name, metric, Peak compute) via scope=col", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const colHeaders = Array.from(
      container.querySelectorAll('thead th[scope="col"]'),
    ).map((th) => th.textContent?.trim());
    expect(colHeaders).toContain(frontierEn.leadersColRank);
    expect(colHeaders).toContain(frontierEn.leadersColName);
    // recentCount metric column header uses the active metric label.
    expect(colHeaders).toContain(frontierEn.metricRecentCount);
    // Compute column visible for non-largestRun metrics.
    expect(colHeaders).toContain(frontierEn.leadersColMaxCompute);
  });

  it("renders top-12 org rows on the default tab; each rank cell is a th scope=row", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const bodyRows = container.querySelectorAll("tbody tr");
    expect(bodyRows.length, "orgs tab shows top 12 rows").toBe(EXPECTED_ORG_ROWS);
    // Each data row's rank cell is a row header carrying the neutral 1-based index.
    bodyRows.forEach((row, i) => {
      const rowHeader = row.querySelector('th[scope="row"]');
      expect(rowHeader, "each row must have a th scope=row rank cell").not.toBeNull();
      expect(rowHeader!.textContent).toContain(String(i + 1));
    });
  });

  it("exposes each org row's name and metric value as text", async () => {
    const FrontierLeadersChart = await importComponent();
    render(<FrontierLeadersChart />);
    const table = screen.getByRole("table");
    for (const name of EXPECTED_ORG_NAMES) {
      expect(
        within(table).getAllByText(name).length,
        `org name '${name}' must be rendered as text`,
      ).toBeGreaterThan(0);
    }
    // OpenAI's recentCount value is shown as text in its own row.
    const openai = ALL_ORGS.find((o) => o.organization === "OpenAI")!;
    const openaiRow = Array.from(table.querySelectorAll("tbody tr")).find((r) =>
      r.textContent?.includes("OpenAI"),
    )!;
    expect(openaiRow.textContent).toContain(openai.recentCount.toLocaleString());
  });

  it("renders top-10 country rows after switching to the Countries tab", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    switchToCountries(container);
    const bodyRows = container.querySelectorAll("tbody tr");
    expect(bodyRows.length, "countries tab shows top 10 rows").toBe(EXPECTED_COUNTRY_ROWS);
    const table = screen.getByRole("table");
    for (const name of EXPECTED_COUNTRY_NAMES) {
      expect(
        within(table).getAllByText(name).length,
        `country name '${name}' must be rendered as text`,
      ).toBeGreaterThan(0);
    }
  });
});

// ── Redesign: REGRESSION GUARDS (Chart.js is gone) ────────────────────────────

describe("FrontierLeadersChart — regression guards: no canvas, no role=img", () => {
  beforeEach(() => setLocale("en"));
  afterEach(() => vi.restoreAllMocks());

  it("renders NO <canvas> element (Chart.js removed)", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    expect(container.querySelector("canvas"), "no <canvas> may be rendered").toBeNull();
  });

  it("renders NO element with role='img' anywhere (no chart image surrogate)", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    expect(
      container.querySelector('[role="img"]'),
      "no role=img element may be present",
    ).toBeNull();
    expect(
      screen.queryByRole("img"),
      "a11y tree must expose no image role",
    ).toBeNull();
  });

  it("guards hold on the Countries tab and for every metric", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const metricLabels = [
      frontierEn.metricRecentCount,
      frontierEn.metricModelCount,
      frontierEn.metricOpenWeightsCount,
      frontierEn.metricComputeKnownCount,
      frontierEn.metricFrontierCount,
      frontierEn.metricLargestRun,
    ];
    for (const tabSwitch of [false, true]) {
      if (tabSwitch) switchToCountries(container);
      for (const label of metricLabels) {
        clickMetric(container, label);
        expect(container.querySelector("canvas"), `no canvas (${label})`).toBeNull();
        expect(
          container.querySelector('[role="img"]'),
          `no role=img (${label})`,
        ).toBeNull();
      }
    }
  });

  it("decorative fill-bar track + gradient fill are aria-hidden (not in a11y tree)", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(0);
    rows.forEach((row) => {
      const rankCell = row.querySelector('th[scope="row"]')!;
      // Both decorative layers (track + fill) live in the rank cell and must be aria-hidden.
      const decoLayers = rankCell.querySelectorAll('span[aria-hidden="true"]');
      expect(
        decoLayers.length,
        "rank cell hosts 2 aria-hidden decorative layers (track + fill)",
      ).toBe(2);
      // The gradient fill carries an inline width — decorative width, not a11y data.
      const fill = Array.from(decoLayers).find(
        (el) => (el as HTMLElement).style.width !== "",
      ) as HTMLElement | undefined;
      expect(fill, "gradient fill layer with inline width must exist").not.toBeUndefined();
      expect(fill!.getAttribute("aria-hidden")).toBe("true");
    });
  });

  it("decorative accent chip is aria-hidden while the entity NAME stays exposed", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const rows = container.querySelectorAll("tbody tr");
    rows.forEach((row) => {
      const nameCell = row.querySelector("td")!;
      const chip = nameCell.querySelector('span[aria-hidden="true"]');
      expect(chip, "each row has an aria-hidden chip (monogram/flag)").not.toBeNull();
    });
    // The exposed org name text node is NOT inside an aria-hidden subtree.
    const nameEl = screen.getAllByText(EXPECTED_ORG_NAMES[0])[0];
    expect(nameEl.closest('[aria-hidden="true"]')).toBeNull();
  });
});

// ── Redesign: controls (tabs + 6-metric selector) ────────────────────────────

describe("FrontierLeadersChart — controls update rows and aria-state", () => {
  beforeEach(() => setLocale("en"));
  afterEach(() => vi.restoreAllMocks());

  it("recentCount is the default pressed metric and exactly six metrics exist", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const buttons = container.querySelectorAll('[role="group"] button[aria-pressed]');
    expect(buttons.length, "six metric buttons").toBe(6);
    const pressed = Array.from(buttons).filter(
      (b) => b.getAttribute("aria-pressed") === "true",
    );
    expect(pressed.length).toBe(1);
    expect(pressed[0].textContent).toBe(frontierEn.metricRecentCount);
  });

  it("switching Organizations → Countries swaps the rendered entity rows", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    // Default (orgs): OpenAI present, United States absent from rows.
    expect(screen.getAllByText("OpenAI").length).toBeGreaterThan(0);
    expect(screen.queryByText(MAPPED_COUNTRY)).toBeNull();
    switchToCountries(container);
    // Countries: mapped country present, OpenAI gone from rows.
    expect(screen.getAllByText(MAPPED_COUNTRY).length).toBeGreaterThan(0);
    expect(
      within(screen.getByRole("table")).queryByText("OpenAI"),
      "org rows must be replaced by country rows",
    ).toBeNull();
    // aria-selected moves to the Countries tab.
    const selected = Array.from(container.querySelectorAll('[role="tab"]')).filter(
      (t) => t.getAttribute("aria-selected") === "true",
    );
    expect(selected.length).toBe(1);
    expect(selected[0].textContent).toBe(frontierEn.leadersTabCountries);
  });

  it("selecting a metric updates aria-pressed and the metric column header", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    clickMetric(container, frontierEn.metricModelCount);
    const pressed = Array.from(
      container.querySelectorAll('[role="group"] button[aria-pressed="true"]'),
    );
    expect(pressed.length).toBe(1);
    expect(pressed[0].textContent).toBe(frontierEn.metricModelCount);
    const colHeaders = Array.from(
      container.querySelectorAll('thead th[scope="col"]'),
    ).map((th) => th.textContent?.trim());
    expect(colHeaders).toContain(frontierEn.metricModelCount);
    expect(colHeaders).not.toContain(frontierEn.metricRecentCount);
  });
});

// ── Redesign: guardrail copy guard (defends PR #129) ──────────────────────────

describe("FrontierLeadersChart — no podium / winner ranking language", () => {
  beforeEach(() => setLocale("en"));
  afterEach(() => vi.restoreAllMocks());

  function assertNoPodiumCopy(context: string) {
    const text = (document.body.textContent ?? "").toLowerCase();
    for (const term of PODIUM_TERMS) {
      expect(
        text.includes(term),
        `podium/winner term '${term.trim()}' must not appear (${context})`,
      ).toBe(false);
    }
  }

  it("contains no podium/winner language across tabs and metrics", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const metricLabels = [
      frontierEn.metricRecentCount,
      frontierEn.metricFrontierCount,
      frontierEn.metricLargestRun,
    ];
    for (const label of metricLabels) {
      clickMetric(container, label);
      assertNoPodiumCopy(`orgs / ${label}`);
    }
    switchToCountries(container);
    for (const label of metricLabels) {
      clickMetric(container, label);
      assertNoPodiumCopy(`countries / ${label}`);
    }
  });

  it("uses the neutral 'Rank' column label (sort order, not a capability rank)", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    // The neutral column label is allowed; the winner-language scan above proves
    // it isn't reframed as "#1"/"champion"/etc.
    const rankHeader = Array.from(
      container.querySelectorAll('thead th[scope="col"]'),
    ).find((th) => th.textContent?.trim() === frontierEn.leadersColRank);
    expect(rankHeader, "neutral Rank column header present").not.toBeUndefined();
  });
});

// ── Redesign: point-of-use caveats + "Why these numbers?" disclosure ──────────

describe("FrontierLeadersChart — caveats and Why-these-numbers disclosure", () => {
  beforeEach(() => setLocale("en"));
  afterEach(() => vi.restoreAllMocks());

  it("dataDisclaimer text is visible at point of use", async () => {
    const FrontierLeadersChart = await importComponent();
    render(<FrontierLeadersChart />);
    expect(
      screen.getByText(frontierEn.dataDisclaimer, { exact: false }),
    ).toBeInTheDocument();
  });

  it("countries tab shows countryAttributionNote and the /global geopolitics link", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    switchToCountries(container);
    const bodyText = document.body.textContent ?? "";
    expect(bodyText).toContain("Country attribution follows");
    const globalLink = container.querySelector('a[href="/global"]');
    expect(globalLink, "/global geopolitics link must be present").not.toBeNull();
    expect(globalLink!.textContent).toContain(frontierEn.leadersGeopoliticsLink);
  });

  it("frontierDefinitionNote appears only when the frontierCount metric is selected", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const distinct = "top 10 models by reported training compute";
    expect((document.body.textContent ?? "").toLowerCase()).not.toContain(distinct);
    clickMetric(container, frontierEn.metricFrontierCount);
    expect((document.body.textContent ?? "").toLowerCase()).toContain(distinct);
  });

  it("'Why these numbers?' <details> renders coverage + definition strings", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    const details = container.querySelector("details");
    expect(details, "<details> disclosure must be present").not.toBeNull();
    const summary = details!.querySelector("summary");
    expect(summary!.textContent).toBe(frontierEn.leadersWhyDisclosure);
    const detailsText = (details!.textContent ?? "").toLowerCase();
    // coverageNote is interpolated (no raw {tokens}); coverage % phrase present.
    expect(detailsText).toContain("compute coverage");
    expect(detailsText).toMatch(/recent tracked releases|sorted by recent/);
    expect(detailsText).toMatch(/credited once to each|each named country/);
    expect(detailsText.match(/\{[a-zA-Z]+\}/g)).toBeNull();
  });
});

// ── Redesign: flag / monogram + largestRun peak-compute column ────────────────

describe("FrontierLeadersChart — flag/monogram decoration & largestRun", () => {
  beforeEach(() => setLocale("en"));
  afterEach(() => vi.restoreAllMocks());

  it("mapped country row exposes its NAME while the flag glyph is decorative", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    switchToCountries(container);
    const table = screen.getByRole("table");
    const usRow = Array.from(table.querySelectorAll("tbody tr")).find((r) =>
      r.textContent?.includes(MAPPED_COUNTRY),
    );
    expect(usRow, `${MAPPED_COUNTRY} row must render`).not.toBeUndefined();
    // Flag chip is aria-hidden decoration; the country NAME is the exposed text.
    const chip = usRow!.querySelector('td span[aria-hidden="true"]');
    expect(chip, "flag chip must be aria-hidden").not.toBeNull();
    // A mapped iso3 must NOT fall back to the 🌐 globe glyph.
    expect(chip!.textContent).not.toBe("🌐");
    expect(within(usRow as HTMLElement).getAllByText(MAPPED_COUNTRY).length).toBeGreaterThan(0);
  });

  it("largestRun hides the peak-compute column and still renders entity rows", async () => {
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    clickMetric(container, frontierEn.metricLargestRun);
    const colHeaders = Array.from(
      container.querySelectorAll('thead th[scope="col"]'),
    ).map((th) => th.textContent?.trim());
    // Peak-reported-compute column is folded into the metric value cell — no
    // separate compute column for largestRun.
    expect(colHeaders).not.toContain(frontierEn.leadersColMaxCompute);
    expect(colHeaders).toContain(frontierEn.metricLargestRun);
    const orgsWithCompute = ALL_ORGS.filter((o) => o.maxComputeFlop > 0).length;
    expect(container.querySelectorAll("tbody tr").length).toBe(Math.min(12, orgsWithCompute));
    // Value cell renders formatted FLOPs (font-mono) rather than throwing.
    const firstRow = container.querySelector("tbody tr")!;
    expect(firstRow.textContent).toBeTruthy();
  });
});

// ── Redesign: reduced-motion renders final state ──────────────────────────────

describe("FrontierLeadersChart — reduced-motion final state", () => {
  beforeEach(() => setLocale("en"));
  afterEach(() => vi.restoreAllMocks());

  it("rows render their final state under prefers-reduced-motion", async () => {
    // matchMedia is stubbed matches:false in tests/setup.ts; force reduced-motion.
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
    const FrontierLeadersChart = await importComponent();
    const { container } = render(<FrontierLeadersChart />);
    // Flush the requestAnimationFrame entrance tick; rows must show final DOM.
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(() => r(null)));
    });
    const rows = container.querySelectorAll("tbody tr");
    expect(rows.length).toBe(EXPECTED_ORG_ROWS);
    for (const name of EXPECTED_ORG_NAMES) {
      expect(within(screen.getByRole("table")).getAllByText(name).length).toBeGreaterThan(0);
    }
    // Regression guards still hold under reduced-motion.
    expect(container.querySelector("canvas")).toBeNull();
    expect(container.querySelector('[role="img"]')).toBeNull();
  });
});
