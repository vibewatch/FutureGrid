import {
  generateAllCareerInsights,
  getSectorAggregatesExtended,
  getReskillingPaths,
} from "@/lib/data";
import { getOnetEnrichment } from "@/lib/onet";
import { getOccupationTrend } from "@/lib/snapshot";
import { getOccupationExposureLenses } from "@/lib/exposure";
import CareerDetailClient from "@/components/careers/CareerDetailClient";

// All data is read here at BUILD time (Server Component + static export) so the
// heavy onet-enrichment / full-snapshot datasets never ship into client JS.
// Only the resolved, minimal data for this one occupation is passed to the
// client island.
export default async function CareerDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode);

  const allInsights = generateAllCareerInsights();
  const career = allInsights.find((i) => i.occupationCode === code) ?? null;
  const allInsightCodes = allInsights.map((i) => i.occupationCode);

  const onet = getOnetEnrichment(code) ?? null;
  const sectorAgg = career
    ? getSectorAggregatesExtended().find((s) => s.sector === career.sectorName) ?? null
    : null;
  const trend = getOccupationTrend(code);
  const transitions = getReskillingPaths(code, 3, "score");
  const exposureLenses = getOccupationExposureLenses(code) ?? null;

  return (
    <CareerDetailClient
      code={code}
      career={career}
      allInsightCodes={allInsightCodes}
      onet={onet}
      sectorAgg={sectorAgg}
      trend={trend}
      transitions={transitions}
      exposureLenses={exposureLenses}
    />
  );
}
