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



### Scribe Orchestration — PR #120 Cycle (2026-07-12T14:24:27Z)

**Session:** Provenance Registry & Localized Guardrails — Cycle Complete  
**Scope:** Per-lane synthesis provenance (Tank backend), localized GuardrailBadge UI (Neo), full suite validation (Mouse), architecture review (Trinity), i18n compliance (Rai), independent revisions (Switch)

**Rai Role Retrospective:**
- i18n compliance review: GuardrailBadge EN/ZH localization scanned
- Yellow advisory issued for ZH exposure wording (contextual sensitivity: use "exposure" not "adoption" in proxy framing)
- Yellow advisory issued for FY ordering clarity (metadata-first vs data-first alignment)
- Issue resolved: Switch applied corrections to wording and docs
- Final review: Green approval issued after Switch revisions merged

**Approval & Closure:** PR #120 merged as 78154f20575df26f5b8867b70bb6ce3009c46993; issues #77/#119 closed. Yellow advisories converted to Green.


## 2026-07-14 — Weekly Cycle: Data Governance & Compliance

### i18n Coverage Must Accompany New Data Fields
**Incident:** Initial PR #121 refresh added OpenRouter models without i18n key coverage in some areas.

**Learning:** Every new data field exposed to UI must have EN/ZH parity (i18n keys). Validation includes checking for missing i18n entries before approval.

**Application:** PR #124 final data refresh verified 56 analysis namespace keys (EN/ZH parity) + all model data fields have i18n coverage.

### Data Sourcing Requires Fact-Checker Alignment
**Incident:** International labor data (ILOSTAT) and GenAI exposure metrics required independent verification before approval.

**Learning:** No assumptions about data accuracy. Fact-checker verifies sourcing, attribution, and methodology. Rai approval requires fact-checker sign-off on data sourcing claims.

**Application:** PR #124 approved only after fact-checker validated international-labor-data and ilo-genai-exposure-cycle2 (2026-07-11 verifications).

### Preserve Credential Lanes in Documentation
**Incident:** Initial #121 approach degraded documentation for credential-dependent data paths.

**Learning:** Documentation must preserve credential lanes separately. Public docs reference what is available; private documentation notes credential-only fields.

**Application:** Credential lanes preserved in docs/ and corresponding i18n; no degradation in PR #124 merge.

### No Regulatory/Ethical Violations
**Validation scope:** All merged data checked for:
- PII/privacy violations: none found
- Regulatory compliance: OK (MIT-licensed data, proper attribution)
- Ethical concerns: none flagged by Fact Checker
- Bias/fairness: noted in guardrails (e.g., "exploratory estimates" framing)

**Result:** PR #124 approved 🟢 (no ethical blockers).

