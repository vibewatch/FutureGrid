#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { buildMeta } from "./lib/meta.mjs";
import { validateJobPostings } from "./lib/validate.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_DIR = join(ROOT, "data");
const OUTPUT_FILE = process.env.JOB_POSTINGS_OUTPUT_FILE
  ? resolvePath(process.env.JOB_POSTINGS_OUTPUT_FILE)
  : join(DATA_DIR, "job-postings.json");
const OBSERVED_PROVIDER_FILE = process.env.JOB_POSTINGS_PROVIDER_FILE
  ? resolvePath(process.env.JOB_POSTINGS_PROVIDER_FILE)
  : null;

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
mkdirSync(dirname(OUTPUT_FILE), { recursive: true });

const OCCUPATION_SNAPSHOT_RAW = JSON.parse(
  readFileSync(join(DATA_DIR, "occupation-snapshot.json"), "utf8")
);
const OCCUPATIONS = Array.isArray(OCCUPATION_SNAPSHOT_RAW)
  ? OCCUPATION_SNAPSHOT_RAW
  : OCCUPATION_SNAPSHOT_RAW.data;
const ONET_ENRICHMENT = JSON.parse(
  readFileSync(join(DATA_DIR, "onet-enrichment.json"), "utf8")
);

const YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
const LATEST_YEAR = YEARS[YEARS.length - 1];
const MACRO_MULTIPLIER_BY_YEAR = {
  2016: 0.9,
  2017: 0.94,
  2018: 0.99,
  2019: 1.03,
  2020: 0.86,
  2021: 1.04,
  2022: 1.1,
  2023: 1.03,
  2024: 1.0,
  2025: 0.97,
};

const sectorEmploymentFallback = buildSectorFallbackMap(OCCUPATIONS, "employment");
const sectorOpeningRateFallback = buildSectorOpeningRateFallback(OCCUPATIONS, sectorEmploymentFallback);
const onetOccupations = ONET_ENRICHMENT?.occupations ?? {};
const knownCodes = new Set(OCCUPATIONS.map((row) => row.socCode));

function main() {
  const seedRows = OCCUPATIONS.map((row) => buildOccupationSeedRow(row))
    .sort((a, b) => a.socCode.localeCompare(b.socCode));
  const observedInput = OBSERVED_PROVIDER_FILE
    ? readObservedProviderInput(OBSERVED_PROVIDER_FILE)
    : null;
  const { rows, coverageMode, observedOccupationCount, seedFallbackOccupationCount } =
    applyObservedProviderRows(seedRows, observedInput);

  const annualPostingsBySoc = new Map(
    rows.map((row) => [row.socCode, row.annualPostings])
  );

  for (const row of rows) {
    row.relatedAnnualPostings = Object.fromEntries(
      YEARS.map((year) => [
        String(year),
        row.relatedOccupations.reduce(
          (sum, related) =>
            sum + (annualPostingsBySoc.get(related.socCode)?.[String(year)] ?? 0),
          0
        ),
      ])
    );
    row.latestRelatedAnnualPostings = row.relatedAnnualPostings[String(LATEST_YEAR)];
  }

  rows.sort(
    (a, b) =>
      b.latestAnnualPostings - a.latestAnnualPostings ||
      a.socCode.localeCompare(b.socCode)
  );

  const totalAnnualPostingsByYear = sumYearObjects(
    rows.map((row) => row.annualPostings)
  );
  const totalRelatedAnnualPostingsByYear = sumYearObjects(
    rows.map((row) => row.relatedAnnualPostings)
  );

  const dataset = {
    meta: buildMeta({
      asOf: observedInput?.asOf ?? String(LATEST_YEAR),
      source:
        observedInput?.source ?? {
          name: "FutureGrid provider-ready job postings seed",
          publisher: "FutureGrid",
          url: "https://github.com/huangyingting/FutureGrid",
        },
    }),
    coverage: {
      years: YEARS,
      occupations: rows.length,
      occupationsWithRelatedJobs: rows.filter(
        (row) => row.relatedOccupations.length > 0
      ).length,
      currentSourceDataset: "data/occupation-snapshot.json",
      relatedOccupationSourceDataset: "data/onet-enrichment.json",
      observedHistoricalPostings: observedOccupationCount > 0,
      mode: coverageMode,
      observedOccupations: observedOccupationCount,
      seedFallbackOccupations: seedFallbackOccupationCount,
      observedProviderInput: OBSERVED_PROVIDER_FILE
        ? OBSERVED_PROVIDER_FILE.replace(`${ROOT}/`, "")
        : null,
      primaryKey: "socCode",
    },
    methodology: {
      provenanceDecision:
        "No credential-free occupation-level historical job-postings source is bundled in-repo. This checked-in seed preserves a stable SOC-keyed 10-year contract until a licensed provider is wired in.",
      annualization:
        "Seed counts are derived from occupation employment history and projected openings already bundled in occupation-snapshot.json. Missing 2024 anchors are interpolated; 2016–2018 anchors are backcast from observed OEWS-era growth.",
      relatedJobs:
        "Related job coverage comes from O*NET related occupations and sample titles so downstream correlation can roll up nearby occupations from the current FutureGrid source set.",
      caveat:
        "Counts are deterministic seed estimates for engineering integration and correlation experiments; they are not observed provider posting counts.",
    },
    providerContract: {
      metric: "annualPostingCount",
      grain: "year",
      primaryKey: "socCode",
      alternateKeys: ["title", "sampleTitles", "relatedOccupations.socCode"],
      requiredYears: YEARS,
      replaceFields: [
        "occupations[].annualPostings",
        "occupations[].relatedAnnualPostings",
        "occupations[].sourceStatus",
        "summary.totalAnnualPostingsByYear",
      ],
      recommendedProviders: ["Lightcast", "LinkUp", "TheirStack", "Adzuna"],
    },
    summary: {
      latestYear: LATEST_YEAR,
      totalAnnualPostingsByYear,
      totalRelatedAnnualPostingsByYear,
      topOccupationsLatestYear: rows.slice(0, 10).map((row) => ({
        socCode: row.socCode,
        title: row.title,
        annualPostings: row.latestAnnualPostings,
      })),
    },
    occupations: rows,
  };

  validateJobPostings(dataset);
  writeFileSync(OUTPUT_FILE, `${JSON.stringify(dataset, null, 2)}\n`);
  console.log(
    `[build-job-postings] wrote data/job-postings.json (${seedRows.length} occupations, ${YEARS.length} annual points)`
  );
}

function resolvePath(filePath) {
  return isAbsolute(filePath) ? filePath : resolve(ROOT, filePath);
}

function readObservedProviderInput(filePath) {
  const raw = JSON.parse(readFileSync(filePath, "utf8"));
  const rows = Array.isArray(raw?.rows)
    ? raw.rows
    : Array.isArray(raw?.occupations)
      ? raw.occupations
      : null;
  if (!rows) {
    throw new Error(
      "[build-job-postings] observed provider input must contain a rows or occupations array"
    );
  }

  const normalizedRows = rows.map((row, index) => normalizeObservedProviderRow(row, index));
  return {
    asOf: typeof raw?.meta?.asOf === "string" ? raw.meta.asOf : String(LATEST_YEAR),
    source:
      raw?.meta?.source && typeof raw.meta.source === "object"
        ? raw.meta.source
        : {
            name: "Observed job-postings provider input",
            publisher: "Configured provider",
            url: null,
          },
    rows: normalizedRows,
  };
}

function normalizeObservedProviderRow(row, index) {
  const socCode = typeof row?.socCode === "string" ? row.socCode : row?.soc;
  if (typeof socCode !== "string" || !/^\d{2}-\d{4}$/.test(socCode)) {
    throw new Error(
      `[build-job-postings] observed row ${index + 1} has invalid or missing SOC code`
    );
  }

  const annualPostings =
    row.annualPostings ?? row.postingsByYear ?? row.countsByYear ?? row.counts;
  if (!annualPostings || typeof annualPostings !== "object" || Array.isArray(annualPostings)) {
    throw new Error(
      `[build-job-postings] observed row ${socCode} must include annualPostings/postingsByYear/counts`
    );
  }

  const observedAnnualPostings = {};
  for (const year of YEARS) {
    const value = toFiniteNumber(annualPostings[String(year)]);
    if (value == null) continue;
    if (value < 0) {
      throw new Error(
        `[build-job-postings] observed row ${socCode} has a negative count for ${year}`
      );
    }
    observedAnnualPostings[String(year)] = roundCount(value);
  }

  if (Object.keys(observedAnnualPostings).length === 0) {
    throw new Error(
      `[build-job-postings] observed row ${socCode} has no counts inside the ${YEARS[0]}-${LATEST_YEAR} coverage window`
    );
  }

  return {
    socCode,
    observedAnnualPostings,
  };
}

function applyObservedProviderRows(seedRows, observedInput) {
  if (!observedInput) {
    return {
      rows: seedRows,
      coverageMode: "seed-static",
      observedOccupationCount: 0,
      seedFallbackOccupationCount: seedRows.length,
    };
  }

  const observedBySoc = new Map(
    observedInput.rows.map((row) => [row.socCode, row.observedAnnualPostings])
  );
  const rows = seedRows.map((seedRow) => {
    const observedAnnualPostings = observedBySoc.get(seedRow.socCode);
    if (!observedAnnualPostings) {
      return {
        ...seedRow,
        sourceStatus: "seed-derived",
      };
    }

    const observedYears = new Set(Object.keys(observedAnnualPostings));
    const annualPostings = Object.fromEntries(
      YEARS.map((year) => {
        const yearKey = String(year);
        return [
          yearKey,
          observedAnnualPostings[yearKey] ?? seedRow.annualPostings[yearKey],
        ];
      })
    );

    return {
      ...seedRow,
      annualPostings,
      latestAnnualPostings: annualPostings[String(LATEST_YEAR)],
      observedYears: [...observedYears].sort(),
      sourceStatus:
        observedYears.size === YEARS.length
          ? "observed-provider"
          : "observed-provider-with-seed-fallback",
    };
  });
  const observedOccupationCount = rows.filter((row) =>
    row.sourceStatus.startsWith("observed-provider")
  ).length;
  const fullyObservedCount = rows.filter(
    (row) => row.sourceStatus === "observed-provider"
  ).length;

  return {
    rows,
    coverageMode:
      fullyObservedCount === rows.length
        ? "observed-provider"
        : "observed-provider-with-seed-fallback",
    observedOccupationCount,
    seedFallbackOccupationCount: rows.length - fullyObservedCount,
  };
}

function buildOccupationSeedRow(row) {
  const onet = onetOccupations[row.socCode] ?? {};
  const fallbackEmployment = inferFallbackEmployment(row);
  const employmentByYear = buildEmploymentSeries(row, fallbackEmployment);
  const projectedOpenings = toFiniteNumber(row.projectedOpenings);
  const latestEmployment = employmentByYear[String(LATEST_YEAR)] || fallbackEmployment;
  const openingsRate =
    projectedOpenings != null && latestEmployment > 0
      ? projectedOpenings / latestEmployment
      : sectorOpeningRateFallback.get(row.sector) ?? 0.08;
  const employmentCagr = computeSeriesCagr(employmentByYear);
  const aiExposure = clamp(toFiniteNumber(row.aiExposure) ?? 0, 0, 0.75);
  const brightOutlook = Boolean(row.brightOutlook || row.outlook === "Bright");
  const jobZone = clamp(toFiniteNumber(row.jobZone) ?? 3, 0, 5);
  const baseIntensity = clamp(
    openingsRate + 0.012 * jobZone + (brightOutlook ? 0.025 : 0) + aiExposure * 0.04,
    0.02,
    1.15
  );
  const occupationFactor = clamp(
    1 +
      aiExposure * 0.22 +
      (brightOutlook ? 0.06 : 0) +
      clamp(employmentCagr, -0.12, 0.12) * 0.45,
    0.65,
    1.45
  );

  const annualPostings = Object.fromEntries(
    YEARS.map((year) => {
      const employment = employmentByYear[String(year)] ?? fallbackEmployment;
      const yearMultiplier = MACRO_MULTIPLIER_BY_YEAR[year] ?? 1;
      const count = roundCount(employment * baseIntensity * occupationFactor * yearMultiplier);
      return [String(year), count];
    })
  );

  const relatedOccupations = (Array.isArray(onet.relatedOccupations)
    ? onet.relatedOccupations
    : []
  )
    .filter(
      (related) =>
        related &&
        typeof related.code === "string" &&
        knownCodes.has(related.code) &&
        related.code !== row.socCode
    )
    .map((related) => ({
      socCode: related.code,
      title: related.title,
      brightOutlook: Boolean(related.brightOutlook),
    }));

  return {
    socCode: row.socCode,
    title: row.title,
    sector: row.sector,
    sampleTitles: Array.isArray(onet.sampleTitles) ? onet.sampleTitles.slice(0, 10) : [],
    relatedOccupations,
    annualPostings,
    relatedAnnualPostings: Object.fromEntries(
      YEARS.map((year) => [String(year), 0])
    ),
    latestAnnualPostings: annualPostings[String(LATEST_YEAR)],
    latestRelatedAnnualPostings: 0,
    sourceStatus: "seed-derived",
  };
}

function buildEmploymentSeries(row, fallbackEmployment) {
  const known = new Map();
  const history =
    row.employmentHistory && typeof row.employmentHistory === "object"
      ? row.employmentHistory
      : {};

  for (const [year, value] of Object.entries(history)) {
    const numericYear = Number(year);
    const numericValue = toFiniteNumber(value);
    if (
      Number.isInteger(numericYear) &&
      YEARS.includes(numericYear) &&
      numericValue != null &&
      numericValue > 0
    ) {
      known.set(numericYear, numericValue);
    }
  }

  const currentEmployment = toFiniteNumber(row.employment);
  if (currentEmployment != null && currentEmployment > 0) {
    known.set(LATEST_YEAR, currentEmployment);
  }
  if (known.size === 0) known.set(LATEST_YEAR, fallbackEmployment);

  const sortedYears = [...known.keys()].sort((a, b) => a - b);
  for (let index = 0; index < sortedYears.length - 1; index += 1) {
    const startYear = sortedYears[index];
    const endYear = sortedYears[index + 1];
    const startValue = known.get(startYear);
    const endValue = known.get(endYear);
    if (!(startValue > 0 && endValue > 0)) continue;
    const span = endYear - startYear;
    if (span <= 1) continue;
    for (let year = startYear + 1; year < endYear; year += 1) {
      if (known.has(year)) continue;
      const weight = (year - startYear) / span;
      known.set(year, roundCount(startValue + (endValue - startValue) * weight));
    }
  }

  const firstKnownYear = Math.min(...known.keys());
  const lastKnownYear = Math.max(...known.keys());
  const firstKnownValue = known.get(firstKnownYear) ?? fallbackEmployment;
  const lastKnownValue = known.get(lastKnownYear) ?? fallbackEmployment;
  const cagr =
    firstKnownYear !== lastKnownYear && firstKnownValue > 0 && lastKnownValue > 0
      ? clamp(
          Math.pow(lastKnownValue / firstKnownValue, 1 / (lastKnownYear - firstKnownYear)) -
            1,
          -0.12,
          0.12
        )
      : 0;

  for (let year = firstKnownYear - 1; year >= YEARS[0]; year -= 1) {
    const next = known.get(year + 1) ?? fallbackEmployment;
    known.set(year, roundCount(next / (1 + cagr)));
  }
  for (let year = lastKnownYear + 1; year <= LATEST_YEAR; year += 1) {
    const prev = known.get(year - 1) ?? fallbackEmployment;
    known.set(year, roundCount(prev * (1 + cagr)));
  }

  return Object.fromEntries(
    YEARS.map((year) => [String(year), roundCount(known.get(year) ?? fallbackEmployment)])
  );
}

function inferFallbackEmployment(row) {
  const direct = toFiniteNumber(row.employment);
  if (direct != null && direct > 0) return direct;
  const projectedOpenings = toFiniteNumber(row.projectedOpenings);
  if (projectedOpenings != null && projectedOpenings > 0) {
    return Math.max(Math.round(projectedOpenings * 8), 2_500);
  }
  return sectorEmploymentFallback.get(row.sector) ?? 10_000;
}

function buildSectorFallbackMap(rows, field) {
  const bySector = new Map();
  for (const row of rows) {
    const value = toFiniteNumber(row[field]);
    if (value == null || value <= 0) continue;
    const bucket = bySector.get(row.sector) ?? [];
    bucket.push(value);
    bySector.set(row.sector, bucket);
  }
  return new Map(
    [...bySector.entries()].map(([sector, values]) => [sector, Math.round(median(values))])
  );
}

function buildSectorOpeningRateFallback(rows, sectorEmploymentMap) {
  const bySector = new Map();
  for (const row of rows) {
    const employment =
      toFiniteNumber(row.employment) ??
      sectorEmploymentMap.get(row.sector) ??
      0;
    const projectedOpenings = toFiniteNumber(row.projectedOpenings);
    if (!(employment > 0 && projectedOpenings > 0)) continue;
    const rate = projectedOpenings / employment;
    if (!(Number.isFinite(rate) && rate > 0)) continue;
    const bucket = bySector.get(row.sector) ?? [];
    bucket.push(clamp(rate, 0.01, 1.2));
    bySector.set(row.sector, bucket);
  }
  return new Map(
    [...bySector.entries()].map(([sector, values]) => [sector, round(median(values), 6)])
  );
}

function sumYearObjects(objects) {
  return Object.fromEntries(
    YEARS.map((year) => [
      String(year),
      objects.reduce((sum, obj) => sum + (obj[String(year)] ?? 0), 0),
    ])
  );
}

function computeSeriesCagr(series) {
  const first = series[String(YEARS[0])];
  const last = series[String(LATEST_YEAR)];
  if (!(first > 0 && last > 0)) return 0;
  return (
    Math.pow(last / first, 1 / (LATEST_YEAR - YEARS[0])) -
    1
  );
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function toFiniteNumber(value) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function round(value, digits = 6) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function roundCount(value) {
  if (!(Number.isFinite(value) && value > 0)) return 0;
  return Math.round(value);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

main();
