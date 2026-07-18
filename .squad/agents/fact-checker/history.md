# Fact Checker — History

## Learnings

Initial scaffold via `squad upgrade`. Ready for work.


## 2026-07-11T00:00:00Z — Wage-Tier Polarization & Major Economy Occupational Mix Batch Closeout

**PRs closed:** #110 (/sectors wage-tier AI-exposure polarization, merged) | #112 (/global major-economy occupational mix, merged)
**PRs closed:** #110 (/sectors wage-tier AI-exposure polarization, merged) | #112 (/global major-economy occupational mix, merged)  
**Batch focus:** Data compliance verification, license validation, international methodology assessment

### Compliance & Governance Verification

**International Data Source Vetting (ILOSTAT)**
- Dataset: `EMP_TEMP_SEX_OCU_NB` (national labor survey, occupational distribution by sex/employment status)
- License verified: CC BY 4.0 explicit at data-file level (not report wrapper)
- Coverage: 9 major economies included (AUS/DEU/ESP/FRA/GBR/ITA/KOR/NLD/USA) with 2025 ISCO-08 data
- Exclusions verified: CAN (NOC classification, not ISCO-08), JPN (missing occupational groups in published data)
- Update frequency documented: Scheduled refresh cadence per ILO publication cycle
- Host migration flagged: www.ilo.org → webapis.ilo.org (builder criterion added)

**Blocked & Deferred Decisions**
1. **Blocked:** US-derived AI exposure scoring for international context
   - Reason: Methodological unsafety; SOC-to-ISCO-08 bridge undefined; prevents false parity claims
   - Safe design: /sectors (US-only, wage-tier + exposure) + /global (9-country mix, no exposure)
   - Implementation: Server-side validation prevents accidental cross-national scoring

2. **Deferred:** ILO 2025 occupational exposure supplement
   - Finding: Report-level license (CC BY) insufficient; data-file license not explicit
   - Action: Wait for ILO to clarify data-file license OR identify alternative source with published methodology
   - Rationale: Reduces compliance risk; does not block current release

3. **Deferred:** Wage-outcome elasticity retrospective
   - Requirement: 2+ years paired wage/employment data
   - Timing: Post-collection (v1.2 target)
   - No blocker to current features

### Governance Framework Established

**Data Governance Principles (Per Batch)**
- All production datasets: Explicit license at data-file level (CC BY 4.0 ≥ acceptable)
- No synthetic data: All wage/occupational distributions from published national surveys
- No cross-national scoring: Do not apply jurisdiction-specific AI exposure to international labor-force data
- Caveat clarity: RAI representativeness notes wired; download audit trail available
- Imputation policy: No imputation; omit countries with incomplete data (CAN/JPN pattern)

**Future ILOSTAT Integration Checklist**
- ✅ Live key-free CSV builder validates before write
- ✅ Coverage ≥98% per country; ≥9 of 10 occupational groups
- ✅ Data recency (2025 ISCO-08); no lagged data
- ✅ Host migration documented (www.ilo.org → webapps.ilo.org)
- ✅ Alternative sources evaluated: Eurostat LFS (EU, license TBD), national labor offices (per-country license audit required)

### Learnings for Data Compliance

**License Verification Workflow**
- Always check data-file license (not just report/readme wrapper)
- CC BY 4.0 at data-file level is acceptable for production use
- Report-only CC BY (data-file undefined) → defer integration pending clarification
- Document host/endpoint stability; flag migrations in builder code comments

**International Methodology Safety**
- US-centric exposure scoring (Claude usage, GenAI diffusion, SOC-keyed models) not generalizable to other labor-force-survey instruments
- Safe approach: Descriptive occupational shares (ISCO-08 comparable) + US-focused exposure analysis (kept separate)
- Server-side validation enforces data boundary (no accidental cross-national scoring at runtime)

**Caveat & Representativeness Standards**
- All international datasets include: data-source attribution, coverage gaps (CAN/JPN omission reasons), caveat on occupational definition differences
- All international features include: RAI representativeness note; download audit trail; methodology drill-down link
- Completeness claim explicitly rejected: "Shares shown for available countries; data incomplete for omitted regions"

### Future Phases (Dependent on Data Completion)

1. **Phase 2 visualization:** Evidence Convergence Strip (talent + demand + exposure timeline) — prerequisite: Issue #77 (provenance/freshness cues)
2. **Phase 2 reskilling:** Talent-Bottleneck-to-Reskilling Bridge — prerequisite: NAICS-SOC bridge dataset
3. **Phase 2 outcomes:** Exposure-to-Outcome Reality Matrix — prerequisite: 2+ years paired wage/employment retrospective (v1.2 post-collection)



### 2026-07-16: Full-site Playwright and data audit cycle — verification (Job Zone/wage/market-signals)

Fact Checker conducted independent verification of Tank's data audit findings. Results: Job Zone defects confirmed (8+ hydration failures), wage sourcing mismatches confirmed (OEWS priority), market-signal staleness disproved (false positive; data current). All findings validated; implementation path clear.

**Key responsibilities:**
- Verification scope: Job Zone + wage + market-signals
- Job Zone: Confirmed defect with specific route examples; validated neutral placeholder fix
- Wage sourcing: Verified OEWS vs. projections mismatch; confirmed OEWS priority design
- Market signals: Confirmed projections data current; disproved staleness false positive
- Blocker resolution: Verified implementation ready without false alarms

**Key learnings:**
- Verify audit scripts before treating recomputation as a defect; script errors propagate to false problem claims
- Cross-source data consistency requires explicit source hierarchy at contract level (OEWS > projections for wages)
- Market-signal freshness must be validated separately from data consistency; staleness claims require timestamp evidence


### 2026-07-17T21-23-54: AI Frontier Methodology Release (PR #129) — Data Verification & Bias Detection

**Cycle:** Live data verification, compute non-disclosure pattern identification, source-row validation
**Verdicts:** ✅ APPROVE (data verification, bias confirmation)

**Live Data Verification (Fact Checker, sync):**
- ✅ Fetched live Epoch AI CSV/docs
- ✅ Confirmed 1,035 source rows, 1,030 dated, 528 compute-known
- ✅ **Disclosure Bias Confirmed:** Chinese active labs (Alibaba 29, ByteDance 9, DeepSeek 9, Baidu 4) all carry 0 frontierCount (compute non-disclosure). This is the concrete example of structural bias that must be named in UI.
- ✅ **Default View Correct:** recentCount shows China #2 (104 recent tracked) ahead of UK #5 (6 recent tracked)
- ✅ **Frontier-Only Inversion Identified:** frontierCount shows UK #2 (9 entries from historical DeepMind/Oxford) > China #4 (4 entries). This inversion is mathematically correct given source data but represents disclosure bias, NOT country capability ranking.
- ✅ All proxy definitions validated
- ✅ Live data current; no staleness issues

**Learning:** Data verification must explicitly surface structural bias patterns (e.g., "Chinese entities have 0 frontierCount because they don't publish compute figures"). Naming the concrete pattern allows UI/UX to implement targeted disclosures. Generic disclaimers ("data limitations") fail to prevent metric misinterpretation. When non-disclosure is structural, it must be called out as concrete example at point of use.

**Outcome:** Data verification cleared for release. Bias confirmation provided to Rai and Neo for UI remediation.
