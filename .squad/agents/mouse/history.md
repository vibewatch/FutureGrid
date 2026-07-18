# Mouse History

## Summarized through 2026-07-18T03:20:59.028+00:00 by Scribe

Mouse is FutureGrid's QA/test specialist. Durable QA patterns:

- Derive expected values from source selectors/data, never from hardcoded fixtures that can self-heal or mask regressions.
- Use real builds/exports for bundle and route-count claims; stale artifacts are not evidence.
- Run full Playwright after UI/a11y fixes because single-viewport checks can miss cross-viewport failures.
- Enforce strict-lockout: the original author of a rejected artifact cannot revise it; assign independent owners and re-review.
- For visual redesigns, pair positive semantic assertions with negative guards (`no canvas`, `no role=img`, no focusable decorative descendants, no forbidden framing copy).
- For runtime-fetch removal, render without a fetch stub and assert a fetch spy is never called.
- Keep Node 20 compatibility in tests; avoid ES2024-only APIs such as `Object.groupBy`.

## Chronology

### 2026-07-02 to 2026-07-11 — Baseline QA lifecycle
Validated AI Frontier, Talent Bottleneck, Evidence Convergence, Reskilling Bridge, Exposure-Outcome Matrix, International Occupation Mix, Wage-Tier Polarization, and Consumer GenAI Diffusion. Maintained clean typecheck/lint/build gates, bundle budget discipline, and a11y compliance. Key lessons: deterministic tests, no self-healing fixtures, server-only boundaries, and strict-lockout enforcement.

### 2026-07-14 — Release recovery and rebase conflict gate
Rejected release readiness while a detached-head rebase and conflict markers remained in `SPRINT_SUMMARY.txt`, despite passing build/lint/tests. Later approved Trinity's independent conflict-marker resolution. Learning: release gates must include git state and conflict-marker checks, not just tests.

### 2026-07-16 — Full-site Playwright and data audit
Ran comprehensive Playwright baseline and post-fix audits for 791 routes across mobile/desktop/tablet. Baseline found 13 failures; post-fix validation passed 1,674/1,674 tasks. Added/updated coverage for hydration, wage, Job Zone, accessibility, and missing-data localization.

### 2026-07-17 — AI Frontier methodology release / PR #129
QA gate found docs trailing whitespace via `git diff --check`, triggering strict-lockout and independent Neo docs revision. Re-verified clean lint/build/tests after revision and approved release. Learning: docs defects in authored artifacts still require independent remediation after lockout.

### 2026-07-18T01:47Z — AI Frontier UI enhancement / PR #130
Added 35 deterministic tests for geo selectors/coverage, map WCAG guards, compute-envelope sr-only coverage, hero sparklines, and i18n parity. Suite grew 1,559 → 1,594 and QA verdict was APPROVE. For runtime d3 maps, mock `fetch` with the real GeoJSON fixture and derive counts from selectors.

### 2026-07-18T02:55Z — FrontierLeadersChart redesign / PR #131
Expanded `FrontierLeadersChart` tests by 22 cases after Chart.js was replaced with a semantic rows-as-bars table. Guards covered no canvas/`role=img`, accessible table structure, aria-hidden decorative bars/chips, all six metric controls, point-of-use caveats, flags/monograms, largestRun behavior, reduced motion, and no podium/winner copy. Suite passed 1,616 tests.

### 2026-07-18T03:20:59.028+00:00 — Frontier Origins treemap QA / PR #132
Migrated stale `FrontierOriginsMap` tests to `FrontierOriginsTreemap`, retargeted `map*` i18n assertions to `origins*`, and added selector/component guards: 34 origins, Multinational excluded, Singapore/Hong Kong included, exact fair-metric key shape with compute/frontier fields absent, no GeoJSON fetch, no canvas/`role=img`, aria-hidden SVG, semantic Country/Records/Share % table, fair-metrics-only controls, point-of-use notes, reduced-motion handling, and no ranking/supremacy framing. Suite passed 1,631 tests across 88 files. PR #132 merged as 758b351.


### 2026-07-18T04:58Z — docs/testing.md all-system audit / reconciliation (docs-only)
Audited `docs/testing.md` (I own it) against the CURRENT suite/config for the "update docs for all system" pass. Verified authoritative counts by running `npm run test:run`: **1631 tests passing across 88 test files** (47 `*.test.tsx` component files + `tests/components/utils.test.ts` + unit suites). `git diff --check` clean; only `docs/testing.md` changed by me.

Verdict: **UPDATED-with-changes**. Fixes applied (surgical, no rewrite):
- Bumped Last updated 2026-07-11 → 2026-07-18.
- Fixed stale cross-ref "see §9 CI Ordering" → "§12" (§9 is Accessibility Checks).
- Removed stale `SkillTransitionChart` references in §9 (ChartA11y) and §13 (determinism) — that component/test no longer exists. ChartA11y actual scope: AccessibleChart, CareerTrendChart, JobImpactChart, PredictiveChart (verified imports).
- Added the real `server-only` → `tests/__mocks__/server-only.ts` alias to the §4 vitest config (was omitted).
- Added §6 "D3 / SVG chart & map patterns in jsdom" documenting established patterns verified in code: fetch mock for `world-countries.geo.json` (WorldChoropleth), `SVGPathElement.getTotalLength` polyfill (ComputeTimelineChart), negative regression guards (no canvas / no role=img / aria-hidden SVG), and no-fetch spy (FrontierOriginsTreemap).
- Added §8 "AI Frontier test suite" subsection: `tests/ai-frontier.test.ts` (24 describe blocks, 175 `it` cases) + frontier component tests — previously entirely undocumented.
- Added a qualitative scale note in §2 (88 files / 1,600+ cases; `npm run test:run` is source of truth) since the doc had no total.

Evidence: FrontierOriginsMap.test.tsx confirmed DELETED; FrontierOriginsTreemap.test.tsx NEW. ai-frontier.test.ts = 24 describes / 175 cases. a11y & smoke route lists in doc still match scripts exactly. Node 20 CI confirmed; no ES2024 guidance added. Flagged for coordinator: no new-doc/create-delete recommendation (see decisions/inbox/mouse-docs-allsystem.md).

### 2026-07-18T20:30Z — System-wide docs reconciliation shipped (PR #133)

**Team update (Scribe-logged):** PR #133 reconciled the full `docs/` set to current code and squash-merged to main as **7a6a876**. Mouse updated docs/testing.md — verified **1631 tests passing across 88 test files**; fixed §-cross-refs, removed stale `SkillTransitionChart` a11y/determinism bullets, added the `server-only` mock resolve alias, a D3/SVG-in-jsdom patterns subsection, and an AI Frontier test-suite subsection. Team totals: 15 docs updated, 4 verified accurate.
