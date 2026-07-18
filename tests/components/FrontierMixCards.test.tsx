// @vitest-environment jsdom
/**
 * tests/components/FrontierMixCards.test.tsx
 *
 * Coverage:
 * - Source-text structural checks: mixAccessCaveat is rendered unconditionally (not hover-only)
 * - Render: mixAccessCaveat is visible in the DOM with correct semantics
 * - Render: caveat is not aria-hidden
 * - Render: ZH locale renders ZH caveat text
 * - No unresolved {placeholder} tokens in rendered output
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { frontierEn } from "@/lib/i18n/messages/en/frontier";
import { frontierZh } from "@/lib/i18n/messages/zh/frontier";

// ── Paths ─────────────────────────────────────────────────────────────────────

const COMPONENT_PATH = path.join(
  process.cwd(),
  "components/frontier/FrontierMixCards.tsx",
);

// ── Framework mocks ───────────────────────────────────────────────────────────

const mockUseLanguage = vi.fn(() => ({
  locale: "en" as "en" | "zh",
  setLocale: vi.fn(),
}));

vi.mock("@/lib/i18n/LanguageProvider", () => ({
  useLanguage: () => mockUseLanguage(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function setLocale(locale: "en" | "zh") {
  mockUseLanguage.mockReturnValue({ locale, setLocale: vi.fn() });
}

async function importComponent() {
  const { default: FrontierMixCards } = await import(
    "@/components/frontier/FrontierMixCards"
  );
  return FrontierMixCards;
}

// ── Source-text structural tests ──────────────────────────────────────────────

describe("FrontierMixCards — source-text structure", () => {
  it("component file exists", () => {
    expect(existsSync(COMPONENT_PATH)).toBe(true);
  });

  it("component has 'use client' directive (client component boundary)", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src.trimStart().startsWith('"use client"')).toBe(true);
  });

  it("component renders t('mixAccessCaveat') in source", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    expect(src).toContain('t("mixAccessCaveat")');
  });

  it("mixAccessCaveat is rendered unconditionally — not gated by a conditional operator", () => {
    const src = readFileSync(COMPONENT_PATH, "utf8");
    const caveatIdx = src.indexOf('t("mixAccessCaveat")');
    expect(caveatIdx, "t('mixAccessCaveat') must be present").toBeGreaterThan(-1);
    // The 60 chars immediately before the call should be JSX content context,
    // not a ternary ? or short-circuit && operator that would make it conditional
    const context = src.slice(Math.max(0, caveatIdx - 60), caveatIdx);
    expect(context, "mixAccessCaveat must not be preceded by a ternary ?").not.toMatch(/\?\s*$/);
    expect(context, "mixAccessCaveat must not be preceded by &&").not.toMatch(/&&\s*$/);
  });
});

// ── Render tests ──────────────────────────────────────────────────────────────

describe("FrontierMixCards — rendered output", () => {
  beforeEach(() => setLocale("en"));
  afterEach(() => vi.restoreAllMocks());

  it("renders without crashing in EN locale", async () => {
    const FrontierMixCards = await importComponent();
    expect(() => render(<FrontierMixCards />)).not.toThrow();
  });

  it("mixAccessCaveat is visible in the rendered DOM (not hover-only)", async () => {
    const FrontierMixCards = await importComponent();
    render(<FrontierMixCards />);
    const bodyText = document.body.textContent ?? "";
    // The caveat mentions restricted-use or non-commercial licenses
    expect(bodyText, "caveat must mention restricted or non-commercial").toMatch(
      /restricted|non.commercial/i,
    );
    // And states that weights availability does not imply permissive open-source
    expect(bodyText.toLowerCase(), "caveat must state weights ≠ permissive open-source").toMatch(
      /not imply|does not imply|permissive/,
    );
  });

  it("mixAccessCaveat element is not aria-hidden", async () => {
    const FrontierMixCards = await importComponent();
    const { container } = render(<FrontierMixCards />);
    // Find the paragraph that renders the caveat text
    const allParas = Array.from(container.querySelectorAll("p"));
    const caveatEl = allParas.find((el) =>
      /restricted|non.commercial/i.test(el.textContent ?? ""),
    );
    expect(caveatEl, "caveat paragraph must be present in DOM").not.toBeUndefined();
    expect(
      caveatEl!.getAttribute("aria-hidden"),
      "caveat element must not be aria-hidden",
    ).not.toBe("true");
    const ariaHiddenAncestor = caveatEl!.closest('[aria-hidden="true"]');
    expect(
      ariaHiddenAncestor,
      "caveat must not have an aria-hidden ancestor",
    ).toBeNull();
  });

  it("renders ZH mixAccessCaveat text in ZH locale", async () => {
    setLocale("zh");
    const FrontierMixCards = await importComponent();
    render(<FrontierMixCards />);
    const bodyText = document.body.textContent ?? "";
    // ZH: 受限使用 = restricted use; 非商业 = non-commercial
    expect(bodyText, "ZH caveat must mention restricted/non-commercial").toMatch(/受限使用|非商业/);
    // ZH: 不代表 = does not imply; 宽松 = permissive
    expect(bodyText, "ZH caveat must state weights ≠ permissive open-source").toMatch(
      /不代表|宽松/,
    );
  });

  it("EN mixAccessCaveat text matches the EN i18n string (key sanity check)", async () => {
    const FrontierMixCards = await importComponent();
    render(<FrontierMixCards />);
    const bodyText = document.body.textContent ?? "";
    // Verify a distinctive substring of the actual EN string is present
    const enCaveat = frontierEn.mixAccessCaveat;
    // Use the first 40 chars as a distinctive fragment (avoids whole-string snapshot)
    const fragment = enCaveat.slice(0, 40);
    expect(bodyText, "EN mixAccessCaveat content must appear in DOM").toContain(fragment);
  });

  it("ZH mixAccessCaveat key is non-empty and distinct from EN", () => {
    expect(
      frontierZh.mixAccessCaveat.length,
      "ZH mixAccessCaveat must be non-empty",
    ).toBeGreaterThan(0);
    // ZH and EN values should not be identical (would indicate untranslated placeholder)
    expect(frontierZh.mixAccessCaveat).not.toBe(frontierEn.mixAccessCaveat);
  });

  it("rendered output has no unresolved {placeholder} tokens", async () => {
    const FrontierMixCards = await importComponent();
    render(<FrontierMixCards />);
    const bodyText = document.body.textContent ?? "";
    const unresolved = bodyText.match(/\{[a-zA-Z]+\}/g);
    expect(
      unresolved,
      `Unresolved interpolation tokens in FrontierMixCards output: ${JSON.stringify(unresolved)}`,
    ).toBeNull();
  });
});
