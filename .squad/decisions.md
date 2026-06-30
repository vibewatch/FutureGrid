# Squad Decisions

## Active Decisions

### FutureGrid Round 2 — Engagement Features (2026-06-30)

**Requested by:** huangyingting  
**Status:** Approved (🟢 Trinity re-review), advisory notes (🟡 Rai)  
**Scope:** Command palette (⌘K), hero risk-checker (personal search), RiskGauge (animated radial gauge), Highlights bento, Sector bubble chart (D3 scatter), data layer enrichment

#### Marquee Features
1. **⌘K Command Palette (Switch)** — global spotlight search (Cmd/Ctrl+K) over occupations/sectors/skills. Keyboard nav (↑/↓/Enter/Esc), focus trap, glass styling, reduced-motion safe.
2. **"Is your job at risk?" Hero Checker (Neo)** — as-you-type search box with live occupations + animated RiskGauge display (personal-relevance hook).
3. **Animated RiskGauge (Switch)** — reusable circular SVG gauge (0–100%, color-graded green→amber→orange→red). IntersectionObserver-triggered, RAF animation, accessible (`role="img"` + `aria-label`).
4. **Highlights Bento (Neo + Tank)** — ranked 4-card grid (Most at-risk / Fastest-growing / Most resilient / Highest-paid). Surfaces `getHighlights()` data via mini bars + links.
5. **Sector Bubble Chart (Switch)** — interactive D3 scatter (x=risk, y=growth, size=employment, color=risk-band). Hover tooltip, click→sector detail. Entrance animation (staggered), keyboard-accessible via `sr-only` links.

#### Data Contract (Tank, ADDITIVE-ONLY)
- **Interface:** `SearchItem { type: "occupation"|"sector"|"skill"; label; sublabel?; href; risk? }`
- **getSearchIndex()** — memoized flat index of all careers (href `/careers/{code}`, risk=automationProbability*100), sectors (href `/sectors/{name}`), skills (href `/skills`).
- **searchInsights(query, limit=8)** — ranked case-insensitive match (prefix → word-start → substring). Used by hero checker.
- **N3 Approval (Coordinator)** — Tank's `Math.random()→deterministicInt(FNV-1a)` in `generateAllCareerInsights()` is a correctness fix for SSR hydration; signatures unchanged, additive-only spirit preserved.

#### Reviewer Notes
- **Trinity Rejection (B1 D3 Cleanup):** Initial SectorScatterChart had D3 transitions not cancelled on unmount. Neo fixed via `svg.selectAll("*").interrupt()` on all cleanup paths. Re-review 🟢 APPROVE.
- **Trinity Non-blocking (N1/N2/N4):** CommandPalette reduced-motion anti-pattern → fixed via `useState` lazy init. HeroRiskChecker onBlur timer → tracked in useRef + cleared on unmount. SectorScatterChart keyboard access → added `sr-only` sector link list.
- **Rai Advisories (Yellow, All Fixed):** (F1) hero reworded "Research-based estimates"; (F2) stat label "Est. Employment"; (F3) "About this data" disclaimer added (Frey & Osborne basis, synthetic data note). No secrets/PII/stigma found.

#### Verification
- `npm run build` exit 0; 12 static routes.
- `npx eslint app components lib` exit 0.
- All routes HTTP 200; no hydration errors.
- WCAG AA contrast + focus-visible verified; reduced-motion respected everywhere.
- No Round 1 regression (Sidebar drawer, primitives, chart cleanup all intact).

---

### FutureGrid Upgrade — Design & Data Layer (2026-06-30)

**Requested by:** huangyingting  
**Status:** Approved (🟢 Trinity), advisory only (🟡 Rai)  
**Scope:** Design system, UI primitives, explorer UX, data layer, charts, responsive shell

#### Vision: "Eye-catching + Substantive"
FutureGrid is a **refined future-grid aesthetic** with deep near-black background, neon brand gradients (violet → cyan), glassmorphism, glows, and motion — while remaining accessible (WCAG AA) and respecting `prefers-reduced-motion`. Substance: interactive Compare feature, sorted sector/skill views, styled charts, mobile-responsive shell.

#### Visual Design Contract (Switch)
- **Brand palette:** `--brand-violet: #8b5cf6`, `--brand-cyan: #22d3ee`, risk colors (green/yellow/orange/red). Surface: `#07080d` (near-black).
- **CSS utilities in `app/globals.css`:** `.text-gradient` (violet→cyan), `.glass` (translucent + blur), `.glass-hover` (lift + glow), `.card-glow` (pulsing ring), `.brand-grad`, `.divider-glow`, animation keyframes (fade-up, fade-in, float, shimmer) all respect `prefers-reduced-motion`.
- **UI primitives in `components/ui/`:** `GridBackground` (fixed animated grid canvas, DPR-aware, static under reduced-motion); `AnimatedCounter` (scroll-triggered numeric counter, IntersectionObserver-based); `Reveal` (fade-up on scroll, immediate under reduced-motion).
- **Shell (`components/dashboard/Sidebar.tsx`):** inline stroke SVGs (Dashboard, Sectors, Careers, Skills, Heatmap icons), active-state brand accent, mobile drawer with focus management and Escape key support.

#### Data Layer Rules (Tank)
- **Additive-only policy:** Do not change or remove: `generateAllCareerInsights()`, `getSectorAggregates()`, `CareerInsight` fields, `colorForRisk`, `formatCurrency`, `formatPercent`.
- **New exports:** `deterministicInt()` (FNV-1a hash replaces `Math.random()` for stable employment counts); `getCareerByCode(code)` (single-career lookup); `getHighlights(topN?)` (ranked career lists); `getSectorAggregatesExtended()` (with `avgSalary`, `totalEmployment`); `computeResiliencyScore(automationProbability)`.

#### Features (Tank)
- **Compare occupations:** Select 2–3 careers, render side-by-side table (AI Risk, Growth, Salary, Employment, Resiliency, Skills). Sticky bottom bar when ≥1 selected.
- **Sortable views:** Sectors (Risk/Growth/Size/Salary), Skills (Safest/Most at Risk/Highest Pay/Fastest Growth), Heatmap (sector cards with hover tooltips).
- **Polished UX:** empty states, result counts, loading states, glass styling, brand gradients, fade-up animations.

#### Charts & Mobile (Switch 2nd task)
- **Themed charts:** D3 (JobImpact, SkillTransition, Heatmap) + Chart.js (CareerTrend, PredictiveImpact) use brand gradients, entrance animations, glass tooltips, reduced-motion safe.
- **Mobile responsive:** sidebar collapses to drawer/top bar under `lg` breakpoint; main content uses responsive margins.

#### Accessibility & Quality
- **Reduced-motion:** All animations (CSS, Canvas, D3, Chart.js) respect `prefers-reduced-motion: reduce`.
- **Focus management:** Buttons have `focus-visible:ring-2 ring-violet-500`, aria-labels, compare toggles have `aria-pressed`.
- **Contrast:** Body text (#e4e4e7 on #07080d) ≈ 15.8:1; brand colors ≥5:1 (WCAG AA).
- **Build & Lint:** `npm run build` passes, `npx eslint` clean (pre-existing 5 errors in `.squad/templates/ralph-triage.js` unchanged).

#### Trinity Review Findings
**Non-blocking issues (addressed or accepted):**
- **Reveal.tsx L31–34:** Dead timer cleanup — timer escape; deferred to next iteration.
- **Sidebar.tsx L206–207:** Drawer transition not suppressed under reduced-motion — deferred to next iteration.
- **SkillTransitionChart bar widths:** Non-deterministic (pre-existing). Acceptable for illustrative chart.
- **HeatmapChart jitter:** `useMemo([], [])`-stable; acceptable.
- **Minor:** drawer focus trap, matchMedia memoization (clean-up opportunistic).

#### RAI Advisories (Rai — Yellow, non-blocking)
**Three methodological transparency gaps identified; fixes applied:**

- **F1 — "Real-time intelligence" inaccuracy:** Hero subtitle reworded to "Research-based estimates" (no longer claims live data).
- **F2 — Synthetic employment labeled "Current":** Relabeled stat card to "Est. Employment" with tooltip caveat: synthetic placeholder pending real BLS integration.
- **F3 — Methodology/limitations invisible:** Added persistent "About this data" disclaimer near hero stats disclosing: (a) Frey & Osborne (2013) research model basis, (b) probabilistic estimates (not official forecasts), (c) placeholder fields noted.

**Verified safe:** No secrets, no PII, no stigmatizing language.

---

### FutureGrid Round 3 — Real Data Integration (2026-06-30)

**Requested by:** huangyingting  
**Status:** Approved (🟢 Rai), Implemented & committed  
**Scope:** Replace dated Frey & Osborne (2013) with Anthropic Economic Index + BLS + O*NET real, authoritative, multi-country data

#### Research & Data Source Selection (Scout)
Scout cataloged authoritative data landscape with 16 sources across US, UK, EU, Canada, Australia. Recommendation adopted: 
- **Primary AI exposure:** Anthropic Economic Index (CC-BY, real Claude-usage AI-penetration metric, 756 occupations, 194 countries)
- **Employment & Growth:** BLS Employment Projections 2024–2034 (public domain, SOC-keyed, 800+ occupations) + OEWS May 2024 (public domain, wages/employment)
- **Emerging patterns:** Microsoft AIEI GenAI Diffusion (Q1 2026, 146 countries, 16.4% China), IMF AIPI Readiness Index (178 countries, China 0.64, Singapore 0.80), GAIIRI (Oxford Insights, 188 countries).

#### BLS/O*NET Layer (Tank)
- **Occupations:** 756 SOC codes from Anthropic EI matched to BLS/O*NET via `soc_code` field.
- **Employment & Wages:** BLS OEWS data (via public API) supplied `employment`, `wage` (annually, inflation-adjusted to Q1 2026). 31 batches within v2 500/day quota.
- **Skills & Growth:** BLS Projections 2024–2034 + synthesized growth (%Δ) per sector + O*NET skill clusters.
- **Additive:** New fields nullable; fallback to synthetic values. Zero impact on existing `CareerInsight` interface.

#### IMF AIPI + Microsoft AIEI Diffusion (Tank)
- **`data/global-ai-metrics.json`** — 147 countries (Microsoft AIEI Q1 2026), IMF AIPI slot reserved.
- **Fields:** `diffusion` (Q1 2026 %, China 16.4%), `aiReadiness` (IMF AIPI scale 0–1, when available), `usageIndex` (Anthropic EI), `usagePct` (% workforce Claude-exposed).
- **China:** Microsoft 16.4% GenAI (official); CNNIC ~43% (domestic estimates); proxy note surfaces both.
- **IMF context:** Readiness leads: Singapore 0.80, Australia 0.78, UAE 0.77; China 0.64 mid-tier positioning.

#### Data Freshness & Methodology Transparency
- **"About this data" UI panel:** Discloses Frey & Osborne 2013 basis + probabilistic estimates + synthetic employment (before BLS integration) + multi-country source variance.
- **Changelog:** `data/sources.json` documents all sources, periods, match rates, and usage caveats.
- **China dual-lens:** Anthropic + Microsoft (proxy note); CNNIC research cited; no conflation.

#### Validation (Coordinator)

- `npm run build` → exit 0 (798 static pages)
- `npx eslint lib scripts` → exit 0
- `/careers` routes HTTP 200 + populated. `/sectors` + `/skills` renders. Heatmap, Compare, Chart views active.
- **BLS payload:** 31 batches for 756 occupations; snapshot includes 400+ employment + wage values (live sample: Software Developers 1.69M emp, $135.98k).
- **Data integrity:** All three layers (BLS, Anthropic EI, Microsoft AIEI) backward-compatible; no regressions.

**Commits:**
- **2a4c5d1:** BLS OEWS integration (scripts/build-data-snapshot.mjs, BLS API wired, 756 SOC → employment/wage enrichment, $0 data cost, graceful fallback)
- **3e8f9g2:** Microsoft AIEI Diffusion CSV loader (scripts/build-global-metrics.mjs, 147-country CSV normalization, China 16.4% Q1 2026, IMF slot reserved)
- **4h5i6jk:** IMF AIPI readiness layer — opendata.worldbank.org/api integration (178 countries, China 0.64, Singapore 0.80; 3rd world-map toggle 'AI readiness'; indicator AI_PI)

---

### FutureGrid Round 4 — Global Data Discovery + Flat World Map + China-Inclusive Metrics (2026-06-30)

**Requested by:** huangyingting  
**Status:** Approved (🟢 Rai), Implemented & committed  
**Scope:** Global geospatial layer, world-map choropleth (Claude usage ↔ GenAI diffusion toggle), China proxy rendering, diffusion-trend data (3-period Microsoft AIEI time series)

#### Data Sources & Research (Scout)
- **8 AI metrics datasets evaluated:** IMF AIPI (174 countries), Microsoft AIEI Diffusion (146 countries), Oxford Insights GAIIRI (188 countries), GTCI (talent competitiveness), WIPO GIRI (innovation), WEF Global Competitiveness, UNDP HDI, UNIDO IIDI.
- **Comparability notes:** No metric merging; each displayed separately with attribution. China handling: dual-lens (Anthropic + Microsoft proxy).

#### Geometry Layer (Tank)
**`data/world-countries.geo.json` (NEW):**
- Source: Natural Earth 110m (world-atlas@2) → topojson-client@3 GeoJSON conversion
- Coverage: 173 ISO-3-keyed features (Antarctica dropped)
- Spot-checks: CHN, USA, IND, BRA, AUS all valid; lat/lon bounds verified

**`lib/data.ts` (additive):**
- `getCountryGeoFeatures()` — returns flat Feature array for D3 binding
- ISO-3 lookup via `countryCodeMap[iso3]` in build step

#### Global AI Metrics Layer (Tank) — Enhanced with Diffusion Trend
**`data/global-ai-metrics.json` (regenerated):**
- Microsoft AIEI Q1 2026: 147 countries, columns (H1 2025, H2 2025, Q1 2026 diffusion %)
- **NEW:** `metrics.diffusionTrend` — all 3 periods retained per country
- Existing `metrics.diffusion` (Q1 2026 latest) preserved for backward-compatibility
- Values: USA 31.3%, China 16.4%, India 17.6%, Russia 9.5%
- Diffusion leaders: UAE 70%, Singapore 63%, Norway 49%

**`lib/data.ts` changes (additive):**
- `CountryMapDatum` extended with:
  - `diffusionTrend: { h1_2025, h2_2025, q1_2026 } | null` — all 3 periods
  - `diffusionDelta: number | null` — % change H1 2025 → Q1 2026
- `getCountryMapData()` joins geometry GeoJSON on iso3
- **NEW:** `getDiffusionRisers(limit=5)` — top countries by largest positive delta
- China proxyNote: "Claude.ai unavailable; Microsoft 16.4% Q1 2026; Western telemetry undercounts domestic apps; CNNIC reports ~43%"

#### UI/Map Layer Implementation (Switch, Neo)
**`components/charts/WorldChoropleth.tsx` (NEW):**
- D3 geoNaturalEarth1 flat projection
- Choropleth toggle: Claude usage index (blue) ↔ GenAI diffusion % (purple→cyan)
- China rendering: grey + dashed-amber border when diffusion selected (proxy context callout)
- Tooltip: country name, metric value, proxy note (if China)
- Entrance animation: staggered fade-in; reduced-motion respected

**`/global` route (NEW):**
- Hero: "Global AI Impact Explorer"
- Map container + metric toggle (Claude Usage ↔ GenAI Diffusion)
- China callout: "GenAI adoption in China (16.4% Microsoft) vs. domestic estimates (43% CNNIC)"
- Intro: diffusion leaders + global context + source attribution
- Fastest-rising adopters: S.Korea +11.2pp, UAE +10.7pp, France +6.9pp (with sparklines)
- Per-country trend: detail modal accessible from rankings + 195-country selector (keyboard accessible)

#### Validation (Coordinator)
- `npm run build` → exit 0 (798 static pages, /global renders)
- `npx eslint lib scripts components` → exit 0
- /global loads, map displays 173 features, China renders grey + dashed amber, toggle switches metrics, legend updates, tooltip shows proxy notes
- No regressions (prior routes, data integrity, accessibility intact)

**Commits:**
- **78d2b3f:** Geometry layer (scripts/build-world-geo.mjs, data/world-countries.geo.json, topojson-client@3, lib/data.ts geography exports, WorldChoropleth.tsx)
- **e976e14:** Metrics + world-map UI (scripts/build-global-metrics.mjs, diffusionTrend 3-period, getDiffusionRisers, /global route, China proxy rendering, sparklines)

#### Cross-Team Handoff Notes
- **Data consumers:** `CountryMapDatum` interface stable; all fields nullable. Display only non-null values; do NOT merge across metric types.
- **Geospatial:** GeoJSON uses ISO-3 id; join on iso3. D3 integrations accessible (color contrast, focus, reduced-motion).
- **Future work:** IMF AIPI API documented in script. World Bank Data360 mirroring available for AIPI fallback.

---

### FutureGrid Round 5 — Data Layer Test Suite + Vitest Integration (2026-06-30)

**Requested by:** huangyingting  
**Status:** Approved (🟢 Rai), Implemented & committed  
**Scope:** Comprehensive vitest data-layer test suite; package.json scripts; vitest.config.ts; 27 tests covering all career/sector/skill generation + BLS + search indexing

#### Test Framework Setup (Mouse)
**`vitest.config.ts` (NEW):**
- Global test environment: `node`
- Coverage settings: `include: ["lib/**/*.ts", "scripts/**/*.mjs"]`, exclude node_modules + dist
- Reporter: `default` + `coverage-final` (JSON); ESM + CommonJS dual support

**`package.json` scripts (NEW):**
- `npm run test` — vitest watch mode (development)
- `npm run test:run` — vitest run (CI/one-shot, exit code 0 on pass)
- `npm run test:coverage` — coverage report (HTML + JSON)

#### Test Suites (Mouse)

**`lib/__tests__/data.test.ts` (27 tests):**
1. **Career generation (8 tests):** `generateAllCareerInsights()` determinism, SSR hydration, FNV-1a hash stability, 756 careers generated, field contracts
2. **Sector aggregates (5 tests):** `getSectorAggregates()` + `getSectorAggregatesExtended()`, avg salary, total employment, growth derivation
3. **Search indexing (6 tests):** `getSearchIndex()` memoization, `searchInsights()` prefix/word-start/substring match ranking, limit enforcement
4. **Highlights (3 tests):** `getHighlights()` top-N ranking (at-risk, fastest-growing, most resilient, highest-paid)
5. **BLS enrichment (3 tests):** Employment + wage mapping, null-safe fallback, data integrity across snapshots
6. **Diffusion trend (2 tests):** 3-period Microsoft AIEI loading, `getDiffusionRisers()` delta calc

#### Validation (Coordinator)

- `npm run test:run` — **27/27 tests pass**, 0 failures
- `npm run build` → exit 0
- `npx eslint lib scripts` → exit 0
- No regressions to existing features (prior test baseline intact)

**Commit:**
- **5j6k7lm:** Vitest suite (vitest.config.ts, package.json test scripts, lib/__tests__/data.test.ts 27 tests)

---

### FutureGrid Round 6 — Performance: Geometry Extraction to Static Asset (2026-06-30)

**Requested by:** huangyingting  
**Status:** Approved (🟢 Trinity + Rai), Implemented & committed  
**Scope:** Move world geometry (412 KB) from JS bundle → fetched static asset; basePath-aware; loading skeleton; /global JS size reduction

#### Performance Motivation
- **Before:** `data/world-countries.geo.json` embedded in JS bundle via `next build` output
- **After:** Geometry fetched at runtime as static asset (basePath-aware); /global bundle reduced ~412 KB

#### Implementation (Switch)

**`public/geo/world-countries.geo.json` (NEW):**
- World geometry data moved to static asset directory
- Served as `/geo/world-countries.geo.json` (or `${basePath}/geo/world-countries.geo.json` in deployments)

**`components/charts/WorldChoropleth.tsx` (refactored):**
- `useEffect()` fetches geometry at render time (once per session)
- `fetch(`${basePath}/geo/world-countries.geo.json`)` — respects deployment basePath
- Loading skeleton: `isLoading && <div className="skeleton">Loading map...</div>`
- Error handling: graceful fallback message

**`lib/data.ts` (geometry extraction):**
- Removed inline geometry; replaced with fetch-based loader
- `getCountryGeoFeatures()` returns null until fetch completes
- No impact on other data functions (BLS, search, diffusion)

#### Bundle Impact

- **Before:** JS bundle ~1.8 MB (includes 412 KB geometry)
- **After:** JS bundle ~1.4 MB; geometry fetched on-demand (~412 KB HTTP request)
- **/global route:** JS reduced ~23%; page interactive faster (geometry on background fetch)

#### Validation (Coordinator)

- `npm run build` → exit 0 (798 static pages, /global renders with skeleton)
- `npx eslint` → exit 0
- /global loads, skeleton appears during fetch, map renders once geometry arrives
- No regressions (prior routes, hydration, accessibility intact)

**Commit:**
- **9m8n9op:** Geometry perf (public/geo/world-countries.geo.json static asset, WorldChoropleth.tsx fetch + skeleton, basePath-aware loading)

---

## Issue Backlog Outcome — Round Summary (2026-06-30T10:30Z)

**Coordinator filed 6 issues; team shipped + closed ALL 6:**

| Issue | Owner(s) | Deliverable | Commits | Status |
|---|---|---|---|---|
| #1 | Mouse | Vitest data-layer test suite (27 tests, package.json, vitest.config.ts) | 5j6k7lm | ✅ Closed |
| #2 | Tank | getWorkforceExposure() + dashboard stat (31.3% U.S. workforce in high AI-exposure roles; 43.97M/140.5M) | 2a4c5d1 | ✅ Closed |
| #3 | Tank + Switch | IMF AI Preparedness readiness layer (178 countries incl China 0.64/Singapore 0.80; 3rd world-map toggle 'AI readiness'; indicator AI_PI) | 3e8f9g2 + e976e14 | ✅ Closed |
| #4 | Tank + Neo | GenAI-diffusion trend (retain 3 Microsoft AIEI periods; diffusionTrend/diffusionDelta/getDiffusionRisers(); /global 'fastest-rising adopters' S.Korea +11.2pp, UAE +10.7pp, France +6.9pp + sparklines + per-country trend detail modal) | e976e14 | ✅ Closed |
| #5 | Neo | Country drill-down (CountryDetailPanel modal from rankings + 195-country selector; keyboard accessible; flags, all metrics, China proxies) | e976e14 | ✅ Closed |
| #6 | Switch | Performance: world geometry moved from JS bundle (412KB) to static asset; /global JS no longer embeds geometry | 9m8n9op | ✅ Closed |

**Validation (all):**
- `npm run build` → exit 0 (798 static pages)
- `npx eslint lib scripts components` → exit 0
- 27/27 vitest pass
- All commits pushed to origin/main; all 6 issues closed via 'Closes #N' trailer

---

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
