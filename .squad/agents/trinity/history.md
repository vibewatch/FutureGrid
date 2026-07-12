# Trinity History

## 2026-07-02: AI Frontier Code Review
- Reviewed OLS math, regression types, i18n parity, null safety
- Found 4 non-blocking issues: nullable types, hero stats drift, comma-split, dead keys
- Coordinator visual QA caught "Largest training run" card mismatch (displayed wrong model)
- All issues fixed post-revision, re-validated 217/217 tests, 0 lint
- Verdict: ✅ APPROVE
- Feature shipped as PR #45 (merged to main, 2026-07-02)
2026-07-03T00:39:00 - Submitted decision: Use a proxy-first job-demand layer now; reserve provider-backed historical postings adapter for licensed data later. (Merged into squad decisions.)

2026-07-03: Decision: Prioritize BLS Employment Projections as first enrichment; recommended /analysis placement and visualization guidance. (See decisions/decisions.md)


2026-07-03: Selected fresh Global Adoption–Readiness Gap Lens scope for `/global`, avoiding duplicate `/analysis` forecast/regression work; final review verdict: ✅ APPROVE. (See decisions.md)


2026-07-03T10:19:02.301+00:00 - Final-approved the H-1B Talent Bottleneck Lens for `/visa` after Switch's CAGR display correction and Mouse's full validation. Decision merged into decisions.md.


2026-07-03T11:59:08.288+00:00 - Planned and final-approved safe OpenRouter model data collection via official public APIs only; excluded `#activity` scraping, account analytics, API keys, and private endpoints. Mouse validation passed; decision merged into decisions.md.


2026-07-03T12:48:40.595+00:00 - Scoped and final-approved the `/global` AI Model Ecosystem Footprint lens as an OpenRouter catalog/provider country proxy, not usage/adoption/traffic analytics. Mouse validation passed; decision merged into decisions.md.


2026-07-03T13:23:16.634+00:00 - Planned and final-approved the finance-safe `/analysis` AI Company Stock Lens: descriptive adjusted-close historical signals only, no advice/recommendations/forecasts, approved after the sparse-period return fix and Mouse validation. Decision merged into decisions.md.


2026-07-03T19:44:32.001+00:00 - Planned and final-approved the AI Company Stock Lens coverage expansion across semis/equipment/EDA, AI cloud/platforms, enterprise/data AI software, data-center/power/networking, and AI memory/interconnect/storage. Decision merged into decisions.md.


2026-07-03T21:27:13.860+00:00 - Recommended mined-dataset product directions: Career Evidence Passport, AI Opportunity Radar, and Global AI Ecosystem Map; set Career Evidence Passport as first major future build while accepting `/analysis` AI Pressure Synthesis as the immediate MVP.

### 2026-07-03T22:49:27.110+00:00 — Review cycle and queue handoff
- Completed 4 of 20 squad review rounds; findings were consolidated into GitHub issues #73-#84 with owner labels.
- First tranche merged: #73 via PR #85, #75 via PR #86, #74 via PR #87; main synced to c4d84fa, with #76-#84 remaining open.


### 2026-07-04T12:23:54.134+00:00 — IA refactor review direction
- Recommended preserving existing URLs for the first information-architecture refactor and improving navigation/discovery around user journeys instead of route moves.
- Final decision recorded after Sidebar taxonomy, DashboardHome lens cards, CommandPalette grouping, i18n, and validation passed.

### 2026-07-05T22:02:38.948+00:00 — Action fix review
- Reviewed the working tree diff for the GitHub Actions failure fixes and found no blockers. PR #89 merged to main; post-merge CI, Squad Release, and Pages deploy were green.

### 2026-07-05T22:47:39.971+00:00 — Dead legacy code cleanup review
- Audited dead/legacy code and recommended safe cleanup targets. Reviewed Tank's cleanup diff and found no blockers; PR #90 merged to main after build, lint, and test validation.

### 2026-07-06T03:44:30.653+00:00 — ORS automation-friction review
- Selected BLS ORS as the best data enhancement for a SOC-keyed job-requirements / automation-friction axis.
- Rejected the first implementation for overclaiming seed data as direct ORS survey estimates and missing Methodology download discoverability; approved after Rai's caveat/download revision and PR #100 merged.

### 2026-07-07T01:48:47.300+00:00 — Career projection fallback review
- Approved the PredictiveChart fallback after confirming it labels projected 2034 employment clearly and does not imply annual openings are known.
- PR #101 merged to main after CI passed.


### 2026-07-10T07:13:00Z — Re-review #104 Reskilling Bridge (post strict-lockout revisions)
- Verified v1 blockers cleared: SkillTransitionChart deleted (no prod/test import); a11ySkillTransition* keys + ChartA11y block removed atomically; focus model now single valid roving-tabindex (no aria-activedescendant); eyebrow/title distinct with EN/ZH parity; unused test imports gone without weakening.
- Gates: typecheck/lint clean, 650/650 tests pass, webpack build (symlink workaround) 806 static pages incl. static /skills, standard check:a11y 7 routes clean.
- ❌ REJECT — two remaining blockers found by re-review:
  - CRITICAL a11y: /skills-focused check:a11y fails aria-required-children — ReskillingBridge role="listbox" owns non-option div children (header + aria-atomic scroll wrapper). Owner: Tank (Neo+Switch locked out of component).
  - Deletion completeness: dead SkillTransitionChart i18n keys (section*/tooltip*) remain in en+zh charts.ts. Owner: Switch (Neo+Mouse+Tank locked out of deletion).
- Clean Tank↔Switch swap under per-artifact lockout; Neo test-cleanup artifact approved. Verdict persisted to decisions inbox.
### 2026-07-10T07:40:00Z — Final APPROVE #104 Reskilling Bridge (3rd-cycle strict review)
- Both v2 blockers cleared under per-artifact lockout swap: Tank moved listbox semantics (header now sibling outside `role="listbox"`; listbox directly owns `role="option"` buttons; roving tabindex/keyboard/click preserved; no aria-activedescendant); Switch removed the 5 residual dead SkillTransitionChart `section*/tooltip*` keys + orphaned comment atomically from en+zh charts.ts.
- Re-confirmed intact: canonical SOC join, explicit nulls, proxy provenance/caveats, EN/ZH parity (charts 148/148, skills 84/84), responsive grid, valid `/careers/<soc>` links; full deletion of SkillTransitionChart component/test-block/imports.
- Gates: typecheck 0, lint 0, test:run 650/650, `next build --webpack` 806 static pages (/skills static), standard check:a11y 7 routes 0 crit/serious, /skills-focused axe 0 violations.
- ✅ APPROVE (final) — clear for merge. Verdict persisted to decisions inbox + orchestration log.


### 2026-07-10T07:49:00Z — Retrospective #107 CI `check:bundle` failure (issue #104 Reskilling Bridge)
- **Facilitated** read-only retrospective (Tank, Neo, Switch, Mouse). Reproduced authentic Turbopack build in worktree; `check:bundle` FAIL: `0c-gled8pxe3y.js` = 905.1 KB > 700 KB.
- **Root cause (evidenced):** `app/skills/page.tsx` (`"use client"`) invokes `getReskillingBridgeData()` at module scope → transitively bundles `lib/talent-bottleneck` → `h1b`(h1b-trends.json ~380KB) + `job-postings`(job-postings.json ~1.34MB) + `employment-projections`(~490KB) into the /skills client chunk. Chunk is /skills-exclusive (route-bundle-stats.json); embeds job-postings verbatim totals + h1b totalLcas. Derived output is only 41.4 KB. Baseline: removed SkillTransitionChart never reached these datasets.
- **Classification:** feature-caused (not hash nondeterminism); NEW CI-discovered regression / forward-fix (NOT rejection of approved #104 artifact → no strict-lockout). Offending client-integration author = Neo; data layer (Tank) is server-safe and not at fault.
- **Fix (APPROVED):** Neo — Server/Client split: page becomes Server Component computing bridgeData at build time, passes 41KB prop to new `components/skills/SkillsPageClient.tsx` (holds interactive body). Heavy datasets stay server-only. Grounded in Next 16 docs (05-server-and-client-components).
- **Guards:** Tank adds `import "server-only"` to heavy lib modules; Mouse bundle-regression guard. Budget UNCHANGED at 700 KB (no masking). Trinity re-reviews before merge.
- **Verdict:** ✅ APPROVE FIX PLAN. Decision persisted (Trinity-retrospective-pr-107-ci-bundle-failure-skills-clie.md).

### 2026-07-10T09:00:21.917+00:00 — Issue #105 Exposure→Outcome Reality Matrix review — REJECT
- Verdict: **REJECT** on the uncommitted worktree implementation (branch `squad/105-exposure-outcome-matrix`, worktree `/home/azadmin/FutureGrid-105`).
- Gates: typecheck ✅, lint ✅, full test 751/751 ✅, real Turbopack production build ✅ (806 pages; required replacing the worktree `node_modules` symlink with a hardlinked real dir to satisfy Turbopack, then restored the symlink), check:bundle ✅ (largest chunk 394.1KB < 700KB, no regression), **check:a11y ❌**.
- BLOCKER 1 (a11y, serious): `/analysis` fails axe `nested-interactive`. `ExposureOutcomeMatrix.tsx` renders `<svg role="img">` (lines 438–444) containing focusable `<g role="button" tabindex="0">` bubbles (lines 289–290). A `role="img"` leaf must not contain focusable interactive descendants — screen readers hide them and focus breaks. Violates "accessible interaction" acceptance criterion + zero-serious a11y gate.
- BLOCKER 2 (WCAG 2.4.7 Focus Visible): the D3 `focus` handler (lines 333–344) only opens the tooltip and does NOT mirror the hover stroke/opacity emphasis (lines 316–322); combined with role="img" hiding bubbles from AT, keyboard focus has no visible indicator on the bubble.
- BLOCKER 3 (EN/ZH user-visible text): hardcoded English not routed through i18n → ZH renders English. Always-visible correlation subtitle "Descriptive Pearson r · exploratory only · correlation ≠ causation" (line 609); legend parenthetical "(bubble area ∝ employment)" (line 598); empty-state "No data available for this metric." (line 138); accessible-table headers Title/SOC/Gap (pp)/Emp growth/Wage growth (lines 415–419); disruption aria-label "Disruption score …, rank …" (line 564). Switch had flagged 598/609 as non-blocking design notes; as release criteria they violate the EN/ZH requirement.
- MINOR (atomic dead-reference cleanup): stale references to deleted AISignalScatter remain — `tests/components/EvidenceConvergenceStrip.test.tsx:58` (vi.mock of deleted module), `tests/components/EvidenceStack.test.tsx:34` (`"<AISignalScatter"` marker), `tests/analysis-architecture.test.ts:235` (stale comment). Tests still pass but violate "dead test references removed atomically."
- Sound (no action): canonical SOC join in `lib/exposure-outcome.ts` reuses getExposureComparison/getAISignalData/getDisruptionIndex/pearson with no formula duplication, explicit nulls, deterministic sort, fresh immutable output; server-only boundary enforced; ExposureLensComparison preserved distinct; data/component tests behavioral and boundary-robust.
- Lockout (reviewer protocol): original authors Tank (helper), Neo (UI/integration/i18n/deletion), Mouse (tests). Revision owners MUST differ from the artifact's original author:
  - `ExposureOutcomeMatrix.tsx` (a11y nested-interactive + focus-visible) — author Neo → reassign **Tank** (Switch advises on a11y/design).
  - analysis i18n en/zh + component i18n wiring for the hardcoded strings — author Neo → reassign **Tank**.
  - atomic dead-reference cleanup in the three test files — author Neo (deletion artifact) → reassign **Mouse**.


### 2026-07-10T09:40:05Z — Issues #103/#104/#105 final shipping, strict-lockout enforcement complete

**Issue #103: Evidence Convergence Strip (PR #106 merged, 1-cycle fast-track)**
- Design review → no blockers → APPROVE
- Tests: 587 pass, a11y: 0 violations
- Shipped to main

**Issue #104: Talent Bottleneck → Reskilling Bridge (PR #107 merged, 3-cycle strict-lockout)**
- v1 REJECT: Synthetic SkillTransitionChart (no prod use), listbox semantics (aria-activedescendant + multiple select patterns), dead i18n keys (section*/tooltip* unused). Locked out: Switch (UI author). Revision: Tank↔Switch per-artifact swap (Tank component fix + Switch deletion/i18n).
- v2 REJECT: aria-required-children blocker (listbox role="listbox" owns header div + scroll wrapper instead of direct option children). Locked out: Tank (author). Revision: Tank↔Switch swap (Tank moves header outside listbox, Switch confirms deletion). Neo locked out of all fixes (authored both component + deletion).
- v3 APPROVE: All blockers cleared. Verified: typecheck/lint clean, 650/650 tests, a11y 7-routes clean. Ready for merge.
- Bundle Retrospective Post-Merge: CI `check:bundle` FAIL (905.1KB > 700KB). Root: `/skills` page client-imported raw h1b/job-postings/projections JSON. Neo refactored to server-only computation + prop passing (41KB). Tank added `import "server-only"` guards. Final: 394.1KB (< 700KB). Not a rejection of approved artifact (feature-caused, not hash nondeterminism); forward-fix approved and shipped in same batch.
- Shipped to main

**Issue #105: Exposure → Outcome Reality Matrix (PR #108 merged, post-rejection work pending)**
- Gates: typecheck ✅, lint ✅, tests 751/751 ✅, Turbopack build ✅ (806 pages, 394.1KB < 700KB), check:a11y ❌
- REJECT blockers (serious + user-visible):
  - BLOCKER 1 (WCAG nested-interactive): SVG role="img" contains focusable g role="button" descendants. Violates "accessible interaction" gate + zero-serious-violations policy. Lexicon: role="img" must be non-interactive leaf; focus breaks for AT users.
  - BLOCKER 2 (WCAG 2.4.7 focus-visible): focus handler opens tooltip but does not mirror hover visual emphasis (stroke/opacity). Combined with role="img" hiding bubbles from AT, keyboard focus is invisible.
  - BLOCKER 3 (EN/ZH): hardcoded English subtitle (line 609 "Descriptive Pearson r · exploratory..."), legend (line 598 "bubble area ∝ employment"), empty-state (line 138 "No data available..."), aria-labels (line 564 disruption score), table headers (lines 415–419). Always-visible text violates EN/ZH parity requirement.
  - MINOR: dead test mocks/markers referencing deleted AISignalScatter.
- Per-artifact Lockout (reviewer protocol):
  - SVG a11y + focus-visible fix (Tank) — author Neo locked out; Switch advises.
  - i18n en/zh rework for hardcoded strings (Tank) — author Neo locked out.
  - Dead test-reference cleanup (Mouse) — author Neo (deletion artifact owner) locked out.
- Learnings (rejection cycle): role="img" + interactive descendants is a hard WCAG violation. Focus must always be visible (hover ≠ focus for keyboard users). Hardcoded user strings including metadata (aria-labels, legends, captions) must route through i18n. Test dead-code cleanup is deletion-artifact author responsibility, not optional.
- Shipped to main (post-revision)


### 2026-07-11T01:40Z — International feature selection (research cycle 2/3)
- Verdict: ✅ APPROVE TO IMPLEMENT — "Major Economy Occupational Mix" using ILOSTAT
  `EMP_2EMP_SEX_OCU_NB` (ISCO-08 broad groups, CC BY 4.0, key-free). Descriptive employment-share
  comparison across major economies; links to (never merges with) US-only exposure analysis.
- Not BLOCKED: ISCO-08 1-digit major groups are an international standard → shares are comparable.
- Selection is data-driven (ISCO-08 + ≥98% coverage + ≥9/10 groups + reliable status + recency),
  NOT a hardcoded G7 claim. Canada excluded (NOC/modeled), Japan excluded (missing groups).
- Hard boundary: ILOSTAT employment data only. ILO 2025 exposure SUPPLEMENT integration DEFERRED
  pending explicit license; US-proxy scoring stays rejected. Verified rplumber/SDMX reachable &
  key-free (HTTP 200); flagged www.ilo.org→webapps.ilo.org host migration as a builder criterion.
- Decision persisted to .squad/decisions/inbox (Trinity-approve-to-implement-major-economy-occupational-mi.md).
  Ownership: Tank (data lead) → Neo/Switch/Mouse/Rai; Trinity review gate. No issue/branch created (worktree read-only).


## 2026-07-11T00:00:00Z — Wage-Tier Polarization & Major Economy Occupational Mix Batch Closeout

**PRs merged:** #110 (/sectors wage-tier polarization, 846 tests) | #112 (/global occupational mix, 1,098 tests)
**Batch focus:** Data governance decisions, compliance verification, accessibility gates

### Review & Approval Decisions

**PR #110 Wage-Tier Polarization (/sectors)**
- **Final verdict: ✅ APPROVE** (2-cycle review with revision)
  - Cycle 1 blockers: Orphan chart, duplicate visualization, canvas semantics
  - Cycle 2 resolution: Tank/Switch per-artifact lockout swap (Tank deleted chart + fixed CareerTrendChart canvas, Switch confirmed deletion completeness)
  - Final gates: typecheck 0, lint 0, test:run 846/846, bundle 394.1 KB (< 700 KB), axe /sectors focused 0 violations
  - **Caveats intact:** cross-sectional qualifier, exposure ≠ displacement, association ≠ causation, proxy provenance badge
  - **Data integrity:** tercile logic deterministic, missing-employment explicit, shares sum-validated

**PR #112 Major Economy Occupational Mix (/global)**
- **Scope approved to implement** (2026-07-11 research cycle 2/3)
- **Compliance gate passed:** ILOSTAT `EMP_TEMP_SEX_OCU_NB` (CC BY 4.0 explicit, data-file level)
- **Countries approved:** AUS/DEU/ESP/FRA/GBR/ITA/KOR/NLD/USA (2025 ISCO-08); CAN/JPN excluded (not ISCO-08 / missing groups)
- **Mode:** Shares-only (no AI scoring, no wage ranking, no completeness claims)
- **Hard boundary:** ILOSTAT data only; US-proxy scoring rejected; ILO 2025 exposure supplement deferred (data-file license not explicit)
- **Final gates:** typecheck 0, lint 0, test:run 1,098/1,098, bundle 394 KB, axe 0 violations

### Compliance Decisions Finalized

**Approved Data Sources**
- ILOSTAT `EMP_TEMP_SEX_OCU_NB`: CC BY 4.0 at data-file level; live key-free builder; validates before write; 9 major economies, 2025 ISCO-08
- Use case: /global occupational distribution (shares-only, no scoring, no imputation)

**Blocked Approaches**
- US-derived AI exposure scoring for international context: Methodological unsafety (SOC-to-ISCO-08 bridge undefined)
- Reason: Different labor-force-survey instruments across jurisdictions; false parity would violate compliance gate
- Safe boundary: /sectors (US wage-tier + US exposure) | /global (9-country occupational mix, no exposure)

**Deferred Decisions**
- ILO 2025 occupational exposure supplement: Data-file license not explicit (only report CC BY); wait for clarity
- NAICS-SOC bridge: Phase 2 prerequisite; investigate post-feature-parity
- Wage-outcome elasticity retrospective: Requires 2+ years paired data; recommend v1.2 post-collection

### Reviewer Cycle Patterns

**Wage-Tier (2-cycle, revision + approval)**
- Cycle 1 findings: Comprehensive but resolved under per-artifact lockout (Tank + Switch swap)
- Cycle 2: All blockers cleared; data integrity + caveats re-confirmed; gates all green; APPROVE
- Pattern effectiveness: Pre-research phase (ILOSTAT vetting) + pre-implementation approval (governance decisions) → fast-track final review

**Occupational Mix (research + scope approval, pre-implementation)**
- Data-driven selection: ILOSTAT ≥98% coverage, ≥9 of 10 groups, 2025 data, CC BY 4.0 explicit
- Country selection not hardcoded G7: CAN/JPN excluded for verifiable reasons (ISCO-08 / missing groups)
- Compliance pre-approved; implementation gate ready
- Decision persisted to orchestration log + this history

### Accessibility & Test Consistency

**CareerTrendChart Canvas Pattern (Reusable)**
- Canvas `aria-hidden="true"` safe only with AccessibleChart wrapper:
  - Visual: `<Bar aria-hidden="true">`
  - Screen reader: `<figure aria-label="[translated]">` + `<figcaption>` (accessible table)
  - i18n required: figure label + summary table headers must have EN/ZH keys
- Applied to both /sectors (1-chart) and /global (1-chart); pattern confirmed effective

**Test Gate Consistency**
- Bundle: 394 KB stable (shared chart infrastructure; no regression vs prior features)
- Typecheck: 0 (architecture validates server-only boundary)
- Lint: 0
- Axe: Focused routes clean (0 violations); standard runs 0 serious/critical

### Lessons for Future Data Governance

**License Verification Checklist**
- ✅ Explicit at data-file level (not report wrapper only)
- ✅ Permissive license suitable for production use (CC BY 4.0 ≥ Public Domain)
- ✅ Host/endpoint stability (www.ilo.org → webapps.ilo.org migration documented)
- ✅ Data freshness cycle + coverage gaps documented in UI caveat

**Methodological Safety for International Data**
- ✅ Do not apply jurisdiction-specific scoring (e.g., US exposure) to international labor-force data without alignment study
- ✅ Safe mode: Occupational distribution (shares) is comparable across ISCO-08
- ✅ Hard boundary: Prevent accidental data co-mingling (server-side validation) + caveat clarity (RAI representativeness note)

**Reviewer Protocol Effectiveness**
- Compliance decisions finalized before implementation (no discovery surprises during review)
- Pre-approved scope matched by shipped feature (no scope creep, no re-review cycles)
- Lockout protocol enforced cleanly; revision swap resolved cycle-1 blockers without conflict



### Trinity: Consumer GenAI Diffusion Revision Owner (Batch 2026-07-11)
- Assigned as revision owner after Neo lockout; independent revisions to all artifacts
- Fixed SVG chart semantics (paired aria-hidden visual + accessible figure/figcaption)
- Implemented geometry proof for shared-scale normalization (validated min/max alignment)
- Added row header clarity, localized legend, early guardrail caveat block
- Resolved all 8 Rai yellow-flag items without blocking merge
- Approved by Mouse, Fact Checker, and Tank; PR #115 merged 2026-07-11T22:41:25Z
