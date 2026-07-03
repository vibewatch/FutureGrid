# Mouse History

## 2026-07-02: AI Frontier QA
- Built tests/ai-frontier.test.ts (23 test cases)
- Validated data format, chart prep, leaderboards, hero cards, edge cases
- Removed zoomHint dead key
- Verified static-export safety
- Full validation: 217/217 tests PASS, 0 lint, build OK
- Feature shipped as PR #45 (merged to main, 2026-07-02)
2026-07-03T00:45:00 - Added tests for job-postings and data schema coverage (tests/job-postings.test.ts, tests/data-schema.test.ts). Validation passed during merge.
2026-07-03T05:12Z — Added projection-enrichment test coverage only in tests/data-schema.test.ts, tests/data.test.ts, tests/snapshot.test.ts, and tests/components/PredictiveChart.test.tsx. Left existing untracked data/bls-emp-proj.xlsx untouched. Validation: npm run test:run -- tests/data-schema.test.ts tests/data.test.ts tests/snapshot.test.ts tests/components/PredictiveChart.test.tsx (pass).

2026-07-03: Added tests for the employment projections data schema, helpers, and visualization rendering. (See decisions/decisions.md)
