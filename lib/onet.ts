import onetEnrichmentData from "@/data/onet-enrichment.json";

// ─── O*NET occupation enrichment ─────────────────────────────────────────────
// The onet-enrichment.json dataset is ~4MB. It is kept in its own module (not
// lib/data.ts) so it only ever enters the build-time server graph. Read it in a
// Server Component and pass the single resolved occupation to a client island —
// never import getOnetEnrichment from a "use client" component.

export interface OnetEnrichmentOccupation {
  occupationCode: string;
  onetCode: string;
  title: string;
  description: string;
  sampleTitles: string[];
  jobZone: { code: number; title: string } | null;
  tasks: { id: string; title: string }[];
  detailedWorkActivities: { id: string; title: string }[];
  skills: { id: string; name: string; description: string }[];
  technologySkills: { name: string; category: string; hot: boolean; inDemand: boolean }[];
  relatedOccupations: { code: string; onetCode: string; title: string; brightOutlook: boolean }[];
}

export interface OnetEnrichmentData {
  generatedAt: string;
  coverage: { requested: number; enriched: number; missing: string[] };
  occupations: Record<string, OnetEnrichmentOccupation>;
}

export function getOnetEnrichment(code: string): OnetEnrichmentOccupation | undefined {
  return (onetEnrichmentData as OnetEnrichmentData).occupations[code];
}
