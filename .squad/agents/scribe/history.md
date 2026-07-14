# Project Context

- **Project:** FutureGrid
- **Created:** 2026-06-30

## Core Context

Agent Scribe initialized and ready for work.

## Recent Updates

📌 Team initialized on 2026-06-30

## Learnings

Initial setup complete.


## 2026-07-01T11:06:51.565+00:00 — WARN expansion state maintenance
- Processed 4 decision inbox entries into decisions.md and cleared the inbox.
- Wrote orchestration logs, session log, cross-agent history updates, and health report for the WARN all-state coverage expansion.
- Noted non-state repo changes for coordinator handling; mutable squad state was not committed.


## 2026-07-01T13:19:30.034+00:00 — WARN Pressure Index records

Scribe merged six decision inbox entries into `decisions.md`, recorded per-agent orchestration logs and a session log, appended affected-agent history updates, verified no history summarization threshold was reached, and left non-state repo changes for coordinator handling.
## 2026-07-01T19:21:52.741+00:00 — Manual WARN adapter state closeout

Scribe processed 2 decision inbox entries, consolidated them into the final manual WARN adapter decision record, deleted the processed inbox files, wrote per-agent orchestration logs and the session log, and recorded health metrics. No history file exceeded the summarization threshold.


## 2026-07-01T21:56:44.721+00:00 — QCEW/WARN PR state closeout

Scribe processed 4 decision inbox entries into decisions.md, cleared the inbox, wrote QCEW/WARN orchestration logs and the session log, appended affected-agent history updates, and recorded archive/health measurements. No mutable squad state was committed.


## 2026-07-01T22:27:30.269+00:00 — Market AI Sensitivity documentation closeout

Scribe recorded orchestration logs, merged two Trinity decision-inbox entries into `decisions.md`, cleared the inbox, noted that no decisions were old enough for the 7-day archive gate, wrote the session log, and prepared the health report for PR #39.


## 2026-07-01T22:56:44.721+00:00 — Evidence Stack state closeout

Scribe merged 2 decision inbox entries into `decisions.md`, cleared the inbox, recorded per-agent orchestration logs and the session log, checked the 7-day decisions archive gate (0 eligible old entries), and prepared health metrics for PR #40. No history file exceeded the summarization threshold.


## 2026-07-02T00:34:32.844+00:00 — Widescreen UI polish state closeout

Scribe merged 1 decision inbox entry into `decisions.md`, cleared the inbox, recorded per-agent orchestration logs and session/health logs, checked the 7-day decisions archive gate (0 eligible old entries), and verified no history file exceeded the summarization threshold.

### 2026-07-03T22:49:27.110+00:00 — Spawn manifest state recorded
- Verified Squad state backend via `squad_state_health` (FSStorageProvider) and recorded the merged-work milestone using state tools only.
- Current queue: #73/#74/#75 closed through PRs #85/#87/#86 on main c4d84fa; continue with open issues #76-#84.


### 2026-07-04T12:23:54.134+00:00 — IA refactor state recording
- Verified Squad state backend via `squad_state_health` (FSStorageProvider), recorded the preserve-URLs IA decision, wrote a session log, and appended Trinity/Switch/Neo/Mouse history updates using squad_state tools only.
- Noted validation passed: targeted CommandPalette/DashboardHome tests, `npm run lint`, and `npm run build`; no commit requested or made.

### 2026-07-05T22:02:38.948+00:00 — Action failure fix closeout
- Recorded session state after PR #89 (`fix: address action run failures`) was committed, merged to main, and local main synced.
- Noted fixes for the missing CHANGELOG release gate, axe accessibility failures, and invalid SVG role; post-merge workflows were green: CI 28756646091, Squad Release 28756646100, Deploy GitHub Pages 28756646103.
- No commit requested or made for local Squad state updates.

### 2026-07-05T22:47:39.971+00:00 — Dead legacy code cleanup closeout
- Recorded local Squad state after dead/legacy code cleanup was audited, implemented, reviewed, validated, committed, merged via PR #90, and confirmed green post-merge.
- Noted validation passed: `npm run build`, `npm run lint`, and `npm run test:run`; no commit requested or made for local Squad state updates.

### 2026-07-07T01:48:47.300+00:00 — Career projection fallback closeout
- Recorded local Squad state for PR #101 after the `/careers/15-1251` Employment Projections + AI Exposure fix was validated, approved, CI-passed, and merged to main.
- Added the chart fallback decision and appended Tank/Mouse/Trinity history updates; mutable Squad state was not committed.


## 2026-07-11T00:00:00Z — Wage-Tier Polarization & International Occupational Mix Batch Closeout

**PRs merged:** #110 (Wage-Tier AI-Exposure Polarization, /sectors) | #112 (Major Economy Occupational Mix, /global)
**PRs merged:** #110 (Wage-Tier AI-Exposure Polarization, /sectors) | #112 (Major Economy Occupational Mix, /global)  
**Batch focus:** Data governance, compliance, and accessibility closure for linked features.

### Key Learnings for Data Implementation

**ILOSTAT `EMP_TEMP_SEX_OCU_NB` Validation (Approved CC BY 4.0)**
- Live CSV builder with key-free validation before write proved robust for production occupational distribution
- Countries with current ISCO-08 data (2025): AUS/DEU/ESP/FRA/GBR/ITA/KOR/NLD/USA
- Countries excluded: CAN (no current ISCO-08) + JPN (missing occupational groups); no imputation applied
- License verified at data-file level (CC BY 4.0), not just report wrapper — critical for future source vetting
- Shares-only mode (no exposure scoring, no wage ranking, no completeness claims) is safe design for cross-national data

**US-Derived Exposure Scoring Rejected for International Context**
- Blocking decision: Do not apply US occupational exposure scoring (Claude usage, GenAI diffusion, SOC-keyed models) to international labor-force surveys without explicit methodological alignment study
- Reason: US occupational structure differs materially from ISCO-08; forcing methodological parity creates false equivalence
- Safe alternative: /global serves occupational mix (shares only); /sectors remains US-focused (wage-tier + exposure tiers)
- Implementation: Server-side validation prevents accidental cross-national scoring; no runtime data leakage

**ILO 2025 Occupational Exposure Supplement Deferred**
- Report-level license (CC BY) is insufficient; data-file license must be explicit before production use
- Wait for ILO to clarify data-file license or identify alternative source with published methodology
- Deferral reduces compliance risk without blocking current release

### Accessibility & Test Coverage Patterns

**CareerTrendChart Canvas Semantics Fix (Arc from PR #109 → #110 revision)**
- Resolved: Chart canvas `aria-hidden="true"` is safe only when paired with AccessibleChart wrapper
- Pattern: `<Bar aria-hidden="true">` (visual) + `<figure aria-label="...">` (screen reader) + sr-only `<figcaption>` (accessible data table)
- Validation: All five i18n keys required (`a11yCareerTrendSummary`, `chartTitleAvgAIExposure`, `labelOccupations`, `labelAIExposure`, + implicit figure label)
- Result: /sectors axe-core green (0 serious/critical); focused test run 0 violations

**Test Coverage: 1,944 Combined Tests (846 + 1,098)**
- typecheck: 0 errors (architecture enforces server-only import boundary)
- bundle check: 394 KB per chunk (stable across both features; shared infrastructure)
- static export (`out/`): Complete; /sectors exported static

### Compliance & Review Cycle Improvements

**Revision Cycle Lockout Protocol Effective**
- Tank + Switch locked out of #110 artifacts (lens deletion + canvas fix); no re-admission
- Trinity + reviewer agents locked out of #112 strict-lockout revision; approval gates satisfied
- Protocol enforces conflict-of-interest isolation without re-work or duplication

**Decision Consolidation**
- Research phase (source evaluation, ILOSTAT licensing, US-exposure rejection) consolidated into single batch decision record
- No orphaned decision-inbox entries; all compliance findings captured in orchestration log

### Future Recommendations

**Phase 2 Data Features (Dependent on Completion of #77 — Provenance & Freshness Cues)**
1. Talent-Bottleneck-to-Reskilling Bridge (requires NAICS-SOC mapping dataset)
2. Evidence Convergence Strip (AI exposure + talent shortage + demand dynamics timeline)
3. Exposure-to-Outcome Reality Matrix (retrospective wage/employment paired with exposure scores)

**Source Vetting Checklist for Future International Datasets**
- License: Explicit at data-file level (not report wrapper only)
- Coverage: Published calendar year (no imputation); ISCO-08 or equivalent standardized classification
- Comparability: No cross-national scoring without explicit alignment methodology
- Update cycle: Document refresh frequency; add to compliance audit trail



## Batch: Complete Design Documentation for FutureGrid Subsystems

**Session:** Orchestrated multi-agent design documentation effort
**Completed:** 2026-07-11T13:37:33Z (merge commit 4e282d1fb8fd5c18e9f5a2c424075675387873a7)
**PR:** #113 https://github.com/vibewatch/FutureGrid/pull/113
**Files:** 19 documentation files / 6,546 lines
**Session:** Orchestrated multi-agent design documentation effort  
**Completed:** 2026-07-11T13:37:33Z (merge commit 4e282d1fb8fd5c18e9f5a2c424075675387873a7)  
**PR:** #113 https://github.com/vibewatch/FutureGrid/pull/113  
**Files:** 19 documentation files / 6,546 lines  

### Outcome Summary

**Phase 1: Inventory & Authoring**
- Established 18 FutureGrid subsystems from origin/main
- Authored `docs/README.md` + 18 subsystem documents
  - Dashboard, Careers, Sectors, Skills, Explore, Analysis, Labor-Market
  - Global, Frontier, Visa, Report, Transparency, Occupation-Data-Model
  - Data-Pipeline, Visualization-System, I18n, Platform, Testing
- Each doc includes: ownership, purpose/non-goals, boundaries, Mermaid architecture/data flow, contracts, provenance/caveats, runtime/build lifecycle, failure behavior, security/privacy, accessibility, performance, tests, extension points, key files

**Phase 2: Review Loop 1 → Stale README / Security Gaps / A11y Route Omission**
- Rejected: README lacked current subsystem coverage; missing security sections in subsystem docs; testing skipped a11y route validation
- Boundary inaccuracies: WARN/server-only annotations inconsistently applied
- Different author agents revised under strict lockout; primary agent blocked from re-review

**Phase 3: Review Loop 2 → Heatmap Gap / Incomplete Test Matrix / Stale Non-goals**
- Rejected: Stale heatmap gap; incomplete test matrix coverage; missing server-only annotations in routes
- Sectors wage-tier non-goal stale; Skills Reskilling Bridge references incomplete
- Tank (conflict-free owner) revised all items

**Phase 4: Review Loop 3 → Fact Checker APPROVAL**
- ✓ 19 docs files verified
- ✓ 18 taxonomy entries cross-referenced
- ✓ 14 routes covered with server-only annotations
- ✓ 37 lib modules documented
- ✓ 27 scripts catalogued
- ✓ 76 tests represented
- ✓ All 13 required sections present
- ✓ Zero broken links/placeholders
- ✓ Trailing whitespace validated (`git diff --cached --check` clean)

**Phase 5: Merge & Cleanup**
- PR #113 passed CI
- Merged to origin/main at 2026-07-11T13:37:33Z
- Temporary worktree (`/home/azadmin/FutureGrid-docs`) removed
- Local feature branch cleaned up
- Primary worktree state and SPRINT_SUMMARY.txt preserved


## 2026-07-11T22:41:53Z — Consumer GenAI Diffusion Feature Batch Closeout

**PRs completed:** #115 (Consumer GenAI Diffusion — Top Economies, `/global`)
**Issue closed:** #114
**PRs completed:** #115 (Consumer GenAI Diffusion — Top Economies, `/global`)  
**Issue closed:** #114  
**Batch focus:** Research-to-release pipeline: public-source evaluation, empirical adjudication, implementation, cross-agent review, validation, and merge.

### Research Phase: Source Evaluation & Boundary Setting

**Cycle 1: Comparative Source Assessment**
Evaluated 8 candidate datasets for consumer-side GenAI adoption metrics:
- **BLS Productivity Index (LPC)** — US-only, no consumer segmentation; rejected
- **USPTO PatentsView API** — Global AI invention but no consumption/adoption signal; rejected
- **Census CPS/ACS** — US-only; orthogonal to consumer adoption; rejected
- **OECD EPL/PIAAC** — Skills-focused; licensing required; rejected
- **Cedefop Skills Surveys** — EU-only; API instability; rejected
- **Dingel-Neiman Teleworkability Index** — Task-level exposure but age/license ambiguity; rejected
- **Microsoft AI Diffusion (MIT License)** — 147 economies, Q1/H1/H2 2026, consumer-usage-share basis; **Selected**
- **Indeed AI Demand Indices** — Vacancy-side bias; no consumption signal; rejected for primary metric
- **ILO GenAI Supplement** — Data-file redistribution license unresolved; blocked

**Claim Boundary (Approved)**
- **Safe zone:** Consumer GenAI usage share of working-age population (Q1 2026 snapshot)
- **Exclusion zones:** Workplace adoption, productivity impact, capability claims, labor-market composites with Indeed/Anthropic/IMF data

**Risk Adjudication (Cycle 2)**
Empirically compared Microsoft AI Diffusion vs. Indeed occupational demand proxy:
- Result: Microsoft diffusion captures consumer-side adoption independent of labor-market job-posting velocity
- Validation: Top-10 economies stable across 3 periods; no spurious correlation with Indeed demand
- Outcome: Proceed with Microsoft primary; no composite modeling

### Implementation: `/global` Feature

**Feature Specification**
- **Route:** `/global` (public, server-rendered)
- **UI:** Deterministic top-10 economies ranked by Q1 2026 absolute consumer GenAI usage share
- **Timeline:** H1/H2/Q1 on single 75%-shared y-axis scale (geometry-verified)
- **Visualization:** SVG bar chart with locked aspect ratio, row headers, localized legend
- **Accessibility:** Paired `<Bar aria-hidden="true">` (visual) + `<figure aria-label="...">` + sr-only `<figcaption>` (accessible data table)
- **I18n:** EN/ZH language support with localized chart titles, legend, guardrails
- **Guardrails:** Early visible caveat block, source attribution (Microsoft AI Diffusion, MIT), confidence boundaries, no composite claims
- **Server DTO:** Compact JSON payload (pre-ranked economies, min/max for scale normalization, timestamps)

**Authoring & Review Lockout Cycle**

| Agent | Role | Status |
|-------|------|--------|
| Neo | Initial impl. | **Locked** — duplicate SR naming, false shared-scale test; prematurely opened PR |
| Trinity | Revision owner | **Approved** — SVG semantics, geometry proof, figure accessibility, row headers, guardrails, docs |
| Mouse (Reviewer) | Reviewer gate | **Approved** — duplicate naming rejection, scale test validity |
| Rai (Reviewer) | Yellow-flag resolution | **All resolved** — 8 yellows addressed in Trinity revision |
| Fact Checker | Final sign-off | **Approved** — source/caveat accuracy verified |

**Validation & Metrics**

| Category | Result | Status |
|----------|--------|--------|
| Targeted tests | 38/38 pass | ✓ |
| TypeScript check | 0 errors | ✓ |
| Lint (`npm run lint`) | 0 errors | ✓ |
| Bundle size | 394.1 KB (< 700 KB cap) | ✓ |
| Static export (`npm run build`) | 806 pages generated | ✓ |
| Accessibility (axe-core `/global`) | 0 serious/critical | ✓ |
| CI workflow | Passed | ✓ |

**Merge & Cleanup**
- PR #115 merged at 2026-07-11T22:41:25Z
- Merge commit: `7089b05a2881014b693a91df362694a6eb8e7eb0`
- Issue #114 closed
- Worktree and local feature branch removed
- Primary checkout and SPRINT_SUMMARY.txt preserved (no edits)

### Key Learnings

**Research-to-Release Pipeline Insights**

1. **Public-Source Boundary Hygiene**
   - Comparative evaluation of 8+ sources is necessary before selection; single candidate shortcuts miss rejection criteria
   - Claim boundary (e.g., "consumer adoption only, never workplace productivity") must be enforced server-side to prevent accidental scope creep
   - MIT-licensed datasets (Microsoft AI Diffusion) are safe for direct ingestion; requires no redistribution negotiation

2. **Cross-Economy Metrics Without Cross-National Scoring**
   - Consumer adoption metrics (usage share %) are safe for direct cross-national comparison without methodological alignment
   - Do NOT port US-derived occupational exposure scoring to international labor-force data; requires separate validation study
   - Shared y-axis scales require geometry proof (verifiable min/max normalization); false test scaffolding wastes review cycles

3. **Accessibility Pattern: Dual-Render Chart + Data Table**
   - SVG bar charts require paired `aria-hidden="true"` visual + `<figure aria-label="...">` label + sr-only `<figcaption>` data table
   - All i18n keys for chart semantics must be present before review; missing keys are caught in final validation
   - Bundle size stability (394 KB consistent across /sectors and /global) indicates shared infrastructure working as designed

4. **Review Lockout Protocol for Conflict-of-Interest Isolation**
   - Initial author (Neo) excluded from revision review after rejection; no re-admission until next unrelated feature
   - Revision owner (Trinity) locked into all changes; no reviewer agent can commit to same PR
   - Protocol reduces re-work and prevents author-bias in subsequent cycles

### Data & Operational Compliance

- **Source:** Microsoft AI Diffusion (147 economies, MIT license, Q1 2026 snapshot)
- **No data redistribution risk:** MIT-licensed third-party dataset; not re-licensed
- **No composite modeling:** Microsoft diffusion standalone; no merging with Indeed/Anthropic/IMF data
- **Retention policy:** Live CSV builder pattern used in #112 (Occupational Mix) not required here; static pre-ranked list sufficient

### Cross-Agent Coordination Notes

- **Rai's yellow-flag process:** 8 flagged items in Trinity revision; all resolved without blocking merge
- **Mouse's rejection authority:** Prevented duplicate SR naming ambiguity; enforced test validity
- **Fact Checker's final gate:** Verified source attribution, caveat accuracy, no stale cross-references
- **Neo's lockout:** Did not re-approach PR #115; focus shifted to independent follow-up work



## 2026-07-12T02:00:47Z — Data Quality & Reasonableness Audit Batch Closeout

**PRs completed:** #117 (Data Quality & Reasonableness Audit — Multidomain Fixes, `main`)
**Issues closed:** #116
**PRs completed:** #117 (Data Quality & Reasonableness Audit — Multidomain Fixes, `main`)  
**Issues closed:** #116  
**Batch focus:** Four independent audits spanning dataset families, builders, validators, routes, and scientific claims; schema corrections, UI fixes, semantic field enrichment, visibility caveats, and boundary validation.

### Audit Scope & Findings

**Audit 1: Dataset Family & Builder Schema Correctness**
- Scanned all builders across Occupational Data Model, WARN/QCEW/BLS pipelines, ILOSTAT, consumer GenAI diffusion, wage-tier polarization
- **Finding:** WARN projection effective dates in private/public snapshots contained future-date corruption (2030, 3030 values)
- **Finding:** Builder scrubbing logic excluded dates outside 2010..UTC(current year+2) but validator did not reject out-of-range survivors
- **Fix:** Corrected 2 WARN effective dates to null; tightened validator to reject any effective-date field outside valid range
- **Test coverage:** Added boundary/range tests for all known date fields

**Audit 2: UI Binding & Display Correctness**
- Traced capability-usage metrics from data pipeline through `/careers/*/routes`, dashboard summaries, tooltips, tables, screen-reader content
- **Finding:** Mobile views and desktop tooltips displayed percentage (%) but server DTO and tables used basis points (pp) — mismatch broke signed display
- **Finding:** Trinity locked out after initial rejection; Switch revised all instances; Neo approved final resolution
- **Fix:** Unified to signed percentage points (pp) across desktop, mobile, tooltips, tables, SR content; verified against component test matrix
- **Test coverage:** Component-level rendering tests; accessibility audit; i18n key validation

**Audit 3: Data Parsing & Boundary Validation**
- Reviewed DataAsOfBadge YYYY-MM parsing and date-window logic for all chart features (/sectors, /global, /careers/*/routes)
- **Finding:** Valid badge parse of "2024-2034" (10-year range) incorrectly overflowed to year 2193 due to missing month-boundary check
- **Finding:** Illustrative employment-drag claim (AI-adjusted baseline vs. BLS) lacked EN/ZH caveat; overclaim risk in summary copy
- **Fix:** Added month-range validation before date arithmetic; tightened parse to reject month > 12
- **Fix:** Added visible EN/ZH caveat block: "AI-adjusted employment drag is an illustrative uncalibrated what-if; BLS baseline remains distinct"
- **Test coverage:** Parser unit tests (boundary months, year overflow, edge cases); caveat presence validation in all i18n keys

**Audit 4: Semantic Field Binding & Validator Coverage**
- Mapped semantic fields across CareerInsight (dataModel), talent-bottleneck uses, automation-exposure references
- **Finding:** Talent-bottleneck used `automationProbability` (compatibility alias) instead of new `aiExposure` semantic field; semantic exposure misuse
- **Finding:** 85 null BLS projectedOpenings and 4 OpenRouter dynamic-pricing sentinel models (-1) had no durable builder notes; no imputation/zero conversion documented
- **Finding:** Multi-output writes from build-data-snapshot lacked named validators; AI-signals emitted unknown/empty shapes without schema gate
- **Fix:** Added CareerInsight.aiExposure semantic field; updated talent-bottleneck to consume it instead of automationProbability
- **Fix:** Added durable builder-generated notes for all 89 null/sentinel cases; no imputation applied, notes visible in admin tooling
- **Fix:** Added named validators before every structured-data output; AI-signals validates each known filename and rejects unknown/empty shapes
- **Test coverage:** Semantic field binding tests; validator rejection tests (malformed shapes, unknown filenames); builder-note rendering tests

### Validation & Test Results

**Comprehensive Coverage**
- **Total tests:** 1,205 across 78 files
- **Test outcomes:** All pass; zero skipped/flaky
- **TypeScript check:** 0 errors
- **Lint (`npm run lint`):** 0 errors
- **Build (`npm run build`):** 806 pages rendered; largest chunk 394.6 KB (< 700 KB cap)
- **Accessibility (axe-core):** 0 critical/serious violations
- **CI workflow:** Passed

**Test Categories**
- Boundary/range validation (date fields, month parsing, year overflow)
- Negative case handling (null projectedOpenings, -1 sentinel models)
- Uniqueness/join validation (no duplicate notes, correct field references)
- Regeneration tests (builder output consistency across runs)
- i18n key presence (all caviats and guardrails in EN/ZH)

### Data Compliance & Documentation

**Correctness Verifications (No Edits Required)**
- Automation-risk strict percentile threshold note confirmed correct in published documentation
- No changes to existing claims required

**Deferred Non-Correctness Items (Issue #77 Untouched)**
- Policy redesigns: Remove automationProbability compatibility alias, reweight consensus/market/talent composites, change Bright Outlook sort, parse mixed fiscal/calendar max dates
- These are intentional feature/weighting decisions, not data-quality bugs
- Isolated to Issue #77 for coordinated team discussion

**Visible Disclosures Added**
- Data-quality callout block for 85 null BLS projectedOpenings (builder note visible in admin/export)
- Data-quality callout block for 4 OpenRouter -1 dynamic-pricing sentinels (builder note visible in admin/export)
- Illustrative caveat for AI-adjusted employment drag (user-facing, EN/ZH, early in route UI)
- Source attribution and confidence boundaries on all consumer-GenAI and wage-tier metrics

### Merge & Cleanup

**PR #117 Merge Details**
- PR merged at 2026-07-12T02:00:03Z
- Merge commit: `8aa21b3fecda73b90e5269907fc75b9b22824baf`
- Issue #116 closed at same timestamp
- Worktree and local feature branch removed
- Primary checkout state: Dirty (product edits present, not committed per Scribe mandate)
- SPRINT_SUMMARY.txt: Untouched

### Key Learnings

**Data Audit Methodology**

1. **Four Independent Audit Threads**
   - Schema correctness (builder → validator → pipeline)
   - UI binding (data → component → route → SR)
   - Parsing & boundary logic (date/time edge cases)
   - Semantic field usage (model → consumer code paths)
   - Parallelizing audits with clear ownership gates prevents cross-contamination

2. **Future-Date Corruption Pattern**
   - Builder date scrubbing (2010..current+2) must be enforced at both builder and validator stages
   - Orphaned out-of-range survivors require explicit rejection, not silent skip
   - Null effective dates are safer than impossible futures (e.g., 3030)

3. **UI Display Consistency**
   - Percentage points (pp) vs. percentages (%) ambiguity requires unified choice in data model
   - Mobile + desktop + tooltips + tables + screen-reader routes must all source same canonical unit
   - Lockout protocol (primary author excluded after rejection) prevents author-bias in revision cycles

4. **Parsing Edge Cases in Date Arithmetic**
   - YYYY-MM parsing must validate month <= 12 before arithmetic operations
   - Year overflow (e.g., "2024-2034" → 2193) is a silent correctness failure; requires boundary tests
   - Illustrative/what-if claims need explicit caveat blocks; do not rely on implicit guidance

5. **Semantic Field Binding**
   - Compatibility aliases (automationProbability) create silent semantic misuse; prefer explicit field references
   - Null and sentinel values (-1) require durable builder notes; no zero-filling or imputation without disclosure
   - Multi-output validators prevent schema collapse; enforce validation gate for every structured write

**Cross-Agent Review Observations**
- Trinity locked out post-rejection; Switch carried all revisions to approval (duplicate naming, signed pp, UI consistency, caveat presence)
- Neo approved final resolution after Trinity revision cycle; no conflicts in final review gate
- Four independent audits required 78 files, 1,205 tests, and zero critical/serious accessibility issues — baseline quality maintained

### Orchestration Notes

- **Audit 1 lead:** Cross-dataset family scan; builder/validator alignment
- **Audit 2 lead:** UI component matrix trace; mobile/desktop/SR consistency
- **Audit 3 lead:** Date parsing boundary validation; caveat content audit
- **Audit 4 lead:** Semantic field mapping; multi-output validator coverage
- **Reviewers:** Trinity, Switch, Neo (lockout cycle enforced); Mouse (final approval)
- **Fact Checker:** Caveat accuracy, source attribution, no stale cross-references



---

## Cross-Agent Learnings from PR #120 Cycle (Provenance & Localized Guardrails)

### DataAsOfBadge & Provenance Registry Patterns

**Reusable Across Synthesis Features:**
- Per-lane provenance (data-source + last-updated timestamp) can be abstracted as shared component
- Registry-backed approach (Tank backend) enables flexible assignment of source metadata to each analysis lane
- Pattern successfully applied to occupational-snapshot + wage-tier lanes; future synthesis features should reuse registry model before adding custom provenance logic

**Application Priority:**
1. When adding new data helper function (Tank): check if existing provenance registry can absorb new lane metadata
2. When rendering synthesis feature (Neo): use registry-backed badge component rather than hardcoding source text
3. When updating provenance (any agent): commit metadata to registry, not to individual component props

### Calendar-Aware Date Selection (asOf Selector)

**Mixed-Date Environments:**
- Multiple datasets may have different recency (e.g., occupational-snapshot from 2025-Q3, wage-tier from 2025-Q2, international-occupation-mix from 2025-01)
- Calendar-aware selector should:
  - Show available dates for each lane (not just "latest")
  - Highlight date gaps/mismatches in UI
  - Store user selection atomically (not per-lane)
  - Communicate uncertainty when lanes have different coverage dates
- Switch's implementation: shared selector logic + per-lane availability check reduces duplication

**Future Data Integrations:**
- Pre-design calendar selector before implementation phase
- Document availability calendar in data-layer constants (not UI-layer assumptions)
- Test asOf selection across cross-lane combinations (ensure determinism)

### Exposure vs Adoption Wording in ZH Context (Proxy Framing)

**Context Specificity:**
- "Exposure" (暴露) correctly frames AI as environmental variable affecting job performance/skills
- "Adoption" (采用) implies intentional workplace strategy/choice (incorrect for proxy measure)
- Rai's yellow advisory caught this distinction; Switch corrected at merge time

**Pattern for Proxy-Based Metrics:**
- When using adoption proxy (GenAI diffusion, LLM usage, job postings) to infer exposure, audit i18n copy
- ZH/EN may have different connotations (exposure is passive; adoption is active)
- Caveat language must clarify: "based on adoption data" (source) vs "exposure effect" (interpretation)
- Compliance check: does i18n wording overstate causality or imply agency where none exists?

**Application to Future Features:**
- Whenever using proxy metric in international context, route i18n through Rai before implementation
- Include caveat disclaimer (impact of proxy method) in both EN + ZH
- Accessibility gate: verify tone is consistent across languages (not different risk signaling)


## 2026-07-14T02:05:10Z — Decision Inbox Consolidation & Weekly Cycle Closeout

**Session:** Weekly Monday 06:00 UTC automation + rejection cycle recovery  
**Final state:** main 49f03ab9fe3db1849e3b861cd248d0c64611c5e4  
**Decisions processed:** 40 inbox files → consolidated into decisions.md  
**Orchestration logs:** Tank, Trinity, Mouse, Rai cycle documented  

### Inbox Consolidation Completed

**Original:** 40 decision files (248 KB), span dates 2026-07-10 through 2026-07-11  
**Groups consolidated:**
1. Issue #103–#105: Evidence Convergence & Exposure-Outcome Matrix (8 files)
2. Issue #104: Reskilling Bridge & Server/Client Split (8 files)
3. Issue #109: Wage-Tier AI Exposure Polarization (4 files)
4. Issue #111: International Occupation Mix (5 files)
5. Design & Visuals Reviews (6 files)
6. Workflow & Infrastructure (3 files)
7. Fact Checker Verifications (2 files)
8. Post-merge PR Reviews (2 files)
9. Other coordination (2 files)

**Result:** All 40 inbox entries merged into main decisions.md per consolidation protocol (no loss of detail; improved searchability by issue/agent).

### Key Learnings Captured

**Tank (Data Refresh & Offline Rebuild)**
- Preserve last-known-good credential data lanes; initial #121 approach failed by stripping credentials
- Never include credential-degrading builders in public workflows
- Offline rebuild durability requires committed fixture-origin metadata (vs. self-healing)
- Regression tests must be deterministic (not self-healing); added per PR #125

**Trinity (Code Review & Workflow Coordination)**
- GitHub Actions PR creation prerequisite: repository setting must enable Actions-created PRs; GraphQL createPullRequest denied without it
- Validate workflow YAML structure before merge (invalid block-scalar syntax causes silent zero-job runs)
- Test side effects can hide first-run failures; non-self-healing gates prevent deployment of half-working states
- Approval chain coordination: reject → redesign → re-review → merge pattern requires clear decision consolidation

**Mouse (Test Validation & Approval Gates)**
- Never include credential-degrading data paths in approved PRs
- Test side effects (self-healing) can hide underlying bugs; deterministic fixture preservation required
- Full in-job test gates required for bot PRs: lint → tests → build → commit before PR creation
- Post-merge validation essential: CI, Pages, Squad Release all run post-merge

**Rai (Data Governance & Documentation)**
- i18n coverage must accompany new data (EN/ZH parity required)
- Data sourcing requires fact-checker alignment; no assumptions without verification
- Preserve credential lanes in documentation (initial #121 approach degraded credential docs)
- Attribution and sourcing must be complete; no regulatory/ethical violations

**Scribe (Orchestration & Documentation)**
- Decision inbox consolidation improves searchability (40 files → merged entries per issue/agent)
- Orchestration logs capture cross-agent learnings for future reference
- Session logs document rejection cycles and approval chains for pattern recognition
- History summaries enable pattern learning without losing key details

### Verification & Validation

**Decisions.md Status**
- **Size:** 159 KB (not archived; <7d old, <50KB threshold does not apply)
- **Structure:** Active decisions + merged inbox entries
- **Searchability:** Improved via consolidation (issues grouped, agents linked)

**Orchestration Logs Added**
- `orchestration-log/2026-07-14T02-05-10.092+00-00-tank.md` — Data refresh cycle (PRs #121–#125)
- `orchestration-log/2026-07-14T02-05-10.092+00-00-trinity.md` — Code review & approvals
- `orchestration-log/2026-07-14T02-05-10.092+00-00-mouse.md` — Test validation & gates
- `orchestration-log/2026-07-14T02-05-10.092+00-00-rai.md` — Data governance & docs

**Session Log Added**
- `log/2026-07-14T02-05-10.092+00-00-session.md` — Complete workflow trace (rejection → approval cycles)

### Cross-Agent Learnings Summary

1. **Preserve credential lanes** — Initial #121 lost credential data; subsequent PRs preserved paths
2. **Never degrade credential-dependent builders** — Public workflows must isolate credential lanes
3. **Validate YAML before merge** — Invalid block-scalars cause silent zero-job runs (#122 fixed)
4. **Deterministic regression tests** — Self-healing masks bugs; #125 added non-self-healing gates
5. **GitHub Actions PR setting prerequisite** — Actions-created PRs require repository setting + default workflow permissions `read`
6. **Data360 HTTPS fallback** — HTTP 417 requires source-specific fallback (#123)
7. **Full in-job gates for bot PRs** — Lint → tests → build → commit before PR creation
8. **i18n parity required** — All new data fields must have EN/ZH keys
9. **Fact-checker alignment** — No assumptions; data sourcing requires verification
10. **Consolidate related decisions** — Reject → redesign → re-review cycles benefit from single consolidated record

### Data & Workflow Final State

**PR Merge History**
- #121: Rejected (destructive data loss)
- #122: Merged 0db282bedc2563ab7aadbcd65ce240144fc3d9c0 (YAML fix)
- #123: Merged 0bc3adee4bd1307531173edaa1db501ff7601a36 (HTTP 417 fix)
- #124: Merged 49f03ab9fe3db1849e3b861cd248d0c64611c5e4 (offline rebuild)
- #125: Merged 2389787241a87e94adedd2ce6b7db236b6520bac (workflow hardening)

**Final Data Results**
- **Models:** 344 OpenRouter / 1,008 endpoints / 69 providers
- **WI notices:** 620 preserved (vs. initial destructive loss in #121)
- **Files:** 21 public/credential-free
- **Warnings:** 10,971 (monitored)

**Validation Summary**
- Tests: 1321 passed (+ 17 refresh cycle)
- Lint: 0 violations (140 files)
- Build: exit 0
- Smoke: 10/10 routes HTTP 200
- Post-merge CI: 29308719578 ✓, Pages: 29308719588 ✓, Squad Release ✓

