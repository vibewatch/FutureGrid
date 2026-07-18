# Sectors

**Status:** Live — origin/main
**Last audited:** 2026-07-18
**Owner:** Switch (Designer)
**Routes:** `/sectors` (sector list), `/sectors/[id]` (sector detail)

---

## Purpose

The Sectors section surfaces AI-exposure patterns at the industry level. The list page (`/sectors`) aggregates all occupations into their parent sectors and lets users sort by average AI exposure, Bright Outlook share, average median salary, occupation count, or total employment. Each sector card links to a detail page (`/sectors/[id]`) that breaks the sector back down into individual occupations with a risk table and two charts.

The presentation is purely **descriptive** — it reports measured AI-exposure scores from the Anthropic Economic Index and employment/salary data from BLS. It does not model future labour-market outcomes, make predictions about job loss, or give career recommendations.

### Non-goals

- No personalisation, saved state, or user accounts.
- No server-side data fetching at request time; everything is pre-computed at build time.
- No sector-to-sector comparison interface (handled by `/explore`).
- No pagination; all sectors are rendered at once (typically ~22).

---

## Boundaries

```
app/sectors/layout.tsx                    ← RSC shell — static SEO metadata only
app/sectors/page.tsx                      ← Server Component — computes
                                             getSectorAggregatesExtended() +
                                             getWageTierPolarization() at build time; passes
                                             both as props to SectorsPageClient
components/sectors/SectorsPageClient.tsx  ← "use client" — interactive list island: sort state,
                                             sector grid, mounts charts + WageTierPolarizationLens

app/sectors/[id]/layout.tsx               ← RSC shell — dynamicParams=false, generateStaticParams,
                                             generateMetadata (per-sector canonical/OG)
app/sectors/[id]/page.tsx                 ← "use client" — entire detail page
```

**Shared chart components (from `components/charts/`):**

| Component | Used by | Library | What it shows |
|---|---|---|---|
| `CareerTrendChart` | `/sectors` | Chart.js 4 | Vertical bar — avg AI exposure per sector, all sectors |
| `JobImpactChart` | `/sectors`, `/sectors/[id]` | D3 v7 | Top 20 occupations by AI exposure (optionally filtered to one sector) |
| `PredictiveChart` | `/sectors/[id]` | D3 v7 | Projected openings / 2034 employment, filtered to sector |

**Workforce Insight component (from `components/sectors/`):**

| Component | Used by | What it shows |
|---|---|---|
| `WageTierPolarizationLens` | `/sectors` list page (server-rendered prop) | Employment-weighted wage terciles × AI-exposure band cross-tabulation; descriptive only |

Shared utilities: `lib/utils.ts` (`colorForRisk`, `formatCurrency`), `lib/i18n/useT` (`sectors` namespace).

---

## Architecture

### Server / client split

| File | Runs where | Responsibility |
|---|---|---|
| `app/sectors/layout.tsx` | Build-time RSC | Static `<Metadata>` (title, description, OG, Twitter) |
| `app/sectors/page.tsx` | Build-time RSC | Calls `getSectorAggregatesExtended()` and `getWageTierPolarization()` at build time; passes both as props (`allSectors`, `wageTierData`) to `SectorsPageClient` — no client-side data access of its own |
| `components/sectors/SectorsPageClient.tsx` | Browser only | Receives `allSectors` + `wageTierData` props; owns the `SortKey` state; renders the sector grid, `CareerTrendChart`, `JobImpactChart`, and `WageTierPolarizationLens` |
| `app/sectors/[id]/layout.tsx` | Build-time RSC | `generateStaticParams`, `generateMetadata`, `dynamicParams = false` |
| `app/sectors/[id]/page.tsx` | Browser only | `generateAllCareerInsights()` filtered by sector, stat cards, charts, table |
| `components/sectors/WageTierPolarizationLens.tsx` | Browser only | Receives `WageTierPolarization` prop; renders tercile bar chart, band breakdown, toggle between employment-weighted and occupation-count views; no server imports |

Only the `[id]/page.tsx` detail page carries `"use client"` at the top; its data access and rendering happen in the browser after hydration. The list page (`app/sectors/page.tsx`) is a **Server Component** that resolves its data at build time and hands props to the `SectorsPageClient` island. The slim snapshot JSON is still bundled into the client chunk because `CareerTrendChart` and `JobImpactChart` import `lib/data.ts` directly.

### Data flow — list page

```mermaid
flowchart LR
    A[data/occupation-snapshot-slim.json\nstatic import] -->|module load| B[lib/data.ts\ngenerateAllCareerInsights\ncached in module scope]
    B --> C[getSectorAggregatesExtended\ngroups by sectorName]
    C -->|build-time RSC| D[app/sectors/page.tsx → SectorsPageClient\nallSectors prop]
    D -->|useMemo + sortBy state (client)| E[sorted SectorAggregate array]
    E --> F[Grid of sector cards\n~22 items]
    B --> G[CareerTrendChart\ncalls getSectorAggregates internally]
    B --> H[JobImpactChart\nall-sectors mode]
```

### Data flow — Workforce Insight (WageTierPolarization)

`lib/wage-tier-polarization.ts` is a **server-only** module guarded with `import "server-only"`. It is called once in the Server Component (`app/sectors/page.tsx`) and the resolved value is passed as a prop to the client island.

```mermaid
flowchart LR
    A[data/occupation-snapshot-slim.json] -->|static import - server only| W[lib/wage-tier-polarization.ts\ngetWageTierPolarization\nemployment-weighted terciles]
    W -->|WageTierPolarization prop| L[components/sectors/\nWageTierPolarizationLens\n"use client"]
    L --> V1[Tercile bar chart\nweighted mean exposure per tier]
    L --> V2[Band breakdown table\nexposure-band composition per tier]
    L --> T[Toggle: headcount ↔ occupations\nno re-fetch needed]
```

**Key invariants enforced by `getWageTierPolarization()`:**
- Universe: 755 occupations with finite `medianSalary > 0`, `aiExposure`, and `employment > 0` (1 excluded for missing employment).
- Tier assignment is deterministic: sort by `(medianSalary ASC, socCode ASC)`, assign by `clamp(floor(3 × midpoint / totalEmp), 0, 2)`.
- Each tier always has exactly four exposure-band cells (`minimal`, `low`, `moderate`, `elevated`), zero-filled when empty.
- The result is a fresh object on every call — no shared mutable state.

**Framing:** `WageTierPolarizationLens` is purely descriptive. It shows the cross-sectional distribution of modelled AI-exposure scores across three employment-weighted wage terciles. It does not forecast job loss, predict wage changes, or make recommendations. The component surfaces the `methodology.caveats` array and a `GuardrailBadge` to communicate these constraints to users.

### Data flow — detail page

```mermaid
flowchart LR
    A[data/occupation-snapshot-slim.json] -->|module load| B[lib/data.ts\ngenerateAllCareerInsights\ncached]
    B -->|useMemo + filter sectorName === id| C[sectorInsights array]
    C --> D[Stat card calculations\navgRisk · brightShare · avgSalary · totalEmp]
    C --> E[JobImpactChart\nselectedSector prop]
    C --> F[PredictiveChart\nselectedSector prop]
    C --> G[Occupations table]
    A2[getSectorAggregatesExtended\n[id]/layout.tsx only] -->|build-time RSC| H[generateMetadata\nOG · canonical]
```

### Aggregation logic (`getSectorAggregatesExtended`)

Implemented entirely in `lib/data.ts`. For every `CareerInsight` record the function accumulates:

| Aggregate | How |
|---|---|
| `avgRisk` | Employment-weighted mean: `Σ(totalEmployment × automationProbability) / ΣtotalEmployment`; falls back to the count-weighted mean (`Σ(automationProbability) / count`) only when every occupation in the sector has null/zero employment |
| `avgGrowth` | `sum(growthRate) / growthCnt` (skips null growth) |
| `avgSalary` | `sum(medianSalary) / salaryCnt` (skips `medianSalary === 0`) |
| `totalEmployment` | `sum(totalEmployment)` (null when *all* occupations lack employment data) |
| `brightShare` | `brightCnt / count` (occupation `outlook === "Bright"`) |
| `occupationCount` | raw count |

The detail page recomputes the same values inline from `sectorInsights` (no second aggregation function call) using the **same employment-weighted formula** (with the same count-weighted fallback), so its `avgRisk` matches the list page's aggregate for the sector. Minor rounding can still differ in the derived stat cards where zero-valued employment/salary rows are excluded.

### Risk-label thresholds

| Label | `automationProbability` range |
|---|---|
| Low | < 0.30 |
| Medium | 0.30 – 0.59 |
| High | 0.60 – 0.84 |
| Very High | ≥ 0.85 |

These thresholds are applied client-side in both `sectors/page.tsx` and `sectors/[id]/page.tsx` via local `riskLabel()` helpers (not imported from `lib/data.ts`).

---

## Contracts / Types / Config

### `SectorAggregate` (lib/data.ts)

```ts
export interface SectorAggregate {
  sector:           string;       // O*NET sector name (used as URL segment)
  avgRisk:          number;       // 0–1 weighted mean automationProbability
  avgGrowth:        number | null;// annualised %, null if no occupation has growthRate
  avgSalary:        number | null;// USD, null if all medianSalary === 0
  totalEmployment:  number | null;// persons, null if all employment data missing
  brightShare:      number;       // 0–1 fraction with outlook === "Bright"
  occupationCount:  number;
}
```

### Key `WageTierPolarization` types (lib/wage-tier-polarization.ts)

```ts
// Server-only. Pass the resolved value as a prop across the server/client boundary.
export type WageTierId = "low" | "middle" | "high";
export type ExposureBandId = "minimal" | "low" | "moderate" | "elevated";

export interface WageTierBandCell {
  band: ExposureBandId;
  employment: number;
  employmentShare: number;   // 0–1 share of the enclosing tier
  occupationCount: number;
  occupationShare: number;   // 0–1 share of the enclosing tier
}

export interface WageTier {
  id: WageTierId;
  wageFloor: number;            // USD — minimum medianSalary in this tier
  wageCeiling: number;          // USD — maximum medianSalary in this tier
  employment: number;           // total headcount
  employmentShare: number;      // 0–1 share of total tiered employment
  occupationCount: number;
  weightedMeanExposure: number; // Σ(emp·exp) / Σemp
  meanExposure: number;         // Σ(exp) / occupationCount
  bands: WageTierBandCell[];    // always 4 cells, zero-filled
}

export interface WageTierPolarization {
  tiers: WageTier[];                      // [low, middle, high]
  summary: WageTierPolarizationSummary;
  methodology: WageTierPolarizationMethodology;
}
```

### Sort keys (SectorsPageClient.tsx only)

```ts
type SortKey = "risk" | "brightOutlook" | "size" | "salary" | "employment";
```

Default sort is `"risk"` (descending). No sort state is persisted; it resets on navigation.

### Route config ([id]/layout.tsx)

```ts
export const dynamicParams = false;
// Generates one static page per sector at build time.
// Requests for unknown sector slugs return 404.
export function generateStaticParams() {
  return getSectorAggregatesExtended().map((s) => ({ id: s.sector }));
}
```

Sector names contain spaces and punctuation (e.g. `"Healthcare & Social Assistance"`).
The list page encodes them with `encodeURIComponent`; the detail page decodes with `decodeURIComponent`.

### i18n namespace

All user-visible strings are looked up via `useT("sectors")`. See `lib/i18n/messages/en/sectors.ts` and `lib/i18n/messages/zh/sectors.ts` for the full key catalogue.

---

## Runtime / Build Lifecycle

| Phase | What happens |
|---|---|
| `npm run build:data` | `scripts/build-snapshot.mjs` writes `data/occupation-snapshot-slim.json` from upstream sources |
| `next build` | `[id]/layout.tsx` calls `getSectorAggregatesExtended()` to produce the static-params list; one HTML shell per sector is emitted to `out/sectors/<encoded-sector>/` |
| Browser hydration | `SectorsPageClient` hydrates with the server-supplied `allSectors` + `wageTierData` props (it does **not** re-run `getSectorAggregatesExtended()` in the browser); `CareerTrendChart` / `JobImpactChart` call `lib/data.ts` helpers client-side; module-level caches warm on first call |
| User interaction | Sort-button clicks update React state; `useMemo` re-sorts the in-memory array; no network requests |

Because the list page is now a Server Component, its aggregate computation runs only at build time under Node.js. The `[id]` route's `generateStaticParams` / `generateMetadata` likewise call `lib/data.ts` under Node.js. The detail page (`[id]/page.tsx`) re-runs `generateAllCareerInsights()` in the browser against the bundled JSON.

---

## Source Provenance / Caveats

| Field | Source | Vintage | Caveats |
|---|---|---|---|
| `automationProbability` / `aiExposure` | Anthropic Economic Index | 2025 | Task-level exposure, not job-displacement forecast. See [/sources](/sources) and [transparency.md](./transparency.md). |
| `medianSalary` | BLS Occupational Employment and Wage Statistics (OEWS) | 2024 | Annual median wage in USD. Zero = BLS did not report wage for that occupation. |
| `totalEmployment` | BLS OEWS | 2024 | Employment in persons. Null = occupation not covered by OEWS. |
| `brightOutlook` / `outlook` | O*NET | 2024 | Binary indicator from O*NET. "Bright" ≡ O*NET flags rapid growth, large openings, or new/emerging role. |
| `growthRate` | BLS OEWS history or BLS projections | 2023–2024 | Annualised %. May be derived from 2-year OEWS employment history; see `growthWindow` on each row. |

**Descriptive vs. predictive:** All figures are lagging indicators derived from datasets published before 2026. The sector pages display these as measured attributes; they are not economic forecasts.

---

## Security / Privacy

- No user data is collected or stored.
- No API calls at runtime; all data is static JSON bundled at build time.
- Sector names in the URL are `decodeURIComponent`-decoded before being matched against the snapshot; malformed slugs simply return the "Not Found" state (no error thrown).
- OG images are generated statically; no server-side image generation at request time.

---

## Accessibility

- All sort buttons carry `aria-pressed={sortBy === key}` so screen-readers announce the current sort.
- Sector cards are `<Link>` elements with `focus:ring-2 focus:ring-violet-500`; full keyboard navigation is supported (Tab + Enter).
- Risk colour alone is not the only affordance: the `riskLabel` string ("Low", "Medium", "High", "Very High") is rendered alongside the colour.
- Charts (`CareerTrendChart`, `JobImpactChart`) are wrapped in `AccessibleChart` which provides a `<figure aria-label>` + `<figcaption>` with a screen-reader table summary. See [visualization-system.md](./visualization-system.md).
- `PredictiveChart` exposes SVG `<title>` text for each bar.
- The "Not Found" empty state is plain text, readable without CSS.

---

## Performance

- `getSectorAggregatesExtended()` iterates the full snapshot once and caches the result in module scope (`let _insightsCache`). Subsequent calls are O(1).
- `generateAllCareerInsights()` likewise caches on first call.
- On the list page, `useMemo` on `allSectors` and `sorted` prevents re-iteration on every render; only sort-button clicks trigger re-sort.
- The detail page's `useMemo` on `sectorInsights` filters the full array on mount and on navigation; the filter is O(n) in snapshot size but runs once per page load.
- The snapshot JSON is ~350 KB before gzip. It is bundled into the primary JS chunk because both pages are `"use client"`. This is a documented trade-off (same bundle constraint as `/careers`).

---

## Failure / Empty Behaviour

| Scenario | Behaviour |
|---|---|
| Sector slug not found in snapshot | `/sectors/[id]/page.tsx` renders "Sector Not Found" state with a "Back to Sectors" link; no exception thrown |
| All occupations in sector have `medianSalary === 0` | `avgSalary` is `null`; stat card and table render `—` |
| All occupations in sector have `totalEmployment === null` | `totalEmployment` is `null`; stat card renders `—` |
| Snapshot file missing at build | `next build` fails with a JSON import error; CI gate catches this |
| CareerTrendChart / JobImpactChart / PredictiveChart receive no data | Each chart renders an empty SVG canvas; no crash |

---

## Tests / Quality Gates

| Test file | What it covers |
|---|---|
| `tests/data.test.ts` | `getSectorAggregatesExtended`: ≥1 sector, `avgRisk` ∈ [0,1], `brightShare` ∈ [0,1] for every sector |
| `tests/wage-tier-polarization.test.ts` | `getWageTierPolarization`: 755 included / 1 excluded; tier count; band cells always 4; share sums; wage-ordered tiers; weighted and unweighted means finite and in [0,1]; immutability |
| `tests/sectors-page-architecture.test.ts` | `lib/wage-tier-polarization.ts` carries `import "server-only"`; `WageTierPolarizationLens` has `"use client"` and does not runtime-import the server module; `app/sectors/page.tsx` calls `getWageTierPolarization()` |
| `tests/sectors-i18n.test.ts` | EN and ZH `sectors` namespaces have identical sorted key sets; no empty values in either locale |
| `tests/components/WageTierPolarizationLens.test.tsx` | Component renders from fixture; tier/band labels use text not color-only; toggle switches weighting mode; methodology caveat/disclosure present; no causal or longitudinal claim in output |
| `tests/components/ChartA11y.test.tsx` | `JobImpactChart`, `CareerTrendChart` — `<figure>`, `aria-label`, `<figcaption>`, `<table>` summary present |
| `tests/components/PredictiveChart.test.tsx` | `PredictiveChart` renders without crash |

**Remaining gaps:** No integration test exercises the full sector list render, sort interactions, or the detail page's stat card calculations. The `riskLabel` threshold helper is not separately unit-tested.

---

## Extension Points

- **Add a new sort key:** Extend `SortKey` in `SectorsPageClient.tsx`, add a branch to the `switch` in the sort `useMemo`, and add the button label to the i18n catalogues.
- **Expose employment-growth sparklines per sector:** `avgGrowth` is already computed; add it to the card layout.
- **Per-sector downloadable CSV:** `generateAllCareerInsights()` filtered by sector gives the rows; wire to the existing `DataExport` component pattern used in `/careers`.
- **Reduce the detail page's client payload:** the list page already server-renders its aggregates into `SectorsPageClient`; the `[id]/page.tsx` detail page could be given the same treatment (move `generateAllCareerInsights()` into an RSC wrapper and keep only the interactive controls in a client island).

---

## Key References

| Resource | Location |
|---|---|
| Sector aggregation functions | [`lib/data.ts`](../lib/data.ts) — `getSectorAggregates`, `getSectorAggregatesExtended` |
| Wage-tier polarization helper | [`lib/wage-tier-polarization.ts`](../lib/wage-tier-polarization.ts) — `getWageTierPolarization` (server-only) |
| Sectors list client island | [`components/sectors/SectorsPageClient.tsx`](../components/sectors/SectorsPageClient.tsx) — sort state, grid, chart mounts |
| WageTierPolarizationLens component | [`components/sectors/WageTierPolarizationLens.tsx`](../components/sectors/WageTierPolarizationLens.tsx) |
| Occupation snapshot schema | [`docs/occupation-data-model.md`](./occupation-data-model.md) |
| Chart components | [`docs/visualization-system.md`](./visualization-system.md) |
| Data sources & provenance | [`docs/transparency.md`](./transparency.md) |
| i18n namespace | `lib/i18n/messages/en/sectors.ts`, `lib/i18n/messages/zh/sectors.ts` |
| Risk colour palette | `lib/utils.ts` — `colorForRisk` |
| Careers detail (occupation rows) | [`docs/careers.md`](./careers.md) |
