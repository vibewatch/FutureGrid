import type { Metadata } from "next";
import MethodologyView from "@/components/methodology/MethodologyView";
import { datasets } from "@/lib/provenance";
import { BASE_PATH, SITE_NAME } from "@/lib/seo";
import type { ClearedDownload, FlaggedDownload } from "@/components/methodology/MethodologyView";

const title = "Methodology & Data Changelog";
const description =
  "How each FutureGrid metric is derived — AI exposure blending, WARN pressure ranking, market-signal scoring, and employment forecast methodology — plus a full data changelog from provenance metadata.";
const canonicalPath = `${BASE_PATH}/methodology`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: canonicalPath },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description,
    url: canonicalPath,
    type: "website",
  },
};

// ─── Compliance-cleared downloads ────────────────────────────────────────────
// Only files with verdict "Yes" or "Yes-with-attribution" per data/COMPLIANCE.md
// (Issue #56). Flagged datasets MUST NOT be offered for download.

const CLEARED: ClearedDownload[] = [
  {
    id: "occupation-snapshot",
    filename: "occupation-snapshot.json",
    label: "Occupation Snapshot (full)",
    license: "CC-BY 4.0",
    attribution:
      "Anthropic Economic Index + BLS OEWS. Derived dataset — cite FutureGrid and upstream sources.",
  },
  {
    id: "occupation-snapshot-slim",
    filename: "occupation-snapshot-slim.json",
    label: "Occupation Snapshot (slim)",
    license: "CC-BY 4.0",
    attribution:
      "Anthropic Economic Index + BLS OEWS. Derived dataset — cite FutureGrid and upstream sources.",
  },
  {
    id: "onet-enrichment",
    filename: "onet-enrichment.json",
    label: "O*NET Enrichment",
    license: "CC BY 4.0",
    attribution: "O*NET 28.3, National Center for O*NET Development.",
    sizeNote: "~4.1 MB",
  },
  {
    id: "state-labor",
    filename: "state-labor.json",
    label: "State Labor & WARN Pressure",
    license: "Public Domain",
    attribution: "BLS Local Area Unemployment Statistics (LAUS) + state WARN Act notices.",
  },
  {
    id: "state-qcew",
    filename: "state-qcew.json",
    label: "State QCEW Employment",
    license: "Public Domain",
    attribution: "BLS Quarterly Census of Employment and Wages (QCEW).",
  },
  {
    id: "warn-notices",
    filename: "warn-notices.json",
    label: "WARN Notices (public)",
    license: "Public Records",
    attribution: "State WARN Act public records. Attribution varies by state.",
    // Already served from public/ root via #47 — reuse, do not duplicate.
    publicPath: "/warn-notices.json",
  },
  {
    id: "ai-demand",
    filename: "ai-demand.json",
    label: "AI Demand Index",
    license: "CC BY 4.0",
    attribution: "Indeed Hiring Lab AI Tracker.",
  },
  {
    id: "country-exposure",
    filename: "country-exposure.json",
    label: "Country AI Exposure",
    license: "CC-BY 4.0",
    attribution: "Anthropic Economic Index — Country AI Adoption.",
  },
  {
    id: "jolts",
    filename: "jolts.json",
    label: "JOLTS (Job Openings & Labor Turnover)",
    license: "Public Domain",
    attribution: "BLS Job Openings and Labor Turnover Survey (JOLTS).",
  },
  {
    id: "ai-frontier",
    filename: "ai-frontier.json",
    label: "AI Frontier (training compute / cost)",
    license: "MIT",
    attribution: "Epoch AI — AI Training Compute dataset.",
  },
  {
    id: "llm-exposure",
    filename: "llm-exposure.json",
    label: "LLM Occupation Exposure",
    license: "MIT",
    attribution:
      'Eloundou et al. "GPTs are GPTs" (OpenAI). Replication dataset.',
  },
];

// ─── Flagged / restricted downloads ──────────────────────────────────────────
// Do NOT offer these for download — show reason instead (#56 gate).

const FLAGGED: FlaggedDownload[] = [
  {
    id: "market-ai-signals",
    label: "Market AI Signals",
    reason:
      "Yahoo Finance Terms of Service — redistribution of price data is prohibited under the unofficial chart endpoint license.",
  },
  {
    id: "ai-layoffs",
    label: "AI Layoffs (Challenger data)",
    reason:
      "Challenger, Gray & Christmas proprietary data — redistribution requires explicit permission.",
  },
  {
    id: "global-ai-metrics",
    label: "Global AI Metrics (IMF)",
    reason:
      "IMF non-commercial redistribution terms — commercial use requires IMF permission; redistribution restricted.",
  },
  {
    id: "ai-usage-proxies",
    label: "AI Usage Proxies",
    reason:
      "QuestMobile terms — rows sourced from QuestMobile reports are not cleared for redistribution.",
  },
  {
    id: "aioe-exposure",
    label: "AIOE Exposure (Felten et al.)",
    reason:
      "No explicit open license — citation required (SMJ 42(12):2195–2217); redistribution status unclear.",
  },
  {
    id: "automation-baseline",
    label: "Automation Baseline (Frey & Osborne)",
    reason:
      "No open license — academic research dataset; redistribution status unclear.",
  },
];

export default function MethodologyPage() {
  return (
    <MethodologyView
      datasets={datasets}
      basePath={BASE_PATH}
      clearedDownloads={CLEARED}
      flaggedDownloads={FLAGGED}
    />
  );
}
