import type { Metadata } from "next";
import InsightsView from "@/components/insights/InsightsView";
import { getAnalysisPageData } from "@/lib/analysis";
import { getAIPressureSynthesisData } from "@/lib/ai-pressure-synthesis";
import { getAICompanyStocksData } from "@/lib/ai-company-stocks";
import { getExposureOutcomeMatrix } from "@/lib/exposure-outcome";
import { BASE_PATH, SITE_NAME } from "@/lib/seo";

const title = "Insights Lab";
const description =
  "Dive deep into AI displacement forecasts, occupation resilience scores, and workforce trend analysis. Data-driven insights on the future of work — powered by FutureGrid.";
const canonicalPath = `${BASE_PATH}/analysis`;

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

export default function AnalysisPage() {
  // Compute the analysis datasets at BUILD time on the server so the full
  // occupation snapshot (needed for the history-based forecasts) stays out of
  // the client bundle. Only the resolved results are handed to the islands.
  const data = getAnalysisPageData();
  const aiCompanyStocks = getAICompanyStocksData();
  const aiPressureSynthesis = getAIPressureSynthesisData({ aiCompanyStocks });
  const exposureOutcomeMatrix = getExposureOutcomeMatrix();

  return (
    <InsightsView
      data={data}
      aiCompanyStocks={aiCompanyStocks}
      aiPressureSynthesis={aiPressureSynthesis}
      exposureOutcomeMatrix={exposureOutcomeMatrix}
    />
  );
}
