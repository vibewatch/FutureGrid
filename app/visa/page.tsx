import type { Metadata } from "next";
import VisaTrendsView from "@/components/visa/VisaTrendsView";
import { getTalentBottleneckData } from "@/lib/talent-bottleneck";
import { BASE_PATH, SITE_NAME } from "@/lib/seo";

const title = "H-1B Work-Visa Trends";
const description =
  "A decade of certified H-1B Labor Condition Applications (FY2016–FY2025): offered-wage and filing-volume trends, top occupations and employers, and H-1B demand by AI-exposure tier. A descriptive high-skill labor-demand signal — filings, not visa approvals.";
const canonicalPath = `${BASE_PATH}/visa`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: canonicalPath },
  openGraph: {
    title: `${title} | ${SITE_NAME}`,
    description,
    url: canonicalPath,
    type: "website",
    locale: "en_US",
    alternateLocale: ["zh_CN"],
  },
  twitter: {
    title: `${title} | ${SITE_NAME}`,
    description,
  },
};

export default function VisaPage() {
  const talentBottleneck = getTalentBottleneckData();

  return <VisaTrendsView talentBottleneck={talentBottleneck} />;
}
