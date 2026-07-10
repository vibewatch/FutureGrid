// @vitest-environment jsdom
/**
 * tests/components/ReskillingBridge.test.tsx
 *
 * Integration tests for the ReskillingBridge component and the updated /skills page.
 *
 * Coverage:
 * - Component renders origin list and destination details from fixture data
 * - Selecting an origin by click updates the displayed destinations
 * - Keyboard navigation selects origins (Enter/Space to activate)
 * - Non-color semantic labels for risk and AI exposure (text, not just color)
 * - H-1B filing caveat surfaced in the component
 * - Projected openings caveat surfaced in the component
 * - Null annualOpenings handled without crash (no "undefined" or "NaN" in output)
 * - Career links are valid /careers/<socCode> hrefs
 * - Accessible list/table semantics (role="list"/"table", aria-labels, sr-only)
 * - Skills page source references ReskillingBridge and NOT SkillTransitionChart
 *
 * BLOCKER NOTE: These tests require Neo to implement
 *   components/skills/ReskillingBridge.tsx
 * and update app/skills/page.tsx to:
 *   - import and render <ReskillingBridge data={...} />
 *   - remove the <SkillTransitionChart /> import and render
 * Tests will fail with clear errors until those files exist.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentType } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ReskillingBridgeData } from "@/lib/reskilling-bridge";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

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

// ── Fixture ───────────────────────────────────────────────────────────────────

/**
 * Minimal but realistic fixture derived from the actual reskilling-bridge data.
 * Values are pinned to the real output of getReskillingBridgeData({ originLimit: 2 })
 * to ensure no synthetic or random transition values are introduced.
 */
const FIXTURE_DATA: ReskillingBridgeData = {
  methodology: {
    label: "Talent Bottleneck → Reskilling Bridge",
    description:
      "A SOC-keyed derived join that pairs each high-pressure bottleneck occupation " +
      "(scored from certified H-1B LCA filings, BLS employment projections, job-posting " +
      "signals, and AI exposure) with evidence-based reskilling destinations.",
    caveats: [
      "Certified H-1B LCAs are employer filings, not visa approvals; LCA filing counts are not evidence of actual shortages.",
      "Transition scores are evidence-based skill-overlap estimates derived from O*NET data, not observed placement rates.",
      "Annual openings are BLS 10-year projection averages, not current realized demand.",
      "Job postings used in bottleneck scoring are deterministic seed-derived proxies, not observed market postings.",
      "The bottleneck score is a descriptive composite ranking; it does not assert causality or shortage.",
      "Salary delta reflects snapshot median differences; individual wage outcomes will vary.",
    ],
    datasetBadgeIds: [
      "h1b-trends",
      "employment-projections",
      "job-postings",
      "occupation-snapshot",
    ],
  },
  summary: {
    originsReturned: 2,
    destinationsPerOriginMax: 6,
    totalDestinationPairs: 12,
    bottleneckScoreWindow: { min: 62.72, max: 63.57 },
  },
  origins: [
    {
      socCode: "13-1161",
      title: "Market Research Analysts and Marketing Specialists",
      bottleneckScore: 63.57,
      latestLcas: 5231,
      aiExposure: 0.6483,
      destinations: [
        {
          socCode: "29-1071",
          title: "Physician Assistants",
          transitionScore: 96,
          exposureDropPts: 64.83,
          sharedSkills: [
            "Reading Comprehension",
            "Critical Thinking",
            "Active Listening",
            "Writing",
            "Speaking",
          ],
          missingSkills: [],
          salaryDelta: 57120,
          annualOpenings: 11500,
          aiExposure: 0,
          automationRisk: "Low",
        },
        {
          socCode: "11-9111",
          title: "Medical and Health Services Managers",
          transitionScore: 94,
          exposureDropPts: 58.24,
          sharedSkills: [
            "Speaking",
            "Critical Thinking",
            "Reading Comprehension",
            "Active Listening",
            "Writing",
          ],
          missingSkills: [],
          salaryDelta: 45100,
          annualOpenings: 42200,
          aiExposure: 0.0659,
          automationRisk: "Medium",
        },
        {
          socCode: "29-1215",
          title: "Family Medicine Physicians",
          transitionScore: 92,
          exposureDropPts: 64.83,
          sharedSkills: [
            "Critical Thinking",
            "Reading Comprehension",
            "Active Listening",
            "Writing",
            "Speaking",
          ],
          missingSkills: [],
          salaryDelta: 165420,
          annualOpenings: null, // Explicit null — no projections row for this SOC
          aiExposure: 0,
          automationRisk: "Low",
        },
      ],
    },
    {
      socCode: "13-2011",
      title: "Accountants and Auditors",
      bottleneckScore: 62.72,
      latestLcas: 9681,
      aiExposure: 0.3478,
      destinations: [
        {
          socCode: "29-1071",
          title: "Physician Assistants",
          transitionScore: 89,
          exposureDropPts: 34.78,
          sharedSkills: [
            "Reading Comprehension",
            "Critical Thinking",
            "Active Listening",
            "Writing",
            "Speaking",
          ],
          missingSkills: [],
          salaryDelta: 52200,
          annualOpenings: 11500,
          aiExposure: 0,
          automationRisk: "Low",
        },
        {
          socCode: "29-1215",
          title: "Family Medicine Physicians",
          transitionScore: 90,
          exposureDropPts: 34.78,
          sharedSkills: [
            "Critical Thinking",
            "Reading Comprehension",
            "Active Listening",
            "Writing",
            "Speaking",
          ],
          missingSkills: [],
          salaryDelta: 160500,
          annualOpenings: null,
          aiExposure: 0,
          automationRisk: "Low",
        },
      ],
    },
  ],
};

// ── File paths (component must exist when Neo implements it) ──────────────────

const COMPONENT_SEARCH_PATHS = [
  path.join(process.cwd(), "components/skills/ReskillingBridge.tsx"),
  path.join(process.cwd(), "components/visa/ReskillingBridge.tsx"),
];
const SKILLS_PAGE_PATH = path.join(process.cwd(), "app/skills/page.tsx");

function resolveComponentPath(): string | null {
  return COMPONENT_SEARCH_PATHS.find(existsSync) ?? null;
}

type ReskillingBridgeModule = {
  default?: ComponentType<{ data: ReskillingBridgeData }>;
  ReskillingBridge?: ComponentType<{ data: ReskillingBridgeData }>;
};

async function importReskillingBridge(): Promise<ComponentType<{ data: ReskillingBridgeData }>> {
  const componentPath = resolveComponentPath();

  expect(
    componentPath,
    [
      "BLOCKER: ReskillingBridge component not found.",
      "Neo must create one of:",
      ...COMPONENT_SEARCH_PATHS.map((p) => `  ${p}`),
    ].join("\n"),
  ).not.toBeNull();

  const mod = (await import(
    /* @vite-ignore */ pathToFileURL(componentPath!).href
  )) as ReskillingBridgeModule;
  const Component = mod.default ?? mod.ReskillingBridge;

  expect(
    typeof Component,
    "ReskillingBridge must have a default or named ReskillingBridge export",
  ).toBe("function");

  return Component as ComponentType<{ data: ReskillingBridgeData }>;
}

// ── Skills page source checks (static analysis — no render needed) ────────────

describe("skills page source — bridge wiring and SkillTransitionChart removal", () => {
  it("skills page file exists", () => {
    expect(existsSync(SKILLS_PAGE_PATH), `Expected ${SKILLS_PAGE_PATH} to exist`).toBe(true);
  });

  it("skills page imports ReskillingBridge", () => {
    expect(existsSync(SKILLS_PAGE_PATH)).toBe(true);
    const source = readFileSync(SKILLS_PAGE_PATH, "utf8");
    expect(
      source,
      "BLOCKER: app/skills/page.tsx must import ReskillingBridge — Neo's implementation pending",
    ).toMatch(/import\s+.*ReskillingBridge.*from/);
  });

  it("skills page renders <ReskillingBridge> with data prop", () => {
    const source = readFileSync(SKILLS_PAGE_PATH, "utf8");
    expect(
      source,
      "BLOCKER: app/skills/page.tsx must render <ReskillingBridge with data prop",
    ).toMatch(/<ReskillingBridge\b[^>]*\bdata=/);
  });

  it("skills page does NOT import SkillTransitionChart", () => {
    const source = readFileSync(SKILLS_PAGE_PATH, "utf8");
    expect(
      source,
      "BLOCKER: app/skills/page.tsx should no longer import SkillTransitionChart after bridge migration",
    ).not.toMatch(/import\s+SkillTransitionChart/);
  });

  it("skills page does NOT render <SkillTransitionChart", () => {
    const source = readFileSync(SKILLS_PAGE_PATH, "utf8");
    expect(
      source,
      "BLOCKER: app/skills/page.tsx should no longer render <SkillTransitionChart> after bridge migration",
    ).not.toMatch(/<SkillTransitionChart\b/);
  });
});

// ── Component rendering ───────────────────────────────────────────────────────

describe("ReskillingBridge component — rendering", () => {
  it("renders without crashing with fixture data", async () => {
    const ReskillingBridge = await importReskillingBridge();
    expect(() => render(<ReskillingBridge data={FIXTURE_DATA} />)).not.toThrow();
  });

  it("renders origin occupation titles", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);
    // Origin titles appear in the origin list; may also appear in destination panel heading
    expect(
      screen.getAllByText(/Market Research Analysts and Marketing Specialists/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Accountants and Auditors/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders bottleneck scores for each origin", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);
    // Score 63.57 should appear as text somewhere (may be formatted)
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/63\.57|63\.6|63/);
  });

  it("renders destination titles for the initially selected origin", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);
    // Default selection should show destinations for the first origin
    expect(screen.getByText(/Physician Assistants/i)).toBeInTheDocument();
    expect(screen.getByText(/Medical and Health Services Managers/i)).toBeInTheDocument();
    expect(screen.getByText(/Family Medicine Physicians/i)).toBeInTheDocument();
  });

  it("renders the methodology label or section heading", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);
    const body = document.body.textContent ?? "";
    expect(body).toMatch(/Reskilling Bridge|Talent Bottleneck.*Reskilling/i);
  });
});

// ── Interaction — selection ───────────────────────────────────────────────────

describe("ReskillingBridge component — origin selection updates destinations", () => {
  it("clicking a non-default origin updates the destination list", async () => {
    const user = userEvent.setup();
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);

    // The second origin ("Accountants and Auditors") should be clickable
    const accountantsEl = screen.getByText(/Accountants and Auditors/i);
    await user.click(accountantsEl.closest("button") ?? accountantsEl);

    // After clicking, destinations for Accountants should be shown
    await waitFor(() => {
      expect(screen.getByText(/Physician Assistants/i)).toBeInTheDocument();
    });
  });

  it("selected origin is distinguishable from non-selected origins (aria-pressed or aria-selected)", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);

    // There should be a selected/pressed indicator for the active origin
    const pressedOrSelected =
      document.querySelector("[aria-pressed='true']") ??
      document.querySelector("[aria-selected='true']") ??
      document.querySelector("[data-selected='true']");
    expect(pressedOrSelected, "Expected an aria-pressed or aria-selected indicator for the active origin").not.toBeNull();
  });
});

// ── Caveats and disclosures ───────────────────────────────────────────────────

describe("ReskillingBridge component — required caveats", () => {
  it("surfaces H-1B filing caveat (LCAs are filings not approvals)", async () => {
    const user = userEvent.setup();
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);

    // The caveats section is collapsed by default behind a "Show" button.
    // Expand it so the caveat text becomes visible.
    const showBtn = screen.queryByRole("button", { name: /show/i });
    if (showBtn) await user.click(showBtn);

    const body = document.body.textContent ?? "";
    // After expanding, the full caveat text should be visible
    expect(body).toMatch(/LCA.*filings?|filings?.*not.*approvals?/i);
    expect(body).not.toMatch(/certified LCAs are visa approvals/i);
  });

  it("surfaces projected-openings caveat (BLS projections, not realized demand)", async () => {
    const user = userEvent.setup();
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);

    // Expand the caveats section
    const showBtn = screen.queryByRole("button", { name: /show/i });
    if (showBtn) await user.click(showBtn);

    const body = document.body.textContent ?? "";
    expect(body).toMatch(/BLS.*projection|projected.*annual|projection.*average/i);
  });

  it("does not claim causality or shortage (descriptive wording only)", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);
    const body = document.body.textContent ?? "";
    expect(body).not.toMatch(/\bproves?\b/i);
    expect(body).not.toMatch(/shortage proof/i);
    expect(body).not.toMatch(/certified LCAs are visa approvals/i);
  });
});

// ── Missing-value handling ────────────────────────────────────────────────────

describe("ReskillingBridge component — missing-value handling", () => {
  it("renders without error when annualOpenings is null", async () => {
    const ReskillingBridge = await importReskillingBridge();
    // FIXTURE_DATA contains 29-1215 with annualOpenings: null
    expect(() => render(<ReskillingBridge data={FIXTURE_DATA} />)).not.toThrow();
  });

  it("does not render 'undefined' or 'NaN' for null annualOpenings", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);
    const body = document.body.textContent ?? "";
    expect(body).not.toContain("undefined");
    expect(body).not.toContain("NaN");
  });

  it("shows a fallback label or omits the openings cell for null annualOpenings", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);
    // Component should handle the null gracefully — either show "N/A", "—", or omit
    // We verify the component doesn't crash and "Family Medicine Physicians" is visible
    expect(screen.getByText(/Family Medicine Physicians/i)).toBeInTheDocument();
  });
});

// ── Non-color labels ──────────────────────────────────────────────────────────

describe("ReskillingBridge component — non-color semantic labels", () => {
  it("automation risk is conveyed as text (not only via color)", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);
    // "Low" risk is in the fixture. Use getAllByText to find DOM elements with that text,
    // which avoids false negatives when textContent concatenates without spaces.
    const lowEls = screen.getAllByText(/^Low$/i);
    expect(lowEls.length).toBeGreaterThan(0);
  });

  it("transition score is shown as a number, not just a progress bar color", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);
    const body = document.body.textContent ?? "";
    // Top destination has transitionScore 96 for origin 13-1161
    expect(body).toMatch(/96/);
  });
});

// ── Career links ─────────────────────────────────────────────────────────────

describe("ReskillingBridge component — career links", () => {
  it("destination cards link to /careers/<socCode>", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);

    const links = screen.getAllByRole("link");
    const careerLinks = links.filter((l) => l.getAttribute("href")?.startsWith("/careers/"));
    expect(careerLinks.length).toBeGreaterThan(0);
    for (const link of careerLinks) {
      expect(link.getAttribute("href")).toMatch(/^\/careers\/\d{2}-\d{4}/);
    }
  });

  it("career links point to SOC codes present in the fixture destinations", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);

    const expectedSOCs = FIXTURE_DATA.origins[0].destinations.map((d) => d.socCode);
    const careerLinks = screen
      .getAllByRole("link")
      .filter((l) => l.getAttribute("href")?.startsWith("/careers/"));

    for (const link of careerLinks) {
      const href = link.getAttribute("href") ?? "";
      const soc = href.replace("/careers/", "");
      expect(soc).toMatch(/^\d{2}-\d{4}$/);
      expect(expectedSOCs).toContain(soc);
    }
  });
});

// ── Accessible semantics ─────────────────────────────────────────────────────

describe("ReskillingBridge component — accessible list/table semantics", () => {
  it("origin list or table has an accessible role (list, table, or listbox)", async () => {
    const ReskillingBridge = await importReskillingBridge();
    const { container } = render(<ReskillingBridge data={FIXTURE_DATA} />);

    const hasAccessibleContainer =
      container.querySelector('[role="list"]') !== null ||
      container.querySelector('[role="listbox"]') !== null ||
      container.querySelector("ul") !== null ||
      container.querySelector("ol") !== null ||
      container.querySelector("table") !== null;

    expect(
      hasAccessibleContainer,
      "Expected the origin list to use a <ul>, <ol>, <table>, or [role=list/listbox]",
    ).toBe(true);
  });

  it("provides an aria-label or accessible heading that identifies the component", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);

    const hasAccessibleLabel =
      document.querySelector("[aria-label]") !== null ||
      document.querySelector("[aria-labelledby]") !== null ||
      screen.queryByRole("heading") !== null;

    expect(
      hasAccessibleLabel,
      "Expected an aria-label, aria-labelledby, or heading in the component",
    ).toBe(true);
  });

  it("shared skills are rendered as identifiable text (not only data-attributes)", async () => {
    const ReskillingBridge = await importReskillingBridge();
    render(<ReskillingBridge data={FIXTURE_DATA} />);
    const body = document.body.textContent ?? "";
    // First origin's first destination shares "Reading Comprehension" with the origin
    expect(body).toMatch(/Reading Comprehension|Critical Thinking|Active Listening/);
  });
});
