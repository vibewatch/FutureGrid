# Neo History

## 2026-07-02: AI Frontier Frontend
- Built app/frontier/page.tsx + 5 components (AIFrontierView, ComputeTimelineChart, FrontierLeadersChart, CostPowerTrends, FrontierMixCards)
- i18n en/zh parity (frontier namespace)
- Sidebar nav integration, /sources attribution
- Fixed "Largest training run" card: data-driven hero stats from frontierByYear snapshot
- Softened causal copy ("engine underlying workforce disruption")
- Neutralized geopolitics wording, hyperlinked CC BY attribution
- Feature shipped as PR #45 (merged to main, 2026-07-02)

2026-07-03: Added /labor Opportunity Lens tab and proposed server-side adapter fallback to normalize projections. (See decisions/decisions.md)


2026-07-03: Implemented `/global` Readiness Gap Lens UI, server-loaded data wiring through `app/global/page.tsx` and `GlobalView`, EN/ZH i18n keys, localized gap units, and deterministic component tests. (See decisions.md)


2026-07-03T10:19:02.301+00:00 - Built and wired the `/visa` Talent Bottleneck Lens UI with EN/ZH i18n and component tests; fixed reducer typing during validation lockout.


2026-07-03T12:48:40.595+00:00 - Built and wired `/global` OpenRouterCountryActivityLens with EN/ZH i18n and component tests; placed the AI Model Ecosystem Footprint section after AI Adoption Signals and before Adoption–Readiness Gap.


2026-07-03T13:23:16.634+00:00 - Built and wired `AICompanyStockLens` into `/analysis` with EN/ZH i18n and component tests; fixed period-return selection to use observations on/before target dates or `null` when sparse coverage is insufficient.


2026-07-03T21:27:13.860+00:00 - Implemented `/analysis` AI Pressure Synthesis MVP via `lib/ai-pressure-synthesis.ts`, `AIPressureSynthesisLens`, `InsightsView`/page wiring, i18n, and tests, combining OpenRouter/readiness, H-1B/SOC, and stock-market signals.

### 2026-07-03T22:49:27.110+00:00 — Review cycle and queue handoff
- Completed 4 of 20 squad review rounds; planned next feature/improvement/bug work as issues #73-#84.
- #73, #75, and #74 are merged via PRs #85, #86, and #87; continue remaining open items #76-#84 from main c4d84fa.


### 2026-07-04T12:23:54.134+00:00 — IA refactor implementation
- Implemented the safe first IA refactor across Sidebar taxonomy, DashboardHome Choose your lens cards, CommandPalette shortcuts/grouping, EN/ZH i18n, and tests while preserving URLs.
- Fixed the build-blocking CommandItem union-risk property access with type-safe rendering; validation later passed.
