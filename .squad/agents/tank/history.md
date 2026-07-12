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


## 2026-07-10T03:57:05.444+00:00 — Audit Session: Data Sourcing & Visualization Opportunities

Tank completed read-only audit of data sources, collected datasets, joins, gaps, and caveats. All datasets validated for provenance, compliance, and freshness wiring. Joins across SOC, country, AI market, labor demand, and talent bottleneck layers are structurally sound and production-ready.

**Visualization Opportunities Identified (No Action Pending):**
- Evidence Convergence Strip (talent + demand + exposure layered over time)
- Talent-Bottleneck-to-Reskilling Bridge (bottleneck severity → adjacent career pathways with ROI estimates)
- Exposure-to-Outcome Reality Matrix (exposure score paired with 2-year wage/employment outcomes)

**Prerequisites:** Issue #77 (provenance/freshness cues) assigned to Tank & Neo, in-progress; missing NAICS-SOC bridge would unlock subnational mapping; recommend post-feature-parity investigation.

See orchestration-log/2026-07-10T03-57-05.444+00-00-tank.md and log/2026-07-10T03-57-05.444+00-00-session-audit.md for full findings.


### 2026-07-10T09:40:05Z — Issues #103/#104/#105 shipped, bundle/a11y retrospective complete

**Issue #103: Evidence Convergence Strip (PR #106 merged)**
- Shipped UI convergence strip (evidence artifacts over time)
- Tests: 587 pass, a11y clean
- No rejection cycles; Trinity approved on first design review
- Learning: Strict-lockout on contract-bypass patterns works; early rejection saves iteration costs

**Issue #104: Reskilling Bridge (PR #107 merged, 3-cycle strict-lockout)**
- Shipped canonical SOC join + UI reskilling bridge
- Final tests: 663 pass, a11y green
- Rejection cycles: v1 (synthetic SkillTransitionChart, listbox semantics, dead i18n); v2 (aria-required-children blocker); v3 cleared both
- Bundle regression: client page imported heavy raw JSON (h1b ~380KB + job-postings ~1.34MB + projections ~490KB); Neo refactored to server-only prep + server/client split; Tank added server-only guards; result: 905.1KB → 394.1KB (budget: 700KB)
- Learning: Raw data imports in client components are highest bundle risk. Require server-side prep for all non-derived datasets. Always guard heavy lib modules with `import "server-only"`.

**Issue #105: Exposure→Outcome Matrix (PR #108 merged, post-rejection work pending)**
- Shipped correlation matrix with employment/wage outcomes
- Tests: 751 pass (maintained optimized 394.1KB bundle)
- Trinity rejection (committed): nested-interactive SVG (a11y critical), focus-visible missing, EN/ZH hardcoded, dead test references
- Final revision locked out Neo/Mouse/Switch for component/i18n fixes; Tank reassigned for a11y remediation under per-artifact lockout
- Learning: SVG role="img" + focusable children violates WCAG; focus must mirror hover emphasis. Hardcoded user strings (even descriptive metadata) must route through i18n. Dead test references must be atomically cleared.


## 2026-07-11T00:00:00Z — Wage-Tier Polarization & Major Economy Occupational Mix Batch Closeout

**PRs shipped:** #110 (/sectors wage-tier polarization) | #112 (/global occupational mix)
**Batch focus:** International data governance, compliance closure, server/client boundary enforcement

### Implementation Learnings (Data Layer)

**Server-Only Determinism in Data Helpers**
- Helper functions (`getWageTierPolarization()`, `getOccupationalMixByCountry()`) marked `import "server-only"` enforce architecture boundary at bundle time
- Tercile calculation deterministic: salary ASC, socCode ASC tie-break, midpoint tier assignment (no floating-point drift)
- Employment-weighted logic explicit: missing-employment rows excluded early, not null-checked at render time
- Architecture tests validated no server-only code leaks into client islands (0 violations across both PRs)

**ILOSTAT CSV Integration Pattern (Live Builder)**
- Key-free builder (`/global` route): calls ILOSTAT `rplumber/SDMX` endpoint, validates before write, no hardcoded keys
- Migration risk flagged: www.ilo.org → webapps.ilo.org host migration (documented in builder as criterion)
- CSV parse validates expected columns before indexing; explicit error on malformed/missing fields
- Shares calculated deterministically (no imputation); null rows surfaced to compliance audit trail

**Data Exclusion Logic (CAN/JPN)**
- Canada excluded: NOC occupational classification (not ISCO-08); mapped data would be non-comparable
- Japan excluded: ISCO-08 major groups missing in published survey; no imputation applied (safer to omit than guess)
- Exclusion reason documented in UI caveat + code comment; auditable in compliance record

**No Synthetic/International Exposure Scoring**
- US-derived AI exposure scoring (Claude usage, GenAI diffusion) rejected for international context
- Reason: SOC-to-ISCO-08 bridge would require methodological alignment study (deferred)
- Safe alternative: /sectors (US wage-tier + US exposure) | /global (9-country occupational mix only)
- Server-side validation prevents accidental cross-national scoring; data never co-mingled in one dataset

### Quality Validation Patterns

**Test Coverage & Bundle Optimization (846 + 1,098 = 1,944 tests)**
- Deterministic tercile tests: verify midpoint assignment, salary/socCode tie-break, missing-employment exclusion
- Shares validation: sum to 1.0 per country, no NaN, no negative values
- Server-only boundary: architecture tests confirm client imports contain no raw JSON files (h1b, job-postings, projections patterns from prior issues #104/#107)
- Bundle check stable: 394 KB (shared chart infrastructure; no regression vs #107/#108)

**Accessibility & i18n Patterns**
- CareerTrendChart canvas: `aria-hidden="true"` + `<figure aria-label>` + sr-only `<figcaption>` (accessible data table required)
- i18n parity: 31 new keys per language (EN + ZH); all user-visible text routed through `t("sectors")`/`t("global")`
- Axe-core gates: 0 serious/critical violations; /sectors and /global focused runs 0 violations each

**Compliance & Provenance Wiring**
- CSV download button wired for audit trail (user can export + verify source)
- Data-as-of badge: occupational-snapshot date + ILOSTAT update frequency documented
- Caveat language: proxy descriptive data, no causal claims, no completeness claims for missing countries

### Reviewer Cycle Improvements

**Trinity Approval Pattern (No Rejection Cycles)**
- Wage-tier research + ILOSTAT vetting completed before implementation (no discovery during review)
- Data governance decisions pre-approved in orchestration phase (ILOSTAT CC BY 4.0, CAN/JPN exclusion reasons documented)
- Implementation matched approved scope exactly (no scope creep; no re-review needed)

**Lockout Enforcement**
- Tank + Switch (#110 revision) locked out per policy; no re-admission for future cycles
- Trinity + reviewer agents (#112 strict-lockout revision) locked out; approval gates satisfied
- Protocol enforced cleanly with zero conflicts

### Lessons for Future International Features

**ILOSTAT Sustainability Checklist**
- ✅ License explicit at data-file level (CC BY 4.0), not just report wrapper
- ✅ Host migration documented (www.ilo.org → webapps.ilo.org); builder must adapt
- ✅ ISCO-08 major groups (1-digit) are an international standard; shares are comparable
- ✅ Coverage ≥98% per country; ≥9 of 10 occupational groups; recency (2025)
- ✅ Alternative: Eurostat LFS (EU only; check license) or national labor offices (license per country)

**Deferred Decisions (Not Blockers)**
- ILO 2025 occupational exposure supplement: wait for explicit data-file license before integration
- NAICS-SOC bridge: would enable subnational reskilling pathways (Phase 2 prerequisite)
- Wage-outcome elasticity retrospective: requires 2+ years paired wage/employment data (v1.2 target)



### Tank: Consumer GenAI Diffusion Review (Batch 2026-07-11)
- Reviewed PR #115 scope (research phase, boundary hygiene, selection rationale)
- Noted Neo's lockout due to duplicate SR naming / test validity rejection by Mouse
- Confirmed Trinity's revision owners all UI/a11y/docs updates; approved merge clearance
- No conflict-of-interest revisions required (source evaluation was research-phase decision, not Tank-authored)
