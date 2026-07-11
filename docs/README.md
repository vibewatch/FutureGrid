# FutureGrid Documentation

> Single index for all FutureGrid design and architecture documentation.
> **Last updated:** 2026-07-11 · **Maintained by:** Trinity (Lead)

---

## Quick Links

| Doc | Owner | What it covers |
|---|---|---|
| [platform.md](./platform.md) | Trinity (Lead) | Next.js config, deploy, CI, providers, SEO, error boundaries |
| [i18n.md](./i18n.md) | Trinity (Lead) | Internationalisation, locale detection, namespace catalogue |
| [transparency.md](./transparency.md) | Trinity (Lead) | Sources, provenance, compliance, exports, evidence taxonomy |
| [occupation-data-model.md](./occupation-data-model.md) | Tank (Backend / Data Dev) | Core occupation data model, snapshot schema, lib/data.ts |
| [analysis.md](./analysis.md) | Neo (Frontend Dev) | Analysis / Insights Lab page, exposure lenses, evidence stack |
| [careers.md](./careers.md) | Neo (Frontend Dev) | Careers explorer, occupation detail, career evidence passport |
| [dashboard.md](./dashboard.md) | Neo (Frontend Dev) | Home dashboard, KPI cards, hero risk checker |
| [explore.md](./explore.md) | Switch (Designer) | Explore page, universal search and filter |
| [frontier.md](./frontier.md) | Tank (Backend / Data Dev) | AI Frontier page, Epoch AI compute timeline |
| [global.md](./global.md) | Tank (Backend / Data Dev) | Global AI ecosystem map, country metrics |
| [labor-market.md](./labor-market.md) | Tank (Backend / Data Dev) | Labor page, JOLTS, WARN, LAUS, QCEW, layoffs |
| [testing.md](./testing.md) | Mouse (Tester) | Test suite structure, Vitest config, quality gates |
| [visualization-system.md](./visualization-system.md) | Switch (Designer) | Chart components, design tokens, accessibility contract |
| [report.md](./report.md) | Neo (Frontend Dev) | Report scrollytelling narrative, story beats, chart suite |
| [visa.md](./visa.md) | Tank (Backend / Data Dev) | H-1B LCA trends, employer/state analysis, talent bottleneck |
| [data-pipeline.md](./data-pipeline.md) | Tank (Backend / Data Dev) | Build scripts catalog, validate-before-write, provenance registry |
| [sectors.md](./sectors.md) | Switch (Designer) | Sectors overview, dynamic routing, sector aggregation |
| [skills.md](./skills.md) | Switch (Designer) | Skills explorer, reskilling pathways, O\*NET skill overlap |

---

## Architecture Overview

FutureGrid is a **Next.js 16 static-export** data-visualisation platform. At build time, all routes are pre-rendered to static HTML from committed JSON data files. There is no server at runtime.

```mermaid
flowchart TD
    subgraph Data["Data pipeline (scripts/)"]
        RAW[Upstream APIs<br/>BLS · O*NET · Anthropic · etc.]
        SCRIPTS[build:* scripts<br/>Node.js ESM]
        RAW -->|fetch + validate| SCRIPTS
        SCRIPTS -->|write| DATAFILES[data/*.json]
    end

    subgraph Build["next build"]
        SC[Server Components<br/>app/**/page.tsx]
        CC["Client Components<br/>(\"use client\")"]
        DATAFILES -->|static import| SC
        SC -->|pre-render HTML| OUT[out/ static export]
        CC -->|hydrated in browser| BROWSER
    end

    subgraph Browser["Browser runtime"]
        BROWSER[React 19 app]
        THEME[ThemeProvider]
        LANG[LanguageProvider]
        BROWSER --> THEME
        BROWSER --> LANG
    end

    subgraph Deploy["GitHub Pages CDN"]
        OUT -->|upload-pages-artifact| CDN[Static files served]
    end
```

### Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (`output: "export"`) |
| UI | React 19 |
| Styling | Tailwind CSS v4 |
| Charts | Chart.js 4 + D3 v7 |
| Theme | next-themes |
| Testing | Vitest 4 + @testing-library/react |
| Type checking | TypeScript 5 |
| CI/CD | GitHub Actions |

---

## Top-Level System Diagram

```mermaid
flowchart LR
    subgraph Routes["App Routes"]
        HOME[/ Dashboard]
        CAREERS[/careers Careers]
        SECTORS[/sectors Sectors]
        SKILLS[/skills Skills]
        GLOBAL[/global Global]
        LABOR[/labor Labor]
        VISA[/visa Visa/H-1B]
        ANALYSIS[/analysis Analysis]
        FRONTIER[/frontier Frontier]
        EXPLORE[/explore Explore]
        REPORT[/report Report]
        SOURCES[/sources Sources]
        METHODOLOGY[/methodology Methodology]
    end

    subgraph Lib["Core Libraries"]
        DATA[lib/data.ts]
        PROV[lib/provenance.ts]
        EVID[lib/evidence.ts]
        I18N[lib/i18n/]
        SEO[lib/seo.ts]
    end

    subgraph Providers["Root Providers"]
        TP[ThemeProvider]
        LP[LanguageProvider]
        GA[GoogleAnalytics]
    end

    subgraph DataFiles["data/*.json"]
        OCC[occupation-snapshot-slim.json]
        SRC[sources.json]
        PROVJ[provenance.json]
    end

    DataFiles --> Lib
    Lib --> Routes
    Providers --> Routes
```

---

## 18-Subsystem Taxonomy

FutureGrid is divided into 18 subsystems — 16 domain subsystems, 1 infrastructure subsystem (Data Pipeline), and 1 cross-cutting quality subsystem (Testing). Each maps to one or more app routes, component domains, and lib modules. Testing (#18) is cross-cutting and is listed separately from domain subsystems in the count.

| # | Subsystem | Routes | Component domain | Lib domain |
|---|---|---|---|---|
| 1 | **Platform** | all | `theme/`, `ui/`, `analytics/` | `seo.ts` |
| 2 | **i18n** | all | `i18n/` | `lib/i18n/` |
| 3 | **Transparency** | `/sources`, `/methodology` | `sources/` | `lib/provenance.ts`, `lib/evidence.ts` |
| 4 | **Data** | (shared) | — | `lib/data.ts`, `lib/snapshot.ts` |
| 5 | **Dashboard** | `/` | `dashboard/` | `lib/data.ts` |
| 6 | **Careers** | `/careers`, `/careers/[code]` | `careers/` | `lib/data.ts`, `lib/career-evidence-passport.ts` |
| 7 | **Sectors** | `/sectors`, `/sectors/[id]` | (inline pages) | `lib/data.ts` |
| 8 | **Skills** | `/skills` | `skills/` | `lib/onet.ts`, `lib/occupational-requirements.ts` |
| 9 | **Analysis** | `/analysis` | `insights/` | `lib/analysis.ts`, `lib/exposure.ts`, `lib/market-signals.ts` |
| 10 | **Labor** | `/labor` | `labor/`, `layoffs/`, `pulse/` | `lib/jolts.ts`, `lib/warn.ts`, `lib/state-labor.ts`, `lib/state-qcew.ts` |
| 11 | **Global** | `/global` | `global/` | `lib/global-ai-ecosystem.ts`, `lib/openrouter-country-activity.ts` |
| 12 | **Frontier** | `/frontier` | `frontier/` | `lib/ai-frontier.ts` |
| 13 | **Explore** | `/explore` | `explore/` | `lib/data.ts` |
| 14 | **Report** | `/report` | `report/` | `lib/snapshot.ts` |
| 15 | **Visa** | `/visa` | `visa/` | `lib/h1b.ts`, `lib/talent-bottleneck.ts` |
| 16 | **Charts** | (shared) | `charts/` | `lib/utils.ts` |
| 17 | **Data Pipeline** | (build-time) | — | `scripts/` (all build scripts) |
| 18 | **Testing** *(cross-cutting)* | all | — | `tests/`, `vitest.config.ts` |

---

## Design Docs

| Doc | Subsystems covered |
|---|---|
| [platform.md](./platform.md) | 1 · Platform |
| [i18n.md](./i18n.md) | 2 · i18n |
| [transparency.md](./transparency.md) | 3 · Transparency |
| [occupation-data-model.md](./occupation-data-model.md) | 4 · Data |
| [dashboard.md](./dashboard.md) | 5 · Dashboard |
| [careers.md](./careers.md) | 6 · Careers |
| [sectors.md](./sectors.md) | 7 · Sectors |
| [skills.md](./skills.md) | 8 · Skills |
| [analysis.md](./analysis.md) | 9 · Analysis |
| [labor-market.md](./labor-market.md) | 10 · Labor |
| [global.md](./global.md) | 11 · Global |
| [frontier.md](./frontier.md) | 12 · Frontier |
| [explore.md](./explore.md) | 13 · Explore |
| [report.md](./report.md) | 14 · Report |
| [visa.md](./visa.md) | 15 · Visa |
| [visualization-system.md](./visualization-system.md) | 16 · Charts |
| [data-pipeline.md](./data-pipeline.md) | 17 · Data Pipeline |
| [testing.md](./testing.md) | 18 · Testing (cross-cutting quality gates) |

---

## Documentation Conventions

Every subsystem doc must include all of the following sections. A doc is **complete** when every section is present and substantive (not placeholder text).

| Section | Required content |
|---|---|
| **Status / Ownership** | Active/deprecated, owner agent name |
| **Purpose / Non-goals** | One paragraph each |
| **Boundaries** | In/out of scope table |
| **Architecture** | Prose description + Mermaid diagram |
| **Contracts / Configuration** | Env vars, types, API surfaces |
| **Runtime / Build / Deploy Lifecycle** | Phase table |
| **Security / Privacy** | Threat model and mitigations |
| **Accessibility** | WCAG considerations |
| **Performance** | Key bottlenecks and mitigations |
| **Failure Handling** | Failure → behaviour table |
| **Tests / Quality Gates** | Gate → command → what it checks |
| **Extension Points** | How to extend without breaking |
| **Key File References** | File → role table |

Diagrams must use **Mermaid** (flowchart or sequenceDiagram). Diagrams must be accurate against the actual code — do not include components or files that do not exist.

---

## Coverage Matrix

### App Routes

| Route | Component | Server/Client | i18n ns | Doc |
|---|---|---|---|---|
| `/` | `DashboardHome` | Server → Client | `dashboard` | [dashboard.md](./dashboard.md) |
| `/careers` | `CareersView` (page.tsx) | Server → Client | `careers` | [careers.md](./careers.md) |
| `/careers/[code]` | `CareerDetailClient` | Server → Client | `careers` | [careers.md](./careers.md) |
| `/sectors` | page.tsx | Server | `sectors` | [sectors.md](./sectors.md) |
| `/sectors/[id]` | page.tsx | Server → Client | `sectors` | [sectors.md](./sectors.md) |
| `/skills` | `ReskillExplorer` | Server → Client | `skills` | [skills.md](./skills.md) |
| `/global` | `GlobalView` | Server → Client | `global` | [global.md](./global.md) |
| `/labor` | `LaborMarketView` | Server → Client | `labor` | [labor-market.md](./labor-market.md) |
| `/visa` | `VisaTrendsView` | Server → Client | `visa` | [visa.md](./visa.md) |
| `/analysis` | `InsightsView` | Server → Client | `analysis` | [analysis.md](./analysis.md) |
| `/frontier` | `AIFrontierView` | Server → Client | `frontier` | [frontier.md](./frontier.md) |
| `/explore` | `ExploreView` | Server → Client | `explore` | [explore.md](./explore.md) |
| `/report` | `ReportView` | Server → Client | `report` | [report.md](./report.md) |
| `/sources` | `SourcesView` | Server → Client | `sources` | [transparency.md](./transparency.md) |
| `/methodology` | `MethodologyView` | Server → Client | `methodology` | [transparency.md](./transparency.md) |

### Component Top-Level Domains

| Domain | Key components | Doc |
|---|---|---|
| `analytics/` | `GoogleAnalytics` | [platform.md](./platform.md) |
| `careers/` | `CareerDetailClient` | [careers.md](./careers.md) |
| `charts/` | `AccessibleChart`, `BarChartRace`, `WorldChoropleth`, 14 others | [visualization-system.md](./visualization-system.md) |
| `dashboard/` | `DashboardHome`, `Sidebar`, `HeroRiskChecker`, `KeyFindings`, `HighlightsBento` | [dashboard.md](./dashboard.md) |
| `explore/` | `ExploreView` | [explore.md](./explore.md) |
| `frontier/` | `AIFrontierView`, `ComputeTimelineChart`, `CostPowerTrends` | [frontier.md](./frontier.md) |
| `global/` | `GlobalView`, `AIAdoptionSignals`, `ReadinessGapLens` | [global.md](./global.md) |
| `heatmap/` | `HeatmapView` | [explore.md](./explore.md) |
| `i18n/` | `LanguageSwitcher` | [i18n.md](./i18n.md) |
| `insights/` | `InsightsView`, `EvidenceStack`, `AIPressureSynthesisLens`, 7 others | [analysis.md](./analysis.md) |
| `labor/` | `LaborMarketView`, `WarnPressureView`, `OpportunityLensView` | [labor-market.md](./labor-market.md) |
| `layoffs/` | `LayoffsView`, `WarnTrendChart` | [labor-market.md](./labor-market.md) |
| `methodology/` | `MethodologyView` | [transparency.md](./transparency.md) |
| `pulse/` | `PulseView`, `JoltsTrendChart`, `JoltsIndustryChart` | [labor-market.md](./labor-market.md) |
| `report/` | `ReportView` | [report.md](./report.md) |
| `skills/` | `ReskillExplorer` | [skills.md](./skills.md) |
| `sources/` | `SourcesView`, `DataExport` | [transparency.md](./transparency.md) |
| `theme/` | `ThemeProvider` | [platform.md](./platform.md) |
| `ui/` | `GuardrailBadge`, `CommandPalette`, `Reveal`, `AnimatedCounter`, `GridBackground` | [platform.md](./platform.md) / [transparency.md](./transparency.md) |
| `visa/` | `VisaTrendsView`, 11 sub-charts | [visa.md](./visa.md) |

### Lib Domain

| Module | Role | Doc |
|---|---|---|
| `lib/data.ts` | Career insights, sector aggregates, country map, sources | [occupation-data-model.md](./occupation-data-model.md) |
| `lib/seo.ts` | Canonical URL constants | [platform.md](./platform.md) |
| `lib/i18n/` | i18n context, hooks, messages | [i18n.md](./i18n.md) |
| `lib/provenance.ts` | Provenance registry loader | [transparency.md](./transparency.md) |
| `lib/evidence.ts` | Evidence stack, conclusions, source families | [transparency.md](./transparency.md) |
| `lib/analysis.ts` | Exposure analysis, signal scanning | [analysis.md](./analysis.md) |
| `lib/exposure.ts` | AI exposure lenses | [analysis.md](./analysis.md) |
| `lib/exposure-outcome.ts` | Exposure → Outcome Reality Matrix; joins exposure lenses with employment/wage outcomes (server-only, `import "server-only"`) | [analysis.md](./analysis.md) |
| `lib/market-signals.ts` | Market sector ETF signals | [analysis.md](./analysis.md) |
| `lib/ai-company-stocks.ts` | AI company stock return signals | [analysis.md](./analysis.md) |
| `lib/ai-frontier.ts` | AI compute frontier data loader | [frontier.md](./frontier.md) |
| `lib/ai-pressure-synthesis.ts` | AI pressure synthesis across datasets | [analysis.md](./analysis.md) |
| `lib/adoption-signals.ts` | AI adoption signals | [global.md](./global.md) |
| `lib/career-evidence-passport.ts` | Per-occupation evidence passport | [careers.md](./careers.md) |
| `lib/employment-projections.ts` | BLS employment projections | [occupation-data-model.md](./occupation-data-model.md) |
| `lib/global-ai-ecosystem.ts` | Global AI metrics, country data | [global.md](./global.md) |
| `lib/international-occupation-mix.ts` | ILOSTAT international occupation mix (server-only, `import "server-only"`) | [labor-market.md](./labor-market.md) |
| `lib/h1b.ts` | H-1B visa data | [visa.md](./visa.md) |
| `lib/job-postings.ts` | Job postings trend seed | [occupation-data-model.md](./occupation-data-model.md) |
| `lib/jolts.ts` | JOLTS data loader | [labor-market.md](./labor-market.md) |
| `lib/labor-opportunity.ts` | Labor opportunity lens | [labor-market.md](./labor-market.md) |
| `lib/labor-signals.ts` | Labor market signals | [labor-market.md](./labor-market.md) |
| `lib/occupational-requirements.ts` | ORS seed data | [occupation-data-model.md](./occupation-data-model.md) |
| `lib/onet.ts` | O*NET enrichment data | [occupation-data-model.md](./occupation-data-model.md) |
| `lib/openrouter-country-activity.ts` | OpenRouter country activity | [global.md](./global.md) |
| `lib/openrouter-provider-geography.ts` | OpenRouter provider geography | [global.md](./global.md) |
| `lib/readiness-gap.ts` | AI readiness gap metrics | [global.md](./global.md) |
| `lib/reskilling-bridge.ts` | Talent bottleneck → reskilling destination bridge; joins H-1B pressure with O\*NET skill-overlap transitions (server-only, `import "server-only"`) | [skills.md](./skills.md) |
| `lib/section-anchors.ts` | Shared section anchor constants | [platform.md](./platform.md) |
| `lib/snapshot.ts` | Snapshot utilities | [occupation-data-model.md](./occupation-data-model.md) |
| `lib/state-labor.ts` | State-level WARN + LAUS | [labor-market.md](./labor-market.md) |
| `lib/state-qcew.ts` | State QCEW data | [labor-market.md](./labor-market.md) |
| `lib/talent-bottleneck.ts` | Talent bottleneck analysis | [visa.md](./visa.md) |
| `lib/utils.ts` | Number/currency/percent formatters | [platform.md](./platform.md) |
| `lib/wage-tier-polarization.ts` | Employment-weighted wage terciles × AI-exposure band cross-tabulation (server-only, `import "server-only"`) | [sectors.md](./sectors.md) |
| `lib/warn.ts` / `lib/warn-types.ts` / `lib/warn-client.ts` | WARN notice types and adapters | [labor-market.md](./labor-market.md) |

### Script / Build Family

| Script | Purpose | Doc |
|---|---|---|
| `build-provenance.mjs` | Provenance registry | [transparency.md](./transparency.md) |
| `build-data-snapshot.mjs` | Main occupation snapshot | [data-pipeline.md](./data-pipeline.md) |
| `build-snapshot-slim.mjs` | Slim snapshot for client bundle | [data-pipeline.md](./data-pipeline.md) |
| `build-warn.mjs` + `build-warn-public.mjs` | WARN notices (private + public) | [data-pipeline.md](./data-pipeline.md) |
| `build-state-labor.mjs` + `build-state-qcew.mjs` | State LAUS + QCEW | [data-pipeline.md](./data-pipeline.md) |
| `build-jolts.mjs` | JOLTS data | [data-pipeline.md](./data-pipeline.md) |
| `build-global-metrics.mjs` | Global AI metrics | [data-pipeline.md](./data-pipeline.md) |
| `build-ai-signals.mjs` | AI signal scan data | [data-pipeline.md](./data-pipeline.md) |
| `build-ai-usage-proxies.mjs` | AI usage proxy data | [data-pipeline.md](./data-pipeline.md) |
| `build-ai-frontier.mjs` | Epoch AI compute frontier | [data-pipeline.md](./data-pipeline.md) |
| `build-ai-company-stocks.mjs` | AI company stock signals | [data-pipeline.md](./data-pipeline.md) |
| `build-market-signals.mjs` | Market ETF signals | [data-pipeline.md](./data-pipeline.md) |
| `build-h1b.mjs` | H-1B LCA trends | [data-pipeline.md](./data-pipeline.md) |
| `build-job-postings.mjs` | Job postings seed | [data-pipeline.md](./data-pipeline.md) |
| `build-employment-projections.mjs` | BLS employment projections | [data-pipeline.md](./data-pipeline.md) |
| `build-onet-enrichment.mjs` | O*NET enrichment data | [data-pipeline.md](./data-pipeline.md) |
| `build-occupational-requirements.mjs` | Occupational requirements seed | [data-pipeline.md](./data-pipeline.md) |
| `build-openrouter-models.mjs` | OpenRouter model catalog | [data-pipeline.md](./data-pipeline.md) |
| `build-international-occupation-mix.mjs` | ILOSTAT international occupation mix | [data-pipeline.md](./data-pipeline.md) |
| `build-world-geo.mjs` | World GeoJSON | [data-pipeline.md](./data-pipeline.md) |
| `build-og-image.mjs` | OG image generation | [platform.md](./platform.md) |
| `build-downloads.mjs` | Public downloads manifest | [platform.md](./platform.md) |
| `check-bundle-size.mjs` | Bundle size budget gate | [platform.md](./platform.md) |
| `a11y-test.mjs` | axe accessibility gate | [platform.md](./platform.md) |
| `smoke-test.mjs` | Headless Chrome smoke test | [platform.md](./platform.md) |

### Tests

| Test file | Subsystem | Doc |
|---|---|---|
| `tests/careers-i18n.test.ts` | i18n | [i18n.md](./i18n.md) |
| `tests/source-coverage.test.ts` | Transparency | [transparency.md](./transparency.md) |
| `tests/data-schema.test.ts` | Data / Transparency | [testing.md](./testing.md) |
| `tests/data.test.ts` | Data | [testing.md](./testing.md) |
| `tests/snapshot.test.ts` | Data | [testing.md](./testing.md) |
| `tests/analysis.test.ts` | Analysis | [testing.md](./testing.md) |
| `tests/exposure.test.ts` | Analysis | [testing.md](./testing.md) |
| `tests/adoption-signals.test.ts` | Global / Analysis | [testing.md](./testing.md) |
| `tests/ai-company-stocks.test.ts` | Analysis | [testing.md](./testing.md) |
| `tests/ai-frontier.test.ts` | Frontier | [testing.md](./testing.md) |
| `tests/ai-pressure-synthesis.test.ts` | Analysis | [testing.md](./testing.md) |
| `tests/career-evidence-passport.test.ts` | Careers | [testing.md](./testing.md) |
| `tests/employment-projections.test.ts` | Data / Careers | [testing.md](./testing.md) |
| `tests/global-ai-ecosystem.test.ts` | Global | [testing.md](./testing.md) |
| `tests/h1b-data.test.ts` | Visa | [testing.md](./testing.md) |
| `tests/job-postings.test.ts` | Data | [testing.md](./testing.md) |
| `tests/labor-opportunity.test.ts` | Labor | [testing.md](./testing.md) |
| `tests/market-signals.test.ts` | Analysis | [testing.md](./testing.md) |
| `tests/occupational-requirements.test.ts` | Skills | [testing.md](./testing.md) |
| `tests/openrouter-country-activity.test.ts` | Global | [testing.md](./testing.md) |
| `tests/openrouter-models.test.ts` | Global | [testing.md](./testing.md) |
| `tests/qcew-data.test.ts` | Labor | [testing.md](./testing.md) |
| `tests/readiness-gap.test.ts` | Global | [testing.md](./testing.md) |
| `tests/talent-bottleneck.test.ts` | Visa | [testing.md](./testing.md) |
| `tests/warn-adapters.test.ts` | Labor | [testing.md](./testing.md) |
| `tests/warn-data.test.ts` | Labor | [testing.md](./testing.md) |
| `tests/warn-pressure.test.ts` | Labor | [testing.md](./testing.md) |
| `tests/evidence-convergence.test.ts` | Transparency / Analysis | [testing.md](./testing.md) |
| `tests/exposure-outcome.test.ts` | Analysis | [testing.md](./testing.md) |
| `tests/international-occupation-mix.test.ts` | Global | [testing.md](./testing.md) |
| `tests/reskilling-bridge.test.ts` | Skills | [testing.md](./testing.md) |
| `tests/wage-tier-polarization.test.ts` | Sectors | [testing.md](./testing.md) |
| `tests/analysis-architecture.test.ts` | Analysis (server/client boundary) | [testing.md](./testing.md) |
| `tests/sectors-i18n.test.ts` | Sectors / i18n | [testing.md](./testing.md) |
| `tests/sectors-page-architecture.test.ts` | Sectors (server/client boundary) | [testing.md](./testing.md) |
| `tests/skills-page-architecture.test.ts` | Skills (server/client boundary) | [testing.md](./testing.md) |
| `tests/components/` | Various | [testing.md](./testing.md) |

### Platform / Config

| File | Doc |
|---|---|
| `next.config.ts` | [platform.md](./platform.md) |
| `package.json` | [platform.md](./platform.md) |
| `tsconfig.json` | [platform.md](./platform.md) |
| `eslint.config.mjs` | [platform.md](./platform.md) |
| `vitest.config.ts` | [testing.md](./testing.md) |
| `postcss.config.mjs` | [platform.md](./platform.md) |
| `.github/workflows/ci.yml` | [platform.md](./platform.md) |
| `.github/workflows/deploy-pages.yml` | [platform.md](./platform.md) |
| `.github/workflows/refresh-data.yml` | [platform.md](./platform.md) |
| `data/COMPLIANCE.md` | [transparency.md](./transparency.md) |
| `.env.example` | [platform.md](./platform.md) |

---

## Documentation Gaps

All 18 subsystems have dedicated design docs. `components/heatmap/HeatmapView` is documented in [explore.md](./explore.md) as the final sub-section of `ExploreView` (country × AI Readiness Heatmap). No documentation gaps remain.
