# Squad Decisions

## Active Decisions

### 2026-07-18T07-25-00: Declare @types/d3-geo explicitly + fix TS2352 casts in warn-data test (PR #135)

**By:** Tank (Backend/Data 🔧, implementer)
**What:** Dependency + test-type hygiene follow-up that closes BOTH durable follow-ups flagged in the PR #134 entry. (1) Declared `@types/d3-geo@^3.1.0` as an EXPLICIT devDependency (via `npm install --save-dev @types/d3-geo@^3.1.0`, so `package-lock.json` updated correctly); did NOT add the runtime `d3-geo` package. (2) Fixed the 5 pre-existing TS2352 errors in `tests/warn-data.test.ts` (L651, L666, L670, L678, L682) by routing each cast through `unknown` first (`(x as Record<string, unknown>)` → `(x as unknown as Record<string, unknown>)`). 3 files changed.
**References:** PR #135, squash-merge commit **6250076** on main, orchestration-log/2026-07-18T07-25-00Z-tank.md, log/2026-07-18T07-25-00Z-dep-test-hygiene.md, decisions/inbox/tank-dep-test-hygiene.md, `package.json`, `package-lock.json`, `tests/warn-data.test.ts`, `components/charts/WorldChoropleth.tsx`

**Why:**
- **`@types/d3-geo` (type-only, no runtime package):** `d3-geo` is used ONLY as a type-only import at `components/charts/WorldChoropleth.tsx:6` (`import type { GeoPermissibleObjects, ExtendedFeatureCollection } from "d3-geo";`). Repo-wide grep confirms NO runtime import (`from "d3-geo"` / `require('d3-geo')`) anywhere — the only other hits are prose comments in `tests/components/WorldChoropleth.test.tsx`. Type-only imports are erased at build, so the runtime package is not needed; adding it right after the #134 dead-code cleanup would be self-defeating. The `@types/d3-geo` types previously resolved only transitively via `@types/d3`; declaring them explicitly (matching installed 3.1.0) removes reliance on transitive resolution while keeping the dependency footprint minimal.
- **TS2352 casts:** The 5 casts assert-on/iterate provenance fields (`buildStatus`, `dataFreshness`, `preservedGeneratedAt`) that intentionally are NOT on the `WarnCoverageEntry`/`WarnSource` interfaces (the tests verify runtime provenance metadata beyond the declared shape). TypeScript's own hint is to convert through `unknown` first; `as unknown as Record<string, unknown>` is the minimal, idiomatic fix — every assertion preserved verbatim, runtime behavior identical, only the compile-time cast path changed.

**Validation:** `npm run lint` clean; `npm run typecheck` **0 errors** (all 5 warn-data TS2352 gone, repo fully typecheck-clean); `npm run test:run` **1622 tests / 88 files** pass; `npm run build` succeeds → static export `out/` with **793 HTML pages**.

**Outcome:** Coordinator opened PR #135; squash-merged to main as **6250076**. Closes both PR #134 follow-ups (d3-geo declaration + warn-data TS2352 fix — see annotation on that entry). Mutable Squad state was not committed.

---

### 2026-07-18T06-45-00: Dead-code / orphaned-code / orphaned-data cleanup shipped (PR #134)

**By:** Tank (Backend/Data 🔧, implementer), Trinity (Lead 🏗️, review gate)
**What:** PR #134 was a conservative, deletion-only cleanup on branch `squad/dead-code-cleanup`. Tank audited the repo with an ephemeral `npx knip` run (NOT added to `package.json`) plus reachability grep, then removed only unambiguous dead code / orphans and retained everything uncertain; Trinity independently verified reachability and gated the merge. Net ≈ −430 lines across 12 files.
**References:** PR #134, squash-merge commit **b069f96** on main, branch `squad/dead-code-cleanup` (review tip `ecb62eb`), orchestration-log/2026-07-18T06-45-00Z-{tank,trinity}.md, log/2026-07-18T06-45-00Z-dead-code-cleanup.md, decisions/inbox/{tank-dead-code-cleanup,trinity-cleanup-review}.md, `lib/ai-frontier.ts`, `lib/warn.ts` (deleted), `scripts/build-ai-frontier.mjs`, `scripts/lib/validate.mjs`, `data/ai-frontier.json`, `tests/ai-frontier.test.ts`, `docs/frontier.md`, `docs/labor-market.md`, `docs/README.md`, `lib/warn-types.ts`, `package.json`, `package-lock.json`

**Why:**
- **Tank (implementer):** Removed **(A) dead frontier geo selectors** `getCountryLeaderboardGeo()` / `getCountryGeoCoverage()` + types `CountryGeoEntry` / `CountryGeoCoverage` from `lib/ai-frontier.ts`, and their 9-`it()` describe block from `tests/ai-frontier.test.ts` — zero non-test consumers in `app/` / `components/` / `lib/` post-#132. **(C) orphaned file** `lib/warn.ts` — the old server-side WARN loader with zero importers, superseded by `lib/warn-client.ts` in #47/#60 (~60 unreachable lines). **(D) orphaned data + builder emission** — the `aggregates.countryGeoCoverage` field dropped from the `AIFrontierAggregates` interface, the `build-ai-frontier.mjs` emission + coverage console log, the `scripts/lib/validate.mjs` consistency check (and its now-unused `mappedCount` accumulator), and the committed `data/ai-frontier.json` (hand-edited, NOT regenerated, because the builder fetches live from epoch.ai and a regen would produce a huge unrelated diff). Removed unused devDependency **`@types/node-fetch`** from `package.json` + `package-lock.json` (no `node-fetch` dep/usage anywhere). Updated docs to keep code = truth (`docs/frontier.md` §8 reframed removed; `docs/labor-market.md` + `docs/README.md` `lib/warn.ts` → `lib/warn-client.ts`) and fixed two stale `lib/warn.ts` references surfaced in review (`docs/README.md:292` module-index row, `lib/warn-types.ts:4` comment).
- **Deliberately RETAINED (do NOT re-litigate):** `iso3` join key + `scripts/lib/country-iso3.mjs` (`countryNameToIso3`, `COUNTRY_NAME_TO_ISO3`) + the iso3 geometry gate — still used by `getCountryOriginShares()` (treemap) and validated; `public/world-countries.geo.json` — used by `WorldChoropleth` and other surfaces; `axe-core` devDependency — knip false positive (loaded by `scripts/a11y-test.mjs` via string path, not an import); the live WARN pipeline (`data/warn-notices.json`, `build-warn.mjs`, `build-warn-public.mjs`, `lib/warn-types.ts`, `lib/warn-client.ts`). The large knip "unused exports" (26) / "unused exported types" (112) lists were treated as false positives / intentional API + JSON-contract surface and left untouched (flagged for human review only if a deeper API-surface trim is ever desired).
- **Trinity (review gate):** Independently verified reachability of every removed symbol/file via repo-wide grep (zero live consumers); confirmed `getWarnNotices` in `components/labor/WarnPressureView.tsx` is a distinct local function (takes a state arg), not the deleted helper; verified data/builder/validator consistency (`tests/data-schema.test.ts` runs `validateAIFrontier` against the edited JSON and passes → a fresh regen would not reintroduce drift); confirmed no collateral damage to retained items; confirmed scope discipline (only declared files touched, no `.squad/**` staged). Re-ran gates green. Verdict: ✅ **APPROVE** with one non-blocking doc observation (the two stale `lib/warn.ts` refs), which Tank then fixed.

**Durable note (future follow-ups — recorded, NOT actioned here):** ✅ **BOTH CLOSED in PR #135 (commit 6250076, 2026-07-18).**
1. **`d3-geo` is an undeclared dependency** — used by `components/charts/WorldChoropleth.tsx`, currently resolved transitively but not declared in `package.json`. This is a MISSING dependency, not dead code (out of scope for a deletion PR). Recommend a separate follow-up PR to declare it explicitly. (Owner call: Trinity/Coordinator.) — ✅ **DONE in #135:** declared `@types/d3-geo@^3.1.0` as an explicit devDependency (type-only import, so no runtime `d3-geo` package added).
2. **5 pre-existing `tsc` TS2352 errors in `tests/warn-data.test.ts`** exist on clean `main` (verified via stash) and are UNRELATED to this change. CI runs only lint / test:run / build (not `npm run typecheck`), so they are not gated. Left untouched per "don't fix unrelated pre-existing issues." — ✅ **DONE in #135:** all 5 casts routed through `unknown` first; `npm run typecheck` now 0 errors repo-wide.

**Validation:** `npm run lint` clean; `npm run test:run` **1622 passed / 88 files**; `npm run build` **796 static pages** OK; validator re-run against the edited `data/ai-frontier.json` passes; zero new typecheck errors introduced.

**Outcome:** Coordinator opened PR #134 from `squad/dead-code-cleanup`; CI passed; PR was squash-merged to main as **b069f96**. Deletion-only product change; mutable Squad state was not committed.

---

### 2026-07-18T20-30-00: System-wide documentation reconciliation shipped (PR #133)

**By:** Trinity (Lead), Neo, Tank, Switch, Mouse
**What:** PR #133 reconciled the full `docs/` set against the current codebase (post #114/#115, #117, #120, #121–#125, #129–#132). 15 docs updated, 4 verified-accurate with no change; no docs created or deleted.
**References:** PR #133, squash-merge commit 7a6a876 on main, orchestration-log/2026-07-18T20-30-00Z-{trinity,neo,tank,switch,mouse}.md, log/2026-07-18T20-30-00Z-docs-all-system-reconcile.md, decisions/inbox/{tank-frontier-doc-post132,tank-docs-allsystem,neo-docs-allsystem,switch-docs-allsystem,trinity-docs-allsystem,mouse-docs-allsystem}.md, docs/README.md + the 18 subsystem docs

**Why:**
- **Trinity (Lead, 4 docs):** reconciled docs/platform.md (refresh-data.yml → `data:refresh` 17-builder key-free manifest; CI Node 20 / ES2023 baseline; jolts + occupation-snapshot correctly excluded as credential-gated), docs/i18n.md (added `tests/sectors-i18n.test.ts` parity gate; 24 namespaces confirmed), docs/transparency.md (`getLatestAsOf` = chronological-latest-by-end-date, not lexicographic; added #120 `asOfToComparableDate`/`selectLatestAsOf` exports + localized GuardrailBadge note); refreshed docs/README.md index (date, Node runtime row Node 20/22, 6-component `frontier/` inventory). NONE created or deleted; all 18 subsystem docs retained.
- **Neo (Frontend, 2 updated / 2 verified):** reconciled docs/dashboard.md (per-sector `avgRisk` now employment-weighted with count fallback; DataAsOfBadge resolves `asOf` from provenance registry post-#120, not `getDataSources().generatedAt`) + docs/careers.md (detail data-flow fn names corrected: `generateAllCareerInsights→find`, `getOccupationExposureLenses`, `getOccupationSignalBySoc`, `getOccupationTrend`, `getCareerEvidencePassport`); verified docs/analysis.md + docs/report.md accurate — no change.
- **Tank (Backend/Data, 5 updated / 1 verified):** reconciled docs/occupation-data-model.md (AEI migration — `automationProbability` now aliases `aiExposure`; `automationRisk` percentile-calibrated not fixed cut-points; `growthRate` annualized %; validation fixed floor 680 + ≤22 canonical-sector invariant), docs/labor-market.md (real `WarnNotice` shape + #117 effective-date plausibility window), docs/visa.md (validation floors 50/20/50/200k + full **Talent Bottleneck Lens** section, coordinator-approved as in-doc addition), docs/data-pipeline.md (#120 per-lane provenance selectors, #123 data360 HTTP/1.1 fallback, shared-infra scripts); earlier reconciled docs/frontier.md to the post-#132 map→treemap state (§8 geo selectors reframed RETAINED-but-unused). Verified docs/global.md accurate — no change.
- **Switch (Designer, 3 updated / 1 verified):** reconciled docs/sectors.md (list page is now a Server Component feeding `SectorsPageClient`; `avgRisk` employment-weighted), docs/skills.md (removed all deleted `SkillTransitionChart` references — component deleted in #104/#107 commit 09c6ca8 — reframed to `SkillFlowSankey`; skills page now passes `bridgeData` + `allInsights`; `GROUPS` taxonomy relocated to `SkillsPageClient`), docs/visualization-system.md (corrected `components/charts/` = 15 files inventory; added a11y **Pattern C** for semantic-table-as-visualization; added frontier chart cross-ref subsection); verified docs/explore.md accurate — no change.
- **Mouse (Tester, 1 updated):** reconciled docs/testing.md — verified **1631 tests passing across 88 test files** (exit 0); fixed §2→§12 CI cross-ref, removed stale `SkillTransitionChart` a11y/determinism bullets, added the `server-only`→mock resolve alias, a new D3/SVG-in-jsdom patterns subsection, and an AI Frontier test-suite subsection (`tests/ai-frontier.test.ts` = 24 describe / 175 it).

**Durable note (orphaned frontier geo selectors):** `getCountryLeaderboardGeo()`, `getCountryGeoCoverage()`, `CountryGeoEntry`, `CountryGeoCoverage` have zero live consumers post-#132 (only defined in `lib/ai-frontier.ts`, only exercised by `tests/ai-frontier.test.ts`). Decision: **RETAIN short-term** (low risk, recently added in #130, cheaply reusable guardrail-safe fair-metrics-only projection); schedule a **SEPARATE follow-up cleanup PR** if no geo surface is planned within a sprint. `iso3` MUST remain on `CountryLeaderboardEntry`/`CountryOriginEntry` (treemap flag glyph); `public/world-countries.geo.json` MUST stay (`WorldChoropleth` and other surfaces use it). Removal call belongs to Trinity/Coordinator — not acted on in the doc pass.

**Outcome:** Coordinator opened PR #133; squash-merged to main as 7a6a876. Docs-only product change; mutable Squad state was not committed.

---

### 2026-07-18T04-17-54: AI Frontier Origins share/concentration treemap shipped

**By:** Trinity, Tank, Switch, Neo, Mouse, Rai
**What:** PR #132 redesigned `/frontier` "Where Tracked Models Are Developed" from a world-map choropleth into a country share/concentration treemap, preserving AI Frontier responsible-framing guardrails.
**References:** PR #132, squash-merge commit 758b351, branch `squad/frontier-origins-treemap`, decisions/inbox/Trinity-redesign-where-tracked-models-are-developed-as-a-c.md, decisions/inbox/tank-origins-shares.md, decisions/inbox/switch-origins-treemap.md, decisions/inbox/neo-origins-treemap.md, decisions/inbox/mouse-origins-treemap.md, decisions/inbox/rai-origins-treemap.md, decisions/inbox/trinity-origins-review.md, `components/frontier/FrontierOriginsTreemap.tsx`, `components/frontier/AIFrontierView.tsx`, `lib/ai-frontier.ts`, `docs/frontier.md`, `lib/i18n/messages/en/frontier.ts`, `lib/i18n/messages/zh/frontier.ts`, `tests/components/FrontierOriginsTreemap.test.tsx`

**Why:**
- Trinity selected a share/concentration treemap because it answers a distinct question from the existing ranked countries table: how concentrated attributed tracked model records are across the catalog. Final review APPROVED after lint, 1,631 tests, build, static export, and `diff --check` passed.
- Tank added `getCountryOriginShares()` / `CountryOriginEntry`: 34 real country origins, Multinational excluded, Singapore and Hong Kong included, and only fair full-catalog metrics exposed (`recentCount`, `modelCount`, `openWeightsCount`). Compute/frontier fields are structurally absent.
- Switch replaced map copy with 12 EN/ZH `origins*` keys, removed obsolete map-only keys, and specified uniform violet tile styling so area is the only quantitative encoding.
- Neo built `FrontierOriginsTreemap.tsx`, rewired `AIFrontierView.tsx`, dropped `ssr:false`, removed runtime GeoJSON fetches/world-map rendering, and provided an aria-hidden decorative SVG plus a semantic Share % table.
- Mouse migrated map tests to treemap coverage and added regression guards for no canvas/`role=img`, no GeoJSON fetch, fair-metrics-only controls, Share % table, compute-field absence, reduced motion, and i18n key parity; suite grew 1,616 → 1,631 passing tests.
- Rai returned GREEN: the redesign remains descriptive distribution/share framing, includes point-of-use caveats, avoids ranking/impact/capability/adoption language, and keeps the structural guardrail intact.

**Outcome:** Coordinator opened PR #132; CI lint-test-build passed; PR was squash-merged to main as 758b351 and the branch was deleted. Mutable Squad state was not committed.

---

### 2026-07-18T02-55-00: FrontierLeadersChart redesign shipped as rows-as-bars semantic table

**By:** Switch, Neo, Mouse, Trinity, Rai
**What:** PR #131 shipped a redesigned `FrontierLeadersChart` for `/frontier`: the Chart.js horizontal bar chart and redundant data table were replaced by one semantic rows-as-bars `<table>` with neutral rank, value-encoded violet fill bars, decorative identity chips, and folded explanatory context.
**References:** PR #131, merged commit 43b21ab, branch `squad/frontier-leaders-redesign`, orchestration-log/2026-07-18T02-55-00Z-{agent}.md, `components/frontier/FrontierLeadersChart.tsx`, `tests/components/FrontierLeadersChart.test.tsx`, `lib/i18n/messages/en/frontier.ts`, `lib/i18n/messages/zh/frontier.ts`

**Why:**
- Switch produced the redesign spec and i18n/token plan: 3 new EN/ZH keys (`leadersColRank`, `leadersTableCaption`, `leadersWhyDisclosure`) plus repurposed accessible leaderboard name/summary strings.
- Neo implemented the semantic table, removed Chart.js/canvas/`role=img` from this component, preserved all 6 metrics, retained visible critical caveats, and added flag/monogram identity chips without new dependencies.
- Mouse expanded `FrontierLeadersChart` coverage by 22 cases (suite 1,594 → 1,616), guarding no canvas/`role=img`, semantic table structure, aria-hidden decorations, controls, caveats, flags, and no podium/winner copy. QA verdict APPROVE.
- Trinity final review approved after lint, 1,616 tests, build, and `diff --check` passed; static export emitted `out/frontier.html`.
- Rai returned GREEN: neutral rank and uniform fill bars avoid rank-reward framing; chips encode identity; value bars encode share, not superiority; EN/ZH caveat parity remains intact.

**Outcome:** Coordinator opened PR #131 from `squad/frontier-leaders-redesign`; CI passed; PR was squash-merged to main as 43b21ab and the branch was deleted. Mutable Squad state was not committed.

---

### 2026-07-18T01-47-09: AI Frontier UI Enhancement — world map, compute envelope, hero sparklines shipped

**By:** Trinity, Tank, Switch, Neo, Mouse, Rai
**What:** PR #130 shipped the AI Frontier UI enhancement: one new world-origin choropleth plus compute-frontier envelope and hero sparkline upgrades, preserving PR #129 responsible-framing guardrails.
**References:** PR #130, merged commit 046b32f, branch `squad/frontier-ui-enhancement`, orchestration-log/2026-07-18T01-47-09Z-{agent}.md, `components/frontier/FrontierOriginsMap.tsx`, `components/frontier/ComputeTimelineChart.tsx`, `components/frontier/AIFrontierView.tsx`, `lib/ai-frontier.ts`, `scripts/build-ai-frontier.mjs`, `scripts/lib/country-iso3.mjs`, `scripts/lib/validate.mjs`, `data/ai-frontier.json`, `docs/frontier.md`, `lib/i18n/messages/en/frontier.ts`, `lib/i18n/messages/zh/frontier.ts`

**Why:**
- Trinity facilitated the design review and selected a deliberately narrow package: ADD Tracked Model Origins world map; UPGRADE compute-frontier timeline envelope; UPGRADE hero sparklines. Final review approved after lint, build, and 1,594 tests passed; static export emits `/frontier`.
- Tank added the map data contract: `iso3` on country leaderboard entries, `getCountryLeaderboardGeo()`, `getCountryGeoCoverage()`, a deterministic `country-iso3` lookup, validator gates against `world-countries.geo.json`, and regenerated data. Coverage is 32/35 mapped; Multinational, Singapore, and Hong Kong are disclosed as excluded from the choropleth.
- Switch added 17 EN/ZH i18n keys with parity and specified non-ranking visual tokens: sequential violet map ramp, amber compute envelope, and decorative violet sparklines.
- Neo implemented `FrontierOriginsMap.tsx` with runtime geometry fetch, decorative `aria-hidden` SVG, accessible table equivalent, fair-metrics-only toggle, timeline envelope, and hero sparkline wiring with `ssr:false`. No new dependencies.
- Mouse added 35 deterministic tests, growing the suite from 1,559 to 1,594: geo selector shape/coverage, WCAG guards, envelope sr-only coverage, hero sparklines, and i18n parity. QA verdict APPROVE.
- Rai returned GREEN: the new visuals remain descriptive observables, not capability/impact/adoption/ranking claims; full ZH caveat parity and data-layer guardrails are preserved.

**Outcome:** Coordinator committed 9ae6061 on `squad/frontier-ui-enhancement`, opened PR #130, CI passed, and squash-merged to main as 046b32f. Branch deleted. Mutable Squad state was not committed.

---

### 2026-07-17T21-23-54: AI Frontier Methodology Release — PR #129 Geopolitical & Fairness Review

**By:** Trinity (Lead), Fact Checker, Tank, Switch, Neo, Mouse, Rai
**What:** Full-cycle PR #129 release of AI Frontier with compute-filtered ranking methodology consolidation and disclosure bias remediation
**References:** PR #129 (https://github.com/vibewatch/FutureGrid/pull/129), commit 6002bcb (branch tip), dc587bea4255059315af548fdd6e00999d1d40c2 (main merge), orchestration-log/2026-07-17T21-23-54-AIFrontier-Methodology-Release.md

**Why:**
**User Concern:** Compute-filtered ranking view makes Google #1, UK #2 > China #4, appearing as country ranking; disclosure bias on Chinese compute non-disclosure.

**Key Consolidations (Six Strategic Decisions):**
1. AI Frontier must NOT present company/country observables as overall impact/capability/adoption/commercial reach/open-source influence/societal-economic impact rankings. Observables remain descriptive only.
2. Organization/country tracked-output and weights-available metrics use full dated Epoch catalog; compute timeline/cost/power/frontier metrics use compute-known subset with disclosure.
3. Default organization/country comparison is recent tracked releases in deterministic 3-year source-date window. Snapshot: China 104 recent vs UK 6; OpenAI 44 recent, Anthropic 15 recent visible without editorial boosts.
4. `frontierCount` field means "historical top 10 by training compute at release," NOT "current frontier status" or "capability ranking." Country co-attribution and raw org entities remain fully transparent.
5. `openWeightsCount` from Epoch's `Open model weights?` field includes restricted-use and non-commercial records; weights availability is NOT permissive open source, quality, usage rights, or impact measure.
6. User correction captured: UK-over-China on historical frontier count is a disclosure-biased narrow observable and MUST NEVER be shown as general country rank. Concrete China context required at every point of use.

**Methodology Validation:**
- ✅ Fact Checker: Verified 1,035 source rows, 1,030 dated, 528 compute-known. Confirmed disclosure bias: Chinese labs (Alibaba 29, ByteDance 9, DeepSeek 9, Baidu 4) all carry 0 frontierCount (compute non-disclosure). Default recentCount correctly shows China #2 (104) > UK #5 (6).
- ✅ Tank: Rebuilt builder/data/types/validator around full dated vs compute-known subset; regenerated live data with explicit metric definitions and provenance.
- ✅ Neo/Switch: Added six-metric selector, recent-tracked default (3-year window), point-of-use disclosures (frontierDefinitionNote amber panel, countryAttributionNote on countries tab), exact EN/ZH observable labels, coverage/licensing/attribution caveats.
- ✅ Mouse (QA): 1,559 AI Frontier tests, full Playwright pass, lint/build clean; found docs trailing whitespace (FAIL) → strict-lockout to Neo for independent revision.
- ✅ Rai (RAI): 🟡 Three advisories (R5-F1: China context in frontierCount disclosure, R5-F2: restricted-use caveat in mix card, R5-F3: two data definitions never rendered). ✅ All advisories applied; 🟢 GREEN after revisions.
- ✅ Trinity: Final review verified all gates green (lint/tests/build/Playwright/a11y/RAI).

**Outcome:** PR #129 merged to main as dc587bea4255059315af548fdd6e00999d1d40c2. Remote branch deleted. All verdicts APPROVE/GREEN.

---

### 2026-07-16T09-50-40: Approve exhaustive Playwright and data audit fixes
**By:** trinity
**What:** Approve exhaustive Playwright and data audit fixes
**References:** audit/playwright-ui-data-consistency, /home/azadmin/FutureGrid-playwright-audit, playwright-audit/reports/post-fix-summary-corrected.json
**Why:** Final review APPROVED the 31-file full-site audit fix. A fresh static export produced 791 intended routes; post-fix Playwright passed all 1,674 mobile/desktop/tablet tasks with zero page errors, console errors, overflows, failed requests, or content issues. The diff fixes React hydration, responsive overflow/accessibility, missing Job Zone scoring, cross-surface wage sourcing, localized unavailable-data copy, and regression coverage. Lint, 1,384 tests, and build pass; Rai returned GREEN. Approved for PR and merge to main.

---

### 2026-07-16T04-50-52: PROCEED with Neo's revision; all data blockers resolved
**By:** Fact_Checker
**What:** PROCEED with Neo's revision; all data blockers resolved
**Why:** I have re-reviewed Neo's revisions in the FutureGrid-career-consistency branch, evaluating against the prior blockers.

1. **User-facing sector exposure weighting**: ✅ Resolved. `lib/data.ts` and `app/sectors/[id]/page.tsx` now compute the employment-weighted mean (`Σ(employment × exposure) / Σemployment`). A custom computation correctly yields the ~35.31% result for 'Computer and Mathematical'. The fallback appropriately uses count-weighting only when there is zero usable employment.
2. **Fabricated O*NET reasons**: ✅ Resolved. `deriveBrightOutlookReason()` and all associated UI logic have been entirely removed. The generic footer correctly clarifies the definition of O*NET's Bright Outlook designation.
3. **Tests descriptions**: ✅ Resolved. The tests in `tests/data.test.ts` have been updated. Tests for fabricated reasons were removed, and new assertions accurately test for Bright Outlook's proper sorting logic (by projected openings) and test the canonicalization invariant.
4. **Canonical taxonomy/data integrity**: ✅ Resolved. 17 aliases canonically map to 22 BLS sectors without duplicated entries.

No regressions were found. All 684 unit tests pass successfully.

Recommendation: PROCEED.

---

### 2026-07-16T04-59-17: Approve revised career and sector consistency fix
**By:** trinity
**What:** Approve revised career and sector consistency fix
**References:** fix/career-classification-consistency, /home/azadmin/FutureGrid-career-consistency
**Why:** Final review cycle 2 APPROVED Neo's independent revision. The fix preserves legitimate AI-exposure/Bright-Outlook coexistence without fabricated designation reasons; normalizes 17 aliases into 22 canonical BLS sectors; aligns user-facing sector exposure to employment weighting; retains 756 records; and passes lint, 83 test files/1361 tests, build, and diff checks. Approved for PR and merge to main.

---

### 2026-07-16: Career-consistency revision cycle 2 — employment weighting + brightOutlookReason removal

**By:** Neo
**What:** Independent revision of the fix/career-classification-consistency diff after Fact Checker blocking rejection.
**Why:**
- `getSectorAggregates()` and `getSectorAggregatesExtended()` both used occupation-count mean (`Σrisk / count`) for `avgRisk`, while established helpers (market-signals, wage-tier-polarization) use employment-weighted mean (`Σ(emp×risk) / Σemp`). This created a user-visible inconsistency: Computer and Mathematical showed ~37.9% (count) vs ~35.3% (employment-weighted) depending on which surface you looked at.
- `deriveBrightOutlookReason()` fabricated O*NET designation reasons from projected-openings/growth data that does NOT carry provenance from the O*NET bright-outlook classification criteria. 266/267 Bright Outlook occupations have positive openings → essentially every entry was labeled "openings", masking rapid-growth and new-emerging categories.
- `tests/sector-taxonomy.test.ts` comment said "employment-weighted" but code was count-weighted.

**Changes made (cycle 2):**
- `lib/data.ts`: Both aggregators now use employment-weighted mean with count-weighted fallback for zero-employment sectors (consistent with existing zero-handling patterns). Removed `brightOutlookReason` field, `deriveBrightOutlookReason()` function, and the field assignment in `toHighlightEntry()`.
- `components/dashboard/HighlightsBento.tsx`: Removed `subtext`/per-entry labels ("high demand openings", "strong employment growth"). Updated footer copy to accurately describe O*NET Bright Outlook designation criteria (rapid growth, large openings, or new-emerging) without implying per-entry reason knowledge.
- `app/sectors/[id]/page.tsx`: Fixed local count-weighted `avgRisk` to employment-weighted (same formula, count-weighted fallback).
- `tests/data.test.ts`: Removed two `brightOutlookReason` tests; fixed Customer Service comment to remove "the reason these signals coexist" language.
- `tests/sector-taxonomy.test.ts`: Replaced loose bounds test (0.30–0.45, misleadingly labeled "employment-weighted") with source-derived regression: derives expected value from `generateAllCareerInsights()` rows and asserts `toBeCloseTo(expected, 4)`.

**Validated:** 1361/1361 tests pass, lint clean, build succeeds, `git diff --check` clean.

---

### 2026-07-16: Fix brightOutlook panel sort — demand signal, not AI exposure

**By:** Tank
**What:** Changed the sort key for the `brightOutlook` highlight list in `getHighlights()` (lib/data.ts) from `automationProbability` descending to `projectedOpenings` descending → `growthRate` descending → name. Added `brightOutlookReason: "openings" | "growth" | null` field to `HighlightEntry`. Updated `HighlightsBento` to show the demand-driver label and explain that Bright Outlook and AI exposure are independent signals in the footer copy. Added 10 new deterministic tests in `tests/data.test.ts`.

**Why:** The `brightOutlook` panel was sorted by the same metric as `mostAtRisk` (automationProbability), causing high-AI-exposure occupations like Customer Service Representatives to appear at the top of BOTH panels. This was a presentation defect — not a data error. The underlying data is valid: an occupation can legitimately have both high AI task exposure (an independent measure from the Anthropic Economic Index) and Bright Outlook (a BLS demand designation based on projected openings or growth). Sorting by AI exposure wrongly implied the two signals are contradictory. Sorting by demand (projected openings) makes each panel's ranking metric self-consistent and visually distinct. Customer Service Representatives still appears in both lists (position 2 in Most AI-Exposed at 70.1% exposure; position 5 in Bright Outlook at 387,600 annual openings) — which is correct, because both signals are true — but the context is now clear to users.

---

## Archive: Entries Before 2026-07-09

All completed decisions from 2026-06-30 through 2026-07-08 have been archived.

Archived Records:
- FutureGrid "Insights Lab" — Analytics & Statistical Forecasting Layer (2026-07-01)
- FutureGrid Round 2 — Engagement Features (2026-06-30)
- FutureGrid Upgrade — Design & Data Layer (2026-06-30)
- FutureGrid Round 3 — Real Data Integration (2026-06-30)
- FutureGrid Round 4 — Global Data Discovery + Flat World Map + China-Inclusive Metrics (2026-06-30)
- FutureGrid Round 5 — Data Layer Test Suite + Vitest Integration (2026-06-30)
- FutureGrid Round 6 — Performance: Geometry Extraction to Static Asset (2026-06-30)
- Decision: Shared-File Integration Must Be Solo/Sequenced

Archived at: 2026-07-16T05:06:09Z by Scribe
