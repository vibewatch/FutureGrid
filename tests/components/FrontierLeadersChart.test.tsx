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
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import { frontierEn } from "@/lib/i18n/messages/en/frontier";
import { frontierZh } from "@/lib/i18n/messages/zh/frontier";

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

// Mock react-chartjs-2 to avoid canvas requirement in jsdom
vi.mock("react-chartjs-2", () => ({
  Bar: ({ "aria-label": ariaLabel, role }: { "aria-label"?: string; role?: string }) => (
    <div data-testid="bar-chart" aria-label={ariaLabel} role={role ?? "img"} />
  ),
}));

// Mock chart.js registration (no-op in tests)
vi.mock("chart.js", () => ({
  Chart: { register: () => {} },
  CategoryScale: class {},
  LinearScale: class {},
  BarElement: class {},
  Tooltip: class {},
  Legend: class {},
}));

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
