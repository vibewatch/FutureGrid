# AI Frontier

**Status:** Production
**Owner:** Tank (Backend / Data Dev)
**Last audited:** 2026-07-11

---

## Purpose

Documents the AI Frontier dataset: the historical record of notable AI models with compute, cost, power, and frontier-flag metadata. Powers the compute-scaling trend chart, organization leaderboard, country-origin analysis, and open-weights/accessibility breakdowns.

### Non-Goals

- Does not cover occupation-level AI exposure — see [`docs/occupation-data-model.md`](./occupation-data-model.md).
- Does not cover global AI adoption/readiness — see [`docs/global.md`](./global.md).
- Does not cover AI company stocks — see the `ai-company-stocks` module (undocumented here).

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
    │
    ▼
scripts/build-ai-frontier.mjs
  • Fetch CSV (RFC-4180 parser)
  • Parse + filter: keep only rows with numeric Training compute (FLOP) AND valid date
  • Normalize countries (COMMA_PLACEHOLDER shield for ISO names with embedded commas)
  • Compute OLS regression: log10(FLOP) ~ decimalYear  (overall + modern era ≥ 2010)
  • Compute frontierByYear (highest-compute model per calendar year)
  • Compute cost trend (median / max cost per year)
  • Compute power trend (median / max power draw per year)
  • Build org leaderboard (by model count + frontierCount)
  • Build country leaderboard (by model count + frontierCount)
  • deriveMeta() → meta block
  • Validate → writeFileSync
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
    EPOCH[Epoch AI\nNotable AI Models CSV\nhttps://epoch.ai/data/notable_ai_models.csv]
    BAF["scripts/build-ai-frontier.mjs"]
    DAF["data/ai-frontier.json"]
    LAF["lib/ai-frontier.ts\n(typed loader + selectors)"]
    SC[Server Components]
    CC[Client Components\n(via serializable props)]

    EPOCH --> BAF
    BAF -->|deriveMeta + validate| DAF
    DAF --> LAF
    LAF --> SC
    SC -->|slim props| CC
```

---

## Canonical Schemas / Types

### `AIFrontierModel` — per-model record

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
  frontier: boolean;              // "Frontier model" flag from Epoch AI
  openWeights: boolean | null;
  accessibility: string | null;   // "Open weights", "Closed", etc.
  confidence: string | null;
  link: string | null;
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
    overall: ComputeRegression | null;    // all models with compute + date
    modernEra: ComputeRegression | null;  // models from 2010 onward
    frontierByYear: FrontierYearPoint[];  // highest-compute model per year
  };
  costTrend: CostTrendPoint[];   // median/max training cost per year
  powerTrend: PowerTrendPoint[]; // median/max power draw per year
  orgLeaderboard: OrgLeaderboardEntry[];
  countryLeaderboard: CountryLeaderboardEntry[];
  accessibilityMix: { openWeights: number; closed: number; unknown: number };
  domainMix: DomainMixEntry[];   // domain → count, sorted desc
}
```

### `AIFrontierData` — top-level

```typescript
export interface AIFrontierData {
  generatedAt: string;
  source: AIFrontierSource;      // Epoch AI metadata
  methodology: AIFrontierMethodology;
  counts: AIFrontierCounts;
  models: AIFrontierModel[];     // sorted ascending by date
  aggregates: AIFrontierAggregates;
  caveats: string[];
}
```

---

## Joins / Crosswalks / Algorithms

### Row inclusion filter

Only rows that have **both** a numeric `Training compute (FLOP) > 0` **and** a valid ISO date string (`YYYY-MM-DD`) enter the `models` array. Rows with missing compute or missing date are counted in `counts.totalRows` but excluded from `models`.

### Country normalization

Epoch AI stores country as a comma-delimited string including verbose ISO country names (e.g. `"Korea, Republic of"`). The builder shields known ISO names that contain commas using a Unicode `\uFFFE` placeholder before splitting, then normalizes through `COUNTRY_SHORT_MAP`. Result is a de-duplicated, order-preserving `countries[]` array. `country` (singular) is the first element or null.

### OLS regression — compute scaling

- Fit: `log10(computeFlop) = intercept + slope × decimalYear`
- `decimalYear` = `year + (dayOfYear / daysInYear)` from the ISO date.
- Run twice: over all `models` and over `modernEra` models (`year >= 2010`).
- `doublingTimeMonths = 12 × log10(2) / slope` (null if slope ≤ 0).

### Frontier-by-year

One entry per calendar year: the model with the highest `computeFlop` in that year. Powers the compute timeline chart.

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

| Source | License | Caveat |
|---|---|---|
| Epoch AI "Notable AI Models" | CC BY 4.0 | Attribution required: "Epoch AI" + URL. Derived aggregate file; changes indicated. |

**Caveats embedded in `ai-frontier.json`:**

- The models array contains only rows with numeric training compute AND a valid publication date. Rows lacking either field are excluded.
- "Frontier model" flag is from Epoch AI's own curation; it does not represent a universal consensus.
- Training cost values are inflation-adjusted to 2023 USD by Epoch AI; methodology available at their site.
- Country attribution reflects the organization's primary country of operation, not model training geography.
- Power-draw values are sparse and may reflect peak training power, not average or inference power.
- Open-weights classification is from Epoch AI; it may lag model release announcements.

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

`deriveMeta()` is called to stamp `generatedAt`/`asOf`/`source`/`version` before writing. The builder performs inline validation:

- Parses CSV; fails if zero rows are parsed.
- Checks that `models.length > 0` after compute+date filtering.
- OLS regression returns `null` (not throws) if fewer than 2 points; `null` values propagate to `aggregates.computeTrend.overall/modernEra`.
- `caveats[]` array is always present even if empty.

There is no call to a separate `validate.mjs` helper for this builder (it uses inline checks). A future improvement would add a `validateAIFrontier()` gate.

---

## Runtime Server / Client Boundary

| Module | Boundary | Reason |
|---|---|---|
| `lib/ai-frontier.ts` | **Client-safe** (no `import "server-only"`) | Static import; `ai-frontier.json` is bundled at build time |
| `data/ai-frontier.json` | Bundled at build (static import) | Medium-size; models array may be 500–1000 entries |

Because `lib/ai-frontier.ts` is client-safe, it can be imported by client components. However, passing the full `models[]` array to a client component as a prop is expensive; prefer passing pre-aggregated chart data (e.g. `getComputeTimeline()`, `getOrgLeaderboard()`) rather than the raw model list.

---

## Failure / Degradation Behavior

- Fetch failure with existing committed file: builder skips overwrite; previously committed data is used at next Next.js build.
- `getModernEraRegression()` and `getOverallRegression()` return `null` if the Epoch AI dataset has insufficient data; UI must render a "data unavailable" state.
- Missing `doublingTimeMonths` (null) occurs when slope ≤ 0; should be displayed as "non-doubling" or hidden.
- Models without `trainingCostUsd2023` or `powerDrawW` (null) are excluded from the cost/power trend but still appear in the models array and leaderboards.

---

## Accessibility Implications

- The compute timeline chart (log₁₀ FLOP vs year) must include accessible axis labels: "Year" and "Training Compute (log₁₀ FLOP)".
- Tooltips for individual model points must include: model name, organization, date, and compute value (formatted via `formatFlop()`).
- The organization leaderboard table must have proper `<th scope>` attributes.
- Color used to distinguish open-weights vs. closed models must not be the sole differentiator.

---

## Performance

- `lib/ai-frontier.ts` statically imports `data/ai-frontier.json`; it is parsed once at module load (SSG/server startup).
- `getComputeTimeline()`, `getOrgLeaderboard()`, `getDomainMix()` etc. are O(1) lookups into already-computed aggregates.
- `getFrontierModels()` and `getModernEraModels()` filter the full `models` array on each call — callers that need them repeatedly should memoize.

---

## Security / Secrets / Privacy

- No personal data. All data is public model/organization records.
- No API keys required. Epoch AI CSV is publicly downloadable.
- `ai-frontier.json` is committed to the repository; it contains no sensitive data.

---

## Testing

- `npm run test:run` covers helper functions (`formatFlop`, `formatLog10Flop`).
- Smoke test (`npm run smoke`) verifies `data/ai-frontier.json` exists and is non-empty.
- OLS regression is tested in isolation against known (year, log10compute) pairs.

---

## Extension Points

- **Add a new aggregate:** Add a new aggregate type in `lib/ai-frontier.ts` and populate it in the builder's `aggregates` object.
- **Change modern era start:** Update `MODERN_ERA_START = 2010` in `scripts/build-ai-frontier.mjs` and `methodology.modernEraStart` in the output.
- **Add new country normalization entries:** Extend `COUNTRY_SHORT_MAP` and `COMMA_ISO_NAMES` in the builder.
- **Add new data columns from Epoch AI:** Extend the `AIFrontierModel` interface and the per-row `parsed.push(...)` block.

---

## Key File References

| File | Role |
|---|---|
| `lib/ai-frontier.ts` | Typed loader + selectors |
| `data/ai-frontier.json` | Committed artifact |
| `scripts/build-ai-frontier.mjs` | Fetch + transform + write |
| `scripts/lib/meta.mjs` | `deriveMeta()` — provenance stamp |

---

*Cross-links: [`docs/global.md`](./global.md) · [`docs/data-pipeline.md`](./data-pipeline.md) · [`docs/occupation-data-model.md`](./occupation-data-model.md)*
