/**
 * tests/sectors-page-architecture.test.ts
 *
 * Module-boundary and server/client contract tests for the WageTierPolarization
 * integration into the /sectors page.
 * Issue: FutureGrid#109
 *
 * Encodes the correct server/client split for the feature:
 *
 *  - lib/wage-tier-polarization.ts  →  guarded with "server-only"
 *  - app/sectors/page.tsx            →  Server Component; must call
 *                                       getWageTierPolarization() and pass the
 *                                       result to a client island
 *  - components/sectors/             →  WageTierPolarizationLens.tsx must be a
 *    WageTierPolarizationLens.tsx        Client Component ("use client") that
 *                                       receives data as props; no server-only
 *                                       imports
 *
 * Passing immediately:
 *  - lib/wage-tier-polarization.ts server-only guard and export shape
 *  - app/sectors/[id]/page.tsx still exists (existing sector detail behavior)
 *  - lib/data.ts still exports getSectorAggregatesExtended
 *
 * Forward gates (fail until Neo/Switch implement the server/client split):
 *  - app/sectors/page.tsx is a Server Component (no "use client")
 *  - app/sectors/page.tsx imports and calls getWageTierPolarization()
 *  - WageTierPolarizationLens.tsx exists with "use client"
 *  - WageTierPolarizationLens.tsx has no runtime server import
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

const SECTORS_PAGE        = path.join(ROOT, "app/sectors/page.tsx");
const SECTORS_DETAIL      = path.join(ROOT, "app/sectors/[id]/page.tsx");
const WAGE_TIER_LIB       = path.join(ROOT, "lib/wage-tier-polarization.ts");
const LENS_COMPONENT      = path.join(ROOT, "components/sectors/WageTierPolarizationLens.tsx");
const SECTORS_PAGE_CLIENT = path.join(ROOT, "components/sectors/SectorsPageClient.tsx");
const DATA_LIB            = path.join(ROOT, "lib/data.ts");

// Pattern for raw JSON data file imports.
const RAW_DATA_JSON_RE = /from\s+["'](?:@\/)?data\/[^"']+\.json["']/;

// Runtime import (excludes `import type { … }` which is erased at compile time).
function runtimeImportOf(module: string): RegExp {
  return new RegExp(
    `^import\\s+(?!type[\\s{])(?:[^;\\n]*?)["'][^"']*${module}[^"']*["']`,
    "m",
  );
}

// ── lib/wage-tier-polarization.ts — server-only guard (immediate) ─────────────

describe("lib/wage-tier-polarization.ts — server-only guard", () => {
  it("file exists", () => {
    expect(
      existsSync(WAGE_TIER_LIB),
      "lib/wage-tier-polarization.ts must exist — Tank must have created the helper",
    ).toBe(true);
  });

  it("contains 'import \"server-only\"' to prevent client bundle inclusion", () => {
    const src = readFileSync(WAGE_TIER_LIB, "utf8");
    expect(
      src,
      "lib/wage-tier-polarization.ts must include 'import \"server-only\"' to block client bundling",
    ).toMatch(/import\s+['"]server-only['"]/);
  });

  it("exports getWageTierPolarization as a named function", () => {
    const src = readFileSync(WAGE_TIER_LIB, "utf8");
    expect(
      src,
      "lib/wage-tier-polarization.ts must export getWageTierPolarization",
    ).toMatch(/export\s+function\s+getWageTierPolarization/);
  });

  it("exports WageTierPolarization type (WageTier, summary, methodology)", () => {
    const src = readFileSync(WAGE_TIER_LIB, "utf8");
    expect(src).toMatch(/export\s+(interface|type)\s+WageTier\b/);
    expect(src).toMatch(/export\s+(interface|type)\s+WageTierPolarization\b/);
  });
});

// ── app/sectors/[id]/page.tsx — existing detail page still exists (immediate) ──

describe("app/sectors/[id]/page.tsx — existing sector detail behavior preserved", () => {
  it("file exists (sector detail page must not be deleted by WageTierPolarization addition)", () => {
    expect(
      existsSync(SECTORS_DETAIL),
      "app/sectors/[id]/page.tsx must still exist — removing existing sector detail would break /sectors/{id} routes",
    ).toBe(true);
  });
});

// ── lib/data.ts — getSectorAggregatesExtended continuity (immediate) ──────────

describe("lib/data.ts — getSectorAggregatesExtended continuity", () => {
  it("still exports getSectorAggregatesExtended (used by sector detail pages)", () => {
    const src = readFileSync(DATA_LIB, "utf8");
    expect(
      src,
      "lib/data.ts must still export getSectorAggregatesExtended — it is used by sector detail pages",
    ).toMatch(/function\s+getSectorAggregatesExtended/);
  });
});

// ── app/sectors/page.tsx — Server Component contract [FORWARD GATE] ───────────

describe("app/sectors/page.tsx — Server Component contract [FORWARD GATE]", () => {
  it("has no 'use client' directive (must be a Server Component for server-only data access)", () => {
    const src = readFileSync(SECTORS_PAGE, "utf8");
    expect(
      src,
      "app/sectors/page.tsx must not declare 'use client' — it should be a Server Component so it can call getWageTierPolarization()",
    ).not.toMatch(/^['"]use client['"]/m);
  });

  it("imports getWageTierPolarization from lib/wage-tier-polarization", () => {
    const src = readFileSync(SECTORS_PAGE, "utf8");
    expect(
      src,
      "app/sectors/page.tsx must import getWageTierPolarization; server-only data fetching belongs in the server layer",
    ).toMatch(
      /import\s+[^;]*\bgetWageTierPolarization\b[^;]*from\s+["'][^"']*wage-tier-polarization["']/,
    );
  });

  it("calls getWageTierPolarization() to resolve the data at build time", () => {
    const src = readFileSync(SECTORS_PAGE, "utf8");
    expect(
      src,
      "app/sectors/page.tsx must call getWageTierPolarization() — not defer the call to client code",
    ).toMatch(/\bgetWageTierPolarization\s*\(/);
  });

  it("imports the client island (SectorsPageClient) to render interactive content", () => {
    const src = readFileSync(SECTORS_PAGE, "utf8");
    // The server page must delegate interactive rendering to a client island.
    // Accept either SectorsPageClient or WageTierPolarizationLens as the top-level island.
    const hasClientIsland =
      /import\s+[^;]*SectorsPageClient[^;]*from/.test(src) ||
      /import\s+[^;]*WageTierPolarizationLens[^;]*from/.test(src);
    expect(
      hasClientIsland,
      "app/sectors/page.tsx must import a client island (SectorsPageClient or WageTierPolarizationLens) and pass data down as props",
    ).toBe(true);
  });

  it("does NOT import raw JSON data files (JSON must not enter the server page bundle directly)", () => {
    const src = readFileSync(SECTORS_PAGE, "utf8");
    expect(
      src,
      "app/sectors/page.tsx must not import raw JSON data files directly — use the typed helper",
    ).not.toMatch(RAW_DATA_JSON_RE);
  });
});

// ── components/sectors/WageTierPolarizationLens.tsx — client contract ─────────

describe("components/sectors/WageTierPolarizationLens.tsx — Client Component contract", () => {
  it("file exists (client island for the wage-tier lens)", () => {
    expect(
      existsSync(LENS_COMPONENT),
      "components/sectors/WageTierPolarizationLens.tsx must exist — the client visualization island",
    ).toBe(true);
  });

  it("declares 'use client' at the top of the file", () => {
    if (!existsSync(LENS_COMPONENT)) return;
    const src = readFileSync(LENS_COMPONENT, "utf8");
    expect(
      src,
      "WageTierPolarizationLens.tsx must declare 'use client' — it owns interactive toggle state",
    ).toMatch(/^['"]use client['"]/m);
  });

  it("does NOT have a runtime import of lib/wage-tier-polarization (server-only boundary)", () => {
    if (!existsSync(LENS_COMPONENT)) return;
    const src = readFileSync(LENS_COMPONENT, "utf8");
    expect(
      src,
      "WageTierPolarizationLens.tsx must not runtime-import lib/wage-tier-polarization — " +
        "the server-only helper must not enter the client bundle",
    ).not.toMatch(runtimeImportOf("wage-tier-polarization"));
  });

  it("does NOT import raw JSON data files (data passed via props)", () => {
    if (!existsSync(LENS_COMPONENT)) return;
    const src = readFileSync(LENS_COMPONENT, "utf8");
    expect(
      src,
      "WageTierPolarizationLens.tsx must not import raw JSON data files — data belongs in the server layer",
    ).not.toMatch(RAW_DATA_JSON_RE);
  });
});

// ── components/sectors/SectorsPageClient.tsx — client contract ────────────────

describe("components/sectors/SectorsPageClient.tsx — Client Component contract", () => {
  it("file exists (interactive body must be a Client Component)", () => {
    expect(
      existsSync(SECTORS_PAGE_CLIENT),
      "components/sectors/SectorsPageClient.tsx must exist as the interactive client island",
    ).toBe(true);
  });

  it("declares 'use client' at the top", () => {
    if (!existsSync(SECTORS_PAGE_CLIENT)) return;
    const src = readFileSync(SECTORS_PAGE_CLIENT, "utf8");
    expect(
      src,
      "SectorsPageClient.tsx must declare 'use client' — it owns interactive hooks",
    ).toMatch(/^['"]use client['"]/m);
  });

  it("does NOT have a runtime import of lib/wage-tier-polarization", () => {
    if (!existsSync(SECTORS_PAGE_CLIENT)) return;
    const src = readFileSync(SECTORS_PAGE_CLIENT, "utf8");
    expect(
      src,
      "SectorsPageClient.tsx must not runtime-import lib/wage-tier-polarization — " +
        "data is received via props from the Server Component",
    ).not.toMatch(runtimeImportOf("wage-tier-polarization"));
  });

  it("does NOT have a runtime import of lib/data (heavy data belongs server-side)", () => {
    if (!existsSync(SECTORS_PAGE_CLIENT)) return;
    const src = readFileSync(SECTORS_PAGE_CLIENT, "utf8");
    // Only flag runtime imports — `import type { SectorAggregate }` is erased at compile time.
    expect(
      src,
      "SectorsPageClient.tsx must not runtime-import lib/data — use import type for type-only references",
    ).not.toMatch(runtimeImportOf("@/lib/data"));
  });

  it("does NOT import raw JSON data files", () => {
    if (!existsSync(SECTORS_PAGE_CLIENT)) return;
    const src = readFileSync(SECTORS_PAGE_CLIENT, "utf8");
    expect(
      src,
      "SectorsPageClient.tsx must not import raw JSON data files — data belongs in the server layer",
    ).not.toMatch(RAW_DATA_JSON_RE);
  });
});
