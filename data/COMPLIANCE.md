# FutureGrid — Dataset License & Redistribution Compliance Audit

**Spike:** Issue #56 | **Audited:** 2026-07-02 | **Auditor:** Trinity (Lead)  
**Scope:** All committed `data/*.json` snapshots; upstream attribution in `data/sources.json` and the `/sources` UI.

> **Bulk-download / API gate (Issue #57):** The optional public bulk-download planned in issue #57 **MUST NOT ship** until all items flagged `⚠️ RISK` below are remediated. See [§ Flagged Items & Remediation](#flagged-items--remediation-plan).

---

## Methodology Note

All files in `data/` are **derived or aggregated works** — FutureGrid fetches upstream datasets at build time, filters, reshapes, and combines them into application-ready JSON snapshots. None of the committed files are verbatim copies; all are transformed derivatives.

This distinction matters legally:

- **CC BY 4.0** and **MIT** explicitly permit creating and redistributing derivatives with attribution.  
- **Public Domain** / US Government works carry no restrictions.  
- **IMF terms** permit non-commercial redistribution of derivatives with attribution, but **require explicit IMF permission for commercial use**.  
- **Proprietary** (Challenger, Yahoo Finance) — redistribution of any form (verbatim or derived) is NOT permitted without a commercial data license.  
- **No explicit license** (AIOE, Frey & Osborne) — redistribution is legally ambiguous; conservative position: do not redistribute without author permission.

---

## Per-License Summary

| License | What it requires of FutureGrid |
|---------|-------------------------------|
| **CC BY 4.0** | Attribute the upstream source (name, publisher, URL, "© Year"). Indicate changes made. No share-alike obligation. |
| **CC BY-SA 4.0** | Attribute + any derivative released under the same CC BY-SA 4.0 terms. The `world-countries.geo.json` incorporates ISO-3166 crosswalk data under CC BY-SA — see note in matrix. |
| **MIT** | Include the copyright notice and MIT license text in any redistribution. Permissive for commercial and derivative use. |
| **Public Domain / US Government** | No restrictions. Attribution is best practice. |
| **IMF terms** | Attribute IMF. Non-commercial redistribution of derivatives permitted. Commercial redistribution requires explicit IMF permission. |
| **California Public Records Act** | Public records; free redistribution with attribution to California EDD. No copyright restriction on the notices themselves. |
| **Proprietary (Challenger / Yahoo)** | Redistribution — even of derived values — is NOT permitted without a data license. Committed files must be replaced or removed before any public bulk-download (issue #57). |
| **No explicit license (AIOE / Frey & Osborne)** | Legally unclear. Academic citation is expected; redistribution of the data requires author permission. |

---

## Compliance Matrix

> Legend: ✅ = Redistribution allowed | ⚠️ = Conditional (see notes) | ❌ = Not permitted / must remediate

| # | Committed File | Upstream Source(s) | License | Redistribution | Attribution Required | Modifications Made | Risk Level | Notes |
|---|---------------|-------------------|---------|---------------|---------------------|--------------------|------------|-------|
| 1 | `data/ai-demand.json` | [Indeed Hiring Lab AI Tracker](https://github.com/hiring-lab/ai-tracker) | CC BY 4.0 | ✅ Yes-with-attribution | "Indeed Hiring Lab" + URL | Filtered to AI/GenAI job-posting share series; aggregated by country | 🟢 Low | License confirmed in repo README. Attribution added to `sources.json`. |
| 2 | `data/ai-frontier.json` | [Epoch AI — Notable AI Models](https://epoch.ai/data/notable-ai-models) | CC BY 4.0 | ✅ Yes-with-attribution | "Epoch AI" + URL | Filtered notable models; derived compute/cost/power trend aggregates; frontier boolean added | 🟢 Low | Added dynamically to `/sources` page at render time from `ai-frontier.json`'s embedded source block. |
| 3 | `data/ai-layoffs.json` | [Challenger, Gray & Christmas](https://www.challengergray.com/) via community-compiled GitHub gist | **Proprietary — no redistribution without license** | ❌ Not permitted | N/A | Monthly and annual AI-attributed job-cut totals derived from Challenger press-release figures | 🔴 **HIGH** | Challenger data is proprietary. Redistribution (including of derived totals) requires a commercial data license. Current source is a community gist, not a licensed feed. **Must remediate before issue #57.** See remediation plan. |
| 4 | `data/ai-usage-proxies.json` | Multiple (AEI, Eurostat, OECD, Census, CNNIC, QuestMobile, HuggingFace API, GitHub API, Stack Overflow, World Bank) | CC BY 4.0 (most); OECD open license; Public Domain (Census); Government terms (CNNIC); Proprietary (QuestMobile) | ⚠️ Mixed | Per source (see `sources.json` entries 5–16) | Aggregated into a single proxy-metrics object; no raw survey micro-data committed | 🟡 **Medium** | QuestMobile and CNNIC data are from proprietary/state-media sources with unclear redistribution rights. These rows should be clearly labelled as approximate/secondary. Bulk-download must exclude these rows or display a warning. |
| 5 | `data/aioe-exposure.json` | [AIOE Dataset — Felten, Raj & Seamans (2021)](https://github.com/AIOE-Data/AIOE) | **No explicit open license — citation required** | ⚠️ Unclear — verify | Cite: "Felten E, Raj M, Seamans R (2021) SMJ 42(12):2195–2217" | Per-SOC AIOE scores reshaped to `bySoc` lookup map | 🟡 **Medium** | GitHub repo requests citation but has no explicit CC/OSI license. Conservative position: do not include in bulk-download without author permission. Marked `cite-only` in file metadata. |
| 6 | `data/automation-baseline.json` | [Frey & Osborne (2013)](https://www.oxfordmartin.ox.ac.uk/publications/the-future-of-employment/) via third-party GitHub mirror | **No open license — academic research** | ⚠️ Unclear — verify | Cite: "Frey & Osborne (2013), Oxford Martin School" | 663 SOC automation probabilities reshaped to `bySoc` lookup map | 🟡 **Medium** | Original paper supplementary data was never openly licensed. The committed data comes from a third-party GitHub mirror (WorkForce-Central), not directly from the authors. Redistribution is legally uncertain. The README already states FutureGrid uses AEI (not Frey-Osborne) as the primary metric; this file is a legacy comparison baseline. Consider removing from committed files or replacing with a cleared derivation. |
| 7 | `data/country-exposure.json` | [Anthropic Economic Index — Country AI Adoption](https://huggingface.co/datasets/Anthropic/EconomicIndex) + World Bank (China supplement) | CC BY 4.0 (AEI); CC BY 4.0 (World Bank) | ✅ Yes-with-attribution | "Anthropic" + "World Bank" + URLs | Per-country usage index, usage %, usage count, GDP per working-age capita aggregated | 🟢 Low | Both upstreams are CC BY 4.0. Covered in `sources.json`. |
| 8 | `data/global-ai-metrics.json` | [Microsoft AI Diffusion Report](https://github.com/microsoft/ai-diffusion-report) (MIT); [IMF AIPI](https://www.imf.org/external/datamapper/AI_PI@AIPI/ADVEC/EME/LIC) (IMF terms); [Oxford Insights AI Readiness 2023](https://open.africa/dataset/government-ai-readiness-index-2023) (CC BY 4.0) | MIT + IMF terms + CC BY 4.0 | ⚠️ Conditional (IMF portion) | Microsoft, IMF, Oxford Insights each attributed | Three metric layers merged; computed derived aggregates (unmatchedEconomies, etc.) | 🟡 **Medium** | Microsoft (MIT) and Oxford Insights (CC BY 4.0) portions are freely redistributable. **IMF AIPI portion**: IMF terms restrict commercial redistribution — requires explicit IMF permission for commercial bulk-download. Bulk-download in #57 must either exclude IMF data or gate on IMF clearance. All three sources added to `sources.json`. |
| 9 | `data/jolts.json` | [BLS JOLTS via BLS Public Data API](https://www.bls.gov/jlt/) | **Public Domain** | ✅ Yes | "U.S. Bureau of Labor Statistics" | Monthly series filtered, reshaped to time-series arrays | 🟢 Low | US federal government work; no copyright. Entry added to `sources.json`. |
| 10 | `data/llm-exposure.json` | [OpenAI "GPTs are GPTs"](https://github.com/openai/GPTs-are-GPTs) | **MIT** | ✅ Yes | Include MIT copyright notice | Per-SOC GPT-4 exposure ratings reshaped to `bySoc` lookup | 🟢 Low | MIT license permits derivative redistribution. Entry added to `sources.json`. |
| 11 | `data/market-ai-signals.json` | [Yahoo Finance chart JSON endpoint (unofficial)](https://finance.yahoo.com/) | **Yahoo ToS — redistribution PROHIBITED** | ❌ Not permitted | N/A | Monthly closing prices for AI-sector ETFs derived to trend signals | 🔴 **HIGH** | Yahoo's Terms of Service explicitly prohibit redistribution of financial data accessed via their endpoints (including undocumented chart APIs). Committed stock-price snapshots cannot be redistributed. **Must remediate before issue #57.** See remediation plan. |
| 12 | `data/occupation-snapshot.json` | [Anthropic Economic Index](https://huggingface.co/datasets/Anthropic/EconomicIndex) (CC BY 4.0) + [BLS OEWS](https://www.bls.gov/oes/) (Public Domain) + [O\*NET 28.3](https://www.onetcenter.org/database.html) (CC BY 4.0) | CC BY 4.0 + Public Domain | ✅ Yes-with-attribution | Anthropic, BLS, O\*NET each attributed | 756-row occupation snapshot with AI exposure, OEWS wages/employment, O\*NET skills | 🟢 Low | All three upstreams are freely redistributable. Well covered in `sources.json`. |
| 13 | `data/occupation-snapshot-slim.json` | Same as `occupation-snapshot.json` | CC BY 4.0 + Public Domain | ✅ Yes-with-attribution | Same as above | Slim version (fewer columns) derived from occupation-snapshot | 🟢 Low | Same upstreams, same clearance. |
| 14 | `data/onet-enrichment.json` | [O\*NET Web Services API v2](https://services.onetcenter.org/reference/) | **CC BY 4.0** | ✅ Yes-with-attribution | "U.S. Department of Labor / O\*NET Resource Center" + URL | Per-occupation descriptions, tasks, detailed work activities, technology skills, related occupations | 🟢 Low | O\*NET data is CC BY 4.0 via both the database download and the web services API. |
| 15 | `data/state-labor.json` | [BLS Local Area Unemployment Statistics (LAUS)](https://www.bls.gov/lau/) | **Public Domain** | ✅ Yes | "U.S. Bureau of Labor Statistics" | State-level monthly unemployment series filtered and reshaped | 🟢 Low | US federal government work. Entry added to `sources.json`. |
| 16 | `data/state-qcew.json` | [BLS QCEW Annual Area CSVs](https://www.bls.gov/cew/downloadable-data-files.htm) | **Public Domain** | ✅ Yes | "U.S. Bureau of Labor Statistics" | State annual employment/wage data filtered and reshaped | 🟢 Low | US federal government work. Entry added to `sources.json`. |
| 17 | `data/warn-notices.json` | [California EDD — WARN Act Notices](https://edd.ca.gov/en/jobs_and_training/layoff_services_warn/) | **Public Records (CA Public Records Act / Labor Code § 1401)** | ✅ Yes-with-attribution | "California Employment Development Department (EDD)" | 12,000+ notice records parsed and reshaped; currently only California | 🟢 Low | California WARN notices are statutory public records with no copyright restriction. Attribution to EDD is best practice. Entry added to `sources.json`. Note: if coverage expands to other states, each state's WARN regime must be checked independently. |
| 18 | `data/world-countries.geo.json` | [Natural Earth / world-atlas@2](https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json) (Public Domain); [lukes/ISO-3166-Countries-with-Regional-Codes](https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes) (CC BY-SA 4.0) | Public Domain + CC BY-SA 4.0 | ✅ Yes (see note) | Natural Earth + Luke Duncalfe attributed | 110m TopoJSON converted to GeoJSON; Antarctica dropped; numeric IDs mapped to ISO 3166-1 alpha-3 via crosswalk | 🟢 Low | Natural Earth geometry is public domain. The ISO crosswalk (CC BY-SA 4.0) contributed only the numeric→alpha-3 mapping; the committed file contains standard ISO country codes (international standard designations, not independently copyrightable) as `id` fields. Risk is low, but to be conservative, note CC BY-SA provenance in attribution. |
| 19 | `data/sources.json` | Self-generated from build | MIT (project license) | ✅ Yes | FutureGrid (MIT) | Machine-generated source registry | 🟢 Low | This file is the attribution manifest itself; freely redistributable. |
| 20 | `data/provenance.json` | Self-generated from build | MIT (project license) | ✅ Yes | FutureGrid (MIT) | Machine-generated dataset provenance registry | 🟢 Low | Same as sources.json. |
| 21 | `data/job-postings.json` | FutureGrid seed derived from `occupation-snapshot.json` and `onet-enrichment.json` | CC BY 4.0 + Public Domain + MIT project output | ✅ Yes-with-attribution | FutureGrid + Anthropic + BLS + O\*NET | Deterministic SOC-keyed 2016–2025 provider-ready demand seed; not observed historical postings | 🟢 Low | Clearly marked as seed/proxy data in metadata. Replace counts with licensed Lightcast/LinkUp/TheirStack/Adzuna data when available. |
| 22 | `data/employment-projections.json` | [BLS Employment Projections occupational data](https://www.bls.gov/emp/data/occupational-data.htm) via public `jeffbaumes/jobs` mirror | Public Domain (US Government) | ✅ Yes | "U.S. Bureau of Labor Statistics" | SOC-keyed 2024–2034 projection rows joined to FutureGrid occupation snapshot and reshaped for visualization | 🟢 Low | Builder records that BLS direct download was HTTP 403 in this environment and uses the mirror; underlying source is official BLS public-domain data. |
| 23 | `data/openrouter-models.json` | [OpenRouter public model catalog API](https://openrouter.ai/api/v1/models) | Public API/catalog terms — verify before bulk redistribution | ⚠️ Conditional | "OpenRouter" + API URL | Public model catalog normalized into model, provider, family, and endpoint summary fields | 🟡 Medium | Treat strictly as catalog metadata/proxy footprint. It is not observed usage, traffic, demand, or deployment geography. Bulk-download/API redistribution should be gated on OpenRouter terms review. |
| 24 | `data/ai-company-stocks.json` | Static adjusted-close fixture bootstrapped from Yahoo Finance chart JSON; optional Alpha Vantage refresh path | Yahoo ToS / Alpha Vantage API terms | ❌ Not cleared for public redistribution in current fixture mode | N/A for Yahoo redistribution; Alpha Vantage attribution if refreshed under its terms | Historical adjusted-close observations transformed into descriptive return, volatility, drawdown, and breadth metrics | 🔴 High | Same market-data caveat as `market-ai-signals.json`: descriptive history only, not investment advice, forecasts, or recommendations. Exclude from public bulk-download until rebuilt from a redistribution-cleared provider/license. |
| 25 | `data/occupational-requirements.json` | [BLS Occupational Requirements Survey (ORS)](https://www.bls.gov/ors/data.htm) plus FutureGrid seed derivation from cleared occupation metadata | Public Domain (US Government) + MIT project output | ✅ Yes | "U.S. Bureau of Labor Statistics" | ORS-concept seed estimates by SOC for preparation, physical presence, work conditions, decision-making, and derived automation-friction score | 🟢 Low | Clearly marked as seed/broad-SOC coverage until exact public ORS rows are wired through the provider contract. ORS measures job requirements, not AI capability or displacement probability. |

---

## /sources Page Attribution Gaps Found & Fixed

Cross-checking all committed dataset files against `data/sources.json` entries (and the dynamic Epoch AI entry added in `app/sources/page.tsx`):

| Dataset | Gap Found | Action Taken |
|---------|-----------|--------------|
| `ai-demand.json` | **MISSING** — Indeed Hiring Lab not in `sources.json` | ✅ **Added** entry (CC BY 4.0) |
| `ai-frontier.json` | Present dynamically (injected at render time from `ai-frontier.json` source block) | No action needed |
| `ai-layoffs.json` | **MISSING** — Challenger, Gray & Christmas not in `sources.json` | ✅ **Added** entry (flagged as proprietary) |
| `aioe-exposure.json` | **MISSING** — AIOE (Felten/Raj/Seamans) not in `sources.json` | ✅ **Added** entry (flagged unclear license) |
| `automation-baseline.json` | **MISSING** — Frey & Osborne (2013) not in `sources.json` | ✅ **Added** entry (flagged unclear license) |
| `global-ai-metrics.json` (Microsoft) | **MISSING** — Microsoft AI Diffusion not in `sources.json` | ✅ **Added** entry (MIT) |
| `global-ai-metrics.json` (IMF AIPI) | **MISSING** — IMF AIPI data source not in `sources.json` (existing entry #19 is a different IMF working paper used for context only, not the AIPI data) | ✅ **Added** entry (IMF terms, conditional) |
| `global-ai-metrics.json` (Oxford Insights) | **MISSING** — Oxford Insights AI Readiness not in `sources.json` | ✅ **Added** entry (CC BY 4.0) |
| `jolts.json` | **MISSING** — BLS JOLTS not in `sources.json` | ✅ **Added** entry (Public Domain) |
| `llm-exposure.json` | **MISSING** — OpenAI "GPTs are GPTs" not in `sources.json` | ✅ **Added** entry (MIT) |
| `market-ai-signals.json` | **MISSING** — Yahoo Finance not in `sources.json` | ✅ **Added** entry (flagged as prohibited) |
| `state-labor.json` | **MISSING** — BLS LAUS not in `sources.json` | ✅ **Added** entry (Public Domain) |
| `state-qcew.json` | **MISSING** — BLS QCEW not in `sources.json` | ✅ **Added** entry (Public Domain) |
| `warn-notices.json` | **MISSING** — California EDD not in `sources.json` | ✅ **Added** entry (Public Records) |
| `h1b-trends.json` | **MISSING** — DOL OFLC LCA Disclosure Data not in `sources.json` | ✅ **Added** entry (US Government public domain / public records). Verdict: **Yes** — public domain, redistributable with attribution; cleared for bulk download. |
| `openrouter-models.json` | **MISSING** — OpenRouter public model catalog API not in `sources.json` | ✅ **Added** entry (catalog/API terms review required before bulk redistribution; catalog proxy only). |
| `ai-company-stocks.json` | **MISSING** — AI company adjusted-close fixture not in `sources.json` | ✅ **Added** entry (historical market-data caveat; not redistribution-cleared while sourced from Yahoo fixture). |
| `occupational-requirements.json` | **MISSING** — BLS ORS not in `sources.json` | ✅ **Added** entry (Public Domain; seed coverage caveated until exact ORS rows are ingested). |
| `world-countries.geo.json` | Natural Earth ✅ in `sources.json`; ISO crosswalk ✅ in `sources.json` | No action needed |
| `ai-usage-proxies.json` | All sub-sources present in `sources.json` (entries 5–16) | No action needed |
| `occupation-snapshot*.json` | All sub-sources present (AEI, BLS, O\*NET entries) | No action needed |
| `onet-enrichment.json` | O\*NET entries present | No action needed |
| `country-exposure.json` | AEI + World Bank entries present | No action needed |

**Result:** `data/sources.json` now contains 42 entries. All dataset files are represented on the `/sources` page or explicitly marked as dynamically injected/exempt in tests.

---

## Flagged Items & Remediation Plan

### 🔴 HIGH RISK — Must remediate before bulk-download / API (issue #57)

#### 1. `data/market-ai-signals.json` — Yahoo Finance

**Risk:** Yahoo Finance's [Terms of Service](https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html) explicitly prohibit redistribution, reproduction, and commercial use of financial data accessed via their endpoints. The endpoint used (`query1.finance.yahoo.com/v8/finance/chart/...`) is undocumented and carries no API license. Committed stock-price snapshots (monthly OHLC) cannot be legally redistributed.

**Remediation options (pick one):**
1. **Replace source (preferred):** Switch to a licensed financial data provider that explicitly permits redistribution, such as [Alpha Vantage](https://www.alphavantage.co/terms_of_service/) (free tier allows redistribution with attribution) or [Quandl/Nasdaq Data Link](https://data.nasdaq.com/). Update the build script and re-snapshot.
2. **Link-out instead of committing:** Remove the price snapshots from the committed JSON. Replace with live client-side fetches at runtime via a proxy that complies with the provider's terms, so that FutureGrid never redistributes the raw data.
3. **Gate bulk-download:** If the upstream source is not replaced, the `market-ai-signals.json` file must be excluded from any public bulk-download or API endpoint until cleared.

**Issue #57 gate:** Issue #57 bulk-download MUST NOT include `market-ai-signals.json` until option 1 or 2 is implemented.

**Also applies to `data/ai-company-stocks.json`:** The current committed stock-watchlist fixture is bootstrapped from the same Yahoo chart JSON source pattern. Although the UI labels it as delayed descriptive history and avoids recommendation language, the file is not redistribution-cleared in fixture mode. It must be excluded from bulk-download/API surfaces until rebuilt from a provider/license that explicitly permits redistribution (or removed from committed data).

---

#### 2. `data/ai-layoffs.json` — Challenger, Gray & Christmas

**Risk:** Challenger, Gray & Christmas publishes proprietary monthly job-cut reports. Their data is not released under an open license; redistribution — including of derived aggregate totals — requires a commercial data license. The committed data is sourced from a community-compiled GitHub gist, not a licensed Challenger feed.

**Remediation options (pick one):**
1. **Obtain a license:** Contact Challenger, Gray & Christmas ([challengergray.com](https://www.challengergray.com/)) to negotiate a data-sharing or redistribution license.
2. **Replace with a cleared source:** BLS [Mass Layoff Statistics](https://www.bls.gov/mls/) or state WARN act aggregates are public domain and cover similar territory (though without the AI-attribution dimension).
3. **Link-out + cite:** Remove the committed snapshot and replace the UI with a link to Challenger's published press releases. Display only our own summary commentary, not the raw figures.
4. **Gate bulk-download:** Exclude `ai-layoffs.json` from any public bulk-download until a license is obtained.

**Issue #57 gate:** Issue #57 bulk-download MUST NOT include `ai-layoffs.json` until option 1 or 2 is implemented.

---

### 🟡 CONDITIONAL — Permitted with restrictions; gate bulk-download on conditions

#### 3. `data/global-ai-metrics.json` (IMF AIPI portion)

**Risk:** The IMF AI Preparedness Index data (composite and sub-indices) in `global-ai-metrics.json` is governed by [IMF terms](https://www.imf.org/external/terms.htm). Non-commercial redistribution of derived data with attribution is permitted; **commercial redistribution requires explicit IMF permission**. FutureGrid's bulk-download in issue #57 may constitute commercial redistribution if the app generates revenue or is hosted commercially.

**Remediation:**
1. **Confirm use case:** If FutureGrid is non-commercial and open-source, current use is likely permitted with attribution.
2. **Attribution:** Ensure "Source: International Monetary Fund, AI Preparedness Index (2023)" is displayed wherever IMF data appears (already shown on `/sources`; add inline to the Global Map page).
3. **Commercial gate:** If the project becomes commercial, obtain written IMF permission or replace the AIPI data with an open-licensed substitute (e.g., [UNDP/UNESCO AI readiness indices](https://en.unesco.org/artificial-intelligence)).
4. **Bulk-download:** Include a terms notice in the bulk-download stating that the IMF AIPI portion may not be used for commercial purposes without IMF permission.

---

#### 4. `data/aioe-exposure.json` — AIOE (Felten, Raj & Seamans 2021)

**Risk:** The AIOE dataset GitHub repository has no explicit open license. The authors request citation but have not granted redistribution rights. The committed `bySoc` lookup is a derivative.

**Remediation:**
1. **Contact authors:** Email [manavraj@wharton.upenn.edu](mailto:manavraj@wharton.upenn.edu) or [rseamans@stern.nyu.edu](mailto:rseamans@stern.nyu.edu) to request explicit redistribution permission (or confirm CC licensing).
2. **Exclude from bulk-download:** Until confirmed, exclude `aioe-exposure.json` from the issue #57 public bulk-download.
3. **If no permission obtained:** Remove the file or gate it behind a build-time only step (not committed to the repo).

---

#### 5. `data/automation-baseline.json` — Frey & Osborne (2013)

**Risk:** The 2013 Frey & Osborne automation probability dataset was published as a paper appendix with no open data license. The committed data comes from a third-party GitHub mirror. Redistribution is legally unclear.

**Note:** The README already prominently notes that FutureGrid uses Anthropic AEI (not Frey-Osborne) as the primary exposure metric. This file is a legacy comparison baseline.

**Remediation:**
1. **Consider removing:** Since Frey-Osborne is explicitly described as superseded, remove `automation-baseline.json` from the committed data. Any historical comparison can be done at build time and excluded from redistribution.
2. **If kept:** Contact the Oxford Martin Programme on Technology and Employment for redistribution clearance. Exclude from bulk-download until cleared.
3. **Bulk-download gate:** Exclude `automation-baseline.json` from issue #57 until option 1 or 2 is resolved.

---

#### 6. `data/ai-usage-proxies.json` — QuestMobile / CNNIC portions

**Risk:** QuestMobile is a commercial analytics firm; its reports are proprietary. CNNIC (China Internet Network Information Center) is a state-affiliated body; its data redistribution rights are unclear.

**Remediation:**
1. **Clearly label rows:** In the UI, mark QuestMobile/CNNIC-derived data rows as "secondary/approximate — cannot be redistributed" and exclude them from any bulk-download export.
2. **Consider removing:** The China-market rows derived from these sources could be dropped or replaced with CNNIC official statistics published through verifiably open channels.
3. **Bulk-download gate:** Exclude these specific rows from the issue #57 bulk-download.

---

### ℹ️ LOW RISK — No immediate action required, attribution notes

#### 7. `world-countries.geo.json` — ISO 3166-1 crosswalk (CC BY-SA 4.0)

The ISO crosswalk contributed only the numeric→alpha-3 code mapping used as `id` fields. ISO country codes are international standard designations that are not independently copyrightable. Risk is low, but for conservative compliance, the CC BY-SA provenance is documented in `sources.json` and this document. No share-alike obligation is expected to extend to FutureGrid's MIT-licensed codebase.

---

## Verified License URLs

| Source | License | URL |
|--------|---------|-----|
| Anthropic Economic Index | CC BY 4.0 | https://creativecommons.org/licenses/by/4.0/ |
| Indeed Hiring Lab AI Tracker | CC BY 4.0 | https://github.com/hiring-lab/ai-tracker (README) |
| O\*NET 28.3 / O\*NET Web Services | CC BY 4.0 | https://www.onetcenter.org/database.html#licensing |
| Epoch AI Notable AI Models | CC BY 4.0 | https://epoch.ai/data/notable-ai-models |
| Microsoft AI Diffusion Report | MIT | https://github.com/microsoft/ai-diffusion-report (repo license) |
| OpenAI GPTs-are-GPTs | MIT | https://github.com/openai/GPTs-are-GPTs/blob/main/LICENSE |
| BLS (OEWS, Employment Projections, JOLTS, LAUS, QCEW) | Public Domain (US Gov) | https://www.bls.gov/bls/linksite.htm |
| Natural Earth | Public Domain | https://www.naturalearthdata.com/about/terms-of-use/ |
| World Bank Open Data | CC BY 4.0 | https://datacatalog.worldbank.org/public-licenses |
| Eurostat | CC BY 4.0 | https://ec.europa.eu/eurostat/about/legal-notice |
| OECD Statistics | OECD Open License | https://data.oecd.org/licence.htm |
| U.S. Census Bureau | Public Domain (US Gov) | https://www.census.gov/about/policies/privacy/data_stewardship/our_data_policy.html |
| Oxford Insights AI Readiness 2023 | CC BY 4.0 | https://open.africa/dataset/government-ai-readiness-index-2023 |
| California EDD WARN Notices | Public Records (CA Law) | https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=LAB&sectionNum=1401 |
| lukes/ISO-3166-Countries-with-Regional-Codes | CC BY-SA 4.0 | https://github.com/lukes/ISO-3166-Countries-with-Regional-Codes/blob/master/LICENSE |
| IMF AI Preparedness Index | IMF terms | https://www.imf.org/external/terms.htm |
| OpenRouter public model catalog API | OpenRouter API/catalog terms | https://openrouter.ai/api/v1/models |
| Alpha Vantage | Alpha Vantage API terms | https://www.alphavantage.co/terms_of_service/ |
| Yahoo Finance | Yahoo ToS (redistribution PROHIBITED) | https://legal.yahoo.com/us/en/yahoo/terms/otos/index.html |
| Challenger, Gray & Christmas | Proprietary (no public license) | https://www.challengergray.com/ |
| AIOE (Felten/Raj/Seamans) | No explicit license (cite-only) | https://github.com/AIOE-Data/AIOE |
| Frey & Osborne 2013 | No explicit license (academic) | https://www.oxfordmartin.ox.ac.uk/publications/the-future-of-employment/ |

---

## Issue #57 Pre-Conditions (Bulk-Download / API)

Before shipping any public bulk-download or API endpoint (issue #57), the following must be resolved:

| File | Status | Pre-condition |
|------|--------|---------------|
| `market-ai-signals.json` | 🔴 BLOCKED | Replace Yahoo Finance with a licensed source, OR exclude from bulk-download |
| `ai-company-stocks.json` | 🔴 BLOCKED | Rebuild from a redistribution-cleared market-data provider, OR exclude from bulk-download |
| `ai-layoffs.json` | 🔴 BLOCKED | Obtain Challenger license, OR replace with cleared source, OR exclude |
| `aioe-exposure.json` | 🟡 GATED | Obtain author redistribution permission, OR exclude |
| `automation-baseline.json` | 🟡 GATED | Obtain Oxford Martin clearance, OR remove file, OR exclude |
| `global-ai-metrics.json` (IMF AIPI) | 🟡 GATED | Add IMF attribution inline to Global Map page; obtain IMF permission if commercial |
| `ai-usage-proxies.json` (QuestMobile/CNNIC rows) | 🟡 GATED | Exclude these rows from any bulk-download export |
| `openrouter-models.json` | 🟡 GATED | Confirm OpenRouter catalog/API redistribution terms; keep catalog-proxy caveat visible |
| All others | ✅ Clear | Attribution requirements met; may be included in bulk-download |

---

*This document was produced as part of spike issue #56 (license audit). It should be updated whenever new data sources are added or existing source licenses change. Last updated: 2026-07-03.*
