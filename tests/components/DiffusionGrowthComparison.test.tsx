// @vitest-environment jsdom
//
// Tests for Consumer GenAI Diffusion Growth comparison (issue #114)
//
// Covers:
//  1. Data helper — sorting, completeness filter, limit
//  2. Component — chart figure, visible table, accessible structure, caveat
//  3. i18n — EN/ZH key parity, correct terminology, banned wording
//  4. Architecture — server-computed DTO wired through page → GlobalView → component

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { globalEn } from "@/lib/i18n/messages/en/global";
import { globalZh } from "@/lib/i18n/messages/zh/global";
import { SECTION_IDS, DEEP_LINK_HREFS } from "@/lib/section-anchors";
import {
  getTopDiffusionComparison,
  type DiffusionComparisonRow,
} from "@/lib/data";
import DiffusionGrowthComparison from "@/components/global/DiffusionGrowthComparison";

// ── Mock useLanguage for all tests ────────────────────────────────────────────

const mockUseLanguage = vi.fn(() => ({
  locale: "en" as "en" | "zh",
  setLocale: vi.fn(),
}));

vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
}));

function setLocale(locale: "en" | "zh") {
  mockUseLanguage.mockReturnValue({ locale, setLocale: vi.fn() });
}

beforeEach(() => setLocale("en"));

// ── Fixture data ──────────────────────────────────────────────────────────────

const FIXTURE_ROWS: DiffusionComparisonRow[] = [
  { iso3: "ARE", name: "United Arab Emirates", h1_2025: 59.4, h2_2025: 64.0, q1_2026: 70.1 },
  { iso3: "SGP", name: "Singapore",            h1_2025: 58.6, h2_2025: 60.9, q1_2026: 63.4 },
  { iso3: "NOR", name: "Norway",               h1_2025: 45.3, h2_2025: 46.4, q1_2026: 48.6 },
  { iso3: "IRL", name: "Ireland",              h1_2025: 41.7, h2_2025: 44.6, q1_2026: 48.4 },
  { iso3: "FRA", name: "France",               h1_2025: 40.9, h2_2025: 44.0, q1_2026: 47.8 },
  { iso3: "ESP", name: "Spain",                h1_2025: 39.7, h2_2025: 41.8, q1_2026: 44.2 },
  { iso3: "NZL", name: "New Zealand",          h1_2025: 37.6, h2_2025: 40.5, q1_2026: 43.0 },
  { iso3: "GBR", name: "United Kingdom",       h1_2025: 36.4, h2_2025: 38.9, q1_2026: 42.2 },
  { iso3: "NLD", name: "The Netherlands",      h1_2025: 36.3, h2_2025: 38.9, q1_2026: 42.1 },
  { iso3: "QAT", name: "Qatar",                h1_2025: 35.7, h2_2025: 38.3, q1_2026: 41.8 },
];

// ── 1. Data helper tests ──────────────────────────────────────────────────────

describe("getTopDiffusionComparison", () => {
  it("returns exactly 10 rows by default from live data", () => {
    const rows = getTopDiffusionComparison(10);
    expect(rows).toHaveLength(10);
  });

  it("all returned rows have non-null h1_2025, h2_2025, q1_2026", () => {
    const rows = getTopDiffusionComparison(10);
    for (const row of rows) {
      expect(typeof row.h1_2025).toBe("number");
      expect(typeof row.h2_2025).toBe("number");
      expect(typeof row.q1_2026).toBe("number");
      expect(Number.isFinite(row.h1_2025)).toBe(true);
      expect(Number.isFinite(row.h2_2025)).toBe(true);
      expect(Number.isFinite(row.q1_2026)).toBe(true);
    }
  });

  it("rows are sorted by q1_2026 descending", () => {
    const rows = getTopDiffusionComparison(10);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].q1_2026).toBeLessThanOrEqual(rows[i - 1].q1_2026);
    }
  });

  it("first entry is the highest Q1 2026 country (United Arab Emirates)", () => {
    const rows = getTopDiffusionComparison(10);
    expect(rows[0].iso3).toBe("ARE");
    expect(rows[0].q1_2026).toBeGreaterThan(60);
  });

  it("respects the limit parameter", () => {
    expect(getTopDiffusionComparison(5)).toHaveLength(5);
    expect(getTopDiffusionComparison(3)).toHaveLength(3);
  });

  it("returns iso3, name, h1_2025, h2_2025, q1_2026 — no other fields", () => {
    const rows = getTopDiffusionComparison(1);
    const keys = Object.keys(rows[0]).sort();
    expect(keys).toEqual(["h1_2025", "h2_2025", "iso3", "name", "q1_2026"]);
  });
});

// ── 2. Component render tests ─────────────────────────────────────────────────

describe("DiffusionGrowthComparison component", () => {
  it("renders the section with correct id and aria-labelledby", () => {
    render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const section = document.getElementById(SECTION_IDS.diffusionGrowthComparison);
    expect(section).not.toBeNull();
    expect(section).toHaveClass("scroll-mt-24");
    const headingId = section?.getAttribute("aria-labelledby");
    expect(headingId).toBeTruthy();
    const heading = document.getElementById(headingId!);
    expect(heading?.textContent).toMatch(/Consumer GenAI Diffusion/i);
  });

  it("renders the chart SVG as aria-hidden (no double announcement with figure)", () => {
    const { container } = render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const svg = container.querySelector("figure svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    // SVG must NOT carry role=img — the figure element carries the accessible name
    expect(svg?.getAttribute("role")).toBeNull();
  });

  it("renders a figure element with accessible aria-label", () => {
    const { container } = render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const figure = container.querySelector("figure");
    expect(figure).not.toBeNull();
    expect(figure?.getAttribute("aria-label")).toMatch(/Consumer GenAI Diffusion/i);
  });

  it("bars use a single shared 75% scale — geometry assertions prove SCALE_MAX and no per-row normalization", () => {
    const { container } = render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const svg = container.querySelector("figure svg");
    expect(svg).not.toBeNull();

    // Layout constants mirror component source (must stay in sync)
    const CHART_W = 680;
    const MARGIN_LEFT = 152;
    const MARGIN_RIGHT = 44;
    const SCALE_MAX_EXPECTED = 75;
    const plotW = CHART_W - MARGIN_LEFT - MARGIN_RIGHT; // 484

    function expectedW(v: number) {
      return Math.max((v / SCALE_MAX_EXPECTED) * plotW, 2);
    }

    // SVG rects: 10 rows × 3 bars each = rects[0..29]; rects[30..32] are legend swatches
    const rects = Array.from(svg?.querySelectorAll("rect") ?? []);
    expect(rects.length).toBeGreaterThanOrEqual(30);

    // Row 0 = ARE (h1=59.4, h2=64.0, q1=70.1)
    const areH1W = parseFloat(rects[0].getAttribute("width")!);
    const areH2W = parseFloat(rects[1].getAttribute("width")!);
    const areQ1W = parseFloat(rects[2].getAttribute("width")!);

    expect(areH1W).toBeCloseTo(expectedW(59.4), 1);
    expect(areH2W).toBeCloseTo(expectedW(64.0), 1);
    expect(areQ1W).toBeCloseTo(expectedW(70.1), 1);

    // Row 2 = NOR (h1=45.3)
    const norH1W = parseFloat(rects[6].getAttribute("width")!);
    expect(norH1W).toBeCloseTo(expectedW(45.3), 1);

    // Shared-scale proof: cross-row width ratio must equal cross-row value ratio.
    // Under per-row normalization each row's max bar fills plotW — this ratio would differ.
    expect(areQ1W / norH1W).toBeCloseTo(70.1 / 45.3, 2);

    // SCALE_MAX=75 proof: ARE q1 at 70.1% must be ~93.5% of plotW, not 100%.
    // If SCALE_MAX were 100 the width would be ~339.3 instead of ~452.4.
    expect(areQ1W).toBeLessThan(plotW);
    expect(areQ1W).toBeCloseTo((70.1 / SCALE_MAX_EXPECTED) * plotW, 1);
  });

  it("renders a visible table (not sr-only) with all required column headers", () => {
    render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    // Ensure it is NOT hidden — no sr-only parent covering the table
    const tableParent = table.closest(".sr-only");
    expect(tableParent).toBeNull();

    // Check column headers
    expect(screen.getByRole("columnheader", { name: /Economy/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /H1 2025/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /H2 2025/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Q1 2026/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Change/i })).toBeInTheDocument();
  });

  it("economy column uses th scope=row for each data row", () => {
    render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const rowHeaders = screen.getAllByRole("rowheader");
    expect(rowHeaders).toHaveLength(FIXTURE_ROWS.length);
    expect(rowHeaders[0].textContent).toContain("United Arab Emirates");
    expect(rowHeaders[0].closest("th")?.getAttribute("scope")).toBe("row");
  });

  it("table contains all 10 country names and their values", () => {
    render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    for (const row of FIXTURE_ROWS) {
      // Names appear in both SVG text nodes and table cells; use getAllByText
      expect(screen.getAllByText(row.name).length).toBeGreaterThan(0);
    }
    // Spot-check value presence via table cells
    const cells = document.querySelectorAll("td");
    const cellText = Array.from(cells).map((c) => c.textContent ?? "").join(" ");
    expect(cellText).toMatch(/70\.1%/);
    expect(cellText).toMatch(/59\.4%/);
  });

  it("sr-only figcaption contains all country names with period labels", () => {
    const { container } = render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const figcaption = container.querySelector("figcaption.sr-only");
    expect(figcaption).not.toBeNull();
    const text = figcaption?.textContent ?? "";
    expect(text).toContain("United Arab Emirates");
    expect(text).toContain("H1 2025");
    expect(text).toContain("Q1 2026");
  });

  it("renders the caveat text with required claim guardrails", () => {
    render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const body = document.body.textContent ?? "";
    // Metric description
    expect(body).toMatch(/working-age population/i);
    // Explicit ≠ claims (caveat uses "Usage ≠ ...")
    expect(body).toMatch(/[Uu]sage\s*≠/);
    // Short window disclosure
    expect(body).toMatch(/short|three.*period|caution/i);
    // Telemetry bias
    expect(body).toMatch(/telemetry|undercount/i);
    // MIT license disclosure
    expect(body).toMatch(/MIT/i);
  });

  it("usage guardrail is visible near the heading/chart (not only in the bottom caveat)", () => {
    const { container } = render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    // The guardrail paragraph sits inside the header flex div, before the chart
    const headerDiv = container.querySelector("section > div.flex");
    const guardrailText = headerDiv?.textContent ?? "";
    expect(guardrailText).toMatch(/[Uu]sage\s*\u2260/);
  });

  it("renders a source link to /sources", () => {
    render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const link = screen.getByRole("link", { name: /Data & Sources/i });
    expect(link).toHaveAttribute("href", "/sources");
  });

  it("renders an accessible legend with three period labels", () => {
    render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const legend = screen.getByRole("list", { name: /Legend/i });
    expect(legend).toBeInTheDocument();
    const items = legend.querySelectorAll("[role='listitem']");
    expect(items.length).toBe(3);
    const text = legend.textContent ?? "";
    expect(text).toContain("H1 2025");
    expect(text).toContain("H2 2025");
    expect(text).toContain("Q1 2026");
  });

  it("legend aria-label uses localized key (ZH locale shows 图例)", () => {
    setLocale("zh");
    render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const legend = screen.getByRole("list", { name: "图例" });
    expect(legend).toBeInTheDocument();
  });

  it("returns null when data array is empty", () => {
    const { container } = render(<DiffusionGrowthComparison data={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

// ── 3. i18n key parity and terminology tests ──────────────────────────────────

describe("DiffusionGrowthComparison i18n", () => {
  it("EN and ZH diffusionGrowth keys have exact parity", () => {
    const enKeys = Object.keys(globalEn)
      .filter((k) => k.startsWith("diffusionGrowth"))
      .sort();
    const zhKeys = Object.keys(globalZh)
      .filter((k) => k.startsWith("diffusionGrowth"))
      .sort();

    expect(enKeys.length).toBeGreaterThan(0);
    expect(zhKeys).toEqual(enKeys);
  });

  it("EN title presents top economies by Q1 2026 level — not fastest-growth wording", () => {
    const title = globalEn.diffusionGrowthTitle ?? "";
    expect(title).toMatch(/Consumer GenAI Diffusion/i);
    // Must not imply fastest-growth ranking
    expect(title).not.toMatch(/fastest.{0,20}growth/i);
    expect(title).not.toMatch(/workplace/i);
    expect(title).not.toMatch(/economic impact/i);
    expect(title).not.toMatch(/labor impact/i);
  });

  it("ZH title is a faithful equivalent (消费者生成式AI普及)", () => {
    expect(globalZh.diffusionGrowthTitle).toMatch(/消费者生成式AI普及/);
  });

  it("EN caveat uses 'Usage ≠' and discloses short window and telemetry bias", () => {
    const caveat = globalEn.diffusionGrowthCaveat ?? "";
    // Usage ≠ capability/workplace adoption/productivity/labor-market impact
    expect(caveat).toMatch(/[Uu]sage\s*≠/);
    expect(caveat).toMatch(/short|three.*period|caution/i);
    expect(caveat).toMatch(/telemetry|undercount/i);
    expect(caveat).toMatch(/MIT/i);
    // Guardrail: must NOT positively claim workplace penetration or labor displacement
    expect(caveat).not.toMatch(/workplace penetration/i);
    expect(caveat).not.toMatch(/labor.{0,10}displacement/i);
    // "productivity" appears only in the ≠-disclaimer list, not as a positive claim
    if (caveat.includes("productivity")) {
      expect(caveat).toMatch(/[Uu]sage\s*≠[^.]*productivity/);
    }
  });

  it("EN caveat explicitly excludes composite with Indeed/Anthropic/IMF", () => {
    const caveat = globalEn.diffusionGrowthCaveat ?? "";
    expect(caveat).toMatch(/Not merged/i);
    expect(caveat).toMatch(/Indeed|Anthropic|IMF/);
  });

  it("EN caveat states absolute-share top 10 is not a representative global sample", () => {
    const caveat = globalEn.diffusionGrowthCaveat ?? "";
    expect(caveat).toMatch(/absolute[- ]share|top 10.*not.*global|not.*representative/i);
    expect(caveat).toMatch(/digital.{0,30}access|Microsoft.{0,40}penetration/i);
  });

  it("EN subtitle explicitly states ranked by Q1 2026 level, not fastest-growth", () => {
    const subtitle = globalEn.diffusionGrowthSubtitle ?? "";
    expect(subtitle).toMatch(/Q1.*2026/i);
    // Subtitle must clarify ranking basis — negation of fastest-growth ranking is acceptable
    // but must not read as "ranked by fastest growth"
    expect(subtitle).not.toMatch(/ranked\s+by\s+.{0,30}growth/i);
    expect(subtitle).toMatch(/Q1.*2026.*level|level.*descending|Ranked by Q1/i);
  });

  it("ZH caveat is non-empty and contains core guardrail terms", () => {
    const caveat = globalZh.diffusionGrowthCaveat ?? "";
    expect(caveat.length).toBeGreaterThan(50);
    expect(caveat).toMatch(/MIT/);
  });

  it("diffusionGrowthColH1/H2/Q1 match the three period labels EN", () => {
    expect(globalEn.diffusionGrowthColH1).toMatch(/H1 2025/);
    expect(globalEn.diffusionGrowthColH2).toMatch(/H2 2025/);
    expect(globalEn.diffusionGrowthColQ1).toMatch(/Q1 2026/);
  });

  it("renders correctly in ZH locale", () => {
    setLocale("zh");
    render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const body = document.body.textContent ?? "";
    expect(body).toContain(globalZh.diffusionGrowthTitle);
    expect(body).not.toContain(globalEn.diffusionGrowthTitle);
  });
});

// ── 4. Architecture (server/client boundary) tests ────────────────────────────

const PAGE_PATH  = path.join(process.cwd(), "app/global/page.tsx");
const VIEW_PATH  = path.join(process.cwd(), "components/global/GlobalView.tsx");
const COMP_PATH  = path.join(process.cwd(), "components/global/DiffusionGrowthComparison.tsx");

describe("DiffusionGrowthComparison architecture", () => {
  it("page.tsx imports getTopDiffusionComparison from @/lib/data", () => {
    const src = readFileSync(PAGE_PATH, "utf8");
    expect(src).toMatch(/getTopDiffusionComparison/);
    expect(src).toMatch(/from\s+["']@\/lib\/data["']/);
  });

  it("page.tsx calls getTopDiffusionComparison(10)", () => {
    const src = readFileSync(PAGE_PATH, "utf8");
    expect(src).toMatch(/getTopDiffusionComparison\(10\)/);
  });

  it("page.tsx passes diffusionComparison prop to GlobalView", () => {
    const src = readFileSync(PAGE_PATH, "utf8");
    expect(src).toMatch(/diffusionComparison=\{diffusionComparison\}/);
  });

  it("GlobalView.tsx renders DiffusionGrowthComparison with data prop", () => {
    const src = readFileSync(VIEW_PATH, "utf8");
    expect(src).toMatch(/DiffusionGrowthComparison/);
    expect(src).toMatch(/data=\{diffusionComparison\}/);
  });

  it("DiffusionGrowthComparison.tsx is a client component", () => {
    const src = readFileSync(COMP_PATH, "utf8");
    expect(src.trimStart()).toMatch(/^["']use client["']/);
  });

  it("DiffusionGrowthComparison.tsx does NOT import server-only", () => {
    const src = readFileSync(COMP_PATH, "utf8");
    expect(src).not.toMatch(/server-only/);
  });

  it("section anchor ID is 'diffusion-growth-comparison'", () => {
    expect(SECTION_IDS.diffusionGrowthComparison).toBe("diffusion-growth-comparison");
  });

  it("deep-link href points to /global#diffusion-growth-comparison", () => {
    expect(DEEP_LINK_HREFS.globalDiffusionGrowthComparison).toBe(
      "/global#diffusion-growth-comparison",
    );
  });
});
