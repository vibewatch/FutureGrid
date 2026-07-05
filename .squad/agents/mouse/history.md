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


2026-07-03: Validated readiness-gap work: targeted tests passed (2 files / 10 tests), lint exit 0, full tests passed (45 files / 480 tests), and build passed with 806 static pages. (See decisions.md)

## 2026-07-03T10:43Z Final revalidation — H-1B CAGR display
Requested by huangyingting after Switch fix. No code edits.

Commands:
1. `npm run test:run -- tests/talent-bottleneck.test.ts tests/components/TalentBottleneckLens.test.tsx` — PASS, exit 0; Test Files 2 passed (2), Tests 9 passed (9), Duration 2.62s.
2. `npm run test:run -- tests/readiness-gap.test.ts tests/components/ReadinessGapLens.test.tsx tests/talent-bottleneck.test.ts tests/components/TalentBottleneckLens.test.tsx` — PASS, exit 0; Test Files 4 passed (4), Tests 19 passed (19), Duration 4.01s.
3. `npm run lint` — PASS, exit 0.
4. `npm run test:run` — PASS, exit 0; observed full-suite summary on re-run: Test Files 47 passed (47), Tests 489 passed (489), Duration 39.54s.
5. `npm run build` — PASS, exit 0; prebuild copied 13 files, Next.js 16.2.9 compiled successfully, TypeScript finished, generated 806/806 static pages.

Regression coverage verified: `tests/components/TalentBottleneckLens.test.tsx` asserts fixture `h1bCagr` is `0.042`, rendered page text contains `Top row H-1B CAGR: Software Developers: +4.2%`, and does not contain `Software Developers: +0.0%`. `tests/talent-bottleneck.test.ts` also asserts H-1B CAGR stays as decimal fraction for scoring (`0.0572`). Verdict: PASS / no findings.


2026-07-03T10:19:02.301+00:00 - Final validation passed for Talent Bottleneck Lens: targeted talent and lens tests, lint, full 47-file/489-test suite, and production build with 806 static pages.


2026-07-03T11:59:08.288+00:00 - Validated OpenRouter model data work: `npm run build:openrouter-models`, `npm run build:provenance`, targeted tests 59/59, lint, full tests, and production build with 806 pages all passed.


2026-07-03T12:48:40.595+00:00 - Final validation passed for OpenRouter AI Model Ecosystem Footprint: targeted OpenRouter tests (3 files / 11 tests), readiness + country tests (4 files / 18 tests), lint, full tests (50 files / 503 tests), and production build with 806 static pages.


2026-07-03T13:23:16.634+00:00 - Final validation passed for AI Company Stock Lens: builder, provenance, targeted tests (3 files / 69 tests), lint, full tests (52 files / 516 tests), and production build with 806 static pages.


2026-07-03T19:44:32.001+00:00 - Validated AI stock expansion: builder, provenance, targeted tests (3 files / 71 tests), lint, full exact test run, and production build with 806 static pages all passed; unrelated WARN timeout flake noted as not watchlist-caused.


2026-07-03T21:27:13.860+00:00 - Approved AI Pressure Synthesis after targeted synthesis lens tests, eslint, and `npm run build` passed; code review found no blocking issues. No commit requested or made.

### 2026-07-03T22:49:27.110+00:00 — Review cycle and queue handoff
- Completed 4 of 20 squad review rounds; consolidated issue backlog #73-#84 was created for follow-on feature, improvement, and bug work.
- #73, #75, and #74 have landed on main via PRs #85, #86, and #87; continue with #76-#84 from main c4d84fa.


### 2026-07-04T12:23:54.134+00:00 — IA refactor validation
- Approved the navigation/discovery IA refactor after targeted CommandPalette/DashboardHome tests, `npm run lint`, and `npm run build` passed.
- Confirmed Neo's CommandItem union-risk fix unblocked the production build; no commit requested or made.
