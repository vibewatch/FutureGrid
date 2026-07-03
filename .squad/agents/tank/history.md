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
