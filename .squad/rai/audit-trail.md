# RAI Audit Trail

> Append-only evidence log. Entries are redacted — never contains raw secrets or harmful content.

<!-- Rai appends findings below -->

---

## RAI Audit — 2026-07-02T22:18Z (Round 4 — H-1B Visa Sponsorship Demand section)

**Reviewer:** Rai
**Requested by:** huangyingting
**Scope:** New "H-1B Visa Sponsorship Demand" section on per-occupation career detail view: `components/careers/CareerDetailClient.tsx` (H-1B section + sparkline), `lib/i18n/messages/en/careers.ts` and `lib/i18n/messages/zh/careers.ts` (11 new `h1b*` keys), cross-checked against `/visa` framing in `lib/i18n/messages/en/visa.ts`.
**Overall Verdict:** 🟡 Yellow — three advisory findings, no blockers; ship can proceed

### R4-F1 — 🟡 ZH drops "Offered" qualifier from median-wage stat label
- **File:** `lib/i18n/messages/zh/careers.ts:h1bStatMedianWage`
- **WHAT:** EN reads `"Median Offered Wage (Latest Year)"`. ZH reads `"工资中位数（最新年度）"` — the word "Offered" (申报/提供) is absent.
- **WHY:** "Offered wage" is the annualised wage stated on the LCA filing by the employer, not the actual paid wage or the occupation-wide BLS median. Omitting the qualifier in ZH silently widens the implied precision of the figure for Chinese-language users and creates a caveat inconsistency across languages.
- **HOW:** Update ZH key to `"申报工资中位数（最新年度）"`. One-line copy change; no structural work.

### R4-F2 — 🟡 Career-detail section omits the "one LCA ≠ one worker" caveat present on /visa
- **Files:** `lib/i18n/messages/en/careers.ts:h1bSectionSubtitle`, `lib/i18n/messages/zh/careers.ts:h1bSectionSubtitle`
- **WHAT:** The subtitle correctly states "employer filings, not visa approvals or individual outcomes," but does not include the additional caveat on the `/visa` page (`caveatBody`): *"a single LCA can cover multiple worker positions, and not every certified filing results in a hire or an issued visa."* The headline stat `"Decade Total (Certified LCAs)"` has no inline qualification.
- **WHY:** A user reading only the career-detail section without clicking through to `/visa` could read the decade-total as an individual-worker headcount. On immigration-adjacent data the one-LCA-covers-multiple-positions distinction is material.
- **HOW:** Expand `h1bSectionSubtitle` (EN + ZH) to add: *"Note: one LCA may cover multiple worker positions."* Alternatively, a tooltip or 10px footnote below the stat grid suffices. Advisory only.

### R4-F3 — 🟡 Sparkline SVG lacks inline `<title>` element (accessibility)
- **File:** `components/careers/CareerDetailClient.tsx:664–680`
- **WHAT:** `H1bSparkline` uses `role="img"` and `aria-label={label}` but has no `<title>` child element. WCAG 2.1 SC 4.1.2 and SVG accessibility best-practice prefer an inline `<title>` as the primary accessible name; `aria-label` is an acceptable fallback but screen-reader compatibility is broader with `<title>`.
- **HOW:** Add `<title id="h1b-sparkline-title">{label}</title>` as first child of the SVG; add `aria-labelledby="h1b-sparkline-title"`. Advisory; no logic or data change.

### Clean (🟢)

| Check | Result |
|-------|--------|
| Causal/predictive overclaiming | ✅ "Descriptive signal" framing throughout; no "will", "guarantees", "leads to", "causes" |
| "Filings, not approvals" visible | ✅ Subtitle (EN + ZH) explicitly states "employer filings, not visa approvals or individual outcomes" |
| Stigmatising / othering language | ✅ No foreign-vs-domestic framing, no winners/losers, no nationality stereotypes |
| Financial/career advice | ✅ No advice-to-pursue or sponsorship-promise language found |
| PII / secrets | ✅ No personal data or credentials in changed copy/code |
| EN/ZH substantive consistency | ✅ Caveats and neutrality equivalent (minor omission flagged in R4-F1) |

### Action items (non-blocking)

| Priority | ID | Suggested fix |
|----------|----|---------------|
| Medium | R4-F1 | Add "申报" qualifier to ZH `h1bStatMedianWage` key |
| Medium | R4-F2 | Append "one LCA may cover multiple worker positions" clause to EN + ZH subtitle |
| Low | R4-F3 | Add `<title>` child to `H1bSparkline` SVG + `aria-labelledby` |

---

## RAI Audit — 2026-06-30T06:43Z (Round 3 — Real-Data Integration)

**Reviewer:** Rai  
**Requested by:** huangyingting  
**Scope:** Real-data integration: Anthropic Economic Index (2025) AI-exposure, BLS salary, O*NET skills, `/global` country data, `/sources` page  
**Overall Verdict:** 🟢 Green — no blockers; two minor 🟡 advisories

### R3-F1 — 🟢 Hero disclaimer: honest framing confirmed
- **Files:** `app/page.tsx:84–89`, `components/dashboard/HeroRiskChecker.tsx:88,121,228–230`
- **WHAT:** Hero disclaimer reads *"a relative exposure measure, not a prediction of job loss."* HeroRiskChecker section label is "AI Exposure Checker", placeholder is "Search an occupation to see its AI exposure…", and the result panel has: *"Estimated automation exposure for this occupation — not a personal forecast."* R2-F1 action items fully addressed.
- **VERDICT:** No personal-verdict framing. ✅

### R3-F2 — 🟢 RiskGauge: neutral accessible label
- **File:** `components/ui/RiskGauge.tsx:93–95`
- **WHAT:** `aria-label` reads `"{occupation}: {value}% — {band} exposure"`. No job-displacement language.
- **VERDICT:** Clean. ✅

### R3-F3 — 🟢 /sources page: Frey-Osborne disavowal present, sources accurate
- **Files:** `app/sources/page.tsx:60–82`, `data/sources.json`
- **WHAT:** Prominent disavowal box: *"We do NOT use Frey & Osborne (2013)."* Primary sources match `data/sources.json`. Context-only references (IMF, OECD, ILO) clearly labelled as not directly loaded.
- **VERDICT:** Transparent and accurate. ✅

### R3-F4 — 🟢 Attribution / licenses complete
- **File:** `data/sources.json:3–4`
- **WHAT:** Top-level `attribution` field covers Anthropic EI (CC-BY 4.0), O*NET 28.3 (CC BY 4.0), BLS (public domain). All rendered via `LicenseBadge` on `/sources`.
- **VERDICT:** CC-BY 4.0 attribution requirements met. ✅

### R3-F5 — 🟢 Country data (/global): neutral framing
- **File:** `app/global/page.tsx`
- **WHAT:** Described as *"a usage-based measure grounded in observed behaviour, not forecasts."* Rankings are numeric indices only; no editorial commentary on nations. Methodology note explains normalisation.
- **VERDICT:** Neutral, no value-laden national judgements. ✅

### R3-F6 — 🟢 No credentials or PII
- **Files checked:** `scripts/build-data-snapshot.mjs`, all UI components
- **WHAT:** No API keys, tokens, or passwords. Fetches are unauthenticated public URLs. No PII.
- **VERDICT:** Clean. ✅

### R3-F7 — 🟢 Residual Frey-Osborne: none
- **WHAT:** "Frey"/"Osborne" appear only in: (1) `/sources` disavowal, (2) `data/sources.json:12` provenance note "replaces Frey-Osborne 2013", (3) `scripts/build-data-snapshot.mjs:426` same note. No stale user-visible attribution.
- **VERDICT:** Clean. ✅

### R3-F8 — 🟡 Incomplete "Risk" → "Exposure" rebranding on career detail page
- **File:** `app/careers/[code]/page.tsx:118,155,160`
- **WHAT:** Section heading "Risk Analysis"; table labels "Risk Category" and "Sector Average Risk" — while hero badge, stat bar, and all other pages correctly say "AI Exposure."
- **WHY:** Partial rebranding; users scrolling past the hero badge encounter legacy "Risk" framing without an exposure qualifier.
- **HOW:** Rename to "AI Exposure Analysis" / "Exposure Band" / "Sector Avg. Exposure." Advisory; one-line changes.

### R3-F9 — 🟡 "Employment Projections with AI Impact" heading implies causality
- **Files:** `app/page.tsx:201`, `app/careers/[code]/page.tsx:191`
- **WHAT:** Chart heading reads "Employment Projections with AI Impact." The chart shows BLS projected openings coloured by AI exposure — independent data co-displayed, not a causal model. The SVG's own title correctly reads "Top Occupations by Projected Annual Openings."
- **WHY:** "With AI Impact" suggests the projections have been adjusted by an AI model, which overclaims the analysis.
- **HOW:** Rename to "Employment Projections & AI Exposure." Advisory; no data or logic change.

### Action items (non-blocking)

| Priority | ID | Suggested fix |
|----------|----|---------------|
| Low | R3-F8 | Rename "Risk Analysis" → "AI Exposure Analysis" on career detail page |
| Low | R3-F9 | Rename chart heading → "Employment Projections & AI Exposure" |

---

## RAI Audit — 2026-06-30T01:49Z

**Reviewer:** Rai  
**Requested by:** huangyingting  
**Scope:** UI/feature upgrade (hero copy, compare feature, charts)  
**Overall Verdict:** 🟡 Yellow — advisory only, no blockers

### F1 — 🟡 Inaccurate "Real-time intelligence" hero claim
- **File:** `app/page.tsx:33`
- **WHAT:** Hero reads *"Real-time intelligence across N occupations…"* but all automation scores, salaries, growth rates, and employment figures are static constants baked into `lib/automation/index.ts` and `lib/data.ts`. The BLS/O*NET API clients exist but are not invoked by any page at runtime.
- **WHY:** Claiming data is "real-time" when it is pre-computed is a false factual assertion. Under the policy Deceptive Patterns clause, it constitutes an ungrounded claim presented as authoritative.
- **HOW:** Replace with honest framing, e.g. *"Research-based estimates across…"* or *"Model-derived risk profiles for…"*. Add a data-freshness timestamp once live data is wired in.

### F2 — 🟡 Synthetic employment figures labeled "Current Employment"
- **Files:** `app/careers/[code]/page.tsx:83`, `lib/data.ts:89`
- **WHAT:** The career detail stat card labeled **"Current Employment"** displays a value from `deterministicInt(s.socCode, 50000, 2_050_000)` — a hash-derived pseudo-random integer with no connection to real data.
- **WHY:** Users engaging the new side-by-side compare feature may treat these as official BLS employment counts and make career decisions accordingly. Presenting fabricated statistics as "Current" is materially misleading.
- **HOW:** Relabel to *"Illustrative"* or *"Estimated (placeholder)"*, or suppress until real BLS data is integrated. A tooltip/asterisk — *"Synthetic placeholder — see methodology"* — would also resolve this.

### F3 — 🟡 Methodology attribution practically invisible; no limitations disclosed
- **File:** `components/dashboard/Sidebar.tsx:144–147`
- **WHAT:** The only citation is two lines in the sidebar footer (`Data: BLS & O*NET` / `Frey & Osborne (2013)`) in `text-xs text-zinc-600` — smallest size, very low contrast. No page discloses: (a) that probabilities derive from a 2013 academic model, (b) known model limitations (binary task decomposition, pre-LLM era, no skill-adaptation modeling), or (c) which fields are synthetic placeholders vs. real sourced data.
- **WHY:** Users see probability bars on career detail pages and compare panels with no indication that these are decade-old model estimates, not current official forecasts. The Transparency principle requires that methodology and limitations be discoverable, not just technically present. Frey & Osborne (2013) outputs are widely critiqued; presenting them without caveat is a material framing risk in this domain.
- **HOW:** Add a short disclaimer — dismissible banner, persistent footer note, or "ℹ About this data" link near the hero stats. Minimum suggested text: *"Automation risk estimates are based on Frey & Osborne (2013), a research model. These are probabilistic estimates, not official forecasts or guarantees of job displacement."*

### F4 — 🟢 No hardcoded secrets or credentials
- **Files checked:** `lib/bls/client.ts`, `lib/onet/client.ts`, `.env.example`, `app/**/*.tsx`
- API keys read from `process.env` at runtime. `.env.example` contains only placeholder strings. No tokens, passwords, or private keys in source.

### F5 — 🟢 No PII
- All data is aggregate occupational statistics by SOC code. No individual-level records, names, emails, or identifiers present.

### F6 — 🟢 No stigmatizing language or bias
- Sector/occupation labels use standard BLS/SOC nomenclature. No "low-skill" or derogatory language found. Skill group descriptions are neutral.

### Action items (non-blocking)

| Priority | Finding | Suggested fix |
|----------|---------|---------------|
| High | F1 — false "real-time" claim | Reword hero subtitle |
| High | F2 — synthetic data labeled "Current" | Relabel or suppress employment field |
| Medium | F3 — no methodology/limitations disclosure | Add "About this data" note near hero stats |

---

## RAI Audit — 2026-06-30T03:18Z (Round 2 — Personal-Risk Framing)

**Reviewer:** Rai  
**Requested by:** huangyingting  
**Scope:** Round 2 — `HeroRiskChecker`, `RiskGauge`, `HighlightsBento` (personal-risk framing pass)  
**Overall Verdict:** 🟡 Yellow — advisory only, no blockers

### R2-F1 — 🟡 Personal-verdict framing in HeroRiskChecker copy
- **File:** `components/dashboard/HeroRiskChecker.tsx:110`
- **WHAT:** The search input placeholder reads *"Check your job's AI risk — type an occupation…"* and the section header is *"AI Risk Checker"* (line 81). The result panel then displays a large animated gauge showing `{value}%` with the occupation name as the gauge label and a "Risk band" stat badge — but no inline text contextualises the number as an occupation-level probabilistic estimate rather than a verdict about the individual user.
- **WHY:** "Your job's AI risk" is possessive/personal. A prominent animated gauge showing e.g. *72%* with a red ring, labelled with the user's occupation name and a "Risk band: Very High" badge, can plausibly be read as a personal prediction: *"your job will be automated"*. This contradicts the probabilistic nature of the Frey & Osborne outputs and risks causing unwarranted anxiety. The existing disclaimer in `app/page.tsx:83–89` is well-positioned (rendered immediately above the checker in the same hero section), which partially mitigates the risk, but the result panel itself carries zero qualifier copy.
- **HOW:** Two lightweight changes would resolve this: (1) Replace placeholder text with *"Search an occupation to see its AI risk estimate…"* (occupation-scoped, not personal). (2) Add a single short line inside the result panel — e.g. a `<p className="text-xs text-zinc-500">` below the gauge reading *"Estimated automation exposure for this occupation — not a personal forecast."* No structural changes required.

### R2-F2 — 🟢 "Most at Risk" ranking — no stigmatisation found
- **File:** `components/dashboard/HighlightsBento.tsx:22–28`
- **WHAT:** The "Most at Risk" panel lists top-5 occupations by automation probability with an `⚠️` icon, a red accent gradient heading, and the `metricLabel` *"automation risk"*. The aria-label is *"Most at Risk occupations"*.
- **WHY:** The language is standard labour-economics terminology ("at risk" appears in BLS, OECD, and McKinsey reports with this meaning). Critically, the bento is balanced by three co-equal panels — *Fastest Growing*, *Most Resilient*, *Highest Paid* — so no occupation category is singled out negatively. No pejorative or moralising language about workers is present.
- **HOW:** No change required. If further softening is desired, the `⚠️` icon could become `📊` to de-emphasise alarm, but this is cosmetic preference, not a RAI concern.

### R2-F3 — 🟡 Disclaimer proximity to HighlightsBento
- **Files:** `app/page.tsx:76–94` (disclaimer + checker), `app/page.tsx:153–160` (HighlightsBento)
- **WHAT:** The Frey & Osborne disclaimer (`role="note"`) is placed in the hero section, directly above `HeroRiskChecker` — good proximity for the checker. `HighlightsBento` is rendered in the *"Standout Careers"* section, separated from the disclaimer by an `<hr>`, the four summary cards section, and another `<hr>` — roughly 3 visible page sections of scroll distance on desktop.
- **WHY:** The "Most at Risk" panel surfaces automation percentages as ranked facts. Without a local qualifier, a user who scrolls directly to this section has no in-context signal that these figures are model estimates. This is a weaker version of the F3 finding from Round 1. The disclaimer is on the page and is the legally/methodologically correct location for it, so this is advisory only.
- **HOW:** Add a short `<p className="text-[10px] text-zinc-600 …">` sub-caption under the *"Standout Careers"* section heading (or inline in the bento header row) — e.g. *"Figures are Frey & Osborne (2013) model estimates."* A single line is sufficient; no structural changes needed.

### R2-F4 — 🟢 No credentials or PII in new files
- **Files checked:** `components/dashboard/HeroRiskChecker.tsx`, `components/ui/RiskGauge.tsx`, `components/dashboard/HighlightsBento.tsx`
- No API keys, tokens, secrets, emails, phone numbers, SSNs, or other PII found. Clean.

### Action items (non-blocking)

| Priority | Finding | Suggested fix |
|----------|---------|---------------|
| Medium | R2-F1 — "your job's AI risk" personal framing | Reword placeholder + add one-line occupation-scope qualifier in result panel |
| Low | R2-F3 — disclaimer not proximate to HighlightsBento | Add one-line methodology sub-caption near "Standout Careers" heading |
