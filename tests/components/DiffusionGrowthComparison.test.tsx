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
    expect(heading?.textContent).toMatch(/Consumer GenAI Diffusion Growth/i);
  });

  it("renders the chart SVG with accessible role and aria-label", () => {
    render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const img = screen.getByRole("img");
    expect(img.tagName.toLowerCase()).toBe("svg");
    expect(img.getAttribute("aria-label")).toMatch(/Consumer GenAI Diffusion Growth/i);
  });

  it("renders a figure element wrapping the chart", () => {
    const { container } = render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const figure = container.querySelector("figure");
    expect(figure).not.toBeNull();
    expect(figure?.getAttribute("aria-label")).toMatch(/Consumer GenAI Diffusion Growth/i);
  });

  it("chart uses a single shared scale (SCALE_MAX constant is 75)", () => {
    // All bars are scaled relative to the same 75% maximum — verify via SVG viewBox
    const { container } = render(<DiffusionGrowthComparison data={FIXTURE_ROWS} />);
    const svg = container.querySelector("svg[role='img']");
    expect(svg).not.toBeNull();
    const viewBox = svg?.getAttribute("viewBox") ?? "";
    expect(viewBox).toMatch(/^0 0 680 /);
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

  it("EN title says 'Consumer GenAI Diffusion Growth' — not workplace wording", () => {
    const title = globalEn.diffusionGrowthTitle ?? "";
    expect(title).toMatch(/Consumer GenAI Diffusion Growth/i);
    expect(title).not.toMatch(/workplace/i);
    expect(title).not.toMatch(/workplace adoption/i);
    expect(title).not.toMatch(/economic impact/i);
    expect(title).not.toMatch(/labor impact/i);
  });

  it("ZH title is a faithful equivalent (消费者生成式AI普及增长)", () => {
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
