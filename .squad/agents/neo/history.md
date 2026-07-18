# Neo History

## Summarized through 2026-07-18T03:20:59.028+00:00 by Scribe

Neo is FutureGrid's frontend implementation specialist. Durable patterns from prior work:

- Read the repo's Next.js docs before changing Next behavior; this codebase may differ from standard Next conventions.
- Keep heavy datasets server-side. Client components/pages must not transitively import large raw JSON; compute derived data in Server Components and pass compact props. Use `server-only` guards where appropriate.
- All user-visible copy, legends, tooltips, aria labels, empty states, and caveats must route through EN/ZH i18n parity; avoid hardcoded strings.
- For visualizations, prefer decorative `aria-hidden` SVG/canvas paired with semantic text/table equivalents. Avoid nested-interactive `role="img"` patterns and focusable decorative paths.
- AI Frontier country/company metrics must remain descriptive observables, not capability/impact/adoption/leadership rankings. Point-of-use caveats are mandatory.
- React 19 SVG hydration can differ from React 18; keep SVG child shapes deterministic and test hydration-sensitive changes.

## Chronology

### 2026-07-02 — AI Frontier initial frontend / PR #45
Built `/frontier` page, `AIFrontierView`, `ComputeTimelineChart`, `FrontierLeadersChart`, `CostPowerTrends`, and `FrontierMixCards`; wired sidebar and `/sources`; fixed data-driven hero stats; softened causal/geopolitical copy; kept CC BY attribution.

### 2026-07-03 to 2026-07-04 — Lens and IA expansion
Implemented `/labor` Opportunity Lens work, `/global` Readiness Gap Lens and OpenRouter activity UI, `/visa` Talent Bottleneck Lens, `/analysis` stock lens and AI Pressure Synthesis, plus the first IA refactor across sidebar taxonomy, dashboard cards, command palette shortcuts/grouping, i18n, and tests.

### 2026-07-10 — Issues #103/#104/#105 and strict-lockout lessons
- #103 Evidence Convergence Strip shipped cleanly.
- #104 Reskilling Bridge shipped after strict-lockout cycles. Key fix: split `SkillsPageClient` from the server page so raw H-1B/job-postings/projections data stayed out of the client bundle; bundle stayed under budget.
- #105 Exposure→Outcome Matrix needed independent remediation after rejection for nested-interactive SVG, focus-visible, hardcoded strings, and stale tests. Learning: deletion artifacts and a11y/i18n defects require atomic cleanup.

### 2026-07-11 — Consumer GenAI Diffusion / PR #115
Authored the initial implementation but was locked out from revisions after duplicate SR naming and unvalidated shared-scale testing. Review-isolation protocol applied.

### 2026-07-12 — Provenance Registry and localized GuardrailBadge / PR #120
Rendered lane badges and source evidence UI, localized GuardrailBadge, fixed analysis scroll offsets and regression tests, and documented reusable provenance UI patterns. PR #120 merged as 78154f2.

### 2026-07-16 — Full-site Playwright/data audit fixes
Implemented React 19 SVG hydration fixes, responsive overflow fixes, WCAG accessibility remediation, and Chinese localization for missing-data copy. Post-fix Playwright passed 1,674/1,674 tasks.

### 2026-07-17 — AI Frontier methodology release / PR #129
Added six-metric selector, deterministic 3-year recent window, dynamic coverage/cost/power/regression values, and point-of-use disclosures: `frontierDefinitionNote`, `countryAttributionNote`, and exact EN/ZH observable labels. After strict-lockout docs revision, all gates green and Rai Yellow→Green.

### 2026-07-18T01:47Z — AI Frontier UI enhancement / PR #130
Implemented `FrontierOriginsMap`, compute-frontier envelope, and hero sparklines in `components/frontier/*`. The map used fair metrics only, decorative aria-hidden SVG, accessible table equivalent, runtime geometry fetch, and no new dependencies. PR #130 merged as 046b32f.

### 2026-07-18T02:55Z — FrontierLeadersChart redesign / PR #131
Replaced Chart.js/canvas and redundant table with one semantic rows-as-bars table. Preserved all six metrics, point-of-use caveats, neutral rank, identity-only chips, and no podium/winner framing. PR #131 merged as 43b21ab.

### 2026-07-18T03:20:59.028+00:00 — FrontierOriginsTreemap shipped / PR #132
Replaced `FrontierOriginsMap` with `FrontierOriginsTreemap`, rewired `AIFrontierView`, dropped `ssr:false`, removed runtime GeoJSON fetches, and paired a decorative aria-hidden `d3.treemap` SVG with a semantic Country/Records/Share % table. The component uses only `getCountryOriginShares()` fair metrics (`recentCount`, `modelCount`, `openWeightsCount`), uniform violet tiles, reduced-motion handling, visible data/country/coverage notes, and no new dependencies. PR #132 merged to main as 758b351.


### 2026-07-18T04:58Z — Docs audit of owned route/page docs (all-system doc reconcile)
Audited my 4 owned docs against current code (post 7b92682, 654a753, #120). Strict reconcile, no rewrites.
- **dashboard.md — UPDATED (date-bumped 2026-07-18):** (1) `getSectorAggregatesExtended#avgRisk` formula was stale count-weighted (`Σ automationProbability / occupationCount`) → fixed to employment-weighted `Σ(employment × automationProbability) / Σemployment` with count-weighted fallback (matches lib/data.ts:152 and the doc's own prose). (2) `DataAsOfBadge` caveat claimed it reads `generatedAt` from `lib/data.ts#getDataSources()` — stale; it now resolves `asOf` from the provenance registry (`lib/provenance.ts` getDataAsOf/selectLatestAsOf) via `datasetId`/`datasetIds` (PR #120). Added missing `Last audited` line.
- **careers.md — UPDATED (date-bumped 2026-07-18):** detail-page data-flow mermaid had 4 stale lib fn names vs `app/careers/[code]/page.tsx`: `getCareerByCode`→`generateAllCareerInsights → find` (getCareerByCode is only used in the layout for metadata), `getOccExposureLenses`→`getOccupationExposureLenses`, `getH1bOccupationSignal`→`getOccupationSignalBySoc (+getCoverage)`, `getTrendPoints`→`getOccupationTrend`, and named the evidence-passport fn `getCareerEvidencePassport`. Verified CareerDetailClientProps, list-page state model (MAX_COMPARE=3, PAGE_SIZE=48, sort risk/openings/salary/employment, filterSig reset), 756-record count — all accurate.
- **analysis.md — ACCURATE (no change):** verified InsightsView section order, `AIPressureSynthesisData` per-lane `LaneProvenance`/`guardrailIds`, GLOBAL/TALENT/MARKET dataset-ID table, `getExposureOutcomeMatrix` server-only guard, and lib/analysis exports. PR #120 provenance already reflected.
- **report.md — ACCURATE (no change):** verified BEATS array, 5 chart component names, BeeswarmChartStandalone wrapper, scrollytelling/stacked layout guards (1024px, reduced-motion), IntersectionObserver rootMargin, WorldChoropleth `getCountryMapData`.
No create/delete-candidate flags. `git diff --check` clean; changes are docs-only among my owned files (other doc/.squad edits in the worktree are concurrent sibling agents, not mine). Did not stage/commit .squad or create a branch.
### 2026-07-18T20:30Z — System-wide docs reconciliation shipped (PR #133)

**Team update (Scribe-logged):** PR #133 reconciled the full `docs/` set to current code and squash-merged to main as **7a6a876**. Neo updated docs/dashboard.md (employment-weighted `avgRisk`; DataAsOfBadge now resolves `asOf` from the #120 provenance registry, not `getDataSources().generatedAt`) + docs/careers.md (detail data-flow fn names corrected) and verified docs/analysis.md + docs/report.md accurate — no change. Team totals: 15 docs updated, 4 verified accurate.
