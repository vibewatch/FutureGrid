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
