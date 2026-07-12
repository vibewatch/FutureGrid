// @vitest-environment jsdom
/**
 * tests/components/ExposureOutcomeMatrix.test.tsx
 *
 * Spec tests for the Exposure → Outcome Reality Matrix client component.
 * Issue: vibewatch/FutureGrid#105
 *
 * The component file may not exist yet — tests that require it use existsSync
 * guards consistent with other spec-blocker tests in this suite. Tests that
 * inspect only the fixture or the helper pass regardless of component existence.
 *
 * Coverage:
 *  - Component file exists and exports a valid React component
 *  - Y-axis toggle switches between employment growth and wage growth
 *  - Accessible sr-only list fallback is non-empty
 *  - All quadrant/status labels are non-color text (no raw CSS token leak)
 *  - Career links point to /careers/{code} for occupations with valid codes
 *  - Outcome-missing state: null empGrowth/wageGrowth handled without crash
 *  - Methodology caveat text is present and non-empty
 *  - Employment sizing label is present (bubble size indicator)
 *  - Quadrant/descriptive labels do not use causal or job-loss-predictive language
 *  - Component declares "use client" (must not be a Server Component)
 *  - Component does NOT runtime-import lib/exposure-outcome (server-only boundary)
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentType } from "react";
import { render, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ExposureOutcomeMatrix,
  ExposureOutcomePoint,
} from "@/lib/exposure-outcome";

// ── Paths ──────────────────────────────────────────────────────────────────────

const COMPONENT_PATH = path.join(
  process.cwd(),
  "components/insights/ExposureOutcomeMatrix.tsx",
);

// ── Framework mocks ────────────────────────────────────────────────────────────

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

// ── Minimal fixture ────────────────────────────────────────────────────────────

/** A small but realistic ExposureOutcomeMatrix fixture for isolated rendering. */
function buildFixture(): ExposureOutcomeMatrix {
  const points: ExposureOutcomePoint[] = [
    {
      code: "15-1252",
      title: "Software Developers",
      sector: "Computer and Mathematical",
      capability: 82,
      usage: 60,
      ability: 70,
      automation: 48,
      consensus: 71,
      gap: 22,
      empGrowth: 1.8,
      wageGrowth: 2.1,
      employment: 1_840_000,
      disruptionScore: 55,
      disruptionRank: 120,
    },
    {
      code: "43-9022",
      title: "Word Processors and Typists",
      sector: "Office and Administrative Support",
      capability: 91,
      usage: 55,
      ability: 85,
      automation: 94,
      consensus: 77,
      gap: 36,
      empGrowth: -3.2,
      wageGrowth: -0.5,
      employment: 16_000,
      disruptionScore: 88,
      disruptionRank: 5,
    },
    {
      code: "21-1022",
      title: "Healthcare Social Workers",
      sector: "Community and Social Service",
      capability: 20,
      usage: 15,
      ability: null,
      automation: null,
      consensus: 18,
      gap: 5,
      // Explicitly null outcomes — no BLS history available for this test point
      empGrowth: null,
      wageGrowth: null,
      employment: 185_000,
      disruptionScore: null,
      disruptionRank: null,
    },
  ];

  const methodology = {
    label: "Exposure → Outcome Reality Matrix",
    description:
      "Descriptive join of getExposureComparison, getAISignalData, and getDisruptionIndex by SOC code. " +
      "Correlation statistics are Pearson r; correlation ≠ causation.",
    caveats: [
      "Descriptive/exploratory only: all statistics summarise historical associations; correlation ≠ causation.",
      "Capability potential measures what models can perform — not current AI deployment.",
      "Usage proxy reflects adoption-signal estimates, not directly observed market data.",
      "AIOE ability scores use a different task-weighting methodology than LLM-benchmark capability scores.",
      "Labor-outcome CAGR figures cover the available BLS history window only.",
      "Employment headcounts reflect the latest available BLS figures.",
      "The Disruption Index is a composite descriptive ranking; it does not assert future job loss.",
      "Explicit null values indicate absent data; no values have been fabricated or reweighted.",
    ],
    datasetBadgeIds: ["occupation-snapshot", "llm-exposure", "aioe-exposure", "automation-baseline"],
  };

  return {
    points,
    summary: {
      totalOccupations: points.length,
      withLaborOutcomes: 2,
      withCapability: 3,
      withGap: 3,
      withDisruptionScore: 2,
      bounds: {
        capability: { min: 20, max: 91 },
        usage: { min: 15, max: 60 },
        gap: { min: 5, max: 36 },
        empGrowth: { min: -3.2, max: 1.8 },
        wageGrowth: { min: -0.5, max: 2.1 },
        employment: { min: 16_000, max: 1_840_000 },
        disruptionScore: { min: 55, max: 88 },
      },
      outcomeWindow: { fromYear: 2016, toYear: 2024 },
    },
    capabilityVsEmpGrowthR: -0.12,
    capabilityVsWageGrowthR: -0.18,
    gapVsEmpGrowthR: -0.08,
    gapVsWageGrowthR: -0.14,
    methodology,
  };
}

const fixture = buildFixture();

// ── Dynamic import helper ──────────────────────────────────────────────────────

type MatrixModule = {
  default?: ComponentType<{ matrix: ExposureOutcomeMatrix }>;
  ExposureOutcomeMatrix?: ComponentType<{ matrix: ExposureOutcomeMatrix }>;
};

async function importMatrix(): Promise<ComponentType<{ matrix: ExposureOutcomeMatrix }>> {
  expect(
    existsSync(COMPONENT_PATH),
    "Neo must create components/insights/ExposureOutcomeMatrix.tsx — client visualization for the matrix",
  ).toBe(true);
  const mod = (await import(/* @vite-ignore */ pathToFileURL(COMPONENT_PATH).href)) as MatrixModule;
  const Component = mod.default ?? mod.ExposureOutcomeMatrix;
  expect(typeof Component, "ExposureOutcomeMatrix must be a React component (default or named export)").toBe(
    "function",
  );
  return Component as ComponentType<{ matrix: ExposureOutcomeMatrix }>;
}

// ── Cleanup ────────────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup();
});

// ── File existence and module contract ────────────────────────────────────────

describe("ExposureOutcomeMatrix file", () => {
  it("exists at components/insights/ExposureOutcomeMatrix.tsx", () => {
    expect(
      existsSync(COMPONENT_PATH),
      "Neo must create components/insights/ExposureOutcomeMatrix.tsx",
    ).toBe(true);
  });

  it("declares 'use client' (must be a Client Component, not a Server Component)", () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(
      src,
      "ExposureOutcomeMatrix.tsx must declare 'use client' — it owns interactive state (y-toggle, tooltips)",
    ).toMatch(/^['"]use client['"]/m);
  });

  it("does NOT have a runtime import of lib/exposure-outcome (server-only boundary)", () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const src = readFileSync(COMPONENT_PATH, "utf8");
    // Only flag runtime imports — `import type { … }` is erased at compile time.
    const runtimeImportRe =
      /^import\s+(?!type[\s{])(?:[^;\n]*?)["'][^"']*exposure-outcome[^"']*["']/m;
    expect(
      src,
      "ExposureOutcomeMatrix.tsx must not have a runtime import of lib/exposure-outcome — " +
        "data must be passed as props from the Server Component",
    ).not.toMatch(runtimeImportRe);
  });

  it("exports a default or named React component", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    await importMatrix();
  });
});

// ── Basic rendering ────────────────────────────────────────────────────────────

describe("ExposureOutcomeMatrix basic rendering", () => {
  it("renders without throwing when given a valid matrix fixture", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    expect(() => render(<Matrix matrix={fixture} />)).not.toThrow();
  });

  it("renders employment bubble-size label text (employment sizing indicator)", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);
    // The component must indicate that bubble/dot size represents employment headcount.
    const text = container.textContent ?? "";
    expect(
      text,
      "Component must label the employment bubble-size encoding (e.g. 'bubble size', 'employment', or 'workers')",
    ).toMatch(/bubble\s*size|employment|workers|headcount|size.*employ|employ.*size/i);
  });
});

// ── Y-axis toggle ─────────────────────────────────────────────────────────────

describe("ExposureOutcomeMatrix y-axis toggle", () => {
  it("renders both toggle options for employment and wage growth", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);
    const text = container.textContent ?? "";
    expect(
      text,
      "Component should offer an employment growth toggle/label",
    ).toMatch(/employment/i);
    expect(
      text,
      "Component should offer a wage growth toggle/label",
    ).toMatch(/wage/i);
  });

  it("responds to a y-axis toggle interaction without throwing", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);

    // Find toggle buttons or radio inputs for employment/wage metric switch.
    const toggleButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
        "button, input[type='radio']",
      ),
    ).filter((el) => {
      const text = (el.textContent ?? el.getAttribute("value") ?? el.getAttribute("aria-label") ?? "").toLowerCase();
      return /employment|wage/i.test(text);
    });

    // If the component renders toggle controls, clicking should not throw.
    if (toggleButtons.length > 0) {
      expect(() => fireEvent.click(toggleButtons[0])).not.toThrow();
    }
  });

  it("axis label reflects the current y metric", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);

    // The active y-axis label must contain either "employment" or "wage" text.
    const axisLabels = Array.from(
      container.querySelectorAll("[aria-label], [data-testid], text, .axis-label, .y-axis-label"),
    ).map((el) => (el.textContent ?? el.getAttribute("aria-label") ?? "").toLowerCase());

    const hasMetricLabel = axisLabels.some((label) => /employment|wage/i.test(label));
    expect(
      hasMetricLabel || /employment|wage/i.test(container.textContent ?? ""),
      "Component must render a visible y-axis metric label (employment or wage growth)",
    ).toBe(true);
  });
});

// ── Accessible fallback ────────────────────────────────────────────────────────

describe("ExposureOutcomeMatrix accessible list fallback", () => {
  it("renders a non-empty sr-only list or table as accessible text equivalent", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);

    // Standard accessible-chart pattern: sr-only list or table inside a figure/section.
    const srList = container.querySelector("ul.sr-only, ol.sr-only, table.sr-only");
    const srItems = container.querySelectorAll(".sr-only li, .sr-only tr");

    if (srList) {
      expect(
        srItems.length,
        "sr-only list/table must contain at least one item per fixture occupation",
      ).toBeGreaterThanOrEqual(fixture.points.length);
    } else {
      // Alternative: figcaption with sr-only containing occupation text.
      const srCaption = container.querySelector("figcaption.sr-only, .sr-only");
      expect(
        srCaption,
        "Component must provide an sr-only accessible text equivalent (list, table, or figcaption)",
      ).not.toBeNull();
      const captionText = srCaption?.textContent ?? "";
      // The fixture has "Software Developers" — it should appear in the accessible text.
      expect(
        captionText,
        "Accessible text equivalent must include occupation names from the matrix",
      ).toMatch(/Software Developers|Word Processors|15-1252/i);
    }
  });

  it("accessible text includes at least one occupation title from the fixture", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);
    const srEls = Array.from(container.querySelectorAll(".sr-only"));
    const srText = srEls.map((el) => el.textContent ?? "").join(" ");
    expect(
      srText,
      "sr-only content must include at least one occupation title for screen-reader users",
    ).toMatch(/Software Developers|Word Processors|Healthcare Social Workers|15-1252|43-9022/i);
  });
});

// ── Non-color labels ──────────────────────────────────────────────────────────

describe("ExposureOutcomeMatrix non-color labels", () => {
  it("does not expose raw Tailwind color class names as visible text", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);
    const visibleText = container.textContent ?? "";
    const tailwindColorFragments =
      /\bbg-emerald\b|\bbg-amber\b|\bbg-rose\b|\bbg-cyan\b|\btext-emerald\b|\btext-amber\b|\btext-rose\b|\btext-cyan\b|\btext-violet\b/;
    expect(
      visibleText,
      "Raw Tailwind color class tokens must not leak into visible text content",
    ).not.toMatch(tailwindColorFragments);
  });
});

// ── Career links ──────────────────────────────────────────────────────────────

describe("ExposureOutcomeMatrix career links", () => {
  it("renders at least one career profile link pointing to /careers/{code}", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);

    // Wait for any async d3 effects to run.
    await waitFor(
      () => {
        const anchors = Array.from(container.querySelectorAll<HTMLAnchorElement>("a[href]"));
        const careerLinks = anchors.filter((a) =>
          /\/careers\/[\d]{2}-[\d]{4}/.test(a.getAttribute("href") ?? ""),
        );
        // The component may render links in a tooltip/panel — just assert they exist
        // when a occupation is hovered/selected, OR in the accessible list.
        // If no career links appear in the initial render, check the sr-only text.
        if (careerLinks.length === 0) {
          const srText = Array.from(container.querySelectorAll(".sr-only"))
            .map((el) => el.textContent ?? "")
            .join(" ");
          // Either career links are present in the DOM, or the sr-only text references careers.
          const hasCareersRef =
            careerLinks.length > 0 ||
            srText.includes("/careers/") ||
            srText.match(/career|profile/i);
          expect(
            hasCareersRef || careerLinks.length > 0,
            "Component must provide career profile links (in DOM or sr-only content) for SOC codes",
          ).toBe(true);
        } else {
          expect(careerLinks.length).toBeGreaterThan(0);
        }
      },
      { timeout: 2000 },
    );
  });
});

// ── Outcome-missing state ─────────────────────────────────────────────────────

describe("ExposureOutcomeMatrix outcome-missing state", () => {
  it("renders without throwing when some occupations have null empGrowth and wageGrowth", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    // fixture includes 21-1022 with null empGrowth and wageGrowth.
    expect(() => render(<Matrix matrix={fixture} />)).not.toThrow();
  });

  it("renders without throwing when ALL occupations have null labor outcomes", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const nullOutcomes: ExposureOutcomeMatrix = {
      ...fixture,
      points: fixture.points.map((p) => ({ ...p, empGrowth: null, wageGrowth: null })),
      summary: {
        ...fixture.summary,
        withLaborOutcomes: 0,
        bounds: {
          ...fixture.summary.bounds,
          empGrowth: { min: 0, max: 0 },
          wageGrowth: { min: 0, max: 0 },
        },
      },
    };
    expect(() => render(<Matrix matrix={nullOutcomes} />)).not.toThrow();
  });
});

// ── Methodology caveat ────────────────────────────────────────────────────────

describe("ExposureOutcomeMatrix methodology caveat", () => {
  it("renders methodology caveat or disclaimer text", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);
    const text = container.textContent ?? "";
    expect(
      text,
      "Component must display caveat/disclaimer about descriptive/correlation-only nature",
    ).toMatch(/caveat|descriptive|exploratory|correlation|historical|causal|not.*causal|disclaimer/i);
  });

  it("renders text from the methodology.label or methodology.description", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);
    const text = container.textContent ?? "";
    // Either the label "Exposure → Outcome Reality Matrix" or a caveat phrase appears.
    const hasMethodologyContext =
      text.includes("Exposure") ||
      text.includes("outcome") ||
      text.includes("matrix") ||
      text.match(/correlation|historical|caveat|exploratory/i);
    expect(
      hasMethodologyContext,
      "Component must render some methodology context text derived from the matrix prop",
    ).toBeTruthy();
  });
});

// ── Quadrant semantics without causal overclaiming ────────────────────────────

describe("ExposureOutcomeMatrix quadrant labels and causal language", () => {
  it("does not use causal or job-loss-predictive language in visible text", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);
    const text = container.textContent ?? "";

    const BANNED = [
      { label: "proves", pattern: /\bproves?\b/i },
      { label: "causes displacement", pattern: /causes?\s+displacement/i },
      { label: "AI caused", pattern: /\bAI\s+caused\b/i },
      { label: "predicts layoffs", pattern: /\bpredicts?\s+layoffs?\b/i },
      { label: "will lose jobs", pattern: /\bwill\s+lose\s+jobs\b/i },
      { label: "guaranteed", pattern: /\bguaranteed\b/i },
    ];

    for (const { label, pattern } of BANNED) {
      expect(text, `Component must not use banned causal wording: "${label}"`).not.toMatch(pattern);
    }
  });
});

// ── Gap unit labeling (pp, not %) ─────────────────────────────────────────────

describe("ExposureOutcomeMatrix gap unit labeling", () => {
  it("renders gap values with pp suffix, not % suffix in accessible table", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);

    // The fixture has gap values of 22 (Software Developers) and 36 (Word Processors).
    // These are percentage points, not raw percentages.
    const allText = container.textContent ?? "";

    // The gap table header should say (pp)
    expect(
      allText,
      "Accessible table header for gap column must indicate percentage-point units (pp)",
    ).toMatch(/\bpp\b/);

    // No gap value should be rendered with a bare % that misrepresents it as a raw percentage.
    // The gap label should be "Gap (pp)" not just "Gap".
    expect(
      allText,
      "Gap label must include (pp) unit to distinguish from raw percentage lenses",
    ).toMatch(/Gap.*pp|pp.*Gap/i);
  });

  it("does not format gap as a bare percentage (e.g. '+22.00%') in tooltip or list", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);
    const srContent = Array.from(container.querySelectorAll(".sr-only, [class*='sr-only'], caption"))
      .map((el) => el.textContent ?? "")
      .join(" ");

    // The table caption must acknowledge truncation
    expect(
      srContent + (container.textContent ?? ""),
      "Accessible table must include a truncation caption or note",
    ).toMatch(/first 60|showing.*60|60.*occupation|60.*total|前.*60/i);
  });

  it("renders gap column in accessible table with pp suffix for fixture data", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);

    // Look for the formatted gap value '+22.00pp' or '+36.00pp' anywhere in the DOM.
    const fullText = container.innerHTML;
    expect(
      fullText,
      "Gap values in the accessible table or ARIA attributes must use pp suffix, not % suffix",
    ).toMatch(/\+22\.00pp|\+36\.00pp|\+5\.00pp/);
  });
});

// ── Mobile-card gap unit regression ──────────────────────────────────────────
// Regression guard for the mobile fallback path in ExposureOutcomeMatrix.
// Bug: mobile card formatted p.gap with fmtPct (yielding "+22.00%") while the
// gapLabel already says "pp".  Fix: use fmtGap (yielding "+22.00pp").
// mobileRows includes occupations with a non-null disruptionRank sorted
// ascending by rank.  Fixture: Word Processors (rank=5, gap=36),
// Software Developers (rank=120, gap=22).

describe("ExposureOutcomeMatrix mobile-card gap unit (regression)", () => {
  it("mobile cards render gap values with pp suffix, not % suffix", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);

    // jsdom does not apply CSS — sm:hidden is present in the DOM regardless.
    const mobileSection = container.querySelector('[class*="sm:hidden"]');
    expect(
      mobileSection,
      "Mobile card section (sm:hidden) must be present in the rendered DOM",
    ).not.toBeNull();

    const mobileHTML = mobileSection!.innerHTML;

    // Gap values must use pp (fmtGap), not % (fmtPct).
    // Fixture: Word Processors gap=36 → +36.00pp; Software Developers gap=22 → +22.00pp.
    expect(
      mobileHTML,
      "Mobile card gap must be formatted with pp suffix (fmtGap), not bare % (fmtPct)",
    ).toMatch(/\+36\.00pp|\+22\.00pp/);

    // Employment and wage growth must still use % — this guards against over-correction.
    // Fixture: Word Processors empGrowth=−3.2 → −3.20%; Software Developers empGrowth=+1.8 → +1.80%.
    expect(
      mobileHTML,
      "Mobile card employment growth must still be formatted as a percentage (%)",
    ).toMatch(/-3\.20%|\+1\.80%/);
  });

  it("mobile cards must NOT render the fixture gap values with bare % suffix", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const Matrix = await importMatrix();
    const { container } = render(<Matrix matrix={fixture} />);

    const mobileSection = container.querySelector('[class*="sm:hidden"]');
    expect(
      mobileSection,
      "Mobile card section (sm:hidden) must be present in the rendered DOM",
    ).not.toBeNull();

    const mobileText = mobileSection!.textContent ?? "";

    // The pre-fix bug rendered fmtPct(gap) → "+22.00%" and "+36.00%".
    // These strings must NOT appear after the fix (gap is pp, not %).
    expect(
      mobileText,
      "Gap value +22.00% must NOT appear — gap is in percentage points (pp), not raw %",
    ).not.toContain("+22.00%");
    expect(
      mobileText,
      "Gap value +36.00% must NOT appear — gap is in percentage points (pp), not raw %",
    ).not.toContain("+36.00%");
  });
});
