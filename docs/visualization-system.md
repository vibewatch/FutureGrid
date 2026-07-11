# Visualization System

> **Status:** Active
> **Owner:** Switch (Designer)
> **Covers:** `components/charts/*`, `components/ui/*` primitives, `app/globals.css` design tokens
> **Related doc:** [Explore Page](./explore.md)

---

## Purpose

FutureGrid's visualization system is a collection of bespoke D3/SVG charts plus one Chart.js chart, unified by a shared design language: the brand violet→cyan gradient ramp, risk-band semantic colors, glass-morphism tooltips, and consistent `prefers-reduced-motion` + accessibility contracts.

The system is **not** a component library — it does not abstract a generic API. Each chart is purpose-built for a specific dataset and encoding. What is shared is the *language* (tokens, palette, tooltip pattern, SR contract) defined below.

### Non-goals

- Not a general-purpose charting library; charts are not fully configurable via props.
- Not responsible for data fetching; charts receive pre-computed data from their parent or call `lib/data.ts` helpers directly.
- Not responsible for page layout; each chart expects a width-constrained flex/grid parent.

---

## Boundaries

| Layer | Scope |
|---|---|
| Charts | `components/charts/` — 15 files (12 chart components + 1 accessibility wrapper + 1 Chart.js setup + 1 thin event bridge) |
| UI primitives | `components/ui/` — non-chart visual components: `AnimatedCounter`, `GridBackground`, `RiskGauge`, `Reveal`, `GuardrailBadge`, `DataAsOfBadge`, `CommandPalette`, `NotFoundUI` |
| Design tokens | `app/globals.css` — `@theme` block (Tailwind v4), CSS custom properties, keyframes, glass/glow utilities |
| Theme context | `components/theme/ThemeProvider.tsx` — wraps `next-themes`; all charts read `useTheme().resolvedTheme` |
| Library versions | D3 v7.9, Chart.js v4.5, react-chartjs-2 v5.3, d3-sankey v0.12 |

---

## Component Taxonomy

### Core Charts

| Component | Library | Visual type | Encoding | Primary consumers |
|---|---|---|---|---|
| `BarChartRace` | D3 | Animated horizontal bars | Employment over years; color = risk band | ExploreView `/explore` |
| `BeeswarmChart` | D3 + force | Force-collision scatter | x = AI exposure; size = employment; color = sector | ExploreView `/explore` |
| `CareerTrendChart` | **Chart.js** | Vertical bar | y = avg AI exposure by sector; color = risk band | SectorsPageClient `/sectors` |
| `CountryExposureChart` | D3 | Switchable bar / scatter | Top 20 countries; metric = AI usage index or % | GlobalView `/global` |
| `HeatmapChart` | D3 | Matrix heatmap | 25 countries × 8 readiness metrics; color = brand ramp | HeatmapView (in ExploreView) |
| `JobImpactChart` | D3 | Vertical bars w/ gradient | Top 20 occupations by AI exposure; SVG gradient fills | SectorsPageClient, DashboardHome |
| `OccupationTrendChart` | D3 | Dual-axis area + line | Employment (violet) + wage (cyan) over years | CareerDetailClient `/careers/[code]` |
| `PredictiveChart` | D3 | Horizontal bar | Projected openings or 2034 employment; violet→cyan gradient bar | DashboardHome, CareerDetailClient |
| `QuadrantScatterChart` | D3 + zoom | Scatter with quadrants | x = AI exposure; y = median salary (log scale); size = employment | ExploreView `/explore`, ReportView |
| `SectorScatterChart` | D3 | Bubble chart | x = AI exposure; y = bright-outlook %; size = total employment | DashboardHome |
| `SkillFlowSankey` | D3 Sankey | Flow diagram | High-exposure occupations → resilient career pathways; link width = shared skills | SkillsPageClient, ReportView |
| `TreemapChart` | D3 treemap | Nested treemap | Sector → occupation; area = employment; color = brand ramp | ExploreView `/explore`, ReportView |
| `WorldChoropleth` | D3 geo | World map (choropleth + bubble) | Country fill = readiness metric; switchable map/bubble mode | GlobalView, ReportView |

### Accessibility Wrapper

| Component | Purpose |
|---|---|
| `AccessibleChart` | Wraps any chart in `<figure aria-label>` + `sr-only <figcaption>`. Accepts `label: string`, `summary: ReactNode` (typically includes a `<table>`). Used by CareerTrendChart, JobImpactChart. |

### Thin Wrapper / Event Bridge

| Component | Purpose | Status |
|---|---|---|
| `WorldChoroplethInteractive` | Thin client island; renders `WorldChoropleth` and forwards `onCountrySelect` callback to a `window.dispatchEvent("fg:openCountry")` custom event, crossing the server/client boundary. | **Active** — used in GlobalView |

### Setup Module

| File | Purpose |
|---|---|
| `components/visa/chartSetup.ts` | Registers Chart.js scales, elements, and plugins for H-1B visa chart pages. Separate from CareerTrendChart's inline registration to avoid duplicate plugin registration. |

---

## Rendering & Data-Flow

```mermaid
flowchart TD
    subgraph Server["Server Components (build-time data)"]
        SC1["app/explore/page.tsx\ngetEmploymentHistoryMap()"]
        SC2["app/careers/[code]/page.tsx\ngetTrendData(code)"]
    end

    subgraph Lib["lib/data.ts + lib/snapshot.ts"]
        GCI["generateAllCareerInsights()"]
        GSA["getSectorAggregatesExtended()"]
        GCM["getCountryMapData()"]
        GEP["getEmploymentProjectionRows()"]
        GRP["getReskillingPaths()"]
        GEH["getEmploymentHistoryMap()"]
    end

    subgraph Charts["components/charts/"]
        BCR["BarChartRace\n(employmentHistories prop)"]
        BEE["BeeswarmChart\n(data: CareerInsight[])"]
        CTT["CareerTrendChart\n(calls getSectorAggregates)"]
        CEX["CountryExposureChart\n(calls getCountryExposure)"]
        HM["HeatmapChart\n(calls getCountryMapData)"]
        JI["JobImpactChart\n(calls generateAllCareerInsights)"]
        OTC["OccupationTrendChart\n(code + data props)"]
        PC["PredictiveChart\n(calls getEmploymentProjectionRows)"]
        QSC["QuadrantScatterChart\n(calls generateAllCareerInsights)"]
        SSC["SectorScatterChart\n(calls getSectorAggregates*)"]
        SFS["SkillFlowSankey\n(calls getHighExposure + getReskillingPaths)"]
        TM["TreemapChart\n(calls generateAllCareerInsights)"]
        WC["WorldChoropleth\n(calls getCountryMapData + getCountryAIDemand)"]
    end

    SC1 -->|employmentHistories| BCR
    SC2 -->|trend TrendPoint[]| OTC
    GCI --> BEE
    GCI --> JI
    GCI --> QSC
    GCI --> TM
    GSA --> CTT
    GSA --> SSC
    GCM --> HM
    GCM --> WC
    GEP --> PC
    GRP --> SFS
    GEH --> BCR
```

All charts are `"use client"` and render via `useEffect` with a D3 or Chart.js imperative draw call.

---

## Chart.js vs D3 vs Native — Selection Rationale

| Technology | When chosen | Examples |
|---|---|---|
| **D3 v7** | Custom layout (force sim, treemap, sankey, geo), pixel-precise animation, zoom/pan, complex interactivity | BeeswarmChart, TreemapChart, QuadrantScatterChart, BarChartRace, SkillFlowSankey, WorldChoropleth, HeatmapChart, OccupationTrendChart, SectorScatterChart, CountryExposureChart, JobImpactChart, PredictiveChart |
| **Chart.js 4 + react-chartjs-2** | Standard bar chart with responsive plugin, legend, and tooltip — no bespoke layout needed | `CareerTrendChart` (sole user) |
| **Native CSS / canvas** | Not used for data visualization |  |

**Decision rule:** Use Chart.js only when D3's complexity would be overkill (simple bar/line with standard axes, no simulation, no geo projection, no force layout). Use D3 for everything else. Do not mix both inside the same chart component.

---

## Component Contracts

### AccessibleChart
```tsx
interface AccessibleChartProps {
  label: string;          // aria-label for <figure>
  summary: ReactNode;     // rendered in sr-only <figcaption>; typically a <table>
  className?: string;
  children: ReactNode;    // the chart (SVG, Canvas, etc.)
}
```
Renders: `<figure aria-label={label}> {children} <figcaption className="sr-only">{summary}</figcaption> </figure>`

### BarChartRace
```tsx
interface BarChartRaceProps {
  employmentHistories: Record<string, Record<string, number>>;
  // SOC code → { "2014": 123456, "2015": 130000, … }
}
```

### BeeswarmChart
```tsx
interface BeeswarmChartProps {
  data: CareerInsight[];
}
```

### OccupationTrendChart
```tsx
interface OccupationTrendChartProps {
  code: string;           // SOC code (for aria-label)
  data: TrendPoint[];     // [{ year, employment, wage }]
}
```

### PredictiveChart / JobImpactChart / CareerTrendChart / SectorScatterChart
```tsx
// All accept an optional selectedSector filter:
interface WithSectorFilter {
  selectedSector?: string;
}
```
`CareerTrendChart` and `SectorScatterChart` take no props (data sourced internally).

### WorldChoropleth
```tsx
interface WorldChoroplethProps {
  onCountrySelect?: (iso3: string) => void;
}
```

---

## Interaction & Animation Patterns

### Tooltip (glass panel — used by all D3 charts)

```
pointer-events: none
position: absolute, z-50
background: rgba(9,9,11,0.93) dark / rgba(255,255,255,0.95) light
backdropFilter: blur(12px)
border: 1px solid {accentColor}55
borderRadius: 0.75rem (rounded-xl)
minWidth: 185–232px
boxShadow: 0 4px 28px rgba(0,0,0,0.55) dark / 0 4px 16px rgba(0,0,0,0.10) light
```

**Smart positioning:** `x > containerWidth * 0.62 → flip left of cursor (x − offset)`. The exact threshold varies (0.60–0.65) per chart. Always apply to prevent overflow at right edge.

Tooltip state is always managed as a single `useState<TooltipState>` with a `visible: boolean` field. Set `visible: false` on `mouseleave`.

### Hover Dimming
All D3 charts use opacity reduction to highlight the hovered element:
- Dots/circles: non-hovered → `fill-opacity: 0.10–0.25, stroke-opacity: 0.06–0.12`
- Bars/tiles: non-hovered → `opacity: 0.25–0.30`
- Sankey: non-connected links → `stroke-opacity: 0.06`; non-connected nodes → `fill-opacity: 0.20`

### Entrance Animations

| Chart | Animation | Duration |
|---|---|---|
| BeeswarmChart | Staggered fade-in (max 400ms delay) | 300ms |
| TreemapChart | Staggered opacity 0→1 (max 280ms delay) | 380ms |
| QuadrantScatterChart | r: 0 → final, `easeBackOut.overshoot(1.2)` (max 180ms delay) | 550ms |
| SectorScatterChart | scale(0) → scale(1), `easeBackOut.overshoot(1.15)` (55ms/bubble delay) | 520ms |
| HeatmapChart | Staggered opacity (6ms/cell) | 400ms |
| BarChartRace | D3 transition on bar width/position | 700ms per frame |
| OccupationTrendChart | Stroke-dashoffset line draw | 900ms |
| JobImpactChart | Bar height grow from y(0) (30ms/bar delay) | 700ms |
| PredictiveChart | Bar width grow (40ms/bar delay) | 600ms |
| SkillFlowSankey | Nodes fade in (40ms/node); links fade in (20ms/link, 200ms initial delay) | 500ms / 600ms |

All animations are **skipped** when `window.matchMedia("(prefers-reduced-motion: reduce)").matches === true`. Charts that check this outside of `useEffect` use a `useMemo` to read it once on mount (BarChartRace).

### Zoom (QuadrantScatterChart only)
- `d3.zoom().scaleExtent([0.4, 20])` on the SVG element.
- Grid, quadrant lines, and axes are redrawn on every zoom event via `rescaleX`/`rescaleY`.
- `isZoomed` React state shows/hides the "Reset Zoom" button.
- Reset: `svg.transition().duration(350).call(zoom.transform, d3.zoomIdentity)`.

### BarChartRace Controls
- Play/Pause: React state `isPlaying`; auto-advance via `setInterval(ADVANCE_MS = 1200)`.
- Replay: resets `yearIdx = 0`, starts playing.
- Scrubber: native `<input type="range">` — pauses `isPlaying` on change.
- At `yearIdx === frames.length - 1`: shows "Replay" label on the Play button.

---

## AccessibleChart & Visible-Table / Fallback Requirements

Every chart **must** implement one of these patterns:

### Pattern A — `AccessibleChart` wrapper (preferred for Chart.js)
```tsx
<AccessibleChart label={t("a11yMyChartName")} summary={<table>…</table>}>
  <div className="w-full h-[400px]">
    <Bar aria-hidden="true" … />
  </div>
</AccessibleChart>
```
Used by: `CareerTrendChart`, `JobImpactChart`.

### Pattern B — `role="img" aria-label` + `sr-only` table/list (preferred for D3)
```tsx
<svg role="img" aria-label={t("a11yMyChartName")} …>
  <title>…</title>  {/* optional; aids some AT */}
</svg>
<table className="sr-only" aria-label="…">…</table>
{/* or */}
<ul className="sr-only" aria-label="…">…</ul>
{/* or */}
<span className="sr-only">prose summary</span>
```
Used by: all other D3 charts.

The choice of table vs. list vs. prose depends on data structure:
- **Table** — when the data is naturally grid-shaped (BarChartRace current year, HeatmapChart countries × metrics).
- **List with links** — when the primary action is navigation (BeeswarmChart, QuadrantScatterChart, SectorScatterChart).
- **Prose** — when a brief summary is sufficient (TreemapChart, PredictiveChart, OccupationTrendChart).

---

## Keyboard / Screen-Reader / Reduced-Motion / Color Semantics

### Keyboard Accessibility

| Component | Keyboard affordances |
|---|---|
| All D3 charts | SVG is `role="img"` — not keyboard interactive; interactions handled via SR fallback (links, tables) |
| BarChartRace | Play/Pause, Replay buttons: standard `<button>`; scrubber: `<input type="range">` |
| QuadrantScatterChart | "Reset Zoom" `<button>`; occupation links in sr-only list |
| TreemapChart | "Back" button; occupation links via sr-only list |
| SectorScatterChart | Sector links in sr-only `<ul>` |
| BeeswarmChart | First 50 occupation links in sr-only `<ul>` |
| `AccessibleChart` users | SR `<table>` with `scope="col"/"row"` is tab-navigable |
| WorldChoropleth | Country paths have `tabIndex` and `onKeyDown` for keyboard focus (FOCUS_STROKE = cyan-400 indicator) |

### Screen Readers
- `aria-live="polite" aria-atomic="true"` — BarChartRace year indicator.
- `aria-pressed` — ExploreView sector filter chips.
- `<figcaption className="sr-only">` — AccessibleChart.
- `<title>` inside SVG — TreemapChart, OccupationTrendChart.

### Reduced Motion
All charts check at the top of their D3 `useEffect`:
```ts
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
```
- Entrance animations: duration set to 0, or skipped entirely.
- OccupationTrendChart: no stroke-dashoffset animation; dots shown at full opacity immediately.
- BarChartRace: `TWEEN_MS = 0`; Play/Pause button disabled; scrubber still works.
- BeeswarmChart: force sim run synchronously (300 ticks), no fade-in.

### Color Semantics

#### Risk-band palette (semantic — use `colorForRisk()` from `lib/utils.ts`)
| Risk | Hex | Token |
|---|---|---|
| Low | `#22c55e` | `--color-risk-low` |
| Medium | `#eab308` | `--color-risk-medium` |
| High | `#f97316` | `--color-risk-high` |
| Very High | `#ef4444` | `--color-risk-very-high` |

#### Brand sequential ramp (continuous data — exposure / readiness)
```
dark-indigo #1e1b4b → violet #7c3aed → cyan #06b6d4
```
Used by: HeatmapChart, TreemapChart, WorldChoropleth (AI readiness mode).

#### Brand demand ramp (AI demand signal)
```
dark-teal #052e2b → emerald #10b981 → mint #a7f3d0
```
Used by: WorldChoropleth (demand mode).

#### Brand accent gradient (violet → cyan, UI elements)
```
#8b5cf6 (--brand-violet) → #22d3ee (--brand-cyan)
```
Used by: PredictiveChart bars, OccupationTrendChart dual-axis colors, gradient text.

#### Sector palette (BeeswarmChart, 20 categorical)
Not reproduced here — defined in `BeeswarmChart.tsx → SECTOR_COLORS`. Not semantic; purely for visual distinction between sectors.

Color is **never** the sole differentiator: all charts provide text labels, numerical values in tooltips, or SR tables.

---

## Responsive Behavior

- All SVGs use `viewBox` + `className="w-full h-auto"` → fluid-width, proportional height.
- Charts are wrapped in `overflow-x-auto` so small viewports can scroll rather than clip.
- `minHeight` CSS values set on SVG elements ensure a usable minimum height on narrow screens:
  - BeeswarmChart: 280px
  - BarChartRace: 200px
  - QuadrantScatterChart: 320px
  - OccupationTrendChart: 200px (or 60px for empty state)
  - WorldChoropleth: full viewBox aspect ratio
- HeatmapChart is the heaviest for mobile (1000+ px wide viewBox); horizontal scroll is expected and acceptable.
- Chart.js (`CareerTrendChart`) uses `maintainAspectRatio: false` inside a fixed-height `div` (`h-[400px]`).

---

## Performance & Lazy-Loading / Bundle Strategy

### Current approach
- All chart components are `"use client"` and imported directly (no `next/dynamic`).
- D3 v7 and Chart.js v4 are tree-shaken at bundle time; only registered Chart.js components are included (see `chartSetup.ts` for H-1B pages).
- CareerTrendChart registers `CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend` inline.
- D3 sankey is a separate package (`d3-sankey`) imported only in SkillFlowSankey.

### Cleanup discipline
Every D3 `useEffect` returns a cleanup that calls:
```ts
return () => { svg.selectAll("*").interrupt(); };
```
BeeswarmChart additionally stops the force simulation:
```ts
return () => { simRef.current?.stop(); cleanup?.(); };
```

### Known gap
- No `next/dynamic` lazy-loading is applied to heavy charts (WorldChoropleth loads TopoJSON; HeatmapChart renders 200 cells).
- The Report page (`/report`) mounts multiple heavy charts in a sequence — consider virtualization or IntersectionObserver-triggered mounting if performance degrades.

> **Recommendation:** Wrap `WorldChoropleth` and `HeatmapChart` with `next/dynamic({ ssr: false, loading: () => <Skeleton /> })` to reduce initial JS parse on pages where they appear below the fold.

---

## Failure & Empty States

| Component | Condition | Behavior |
|---|---|---|
| BarChartRace | `frames.length === 0` | Shows i18n `"raceNoData"` div |
| OccupationTrendChart | `validEmp.length < 2 && validWage.length < 2` | Renders small SVG with centered `"emptyInsufficientHistory"` text |
| PredictiveChart | `topOccupations.length === 0` | Renders 200px SVG with centered `"emptyNoProjectionData"` text |
| JobImpactChart | `filtered.length === 0` (sector filter) | Renders `"emptyNoSectorData"` text in SVG |
| HeatmapChart | Cell has no data | Cell rendered with `noDataFill` (zinc-800 dark / zinc-300 light) |
| CountryExposureChart | Country metric is null | Country excluded from top-N display |
| WorldChoropleth | Country has no data | Country rendered with `NO_DATA_FILL` constant |
| BeeswarmChart / TreemapChart / QuadrantScatterChart | `data.length === 0` | D3 effect exits early; empty SVG; no error |

No chart currently renders a user-visible error message for data-fetch failures. Add an `ErrorBoundary` in the section wrapper if network-dependent data is introduced.

---

## Security / Privacy

### Data Loading: Bundled vs. Runtime Fetches

Most charts load data from pre-bundled JSON modules (webpack `import` at compile time). Two components issue runtime HTTP fetches:

| Component | Data loading mechanism | Target | Origin |
|---|---|---|---|
| All D3 charts (except WorldChoropleth) | `import` of `lib/data.ts` helpers — snapshot JSON bundled at build | Pre-bundled | n/a |
| `BarChartRace` | `employmentHistories` prop injected by Server Component at **build time** | Server prop | n/a |
| `WorldChoropleth` | `fetch(${BASE_PATH}/world-countries.geo.json)` on component mount | `public/world-countries.geo.json` | Same origin |
| `LayoffsView` (via `lib/warn-client.ts`) | `fetch(${BASE_PATH}/warn-notices.json)` | `public/warn-notices.json` | Same origin |

`BASE_PATH` is the compile-time env var `NEXT_PUBLIC_BASE_PATH` — empty on localhost, the GitHub Pages sub-path (e.g. `/FutureGrid`) in production. Both runtime fetches resolve to files in the app's own `public/` directory. Neither contacts an external API, CDN, or third-party service.

The `warn-client.ts` promise is module-level memoized (`_warnPromise`), so multiple components share a single network round-trip.

### PII Posture

No personally-identifiable information flows through any chart component. All rendered data is:

- **Occupational statistics** — SOC codes, job titles, sector aggregates, AI exposure scores (BLS OEWS / O\*NET derived).
- **Country-level aggregates** — readiness indices and AI adoption proxies (public-domain sources).
- **WARN Act notices** — employer names, locations, and layoff counts (public government filings).

`localStorage` is used solely by `LanguageProvider` (`lib/i18n/LanguageProvider.tsx`) to persist locale choice under the key `fg-locale`. No chart component reads or writes `localStorage`, `sessionStorage`, or cookies. No chart component has access to any user-identifying value.

### D3 / SVG Rendering and XSS

D3 builds SVG content through its selection API (`.append()`, `.attr()`, `.text()`), which sets DOM node attributes and text nodes directly. These methods do not call `innerHTML` and are not injection vectors.

**`dangerouslySetInnerHTML` — single confirmed use:**

`SkillFlowSankey.tsx` (line 404) renders its tooltip via `dangerouslySetInnerHTML={{ __html: tooltip.html }}`. The `html` string is a template literal built entirely from pre-bundled data:

```ts
// Node hover (line 313)
html: `<strong>${d.name}</strong><br/><span>${detail}</span>`
// Link hover (line 337)
html: `<strong>${truncate(src.name, 24)} → ${truncate(tgt.name, 24)}</strong><br/><span>${d.value} shared skill…</span>`
```

`d.name`, `src.name`, and `tgt.name` originate from `getHighExposureOccupations()` / `getReskillingPaths()`, which read exclusively from `occupation-snapshot-slim.json` — a static JSON file committed to the repo and never modified at runtime. `d.value` is a numeric skill count. No user-supplied string is interpolated.

**Residual risk:** `dangerouslySetInnerHTML` bypasses React's escaping. If `occupation-snapshot-slim.json` were poisoned at build time (supply-chain attack), the raw HTML would be rendered unescaped in the Sankey tooltip. Consider replacing with a structured React tooltip component to eliminate this surface.

All other chart tooltips use React `useState` → JSX rendering with normal string escaping.

### External Links and Data Loads

All chart navigation uses `router.push('/careers/${encodeURIComponent(code)}')`, `<a href="/careers/${encodeURIComponent(code)}">`, or `<Link href="/sectors/...">` — these are intra-app relative paths. `encodeURIComponent` ensures SOC code and sector strings are URL-safe. No chart component creates a link or fetch to an external origin.

`WorldChoroplethInteractive.tsx` emits a `window.dispatchEvent` custom event (`fg:openCountry`) to bridge the server/client boundary. This is a same-browser in-process channel; it crosses no origin or network boundary.

### Static-Export Threat Boundary

`next.config.ts` configures `output: "export"`. FutureGrid is a **100% static site** — no Node.js server runs at request time; there is no API endpoint, session store, or server-side database. The entire attack surface is the static JS/CSS/HTML bundle delivered to the browser.

Implications:
- Server-side injection, SSRF, path traversal, and server authentication attacks have no surface.
- No HTTP security headers (CSP, HSTS, X-Frame-Options, Permissions-Policy) are emitted by the framework; they must be configured at the hosting layer (CDN / reverse proxy).
- The two runtime `fetch` calls to `public/*.json` are same-origin and return static pre-built JSON; they cannot be manipulated without compromising the hosting origin or the CDN serving the static files.

---

## Testing

- Unit tests in `tests/` (Vitest).
- D3 effects are imperative SVG mutations — not tested with React Testing Library. Test via:
  - **Visual regression** (Playwright screenshots) for layout/color correctness.
  - **Interaction tests** (Playwright) for hover → tooltip, click → navigate, zoom → reset.
- Chart.js (`CareerTrendChart`) can be tested with `@testing-library/react` because it renders to a `<canvas>`.
- `AccessibleChart` is a pure render component — easily unit-tested.
- BarChartRace play/pause state machine can be tested with `@testing-library/react` + `vi.useFakeTimers()`.

---

## Extension Checklist

When adding a new chart component to `components/charts/`:

- [ ] File starts with `"use client"`.
- [ ] Use `useTheme().resolvedTheme` — never hardcode colors.
- [ ] Theme-aware color constants at top of `useEffect`: `axisText`, `gridColor`, `axisLine`.
- [ ] Respect `prefers-reduced-motion`: check at top of D3 effect.
- [ ] Return cleanup: `return () => { svg.selectAll("*").interrupt(); }`.
- [ ] Apply `AccessibleChart` wrapper **or** `role="img" aria-label` + `sr-only` fallback.
- [ ] Use `colorForRisk()` from `lib/utils.ts` for risk-band coloring.
- [ ] Use the brand ramp function for continuous sequential data (copy `metricColor` or `exposureColor` pattern).
- [ ] Glass tooltip: `pointer-events-none absolute z-50 rounded-xl border`, smart x-flip, `backdropFilter: blur(12px)`.
- [ ] `w-full h-auto` SVG with `overflow-x-auto` parent.
- [ ] `minHeight` on the SVG element.
- [ ] Empty/no-data state renders a centered text message, not a blank space.
- [ ] Add to the taxonomy table above and to any page doc that consumes the new chart.

---

## Key File References

| File | Role |
|---|---|
| `components/charts/AccessibleChart.tsx` | SR accessibility wrapper |
| `components/charts/BarChartRace.tsx` | Animated employment race (D3) |
| `components/charts/BeeswarmChart.tsx` | Force-collision occupation scatter (D3) |
| `components/charts/CareerTrendChart.tsx` | Sector AI exposure bar chart **(Chart.js — sole Chart.js chart)** |
| `components/charts/CountryExposureChart.tsx` | Country AI usage bar/scatter (D3) |
| `components/charts/HeatmapChart.tsx` | Country × readiness heatmap (D3) |
| `components/charts/JobImpactChart.tsx` | Top-exposure occupation bars (D3) |
| `components/charts/OccupationTrendChart.tsx` | Dual-axis employment + wage trend (D3) |
| `components/charts/PredictiveChart.tsx` | Projected openings/employment bars (D3) |
| `components/charts/QuadrantScatterChart.tsx` | AI exposure × salary scatter + zoom (D3) |
| `components/charts/SectorScatterChart.tsx` | Sector bubble chart (D3) |
| `components/charts/SkillFlowSankey.tsx` | Career transition Sankey (D3 + d3-sankey) |
| `components/charts/TreemapChart.tsx` | Sector→occupation treemap (D3) |
| `components/charts/WorldChoropleth.tsx` | World choropleth / bubble map (D3 geo) |
| `components/charts/WorldChoroplethInteractive.tsx` | Thin event-bridge wrapper |
| `components/visa/chartSetup.ts` | Chart.js plugin registration for H-1B visa pages |
| `app/globals.css` | Design tokens, risk colors, brand ramp, glass utilities, keyframes |
| `lib/utils.ts` | `colorForRisk(risk: string): string` |
| `lib/data.ts` | `generateAllCareerInsights()`, `getSectorAggregates*()`, `getCountryMapData()` |
| `lib/snapshot.ts` | `getEmploymentHistoryMap()`, `TrendPoint` type |
| `lib/employment-projections.ts` | `getEmploymentProjectionRows()`, `EmploymentProjectionRow` type |
| `lib/labor-signals.ts` | `getCountryAIDemand()` — WorldChoropleth demand metric |
| `components/theme/ThemeProvider.tsx` | next-themes wrapper; all charts consume `useTheme()` |
