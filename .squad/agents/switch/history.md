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