# Switch — History

**Project:** FutureGrid (Next.js 16, React 19, Tailwind v4). AI career-impact dashboard.
**Requested by:** huangyingting

## Learnings

- `app/globals.css` is currently near-boilerplate (Arial font, unused light-mode vars) while the app forces a dark `bg-zinc-950` theme — ripe for a real design system.
- Accent colors in use: purple `#8b5cf6`, blue, plus risk colors green/yellow/red.
- Fonts wired via `next/font` (Geist Sans/Mono) in `app/layout.tsx`.


**2026-06-30:** FutureGrid upgraded — design system (Tailwind v4 @theme, brand palette, utility classes), UI primitives (GridBackground, AnimatedCounter, Reveal), responsive mobile shell (Sidebar SVG drawer), and themed charts. `npm run build` exit 0.


**2026-06-30 (Round 2 — Engagement Features):** RiskGauge, CommandPalette, SectorScatterChart + Sidebar wiring delivered. 🔴 REJECT B1 (D3 cleanup) → locked-out; Neo applied fix. N1 (matchMedia anti-pattern) self-fixed. Re-review 🟢 APPROVE. `npm run build` exit 0.

**2026-06-30 (Round 3 — Real-Data Integration):** Relabeled "automation risk" → "AI exposure" across all pages; chart axes rewired to projectedOpenings/brightShare; removed Frey-Osborne from sidebar footer, now cites Anthropic EI + BLS + O*NET. CountryExposureChart added for global view. All reduced-motion/a11y maintained. Commit afe77e9. 🟢 BUILD/LINT PASS.

**2026-06-30 (Round 4 — World Map UI):** Built components/charts/WorldChoropleth.tsx (D3 geoNaturalEarth1 flat choropleth, 173 features, metric toggle Claude usage ↔ GenAI diffusion). China rendering: grey + dashed-amber border on diffusion view. Tooltip, legend auto-update, staggered entrance animation, WCAG AA, reduced-motion safe, keyboard accessible. Commits: 78d2b3f, e976e14. ✅ /global RENDERS, METRICS TOGGLE LIVE.

**2026-06-30 (Issue Backlog Round — Issues #3 & #6):** [#3] IMF AI readiness toggle integration (3rd metric: Claude usage ↔ GenAI diffusion ↔ AI readiness). [#6] Performance: world geometry (412KB) moved from JS bundle → static asset (public/geo/world-countries.geo.json); /global JS reduced ~23%; loading skeleton + basePath-aware fetch. Commits e976e14, 9m8n9op. ✅ CLOSED #3 #6.


**2026-06-30 (Batches 3 & 4 — Autonomous Improvement Loop):** Issues #12 (real heatmap 25×7 getCountryMapData), #13 (branded OG image @resvg/resvg-js + build:og), #18 (404 + error boundaries). All closed, validated (build 0, lint clean, tests 103/103). Loop concluded; diminishing returns reached.

**2026-06-30 (Batch 5 — Theme + GAIRI + OccupationTrend):** #21 light-mode (next-themes, .dark CSS vars, charts re-render via useTheme, WCAG AA), #19 Oxford GAIRI 4th map toggle, #22 OccupationTrendChart (dual-axis wage/employment). Commits include "Closes #21" + "Closes #19" + "Closes #22". All 22 issues CLOSED.

**2026-07-01 (AI-Demand Layer Visualization — Switch-30):** Switch-30 edited WorldChoropleth.tsx + GlobalView.tsx for AI job-demand metric integration (Indeed Hiring Lab, 9 economies). Emerald/teal sequential color ramp (#052e2b → #10b981 → #a7f3d0) distinct from brand ramp. Choropleth + bubble modes (proportional circles for 9-economy dataset). No-data countries grey. Legend auto-update, staggered entrance, WCAG AA, reduced-motion safe. i18n: +8 keys charts/global EN/ZH (metric label, legend, source note). Build exit 0. Commit 88dfeec. ✅ Orchestration 2026-07-01T10-43-22Z-switch-30.md


## 2026-07-02T00:34:32.844+00:00 — Widescreen layout design and EvidenceStack fix

Switch specified the centered wide-screen layout direction and Evidence Stack matrix redesign. After Trinity rejected Neo's first EvidenceStack grid for horizontal overflow at 1280/1440px, Switch owned the reviewer-protocol fix and changed the grid to shrinkable tracks; Playwright verification confirmed no horizontal overflow across 1280, 1440, 1920, and 2560px.


## 2026-07-02 — AI Adoption Signals remediation
- Fixed Trinity/Rai blockers by splitting China app metrics into MAU and usage panels.
- Split developer survey data into overall distribution and country-share panels to avoid denominator mixing.
- Preserved bundle hygiene by keeping raw JSON/server loader imports out of client components.


2026-07-03T10:19:02.301+00:00 - Fixed Talent Bottleneck CAGR display by converting decimal CAGR to rendered percent and added regression coverage without changing scoring semantics.


2026-07-03T12:48:40.595+00:00 - Fixed the OpenRouter country helper TypeScript narrowing build failure under reviewer lockout, unblocking Mouse's final validation without changing feature scope.


2026-07-03T21:27:13.860+00:00 - Proposed visual storytelling concepts for mined datasets: Global AI Signal Atlas, Talent Bottleneck Matrix, and Market-Labor Pressure Radar; reinforced proxy/descriptive guardrails for the website narrative.

### 2026-07-03T22:49:27.110+00:00 — Review cycle and queue handoff
- Completed 4 of 20 squad review rounds; review output was converted into owner-labeled issues #73-#84.
- Merged completed items #73/#75/#74 through PRs #85/#86/#87 with targeted validation, lint, and build; remaining open work is #76-#84.


### 2026-07-04T12:23:54.134+00:00 — IA taxonomy guidance
- Shaped the safe first IA refactor around journey-based navigation: Overview, Workforce, Labor Signals, AI Ecosystem, and Data Governance.
- DashboardHome lens-card discovery and CommandPalette grouping landed with EN/ZH copy updates and validation passing.
