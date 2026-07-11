# H-1B Visa / LCA Trends

**Status:** Production
**Owner:** Tank (Backend / Data Dev)
**Last audited:** 2026-07-11

---

## Purpose

Documents the H-1B Labor Condition Application (LCA) trends dataset: certified LCA volume by fiscal year, occupation, employer, and state; wage percentiles; CAGR; and the AI-exposure-tier join. Powers the "Work Visa Job Trends" feature.

### ⚠️ Critical Distinction

**These are certified H-1B LCAs (Labor Condition Applications) — employer filings required as a step in the H-1B sponsorship process. They are NOT visa approvals, cap-subject approvals, or actual visa issuances.** The provenance note in `data/h1b-trends.json` carries this disclaimer.

### Non-Goals

- Does not cover domestic employment projections — see [`docs/labor-market.md`](./labor-market.md).
- Does not cover occupation exposure model — see [`docs/occupation-data-model.md`](./occupation-data-model.md).
- Does not cover immigration approval rates, H-1B cap lotteries, or USCIS data.

---

## Boundaries

| Artifact | File | Module |
|---|---|---|
| H-1B LCA trends | `data/h1b-trends.json` | `lib/h1b.ts` |
| Build script | `scripts/build-h1b.mjs` | — |
| SOC crosswalk | `scripts/lib/soc-crosswalk.mjs` | — |

---

## Architecture

```
DOL OFLC LCA Disclosure XLSX files
  FY2020–FY2025: 4 per-quarter workbooks per fiscal year
  FY2016–FY2019: 1 annual workbook per fiscal year
  (via Wayback Machine identity mirror — dol.gov edge 403s non-browser clients)
    │
    ▼
scripts/build-h1b.mjs
  • Stream-parse workbooks with ExcelJS WorkbookReader (never load full workbook)
  • Map columns by header NAME (case-insensitive) — tolerates schema drift
  • For FY2020+: de-duplicate by CASE_NUMBER across all 4 quarters before counting
  • Apply SOC 2010→2018 crosswalk (scripts/lib/soc-crosswalk.mjs)
  • Aggregate: by-year headline rows, by-occupation, top-employers, by-state
  • Compute CAGR per occupation
  • Compute wage percentiles (p25, p50, p75) per year / per occupation (≥5000 total)
  • buildMeta() → meta block
  • validateH1bTrends() → fail before write if degenerate
  • writeFileSync → data/h1b-trends.json
    │
    ▼
lib/h1b.ts
  • Typed loader
  • AI-exposure tier join (left-join to occupation-snapshot-slim on socCode)
  • Selectors: getExposureTierAggregation(), getTopOccupationsByLatestYear(), etc.
```

---

## Mermaid Data-Flow Diagram

```mermaid
flowchart TD
    OFLC[DOL OFLC LCA Disclosure XLSX\nFY2016–FY2025\nvia Wayback Machine identity mirror]
    CW["scripts/lib/soc-crosswalk.mjs\nSOC 2010→2018 map"]
    BH1B["scripts/build-h1b.mjs\n(stream-parse, dedup, crosswalk, aggregate)"]
    DH1B["data/h1b-trends.json"]
    DSNAP["data/occupation-snapshot-slim.json"]
    LH1B["lib/h1b.ts\ntyped loader + AI-exposure join"]
    SC[Server Components / API routes]

    OFLC --> BH1B
    CW --> BH1B
    BH1B -->|buildMeta + validateH1bTrends| DH1B
    DH1B --> LH1B
    DSNAP --> LH1B
    LH1B --> SC
```

---

## Canonical Schemas / Types

### `H1bTrends` — top-level dataset

```typescript
interface H1bTrends {
  meta: H1bMeta;         // generatedAt, asOf, source, version, note (LCAs ≠ approvals)
  coverage: H1bCoverage; // fiscalYears, incompleteFiscalYears, aggregation, socVintage
  byYear: H1bYearRow[];  // headline stats per fiscal year
  occupations: H1bOccupation[];
  topEmployers: H1bEmployer[];
  byState: H1bState[];
}
```

### `H1bYearRow` — annual headline

```typescript
export interface H1bYearRow {
  fiscalYear: number;
  certifiedLcas: number;           // distinct CASE_NUMBERs with CASE_STATUS = "Certified"
  certifiedWithdrawnLcas: number;
  totalWorkerPositions: number;    // sum of TOTAL_WORKERS across certified rows
  distinctEmployers: number;
  medianWageAnnual: number;        // annualized offered wage (p50), USD
  p25WageAnnual: number;
  p75WageAnnual: number;
}
```

### `H1bOccupation` — per-occupation record

```typescript
export interface H1bOccupation {
  socCode: string;                  // SOC 2018 (after crosswalk)
  socTitle: string;
  countByYear: Record<string, number>; // fiscal year → certified LCA count
  totalCount: number;               // sum across all fiscal years
  medianWageAnnualLatest: number;   // median wage in latest fiscal year, USD
  cagr: number;                     // CAGR as decimal fraction (0.0572 = +5.72%)
  wageByYear?: Record<string, number | null>; // only for occupations with ≥ 5,000 total filings
  medianWageByYear?: Record<string, number | null>; // alias for wageByYear
}
```

### `H1bCoverage`

```typescript
export interface H1bCoverage {
  fiscalYears: number[];
  skippedFiscalYears?: number[];
  incompleteFiscalYears: number[];   // years with < 4 quarters of data
  source: string;
  aggregation: string;               // "Distinct CASE_NUMBERs for FY2020+; annual files FY2016–FY2019"
  socVintage?: string;               // "SOC 2018 (crosswalk applied from SOC 2010 for FY2016–FY2019)"
  socCrosswalkApplied?: boolean;
}
```

### `ExposureTierAggregation` — AI-exposure join

```typescript
export interface ExposureTierAggregation {
  years: number[];
  tiers: ExposureTierSeries[];       // Low / Medium / High / Very High / Unclassified
  matchedOccupations: number;
  totalOccupations: number;
  occupationMatchRate: number;       // fraction 0–1
  volumeMatchRate: number;           // fraction 0–1 (by certified-LCA volume)
}
```

---

## Joins / Crosswalks / Algorithms

### SOC 2010 → 2018 Crosswalk

DOL disclosure files for FY2016–FY2019 use SOC 2010 codes. `scripts/lib/soc-crosswalk.mjs` fetches the BLS `soc_2010_to_2018_crosswalk.xlsx` (via Wayback Machine identity mirror), parses it with ExcelJS, and produces:

- `map: Map<soc2010, soc2018>` — primary (first) 2018 target.
- `multi: Map<soc2010, Set<soc2018>>` — all 2018 targets (for split occupations).
- `soc2018Title: Map<soc2018, string>` — canonical 2018 SOC titles.

The builder normalizes all SOC codes to 2018 vintage before aggregating.

### Deduplication (FY2020+)

The DOL quarterly files are **per-quarter non-cumulative**. A single LCA that spans two quarters appears in both files with the same `CASE_NUMBER`. The builder deduplicates by `CASE_NUMBER` across all four quarters before counting certified LCAs. FY2016–FY2019 use annual files which are already deduplicated.

### CAGR Computation

```
CAGR = (v_last / v_first)^(1 / (n - 1)) - 1
```

where `v_first` is the certified count in the earliest fiscal year and `v_last` in the latest, and `n` is the number of years. Only occupations with non-zero volume in the first year are included.

### AI-Exposure Tier Join (`lib/h1b.ts`)

`getExposureTierAggregation()` left-joins each H-1B occupation's `socCode` against `data/occupation-snapshot-slim.json` exposure rows. Join key: `socCode` (SOC 2018). Unmatched occupations land in the `"Unclassified"` tier. The join is **descriptive only** — it shows which visa-sponsored roles fall into which AI-exposure tier; it is **not causal**.

### Units

| Field | Unit |
|---|---|
| `certifiedLcas`, `totalWorkerPositions` | integer count |
| `medianWageAnnual`, `p25WageAnnual`, `p75WageAnnual` | USD annual |
| `wageByYear` values | USD annual; null if < 50 filings in that year |
| `cagr` | decimal fraction (0.05 = +5% CAGR) |
| `occupationMatchRate`, `volumeMatchRate` | fraction 0–1 |

---

## Source Provenance / Licensing / Caveats

| Source | License | Caveat |
|---|---|---|
| DOL OFLC LCA Disclosure Data | Public Domain (US Government) | LCAs ≠ visa approvals or cap-subject H-1Bs |
| BLS SOC 2010→2018 Crosswalk | Public Domain (US Government) | Fetched via Wayback identity mirror |

**Caveats stamped in `meta.note`:**

- Counts are certified H-1B LCAs, not visa approvals.
- Counts are comparable across FY2016–FY2025: quarterly files are summed by distinct `CASE_NUMBER` for FY2020+; annual files back to FY2016–FY2019.
- Incomplete fiscal years (e.g. the current year) are listed in `coverage.incompleteFiscalYears` and should be labeled as provisional in the UI.
- Wage values in `wageByYear` are suppressed (null) for years with < 50 filings.

---

## Build / Update Lifecycle

```bash
npm run build:h1b
# → node scripts/build-h1b.mjs

# Environment override:
H1B_YEARS=2020-2025 npm run build:h1b   # build only specified range

# Cache:
# Raw XLSX workbooks are cached in .cache/h1b/ (gitignored)
# Re-runs reuse cached files; pass --force to re-download
```

**Large workbooks:** DOL disclosure files are 55–92 MB per year. The builder uses ExcelJS `WorkbookReader` for streaming parse — never loads a full workbook into memory. Total cache can reach ~500 MB for FY2016–FY2025.

**Prerequisite:** Node 20 LTS, network access to web.archive.org (Wayback Machine), npm package `exceljs`.

---

## Validation Invariants

`validateH1bTrends()` from `scripts/lib/validate.mjs` is called before `writeFileSync`:

- `meta.generatedAt` present.
- `coverage.fiscalYears` non-empty.
- `byYear` has at least as many rows as fiscal years.
- `occupations` array minimum row count (≥ 80 % of committed count).
- Each occupation has `socCode`, `totalCount > 0`, `cagr` is a finite number.
- `byState` contains at least the required set of 50 US state codes.

`assertLiveStates()` helper checks state coverage.

---

## Runtime Server / Client Boundary

| Module | Boundary | Reason |
|---|---|---|
| `lib/h1b.ts` | **Client-safe** (no `import "server-only"`) | `h1b-trends.json` is a medium-size static import |
| `data/h1b-trends.json` | Statically bundled | ~few MB; occupation list may be large |

Because `lib/h1b.ts` is client-safe, it can be consumed by client components. However, `getExposureTierAggregation()` loads and joins `occupation-snapshot-slim.json` at module level. Do not call it in tight render loops; compute once and pass results as props.

---

## Failure / Degradation Behavior

- If any DOL XLSX download fails after retries, the builder logs the error and skips that fiscal year (continues with others).
- If the SOC crosswalk download fails, the builder falls back to the last cached crosswalk file. If no cache exists, the builder exits non-zero.
- Individual `null` wage values (`wageByYear`) indicate < 50 filings in that year; the UI must suppress or annotate these points.
- Missing `wageByYear` on an occupation (not undefined, not present at all) means the occupation had < 5,000 total filings; the UI should omit wage-trajectory charts for these occupations.
- Incomplete fiscal years in `coverage.incompleteFiscalYears` should be visually marked as provisional.

---

## Accessibility Implications

- Employer and occupation tables must include `<caption>` and `<th scope>` attributes.
- Fiscal-year trend charts must have accessible axis labels. The term "LCAs" should be explained in a tooltip or footnote (not all users know it stands for "Labor Condition Applications").
- Color encoding for AI-exposure tiers must not be the sole differentiator; use labeled data points or pattern fills.

---

## Performance

- `lib/h1b.ts` statically imports `data/h1b-trends.json` and `data/occupation-snapshot-slim.json` at module load; both are parsed once.
- `getExposureTierAggregation()` builds a `Map` lookup from the snapshot and iterates occupations once — O(n). The result is not memoized; compute once per Server Component render and pass as a prop.
- `getOccupationsSorted()` returns a sorted copy on each call; memoize at the call site if called repeatedly.

---

## Security / Secrets / Privacy

- No individual-level data. All H-1B data is employer-filed aggregate records (no worker names, SSNs, or personal identifiers committed).
- No API keys required for DOL OFLC sources (all public Wayback machine URLs).
- DOL workbooks are cached in `.cache/h1b/` which is gitignored.

---

## Testing

- `npm run test:run` runs Vitest tests covering `getExposureTierAggregation()` join correctness and `getMeta()` structure.
- Smoke test (`npm run smoke`) verifies `data/h1b-trends.json` exists and is non-empty.
- Validate-before-write ensures structural regression is caught at build time.

---

## Extension Points

- **Add new fiscal years:** Append to `FULL_TARGET` in `scripts/build-h1b.mjs` and add the corresponding DOL URL entries to the year-URL map.
- **Add a new per-occupation field:** Extend `H1bOccupation` interface in `lib/h1b.ts` and populate in the builder's occupation aggregation loop.
- **Add a new exposure-join dimension:** Extend `ExposureTierSeries` and `getExposureTierAggregation()` in `lib/h1b.ts`.

---

## Key File References

| File | Role |
|---|---|
| `lib/h1b.ts` | Typed loader, AI-exposure join, selectors |
| `data/h1b-trends.json` | Committed artifact |
| `scripts/build-h1b.mjs` | Fetch (Wayback), stream-parse, aggregate, write |
| `scripts/lib/soc-crosswalk.mjs` | SOC 2010→2018 crosswalk |
| `scripts/lib/validate.mjs` | `validateH1bTrends()` |
| `scripts/lib/meta.mjs` | `buildMeta()` — provenance stamp |
| `data/occupation-snapshot-slim.json` | Joined at runtime for exposure-tier aggregation |

---

*Cross-links: [`docs/labor-market.md`](./labor-market.md) · [`docs/occupation-data-model.md`](./occupation-data-model.md) · [`docs/data-pipeline.md`](./data-pipeline.md)*
