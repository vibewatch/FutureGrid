/**
 * scripts/build-downloads.mjs
 *
 * Copies compliance-cleared dataset files from data/ into public/data/ so
 * they can be served as static downloads in the /methodology page.
 *
 * Only files with COMPLIANCE verdict "Yes" or "Yes-with-attribution" (per
 * data/COMPLIANCE.md, issue #56) are copied. Flagged/restricted files are
 * NEVER copied.
 *
 * Excluded (do NOT copy):
 *   market-ai-signals  — Yahoo ToS, redistribution prohibited
 *   ai-layoffs         — Challenger proprietary
 *   global-ai-metrics  — IMF non-commercial
 *   ai-usage-proxies   — QuestMobile rows
 *   aioe-exposure      — no explicit open license
 *   automation-baseline — no open license
 *
 * warn-notices.json is already served from public/warn-notices.json (via #47)
 * and must NOT be duplicated under public/data/.
 *
 * Run: node scripts/build-downloads.mjs
 *      (also wired into the build:downloads npm script)
 */

import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const srcDir = join(root, "data");
const destDir = join(root, "public", "data");

// ─── Compliance-cleared files to copy ─────────────────────────────────────────
// Sorted by id for readability.
const CLEARED_FILES = [
  "ai-demand.json",
  "ai-frontier.json",
  "country-exposure.json",
  "jolts.json",
  "llm-exposure.json",
  "occupation-snapshot-slim.json",
  "occupation-snapshot.json",
  "onet-enrichment.json",
  "state-labor.json",
  "state-qcew.json",
  // warn-notices.json is intentionally OMITTED — already at public/warn-notices.json
];

// Ensure destination directory exists.
if (!existsSync(destDir)) {
  mkdirSync(destDir, { recursive: true });
}

let copied = 0;
let skipped = 0;

for (const filename of CLEARED_FILES) {
  const src = join(srcDir, filename);
  const dest = join(destDir, filename);

  if (!existsSync(src)) {
    console.warn(`[build-downloads] SKIP  ${filename} — source not found`);
    skipped++;
    continue;
  }

  copyFileSync(src, dest);
  console.log(`[build-downloads] COPY  ${filename}`);
  copied++;
}

console.log(
  `[build-downloads] Done: ${copied} file(s) copied, ${skipped} skipped → ${destDir}`,
);
