# Switch — History (summarized)

**Project:** FutureGrid (Next.js, React, Tailwind). Switch owns design direction, visualization copy, i18n parity, and accessibility-sensitive UI guidance.
**Summarized by Scribe:** 2026-07-18T01:47:09Z because `agents/switch/history.md` exceeded the 15,360-byte hard gate.

## Durable Design Learnings

- FutureGrid uses a dark-first, data-visualization-heavy design language with brand violet `#8b5cf6`, cyan/blue accents, and risk colors green/yellow/red.
- All user-facing visualization text requires EN/ZH parity and must avoid unsupported impact, leadership, adoption, or capability claims. Prefer exact observable labels and explicit caveats.
- Complex visualizations need accessible alternatives: decorative or `aria-hidden` charts/SVGs must be paired with real text/table equivalents, figure labels, or sr-only summaries.
- Avoid nested interactive SVG/`role=img` patterns. If a map or D3 chart has hover-only visuals, keep SVG paths non-focusable and expose the data in a real table or other keyboard-readable structure.
- Reduced-motion, focus-visible states, responsive overflow control, and WCAG AA contrast are standard release gates for Switch-owned UI guidance.
- Dead i18n keys should be removed atomically with component changes; all chart labels, legends, captions, and guardrails need EN/ZH keys.

## Major History Summary

### 2026-06-30 — Design system and early engagement features
- Helped establish the FutureGrid design system: Tailwind theme tokens, brand palette, reusable UI primitives, responsive shell, and themed chart treatments.
- Round 2 engagement features shipped with RiskGauge, CommandPalette, SectorScatterChart, and Sidebar updates. A D3 cleanup rejection was resolved through independent revision.
- Round 3 real-data integration relabeled “automation risk” to “AI exposure,” rewired chart axes to projected openings/bright share, and corrected source framing to Anthropic Economic Index + BLS + O*NET.

### 2026-06-30 — Global/world-map visualization patterns
- Built and refined `WorldChoropleth.tsx` patterns: D3 `geoNaturalEarth1`, metric toggles, tooltips, legends, WCAG AA, reduced-motion, keyboard-safe interaction, and China-specific diffusion rendering.
- Round 4 and issue #6 moved world geometry out of the JS bundle to a static asset and used basePath-aware runtime fetch.
- Later AI-demand work added an emerald/teal sequential ramp and choropleth/bubble modes for 9-economy job-demand data.

### 2026-07-02 to 2026-07-04 — Layout, evidence, and IA guidance
- Specified centered widescreen layout direction and redesigned Evidence Stack matrix behavior after overflow findings.
- Guided AI Adoption Signals remediation by splitting China MAU vs usage and separating developer survey denominators.
- Proposed visual storytelling concepts: Global AI Signal Atlas, Talent Bottleneck Matrix, and Market-Labor Pressure Radar, with proxy/descriptive guardrails.
- Shaped IA around Overview, Workforce, Labor Signals, AI Ecosystem, and Data Governance.

### 2026-07-10 to 2026-07-11 — Accessibility pattern consolidation
- Supported issues #103/#104/#105. Learned that design-noted risks must be promoted to explicit release criteria when they become user-visible.
- For PR #104, owned strict-lockout listbox semantics revision using roving tabindex patterns and deletion completeness for dead i18n keys.
- For PRs #110/#112, consolidated accessible chart patterns: visual canvas/Chart.js output can be `aria-hidden` only when paired with `AccessibleChart`, figure labels, figcaptions, sr-only data tables, keyboard tooltips, and EN/ZH labels.
- Checklist retained: focus-visible, reduced-motion, responsive tables, `scope="col"/"row"`, i18n completeness, and axe/focused route validation.

### 2026-07-12 — PR #120 provenance registry and guardrails
- Applied independent revisions for stale documentation comments and Rai yellow-advisory i18n fixes.
- Corrected ZH exposure wording and FY ordering clarification.
- Integrated calendar-aware `asOf` selector wording across provenance UI.
- Outcome: PR #120 merged; issues #77/#119 closed.

## AI Frontier Records

### 2026-07-17T21:23:54Z — AI Frontier Methodology Release (PR #129)
- Replaced implied impact/leadership copy with exact EN/ZH observable labels for tracked models, frontier records, weights availability, compute-known coverage, licensing, and attribution caveats.
- Ensured the concrete China compute non-disclosure caveat appears equivalently in EN and ZH.
- Key learning: disclosure-biased metrics must be labeled as narrow observables. Historical frontier count is not current frontier status, capability, or a country ranking.

### 2026-07-18T00:51Z — AI Frontier UI enhancement i18n/token spec
- Added 17 new frontier keys in each locale for the Tracked Model Origins map, compute-frontier envelope, and hero sparkline sr hint.
- Preserved PR #129 semantics: descriptive-only map, no leader/rank/capability/impact framing except inside explicit negations/caveats.
- Reused existing `dataDisclaimer`, `countryAttributionNote`, and metric labels rather than duplicating caveats.
- Token spec for Neo:
  - World map: sequential single-hue violet ramp, neutral no-data regions, no podium/diverging palette.
  - Compute envelope: amber stroke + gradient as disclosed-compute upper bound.
  - Hero sparklines: decorative violet stroke; numeric stat remains accessible content.
- Validation recorded by Switch: lint clean, tests passed, EN/ZH key sets matched.

### 2026-07-18T01:47:09Z — AI Frontier UI enhancement release (PR #130)
- Added/validated the copy and visual-token contribution for PR #130, merged as 046b32f.
- The released enhancement includes Tracked Model Origins choropleth, compute-frontier envelope, and decorative hero sparklines.
- Non-ranking/caveat framing is preserved in both locales.

## Pointers

Detailed pre-summary records are preserved in `decisions.md`, `log/`, and `orchestration-log/`, especially PR #120, PR #129, and PR #130 session logs.


### 2026-07-18T02:19Z — FrontierLeadersChart redesign spec + i18n (user "don't like the UI")
- User disliked the "Tracked Model Activity by Organization and Country" panel (disclaimer wall + flat single-color bar chart + redundant table).
- Authored a redesign spec for Neo: replace chart+table with ONE semantic `<table>` of "rows-as-bars" (rank + flag/monogram chip + name + animated gradient fill = the encoding + prominent value + inline peak-compute). The table IS both the visualization and the accessible data (no canvas/role=img, no duplicate table). Bars decorative/aria-hidden; values always as text; log-normalized width for largestRun; reduced-motion renders final width instantly.
- Tamed disclaimers into a "Why these numbers?" `<details>` (coverageNote, orgEntitiesNote moved-optional, getDefinitions + countryDefaultSortDefinition + multiCountryAttributionDefinition) while KEEPING Rai-mandated point-of-use caveats visible: dataDisclaimer (compact info row), countryAttributionNote (countries tab), frontierDefinitionNote (frontierCount selected), metric description (single line under selector).
- Guardrail hold: NEUTRAL numeric rank only — no podium/medal/gold-silver-bronze/winner language; all 6 metrics retained; no impact/leadership/capability/adoption framing added.
- i18n: added 3 keys (leadersColRank, leadersTableCaption, leadersWhyDisclosure) to EN+ZH; repurposed a11yFrontierLeadersName/Summary to describe the table (removed "bar chart"/"table below"). EN/ZH identical at 131 keys.
- Validation: `npm run lint` clean, `npm run test:run` 1594/1594 pass, EN/ZH parity identical. Did not edit the component (Neo) or data layer (Tank).

### 2026-07-18T02:55Z — FrontierLeadersChart redesign shipped
Switch's rows-as-bars spec and EN/ZH i18n updates shipped in PR #131, merged to main as 43b21ab. Guardrails: neutral rank, no podium framing, visible caveats, semantic table.


### 2026-07-18T03:32Z — FrontierOriginsMap → FrontierOriginsTreemap i18n + token spec (share/concentration redesign)
- Redesign of "Where Tracked Models Are Developed" from world choropleth → country SHARE/CONCENTRATION treemap (Trinity ceremony). Switch owned `lib/i18n/messages/{en,zh}/frontier.ts` ONLY.
- Grep-audited all 13 `map*` keys repo-wide: consumers were only FrontierOriginsMap.tsx (rebuilt by Neo), AIFrontierView.tsx:321-322 (Neo rewires), and Mouse's tests. Nothing else. Safe to migrate.
- Disposition: REMOVED 5 (mapLegendLabel/Low/High — no gradient legend; mapCoverageNote — replaced; mapLoading — no runtime geojson fetch). RENAMED/reframed 8 → origins*. ADDED 3 net-new (originsTableColShare, originsTooltipShare, originsSrSummary).
- Final origins* set = 12 keys (originsSectionTitle [text unchanged], originsSectionSubhead [share/concentration, no map/geographic wording], originsMetricSelectorLabel="Share metric", originsTooltipRecords, originsTooltipShare, originsTableCaption, originsTableColCountry, originsTableColRecords, originsTableColShare, originsCoverageNote [var {countries}], originsEmpty, originsSrSummary). EN/ZH exact parity, 130 keys each, 0 map* remaining.
- originsCoverageNote frames shares as "of attributed tracked records, not unique models," co-attribution → summed shares can exceed 100% / counts exceed unique totals, and Multinational excluded as non-geographic — complementary to (not duplicating) countryAttributionNote. dataDisclaimer + countryAttributionNote keys kept intact for point-of-use.
- Guardrails held (PR #129/#130/#131): no leader/#1/top/winner/capability/impact/adoption; "ranking" only inside negations; neutral "sorted from largest to smallest share".
- Token spec for Neo: UNIFORM brand violet tiles (#8b5cf6 dark ~0.55α / #7c3aed light ~0.85α), per-tile separation via 1px hairline borders + paddingInner(2) gap NOT color/value ramp (avoids intensity=winner misread, per Rai); label hide threshold (~≥56×28px) → rely on tooltip+table; reuse existing frontier glass tooltip (non-focusable, no role=img); hover = +0.12 opacity; reduced-motion instant; decorative SVG aria-hidden paired with originsSrSummary + semantic 3-col table.
- Validation: lint CLEAN; EN/ZH parity IDENTICAL (130/130); test:run 1612/1616 — 4 EXPECTED failures all in Mouse-owned tests still asserting removed map* keys (ai-frontier.test.ts NEW_FRONTIER_KEYS list + mapCoverageNote token test; FrontierOriginsMap.test.tsx coverage-note render). Did NOT edit tests. The dynamic EN⇔ZH identical-key-set test PASSES. Decision recorded to decisions/inbox/switch-origins-treemap.md.

## 2026-07-18T03:20:59.028+00:00 — Frontier Origins treemap i18n and visual tokens shipped (PR #132)

Switch replaced map language with the 12-key EN/ZH `origins*` set, removed obsolete map-only keys, and specified uniform violet treemap tiles so area remains the only quantitative encoding. PR #132 merged to main as 758b351.


### 2026-07-18T04:58Z — All-system design-doc audit (docs-only, no commit)
Audited the 4 Switch-owned docs against current code and reconciled (strict, not a rewrite).
- **explore.md** — ACCURATE, no changes (verified Server Component prop flow, 5 ExploreView sections, role="img" on all charts, no next/dynamic). No date bump.
- **sectors.md** — UPDATED (date→2026-07-18): list page is now a Server Component passing `allSectors`+`wageTierData` props to new `SectorsPageClient` island (was mis-documented as "use client entire page"); `avgRisk` reconciled to employment-weighted mean per 7b92682 (`lib/data.ts:152`; detail page `[id]/page.tsx:34-37` matches).
- **skills.md** — UPDATED (date→2026-07-18): `page.tsx` now passes `bridgeData`+`allInsights` (two props); `GROUPS`/`GROUP_SKILLS` taxonomy relocated page.tsx→`SkillsPageClient.tsx`; ReskillExplorer test count 11→13. **FLAG held:** SkillTransitionChart is deleted (PR #104/#107, tests assert its absence) but still documented throughout — left intact per the FLAG rule; recommended removal recorded to inbox.
- **visualization-system.md** — UPDATED (date→2026-07-18): fixed 15-file breakdown (13 charts + AccessibleChart + WorldChoroplethInteractive; no Chart.js setup in charts/); scoped "sole Chart.js chart" to components/charts/ + noted visa/CostPowerTrends; added Frontier chart inventory subsection (xref frontier.md); **added Pattern C a11y contract** (visible semantic table IS the viz, decorative aria-hidden SVG, no role=img with table equivalent, area/length sole encoding, uniform non-ranking fills, reduced-motion) reflecting shipped #131/#132.
Validation: `git diff --check` clean; edits isolated to the 3 changed owned docs; links resolve; .squad not staged. Decision detail: decisions/inbox/switch-docs-allsystem.md.

### 2026-07-18T05:19Z — SkillTransitionChart DELETE-CANDIDATE actioned (Coordinator approved)
Coordinator approved my flag; removed all obsolete `SkillTransitionChart` references from docs/skills.md (component deleted PR #104/#107, commit 09c6ca8; tests assert its absence). Reframed Purpose #2 to `SkillFlowSankey` only; removed the boundaries line, the component-table row, the "visual note" architecture subsection, the provenance row, the accessibility bullet, the stale ChartA11y.test.tsx testing row, the gaps bullet, and the "Butterfly chart" key-ref. Augmented the ReskillingBridge.test.tsx row to note the SkillTransitionChart-removal guard. Kept 2026-07-18 date bump + all prior reconciliation. `git diff --check` clean; docs/skills.md only (+19/−26); no commit/branch; .squad not staged. Detail in decisions/inbox/switch-docs-allsystem.md.
### 2026-07-18T20:30Z — System-wide docs reconciliation shipped (PR #133)

**Team update (Scribe-logged):** PR #133 reconciled the full `docs/` set to current code and squash-merged to main as **7a6a876**. Switch updated docs/sectors.md (Server-Component list page + `SectorsPageClient`, employment-weighted `avgRisk`), docs/skills.md (removed all deleted `SkillTransitionChart` refs → `SkillFlowSankey`; two-prop skills page; taxonomy relocated), docs/visualization-system.md (15-file chart inventory + a11y Pattern C + frontier cross-ref); verified docs/explore.md accurate. Team totals: 15 docs updated, 4 verified accurate.
