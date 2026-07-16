# Squad Decisions

## Active Decisions

### 2026-07-16T09-50-40: Approve exhaustive Playwright and data audit fixes
**By:** trinity
**What:** Approve exhaustive Playwright and data audit fixes
**References:** audit/playwright-ui-data-consistency, /home/azadmin/FutureGrid-playwright-audit, playwright-audit/reports/post-fix-summary-corrected.json
**Why:** Final review APPROVED the 31-file full-site audit fix. A fresh static export produced 791 intended routes; post-fix Playwright passed all 1,674 mobile/desktop/tablet tasks with zero page errors, console errors, overflows, failed requests, or content issues. The diff fixes React hydration, responsive overflow/accessibility, missing Job Zone scoring, cross-surface wage sourcing, localized unavailable-data copy, and regression coverage. Lint, 1,384 tests, and build pass; Rai returned GREEN. Approved for PR and merge to main.

---

### 2026-07-16T04-50-52: PROCEED with Neo's revision; all data blockers resolved
**By:** Fact_Checker
**What:** PROCEED with Neo's revision; all data blockers resolved
**Why:** I have re-reviewed Neo's revisions in the FutureGrid-career-consistency branch, evaluating against the prior blockers.

1. **User-facing sector exposure weighting**: ✅ Resolved. `lib/data.ts` and `app/sectors/[id]/page.tsx` now compute the employment-weighted mean (`Σ(employment × exposure) / Σemployment`). A custom computation correctly yields the ~35.31% result for 'Computer and Mathematical'. The fallback appropriately uses count-weighting only when there is zero usable employment.
2. **Fabricated O*NET reasons**: ✅ Resolved. `deriveBrightOutlookReason()` and all associated UI logic have been entirely removed. The generic footer correctly clarifies the definition of O*NET's Bright Outlook designation.
3. **Tests descriptions**: ✅ Resolved. The tests in `tests/data.test.ts` have been updated. Tests for fabricated reasons were removed, and new assertions accurately test for Bright Outlook's proper sorting logic (by projected openings) and test the canonicalization invariant.
4. **Canonical taxonomy/data integrity**: ✅ Resolved. 17 aliases canonically map to 22 BLS sectors without duplicated entries. 

No regressions were found. All 684 unit tests pass successfully.

Recommendation: PROCEED.

---

### 2026-07-16T04-59-17: Approve revised career and sector consistency fix
**By:** trinity
**What:** Approve revised career and sector consistency fix
**References:** fix/career-classification-consistency, /home/azadmin/FutureGrid-career-consistency
**Why:** Final review cycle 2 APPROVED Neo's independent revision. The fix preserves legitimate AI-exposure/Bright-Outlook coexistence without fabricated designation reasons; normalizes 17 aliases into 22 canonical BLS sectors; aligns user-facing sector exposure to employment weighting; retains 756 records; and passes lint, 83 test files/1361 tests, build, and diff checks. Approved for PR and merge to main.

---

### 2026-07-16: Career-consistency revision cycle 2 — employment weighting + brightOutlookReason removal

**By:** Neo
**What:** Independent revision of the fix/career-classification-consistency diff after Fact Checker blocking rejection.
**Why:**
- `getSectorAggregates()` and `getSectorAggregatesExtended()` both used occupation-count mean (`Σrisk / count`) for `avgRisk`, while established helpers (market-signals, wage-tier-polarization) use employment-weighted mean (`Σ(emp×risk) / Σemp`). This created a user-visible inconsistency: Computer and Mathematical showed ~37.9% (count) vs ~35.3% (employment-weighted) depending on which surface you looked at.
- `deriveBrightOutlookReason()` fabricated O*NET designation reasons from projected-openings/growth data that does NOT carry provenance from the O*NET bright-outlook classification criteria. 266/267 Bright Outlook occupations have positive openings → essentially every entry was labeled "openings", masking rapid-growth and new-emerging categories.
- `tests/sector-taxonomy.test.ts` comment said "employment-weighted" but code was count-weighted.

**Changes made (cycle 2):**
- `lib/data.ts`: Both aggregators now use employment-weighted mean with count-weighted fallback for zero-employment sectors (consistent with existing zero-handling patterns). Removed `brightOutlookReason` field, `deriveBrightOutlookReason()` function, and the field assignment in `toHighlightEntry()`.
- `components/dashboard/HighlightsBento.tsx`: Removed `subtext`/per-entry labels ("high demand openings", "strong employment growth"). Updated footer copy to accurately describe O*NET Bright Outlook designation criteria (rapid growth, large openings, or new-emerging) without implying per-entry reason knowledge.
- `app/sectors/[id]/page.tsx`: Fixed local count-weighted `avgRisk` to employment-weighted (same formula, count-weighted fallback).
- `tests/data.test.ts`: Removed two `brightOutlookReason` tests; fixed Customer Service comment to remove "the reason these signals coexist" language.
- `tests/sector-taxonomy.test.ts`: Replaced loose bounds test (0.30–0.45, misleadingly labeled "employment-weighted") with source-derived regression: derives expected value from `generateAllCareerInsights()` rows and asserts `toBeCloseTo(expected, 4)`.

**Validated:** 1361/1361 tests pass, lint clean, build succeeds, `git diff --check` clean.

---

### 2026-07-16: Fix brightOutlook panel sort — demand signal, not AI exposure

**By:** Tank  
**What:** Changed the sort key for the `brightOutlook` highlight list in `getHighlights()` (lib/data.ts) from `automationProbability` descending to `projectedOpenings` descending → `growthRate` descending → name. Added `brightOutlookReason: "openings" | "growth" | null` field to `HighlightEntry`. Updated `HighlightsBento` to show the demand-driver label and explain that Bright Outlook and AI exposure are independent signals in the footer copy. Added 10 new deterministic tests in `tests/data.test.ts`.

**Why:** The `brightOutlook` panel was sorted by the same metric as `mostAtRisk` (automationProbability), causing high-AI-exposure occupations like Customer Service Representatives to appear at the top of BOTH panels. This was a presentation defect — not a data error. The underlying data is valid: an occupation can legitimately have both high AI task exposure (an independent measure from the Anthropic Economic Index) and Bright Outlook (a BLS demand designation based on projected openings or growth). Sorting by AI exposure wrongly implied the two signals are contradictory. Sorting by demand (projected openings) makes each panel's ranking metric self-consistent and visually distinct. Customer Service Representatives still appears in both lists (position 2 in Most AI-Exposed at 70.1% exposure; position 5 in Bright Outlook at 387,600 annual openings) — which is correct, because both signals are true — but the context is now clear to users.

---

## Archive: Entries Before 2026-07-09

All completed decisions from 2026-06-30 through 2026-07-08 have been archived.

Archived Records:
- FutureGrid "Insights Lab" — Analytics & Statistical Forecasting Layer (2026-07-01)
- FutureGrid Round 2 — Engagement Features (2026-06-30)
- FutureGrid Upgrade — Design & Data Layer (2026-06-30)
- FutureGrid Round 3 — Real Data Integration (2026-06-30)
- FutureGrid Round 4 — Global Data Discovery + Flat World Map + China-Inclusive Metrics (2026-06-30)
- FutureGrid Round 5 — Data Layer Test Suite + Vitest Integration (2026-06-30)
- FutureGrid Round 6 — Performance: Geometry Extraction to Static Asset (2026-06-30)
- Decision: Shared-File Integration Must Be Solo/Sequenced

Archived at: 2026-07-16T05:06:09Z by Scribe
