/**
 * tests/refresh-manifest.test.ts
 *
 * Static contract assertions for scripts/refresh-data.mjs.
 * Verifies manifest structure, dependency ordering, and absence of
 * credential-gated builders — without executing any builders.
 *
 * Also validates .github/workflows/refresh-data.yml YAML integrity
 * (regression: PR #121 introduced unindented block-scalar content that
 * caused GitHub Actions to reject the workflow file, run 29304395231).
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { MANIFEST } from "../scripts/refresh-data.mjs";

const ROOT = process.cwd();

// js-yaml ships without bundled TypeScript declarations; load via CJS interop
const _require = createRequire(import.meta.url);
const jsYaml = _require("js-yaml") as {
  load: (input: string, opts?: { filename?: string }) => unknown;
};

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
    {
      script: "scripts/build-data-snapshot.mjs",
      reason:
        "requires BLS_API_KEY for OEWS employment enrichment; without it writes employment: null, overwriting canonical OEWS data",
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

  it("snapshot-slim appears before employment-projections (projections reads slim snapshot)", () => {
    isBefore("snapshot-slim", "employment-projections", "snapshot-slim → employment-projections");
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
    // occupation-snapshot excluded: requires BLS_API_KEY; see BLOCKED list above
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

// ─── refresh-data.yml GitHub Actions workflow integrity ───────────────────────
//
// Regression guard for run 29304395231: unindented non-empty continuation lines
// inside `run: |` YAML block scalars cause GitHub Actions to reject the entire
// workflow file (zero jobs, name falls back to file path, conclusion: failure).

describe("refresh-data workflow YAML integrity", () => {
  const WORKFLOW_PATH = path.join(ROOT, ".github/workflows/refresh-data.yml");

  it("workflow file exists", () => {
    expect(existsSync(WORKFLOW_PATH), ".github/workflows/refresh-data.yml must exist").toBe(true);
  });

  it("parses as valid YAML without errors (regression: unindented block-scalar lines break GitHub Actions)", () => {
    const content = readFileSync(WORKFLOW_PATH, "utf8");
    expect(
      () => jsYaml.load(content, { filename: ".github/workflows/refresh-data.yml" }),
      "refresh-data.yml must parse as valid YAML — unindented non-empty continuation lines inside run: | blocks cause GitHub to reject the workflow before creating any jobs",
    ).not.toThrow();
  });

  it("workflow name is a human-readable string, not the file path (parse-failure fallback)", () => {
    const parsed = jsYaml.load(readFileSync(WORKFLOW_PATH, "utf8")) as Record<string, unknown>;
    expect(typeof parsed.name).toBe("string");
    expect(parsed.name as string).not.toMatch(/\.github\/workflows\//);
  });

  it("triggers include schedule (Monday 06:00 UTC) and workflow_dispatch", () => {
    const parsed = jsYaml.load(readFileSync(WORKFLOW_PATH, "utf8")) as Record<string, unknown>;
    const on = parsed.on as Record<string, unknown>;
    expect(on).toHaveProperty("schedule");
    expect(on).toHaveProperty("workflow_dispatch");
    const crons = (on.schedule as Array<{ cron: string }>).map((e) => e.cron);
    expect(crons, "must include Monday 06:00 UTC cron").toContain("0 6 * * 1");
  });

  it("has least-privilege permissions: contents: write, pull-requests: write", () => {
    const parsed = jsYaml.load(readFileSync(WORKFLOW_PATH, "utf8")) as Record<string, unknown>;
    const perms = parsed.permissions as Record<string, string>;
    expect(perms.contents).toBe("write");
    expect(perms["pull-requests"]).toBe("write");
    expect(Object.keys(perms)).toHaveLength(2);
  });

  it("concurrency group is set with cancel-in-progress: false (no run cancellation)", () => {
    const parsed = jsYaml.load(readFileSync(WORKFLOW_PATH, "utf8")) as Record<string, unknown>;
    const concurrency = parsed.concurrency as Record<string, unknown>;
    expect(concurrency).toHaveProperty("group");
    expect(concurrency["cancel-in-progress"]).toBe(false);
  });

  it("refresh job runs on ubuntu-latest with 60-minute timeout", () => {
    const parsed = jsYaml.load(readFileSync(WORKFLOW_PATH, "utf8")) as Record<string, unknown>;
    const jobs = parsed.jobs as Record<string, Record<string, unknown>>;
    const job = jobs.refresh;
    expect(job).toBeDefined();
    expect(job["runs-on"]).toBe("ubuntu-latest");
    expect(job["timeout-minutes"]).toBe(60);
  });

  it("runs npm run data:refresh (key-free orchestrator, not direct builder scripts)", () => {
    const parsed = jsYaml.load(readFileSync(WORKFLOW_PATH, "utf8")) as Record<string, unknown>;
    const jobs = parsed.jobs as Record<string, Record<string, unknown>>;
    const steps = jobs.refresh.steps as Array<Record<string, unknown>>;
    const runs = steps.map((s) => s.run).filter(Boolean) as string[];
    const refreshStep = runs.find((r) => r.includes("npm run data:refresh"));
    expect(refreshStep, "must contain a step running npm run data:refresh").toBeDefined();
    expect(runs.some((r) => r.includes("npm run build:warn") || r.includes("node scripts/build")),
      "must NOT invoke individual build scripts directly — use the orchestrator",
    ).toBe(false);
  });
});
