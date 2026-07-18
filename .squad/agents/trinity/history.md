# Trinity History

## Summary (2026-07-02 to 2026-07-11): Architecture Review & Approval Lifecycle

Completed 15 design reviews and full approval cycles for major features: AI Frontier, Talent Bottleneck, Employment Projections, Readiness Gap, OpenRouter Ecosystem, AI Company Stocks, ORS Automation Friction, Evidence Convergence Strip (#103), Reskilling Bridge (#104, 3-cycle strict-lockout), Exposure-Outcome Matrix (#105), Wage-Tier Polarization (#109), International Occupation Mix (#111), PR #107 forward fix (server/client split bundle optimization 905 KB → 394 KB), PR #115 Consumer GenAI Diffusion. Enforced strict-lockout protocol on conflict-of-interest artifacts: Tank/Switch locked out (#110 wage-tier), Neo/Switch locked out (#104 reskilling bridge), Neo/Mouse locked out (#105 exposure-outcome). Identified blockers (a11y violations, i18n hardcoding, dead test references) and orchestrated independent revisions by non-authors, reducing re-work cycles. Key learnings: Real Turbopack builds required for accurate bundle measurement; SVG role="img" + focusable children violates WCAG; hardcoded user strings must route through i18n; dead test references must be atomically removed. Approved all Phase 1–2 features for merge. No blockers remain.

---

## Design Review & Approval Ledger

### Recent Cycles

**Issue #103: Evidence Convergence Strip (PR #106 merged)**
- ✅ APPROVE (design review) — no rejection cycles
- Canonical data-selector integration, proper i18n wiring, a11y gates clean
- Learning: Strict-lockout on contract-bypass patterns prevents iteration

**Issue #104: Reskilling Bridge (PR #107 merged, 3-cycle strict-lockout → final APPROVE)**
- ✅ v1: REJECT (synthetic SkillTransitionChart, listbox a11y, dead i18n keys)
- ✅ v2: REJECT (aria-required-children blocker after strict-lockout revision)
- ✅ v3: APPROVE (all blockers resolved under per-artifact lockout)
- Bundle regression: Tank + Switch revised for server/client split (905 KB → 394 KB)
- Learning: Raw data imports are highest bundle risk; deterministic tercile calculation works cross-nationally

**Issue #105: Exposure-Outcome Matrix (PR #108 merged, post-rejection work pending)**
- ✅ REJECT (nested-interactive SVG a11y critical, hardcoded i18n, dead test references)
- ✅ APPROVE (post-rejection revision complete under per-artifact lockout)

**Issue #109: Wage-Tier AI-Exposure Polarization (cycle 2/3) — ✅ APPROVE**
- All cycle-1 blockers resolved; gates all green
- Tank (lens wiring), Switch (CareerTrend a11y) locked out per strict-lockout
- Deterministic tercile math verified; no scatter or causal duplication

**Issue #111: International Occupation Mix (cycle 2/3) — ✅ APPROVE**
- All cycle-1 blockers cleared (typecheck RED, a11y RED, i18n copy, unicode churn)
- Neo, Tank, Switch, Mouse, Rai, Fact Checker worked in strict-lockout phases
- ILOSTAT CC BY 4.0 compliance explicit; CAN/JPN exclusion documented
- Coverage ≥98%, ISCO-08 major groups 1–9, 2025 data, deterministic shares

### 2026-07-14T06:41:23.426Z — Release Recovery Revision: SPRINT_SUMMARY conflict resolution

**Role:** Reviser (Tank conflict of interest → Trinity independent author)  
**Manifest:** Phase 3 — Sync revision after Mouse lockout reassignment  
**Outcome:** ✓ Conflict markers resolved; commit cc69de0 → tip 5c08e10

**What happened:** Per strict-lockout protocol, Tank (original author) could not revise their own work → reassigned to Trinity. Trinity independently resolved all whitespace conflicts and rebase markers without modifying content.

**Status:** ✅ Revised artifact approved by Mouse re-review. Ready for PR merge to main.

---

### 2026-07-16: Full-site Playwright and data audit cycle — design review, triage, final review, release

Trinity conducted comprehensive cycle leadership: design review (exhaustive route/viewport contract), D1-D7 triage (7-category defect manifest with exclusive file ownership), final review (all gates green: lint/tests/build/Playwright/a11y/i18n), and background release execution (PR #128 → b416cbef14aac9070a16e525e0dfe021d574f53e).

**Key responsibilities:**
- Design review: Defined 791-route/viewport/data contract; exclusive file ownership for 31-file fix
- Triage: Consolidated D1-D7 defect manifest (hydration, overflow, Job Zone, wage, i18n, tests, JSDoc)
- Implementation coordination: Oversaw Neo/Tank parallel work under exclusive ownership
- Final review: Validated all gates green before pre-ship and release
- Release execution: PR #128 merged; commit b416cbef14aac9070a16e525e0dfe021d574f53e on main

**Key learnings:**
- Exclusive file ownership during triage prevents concurrent modification conflicts
- Design contracts (route count, viewport coverage) must be defined before audit to avoid scope creep
- Comprehensive gate validation (lint/tests/build/Playwright/a11y/i18n) required for full-site changes


### 2026-07-17T21-23-54: AI Frontier Methodology Release (PR #129) — Strict-Lockout Lead

**Cycle:** Full geopolitical/fairness review, compute-filtered methodology consolidation, disclosure-bias remediation
**Verdicts:** ✅ APPROVE (design review, final review, release execution)

**Role & Learnings:**
- **Design & Contract:** Defined six-metric selector contract (recentCount default, frontierCount opt-in), establish compute-known subset vs full dated catalog separation, exclusive file ownership across 31 files
- **Strict-Lockout Lead:** QA found docs trailing whitespace (FAIL) → detected Tank authorship conflict on data layer → reassigned revision to Neo (independent agent) → Neo executed independent docs cleanup → re-verified all gates
- **Learning:** Authorship-based reassignment on strict-lockout paths accelerates resolution; prevents self-approval cycles. Data-layer revisor (Tank) cannot revise data-dependent frontend without conflict escalation.
- **Final Review:** All gates green (lint/tests/build/Playwright/a11y/RAI YELLOW→GREEN); verified China context in disclosure, restricted-use caveat in mix card, data definitions rendered in UI

**Release Execution:**
- ✅ PR #129 merged: commit 6002bcb (branch) → dc587bea4255059315af548fdd6e00999d1d40c2 (main merge)
- ✅ Remote branch deleted
- ✅ CI: lint ✅ tests ✅ build ✅


## 2026-07-18T01:47:09Z — AI Frontier UI enhancement release
Led design review for PR #130: selected Tracked Model Origins map, compute-frontier envelope, and hero sparklines within PR #129 guardrails. Final review approved after lint, build, static export, and 1,594 tests passed; PR #130 merged as 046b32f.


### 2026-07-18T02:55Z — FrontierLeadersChart redesign approved
Trinity approved final review for PR #131 after lint, 1,616 tests, build, and diff-check passed. PR merged to main as 43b21ab.


### 2026-07-18T04:10Z — Origins Treemap redesign final review — ✅ APPROVE
Gating review of the "Where Tracked Models Are Developed" world-map → share/concentration treemap redesign (FrontierOriginsMap.tsx → FrontierOriginsTreemap.tsx). Verified against my design decision (Trinity-redesign-where-tracked-models-are-developed-as-a-c.md).
- **Design conformance (1–5): all green.** d3.treemap/hierarchy from existing d3@^7.9.0 (NO package.json change); pure SVG, no geojson fetch, no canvas. getCountryOriginShares() → 34 origins (Multinational excluded, Singapore+Hong Kong included), fair fields only (recentCount/modelCount/openWeightsCount + country/countryShort/iso3); compute/frontier fields structurally absent (interface + regression test). Uniform violet tiles (area sole encoding, no value ramp/podium); decorative SVG aria-hidden, no role=img, no focusable tiles; semantic 3-col table (Country/Records/Share%); reduced-motion safe. AIFrontierView rewired, ssr:false dropped → section prerenders. EN/ZH parity; obsolete map* keys removed with absence guards; no dangling refs. Deterministic (no Date.now/Object.groupBy).
- **Gates:** lint ✅ · test:run 1631 passed (88 files) ✅ · build ✅ · out/frontier.html emits treemap section server-side (42 rects, "Share of tracked records (%)" header, coverage note resolved to "34 attributed countries", zero geoNaturalEarth1 / world-countries.geo.json / Map-metric artifacts) ✅ · diff --check clean ✅.
- **Authors:** Neo (component/wiring), Tank (selector), Switch (i18n), Mouse (tests). No rejection → no lockout required.


## 2026-07-18T03:20:59.028+00:00 — Frontier Origins treemap shipped (PR #132)

Trinity selected the share/concentration treemap direction for "Where Tracked Models Are Developed" and later approved the implementation. Final gates were green: lint, 1,631 tests, build/static export, `diff --check`, Rai GREEN, and PR #132 squash-merged to main as 758b351.


## 2026-07-18T04:58Z — All-system docs audit (pass 1/2): platform · i18n · transparency

Owned-doc reconciliation against current code (issues #120–#132 + 654a753). Verdicts: all 3 UPDATED-with-changes, all date-bumped to 2026-07-18.
- **platform.md:** rewrote the stale Data Refresh step list (it falsely enumerated `build:jolts`/`build:data`, which are credential-gated & EXCLUDED) to reflect `npm run data:refresh` → `scripts/refresh-data.mjs` MANIFEST (17 key-free builders), the full lint/test/build gate step on the generated workspace, `data/scheduled-refresh` branch, and `gh pr create`. Added CI Node 20 fact (`setup-node@v4`) + no ES2024-safe claim.
- **i18n.md:** added `tests/sectors-i18n.test.ts` parity gate. 24-namespace catalogue verified accurate; frontier key churn needed no change (no key-count claims in doc).
- **transparency.md:** fixed `getLatestAsOf` (chronological, not lexicographic), added `asOfToComparableDate`/`selectLatestAsOf` exports and localized-guardrail note (#120, `useT("common")` guardrailLabel_/guardrailDesc_ keys), added `provenance.test.ts` + `evidence-convergence.test.ts` to tests. Evidence taxonomy (9 families/7 conclusions) + CLEARED(15)/FLAGGED(8) verified accurate.
- **Flags:** no NEW-doc or OBSOLETE-doc candidates in my scope. README-index refresh notes compiled (Node/runtime row missing in Tech Stack; frontier component list stale post #130–#132) for the deferred final pass — README.md NOT edited.
- **Validation:** `git diff --check` clean; docs-only; README untouched; sibling-owned dashboard/frontier/testing docs left alone.
Detail: decisions/inbox/trinity-docs-allsystem.md.

## 2026-07-18T05:27Z — All-system docs audit (pass 2/2): README index refresh

Final pass — refreshed the docs/README.md index I own. No docs created/deleted; all 18 Quick Links rows verified (files exist, owners correct) → structure unchanged. Exact edits:
1. Header **Last updated** 2026-07-11 → 2026-07-18 (Maintained by: Trinity (Lead) kept).
2. Technology Stack: ADDED `Runtime` row — Node 20 (CI + `data:refresh`, per ci.yml/refresh-data.yml `setup-node`) · Node 22 (GitHub Pages deploy, deploy-pages.yml). Versions verified against `.github/workflows/*.yml`.
3. Component inventory `frontier/`: replaced stale `AIFrontierView, ComputeTimelineChart, CostPowerTrends` with the current 6 in `components/frontier/*` — `AIFrontierView, ComputeTimelineChart, CostPowerTrends, FrontierLeadersChart, FrontierMixCards, FrontierOriginsTreemap` (post #130–#132; `FrontierOriginsMap` removed, not reintroduced).
Re-verified accurate & preserved verbatim: Quick Links (18 docs/owners), Architecture Overview (Next.js 16 static export, React 19), route + system mermaid diagrams, 18-subsystem taxonomy, namespace-catalogue mention, workflow refs, Documentation Gaps.
Validation: `git --no-pager diff --check` CLEAN; docs/README.md is my only edit this pass; no `.squad/**` staged, no branch/commit. Detail appended to decisions/inbox/trinity-docs-allsystem.md.
### 2026-07-18T20:30Z — System-wide docs reconciliation shipped (PR #133)

**Team update (Scribe-logged):** PR #133 reconciled the full `docs/` set to current code and squash-merged to main as **7a6a876**. Trinity (Lead) reconciled docs/platform.md (refresh-data.yml 17-builder key-free manifest + CI Node 20/ES2023 baseline), docs/i18n.md (added `tests/sectors-i18n.test.ts` parity gate), docs/transparency.md (getLatestAsOf chronological-latest fix + #120 provenance exports/localized GuardrailBadge), and refreshed the docs/README.md index (date, Node 20/22 runtime row, 6-component frontier inventory). No docs created/deleted; all 18 subsystem docs retained. Team totals: 15 docs updated, 4 verified accurate.


### 2026-07-18T06:45Z — Dead-code cleanup review gate (PR #134)

**Team update (Scribe-logged):** Trinity gated PR #134 (Tank's deletion-only cleanup). Independently verified reachability of every removed symbol/file via repo-wide grep (zero live consumers), confirmed `getWarnNotices` in `WarnPressureView.tsx` is a distinct local function (not the deleted `lib/warn.ts` helper), verified data/builder/validator consistency (`tests/data-schema.test.ts` accepts the hand-edited `data/ai-frontier.json`; no regen drift), confirmed no collateral damage to retained items (`iso3`, `country-iso3.mjs`, `world-countries.geo.json`, `getCountryOriginShares()`), and confirmed scope discipline (no `.squad/**` staged). Re-ran gates green: lint clean, 1622 tests / 88 files, build 796 pages. Verdict ✅ **APPROVE** (one non-blocking doc nit — two stale `lib/warn.ts` refs — since fixed by Tank). Squash-merged to main as **b069f96**.
