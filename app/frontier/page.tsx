import type { Metadata } from "next";
import AIFrontierView from "@/components/frontier/AIFrontierView";
import { BASE_PATH, SITE_NAME } from "@/lib/seo";

const title = "AI Frontier";
const description =
  "Track AI model capability growth and its projected impact on the workforce — from language models to robotics. Explore the frontier of AI on FutureGrid.";
const canonicalPath = `${BASE_PATH}/frontier`;

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

export default function FrontierPage() {
  return <AIFrontierView />;
}
