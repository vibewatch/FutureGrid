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
