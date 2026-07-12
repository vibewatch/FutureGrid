# Rai History

## 2026-07-02: AI Frontier Responsible AI Review
- 🟡 Yellow verdict, no blockers
- 4 findings (all applied):
  - F1: Softened causal overclaiming ("engine underlying" vs. "drives")
  - F2: Neutralized geopolitics wording
  - F3: Data-driven hero stats (fixed hardcoding)
  - F4: Hyperlinked CC BY attribution
- Verified safe: no secrets, no PII, no stigmatizing language
- Feature shipped as PR #45 (merged to main, 2026-07-02)

### 2026-07-06T03:44:30.653+00:00 — ORS seed caveat revision
- Corrected ORS language to clarify this release is a FutureGrid broad-SOC seed derived from public BLS ORS concepts/categories, not direct occupation-level ORS survey estimates.
- Added `occupational-requirements.json` to Methodology cleared downloads; Trinity approved the revision.


### 2026-07-10T09:40:05Z — Issues #103/#104/#105 responsible-AI review

**Issue #103: Evidence Convergence Strip (PR #106 merged)**
- Verified: no causal overclaiming, no stigmatizing language, no secrets/PII
- Verdict: ✅ APPROVE

**Issue #104: Reskilling Bridge (PR #107 merged)**
- Verified: reskilling framing is opportunity-focused, not layoff/displacement language
- Cross-reference: SOC data + employment projections + H-1B sourced properly
- Verdict: ✅ APPROVE

**Issue #105: Exposure→Outcome Reality Matrix (PR #108 merged)**
- Verified data/methodology language: "Descriptive Pearson r · exploratory only · correlation ≠ causation" (all user-visible text routed through i18n)
- Cautionary framing maintained: employment/wage outcomes are historical (not predictive)
- Cross-reference: correlations properly labeled as descriptive, no causal inference claims
- Verdict: ✅ APPROVE
- Learning: Always verify that cautionary methodology text (especially "correlation ≠ causation") is internationalized before release; missed i18n on #105 delayed merge.


### Rai: Yellow-Flag Resolution — Consumer GenAI Diffusion (Batch 2026-07-11)
- Identified 8 yellow-flag items in Neo's initial PR #115 (source caveat clarity, accessibility semantics, i18n key completeness, guardrail visibility)
- All 8 items resolved in Trinity's revision cycle
- No blocking issues; approved merge
