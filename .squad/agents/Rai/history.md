# Project Context

- **Project:** FutureGrid
- **Created:** 2026-06-30

## Core Context

Agent Rai initialized and ready for work.

## Recent Updates

📌 Team initialized on 2026-06-30

## Learnings

Initial setup complete.

## 2026-07-01T19:21:52.741+00:00 — Manual WARN adapter RAI/data-quality closeout

Rai's initial Yellow review caveats were resolved by PA rank exclusion, stable VA provenance, and date plausibility filtering. Final re-review returned Green for the WARN manual adapter snapshot.


## 2026-07-01T21:56:44.721+00:00 — QCEW/WARN final RAI closeout

Rai's final RAI/data-quality verdict was Green. QCEW is descriptive denominator/wage context, PA remains unranked without noticeDate provenance, and non-rank-eligible WARN states use null WARN-derived QCEW fields rather than false zeros.

## 2026-07-01T23:13:30.420+00:00 — Evidence Stack synthesis RAI review

Focused RAI verdict: Green. Reviewed `/analysis` Evidence Stack synthesis changes (`components/insights/EvidenceStack.tsx`, `lib/evidence.ts`, analysis i18n, wiring, and tests) without editing files. The stack frames signals as descriptive source-family synthesis with caveats and avoids causal, predictive, guarantee, individual-worker, and financial-advice claims. Targeted validation passed: `npm run test:run -- tests/components/EvidenceStack.test.tsx --reporter=dot` (5/5).

## 2026-07-02T02:14Z — AI Adoption Signals /global RAI data-quality review
Requested by @huangyingting. Verdict: RED (blocking).

Scope reviewed: lib/adoption-signals.ts, components/global/AIAdoptionSignals.tsx, global i18n, /global wiring. Targeted tests passed: `npm run test:run -- tests/adoption-signals.test.ts tests/components/AIAdoptionSignals.test.tsx --reporter=dot`.

Material findings:
1. `chinaAppMarketMetrics` mixes `monthly_active_users` and `tokens` in one `bar-list` and normalizes/sorts bar widths against a shared max (`buildChinaAppsPanel`, `BarListPanel`). This visually compares heterogeneous units despite caveats, violating the no-merge/no-composite guardrail.
2. `developerSurveyMetrics` combines overall Stack Overflow answer distributions with country yes-share rows in one `stacked-share` panel. The stacked bar normalizes values from different questions/denominators into one visual distribution, which is misleading and risks implying a composite respondent share.

Positive checks: no causal/predictive/prescriptive wording found in the new section; China wording is neutral; dataset-level and per-panel source/period/caveat labels are present; developer survey caveat says respondent survey, not population-representative adoption.

## 2026-07-02T02:28Z — AI Adoption Signals /global final RAI re-review
Requested by @huangyingting. Verdict: GREEN.

Scope reviewed without file edits: lib/adoption-signals.ts, components/global/AIAdoptionSignals.tsx, global i18n, and /global wiring. The prior RED blockers are resolved: chinaAppMarketMetrics now splits MAU/user rows into a China app-market MAU panel and token/usage rows into KPI cards; developerSurveyMetrics now splits overall distributions from country respondent yes-shares and labels country rows as respondent shares, not population adoption.

RAI checks: neutral framing retained; no winner/laggard/true-adoption/causal/predictive/composite-score framing found in the rendered-section tests; each panel carries source, period, and caveat metadata; /sources links remain present; China data is framed neutrally; heterogeneous units are not merged into a shared sorted visual axis. Targeted validation passed: `npm test -- --run tests/adoption-signals.test.ts tests/components/AIAdoptionSignals.test.tsx` (7/7).


## 2026-07-18T04:04 — RAI Review: Origins share/concentration treemap (PR #129/#130 guardrail regression check)

**Verdict: 🟢 GREEN — ships as-is.**

Scope: uncommitted working-tree changes to `lib/ai-frontier.ts`, `lib/i18n/messages/en/frontier.ts`, `lib/i18n/messages/zh/frontier.ts`, `components/frontier/AIFrontierView.tsx`, `docs/frontier.md`, and full read of `components/frontier/FrontierOriginsTreemap.tsx`. Redesign of "Where Tracked Models Are Developed" from world-map choropleth → country SHARE/CONCENTRATION treemap.

- **Check 1 (Language, EN+ZH):** PASS. No leadership/ranking/impact/capability/dominance/adoption framing in any user-visible string, tile label, tooltip, table header, sr-only summary, section title/subhead, or notes. Subhead, sr-summary, and coverage note all carry explicit "not a ranking of national AI capability, output, or impact" disclaimers. ZH copy mirrors EN neutral framing and identical caveats (「而非对各国 AI 能力、产出或影响的排名」; co-attribution >100% caveat; Multinational exclusion) — no stronger/weaker claim.
- **Check 2 (Structural guardrail):** PASS. `CountryOriginEntry` + `getCountryOriginShares()` expose ONLY country/countryShort/iso3 + fair metrics (recentCount/modelCount/openWeightsCount). computeKnownCount/frontierCount/maxComputeFlop omitted. Component `ShareMetric` union + `metricValue()` can only read the three fair metrics — a capability ranking is impossible by construction.
- **Check 3 (Visual encoding):** PASS. Uniform brand-violet tile fill (single TILE_FILL per theme); area is the ONLY magnitude encoding. Hover merely boosts alpha +0.12 on the hovered tile (affordance, not value-keyed). No sequential/podium color ramp, no medal/#1/crown styling.
- **Check 4 (Caveats at point of use):** PASS. dataDisclaimer (amber panel, top), originsCoverageNote (co-attribution can exceed 100%/unique totals; Multinational excluded), and countryAttributionNote all rendered with the treemap — present and honest, not buried.
- **Check 5 (Attribution honesty):** PASS. "{countries} attributed countries" bound to live `origins.length` (=34). Note states shares are of attributed records, "not unique models" — does not overstate precision or imply completeness/authority.

Additional: old `FrontierOriginsMap.tsx` and all `map*` i18n keys fully removed; no stray references. No product code edited by Rai. No branch/commit. No .squad/** staged.


## 2026-07-18T03:20:59.028+00:00 — Frontier Origins treemap RAI closeout (PR #132)

Rai returned GREEN for the origins share/concentration treemap. The review verified descriptive EN/ZH framing, uniform non-ranking visual encoding, point-of-use caveats, and structural exclusion of compute/frontier/capability fields. PR #132 merged to main as 758b351.
