# Changelog

## [0.2.0] - 2026-10-08

### Data
- Refreshed every key-free snapshot (WARN, LAUS, QCEW, JOLTS through Aug 2026, market/AI-company prices, OpenRouter, Epoch AI, ILOSTAT, AI usage proxies) and the credential-gated OEWS snapshot and O*NET enrichment.
- **New dataset** `ai-adoption-tracker.json`: St. Louis Fed Real-Time Population Survey GenAI Adoption Tracker (FRED) + Census Business Trends and Outlook Survey AI use.
- Country AI usage upgraded to the Anthropic Economic Index June 2026 release, adding use-case mix (work/personal/coursework) and automation vs augmentation.
- Microsoft AI Diffusion updated to Q2 2026 (the Q1 file the builder pointed at no longer exists upstream).
- O*NET skills upgraded 28.3 → 31.0 (handles the new Essential/Transferable Skills split).
- OEWS employment/wage history extended to 2016–2025 via direct bls.gov downloads.
- JOLTS request window now tracks the current year.

### UI
- New design system: neutral surfaces, single indigo accent, solid cards, no glow/gradient text, and data-first rendering (no scroll-reveal or count-up animations).
- New app shell: refined sidebar, desktop top bar with breadcrumbs and search, structured site footer.
- Dashboard rebuilt as an executive overview with KPI tiles, sector table, and an adoption pulse.
- Standard page headers across all pages; choropleth uses single-hue sequential ramps.

### Fixes
- Country "global share" was displayed ×100 (e.g. 2016% instead of 20.16%).


## [0.1.0] - 2026-07-05

- Initial FutureGrid application release.
