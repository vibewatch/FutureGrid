/**
 * tests/refresh-manifest.test.ts
 *
 * Static contract assertions for scripts/refresh-data.mjs.
 * Verifies manifest structure, dependency ordering, and absence of
 * credential-gated builders — without executing any builders.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { MANIFEST } from "../scripts/refresh-data.mjs";

const ROOT = process.cwd();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function indexOf(id: string): number {
  return MANIFEST.findIndex((s) => s.id === id);
}

function isBefore(a: string, b: string, context: string) {
  const ai = indexOf(a);
  const bi = indexOf(b);
  expect(ai, `${context}: "${a}" must be in the manifest`).toBeGreaterThanOrEqual(0);
  expect(bi, `${context}: "${b}" must be in the manifest`).toBeGreaterThanOrEqual(0);
  expect(ai, `${context}: "${a}" must appear before "${b}"`).toBeLessThan(bi);
}

// ─── Basic structural assertions ─────────────────────────────────────────────

describe("refresh manifest", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(MANIFEST)).toBe(true);
    expect(MANIFEST.length).toBeGreaterThan(0);
  });

  it("every entry has required fields: id, script, note", () => {
    for (const step of MANIFEST) {
      expect(typeof step.id, `step.id must be a string`).toBe("string");
      expect(step.id.length, `step.id must be non-empty`).toBeGreaterThan(0);
      expect(typeof step.script, `${step.id}: script must be a string`).toBe("string");
      expect(typeof step.note, `${step.id}: note must be a string`).toBe("string");
    }
  });

  it("has no duplicate step IDs", () => {
    const ids = MANIFEST.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it("every script path resolves to an existing file", () => {
    for (const step of MANIFEST) {
      const abs = path.join(ROOT, step.script);
      expect(
        existsSync(abs),
        `${step.id}: script not found at ${step.script}`,
      ).toBe(true);
    }
  });

  it("optional env entries are plain string-valued records when present", () => {
    for (const step of MANIFEST) {
      if (step.env == null) continue;
      expect(typeof step.env, `${step.id}: env must be an object`).toBe("object");
      for (const [k, v] of Object.entries(step.env)) {
        expect(typeof v, `${step.id}: env.${k} must be a string`).toBe("string");
      }
    }
  });
});

// ─── Credential-gated builders must NOT appear ───────────────────────────────

describe("refresh manifest excludes credential-gated builders", () => {
  const BLOCKED = [
    { script: "scripts/build-jolts.mjs", reason: "requires BLS_API_KEY" },
    { script: "scripts/build-onet-enrichment.mjs", reason: "requires ONET_API_KEY" },
    {
      script: "scripts/build-h1b.mjs",
      reason: "not safe for weekly CI (~2 GB of Internet Archive downloads)",
    },
  ];

  for (const { script, reason } of BLOCKED) {
    it(`does not include ${script} (${reason})`, () => {
      const found = MANIFEST.some((s) => s.script === script);
      expect(found, `${script} must not appear in the manifest`).toBe(false);
    });
  }
});

// ─── Dependency ordering ──────────────────────────────────────────────────────

describe("refresh manifest preserves dependency order", () => {
  it("warn appears before state-labor (WARN data needed for pressure index)", () => {
    isBefore("warn", "state-labor", "warn → state-labor");
  });

  it("state-labor appears before state-qcew (QCEW reads state-labor WARN context)", () => {
    isBefore("state-labor", "state-qcew", "state-labor → state-qcew");
  });

  it("occupation-snapshot appears before snapshot-slim", () => {
    isBefore("occupation-snapshot", "snapshot-slim", "occupation-snapshot → snapshot-slim");
  });

  it("occupation-snapshot appears before employment-projections", () => {
    isBefore("occupation-snapshot", "employment-projections", "occupation-snapshot → employment-projections");
  });

  it("occupation-snapshot appears before job-postings", () => {
    isBefore("occupation-snapshot", "job-postings", "occupation-snapshot → job-postings");
  });

  it("occupation-snapshot appears before occupational-requirements", () => {
    isBefore("occupation-snapshot", "occupational-requirements", "occupation-snapshot → occupational-requirements");
  });

  it("warn appears before warn-public (warn-public copies warn output)", () => {
    isBefore("warn", "warn-public", "warn → warn-public");
  });

  it("provenance is the last step", () => {
    const lastIdx = MANIFEST.length - 1;
    expect(
      MANIFEST[lastIdx].id,
      "provenance must be the last step so it reflects all builder outputs",
    ).toBe("provenance");
  });
});

// ─── Required datasets present ────────────────────────────────────────────────

describe("refresh manifest includes all expected key-free datasets", () => {
  const EXPECTED = [
    "warn",
    "state-labor",
    "state-qcew",
    "ai-usage-proxies",
    "occupation-snapshot",
    "snapshot-slim",
    "employment-projections",
    "job-postings",
    "occupational-requirements",
    "ai-signals",
    "market-signals",
    "ai-company-stocks",
    "ai-frontier",
    "openrouter-models",
    "global-ai-metrics",
    "international-occupation-mix",
    "warn-public",
    "provenance",
  ];

  for (const id of EXPECTED) {
    it(`includes "${id}"`, () => {
      expect(indexOf(id), `"${id}" must be present in the manifest`).toBeGreaterThanOrEqual(0);
    });
  }
});
