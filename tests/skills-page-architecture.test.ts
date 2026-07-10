/**
 * tests/skills-page-architecture.test.ts
 *
 * Module-boundary regression tests for the PR #107 retrospective fix (issue #104).
 *
 * These assertions encode the correct server/client split for the skills module:
 *
 *  - app/skills/page.tsx  →  Server Component (no "use client"), owns data fetch
 *  - components/skills/SkillsPageClient.tsx  →  Client Component, receives data
 *    as props, must NOT import any server-heavy data library or raw JSON files
 *  - lib/reskilling-bridge.ts  →  guarded with "server-only"
 *
 * Assertions use source-text pattern matching — same approach as the existing
 * ReskillingBridge.test.tsx architecture checks — rather than brittle line numbers.
 *
 * Expected state: tests 1-3 and the server-only guard test pass immediately
 * (guard already exists); tests 4-9 gate the forward fix for SkillsPageClient.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SKILLS_PAGE    = path.join(ROOT, "app/skills/page.tsx");
const SKILLS_CLIENT  = path.join(ROOT, "components/skills/SkillsPageClient.tsx");
const BRIDGE_LIB     = path.join(ROOT, "lib/reskilling-bridge.ts");

// Modules that must never appear in the Client Component's import list.
// They are either guarded server-only or carry multi-MB JSON payloads.
const BANNED_CLIENT_MODULES = [
  "reskilling-bridge",
  "talent-bottleneck",
  "h1b",
  "job-postings",
  "employment-projections",
] as const;

// Pattern that matches any direct raw-JSON data file import.
const RAW_DATA_JSON_RE = /from\s+["'](?:@\/)?data\/[^"']+\.json["']/;

// ── app/skills/page.tsx — Server Component ───────────────────────────────────

describe("app/skills/page.tsx — Server Component contract", () => {
  it("has no 'use client' directive (must be a Server Component)", () => {
    const src = readFileSync(SKILLS_PAGE, "utf8");
    expect(
      src,
      "app/skills/page.tsx must not declare 'use client' — it is the Server Component entry point",
    ).not.toMatch(/^['"]use client['"]/m);
  });

  it("imports getReskillingBridgeData from lib/reskilling-bridge", () => {
    const src = readFileSync(SKILLS_PAGE, "utf8");
    expect(
      src,
      "Server Component must import getReskillingBridgeData; data fetching belongs in the server layer",
    ).toMatch(/import\s+[^;]*\bgetReskillingBridgeData\b[^;]*from\s+["'][^"']*reskilling-bridge["']/);
  });

  it("calls getReskillingBridgeData() to fetch bridge data", () => {
    const src = readFileSync(SKILLS_PAGE, "utf8");
    expect(
      src,
      "Server Component must call getReskillingBridgeData() — not defer the call to client code",
    ).toMatch(/\bgetReskillingBridgeData\s*\(/);
  });

  it("delegates interactive body to SkillsPageClient", () => {
    const src = readFileSync(SKILLS_PAGE, "utf8");
    expect(
      src,
      "Server Component must import SkillsPageClient and pass bridge data down as props",
    ).toMatch(/import\s+[^;]*SkillsPageClient[^;]*from/);
  });
});

// ── components/skills/SkillsPageClient.tsx — Client Component ────────────────

describe("components/skills/SkillsPageClient.tsx — Client Component contract", () => {
  it("file exists (interactive body must be extracted into a Client Component)", () => {
    expect(
      existsSync(SKILLS_CLIENT),
      [
        "components/skills/SkillsPageClient.tsx must exist.",
        "The interactive skills body must be delegated to a Client Component",
        "so that the page entry point can remain a Server Component.",
      ].join(" "),
    ).toBe(true);
  });

  it("declares 'use client' at the top", () => {
    if (!existsSync(SKILLS_CLIENT)) return; // test above will already fail
    const src = readFileSync(SKILLS_CLIENT, "utf8");
    expect(
      src,
      "SkillsPageClient.tsx must declare 'use client' — it owns all interactive hooks",
    ).toMatch(/^['"]use client['"]/m);
  });

  it("does NOT import raw data JSON files", () => {
    if (!existsSync(SKILLS_CLIENT)) return;
    const src = readFileSync(SKILLS_CLIENT, "utf8");
    expect(
      src,
      "SkillsPageClient.tsx must not import raw JSON data files — fetch data server-side and pass as props",
    ).not.toMatch(RAW_DATA_JSON_RE);
  });

  for (const banned of BANNED_CLIENT_MODULES) {
    it(`does NOT have a runtime (non-type) import of '${banned}'`, () => {
      if (!existsSync(SKILLS_CLIENT)) return;
      const src = readFileSync(SKILLS_CLIENT, "utf8");
      // Only flag runtime imports — `import type { … }` is erased at compile
      // time and does not cause the server-only module to be bundled.
      // Pattern: import statement that is NOT `import type` and references the banned path.
      const runtimeImportRe = new RegExp(
        `^import\\s+(?!type[\\s{])(?:[^;\\n]*?)["'][^"']*${banned}[^"']*["']`,
        "m",
      );
      expect(
        src,
        `SkillsPageClient.tsx must not have a runtime import of '${banned}' — data belongs in the server layer`,
      ).not.toMatch(runtimeImportRe);
    });
  }
});

// ── lib/reskilling-bridge.ts — server-only guard ─────────────────────────────

describe("lib/reskilling-bridge.ts — server-only guard", () => {
  it("contains 'import server-only' to prevent client bundle inclusion", () => {
    const src = readFileSync(BRIDGE_LIB, "utf8");
    expect(
      src,
      "lib/reskilling-bridge.ts must include 'import \"server-only\"' to block accidental client-side bundling",
    ).toMatch(/import\s+['"]server-only['"]/);
  });
});
