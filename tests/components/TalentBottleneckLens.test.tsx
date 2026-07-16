// @vitest-environment jsdom

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentType } from "react";
import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { visaEn } from "@/lib/i18n/messages/en/visa";
import { visaZh } from "@/lib/i18n/messages/zh/visa";
import { SECTION_IDS } from "@/lib/section-anchors";
import type { TalentBottleneckData } from "@/lib/talent-bottleneck";

const COMPONENT_PATH = path.join(process.cwd(), "components/visa/TalentBottleneckLens.tsx");
const VISA_PAGE_PATH = path.join(process.cwd(), "app/visa/page.tsx");
const VISA_VIEW_PATH = path.join(process.cwd(), "components/visa/VisaTrendsView.tsx");

const mockUseLanguage = vi.fn(() => ({
  locale: "en" as "en" | "zh",
  setLocale: vi.fn(),
}));

vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
}));

const BANNED_WORDING = [
  /\bproves\b/i,
  /shortage proof/i,
  /certified LCAs are visa approvals/i,
  /\bcaused\b/i,
];

const FIXTURE_DATA: TalentBottleneckData = {
  datasetBadgeIds: ["h1b-trends", "employment-projections", "job-postings"],
  methodology: {
    label: "Fixture Talent Bottleneck Lens",
    description: "Fixture source join for deterministic component rendering.",
    scoreFormula: "Fixture weighted average.",
    normalization: "Fixture normalization keeps all signals on a 0–100 scale.",
    caveats: [
      "Certified LCAs are not visa approvals.",
      "The score is an index, not proof of shortage or causality.",
    ],
    sourceNotes: ["Fixture rows are keyed by SOC code."],
  },
  summary: {
    occupationsTracked: 3,
    rowsReturned: 3,
    latestH1bFiscalYear: 2025,
    latestJobPostingYear: 2025,
    jobPostingsMode: "observed-provider-with-seed-fallback",
    jobPostingsObserved: true,
    projectionWindow: { baseYear: 2023, projectionYear: 2033 },
    matched: {
      h1b: 3,
      employmentProjections: 3,
      jobPostings: 3,
      occupationSnapshot: 3,
    },
    scoreRange: { min: 61.2, max: 92.4 },
    scoreWeights: {
      latestLcas: 0.22,
      totalLcas: 0.12,
      h1bCagr: 0.1,
      projectedOpenings: 0.24,
      employmentChangePct: 0.1,
      latestPostings: 0.12,
      aiExposure: 0.1,
    },
    topRows: [
      { rank: 1, score: 92.4, socCode: "15-1252", title: "Software Developers" },
    ],
  },
  rows: [
    {
      rank: 1,
      score: 92.4,
      socCode: "15-1252",
      title: "Software Developers",
      sector: "Computer and Mathematical",
      latestLcas: 22000,
      totalLcas: 180000,
      h1bCagr: 0.042,
      h1bTrend: "rising",
      medianWageAnnual: 145000,
      medianWageAnnualSource: "h1b",
      projectedOpenings: 125000,
      employmentChangePct: 17.9,
      latestPostings: 54000,
      aiExposure: 0.76,
      automationRisk: "High",
      scoreComponents: {
        latestLcas: 1,
        totalLcas: 1,
        h1bCagr: 0.7,
        projectedOpenings: 1,
        employmentChangePct: 0.8,
        latestPostings: 1,
        aiExposure: 0.76,
      },
      sourceFlags: {
        hasH1b: true,
        hasEmploymentProjection: true,
        hasJobPostings: true,
        hasOccupationSnapshot: true,
        jobPostingsSourceStatus: "fixture",
      },
    },
    {
      rank: 2,
      score: 78.6,
      socCode: "15-2051",
      title: "Data Scientists",
      sector: "Computer and Mathematical",
      latestLcas: 8200,
      totalLcas: 42000,
      h1bCagr: 0.065,
      h1bTrend: "rising",
      medianWageAnnual: 132000,
      medianWageAnnualSource: "employment-projections",
      projectedOpenings: 73000,
      employmentChangePct: 35.2,
      latestPostings: 31000,
      aiExposure: 0.88,
      automationRisk: "Very High",
      scoreComponents: {
        latestLcas: 0.8,
        totalLcas: 0.7,
        h1bCagr: 1,
        projectedOpenings: 0.75,
        employmentChangePct: 1,
        latestPostings: 0.7,
        aiExposure: 0.88,
      },
      sourceFlags: {
        hasH1b: true,
        hasEmploymentProjection: true,
        hasJobPostings: true,
        hasOccupationSnapshot: true,
        jobPostingsSourceStatus: "fixture",
      },
    },
    {
      rank: 3,
      score: 61.2,
      socCode: "13-1111",
      title: "Management Analysts",
      sector: "Business and Financial Operations",
      latestLcas: 1800,
      totalLcas: 12500,
      h1bCagr: -0.012,
      h1bTrend: "falling",
      medianWageAnnual: 98000,
      medianWageAnnualSource: "occupation-snapshot",
      projectedOpenings: 94000,
      employmentChangePct: 9.5,
      latestPostings: 22000,
      aiExposure: 0.44,
      automationRisk: "Medium",
      scoreComponents: {
        latestLcas: 0.4,
        totalLcas: 0.5,
        h1bCagr: 0,
        projectedOpenings: 0.8,
        employmentChangePct: 0.4,
        latestPostings: 0.5,
        aiExposure: 0.44,
      },
      sourceFlags: {
        hasH1b: true,
        hasEmploymentProjection: true,
        hasJobPostings: true,
        hasOccupationSnapshot: true,
        jobPostingsSourceStatus: "fixture",
      },
    },
  ],
};

type TalentBottleneckLensModule = {
  default?: ComponentType<{ data: TalentBottleneckData }>;
  TalentBottleneckLens?: ComponentType<{ data: TalentBottleneckData }>;
};

function setLocale(locale: "en" | "zh") {
  mockUseLanguage.mockReturnValue({ locale, setLocale: vi.fn() });
}

async function importTalentBottleneckLens(): Promise<ComponentType<{ data: TalentBottleneckData }>> {
  expect(
    existsSync(COMPONENT_PATH),
    "Expected components/visa/TalentBottleneckLens.tsx to render the talent bottleneck lens",
  ).toBe(true);

  const importedModule = (await import(/* @vite-ignore */ pathToFileURL(COMPONENT_PATH).href)) as TalentBottleneckLensModule;
  const Component = importedModule.default ?? importedModule.TalentBottleneckLens;
  expect(typeof Component, "TalentBottleneckLens should be a React component export").toBe("function");
  return Component as ComponentType<{ data: TalentBottleneckData }>;
}

describe("TalentBottleneckLens", () => {
  beforeEach(() => {
    setLocale("en");
  });

  it("is wired into /visa with server-loaded talent bottleneck data", () => {
    const visaPageSource = readFileSync(VISA_PAGE_PATH, "utf8");
    const visaViewSource = readFileSync(VISA_VIEW_PATH, "utf8");

    expect(visaPageSource).toMatch(/import\s+\{\s*getTalentBottleneckData\s*\}\s+from\s+["']@\/lib\/talent-bottleneck["']/);
    expect(visaPageSource).toMatch(/const\s+talentBottleneck\s*=\s*getTalentBottleneckData\(\)/);
    expect(visaPageSource).toContain("talentBottleneck={talentBottleneck}");
    expect(visaViewSource).toContain('import TalentBottleneckLens from "./TalentBottleneckLens"');
    expect(visaViewSource).toMatch(/<TalentBottleneckLens\s+data=\{talentBottleneck\}\s*\/>/);
  });

  it("keeps English and Chinese talent bottleneck i18n keys identical", () => {
    const enKeys = Object.keys(visaEn).filter((key) => key.startsWith("talentBottleneck")).sort();
    const zhKeys = Object.keys(visaZh).filter((key) => key.startsWith("talentBottleneck")).sort();

    expect(enKeys.length).toBeGreaterThan(0);
    expect(zhKeys).toEqual(enKeys);
  });

  it("renders headings, caveat framing, accessible chart, ranked table, and neutral wording", async () => {
    const TalentBottleneckLens = await importTalentBottleneckLens();

    render(<TalentBottleneckLens data={FIXTURE_DATA} />);

    const section = document.getElementById(SECTION_IDS.talentBottleneckLens);
    expect(section).toHaveClass("scroll-mt-24");
    expect(section).toHaveAttribute(
      "aria-labelledby",
      `${SECTION_IDS.talentBottleneckLens}-heading`,
    );
    expect(screen.getByRole("heading", { name: "Talent Bottleneck Lens" })).toBeInTheDocument();
    expect(screen.getByText(/Certified LCAs are not visa approvals/i)).toBeInTheDocument();
    expect(screen.getByText(/not proof of shortage or causality/i)).toBeInTheDocument();
    expect(screen.getByText(/proxy\/seed-derived/i)).toBeInTheDocument();
    expect(screen.getByText(/Job postings mode/i)).toBeInTheDocument();
    expect(screen.getByText(/Observed \+ seed fallback/i)).toBeInTheDocument();

    expect(screen.getByText(/Occupations tracked/i)).toBeInTheDocument();
    expect(screen.getByText(/Latest H-1B fiscal year/i)).toBeInTheDocument();
    expect(screen.getByText(/Projection window/i)).toBeInTheDocument();
    expect(screen.getByText(/Top score \/ occupation/i)).toBeInTheDocument();
    expect(screen.getByText("FY2025")).toBeInTheDocument();
    expect(screen.getByText("2023–2033")).toBeInTheDocument();

    expect(
      screen.getByRole("img", { name: /AI exposure on the x-axis and projected annual openings/i }),
    ).toBeInTheDocument();
    expect(document.querySelector("ul.sr-only")?.textContent ?? "").toContain("Software Developers");

    const table = screen.getByRole("table", {
      name: /Top 12 talent bottleneck occupations/i,
    });
    expect(within(table).getByText("Software Developers")).toBeInTheDocument();
    expect(within(table).getByText("15-1252 · Computer and Mathematical")).toBeInTheDocument();
    expect(within(table).getAllByText("22,000").length).toBeGreaterThan(0);
    expect(within(table).getByText("$145,000")).toBeInTheDocument();
    expect(within(table).getByText("76%")).toBeInTheDocument();
    expect(within(table).getByText("High")).toBeInTheDocument();

    expect(screen.getByText(/Fixture source join/i)).toBeInTheDocument();
    expect(screen.getByText(/Fixture normalization/i)).toBeInTheDocument();

    const pageText = document.body.textContent ?? "";
    expect(FIXTURE_DATA.rows[0].h1bCagr).toBe(0.042);
    expect(pageText).toContain("Top row H-1B CAGR: Software Developers: +4.2%");
    expect(pageText).not.toContain("Software Developers: +0.0%");
    for (const pattern of BANNED_WORDING) {
      expect(pageText, `TalentBottleneckLens should avoid banned wording ${pattern}`).not.toMatch(pattern);
    }
  }, 10000);

  // D1 regression: scatter circle <title> must be a single complete string (not
  // multiple JSX expression children).  React 19 hoists <title> with multiple
  // expression children, causing hydration error #418 on /visa.
  it("D1: scatter circle titles are non-empty and contain occupation name + score + exposure", async () => {
    setLocale("en");
    const TalentBottleneckLens = await importTalentBottleneckLens();
    render(<TalentBottleneckLens data={FIXTURE_DATA} />);

    const svgTitles = Array.from(document.querySelectorAll("circle > title, g > title"))
      .map((el) => el.textContent ?? "");
    expect(svgTitles.length).toBeGreaterThan(0);
    for (const titleText of svgTitles) {
      expect(titleText.length).toBeGreaterThan(0);
    }
    // Fixture row: Software Developers, score=92.4, aiExposure=0.72
    const swDev = svgTitles.find((t) => t.includes("Software Developers"));
    expect(swDev).toBeDefined();
    expect(swDev).toMatch(/92/);  // score≈92.4
  }, 10000);

  // D3 regression: sr-only list must have [white-space:normal] to prevent
  // nowrap inline text from contributing to document.scrollWidth on mobile.
  it("D3: accessible sr-only occupation list has [white-space:normal] class", async () => {
    setLocale("en");
    const TalentBottleneckLens = await importTalentBottleneckLens();
    render(<TalentBottleneckLens data={FIXTURE_DATA} />);

    const srOnlyList = document.querySelector("ul.sr-only");
    expect(srOnlyList, "Expected a <ul class='sr-only ...'>").toBeDefined();
    expect(srOnlyList?.classList.contains("[white-space:normal]")).toBe(true);
  }, 10000);
});
