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


### 2026-07-10T09:40:05Z — Issues #103/#104/#105 shipped, strict-lockout & server/client split retrospective

**Issue #103: Evidence Convergence Strip (PR #106 merged)**
- Built UI convergence strip with i18n, responsive layout
- Tests: 587 pass; a11y clean
- No rejection cycles on first review

**Issue #104: Reskilling Bridge (PR #107 merged, 3-cycle strict-lockout → shipped)**
- Built canonical SOC join UI with i18n en/zh parity
- v1 rejection (v2 lockout): synthetic SkillTransitionChart, listbox semantics, dead i18n keys → atomically deleted component + test block + imports + 5 i18n keys
- v2 rejection (v3 lockout): aria-required-children (listbox owned non-option children) → Tank reassigned (Neo locked out)
- Bundle retrospective: `/skills` page ("use client") imported `getReskillingBridgeData()` which transitively bundled 1.8MB of raw JSON (h1b+job-postings+projections) for 41KB derived output
- **Server/Client Split Fix (Neo author, Neo responsible):** Refactored page to Server Component computing bridgeData at build time; new `SkillsPageClient.tsx` receives 41KB prop (interactive body). Heavy datasets stay server-only. Grounded in Next 16 server-and-client-components docs.
- Final tests: 663 pass, a11y green, bundle 394.1KB (< 700KB)
- Learning: "use client" pages cannot call getters that transitively import non-derived datasets. Compute derived data server-side; pass only results as props. Heavy lib modules need `import "server-only"` guards (Tank adds these).

**Issue #105: Exposure→Outcome Matrix (PR #108 merged, post-rejection work pending)**
- Built correlation matrix UI + i18n wiring
- Trinity rejection (committed): nested-interactive SVG, focus-visible, hardcoded EN/ZH strings
- Locked out for: a11y SVG remediation (Tank), i18n en/zh rework (Tank), dead test-reference cleanup (Mouse)
- Tests: 751 pass, bundle 394.1KB maintained
- Learning: role="img" + focusable children violates WCAG nested-interactive rule; requires non-interactive wrapper or separate visible focus indicator. All user-visible text (including legends, tooltips, aria-labels, empty states) must route through i18n. Test mock/marker cleanup is a deletion artifact responsibility that must be atomic.


### Neo: Consumer GenAI Diffusion Implementation (Batch 2026-07-11)
- Authored initial PR #115 implementation based on #114 research decision
- Prematurely opened PR with duplicate SR naming and unvalidated shared-scale test
- Locked out from revision after Mouse rejection and Rai yellow-flag process
- No re-admission until follow-up unrelated feature (review-isolation protocol)
