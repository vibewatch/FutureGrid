# Tank History

## 2026-07-02: AI Frontier Data Pipeline
- Consumed Epoch AI "Notable AI Models" (1033 models, CC BY)
- Built data/ai-frontier.json (528 compute+date models, 215 power, 179 cost, 101 countries)
- Built lib/ai-frontier.ts (TypeScript exports, helpers)
- Normalized country dedup, co-attribution, blank orgs, short names
- Revision: nullable regression types, hardened normalizeCountries comma-split
- Feature shipped as PR #45 (merged to main, 2026-07-02)
