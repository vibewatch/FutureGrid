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


2026-07-03T19:44:32.001+00:00 - Validated AI stock expansion: builder, provenance, targeted tests (3 files / 71 tests), lint, exact test run, and production build with 806 static pages all passed; unrelated WARN timeout flake noted as not watchlist-caused.


2026-07-03T21:27:13.860+00:00 - Approved AI Pressure Synthesis after targeted synthesis lens tests, eslint, and `npm run build` passed; code review found no blocking issues. No commit requested or made.

### 2026-07-03T22:49:27.110+00:00 — Review cycle and queue handoff
- Completed 4 of 20 squad review rounds; consolidated issue backlog #73-#84 was created for follow-on feature, improvement, and bug work.
- #73, #75, and #74 have landed on main via PRs #85, #86, and #87; continue with #76-#84 from main c4d84fa.


### 2026-07-04T12:23:54.134+00:00 — IA refactor validation
- Approved the navigation/discovery IA refactor after targeted CommandPalette/DashboardHome tests, `npm run lint`, and `npm run build` passed.
- Confirmed Neo's CommandItem union-risk fix unblocked the production build; no commit requested or made.

### 2026-07-05T22:02:38.948+00:00 — Action validation mapping
- Independently mapped the GitHub Actions failures to validation coverage for the CHANGELOG release gate, accessibility axe checks, and SVG role fix. PR #89 merged with post-merge workflows green.

### 2026-07-06T03:44:30.653+00:00 — ORS automation-friction validation
- Validated the ORS automation-friction work with targeted tests, lint, build, full test suite, and a11y checks.
- Final revision was approved and merged via PR #100.

### 2026-07-07T01:48:47.300+00:00 — Career projection fallback validation
- Validated the `/careers/15-1251` fix with targeted tests, lint, typecheck, build, static page generation, and content checks for AI Exposure plus BLS Employment Projections employment change.
- Confirmed full validation before PR #101 was merged to main.

### 2026-07-10T08:49:00.000+00:00 — Exposure → Outcome Matrix test coverage (issue #105)
- Created 3 new test files in worktree `squad/105-exposure-outcome-matrix`:
  - `tests/exposure-outcome.test.ts`: 49 tests for Tank's `getExposureOutcomeMatrix()` helper — SOC sort determinism, source-helper cross-validation, gap invariant, bounds, counts, correlations, explicit null dependencies, fresh immutability, methodology/caveats. All 49 pass immediately.
  - `tests/components/ExposureOutcomeMatrix.test.tsx`: 18 spec-blocker tests for the client component — file existence, "use client" guard, no runtime import of server helper, y-axis toggle, accessible sr-only fallback, non-color labels, career links, null-outcome crash guard, methodology caveat, employment sizing label, no causal language. 17 pass (guards skip); 1 spec-blocker fails (component not yet created).
  - `tests/analysis-architecture.test.ts`: 21 source-text architecture tests — server-only guard, page wiring forward gates, InsightsView isolation, ExposureLensComparison/EvidenceStack continuity, lib/analysis.ts exports continuity. 16 pass; 5 forward-gate failures.
- ChartA11y.test.tsx NOT modified — AISignalScatter still in InsightsView (not deleted).
- Full suite: 71 files / 751 tests; 6 intended forward-gate failures; lint exit 0.
- Blockers for Neo: create `components/insights/ExposureOutcomeMatrix.tsx`, wire `app/analysis/page.tsx`.


### 2026-07-10T09:40:05Z — Issues #103/#104/#105 shipped; bundle-regression guard & architecture validation

**Issue #103: Evidence Convergence Strip (PR #106 merged)**
- Built & validated component tests (e11y coverage, snapshot stability, edge cases)
- Tests: 587 pass, build + lint + a11y clean
- No rejection cycles

**Issue #104: Reskilling Bridge (PR #107 merged, 3-cycle strict-lockout → shipped)**
- Built component tests covering canonical join, responsive grid, valid SOC links
- Validated v1 (650/650 tests, build, a11y)
- Validated v1 (650/650 tests, build, a11y) 
- Validated v3 post-lockout (650/650 tests, full a11y 7-routes clean)
- **Bundle retrospective:** Turbopack check:bundle FAIL (905.1KB > 700KB). Root cause: client page (`app/skills/page.tsx`) imported `getReskillingBridgeData()` → transitively bundled raw h1b/job-postings/projections JSON (1.8MB total) for 41KB output. Neo refactored to server/client split; Tank added server-only guards. Final: 394.1KB (< 700KB).
- **Guard Assigned:** Bundle-regression guard — prevent raw JSON imports in client components during future work
- Final tests: 663 pass, bundle 394.1KB
- Learning: Bundle regression guard must catch transitive raw-data imports; real Turbopack build (not mock) is required for accuracy. CI `check:bundle` exists and is effective.

**Issue #105: Exposure→Outcome Matrix (PR #108 merged, post-rejection work pending)**
- Built 49 tests for data helper (determinism, bounds, nulls, correlations)
- Built 18 component spec-blocker tests (a11y guards, server-only validation, i18n wiring)
- Built 21 architecture tests (server-only boundaries, page/lens integration, continuity)
- Full suite: 751 tests pass, bundle 394.1KB, lint clean
- Trinity rejection (committed): hardcoded i18n, nested-interactive SVG a11y, dead test-reference cleanup
- Locked out for: dead-reference cleanup (Mouse artifact owner for deletion)
  - `tests/components/EvidenceConvergenceStrip.test.tsx:58` (vi.mock of deleted AISignalScatter)
  - `tests/components/EvidenceStack.test.tsx:34` (stale marker)
  - `tests/analysis-architecture.test.ts:235` (stale comment)
- Learning: Test mocks + markers referencing deleted components must be atomically removed by the deletion artifact owner, not left as stale references. Dead-code cleanup in tests is not optional follow-up.

### 2026-07-11T02:29Z — International Occupation Mix test coverage (issue #111)

**Task:** Add comprehensive data-pipeline, helper, architecture, component/integration, i18n, and accessibility tests for the international occupation mix feature.

**Created:** `tests/international-occupation-mix.test.ts` — 252 tests in 22 describe groups.

**Coverage delivered:**
- **Data snapshot (groups 1–8):** top-level structure, ILOSTAT/national-survey source contract (EMP_TEMP_SEX_OCU_NB, DF_EMP_TEMP_SEX_OCU_NB, CC BY 4.0), included set (9 countries: AUS DEU ESP FRA GBR ITA KOR NLD USA), excluded set (CAN/JPN with explicit reasons), per-country 9 ISCO-08 groups (no zero-fill, no imputation status "I"), year/coverage window, shares sum 1±0.005, dissimilarity (symmetric, range [0,1], descriptive note)
- **Builder source contract (group 9):** EMP_TEMP_SEX_OCU_NB national-survey indicator, buildMeta import, validateInternationalOccupationMix() before writeFileSync, fail-loud on HTTP/empty/zero-row errors, Accept-Language header, no secrets
- **Helper (groups 10–13):** server-only guard, exported function list, compact payload (status/notes/coverage fields, no totalEmployment), fresh immutable results, dissimilarity symmetric/null-for-excluded/range/sorted
- **Architecture (groups 14–17):** server page imports and calls getOccupationMixSlim(), passes to GlobalView, no raw JSON; GlobalView has occupationMix prop + renders InternationalOccupationMixSection, no runtime server-helper import; Section "use client", attribution/ILO link, excluded reasons, year/coverage in drilldown, no AI score/wage/totalEmployment; Chart "use client", visible complete table, sr-only equivalent, dissimilarity descriptive framing
- **i18n (groups 18–19):** 23 workforceEyebrow/workforceDrilldown/etc. keys + 16 intlOccMix* keys checked present in EN and ZH with no empty values; EN/ZH key-set parity
- **Provenance/source/compliance (groups 20–21):** provenance entry, correct file reference, ILO source, sources.json entry, COMPLIANCE.md entry with CC BY 4.0, build-downloads.mjs wiring
- **a11y (group 22):** /global in ROUTES exactly once

**Validation results:**
- Targeted: 252/252 tests pass
- Full suite: 1098 tests pass (76 files), 0 regressions
- No forward-gate failures — entire implementation is wired in this worktree

**No blockers found.** All pipeline/provenance/compliance wiring is present.
**Commit:** `e01b95e` on `squad/111-international-occupation-mix`


### Mouse: Reviewer Gate — Consumer GenAI Diffusion (Batch 2026-07-11)
- Rejected initial PR #115 due to duplicate SR naming ambiguity in chart accessibility
- Enforced test validity: false shared-scale test prevented merge until geometry proof added
- Approved Trinity's revised implementation; no further rejections
- Locked out from revision artifacts (conflict-of-interest isolation protocol)



### Scribe Orchestration — PR #120 Cycle (2026-07-12T14:24:27Z)

**Session:** Provenance Registry & Localized Guardrails — Cycle Complete  
**Scope:** Per-lane synthesis provenance (Tank backend), localized GuardrailBadge UI (Neo), full suite validation (Mouse), architecture review (Trinity), i18n compliance (Rai), independent revisions (Switch)

**Mouse Role Retrospective:**
- QA validation: 1,256 tests passed across full suite
- 806 pages scanned for a11y compliance
- Largest bundle chunk 394.6 KB (within budget)
- Zero serious/critical a11y violations detected
- Accessibility gate: standard + focused runs all green
- Approval gates: typecheck, lint, bundle, test, a11y all satisfied

**Approval & Closure:** PR #120 merged as 78154f20575df26f5b8867b70bb6ce3009c46993; issues #77/#119 closed


## 2026-07-14 — Weekly Cycle: Test Validation & Deterministic Gates

### Never Include Credential-Degrading Data in Approved PRs
**Incident:** PR #121 stripped credential-dependent data paths. Mouse validation found WI loss + occupation-snapshot degradation. Rejected.

**Learning:** Test validation must verify that no credential-dependent builders or data access is removed or degraded. Preserve last-known-good credential lanes across all refresh cycles.

**Application:** PR #124 validation confirmed credential lanes preserved. Post-merge CI verified no data loss.

### Test Side Effects (Self-Healing) Can Hide First-Run Failures
**Incident:** PR #124 Yahoo-bootstrap metadata passed on second run (fixture-origin self-healed). First run failed but not discovered until Mouse reviewed.

**Learning:** When tests self-heal, failures are masked. Require deterministic, non-self-healing fixtures. Regression tests must fail first-run and document the fix, not silently recover.

**Application:** PR #125 added non-self-healing regression test. Test matrix now validates deterministic behavior across:
- Offline rebuild without fixture recovery
- Fixture-origin metadata committed and verified
- No self-healing paths active

### Full In-Job Test Gates for Bot PRs
**Incident:** Workflow runs 29304395231 (YAML) and 29305255883 (HTTP 417) showed issues post-commit.

**Learning:** Bot PRs must gate all validation in-job before PR creation: lint → tests → build → commit → then PR. Prevents half-working states from reaching reviewer.

**Application:** PR #125 workflow enforces full gates before PR creation. Workflow run 29308171731 validated all 17 refresh steps + lint + 1321 tests + build before commit/push/PR.

### Regression Test Coverage Patterns
**Test scope expanded:**
- Offline rebuild durability (fixture-origin preservation)
- Credential lane preservation (no data loss)
- Deterministic sorting/ordering (no flaky tests)
- Boundary/range validation (date fields, nullability)

**Results:** PR #125 added 1 regression test; total 1321 tests pass (including 17 refresh cycle tests).

