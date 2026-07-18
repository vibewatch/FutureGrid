# AI Frontier

**Status:** Production
**Owner:** Tank (Backend / Data Dev)
**Last audited:** 2026-07-17

---

## Purpose

Documents the AI Frontier dataset: the historical record of notable AI models with compute, cost, power, and frontier-flag metadata. Powers the compute-scaling trend chart, organization leaderboard, country-origin analysis, and open-weights/accessibility breakdowns.

### Non-Goals

- Does not cover occupation-level AI exposure — see [`docs/occupation-data-model.md`](./occupation-data-model.md).
- Does not cover global AI adoption/readiness — see [`docs/global.md`](./global.md).
- Does not cover AI company stocks — see the `ai-company-stocks` module (undocumented here).
- Does not rank or measure AI capability, model quality, product adoption, commercial reach, open-source usage, or societal and economic impact of any organization or country.

---

## Boundaries

| Artifact | File | Module |
|---|---|---|
| Frontier dataset | `data/ai-frontier.json` | `lib/ai-frontier.ts` |
| Build script | `scripts/build-ai-frontier.mjs` | — |

---

## Architecture

```
Epoch AI "Notable AI Models" CSV
https://epoch.ai/data/notable_ai_models.csv  (CC BY 4.0)
Landing: https://epoch.ai/data/ai-models
Docs:    https://epoch.ai/data/ai-models-documentation
    │
    ▼
scripts/build-ai-frontier.mjs
  • Fetch CSV (RFC-4180 parser)
  • Parse TWO tiers:
      catalogAll  — all rows with a valid YYYY-MM-DD date (org/country leaderboards)
      computeKnown — catalogAll ∩ Training compute (FLOP) > 0 (compute/cost/power trends)
  • Normalize countries (COMMA_PLACEHOLDER shield for ISO names with embedded commas)
  • Compute OLS regression: log10(FLOP) ~ decimalYear (overall + modern era ≥ 2010)
  • Compute frontierByYear (highest-compute model per calendar year)
  • Compute cost trend (median / max cost per year)
  • Compute power trend (median / max power draw per year)
  • Build org leaderboard from catalogAll (sorted by full-catalog model count)
  • Build country leaderboard from catalogAll (sorted by recentCount, 3-yr window)
  • deriveMeta() → meta block
  • validateAIFrontier() → writeFileSync
    │
    ▼
data/ai-frontier.json
    │
    ▼
lib/ai-frontier.ts (typed loader + selectors)
    │
    ▼
Server Components / Client props
```

---

## Mermaid Data-Flow Diagram

```mermaid
flowchart TD
    EPOCH[Epoch AI\nNotable AI Models CSV\nhttps://epoch.ai/data/ai-models]
    BAF["scripts/build-ai-frontier.mjs"]
    DAF["data/ai-frontier.json"]
    LAF["lib/ai-frontier.ts\n(typed loader + selectors)"]
    SC[Server Components]
    CC[Client Components\n(via serializable props)]

    EPOCH --> BAF
    BAF -->|deriveMeta + validateAIFrontier| DAF
    DAF --> LAF
    LAF --> SC
    SC -->|slim props| CC
```

---

## Key Methodological Decisions

### 1. Two data tiers (enforced since 2026-07-17)

| Tier | Contents | Used for |
|---|---|---|
| `catalogAll` | All rows with a valid `YYYY-MM-DD` publication date | Org/country tracked-output leaderboards |
| `computeKnown` (`models` array) | `catalogAll` filtered to rows with numeric Training compute (FLOP) | Compute/cost/power scaling trend views |

**Why:** Organizations that do not publish training compute (notably Anthropic for most models, and many newer Chinese labs) were previously excluded from leaderboard counts. The full catalog corrects this.

### 2. Epoch AI "Frontier model" flag

Epoch AI's `Frontier model` flag marks models in the **top 10 by estimated training compute at time of release**. It is:
- Derived from the compute-known subset only (a model without a compute estimate cannot carry the flag)
- Affected by compute disclosure practices — labs that publish estimates tend to score higher
- A historical compute-scale indicator, **not** a measure of capability, quality, or societal impact

`frontierCount` is provided for historical context and **must always be displayed with this definition**.

### 3. Org leaderboard sort key

Sorted by `modelCount` (full-catalog count) descending. This ensures labs without compute estimates are not penalized.

### 4. Country leaderboard sort key

Sorted by `recentCount` (full-catalog models published within the 3-year recent window, from `recentWindowStart` to `recentWindowEnd`) descending. This reflects **current tracked-output activity** rather than historical compute-scale frontier counts, which are concentrated in the 2010–2021 period and heavily skewed by compute disclosure.

**Why this matters:** Under the old `frontierCount`-influenced ordering, the UK appeared ahead of China despite China having substantially more recent model releases. The `recentCount` sort correctly places China #2 after the US.

### 5. Google entity preservation

Google, DeepMind, Google Brain, Google Research, and Google DeepMind are **preserved as distinct source entities** exactly as Epoch AI records them. No editorial merger is applied. Consumers should annotate these as related entities in the UI if needed.

### 6. Multi-country attribution

Models attributed to multiple countries via a comma-separated `Country (of organization)` field are **co-attributed to each participating country** (each country's count increments by 1). A US–UK collaboration model is counted once for both US and UK.

### 7. Open-weights counts

`openWeightsCount` derives from Epoch AI's `Open model weights?` column (`Yes` = confirmed open weights, which may include restricted-use and non-commercial licenses). It is a proxy for **tracked open-release activity only** — not downloads, adoption, permissive open-source status, model quality, or societal impact. `Yes` does not imply a permissive open-source license. Reported for full-catalog rows.

### 8. Country `iso3` geographic join key + geo selector

Each `CountryLeaderboardEntry` carries `iso3: string | null` — an ISO-3166-1 alpha-3 code used **purely as a geographic join key** for the "Tracked Model Origins" world-map choropleth. It carries **no** capability, impact, leadership, or ranking meaning (per PR #129 / commit `dc587bea`); it exists only to match a country to a polygon.

- **Derivation (deterministic, offline):** `iso3` is derived at build time from the normalised `country` name via a small static lookup in `scripts/lib/country-iso3.mjs` (no npm dependency, no network, no keyed source). The code is then **gated on presence in `public/world-countries.geo.json`** — if the ISO-3 code has no feature id in the map geometry, `iso3` is set to `null`.
- **Nulls:** aggregate/multinational labels (e.g. `Multinational`) and countries with no polygon on the map (city-states such as `Singapore` and `Hong Kong`) resolve to `null`.
- **Validation:** `scripts/lib/validate.mjs` loads the GeoJSON, builds a `Set` of feature ids, and **rejects any non-null `iso3` not present** in that set. The builder fails loudly if this gate fails.
- **Coverage:** `aggregates.countryGeoCoverage = { mapped, unmapped, total }` is emitted so the UI can render a coverage note. It is also printed to stdout during the build (with `%` mapped and the list of unmapped countries). Current snapshot: **32 mapped / 3 unmapped / 35 total (91.4%)**; unmapped = `Singapore`, `Hong Kong`, `Multinational`.
- **Geo selector:** `getCountryLeaderboardGeo()` returns only entries with a non-null `iso3`, projected to `CountryGeoEntry` — exposing only full-catalog country-fair metrics (`modelCount`, `recentCount`, `openWeightsCount`, `orgCount`) and **omitting** `computeKnownCount`/`frontierCount`/`maxComputeFlop` so the map cannot be read as a compute/capability ranking.

---

## Canonical Schemas / Types

### `AIFrontierDefinitions` — methodological disclosure

```typescript
export interface AIFrontierDefinitions {
  frontierDefinition: string;       // Epoch AI frontier flag definition + limitations
  orgLeaderboardMetric: string;     // Describes modelCount, computeKnownCount, recentCount, openWeightsCount
  countryLeaderboardDefaultSort: string;  // Why recentCount is the default sort
  openWeightsMetric: string;        // openWeightsCount limitations
  multiCountryAttribution: string;  // Co-attribution rule
  googleEntitiesNote: string;       // Entity preservation policy
  coverageNote: string;             // General coverage caveat
}
```

### `AIFrontierModel` — per-model record (compute-known subset)

```typescript
export interface AIFrontierModel {
  name: string;
  organization: string;
  orgCategory: string | null;     // "industry", "academia", etc.
  country: string | null;         // primary/first country (display)
  countries: string[];            // de-duplicated array of participating countries
  date: string;                   // YYYY-MM-DD
  year: number;
  decimalYear: number;            // fractional year for regression
  domains: string[];              // e.g. ["Language", "Vision"]
  task: string | null;
  parameters: number | null;      // raw parameter count
  computeFlop: number;            // Training compute (FLOP) — raw numeric
  log10Compute: number;           // log10(computeFlop), rounded 3 dp
  trainingCostUsd2023: number | null; // USD 2023
  powerDrawW: number | null;      // Watts
  frontier: boolean;              // Epoch AI "Frontier model" flag (top-10 compute at release)
  openWeights: boolean | null;
  accessibility: string | null;   // "Open weights (unrestricted)", "API access", etc.
  confidence: string | null;
  link: string | null;
}
```

### `OrgLeaderboardEntry` — multi-metric per org

```typescript
export interface OrgLeaderboardEntry {
  organization: string;
  orgCategory: string | null;
  country: string | null;
  modelCount: number;         // Full-catalog count (primary sort key)
  computeKnownCount: number;  // Was old "modelCount" — rows with compute estimates
  frontierCount: number;      // Compute-known rows flagged frontier (historical context)
  recentCount: number;        // Full-catalog models in 3-yr recent window
  openWeightsCount: number;   // Full-catalog open-weight models (tracked activity proxy)
  maxComputeFlop: number;     // Peak compute (compute-known; 0 if none)
  latestDate: string;
  medianLog10Compute: number | null; // Median log10 compute (compute-known; null if none)
}
```

### `CountryLeaderboardEntry` — multi-metric per country

```typescript
export interface CountryLeaderboardEntry {
  country: string;
  countryShort: string;
  iso3: string | null;        // Geographic join key ONLY (see §8); null if unmappable
  modelCount: number;         // Full-catalog count
  computeKnownCount: number;  // Was old "modelCount"
  frontierCount: number;      // Historical context; NOT the default sort key
  recentCount: number;        // Default sort key — current tracked-output activity
  openWeightsCount: number;   // Full-catalog open-weight models
  maxComputeFlop: number;     // Peak compute (0 if none)
  orgCount: number;
}
```

### `CountryGeoEntry` — geographic-safe projection for the world map

```typescript
export interface CountryGeoEntry {
  country: string;
  countryShort: string;
  iso3: string;             // Always non-null (getCountryLeaderboardGeo filters nulls out)
  modelCount: number;       // Full-catalog fair metric
  recentCount: number;      // Full-catalog fair metric
  openWeightsCount: number; // Full-catalog fair metric
  orgCount: number;
}
```

Deliberately omits `computeKnownCount`, `frontierCount`, and `maxComputeFlop` so the choropleth cannot be misread as a compute/capability ranking.

### `CountryGeoCoverage` — map join coverage

```typescript
export interface CountryGeoCoverage {
  mapped: number;   // entries with a non-null, plottable iso3
  unmapped: number; // aggregate/multinational + countries with no map polygon
  total: number;    // === countryLeaderboard.length
}
```

### `ComputeRegression` — OLS fit

```typescript
export interface ComputeRegression {
  slopeLog10PerYear: number;      // log10(FLOP)/year — rate of scaling
  intercept: number;
  r2: number;                     // coefficient of determination
  doublingTimeMonths: number | null; // 12 * log10(2) / slope
  startYear: number;
  endYear: number;
  n: number;                      // number of models in regression
}
```

### `AIFrontierAggregates`

```typescript
export interface AIFrontierAggregates {
  computeTrend: {
    overall: ComputeRegression | null;    // all compute-known models
    modernEra: ComputeRegression | null;  // compute-known models from 2010 onward
    frontierByYear: FrontierYearPoint[];  // highest-compute model per year
  };
  costTrend: CostTrendPoint[];   // median/max training cost per year
  powerTrend: PowerTrendPoint[]; // median/max power draw per year
  orgLeaderboard: OrgLeaderboardEntry[];      // sorted by modelCount desc (full catalog)
  countryLeaderboard: CountryLeaderboardEntry[]; // sorted by recentCount desc
  countryGeoCoverage: CountryGeoCoverage;       // world-map join coverage (mapped/unmapped/total)
  accessibilityMix: AccessibilityMix;           // compute-known subset (backward compat)
  fullCatalogAccessibilityMix: AccessibilityMix; // full dated catalog
  domainMix: DomainMixEntry[];   // domain → count, sorted desc (compute-known)
}
```

### `AIFrontierData` — top-level

```typescript
export interface AIFrontierData {
  generatedAt: string;
  source: AIFrontierSource;      // Epoch AI metadata (correct URL: epoch.ai/data/ai-models)
  methodology: AIFrontierMethodology; // includes recentWindow
  definitions: AIFrontierDefinitions; // NEW — methodological disclosure text
  counts: AIFrontierCounts;      // includes withDate, withOpenWeights, recentWindowCount
  models: AIFrontierModel[];     // compute-known rows, sorted ascending by date
  aggregates: AIFrontierAggregates;
  caveats: string[];
}
```

---

## Selectors (lib/ai-frontier.ts)

| Selector | Returns | Notes |
|---|---|---|
| `getAIFrontierData()` | `AIFrontierData` | Full data object |
| `getComputeModels()` | `AIFrontierModel[]` | Compute-known rows (backward compat) |
| `getFrontierModels()` | `AIFrontierModel[]` | frontier=True rows (compute-known) |
| `getModernEraModels()` | `AIFrontierModel[]` | year ≥ 2010, compute-known |
| `getComputeTimeline()` | `FrontierYearPoint[]` | Highest compute per year |
| `getOrgLeaderboard(limit)` | `OrgLeaderboardEntry[]` | Top N by full-catalog modelCount |
| `getRecentlyActiveOrgs(limit)` | `OrgLeaderboardEntry[]` | NEW — top N by recentCount |
| `getCountryLeaderboard()` | `CountryLeaderboardEntry[]` | Sorted by recentCount desc |
| `getCountryLeaderboardGeo()` | `CountryGeoEntry[]` | NEW — only entries with non-null `iso3`, geographic-safe fields only, recentCount desc |
| `getCountryGeoCoverage()` | `CountryGeoCoverage` | NEW — mapped/unmapped/total for a map coverage note |
| `getModernEraRegression()` | `ComputeRegression\|null` | OLS fit ≥ 2010 |
| `getOverallRegression()` | `ComputeRegression\|null` | OLS fit all years |
| `getCostTrend()` | `CostTrendPoint[]` | Annual cost trend |
| `getPowerTrend()` | `PowerTrendPoint[]` | Annual power trend |
| `getDomainMix()` | `DomainMixEntry[]` | Domain distribution (compute-known) |
| `getAccessibilityMix()` | `AccessibilityMix` | Open/closed/unknown (compute-known) |
| `getFullCatalogAccessibilityMix()` | `AccessibilityMix` | NEW — full dated catalog |
| `getDefinitions()` | `AIFrontierDefinitions` | NEW — methodological disclosure |
| `getRecentWindow()` | `AIFrontierRecentWindow\|null` | NEW — recent window dates |

---

## Schema Contracts for Neo (UI) and Mouse (i18n)

### Org leaderboard changes (schema-additive)

The `modelCount` field now reflects the **full-catalog count** (all dated Epoch AI rows). Previously it was the compute-known count. The old compute-known count is available as `computeKnownCount`.

UI should label the displayed metric clearly:
- "N tracked models" = `modelCount` (full catalog)
- "N with compute" = `computeKnownCount`
- "N recent" = `recentCount` (3-year window, labeled with dates from `getRecentWindow()`)
- "N open-weight" = `openWeightsCount`

### Country leaderboard changes

The default sort is now `recentCount` (full-catalog models in 3-year window). This places China #2 (ahead of UK) and South Korea #3. The sort order in the JSON is already correct — UI should consume it in order.

`frontierCount` is available for historical context but must be displayed with the frontier definition disclosure (`getDefinitions().frontierDefinition`).

Each entry now also carries `iso3: string | null` — a **geographic join key only** for the world map (see §8). For the choropleth, consume `getCountryLeaderboardGeo()` (non-null `iso3`, geographic-safe fields only) and show a coverage note from `getCountryGeoCoverage()`. Do **not** render `iso3` as any kind of ranking, and do not surface compute-known/frontier metrics on the map surface.

### accessibilityMix backward compat

`aggregates.accessibilityMix` still covers the compute-known subset (sum = `getComputeModels().length`). New `aggregates.fullCatalogAccessibilityMix` covers all dated rows.

---

## Joins / Crosswalks / Algorithms

### Row inclusion filters

| Tier | Filter | Output |
|---|---|---|
| `catalogAll` | Valid `YYYY-MM-DD` publication date | Used for org/country leaderboards |
| `computeKnown` | `catalogAll` AND `Training compute (FLOP)` > 0 | `models` array; compute/cost/power trends |

### Country normalization

Epoch AI stores country as a comma-delimited string including verbose ISO country names (e.g. `"Korea, Republic of"`). The builder shields known ISO names that contain commas using a Unicode `\uFFFE` placeholder before splitting, then normalizes through `COUNTRY_SHORT_MAP`. Result is a de-duplicated, order-preserving `countries[]` array.

### Recent window

`recentWindowStart = latestCatalogDate.year - RECENT_WINDOW_YEARS` (same month/day). `RECENT_WINDOW_YEARS = 3`. Window is deterministic from the latest date in the full catalog — not wall-clock time.

### OLS regression — compute scaling

- Fit: `log10(computeFlop) = intercept + slope × decimalYear`
- Run twice: over all `computeKnown` models and over `modernEra` models (`year >= 2010`).
- `doublingTimeMonths = 12 × log10(2) / slope` (null if slope ≤ 0).
- `decimalYear` = `year + (dayOfYear / daysInYear)` from the ISO date.

### Frontier-by-year

One entry per calendar year: the model with the highest `computeFlop` in that year (from compute-known subset).

### Units

| Field | Unit |
|---|---|
| `computeFlop` | FLOP (floating-point operations; raw scientific number) |
| `log10Compute` | log₁₀(FLOP), 3 decimal places |
| `trainingCostUsd2023` | USD (2023 dollars) |
| `powerDrawW` | Watts |
| `slopeLog10PerYear` | log₁₀(FLOP) per year |
| `doublingTimeMonths` | calendar months |
| `parameters` | raw count (not millions/billions) |

---

## Source Provenance / Licensing / Caveats

| Source | License | Canonical URL |
|---|---|---|
| Epoch AI "Notable AI Models" | CC BY 4.0 | https://epoch.ai/data/ai-models |
| Download URL | — | https://epoch.ai/data/notable_ai_models.csv |
| Documentation | — | https://epoch.ai/data/ai-models-documentation |

**Key caveats:**

- The `models` array contains only rows with numeric training compute AND a valid publication date. Rows lacking either field are excluded from compute trends but counted in the full catalog.
- Epoch AI's `Frontier model` flag means top-10 training compute at time of release — not capability or impact. It is limited to compute-known models.
- `modelCount` in org/country leaderboards reflects the full catalog (any dates); `computeKnownCount` reflects the compute-known subset.
- Country leaderboard sorted by `recentCount` (3-year window, full catalog).
- Multi-country models are co-attributed to each participating country.
- Google, DeepMind, Google Brain, Google Research, and Google DeepMind are distinct entities in the source data.

---

## Build / Update Lifecycle

```bash
npm run build:ai-frontier
# → node scripts/build-ai-frontier.mjs
# → data/ai-frontier.json

# Part of the full data rebuild:
npm run build:data   # includes build:ai-frontier indirectly
```

**Failure mode:** If the Epoch AI CSV endpoint is unreachable and `data/ai-frontier.json` already exists, the builder logs a warning and exits 0 **without overwriting the committed file**. If the file does not exist and the fetch fails, the builder exits non-zero.

**Prerequisite:** Node 20 LTS, network access to `epoch.ai`.

---

## Validation Invariants

`deriveMeta()` stamps `generatedAt`/`asOf`/`source`/`version`. `validateAIFrontier()` checks:

- Required top-level fields including new `definitions`
- `counts.totalRows >= 100`, `counts.withDate >= 100`, `counts.recentWindowStart` valid
- `definitions.frontierDefinition`, `orgLeaderboardMetric`, `countryLeaderboardDefaultSort` non-empty
- `orgLeaderboard` entries have `computeKnownCount`, `recentCount`, `openWeightsCount`
- `frontierCount <= computeKnownCount` for each leaderboard entry (frontier requires compute)
- `countryLeaderboard` sorted by `recentCount` descending
- `aggregates.fullCatalogAccessibilityMix` present

---

## Runtime Server / Client Boundary

| Module | Boundary | Reason |
|---|---|---|
| `lib/ai-frontier.ts` | **Client-safe** (no `import "server-only"`) | Static import; `ai-frontier.json` is bundled at build time |
| `data/ai-frontier.json` | Bundled at build (static import) | Medium-size; models array ~528 entries |

Because `lib/ai-frontier.ts` is client-safe, it can be imported by client components. However, passing the full `models[]` array to a client component as a prop is expensive; prefer pre-aggregated data (`getComputeTimeline()`, `getOrgLeaderboard()`) rather than the raw model list.

---

## Testing

- `npm run test -- tests/ai-frontier.test.ts` covers over 100 individual test cases across 17 describe blocks: data integrity, schema invariants (full-catalog vs compute-known), leaderboard cleanliness, doubling-time sanity, aggregate consistency, selectors (including all new API selectors), copy guardrails for EN and ZH i18n strings, regression-derived stats, FrontierMixCards, FrontierLeadersChart coverage, and whyPoint3 interpolation.
- Regression test: `frontierCount <= modelCount` (now `frontierCount <= computeKnownCount <= modelCount`).
- Regression test: `countryLeaderboard[0].recentCount >= countryLeaderboard[1].recentCount`.

---

## Extension Points

- **Add a new aggregate:** Add a new aggregate type in `lib/ai-frontier.ts` and populate it in the builder's `aggregates` object.
- **Change recent window:** Update `RECENT_WINDOW_YEARS` in `scripts/build-ai-frontier.mjs`.
- **Add new country normalization entries:** Extend `COUNTRY_SHORT_MAP` and `COMMA_ISO_NAMES` in the builder.
- **Add new data columns from Epoch AI:** Extend `AIFrontierModel` and the per-row `parsed.push(...)` block; also update `catalogEntry` in the `catalogAll` section if needed.

---

## Key File References

| File | Role |
|---|---|
| `lib/ai-frontier.ts` | Typed loader + selectors |
| `data/ai-frontier.json` | Committed artifact |
| `scripts/build-ai-frontier.mjs` | Fetch + transform + write |
| `scripts/lib/meta.mjs` | `deriveMeta()` — provenance stamp |
| `scripts/lib/validate.mjs` | `validateAIFrontier()` — data gate |

---

*Cross-links: [`docs/global.md`](./global.md) · [`docs/data-pipeline.md`](./data-pipeline.md) · [`docs/occupation-data-model.md`](./occupation-data-model.md)*
