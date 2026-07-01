import sourcesData from "@/data/sources.json";

export type EvidenceStatus = "agreement" | "mixed" | "coverage-gap" | "watch";
export type EvidenceConfidence = "high" | "medium" | "low";

export type EvidenceSourceFamilyId =
  | "occupation-outcomes"
  | "exposure-lenses"
  | "ai-demand-layoffs"
  | "jolts"
  | "labor-stress"
  | "market-proxy"
  | "global-ai"
  | "skills-reskilling"
  | "source-metadata";

export interface EvidenceMetric {
  id: string;
  label: string;
  value: string;
  detail?: string;
}

export interface EvidenceViewLink {
  href: string;
  label: string;
}

export interface EvidenceConclusion {
  id: string;
  title: string;
  finding: string;
  confidence: EvidenceConfidence;
  status: EvidenceStatus;
  sourceFamilies: EvidenceSourceFamilyId[];
  metrics: EvidenceMetric[];
  caveat: string;
  recommendedViewHref: string;
  links: EvidenceViewLink[];
}

export interface EvidenceSourceFamily {
  id: string;
  label: string;
  description: string;
  coverage: string;
  freshness: string;
  href: string;
}

export interface EvidenceStackSummary {
  title: string;
  finding: string;
  agreementCount: number;
  mixedCount: number;
  coverageGapCount: number;
  watchCount: number;
  caveat: string;
  generatedFrom: string[];
}

export interface EvidenceStack {
  generatedAt: string;
  conclusions: EvidenceConclusion[];
  sourceFamilies: EvidenceSourceFamily[];
  summary: EvidenceStackSummary;
}

type SourceCatalog = {
  generatedAt?: string;
  sources?: unknown[];
};

const sourceCatalog = sourcesData as SourceCatalog;
const sourceCount = Array.isArray(sourceCatalog.sources) ? sourceCatalog.sources.length : 0;
const generatedAt = sourceCatalog.generatedAt ?? "2026-07-01T00:00:00.000Z";

const SOURCE_FAMILIES: EvidenceSourceFamily[] = [
  {
    id: "occupation-outcomes",
    label: "Occupation, OEWS, O*NET, Anthropic",
    description: "Occupation snapshot fields, OEWS employment and wage history, O*NET skills/tasks, and Anthropic-derived context.",
    coverage: "756 SOC occupation rows with OEWS, skills, sector, salary, and opening fields where available.",
    freshness: "OEWS history through 2025; source catalog tracks exact vintages.",
    href: "/skills",
  },
  {
    id: "exposure-lenses",
    label: "Exposure lenses",
    description: "Usage exposure, LLM capability exposure, AIOE ability exposure, and historical automation baseline.",
    coverage: "Modern lenses cover the occupation set broadly; automation baseline coverage is partial.",
    freshness: "Mixed methods from Anthropic, OpenAI/UPenn, AIOE, and the historical automation baseline.",
    href: "/analysis",
  },
  {
    id: "ai-demand-layoffs",
    label: "AI demand and AI-attributed layoffs",
    description: "Indeed AI job-posting share and Challenger employer-announced AI-attributed job-cut series.",
    coverage: "Demand share and announced cuts use separate units, geographies, and reporting windows.",
    freshness: "Built from the bundled AI-demand and AI-attributed cut snapshots.",
    href: "/analysis",
  },
  {
    id: "jolts",
    label: "JOLTS",
    description: "BLS job openings, hires, quits, separations, layoffs, and discharges by national and industry series.",
    coverage: "Monthly national and industry labor-demand and turnover context.",
    freshness: "Bundled JOLTS snapshot with source metadata on /sources.",
    href: "/labor",
  },
  {
    id: "labor-stress",
    label: "WARN + LAUS + QCEW",
    description: "State WARN notices normalized with LAUS labor-force context and QCEW employment/wage baselines.",
    coverage: "State coverage and rank eligibility are explicit; non-eligible coverage is not zero-filled.",
    freshness: "WARN, LAUS, and QCEW snapshots are documented in source metadata.",
    href: "/labor",
  },
  {
    id: "market-proxy",
    label: "Market sector ETF signals",
    description: "Sector ETF history mapped to occupation sectors and compared with a broad-market benchmark.",
    coverage: "11 sector ETF proxies plus benchmark; sector proxy coverage is not worker-level coverage.",
    freshness: "Market price window and endpoint caveats are shown in source metadata.",
    href: "/analysis",
  },
  {
    id: "global-ai",
    label: "Global AI metrics",
    description: "Country exposure, adoption, diffusion, readiness, and supplemental country/developer proxies.",
    coverage: "Country metrics use distinct scales and collection rules; compare within each lens first.",
    freshness: "Global and proxy snapshots list vintages in /sources.",
    href: "/global",
  },
  {
    id: "skills-reskilling",
    label: "Skills and reskilling pathways",
    description: "O*NET skill overlap, related occupations, and Bright Outlook context for exploration.",
    coverage: "Skill-overlap pathways are action-planning context, not placement outcomes.",
    freshness: "O*NET 28.3 and enrichment metadata are cataloged.",
    href: "/skills",
  },
  {
    id: "source-metadata",
    label: "Source metadata",
    description: "Source roles, provenance, licenses, dates, and comparability caveats.",
    coverage: `${sourceCount} cataloged source records support provenance and caveats.`,
    freshness: `Generated ${generatedAt.slice(0, 10)}.`,
    href: "/sources",
  },
];

const CONCLUSIONS: EvidenceConclusion[] = [
  {
    id: "ai-exposure-broad-concentrated",
    title: "AI exposure is broad, but concentrated.",
    finding:
      "High and Very High exposure bands cover a meaningful minority of SOC rows and observed OEWS employment, so the signal is broad but not uniform.",
    confidence: "high",
    status: "agreement",
    sourceFamilies: ["occupation-outcomes", "exposure-lenses", "skills-reskilling", "source-metadata"],
    metrics: [
      metric("occupations", "Occupation rows", "756 SOC rows"),
      metric("high-exposure", "High/Very High rows", "151 rows", "61 Very High + 90 High exposure rows."),
      metric("employment-share", "Observed OEWS employment share", "31.3%", "High/Very High rows by latest employment history."),
    ],
    caveat: "Exposure bands summarize task and usage alignment; they are not displacement probabilities or attribution estimates.",
    recommendedViewHref: "/analysis",
    links: links("/analysis", "Open Exposure Lenses", "/skills", "Open Skills Explorer"),
  },
  {
    id: "exposure-outcomes-mixed",
    title: "Exposure vs. employment and wage outcomes is mixed.",
    finding:
      "The OEWS history window shows weak exposure alignment with employment growth and a modest negative wage-growth association, not a broad employment collapse signal.",
    confidence: "medium",
    status: "mixed",
    sourceFamilies: ["occupation-outcomes", "exposure-lenses", "source-metadata"],
    metrics: [
      metric("coverage", "Outcome coverage", "745 occupations"),
      metric("employment-correlation", "Exposure ↔ employment CAGR", "r=0.02", "High vs low exposure quartiles: +0.2% vs +0.7%."),
      metric("wage-correlation", "Exposure ↔ wage CAGR", "r=-0.21", "High vs low exposure quartiles: +2.9% vs +3.8%."),
    ],
    caveat: "OEWS history is observational and lags adoption timing; weak alignment should not settle future disruption questions.",
    recommendedViewHref: "/analysis",
    links: links("/analysis", "Open AI Signal Scan", "/sources", "Open source notes"),
  },
  {
    id: "capability-usage-lenses-differ",
    title: "Capability and usage lenses differ.",
    finding:
      "Usage, capability, ability, and historical automation lenses overlap, but coverage and pairwise correlations show why the matrix should keep them separate.",
    confidence: "high",
    status: "mixed",
    sourceFamilies: ["exposure-lenses", "occupation-outcomes", "source-metadata"],
    metrics: [
      metric("usage-capability", "Usage/capability coverage", "756 / 756 rows", "Correlation r=0.64."),
      metric("ability", "Ability coverage", "750 rows", "Capability/ability correlation r=0.84."),
      metric("automation", "Automation baseline coverage", "663 rows", "Usage/automation correlation r=-0.14."),
    ],
    caveat: "Each lens has a different construct and denominator; disagreement is context to display, not noise to average away.",
    recommendedViewHref: "/analysis",
    links: links("/analysis", "Open Exposure Lenses", "/sources", "Open source notes"),
  },
  {
    id: "labor-stress-localized-coverage-sensitive",
    title: "Labor stress is localized and coverage-sensitive.",
    finding:
      "AI demand, AI-attributed cuts, JOLTS, WARN, LAUS, and QCEW point to pockets of stress while coverage limits a national single-driver read.",
    confidence: "medium",
    status: "coverage-gap",
    sourceFamilies: ["ai-demand-layoffs", "jolts", "labor-stress", "source-metadata"],
    metrics: [
      metric("ai-demand", "AI job-posting demand", "CA 16.9%", "Top latest country in the bundled Indeed demand series."),
      metric("ai-cuts", "AI-attributed job cuts", "54,836 in 2025", "Latest verified monthly point: 4,680 in 2026-02."),
      metric("jolts", "JOLTS layoffs/discharges", "1.7M in 2025-12", "National level; rate 1.1%."),
      metric("warn-laus", "WARN+LAUS ranked coverage", "9 of 51 jurisdictions"),
      metric("qcew", "QCEW baseline rates", "9 of 51 jurisdictions"),
    ],
    caveat: "WARN and AI-attributed cut series track announcements with uneven coverage; JOLTS is national and not AI-specific.",
    recommendedViewHref: "/labor",
    links: links("/labor", "Open Labor Pulse", "/analysis", "Open AI Forces"),
  },
  {
    id: "market-signal-descriptive-proxy",
    title: "Market signal is a descriptive proxy, not a forecast.",
    finding:
      "Sector ETF history can sit beside employment-weighted exposure, but market prices blend many non-AI forces and are not worker outcomes.",
    confidence: "low",
    status: "watch",
    sourceFamilies: ["market-proxy", "occupation-outcomes", "exposure-lenses", "source-metadata"],
    metrics: [
      metric("etfs", "Sector proxies", "11 of 11 ETFs"),
      metric("mapping", "Occupation-sector mapping", "32 of 32 sectors"),
      metric("latest", "Latest market date", "2026-07-01"),
      metric("leader", "Top descriptive score", "Communication Services 99.5"),
    ],
    caveat: "ETF price history is descriptive sector context and should not be read as a direct labor-market measure.",
    recommendedViewHref: "/analysis",
    links: links("/analysis", "Open Market AI Sensitivity", "/sources", "Open market notes"),
  },
  {
    id: "global-adoption-differs-by-metric-country",
    title: "Global adoption differs by metric and country.",
    finding:
      "Country rankings shift across Claude usage, working-age diffusion, supplemental proxies, and readiness indices, so each metric should stay on its own scale.",
    confidence: "high",
    status: "mixed",
    sourceFamilies: ["global-ai", "ai-demand-layoffs", "source-metadata"],
    metrics: [
      metric("claude", "Claude usageIndex coverage", "166 of 195 countries", "Top usageIndex: Israel 7.00."),
      metric("diffusion", "Microsoft diffusion coverage", "147 economies", "Top diffusion: ARE 70.1%."),
      metric("readiness", "Readiness coverage", "IMF 178; Oxford 193"),
      metric("proxies", "Supplemental proxy families", "10"),
    ],
    caveat: "Country metrics use different scales and collection rules; compare within each lens before combining interpretation.",
    recommendedViewHref: "/global",
    links: links("/global", "Open Global Metrics", "/sources", "Open global notes"),
  },
  {
    id: "skills-reskilling-action-oriented-not-assured",
    title: "Skills and reskilling pathways are action-oriented, not assured outcomes.",
    finding:
      "O*NET skill overlap can guide next-step exploration, but it does not assure credential transfer, job placement, wage gains, or local hiring demand.",
    confidence: "medium",
    status: "watch",
    sourceFamilies: ["skills-reskilling", "occupation-outcomes", "source-metadata"],
    metrics: [
      metric("coverage", "O*NET skills coverage", "756 of 756 occupations"),
      metric("unique", "Unique top-skill labels", "33"),
      metric("pathways", "Lower-exposure skill-overlap candidates", "151 of 151 High/Very High rows"),
      metric("outlook", "Bright Outlook rows", "267 of 756"),
    ],
    caveat: "Skill overlap is an action-planning proxy; access, credentials, geography, preference, and employer demand remain separate constraints.",
    recommendedViewHref: "/skills",
    links: links("/skills", "Open Skills Explorer", "/sources", "Open skills notes"),
  },
];

const STATUS_COUNTS = CONCLUSIONS.reduce(
  (counts, conclusion) => {
    counts[conclusion.status] += 1;
    return counts;
  },
  { agreement: 0, mixed: 0, "coverage-gap": 0, watch: 0 } as Record<EvidenceStatus, number>,
);

const SUMMARY: EvidenceStackSummary = {
  title: "Evidence Stack: where signals agree",
  finding: "A synthesis layer connects conclusions to source families, signal agreement, disagreement, coverage gaps, and caveats.",
  agreementCount: STATUS_COUNTS.agreement,
  mixedCount: STATUS_COUNTS.mixed,
  coverageGapCount: STATUS_COUNTS["coverage-gap"],
  watchCount: STATUS_COUNTS.watch,
  caveat: "Not every data source is a chart; each source family supports or qualifies the conclusion rows below.",
  generatedFrom: SOURCE_FAMILIES.map((family) => family.label),
};

export function getEvidenceStack(): EvidenceStack {
  return {
    generatedAt,
    conclusions: CONCLUSIONS.map((conclusion) => ({
      ...conclusion,
      sourceFamilies: [...conclusion.sourceFamilies],
      metrics: conclusion.metrics.map((metricItem) => ({ ...metricItem })),
      links: conclusion.links.map((link) => ({ ...link })),
    })),
    sourceFamilies: SOURCE_FAMILIES.map((family) => ({ ...family })),
    summary: { ...SUMMARY, generatedFrom: [...SUMMARY.generatedFrom] },
  };
}

function metric(id: string, label: string, value: string, detail?: string): EvidenceMetric {
  return { id, label, value, ...(detail ? { detail } : {}) };
}

function links(primaryHref: string, primaryLabel: string, secondaryHref: string, secondaryLabel: string): EvidenceViewLink[] {
  const result = [
    { href: primaryHref, label: primaryLabel },
    { href: secondaryHref, label: secondaryLabel },
  ];
  return primaryHref === "/sources" || secondaryHref === "/sources"
    ? result
    : [...result, { href: "/sources", label: "Open source notes" }];
}
