/**
 * tests/analysis-architecture.test.ts
 *
 * Module-boundary and server/client contract tests for the
 * Exposure → Outcome Reality Matrix integration.
 * Issue: vibewatch/FutureGrid#105
 *
 * Encodes the correct server/client split for the new feature:
 *
 *  - lib/exposure-outcome.ts       → guarded with "server-only"; must not land in the
 *                                     client bundle
 *  - app/analysis/page.tsx         → Server Component; must call getExposureOutcomeMatrix()
 *                                     and pass results to an island (forward gate)
 *  - components/insights/          → InsightsView and ExposureOutcomeMatrix (when it exists)
 *    InsightsView.tsx                 must NOT runtime-import lib/exposure-outcome
 *    ExposureOutcomeMatrix.tsx        must have "use client" and pass data via props
 *
 * Some tests (server-only guard, InsightsView isolation) pass immediately.
 * Tests prefixed "FORWARD GATE" fail until the page and component are wired up by Neo.
 *
 * Existing component assertions (ExposureLensComparison, EvidenceStack still wired)
 * continue to pass — verifying the feature addition doesn't remove established sections.
 *
 * Assessment uses source-text pattern matching (same approach as
 * tests/skills-page-architecture.test.ts) rather than brittle line numbers.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const EXPOSURE_OUTCOME_LIB = path.join(ROOT, "lib/exposure-outcome.ts");
const ANALYSIS_PAGE        = path.join(ROOT, "app/analysis/page.tsx");
const INSIGHTS_VIEW        = path.join(ROOT, "components/insights/InsightsView.tsx");
const MATRIX_COMPONENT     = path.join(ROOT, "components/insights/ExposureOutcomeMatrix.tsx");

// Runtime import pattern — excludes `import type { … }` which is erased at compile time.
function runtimeImportOf(module: string): RegExp {
  return new RegExp(
    `^import\\s+(?!type[\\s{])(?:[^;\\n]*?)["'][^"']*${module}[^"']*["']`,
    "m",
  );
}

// Pattern for raw JSON data file imports.
const RAW_DATA_JSON_RE = /from\s+["'](?:@\/)?data\/[^"']+\.json["']/;

// ─── lib/exposure-outcome.ts — server-only guard ──────────────────────────────

describe("lib/exposure-outcome.ts — server-only guard", () => {
  it("file exists", () => {
    expect(
      existsSync(EXPOSURE_OUTCOME_LIB),
      "lib/exposure-outcome.ts must exist — Tank must create the matrix helper",
    ).toBe(true);
  });

  it("contains 'import \"server-only\"' to prevent client bundle inclusion", () => {
    const src = readFileSync(EXPOSURE_OUTCOME_LIB, "utf8");
    expect(
      src,
      "lib/exposure-outcome.ts must include 'import \"server-only\"' to block accidental client bundling",
    ).toMatch(/import\s+['"]server-only['"]/);
  });

  it("exports getExposureOutcomeMatrix as a named function", () => {
    const src = readFileSync(EXPOSURE_OUTCOME_LIB, "utf8");
    expect(
      src,
      "lib/exposure-outcome.ts must export getExposureOutcomeMatrix",
    ).toMatch(/export\s+function\s+getExposureOutcomeMatrix/);
  });

  it("derives from getExposureComparison, getAISignalData, and getDisruptionIndex (no re-implementation)", () => {
    const src = readFileSync(EXPOSURE_OUTCOME_LIB, "utf8");
    expect(src).toMatch(/getExposureComparison/);
    expect(src).toMatch(/getAISignalData/);
    expect(src).toMatch(/getDisruptionIndex/);
  });
});

// ─── app/analysis/page.tsx — Server Component contract (forward gate) ─────────

describe("app/analysis/page.tsx — getExposureOutcomeMatrix wiring [FORWARD GATE]", () => {
  it("has no 'use client' directive (must stay a Server Component)", () => {
    const src = readFileSync(ANALYSIS_PAGE, "utf8");
    expect(
      src,
      "app/analysis/page.tsx must not declare 'use client' — it is the Server Component entry point",
    ).not.toMatch(/^['"]use client['"]/m);
  });

  it("imports getExposureOutcomeMatrix from lib/exposure-outcome", () => {
    const src = readFileSync(ANALYSIS_PAGE, "utf8");
    expect(
      src,
      "app/analysis/page.tsx must import getExposureOutcomeMatrix; data fetching belongs in the server layer",
    ).toMatch(
      /import\s+[^;]*\bgetExposureOutcomeMatrix\b[^;]*from\s+["'][^"']*exposure-outcome["']/,
    );
  });

  it("calls getExposureOutcomeMatrix() to resolve the matrix at build time", () => {
    const src = readFileSync(ANALYSIS_PAGE, "utf8");
    expect(
      src,
      "app/analysis/page.tsx must call getExposureOutcomeMatrix() — not defer the call to client code",
    ).toMatch(/\bgetExposureOutcomeMatrix\s*\(/);
  });

  it("passes the resolved matrix down to a client island (not fetching in InsightsView)", () => {
    const src = readFileSync(ANALYSIS_PAGE, "utf8");
    // The result of getExposureOutcomeMatrix() must be assigned and then forwarded as
    // a prop — it should not be called inside JSX directly without capture.
    expect(
      src,
      "app/analysis/page.tsx must capture the matrix result and forward it as a prop",
    ).toMatch(/\bgetExposureOutcomeMatrix\s*\(\s*\)/);
  });
});

// ─── components/insights/InsightsView.tsx — client isolation ─────────────────

describe("components/insights/InsightsView.tsx — server-helper isolation", () => {
  it("file exists", () => {
    expect(existsSync(INSIGHTS_VIEW), "components/insights/InsightsView.tsx must exist").toBe(true);
  });

  it("does NOT have a runtime import of lib/exposure-outcome", () => {
    const src = readFileSync(INSIGHTS_VIEW, "utf8");
    expect(
      src,
      "InsightsView.tsx must not runtime-import lib/exposure-outcome — " +
        "the server-only module must not enter the client bundle via InsightsView",
    ).not.toMatch(runtimeImportOf("exposure-outcome"));
  });

  it("does NOT import raw JSON data files directly", () => {
    const src = readFileSync(INSIGHTS_VIEW, "utf8");
    expect(
      src,
      "InsightsView.tsx must not import raw data JSON files — data belongs in the server layer",
    ).not.toMatch(RAW_DATA_JSON_RE);
  });

  it("still renders ExposureLensComparison (not removed by matrix addition)", () => {
    const src = readFileSync(INSIGHTS_VIEW, "utf8");
    const renderSection = src.slice(Math.max(0, src.indexOf("return (")));
    expect(
      renderSection,
      "InsightsView must still render <ExposureLensComparison /> — existing analysis section must remain",
    ).toMatch(/<ExposureLensComparison/);
  });

  it("still renders EvidenceStack (not removed by matrix addition)", () => {
    const src = readFileSync(INSIGHTS_VIEW, "utf8");
    const renderSection = src.slice(Math.max(0, src.indexOf("return (")));
    expect(
      renderSection,
      "InsightsView must still render <EvidenceStack /> — existing evidence section must remain",
    ).toMatch(/<EvidenceStack/);
  });
});

// ─── components/insights/ExposureOutcomeMatrix.tsx — client contract ──────────

describe("components/insights/ExposureOutcomeMatrix.tsx — client component contract [FORWARD GATE]", () => {
  it("file exists", () => {
    expect(
      existsSync(MATRIX_COMPONENT),
      "Neo must create components/insights/ExposureOutcomeMatrix.tsx — the client visualization island",
    ).toBe(true);
  });

  it("declares 'use client' at the top (client island, not a Server Component)", () => {
    if (!existsSync(MATRIX_COMPONENT)) return;
    const src = readFileSync(MATRIX_COMPONENT, "utf8");
    expect(
      src,
      "ExposureOutcomeMatrix.tsx must declare 'use client' — it owns interactive state",
    ).toMatch(/^['"]use client['"]/m);
  });

  it("does NOT have a runtime import of lib/exposure-outcome (server-only boundary)", () => {
    if (!existsSync(MATRIX_COMPONENT)) return;
    const src = readFileSync(MATRIX_COMPONENT, "utf8");
    expect(
      src,
      "ExposureOutcomeMatrix.tsx must not runtime-import lib/exposure-outcome — " +
        "the server-only helper must not be included in the client bundle",
    ).not.toMatch(runtimeImportOf("exposure-outcome"));
  });

  it("does NOT import raw JSON data files (data passed via props)", () => {
    if (!existsSync(MATRIX_COMPONENT)) return;
    const src = readFileSync(MATRIX_COMPONENT, "utf8");
    expect(
      src,
      "ExposureOutcomeMatrix.tsx must not import raw JSON data files — data belongs in the server layer",
    ).not.toMatch(RAW_DATA_JSON_RE);
  });
});

// ─── InsightsView ExposureOutcomeMatrix wiring (forward gate) ─────────────────

describe("InsightsView — ExposureOutcomeMatrix wiring [FORWARD GATE]", () => {
  it("imports or uses ExposureOutcomeMatrix in InsightsView or app/analysis/page.tsx", () => {
    const analysisSource = readFileSync(ANALYSIS_PAGE, "utf8");
    const insightsSource = readFileSync(INSIGHTS_VIEW, "utf8");
    const combined = `${analysisSource}\n${insightsSource}`;
    expect(
      combined,
      "ExposureOutcomeMatrix must be imported/rendered in InsightsView or app/analysis/page.tsx",
    ).toMatch(/ExposureOutcomeMatrix/);
  });
});

// ─── Provenance: lib/analysis.ts continuity ───────────────────────────────────

describe("lib/analysis.ts continuity", () => {
  it("still exports getExposureComparison (not removed by matrix refactor)", () => {
    const src = readFileSync(path.join(ROOT, "lib/analysis.ts"), "utf8");
    expect(
      src,
      "lib/analysis.ts must still export getExposureComparison — it is used by ExposureLensComparison",
    ).toMatch(/export\s+function\s+getExposureComparison/);
  });

  it("still exports getAISignalData (not removed by matrix refactor)", () => {
    const src = readFileSync(path.join(ROOT, "lib/analysis.ts"), "utf8");
    expect(
      src,
      "lib/analysis.ts must still export getAISignalData — it is consumed by lib/exposure-outcome (getExposureOutcomeMatrix)",
    ).toMatch(/export\s+function\s+getAISignalData/);
  });

  it("still exports getDisruptionIndex (not removed by matrix refactor)", () => {
    const src = readFileSync(path.join(ROOT, "lib/analysis.ts"), "utf8");
    expect(
      src,
      "lib/analysis.ts must still export getDisruptionIndex — it is used by DisruptionLeaderboard",
    ).toMatch(/export\s+function\s+getDisruptionIndex/);
  });
});
