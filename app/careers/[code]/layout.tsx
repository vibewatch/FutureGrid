import type { Metadata } from "next";
import { generateAllCareerInsights, getCareerByCode } from "@/lib/data";
import { BASE_PATH, SITE_NAME } from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return generateAllCareerInsights().map((career) => ({
    code: career.occupationCode,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const career = getCareerByCode(decodeURIComponent(code));

  if (!career) {
    return {
      title: "Career Not Found",
      description: `No occupation data found for code ${code}.`,
    };
  }

  const riskPct = Math.round(career.automationProbability * 100);
  const salary = career.medianSalary > 0
    ? `$${Math.round(career.medianSalary / 1000)}k median salary`
    : null;

  const descParts = [
    `${riskPct}% AI automation risk (${career.automationRisk})`,
    salary,
    `${career.outlook} Outlook`,
    `${career.sectorName} sector`,
  ].filter(Boolean);

  const title = `${career.occupationName} — AI Exposure & Automation Risk | ${SITE_NAME}`;
  const description = `${career.occupationName}: ${descParts.join(", ")}. Explore AI exposure, salary trends, and future-proof skills on FutureGrid.`;
  const canonicalPath = `${BASE_PATH}/careers/${career.occupationCode}`;

  return {
    title: career.occupationName,
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

export default function CareerDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}