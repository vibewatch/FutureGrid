# Rai History

## Summarized through 2026-07-18T02:55Z by Scribe

Rai is the Responsible AI reviewer for FutureGrid. Review priorities that recur across workstreams: avoid causal overclaiming, keep proxy metrics descriptive, preserve EN/ZH parity for all guardrails, surface caveats at point of use, distinguish restricted/open licensing claims, avoid stigmatizing or national-superiority framing, and verify no PII/secrets/regulatory issues.

## Durable review learnings

- **Causal caution must be explicit and localized.** Methodology text such as "correlation ≠ causation", "descriptive", and "exploratory only" must be user-visible and internationalized before approval.
- **Proxy metrics must not become impact/capability/adoption rankings.** Especially on AI Frontier, observed counts, disclosed compute, and open-weight fields are descriptive observables only.
- **Disclosure-biased metrics need concrete examples.** For PR #129, `frontierCount` showed UK above China because Chinese labs often do not disclose compute. Generic caveats were insufficient; the China/non-disclosure example must appear at every point of use where the metric can be misread.
- **All data-layer definitions must render in UI.** Metadata such as `countryLeaderboardDefaultSort` and `multiCountryAttribution` cannot remain hidden in data files if they carry user-facing semantic guardrails.
- **Restricted-use weights are not permissive open source.** Any surface mentioning open weights must clarify that counts can include non-commercial or restricted-use releases and licenses vary.
- **Geographic visuals need data-layer safety, not just copy.** Choropleths must omit compute/frontier/capability fields when the intended reading is descriptive tracked records by attributed country.
- **Safe leaderboard visual pattern:** neutral muted rank, one uniform fill encoding value share, identity-only chips/flags, no podium/medal/winner/dominance language, and visible caveats before/near the data.
- **Data sourcing requires Fact Checker alignment.** Rai approval depends on verified sourcing, attribution, methodology, and licensing for new datasets.
- **Credential-dependent lanes must remain documented separately.** Public docs describe public fields; private/credential-only data paths must not be erased or blurred.

## Chronology

### 2026-07-02 — AI Frontier Responsible AI Review
- Verdict: Yellow, no blockers; all four findings applied before merge.
- Fixes: softened causal wording ("engine underlying" → less causal phrasing), neutralized geopolitics copy, replaced hardcoded hero stats with data-driven values, and added CC BY attribution links.
- Verified no secrets, no PII, and no stigmatizing language.
- Shipped in PR #45.

### 2026-07-06 — ORS seed caveat revision
- Clarified that the ORS release is a FutureGrid broad-SOC seed derived from public BLS ORS concepts/categories, not direct occupation-level ORS survey estimates.
- Added `occupational-requirements.json` to Methodology cleared downloads; Trinity approved.

### 2026-07-10 — Issues #103/#104/#105
- Issue #103 / PR #106 Evidence Convergence Strip: approved; no causal overclaiming, stigmatizing language, secrets, or PII.
- Issue #104 / PR #107 Reskilling Bridge: approved; opportunity-focused reskilling framing and valid SOC/employment/H-1B sourcing.
- Issue #105 / PR #108 Exposure→Outcome Reality Matrix: approved after confirming "descriptive Pearson r · exploratory only · correlation ≠ causation" was localized and historical outcomes were not framed predictively.
- Learning: cautionary methodology text must be internationalized; missed i18n delayed #105.

### 2026-07-11 — Consumer GenAI Diffusion / PR #115
- Rai identified 8 yellow-flag items: source caveat clarity, accessibility semantics, i18n key completeness, and guardrail visibility.
- Trinity's revision cycle resolved all items; final approval was green.

### 2026-07-12 — PR #120 Provenance Registry & GuardrailBadge
- Rai reviewed localized GuardrailBadge UI and provenance guardrails.
- Yellow advisories: ZH exposure wording should say "exposure" not "adoption" in proxy framing; FY ordering needed metadata/data alignment.
- Switch resolved wording/docs; final approval green. PR #120 merged as 78154f2 and issues #77/#119 closed.

### 2026-07-14 — Data Governance & Compliance cycle / PR #124
- Required EN/ZH i18n parity for every new UI-exposed data field; PR #124 verified 56 analysis namespace keys.
- Required Fact Checker sign-off for international labor / ILOSTAT / GenAI exposure data sourcing.
- Preserved credential lanes in docs and i18n.
- Approved with no PII/privacy, regulatory, or ethical blockers; guardrails identified exploratory estimates.

### 2026-07-17 — AI Frontier Methodology Release / PR #129
- Trigger: `frontierCount` Countries view made UK appear above China, risking country-ranking interpretation despite compute non-disclosure bias.
- Initial verdict: Yellow, three advisories; final verdict: Green after revisions.
- R5-F1: Added concrete China/non-disclosure context and rendered country default-sort definition.
- R5-F2: Added restricted/non-commercial weights caveat to Access mix.
- R5-F3: Rendered missing data definitions (`countryLeaderboardDefaultSort`, `multiCountryAttribution`) in UI.
- Clean checks: default `recentCount` showed China #2; `computeKnownCount` and `largestRun` showed China above UK; Google fragmentation disclosed; metric descriptions visible; EN/ZH guardrails matched; no PII/credentials.
- Key rule: AI Frontier company/country observables are not general capability, impact, adoption, commercial reach, open-source influence, or national superiority rankings.

### 2026-07-18T01:47Z — AI Frontier UI Enhancement / PR #130
- Verdict: Green, no blockers/advisories.
- Scope: Tracked Model Origins choropleth, compute-frontier envelope, hero sparklines, EN/ZH i18n, geo selectors, docs.
- Verified map metrics are hard-limited to `recentCount`, `modelCount`, and `openWeightsCount`; geo projection omits compute/frontier/maxCompute fields at the data layer.
- Verified descriptive violet ramp, "Fewer/More records" legend, point-of-use caveats, excluded-country coverage note, compute envelope as disclosed-compute-only, decorative sparklines, and full EN/ZH caveat parity.
- Learning: the strongest defense against national-capability misreading is data-layer omission of unsafe metrics plus non-podium visual encoding and explicit exclusions.

### 2026-07-18T02:49Z / 02:55Z — FrontierLeadersChart redesign / PR #131
- Verdict: Green; PR #131 merged to main as 43b21ab.
- Scope: `FrontierLeadersChart` Chart.js chart + redundant table replaced with a single semantic rows-as-bars leaderboard table.
- Verified neutral rank text, no podium/medal/trophy/winner/champion/#1/dominance language, uniform violet value-share bars, identity-only org monograms / country flags, and no rank reward styling.
- Critical caveats remain visible at point of use: data disclaimer above table, frontier definition note for `frontierCount`, country attribution note on Countries tab, org entities note on Orgs tab. Lower-priority definitions remain available in "Why these numbers?".
- EN/ZH parity preserved for new keys (`leadersColRank`, `leadersTableCaption`, `leadersWhyDisclosure`) and repurposed a11y strings.
- Owners if re-review needed: Switch owns `lib/i18n/*`; Neo owns `components/frontier/*`.


### 2026-07-18T03:20:59.028+00:00 — Origins share/concentration treemap / PR #132
- Verdict: Green; PR #132 merged to main as 758b351.
- Verified descriptive share/distribution framing, EN/ZH caveat parity, uniform non-ranking tile fill, visible attribution notes, and data-layer omission of compute/frontier/capability fields.
