#!/usr/bin/env node
/**
 * scripts/refresh-data.mjs
 *
 * Orchestrates the recurring key-free data refresh. Runs each builder in
 * MANIFEST order, validates before write (each builder's own validate* gate),
 * updates buildMeta/deriveMeta provenance, and exits non-zero on the first
 * failure with a clear error message.
 *
 * Usage:
 *   node scripts/refresh-data.mjs          # full refresh
 *   npm run data:refresh                   # same via package script
 *
 * CI: .github/workflows/refresh-data.yml runs this script then opens or
 * updates data/scheduled-refresh PR on main when generated files change.
 *
 * CREDENTIAL-GATED builders are EXCLUDED from this manifest:
 *   build-jolts.mjs         — requires BLS_API_KEY (hard exit)
 *   build-onet-enrichment.mjs — requires ONET_API_KEY (hard exit)
 *   build-h1b.mjs           — no credential needed but requires ~2 GB of
 *                             Internet Archive downloads; not safe for weekly CI
 *   build-world-geo.mjs     — static geography; not time-varying
 *
 * Wisconsin WARN data (build-warn.mjs) requires GOOGLE_SHEETS_API_KEY, but
 * the builder catches the missing key and skips WI gracefully; all other 50
 * states/DC are still refreshed. WI is therefore NOT a blocking dependency.
 *
 * build-ai-company-stocks.mjs uses AI_COMPANY_STOCKS_BOOTSTRAP_YAHOO=1 to
 * fetch from Yahoo Finance (unofficial/undocumented). Without the flag it
 * reuses the committed fixture. The flag is set here so the weekly CI refresh
 * actually refreshes the data.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ─── Refresh manifest ─────────────────────────────────────────────────────────
//
// Steps run sequentially; the first non-zero exit aborts the refresh.
// Dependency ordering is strict:
//   warn → state-labor → state-qcew
//   occupation-snapshot → snapshot-slim → employment-projections
//                       → job-postings → occupational-requirements
//   all data steps → warn-public → provenance (always last)
//
// Exported so tests can assert manifest contract without running builders.

export const MANIFEST = [
  // ── WARN + labor dependency chain ──────────────────────────────────────────
  {
    id: "warn",
    script: "scripts/build-warn.mjs",
    note:
      "Multi-state WARN Act notices; WI skipped gracefully without GOOGLE_SHEETS_API_KEY",
  },
  {
    id: "state-labor",
    script: "scripts/build-state-labor.mjs",
    note: "BLS LAUS keyless mode + WARN pressure context (depends on warn)",
  },
  {
    id: "state-qcew",
    script: "scripts/build-state-qcew.mjs",
    note: "BLS QCEW quarterly baseline (depends on state-labor)",
  },

  // ── Independent key-free fetches ───────────────────────────────────────────
  {
    id: "ai-usage-proxies",
    script: "scripts/build-ai-usage-proxies.mjs",
    note: "OECD SDMX, Eurostat, StackOverflow, HuggingFace, GitHub adoption signals",
  },
  {
    id: "occupation-snapshot",
    script: "scripts/build-data-snapshot.mjs",
    note:
      "AEI exposure + O*NET skills (key-free); employment/history requires BLS_API_KEY and is skipped",
  },
  {
    id: "snapshot-slim",
    script: "scripts/build-snapshot-slim.mjs",
    note: "Derived slim view of occupation-snapshot (depends on occupation-snapshot)",
  },
  {
    id: "employment-projections",
    script: "scripts/build-employment-projections.mjs",
    note: "BLS projections CSV + occupation-snapshot (depends on occupation-snapshot)",
  },
  {
    id: "job-postings",
    script: "scripts/build-job-postings.mjs",
    note: "Derived from occupation-snapshot",
  },
  {
    id: "occupational-requirements",
    script: "scripts/build-occupational-requirements.mjs",
    note: "BLS ORS seed rows derived from occupation-snapshot",
  },
  {
    id: "ai-signals",
    script: "scripts/build-ai-signals.mjs",
    note:
      "AIOE, Frey-Osborne, LLM exposure, automation-baseline from public archives and GitHub",
  },
  {
    id: "market-signals",
    script: "scripts/build-market-signals.mjs",
    note: "Yahoo Finance ETF sector signals",
  },
  {
    id: "ai-company-stocks",
    script: "scripts/build-ai-company-stocks.mjs",
    // Yahoo Finance unofficial chart bootstrap — key-free public endpoint
    env: { AI_COMPANY_STOCKS_BOOTSTRAP_YAHOO: "1" },
    note:
      "Yahoo Finance unofficial chart bootstrap (47 companies + 3 benchmarks); " +
      "falls back to committed fixture in environments where Yahoo is unavailable",
  },
  {
    id: "ai-frontier",
    script: "scripts/build-ai-frontier.mjs",
    note: "Epoch AI Notable AI Models registry",
  },
  {
    id: "openrouter-models",
    script: "scripts/build-openrouter-models.mjs",
    note: "OpenRouter public API model and endpoint catalog",
  },
  {
    id: "global-ai-metrics",
    script: "scripts/build-global-metrics.mjs",
    note: "Microsoft AI Diffusion Index + IMF AIPI + Oxford GAIRI",
  },
  {
    id: "international-occupation-mix",
    script: "scripts/build-international-occupation-mix.mjs",
    note: "ILOSTAT country-level occupation mix (9 countries)",
  },

  // ── Derived outputs (always after all source builders) ────────────────────
  {
    id: "warn-public",
    script: "scripts/build-warn-public.mjs",
    note: "Privacy-filtered public/warn-notices.json copy (depends on warn)",
  },
  {
    id: "provenance",
    script: "scripts/build-provenance.mjs",
    note: "Central provenance registry — always runs last",
  },
];

// ─── Execution helpers ────────────────────────────────────────────────────────

/** @param {number} ms */
function fmtDuration(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Run a single MANIFEST step.
 * @param {{ id: string, script: string, env?: Record<string,string>, note?: string }} step
 * @returns {{ status: "ok"|"fail", durationMs: number, exitCode: number }}
 */
function runStep(step) {
  const scriptPath = join(ROOT, step.script);
  const env = { ...process.env, ...(step.env ?? {}) };
  const t0 = Date.now();
  const result = spawnSync(process.execPath, [scriptPath], {
    env,
    stdio: "inherit",
    cwd: ROOT,
  });
  const durationMs = Date.now() - t0;
  const exitCode = result.status ?? 1;
  return { status: exitCode === 0 ? "ok" : "fail", durationMs, exitCode };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function runRefresh() {
  console.log("=".repeat(72));
  console.log("FutureGrid data refresh  —  " + new Date().toISOString());
  console.log("=".repeat(72));

  // Pre-flight: verify every script exists before starting any builder
  for (const step of MANIFEST) {
    const scriptPath = join(ROOT, step.script);
    if (!existsSync(scriptPath)) {
      console.error(`[refresh] PREFLIGHT FAIL: script not found — ${step.script}`);
      process.exit(1);
    }
  }

  const results = [];
  let failed = null;

  for (const step of MANIFEST) {
    const label = step.id.padEnd(28);
    process.stdout.write(`\n[${"RUN".padEnd(4)}] ${label} ${step.note ?? ""}\n`);
    const { status, durationMs, exitCode } = runStep(step);
    results.push({ id: step.id, status, durationMs });

    if (status === "fail") {
      console.error(`\n[FAIL] ${step.id} exited with code ${exitCode}\n`);
      failed = step.id;
      break;
    }
    console.log(`[ OK ] ${label} (${fmtDuration(durationMs)})`);
  }

  // Summary table
  console.log("\n" + "=".repeat(72));
  console.log("REFRESH SUMMARY");
  console.log("=".repeat(72));
  for (const r of results) {
    const icon = r.status === "ok" ? "✓" : "✗";
    console.log(`  ${icon}  ${r.id.padEnd(30)} ${fmtDuration(r.durationMs)}`);
  }

  const skippedSteps = MANIFEST.slice(results.length);
  for (const step of skippedSteps) {
    console.log(`  -  ${step.id.padEnd(30)} (not reached)`);
  }

  if (failed) {
    console.error(`\n✗  Refresh failed at step: ${failed}\n`);
    process.exit(1);
  }

  console.log(`\n✓  All ${results.length} steps completed successfully.\n`);
}

// Run when invoked directly (not when imported by tests)
const isMain =
  process.argv[1] != null &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  runRefresh().catch((err) => {
    console.error("[refresh] Unexpected error:", err);
    process.exit(1);
  });
}
