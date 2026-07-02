// Generates data/occupation-snapshot-slim.json — the full occupation snapshot
// with the heavy per-occupation employmentHistory / wageHistory maps removed.
//
// Client bundles import the SLIM file (via lib/data.ts) so multi-year OEWS
// history never ships in shared client chunks. Growth values that were derived
// at runtime from the histories are pre-computed here so no consumer needs the
// raw history:
//   - growthRate / growthWindow : resolved insight growth (bundled ?? derived)
//   - histGrowthRate            : growth derived purely from history (or null)
//
// The FULL snapshot (with histories) stays available server-side / to the
// history-only charts via lib/snapshot.ts.
//
// Run: node scripts/build-snapshot-slim.mjs  (also wired into build:data)

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");

/** Annualized CAGR (%) from an employmentHistory map, or null (<2 usable years). */
function computeGrowthFromHistory(history) {
  if (!history) return null;
  const years = Object.keys(history)
    .map(Number)
    .filter((y) => Number.isFinite(y) && history[String(y)] > 0)
    .sort((a, b) => a - b);
  if (years.length < 2) return null;
  const fromYear = years[0];
  const toYear = years[years.length - 1];
  const start = history[String(fromYear)];
  const end = history[String(toYear)];
  if (toYear <= fromYear || !(start > 0) || !(end > 0)) return null;
  const cagr = (Math.pow(end / start, 1 / (toYear - fromYear)) - 1) * 100;
  if (!Number.isFinite(cagr)) return null;
  return { rate: Math.round(cagr * 10) / 10, fromYear, toYear };
}

const full = JSON.parse(
  readFileSync(join(dataDir, "occupation-snapshot.json"), "utf8"),
);

const slim = full.map((row) => {
  const hist = computeGrowthFromHistory(row.employmentHistory);
  // Insight growth prefers the bundled growthRate; derives only when absent.
  const derived = row.growthRate == null ? hist : null;
  const growthRate = row.growthRate ?? (derived ? derived.rate : null);
  const growthWindow = derived
    ? { fromYear: derived.fromYear, toYear: derived.toYear }
    : null;
  return {
    socCode: row.socCode,
    title: row.title,
    sector: row.sector,
    aiExposure: row.aiExposure,
    automationRisk: row.automationRisk,
    automationProbability: row.automationProbability,
    medianSalary: row.medianSalary,
    employment: row.employment ?? null,
    projectedOpenings: row.projectedOpenings ?? null,
    growthRate,
    growthWindow,
    // Growth derived purely from history (used by reskilling path scoring).
    histGrowthRate: hist ? hist.rate : null,
    jobZone: row.jobZone,
    brightOutlook: row.brightOutlook,
    outlook: row.outlook ?? (row.brightOutlook ? "Bright" : "Average"),
    skills: row.skills,
  };
});

const outPath = join(dataDir, "occupation-snapshot-slim.json");
writeFileSync(outPath, JSON.stringify(slim));
console.log(
  `[build-snapshot-slim] wrote ${slim.length} rows -> ${outPath} (${(
    JSON.stringify(slim).length / 1024
  ).toFixed(0)} KB)`,
);
