#!/usr/bin/env node
/**
 * build-provenance.mjs
 *
 * Central provenance registry (issue #52). Scans every committed data/*.json,
 * extracts its standardized `meta` block (falling back to a top-level
 * `generatedAt` or the file mtime when a dataset predates the meta contract),
 * and writes data/provenance.json:
 *
 *   {
 *     generatedAt: string,
 *     datasets: [
 *       { id, file, generatedAt, asOf, source, version, rows }, ...
 *     ]
 *   }
 *
 * The registry is validated with validateProvenance before it is written so a
 * dataset that lost its provenance fails the build (issue #49 sanity-gate
 * philosophy). Run: node scripts/build-provenance.mjs
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { deriveMeta, normalizeSource, countRows, META_VERSION } from "./lib/meta.mjs";
import { validateProvenance } from "./lib/validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const OUTPUT_FILE = join(DATA_DIR, "provenance.json");

const REGISTRY_FILENAME = "provenance.json";

function extractMeta(parsed, fileMtimeIso) {
  const fallback = { generatedAt: fileMtimeIso };
  // Prefer an explicit, already-normalized meta block.
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.meta) {
    const m = parsed.meta;
    return {
      generatedAt: m.generatedAt || parsed.generatedAt || fileMtimeIso,
      asOf: m.asOf || (m.generatedAt || fileMtimeIso).slice(0, 10),
      source: normalizeSource(m.source) ?? deriveMeta(parsed, fallback).source,
      version: m.version || META_VERSION,
    };
  }
  // Otherwise derive from the object's own top-level provenance fields.
  return deriveMeta(parsed && typeof parsed === "object" ? parsed : {}, fallback);
}

function main() {
  const files = readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json") && f !== REGISTRY_FILENAME)
    .sort();

  const datasets = [];
  for (const file of files) {
    const fullPath = join(DATA_DIR, file);
    const mtimeIso = statSync(fullPath).mtime.toISOString();
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(fullPath, "utf8"));
    } catch (err) {
      throw new Error(`[build-provenance] failed to parse data/${file}: ${err.message}`);
    }
    const meta = extractMeta(parsed, mtimeIso);
    datasets.push({
      id: file.replace(/\.json$/, ""),
      file: `data/${file}`,
      generatedAt: meta.generatedAt,
      asOf: meta.asOf ?? null,
      source: meta.source ?? null,
      version: meta.version ?? META_VERSION,
      rows: countRows(parsed),
    });
  }

  const registry = {
    generatedAt: new Date().toISOString(),
    datasets,
  };

  validateProvenance(registry, { expectedIds: datasets.map((d) => d.id) });

  writeFileSync(OUTPUT_FILE, JSON.stringify(registry, null, 2) + "\n");
  console.log(
    `[build-provenance] wrote ${datasets.length} datasets -> ${OUTPUT_FILE}`
  );
  for (const d of datasets) {
    const src =
      d.source == null
        ? "(no source)"
        : typeof d.source === "string"
          ? d.source
          : d.source.name || d.source.publisher || "(source)";
    console.log(`  ${d.id.padEnd(28)} asOf=${d.asOf}  rows=${d.rows ?? "-"}  ${src}`);
  }
}

main();
