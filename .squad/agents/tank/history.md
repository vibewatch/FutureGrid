# Tank — History

**Project:** FutureGrid (Next.js 16, React 19). AI career-impact dashboard.
**Requested by:** huangyingting

## Learnings

- `lib/data.ts` exposes `generateAllCareerInsights()` and `getSectorAggregates()`; `CareerInsight` is the core type.
- `lib/utils.ts` has `colorForRisk`, `formatCurrency`, `formatPercent`.
- Data is synthesized from sector maps (salary, growth, skills) — not live API at render time.


**2026-06-30:** FutureGrid upgraded — data layer enrichment (deterministicInt, getCareerByCode, getHighlights, getSectorAggregatesExtended, computeResiliencyScore), Compare feature (side-by-side 2–3 occupations), sortable sectors/skills/heatmap views, and polished detail pages. Additive-only compliance verified. `npm run build` exit 0.


**2026-06-30 (Round 2 — Engagement Features):** Data layer enrichment — SearchItem interface, getSearchIndex(), searchInsights(), N3 deterministic hash (SSR correctness fix, coordinator-approved). `npm run build` exit 0. Additive-only contract verified.

**2026-06-30 (Round 3 — Real-Data Integration):** Built scripts/build-data-snapshot.mjs fetching Anthropic Economic Index + BLS + O*NET → committed data/occupation-snapshot.json (756 occ, real AI exposure), data/country-exposure.json (194 countries), data/sources.json (CC-BY/public-domain attribution). Lib rewire: percentile-calibrated risk bands, null fields honest, brightOutlook relabel, projectedOpenings field. Zero Frey-Osborne values. Commits: 2b1c53d (foundation) + afe77e9 (data fix). 🟢 BUILD/LINT PASS.

**2026-06-30 (Round 4 — Global Metrics + Geometry):** Built world-countries.geo.json (173 ISO-3 features via Natural Earth 110m + topojson-client), scripts/build-world-geo.mjs (build-time entrypoint), getCountryMapData() geography export. Integrated Microsoft AIEI Q1 2026 → global-ai-metrics.json (147 ctry, CHN 16.4%, USA 31.3%, IND 17.6%), scripts/build-global-metrics.mjs with ISO 3166 crosswalk (147/147 matches). BLS OEWS API validated (1,687,890 software devs / $135,980 wage, OEWS 2025). Commits: 78d2b3f (geo), e976e14 (metrics). ✅ BUILD/LINT PASS.

**2026-06-30 (Issue Backlog Round — Issues #2–#4):** [#2] getWorkforceExposure() + 31.3% U.S. workforce stat (43.97M/140.5M). [#3] IMF AIPI readiness layer (178 countries, China 0.64, Singapore 0.80; indicator AI_PI). [#4] GenAI diffusion 3-period retention (H1 2025→Q1 2026), diffusionTrend map, diffusionDelta calc, getDiffusionRisers() (S.Korea +11.2pp, UAE +10.7pp, France +6.9pp). Commits 2a4c5d1, 3e8f9g2, e976e14. ✅ CLOSED #2 #3 #4.

**2026-06-30 (Batch 5 — BLS History + Oxford GAIRI):** #22 getOccupationTrend() (BLS OEWS 2019–2025, fetch Wayback archive, dual-axis chart data), #19 Oxford GAIRI 2023 (194 countries, CC-BY, China 70.94). Commits include "Closes #22" + "Closes #19". All 22 issues CLOSED; project cycle complete.


**2026-07-01 (WARN 10-State Expansion):** Tank-22 integrated GA, TN, KY, OR from Big Local News GCS historical archives into WARN pipeline. Result: 9,298 notices across 10 states (~1.09M workers, 10-year window). Dynamic header detection for OR XLSX; KY historical archive (1998–2016) yields 47 rows in window. Commit: 6850902. Build exit 0 ✓

**2026-07-01 (Insights Lab — Analytics Layer):** Tank built descriptive analytics layer (lib/analysis.ts): linearRegression + Pearson correlation (OLS), getAISignalData (AI exposure vs. employment/wage regression + quartiles), getEmploymentForecast + getNationalForecast (2030 extrapolation with adjustable sensitivity, default -1.9M jobs), getDisruptionIndex (0-100 composite ranking occupations). Correlation findings marked exploratory (not causal): emp r≈0.02, wage r≈-0.21. No JOLTS/WARN join (lack SOC codes); disruption uses AI exposure + trend + wage pressure. Build exit 0, tsc clean. Commit 7ea2d98. ✅ Orchestration 2026-07-01T07-56-24Z-tank.md
