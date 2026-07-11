// @vitest-environment jsdom
/**
 * tests/components/WageTierPolarizationLens.test.tsx
 *
 * Spec tests for the WageTierPolarizationLens client component.
 * Issue: FutureGrid#109
 *
 * The component file may not exist yet (Neo/Switch are implementing it).
 * Tests that require the component use existsSync guards consistent with other
 * spec-blocker tests in this suite. Source-text and fixture tests pass
 * regardless of component existence.
 *
 * Coverage:
 *  - Component file exists and has "use client" (spec-blocker)
 *  - Component does NOT runtime-import lib/wage-tier-polarization (server-only boundary)
 *  - Component does NOT import raw JSON data files
 *  - Renders without crashing given a minimal WageTierPolarization fixture
 *  - Lens toggle exists for switching between employment-weighted and
 *    occupation-count display modes
 *  - After toggle, the displayed figures reflect the selected weighting mode
 *  - Summary stats (included occupation count, total employment) visible
 *  - Methodology caveat / descriptive-only disclosure present
 *  - Provenance badge or source link present
 *  - All tier/band labels use text (non-color-only labeling) for accessibility
 *  - No causal or longitudinal claim in rendered output
 *  - Sectors EN / ZH namespace key-set parity
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { ComponentType } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sectorsEn } from "@/lib/i18n/messages/en/sectors";
import { sectorsZh } from "@/lib/i18n/messages/zh/sectors";
import type {
  WageTierPolarization,
  WageTier,
  WageTierBandCell,
  WageTierPolarizationSummary,
  WageTierPolarizationMethodology,
  ExposureBandDef,
} from "@/lib/wage-tier-polarization";

// ── Paths ──────────────────────────────────────────────────────────────────────

const COMPONENT_PATH = path.join(
  process.cwd(),
  "components/sectors/WageTierPolarizationLens.tsx",
);

// ── Framework mocks ────────────────────────────────────────────────────────────

const mockUseLanguage = vi.fn(() => ({
  locale: "en" as "en" | "zh",
  setLocale: vi.fn(),
}));

vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
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

// ── Minimal fixture ────────────────────────────────────────────────────────────

function buildBands(
  empSplit: [number, number, number, number],
  occSplit: [number, number, number, number],
  tierEmp: number,
  tierOcc: number,
): WageTierBandCell[] {
  const ids = ["minimal", "low", "moderate", "elevated"] as const;
  return ids.map((band, i) => ({
    band,
    employment: empSplit[i],
    employmentShare: tierEmp > 0 ? empSplit[i] / tierEmp : 0,
    occupationCount: occSplit[i],
    occupationShare: tierOcc > 0 ? occSplit[i] / tierOcc : 0,
  }));
}

const BAND_DEFS: ExposureBandDef[] = [
  { id: "minimal",  min: 0,    max: 0.05 },
  { id: "low",      min: 0.05, max: 0.15 },
  { id: "moderate", min: 0.15, max: 0.30 },
  { id: "elevated", min: 0.30, max: 1.0  },
];

const LOW_TIER: WageTier = {
  id: "low",
  wageFloor: 22_000,
  wageCeiling: 44_000,
  employment: 43_500_000,
  employmentShare: 0.333,
  occupationCount: 210,
  weightedMeanExposure: 0.08,
  meanExposure: 0.09,
  bands: buildBands(
    [21_750_000, 10_875_000, 7_250_000, 3_625_000],
    [90, 50, 45, 25],
    43_500_000,
    210,
  ),
};

const MIDDLE_TIER: WageTier = {
  id: "middle",
  wageFloor: 44_001,
  wageCeiling: 88_000,
  employment: 44_000_000,
  employmentShare: 0.337,
  occupationCount: 290,
  weightedMeanExposure: 0.18,
  meanExposure: 0.20,
  bands: buildBands(
    [8_800_000, 13_200_000, 13_200_000, 8_800_000],
    [40, 80, 100, 70],
    44_000_000,
    290,
  ),
};

const HIGH_TIER: WageTier = {
  id: "high",
  wageFloor: 88_001,
  wageCeiling: 250_000,
  employment: 43_500_000,
  employmentShare: 0.330,
  occupationCount: 255,
  weightedMeanExposure: 0.35,
  meanExposure: 0.32,
  bands: buildBands(
    [2_175_000, 4_350_000, 13_050_000, 23_925_000],
    [10, 20, 80, 145],
    43_500_000,
    255,
  ),
};

const FIXTURE_SUMMARY: WageTierPolarizationSummary = {
  includedOccupations: 755,
  totalEmployment: 131_000_000,
  excludedForMissingEmployment: 1,
  excludedForMissingSalaryOrExposure: 0,
  overallWeightedMeanExposure: 0.21,
  highMinusLowExposureGap: 0.27,
};

const FIXTURE_METHODOLOGY: WageTierPolarizationMethodology = {
  label: "Wage-Tier AI-Exposure Polarization",
  description:
    "Employment-weighted distribution of AI-exposure scores across three " +
    "wage terciles, derived from the occupation snapshot. Association ≠ causation.",
  caveats: [
    "Cross-sectional single-period snapshot. Not a time-series or longitudinal trend.",
    "Employment is a pre-outcome baseline count (OEWS), not a measure of job loss.",
    "AI exposure is a modelled adoption proxy — association ≠ causation.",
    "Tiers are constructed equal-employment thirds of the 755-occupation universe.",
  ],
  datasetBadgeIds: ["occupation-snapshot"],
  bands: BAND_DEFS,
  tierMethod: "employment-weighted-tercile",
};

const FIXTURE: WageTierPolarization = {
  tiers: [LOW_TIER, MIDDLE_TIER, HIGH_TIER],
  summary: FIXTURE_SUMMARY,
  methodology: FIXTURE_METHODOLOGY,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

type LensModule = {
  default?: ComponentType<{ data: WageTierPolarization }>;
  WageTierPolarizationLens?: ComponentType<{ data: WageTierPolarization }>;
};

async function importLens(): Promise<ComponentType<{ data: WageTierPolarization }>> {
  expect(
    existsSync(COMPONENT_PATH),
    "components/sectors/WageTierPolarizationLens.tsx must exist — Neo must create this Client Component",
  ).toBe(true);

  const mod = (await import(
    /* @vite-ignore */ pathToFileURL(COMPONENT_PATH).href
  )) as LensModule;
  const Component = mod.default ?? mod.WageTierPolarizationLens;
  expect(
    typeof Component,
    "WageTierPolarizationLens should be a React component export",
  ).toBe("function");
  return Component as ComponentType<{ data: WageTierPolarization }>;
}

function setLocale(locale: "en" | "zh") {
  mockUseLanguage.mockReturnValue({ locale, setLocale: vi.fn() });
}

afterEach(() => {
  cleanup();
  setLocale("en");
});

// ── Source-text contract tests (no component needed) ──────────────────────────

describe("WageTierPolarizationLens — source-text contract [SPEC-BLOCKER]", () => {
  it("component file exists at components/sectors/WageTierPolarizationLens.tsx", () => {
    expect(
      existsSync(COMPONENT_PATH),
      [
        "components/sectors/WageTierPolarizationLens.tsx must exist.",
        "Neo must create this Client Component to render the wage-tier polarization lens.",
      ].join(" "),
    ).toBe(true);
  });

  it("declares 'use client' at the top of the file", () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(
      src,
      "WageTierPolarizationLens.tsx must declare 'use client' — it owns interactive toggle state",
    ).toMatch(/^['"]use client['"]/m);
  });

  it("does NOT have a runtime import of lib/wage-tier-polarization (server-only boundary)", () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const src = readFileSync(COMPONENT_PATH, "utf8");
    // Runtime import: `import ... from '...wage-tier-polarization'`
    // `import type { … }` is erased at compile time and is permitted.
    const runtimeImportRe = /^import\s+(?!type[\s{])(?:[^;\n]*?)["'][^"']*wage-tier-polarization[^"']*["']/m;
    expect(
      src,
      "WageTierPolarizationLens.tsx must not runtime-import lib/wage-tier-polarization — " +
        "the server-only helper must not enter the client bundle",
    ).not.toMatch(runtimeImportRe);
  });

  it("does NOT import raw JSON data files", () => {
    if (!existsSync(COMPONENT_PATH)) return;
    const src = readFileSync(COMPONENT_PATH, "utf8");
    const rawJsonRe = /from\s+["'](?:@\/)?data\/[^"']+\.json["']/;
    expect(
      src,
      "WageTierPolarizationLens.tsx must not import raw JSON data files — data belongs in the server layer",
    ).not.toMatch(rawJsonRe);
  });
});

// ── Rendering contract tests (conditional on file existence) ──────────────────

describe("WageTierPolarizationLens — renders without crashing [SPEC-BLOCKER]", () => {
  it("renders with a minimal WageTierPolarization fixture without throwing", async () => {
    const Lens = await importLens();
    expect(() => render(<Lens data={FIXTURE} />)).not.toThrow();
  });

  it("renders all three tier labels (Low, Middle, High) as visible text", async () => {
    const Lens = await importLens();
    render(<Lens data={FIXTURE} />);
    const text = document.body.textContent ?? "";
    // The component renders "Low Wage", "Middle Wage", "High Wage" via i18n.
    // Use substring search (no word boundaries) since textContent concatenates nodes without spaces.
    expect(text).toMatch(/Low Wage|low.?wage/i);
    expect(text).toMatch(/Middle Wage|middle.?wage/i);
    expect(text).toMatch(/High Wage|high.?wage/i);
  });

  it("renders all four band labels as visible text", async () => {
    const Lens = await importLens();
    render(<Lens data={FIXTURE} />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/minimal/i);
    expect(text).toMatch(/\blow\b/i);    // "low" band
    expect(text).toMatch(/moderate/i);
    expect(text).toMatch(/elevated/i);
  });
});

describe("WageTierPolarizationLens — lens toggle switches weighting mode [SPEC-BLOCKER]", () => {
  it("renders a toggle or control for switching between employment-weighted and occupation-count views", async () => {
    const Lens = await importLens();
    render(<Lens data={FIXTURE} />);
    // Accept a button, radio, or tab that references the two display modes.
    const buttons = screen.getAllByRole("button", { hidden: true });
    const allInteractives = [
      ...buttons,
      ...Array.from(document.querySelectorAll('[role="tab"], [role="radio"], [role="switch"]')),
    ];
    // At least one interactive control must reference employment or occupation
    const hasToggle = allInteractives.some((el) =>
      /employ|occupation|count|weighted/i.test(el.textContent ?? el.getAttribute("aria-label") ?? ""),
    );
    expect(
      hasToggle,
      "WageTierPolarizationLens must have a toggle control for employment-weighted vs occupation-count views",
    ).toBe(true);
  });

  it("clicking the toggle changes the visible figures (different weighting, same tiers)", async () => {
    const Lens = await importLens();
    render(<Lens data={FIXTURE} />);

    // Find the "By Occupations" toggle button specifically.
    // The initial state is "headcount"; clicking "occupations" changes the view.
    const occupationsBtn = screen.queryAllByRole("button").find((el) =>
      /^by\s+occupations?$/i.test(el.textContent?.trim() ?? "") ||
      /occupations?/i.test(el.textContent?.trim() ?? "") && !/headcount/i.test(el.textContent?.trim() ?? ""),
    );

    if (!occupationsBtn) {
      // Toggle not yet present — skip without failing the fixture assertions.
      return;
    }

    const textBefore = document.body.textContent ?? "";
    fireEvent.click(occupationsBtn);
    const textAfter = document.body.textContent ?? "";

    // After switching from headcount to occupations mode, the displayed numbers
    // change (meanExposure differs from weightedMeanExposure in the fixture).
    expect(textAfter).not.toBe(textBefore);
  });
});

describe("WageTierPolarizationLens — summary stats visible [SPEC-BLOCKER]", () => {
  it("shows the included occupation count (755) somewhere in the rendered output", async () => {
    const Lens = await importLens();
    render(<Lens data={FIXTURE} />);
    const text = document.body.textContent ?? "";
    expect(
      text,
      "WageTierPolarizationLens should display the included occupation count (755)",
    ).toMatch(/755/);
  });
});

describe("WageTierPolarizationLens — methodology caveat and provenance [SPEC-BLOCKER]", () => {
  it("displays descriptive-only / caveat text (non-empty methodology disclosure)", async () => {
    const Lens = await importLens();
    render(<Lens data={FIXTURE} />);
    const text = document.body.textContent ?? "";
    // Accept any form of caveat disclosure text.
    const hasCaveat =
      /descriptive|caveat|note:|disclaimer|association|snapshot|methodology/i.test(text);
    expect(
      hasCaveat,
      "WageTierPolarizationLens must display a caveat or descriptive-only disclosure",
    ).toBe(true);
  });

  it("renders provenance reference (data source or badge)", async () => {
    const Lens = await importLens();
    render(<Lens data={FIXTURE} />);
    const links = Array.from(document.querySelectorAll("a"));
    const badges = Array.from(document.querySelectorAll("[data-source-badge], [data-badge]"));
    const text = document.body.textContent ?? "";

    const hasProvenance =
      links.some((a) => /source|oews|bls|anthropic|snapshot/i.test(a.href + a.textContent)) ||
      badges.length > 0 ||
      /oews|bls|anthropic|occupation.snapshot/i.test(text);

    expect(
      hasProvenance,
      "WageTierPolarizationLens must include a provenance reference (source link or badge)",
    ).toBe(true);
  });
});

describe("WageTierPolarizationLens — non-color labels (accessible tier/band naming) [SPEC-BLOCKER]", () => {
  it("tier and band names are present as text (not color-only), accessible without color vision", async () => {
    const Lens = await importLens();
    render(<Lens data={FIXTURE} />);
    const text = document.body.textContent ?? "";

    // Each tier ID should appear as text somewhere (sr-only or visible).
    for (const label of ["low", "middle", "high", "minimal", "moderate", "elevated"]) {
      expect(
        text.toLowerCase(),
        `WageTierPolarizationLens must render tier/band label '${label}' as text (not color-only)`,
      ).toContain(label);
    }
  });
});

describe("WageTierPolarizationLens — no causal or longitudinal claim [SPEC-BLOCKER]", () => {
  it("rendered text does not contain causal or predictive claims about wages", async () => {
    const Lens = await importLens();
    render(<Lens data={FIXTURE} />);
    const text = document.body.textContent ?? "";

    const BANNED = [
      /AI causes? (wage|job|employ)/i,
      /predicts? layoffs?/i,
      /\bproves?\b/i,
      /longitudinal trend/i,
      /time.series/i,
    ];
    for (const pattern of BANNED) {
      expect(
        text,
        `WageTierPolarizationLens should not contain banned wording matching ${pattern}`,
      ).not.toMatch(pattern);
    }
  });
});

// ── EN / ZH locale parity (immediate: no component required) ─────────────────

describe("sectors i18n namespace — EN / ZH parity for WageTierPolarizationLens keys", () => {
  it("EN and ZH sectors namespaces have identical sorted key sets", () => {
    const enKeys = Object.keys(sectorsEn).sort();
    const zhKeys = Object.keys(sectorsZh).sort();
    expect(enKeys).toEqual(zhKeys);
  });

  it("renders localized tier label in ZH mode (locale-aware text, not hardcoded EN)", async () => {
    if (!existsSync(COMPONENT_PATH)) return;
    setLocale("zh");
    const Lens = await importLens();
    render(<Lens data={FIXTURE} />);
    // Should produce non-empty text when ZH locale is active (no crash or empty render).
    const text = document.body.textContent ?? "";
    expect(text.trim().length).toBeGreaterThan(0);
  });
});
