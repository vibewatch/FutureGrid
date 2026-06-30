# FutureGrid

An interactive data platform visualising how AI is reshaping the global workforce — built on current, authoritative data sources, not Frey & Osborne (2013).

Live: **[futuregrid.genisisiq.com](https://futuregrid.genisisiq.com)**

## What It Is

FutureGrid maps AI's real impact on careers, sectors, and countries using observed Claude usage patterns (Anthropic Economic Index), live BLS employment and wage data, O*NET skills, and global AI diffusion and preparedness indices. Every metric is sourced from post-2023 data and is fully attributed — see the in-app [**Sources**](/sources) page for details.

## Features

| Page | What you get |
|------|-------------|
| **Dashboard** | Workforce-weighted AI-exposure score, headline stats, and top-impacted occupation highlights |
| **Careers** | Search, filter, sort, and compare 750+ SOC occupations by AI exposure, employment, wages, and growth outlook; click any occupation for a full detail page |
| **Sectors** | Sector-level breakdowns of AI exposure and employment concentration; drill into individual sectors |
| **Skills** | Top skills by occupation and AI-exposure band; reskilling pathway suggestions |
| **Heatmap** | Cross-tab heat map of exposure × sector × employment |
| **Global Map** | World choropleth with three switchable metric layers — **Claude usage index** (Anthropic AEI), **GenAI diffusion %** (Microsoft AIEI, 147 economies including China), and **IMF AI Preparedness** composite score; click any country to drill down into the four AIPI sub-indices (Digital Infrastructure, Human Capital, Innovation & Integration, Regulation & Ethics) |
| **Sources** | Full data provenance, licenses, and caveats for every dataset |
| **⌘K palette** | Keyboard-driven command palette for fast navigation |

## Data Sources

All snapshots are committed to the repository — the app build is fully **offline** (no API calls at build time unless you explicitly refresh the snapshots).

| Dataset | Publisher | License | Used for |
|---------|-----------|---------|---------|
| [Anthropic Economic Index](https://huggingface.co/datasets/Anthropic/EconomicIndex) | Anthropic (2025) | CC-BY 4.0 | Primary AI-exposure metric (`observed_exposure`) per SOC occupation; replaces Frey-Osborne 2013. Also provides salary fallback, job forecast, job zone, Bright Outlook, and sector. |
| [BLS OEWS via BLS Public Data API](https://www.bls.gov/oes/) | U.S. Bureau of Labor Statistics (2025) | Public Domain | Per-occupation employment totals and median wages (authoritative; overrides AEI bundle when `BLS_API_KEY` is set) |
| [O*NET 28.3 Skills Database](https://www.onetcenter.org/database.html) | USDOL/ETA (2024) | CC BY 4.0 | Top skills by importance per SOC occupation |
| [Microsoft AI Diffusion Report — AIEI Q1 2026](https://github.com/microsoft/ai-diffusion-report) | Microsoft (2026) | MIT | GenAI diffusion % of working-age population, three-period trend (H1 2025 / H2 2025 / Q1 2026), 147 economies including China |
| [IMF AI Preparedness Index (AIPI)](https://www.imf.org/external/datamapper/AI_PI@AIPI/ADVEC/EME/LIC) | IMF (2023) | [IMF terms](https://www.imf.org/external/terms.htm) | Overall AI readiness composite (0–1, 178 countries) and four sub-indices: Digital Infrastructure (DI), Human Capital & Labour Market Policies (HCLMP), Innovation & Economic Integration (IEI), Regulation & Ethics (RE) |
| [Natural Earth / world-atlas@2](https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json) | Natural Earth / Mike Bostock | Public Domain / ISC | 110 m country polygons (TopoJSON) for the world map choropleth |

> **Comparability note:** `usageIndex` (Anthropic Claude API sessions), `diffusionPct` (Microsoft behavior-based survey), and `aiReadiness` (IMF infrastructure score) measure different things and must **not** be merged or averaged. The Global Map keeps them on separate layers with clear labelling.

## Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install & Run

```bash
npm install
npm run dev          # http://localhost:3000
```

### Production Build

```bash
npm run build        # static export → out/
```

The output in `out/` is a fully static site ready for any CDN or static host.

### Tests

```bash
npm run test:run     # vitest — 73+ tests
```

### GitHub Pages

Pushes to `main` trigger the **Deploy GitHub Pages** workflow. Set the Pages source to `GitHub Actions` in repository settings. The custom domain is `futuregrid.genisisiq.com`.

Set the `NEXT_PUBLIC_GA_ID` repository secret to enable Google Analytics.

## Refreshing Data Snapshots

Snapshots are committed; you only need to re-run these if you want fresher data.

### Full occupation + career data

```bash
npm run build:data
```

Runs `build:proxies` (supplemental usage proxies) then rebuilds the main occupation snapshot. Reads `.env` / `.env.local` via Next's env loader.

**Required key:**

| Variable | Where to get it | Used for |
|----------|----------------|---------|
| `BLS_API_KEY` | Free — [bls.gov/developers](https://www.bls.gov/developers/) | BLS OEWS employment and median wage data (authoritative figures) |

**Optional key:**

| Variable | Used for |
|----------|---------|
| `CENSUS_API_KEY` | Supplemental U.S. employer-firm AI adoption data from Census ABS (silently skipped if not set) |

### Global AI metrics (country-level)

```bash
npm run build:global-metrics
```

Refreshes the country-level data used by the Global Map (Anthropic usage index, Microsoft diffusion, IMF AIPI).

### O*NET occupation enrichment

To refresh O*NET occupation enrichment for career detail pages:

```bash
npm run build:onet
```

Set `ONET_API_KEY` and optionally `ONET_ENRICH_LIMIT` in `.env` first. `ONET_ENRICH_LIMIT=0` enriches all occupations; the default enriches a priority subset.

### World map geometry

```bash
npm run build:geo
```

Regenerates the TopoJSON country polygon file from world-atlas.

### Social share image

```bash
npm run build:og
```

Regenerates the branded OpenGraph image (`public/og.png`).

## Tech Stack

- **Framework:** Next.js 16 / React 19 (static export)
- **Visualisation:** D3.js 7, Chart.js 4
- **Styling:** Tailwind CSS 4
- **Testing:** Vitest 4 + Testing Library

## License

MIT