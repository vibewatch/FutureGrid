# Neo — History

**Project:** FutureGrid (Next.js 16, React 19, Tailwind v4). AI career-impact dashboard.
**Requested by:** huangyingting

## Learnings

- Layout (`app/layout.tsx`) renders `<Sidebar />` + `<main className="ml-60 ...">`. Sidebar is fixed `w-60`.
- Pages: `/` (dashboard), `/sectors`, `/careers`, `/skills`, `/heatmap`. Careers already has search/filter/sort.


**2026-06-30:** FutureGrid upgraded — animated dashboard hero (gradient headline, AnimatedCounter stats) and glass SummaryCards. Design contract integrated. `npm run build` exit 0.


**2026-06-30 (Round 2 — Engagement Features):** HeroRiskChecker, HighlightsBento, app/page.tsx recomposed. Assigned post-rejection fixes (B1 D3 cleanup, N2 timer, N4 kbd access). RAI framing applied. Re-review 🟢 APPROVE. `npm run build` exit 0.

**2026-06-30 (Round 3 — Real-Data Integration):** Built /app/global (CountryExposureChart, 194-country AI-usage view) + /app/sources (methodology + full attribution page). Rewrote disclaimers: Hero/stat labels cite Anthropic EI + BLS + O*NET; Frey-Osborne explicitly rejected; null-field handling for employment/growthRate/totalEmployment. Highlights fastestGrowing → brightOutlook (O*NET Bright, not synthetic growth). Commit afe77e9. 🟢 BUILD/LINT PASS.

**2026-06-30 (Round 4 — /global Route + China Context):** Wired /global route: hero "Global AI Impact Explorer", metric context (Claude Usage vs. GenAI Diffusion % with clear labels), China callout ("16.4% Microsoft vs. 43% CNNIC; domestic platform undercount"), source attribution (8 datasets evaluated, 3 recommended), diffusion leaders (UAE 70%, Singapore 63%, Norway 49%). All content Reduced-motion safe, WCAG AA, no regressions. Commit e976e14. ✅ /GLOBAL LIVE, CHINA CONTEXT TRANSPARENT.

**2026-06-30 (Issue Backlog Round — Issues #4 & #5):** [#4] Diffusion sparklines + per-country trend detail modal (fastest risers S.Korea +11.2pp, UAE +10.7pp, France +6.9pp). [#5] CountryDetailPanel: 195-country selector, all metrics display, China proxies (Anthropic + Microsoft + CNNIC context), keyboard accessible (Tab/Enter/Esc). Commit e976e14. ✅ CLOSED #4 #5.


**2026-06-30 (Batches 3 & 4 — Autonomous Improvement Loop):** Issues #14 (README refresh for real data stack), #17 (freshness indicators sidebar + sources badge). All closed, validated (build 0, lint clean, tests 103/103). Loop concluded; diminishing returns reached.

**2026-06-30 (Batch 5 — i18n + Theme Toggle):** #20 i18n English + Chinese (client LanguageProvider + useT + namespaced dicts, sidebar switcher, all pages bilingual, data unchanged), #21 light-mode integration (next-themes toggle UX). Commits include "Closes #20" + "Closes #21". All 22 issues CLOSED; project complete.

**2026-07-01 (i18n Component Internationalization):** Neo-28 completed i18n for HeroRiskChecker, CountryDetailPanel, CommandPalette (last 3 hardcoded components). Added 'checker' + 'command' namespaces; 62 keys per locale at full EN/ZH parity. Data values remain English (integrity); UI/metadata fully localized. Build exit 0 ✓

**2026-07-01 (Insights Lab — Analytics Dashboard UI + i18n):** Neo-29 built Insights Lab dashboard: 3 React components (AISignalScatter with regression line + hover, EmploymentForecastChart with national/per-occ sliders reactive, DisruptionLeaderboard sortable/filterable), app/analysis/page.tsx route, sidebar "Insights Lab" nav + IconInsights. New 'analysis' i18n namespace: 56 keys EN/ZH parity (chart titles, slider labels, methodology notes), data values English (occupations/sectors). Validated: build exit 0, smoke /analysis HTTP 200, Playwright EN+中文 screenshots all 3 sections render + translate, no page errors. Commit 7ea2d98. ✅ Orchestration 2026-07-01T07-56-24Z-neo-29.md


**2026-07-01 (Insights Lab — Frontend + i18n — Neo-30):** Neo-30 built Insights Lab dashboard: ExposureLensComparison.tsx (capability-vs-usage scatter + regression line + hover + lens-agreement matrix + gap leaderboard), AIForcesTimeline.tsx (Indeed demand vs Challenger cuts dual-axis), full app/analysis/page.tsx route. Sidebar nav "Insights Lab" + IconInsights. i18n: +33 analysis namespace keys (89 EN/ZH parity); data values English (occupations/sectors). Validated: build exit 0, smoke /analysis HTTP 200, Playwright EN+中文 screenshots all 3 sections render + translate, no page errors. Commit 7ea2d98. ✅ Orchestration 2026-07-01T10-14-15Z-neo-30.md
