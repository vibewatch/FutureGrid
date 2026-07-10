# Tank History

## 2026-07-02: AI Frontier Data Pipeline
- Consumed Epoch AI "Notable AI Models" (1033 models, CC BY)
- Built data/ai-frontier.json (528 compute+date models, 215 power, 179 cost, 101 countries)
- Built lib/ai-frontier.ts (TypeScript exports, helpers)
- Normalized country dedup, co-attribution, blank orgs, short names
- Revision: nullable regression types, hardened normalizeCountries comma-split
- Feature shipped as PR #45 (merged to main, 2026-07-02)
2026-07-03T00:40:00 - Implemented job-postings pipeline components (build:job-postings, scripts/build-job-postings.mjs, data/job-postings.json, lib/job-postings.ts); tests added by Mouse. Reviewed and validated by Coordinator.

2026-07-03: Implemented employment-projections dataset and library helpers for visualization consumption. (See decisions/decisions.md)


2026-07-03: Implemented readiness-gap data helper and tests using tie-aware percentile ranks from `getCountryMapData()` (`diffusionPct` vs `aiReadiness`), fixed ±15 gap thresholds, and excluded `usageIndex` from scoring. (See decisions.md)


2026-07-03T10:19:02.301+00:00 - Implemented the SOC-union Talent Bottleneck data helper/tests joining H-1B, projections, postings, and occupation snapshots; scoring decision merged into decisions.md.


2026-07-03T11:59:08.288+00:00 - Implemented OpenRouter model dataset generation (`build:openrouter-models`) using public `/api/v1/models` plus endpoint details, with validation, tests, provenance, and snapshot `data/openrouter-models.json` (340 models, 878 endpoints). Decision merged into decisions.md.


2026-07-03T12:48:40.595+00:00 - Implemented OpenRouter country footprint helpers (`lib/openrouter-provider-geography.ts`, `lib/openrouter-country-activity.ts`) with separate publisher and endpoint-provider lenses, recent model windowing, unknown-provider surfacing, and tests.


2026-07-03T13:23:16.634+00:00 - Implemented AI company stock data/build layer (`build:ai-company-stocks`, `data/ai-company-stocks.json`, `lib/ai-company-stocks.ts`) with Alpha Vantage when keyed, deterministic fixture fallback, validation, tests, and provenance for 22 companies plus 3 benchmarks. Decision merged into decisions.md.


2026-07-03T19:44:32.001+00:00 - Expanded AI company stock coverage to 47 companies and 7 categories by updating `scripts/build-ai-company-stocks.mjs`, `data/ai-company-stocks.json`, `data/provenance.json`, and tests; added 25 AI-related tickers and PSTG source-symbol caveat.


2026-07-03T21:27:13.860+00:00 - Mapped mined-dataset join keys and derived metrics across SOC, country, state, ticker/category, and time; highlighted Country AI Ecosystem, SOC talent bottleneck, market breadth, state stress, and demand/disruption pulse opportunities.

### 2026-07-03T22:49:27.110+00:00 — Review cycle and queue handoff
- Completed 4 of 20 squad review rounds; consolidated backlog now tracks #73-#84 with squad owner labels.
- Validated and merged #73/#75/#74 through PRs #85/#86/#87; remaining execution queue is #76-#84 from main c4d84fa.

### 2026-07-05T22:02:38.948+00:00 — GitHub Actions failure fixes
- Investigated failing post-merge GitHub Actions and fixed the missing CHANGELOG release gate, axe accessibility failures, and invalid SVG role. PR #89 merged to main; post-merge CI, Squad Release, and Pages deploy were green.

### 2026-07-05T22:47:39.971+00:00 — Dead legacy code cleanup
- Removed unused legacy modules under `lib/automation`, `lib/bls`, `lib/oecd`, and `lib/onet`, unused default SVG assets, and obsolete `scripts/extend-oews-history.mjs`. Coordinator validated build, lint, and tests; PR #90 merged to main.

### 2026-07-06T03:44:30.653+00:00 — ORS automation-friction implementation
- Implemented the ORS automation-friction seed dataset, build script, library helpers, career evidence UI integration, provenance/source/download/compliance wiring, and tests.
- Work shipped through PR #100 after reviewer caveat and Methodology-download fixes.

### 2026-07-07T01:48:47.300+00:00 — Career projection fallback fix
- Diagnosed missing Employment Projections on `/careers/15-1251` as a chart filter issue: annual openings were unavailable even though projected employment existed.
- Implemented fallback to show explicitly labeled projected 2034 employment while preserving null openings provenance; PR #101 merged to main.
