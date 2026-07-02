import type { Metadata } from "next";
import { getSectorAggregatesExtended, generateAllCareerInsights } from "@/lib/data";
import { BASE_PATH, SITE_NAME } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return getSectorAggregatesExtended().map((sector) => ({
    id: sector.sector,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sectorName = decodeURIComponent(id);

  const sectors = getSectorAggregatesExtended();
  const sector = sectors.find((s) => s.sector === sectorName);

  if (!sector) {
    return {
      title: "Sector Not Found",
      description: `No sector data found for "${sectorName}".`,
    };
  }

  const riskPct = Math.round(sector.avgRisk * 100);
  const salary = sector.avgSalary != null && sector.avgSalary > 0
    ? `~$${Math.round(sector.avgSalary / 1000)}k avg salary`
    : null;
  const brightPct = Math.round(sector.brightShare * 100);

  const sectorOccCount = generateAllCareerInsights().filter(
    (i) => i.sectorName === sectorName,
  ).length;

  const descParts = [
    `${riskPct}% avg AI exposure`,
    `${brightPct}% Bright Outlook`,
    salary,
    `${sectorOccCount} occupations analyzed`,
  ].filter(Boolean);

  const title = `${sectorName} — Sector AI Exposure & Outlook | ${SITE_NAME}`;
  const description = `${sectorName} sector: ${descParts.join(", ")}. Discover how AI is transforming this industry on FutureGrid.`;
  const canonicalPath = `${BASE_PATH}/sectors/${encodeURIComponent(sectorName)}`;

  return {
    title: sectorName,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: "website",
    },
  };
}

export default function SectorDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}