#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildMeta } from "./lib/meta.mjs";
import { validateEmploymentProjections } from "./lib/validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const OUTPUT_FILE = join(DATA_DIR, "employment-projections.json");
const OCCUPATION_SNAPSHOT_RAW = JSON.parse(
  readFileSync(join(DATA_DIR, "occupation-snapshot-slim.json"), "utf8")
);
const OCCUPATIONS = Array.isArray(OCCUPATION_SNAPSHOT_RAW)
  ? OCCUPATION_SNAPSHOT_RAW
  : OCCUPATION_SNAPSHOT_RAW.data;

const SOURCE_URL =
  "https://raw.githubusercontent.com/jeffbaumes/jobs/main/occupations.csv";
const SOURCE_REPO_URL = "https://github.com/jeffbaumes/jobs";
const SOURCE_BLS_URL = "https://www.bls.gov/emp/data/occupational-data.htm";
const USER_AGENT =
  "FutureGrid/1.0 employment projections build (+https://github.com/huangyingting/FutureGrid)";
const BASE_YEAR = 2024;
const PROJECTION_YEAR = 2034;
const WINDOW_YEARS = PROJECTION_YEAR - BASE_YEAR;

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

async function main() {
  console.log("=== Building employment projections snapshot ===");
  ensureUniqueKeys(
    OCCUPATIONS.map((row) => row.title),
    "occupation-snapshot titles"
  );

  const sourceRows = parseCsvObjects(await fetchText(SOURCE_URL));
  ensureUniqueKeys(
    sourceRows.map((row) => row.name),
    "projection source titles"
  );
  const sourceByTitle = new Map(
    sourceRows.map((row) => [normalizeTitle(row.name), row])
  );

  const unmatchedSnapshotTitles = [];
  const rows = OCCUPATIONS.map((occupation) => {
    const source = sourceByTitle.get(normalizeTitle(occupation.title));
    if (!source) {
      unmatchedSnapshotTitles.push(occupation.title);
      return null;
    }

    const employment2024 = thousandsToJobs(source.employment_2024);
    const employmentChange = thousandsToJobs(source.projected_new_jobs);
    const employment2034 =
      employment2024 != null && employmentChange != null
        ? employment2024 + employmentChange
        : null;

    return {
      socCode: occupation.socCode,
      title: occupation.title,
      sector: occupation.sector,
      employment2024,
      employment2034,
      employmentChange,
      employmentChangePct: toRoundedNumber(source.projected_growth_rate),
      projectedOpenings: toRoundedInteger(occupation.projectedOpenings),
      aiExposure: toRoundedDecimal(occupation.aiExposure, 4),
      automationRisk: occupation.automationRisk,
      automationProbability: toRoundedDecimal(
        occupation.automationProbability,
        4
      ),
      brightOutlook: Boolean(occupation.brightOutlook),
      medianAnnualWage: toRoundedInteger(source.median_pay_2024),
      entryLevelEducation: cleanText(source.entry_level_education),
      onTheJobTraining: cleanText(source.on_the_job_training),
      sourceUrl: cleanText(source.url),
    };
  }).filter(Boolean);

  if (unmatchedSnapshotTitles.length > 0) {
    throw new Error(
      `[build-employment-projections] missing source rows for snapshot titles: ${unmatchedSnapshotTitles
        .slice(0, 20)
        .join("; ")}${unmatchedSnapshotTitles.length > 20 ? "…" : ""}`
    );
  }

  rows.sort((a, b) => a.socCode.localeCompare(b.socCode));

  const dataset = {
    meta: buildMeta({
      asOf: `${BASE_YEAR}-${PROJECTION_YEAR}`,
      source: {
        name: "BLS Employment Projections occupational data",
        publisher: "U.S. Bureau of Labor Statistics",
        url: SOURCE_BLS_URL,
      },
    }),
    coverage: {
      baseYear: BASE_YEAR,
      projectionYear: PROJECTION_YEAR,
      windowYears: WINDOW_YEARS,
      primaryKey: "socCode",
      rows: rows.length,
      sourceRows: sourceRows.length,
      matchedSnapshotRows: rows.length,
      rowsWithProjectedOpenings: rows.filter(
        (row) => typeof row.projectedOpenings === "number"
      ).length,
    },
    methodology: {
      provenanceDecision:
        "The official BLS Employment Projections download pages were bot-blocked (HTTP 403) from this build environment, so the builder consumes the public GitHub mirror in jeffbaumes/jobs, whose README documents that occupations.csv is regenerated from the official BLS Employment Projections occupational workbook.",
      accessMirror: SOURCE_URL,
      mirrorRepository: SOURCE_REPO_URL,
      joinStrategy:
        "FutureGrid joins the public-source projection rows to occupation-snapshot-slim.json by exact normalized occupation title. Titles are unique in both inputs, so each snapshot SOC receives exactly one projection row.",
      openingsStrategy:
        "projectedOpenings is carried through from occupation-snapshot-slim.json as a supplemental visualization field until a directly accessible public annual-openings table can be wired into this builder.",
      units:
        "employment_2024 and projected_new_jobs are published in thousands in the source CSV and are converted here to integer job counts. employmentChangePct remains a percent.",
    },
    summary: buildSummary(rows),
    rows,
  };

  validateEmploymentProjections(dataset);
  writeFileSync(OUTPUT_FILE, `${JSON.stringify(dataset, null, 2)}\n`);

  console.log(
    `[build-employment-projections] wrote data/employment-projections.json (${rows.length} SOC rows, ${dataset.coverage.rowsWithProjectedOpenings} with openings)`
  );
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8",
      "User-Agent": USER_AGENT,
    },
  });
  if (!res.ok) {
    throw new Error(
      `[build-employment-projections] fetch failed for ${url}: HTTP ${res.status}`
    );
  }
  return res.text();
}

function parseCsvObjects(text) {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const header = rows[0];
  return rows.slice(1).map((values) =>
    Object.fromEntries(header.map((key, index) => [key, values[index] ?? ""]))
  );
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(
    (currentRow) =>
      currentRow.length > 1 || currentRow.some((value) => value.trim().length > 0)
  );
}

function buildSummary(rows) {
  const totalEmployment2024 = rows.reduce(
    (sum, row) => sum + (row.employment2024 ?? 0),
    0
  );
  const totalEmployment2034 = rows.reduce(
    (sum, row) => sum + (row.employment2034 ?? 0),
    0
  );
  const totalEmploymentChange = rows.reduce(
    (sum, row) => sum + (row.employmentChange ?? 0),
    0
  );
  const topProjectedOpenings = rows
    .filter((row) => typeof row.projectedOpenings === "number")
    .sort(
      (a, b) =>
        (b.projectedOpenings ?? 0) - (a.projectedOpenings ?? 0) ||
        a.title.localeCompare(b.title)
    )
    .slice(0, 10)
    .map(toSummaryRow);
  const fastestGrowing = rows
    .filter((row) => typeof row.employmentChangePct === "number")
    .sort(
      (a, b) =>
        (b.employmentChangePct ?? 0) - (a.employmentChangePct ?? 0) ||
        a.title.localeCompare(b.title)
    )
    .slice(0, 10)
    .map(toSummaryRow);
  const steepestDeclines = rows
    .filter((row) => typeof row.employmentChangePct === "number")
    .sort(
      (a, b) =>
        (a.employmentChangePct ?? 0) - (b.employmentChangePct ?? 0) ||
        a.title.localeCompare(b.title)
    )
    .slice(0, 10)
    .map(toSummaryRow);

  return {
    totalEmployment2024,
    totalEmployment2034,
    totalEmploymentChange,
    rowsWithProjectedOpenings: rows.filter(
      (row) => typeof row.projectedOpenings === "number"
    ).length,
    topProjectedOpenings,
    fastestGrowing,
    steepestDeclines,
  };
}

function toSummaryRow(row) {
  return {
    socCode: row.socCode,
    title: row.title,
    employment2024: row.employment2024,
    employment2034: row.employment2034,
    employmentChange: row.employmentChange,
    employmentChangePct: row.employmentChangePct,
    projectedOpenings: row.projectedOpenings,
  };
}

function thousandsToJobs(value) {
  const numeric = toFiniteNumber(value);
  return numeric == null ? null : Math.round(numeric * 1000);
}

function toRoundedInteger(value) {
  const numeric = toFiniteNumber(value);
  return numeric == null ? null : Math.round(numeric);
}

function toRoundedNumber(value) {
  const numeric = toFiniteNumber(value);
  return numeric == null ? null : Math.round(numeric * 10) / 10;
}

function toRoundedDecimal(value, digits = 4) {
  const numeric = toFiniteNumber(value);
  if (numeric == null) return null;
  const scale = 10 ** digits;
  return Math.round(numeric * scale) / scale;
}

function toFiniteNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed.replace(/\$/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

function cleanText(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTitle(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function ensureUniqueKeys(values, label) {
  const counts = new Map();
  for (const value of values) {
    const key = normalizeTitle(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const duplicates = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
  if (duplicates.length > 0) {
    throw new Error(
      `[build-employment-projections] ${label} are not unique: ${duplicates
        .slice(0, 10)
        .join(", ")}`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
