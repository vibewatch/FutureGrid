# Tank History

## Summary (2026-07-02 to 2026-07-11): Data Layer & Infrastructure Implementation

Implemented 8 major data pipelines and library layers: AI Frontier (1033 models → 528 entries, CC BY), Job Postings (national survey), Employment Projections (BLS), Talent Bottleneck (4-way SOC join with H-1B + projections + postings), OpenRouter (340 endpoints), OpenRouter Geography (publisher + endpoint-provider lenses), AI Company Stocks (47 companies + 7 categories + Alpha Vantage integration), ORS Automation Friction, Wage-Tier Polarization (deterministic tercile, employment-weighted), ILOSTAT International Occupation Mix (9-country ISCO-08 normalized shares, CC BY 4.0). All implementations server-only guarded (`import "server-only"`), determinism-tested, bundle-monitored (394.1 KB stable across all). Coordinate strict-lockout revisions: Per-artifact lockout enforced for conflict-of-interest isolation on #104 (server/client split), #110 (wage-tier revision), #112 (ILOSTAT integration). Data governance decisions captured: No synthetic international exposure scoring (US-derived metrics unsafe cross-nationally); ILOSTAT CC BY 4.0 explicit at file level; Canada/Japan exclusion reasons documented. Offline rebuild durability established: credential lanes preserved, fixture-origin committed, non-self-healing regression tests. Learned: Raw data imports in client components are highest bundle risk; server-only guards prevent transitive JSON bloat; deterministic builders require explicit error handling. No blockers for current data set.

---

## Recent Sessions

### 2026-07-14 — Weekly Data Refresh Cycle: Cross-Agent Learnings

**Preserve Last-Known-Good Credential Lanes**
- Public data builders must isolate credential-dependent data; never degrade credential access in refresh cycles
- Applied: PRs #122–#125 preserved credential lanes while updating public datasets

**Offline Rebuild Durability Requires Committed Metadata**
- Regression tests must be deterministic; self-healing masks underlying bugs
- Committed fixture-origin metadata prevents second-run recovery of broken states
- Applied: PR #125 added non-self-healing regression test

**Full In-Job Test Gates for Bot PRs**
- Bot PRs need full validation gates in workflow before creating PR: lint → tests → build → commit/push → then PR
- Applied: PR #125 hardened workflow with full test gates

### 2026-07-14T06:41:23.426Z — Release Recovery Session: SPRINT_SUMMARY conflict resolution completed (initiated)

**Role:** Session requester  
**Manifest:** 4-phase strict-lockout workflow for interrupted rebase recovery  
**Status:** ✅ APPROVED (ready for PR merge)

**What happened:** Initiated release recovery with unresolved conflict markers in SPRINT_SUMMARY.txt. Mouse performed review gate → discovered Tank authored original file → per strict-lockout protocol, reassigned revision to Trinity → Trinity resolved all conflict markers and whitespace → Mouse re-reviewed and approved.

**Result:** SPRINT_SUMMARY.txt now clean; all blocking criteria cleared. Build/Lint/Test valid. Lockouts cleared on both Tank and Trinity.

**Next action:** Trinity to open PR and merge revised worktree to main per Squad directive (2026-07-04: use PR merge workflow).

---

### 2026-07-16: Full-site Playwright and data audit cycle — data audit and implementation (Job Zone, wage sourcing)

Tank conducted data audit identifying Job Zone missing/neutral scores and cross-surface wage sourcing inconsistencies. Implemented fixes: neutral placeholder for careers with no BLS Job Zone, OEWS wage priority across career/sector surfaces. Post-fix Playwright: 1,674/1,674 pass.

**Key responsibilities:**
- Data audit: Identified Job Zone missing/neutral and wage sourcing defects (root cause analysis)
- Job Zone implementation: Neutral/unknown placeholder for careers without BLS Job Zone assignment
- Wage sourcing fix: OEWS salary takes priority over projections; enforced across all surfaces via data contract
- JSDoc semantics: Corrected documentation for Job Zone and wage fields
- Test coverage: Added deterministic regression tests for Job Zone and wage logic

**Key learnings:**
- Missing Job Zones must map to neutral/unknown placeholders, not silently omitted; omission creates data integrity gaps and user confusion
- Cross-surface wage displays require one canonical source defined at data-contract level; OEWS is priority (established BLS methodology)
- Data audit scripts must be verified before treating recomputed results as defects; script correctness is prerequisite to interpretation
