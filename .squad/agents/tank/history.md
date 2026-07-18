# Tank History

## Summary (2026-07-02 to 2026-07-11): Data Layer & Infrastructure Implementation

Implemented 8 major data pipelines and library layers: AI Frontier (1033 models → 528 entries, CC BY), Job Postings (national survey), Employment Projections (BLS), Talent Bottleneck (4-way SOC join with H-1B + projections + postings), OpenRouter (340 endpoints), OpenRouter Geography (publisher + endpoint-provider lenses), AI Company Stocks (47 companies + 7 categories + Alpha Vantage integration), ORS Automation Friction, Wage-Tier Polarization (deterministic tercile, employment-weighted), ILOSTAT International Occupation Mix (9-country ISCO-08 normalized shares, CC BY 4.0). All implementations server-only guarded (`import "server-only"`), determinism-tested, bundle-monitored (394.1 KB stable across all). Coordinate strict-lockout revisions: Per-artifact lockout enforced for conflict-of-interest isolation on #104 (server/client split), #110 (wage-tier revision), #112 (ILOSTAT integration). Data governance decisions captured: No synthetic international exposure scoring (US-derived metrics unsafe cross-nationally); ILOSTAT CC BY 4.0 explicit at file level; Canada/Japan exclusion reasons documented. Offline rebuild durability established: credential lanes preserved, fixture-origin committed, non-self-healing regression tests. Learned: Raw data imports in client components are highest bundle risk; server-only guards prevent transitive JSON bloat; deterministic builders require explicit error handling. No blockers for current data set.

---

## Summary (2026-07-14 to 2026-07-18): Refresh Cycles, AI Frontier Data Contracts & Doc Reconciliation

*Summarized 2026-07-18T20:30Z by Scribe (history exceeded 15KB). Detailed doc-reconciliation entries retained below.*

- **Weekly data-refresh learnings (#122–#125):** preserve last-known-good credential lanes (public builders must isolate credential-dependent data; never degrade credential access in refresh); offline rebuild durability requires committed fixture-origin metadata + non-self-healing (deterministic) regression tests; bot PRs need full in-job gates (lint → tests → build → commit/push → then PR).
- **Release recovery (2026-07-14):** SPRINT_SUMMARY conflict-marker recovery via 4-phase strict-lockout — Tank authored the file, so revision reassigned to Trinity; Mouse re-reviewed → APPROVED. Cross-domain reassignment prevents authorship-lock bottlenecks.
- **Full-site Playwright & data audit (2026-07-16):** implemented neutral/unknown placeholder for careers with no BLS Job Zone (omission creates data-integrity gaps) and enforced OEWS wage priority as the single canonical cross-surface source; post-fix Playwright 1,674/1,674 pass. Verify audit scripts before treating recomputed results as defects.
- **AI Frontier Methodology Release (PR #129, dc587bea):** defined compute-known subset (528 of 1,035 sources) with explicit coverage caveat; default view uses full dated catalog; JSDoc clarifies `frontierCount` ≠ current frontier / capability and `openWeightsCount` includes restricted-use/non-commercial. Data-layer revision triggered authorship conflict → Trinity escalated to Neo for independent revision.
- **AI Frontier geo data contract (PR #130, 046b32f):** added `iso3` on `CountryLeaderboardEntry` (derived offline from country name via `scripts/lib/country-iso3.mjs`, then GATED on presence in `public/world-countries.geo.json`), `getCountryLeaderboardGeo()` → `CountryGeoEntry[]` (fair full-catalog metrics only, omits compute/frontier), `getCountryGeoCoverage()` + `aggregates.countryGeoCoverage`, validator gate. Coverage 32/35 (Multinational aggregate, Singapore & Hong Kong have valid ISO3 but no map polygon). Learnings: geo join keys must be gated on actual map geometry, not just a name→code table; a geo selector must project a narrower ranking-safe shape (dedicated `CountryGeoEntry`) to avoid leaking compute/frontier metrics onto a surface that reads as a country ranking.
- **Origins treemap data contract (PR #132, 758b351):** added `CountryOriginEntry` + `getCountryOriginShares()` — a pure read-time projection over `aggregates.countryLeaderboard`. 34 real origins (excludes non-geographic `Multinational`; INCLUDES Singapore + Hong Kong since a treemap needs no polygon); fair metrics only (`recentCount`, `modelCount`, `openWeightsCount`), so a capability ranking is structurally unrenderable; component computes share at render time. Deterministic order; Node 20 safe.

---

## Recent Sessions

### 2026-07-18T04:51Z — docs/frontier.md post-#132 reconciliation (map→treemap)

**Cycle:** Doc-only reconciliation of `docs/frontier.md` after PR #132 (commit `758b351`) removed the frontier "Tracked Model Origins" world-map choropleth (deleted `FrontierOriginsMap.tsx`) and shipped `FrontierOriginsTreemap.tsx` consuming `getCountryOriginShares()`. Owned file only: `docs/frontier.md`. No code/tests/i18n/components touched.

**Verified against code first:** `getCountryLeaderboardGeo()`/`getCountryGeoCoverage()`/`CountryGeoEntry`/`CountryGeoCoverage` have ZERO consumers in `components/` + `app/` (only `lib/ai-frontier.ts` defines them + `tests/ai-frontier.test.ts` covers them). `FrontierOriginsTreemap.tsx` imports `getCountryOriginShares`/`CountryOriginEntry`. `public/world-countries.geo.json` still used by other surfaces (`WorldChoropleth`).

**Sections changed:**
- Header **Last audited:** bumped 2026-07-17 → **2026-07-18** (Owner: Tank unchanged).
- **§8** reframed to "RETAINED, not currently consumed": added a status callout that the frontier choropleth was removed in #132 and replaced by the §9 treemap; geo selectors/types are retained-but-unused on the frontier surface, still tested; preserved the iso3-no-ranking guardrail; noted geo.json is still used elsewhere; cross-references §9.
- **`CountryGeoEntry`** and **`CountryGeoCoverage`** schema sections: added one-line notes that they back the retained geo selectors, no live frontier consumer post-#132.
- **`AIFrontierAggregates`** `countryGeoCoverage` inline comment: reworded to "retained ... no live frontier consumer post-#132".
- **Selectors table**: `getCountryLeaderboardGeo()`/`getCountryGeoCoverage()` relabeled NEW→RETAINED (no live consumer, still tested); `getCountryOriginShares()` relabeled to CURRENT origin view.
- **Schema Contracts for Neo → Country leaderboard**: points Neo at `getCountryOriginShares()` + treemap (§9) as current origin view; marks the choropleth path (`getCountryLeaderboardGeo()`+`getCountryGeoCoverage()`) as retired/retained-but-unused; kept guardrails (no iso3 ranking, no compute/frontier on origin surface).
- **Testing**: refreshed stale counts "over 100 / 17 describe blocks" → verified **over 170 cases / 24 describe blocks**; noted the retained geo-safe projection block + the `getCountryOriginShares()` treemap block are both present; pointed component treemap coverage at `tests/components/FrontierOriginsTreemap.test.tsx`.
- §9 already consistent (34 origins, Multinational excluded, Singapore/HK included, fair metrics only) — left intact and cross-referenced.

**Validated:** `git --no-pager diff --check` clean; `git status` shows only `docs/frontier.md` among product files. No code/tests changed. Doc-only pass — build/test not required.

**Recommendation (orphaned geo selectors):** RETAIN for now, schedule a SEPARATE follow-up cleanup PR to reassess.


### 2026-07-18T05:00Z — All-system data-layer docs reconciliation (doc-only)

**Cycle:** Audited & reconciled my 5 owned data-layer docs vs current code after #114/#115, #117, #120, #121–#125. Doc-only; no code/tests. Owner lines unchanged; "Last audited" bumped to 2026-07-18 only on docs actually changed.

**Verdicts:** global.md = ACCURATE (no change, no date bump — #114/#115 Consumer GenAI Diffusion feature + guardrail already correct). occupation-data-model.md / labor-market.md / visa.md / data-pipeline.md = UPDATED (date-bumped).

**Key fixes (code-verified):**
- occupation-data-model.md: AEI migration — `automationProbability` is now an alias of `aiExposure` (Frey–Osborne moved to exposure "automation" lens); `automationRisk` is percentile-calibrated (>92/>80/>55 pctile), not fixed <25/50/75 cut-points; growthRate is annualized % (not decimal fraction); `CareerInsight` gained `aiExposure` and correct history types; validation = fixed floor 680 + canonical-sector (≤22) invariant, dropped the nonexistent "aiExposure 0–1" check.
- labor-market.md: `WarnNotice` interface was fully wrong → replaced with real shape (company/county/city/employees/noticeDate/effectiveDate/layoffType/state/stateName); added #117 WARN effective-date plausibility window (2010 .. UTC year+2, scrub→null, validator throws); fixed assertLiveStates owner (WARN+state-labor, not JOLTS).
- visa.md: validation floors corrected (occupations ≥50, byState ≥20, topEmployers ≥50, certifiedLcas ≥200k/yr); removed false assertLiveStates-for-h1b claim. Later same pass: added the full **Talent Bottleneck Lens** section (coordinator-approved in-doc addition; visa.md now authoritative home) — `getTalentBottleneckData()`, `TalentBottleneckRow`, SCORE_WEIGHTS scoring, `TalentBottleneckLens` component, RAI framing — all code-verified.
- data-pipeline.md: added scripts/lib/{data360,sector-taxonomy,country-iso3}.mjs to shared infra (data360 = #123 HTTP/1.1 fallback incl. worldbank data360); build:data now shows step 11 build:downloads; build:og output og-image.png→og.png; documented #120 per-lane provenance selectors in lib/provenance.ts.

**Flags → coordinator:** (1) Talent Bottleneck was under-documented → coordinator approved the in-doc visa.md section (actioned). (2) No obsolete/deletion candidates. (3) ai-company-stocks intentionally undocumented (README non-goal) — respected.

**Validated:** `git diff --check` clean; docs-only diff; all relative links resolve; no .squad/** committed.

**Learning:** Two recurring doc-staleness patterns across the data docs — (a) validation invariants described as dynamic "≥80% of committed count" when the code uses fixed `assertMinRows` integer floors (680/50/20), and (b) the AEI migration silently changed `automationProbability`/`automationRisk` semantics repo-wide, so any doc citing "Frey–Osborne" or fixed risk cut-points was stale. Grep these two patterns first on future data-doc audits.


### 2026-07-18T20:30Z — System-wide docs reconciliation shipped (PR #133)

**Team update (Scribe-logged):** PR #133 reconciled the full `docs/` set to current code and squash-merged to main as **7a6a876**. Tank updated occupation-data-model.md (AEI migration, percentile automationRisk, annualized growthRate, validation floors), labor-market.md (real WarnNotice shape + #117 date window), visa.md (validation floors + full Talent Bottleneck Lens section), data-pipeline.md (#120/#123 shared infra), and frontier.md (post-#132 map→treemap; geo selectors RETAINED-but-unused, flagged for a follow-up cleanup PR); verified global.md accurate. Team totals: 15 docs updated, 4 verified accurate.


### 2026-07-18T06:45Z — Dead-code / orphan cleanup shipped (PR #134)

**Team update (Scribe-logged):** PR #134 (deletion-only cleanup) squash-merged to main as **b069f96**. Tank removed the dead frontier geo selectors (`getCountryLeaderboardGeo()`/`getCountryGeoCoverage()` + types `CountryGeoEntry`/`CountryGeoCoverage`) from `lib/ai-frontier.ts` and their test block, deleted the orphaned `lib/warn.ts` (superseded by `warn-client.ts`), dropped the orphaned `countryGeoCoverage` field from `data/ai-frontier.json` + `build-ai-frontier.mjs` + `validate.mjs`, removed the unused `@types/node-fetch` devDep, and reconciled docs. Retained `iso3`/`country-iso3.mjs`, `world-countries.geo.json`, `axe-core`, and the live WARN pipeline. Net ≈ −430 lines / 12 files. Gates green: lint clean, 1622 tests / 88 files, build 796 pages. Trinity APPROVED. Follow-ups flagged (not actioned): declare `d3-geo` explicitly; 5 pre-existing TS2352 errors in `tests/warn-data.test.ts` (ungated).


### 2026-07-18T07:25Z — Dependency + test-type hygiene shipped (PR #135)

**Team update (Scribe-logged):** PR #135 squash-merged to main as **6250076**, closing BOTH follow-ups flagged in #134. (1) Declared `@types/d3-geo@^3.1.0` as an EXPLICIT devDependency (via `npm install --save-dev`, `package-lock.json` updated); did NOT add the runtime `d3-geo` package — it is a type-only import at `components/charts/WorldChoropleth.tsx:6`, and grep confirms zero runtime `d3-geo` imports repo-wide. (2) Fixed the 5 pre-existing TS2352 errors in `tests/warn-data.test.ts` (L651/666/670/678/682) by routing each cast through `unknown` first (`(x as Record<string, unknown>)` → `(x as unknown as Record<string, unknown>)`) — assertions preserved verbatim, runtime behavior identical. 3 files changed. Gates green: lint clean, **`npm run typecheck` now 0 errors repo-wide**, 1622 tests / 88 files, build 793 pages. Learning: prefer `@types/*` over the runtime package for type-only imports; when TS2352 blocks a legitimate provenance-field cast, convert through `unknown` rather than widening the interface.
