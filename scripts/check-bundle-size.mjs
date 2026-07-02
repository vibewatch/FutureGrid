// Bundle-size budget check.
//
// Reads all client JS chunks from `out/_next/static/chunks/` and fails if any
// single chunk exceeds the MAX_CHUNK_BYTES threshold.  Run after `npm run build`.
//
// Budget rationale:
//   Largest chunk on the reference build (post-#47 fix): ~503 KB.
//   700 KB budget gives ~40% headroom while catching a 3 MB-class regression.

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const MAX_CHUNK_BYTES = 700 * 1024; // 700 KB
const CHUNKS_DIR = join(process.cwd(), "out", "_next", "static", "chunks");
const TOP_N = 10; // rows to print in the table

function formatBytes(n) {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(2)} MB`;
  return `${(n / 1024).toFixed(1)} KB`;
}

function main() {
  let entries;
  try {
    entries = readdirSync(CHUNKS_DIR);
  } catch {
    console.error(`✗ Cannot read ${CHUNKS_DIR} — run \`npm run build\` first.`);
    process.exit(1);
  }

  const jsChunks = entries
    .filter((f) => f.endsWith(".js"))
    .map((f) => {
      const fullPath = join(CHUNKS_DIR, f);
      const size = statSync(fullPath).size;
      return { name: f, size };
    })
    .sort((a, b) => b.size - a.size);

  if (jsChunks.length === 0) {
    console.error("✗ No .js chunks found — run `npm run build` first.");
    process.exit(1);
  }

  const largest = jsChunks[0];
  const totalSize = jsChunks.reduce((s, c) => s + c.size, 0);

  // Print table
  const nameW = Math.max(8, ...jsChunks.slice(0, TOP_N).map((c) => c.name.length));
  console.log("\nBundle-size report (client JS chunks):");
  console.log(`${"chunk".padEnd(nameW)}  ${"size".padStart(10)}  ${"budget".padStart(10)}  verdict`);
  console.log("-".repeat(nameW + 38));

  for (const chunk of jsChunks.slice(0, TOP_N)) {
    const over = chunk.size > MAX_CHUNK_BYTES;
    const verdict = over ? "✗ OVER" : "✓ ok";
    console.log(
      `${chunk.name.padEnd(nameW)}  ${formatBytes(chunk.size).padStart(10)}  ${formatBytes(MAX_CHUNK_BYTES).padStart(10)}  ${verdict}`,
    );
  }

  if (jsChunks.length > TOP_N) {
    console.log(`  … and ${jsChunks.length - TOP_N} more chunks`);
  }

  console.log(`\nTotal client JS: ${formatBytes(totalSize)} across ${jsChunks.length} chunks`);
  console.log(`Largest chunk:   ${formatBytes(largest.size)} (${largest.name})`);
  console.log(`Budget:          ${formatBytes(MAX_CHUNK_BYTES)} per chunk\n`);

  if (largest.size > MAX_CHUNK_BYTES) {
    console.error(
      `✗ FAIL — largest chunk ${formatBytes(largest.size)} exceeds ${formatBytes(MAX_CHUNK_BYTES)} budget.`,
    );
    process.exit(1);
  }

  console.log(`✓ PASS — all chunks within the ${formatBytes(MAX_CHUNK_BYTES)} budget.`);
  process.exit(0);
}

main();
